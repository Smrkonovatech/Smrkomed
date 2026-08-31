"use client";

import Link from "next/link";
import {
  Building2,
  CalendarPlus,
  ChevronDown,
  FilePlus2,
  ListPlus,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
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
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { exitAppFullscreen } from "@/lib/browser/fullscreen";
import { clinics, coupleFullLabel, couples, currentUser, cycles, documents, leads, tasks } from "@/lib/demo-data";
import { useAppState, type Role } from "@/lib/app-state";

const roleLabels: Record<Role, string> = {
  doctor: "Doctor view",
  coordinator: "Care Coordinator view",
  owner: "Clinic Owner view",
};

type SearchResult = {
  id: string;
  type: string;
  name: string;
  status: string;
  href: string;
  searchable: string;
};

export function AppHeader() {
  const router = useRouter();
  const { openAction } = useGlobalActions();
  const { clinicId, setClinicId, role, setRole } = useAppState();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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

  const results = useMemo<SearchResult[]>(() => {
    const pool: SearchResult[] = [
      ...couples.map((couple) => ({
        id: `couple-${couple.id}`,
        type: "Couple",
        name: coupleFullLabel(couple),
        status: couple.status,
        href: `/patients/${couple.slug}`,
        searchable: `${coupleFullLabel(couple)} ${couple.treatment} ${couple.stage}`,
      })),
      ...cycles.map((cycle) => ({
        id: `cycle-${cycle.id}`,
        type: "Journey",
        name: cycle.cycleLabel,
        status: cycle.status,
        href: "/ivf-cycles",
        searchable: `${cycle.cycleLabel} ${cycle.treatment} ${cycle.stage}`,
      })),
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        type: "Task",
        name: task.title,
        status: task.status,
        href: "/tasks",
        searchable: `${task.title} ${task.status}`,
      })),
      ...documents.map((doc) => ({
        id: `doc-${doc.id}`,
        type: "Document",
        name: doc.name,
        status: doc.status,
        href: "/documents",
        searchable: doc.name,
      })),
      ...leads.map((lead) => ({
        id: `lead-${lead.id}`,
        type: "Enquiry",
        name: lead.name,
        status: lead.stage,
        href: "/crm",
        searchable: `${lead.name} ${lead.stage}`,
      })),
    ];
    const q = query.trim().toLowerCase();
    if (!q) return pool.slice(0, 6);
    return pool.filter((item) => item.searchable.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[var(--app-header-height)] border-b border-border/60 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-3 px-5 sm:px-8 lg:px-[80px]">
        <Link
          href="/home"
          className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SmrkoMed home"
        >
          <span className="grid size-8 place-items-center overflow-hidden rounded-lg bg-primary-soft">
            <img src="/branding/smrkomed-mark.png" alt="" width={32} height={32} className="size-8 object-cover" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-sm font-bold tracking-tight text-foreground">SmrkoMed</span>
            <span className="block text-[10px] font-medium tracking-wide text-muted-foreground">
              Healthcare Intelligence
            </span>
          </span>
        </Link>

        <div className="mx-auto hidden min-w-0 max-w-xl flex-1 md:block lg:max-w-2xl">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverAnchor asChild>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search patients, couples, appointments..."
                  className="h-9 rounded-xl border-border/70 bg-background/80 pl-9 pr-3 text-sm shadow-none"
                  aria-label="Global search"
                />
              </div>
            </PopoverAnchor>
            <PopoverContent
              align="start"
              className="w-[min(36rem,calc(100vw-2rem))] rounded-2xl p-1.5 shadow-lg"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <p className="px-2.5 py-1.5 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                Search results
              </p>
              <ul className="max-h-72 overflow-y-auto">
                {results.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-primary-soft/60"
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery("");
                        router.push(result.href);
                      }}
                    >
                      <span className="w-16 shrink-0 text-[10px] font-bold text-primary uppercase">
                        {result.type}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{result.name}</span>
                      <span className="truncate text-[11px] text-muted-foreground capitalize">{result.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 rounded-xl gap-1.5">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Quick Action</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuLabel>Create</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openAction("add-couple")}>
                <UserPlus className="size-4" /> Add Patient / Couple
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("new-appointment")}>
                <CalendarPlus className="size-4" /> Schedule Appointment
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("create-task")}>
                <ListPlus className="size-4" /> Create Task
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("start-cycle")}>
                <Plus className="size-4" /> Create Care Plan
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("upload-document")}>
                <FilePlus2 className="size-4" /> Upload Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 max-w-[min(40vw,14rem)] rounded-xl border-border/70 bg-background"
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
                <ChevronDown className="hidden size-3.5 opacity-60 lg:block" />
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
                  void exitAppFullscreen().finally(() => {
                    void signOut({ callbackUrl: "/login" });
                  });
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
