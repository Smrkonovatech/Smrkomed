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
  const attemptId = '6c595876-b9be-404a-8f7f-b9c4cebab7bf';
  const interactionId = encodeURIComponent('20260908/f9cd1526-17:41:27-21bb55b1');
  const endpoints = [
    `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/attempts/${attemptId}`,
    `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/interactions/${interactionId}`,
    `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/messages?attempt_id=${attemptId}`,
  ];

  for (const u of endpoints) {
    const res = await fetch(u, { headers: { 'X-API-Key': apiKey } });
    console.log(u, res.status);
    if (res.ok) {
      console.log(await res.text());
    }
  }
}

main();
