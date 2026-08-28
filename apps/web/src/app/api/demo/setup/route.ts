import { databaseUrlDiagnostics, ensureDemoWorkspace, pingDatabase, prisma, prismaErrorHint } from "@smrkomed/database";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export async function GET() {
  try {
    await pingDatabase();
    const [users, roles, demoAdmin] = await Promise.all([
      prisma.user.count(),
      prisma.role.count(),
      prisma.user.findFirst({
        where: { email: "admin@abcfertility.demo" },
        select: { id: true },
      }),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        database: "connected",
        users,
        roles,
        demoAdmin: Boolean(demoAdmin),
        pharmacyProducts: await prisma.pharmacyProduct.count(),
        pharmacyBatches: await prisma.pharmacyBatch.count(),
      },
    });
  } catch (error) {
    const hint = prismaErrorHint(error);
    return fail(500, hint.code, hint.message);
  }
}

export async function POST() {
  const diagnostics = databaseUrlDiagnostics();
  if (!diagnostics.configured) {
    return fail(
      500,
      "DATABASE_URL",
      "DATABASE_URL is missing on the Vercel web project. Add the Railway public Postgres URL under Settings → Environment Variables (Production), then Redeploy.",
    );
  }
  if (diagnostics.privateNetwork) {
    return fail(
      500,
      "DATABASE_PRIVATE",
      "DATABASE_URL points at a private Railway host (*.railway.internal). Vercel cannot use that. In Railway → Postgres → Variables, copy the public DATABASE_URL and paste it on Vercel, then Redeploy.",
    );
  }

  try {
    await pingDatabase();
    await ensureDemoWorkspace();
    const [pharmacyProducts, pharmacyBatches] = await Promise.all([
      prisma.pharmacyProduct.count(),
      prisma.pharmacyBatch.count(),
    ]);
    return NextResponse.json({
      success: true,
      data: { ready: true, pharmacyProducts, pharmacyBatches },
    });
  } catch (error) {
    const hint = prismaErrorHint(error);
    console.error("Demo setup failed:", hint.code);
    return fail(500, hint.code, hint.message);
  }
}
