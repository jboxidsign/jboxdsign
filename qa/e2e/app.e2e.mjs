// Browser checks for the landing page. Screenshots go to qa/e2e/screenshots/ (git-ignored).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { DUMMY_TOKEN, FAKE_TURNSTILE_SCRIPT } from "../helpers/fakes.mjs";

const shots = path.join(path.dirname(fileURLToPath(import.meta.url)), "screenshots");

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

async function scrollThrough(page) {
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 350) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(1400);
}

export async function run(base, password, { resend, siteverify }) {
  fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const results = [];

  async function test(name, fn) {
    try {
      await fn();
      results.push([true, name]);
      console.log(`  ✓ ${name}`);
    } catch (err) {
      results.push([false, name]);
      console.log(`  ✗ ${name}\n    ${String(err?.message ?? err).split("\n").join("\n    ")}`);
    }
  }

  async function open(viewport = VIEWPORTS.desktop, opts = {}) {
    const ctx = await browser.newContext({ viewport, ...opts });
    // Serve a local stand-in for Cloudflare's Turnstile script (the real one needs internet access).
    await ctx.route("https://challenges.cloudflare.com/turnstile/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: FAKE_TURNSTILE_SCRIPT }),
    );
    // Pass the preview gate; the browser context shares cookies with ctx.request.
    const res = await ctx.request.post(`${base}/api/unlock`, { form: { password }, maxRedirects: 0 });
    assert.equal(res.status(), 303, "unlock");
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(base, { waitUntil: "networkidle" });
    return { ctx, page, errors };
  }

  console.log(`\nE2E against ${base}`);

  await test("preview gate: locked without the password, wrong password rejected, right one unlocks", async () => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/#projects`, { waitUntil: "networkidle" });
    assert.equal(new URL(page.url()).pathname, "/unlock");
    assert.equal(await page.locator("#projects").count(), 0, "site content is not served");
    assert.equal((await ctx.request.get(`${base}/_next/image?url=%2Fimages%2Fhero-residence.jpg&w=640&q=75`, { maxRedirects: 0 })).status(), 307, "optimized images are locked too");
    assert.equal((await ctx.request.post(`${base}/api/contact`, { data: {} })).status(), 401, "API is locked");
    assert.match(await (await ctx.request.get(`${base}/robots.txt`)).text(), /Disallow: \//);
    await page.screenshot({ path: path.join(shots, "gate.png") });

    await page.fill('input[name="password"]', "wrong-password");
    await page.click('.gate__form button[type="submit"]');
    await page.waitForURL(/error=wrong/);
    assert.match(await page.locator(".field__error").innerText(), /isn't right/);
    await page.screenshot({ path: path.join(shots, "gate-error.png") });

    await page.click(".gate__toggle");
    assert.equal(await page.locator('input[name="password"]').getAttribute("type"), "text", "show password");

    await page.fill('input[name="password"]', password);
    await page.click('.gate__form button[type="submit"]');
    await page.waitForSelector("#projects");
    assert.equal(new URL(page.url()).pathname, "/");
    const cookie = (await ctx.cookies()).find((c) => c.name === "jbox_preview");
    assert.ok(cookie?.httpOnly, "HttpOnly cookie");
    assert.equal(cookie.expires, -1, "session cookie, asked again after the browser closes");
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  await test("renders every section with no console errors", async () => {
    const { ctx, page, errors } = await open();
    for (const id of ["top", "credibility", "services", "projects", "why", "about", "contact"]) {
      assert.equal(await page.locator(`#${id}`).count(), 1, `#${id}`);
    }
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.locator("h1").getAttribute("aria-label"), /Thoughtfully Designed\. Personally Understood\./);
    await scrollThrough(page);
    assert.deepEqual(errors, []);
    await ctx.close();
  });

  await test("all images load", async () => {
    const { ctx, page } = await open();
    await scrollThrough(page);
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
    assert.deepEqual(broken, []);
    await ctx.close();
  });

  await test("scroll reveals end up visible", async () => {
    const { ctx, page } = await open();
    await scrollThrough(page);
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((el) => !el.classList.contains("is-in")).length);
    assert.equal(hidden, 0);
    await ctx.close();
  });

  await test("stats count up to their final values", async () => {
    const { ctx, page } = await open();
    await page.locator("#credibility").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);
    const text = await page.locator("#credibility").innerText();
    assert.match(text, /2018/);
    assert.match(text, /\d+\s*years/);
    await ctx.close();
  });

  await test("header hides on scroll down and returns on scroll up; nav highlights the section", async () => {
    const { ctx, page } = await open();
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(700);
    assert.ok(await page.locator(".site-header.is-hidden").count(), "hidden after scrolling down");
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(700);
    assert.equal(await page.locator(".site-header.is-hidden").count(), 0, "visible after scrolling up");
    await page.locator("#projects").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(700);
    assert.equal(await page.locator('.site-header__nav a[aria-current="true"]').innerText(), "Projects");
    await ctx.close();
  });

  await test("project CTA preselects the project type in the form", async () => {
    const { ctx, page } = await open();
    await page.locator('a[data-project-type="ADU & Home Addition"]').click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator('select[name="projectType"]').inputValue(), "ADU & Home Addition");
    await ctx.close();
  });

  await test("form shows errors for empty required fields and focuses the first", async () => {
    const { ctx, page } = await open();
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.locator('form button[type="submit"]').click();
    const errs = await page.locator(".field__error").allInnerTexts();
    assert.equal(errs.filter(Boolean).length, 3);
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("name")), "name");
    await page.screenshot({ path: path.join(shots, "form-errors.png") });
    await ctx.close();
  });

  await test("form needs Cloudflare verification, then emails stadosuyos@gmail.com via Resend", async () => {
    const { ctx, page } = await open();
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.fill('input[name="name"]', "QA Tester");
    await page.fill('input[name="email"]', "qa@example.com");
    await page.selectOption('select[name="projectType"]', "Permitting");
    await page.fill('textarea[name="message"]', "Automated test inquiry, please ignore.");
    const sentBefore = resend.emails.length;

    // Blocked until the Cloudflare verification is done; nothing is emailed.
    await page.locator('form button[type="submit"]').click();
    await page.waitForTimeout(400);
    assert.match(await page.locator(".field--captcha .field__error").innerText(), /complete the verification/);
    assert.equal(resend.emails.length, sentBefore, "no email before verification");
    await page.locator("#contact").screenshot({ path: path.join(shots, "form-captcha-required.png") });

    await page.locator(".fake-turnstile").click();
    await page.locator('form button[type="submit"]').click();
    await page.locator(".form-success").waitFor({ timeout: 10000 });
    assert.match(await page.locator(".form-success").innerText(), /Thank you/);

    // The server checked the token with "Cloudflare" and emailed the inquiry through the Resend API.
    assert.equal(siteverify.calls.at(-1).response, DUMMY_TOKEN);
    assert.equal(resend.emails.length, sentBefore + 1, "exactly one email");
    const mail = resend.emails.at(-1);
    assert.deepEqual(mail.to, ["stadosuyos@gmail.com"]);
    assert.equal(mail.subject, "New project inquiry: Permitting from QA Tester");
    assert.equal(mail.reply_to, "QA Tester <qa@example.com>");
    await page.waitForTimeout(1200);
    await page.locator("#contact").screenshot({ path: path.join(shots, "form-success.png") });
    await ctx.close();
  });

  await test("mobile menu opens, links work, Escape closes it", async () => {
    const { ctx, page } = await open(VIEWPORTS.mobile, { hasTouch: true, isMobile: true });
    const toggle = page.locator(".menu-toggle");
    await toggle.click();
    await page.waitForTimeout(700);
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    await page.screenshot({ path: path.join(shots, "mobile-menu.png") });
    await page.keyboard.press("Escape");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    await toggle.click();
    await page.locator('#mobile-menu a[href="#about"]').click();
    await page.waitForTimeout(1200);
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.ok(await page.evaluate(() => window.scrollY > 1000));
    assert.ok(await page.locator(".action-bar").isVisible(), "fixed action bar on phones");
    await ctx.close();
  });

  await test("no horizontal overflow at any size", async () => {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const { ctx, page } = await open(vp);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.equal(over, 0, name);
      await ctx.close();
    }
  });

  await test("reduced motion shows all content immediately", async () => {
    const { ctx, page } = await open(VIEWPORTS.desktop, { reducedMotion: "reduce" });
    const hidden = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((el) => getComputedStyle(el).opacity === "0").length);
    assert.equal(hidden, 0);
    await ctx.close();
  });

  await test("SEO basics: title, description, canonical, JSON-LD, robots, sitemap", async () => {
    const { ctx, page } = await open();
    assert.match(await page.title(), /JBOX iDsign/);
    assert.ok(await page.locator('meta[name="description"]').getAttribute("content"));
    assert.ok(await page.locator('link[rel="canonical"]').count());
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    assert.equal(ld.telephone, "+1-925-759-6847");
    assert.equal((await page.request.get(`${base}/robots.txt`)).status(), 200);
    const home = await page.request.get(base);
    assert.equal(home.headers()["x-robots-tag"], "noindex, nofollow", "preview is noindex");
    assert.match(home.headers()["cache-control"], /private/, "not stored by shared caches");
    assert.equal((await page.request.get(`${base}/sitemap.xml`)).status(), 200);
    await ctx.close();
  });

  await test("full-page screenshots", async () => {
    for (const [name, vp] of Object.entries(VIEWPORTS)) {
      const { ctx, page } = await open(vp);
      await scrollThrough(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
      await ctx.close();
    }
  });

  await browser.close();
  const failed = results.filter(([ok]) => !ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed. Screenshots: ${shots}\n`);
  return failed ? 1 : 0;
}
