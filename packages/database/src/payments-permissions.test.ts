import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PERMISSIONS, roleHasPermission } from "./permissions";

describe("payments permissions", () => {
  it("grants clinic admin full payments access", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PAYMENTS_VIEW), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PAYMENTS_CREATE), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PAYMENTS_LINK), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PAYMENTS_REFUND), true);
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), true);
  });

  it("gives receptionist staff payments without gateway manage", () => {
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_VIEW), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_CREATE), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_LINK), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), false);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_REFUND), false);
  });

  it("limits doctor to view; care coordinator gets staff payments", () => {
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.PAYMENTS_VIEW), true);
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.PAYMENTS_CREATE), false);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.PAYMENTS_CREATE), true);
    assert.equal(roleHasPermission("CARE_COORDINATOR", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), false);
  });
});
