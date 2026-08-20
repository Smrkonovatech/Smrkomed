import { NextResponse } from "next/server";
import { TenantAccessError } from "@smrkomed/database";

import { runSmrkoAiChat, toAiHttpError } from "@/lib/ai/service";
import { requireUser } from "@/server/authz";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const tenant = await requireUser();
    const body = (await request.json()) as {
      messages?: unknown;
      pageContext?: unknown;
    };
    const result = await runSmrkoAiChat({
      tenant,
      messages: body.messages,
      pageContext: body.pageContext,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Sign in required." } },
        { status: 401 },
      );
    }
    const mapped = toAiHttpError(error);
    return NextResponse.json(
      { success: false, error: { code: "AI_ERROR", message: mapped.message } },
      { status: mapped.status },
    );
  }
}
