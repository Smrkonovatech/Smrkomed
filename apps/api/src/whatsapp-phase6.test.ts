/**
 * Phase 6 — production hardening unit/integration checks
 * (idempotency classifiers, Meta error mapping, media validation, RBAC matrix).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ROLE_PERMISSIONS, PERMISSIONS, roleHasPermission } from "@smrkomed/database";

import { classifyRetry } from "./integrations/core/retry";
import { mapMetaGraphError } from "./integrations/providers/whatsapp/graph";
import {
  sanitizeFilename,
  getExtensionForMime,
} from "./modules/media/storage";
import {
  validateOutboundMediaFile,
  OUTBOUND_MEDIA_MAX_BYTES,
} from "./modules/media/outbound-validation";

test("Phase6 retry: permanent errors are not retryable", () => {
  for (const code of [
    "INVALID_TEMPLATE",
    "TEMPLATE_NOT_APPROVED",
    "INVALID_RECIPIENT",
    "AUTHORIZATION_FAILED",
    "AUTHORIZATION_EXPIRED",
    "WHATSAPP_NOT_CONNECTED",
    "PHONE_NOT_REGISTERED",
  ] as const) {
    const d = classifyRetry({ code });
    assert.equal(d.retryable, false, code);
  }
});

test("Phase6 retry: transient errors are retryable", () => {
  assert.equal(classifyRetry({ code: "PROVIDER_RATE_LIMITED" }).retryable, true);
  assert.equal(classifyRetry({ code: "CONNECTION_FAILED" }).retryable, true);
  assert.equal(classifyRetry({ code: "PROVIDER_UNAVAILABLE" }).retryable, true);
  assert.equal(classifyRetry({ code: "MESSAGE_SEND_FAILED", httpStatus: 503 }).retryable, true);
  assert.equal(classifyRetry({ code: "MESSAGE_SEND_FAILED", httpStatus: 429 }).retryable, true);
});

test("Phase6 retry: MESSAGE_SEND_FAILED 4xx is permanent", () => {
  assert.equal(classifyRetry({ code: "MESSAGE_SEND_FAILED", httpStatus: 422 }).retryable, false);
  assert.equal(classifyRetry({ code: "MESSAGE_SEND_FAILED", httpStatus: 400 }).retryable, false);
});

test("Phase6 Meta graph mapping: permanent recipient/template/auth", () => {
  const invalidPhone = mapMetaGraphError({
    httpStatus: 400,
    code: 131026,
    safeMessage: "Message undeliverable",
  });
  assert.equal(invalidPhone.code, "INVALID_RECIPIENT");
  assert.equal(invalidPhone.retryable, false);

  const badTemplate = mapMetaGraphError({
    httpStatus: 400,
    code: 132000,
    safeMessage: "Template param mismatch",
  });
  assert.equal(badTemplate.code, "INVALID_TEMPLATE");
  assert.equal(badTemplate.retryable, false);

  const auth = mapMetaGraphError({
    httpStatus: 401,
    code: 190,
    safeMessage: "Token expired",
  });
  assert.equal(auth.code, "AUTHORIZATION_EXPIRED");
  assert.equal(auth.retryable, false);

  const perm = mapMetaGraphError({
    httpStatus: 403,
    code: 10,
    safeMessage: "Permission denied",
  });
  assert.equal(perm.code, "AUTHORIZATION_FAILED");
  assert.equal(perm.retryable, false);
});

test("Phase6 Meta graph mapping: rate limit and 5xx are transient", () => {
  const rate = mapMetaGraphError({
    httpStatus: 429,
    code: 80007,
    safeMessage: "Rate limited",
  });
  assert.equal(rate.code, "PROVIDER_RATE_LIMITED");
  assert.equal(rate.retryable, true);

  const outage = mapMetaGraphError({
    httpStatus: 503,
    code: 2,
    safeMessage: "Service unavailable",
  });
  assert.equal(outage.code, "PROVIDER_UNAVAILABLE");
  assert.equal(outage.retryable, true);
});

test("Phase6 Meta graph mapping: never leaks secrets in safe message path", () => {
  const err = mapMetaGraphError({
    httpStatus: 400,
    code: 100,
    safeMessage: "Meta WhatsApp API error [OAuthException code 100]: bad param",
  });
  assert.equal(err.message.includes("access_token"), false);
  assert.equal(err.message.includes("Bearer "), false);
});

test("Phase6 media validation: unsupported MIME and oversized rejected", () => {
  const badMime = validateOutboundMediaFile({
    mimeType: "application/x-msdownload",
    sizeBytes: 100,
    filename: "malware.exe",
  });
  assert.equal(badMime.ok, false);

  const html = validateOutboundMediaFile({
    mimeType: "text/html",
    sizeBytes: 100,
    filename: "x.html",
  });
  assert.equal(html.ok, false);

  const oversized = validateOutboundMediaFile({
    mimeType: "image/jpeg",
    sizeBytes: OUTBOUND_MEDIA_MAX_BYTES.IMAGE + 1,
    filename: "big.jpg",
  });
  assert.equal(oversized.ok, false);

  const ok = validateOutboundMediaFile({
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    filename: "photo.jpg",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.kind, "IMAGE");
});

test("Phase6 media: filename sanitization strips path traversal", () => {
  const sanitized = sanitizeFilename("../../etc/passwd");
  assert.equal(sanitized.includes("/"), false);
  assert.equal(sanitized.includes("\\"), false);
  assert.equal(sanitizeFilename("report\0.pdf"), "report.pdf");
  assert.ok(!sanitizeFilename("a/b\\c:d*.pdf").includes("/"));
  assert.ok(!sanitizeFilename("a/b\\c:d*.pdf").includes("\\"));
  assert.equal(getExtensionForMime("image/jpeg"), ".jpg");
  assert.equal(getExtensionForMime("application/pdf"), ".pdf");
});

test("Phase6 RBAC: WhatsApp role matrix (existing permissions only)", () => {
  assert.ok(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.WHATSAPP_SETTINGS));
  assert.ok(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.WHATSAPP_FLOWS));
  assert.ok(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.WHATSAPP_KB));

  assert.ok(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.WHATSAPP_VIEW));
  assert.ok(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.WHATSAPP_SEND));
  assert.ok(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.WHATSAPP_FLOWS));
  assert.ok(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.WHATSAPP_TEMPLATES));
  assert.ok(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.WHATSAPP_KB));
  assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.WHATSAPP_SETTINGS), false);

  assert.ok(roleHasPermission("DOCTOR", PERMISSIONS.WHATSAPP_VIEW));
  assert.ok(roleHasPermission("DOCTOR", PERMISSIONS.WHATSAPP_SEND));
  assert.ok(roleHasPermission("DOCTOR", PERMISSIONS.WHATSAPP_TEMPLATES));
  assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.WHATSAPP_FLOWS), false);
  assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.WHATSAPP_KB), false);
  assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.WHATSAPP_SETTINGS), false);

  assert.ok(roleHasPermission("RECEPTIONIST", PERMISSIONS.WHATSAPP_VIEW));
  assert.ok(roleHasPermission("RECEPTIONIST", PERMISSIONS.WHATSAPP_SEND));
  assert.ok(roleHasPermission("RECEPTIONIST", PERMISSIONS.WHATSAPP_TEMPLATES));

  assert.ok(roleHasPermission("NURSE", PERMISSIONS.WHATSAPP_VIEW));
  assert.ok(roleHasPermission("NURSE", PERMISSIONS.WHATSAPP_SEND));
  assert.equal(roleHasPermission("NURSE", PERMISSIONS.WHATSAPP_TEMPLATES), false);
  assert.equal(roleHasPermission("NURSE", PERMISSIONS.WHATSAPP_FLOWS), false);

  // Roles without WhatsApp must not get view
  for (const role of ["COUNSELOR", "MARKETING", "PHARMACIST", "READ_ONLY"] as const) {
    if (!(role in ROLE_PERMISSIONS)) continue;
    assert.equal(
      roleHasPermission(role, PERMISSIONS.WHATSAPP_VIEW),
      false,
      `${role} must not have WHATSAPP_VIEW`,
    );
  }
});
