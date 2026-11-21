// Builds (if needed), starts the production server, runs the browser checks, then stops the server.
// Usage: npm run qa:e2e          (first time: npx playwright install chromium)
//        npm run qa:e2e -- --build   to force a fresh build
//
// Everything external is replaced by local fakes, so no real email is sent and Cloudflare is never called:
//  - a local stand-in for the Resend email API receives the contact-form emails
//  - a local "siteverify" endpoint stands in for Cloudflare Turnstile
//  - the build uses Cloudflare's documented test sitekey, in its own folder (.next-e2e)
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startFakeResend, startFakeSiteverify, TEST_RESEND_KEY, TEST_SECRET } from "../helpers/fakes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = process.env.E2E_PORT || "3456";
const base = `http://localhost:${port}`;
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const distDir = ".next-e2e";
const TEST_SITEKEY = "1x00000000000000000000AA"; // Cloudflare test key: always passes

const buildEnv = { ...process.env, NEXT_DIST_DIR: distDir, NEXT_PUBLIC_TURNSTILE_SITE_KEY: TEST_SITEKEY };
if (!fs.existsSync(path.join(root, distDir, "BUILD_ID")) || process.argv.includes("--build")) {
  console.log("Building…");
  const b = spawnSync(process.execPath, [nextBin, "build"], { cwd: root, stdio: "inherit", env: buildEnv });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const resend = await startFakeResend();
const siteverify = await startFakeSiteverify();

// A throwaway preview password, so the real one never appears in the repo.
const password = "e2e-preview-password";
const server = spawn(process.execPath, [nextBin, "start", "-p", port], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  env: {
    ...buildEnv,
    SITE_GATE: "on", // the live site is public; the e2e suite still checks the optional gate
    SITE_PASSWORD: password,
    RESEND_API_KEY: TEST_RESEND_KEY,
    RESEND_API_URL: resend.url,
    CONTACT_TO_EMAIL: "",
    CONTACT_FROM_EMAIL: "",
    TURNSTILE_SECRET_KEY: TEST_SECRET,
    TURNSTILE_VERIFY_URL: siteverify.url,
  },
});
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${base}/unlock`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start:\n${log}`);
}

let code = 1;
try {
  await waitForServer();
  const { run } = await import("./app.e2e.mjs");
  code = await run(base, password, { resend, siteverify });
} catch (err) {
  console.error(err);
} finally {
  server.kill();
  await resend.close();
  await siteverify.close();
}
if (code) console.log(log.split("\n").slice(-30).join("\n"));
process.exit(code);
