import { NextRequest, NextResponse } from "next/server";

function upstreamBase() {
  const raw = process.env["API_URL"] ?? process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";
  return raw.replace(/\/$/, "");
}

async function proxy(req: NextRequest, path: string[]) {
  const target = `${upstreamBase()}/api/v1/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
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
    const out = new Headers();
    const type = upstream.headers.get("content-type");
    if (type) out.set("content-type", type);
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "API_UNAVAILABLE",
          message: "Unable to reach the clinic API. Confirm the API is running and try again.",
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
