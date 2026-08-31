"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/digital-health", label: "Overview", exact: true },
  { href: "/digital-health/tasks", label: "ABDM Tasks" },
  { href: "/digital-health/activity", label: "Activity" },
  { href: "/digital-health/settings", label: "Settings" },
];

export function DigitalHealthNav() {
  const pathname = usePathname();

  return (
    <nav
      className="overflow-x-auto rounded-xl border bg-card p-1"
      aria-label="Digital Health section"
    >
      <ul className="flex min-w-max gap-0.5">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AbdmEnvironmentBanner({
  environment,
  connected,
}: {
  environment: string;
  connected?: boolean;
}) {
  if (environment === "production" && connected) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold tracking-wide text-emerald-900 uppercase">
        ABDM Production
      </div>
    );
  }
  if (environment === "sandbox" || environment === "unconfigured") {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold tracking-wide text-sky-900 uppercase">
        ABDM Sandbox — Test Environment
        {!connected ? " · Not connected" : ""}
      </div>
    );
  }
  return null;
}
