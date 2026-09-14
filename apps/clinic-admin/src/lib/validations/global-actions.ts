import { z } from "zod";

const required = (label: string) => z.string().trim().min(1, `${label} is required`);
const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20, "Enter a valid phone number");
const email = z.string().trim().email("Enter a valid email address");
const date = (label: string) =>
  required(label).refine(
    (value) => !Number.isNaN(Date.parse(value)),
    `Enter a valid ${label.toLowerCase()}`,
  );

const personSchema = z.object({
  fullName: required("Full name"),
  dob: date("Date of birth").refine(
    (value) => new Date(value) <= new Date(),
    "Date of birth cannot be in the future",
  ),
  phone,
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address",
    }),
  language: required("Language"),
});

const optionalPartnerSchema = z.object({
  fullName: z.string().trim(),
  dob: z.string().trim(),
  phone: z.string().trim(),
  email: z.string().trim(),
  language: z.string().trim(),
});

export const addCoupleSchema = z.object({
  primary: personSchema,
  partner: optionalPartnerSchema.superRefine((partner, ctx) => {
    if (!partner.fullName) return;
    if (!partner.dob) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date of birth is required", path: ["dob"] });
    if (partner.phone.length < 7) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid phone number", path: ["phone"] });
    if (partner.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partner.email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address", path: ["email"] });
    }
  }),
  treatment: z.enum(["IVF", "IUI", "Evaluation", "FET"]),
  doctor: required("Doctor"),
  coordinator: required("Coordinator"),
  whatsappConsent: z.boolean(),
  carePlanTemplate: required("Care plan template"),
});

export const newAppointmentSchema = z.object({
  coupleId: required("Couple"),
  partner: required("Partner"),
  type: required("Appointment type"),
  doctor: required("Doctor"),
  date: date("Date"),
  time: required("Time"),
  duration: z.coerce.number().int().min(10, "Minimum duration is 10 minutes").max(240),
  room: required("Room"),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer"),
  whatsappConfirmation: z.boolean(),
  whatsappReminder: z.boolean(),
  careLoop: z.boolean(),
});

export const startCycleSchema = z.object({
  coupleId: required("Couple"),
  treatment: z.enum(["IVF", "IUI", "FET"]),
  cycleLabel: required("Cycle label"),
  doctor: required("Doctor"),
  coordinator: required("Coordinator"),
  startDate: date("Start date"),
  template: required("Template"),
});

const uploadedFile = z.custom<File>(
  (value) => {
    if (!value || typeof value !== "object") return false;
    const file = value as { name?: unknown; size?: unknown; type?: unknown };
    return (
      typeof file.name === "string" &&
      typeof file.size === "number" &&
      typeof file.type === "string"
    );
  },
  { message: "Choose a file" },
);

export const uploadDocumentSchema = z.object({
  file: uploadedFile
    .refine((file) => file.size <= 10 * 1024 * 1024, "File must be 10 MB or smaller")
    .refine(
      (file) => ["application/pdf", "image/jpeg", "image/png"].includes(file.type),
      "Only PDF, JPG, and PNG files are supported",
    ),
  coupleId: required("Couple"),
  category: required("Category"),
  taskId: z.string().optional(),
  notifyStaff: z.boolean(),
});

export const addEnquirySchema = z.object({
  name: required("Name"),
  partner: required("Partner"),
  phone,
  email,
  source: required("Source"),
  treatment: required("Treatment"),
  counselor: required("Counselor"),
  followUp: date("Follow-up date"),
  notes: z.string().trim().max(1000, "Notes must be 1000 characters or fewer"),
});

export type AddCoupleValues = z.infer<typeof addCoupleSchema>;
export type NewAppointmentValues = z.infer<typeof newAppointmentSchema>;
export type StartCycleValues = z.infer<typeof startCycleSchema>;
export type UploadDocumentValues = z.infer<typeof uploadDocumentSchema>;
export type AddEnquiryValues = z.infer<typeof addEnquirySchema>;
