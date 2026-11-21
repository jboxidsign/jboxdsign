import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimiter, formatInquiry, LIMITS, validateContact } from "../src/lib/contact";

const VALID = {
  name: "  Jane   Doe ",
  email: " Jane@Example.COM ",
  phone: "(925) 555-0100",
  projectType: "ADU & Home Addition",
  message: "We want to add a backyard ADU for my parents.",
};

const errorsFor = (input: unknown) => {
  const r = validateContact(input);
  return r.ok ? {} : r.errors;
};

describe("validateContact", () => {
  it("accepts a complete inquiry and normalises it", () => {
    const r = validateContact(VALID);
    assert.ok(r.ok);
    assert.deepEqual(r.data, {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "(925) 555-0100",
      projectType: "ADU & Home Addition",
      message: "We want to add a backyard ADU for my parents.",
    });
  });

  it("only requires name, email and message", () => {
    const r = validateContact({ name: "Jo", email: "jo@x.co", message: "Kitchen remodel please" });
    assert.ok(r.ok);
    assert.equal(r.data.phone, "");
    assert.equal(r.data.projectType, "");
  });

  it("reports every missing required field", () => {
    assert.deepEqual(Object.keys(errorsFor({})).sort(), ["email", "message", "name"]);
    assert.deepEqual(Object.keys(errorsFor(null)).sort(), ["email", "message", "name"]);
    assert.deepEqual(Object.keys(errorsFor({ name: "   ", email: " ", message: "\n" })).sort(), ["email", "message", "name"]);
  });

  it("rejects malformed emails", () => {
    for (const email of ["jane", "jane@", "@x.com", "jane@x", "a b@c.com", `${"x".repeat(250)}@x.com`]) {
      assert.ok(errorsFor({ ...VALID, email }).email, email);
    }
  });

  it("rejects malformed phone numbers but allows blank", () => {
    for (const phone of ["abc", "12", "555-CALL-NOW", "1".repeat(16)]) {
      assert.ok(errorsFor({ ...VALID, phone }).phone, phone);
    }
    assert.equal(errorsFor({ ...VALID, phone: "" }).phone, undefined);
    assert.equal(errorsFor({ ...VALID, phone: "+1 925.759.6847" }).phone, undefined);
  });

  it("only accepts project types from the list", () => {
    assert.ok(errorsFor({ ...VALID, projectType: "Swimming pool" }).projectType);
    assert.equal(errorsFor({ ...VALID, projectType: "" }).projectType, undefined);
  });

  it("enforces message and name length", () => {
    assert.ok(errorsFor({ ...VALID, message: "too short" }).message);
    assert.ok(errorsFor({ ...VALID, message: "x".repeat(LIMITS.message + 1) }).message);
    assert.ok(errorsFor({ ...VALID, name: "x".repeat(LIMITS.name + 1) }).name);
  });

  it("ignores non-string values and strips control characters", () => {
    assert.ok(errorsFor({ ...VALID, name: 42 }).name);
    const r = validateContact({ ...VALID, message: "Hello\u0000 there, kitchen!" });
    assert.ok(r.ok);
    assert.equal(r.data.message, "Hello there, kitchen!");
  });
});

describe("formatInquiry", () => {
  it("builds a readable subject and body", () => {
    const r = validateContact(VALID);
    assert.ok(r.ok);
    const { subject, text } = formatInquiry(r.data, new Date("2026-11-13T00:00:00Z"));
    assert.equal(subject, "New project inquiry: ADU & Home Addition from Jane Doe");
    assert.match(text, /Email: jane@example.com/);
    assert.match(text, /Received: 2026-11-13T00:00:00.000Z/);
    assert.ok(text.endsWith(r.data.message));
  });

  it("falls back when optional fields are empty", () => {
    const { subject, text } = formatInquiry({ name: "Jo", email: "jo@x.co", phone: "", projectType: "", message: "Hello there" });
    assert.equal(subject, "New project inquiry: General from Jo");
    assert.match(text, /Phone: Not provided/);
    assert.match(text, /Project type: Not specified/);
  });
});

describe("createRateLimiter", () => {
  it("allows up to the limit per window, per key", () => {
    const allow = createRateLimiter(2, 1000);
    assert.equal(allow("a", 0), true);
    assert.equal(allow("a", 10), true);
    assert.equal(allow("a", 20), false);
    assert.equal(allow("b", 20), true);
    assert.equal(allow("a", 1011), true, "window slides");
  });
});
