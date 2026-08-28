import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

export type StaffMap = Record<string, { id: string; name: string }>;

function day(offset: number, hour = 10) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function money(n: number) {
  return new Prisma.Decimal(n);
}

const DEMO_PRODUCTS = [
  {
    key: "folic",
    name: "Folic Acid 5 mg",
    genericName: "Folic Acid",
    brandName: "Folvite Demo",
    category: "Supplement",
    subCategory: "Tablet",
    manufacturer: "Demo Pharma Labs",
    medicineType: "Tablet",
    packSize: "30 tablets",
    unit: "tablet",
    prescriptionRequired: false,
    minimumStock: 40,
    reorderLevel: 60,
    purchase: 8,
    sell: 18,
    mrp: 22,
    gst: 5,
    imageUrl: "/pharmacy/folic-acid-5mg.svg",
    description: "Demo folic acid supplement commonly used in fertility care pathways. Sample packaging only.",
  },
  {
    key: "prog",
    name: "Progesterone 200 mg",
    genericName: "Progesterone",
    brandName: "Susten Demo",
    category: "Hormone",
    subCategory: "Capsule",
    manufacturer: "Demo Hormone Care",
    medicineType: "Capsule",
    packSize: "10 capsules",
    unit: "capsule",
    prescriptionRequired: true,
    minimumStock: 20,
    reorderLevel: 30,
    purchase: 180,
    sell: 320,
    mrp: 350,
    gst: 12,
    imageUrl: "/pharmacy/progesterone-200mg.svg",
    description: "Demo progesterone support medicine for clinic pharmacy inventory. Not a real branded pack.",
  },
  {
    key: "doxy",
    name: "Doxycycline 100 mg",
    genericName: "Doxycycline",
    brandName: "Doxy Demo",
    category: "Antibiotic",
    subCategory: "Capsule",
    manufacturer: "Demo AntiBio",
    medicineType: "Capsule",
    packSize: "10 capsules",
    unit: "capsule",
    prescriptionRequired: true,
    minimumStock: 15,
    reorderLevel: 25,
    purchase: 35,
    sell: 65,
    mrp: 75,
    gst: 12,
    imageUrl: "/pharmacy/doxycycline-100mg.svg",
    description: "Demo antibiotic stock item for pharmacy low-stock scenarios. Sample product only.",
  },
  {
    key: "vitd",
    name: "Vitamin D3 60,000 IU",
    genericName: "Cholecalciferol",
    brandName: "D3 Demo",
    category: "Supplement",
    subCategory: "Softgel",
    manufacturer: "Demo Nutri Labs",
    medicineType: "Softgel",
    packSize: "4 softgels",
    unit: "softgel",
    prescriptionRequired: false,
    minimumStock: 20,
    reorderLevel: 30,
    purchase: 35,
    sell: 65,
    mrp: 75,
    gst: 5,
    imageUrl: "/pharmacy/vitamin-d3-60k.svg",
    description: "Demo Vitamin D3 softgel used to demonstrate out-of-stock handling.",
  },
  {
    key: "iron",
    name: "Iron + Folic Acid",
    genericName: "Ferrous Fumarate + Folic Acid",
    brandName: "Orofer Demo",
    category: "Supplement",
    subCategory: "Tablet",
    manufacturer: "Demo Hematinics",
    medicineType: "Tablet",
    packSize: "30 tablets",
    unit: "tablet",
    prescriptionRequired: false,
    minimumStock: 35,
    reorderLevel: 50,
    purchase: 55,
    sell: 110,
    mrp: 125,
    gst: 5,
    imageUrl: "/pharmacy/iron-folic-acid.svg",
    description: "Demo iron + folic acid combination tablet for fertility support demos.",
  },
  {
    key: "amox",
    name: "Amoxicillin 500 mg",
    genericName: "Amoxicillin",
    brandName: "Mox Demo",
    category: "Antibiotic",
    subCategory: "Capsule",
    manufacturer: "Demo AntiBio",
    medicineType: "Capsule",
    packSize: "10 capsules",
    unit: "capsule",
    prescriptionRequired: true,
    minimumStock: 25,
    reorderLevel: 40,
    purchase: 45,
    sell: 85,
    mrp: 95,
    gst: 12,
    imageUrl: "/pharmacy/amoxicillin-500mg.svg",
    description: "Additional demo antibiotic for richer pharmacy catalogue.",
  },
  {
    key: "estra",
    name: "Estradiol Valerate 2 mg",
    genericName: "Estradiol",
    brandName: "Progynova Demo",
    category: "Hormone",
    subCategory: "Tablet",
    manufacturer: "Demo Hormone Care",
    medicineType: "Tablet",
    packSize: "28 tablets",
    unit: "tablet",
    prescriptionRequired: true,
    minimumStock: 15,
    reorderLevel: 25,
    purchase: 220,
    sell: 380,
    mrp: 420,
    gst: 12,
    imageUrl: "/pharmacy/estradiol-2mg.svg",
    description: "Demo estradiol tablet for hormone support inventory demos.",
  },
  {
    key: "gloves",
    name: "Surgical Gloves (M)",
    genericName: null,
    brandName: "MediGuard Demo",
    category: "Consumable",
    subCategory: "PPE",
    manufacturer: "Demo Medical Supplies",
    medicineType: "Consumable",
    packSize: "100 pairs",
    unit: "pack",
    prescriptionRequired: false,
    minimumStock: 5,
    reorderLevel: 10,
    purchase: 280,
    sell: 450,
    mrp: 500,
    gst: 18,
    imageUrl: "/pharmacy/surgical-gloves.svg",
    description: "Demo consumable item for non-prescription pharmacy stock.",
  },
] as const;

function buildDemoWhatsAppMessage(input: {
  patientFirstName: string;
  clinicName: string;
  medicineName: string;
  dosage: string;
  timeOfDay: string;
  instructions: string;
  appointmentLabel?: string | null;
}) {
  if (input.appointmentLabel) {
    return [
      `Hello ${input.patientFirstName},`,
      "",
      `Reminder from ${input.clinicName}.`,
      "",
      input.appointmentLabel,
      "",
      "Medication:",
      input.medicineName,
      "",
      "Instruction:",
      input.instructions,
      "",
      "Please follow the instructions provided by your doctor.",
      "",
      `— ${input.clinicName}`,
      "",
      "[DEMO — Message simulated, not sent]",
    ].join("\n");
  }

  return [
    `Hello ${input.patientFirstName},`,
    "",
    `Medication reminder from ${input.clinicName}.`,
    "",
    `Medicine: ${input.medicineName}`,
    `Dose: ${input.dosage}`,
    `Time: ${input.timeOfDay}`,
    `Instruction: ${input.instructions}`,
    "",
    "Please follow the medication instructions provided by your care team.",
    "",
    `— ${input.clinicName}`,
    "",
    "[DEMO — Message simulated, not sent]",
  ].join("\n");
}

/** Idempotent when called after pharmacy wipe in seed.ts. Creates demo-ready pharmacy catalogue. */
export async function seedClinicPharmacyData(input: {
  prisma: PrismaClient;
  clinicId: string;
  users: StaffMap;
  clinicName?: string;
  /** When true, wipe empty/partial pharmacy rows and reseed. Default: seed only if no batches. */
  force?: boolean;
}) {
  const { prisma, clinicId, users } = input;
  const clinicName = input.clinicName ?? "ABC Fertility Centre";
  const [productCount, batchCount] = await Promise.all([
    prisma.pharmacyProduct.count({ where: { clinicId } }),
    prisma.pharmacyBatch.count({ where: { clinicId } }),
  ]);

  // Skip only when imaged inventory already exists.
  const imagedCount = await prisma.pharmacyProduct.count({
    where: { clinicId, imageUrl: { not: null } },
  });
  if (!input.force && batchCount > 0 && imagedCount > 0) {
    return { skipped: true as const, products: productCount, batches: batchCount };
  }

  // Partial/empty catalogue (products without batches) — clear then seed.
  if (productCount > 0 || batchCount > 0) {
    await prisma.medicationReminder.deleteMany({ where: { clinicId } });
    await prisma.pharmacySaleItem.deleteMany({ where: { sale: { clinicId } } });
    await prisma.pharmacySale.deleteMany({ where: { clinicId } });
    await prisma.pharmacyPrescriptionItem.deleteMany({ where: { prescription: { clinicId } } });
    await prisma.pharmacyPrescription.deleteMany({ where: { clinicId } });
    await prisma.pharmacyPurchaseOrderItem.deleteMany({ where: { purchaseOrder: { clinicId } } });
    await prisma.pharmacyPurchaseOrder.deleteMany({ where: { clinicId } });
    await prisma.pharmacyStockMovement.deleteMany({ where: { clinicId } });
    await prisma.pharmacyBatch.deleteMany({ where: { clinicId } });
    await prisma.pharmacyProduct.deleteMany({ where: { clinicId } });
    await prisma.pharmacySupplier.deleteMany({ where: { clinicId } });
  }

  const admin = users["admin@abcfertility.demo"]!;
  const pharmacist = users["pharmacist@abcfertility.demo"] ?? admin;
  const doctor = users["ananya@abcfertility.demo"]!;

  await prisma.pharmacySetting.upsert({
    where: { clinicId },
    create: { clinicId, expiryWarningDays: 30, lowStockEnabled: true },
    update: { expiryWarningDays: 30, lowStockEnabled: true },
  });

  const suppliers = await Promise.all(
    [
      {
        name: "MedLife Distributors",
        contactPerson: "Ramesh Patel",
        phone: "+91 98765 41001",
        email: "orders@medlife.demo",
        address: "Peenya Industrial Area, Bangalore",
        gstNumber: "29AABCM1234A1Z5",
        licenseInfo: "DL-KA-DEMO-88421",
      },
      {
        name: "Fertility Care Wholesale",
        contactPerson: "Lakshmi Iyer",
        phone: "+91 98765 41004",
        email: "wholesale@fertcare.demo",
        address: "Jayanagar, Bangalore",
        gstNumber: "29AABCF3456D1Z7",
        licenseInfo: "DL-KA-DEMO-99110",
      },
      {
        name: "SafeHands Medical",
        contactPerson: "Vikram Singh",
        phone: "+91 98765 41005",
        email: "sales@safehands.demo",
        address: "Okhla, Delhi",
        gstNumber: "07AABCS7890E1Z1",
        licenseInfo: "DL-DL-DEMO-44088",
      },
    ].map((s) => prisma.pharmacySupplier.create({ data: { clinicId, ...s, status: "ACTIVE" } })),
  );

  const productByKey: Record<string, string> = {};
  for (const p of DEMO_PRODUCTS) {
    const row = await prisma.pharmacyProduct.create({
      data: {
        clinicId,
        name: p.name,
        genericName: p.genericName,
        brandName: p.brandName,
        category: p.category,
        subCategory: p.subCategory,
        manufacturer: p.manufacturer,
        medicineType: p.medicineType,
        packSize: p.packSize,
        unit: p.unit,
        prescriptionRequired: p.prescriptionRequired,
        minimumStock: p.minimumStock,
        reorderLevel: p.reorderLevel,
        defaultPurchasePrice: money(p.purchase),
        defaultSellingPrice: money(p.sell),
        defaultMrp: money(p.mrp),
        gstPercent: money(p.gst),
        imageUrl: p.imageUrl,
        description: p.description,
        status: "ACTIVE",
      },
    });
    productByKey[p.key] = row.id;
  }

  const batchSpecs: Array<{
    key: string;
    batchNumber: string;
    qty: number;
    expiryDays: number | null;
    supplierIdx: number;
    location: string;
  }> = [
    { key: "folic", batchNumber: "FA24001", qty: 120, expiryDays: 400, supplierIdx: 0, location: "Shelf A1" },
    { key: "folic", batchNumber: "FA24009", qty: 60, expiryDays: 650, supplierIdx: 0, location: "Shelf A1" },
    { key: "prog", batchNumber: "PR24007", qty: 45, expiryDays: 280, supplierIdx: 1, location: "Fridge B" },
    { key: "doxy", batchNumber: "DO24012", qty: 8, expiryDays: 200, supplierIdx: 0, location: "Shelf B2" }, // low
    { key: "vitd", batchNumber: "VD24004", qty: 0, expiryDays: 180, supplierIdx: 1, location: "Shelf C1" }, // out
    { key: "iron", batchNumber: "IF24003", qty: 75, expiryDays: 320, supplierIdx: 0, location: "Shelf A2" },
    { key: "amox", batchNumber: "AMX25001", qty: 40, expiryDays: 22, supplierIdx: 0, location: "Shelf B1" }, // expiring soon
    { key: "estra", batchNumber: "EST25001", qty: 28, expiryDays: 250, supplierIdx: 1, location: "Fridge B" },
    { key: "gloves", batchNumber: "GLV25001", qty: 12, expiryDays: null, supplierIdx: 2, location: "Store Room" },
  ];

  const batchByNumber: Record<string, string> = {};
  for (const spec of batchSpecs) {
    const product = DEMO_PRODUCTS.find((p) => p.key === spec.key)!;
    const productId = productByKey[spec.key]!;
    const batch = await prisma.pharmacyBatch.create({
      data: {
        clinicId,
        productId,
        supplierId: suppliers[spec.supplierIdx]!.id,
        batchNumber: spec.batchNumber,
        quantity: Math.max(spec.qty, 0),
        availableQuantity: spec.qty,
        purchasePrice: money(product.purchase),
        sellingPrice: money(product.sell),
        mrp: money(product.mrp),
        gstPercent: money(product.gst),
        expiryDate: spec.expiryDays === null ? null : day(spec.expiryDays),
        purchaseDate: day(-20),
        manufacturingDate: day(-180),
        storageLocation: spec.location,
      },
    });
    batchByNumber[spec.batchNumber] = batch.id;
    if (spec.qty > 0) {
      await prisma.pharmacyStockMovement.create({
        data: {
          clinicId,
          productId,
          batchId: batch.id,
          type: "PURCHASE",
          quantity: spec.qty,
          balanceAfter: spec.qty,
          reason: "Demo seed stock",
          referenceType: "SEED",
          actorUserId: pharmacist.id,
          createdAt: day(-20),
        },
      });
    }
  }

  // Purchase orders (minimal demo set)
  await prisma.pharmacyPurchaseOrder.create({
    data: {
      clinicId,
      supplierId: suppliers[0]!.id,
      orderNumber: "PO-DEMO-001",
      orderDate: day(-10),
      expectedDelivery: day(3),
      status: "ORDERED",
      taxAmount: money(120),
      totalAmount: money(2400),
      notes: "Reorder folic acid + iron",
      items: {
        create: [
          {
            productId: productByKey["folic"]!,
            quantityOrdered: 100,
            purchasePrice: money(8),
            mrp: money(22),
          },
          {
            productId: productByKey["iron"]!,
            quantityOrdered: 50,
            purchasePrice: money(55),
            mrp: money(125),
          },
        ],
      },
    },
  });

  const couples = await prisma.couple.findMany({
    where: { clinicId },
    include: {
      primaryPatient: true,
      partnerPatient: true,
      appointments: { where: { status: { in: ["CONFIRMED", "WAITING"] }, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 1 },
      treatments: { where: { status: "ACTIVE" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const mohit = couples.find((c) => c.slug === "mohit-shru") ?? couples[0];
  const arjun = couples.find((c) => c.slug === "arjun-neha") ?? couples[1];
  const rohan = couples.find((c) => c.slug === "rohan-priya") ?? couples[2];

  // Ensure Vitamin D stays at 0 available (out of stock demo)
  // Sales sample for dashboard
  const folicBatch = batchByNumber["FA24001"]!;
  const saleQty = 5;
  const folicProduct = DEMO_PRODUCTS.find((p) => p.key === "folic")!;
  const sale = await prisma.pharmacySale.create({
    data: {
      clinicId,
      invoiceNumber: "PHARM-DEMO-0001",
      patientId: mohit?.primaryPatientId ?? null,
      coupleId: mohit?.id ?? null,
      doctorName: doctor.name,
      subtotal: money(folicProduct.sell * saleQty),
      taxAmount: money(Math.round(folicProduct.sell * saleQty * 0.05 * 100) / 100),
      totalAmount: money(Math.round(folicProduct.sell * saleQty * 1.05 * 100) / 100),
      paymentMethod: "UPI",
      paymentStatus: "PAID",
      createdById: pharmacist.id,
      soldAt: new Date(),
      items: {
        create: [
          {
            productId: productByKey["folic"]!,
            batchId: folicBatch,
            quantity: saleQty,
            unitPrice: money(folicProduct.sell),
            taxAmount: money(Math.round(folicProduct.sell * saleQty * 0.05 * 100) / 100),
            lineTotal: money(Math.round(folicProduct.sell * saleQty * 1.05 * 100) / 100),
          },
        ],
      },
    },
  });
  const folicBefore = await prisma.pharmacyBatch.findUniqueOrThrow({ where: { id: folicBatch } });
  const folicAfter = folicBefore.availableQuantity - saleQty;
  await prisma.pharmacyBatch.update({
    where: { id: folicBatch },
    data: { availableQuantity: folicAfter },
  });
  await prisma.pharmacyStockMovement.create({
    data: {
      clinicId,
      productId: productByKey["folic"]!,
      batchId: folicBatch,
      type: "SALE",
      quantity: -saleQty,
      balanceAfter: folicAfter,
      reason: "Demo sale",
      referenceType: "PharmacySale",
      referenceId: sale.id,
      actorUserId: pharmacist.id,
    },
  });

  async function createRx(input: {
    couple: (typeof couples)[number] | undefined;
    patientId: string;
    status: "PENDING" | "PARTIALLY_DISPENSED" | "DISPENSED";
    appointmentId?: string | null;
    treatmentId?: string | null;
    notes?: string;
    items: Array<{
      productKey: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string;
      timeOfDay: string;
      beforeAfterFood: string;
      quantity: number;
      dispensed?: number;
      startOffsetDays: number;
      endOffsetDays: number;
      reminderOffsetsHours: number[];
    }>;
  }) {
    if (!input.couple) return null;
    const patient = await prisma.patient.findUniqueOrThrow({ where: { id: input.patientId } });
    const consent = await prisma.consent.findUnique({
      where: {
        patientId_consentType_channel: {
          patientId: patient.id,
          consentType: "WHATSAPP_COMMUNICATION",
          channel: "WHATSAPP",
        },
      },
    });
    const hasConsent = consent?.status === "GRANTED";

    const prepared = [];
    for (const item of input.items) {
      const product = DEMO_PRODUCTS.find((p) => p.key === item.productKey)!;
      const careTask = await prisma.careTask.create({
        data: {
          clinicId,
          coupleId: input.couple.id,
          title: `Take prescribed medication — ${product.name}`,
          description: `${item.dosage} · ${item.frequency} · ${item.instructions}`,
          category: "Medication",
          status: "WAITING",
          priority: "NORMAL",
          dueDate: day(item.startOffsetDays),
          dueTime: item.timeOfDay,
          createdById: doctor.id,
        },
      });
      prepared.push({ item, product, careTaskId: careTask.id });
    }

    const rx = await prisma.pharmacyPrescription.create({
      data: {
        clinicId,
        patientId: patient.id,
        coupleId: input.couple.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        appointmentId: input.appointmentId ?? null,
        treatmentId: input.treatmentId ?? null,
        prescriptionDate: day(-1),
        status: input.status,
        notes: input.notes ?? null,
        items: {
          create: prepared.map(({ item, product, careTaskId }) => ({
            productId: productByKey[item.productKey]!,
            medicineName: product.name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            timeOfDay: item.timeOfDay,
            beforeAfterFood: item.beforeAfterFood,
            quantityPrescribed: item.quantity,
            quantityDispensed: item.dispensed ?? 0,
            startDate: day(item.startOffsetDays),
            endDate: day(item.endOffsetDays),
            careTaskId,
          })),
        },
      },
      include: { items: true },
    });

    const appointmentLabel =
      input.appointmentId && input.couple.appointments[0]
        ? `Your ${input.couple.appointments[0].type} is scheduled for ${input.couple.appointments[0].startsAt.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}.`
        : null;

    for (const rxItem of rx.items) {
      const preparedItem = prepared.find((p) => p.product.name === rxItem.medicineName);
      if (!preparedItem) continue;
      for (const hours of preparedItem.item.reminderOffsetsHours) {
        const scheduledAt = new Date(Date.now() + hours * 3_600_000);
        const body = buildDemoWhatsAppMessage({
          patientFirstName: patient.firstName,
          clinicName,
          medicineName: rxItem.medicineName,
          dosage: rxItem.dosage ?? "",
          timeOfDay: rxItem.timeOfDay ?? "",
          instructions: rxItem.instructions ?? "",
          appointmentLabel,
        });
        await prisma.medicationReminder.create({
          data: {
            clinicId,
            prescriptionItemId: rxItem.id,
            patientId: patient.id,
            careTaskId: preparedItem.careTaskId,
            scheduledAt,
            status: hasConsent ? "SCHEDULED" : "SKIPPED_NO_CONSENT",
            channel: "WHATSAPP",
            demoMode: true,
            demoMessageBody: body,
            failureReason: hasConsent ? null : "WhatsApp reminders are disabled for this patient.",
          },
        });
      }
    }

    return rx;
  }

  // Prescription 1 — Mohit/Shru with folic + progesterone, linked to upcoming appointment if present
  await createRx({
    couple: mohit,
    patientId: mohit?.partnerPatientId ?? mohit!.primaryPatientId,
    status: "PENDING",
    appointmentId: mohit?.appointments[0]?.id ?? null,
    treatmentId: mohit?.treatments[0]?.id ?? null,
    notes: "Pre-treatment support medicines",
    items: [
      {
        productKey: "folic",
        dosage: "1 tablet",
        frequency: "Once daily",
        duration: "30 days",
        instructions: "Take 1 tablet every morning after breakfast.",
        timeOfDay: "09:00",
        beforeAfterFood: "AFTER",
        quantity: 30,
        startOffsetDays: 0,
        endOffsetDays: 30,
        reminderOffsetsHours: [2, 26],
      },
      {
        productKey: "prog",
        dosage: "1 capsule",
        frequency: "Once daily",
        duration: "14 days",
        instructions: mohit?.appointments[0]
          ? "Take as prescribed before your scheduled scan."
          : "Take 1 capsule at bedtime.",
        timeOfDay: "21:00",
        beforeAfterFood: "ANY",
        quantity: 14,
        startOffsetDays: 0,
        endOffsetDays: 14,
        reminderOffsetsHours: [4, 28],
      },
    ],
  });

  // Prescription 2 — Arjun/Neha different schedule
  await createRx({
    couple: arjun,
    patientId: arjun?.primaryPatientId ?? arjun!.primaryPatientId,
    status: "PENDING",
    notes: "Cycle support",
    items: [
      {
        productKey: "iron",
        dosage: "1 tablet",
        frequency: "Once daily",
        duration: "21 days",
        instructions: "Take 1 tablet after lunch with water.",
        timeOfDay: "13:30",
        beforeAfterFood: "AFTER",
        quantity: 21,
        startOffsetDays: 0,
        endOffsetDays: 21,
        reminderOffsetsHours: [3],
      },
      {
        productKey: "doxy",
        dosage: "1 capsule",
        frequency: "Twice daily",
        duration: "7 days",
        instructions: "Take 1 capsule morning and night after food.",
        timeOfDay: "08:00",
        beforeAfterFood: "AFTER",
        quantity: 14,
        startOffsetDays: 0,
        endOffsetDays: 7,
        reminderOffsetsHours: [5],
      },
    ],
  });

  // Prescription 3 — Rohan/Priya appointment-linked / treatment prep
  await createRx({
    couple: rohan,
    patientId: rohan?.partnerPatientId ?? rohan!.primaryPatientId,
    status: "PENDING",
    appointmentId: rohan?.appointments[0]?.id ?? null,
    treatmentId: rohan?.treatments[0]?.id ?? null,
    notes: "Procedure preparation",
    items: [
      {
        productKey: "estra",
        dosage: "1 tablet",
        frequency: "Once daily",
        duration: "10 days",
        instructions: rohan?.appointments[0]
          ? "Take medicine at 9:00 AM, one hour before the scan."
          : "Take as prescribed on the morning of the procedure.",
        timeOfDay: "09:00",
        beforeAfterFood: "BEFORE",
        quantity: 10,
        startOffsetDays: 0,
        endOffsetDays: 10,
        reminderOffsetsHours: [6, 30],
      },
    ],
  });

  return {
    skipped: false as const,
    products: DEMO_PRODUCTS.length,
    suppliers: suppliers.length,
    batches: batchSpecs.length,
    purchaseOrders: 1,
    sales: 1,
    prescriptions: 3,
  };
}
