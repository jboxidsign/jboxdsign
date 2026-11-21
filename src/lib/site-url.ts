/** Canonical site origin without a trailing slash. Set NEXT_PUBLIC_SITE_URL in production. */
export function siteUrl(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const fallback = "https://www.jboxdsign.com";
  if (!env) return fallback;
  try {
    const u = new URL(env);
    return u.origin;
  } catch {
    return fallback;
  }
}
