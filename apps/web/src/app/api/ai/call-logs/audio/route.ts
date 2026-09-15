import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interactionId = searchParams.get("interactionId");

    if (!interactionId || interactionId === "NO_INTERACTION_ID") {
      return NextResponse.json(
        { error: "No interaction ID provided or call has no audio recording." },
        { status: 400 },
      );
    }

    const apiKey =
      process.env["SARVAM_SAMVAAD_API_KEY"] ||
      process.env["SARVAM_API_KEY"] ||
      "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
    const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
    const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
    const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

    const recordingUrl = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/recordings/${encodeURIComponent(
      interactionId,
    )}`;

    const response = await fetch(recordingUrl, {
      headers: {
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Sarvam audio error (${response.status}): ${response.statusText}` },
        { status: response.status },
      );
    }

    // Stream the audio/wav stream directly to the browser
    return new Response(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/wav",
        "Cache-Control": "public, max-age=86400, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stream audio" },
      { status: 500 },
    );
  }
}
