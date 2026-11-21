/**
 * Cloudflare Turnstile: the bot/spam check the contact form must pass before an email is sent.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * Env:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  public key used by the widget in the browser
 *   TURNSTILE_SECRET_KEY            secret key used here, on the server only
 */

export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const MAX_TOKEN_LENGTH = 2048;

type Env = Record<string, string | undefined>;

export type TurnstileResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: "missing-token" | "invalid-token" | "not-configured" | "unavailable"; codes?: string[] };

/**
 * Verifies a widget token with Cloudflare. Fails closed: anything other than an explicit
 * success from Cloudflare (including network errors) is a failure.
 * Without a secret key the check is skipped in development and refused in production.
 */
export async function verifyTurnstile(
  token: unknown,
  remoteip: string | undefined,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (env.NODE_ENV === "production") return { ok: false, reason: "not-configured" };
    return { ok: true, skipped: true };
  }
  if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "missing-token" };
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "invalid-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip && remoteip !== "local") body.set("remoteip", remoteip);

  try {
    const res = await fetchImpl(env.TURNSTILE_VERIFY_URL || SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, reason: "unavailable" };
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success === true) return { ok: true };
    const codes = data["error-codes"] ?? [];
    if (codes.some((c) => c.includes("secret") || c === "internal-error" || c === "bad-request")) return { ok: false, reason: "unavailable", codes };
    return { ok: false, reason: "invalid-token", codes };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
