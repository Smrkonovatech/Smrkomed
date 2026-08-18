import { prisma } from "@/lib/db";
import { ok, serverError } from "@/lib/api/response";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({ status: "ok", database: "connected" });
  } catch {
    return serverError("Database unavailable");
  }
}
