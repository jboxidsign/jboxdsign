import Image from "next/image";
import { hero, primaryCta } from "@/content/site";
import { ArrowLink, ButtonLink } from "../ui";

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__media" aria-hidden="true">
        <div className="hero__img" data-parallax="0.12">
          <Image src={hero.image} alt="" fill priority sizes="100vw" quality={80} />
        </div>
        <div className="hero__shade" />
      </div>

      <div className="container hero__inner">
        <p className="hero__eyebrow mono intro intro--1">
          <span>{hero.eyebrow[0]}</span>
          <span className="hero__eyebrow-rule" />
          <span>{hero.eyebrow[1]}</span>
        </p>

        <h1 id="hero-title" className="hero__title" aria-label={hero.titleLines.join(" ")}>
          {hero.titleLines.map((line, i) => (
            <span className="masked__line" key={line} aria-hidden="true">
              <span className={`intro intro--line`} style={{ animationDelay: `${260 + i * 120}ms` }}>
                {line}
              </span>
            </span>
          ))}
        </h1>

        <p className="hero__body intro intro--3">{hero.body}</p>

        <div className="hero__actions intro intro--4">
          <ButtonLink href="#contact" tone="light" magnetic>
            {primaryCta}
          </ButtonLink>
          <ArrowLink href="#projects" tone="light">
            View Projects
          </ArrowLink>
        </div>
      </div>

      <div className="container hero__foot intro intro--5">
        <span className="mono">01 / Hero</span>
        <a href="#credibility" className="mono hero__scroll">
          Scroll
          <span className="hero__scroll-line" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
