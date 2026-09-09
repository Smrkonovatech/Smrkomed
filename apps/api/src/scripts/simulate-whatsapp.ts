/**
 * WhatsApp Manual Chat Simulator for Local Testing
 * Allows you to test greetings, Q&A, couple registration, and the Namma Metro menu
 * interactively with your own phone number directly from the terminal!
 *
 * Usage:
 *   npx tsx src/scripts/simulate-whatsapp.ts [phone_number]
 *
 * Example:
 *   npx tsx src/scripts/simulate-whatsapp.ts +919876543210
 */

import readline from "node:readline";
import { prisma } from "@smrkomed/database";
import { handleInboundWhatsAppAutomation } from "../modules/whatsapp-automation/inbound-dispatch";

async function main() {
  const argPhone = process.argv[2]?.trim();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let isClosed = false;
  rl.on("close", () => {
    isClosed = true;
  });

  const question = (promptText: string): Promise<string> =>
    new Promise((resolve) => {
      if (isClosed) return resolve("exit");
      try {
        rl.question(promptText, (ans) => {
          resolve(ans ?? "exit");
        });
      } catch {
        resolve("exit");
      }
    });

  console.log("\n============================================================");
  console.log("   🏥 SmrkoMed WhatsApp AI & Namma Metro Menu Simulator     ");
  console.log("============================================================\n");

  const clinic = await prisma.clinic.findFirst();
  if (!clinic) {
    console.error("❌ No clinic found in database. Run `npm run db:seed` first.");
    process.exit(1);
  }

  let phone = argPhone;
  if (!phone) {
    phone = await question("📱 Enter your WhatsApp phone number (e.g. +919876543210): ");
    phone = phone.trim();
    if (!phone) {
      phone = "+919876543210";
      console.log(`Using default test phone: ${phone}`);
    }
  }

  console.log(`\n🏥 Clinic: ${clinic.name}`);
  console.log(`📱 Your Phone: ${phone}`);

  // Find or create conversation for this phone
  let conv = await prisma.conversation.findFirst({
    where: { clinicId: clinic.id, contactPhone: phone },
    include: { patient: true, couple: true },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        contactPhone: phone,
        unmatched: true,
        status: "OPEN",
      },
      include: { patient: true, couple: true },
    });
    console.log(`✨ Created new visitor conversation (unregistered number)`);
  } else {
    console.log(
      `Found existing conversation. Status: ${conv.unmatched ? "Unregistered Visitor" : `Registered Patient (${conv.patient?.firstName || "Patient"})`}`,
    );
  }

  console.log("\n💡 Tips to try:");
  console.log("  • Send 'Hi' or 'Hello' (Free interaction without forced registration)");
  console.log("  • Send 'What is IVF?' or 'Clinic timings' (Knowledge Q&A)");
  console.log("  • Send 'MENU' (Namma Metro interactive self-service menu)");
  console.log("  • Send '3' or 'Doctor slots' (Live doctor schedule)");
  console.log("  • Send 'Book appointment' (Initiates couple registration wizard)");
  console.log("  • Type 'exit' to quit\n");
  console.log("------------------------------------------------------------\n");

  while (true) {
    const input = await question("💬 You: ");
    const clean = input.trim();
    if (!clean) continue;
    if (clean.toLowerCase() === "exit" || clean.toLowerCase() === "quit") {
      console.log("\n👋 Exiting WhatsApp simulator. Goodbye!\n");
      rl.close();
      process.exit(0);
    }

    if (clean.toLowerCase() === "reset") {
      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          patientId: null,
          coupleId: null,
          unmatched: true,
          pendingAction: null as any,
          pendingActionExpiresAt: null,
        },
      });
      console.log("🔄 Reset conversation to unregistered visitor state.\n");
      continue;
    }

    // Refresh conversation state
    const currentConv = await prisma.conversation.findUnique({
      where: { id: conv.id },
    });
    if (!currentConv) break;

    const messageId = `sim_msg_${Date.now()}`;
    const providerMessageId = `pmsg_${Date.now()}`;

    // Create incoming message record
    await prisma.message.create({
      data: {
        conversationId: currentConv.id,
        direction: "INBOUND",
        senderType: "PATIENT",
        content: clean,
        messageType: "text",
        providerMessageId,
        status: "DELIVERED",
      },
    });

    const result = await handleInboundWhatsAppAutomation({
      clinicId: clinic.id,
      conversationId: currentConv.id,
      contactPhone: phone,
      unmatched: currentConv.unmatched,
      patientId: currentConv.patientId,
      messageId,
      providerMessageId,
      messageType: "text",
      messageText: clean,
      timestampIso: new Date().toISOString(),
      skipAi: false,
    });

    // Check latest outbound message sent by bot
    const lastReply = await prisma.message.findFirst({
      where: { conversationId: currentConv.id, direction: "OUTBOUND" },
      orderBy: { createdAt: "desc" },
    });

    console.log("\n🤖 WhatsApp Bot:");
    if (lastReply?.content) {
      console.log(lastReply.content);
    } else if (result.registration?.responseMessage) {
      console.log(result.registration.responseMessage);
    } else if (result.menu?.responseText) {
      console.log(result.menu.responseText);
    } else {
      console.log("(Message acknowledged)");
    }
    console.log("\n------------------------------------------------------------\n");
  }
}

main().catch((err) => {
  console.error("Error in simulator:", err);
  process.exit(1);
});
