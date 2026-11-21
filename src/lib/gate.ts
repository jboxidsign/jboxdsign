/**
 * Optional password gate (used for the pre-launch preview). OFF by default: the site is public.
 * Turn it back on for a private preview with SITE_GATE=on.
 *
 * The repo never stores the password. It stores only a verifier:
 *   token    = PBKDF2-SHA256(password, SALT, ITERATIONS)   -> kept in the visitor's cookie
 *   verifier = SHA-256(token)                              -> kept here (or in env)
 * A cookie can't be forged from the repo without recovering the password itself.
 *
 * Configure with env vars (all optional):
 *   SITE_GATE=on              turn the gate on (anything else, or unset, means public)
 *   SITE_PASSWORD=...         use a different password (plain text, set on the host only)
 *   SITE_PASSWORD_VERIFIER=.. or a precomputed verifier (see README)
 *
 * Uses Web Crypto only, so it runs in the proxy, route handlers and tests alike.
 */

export const GATE_COOKIE = "jbox_preview";
export const GATE_PATH = "/unlock";
const SALT = "jboxdsign-preview-gate-v1";
const ITERATIONS = 120_000;

/** Verifier for the current preview password. */
export const DEFAULT_VERIFIER = "4f8ecc2260e6e7faa64db8d5a451647c7e62235c89f5e27afeb7ccdfe66cb161";

type Env = Record<string, string | undefined>;

const enc = new TextEncoder();
const hex = (buf: ArrayBuffer) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

export function gateEnabled(env: Env = process.env): boolean {
  return (env.SITE_GATE ?? "").trim().toLowerCase() === "on";
}

export async function sha256(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

/** The cookie value a correct password produces. */
export async function tokenFor(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(SALT), iterations: ITERATIONS }, key, 256);
  return hex(bits);
}

export async function verifierFor(password: string): Promise<string> {
  return sha256(await tokenFor(password));
}

const cache = new Map<string, Promise<string>>();
async function expectedVerifier(env: Env): Promise<string> {
  if (env.SITE_PASSWORD) {
    let v = cache.get(env.SITE_PASSWORD);
    if (!v) cache.set(env.SITE_PASSWORD, (v = verifierFor(env.SITE_PASSWORD)));
    return v;
  }
  const custom = env.SITE_PASSWORD_VERIFIER?.trim().toLowerCase();
  return custom && /^[0-9a-f]{64}$/.test(custom) ? custom : DEFAULT_VERIFIER;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when a cookie value proves the visitor entered the password. */
export async function verifyToken(token: string | undefined, env: Env = process.env): Promise<boolean> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return false;
  return safeEqual(await sha256(token), await expectedVerifier(env));
}

/** Returns the cookie token for a correct password, or null. */
export async function checkPassword(password: unknown, env: Env = process.env): Promise<string | null> {
  if (typeof password !== "string" || password.length === 0 || password.length > 200) return null;
  const token = await tokenFor(password);
  return (await verifyToken(token, env)) ? token : null;
}

/** Only allow same-site relative paths as a post-unlock destination. */
export function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith(GATE_PATH) || next.startsWith("/api/unlock")) return "/";
  return next.slice(0, 500);
}
