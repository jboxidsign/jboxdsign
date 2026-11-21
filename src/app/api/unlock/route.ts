import { checkPassword, GATE_COOKIE, GATE_PATH, safeNext } from "@/lib/gate";

export const runtime = "nodejs";

// Only wrong guesses count: 10 per address per 10 minutes.
const MAX_FAILS = 10;
const WINDOW_MS = 10 * 60 * 1000;
const fails = new Map<string, number[]>();
const recentFails = (ip: string, now = Date.now()) => (fails.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

/** Handles the unlock form (works without JavaScript). Always answers with a 303 redirect. */
export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let password: FormDataEntryValue | null = null;
  let next: FormDataEntryValue | null = null;
  try {
    const form = await req.formData();
    password = form.get("password");
    next = form.get("next");
  } catch {
    // fall through as a wrong password
  }
  const dest = safeNext(next);
  const back = (error: string) => {
    const u = new URL(GATE_PATH, url);
    u.searchParams.set("error", error);
    if (dest !== "/") u.searchParams.set("next", dest);
    return redirect(u.pathname + u.search);
  };

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (recentFails(ip).length >= MAX_FAILS) return back("limit");

  const token = await checkPassword(password);
  if (!token) {
    if (fails.size > 5000) fails.clear();
    fails.set(ip, [...recentFails(ip), Date.now()]);
    return back("wrong");
  }

  const secure = url.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const res = redirect(dest);
  // Session cookie (no Max-Age): visitors are asked again once they close the browser.
  res.headers.append("Set-Cookie", `${GATE_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`);
  return res;
}

/** Locks the preview again for this browser. */
export async function DELETE(): Promise<Response> {
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", `${GATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res;
}

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });
}
