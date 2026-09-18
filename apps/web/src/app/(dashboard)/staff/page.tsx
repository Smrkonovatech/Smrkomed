"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UsersRound,
  Search,
  Plus,
  Stethoscope,
  Heart,
  CalendarDays,
  Users,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Mail,
  MoreHorizontal,
  UserRound,
  Phone,
  Clock,
  Activity,
  Building2,
  GraduationCap,
  Award,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clinicApi } from "@/lib/clinic-api";
import { doctorsStore } from "@/lib/doctors";
import { useAppState } from "@/lib/app-state";

type StaffMember = {
  id: string;
  name: string;
  initials?: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  role: string;
  roleName: string;
  isActive?: boolean;
  joinedAt?: string;
};

const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DOCTOR:           { label: "Doctor",            color: "text-blue-700 dark:text-blue-300",   bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800",   icon: Stethoscope },
  CARE_COORDINATOR: { label: "Care Coordinator",  color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-500/10 border-violet-200",                  icon: Users },
  NURSE:            { label: "Nurse",             color: "text-pink-700 dark:text-pink-300",   bg: "bg-pink-500/10 border-pink-200",                        icon: Heart },
  RECEPTIONIST:     { label: "Receptionist",      color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-200",               icon: CalendarDays },
  CLINIC_ADMIN:     { label: "Clinic Admin",      color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-200",                      icon: ShieldCheck },
  ORGANIZATION_ADMIN: { label: "Org Admin",       color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-200",                      icon: ShieldCheck },
  LAB_TECHNICIAN:   { label: "Lab Technician",   color: "text-cyan-700 dark:text-cyan-300",   bg: "bg-cyan-500/10 border-cyan-200",                        icon: FlaskConical },
  EMBRYOLOGIST:     { label: "Embryologist",     color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-500/10 border-indigo-200",                  icon: FlaskConical },
  PHARMACY_MANAGER: { label: "Pharmacy Manager", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500/10 border-orange-200",                  icon: UserRound },
  PHARMACIST:       { label: "Pharmacist",        color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-500/10 border-orange-200",                 icon: UserRound },
  PHARMACY_STAFF:   { label: "Pharmacy Staff",   color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-200",                  icon: UserRound },
  BILLING_STAFF:    { label: "Billing Staff",    color: "text-lime-700 dark:text-lime-300",   bg: "bg-lime-500/10 border-lime-200",                        icon: UserRound },
  COUNSELOR:        { label: "Counselor",         color: "text-teal-700 dark:text-teal-300",   bg: "bg-teal-500/10 border-teal-200",                        icon: Users },
  MARKETING:        { label: "Marketing",         color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-500/10 border-purple-200",                  icon: UserRound },
  READ_ONLY:        { label: "Read Only",         color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-200",                      icon: UserRound },
};

const AVATAR_BG = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function getAvatarGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_BG[Math.abs(hash) % AVATAR_BG.length];
}

function formatJoined(date?: string) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default function StaffDirectoryPage() {
  const { clinicId } = useAppState();
  const isBangalore = clinicId === "blr" || clinicId === "cmt0exo9n000vl804rbaabh32";
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const targetClinic = isBangalore ? "cmt0exo9n000vl804rbaabh32" : "cmu3nmx310026jy04gsi21hxl";
        const data = await clinicApi.getStaff(targetClinic);
        const list = Array.isArray(data) ? data : [];
        for (const s of list) {
          if (s.role === "DOCTOR" || s.roleName?.toLowerCase().includes("doctor")) {
            doctorsStore.ensureFromStaff(s, clinicId);
          }
        }
        setStaff(list);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load staff");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clinicId, isBangalore]);

  const roleGroups = Array.from(new Set(staff.map((s) => ROLE_META[s.role]?.label ?? s.role)));
  const filterOptions = ["All", ...roleGroups];

  const filtered = staff.filter((s) => {
    const label = ROLE_META[s.role]?.label ?? s.role;
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      (s.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      label.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || label === roleFilter;
    return matchSearch && matchRole;
  });

  const doctors = staff.filter((s) => s.role === "DOCTOR").length;
  const coordinators = staff.filter((s) => s.role === "CARE_COORDINATOR").length;
  const nurses = staff.filter((s) => s.role === "NURSE").length;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 bg-slate-50/50 dark:bg-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <UsersRound className="size-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Directory</h1>
            <p className="text-sm text-muted-foreground">Manage your clinic team, roles, and access.</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/staff/roles">
            <Button variant="outline" size="sm" className="gap-1.5"><ShieldCheck className="size-3.5" /> Manage Roles</Button>
          </Link>
          <Link href="/staff/invitations">
            <Button variant="outline" size="sm" className="gap-1.5"><Mail className="size-3.5" /> Invites</Button>
          </Link>
          <Link href="/staff/add">
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"><Plus className="size-3.5" /> Add Staff</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Staff", value: staff.length, color: "text-slate-800 dark:text-slate-100", bg: "bg-white dark:bg-card" },
          { label: "Doctors",     value: doctors,      color: "text-blue-700 dark:text-blue-300",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Coordinators", value: coordinators, color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Nurses",      value: nurses,       color: "text-pink-700 dark:text-pink-300",    bg: "bg-pink-50 dark:bg-pink-950/30" },
        ].map((s) => (
          <Card key={s.label} className={`shadow-sm border-none ${s.bg}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {filterOptions.map((r) => (
            <Button
              key={r}
              variant={roleFilter === r ? "default" : "outline"}
              size="sm"
              className={`shrink-0 ${roleFilter === r ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white dark:bg-card"}`}
              onClick={() => setRoleFilter(r)}
            >{r}</Button>
          ))}
        </div>
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, role..."
            className="pl-8 w-full sm:w-[220px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading team...</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UsersRound className="size-14 text-muted-foreground/20 mb-4" />
          <p className="font-semibold text-muted-foreground text-lg">
            {staff.length === 0 ? "No staff added yet" : "No results"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {staff.length === 0 ? "Add your first team member to get started." : "Try a different search or filter."}
          </p>
          {staff.length === 0 && (
            <Link href="/staff/add" className="mt-5">
              <Button className="gap-2"><Plus className="size-4" /> Add First Staff Member</Button>
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member, idx) => {
            const meta = ROLE_META[member.role] ?? { label: member.roleName ?? member.role, color: "text-slate-600", bg: "bg-slate-100", icon: UserRound };
            const Icon = meta.icon;
            const initials = member.initials || member.name.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
            const gradient = getAvatarGradient(member.name);
            const joined = formatJoined(member.joinedAt);
            const doctorProfile = member.role === "DOCTOR" ? doctorsStore.ensureFromStaff(member) : null;

            return (
              <Card key={member.id} className="shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border-border/60 group">
                {/* Top color bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${gradient} opacity-70`} />

                <CardContent className="p-5">
                  {/* Avatar + Name + Menu row */}
                  <div className="flex items-start gap-3 mb-4">
                    {/* Avatar */}
                    <div className={`size-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
                      {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base leading-tight truncate">{member.name}</h3>
                      {/* Role badge */}
                      <div className={`inline-flex items-center gap-1 text-xs font-medium mt-1 px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                        <Icon className="size-3" />
                        {meta.label}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 size-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-xs text-muted-foreground" disabled>{member.email}</DropdownMenuItem>
                        {member.phone && (
                          <DropdownMenuItem className="text-xs text-muted-foreground" disabled>{member.phone}</DropdownMenuItem>
                        )}
                        {doctorProfile && (
                          <DropdownMenuItem asChild>
                            <Link href={`/doctors/${doctorProfile.id}`} className="text-xs font-medium text-indigo-600">
                              View Doctor Profile
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-xs text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to remove ${member.name} from this clinic?`)) return;
                            try {
                              await clinicApi.deleteDoctor(member.id);
                              doctorsStore.deleteDoctor(member.id);
                              setStaff((prev) => prev.filter((s) => s.id !== member.id));
                              toast.success(`${member.name} removed from clinic.`);
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to remove staff member.");
                            }
                          }}
                        >
                          <Trash2 className="size-3.5 mr-1" />
                          {member.role === "DOCTOR" ? "Delete Doctor" : "Remove Staff"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {/* Specialty / Title */}
                    {(member.title || doctorProfile?.primarySpecialty) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Stethoscope className="size-3.5 shrink-0 text-indigo-400" />
                        <span className="truncate">{member.title || doctorProfile?.primarySpecialty}</span>
                      </div>
                    )}
                    {/* Department (for Doctors) */}
                    {doctorProfile?.department && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Building2 className="size-3.5 shrink-0 text-blue-400" />
                        <span className="truncate">{doctorProfile.department}</span>
                      </div>
                    )}
                    {/* Medical Registration No. */}
                    {doctorProfile?.registrationNumber && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <Award className="size-3.5 shrink-0 text-amber-500" />
                        <span>Reg: <strong className="font-mono text-foreground/80">{doctorProfile.registrationNumber}</strong></span>
                      </div>
                    )}
                    {/* Qualifications */}
                    {doctorProfile?.qualifications && doctorProfile.qualifications.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <GraduationCap className="size-3.5 shrink-0 text-emerald-500" />
                        <span className="truncate">{doctorProfile.qualifications.map((q) => q.degree).join(", ")}</span>
                      </div>
                    )}
                    {/* Email */}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0 text-slate-400" />
                      <span className="truncate text-xs">{member.email}</span>
                    </div>
                    {/* Phone */}
                    {member.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5 shrink-0 text-slate-400" />
                        <span className="text-xs">{member.phone}</span>
                      </div>
                    )}
                    {/* Link to Doctor Profile */}
                    {doctorProfile && (
                      <div className="pt-1.5 border-t border-border/40 mt-2">
                        <Link
                          href={`/doctors/${doctorProfile.id}`}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                        >
                          View Doctor Profile →
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-xs text-muted-foreground">Active</span>
                      {joined && (
                        <span className="text-xs text-muted-foreground">· Joined {joined}</span>
                      )}
                    </div>
                    <Badge variant="outline" className={`text-[10px] py-0 h-5 ${meta.color} ${meta.bg}`}>
                      {meta.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
