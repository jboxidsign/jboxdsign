import Image from "next/image";
import { about, company, primaryCta } from "@/content/site";
import { ArrowLink, ButtonLink, MaskedLines, SectionHead } from "../ui";

export function About() {
  const { principal } = company;
  return (
    <section className="section section--warm" id="about" aria-labelledby="about-title">
      <div className="container">
        <SectionHead index="06" label="About" aside="Company and principal" />

        <div className="about">
          <div className="about__text">
            <MaskedLines id="about-title" lines={about.titleLines} className="h-section" />
            {about.body.map((p, i) => (
              <p key={i} className="about__body" data-reveal="up" style={{ transitionDelay: `${i * 90}ms` }}>
                {p}
              </p>
            ))}
            <div className="about__actions" data-reveal="up">
              <ButtonLink href="#contact" magnetic>
                {primaryCta}
              </ButtonLink>
              <ArrowLink href={company.phoneHref} className="arrow-link--plain">
                Call {company.phone}
              </ArrowLink>
            </div>
          </div>

          <figure className="principal" data-reveal="up">
            <div className="principal__photo" data-reveal="clip">
              <div className="principal__img" data-parallax="0.06">
                <Image src={principal.photo} alt={`Portrait of ${principal.name}`} fill sizes="(max-width: 900px) 100vw, 384px" />
              </div>
            </div>
            <figcaption>
              <span className="principal__name">{principal.name}</span>
              <span className="mono">{principal.role}</span>
              {principal.bio ? <p>{principal.bio}</p> : <span className="principal__placeholder mono">Placeholder: short bio to be supplied by the client</span>}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
