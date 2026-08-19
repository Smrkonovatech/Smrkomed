process.env["NODE_ENV"] ??= "test";
process.env["RATE_LIMIT_DISABLED"] ??= "1";
process.env["INTEGRATION_ENCRYPTION_KEY"] ??= "ab".repeat(32);
