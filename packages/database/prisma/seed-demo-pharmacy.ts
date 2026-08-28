import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

import { day, type StaffMap } from "./seed-demo-types";

function money(n: number) {
  return new Prisma.Decimal(n);
}

const PRODUCTS = [
  { name: "Paracetamol 500mg", genericName: "Paracetamol", brandName: "Crocin", category: "Analgesic", subCategory: "Tablet", manufacturer: "GSK", medicineType: "Tablet", packSize: "15 tablets", prescriptionRequired: false, minimumStock: 50, reorderLevel: 80, purchase: 12, sell: 25, mrp: 30, gst: 5 },
  { name: "Amoxicillin 500mg", genericName: "Amoxicillin", brandName: "Mox", category: "Antibiotic", subCategory: "Capsule", manufacturer: "Cipla", medicineType: "Capsule", packSize: "10 capsules", prescriptionRequired: true, minimumStock: 30, reorderLevel: 40, purchase: 45, sell: 85, mrp: 95, gst: 12 },
  { name: "Folic Acid 5mg", genericName: "Folic Acid", brandName: "Folvite", category: "Supplement", subCategory: "Tablet", manufacturer: "Pfizer", medicineType: "Tablet", packSize: "30 tablets", prescriptionRequired: false, minimumStock: 40, reorderLevel: 60, purchase: 8, sell: 18, mrp: 22, gst: 5 },
  { name: "Progesterone 200mg", genericName: "Progesterone", brandName: "Susten", category: "Hormone", subCategory: "Capsule", manufacturer: "Sun Pharma", medicineType: "Capsule", packSize: "10 capsules", prescriptionRequired: true, minimumStock: 20, reorderLevel: 30, purchase: 180, sell: 320, mrp: 350, gst: 12 },
  { name: "Vitamin D3 60k IU", genericName: "Cholecalciferol", brandName: "Uprise-D3", category: "Supplement", subCategory: "Capsule", manufacturer: "Alkem", medicineType: "Capsule", packSize: "4 capsules", prescriptionRequired: false, minimumStock: 25, reorderLevel: 40, purchase: 35, sell: 65, mrp: 75, gst: 5 },
  { name: "Iron + Folic Acid", genericName: "Ferrous Fumarate + Folic Acid", brandName: "Orofer XT", category: "Supplement", subCategory: "Tablet", manufacturer: "Emcure", medicineType: "Tablet", packSize: "30 tablets", prescriptionRequired: false, minimumStock: 35, reorderLevel: 50, purchase: 55, sell: 110, mrp: 125, gst: 5 },
  { name: "Estradiol Valerate 2mg", genericName: "Estradiol", brandName: "Progynova", category: "Hormone", subCategory: "Tablet", manufacturer: "Bayer", medicineType: "Tablet", packSize: "28 tablets", prescriptionRequired: true, minimumStock: 15, reorderLevel: 25, purchase: 220, sell: 380, mrp: 420, gst: 12 },
  { name: "Cetrorelix 0.25mg", genericName: "Cetrorelix", brandName: "Cetrotide", category: "Hormone", subCategory: "Injection", manufacturer: "Merck", medicineType: "Injection", packSize: "1 vial", prescriptionRequired: true, minimumStock: 10, reorderLevel: 15, purchase: 1850, sell: 2450, mrp: 2600, gst: 12 },
  { name: "hCG 5000 IU", genericName: "Human Chorionic Gonadotropin", brandName: "Pubergen", category: "Hormone", subCategory: "Injection", manufacturer: "Sanzyme", medicineType: "Injection", packSize: "1 vial", prescriptionRequired: true, minimumStock: 12, reorderLevel: 20, purchase: 420, sell: 650, mrp: 720, gst: 12 },
  { name: "Metformin 500mg", genericName: "Metformin", brandName: "Glycomet", category: "Metabolic", subCategory: "Tablet", manufacturer: "USV", medicineType: "Tablet", packSize: "20 tablets", prescriptionRequired: true, minimumStock: 40, reorderLevel: 60, purchase: 18, sell: 35, mrp: 42, gst: 12 },
  { name: "Aspirin 75mg", genericName: "Aspirin", brandName: "Ecosprin", category: "Cardiovascular", subCategory: "Tablet", manufacturer: "USV", medicineType: "Tablet", packSize: "14 tablets", prescriptionRequired: true, minimumStock: 30, reorderLevel: 45, purchase: 10, sell: 22, mrp: 28, gst: 12 },
  { name: "Dydrogesterone 10mg", genericName: "Dydrogesterone", brandName: "Duphaston", category: "Hormone", subCategory: "Tablet", manufacturer: "Abbott", medicineType: "Tablet", packSize: "10 tablets", prescriptionRequired: true, minimumStock: 20, reorderLevel: 30, purchase: 280, sell: 450, mrp: 495, gst: 12 },
  { name: "Cabergoline 0.5mg", genericName: "Cabergoline", brandName: "Cabgolin", category: "Hormone", subCategory: "Tablet", manufacturer: "Sun Pharma", medicineType: "Tablet", packSize: "4 tablets", prescriptionRequired: true, minimumStock: 10, reorderLevel: 15, purchase: 320, sell: 520, mrp: 560, gst: 12 },
  { name: "Letrozole 2.5mg", genericName: "Letrozole", brandName: "Letroz", category: "Hormone", subCategory: "Tablet", manufacturer: "Sun Pharma", medicineType: "Tablet", packSize: "5 tablets", prescriptionRequired: true, minimumStock: 15, reorderLevel: 25, purchase: 95, sell: 160, mrp: 180, gst: 12 },
  { name: "Clomiphene 50mg", genericName: "Clomiphene Citrate", brandName: "Fertomid", category: "Hormone", subCategory: "Tablet", manufacturer: "Cipla", medicineType: "Tablet", packSize: "10 tablets", prescriptionRequired: true, minimumStock: 20, reorderLevel: 30, purchase: 48, sell: 85, mrp: 95, gst: 12 },
  { name: "Calcium + Vitamin D3", genericName: "Calcium Carbonate + Vit D3", brandName: "Shelcal", category: "Supplement", subCategory: "Tablet", manufacturer: "Torrent", medicineType: "Tablet", packSize: "15 tablets", prescriptionRequired: false, minimumStock: 40, reorderLevel: 55, purchase: 42, sell: 78, mrp: 90, gst: 5 },
  { name: "Omeprazole 20mg", genericName: "Omeprazole", brandName: "Omez", category: "GI", subCategory: "Capsule", manufacturer: "Dr Reddy's", medicineType: "Capsule", packSize: "15 capsules", prescriptionRequired: false, minimumStock: 35, reorderLevel: 50, purchase: 22, sell: 45, mrp: 55, gst: 12 },
  { name: "Ondansetron 4mg", genericName: "Ondansetron", brandName: "Emeset", category: "GI", subCategory: "Tablet", manufacturer: "Cipla", medicineType: "Tablet", packSize: "10 tablets", prescriptionRequired: true, minimumStock: 25, reorderLevel: 35, purchase: 28, sell: 55, mrp: 65, gst: 12 },
  { name: "Dexamethasone 0.5mg", genericName: "Dexamethasone", brandName: "Decadron", category: "Steroid", subCategory: "Tablet", manufacturer: "Wockhardt", medicineType: "Tablet", packSize: "10 tablets", prescriptionRequired: true, minimumStock: 15, reorderLevel: 25, purchase: 15, sell: 32, mrp: 40, gst: 12 },
  { name: "Surgical Gloves (M)", genericName: null, brandName: "MediGuard", category: "Consumable", subCategory: "PPE", manufacturer: "Hartalega", medicineType: "Consumable", packSize: "100 pairs", prescriptionRequired: false, minimumStock: 5, reorderLevel: 10, purchase: 280, sell: 450, mrp: 500, gst: 18 },
  { name: "Disposable Syringes 5ml", genericName: null, brandName: "Dispovan", category: "Consumable", subCategory: "Syringe", manufacturer: "Hindustan Syringes", medicineType: "Consumable", packSize: "100 pcs", prescriptionRequired: false, minimumStock: 8, reorderLevel: 12, purchase: 180, sell: 320, mrp: 360, gst: 12 },
  { name: "IV Set", genericName: null, brandName: "B.Braun", category: "Consumable", subCategory: "Infusion", manufacturer: "B.Braun", medicineType: "Consumable", packSize: "1 unit", prescriptionRequired: false, minimumStock: 20, reorderLevel: 30, purchase: 35, sell: 65, mrp: 75, gst: 12 },
  { name: "Alcohol Swabs", genericName: null, brandName: "CleanSwab", category: "Consumable", subCategory: "Antiseptic", manufacturer: "3M", medicineType: "Consumable", packSize: "100 pcs", prescriptionRequired: false, minimumStock: 10, reorderLevel: 20, purchase: 45, sell: 90, mrp: 110, gst: 18 },
  { name: "Pregnancy Test Kit", genericName: null, brandName: "PregaNews", category: "Diagnostic", subCategory: "Kit", manufacturer: "Mankind", medicineType: "Kit", packSize: "1 kit", prescriptionRequired: false, minimumStock: 20, reorderLevel: 30, purchase: 25, sell: 55, mrp: 65, gst: 12 },
  { name: "LH Surge Kit", genericName: null, brandName: "i-Know", category: "Diagnostic", subCategory: "Kit", manufacturer: "Piramal", medicineType: "Kit", packSize: "5 strips", prescriptionRequired: false, minimumStock: 15, reorderLevel: 25, purchase: 180, sell: 320, mrp: 350, gst: 12 },
  { name: "Normal Saline 500ml", genericName: "Sodium Chloride 0.9%", brandName: "NS", category: "IV Fluid", subCategory: "Infusion", manufacturer: "Baxter", medicineType: "Infusion", packSize: "500 ml", prescriptionRequired: true, minimumStock: 30, reorderLevel: 50, purchase: 28, sell: 55, mrp: 65, gst: 12 },
  { name: "Multivitamin Softgel", genericName: "Multivitamins", brandName: "Revital H", category: "Supplement", subCategory: "Capsule", manufacturer: "Ranbaxy", medicineType: "Capsule", packSize: "30 capsules", prescriptionRequired: false, minimumStock: 25, reorderLevel: 40, purchase: 95, sell: 175, mrp: 199, gst: 5 },
] as const;

const SUPPLIERS = [
  { name: "MedLife Distributors", contactPerson: "Ramesh Patel", phone: "+91 98765 41001", email: "orders@medlife.demo", address: "Peenya Industrial Area, Bangalore", gstNumber: "29AABCM1234A1Z5", licenseInfo: "DL-KA-2020-88421" },
  { name: "Apollo Pharma Supply", contactPerson: "Sneha Reddy", phone: "+91 98765 41002", email: "supply@apollopharma.demo", address: "Whitefield, Bangalore", gstNumber: "29AABCA5678B1Z9", licenseInfo: "DL-KA-2019-55210" },
  { name: "Cipla Direct", contactPerson: "Amit Shah", phone: "+91 98765 41003", email: "hospital@cipla.demo", address: "Vikhroli, Mumbai", gstNumber: "27AABCC9012C1Z3", licenseInfo: "DL-MH-2018-33102" },
  { name: "Fertility Care Wholesale", contactPerson: "Lakshmi Iyer", phone: "+91 98765 41004", email: "wholesale@fertcare.demo", address: "Jayanagar, Bangalore", gstNumber: "29AABCF3456D1Z7", licenseInfo: "DL-KA-2021-99110" },
  { name: "SafeHands Medical", contactPerson: "Vikram Singh", phone: "+91 98765 41005", email: "sales@safehands.demo", address: "Okhla, Delhi", gstNumber: "07AABCS7890E1Z1", licenseInfo: "DL-DL-2022-44088" },
  { name: "Sun Pharma Institutional", contactPerson: "Neha Gupta", phone: "+91 98765 41006", email: "inst@sunpharma.demo", address: "Vadodara, Gujarat", gstNumber: "24AABCS1122F1Z8", licenseInfo: "DL-GJ-2017-22011" },
] as const;

/** Idempotent pharmacy seed for one clinic. Safe to re-run (skips if products already exist). */
export async function seedClinicPharmacyData(input: {
  prisma: PrismaClient;
  clinicId: string;
  users: StaffMap;
}) {
  const { prisma, clinicId, users } = input;
  const existing = await prisma.pharmacyProduct.count({ where: { clinicId } });
  if (existing > 0) {
    return { skipped: true as const, products: existing };
  }

  const admin = users["admin@abcfertility.demo"]!;
  const pharmacist = users["pharmacist@abcfertility.demo"] ?? admin;
  const doctor = users["ananya@abcfertility.demo"]!;

  await prisma.pharmacySetting.upsert({
    where: { clinicId },
    create: { clinicId, expiryWarningDays: 30, lowStockEnabled: true },
    update: {},
  });

  const supplierIds: string[] = [];
  for (const s of SUPPLIERS) {
    const row = await prisma.pharmacySupplier.create({
      data: { clinicId, ...s, status: "ACTIVE" },
    });
    supplierIds.push(row.id);
  }

  const productIds: string[] = [];
  for (const p of PRODUCTS) {
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
        unit: p.medicineType === "Consumable" || p.medicineType === "Kit" ? "pack" : "unit",
        prescriptionRequired: p.prescriptionRequired,
        minimumStock: p.minimumStock,
        reorderLevel: p.reorderLevel,
        defaultPurchasePrice: money(p.purchase),
        defaultSellingPrice: money(p.sell),
        defaultMrp: money(p.mrp),
        gstPercent: money(p.gst),
        status: "ACTIVE",
        description: `${p.name} for clinic pharmacy inventory.`,
      },
    });
    productIds.push(row.id);
  }

  // Batch scenarios: normal, low, out, expiring, expired, multi-batch
  const batchSpecs: Array<{
    productIdx: number;
    batchNumber: string;
    qty: number;
    expiryDays: number | null;
    supplierIdx: number;
    sold?: number;
  }> = [
    { productIdx: 0, batchNumber: "PCM24001", qty: 100, expiryDays: 400, supplierIdx: 0 },
    { productIdx: 0, batchNumber: "PCM24002", qty: 50, expiryDays: 550, supplierIdx: 0 },
    { productIdx: 1, batchNumber: "AMX25001", qty: 80, expiryDays: 300, supplierIdx: 2 },
    { productIdx: 2, batchNumber: "FOL25001", qty: 18, expiryDays: 200, supplierIdx: 1 }, // low stock
    { productIdx: 3, batchNumber: "PRG25001", qty: 40, expiryDays: 180, supplierIdx: 3 },
    { productIdx: 4, batchNumber: "VIT25001", qty: 60, expiryDays: 25, supplierIdx: 1 }, // expiring soon
    { productIdx: 5, batchNumber: "IRN25001", qty: 55, expiryDays: 365, supplierIdx: 0 },
    { productIdx: 6, batchNumber: "EST25001", qty: 28, expiryDays: 220, supplierIdx: 3 },
    { productIdx: 7, batchNumber: "CET25001", qty: 8, expiryDays: 120, supplierIdx: 3 }, // low
    { productIdx: 8, batchNumber: "HCG25001", qty: 22, expiryDays: 150, supplierIdx: 3 },
    { productIdx: 9, batchNumber: "MET25001", qty: 90, expiryDays: 400, supplierIdx: 2 },
    { productIdx: 10, batchNumber: "ASP25001", qty: 0, expiryDays: 200, supplierIdx: 1 }, // out of stock
    { productIdx: 11, batchNumber: "DYD25001", qty: 35, expiryDays: 250, supplierIdx: 5 },
    { productIdx: 12, batchNumber: "CAB25001", qty: 12, expiryDays: 18, supplierIdx: 5 }, // expiring
    { productIdx: 13, batchNumber: "LET25001", qty: 40, expiryDays: 300, supplierIdx: 5 },
    { productIdx: 14, batchNumber: "CLO25001", qty: 45, expiryDays: 280, supplierIdx: 2 },
    { productIdx: 15, batchNumber: "CAL25001", qty: 70, expiryDays: 500, supplierIdx: 0 },
    { productIdx: 16, batchNumber: "OME25001", qty: 5, expiryDays: -10, supplierIdx: 1 }, // expired
    { productIdx: 17, batchNumber: "OND25001", qty: 40, expiryDays: 200, supplierIdx: 2 },
    { productIdx: 19, batchNumber: "GLV25001", qty: 15, expiryDays: null, supplierIdx: 4 },
    { productIdx: 20, batchNumber: "SYR25001", qty: 20, expiryDays: null, supplierIdx: 4 },
    { productIdx: 21, batchNumber: "IVS25001", qty: 45, expiryDays: null, supplierIdx: 4 },
    { productIdx: 23, batchNumber: "PRGTEST01", qty: 50, expiryDays: 120, supplierIdx: 1 },
    { productIdx: 24, batchNumber: "LH25001", qty: 22, expiryDays: 90, supplierIdx: 1 },
    { productIdx: 25, batchNumber: "NS25001", qty: 60, expiryDays: 200, supplierIdx: 0 },
    { productIdx: 26, batchNumber: "MV25001", qty: 30, expiryDays: 400, supplierIdx: 0 },
  ];

  const batchIds: string[] = [];
  for (const spec of batchSpecs) {
    const product = PRODUCTS[spec.productIdx]!;
    const productId = productIds[spec.productIdx]!;
    const supplierId = supplierIds[spec.supplierIdx]!;
    const expiryDate = spec.expiryDays === null ? null : day(spec.expiryDays);
    const batch = await prisma.pharmacyBatch.create({
      data: {
        clinicId,
        productId,
        supplierId,
        batchNumber: spec.batchNumber,
        quantity: spec.qty,
        availableQuantity: spec.qty,
        purchasePrice: money(product.purchase),
        sellingPrice: money(product.sell),
        mrp: money(product.mrp),
        gstPercent: money(product.gst),
        expiryDate,
        purchaseDate: day(-30),
        manufacturingDate: day(-200),
        storageLocation: "Pharmacy Shelf A",
      },
    });
    batchIds.push(batch.id);
    await prisma.pharmacyStockMovement.create({
      data: {
        clinicId,
        productId,
        batchId: batch.id,
        type: "PURCHASE",
        quantity: spec.qty,
        balanceAfter: spec.qty,
        reason: "Initial seed stock",
        referenceType: "SEED",
        actorUserId: pharmacist.id,
        createdAt: day(-30),
      },
    });
  }

  // Purchase orders
  for (let i = 0; i < 5; i++) {
    const supplierId = supplierIds[i % supplierIds.length]!;
    const pIdx = i * 2;
    const product = PRODUCTS[pIdx]!;
    const productId = productIds[pIdx]!;
    const qty = 50 + i * 10;
    const unit = product.purchase;
    const status = (["DRAFT", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "ORDERED"] as const)[i]!;
    await prisma.pharmacyPurchaseOrder.create({
      data: {
        clinicId,
        supplierId,
        orderNumber: `PO-SEED-${String(i + 1).padStart(3, "0")}`,
        orderDate: day(-20 + i),
        expectedDelivery: day(5 + i),
        status,
        taxAmount: money(Math.round(qty * unit * 0.05)),
        totalAmount: money(qty * unit),
        notes: "Demo purchase order",
        items: {
          create: [
            {
              productId,
              quantityOrdered: qty,
              quantityReceived: status === "RECEIVED" ? qty : status === "PARTIALLY_RECEIVED" ? Math.floor(qty / 2) : 0,
              purchasePrice: money(unit),
              mrp: money(product.mrp),
              batchNumber: status === "RECEIVED" || status === "PARTIALLY_RECEIVED" ? `POB${i + 1}` : null,
              expiryDate: status === "RECEIVED" || status === "PARTIALLY_RECEIVED" ? day(400) : null,
            },
          ],
        },
      },
    });
  }

  // Patients for sales/prescriptions
  const patients = await prisma.patient.findMany({
    where: { clinicId },
    take: 8,
    orderBy: { createdAt: "asc" },
  });
  const couples = await prisma.couple.findMany({
    where: { clinicId },
    take: 5,
    orderBy: { createdAt: "asc" },
  });

  // Sales
  for (let i = 0; i < 12; i++) {
    const batch = await prisma.pharmacyBatch.findFirst({
      where: { clinicId, availableQuantity: { gte: 2 }, expiryDate: { gt: new Date() } },
      include: { product: true },
      skip: i % Math.max(batchIds.length - 5, 1),
    });
    if (!batch) continue;
    const qty = 1 + (i % 3);
    if (batch.availableQuantity < qty) continue;
    const unitPrice = Number(batch.sellingPrice);
    const tax = Math.round(unitPrice * qty * (Number(batch.gstPercent) / 100) * 100) / 100;
    const lineTotal = unitPrice * qty + tax;
    const patient = patients[i % Math.max(patients.length, 1)];
    const couple = couples[i % Math.max(couples.length, 1)];
    const sale = await prisma.pharmacySale.create({
      data: {
        clinicId,
        invoiceNumber: `PHARM-SEED-${String(i + 1).padStart(4, "0")}`,
        patientId: patient?.id ?? null,
        coupleId: couple?.id ?? null,
        doctorName: doctor.name,
        subtotal: money(unitPrice * qty),
        taxAmount: money(tax),
        totalAmount: money(lineTotal),
        paymentMethod: (["CASH", "UPI", "CARD", "UPI"] as const)[i % 4]!,
        paymentStatus: "PAID",
        createdById: pharmacist.id,
        soldAt: day(-i),
        items: {
          create: [
            {
              productId: batch.productId,
              batchId: batch.id,
              quantity: qty,
              unitPrice: money(unitPrice),
              taxAmount: money(tax),
              lineTotal: money(lineTotal),
            },
          ],
        },
      },
    });
    const nextQty = batch.availableQuantity - qty;
    await prisma.pharmacyBatch.update({
      where: { id: batch.id },
      data: { availableQuantity: nextQty },
    });
    await prisma.pharmacyStockMovement.create({
      data: {
        clinicId,
        productId: batch.productId,
        batchId: batch.id,
        type: "SALE",
        quantity: -qty,
        balanceAfter: nextQty,
        reason: "Seed sale",
        referenceType: "PharmacySale",
        referenceId: sale.id,
        actorUserId: pharmacist.id,
        createdAt: day(-i),
      },
    });
  }

  // Prescriptions
  const rxProducts = [0, 2, 3, 5, 11, 13]; // indices into PRODUCTS
  for (let i = 0; i < 6; i++) {
    const patient = patients[i % Math.max(patients.length, 1)];
    const couple = couples[i % Math.max(couples.length, 1)];
    if (!patient) break;
    const pIdx = rxProducts[i]!;
    const productId = productIds[pIdx]!;
    const product = PRODUCTS[pIdx]!;
    const status = (["PENDING", "PENDING", "PARTIALLY_DISPENSED", "DISPENSED", "PENDING", "CANCELLED"] as const)[i]!;
    const qty = 10;
    const dispensed = status === "DISPENSED" ? qty : status === "PARTIALLY_DISPENSED" ? 4 : 0;
    let batchId: string | null = null;
    if (dispensed > 0) {
      const batch = await prisma.pharmacyBatch.findFirst({
        where: { clinicId, productId, availableQuantity: { gte: dispensed }, OR: [{ expiryDate: null }, { expiryDate: { gt: new Date() } }] },
      });
      if (batch) {
        batchId = batch.id;
        const next = batch.availableQuantity - dispensed;
        await prisma.pharmacyBatch.update({ where: { id: batch.id }, data: { availableQuantity: next } });
        await prisma.pharmacyStockMovement.create({
          data: {
            clinicId,
            productId,
            batchId: batch.id,
            type: "DISPENSE",
            quantity: -dispensed,
            balanceAfter: next,
            reason: "Seed dispense",
            referenceType: "PharmacyPrescription",
            actorUserId: pharmacist.id,
            createdAt: day(-i * 2),
          },
        });
      }
    }
    await prisma.pharmacyPrescription.create({
      data: {
        clinicId,
        patientId: patient.id,
        coupleId: couple?.id ?? null,
        doctorId: doctor.id,
        doctorName: doctor.name,
        prescriptionDate: day(-i * 2),
        status,
        notes: "Demo fertility support prescription",
        dispensedById: dispensed > 0 ? pharmacist.id : null,
        dispensedAt: dispensed > 0 ? day(-i * 2) : null,
        items: {
          create: [
            {
              productId,
              batchId,
              medicineName: product.name,
              dosage: "1 tablet",
              frequency: "Twice daily",
              duration: "10 days",
              instructions: "After food",
              quantityPrescribed: qty,
              quantityDispensed: dispensed,
            },
          ],
        },
      },
    });
  }

  return {
    skipped: false as const,
    products: PRODUCTS.length,
    suppliers: SUPPLIERS.length,
    batches: batchSpecs.length,
    purchaseOrders: 5,
    sales: 12,
    prescriptions: 6,
  };
}
