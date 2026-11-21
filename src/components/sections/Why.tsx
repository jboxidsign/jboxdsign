import { company, primaryCta, why, yearsOfExperience } from "@/content/site";
import { numberWord } from "@/lib/format";
import { ArrowLink, MaskedLines, SectionHead } from "../ui";

export function Why() {
  const years = yearsOfExperience();
  return (
    <section className="section section--dark" id="why" aria-labelledby="why-title">
      <div className="container">
        <SectionHead index="05" label="Why JBOX" aside="Why choose us" tone="light" />

        <div className="split-head split-head--why">
          <MaskedLines id="why-title" lines={[why.title]} className="h-section" />
          <p className="lead lead--dark" data-reveal="up">
            {why.intro}
          </p>
        </div>

        <ol className="why-grid">
          {why.items.map((item, i) => (
            <li key={item.title} className="why-card" data-reveal="up" style={{ transitionDelay: `${(i % 3) * 110}ms` }}>
              <span className="why-card__num mono">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="h-card">{item.title}</h3>
              <p>{item.body}</p>
            </li>
          ))}
        </ol>

        <div className="why-foot" data-reveal="line">
          <span className="mono">
            {numberWord(years)} years of experience · Established {company.established}
          </span>
          <ArrowLink href="#contact" tone="light">
            {primaryCta}
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
