import * as dotenv from 'dotenv';
dotenv.config();

const apiKey =
  process.env["SARVAM_SAMVAAD_API_KEY"] ||
  process.env["SARVAM_API_KEY"] ||
  "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

async function checkAnalytics() {
  console.log("Checking Sarvam call attempts analytics...");
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const start = yesterday.toISOString();
  const end = now.toISOString();

  const url = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/attempts?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}`;
  console.log("URL:", url);

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
      },
    });

    const data = await res.json();
    const userAttempts = (data.items || []).filter((item: any) =>
      item.user_contact?.includes('8095423222')
    );
    console.log(`Found ${userAttempts.length} attempts for 8095423222:`);
    for (const a of userAttempts) {
      console.log({
        attempt_id: a.attempt_id,
        attempted_at: a.attempted_at,
        connectivity_status: a.connectivity_status,
        failure_reason: a.failure_reason,
        duration_in_seconds: a.duration_in_seconds,
        channel_direction: a.channel_direction,
        ended_by: a.ended_by,
      });
    }

    if (userAttempts.length === 0) {
      console.log("No attempts found for 7795559724. Total attempts returned:", (data.items || []).length);
      console.log("Recent phone numbers in list:", (data.items || []).slice(0, 5).map((i: any) => ({
        contact: i.user_contact,
        time: i.attempted_at,
        status: i.connectivity_status
      })));
    }
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

checkAnalytics();
