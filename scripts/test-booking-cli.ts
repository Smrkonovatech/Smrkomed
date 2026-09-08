/**
 * Interactive CLI Simulator for SmrkoMed Appointment Booking Flow
 * Run with: npx tsx scripts/test-booking-cli.ts
 */

import readline from "node:readline";

const API_BASE = process.env.API_URL || "http://localhost:4000/api/v1/appointment-booking";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("\n🏥 ===================================================");
  console.log("   SmrkoMed — Interactive Booking Simulator (WhatsApp)");
  console.log("===================================================\n");

  const phone = "+919876543210";
  console.log(`📱 Connecting as patient: ${phone}`);

  let sessionId = "";
  try {
    const res = await fetch(`${API_BASE}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "WHATSAPP",
        contactPhone: phone,
      }),
    });

    if (!res.ok) {
      console.error(`❌ API error: ${res.status} ${res.statusText}`);
      console.log(`Ensure 'npm run dev:api' is running on http://localhost:4000`);
      process.exit(1);
    }

    const data = (await res.json()) as any;
    sessionId = data.data.sessionId;

    console.log("\n🤖 BOT REPLY:");
    console.log("---------------------------------------------------");
    console.log(data.data.message);
    console.log("---------------------------------------------------\n");
  } catch (err) {
    console.error("❌ Failed to connect to API:", err instanceof Error ? err.message : err);
    console.log("Make sure your API server is running on port 4000.");
    process.exit(1);
  }

  while (true) {
    const input = await prompt("👉 Your reply (or 'exit' to quit): ");
    if (input.trim().toLowerCase() === "exit" || input.trim().toLowerCase() === "quit") {
      console.log("Goodbye!");
      break;
    }

    if (!input.trim()) continue;

    try {
      const res = await fetch(`${API_BASE}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          contactPhone: phone,
          content: input.trim(),
        }),
      });

      const json = (await res.json()) as any;
      if (!res.ok || !json.success) {
        console.error("❌ Error:", json.error?.message || "Something went wrong");
        continue;
      }

      console.log("\n🤖 BOT REPLY:");
      console.log("---------------------------------------------------");
      console.log(json.data.responseMessage);
      console.log("---------------------------------------------------\n");

      if (json.data.status === "COMPLETED") {
        console.log("🎉 Booking complete! Check your appointments dashboard in the web app.");
        break;
      }
    } catch (err) {
      console.error("❌ Request error:", err instanceof Error ? err.message : err);
    }
  }

  rl.close();
}

main().catch(console.error);
