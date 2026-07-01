import type { SectionBlock, SectionType } from "../types";
import { renderAboutStory, renderAboutTeaser } from "./components/about-teaser";
import { renderContactForm, renderContactInfo } from "./components/contact";
import { renderCtaBanner } from "./components/cta-banner";
import { renderFooter } from "./components/footer";
import { renderGallery } from "./components/gallery";
import { renderHero } from "./components/hero";
import { renderHoursLocation } from "./components/hours-location";
import { renderMenuSection } from "./components/menu-section";
import { renderSignatureDishes } from "./components/signature-dishes";
import type { RenderContext } from "./render-context";

export type SectionRenderer = (section: SectionBlock, ctx: RenderContext) => string;

/**
 * §15 Layout Engine: "Registry maps block type → component." Deliberately
 * has NO entry for "testimonials" — the generator never emits that block
 * (no testimonial data source exists, and none should ever be fabricated,
 * §2 Guardrails), so it's left to fall through the same
 * unknown-block-degrades-gracefully path real future/deprecated block
 * types would use, rather than shipping a component that can never run.
 */
const REGISTRY: Partial<Record<SectionType, SectionRenderer>> = {
  hero: renderHero,
  signatureDishes: renderSignatureDishes,
  aboutTeaser: renderAboutTeaser,
  aboutStory: renderAboutStory,
  hoursLocation: renderHoursLocation,
  gallery: renderGallery,
  ctaBanner: renderCtaBanner,
  menu: renderMenuSection,
  contactInfo: renderContactInfo,
  contactForm: renderContactForm,
  footer: renderFooter,
};

export function getSectionRenderer(type: SectionType): SectionRenderer | undefined {
  return REGISTRY[type];
}

export function registeredSectionTypes(): SectionType[] {
  return Object.keys(REGISTRY) as SectionType[];
}
