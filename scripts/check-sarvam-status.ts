import * as dotenv from 'dotenv';
dotenv.config();

const apiKey =
  process.env["SARVAM_SAMVAAD_API_KEY"] ||
  process.env["SARVAM_API_KEY"] ||
  "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
const attemptId = '5fe2628b-847c-4403-8ffc-35181bdf881f';

async function check() {
  console.log('SARVAM CONFIG:', {
    orgId,
    workspaceId,
    hasApiKey: !!apiKey,
    keyPrefix: apiKey ? apiKey.slice(0, 15) + '...' : 'none'
  });

  const endpoints = [
    `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds/${attemptId}`,
    `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/attempts/${attemptId}`,
    `https://apps.sarvam.ai/api/outbounds/v1/attempts/${attemptId}`,
    `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/calls/${attemptId}`,
    `https://apps.sarvam.ai/api/telephony/v1/calls/${attemptId}`,
    `https://api.sarvam.ai/call-status/${attemptId}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'X-API-Key': apiKey, 'api-subscription-key': apiKey }
      });
      console.log(`GET ${url}: HTTP ${res.status}`);
      if (res.ok) {
        const data = await res.text();
        console.log('SUCCESS Response:', data);
        break;
      }
    } catch (err: any) {
      console.error(`Error on ${url}:`, err.message);
    }
  }
}

check();
