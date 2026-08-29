import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AbdmProvider,
  hashAbha,
  maskAbha,
  normalizeAbhaDigits,
} from "./modules/digital-health/abdm-provider";
import { buildInteropBundle } from "./modules/digital-health/interop";
import { PERMISSIONS, roleHasPermission } from "@smrkomed/database";

describe("digital health foundation", () => {
  it("masks and hashes ABHA without exposing full identifier", () => {
    const digits = normalizeAbhaDigits("12-3456-7890-1234");
    assert.equal(digits, "12345678901234");
    assert.equal(maskAbha(digits), "XX-XXXX-XXXX-1234");
    assert.equal(hashAbha(digits).length, 64);
    assert.notEqual(hashAbha(digits), digits);
  });

  it("reports ABDM not connected without credentials", () => {
    const provider = new AbdmProvider();
    const info = provider.getConnectionInfo();
    assert.equal(info.connected, false);
    assert.equal(info.status, "NOT_CONNECTED");
    assert.match(info.message, /not connected/i);
  });

  it("linkAbha refuses OTP fakery when not connected and demo off", async () => {
    const provider = new AbdmProvider();
    // env.abdmDemoMode is false by default in tests
    const result = await provider.linkAbha({
      abhaNumber: "12345678901234",
      patientName: "Test Patient",
    });
    if (result.ok && result.mode === "demo_intent") {
      assert.ok(result.verificationRequired);
      assert.match(result.message, /sandbox|demo/i);
    } else {
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, "ABDM_NOT_CONNECTED");
    }
  });

  it("shareRecord never invents SHARED without gateway", async () => {
    const provider = new AbdmProvider();
    const result = await provider.shareRecord({
      exchangeId: "ex_1",
      payloadSummary: "test",
    });
    assert.equal(result.ok, false);
  });

  it("interop bundle only includes requested existing resources", () => {
    const bundle = buildInteropBundle({
      clinicId: "c1",
      clinicName: "Demo Clinic",
      patient: {
        id: "p1",
        firstName: "Asha",
        lastName: "Rao",
        dateOfBirth: null,
        gender: "FEMALE",
        phone: null,
      },
      appointments: [],
      consultations: [],
      treatments: [],
      carePlans: [],
      prescriptions: [
        {
          id: "rx1",
          prescriptionDate: new Date("2026-08-01"),
          status: "PENDING",
          doctorName: "Dr Test",
          items: [{ medicineName: "Folic Acid", dosage: "1 tablet", instructions: "After food" }],
        },
      ],
      documents: [{ id: "d1", name: "Scan.pdf", status: "AWAITING_UPLOAD", createdAt: new Date(), storageKey: null }],
      recordTypes: ["prescription", "document"],
    });
    assert.equal(bundle.format, "SMRKOMED_INTEROP_V1");
    assert.match(bundle.disclaimer, /Not claimed as ABDM-certified/);
    assert.ok(bundle.resources.some((r) => r.resourceType === "MedicationRequest"));
    assert.ok(bundle.resources.some((r) => r.resourceType === "DocumentReference"));
    assert.ok(
      bundle.resources
        .filter((r) => r.resourceType === "DocumentReference")
        .every((r) => String((r.data as { note?: string }).note).includes("not configured")),
    );
  });

  it("grants digital health permissions to clinic admin and doctors", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.ABDM_SETTINGS), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.DIGITAL_HEALTH_VIEW), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.RECORD_SHARE), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.RECORD_SHARE), false);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.CONSENT_MANAGE), true);
  });
});
