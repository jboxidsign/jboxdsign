export type SentEmail = { id: string; from: string; to: string[]; reply_to?: string; subject: string; text: string; html: string };
export const TEST_RESEND_KEY: string;
export function startFakeResend(opts?: { accountEmail?: string }): Promise<{ url: string; emails: SentEmail[]; close: () => Promise<void> }>;
export const DUMMY_TOKEN: string;
export const TEST_SECRET: string;
export function startFakeSiteverify(): Promise<{
  url: string;
  calls: { secret: string | null; response: string | null; remoteip: string | null }[];
  close: () => Promise<void>;
}>;
export const FAKE_TURNSTILE_SCRIPT: string;
