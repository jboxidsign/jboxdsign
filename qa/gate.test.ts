import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DELETE, POST } from "../src/app/api/unlock/route";
import { checkPassword, gateEnabled, GATE_COOKIE, safeNext, tokenFor, verifierFor, verifyToken } from "../src/lib/gate";
import { proxy } from "../src/proxy";
import { NextRequest } from "next/server";

// Tests use their own password via env, so the real one never appears in the repo.
const env = { SITE_PASSWORD: "test-preview-pass", SITE_GATE: "on" };

describe("gate helpers", () => {
  it("accepts the configured password and rejects others", async () => {
    assert.ok(await checkPassword("test-preview-pass", env));
    for (const bad of ["", "test-preview-Pass", "test-preview-pass ", undefined, 42, "x".repeat(201)]) {
      assert.equal(await checkPassword(bad, env), null, String(bad));
    }
  });

  it("issues a token that verifies, and nothing else verifies", async () => {
    const token = await tokenFor("test-preview-pass");
    assert.ok(await verifyToken(token, env));
    assert.equal(await verifyToken(undefined, env), false);
    assert.equal(await verifyToken("0".repeat(64), env), false);
    assert.equal(await verifyToken("not-hex", env), false);
  });

  it("supports a precomputed verifier instead of a plain-text password", async () => {
    const v = await verifierFor("another-pass");
    assert.ok(await checkPassword("another-pass", { SITE_PASSWORD_VERIFIER: v }));
    assert.equal(await checkPassword("test-preview-pass", { SITE_PASSWORD_VERIFIER: v }), null);
  });

  it("ships with a default verifier so the gate is never open by accident", async () => {
    assert.equal(await checkPassword("test-preview-pass", {}), null);
    assert.equal(await checkPassword("password", {}), null);
  });

  it("is off unless SITE_GATE=on (the site is public)", () => {
    assert.equal(gateEnabled({}), false, "public by default");
    assert.equal(gateEnabled({ SITE_GATE: "" }), false);
    assert.equal(gateEnabled({ SITE_GATE: "off" }), false);
    assert.equal(gateEnabled({ SITE_GATE: "on" }), true);
    assert.equal(gateEnabled({ SITE_GATE: " ON " }), true);
  });

  it("only redirects to same-site paths after unlocking", () => {
    assert.equal(safeNext("/#contact"), "/#contact");
    assert.equal(safeNext("/sitemap.xml"), "/sitemap.xml");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/unlock", "/api/unlock", null, 5]) {
      assert.equal(safeNext(bad), "/", String(bad));
    }
  });
});

function withEnv<T>(vars: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const old: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    old[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  return fn().finally(() => {
    for (const k of Object.keys(old)) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  });
}

let ip = 0;
const unlock = (fields: Record<string, string>, proto = "http") =>
  POST(
    new Request(`${proto}://test/api/unlock`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": `10.1.0.${++ip}` },
      body: new URLSearchParams(fields).toString(),
    }),
  );

describe("POST /api/unlock", () => {
  it("sets an HttpOnly session cookie and redirects to the requested page", () =>
    withEnv(env, async () => {
      const res = await unlock({ password: "test-preview-pass", next: "/#projects" });
      assert.equal(res.status, 303);
      assert.equal(res.headers.get("location"), "/#projects");
      const cookie = res.headers.get("set-cookie") ?? "";
      assert.match(cookie, new RegExp(`^${GATE_COOKIE}=[0-9a-f]{64}; Path=/; HttpOnly; SameSite=Lax$`));
      assert.doesNotMatch(cookie, /Max-Age|Expires/, "session cookie");
    }));

  it("marks the cookie Secure over https", () =>
    withEnv(env, async () => {
      const res = await unlock({ password: "test-preview-pass" }, "https");
      assert.match(res.headers.get("set-cookie") ?? "", /; Secure/);
    }));

  it("sends a wrong password back to the form with an error and no cookie", () =>
    withEnv(env, async () => {
      const res = await unlock({ password: "nope", next: "/#about" });
      assert.equal(res.status, 303);
      assert.equal(res.headers.get("location"), "/unlock?error=wrong&next=%2F%23about");
      assert.equal(res.headers.get("set-cookie"), null);
    }));

  it("rate limits guessing", () =>
    withEnv(env, async () => {
      const send = () =>
        POST(
          new Request("http://test/api/unlock", {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "198.51.100.7" },
            body: "password=guess",
          }),
        );
      const locations: string[] = [];
      for (let i = 0; i < 11; i++) locations.push((await send()).headers.get("location") ?? "");
      assert.ok(locations.slice(0, 10).every((l) => l.includes("error=wrong")));
      assert.match(locations[10], /error=limit/);
    }));

  it("DELETE clears the cookie", async () => {
    const res = await DELETE();
    assert.match(res.headers.get("set-cookie") ?? "", /Max-Age=0/);
  });
});

describe("proxy", () => {
  const req = (path: string, cookie?: string) => new NextRequest(`http://test${path}`, { headers: cookie ? { cookie } : {} });

  it("redirects visitors without the cookie to /unlock, keeping where they were going", () =>
    withEnv(env, async () => {
      const home = await proxy(req("/"));
      assert.equal(home.status, 307);
      assert.equal(home.headers.get("location"), "http://test/unlock");
      const deep = await proxy(req("/sitemap.xml"));
      assert.equal(deep.headers.get("location"), "http://test/unlock?next=%2Fsitemap.xml");
    }));

  it("answers 401 for APIs without the cookie", () =>
    withEnv(env, async () => {
      const res = await proxy(req("/api/contact"));
      assert.equal(res.status, 401);
    }));

  it("lets visitors with a valid cookie through, marked noindex", () =>
    withEnv(env, async () => {
      const token = await tokenFor("test-preview-pass");
      const res = await proxy(req("/", `${GATE_COOKIE}=${token}`));
      assert.equal(res.headers.get("location"), null);
      assert.equal(res.headers.get("x-middleware-next"), "1");
      assert.equal(res.headers.get("x-robots-tag"), "noindex, nofollow");
      const forged = await proxy(req("/", `${GATE_COOKIE}=${"a".repeat(64)}`));
      assert.equal(forged.status, 307);
    }));

  it("lets everyone in by default: the site is public", () =>
    withEnv({ SITE_GATE: undefined, SITE_PASSWORD: undefined }, async () => {
      for (const path of ["/", "/api/contact", "/sitemap.xml"]) {
        const res = await proxy(req(path));
        assert.equal(res.headers.get("x-middleware-next"), "1", path);
        assert.equal(res.headers.get("location"), null, path);
        assert.equal(res.headers.get("x-robots-tag"), null, `${path} is indexable`);
      }
    }));

  it("does nothing when SITE_GATE=off", () =>
    withEnv({ SITE_GATE: "off" }, async () => {
      const res = await proxy(req("/"));
      assert.equal(res.headers.get("x-middleware-next"), "1");
    }));
});
