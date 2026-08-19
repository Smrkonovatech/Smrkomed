import { pingDatabase } from "@smrkomed/database";
import { ok, serverError } from "@/lib/api/response";

export async function GET() {
  try {
    await pingDatabase();
    return ok({ status: "ok", database: "connected" });
  } catch {
    return serverError("Database unavailable");
  }
}
