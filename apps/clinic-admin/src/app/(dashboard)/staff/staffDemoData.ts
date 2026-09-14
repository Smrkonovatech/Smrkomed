export type PermissionScope = "View" | "Create" | "Edit" | "Approve" | "Manage" | "None";

export type ModuleAccess = {
  dashboard: PermissionScope;
  patients: PermissionScope;
  appointments: PermissionScope;
  clinicalDiagnostics: PermissionScope;
  careLoop: PermissionScope;
  communication: PermissionScope;
  insurance: PermissionScope;
  pharmacy: PermissionScope;
  reports: PermissionScope;
  staff: PermissionScope;
  billing: PermissionScope;
  smartDischarge: PermissionScope;
  settings: PermissionScope;
  integrations: PermissionScope;
};

export type StaffRolePreset = {
  id: string;
  name: string;
  type: "SYSTEM" | "CUSTOM";
  description: string;
  defaultPermissions: ModuleAccess;
};

export type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  initials: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  primaryBranch: string;
  additionalBranches: string[];
  status: "Active" | "Pending Invitation" | "Suspended" | "Deactivated" | "On Leave";
  accessLevel: "Full Access" | "Limited Access" | "View Only" | "No Access" | "Custom";
  permissions: ModuleAccess;
  employeeId?: string;
  joiningDate?: string;
  lastActive?: string;
};

export type StaffInvitation = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch: string;
  invitedBy: string;
  invitedOn: string;
  status: "Draft" | "Pending" | "Accepted" | "Expired" | "Revoked";
};

export type StaffActivityLog = {
  id: string;
  staffName: string;
  action: string;
  module: string;
  date: string;
  time: string;
  status: "Success" | "Failed" | "Warning";
};

export const STAFF_ROLE_PRESETS: StaffRolePreset[] = [
  {
    id: "role_admin",
    name: "Clinic Administrator",
    type: "SYSTEM",
    description: "Full access to all clinic operations and settings.",
    defaultPermissions: {
      dashboard: "View", patients: "Manage", appointments: "Manage", clinicalDiagnostics: "Manage",
      careLoop: "Manage", communication: "Manage", insurance: "Manage", pharmacy: "Manage",
      reports: "Manage", staff: "Manage", billing: "Manage", smartDischarge: "Manage",
      settings: "Manage", integrations: "Manage"
    }
  },
  {
    id: "role_doctor",
    name: "Physician / Doctor",
    type: "SYSTEM",
    description: "Medical professional with clinical approval capabilities.",
    defaultPermissions: {
      dashboard: "View", patients: "Edit", appointments: "Edit", clinicalDiagnostics: "Approve",
      careLoop: "View", communication: "Edit", insurance: "View", pharmacy: "View",
      reports: "Approve", staff: "None", billing: "View", smartDischarge: "Approve",
      settings: "None", integrations: "None"
    }
  },
  {
    id: "role_care_coord",
    name: "Care Coordinator",
    type: "SYSTEM",
    description: "Coordinates patient care, communication and operational follow-up.",
    defaultPermissions: {
      dashboard: "View", patients: "Edit", appointments: "Edit", clinicalDiagnostics: "View",
      careLoop: "Manage", communication: "Manage", insurance: "View", pharmacy: "None",
      reports: "View", staff: "None", billing: "View", smartDischarge: "View",
      settings: "None", integrations: "None"
    }
  },
  {
    id: "role_lab_tech",
    name: "Lab Technician",
    type: "SYSTEM",
    description: "Processes lab samples and verifies diagnostic results.",
    defaultPermissions: {
      dashboard: "View", patients: "View", appointments: "None", clinicalDiagnostics: "Edit",
      careLoop: "None", communication: "None", insurance: "None", pharmacy: "None",
      reports: "None", staff: "None", billing: "None", smartDischarge: "None",
      settings: "None", integrations: "None"
    }
  },
  {
    id: "role_receptionist",
    name: "Receptionist",
    type: "SYSTEM",
    description: "Manages front desk, appointments and basic billing.",
    defaultPermissions: {
      dashboard: "View", patients: "Create", appointments: "Manage", clinicalDiagnostics: "None",
      careLoop: "View", communication: "Edit", insurance: "None", pharmacy: "None",
      reports: "None", staff: "None", billing: "Create", smartDischarge: "None",
      settings: "None", integrations: "None"
    }
  }
];

export const STAFF_MEMBERS_DEMO: StaffMember[] = [
  {
    id: "staff_1",
    firstName: "Ananya",
    lastName: "Rao",
    displayName: "Dr. Ananya Rao",
    initials: "AR",
    email: "ananya.rao@smrkomed.example.com",
    phone: "+91 9876543210",
    role: "Fertility Specialist",
    department: "Reproductive Medicine",
    primaryBranch: "Bangalore",
    additionalBranches: ["Kochi"],
    status: "Active",
    accessLevel: "Custom",
    employeeId: "EMP-001",
    joiningDate: "12 Jan 2022",
    lastActive: "Today, 10:42 AM",
    permissions: STAFF_ROLE_PRESETS.find(p => p.id === "role_doctor")!.defaultPermissions
  },
  {
    id: "staff_2",
    firstName: "Asha",
    lastName: "Kumar",
    initials: "AK",
    email: "asha.k@smrkomed.example.com",
    phone: "+91 9876543211",
    role: "Lab Technician",
    department: "Clinical Diagnostics",
    primaryBranch: "Bangalore",
    additionalBranches: [],
    status: "Active",
    accessLevel: "Limited Access",
    employeeId: "EMP-042",
    joiningDate: "05 Mar 2024",
    lastActive: "Today, 09:15 AM",
    permissions: STAFF_ROLE_PRESETS.find(p => p.id === "role_lab_tech")!.defaultPermissions
  },
  {
    id: "staff_3",
    firstName: "Meera",
    lastName: "Iyer",
    initials: "MI",
    email: "meera.i@smrkomed.example.com",
    phone: "+91 9876543212",
    role: "Care Coordinator",
    department: "Patient Care",
    primaryBranch: "Bangalore",
    additionalBranches: [],
    status: "Active",
    accessLevel: "Custom",
    employeeId: "EMP-055",
    joiningDate: "10 Jul 2025",
    lastActive: "Today, 11:30 AM",
    permissions: STAFF_ROLE_PRESETS.find(p => p.id === "role_care_coord")!.defaultPermissions
  },
  {
    id: "staff_4",
    firstName: "Rahul",
    lastName: "Menon",
    initials: "RM",
    email: "rahul.m@smrkomed.example.com",
    phone: "+91 9876543213",
    role: "Receptionist",
    department: "Front Desk",
    primaryBranch: "Bangalore",
    additionalBranches: [],
    status: "Active",
    accessLevel: "Limited Access",
    employeeId: "EMP-089",
    joiningDate: "01 Sep 2026",
    lastActive: "Yesterday",
    permissions: STAFF_ROLE_PRESETS.find(p => p.id === "role_receptionist")!.defaultPermissions
  }
];

export const STAFF_INVITATIONS_DEMO: StaffInvitation[] = [
  {
    id: "inv_1",
    name: "Dr. Vikram Singh",
    email: "vikram.s@smrkomed.example.com",
    role: "Embryologist",
    branch: "Bangalore",
    invitedBy: "Admin",
    invitedOn: "12 Sep 2026",
    status: "Pending"
  },
  {
    id: "inv_2",
    name: "Sunita Reddy",
    email: "sunita.r@smrkomed.example.com",
    role: "Pharmacy Staff",
    branch: "Chennai",
    invitedBy: "Admin",
    invitedOn: "10 Sep 2026",
    status: "Expired"
  }
];

export const STAFF_ACTIVITY_DEMO: StaffActivityLog[] = [
  {
    id: "act_1",
    staffName: "Asha Kumar",
    action: "Verified lab result",
    module: "Clinical Diagnostics",
    date: "13 Sep 2026",
    time: "10:42 AM",
    status: "Success"
  },
  {
    id: "act_2",
    staffName: "Meera Iyer",
    action: "Updated patient task",
    module: "Care Loop",
    date: "13 Sep 2026",
    time: "10:51 AM",
    status: "Success"
  },
  {
    id: "act_3",
    staffName: "Admin",
    action: "Changed staff permission for Meera Iyer",
    module: "Staff Management",
    date: "13 Sep 2026",
    time: "11:02 AM",
    status: "Success"
  },
  {
    id: "act_4",
    staffName: "Rahul Menon",
    action: "Failed login attempt",
    module: "Security",
    date: "13 Sep 2026",
    time: "08:15 AM",
    status: "Warning"
  }
];
