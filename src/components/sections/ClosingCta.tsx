import Image from "next/image";
import { closingCta, company, primaryCta } from "@/content/site";
import { ButtonLink, MaskedLines } from "../ui";

export function ClosingCta() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="closing__media" aria-hidden="true">
        <div className="closing__img" data-parallax="0.12">
          <Image src={closingCta.image} alt="" fill sizes="100vw" />
        </div>
        <div className="closing__shade" />
      </div>
      <div className="container closing__inner">
        <p className="mono" data-reveal="up">
          07 / Next step
        </p>
        <MaskedLines id="closing-title" lines={[closingCta.title]} className="h-display" />
        <p className="closing__body" data-reveal="up">
          {closingCta.body}
        </p>
        <div className="closing__actions" data-reveal="up">
          <ButtonLink href="#contact" tone="light" magnetic>
            {primaryCta}
          </ButtonLink>
          <a className="closing__call" href={company.phoneHref}>
            or call <span>{company.phone}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
