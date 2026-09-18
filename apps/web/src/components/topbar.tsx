"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarPlus,
  Check,
  ChevronDown,
  FilePlus2,
  ListPlus,
  LogOut,
  Menu,
  Sparkles,
  Plus,
  Search,
  Settings,
  User,
  UserPlus,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { SidebarContentBody } from "@/components/app-sidebar";
import { Avatar, StatusBadge } from "@/components/ui-kit";
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  clinics,
  coupleFullLabel,
  couples,
  currentUser,
  cycles,
  documents,
  leads,
  tasks,
} from "@/lib/demo-data";
import { useAppState, type Role } from "@/lib/app-state";

const roleLabels: Record<Role, string> = {
  doctor: "Doctor view",
  coordinator: "Care Coordinator view",
  owner: "Clinic Owner view",
};

type SearchResult = {
  id: string;
  type: "Couple" | "Cycle" | "Task" | "Document" | "Enquiry";
  name: string;
  status: string;
  action: string;
  href: string;
  searchable: string;
};

export function Topbar() {
  const { clinicId, setClinicId, role, setRole, kpis, couples, tasks, documents } = useAppState();
  const { data: session } = useSession();
  const { openAction } = useGlobalActions();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sessionName = session?.user?.name ?? currentUser.name;
  const sessionInitials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? currentUser.initials;
  const sessionRoleLabel = session?.user?.role?.replaceAll("_", " ") ?? roleLabels[role];
  const doctorPhotoUrl = session?.user?.id
    ? `/api/v1/public/doctors/${encodeURIComponent(session.user.id)}/photo`
    : `/api/v1/public/doctors/cmu6rkn080000njfo34n9spvq/photo`;
  const clinic = clinics.find((c) => c.id === clinicId) ?? clinics[0]!;
  const filteredResults = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    const pool: SearchResult[] = [
      ...couples.map((couple) => ({
        id: `couple-${couple.id}`,
        type: "Couple" as const,
        name: coupleFullLabel(couple),
        status: couple.status,
        action: "Open profile",
        href: `/patients/${couple.slug}`,
        searchable: `${coupleFullLabel(couple)} ${couple.treatment} ${couple.stage} ${couple.status}`,
      })),
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        type: "Task" as const,
        name: task.title,
        status: task.status.replaceAll("_", " "),
        action: "Open task",
        href: `/tasks?task=${task.id}`,
        searchable: `${task.title} ${task.assignedTo} ${task.category} ${task.status}`,
      })),
      ...documents.map((document) => ({
        id: `document-${document.id}`,
        type: "Document" as const,
        name: document.name,
        status: document.status,
        action: "View document",
        href: `/documents?document=${document.id}`,
        searchable: `${document.name} ${document.category} ${document.uploadedBy} ${document.status}`,
      })),
    ];
    return pool
      .filter((result) => result.searchable.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [couples, tasks, documents, query]);

  const selectSearchResult = (result: SearchResult) => {
    setSearchOpen(false);
    setQuery("");
    router.push(result.href);
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/95 backdrop-blur-sm">
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(90vw,22rem)] p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContentBody onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <p className="min-w-0 max-w-[28vw] truncate text-sm font-semibold md:hidden">
          {clinic.name}
        </p>

        <Popover open={searchOpen && query.trim().length > 0} onOpenChange={setSearchOpen}>
          <PopoverAnchor asChild>
            <div className="relative min-w-0 max-w-xl flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(event.target.value.trim().length > 0);
                }}
                onFocus={() => setSearchOpen(query.trim().length > 0)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                  if (event.key === "Enter" && filteredResults[0]) {
                    event.preventDefault();
                    selectSearchResult(filteredResults[0]);
                  }
                }}
                className="h-11 rounded-md border-border bg-muted/40 pl-9 shadow-none sm:h-9"
                placeholder="Search…"
                aria-label="Global search"
                aria-expanded={searchOpen && query.trim().length > 0}
                aria-controls="global-search-results"
              />
            </div>
          </PopoverAnchor>
          <PopoverContent
            id="global-search-results"
            align="start"
            sideOffset={7}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="w-[min(38rem,calc(100vw-2rem))] rounded-md p-1 shadow-soft"
          >
            <div className="border-b px-2.5 py-2 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
              Search results
            </div>
            <div className="max-h-[360px] overflow-y-auto py-1">
              {filteredResults.length ? (
                filteredResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="w-16 shrink-0 text-[10px] font-bold tracking-wide text-primary uppercase">
                      {result.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{result.name}</span>
                      <span className="block truncate text-[11px] capitalize text-muted-foreground">
                        {result.status}
                      </span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary sm:flex">
                      {result.action}
                      <ArrowRight className="size-3.5" />
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No matching records
                </p>
              )}
            </div>
            <div className="border-t px-2.5 py-1.5 text-[10px] text-muted-foreground">
              Press Enter to open the first result
            </div>
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          <StatusBadge
            label={`Care Loop following ${kpis.active} journeys`}
            tone="rose"
            className="hidden xl:inline-flex"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="rounded-md" aria-label="Quick Action">
                <Plus className="size-4" />
                <span className="hidden sm:inline">Quick Action</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openAction("add-couple")}>
                <UserPlus className="size-4" /> Add Couple
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("new-appointment")}>
                <CalendarPlus className="size-4" /> New Appointment
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("create-task")}>
                <ListPlus className="size-4" /> Create Care Task
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("start-cycle")}>
                <Sparkles className="size-4" /> Start IVF Cycle
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("upload-document")}>
                <FilePlus2 className="size-4" /> Upload Document
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => openAction("add-enquiry")}>
                <UserPlus className="size-4" /> Add Enquiry
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-md"
            aria-label="Notifications"
            asChild
          >
            <Link href="/notifications">
              <Bell className="size-4.5" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger" />
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="hidden rounded-md md:inline-flex">
                <Building2 className="size-4" />
                <span className="max-w-[150px] truncate">
                  {clinic.name} · {clinic.city}
                </span>
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Clinic location</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {clinics.map((c) => {
                const isSelected = c.id === clinicId;
                return (
                  <DropdownMenuItem
                    key={c.id}
                    onSelect={() => setClinicId(c.id)}
                    className={`flex items-center justify-between cursor-pointer ${
                      isSelected ? "font-semibold bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span>{c.name} · {c.city}</span>
                    {isSelected && <Check className="size-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex min-h-11 min-w-11 items-center gap-2 rounded-md p-1 transition-colors hover:bg-muted sm:min-h-0"
                aria-label="User menu"
              >
                <Avatar initials={sessionInitials} src={doctorPhotoUrl} />
                <span className="hidden text-left xl:block">
                  <span className="block text-sm font-semibold leading-tight">
                    {sessionName}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {sessionRoleLabel}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg">
              <DropdownMenuItem asChild>
                <Link
                  href="/doctor/profile"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors hover:bg-muted"
                >
                  <User className="size-4 text-primary" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors hover:bg-muted"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                className="flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors text-destructive focus:text-destructive hover:bg-destructive/10"
                onSelect={() => {
                  void signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
