"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Stethoscope,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { clinicApi } from "@/lib/clinic-api";
import { doctorsStore } from "@/lib/doctors";

const ROLE_OPTIONS = [
  { value: "DOCTOR", label: "Doctor", description: "Full clinical access, consultations, reports", icon: Stethoscope, color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { value: "CARE_COORDINATOR", label: "Care Coordinator", description: "Care Loop, tasks, patient management", icon: UserCheck, color: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  { value: "NURSE", label: "Nurse", description: "Patient care, vitals, task execution", icon: User, color: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
  { value: "RECEPTIONIST", label: "Receptionist", description: "Appointments, patient check-in, reception", icon: Users, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { value: "CLINIC_ADMIN", label: "Clinic Admin", description: "Full clinic management, settings, staff", icon: User, color: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { value: "LAB_TECHNICIAN", label: "Lab Technician", description: "Diagnostics, lab results, specimen handling", icon: User, color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  { value: "EMBRYOLOGIST", label: "Embryologist", description: "IVF lab, embryo grading, lab records", icon: User, color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
  { value: "PHARMACY_MANAGER", label: "Pharmacy Manager", description: "Pharmacy inventory, dispensing, management", icon: User, color: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
  { value: "BILLING_STAFF", label: "Billing Staff", description: "Billing, payments, invoices", icon: User, color: "bg-lime-500/10 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800" },
];

type CreatedStaff = {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string | undefined;
  doctorId?: string | undefined;
};

export default function AddStaffPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Reproductive Medicine");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [yearsExperience, setYearsExperience] = useState("10");
  const [languages, setLanguages] = useState("English, Hindi");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("DOCTOR");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedStaff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "https://yourdomain.com/login";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) { setError("Full name must be at least 2 characters."); return; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const res = await clinicApi.createStaffMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        title: title.trim() || (role === "DOCTOR" ? "Fertility Specialist" : undefined),
        phone: phone.trim() || undefined,
        department: role === "DOCTOR" ? (department.trim() || "Reproductive Medicine") : undefined,
        registrationNumber: role === "DOCTOR" ? (registrationNumber.trim() || undefined) : undefined,
        qualifications: role === "DOCTOR" ? (qualifications.trim() || undefined) : undefined,
        yearsExperience: role === "DOCTOR" && yearsExperience ? Number(yearsExperience) : undefined,
        languages: role === "DOCTOR" ? (languages.trim() || undefined) : undefined,
      });

      if (role === "DOCTOR") {
        doctorsStore.ensureFromStaff({
          id: res.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          title: title.trim() || "Fertility Specialist",
          role: "DOCTOR",
          department: department.trim() || "Reproductive Medicine",
          registrationNumber: registrationNumber.trim() || undefined,
          qualifications: qualifications.trim() || undefined,
          yearsExperience: yearsExperience ? Number(yearsExperience) : 10,
        });
      }

      setCreated({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        phone: phone.trim() || undefined,
        doctorId: role === "DOCTOR" ? `doc_${res.id}` : undefined,
      });
      toast.success(`${name.trim()} has been added to the clinic.`);
    } catch (err: any) {
      const msg: string = err?.message ?? "Failed to create account.";
      if (msg.includes("already exists") || msg.includes("EMAIL_TAKEN")) {
        setError("This email is already registered. Use a different email address.");
      } else if (msg.includes("USERS_MANAGE") || msg.includes("Forbidden")) {
        setError("You don't have permission to add staff. You need Clinic Admin access.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function getCredentialsMessage(staff: CreatedStaff) {
    const roleLabel = ROLE_OPTIONS.find((r) => r.value === staff.role)?.label ?? staff.role;
    return `Hi ${staff.name}! 👋

Your SmrkoMed clinic account has been created.

🔗 Login URL: ${loginUrl}
📧 Email: ${staff.email}
🔐 Password: ${staff.password}
👤 Role: ${roleLabel}

Please log in and change your password after first sign-in.

Regards,
Clinic Admin`;
  }

  function handleCopy(staff: CreatedStaff) {
    navigator.clipboard.writeText(getCredentialsMessage(staff));
    setCopied(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  }

  function handleWhatsApp(staff: CreatedStaff) {
    const text = encodeURIComponent(getCredentialsMessage(staff));
    const phone = staff.phone?.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

  if (created) {
    const roleObj = ROLE_OPTIONS.find((r) => r.value === created.role);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-8 pb-6 space-y-5">
            {/* Success header */}
            <div className="flex flex-col items-center text-center gap-2">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="size-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{created.name} account created!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Share these credentials with them so they can log in.
                </p>
              </div>
            </div>

            {/* Credentials box */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3 text-sm font-mono">
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="text-muted-foreground text-xs font-sans">Login URL</span>
                <span className="text-primary font-medium break-all font-sans">{loginUrl}</span>
              </div>
              <div className="border-t" />
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground text-xs font-sans">Email</span>
                <span className="font-medium">{created.email}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground text-xs font-sans">Password</span>
                <span className="font-bold tracking-widest text-base">{created.password}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground text-xs font-sans">Role</span>
                <Badge variant="outline" className="font-sans">{roleObj?.label ?? created.role}</Badge>
              </div>
            </div>

            {/* Share buttons */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Send login details to the staff member:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleCopy(created)}
                >
                  {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  {copied ? "Copied!" : "Copy Message"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  onClick={() => handleWhatsApp(created)}
                >
                  <MessageCircle className="size-4" />
                  Send on WhatsApp
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {created.phone
                  ? `WhatsApp will open for ${created.phone}`
                  : "WhatsApp will open — you can choose a contact"}
              </p>
            </div>

            {/* Doctor Profile link */}
            {created.role === "DOCTOR" && (
              <Link href="/doctors" className="block">
                <Button variant="secondary" className="w-full gap-2 text-xs border border-blue-200 dark:border-blue-900 bg-blue-50/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300">
                  <Stethoscope className="size-3.5" />
                  View in Doctor Directory & Profiles
                </Button>
              </Link>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1 border-t">
              <Button variant="outline" className="flex-1" onClick={() => {
                setCreated(null);
                setName(""); setEmail(""); setPhone(""); setTitle(""); setPassword(""); setRole("DOCTOR");
                setCopied(false);
              }}>
                Add Another
              </Button>
              <Button className="flex-1" onClick={() => router.push("/staff")}>
                Back to Staff
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/staff">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Staff Member</h1>
          <p className="text-sm text-muted-foreground">Create a real login account for your clinic team.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Role selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Role</CardTitle>
            <CardDescription>The role determines what this staff member can access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`text-left rounded-lg border p-3 transition-all hover:border-primary/50 ${
                      selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 rounded-md p-1 ${opt.color}`}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm leading-tight">{opt.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{opt.description}</p>
                      </div>
                      {selected && <Check className="size-4 text-primary ml-auto shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Personal details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder={role === "DOCTOR" ? "Dr. Ananya Rao" : "Full name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">
                  {role === "DOCTOR" ? "Specialty" : "Title / Designation"}
                </Label>
                <Input
                  id="title"
                  placeholder={role === "DOCTOR" ? "Fertility Specialist" : "e.g. Senior Coordinator"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                {role === "DOCTOR" && (
                  <p className="text-xs text-muted-foreground">
                    This shows in WhatsApp doctor selection list
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="doctor@yourclinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Phone <span className="text-muted-foreground text-xs">(for WhatsApp share)</span>
                </Label>
                <Input
                  id="phone"
                  placeholder="+91 98XXX XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used to send login details via WhatsApp
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctor Clinical & Professional Details */}
        {role === "DOCTOR" && (
          <Card className="border-blue-500/30 bg-blue-50/10 dark:bg-blue-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Stethoscope className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Doctor Profile & Clinical Details</CardTitle>
                  <CardDescription className="text-xs">
                    These details will display in the Doctor Directory, patient 360, appointment schedules, and qualifications.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g. Reproductive Medicine, Fertility & IVF"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="regNum">Medical Registration No.</Label>
                  <Input
                    id="regNum"
                    placeholder="e.g. KMC-48291"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qualifications">Qualifications / Degrees</Label>
                  <Input
                    id="qualifications"
                    placeholder="e.g. MBBS, MS (OBG), Fellowship in Reproductive Medicine"
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="experience">Years of Experience</Label>
                  <Input
                    id="experience"
                    type="number"
                    min="1"
                    max="50"
                    placeholder="10"
                    value={yearsExperience}
                    onChange={(e) => setYearsExperience(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="languages">Languages Spoken</Label>
                <Input
                  id="languages"
                  placeholder="e.g. English, Hindi, Kannada"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Password */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Login Password</CardTitle>
            <CardDescription>
              Set a temporary password. You'll be able to copy it and share via WhatsApp after creation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-w-sm">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                After creation, you'll get a <strong>Copy</strong> and <strong>WhatsApp share</strong> button to send these to the doctor.
              </p>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/staff">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[160px]">
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Creating account…
              </>
            ) : (
              <>Create {selectedRole?.label ?? "Staff"} Account</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
