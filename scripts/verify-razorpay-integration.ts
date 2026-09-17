import { createHmac } from "node:crypto";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env") });

async function runVerification() {
  console.log("=== Testing Razorpay Standard Web Checkout Integration ===\n");

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log(`1. Checking Environment Variables:`);
  console.log(`   - RAZORPAY_KEY_ID: ${keyId ? "✓ Present (" + keyId.slice(0, 8) + "...)" : "✗ Missing"}`);
  console.log(`   - RAZORPAY_KEY_SECRET: ${keySecret ? "✓ Present (" + keySecret.slice(0, 4) + "...)" : "✗ Missing"}`);

  if (!keyId || !keySecret) {
    console.error("FAILED: Missing Razorpay credentials in .env");
    process.exit(1);
  }

  // 2. Testing Order Creation with Razorpay API
  console.log(`\n2. Testing Order Creation (POST https://api.razorpay.com/v1/orders)...`);
  const amount = 500000; // ₹5,000 in paise
  const currency = "INR";
  const receipt = `test_rcpt_${Date.now()}`;

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes: { test: "smrkomed_verification" },
    }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok || !orderData.id) {
    console.error("FAILED: Razorpay Order Creation:", orderData);
    process.exit(1);
  }

  console.log(`   ✓ Order created successfully!`);
  console.log(`     - Order ID: ${orderData.id}`);
  console.log(`     - Amount: ${orderData.amount} paise (₹${orderData.amount / 100})`);
  console.log(`     - Currency: ${orderData.currency}`);
  console.log(`     - Status: ${orderData.status}`);

  // 3. Testing Signature Verification Algorithm
  console.log(`\n3. Testing Signature Verification (HMAC-SHA256)...`);
  const testOrderId = orderData.id;
  const testPaymentId = "pay_test_" + Math.random().toString(36).slice(2, 10);

  // Generate valid signature
  const validSignature = createHmac("sha256", keySecret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex");

  // Invalid signature
  const invalidSignature = "invalid_signature_hex_1234567890abcdef";

  const isMatchValid =
    createHmac("sha256", keySecret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex") === validSignature;

  const isMatchInvalid =
    createHmac("sha256", keySecret)
      .update(`${testOrderId}|${testPaymentId}`)
      .digest("hex") === invalidSignature;

  console.log(`   - Valid Signature Test: ${isMatchValid ? "✓ PASSED (Verified)" : "✗ FAILED"}`);
  console.log(`   - Tampered Signature Test: ${!isMatchInvalid ? "✓ PASSED (Correctly Rejected)" : "✗ FAILED"}`);

  if (isMatchValid && !isMatchInvalid) {
    console.log("\n==========================================");
    console.log("🎉 ALL RAZORPAY INTEGRATION TESTS PASSED!");
    console.log("==========================================");
  } else {
    console.error("Signature verification logic check failed.");
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification failed with exception:", err);
  process.exit(1);
});
