/**
 * Synthetic system tenant userIds must not be written as AuditLog.actorId.
 * Inbound AI uses clinicTenant.userId = "system-webhook".
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { isSystemTenantUserId, resolveAuditActorId } from "@smrkomed/database";

test("system-webhook resolves to null AuditLog.actorId (fixes AuditLog_actorId_fkey)", () => {
  assert.equal(isSystemTenantUserId("system-webhook"), true);
  const r = resolveAuditActorId("system-webhook");
  assert.equal(r.actorId, null);
  assert.equal(r.systemActor, "system-webhook");
});

test("system-worker and system_webhook also map to null actorId", () => {
  assert.equal(resolveAuditActorId("system-worker").actorId, null);
  assert.equal(resolveAuditActorId("system_webhook").actorId, null);
});

test("real staff userId is preserved for AuditLog.actorId", () => {
  const id = "clxxxxxxxxxxxxxxxxxxxx";
  const r = resolveAuditActorId(id);
  assert.equal(r.actorId, id);
  assert.equal(r.systemActor, null);
});

test("null/undefined actorId stays null", () => {
  assert.equal(resolveAuditActorId(null).actorId, null);
  assert.equal(resolveAuditActorId(undefined).actorId, null);
});
