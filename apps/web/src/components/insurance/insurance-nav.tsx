"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/insurance", label: "Dashboard", exact: true },
  { href: "/insurance/claims", label: "Claims" },
  { href: "/insurance/providers", label: "Providers" },
  { href: "/insurance/tpas", label: "TPAs" },
  { href: "/insurance/analytics", label: "Analytics" },
  { href: "/insurance/claims/new", label: "New Claim" },
  { href: "/insurance/policies/new", label: "New Policy" },
];

export function InsuranceNav() {
  const pathname = usePathname();

  return (
    <nav
      className="overflow-x-auto rounded-xl border bg-card p-1"
      aria-label="Insurance section"
    >
      <ul className="flex min-w-max gap-0.5">
        {links.map((link) => {
          let active = false;
          if (link.exact) {
            active = pathname === link.href;
          } else if (link.href === "/insurance/claims") {
            active =
              pathname === "/insurance/claims" ||
              (pathname.startsWith("/insurance/claims/") && !pathname.startsWith("/insurance/claims/new"));
          } else {
            active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          }
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
