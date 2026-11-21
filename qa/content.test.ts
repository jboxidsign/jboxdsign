import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { company, nav, projects, projectTypes, services, yearsOfExperience } from "../src/content/site";
import { numberWord } from "../src/lib/format";
import { siteUrl } from "../src/lib/site-url";

const root = path.resolve(import.meta.dirname, "..");

describe("site content", () => {
  it("computes years of experience from the founding year", () => {
    assert.equal(yearsOfExperience(new Date("2026-11-13")), 8);
    assert.equal(yearsOfExperience(new Date("2030-01-01")), 12);
    assert.equal(yearsOfExperience(new Date("2010-01-01")), 0);
  });

  it("spells small numbers", () => {
    assert.equal(numberWord(8), "eight");
    assert.equal(numberWord(21), "21");
  });

  it("every project CTA preselects a real project type", () => {
    for (const p of projects.items) assert.ok((projectTypes as readonly string[]).includes(p.projectType), p.id);
  });

  it("every service is either imaged or clearly marked as a placeholder", () => {
    for (const s of services.items) assert.ok(!!s.image !== !!s.placeholder, s.id);
  });

  it("every referenced image exists in /public", () => {
    const images = [
      company.principal.photo,
      ...projects.items.map((p) => p.image),
      ...services.items.flatMap((s) => (s.image ? [s.image.src] : [])),
      "/images/hero-residence.jpg",
      "/images/cta-facade.jpg",
      "/images/wordmark.png",
      "/images/logo-stacked.png",
    ];
    for (const img of images) assert.ok(fs.existsSync(path.join(root, "public", img)), img);
  });

  it("nav links point at section ids that exist in the components", () => {
    const sources = fs
      .readdirSync(path.join(root, "src/components/sections"))
      .map((f) => fs.readFileSync(path.join(root, "src/components/sections", f), "utf8"))
      .join("\n");
    for (const n of nav) assert.match(sources, new RegExp(`id="${n.href.slice(1)}"`), n.href);
  });

  it("phone link matches the displayed number", () => {
    assert.equal(company.phoneHref.replace(/\D/g, ""), "1" + company.phone.replace(/\D/g, ""));
  });
});

describe("siteUrl", () => {
  it("uses the env origin and falls back safely", () => {
    assert.equal(siteUrl("https://jbox.example/some/path"), "https://jbox.example");
    assert.equal(siteUrl("not a url"), "https://www.jboxdsign.com");
    assert.equal(siteUrl(undefined), "https://www.jboxdsign.com");
  });
});
