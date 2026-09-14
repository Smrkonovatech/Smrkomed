"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, Sparkles, User } from "lucide-react";

import { RegisterShowcase } from "@/components/register-showcase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "smrkomed.onboarding.account";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || !email.includes("@") || phone.trim().length < 8 || password.length < 8) {
      setError("Please complete all fields. Password needs at least 8 characters.");
      return;
    }
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), password }),
    );
    router.push("/onboarding");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgb(123_79_224/0.12),_transparent_55%),var(--background)] px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-[0_20px_50px_-32px_rgb(41_35_45/0.45)] lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col justify-center px-6 py-8 sm:px-10">
          <div className="mx-auto mb-6 grid size-11 place-items-center rounded-xl border bg-primary-soft text-primary">
            <Sparkles className="size-5" />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary">SMRKOMED</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Create your clinic account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome — start a 14-day trial, then connect WhatsApp and ads.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mx-auto mt-7 w-full max-w-sm space-y-4">
            <IconField
              id="name"
              label="Full name"
              icon={User}
              placeholder="Dr. Ananya Rao"
              value={name}
              onChange={setName}
              required
            />
            <IconField
              id="email"
              label="Email"
              icon={Mail}
              type="email"
              autoComplete="email"
              placeholder="clinic@abcfertility.com"
              value={email}
              onChange={setEmail}
              required
            />
            <IconField
              id="phone"
              label="Phone"
              icon={Phone}
              placeholder="+91 98XXX XXXXX"
              value={phone}
              onChange={setPhone}
              required
            />
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password <span className="text-danger">*</span>
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 pr-10 pl-10"
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">No card required. Payment comes after you set up the clinic.</p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" className="h-10 w-full">
              Continue
            </Button>

            <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              <span className="h-px flex-1 bg-border" />
              OR
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" className="h-10 w-full" asChild>
              <Link href="/login">Explore demo clinic</Link>
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in to your clinic
            </Link>
          </p>
        </div>

        <RegisterShowcase />
      </div>
    </div>
  );
}

function IconField({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  icon: typeof User;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn("h-10 pl-10")}
          required={required}
        />
      </div>
    </div>
  );
}
