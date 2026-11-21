"use client";

import { useEffect } from "react";

/**
 * One place that drives every scroll-based effect on the page:
 *  - [data-reveal]      gets .is-in once it enters the viewport (CSS does the animation)
 *  - [data-parallax]    translates by its data-parallax speed while visible
 *  - --scroll-progress  on <html>, 0..1, used by the progress hairline
 * A single observer and a single rAF loop keep it cheap. Honors prefers-reduced-motion.
 */
export function MotionRoot() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    let io: IntersectionObserver | undefined;
    if (reduce || !("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      // A fully clipped element never reports as intersecting, so clip reveals watch their parent instead.
      const targets = new Map<Element, HTMLElement[]>();
      for (const el of reveals) {
        const watch = el.dataset.reveal === "clip" && el.parentElement ? el.parentElement : el;
        targets.set(watch, [...(targets.get(watch) ?? []), el]);
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              targets.get(e.target)?.forEach((el) => el.classList.add("is-in"));
              io?.unobserve(e.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      targets.forEach((_, watch) => io!.observe(watch));
    }

    const layers = reduce ? [] : Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const max = root.scrollHeight - vh;
      root.style.setProperty("--scroll-progress", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
      for (const el of layers) {
        const host = el.parentElement ?? el;
        const r = host.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) continue;
        const speed = Number(el.dataset.parallax) || 0.15;
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    root.classList.add("motion-ready");

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
