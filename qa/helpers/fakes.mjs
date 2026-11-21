// Local stand-ins for external services, used by unit and e2e tests so nothing leaves the machine.
import http from "node:http";

/** API key the fake Resend server accepts. */
export const TEST_RESEND_KEY = "re_test_123456789";

/**
 * Fake Resend "send email" endpoint. Mirrors the free plan without a verified domain:
 * it only delivers to `accountEmail`, and answers 403 for any other recipient.
 */
export async function startFakeResend({ accountEmail = "stadosuyos@gmail.com" } = {}) {
  const emails = [];
  let n = 0;
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const send = (status, body) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (req.method !== "POST" || req.url !== "/emails") return send(404, { statusCode: 404, name: "not_found", message: "Not found" });
      if (req.headers.authorization !== `Bearer ${TEST_RESEND_KEY}`) return send(401, { statusCode: 401, name: "validation_error", message: "API key is invalid" });
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return send(422, { statusCode: 422, name: "validation_error", message: "Invalid JSON" });
      }
      const to = [].concat(body.to ?? []);
      if (to.some((t) => t !== accountEmail)) {
        return send(403, { statusCode: 403, name: "validation_error", message: `You can only send testing emails to your own email address (${accountEmail}).` });
      }
      const id = `fake-${++n}`;
      emails.push({ id, ...body });
      send(200, { id });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}/emails`,
    emails,
    close: () => new Promise((r) => server.close(r)),
  };
}

/** Cloudflare's documented dummy token, produced by the test sitekeys. */
export const DUMMY_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
/** Cloudflare's documented "always passes" test secret. */
export const TEST_SECRET = "1x0000000000000000000000000000000AA";

/** Fake Turnstile siteverify endpoint: passes only the dummy token with the test secret. */
export async function startFakeSiteverify() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const p = new URLSearchParams(body);
      const call = { secret: p.get("secret"), response: p.get("response"), remoteip: p.get("remoteip") };
      calls.push(call);
      const ok = call.secret === TEST_SECRET && call.response === DUMMY_TOKEN;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(ok ? { success: true, hostname: "example.com", "error-codes": [] } : { success: false, "error-codes": ["invalid-input-response"] }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return {
    url: `http://127.0.0.1:${server.address().port}/turnstile/v0/siteverify`,
    calls,
    close: () => new Promise((r) => server.close(r)),
  };
}

/** Browser-side stand-in for https://challenges.cloudflare.com/turnstile/v0/api.js (used with page.route). */
export const FAKE_TURNSTILE_SCRIPT = `
window.turnstile = {
  _n: 0, _w: {},
  render(el, opts) {
    const id = "w" + (++this._n);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fake-turnstile";
    btn.textContent = "Verify you are human";
    btn.style.cssText = "height:65px;width:100%;border:1px solid #ccc;background:#fafafa;font:14px sans-serif;cursor:pointer";
    btn.onclick = () => { btn.textContent = "Success!"; opts.callback && opts.callback(${JSON.stringify(DUMMY_TOKEN)}); };
    el.appendChild(btn);
    this._w[id] = { el: btn, opts };
    return id;
  },
  reset(id) { const w = this._w[id]; if (w) w.el.textContent = "Verify you are human"; },
  remove(id) { const w = this._w[id]; if (w) { w.el.remove(); delete this._w[id]; } },
};`;
