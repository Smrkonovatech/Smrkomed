import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");
loadEnvConfig(repoRoot);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@smrkomed/database"],
  serverExternalPackages: ["@prisma/client"],
  // Vercel production fails while patching preview comments if immutable
  // static uploads are on. 16.3.1 is already latest stable; opt out instead.
  supportsImmutableAssets: false,
  // Prevent next dev from writing AGENTS.md / CLAUDE.md inside apps/web.
  agentRules: false,
} as NextConfig;

export default nextConfig;
