import { Hono } from "hono";
import { Prisma, type BillingPaymentProvider, type PaymentGatewayProvider } from "@prisma/client";
import { PERMISSIONS, prisma, type TenantContext } from "@smrkomed/database";

import { audit } from "../../lib/audit";
import { requirePermission } from "../../lib/authz";
import { HttpError } from "../../lib/errors";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import { encryptString } from "../../integrations/credentials/encryption";
import type { AppEnv } from "../../types";
import { GATEWAY_CATALOG, getAdapter } from "./providers";
import type { GatewayCredentials } from "./providers";
import {
  connectGatewaySchema,
  coupleParam,
  createInvoiceSchema,
  createPaymentSchema,
  createRefundSchema,
  idParam,
  listQuery,
  patchGatewaySchema,
  patientParam,
  paymentIdParam,
  paymentLinkSchema,
  providerParam,
  saleParam,
  verifyPaymentSchema,
} from "./schemas";
import {
  dec,
  formatReceiptText,
  serializeConnection,
  serializeInvoice,
  serializePayment,
  serializeRefund,
} from "./serializer";
import {
  applyRefund,
  applySuccessfulPayment,
  dashboardAggregates,
  decryptConnection,
  encryptCredentials,
  getConnectionForProvider,
  getDefaultConnection,
  money,
  nextInvoiceNumber,
  outstanding,
  publicConfigFromCredentials,
  unsetOtherDefaults,
} from "./service";

type Ctx = Parameters<typeof requirePermission>[0];

function requireView(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PAYMENTS_VIEW);
}

function requireCreate(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PAYMENTS_CREATE);
}

function requireLink(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PAYMENTS_LINK);
}

function requireRefund(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PAYMENTS_REFUND);
}

function requireGatewayManage(c: Ctx) {
  return requirePermission(c, PERMISSIONS.PAYMENTS_GATEWAY_MANAGE);
}

function clinicWhere(tenant: TenantContext) {
  return { clinicId: tenant.clinicId };
}

function paginated<T>(items: T[], page: number, pageSize: number, total: number) {
  return { items, page, pageSize, total };
}

function isManualProvider(provider: BillingPaymentProvider) {
  return provider === "CASH" || provider === "MANUAL";
}

function validateConnectCredentials(provider: PaymentGatewayProvider, credentials: GatewayCredentials) {
  if (provider === "RAZORPAY" && (!credentials.keyId || !credentials.keySecret)) {
    throw new HttpError(422, "VALIDATION_ERROR", "Razorpay requires keyId and keySecret");
  }
  if (provider === "CASHFREE" && (!credentials.appId || !credentials.secretKey)) {
    throw new HttpError(422, "VALIDATION_ERROR", "Cashfree requires appId and secretKey");
  }
  if (provider === "PAYU" && (!credentials.merchantKey || !credentials.merchantSalt)) {
    throw new HttpError(422, "VALIDATION_ERROR", "PayU requires merchantKey and merchantSalt");
  }
}

const patientSelect = { id: true, firstName: true, lastName: true } as const;
const invoiceInclude = {
  lines: true,
  patient: { select: patientSelect },
  couple: { select: { id: true, slug: true } },
  payments: { orderBy: { createdAt: "desc" as const } },
} as const;

export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.get("/gateways", async (c) => {
  const tenant = requireView(c);
  const connections = await prisma.paymentGatewayConnection.findMany({
    where: clinicWhere(tenant),
  });
  const byProvider = Object.fromEntries(connections.map((row) => [row.provider, row]));
  return ok(c, {
    catalog: GATEWAY_CATALOG,
    connections: GATEWAY_CATALOG.map((item) => {
      const conn = byProvider[item.provider];
      return {
        ...item,
        connection: conn ? serializeConnection(conn) : null,
      };
    }),
  });
});

paymentRoutes.post("/gateways/:provider/connect", validate("param", providerParam), validate("json", connectGatewaySchema), async (c) => {
  const tenant = requireGatewayManage(c);
  const { provider } = c.req.valid("param");
  const body = c.req.valid("json");
  const credentials = body.credentials as GatewayCredentials;
  validateConnectCredentials(provider, credentials);

  const adapter = getAdapter(provider);
  const test = await adapter.testConnection(credentials, body.mode);
  if (!test.ok) {
    throw new HttpError(400, "GATEWAY_TEST_FAILED", test.message);
  }

  const encrypted = encryptCredentials(credentials);
  const webhookEncrypted = credentials.webhookSecret ? encryptString(credentials.webhookSecret) : null;
  const config = publicConfigFromCredentials(provider, credentials, body.mode);

  const connection = await prisma.$transaction(async (tx) => {
    if (body.isDefault) {
      await unsetOtherDefaults(tx, tenant.clinicId);
    }
    return tx.paymentGatewayConnection.upsert({
      where: { clinicId_provider: { clinicId: tenant.clinicId, provider } },
      create: {
        clinicId: tenant.clinicId,
        provider,
        displayName: body.displayName ?? provider,
        encryptedCredentials: encrypted,
        webhookSecretEncrypted: webhookEncrypted,
        mode: body.mode,
        status: "CONNECTED",
        isActive: true,
        isDefault: body.isDefault,
        lastTestedAt: new Date(),
        lastError: null,
        config,
      },
      update: {
        displayName: body.displayName ?? provider,
        encryptedCredentials: encrypted,
        webhookSecretEncrypted: webhookEncrypted,
        mode: body.mode,
        status: "CONNECTED",
        isActive: true,
        isDefault: body.isDefault,
        lastTestedAt: new Date(),
        lastError: null,
        config,
      },
    });
  });

  await audit(tenant, "PAYMENT_GATEWAY_CONNECT", "PaymentGatewayConnection", connection.id, {
    provider,
    mode: body.mode,
  });

  return ok(c, serializeConnection(connection), 201);
});

paymentRoutes.post("/gateways/:provider/test", validate("param", providerParam), async (c) => {
  const tenant = requireGatewayManage(c);
  const { provider } = c.req.valid("param");
  const connection = await getConnectionForProvider(tenant.clinicId, provider);
  await requireClinicOwned(tenant, connection);
  if (!connection) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Gateway not connected");

  const credentials = decryptConnection(connection);
  const adapter = getAdapter(provider);
  const result = await adapter.testConnection(credentials, connection.mode);

  await prisma.paymentGatewayConnection.update({
    where: { id: connection.id },
    data: {
      lastTestedAt: new Date(),
      lastError: result.ok ? null : result.message,
      status: result.ok ? "CONNECTED" : "ERROR",
    },
  });

  return ok(c, result);
});

paymentRoutes.post("/gateways/:provider/disconnect", validate("param", providerParam), async (c) => {
  const tenant = requireGatewayManage(c);
  const { provider } = c.req.valid("param");
  const connection = await getConnectionForProvider(tenant.clinicId, provider);
  await requireClinicOwned(tenant, connection);
  if (!connection) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Gateway not connected");

  const updated = await prisma.paymentGatewayConnection.update({
    where: { id: connection.id },
    data: {
      status: "DISCONNECTED",
      isActive: false,
      isDefault: false,
      encryptedCredentials: null,
      webhookSecretEncrypted: null,
      lastError: null,
      config: Prisma.JsonNull,
    },
  });

  await audit(tenant, "PAYMENT_GATEWAY_DISCONNECT", "PaymentGatewayConnection", updated.id, { provider });
  return ok(c, serializeConnection(updated));
});

paymentRoutes.post("/gateways/:provider/set-default", validate("param", providerParam), async (c) => {
  const tenant = requireGatewayManage(c);
  const { provider } = c.req.valid("param");
  const connection = await getConnectionForProvider(tenant.clinicId, provider);
  await requireClinicOwned(tenant, connection);
  if (!connection) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Gateway not connected");

  const updated = await prisma.$transaction(async (tx) => {
    await unsetOtherDefaults(tx, tenant.clinicId, provider);
    return tx.paymentGatewayConnection.update({
      where: { id: connection.id },
      data: { isDefault: true, isActive: true },
    });
  });

  return ok(c, serializeConnection(updated));
});

paymentRoutes.patch("/gateways/:provider", validate("param", providerParam), validate("json", patchGatewaySchema), async (c) => {
  const tenant = requireGatewayManage(c);
  const { provider } = c.req.valid("param");
  const body = c.req.valid("json");
  const connection = await getConnectionForProvider(tenant.clinicId, provider);
  await requireClinicOwned(tenant, connection);
  if (!connection) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Gateway not connected");

  const updated = await prisma.paymentGatewayConnection.update({
    where: { id: connection.id },
    data: {
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
      ...(body.mode !== undefined ? { mode: body.mode } : {}),
    },
  });
  return ok(c, serializeConnection(updated));
});

paymentRoutes.get("/dashboard", async (c) => {
  const tenant = requireView(c);
  const data = await dashboardAggregates(tenant.clinicId);
  return ok(c, data);
});

paymentRoutes.get("/invoices", validate("query", listQuery), async (c) => {
  const tenant = requireView(c);
  const query = c.req.valid("query");
  const where: Prisma.BillingInvoiceWhereInput = {
    ...clinicWhere(tenant),
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.coupleId ? { coupleId: query.coupleId } : {}),
    ...(query.q
      ? {
          OR: [
            { invoiceNumber: { contains: query.q, mode: "insensitive" } },
            { title: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.billingInvoice.count({ where }),
    prisma.billingInvoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return ok(c, paginated(rows.map(serializeInvoice), query.page, query.pageSize, total));
});

paymentRoutes.post("/invoices", validate("json", createInvoiceSchema), async (c) => {
  const tenant = requireCreate(c);
  const body = c.req.valid("json");

  if (body.patientId) {
    await requireClinicOwned(
      tenant,
      await prisma.patient.findFirst({ where: { id: body.patientId, clinicId: tenant.clinicId } }),
    );
  }
  if (body.coupleId) {
    await requireClinicOwned(
      tenant,
      await prisma.couple.findFirst({ where: { id: body.coupleId, clinicId: tenant.clinicId } }),
    );
  }

  const lines = body.lines.map((line) => ({
    description: line.description,
    quantity: line.quantity,
    unitAmount: money(line.unitAmount),
    lineTotal: money(line.quantity * line.unitAmount),
  }));
  const totalAmount = lines.reduce((sum, line) => sum + dec(line.lineTotal), 0);

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextInvoiceNumber(tenant.clinicId, tx);
    return tx.billingInvoice.create({
      data: {
        clinicId: tenant.clinicId,
        invoiceNumber,
        patientId: body.patientId ?? null,
        coupleId: body.coupleId ?? null,
        pharmacySaleId: body.pharmacySaleId ?? null,
        source: body.source,
        title: body.title,
        description: body.description ?? null,
        currency: body.currency,
        totalAmount: money(totalAmount),
        paidAmount: money(0),
        status: "ISSUED",
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes ?? null,
        createdById: tenant.userId,
        lines: { create: lines },
      },
      include: invoiceInclude,
    });
  });

  await audit(tenant, "BILLING_INVOICE_CREATE", "BillingInvoice", invoice.id, {
    invoiceNumber: invoice.invoiceNumber,
    totalAmount,
  });

  return ok(c, serializeInvoice(invoice), 201);
});

paymentRoutes.get("/invoices/:id", validate("param", idParam), async (c) => {
  const tenant = requireView(c);
  const invoice = await prisma.billingInvoice.findFirst({
    where: { id: c.req.valid("param").id, ...clinicWhere(tenant) },
    include: invoiceInclude,
  });
  await requireClinicOwned(tenant, invoice);
  return ok(c, serializeInvoice(invoice!));
});

paymentRoutes.post(
  "/invoices/:id/payments",
  validate("param", idParam),
  validate("json", createPaymentSchema),
  async (c) => {
    const tenant = requireCreate(c);
    const body = c.req.valid("json");
    const invoice = await prisma.billingInvoice.findFirst({
      where: { id: c.req.valid("param").id, ...clinicWhere(tenant) },
    });
    await requireClinicOwned(tenant, invoice);
    if (!invoice) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Invoice not found");

    const due = outstanding(invoice);
    if (body.amount > due + 0.001) {
      throw new HttpError(400, "AMOUNT_EXCEEDS_OUTSTANDING", `Amount exceeds outstanding ₹${due.toFixed(2)}`);
    }

    const provider = (body.provider ?? "CASH") as BillingPaymentProvider;
    const manual = isManualProvider(provider);

    let gatewayConnectionId: string | null = null;

    if (!manual) {
      const gatewayProvider = provider as PaymentGatewayProvider;
      const connection =
        (await getConnectionForProvider(tenant.clinicId, gatewayProvider)) ?? (await getDefaultConnection(tenant.clinicId));
      if (!connection || connection.provider !== gatewayProvider || !connection.isActive || connection.status !== "CONNECTED") {
        throw new HttpError(400, "GATEWAY_NOT_READY", "Connect and activate a payment gateway first");
      }
      // Touch decrypt early so bad ciphertext fails before creating a payment row.
      decryptConnection(connection);
      gatewayConnectionId = connection.id;
    }

    // Create payment first so gateway order notes can carry smrkomedPaymentId for webhook routing.
    // Gateway HTTP calls stay outside the DB transaction.
    let payment = await prisma.billingPayment.create({
      data: {
        clinicId: tenant.clinicId,
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        coupleId: invoice.coupleId,
        pharmacySaleId: invoice.pharmacySaleId,
        gatewayConnectionId,
        provider,
        amount: money(body.amount),
        currency: invoice.currency,
        status: "PENDING",
        method: body.method ?? (manual ? "cash" : null),
        gatewayOrderId: null,
        paymentLinkUrl: null,
        paymentLinkId: null,
        metadata: body.notes ? { notes: body.notes } : Prisma.JsonNull,
        createdById: tenant.userId,
      },
      include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
    });

    if (!manual && gatewayConnectionId) {
      const gatewayProvider = provider as PaymentGatewayProvider;
      const connection = await prisma.paymentGatewayConnection.findUniqueOrThrow({
        where: { id: gatewayConnectionId },
      });
      try {
        const credentials = decryptConnection(connection);
        const adapter = getAdapter(gatewayProvider);
        const order = await adapter.createOrder(credentials, connection.mode, {
          amountInr: body.amount,
          currency: invoice.currency,
          receipt: `${invoice.invoiceNumber}-${Date.now()}`.slice(0, 40),
          notes: {
            invoiceId: invoice.id,
            clinicId: tenant.clinicId,
            smrkomedPaymentId: payment.id,
          },
          ...(body.customer
            ? {
                customer: {
                  ...(body.customer.name ? { name: body.customer.name } : {}),
                  ...(body.customer.email ? { email: body.customer.email } : {}),
                  ...(body.customer.phone ? { phone: body.customer.phone } : {}),
                },
              }
            : {}),
        });
        payment = await prisma.billingPayment.update({
          where: { id: payment.id },
          data: {
            gatewayOrderId: order.gatewayOrderId,
            paymentLinkUrl: order.paymentLinkUrl ?? null,
            paymentLinkId: order.paymentLinkId ?? null,
          },
          include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
        });
      } catch {
        await prisma.billingPayment.update({
          where: { id: payment.id },
          data: { status: "FAILED", failureReason: "Payment could not be created with the gateway" },
        });
        throw new HttpError(502, "GATEWAY_ORDER_FAILED", "Payment could not be created.");
      }
    }

    if (manual) {
      payment = await prisma.$transaction(async (tx) => {
        const fresh = await tx.billingPayment.findUniqueOrThrow({ where: { id: payment.id } });
        await applySuccessfulPayment(tx, fresh);
        return tx.billingPayment.findUniqueOrThrow({
          where: { id: payment.id },
          include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
        });
      });
    }

    await audit(tenant, "BILLING_PAYMENT_CREATE", "BillingPayment", payment.id, {
      provider,
      amount: body.amount,
      status: payment.status,
    });

    const amountStr = String(body.amount);
    if (payment.status === "PENDING" || payment.status === "PROCESSING") {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "PAYMENT_PENDING",
            triggerEventId: `payment_pending_${payment.id}`,
            patientId: payment.patientId,
            coupleId: payment.coupleId,
            vars: {
              payment_amount: amountStr,
              payment_due_date: "",
              clinic_name: tenant.clinicName,
            },
          }),
        )
        .catch(() => undefined);
    }
    if (payment.status === "SUCCESS") {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "PAYMENT_RECEIVED",
            triggerEventId: `payment_received_${payment.id}`,
            patientId: payment.patientId,
            coupleId: payment.coupleId,
            vars: {
              payment_amount: amountStr,
              clinic_name: tenant.clinicName,
            },
          }),
        )
        .catch(() => undefined);
    }
    if (payment.status === "FAILED") {
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) =>
          dispatchWhatsAppTrigger({
            tenant,
            triggerType: "PAYMENT_FAILED",
            triggerEventId: `payment_failed_${payment.id}`,
            patientId: payment.patientId,
            coupleId: payment.coupleId,
            vars: {
              payment_amount: amountStr,
              clinic_name: tenant.clinicName,
            },
          }),
        )
        .catch(() => undefined);
    }

    return ok(c, serializePayment(payment), 201);
  },
);

paymentRoutes.post("/payments/:id/verify", validate("param", idParam), validate("json", verifyPaymentSchema), async (c) => {
  const tenant = requireCreate(c);
  const body = c.req.valid("json");
  const payment = await prisma.billingPayment.findFirst({
    where: { id: c.req.valid("param").id, ...clinicWhere(tenant) },
  });
  await requireClinicOwned(tenant, payment);
  if (!payment) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Payment not found");

  if (payment.status === "SUCCESS") {
    return ok(c, serializePayment(payment));
  }
  if (isManualProvider(payment.provider)) {
    throw new HttpError(400, "ALREADY_SETTLED", "Manual payments do not require verification");
  }

  const connection = payment.gatewayConnectionId
    ? await prisma.paymentGatewayConnection.findUnique({ where: { id: payment.gatewayConnectionId } })
    : await getConnectionForProvider(tenant.clinicId, payment.provider as PaymentGatewayProvider);
  if (!connection) throw new HttpError(400, "GATEWAY_NOT_READY", "Gateway connection missing");

  const credentials = decryptConnection(connection);
  const adapter = getAdapter(connection.provider);
  const result = await adapter.verifyPayment(credentials, connection.mode, {
    gatewayOrderId: body.gatewayOrderId ?? payment.gatewayOrderId ?? null,
    gatewayPaymentId: body.gatewayPaymentId ?? payment.gatewayPaymentId ?? null,
    signature: body.signature ?? null,
  });

  if (!result.ok || result.status !== "SUCCESS") {
    await prisma.billingPayment.update({
      where: { id: payment.id },
      data: {
        status: result.status === "FAILED" ? "FAILED" : "PROCESSING",
        failureReason: result.failureReason ?? null,
        gatewayPaymentId: result.gatewayPaymentId ?? payment.gatewayPaymentId,
      },
    });
    throw new HttpError(400, "PAYMENT_VERIFY_FAILED", result.failureReason ?? "Payment not successful");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const fresh = await tx.billingPayment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: result.gatewayPaymentId ?? payment.gatewayPaymentId,
        gatewayOrderId: body.gatewayOrderId ?? payment.gatewayOrderId,
        method: result.method ?? payment.method,
      },
    });
    await applySuccessfulPayment(tx, fresh);
    return tx.billingPayment.findUniqueOrThrow({
      where: { id: payment.id },
      include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
    });
  });

  await audit(tenant, "BILLING_PAYMENT_VERIFY", "BillingPayment", updated.id, {
    status: updated.status,
  });

  if (updated.status === "SUCCESS") {
    void import("../whatsapp-automation/triggers")
      .then(({ dispatchWhatsAppTrigger }) =>
        dispatchWhatsAppTrigger({
          tenant,
          triggerType: "PAYMENT_RECEIVED",
          triggerEventId: `payment_received_${updated.id}`,
          patientId: updated.patientId,
          coupleId: updated.coupleId,
          vars: {
            payment_amount: String(updated.amount),
            clinic_name: tenant.clinicName,
          },
        }),
      )
      .catch(() => undefined);
  }

  return ok(c, serializePayment(updated));
});

paymentRoutes.post("/payments/:id/link", validate("param", idParam), validate("json", paymentLinkSchema), async (c) => {
  const tenant = requireLink(c);
  const body = c.req.valid("json");
  const payment = await prisma.billingPayment.findFirst({
    where: { id: c.req.valid("param").id, ...clinicWhere(tenant) },
    include: { invoice: true },
  });
  await requireClinicOwned(tenant, payment);
  if (!payment) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Payment not found");
  if (isManualProvider(payment.provider)) {
    throw new HttpError(400, "LINK_NOT_SUPPORTED", "Payment links require a gateway provider");
  }

  const connection = payment.gatewayConnectionId
    ? await prisma.paymentGatewayConnection.findUnique({ where: { id: payment.gatewayConnectionId } })
    : await getConnectionForProvider(tenant.clinicId, payment.provider as PaymentGatewayProvider);
  if (!connection) throw new HttpError(400, "GATEWAY_NOT_READY", "Gateway connection missing");

  const credentials = decryptConnection(connection);
  const adapter = getAdapter(connection.provider);
  const link = await adapter.createPaymentLink(credentials, connection.mode, {
    amountInr: dec(payment.amount),
    currency: payment.currency,
    receipt: `link-${payment.id}`.slice(0, 40),
    description: body.description ?? payment.invoice?.title ?? "Clinic payment",
    ...(body.customer
      ? {
          customer: {
            ...(body.customer.name ? { name: body.customer.name } : {}),
            ...(body.customer.email ? { email: body.customer.email } : {}),
            ...(body.customer.phone ? { phone: body.customer.phone } : {}),
          },
        }
      : {}),
  });

  const updated = await prisma.billingPayment.update({
    where: { id: payment.id },
    data: {
      gatewayOrderId: link.gatewayOrderId || payment.gatewayOrderId,
      paymentLinkUrl: link.paymentLinkUrl ?? null,
      paymentLinkId: link.paymentLinkId ?? null,
    },
    include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
  });

  await audit(tenant, "BILLING_PAYMENT_LINK", "BillingPayment", updated.id, {
    hasLink: Boolean(updated.paymentLinkUrl),
  });

  return ok(c, serializePayment(updated));
});

paymentRoutes.get("/payments", validate("query", listQuery), async (c) => {
  const tenant = requireView(c);
  const query = c.req.valid("query");
  const where: Prisma.BillingPaymentWhereInput = {
    ...clinicWhere(tenant),
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.coupleId ? { coupleId: query.coupleId } : {}),
    ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
    ...(query.provider ? { provider: query.provider as never } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.billingPayment.count({ where }),
    prisma.billingPayment.findMany({
      where,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, title: true } },
        refunds: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return ok(c, paginated(rows.map(serializePayment), query.page, query.pageSize, total));
});

paymentRoutes.get("/payments/:id", validate("param", idParam), async (c) => {
  const tenant = requireView(c);
  const payment = await prisma.billingPayment.findFirst({
    where: { id: c.req.valid("param").id, ...clinicWhere(tenant) },
    include: {
      invoice: { select: { id: true, invoiceNumber: true, title: true } },
      refunds: true,
    },
  });
  await requireClinicOwned(tenant, payment);
  return ok(c, serializePayment(payment!));
});

paymentRoutes.post(
  "/payments/:id/refunds",
  validate("param", idParam),
  validate("json", createRefundSchema),
  async (c) => {
    const tenant = requireRefund(c);
    const body = c.req.valid("json");
    const payment = await prisma.billingPayment.findFirst({
      where: { id: c.req.valid("param").id, ...clinicWhere(tenant) },
      include: { refunds: true },
    });
    await requireClinicOwned(tenant, payment);
    if (!payment) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Payment not found");
    if (payment.status !== "SUCCESS" && payment.status !== "PARTIALLY_REFUNDED") {
      throw new HttpError(400, "PAYMENT_NOT_REFUNDABLE", "Only successful payments can be refunded");
    }

    const alreadyRefunded = payment.refunds
      .filter((r) => r.status === "SUCCESS")
      .reduce((sum, r) => sum + dec(r.amount), 0);
    const refundable = Math.round((dec(payment.amount) - alreadyRefunded) * 100) / 100;
    const amount = body.amount ?? refundable;
    if (amount <= 0 || amount > refundable + 0.001) {
      throw new HttpError(400, "INVALID_REFUND_AMOUNT", `Refundable amount is ₹${refundable.toFixed(2)}`);
    }

    let gatewayRefundId: string | null = null;
    let refundStatus: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING" = "SUCCESS";
    let failureReason: string | null = null;

    if (!isManualProvider(payment.provider)) {
      const connection = payment.gatewayConnectionId
        ? await prisma.paymentGatewayConnection.findUnique({ where: { id: payment.gatewayConnectionId } })
        : await getConnectionForProvider(tenant.clinicId, payment.provider as PaymentGatewayProvider);
      if (!connection || !payment.gatewayPaymentId) {
        throw new HttpError(400, "GATEWAY_NOT_READY", "Gateway payment reference missing for refund");
      }
      const credentials = decryptConnection(connection);
      const adapter = getAdapter(connection.provider);
      const result = await adapter.createRefund(credentials, connection.mode, {
        gatewayPaymentId: payment.gatewayPaymentId,
        amountInr: amount,
        ...(body.reason ? { reason: body.reason } : {}),
      });
      gatewayRefundId = result.gatewayRefundId ?? null;
      refundStatus = result.status;
      failureReason = result.failureReason ?? null;
      if (!result.ok && result.status === "FAILED") {
        throw new HttpError(400, "REFUND_FAILED", result.failureReason ?? "Refund failed");
      }
    }

    const { refund } = await prisma.$transaction(async (tx) => {
      const fresh = await tx.billingPayment.findUniqueOrThrow({ where: { id: payment.id } });
      return applyRefund(tx, fresh, amount, {
        gatewayRefundId,
        ...(body.reason !== undefined ? { reason: body.reason } : {}),
        createdById: tenant.userId,
        status: refundStatus,
        failureReason,
      });
    });

    await audit(tenant, "BILLING_PAYMENT_REFUND", "BillingRefund", refund.id, {
      paymentId: payment.id,
      amount,
      status: refund.status,
    });

    return ok(c, serializeRefund(refund), 201);
  },
);

paymentRoutes.get("/patients/:patientId/financials", validate("param", patientParam), async (c) => {
  const tenant = requireView(c);
  const patientId = c.req.valid("param").patientId;
  await requireClinicOwned(
    tenant,
    await prisma.patient.findFirst({ where: { id: patientId, clinicId: tenant.clinicId } }),
  );

  const [invoices, payments] = await Promise.all([
    prisma.billingInvoice.findMany({
      where: { clinicId: tenant.clinicId, patientId },
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
    }),
    prisma.billingPayment.findMany({
      where: { clinicId: tenant.clinicId, patientId },
      include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const outstandingTotal = invoices.reduce((sum, inv) => sum + outstanding(inv), 0);
  const collected = payments
    .filter((p) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED")
    .reduce((sum, p) => sum + dec(p.amount), 0);

  return ok(c, {
    patientId,
    outstanding: Math.round(outstandingTotal * 100) / 100,
    collected: Math.round(collected * 100) / 100,
    invoices: invoices.map(serializeInvoice),
    payments: payments.map(serializePayment),
  });
});

paymentRoutes.get("/couples/:coupleId/financials", validate("param", coupleParam), async (c) => {
  const tenant = requireView(c);
  const coupleId = c.req.valid("param").coupleId;
  await requireClinicOwned(
    tenant,
    await prisma.couple.findFirst({ where: { id: coupleId, clinicId: tenant.clinicId } }),
  );

  const [invoices, payments] = await Promise.all([
    prisma.billingInvoice.findMany({
      where: { clinicId: tenant.clinicId, coupleId },
      include: invoiceInclude,
      orderBy: { issuedAt: "desc" },
    }),
    prisma.billingPayment.findMany({
      where: { clinicId: tenant.clinicId, coupleId },
      include: { invoice: { select: { id: true, invoiceNumber: true, title: true } }, refunds: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const outstandingTotal = invoices.reduce((sum, inv) => sum + outstanding(inv), 0);
  const collected = payments
    .filter((p) => p.status === "SUCCESS" || p.status === "PARTIALLY_REFUNDED")
    .reduce((sum, p) => sum + dec(p.amount), 0);

  return ok(c, {
    coupleId,
    outstanding: Math.round(outstandingTotal * 100) / 100,
    collected: Math.round(collected * 100) / 100,
    invoices: invoices.map(serializeInvoice),
    payments: payments.map(serializePayment),
  });
});

paymentRoutes.post("/pharmacy-sales/:saleId/invoice", validate("param", saleParam), async (c) => {
  const tenant = requireCreate(c);
  const saleId = c.req.valid("param").saleId;
  const sale = await prisma.pharmacySale.findFirst({
    where: { id: saleId, clinicId: tenant.clinicId },
    include: { items: { include: { product: { select: { name: true } } } }, billingInvoice: true },
  });
  await requireClinicOwned(tenant, sale);
  if (!sale) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Pharmacy sale not found");

  if (sale.billingInvoice) {
    const existing = await prisma.billingInvoice.findUnique({
      where: { id: sale.billingInvoice.id },
      include: invoiceInclude,
    });
    return ok(c, serializeInvoice(existing!));
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await nextInvoiceNumber(tenant.clinicId, tx);
    const lines =
      sale.items.length > 0
        ? sale.items.map((item) => ({
            description: item.product.name,
            quantity: item.quantity,
            unitAmount: item.unitPrice,
            lineTotal: item.lineTotal,
          }))
        : [
            {
              description: `Pharmacy sale ${sale.invoiceNumber}`,
              quantity: 1,
              unitAmount: sale.totalAmount,
              lineTotal: sale.totalAmount,
            },
          ];

    const created = await tx.billingInvoice.create({
      data: {
        clinicId: tenant.clinicId,
        invoiceNumber,
        patientId: sale.patientId,
        coupleId: sale.coupleId,
        pharmacySaleId: sale.id,
        source: "PHARMACY",
        title: `Pharmacy ${sale.invoiceNumber}`,
        currency: "INR",
        totalAmount: sale.totalAmount,
        paidAmount: sale.paymentStatus === "PAID" ? sale.totalAmount : money(0),
        status: sale.paymentStatus === "PAID" ? "PAID" : sale.paymentStatus === "PARTIAL" ? "PARTIALLY_PAID" : "ISSUED",
        paidAt: sale.paymentStatus === "PAID" ? sale.soldAt : null,
        createdById: tenant.userId,
        lines: { create: lines },
      },
      include: invoiceInclude,
    });
    return created;
  });

  await audit(tenant, "BILLING_INVOICE_FROM_PHARMACY", "BillingInvoice", invoice.id, {
    pharmacySaleId: sale.id,
  });

  return ok(c, serializeInvoice(invoice), 201);
});

paymentRoutes.get("/receipts/:paymentId", validate("param", paymentIdParam), async (c) => {
  const tenant = requireView(c);
  const payment = await prisma.billingPayment.findFirst({
    where: { id: c.req.valid("param").paymentId, ...clinicWhere(tenant) },
    include: {
      invoice: true,
      patient: { select: patientSelect },
    },
  });
  await requireClinicOwned(tenant, payment);
  if (!payment) throw new HttpError(404, "RESOURCE_NOT_FOUND", "Payment not found");

  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: tenant.clinicId },
    select: { name: true },
  });
  const patientName = payment.patient
    ? `${payment.patient.firstName} ${payment.patient.lastName}`.trim()
    : null;

  return ok(c, {
    paymentId: payment.id,
    text: formatReceiptText({
      clinicName: clinic.name,
      payment,
      invoice: payment.invoice,
      patientName,
    }),
  });
});
