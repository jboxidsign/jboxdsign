import Image from "next/image";
import { company, nav, primaryCta } from "@/content/site";

export function Footer() {
  const { address } = company;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <a href="#top" className="footer__logo" aria-label={`${company.name}, back to top`}>
            <Image src="/images/logo-stacked.png" alt={`${company.name}: ${company.tagline}`} width={1000} height={819} sizes="160px" />
          </a>
          <nav aria-label="Footer">
            <p className="mono">Navigate</p>
            <ul>
              {nav.map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="mono">Contact</p>
            <ul>
              <li>
                <a href={company.phoneHref}>{company.phone}</a>
              </li>
              <li>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </li>
              <li>
                {address.street}
                <br />
                {address.city}, {address.region} {address.postalCode}
              </li>
            </ul>
          </div>
        </div>
        <div className="footer__base mono">
          <span>
            © {new Date().getFullYear()} {company.name}. All rights reserved.
          </span>
          <span>{company.locationLong}</span>
        </div>
      </div>

      {/* Fixed action bar on phones. */}
      <div className="action-bar" role="navigation" aria-label="Quick actions">
        <a href={company.phoneHref} className="action-bar__call">
          Call
        </a>
        <a href="#contact" className="action-bar__cta">
          {primaryCta}
        </a>
      </div>
    </footer>
  );
}
