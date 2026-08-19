import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a phone number"),
  password: z.string().min(8, "Use at least 8 characters"),
  organizationName: z.string().min(2, "Enter the organization name"),
  clinicName: z.string().min(2, "Enter the clinic name"),
  address: z.string().min(3, "Enter an address"),
  city: z.string().min(2, "Enter a city"),
  clinicPhone: z.string().min(8, "Enter a clinic phone"),
  clinicEmail: z.string().email("Enter a clinic email").or(z.literal("")),
  website: z.string().optional(),
  locations: z
    .array(
      z.object({
        name: z.string().min(2),
        city: z.string().min(2),
      }),
    )
    .min(1),
  invites: z.array(
    z.object({
      name: z.string().min(2),
      role: z.enum(["CLINIC_ADMIN", "DOCTOR", "CARE_COORDINATOR", "NURSE", "RECEPTIONIST"]),
    }),
  ),
  modules: z.array(z.string()).min(1),
  plan: z.enum(["STARTER", "GROWTH", "PRO", "ENTERPRISE"]),
});

export const websiteLeadSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional().or(z.literal("")),
    treatment: z.string().optional(),
    location: z.string().optional(),
    clinicSlug: z.string().min(2),
    utmSource: z.string().max(80).optional(),
    utmMedium: z.string().max(80).optional(),
    utmCampaign: z.string().max(120).optional(),
    utmTerm: z.string().max(80).optional(),
    utmContent: z.string().max(80).optional(),
    landingPage: z.string().max(300).optional(),
    website: z.string().max(0).optional(),
  })
  .strict();
