/** Title list for tests — mirrors seed packs without DB. */
export function packTitles(): string[] {
  const smrko = [
    "What is SmrkoMed",
    "Platform overview",
    "Clinic management",
    "Care Loop",
    "WhatsApp communication",
    "Appointments",
    "Documents",
    "AI",
    "Onboarding",
    "Support",
  ];
  const fertility = [
    "Fertility consultation",
    "IVF",
    "IUI",
    "FET",
    "Fertility testing",
    "Semen analysis",
    "Follicular monitoring",
    "Embryo transfer",
    "Appointment preparation",
    "Common patient questions",
  ];
  const hospital = [
    "OPD",
    "Appointments",
    "Registration",
    "Departments",
    "Billing",
    "Pharmacy",
    "Reports",
    "Insurance",
    "Claims",
    "General FAQs",
  ];
  return [...smrko, ...fertility, ...hospital].map((t) => `[DEMO] ${t}`);
}
