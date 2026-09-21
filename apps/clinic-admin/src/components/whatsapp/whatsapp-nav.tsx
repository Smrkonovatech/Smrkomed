"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { 
  LayoutGrid, MessageSquare, PhoneCall, Network, Database, FileText, BookOpen, 
  FileSignature, Megaphone, PieChart, Clock, Settings 
} from "lucide-react";

interface NavLinkItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  hidden?: boolean;
}

const links: NavLinkItem[] = [
  { href: "/whatsapp", label: "Dashboard", icon: LayoutGrid, exact: true },
  { href: "/whatsapp/inbox", label: "Messages", icon: MessageSquare },
  { href: "/communication/calls", label: "Calls", icon: PhoneCall },
  // Retained hidden items (not deleted)
  { href: "/whatsapp/automations", label: "Automations", icon: Network, hidden: true },
  { href: "/whatsapp/flows", label: "Flows", icon: Database, hidden: true },
  { href: "/whatsapp/templates", label: "Templates", icon: FileText, hidden: true },
  { href: "/whatsapp/knowledge-base", label: "Knowledge Base", icon: BookOpen, hidden: true },
  { href: "/whatsapp/consent", label: "Consent", icon: FileSignature, hidden: true },
  { href: "/whatsapp/broadcasts", label: "Broadcasts", icon: Megaphone, hidden: true },
  { href: "/whatsapp/analytics", label: "Analytics", icon: PieChart, hidden: true },
  { href: "/whatsapp/logs", label: "Logs", icon: Clock, hidden: true },
  // Settings kept active
  { href: "/whatsapp/settings", label: "Settings", icon: Settings },
];

export function WhatsAppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 bg-white border border-gray-100 rounded-xl p-2 w-14 shrink-0 shadow-sm" aria-label="WhatsApp Automation Center">
      {links.filter((link) => !link.hidden).map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        
        const Icon = link.icon;
        
        return (
          <div key={link.href} className="group relative">
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center size-10 rounded-xl transition-all duration-200",
                active
                  ? "bg-[#F3F0FF] text-[#866BE3] shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <Icon className={cn("size-5", active ? "text-[#866BE3]" : "text-[#64748B]")} />
            </Link>
            
            {/* Tooltip */}
            <div className="absolute left-full top-1/2 ml-2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
              {link.label}
              {/* Arrow */}
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          </div>
        );
      })}
    </nav>
  );
}
