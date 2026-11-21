import type { MetadataRoute } from "next";
import { gateEnabled } from "@/lib/gate";
import { siteUrl } from "@/lib/site-url";

// Read SITE_GATE at request time, not build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  // Only while a password-protected preview is switched on (SITE_GATE=on), ask search engines to stay out.
  if (gateEnabled()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
