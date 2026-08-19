import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "../..");
loadEnvConfig(repoRoot);

const adminUrl = process.env["ADMIN_APP_URL"] ?? "http://localhost:3001";
process.env["AUTH_URL"] = adminUrl;
process.env["NEXTAUTH_URL"] = adminUrl;
process.env["NEXT_PUBLIC_APP_URL"] = adminUrl;
process.env["NEXT_PUBLIC_API_URL"] ??= process.env["API_URL"] ?? "http://localhost:4000";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: repoRoot,
  transpilePackages: ["@smrkomed/database"],
  serverExternalPackages: ["@prisma/client"],
  agentRules: false,
} as NextConfig;

export default nextConfig;
