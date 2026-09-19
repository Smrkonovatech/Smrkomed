/// Mirrors `StaffRole` in `packages/database/prisma/schema.prisma`.
enum StaffRole {
  clinicAdmin('CLINIC_ADMIN'),
  doctor('DOCTOR'),
  careCoordinator('CARE_COORDINATOR'),
  nurse('NURSE'),
  receptionist('RECEPTIONIST'),
  platformAdmin('PLATFORM_ADMIN'),
  organizationAdmin('ORGANIZATION_ADMIN'),
  counselor('COUNSELOR'),
  marketing('MARKETING'),
  readOnly('READ_ONLY'),
  pharmacyManager('PHARMACY_MANAGER'),
  pharmacist('PHARMACIST'),
  pharmacyStaff('PHARMACY_STAFF');

  const StaffRole(this.apiValue);
  final String apiValue;

  static StaffRole? tryParse(String? value) {
    if (value == null) return null;
    for (final role in StaffRole.values) {
      if (role.apiValue == value) return role;
    }
    return null;
  }
}

/// Doctor Mobile App authorization. Product rule: only authorized doctors.
abstract final class DoctorAccessPolicy {
  static const allowedRoles = {StaffRole.doctor};

  static bool isAuthorizedDoctor(StaffRole? role) =>
      role != null && allowedRoles.contains(role);
}
