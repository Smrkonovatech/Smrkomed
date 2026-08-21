import type { StaffRole } from "@smrkomed/database";

export const DEMO_PASSWORD = "Demo@12345";

export const DEMO_STAFF = [
  {
    email: "admin@abcfertility.demo",
    name: "Clinic Admin",
    role: "CLINIC_ADMIN" as StaffRole,
  },
  {
    email: "ananya@abcfertility.demo",
    name: "Dr. Ananya Rao",
    role: "DOCTOR" as StaffRole,
  },
  {
    email: "ravi@abcfertility.demo",
    name: "Dr. Rahul Menon",
    role: "DOCTOR" as StaffRole,
  },
  {
    email: "priya@abcfertility.demo",
    name: "Dr. Priya Nair",
    role: "DOCTOR" as StaffRole,
  },
  {
    email: "meera@abcfertility.demo",
    name: "Meera Iyer",
    role: "CARE_COORDINATOR" as StaffRole,
  },
  {
    email: "kavya@abcfertility.demo",
    name: "Kavya Sharma",
    role: "CARE_COORDINATOR" as StaffRole,
  },
  {
    email: "nisha@abcfertility.demo",
    name: "Nisha Fernandes",
    role: "RECEPTIONIST" as StaffRole,
  },
] as const;

export function isDemoLogin(email: string, password: string) {
  return password === DEMO_PASSWORD && DEMO_STAFF.some((person) => person.email === email.toLowerCase());
}

export function authorizeDemoUser(email: string, password: string) {
  if (password !== DEMO_PASSWORD) return null;
  const staff = DEMO_STAFF.find((person) => person.email === email);
  if (!staff) return null;

  return {
    id: `demo:${staff.email}`,
    email: staff.email,
    name: staff.name,
    organizationId: "demo-org",
    organizationName: "ABC Fertility Group",
    clinicId: "demo-clinic",
    clinicName: "ABC Fertility Centre",
    role: staff.role,
  };
}
