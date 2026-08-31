"use client";

import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Avatar } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clinics, currentUser } from "@/lib/demo-data";
import { useAppState, type Role } from "@/lib/app-state";

const roleLabels: Record<Role, string> = {
  doctor: "Doctor view",
  coordinator: "Care Coordinator view",
  owner: "Clinic Owner view",
};

export function AppHeader() {
  const { clinicId, setClinicId, role, setRole } = useAppState();
  const { data: session } = useSession();
  const sessionName = session?.user?.name ?? currentUser.name;
  const sessionInitials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? currentUser.initials;
  const sessionRoleLabel = session?.user?.role?.replaceAll("_", " ") ?? roleLabels[role];
  const clinic = clinics.find((c) => c.id === clinicId) ?? clinics[0]!;

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[var(--app-header-height)] border-b border-border/70 bg-card/95 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5 lg:px-6">
        <Link
          href="/home"
          className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SmrkoMed home"
        >
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10">
            <img
              src="/branding/smrkomed-mark.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-cover"
            />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-bold tracking-[0.14em] text-primary">
              SMRKOMED
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 max-w-[min(52vw,16rem)] rounded-xl border-border/80 bg-background"
                aria-label="Clinic selector"
              >
                <Building2 className="size-4 shrink-0 text-primary" />
                <span className="truncate">{clinic.name}</span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuLabel>Clinic location</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {clinics.map((c) => (
                <DropdownMenuItem key={c.id} onSelect={() => setClinicId(c.id)}>
                  {c.name} · {c.city}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-primary-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User profile menu"
              >
                <Avatar initials={sessionInitials} />
                <span className="hidden text-left lg:block">
                  <span className="block text-sm font-semibold leading-tight">{sessionName}</span>
                  <span className="block text-[11px] text-muted-foreground">{sessionRoleLabel}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel>Dashboard view</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <DropdownMenuItem key={r} onSelect={() => setRole(r)}>
                  {roleLabels[r]}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  void signOut({ callbackUrl: "/login" });
                }}
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
