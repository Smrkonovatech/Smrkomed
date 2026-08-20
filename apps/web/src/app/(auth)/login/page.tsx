"use client";

import { isDemoLogin } from "@/lib/auth/demo-accounts";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("meera@abcfertility.demo");
  const [password, setPassword] = useState("Demo@12345");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isDemoLogin(email.trim().toLowerCase(), password)) {
        const setup = await fetch("/api/demo/setup", { method: "POST" });
        const setupBody = (await setup.json().catch(() => null)) as
          | { success?: boolean; error?: { message: string } }
          | null;
        if (!setup.ok || setupBody?.success === false) {
          setError(setupBody?.error?.message ?? "Could not create demo accounts. Check the database connection.");
          return;
        }
      }
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password."
            : `Sign-in failed (${result.error}). If this is production, confirm AUTH_SECRET and AUTH_URL match the Vercel site URL.`,
        );
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Could not reach the sign-in service. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgb(91_42_104/0.08),_transparent_55%),hsl(var(--background))] px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-5 shadow-[0_20px_50px_-32px_rgb(41_35_45/0.45)] sm:p-8">
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">SMRKOMED</p>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to your clinic</h1>
          <p className="text-sm text-muted-foreground">
            Care Loop follows every patient step. Your team handles what needs a human.
          </p>
        </div>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          New clinic?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Start free trial
          </Link>
        </p>
        <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Demo accounts (password: Demo@12345)</p>
          <p className="mt-1">First sign-in creates the demo clinic in the database.</p>
          <ul className="mt-2 space-y-1">
            <li>meera@abcfertility.demo — Care Coordinator</li>
            <li>ananya@abcfertility.demo — Doctor</li>
            <li>admin@abcfertility.demo — Clinic Admin</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
