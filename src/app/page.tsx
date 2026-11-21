import { Header } from "@/components/Header";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { About } from "@/components/sections/About";
import { ClosingCta } from "@/components/sections/ClosingCta";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Services } from "@/components/sections/Services";
import { Stats } from "@/components/sections/Stats";
import { Why } from "@/components/sections/Why";

// Re-render daily so "years of experience" and the copyright year stay current.
export const revalidate = 86400;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <MotionRoot />
      <Header />
      <main id="main">
        <Hero />
        <Stats />
        <Services />
        <Projects />
        <Why />
        <About />
        <ClosingCta />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
