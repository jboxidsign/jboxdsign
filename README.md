# JBOX iDsign LLC: Landing Page

Single-page website for JBOX iDsign LLC (Fremont, CA), built from the approved Figma design
"Design 1: Minimal and Direct". Next.js 16 (App Router), React 19, TypeScript, no UI or animation libraries.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Copy `.env.example` to `.env.local` and fill in values before deploying.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit and API tests (`qa/*.test.ts`, Node test runner via tsx) |
| `npm run qa` | Typecheck + unit tests |
| `npm run qa:e2e` | Builds if needed, starts the server and runs browser checks with Playwright. First time: `npx playwright install chromium` |

## Structure

```
src/
  proxy.ts             optional password gate (off unless SITE_GATE=on)
  app/
    layout.tsx         fonts (self-hosted), metadata, Open Graph, JSON-LD
    page.tsx           section order
    globals.css        design tokens, layout, responsive rules, all motion
    api/contact/       POST endpoint for the inquiry form (Turnstile check, then Resend)
    api/unlock/, unlock/  optional preview password gate (form + endpoint)
    sitemap.ts, robots.ts, icon.svg, not-found.tsx
    fonts/             Manrope, Inter, IBM Plex Mono (SIL OFL)
  components/
    Header.tsx         hide-on-scroll header, scroll-spy underline, mobile menu
    ui.tsx             buttons, arrow links, section heads, masked headings, cube logo
    motion/            MotionRoot (reveals, parallax, progress), CountUp, Magnetic
    sections/          Hero, Stats, Services, Projects, Why, About, ClosingCta, Contact, ContactForm, Footer
  content/site.ts      ALL page copy and contact details: edit content here
  lib/                 contact validation, Resend mailer, Turnstile check, optional preview gate
public/images/         images exported from the Figma file
qa/
  *.test.ts            unit + API tests
  e2e/                 Playwright browser checks and screenshots
```

## Motion

All animation is CSS-driven and switched on by a single client component (`MotionRoot`):

- Hero: staggered line-mask headline, eyebrow rule draws in, image settles from a slight zoom, gentle parallax
- Logo cube strokes draw on load; header slides in, hides on scroll down, returns on scroll up
- Scroll progress hairline at the top of the page
- Nav underline slides to the section in view
- Section rules draw left to right; headings rise from behind a mask; content fades up
- Images reveal with a clip wipe, then zoom slightly on hover
- Stats count up when they enter the viewport
- Buttons: fill sweep plus rolling label; primary CTAs lean slightly toward the cursor
- Form fields: underline grows on focus; project CTAs ("Discuss a kitchen project") preselect the project type
- Animated check mark on successful submit

Everything respects `prefers-reduced-motion`, and content stays visible without JavaScript.

## Optional preview password gate

**The site is public.** The password gate used before launch is now off by default and only switches on when
`SITE_GATE=on` is set (for example, to preview a redesign privately). Without that variable, the proxy lets every
request through, `robots.txt` allows indexing and no `noindex` header is sent.

When it's on: every page, optimized image and API call requires the preview password. Visitors without it are sent
to `/unlock` and get an HttpOnly session cookie after entering it. Wrong guesses are rate limited, `robots.txt`
disallows everything and responses carry `X-Robots-Tag: noindex`. The password itself is not in the repo:
`src/lib/gate.ts` stores only a one-way verifier (PBKDF2-SHA256 then SHA-256).

| Env var | Effect |
| --- | --- |
| `SITE_GATE=on` | Puts the site behind the password (unset = public) |
| `SITE_PASSWORD=...` | Use a different password (set on the host, never commit it) |
| `SITE_PASSWORD_VERIFIER=...` | Or a precomputed verifier: `npx tsx -e 'import {verifierFor} from "./src/lib/gate"; verifierFor("new-password").then(console.log)'` |

## Contact form

Every inquiry goes through these checks in `POST /api/contact`, then is emailed through the
[Resend](https://resend.com) HTTP API (free plan) to **info@jboxidsign.com** (change with `CONTACT_TO_EMAIL`),
one email per submission, with Reply-To set to the visitor:

1. JSON body and size limits, hidden honeypot field, per-IP rate limit (5 per 10 minutes)
2. Field validation (shared with the browser)
3. **Cloudflare Turnstile**: the visitor completes the widget above the submit button; the server confirms the
   token with Cloudflare's `siteverify` API before anything is sent. Tokens are single-use, so the widget
   resets after every attempt. If Cloudflare can't be reached, the form fails closed and shows the phone/email.
4. Email via `POST https://api.resend.com/emails` (plain-text and HTML versions; no SDK, just `fetch`)

Setup: copy `.env.example` to `.env.local` (and set the same variables on your host).

- **Resend (free: 100 emails/day, 3,000/month):** create an API key with sending access and set `RESEND_API_KEY`.
  Resend only delivers to info@jboxidsign.com if **either** the Resend account email is info@jboxidsign.com
  (then the default sender `onboarding@resend.dev` works), **or** `jboxidsign.com` is verified under
  Resend → Domains (recommended) and `CONTACT_FROM_EMAIL` is set to an address on it, for example
  `JBOX iDsign Website <website@jboxidsign.com>`.
- **Turnstile:** create a widget in the Cloudflare dashboard (Turnstile → Add widget), add your domain and
  `localhost`, then set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Rebuild after changing
  the site key. Cloudflare's test keys (in `.env.example`) work on localhost.

Missing configuration never fails silently: in production, no Resend key or no Turnstile secret means the visitor
sees an error with the phone number and email instead of a false "sent". In development, both are skipped and
the inquiry is printed in the terminal.

The e2e suite (`npm run qa:e2e`) uses local stand-ins for Resend and Turnstile, so it never sends real email or
calls Cloudflare. It builds into `.next-e2e/` so your normal build is untouched.

## Content still to be supplied by the client

These are shown as clearly labeled placeholders:

- As-Built Plans image (Polycam scans / existing conditions)
- BIM image (Revit screenshot)
- Short bio for Julius Ken Bacinillo
- Confirmation that jboxdsign@gmail.com is the receiving inbox
- Production domain for `NEXT_PUBLIC_SITE_URL`
