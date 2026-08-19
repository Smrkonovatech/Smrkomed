import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const sql = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../prisma/migrations/20260819233000_saas_workspace_columns/migration.sql"),
  "utf8",
);

test("saas workspace migration is additive and does not recreate core tables", () => {
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "phone"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "slug"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "email"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "website"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "Subscription"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "OrganizationModule"/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "StaffInvite"/);
  assert.doesNotMatch(sql, /CREATE TABLE "Organization"/);
  assert.doesNotMatch(sql, /CREATE TABLE "Clinic"/);
  assert.doesNotMatch(sql, /CREATE TABLE "User"/);
  assert.doesNotMatch(sql, /CREATE TABLE "Patient"/);
  assert.doesNotMatch(sql, /CREATE TABLE "Couple"/);
  assert.doesNotMatch(sql, /DROP TABLE/);
  assert.doesNotMatch(sql, /migrate reset/i);
});
