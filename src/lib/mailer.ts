import type { ContactInput } from "./contact";
import { formatInquiry } from "./contact";

/**
 * Contact-form email delivery through the Resend HTTP API (https://resend.com), free plan.
 *
 * Without a verified domain, Resend's shared sender (onboarding@resend.dev) can only deliver
 * to the email address that owns the Resend account, so sign up with stadosuyos@gmail.com.
 *
 * Env:
 *   RESEND_API_KEY      required to send (server only)
 *   CONTACT_TO_EMAIL    recipient, default stadosuyos@gmail.com
 *   CONTACT_FROM_EMAIL  sender, default "JBOX iDsign Website <onboarding@resend.dev>"
 *   RESEND_API_URL      override the endpoint (used by tests)
 */

export const DEFAULT_RECIPIENT = "stadosuyos@gmail.com";
export const DEFAULT_SENDER = "JBOX iDsign Website <onboarding@resend.dev>";
export const RESEND_API_URL = "https://api.resend.com/emails";

export type DeliveryResult = { delivered: boolean; via: "resend" | "log"; id?: string };

export interface Mailer {
  send(input: ContactInput): Promise<DeliveryResult>;
}

type Env = Record<string, string | undefined>;

export type MailConfig = { apiKey: string; url: string; from: string; to: string };

/** Reads delivery settings from env. Returns null when RESEND_API_KEY is not set. */
export function mailConfig(env: Env = process.env): MailConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    url: env.RESEND_API_URL?.trim() || RESEND_API_URL,
    from: env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_SENDER,
    to: env.CONTACT_TO_EMAIL?.trim() || DEFAULT_RECIPIENT,
  };
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** HTML version of the inquiry email (the plain-text version comes from formatInquiry). */
export function inquiryHtml(d: ContactInput, receivedAt: Date = new Date()): string {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 16px 8px 0;color:#6a6a6a;font:12px/1.4 monospace;text-transform:uppercase;letter-spacing:.08em;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:8px 0;font:15px/1.5 Arial,sans-serif;color:#111">${value}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f2f2f0">
<table role="presentation" style="max-width:600px;margin:0 auto;background:#fff;border-collapse:collapse;width:100%">
<tr><td style="padding:24px 28px;background:#111;color:#fff;font:600 18px/1.3 Arial,sans-serif">New project inquiry</td></tr>
<tr><td style="padding:20px 28px"><table role="presentation" style="border-collapse:collapse">
${row("Name", escapeHtml(d.name))}
${row("Email", `<a href="mailto:${escapeHtml(d.email)}" style="color:#111">${escapeHtml(d.email)}</a>`)}
${row("Phone", d.phone ? escapeHtml(d.phone) : "Not provided")}
${row("Project type", d.projectType ? escapeHtml(d.projectType) : "Not specified")}
${row("Received", escapeHtml(receivedAt.toUTCString()))}
</table>
<div style="margin-top:16px;padding-top:16px;border-top:1px solid #d9d9d5;font:15px/1.6 Arial,sans-serif;color:#111;white-space:pre-wrap">${escapeHtml(d.message)}</div>
<p style="margin:24px 0 0;font:12px/1.5 Arial,sans-serif;color:#6a6a6a">Sent from the contact form on the JBOX iDsign website. Reply to this email to answer ${escapeHtml(d.name)} directly.</p>
</td></tr></table></body></html>`;
}

/** Sends one email per inquiry. Without an API key it logs in development and refuses in production. */
export function createResendMailer(fetchImpl: typeof fetch = fetch): Mailer {
  return {
    async send(input) {
      const cfg = mailConfig();
      const receivedAt = new Date();
      const { subject, text } = formatInquiry(input, receivedAt);
      if (!cfg) {
        // In production, never tell a visitor their message was sent when nobody will receive it.
        if (process.env.NODE_ENV === "production" && process.env.CONTACT_ALLOW_LOG_ONLY !== "1") {
          throw new Error("Email is not configured (RESEND_API_KEY is missing)");
        }
        console.info(`[contact] RESEND_API_KEY not set; would send to ${process.env.CONTACT_TO_EMAIL || DEFAULT_RECIPIENT}\n${subject}\n${text}`);
        return { delivered: false, via: "log" };
      }

      const res = await fetchImpl(cfg.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: cfg.from,
          to: [cfg.to],
          reply_to: `${input.name.replace(/[<>"]/g, "")} <${input.email}>`,
          subject,
          text,
          html: inquiryHtml(input, receivedAt),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; message?: string };
      if (!res.ok || !body.id) {
        // e.g. 403 "You can only send testing emails to your own email address" when the
        // Resend account email doesn't match CONTACT_TO_EMAIL and no domain is verified.
        throw new Error(`Resend responded ${res.status}${body.name ? ` ${body.name}` : ""}${body.message ? `: ${body.message}` : ""}`);
      }
      return { delivered: true, via: "resend", id: body.id };
    },
  };
}

export const defaultMailer = createResendMailer();

let current: Mailer = defaultMailer;
export const getMailer = () => current;
/** Test hook. Pass undefined to restore the default. */
export const setMailer = (m: Mailer | undefined) => {
  current = m ?? defaultMailer;
};
