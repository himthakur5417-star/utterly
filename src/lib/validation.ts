import { z } from "zod";

export const email = z.string().trim().toLowerCase().email("Enter a valid email");

export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password,
});

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(160),
  email: email.optional(),
  businessType: z.enum(["FREELANCER", "SOLO", "SMALL_BUSINESS", "AGENCY", "SERVICE_PROVIDER", "OTHER"]).default("SOLO"),
  currency: z.string().trim().length(3).default("USD"),
  paymentPreference: z.string().trim().max(80).optional(),
});

const itemSchema = z.object({
  description: z.string().trim().min(1, "Line item description is required").max(500),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Select a client"),
  number: z.string().trim().min(1, "Invoice number is required").max(60),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  subject: z.string().trim().max(200).optional(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  memo: z.string().trim().max(2000).optional(),
  items: z.array(itemSchema).min(1, "Add at least one line item"),
}).refine((d) => d.dueDate.getTime() > d.issueDate.getTime(), {
  message: "Due date must be after the issue date",
  path: ["dueDate"],
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CARD", "BANK_TRANSFER", "CASH", "OTHER"]).default("OTHER"),
  transactionRef: z.string().trim().max(120).optional(),
});

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(200),
  contactName: z.string().trim().max(120).optional(),
  email: email.optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  billingAddress: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().max(30)).max(12).optional(),
});

export const reminderRequestSchema = z.object({
  invoiceId: z.string().min(1),
  tone: z.enum(["POLITE", "PROFESSIONAL", "FRIENDLY", "FIRM"]).optional(),
});

export const aiAskSchema = z.object({
  prompt: z.string().trim().min(2, "Ask a question").max(2000),
});

export const automationSchema = z.object({
  enabled: z.boolean().optional(),
  beforeDueDays: z.coerce.number().int().min(0).max(30).optional(),
  remindOnDue: z.boolean().optional(),
  followUp3: z.boolean().optional(),
  followUp7: z.boolean().optional(),
  followUp15: z.boolean().optional(),
  escalate30: z.boolean().optional(),
  defaultTone: z.enum(["POLITE", "PROFESSIONAL", "FRIENDLY", "FIRM"]).optional(),
});

export const planChangeSchema = z.object({
  tier: z.enum(["STARTER", "PROFESSIONAL", "BUSINESS"]),
});

export const emailSendSchema = z.object({
  reminderId: z.string().min(1).optional(),
  invoiceId: z.string().min(1).optional(),
  to: email.optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
});
