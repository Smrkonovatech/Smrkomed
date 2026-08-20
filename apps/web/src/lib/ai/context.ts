import type { AiPageContext } from "./types";

export function normalizePageContext(raw: unknown): AiPageContext {
  if (!raw || typeof raw !== "object") {
    return { pathname: "/" };
  }
  const value = raw as Record<string, unknown>;
  const pathname = typeof value["pathname"] === "string" ? value["pathname"].slice(0, 200) : "/";
  const coupleSlug =
    typeof value["coupleSlug"] === "string" ? value["coupleSlug"].slice(0, 120) : undefined;
  const coupleId = typeof value["coupleId"] === "string" ? value["coupleId"].slice(0, 64) : undefined;
  const search = typeof value["search"] === "string" ? value["search"].slice(0, 120) : undefined;
  return {
    pathname,
    ...(coupleSlug ? { coupleSlug } : {}),
    ...(coupleId ? { coupleId } : {}),
    ...(search ? { search } : {}),
  };
}

export function describePageContext(ctx: AiPageContext): string {
  const page =
    ctx.pathname === "/" || ctx.pathname === ""
      ? "Dashboard"
      : ctx.pathname.startsWith("/patients/")
        ? "Patient profile"
        : ctx.pathname.startsWith("/patients")
          ? "Patients list"
          : ctx.pathname.startsWith("/appointments")
            ? "Appointments"
            : ctx.pathname.startsWith("/tasks")
              ? "Tasks"
              : ctx.pathname;
  const parts = [`Current route: ${ctx.pathname}`, `Current page: ${page}`];
  if (ctx.coupleSlug) parts.push(`Current couple slug: ${ctx.coupleSlug}`);
  if (ctx.search) parts.push(`Current filters/search: ${ctx.search}`);
  parts.push("Clinic identity comes from the authenticated session — never from the client.");
  return parts.join("\n");
}

export function coupleSlugFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/patients\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}
