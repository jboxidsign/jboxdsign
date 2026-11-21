import { createRateLimiter, validateContact } from "@/lib/contact";
import { getMailer } from "@/lib/mailer";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";

const allow = createRateLimiter(5, 10 * 60 * 1000);
const json = (body: unknown, status = 200) => Response.json(body, { status });
const FALLBACK = "Please call 925-759-6847 or email jboxdsign@gmail.com.";

/**
 * Contact form endpoint. Order of checks:
 * content type → size → JSON → honeypot → rate limit → field validation → Cloudflare Turnstile → email via the Resend API.
 */
export async function POST(req: Request): Promise<Response> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) return json({ error: "Unsupported content type." }, 415);

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 20_000) return json({ error: "Message is too large." }, 413);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Honeypot: real visitors never see or fill the "company" field.
  if (typeof body.company === "string" && body.company.trim() !== "") return json({ ok: true });

  const ip = req.headers.get("cf-connecting-ip")?.trim() || (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (!allow(ip)) return json({ error: `Too many messages. ${FALLBACK}` }, 429);

  const result = validateContact(body);
  if (!result.ok) return json({ error: "Please check the highlighted fields.", fieldErrors: result.errors }, 422);

  const check = await verifyTurnstile(body.turnstileToken, ip);
  if (!check.ok) {
    if (check.reason === "not-configured" || check.reason === "unavailable") {
      console.error("[contact] Turnstile check could not run:", check.reason, check.codes ?? "");
      return json({ error: `We couldn't verify your message right now. ${FALLBACK}` }, 503);
    }
    return json({ error: "Please complete the verification and try again.", verification: "failed" }, 403);
  }

  try {
    await getMailer().send(result.data);
    return json({ ok: true });
  } catch (err) {
    console.error("[contact] delivery failed", err);
    return json({ error: `We couldn't send your message. ${FALLBACK}` }, 502);
  }
}
