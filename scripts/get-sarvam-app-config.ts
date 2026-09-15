import * as dotenv from 'dotenv';
dotenv.config();

const apiKey =
  process.env["SARVAM_SAMVAAD_API_KEY"] ||
  process.env["SARVAM_API_KEY"] ||
  "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

async function main() {
  const candidates = [
    `https://apps.sarvam.ai/api/apps/v1/${appId}`,
    `https://apps.sarvam.ai/api/apps/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}`,
    `https://apps.sarvam.ai/api/agents/v1/orgs/${orgId}/workspaces/${workspaceId}/agents/${appId}`,
    `https://apps.sarvam.ai/api/agents/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}`,
    `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/apps/${appId}`,
    `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/apps`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
      console.log(url, "-->", res.status);
      if (res.ok) {
        const text = await res.text();
        console.log("RESPONSE:", text.slice(0, 1000));
      }
    } catch (e: any) {
      console.log(url, "ERROR:", e.message);
    }
  }
}

main();
