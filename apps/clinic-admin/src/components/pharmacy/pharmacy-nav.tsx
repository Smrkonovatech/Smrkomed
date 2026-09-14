"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: "/pharmacy", label: "Dashboard", exact: true },
  { href: "/pharmacy/inventory", label: "Inventory" },
  { href: "/pharmacy/products", label: "Products" },
  { href: "/pharmacy/sales", label: "Sales" },
  { href: "/pharmacy/prescriptions", label: "Prescriptions" },
  { href: "/pharmacy/suppliers", label: "Suppliers" },
  { href: "/pharmacy/purchase-orders", label: "Purchase Orders" },
  { href: "/pharmacy/adjustments", label: "Adjustments" },
  { href: "/pharmacy/alerts", label: "Alerts" },
  { href: "/pharmacy/reports", label: "Reports" },
];

export function PharmacyNav() {
  const pathname = usePathname();

  return (
    <nav
      className="overflow-x-auto rounded-xl border bg-card p-1"
      aria-label="Pharmacy section"
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
