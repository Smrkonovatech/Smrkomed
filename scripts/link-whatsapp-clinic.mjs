import { createCipheriv, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// Load .env
const envFile = resolve(rootDir, ".env");
if (existsSync(envFile)) {
  const content = readFileSync(envFile, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const PREFIX = "igcm1";
const KEY_BYTES = 32;

function parseKey(raw) {
  if (!raw) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY is required. Check your .env file.");
  }
  const trimmed = raw.trim();
  let key;
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else {
    const fromB64 = Buffer.from(trimmed, "base64");
    key = fromB64.length === KEY_BYTES ? fromB64 : Buffer.from(trimmed, "utf8");
  }
  if (key.length !== KEY_BYTES) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).");
  }
  return key;
}

function encryptCredentials(creds, encryptionKey) {
  const plaintext = JSON.stringify(creds);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", parseKey(encryptionKey), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":");
}

async function run() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1322925527567470";
  const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "2005094193495197";
  const displayPhoneNumber = process.env.WHATSAPP_PHONE_NUMBER || "+91 86607 17328";
  const accessToken = process.argv[2] || process.env.WHATSAPP_ACCESS_TOKEN || "";
  const encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;

  console.log("--------------------------------------------------");
  console.log("SmrkoMed WhatsApp Direct Link Script");
  console.log("--------------------------------------------------");
  console.log(`Phone Number ID:     ${phoneNumberId}`);
  console.log(`Business Account ID: ${businessAccountId}`);
  console.log(`Display Phone:       ${displayPhoneNumber}`);
  console.log(`Access Token:        ${accessToken ? "Provided (will encrypt)" : "None provided (placeholder)"}`);
  console.log("--------------------------------------------------");

  const prisma = new PrismaClient();

  try {
    const clinic = await prisma.clinic.findFirst({
      orderBy: { createdAt: "asc" },
      include: { organization: true },
    });

    if (!clinic) {
      console.error("❌ No clinic found in the database. Run `npm run db:seed` first.");
      process.exit(1);
    }

    console.log(`Linking to Clinic: [${clinic.id}] ${clinic.name} (${clinic.organization.name})`);

    const encrypted = encryptCredentials(
      {
        accessToken: accessToken || "pending_manual_token",
        systemUserToken: accessToken || "pending_manual_token",
      },
      encryptionKey
    );

    const displayName = `WhatsApp (${displayPhoneNumber})`;

    const integration = await prisma.integration.upsert({
      where: { clinicId_provider: { clinicId: clinic.id, provider: "WHATSAPP_CLOUD" } },
      create: {
        organizationId: clinic.organizationId,
        clinicId: clinic.id,
        provider: "WHATSAPP_CLOUD",
        status: "ACTIVE",
        displayName,
        externalAccountId: businessAccountId,
        encryptedCredentials: encrypted,
        lastError: null,
        lastErrorCode: null,
        lastSyncAt: new Date(),
      },
      update: {
        status: "ACTIVE",
        displayName,
        externalAccountId: businessAccountId,
        encryptedCredentials: encrypted,
        lastError: null,
        lastErrorCode: null,
        lastSyncAt: new Date(),
      },
    });

    const account = await prisma.whatsAppAccount.upsert({
      where: { clinicId_phoneNumberId: { clinicId: clinic.id, phoneNumberId } },
      create: {
        clinicId: clinic.id,
        integrationId: integration.id,
        phoneNumberId,
        businessAccountId,
        displayName,
        displayPhoneNumber,
        verifiedName: clinic.name,
        qualityRating: "GREEN",
        isActive: true,
        lastSyncedAt: new Date(),
      },
      update: {
        integrationId: integration.id,
        businessAccountId,
        displayName,
        displayPhoneNumber,
        verifiedName: clinic.name,
        qualityRating: "GREEN",
        isActive: true,
        lastSyncedAt: new Date(),
      },
    });

    // Deactivate other numbers for this clinic if any
    await prisma.whatsAppAccount.updateMany({
      where: { clinicId: clinic.id, phoneNumberId: { not: phoneNumberId } },
      data: { isActive: false },
    });

    console.log("✅ Successfully linked WhatsApp Account to Clinic!");
    console.log(`   Integration ID: ${integration.id}`);
    console.log(`   Account ID:     ${account.id}`);
    console.log(`   Phone Number:   ${account.displayPhoneNumber}`);
    console.log(`   Status:         ${integration.status}`);
    console.log("--------------------------------------------------");
    if (!accessToken) {
      console.log("ℹ️  Note: To enable live message sending from Meta Graph API,");
      console.log("   run with your Meta Access Token:");
      console.log("   node scripts/link-whatsapp-clinic.mjs <ACCESS_TOKEN>");
    } else {
      console.log("🎉 Access token encrypted and saved securely.");
    }
  } catch (err) {
    console.error("❌ Error linking WhatsApp account:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
