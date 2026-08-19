import { ensureDemoWorkspace } from "@smrkomed/database";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST() {
  try {
    if (!process.env["DATABASE_URL"]) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DATABASE_URL", message: "DATABASE_URL is not set on the web app." },
        },
        { status: 500 },
      );
    }
    await ensureDemoWorkspace();
    return NextResponse.json({ success: true, data: { ready: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Demo setup failed:", message);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DEMO_SETUP_FAILED",
          message: "Could not create demo clinic accounts. Check DATABASE_URL on Vercel and try again.",
        },
      },
      { status: 500 },
    );
  }
}
