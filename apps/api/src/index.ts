import { serve } from "@hono/node-server";

import { createApp } from "./app";
import { env } from "./config/env";
import { assertIntegrationEncryptionConfig } from "./integrations/credentials/encryption";

assertIntegrationEncryptionConfig();

const app = createApp();

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`SmrkoMed API listening on http://localhost:${info.port}`);
});
