import { company, contact } from "@/content/site";
import { MaskedLines, SectionHead } from "../ui";
import { ContactForm } from "./ContactForm";

export function Contact() {
  const { address, principal } = company;
  return (
    <section className="section section--white section--contact" id="contact" aria-labelledby="contact-title">
      <div className="container">
        <SectionHead index="08" label="Contact" aside="Inquiry" />

        <div className="contact">
          <div className="contact__info">
            <MaskedLines id="contact-title" lines={["Let’s Discuss Your", "Project"]} className="h-section" />
            <p className="lead" data-reveal="up">
              {contact.intro}
            </p>
            <dl className="contact__list" data-reveal="up">
              <div>
                <dt className="mono">Phone</dt>
                <dd>
                  <a href={company.phoneHref}>{company.phone}</a>
                </dd>
              </div>
              <div>
                <dt className="mono">Email</dt>
                <dd>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </dd>
              </div>
              <div>
                <dt className="mono">Office</dt>
                <dd>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address.street} ${address.city}, ${address.region} ${address.postalCode}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {address.street}
                    <br />
                    {address.city}, {address.region} {address.postalCode}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="mono">Contact</dt>
                <dd>
                  {principal.name}
                  <small>{principal.role}</small>
                </dd>
              </div>
            </dl>
          </div>

          <div data-reveal="up" style={{ transitionDelay: "120ms" }}>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
