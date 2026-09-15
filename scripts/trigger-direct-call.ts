import * as dotenv from 'dotenv';
dotenv.config();

const apiKey =
  process.env["SARVAM_SAMVAAD_API_KEY"] ||
  process.env["SARVAM_API_KEY"] ||
  "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";
const appVersion = Number(process.env["SARVAM_APP_VERSION"]) || 7;
const connectionId = process.env["SARVAM_CONNECTION_ID"] || "587ab0c5-8f-f564346c-f2ae";
const agentPhoneNumber = process.env["SARVAM_AGENT_PHONE_NUMBER"] || "+918064265889";

async function main() {
  const targetPhone = "+917795559724";
  console.log("Triggering Sarvam outbound call to:", targetPhone);

  const payload = {
    app_config: {
      app_id: appId,
      app_version: appVersion,
      app_type: "agent",
      connection_config: {
        connection_id: connectionId,
        agent_phone_number: agentPhoneNumber,
      },
      agent_variables: {
        call_summary: "Patient Ravi consultation appointment booking with Dr. Ananya Rao at SmrkoMed clinic.",
        user_name: "Ravi",
      },
    },
    user_config: {
      user_phone_number: targetPhone,
    },
  };

  const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", res.status);
    const data = await res.json();
    console.log("Response data:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

main();
