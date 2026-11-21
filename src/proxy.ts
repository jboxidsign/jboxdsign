import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, GATE_PATH, gateEnabled, verifyToken } from "@/lib/gate";

/**
 * Optional password gate. When SITE_GATE=on, every page, optimized image and API call needs the
 * preview cookie; without it, pages redirect to /unlock and APIs answer 401.
 * The site is public: this only does anything when SITE_GATE=on is set on the host.
 */
export async function proxy(req: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  if (await verifyToken(req.cookies.get(GATE_COOKIE)?.value)) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    // Keep shared caches/CDNs from storing protected pages and serving them to locked-out visitors.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  }

  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "This preview is password protected." }, { status: 401, headers: { "X-Robots-Tag": "noindex" } });
  }

  const url = req.nextUrl.clone();
  url.pathname = GATE_PATH;
  url.search = pathname === "/" && !search ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  const res = NextResponse.redirect(url, 307);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Everything except the unlock page and its endpoint, build assets, the favicon, robots.txt and the raw
  // files in public/images. Next's image optimizer reads those files with an internal request that carries
  // no cookies, so gating them breaks every photo. The optimizer itself (/_next/image) stays gated.
  matcher: ["/((?!unlock|api/unlock|_next/static|icon\\.svg|robots\\.txt|images/).*)"],
};
