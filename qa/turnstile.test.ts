import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_TOKEN_LENGTH, SITEVERIFY_URL, verifyTurnstile } from "../src/lib/turnstile";

const SECRET = "1x0000000000000000000000000000000AA";

/** Fake fetch that records the request and answers with the given JSON. */
function fakeFetch(answer: unknown, status = 200) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: new URLSearchParams(String(init?.body)) });
    return new Response(JSON.stringify(answer), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { impl, calls };
}

describe("verifyTurnstile", () => {
  it("posts secret, token and visitor IP to Cloudflare and passes on success", async () => {
    const f = fakeFetch({ success: true, "error-codes": [] });
    assert.deepEqual(await verifyTurnstile("tok", "203.0.113.5", { TURNSTILE_SECRET_KEY: SECRET }, f.impl), { ok: true });
    assert.equal(f.calls[0].url, SITEVERIFY_URL);
    assert.equal(f.calls[0].body.get("secret"), SECRET);
    assert.equal(f.calls[0].body.get("response"), "tok");
    assert.equal(f.calls[0].body.get("remoteip"), "203.0.113.5");
  });

  it("rejects tokens Cloudflare refuses (bots, expired or reused tokens)", async () => {
    for (const code of ["invalid-input-response", "timeout-or-duplicate"]) {
      const f = fakeFetch({ success: false, "error-codes": [code] });
      const r = await verifyTurnstile("tok", undefined, { TURNSTILE_SECRET_KEY: SECRET }, f.impl);
      assert.deepEqual(r, { ok: false, reason: "invalid-token", codes: [code] });
    }
  });

  it("rejects missing, empty and oversized tokens without calling Cloudflare", async () => {
    const f = fakeFetch({ success: true });
    for (const t of [undefined, "", 42, "x".repeat(MAX_TOKEN_LENGTH + 1)]) {
      const r = await verifyTurnstile(t, undefined, { TURNSTILE_SECRET_KEY: SECRET }, f.impl);
      assert.equal(r.ok, false, String(t).slice(0, 20));
    }
    assert.equal(f.calls.length, 0);
  });

  it("fails closed when Cloudflare is unreachable or misconfigured", async () => {
    const down = (async () => {
      throw new Error("network");
    }) as typeof fetch;
    assert.deepEqual(await verifyTurnstile("tok", undefined, { TURNSTILE_SECRET_KEY: SECRET }, down), { ok: false, reason: "unavailable" });
    assert.deepEqual(await verifyTurnstile("tok", undefined, { TURNSTILE_SECRET_KEY: SECRET }, fakeFetch({}, 500).impl), { ok: false, reason: "unavailable" });
    const bad = await verifyTurnstile("tok", undefined, { TURNSTILE_SECRET_KEY: "wrong" }, fakeFetch({ success: false, "error-codes": ["invalid-input-secret"] }).impl);
    assert.equal(bad.ok === false && bad.reason, "unavailable");
  });

  it("is skipped in development without a secret, refused in production", async () => {
    assert.deepEqual(await verifyTurnstile(undefined, undefined, { NODE_ENV: "development" }), { ok: true, skipped: true });
    assert.deepEqual(await verifyTurnstile("tok", undefined, { NODE_ENV: "production" }), { ok: false, reason: "not-configured" });
  });

  it("can point at another verify URL (used by the e2e tests)", async () => {
    const f = fakeFetch({ success: true });
    await verifyTurnstile("tok", undefined, { TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_VERIFY_URL: "http://127.0.0.1:9/verify" }, f.impl);
    assert.equal(f.calls[0].url, "http://127.0.0.1:9/verify");
  });
});
