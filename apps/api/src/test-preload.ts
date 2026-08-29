process.env["NODE_ENV"] = "test";
process.env["RATE_LIMIT_DISABLED"] = "1";
process.env["INTEGRATION_ENCRYPTION_KEY"] ??= "ab".repeat(32);
process.env["MOCK_INTEGRATIONS_ENABLED"] = "1";
process.env["PAYMENTS_MOCK"] = "1";
process.env["ABDM_DEMO_MODE"] ??= "0";


