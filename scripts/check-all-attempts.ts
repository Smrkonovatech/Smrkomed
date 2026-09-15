import * as dotenv from 'dotenv';
dotenv.config();

const apiKey =
  process.env["SARVAM_SAMVAAD_API_KEY"] ||
  process.env["SARVAM_API_KEY"] ||
  "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

async function check() {
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const url = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/attempts?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey }
  });
  const data = await res.json();
  const attempt = (data.items || []).find((i: any) => i.attempt_id === '6c595876-b9be-404a-8f7f-b9c4cebab7bf');
  console.log("FULL ATTEMPT DETAILS:", JSON.stringify(attempt, null, 2));
}

check();
