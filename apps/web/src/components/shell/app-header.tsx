"use client";

import Link from "next/link";
import {
  Building2,
  CalendarPlus,
  Check,
  ChevronDown,
  FilePlus2,
  ListPlus,
  LogOut,
  MessageSquare,
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
import { HeaderMessagesPopup } from "./header-messages-popup";
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
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const {
    clinicId,
    setClinicId,
    clinicName,
    currentClinic,
    role,
    setRole,
    couples: stateCouples,
    tasks: stateTasks,
    documents: stateDocs,
  } = useAppState();
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
  const doctorPhotoUrl = session?.user?.id
    ? `/api/v1/public/doctors/${encodeURIComponent(session.user.id)}/photo`
    : `/api/v1/public/doctors/cmu6rkn080000njfo34n9spvq/photo`;
  const clinic =
    clinics.find(
      (c) =>
        c.id === clinicId ||
        (c.id === "kochi" && (clinicId === "cmu3nmx310026jy04gsi21hxl" || clinicId.toLowerCase().includes("kochi"))) ||
        (c.id === "blr" && (clinicId === "cmt0exo9n000vl804rbaabh32" || clinicId.toLowerCase().includes("blr") || clinicId.toLowerCase().includes("bangalore"))),
    ) ??
    clinics.find((c) => c.id === "kochi") ??
    clinics[0]!;
  const displayClinicName = `${currentClinic?.name || clinicName || clinic.name} · ${clinic.city}`;

  const results = useMemo<SearchResult[]>(() => {
    const pool: SearchResult[] = [
      ...stateCouples.map((couple) => ({
        id: `couple-${couple.id}`,
        type: "Couple",
        name: coupleFullLabel(couple),
        status: couple.status,
        href: `/patients/${couple.slug}`,
        searchable: `${coupleFullLabel(couple)} ${couple.treatment} ${couple.stage}`,
      })),
      ...stateTasks.map((task) => ({
        id: `task-${task.id}`,
        type: "Task",
        name: task.title,
        status: task.status,
        href: "/tasks",
        searchable: `${task.title} ${task.status}`,
      })),
      ...stateDocs.map((doc) => ({
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
    <>
      <header className="fixed inset-x-0 top-0 z-40 py-4 border-b border-border/60 bg-white/90 backdrop-blur-md">
        <div className="relative mx-auto flex h-full w-full max-w-[1920px] items-center gap-3 px-4 sm:px-5 lg:px-6">
        <Link
          href="/home"
          className="flex min-w-0 shrink-0 items-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="SmrkoMed home"
        >
          <img src="/images/logo.png" alt="SmrkoMed Logo" className="h-8 w-auto object-contain" />
        </Link>

        <div className="mx-auto flex-1"></div>

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          
          {/* Search */}
          <div className="hidden min-w-0 md:block">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverAnchor asChild>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search patients, appointments, reports..."
                    className="h-9 w-full min-w-[280px] xl:min-w-[320px] rounded-full border-gray-100 bg-gray-50/80 pl-10 pr-4 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
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

          {/* 1. Clinic Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 max-w-[min(45vw,16rem)] rounded-full border border-gray-200 bg-white text-primary hover:bg-primary-soft/40 hover:text-primary px-3 shadow-xs"
                aria-label="Clinic selector"
              >
                <Building2 className="size-4 shrink-0" />
                <span className="truncate font-medium">{displayClinicName}</span>
                <ChevronDown className="size-3.5 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                Clinic location
              </DropdownMenuLabel>
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
                    <span>
                      {currentClinic?.name || c.name} · {c.city}
                    </span>
                    {isSelected && <Check className="size-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 2. Quick Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 rounded-full px-4 gap-1.5 bg-[#866BE3] hover:bg-[#7254d1] text-white shadow-sm border-none">
                <Plus className="size-4" />
                <span className="hidden sm:inline font-medium">Quick actions</span>
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

          {/* 3. Messages/Notifications */}
          <HeaderMessagesPopup />

          {/* 4. User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-full pl-1 pr-2 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User profile menu"
              >
                <Avatar initials={sessionInitials} src={doctorPhotoUrl} />
                <span className="hidden text-left lg:block">
                  <span className="block text-[13px] font-bold text-gray-800 leading-tight">{sessionName}</span>
                  <span className="block text-[10px] text-gray-500 font-medium tracking-wide uppercase">{sessionRoleLabel}</span>
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
                  void exitAppFullscreen().finally(() => {
                    void signOut({ callbackUrl: "/login" });
                  });
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

    </>
  );
}
