import { company, yearsOfExperience } from "@/content/site";
import { CountUp } from "../motion/CountUp";

export function Stats() {
  const years = yearsOfExperience();
  return (
    <section className="stats" id="credibility" aria-label="At a glance">
      <dl className="container stats__grid">
        <div className="stat" data-reveal="up">
          <dt className="mono">Established</dt>
          <dd className="stat__value">
            <CountUp from={2000} to={company.established} duration={1600} />
          </dd>
        </div>
        <div className="stat" data-reveal="up" style={{ transitionDelay: "100ms" }}>
          <dt className="mono">Of experience</dt>
          <dd className="stat__value">
            <CountUp to={years} duration={1200} /> <span className="stat__unit">years</span>
          </dd>
        </div>
        <div className="stat" data-reveal="up" style={{ transitionDelay: "200ms" }}>
          <dt className="mono">Office location</dt>
          <dd className="stat__value">{company.location}</dd>
        </div>
      </dl>
    </section>
  );
}
