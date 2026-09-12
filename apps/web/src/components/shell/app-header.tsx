"use client";

import Link from "next/link";
import {
  Building2,
  CalendarPlus,
  ChevronDown,
  FilePlus2,
  ListPlus,
  MessageSquare,
  Plus,
  Search,
  UserPlus,
  Maximize2,
  MoreVertical,
  CheckCheck,
  ChevronRight,
  X,
  Paperclip,
  Send,
  Download,
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
  const { clinicId, setClinicId, role, setRole } = useAppState();
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

        <div className="mx-auto hidden min-w-0 max-w-xl flex-1 md:block lg:max-w-2xl">
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
                  className="h-10 w-full max-w-[280px] xl:max-w-[320px] rounded-full border-gray-100 bg-gray-50/80 pl-10 pr-4 text-[13px] shadow-none focus-visible:ring-1 focus-visible:ring-primary/30"
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

        <div className="ml-auto flex items-center gap-3 sm:gap-4">
          
          {/* 1. Clinic Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 max-w-[min(40vw,14rem)] rounded-full text-primary hover:bg-primary-soft/40 hover:text-primary px-3"
                aria-label="Clinic selector"
              >
                <Building2 className="size-4 shrink-0" />
                <span className="truncate font-medium">{clinic.name}</span>
                <ChevronDown className="size-3.5 shrink-0" />
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
          <Popover open={messagesOpen} onOpenChange={setMessagesOpen}>
            <PopoverTrigger asChild>
              <button className="relative hidden lg:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                <MessageSquare className="size-[18px] text-[#866BE3]" />
                <span className="absolute top-0 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F67575] text-[9px] font-bold text-white border-2 border-white shadow-sm">
                  2
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] rounded-2xl p-0 shadow-[0_10px_40px_rgb(0,0,0,0.1)] border-border/40 overflow-hidden mr-4 mt-2">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <h3 className="font-bold text-gray-900 text-[17px]">Messages</h3>
                <div className="flex items-center gap-3 text-gray-500">
                  <Maximize2 className="size-4 cursor-pointer hover:text-gray-800" />
                  <MoreVertical className="size-4 cursor-pointer hover:text-gray-800" />
                </div>
              </div>
              
              {/* Search */}
              <div className="px-4 pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input placeholder="Search" className="h-10 w-full rounded-xl border-gray-200 pl-9 text-sm bg-white focus-visible:ring-1 focus-visible:ring-primary/30" />
                </div>
              </div>

              {/* Message List */}
              <div className="max-h-[400px] overflow-y-auto pb-2">
                {/* Item 1 */}
                <div 
                  className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100"
                  onClick={() => {
                    setMessagesOpen(false);
                    setChatOpen(true);
                  }}
                >
                  <div className="relative shrink-0">
                    <img src="/images/dashboard/patient.png" alt="Avatar" className="size-11 rounded-full object-cover bg-gray-200" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm text-gray-800 truncate">Phoenix Baker</span>
                      <span className="text-[11px] text-gray-400 shrink-0">5min ago</span>
                    </div>
                    <p className="text-[13px] text-gray-500 truncate pr-4">Hey Olivia, Katherine sent me over the lat...</p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100 bg-[#F8F7FC]">
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-full bg-[#866BE3]"></div>
                    <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-[#22C55E] border-2 border-white"></span>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm text-gray-800 truncate">Phoenix Baker</span>
                      <span className="text-[11px] text-gray-400 shrink-0">5min ago</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-gray-600 truncate">Hey Olivia, Katherine sent me over th...</p>
                      <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#866BE3] text-[9px] font-bold text-white">2</span>
                    </div>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100">
                  <div className="relative shrink-0 flex -space-x-5">
                    <div className="size-11 rounded-full bg-[#E85D5D] border-[3px] border-white relative z-10"></div>
                    <div className="size-11 rounded-full bg-[#E85D5D]"></div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm text-gray-800 truncate">Mohit & Shruti</span>
                      <span className="text-[11px] text-gray-400 shrink-0">5min ago</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-gray-500 truncate"><span className="text-gray-700 font-medium">Mohit:</span> Hey Olivia, Katherine sent m...</p>
                      <ChevronRight className="size-4 shrink-0 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100">
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-full bg-[#4B83D8]"></div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm text-gray-800 truncate">Phoenix Baker</span>
                      <span className="text-[11px] text-gray-400 shrink-0">5min ago</span>
                    </div>
                    <p className="text-[13px] text-gray-500 truncate flex items-center gap-1">
                      <CheckCheck className="size-3.5 text-[#4B83D8] shrink-0" />
                      Hey Olivia, Katherine sent me over the...
                    </p>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100">
                  <div className="relative shrink-0">
                    <div className="size-11 rounded-full bg-gray-400"></div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-sm text-gray-800 truncate">Phoenix Baker</span>
                      <span className="text-[11px] text-gray-400 shrink-0">5min ago</span>
                    </div>
                    <p className="text-[13px] text-gray-500 truncate pr-4">Hey Olivia, Katherine sent me over the lat...</p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* 4. User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-full pl-1 pr-2 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="User profile menu"
              >
                <Avatar initials={sessionInitials} />
                <span className="hidden text-left lg:block">
                  <span className="block text-[13px] font-bold text-gray-800 leading-tight">{sessionName}</span>
                  <span className="block text-[10px] text-gray-500 font-medium tracking-wide uppercase">{sessionRoleLabel}</span>
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

      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-[340px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center gap-3">
              <img src="/images/dashboard/patient.png" alt="Avatar" className="size-9 rounded-full object-cover bg-gray-200" />
              <div>
                <h4 className="text-sm font-bold text-gray-800 leading-tight">Phoenix Baker</h4>
                <p className="text-[11px] text-gray-500">Active now</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-500">
              <Maximize2 className="size-4 cursor-pointer hover:text-gray-800" />
              <MoreVertical className="size-4 cursor-pointer hover:text-gray-800" />
              <X className="size-5 cursor-pointer hover:text-gray-800" onClick={() => setChatOpen(false)} />
            </div>
          </div>
          
          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#F8F7FC] min-h-[200px]">
            {/* Timestamp */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-[10px] text-gray-400 font-medium">Today 2:20pm</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Received Message */}
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3 text-[13px] text-gray-800 shadow-sm w-fit max-w-[85%]">
              Hey Olivia, can you please review the latest report when you can?
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-4 mt-2">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-[10px] text-gray-400 font-medium">2:35 pm</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Sent Message */}
            <div className="bg-[#866BE3] text-white rounded-2xl rounded-tr-sm p-3 text-[13px] shadow-sm self-end w-fit max-w-[85%]">
              Sure thing, I'll have a look today.
            </div>

            {/* Received File */}
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm p-3 shadow-sm w-[220px] flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[#E6F4EA] flex flex-col items-center justify-center text-[#1E8E3E]">
                <span className="text-[10px] font-bold">JPG</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate">Report</p>
                <p className="text-[11px] text-gray-500">1.2 MB</p>
              </div>
              <Download className="size-4 text-[#866BE3] cursor-pointer" />
            </div>

            {/* Sent Message */}
            <div className="bg-[#866BE3] text-white rounded-2xl rounded-tr-sm p-3 text-[13px] shadow-sm self-end w-fit max-w-[85%]">
              They're looking great!
            </div>

            {/* Typing Indicator */}
            <div className="bg-white border border-gray-100 rounded-xl rounded-tl-sm p-2 w-fit flex gap-1 items-center shadow-sm">
              <div className="size-1.5 rounded-full bg-gray-400 animate-bounce"></div>
              <div className="size-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="size-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
            <div className="flex-1 relative">
              <Input placeholder="Send a message" className="h-10 w-full rounded-xl border-gray-200 pr-10 text-sm focus-visible:ring-1 focus-visible:ring-primary/30" />
              <Paperclip className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 cursor-pointer hover:text-gray-600" />
            </div>
            <button className="size-10 rounded-xl bg-gray-400 text-white flex items-center justify-center shrink-0 hover:bg-gray-500 transition-colors">
              <Send className="size-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
