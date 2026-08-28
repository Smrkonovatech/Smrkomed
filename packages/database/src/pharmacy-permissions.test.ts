import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PERMISSIONS, roleHasPermission } from "./permissions";

describe("pharmacy permissions", () => {
  it("grants clinic admin full pharmacy access", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PHARMACY_VIEW), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PHARMACY_MANAGE), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PHARMACY_SETTINGS), true);
  });

  it("maps pharmacy roles to expected capabilities", () => {
    assert.equal(roleHasPermission("PHARMACY_MANAGER", PERMISSIONS.PHARMACY_PURCHASE), true);
    assert.equal(roleHasPermission("PHARMACY_MANAGER", PERMISSIONS.PHARMACY_REPORTS), true);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.PHARMACY_PRESCRIPTIONS), true);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.PHARMACY_SALES), true);
    assert.equal(roleHasPermission("PHARMACY_STAFF", PERMISSIONS.PHARMACY_SALES), true);
    assert.equal(roleHasPermission("PHARMACY_STAFF", PERMISSIONS.PHARMACY_PURCHASE), false);
  });

  it("gives doctors and coordinators limited pharmacy visibility", () => {
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.PHARMACY_VIEW), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.PHARMACY_PRESCRIPTIONS), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.PHARMACY_VIEW), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.PHARMACY_SALES), false);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PHARMACY_VIEW), false);
  });
});
