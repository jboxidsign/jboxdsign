import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { ContactInput } from "../src/lib/contact";
import { createResendMailer, DEFAULT_RECIPIENT, DEFAULT_SENDER, inquiryHtml, mailConfig, RESEND_API_URL } from "../src/lib/mailer";
import { startFakeResend, TEST_RESEND_KEY } from "./helpers/fakes.mjs";

const INQUIRY: ContactInput = {
  name: "Jane <b>Doe</b>",
  email: "jane@example.com",
  phone: "925-555-0100",
  projectType: "ADU & Home Addition",
  message: "Backyard ADU for my parents.\nSecond line.",
};

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

describe("mailConfig", () => {
  it("is off without RESEND_API_KEY", () => {
    assert.equal(mailConfig({}), null);
  });
  it("sends to stadosuyos@gmail.com from Resend's shared sender by default", () => {
    assert.deepEqual(mailConfig({ RESEND_API_KEY: "re_x" }), {
      apiKey: "re_x",
      url: RESEND_API_URL,
      from: DEFAULT_SENDER,
      to: "stadosuyos@gmail.com",
    });
    assert.equal(DEFAULT_RECIPIENT, "stadosuyos@gmail.com");
    assert.equal(RESEND_API_URL, "https://api.resend.com/emails");
  });
  it("honours overrides", () => {
    const c = mailConfig({ RESEND_API_KEY: "re_x", CONTACT_TO_EMAIL: "other@x.com", CONTACT_FROM_EMAIL: "Site <hi@jbox.com>" })!;
    assert.equal(c.to, "other@x.com");
    assert.equal(c.from, "Site <hi@jbox.com>");
  });
});

describe("inquiryHtml", () => {
  it("escapes visitor input", () => {
    const html = inquiryHtml(INQUIRY);
    assert.doesNotMatch(html, /<b>Doe<\/b>/);
    assert.match(html, /Jane &lt;b&gt;Doe&lt;\/b&gt;/);
    assert.match(html, /ADU &amp; Home Addition/);
  });
});

describe("Resend mailer", () => {
  let api: Awaited<ReturnType<typeof startFakeResend>>;
  const mailer = createResendMailer();
  before(async () => (api = await startFakeResend()));
  after(() => api.close());
  const env = () => ({ RESEND_API_KEY: TEST_RESEND_KEY, RESEND_API_URL: api.url, CONTACT_TO_EMAIL: undefined, CONTACT_FROM_EMAIL: undefined });

  it("emails the inquiry to stadosuyos@gmail.com with reply-to set to the visitor", () =>
    withEnv(env(), async () => {
      const before = api.emails.length;
      const r = await mailer.send(INQUIRY);
      assert.equal(r.delivered, true);
      assert.equal(r.via, "resend");
      const m = api.emails[before];
      assert.equal(r.id, m.id);
      assert.deepEqual(m.to, ["stadosuyos@gmail.com"]);
      assert.equal(m.from, "JBOX iDsign Website <onboarding@resend.dev>");
      assert.equal(m.reply_to, "Jane bDoe/b <jane@example.com>");
      assert.equal(m.subject, "New project inquiry: ADU & Home Addition from Jane <b>Doe</b>");
      assert.match(m.text, /Backyard ADU for my parents/);
      assert.match(m.html, /New project inquiry/);
    }));

  it("sends every submission, one email each", () =>
    withEnv(env(), async () => {
      const before = api.emails.length;
      await mailer.send(INQUIRY);
      await mailer.send({ ...INQUIRY, name: "Second Person" });
      await mailer.send({ ...INQUIRY, name: "Third Person" });
      assert.equal(api.emails.length, before + 3);
      assert.ok(api.emails.slice(before).every((m) => m.to[0] === "stadosuyos@gmail.com"));
    }));

  it("reports Resend errors (wrong key, recipient not the account owner)", () =>
    withEnv({ ...env(), RESEND_API_KEY: "re_wrong" }, async () => {
      await assert.rejects(mailer.send(INQUIRY), /Resend responded 401/);
    }).then(() =>
      withEnv({ ...env(), CONTACT_TO_EMAIL: "someone-else@example.com" }, async () => {
        await assert.rejects(mailer.send(INQUIRY), /Resend responded 403 .*your own email address/);
      }),
    ));

  it("surfaces network failures", () =>
    withEnv({ ...env(), RESEND_API_URL: "http://127.0.0.1:1/emails" }, async () => {
      await assert.rejects(mailer.send(INQUIRY));
    }));

  it("refuses to pretend in production when no API key is set", () =>
    withEnv({ RESEND_API_KEY: undefined, NODE_ENV: "production", CONTACT_ALLOW_LOG_ONLY: undefined }, async () => {
      await assert.rejects(mailer.send(INQUIRY), /RESEND_API_KEY is missing/);
    }));

  it("only logs in development when no API key is set", () =>
    withEnv({ RESEND_API_KEY: undefined, NODE_ENV: "development" }, async () => {
      const info = console.info;
      console.info = () => {};
      try {
        assert.deepEqual(await mailer.send(INQUIRY), { delivered: false, via: "log" });
      } finally {
        console.info = info;
      }
    }));
});
