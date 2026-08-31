"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/whatsapp", label: "Overview", exact: true },
  { href: "/whatsapp/inbox", label: "Inbox" },
  { href: "/whatsapp/automations", label: "Automations" },
  { href: "/whatsapp/flows", label: "Flows" },
  { href: "/whatsapp/templates", label: "Templates" },
  { href: "/whatsapp/knowledge-base", label: "Knowledge Base" },
  { href: "/whatsapp/consent", label: "Consent" },
  { href: "/whatsapp/broadcasts", label: "Broadcasts" },
  { href: "/whatsapp/analytics", label: "Analytics" },
  { href: "/whatsapp/logs", label: "Logs" },
  { href: "/whatsapp/settings", label: "Settings" },
];

export function WhatsAppNav() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto rounded-xl border bg-card p-1" aria-label="WhatsApp Automation Center">
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
