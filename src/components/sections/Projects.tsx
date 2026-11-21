import Image from "next/image";
import { projects } from "@/content/site";
import { ArrowLink, MaskedLines, SectionHead } from "../ui";

export function Projects() {
  return (
    <section className="section section--white" id="projects" aria-labelledby="projects-title">
      <div className="container">
        <SectionHead index="04" label="Selected work" aside="Projects" />

        <div className="split-head">
          <MaskedLines id="projects-title" lines={[projects.title]} className="h-section" />
          <p className="lead" data-reveal="up">
            {projects.intro}
          </p>
        </div>

        <ul className="projects">
          {projects.items.map((p, i) => (
            <li key={p.id} className={`project project--${i % 4 === 0 || i % 4 === 3 ? "wide" : "narrow"}`} data-reveal="up" style={{ transitionDelay: `${(i % 2) * 120}ms` }}>
              <article>
                <div className="project__media" data-reveal="clip">
                  <Image src={p.image} alt={p.alt} fill sizes="(max-width: 900px) 100vw, (max-width: 1320px) 58vw, 690px" />
                </div>
                <div className="project__panel">
                  <p className="mono">
                    {String(i + 1).padStart(2, "0")} / {p.tag}
                  </p>
                  <h3 className="h-project">{p.title}</h3>
                  <p className="project__body">{p.body}</p>
                  <ArrowLink href="#contact" tone="light" data-project-type={p.projectType}>
                    {p.cta}
                  </ArrowLink>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
