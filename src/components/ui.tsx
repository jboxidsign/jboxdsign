import Image from "next/image";
import { Magnetic } from "./motion/Magnetic";

type Tone = "light" | "dark";

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`arrow-icon ${className}`} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 9.5 9.5 2.5M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** Solid button-style link. `tone="light"` is a white button for dark backgrounds. */
export function ButtonLink({
  href,
  children,
  tone = "dark",
  magnetic = false,
  className = "",
  ...rest
}: { href: string; children: React.ReactNode; tone?: Tone; magnetic?: boolean; className?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const link = (
    <a href={href} className={`btn btn--${tone} ${className}`} {...rest}>
      <span className="btn__label">
        <span className="btn__roll" data-text={typeof children === "string" ? children : undefined}>
          {children}
        </span>
      </span>
    </a>
  );
  return magnetic ? <Magnetic>{link}</Magnetic> : link;
}

/** Underlined text link with the diagonal arrow. */
export function ArrowLink({
  href,
  children,
  tone = "dark",
  className = "",
  ...rest
}: { href: string; children: React.ReactNode; tone?: Tone; className?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} className={`arrow-link arrow-link--${tone} ${className}`} {...rest}>
      <span>{children}</span>
      <ArrowIcon />
    </a>
  );
}

/** "03 / WHAT WE DO ............ SERVICES" header row with a rule that draws in. */
export function SectionHead({ index, label, aside, tone = "dark" }: { index: string; label: string; aside: string; tone?: Tone }) {
  return (
    <div className={`section-head section-head--${tone}`} data-reveal="line">
      <span className="mono">
        {index} / {label}
      </span>
      <span className="mono">{aside}</span>
    </div>
  );
}

/** Line-masked reveal for headings: each line slides up from behind its own mask. */
export function MaskedLines({
  lines,
  as: Tag = "h2",
  className = "",
  delay = 0,
  id,
}: { lines: readonly string[]; as?: "h1" | "h2" | "h3"; className?: string; delay?: number; id?: string }) {
  return (
    <Tag id={id} className={`masked ${className}`} data-reveal="mask" aria-label={lines.join(" ")}>
      {lines.map((line, i) => (
        <span className="masked__line" key={line} aria-hidden="true">
          <span style={{ transitionDelay: `${delay + i * 90}ms` }}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/** The JBOX cube, drawn as SVG so it stays crisp and can animate its strokes. */
export function CubeMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`cube ${className}`} width={size} height={size * 1.1} viewBox="0 0 40 44" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path className="cube__outline" pathLength={1} d="M20 2.5 37.5 12.5v19L20 41.5 2.5 31.5v-19Z" />
        <path className="cube__inner" pathLength={1} d="M2.5 12.5 20 22.5l17.5-10M20 22.5v19" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`logo ${className}`}>
      <CubeMark size={34} />
      <Image src="/images/wordmark.png" alt="JBOX i Dsign LLC" width={1000} height={100} className="logo__word" priority />
    </span>
  );
}

/** Labelled grey box for assets the client still has to supply. */
export function Placeholder({ title, note, className = "" }: { title: string; note: string; className?: string }) {
  return (
    <div className={`placeholder ${className}`} role="img" aria-label={`${title}: ${note.toLowerCase()}`}>
      <span>{title}</span>
      <small>{note}</small>
    </div>
  );
}
