"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/whatsapp", label: "Overview", exact: true },
  { href: "/whatsapp/inbox", label: "Inbox" },
  { href: "/whatsapp/templates", label: "Templates" },
  { href: "/whatsapp/flows", label: "Flows" },
  { href: "/whatsapp/automations", label: "Automations" },
  { href: "/whatsapp/broadcasts", label: "Broadcasts" },
  { href: "/whatsapp/knowledge-base", label: "Knowledge Base" },
  { href: "/whatsapp/logs", label: "Logs" },
  { href: "/whatsapp/settings", label: "Settings" },
];

export function WhatsAppNav() {
  const pathname = usePathname();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
            Communication
          </p>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">WhatsApp Automation Center</h1>
        </div>
      </div>
      <nav
        className="overflow-x-auto rounded-2xl border border-border/70 bg-card p-1 shadow-sm"
        aria-label="WhatsApp Automation Center"
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
                    "inline-flex h-9 items-center rounded-xl px-3.5 text-xs font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
