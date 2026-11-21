import { projectTypes, type ProjectType } from "@/content/site";

export type ContactInput = {
  name: string;
  email: string;
  phone: string;
  projectType: ProjectType | "";
  message: string;
};

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export type ValidationResult =
  | { ok: true; data: ContactInput }
  | { ok: false; errors: FieldErrors };

export const LIMITS = {
  name: 100,
  email: 254,
  phone: 30,
  message: 4000,
  messageMin: 10,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-.\s\d]{7,}$/;

const clean = (v: unknown): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";

/** Validates and normalises a contact form submission. Works on the server and in the browser. */
export function validateContact(raw: unknown): ValidationResult {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data: ContactInput = {
    name: clean(src.name).replace(/\s+/g, " "),
    email: clean(src.email).toLowerCase(),
    phone: clean(src.phone),
    projectType: "",
    message: clean(src.message),
  };
  const errors: FieldErrors = {};

  if (!data.name) errors.name = "Please enter your name.";
  else if (data.name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  if (!data.email) errors.email = "Please enter your email address.";
  else if (data.email.length > LIMITS.email || !EMAIL_RE.test(data.email)) errors.email = "Please enter a valid email address.";

  if (data.phone) {
    const digits = data.phone.replace(/\D/g, "");
    if (data.phone.length > LIMITS.phone || !PHONE_RE.test(data.phone) || digits.length < 7 || digits.length > 15) {
      errors.phone = "Please enter a valid phone number, or leave it blank.";
    }
  }

  const type = clean(src.projectType);
  if (type) {
    if ((projectTypes as readonly string[]).includes(type)) data.projectType = type as ProjectType;
    else errors.projectType = "Please choose a project type from the list.";
  }

  if (!data.message) errors.message = "Please tell us a little about your project.";
  else if (data.message.length < LIMITS.messageMin) errors.message = "Please add a few more details.";
  else if (data.message.length > LIMITS.message) errors.message = `Please keep your message under ${LIMITS.message} characters.`;

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}

/** Plain-text email body for an inquiry. */
export function formatInquiry(d: ContactInput, receivedAt: Date = new Date()): { subject: string; text: string } {
  const subject = `New project inquiry: ${d.projectType || "General"} from ${d.name}`;
  const text = [
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    `Phone: ${d.phone || "Not provided"}`,
    `Project type: ${d.projectType || "Not specified"}`,
    `Received: ${receivedAt.toISOString()}`,
    "",
    d.message,
  ].join("\n");
  return { subject, text };
}

/** Very small in-memory rate limiter (per server instance). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (key: string, now: number = Date.now()): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return true;
  };
}
