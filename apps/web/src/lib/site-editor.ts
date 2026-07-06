export interface SectionFieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea";
}

/**
 * Editable free-text props per section type, mirroring exactly what each
 * renderer (apps/api/.../renderer/components/*.ts) reads off `section.props`
 * — see e.g. hero.ts's headline/subhead/ctaLabel. Section types with no
 * freeform text of their own (hoursLocation, gallery, menu, contactInfo,
 * contactForm, footer) are intentionally absent: their content is either
 * live restaurant data or has no text prop to edit, so they're still
 * reorderable in the section list but show no field editor.
 */
export const SECTION_FIELD_DEFS: Record<string, SectionFieldDef[]> = {
  hero: [
    { key: "headline", label: "Headline", kind: "text" },
    { key: "subhead", label: "Subheading", kind: "textarea" },
    { key: "ctaLabel", label: "Button label", kind: "text" },
  ],
  signatureDishes: [{ key: "intro", label: "Intro text", kind: "textarea" }],
  aboutTeaser: [{ key: "excerpt", label: "Excerpt", kind: "textarea" }],
  aboutStory: [{ key: "story", label: "Story", kind: "textarea" }],
  ctaBanner: [{ key: "label", label: "Button label", kind: "text" }],
};

export function moveItem<T>(items: readonly T[], index: number, direction: "up" | "down"): T[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return [...items];
  }
  const next = [...items];
  const tmp = next[index]!;
  next[index] = next[targetIndex]!;
  next[targetIndex] = tmp;
  return next;
}
