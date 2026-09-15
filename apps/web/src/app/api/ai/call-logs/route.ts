import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface SarvamCallItem {
  attempt_id: string;
  interaction_id: string;
  user_contact: string;
  user_contact_masked: string;
  connectivity_status: "connected" | "busy" | "no_answer" | "failed" | string;
  failure_reason: string;
  ended_by: string;
  duration_in_seconds: number;
  start_datetime: string | null;
  end_datetime: string | null;
  attempted_at: string;
  language_name: string;
  num_messages: number;
  channel_direction: "outbound" | "inbound" | string;
  audio_url: string | null;
  agent_variables?: {
    user_name?: string;
    call_summary?: string;
    [key: string]: unknown;
  };
  average_agent_response_time_in_seconds?: number;
  average_user_response_time_in_seconds?: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number(searchParams.get("days")) || 30;
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 200);
    const statusFilter = searchParams.get("status") || "all";
    const searchQuery = searchParams.get("search")?.trim().toLowerCase() || "";

    const apiKey =
      process.env["SARVAM_SAMVAAD_API_KEY"] ||
      process.env["SARVAM_API_KEY"] ||
      "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
    const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
    const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
    const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

    const now = new Date();
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const end = now.toISOString();

    const sarvamUrl = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/attempts?start_datetime=${encodeURIComponent(
      start,
    )}&end_datetime=${encodeURIComponent(end)}&limit=${limit}`;

    const response = await fetch(sarvamUrl, {
      headers: {
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Sarvam API error (${response.status}): ${errorText}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    let rawItems: SarvamCallItem[] = data.items || [];

    // Sort descending by attempted_at
    rawItems.sort(
      (a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime(),
    );

    // Calculate aggregated stats from all fetched items
    const totalCalls = rawItems.length;
    const connectedCalls = rawItems.filter(
      (i) => i.connectivity_status === "connected" || i.duration_in_seconds > 0,
    ).length;
    const busyCalls = rawItems.filter((i) => i.connectivity_status === "busy").length;
    const failedCalls = rawItems.filter(
      (i) =>
        i.connectivity_status === "failed" ||
        i.connectivity_status === "no_answer" ||
        i.failure_reason !== "NO_FAILURE_REASON",
    ).length;

    const totalConnectedDuration = rawItems
      .filter((i) => i.duration_in_seconds > 0)
      .reduce((acc, curr) => acc + (curr.duration_in_seconds || 0), 0);

    const avgDurationSeconds =
      connectedCalls > 0 ? Math.round(totalConnectedDuration / connectedCalls) : 0;
    const connectRate =
      totalCalls > 0 ? `${Math.round((connectedCalls / totalCalls) * 100)}%` : "0%";

    // Apply filtering
    let filteredItems = rawItems;

    if (statusFilter && statusFilter !== "all") {
      filteredItems = filteredItems.filter((item) => {
        if (statusFilter === "connected") {
          return item.connectivity_status === "connected" || item.duration_in_seconds > 0;
        }
        if (statusFilter === "busy") {
          return item.connectivity_status === "busy";
        }
        if (statusFilter === "no_answer") {
          return item.connectivity_status === "no_answer";
        }
        if (statusFilter === "failed") {
          return item.connectivity_status === "failed";
        }
        return item.connectivity_status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    if (searchQuery) {
      filteredItems = filteredItems.filter((item) => {
        const phone = (item.user_contact || "").toLowerCase();
        const masked = (item.user_contact_masked || "").toLowerCase();
        const name = (item.agent_variables?.user_name || "").toLowerCase();
        const summary = (item.agent_variables?.call_summary || "").toLowerCase();
        return (
          phone.includes(searchQuery) ||
          masked.includes(searchQuery) ||
          name.includes(searchQuery) ||
          summary.includes(searchQuery)
        );
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalCalls,
        connectedCalls,
        busyCalls,
        failedCalls,
        connectRate,
        avgDurationSeconds,
      },
      items: filteredItems,
      meta: {
        totalReturned: filteredItems.length,
        daysLookback: days,
        orgId,
        appId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error fetching call logs",
      },
      { status: 500 },
    );
  }
}
