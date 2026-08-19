"use client";

import { signOut } from "next-auth/react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md space-y-3 rounded-2xl border bg-card p-8 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">SMRKOMED</p>
        <h1 className="text-xl font-semibold">You don't have permission to access this page.</h1>
        <p className="text-sm text-muted-foreground">
          The Admin Portal is restricted to SmrkoMed platform administrators. Organization and clinic
          roles cannot access platform-wide data.
        </p>
        <p className="text-sm text-muted-foreground">
          You are signed in with a clinic or organization account (often from localhost:3000). Sign out
          and use <span className="font-medium text-foreground">platform@smrkomed.demo</span>.
        </p>
        <button
          type="button"
          className="text-sm font-medium text-primary hover:underline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign in with a platform account
        </button>
      </div>
    </div>
  );
}
