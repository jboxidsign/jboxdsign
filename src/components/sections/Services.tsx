import { primaryCta, services } from "@/content/site";
import { ArrowLink, MaskedLines, Placeholder, SectionHead } from "../ui";
import { ServiceGallery } from "./ServiceGallery";

export function Services() {
  return (
    <section className="section section--warm" id="services" aria-labelledby="services-title">
      <div className="container">
        <SectionHead index="03" label="What we do" aside="Services" />

        <div className="services">
          <div className="services__intro">
            <div className="services__sticky">
              <MaskedLines id="services-title" lines={[services.title]} className="h-section" />
              <p className="lead" data-reveal="up">
                {services.intro}
              </p>
            </div>
          </div>

          <div className="services__list">
            <ol>
              {services.items.map((s, i) => (
                <li className="service" key={s.id} id={`service-${s.id}`} data-reveal="up">
                  <span className="service__num mono">{String(i + 1).padStart(2, "0")}</span>
                  <div className="service__text">
                    <h3 className="h-item">{s.title}</h3>
                    {s.body.map((p) => (
                      <p key={p.slice(0, 24)}>{p}</p>
                    ))}
                  </div>
                  <div className="service__media">
                    {s.images?.length ? (
                      <ServiceGallery title={s.title} images={s.images} />
                    ) : s.placeholder ? (
                      <Placeholder title={s.placeholder.title} note={s.placeholder.note} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            <div className="services__cta" data-reveal="up">
              <ArrowLink href="#contact">{primaryCta}</ArrowLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
