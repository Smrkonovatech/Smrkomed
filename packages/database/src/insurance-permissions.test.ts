import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PERMISSIONS, roleHasPermission } from "./permissions";

describe("insurance permissions", () => {
  it("grants clinic admin full insurance access", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.INSURANCE_VIEW), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.INSURANCE_APPROVE), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.INSURANCE_SETTINGS), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.INSURANCE_FINANCIALS), true);
  });

  it("gives care coordinators workflow access without approve/settings", () => {
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.INSURANCE_VIEW), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.INSURANCE_CLAIMS_CREATE), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.INSURANCE_QUERIES), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.INSURANCE_PREAUTH), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.INSURANCE_APPROVE), false);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.INSURANCE_SETTINGS), false);
  });

  it("limits doctor and receptionist; denies pharmacy roles by default", () => {
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.INSURANCE_VIEW), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.INSURANCE_CLAIMS_VIEW), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.INSURANCE_CLAIMS_CREATE), false);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.INSURANCE_VIEW), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.INSURANCE_CLAIMS_CREATE), false);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.INSURANCE_VIEW), false);
    assert.equal(roleHasPermission("PHARMACY_STAFF", PERMISSIONS.INSURANCE_VIEW), false);
  });
});
