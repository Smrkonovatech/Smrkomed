import { createHash } from "node:crypto";

import { Hono } from "hono";
import type { PaymentGatewayProvider } from "@prisma/client";
import { prisma, writeAuditLog } from "@smrkomed/database";

import { getAdapter } from "./providers";
import {
  applySuccessfulPayment,
  decryptConnection,
  getConnectionForProvider,
} from "./service";

export const paymentWebhookRoutes = new Hono();

function headerMap(headers: Headers): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  headers.forEach((value, key) => {
    out[key] = value;
    out[key.toLowerCase()] = value;
  });
  return out;
}

function payloadHash(rawBody: string) {
  return createHash("sha256").update(rawBody).digest("hex");
}

async function handleWebhook(provider: PaymentGatewayProvider, rawBody: string, headers: Headers) {
  const adapter = getAdapter(provider);
  const headerObj = headerMap(headers);

  let parsed: ReturnType<typeof adapter.parseWebhook>;
  try {
    parsed = adapter.parseWebhook(rawBody);
  } catch {
    return { ok: false as const, status: 400 as const, message: "Invalid webhook payload" };
  }

  const existing = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_externalEventId: {
        provider,
        externalEventId: parsed.externalEventId,
      },
    },
  });
  if (existing?.processed) {
    return { ok: true as const, duplicate: true, eventId: existing.id };
  }

  // Resolve payment by gateway references first. Never fall back to an arbitrary clinic
  // connection — that would decrypt the wrong merchant credentials in multi-tenant setups.
  let payment =
    (parsed.smrkomedPaymentId
      ? await prisma.billingPayment.findFirst({
          where: { id: parsed.smrkomedPaymentId, provider },
        })
      : null) ??
    (parsed.gatewayPaymentId
      ? await prisma.billingPayment.findFirst({
          where: { gatewayPaymentId: parsed.gatewayPaymentId, provider },
        })
      : null) ??
    (parsed.gatewayOrderId
      ? await prisma.billingPayment.findFirst({
          where: { gatewayOrderId: parsed.gatewayOrderId, provider },
        })
      : null);

  let connection = payment?.gatewayConnectionId
    ? await prisma.paymentGatewayConnection.findUnique({ where: { id: payment.gatewayConnectionId } })
    : null;

  if (!connection && payment) {
    connection = await getConnectionForProvider(payment.clinicId, provider);
  }

  if (!connection?.encryptedCredentials) {
    const event = await prisma.paymentWebhookEvent.upsert({
      where: { provider_externalEventId: { provider, externalEventId: parsed.externalEventId } },
      create: {
        ...(payment?.clinicId ? { clinicId: payment.clinicId } : {}),
        provider,
        externalEventId: parsed.externalEventId,
        eventType: parsed.eventType,
        paymentId: payment?.id ?? null,
        processed: false,
        payloadHash: payloadHash(rawBody),
        error: payment
          ? "Gateway connection missing for payment clinic"
          : "Payment not found for webhook — cannot resolve clinic safely",
      },
      update: {
        error: payment
          ? "Gateway connection missing for payment clinic"
          : "Payment not found for webhook — cannot resolve clinic safely",
        payloadHash: payloadHash(rawBody),
      },
    });
    return {
      ok: false as const,
      status: 404 as const,
      message: "Unable to resolve payment/clinic for webhook",
      eventId: event.id,
    };
  }

  let credentials;
  try {
    credentials = decryptConnection(connection);
  } catch {
    return { ok: false as const, status: 400 as const, message: "Invalid gateway credentials" };
  }

  if (!adapter.verifyWebhookSignature(credentials, rawBody, headerObj)) {
    await prisma.paymentWebhookEvent.upsert({
      where: { provider_externalEventId: { provider, externalEventId: parsed.externalEventId } },
      create: {
        clinicId: connection.clinicId,
        provider,
        externalEventId: parsed.externalEventId,
        eventType: parsed.eventType,
        processed: false,
        payloadHash: payloadHash(rawBody),
        error: "Invalid signature",
      },
      update: {
        clinicId: connection.clinicId,
        error: "Invalid signature",
        payloadHash: payloadHash(rawBody),
      },
    });
    return { ok: false as const, status: 401 as const, message: "Invalid signature" };
  }

  const event = await prisma.paymentWebhookEvent.upsert({
    where: { provider_externalEventId: { provider, externalEventId: parsed.externalEventId } },
    create: {
      clinicId: connection.clinicId,
      provider,
      externalEventId: parsed.externalEventId,
      eventType: parsed.eventType,
      paymentId: payment?.id ?? null,
      processed: false,
      payloadHash: payloadHash(rawBody),
    },
    update: {
      clinicId: connection.clinicId,
      ...(payment?.id ? { paymentId: payment.id } : {}),
      payloadHash: payloadHash(rawBody),
      error: null,
    },
  });

  if (event.processed) {
    return { ok: true as const, duplicate: true, eventId: event.id };
  }

  if (!payment && (parsed.gatewayOrderId || parsed.gatewayPaymentId)) {
    payment =
      (parsed.gatewayPaymentId
        ? await prisma.billingPayment.findFirst({
            where: { clinicId: connection.clinicId, gatewayPaymentId: parsed.gatewayPaymentId },
          })
        : null) ??
      (parsed.gatewayOrderId
        ? await prisma.billingPayment.findFirst({
            where: { clinicId: connection.clinicId, gatewayOrderId: parsed.gatewayOrderId },
          })
        : null);
  }

  if (parsed.status === "SUCCESS" && payment && payment.status !== "SUCCESS") {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.billingPayment.findUniqueOrThrow({ where: { id: payment!.id } });
      if (parsed.gatewayPaymentId && !fresh.gatewayPaymentId) {
        await tx.billingPayment.update({
          where: { id: fresh.id },
          data: { gatewayPaymentId: parsed.gatewayPaymentId },
        });
        fresh.gatewayPaymentId = parsed.gatewayPaymentId;
      }
      await applySuccessfulPayment(tx, fresh);
      await tx.paymentWebhookEvent.update({
        where: { id: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
          paymentId: fresh.id,
          error: null,
        },
      });
    });

    const clinic = await prisma.clinic.findUnique({
      where: { id: connection.clinicId },
      select: { organizationId: true },
    });
    if (clinic) {
      await writeAuditLog({
        organizationId: clinic.organizationId,
        clinicId: connection.clinicId,
        actorId: null,
        action: "PAYMENT_WEBHOOK_SUCCESS",
        entityType: "BillingPayment",
        entityId: payment.id,
        metadata: {
          provider,
          eventType: parsed.eventType,
          externalEventId: parsed.externalEventId,
        },
      });
    }

    // In-app staff notification only — no automatic WhatsApp (requires explicit consent/config).
    if (payment.createdById) {
      const invoice = payment.invoiceId
        ? await prisma.billingInvoice.findUnique({
            where: { id: payment.invoiceId },
            select: { invoiceNumber: true },
          })
        : null;
      await prisma.notification
        .create({
          data: {
            clinicId: connection.clinicId,
            userId: payment.createdById,
            title: "Payment received",
            body: `₹${Number(payment.amount)} received${invoice ? ` for ${invoice.invoiceNumber}` : ""}.`,
            href: `/payments`,
          },
        })
        .catch(() => undefined);
    }
  } else if (parsed.status === "FAILED" && payment && payment.status === "PENDING") {
    await prisma.billingPayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: "Gateway reported failure" },
    });
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: { processed: true, processedAt: new Date(), paymentId: payment.id },
    });
  } else {
    await prisma.paymentWebhookEvent.update({
      where: { id: event.id },
      data: {
        processed: true,
        processedAt: new Date(),
        paymentId: payment?.id ?? null,
      },
    });
  }

  return { ok: true as const, duplicate: false, eventId: event.id };
}

paymentWebhookRoutes.post("/razorpay", async (c) => {
  const rawBody = await c.req.text();
  const result = await handleWebhook("RAZORPAY", rawBody, c.req.raw.headers);
  if (!result.ok) {
    return c.json({ success: false, error: { code: "WEBHOOK_REJECTED", message: result.message } }, result.status);
  }
  return c.json({ success: true, data: { received: true, duplicate: result.duplicate, eventId: result.eventId } });
});

paymentWebhookRoutes.post("/cashfree", async (c) => {
  const rawBody = await c.req.text();
  const result = await handleWebhook("CASHFREE", rawBody, c.req.raw.headers);
  if (!result.ok) {
    return c.json({ success: false, error: { code: "WEBHOOK_REJECTED", message: result.message } }, result.status);
  }
  return c.json({ success: true, data: { received: true, duplicate: result.duplicate, eventId: result.eventId } });
});

paymentWebhookRoutes.post("/payu", async (c) => {
  const rawBody = await c.req.text();
  const result = await handleWebhook("PAYU", rawBody, c.req.raw.headers);
  if (!result.ok) {
    return c.json({ success: false, error: { code: "WEBHOOK_REJECTED", message: result.message } }, result.status);
  }
  return c.json({ success: true, data: { received: true, duplicate: result.duplicate, eventId: result.eventId } });
});
