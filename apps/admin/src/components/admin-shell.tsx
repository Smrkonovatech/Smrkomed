"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/organizations", label: "Organizations" },
  { href: "/clinics", label: "Clinics" },
  { href: "/users", label: "Users" },
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/integrations", label: "Integrations" },
  { href: "/integrations/health", label: "Integration Health" },
  { href: "/integrations/events", label: "Integration Events" },
  { href: "/integrations/whatsapp", label: "WhatsApp" },
  { href: "/integrations/meta", label: "Meta Ads" },
  { href: "/integrations/google", label: "Google Ads" },
  { href: "/audit-logs", label: "Audit Logs" },
  { href: "/system/health", label: "System Health" },
  { href: "/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSession();

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-sidebar-border bg-sidebar lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-primary">SMRKOMED</p>
            <p className="text-sm font-semibold">Platform Admin</p>
          </div>
          <Button variant="outline" size="sm" className="lg:mt-4 lg:w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign out
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-col lg:px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/integrations" && pathname.startsWith(`${item.href}/`));
            const integrationsRoot = item.href === "/integrations" && pathname === "/integrations";
            const isActive = item.href === "/integrations" ? integrationsRoot : active;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  isActive ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="hidden px-4 pb-4 text-xs text-muted-foreground lg:block">
          {session.data?.user?.email}
        </p>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
