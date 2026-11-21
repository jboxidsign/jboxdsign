"use client";

import { useEffect, useRef, useState } from "react";
import { company, nav, primaryCta } from "@/content/site";
import { Logo } from "./ui";

/**
 * Fixed black header.
 *  - hides while scrolling down, returns on scroll up
 *  - highlights the section in view with a sliding underline
 *  - full-screen menu on small screens
 */
export function Header() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  // Hide on scroll down / show on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        setScrolled(y > 8);
        if (Math.abs(y - last) > 6) {
          setHidden(y > last && y > 240);
          last = y;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Scroll spy.
  useEffect(() => {
    const ids = nav.map((n) => n.href.slice(1));
    const sections = ids.map((id) => document.getElementById(id)).filter((s): s is HTMLElement => !!s);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.01] },
    );
    sections.forEach((s) => io.observe(s));
    const onTop = () => {
      if (window.scrollY < window.innerHeight * 0.5) setActive("");
    };
    window.addEventListener("scroll", onTop, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onTop);
    };
  }, []);

  // Move the underline to the active link.
  useEffect(() => {
    const list = navRef.current;
    const link = active ? list?.querySelector<HTMLAnchorElement>(`a[href="#${active}"]`) : null;
    if (!list || !link) return setIndicator(null);
    const l = list.getBoundingClientRect();
    const r = link.getBoundingClientRect();
    setIndicator({ left: r.left - l.left, width: r.width });
  }, [active]);

  // Menu: lock scroll, close on Escape, close when resizing to desktop.
  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 900px)");
    const onMq = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className={`site-header${hidden && !open ? " is-hidden" : ""}${scrolled ? " is-scrolled" : ""}${open ? " is-open" : ""}`}>
      <div className="container site-header__bar">
        <a href="#top" className="site-header__brand" aria-label={`${company.name}, back to top`} onClick={close}>
          <Logo />
        </a>

        <nav aria-label="Primary" className="site-header__nav">
          <ul ref={navRef}>
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} aria-current={active === item.href.slice(1) ? "true" : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
            <span
              className="nav-indicator"
              aria-hidden="true"
              style={indicator ? { transform: `translateX(${indicator.left}px)`, width: indicator.width, opacity: 1 } : { opacity: 0 }}
            />
          </ul>
        </nav>

        <div className="site-header__actions">
          <a className="site-header__phone mono-num" href={company.phoneHref}>
            {company.phone}
          </a>
          <a href="#contact" className="btn btn--light btn--sm site-header__cta">
            <span className="btn__label">
              <span className="btn__roll" data-text={primaryCta}>
                {primaryCta}
              </span>
            </span>
          </a>
          <button
            ref={menuButton}
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mobile-menu" inert={!open}>
        <nav aria-label="Mobile">
          <ol>
            {nav.map((item, i) => (
              <li key={item.href} style={{ transitionDelay: `${80 + i * 60}ms` }}>
                <a href={item.href} onClick={close}>
                  <span className="mono">0{i + 1}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mobile-menu__foot">
          <a href={company.phoneHref} className="mono-num">
            {company.phone}
          </a>
          <a href={`mailto:${company.email}`}>{company.email}</a>
        </div>
      </div>
    </header>
  );
}
