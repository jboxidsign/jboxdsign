import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { company, hero } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// Self-hosted (SIL OFL) so builds never depend on reaching Google Fonts.
const display = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "Helvetica Neue", "Arial", "sans-serif"],
});
const body = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-body",
  display: "swap",
  fallback: ["system-ui", "Helvetica Neue", "Arial", "sans-serif"],
});
const mono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "Menlo", "monospace"],
});

const title = "JBOX iDsign LLC | Residential Design, 3D Visualization & Permitting in Fremont, CA";
const description =
  "Thoughtfully designed, personally understood. JBOX iDsign LLC provides as-built plans, 2D & 3D planning and design, permitting support and BIM for homeowners in Fremont, CA.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title,
  description,
  applicationName: company.name,
  keywords: [
    "Fremont residential design",
    "ADU design",
    "home addition plans",
    "kitchen remodel design",
    "bathroom remodel design",
    "permitting support",
    "as-built plans",
    "3D rendering",
    "BIM",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: company.name,
    title: "JBOX iDsign LLC | Thoughtfully Designed. Personally Understood.",
    description,
    images: [{ url: hero.image, width: 2400, height: 1691, alt: hero.imageAlt }],
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title, description, images: [hero.image] },
  robots: { index: true, follow: true },
  icons: { icon: "/icon.svg" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: company.name,
  slogan: "Thoughtfully Designed. Personally Understood.",
  url: siteUrl(),
  telephone: "+1-925-759-6847",
  email: company.email,
  foundingDate: String(company.established),
  image: `${siteUrl()}${hero.image}`,
  address: {
    "@type": "PostalAddress",
    streetAddress: company.address.street,
    addressLocality: company.address.city,
    addressRegion: company.address.region,
    postalCode: company.address.postalCode,
    addressCountry: company.address.country,
  },
  founder: { "@type": "Person", name: company.principal.name, jobTitle: company.principal.role },
  knowsAbout: ["As-Built Plans", "2D & 3D Planning & Design", "Permitting", "BIM", "ADU", "Residential remodeling"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <body>
        <script
          // Marks JS as available before paint so reveal animations never hide content for no-JS visitors.
          dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }}
        />
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
