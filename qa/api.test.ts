import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import { POST } from "../src/app/api/contact/route";
import type { ContactInput } from "../src/lib/contact";
import { setMailer } from "../src/lib/mailer";
import { DUMMY_TOKEN, startFakeSiteverify, TEST_SECRET } from "./helpers/fakes.mjs";

let sent: ContactInput[] = [];
let ipCounter = 0;

beforeEach(() => {
  sent = [];
  setMailer({
    async send(input) {
      sent.push(input);
      return { delivered: true, via: "resend" };
    },
  });
});
afterEach(() => setMailer(undefined));

const VALID = { name: "Jane Doe", email: "jane@example.com", message: "Bathroom remodel in Fremont." };

function post(body: unknown, opts: { raw?: boolean; type?: string; ip?: string } = {}) {
  return POST(
    new Request("http://test/api/contact", {
      method: "POST",
      headers: {
        "content-type": opts.type ?? "application/json",
        "x-forwarded-for": opts.ip ?? `10.0.0.${++ipCounter}`,
      },
      body: opts.raw ? (body as string) : JSON.stringify(body),
    }),
  );
}

describe("POST /api/contact", () => {
  it("delivers a valid inquiry", async () => {
    const res = await post({ ...VALID, projectType: "Bathroom Remodeling" });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].projectType, "Bathroom Remodeling");
  });

  it("returns field errors for invalid input and sends nothing", async () => {
    const res = await post({ name: "", email: "nope", message: "" });
    assert.equal(res.status, 422);
    const body = (await res.json()) as { fieldErrors: Record<string, string> };
    assert.deepEqual(Object.keys(body.fieldErrors).sort(), ["email", "message", "name"]);
    assert.equal(sent.length, 0);
  });

  it("rejects bad JSON and wrong content types", async () => {
    assert.equal((await post("{not json", { raw: true })).status, 400);
    assert.equal((await post("[1,2]", { raw: true })).status, 400);
    assert.equal((await post("name=x", { raw: true, type: "application/x-www-form-urlencoded" })).status, 415);
    assert.equal(sent.length, 0);
  });

  it("quietly accepts but drops honeypot submissions", async () => {
    const res = await post({ ...VALID, company: "Spam Inc" });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 0);
  });

  it("rate limits repeated submissions from one address", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await post(VALID, { ip: "203.0.113.9" })).status);
    assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
  });

  it("reports delivery failures without leaking details", async () => {
    setMailer({
      async send() {
        throw new Error("secret provider error");
      },
    });
    const quiet = console.error;
    console.error = () => {};
    try {
      const res = await post(VALID);
      assert.equal(res.status, 502);
      const body = (await res.json()) as { error: string };
      assert.doesNotMatch(body.error, /secret/);
      assert.match(body.error, /925-759-6847/);
    } finally {
      console.error = quiet;
    }
  });
});

describe("POST /api/contact with Cloudflare Turnstile", () => {
  let verify: Awaited<ReturnType<typeof startFakeSiteverify>>;
  before(async () => {
    verify = await startFakeSiteverify();
    process.env.TURNSTILE_SECRET_KEY = TEST_SECRET;
    process.env.TURNSTILE_VERIFY_URL = verify.url;
  });
  after(async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_VERIFY_URL;
    await verify.close();
  });

  it("sends only after Cloudflare confirms the token", async () => {
    const res = await post({ ...VALID, turnstileToken: DUMMY_TOKEN }, { ip: "198.51.100.20" });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 1);
    const call = verify.calls.at(-1)!;
    assert.deepEqual(call, { secret: TEST_SECRET, response: DUMMY_TOKEN, remoteip: "198.51.100.20" });
  });

  it("blocks submissions without a token or with a bad one, and sends nothing", async () => {
    for (const turnstileToken of [undefined, "", "forged-token"]) {
      const res = await post({ ...VALID, turnstileToken });
      assert.equal(res.status, 403, String(turnstileToken));
      assert.equal(((await res.json()) as { verification?: string }).verification, "failed");
    }
    assert.equal(sent.length, 0);
  });

  it("uses Cloudflare's visitor IP header when present", async () => {
    await POST(
      new Request("http://test/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.77", "x-forwarded-for": "10.9.9.9" },
        body: JSON.stringify({ ...VALID, turnstileToken: DUMMY_TOKEN }),
      }),
    );
    assert.equal(verify.calls.at(-1)!.remoteip, "203.0.113.77");
  });

  it("answers 503 (not a silent failure) when Cloudflare can't be reached", async () => {
    process.env.TURNSTILE_VERIFY_URL = "http://127.0.0.1:1/unreachable";
    const quiet = console.error;
    console.error = () => {};
    try {
      const res = await post({ ...VALID, turnstileToken: DUMMY_TOKEN });
      assert.equal(res.status, 503);
      assert.match(((await res.json()) as { error: string }).error, /925-759-6847/);
      assert.equal(sent.length, 0);
    } finally {
      console.error = quiet;
      process.env.TURNSTILE_VERIFY_URL = verify.url;
    }
  });
});
