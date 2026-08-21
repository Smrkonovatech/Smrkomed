import { NextRequest, NextResponse } from "next/server";

function upstreamBase() {
  const raw = process.env["API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  return raw.replace(/\/$/, "");
}

async function proxy(req: NextRequest, path: string[]) {
  const base = upstreamBase();
  const target = `${base}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  let upstreamHost = "unknown";
  try {
    upstreamHost = new URL(base).host;
  } catch {
    upstreamHost = "invalid_API_URL";
  }

  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = req.headers.get("authorization");
  if (authorization) headers.set("authorization", authorization);

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

  try {
    const init: RequestInit = {
      method,
      headers,
      redirect: "manual",
      cache: "no-store",
    };
    if (hasBody) {
      init.body = await req.arrayBuffer();
    }
    const upstream = await fetch(target, init);
    if (upstream.status >= 400) {
      console.error("V1_PROXY_UPSTREAM_ERROR", {
        path: path.join("/"),
        method,
        upstreamHost,
        status: upstream.status,
        // Never log cookies, tokens, or response bodies here.
      });
    }
    const out = new Headers();
    const type = upstream.headers.get("content-type");
    if (type) out.set("content-type", type);
    out.set("x-smrko-upstream-host", upstreamHost);
    out.set("x-smrko-upstream-status", String(upstream.status));
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch (error) {
    console.error("V1_PROXY_UNREACHABLE", {
      path: path.join("/"),
      method,
      upstreamHost,
      errorName: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_UNAVAILABLE",
          message:
            "Unable to reach the clinic API. Confirm API_URL on Vercel points at the public Railway API URL.",
          details: {
            debugCode: "PROXY_UNREACHABLE",
            upstreamHost,
          },
        },
      },
      { status: 503 },
    );
  }
}

async function handle(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(req, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const OPTIONS = handle;
