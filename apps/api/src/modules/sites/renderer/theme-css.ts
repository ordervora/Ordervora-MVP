import { derivePaletteFromSeed, SCALE_STEPS } from "../../../lib/color";
import type { ThemeCatalogEntry } from "../types";

const RADIUS_PX: Record<ThemeCatalogEntry["tokens"]["radius"], string> = {
  sharp: "2px",
  soft: "8px",
  rounded: "16px",
};

const MOTION_DURATION: Record<ThemeCatalogEntry["tokens"]["motion"], string> = {
  none: "0ms",
  subtle: "150ms",
  energetic: "300ms",
};

/**
 * Compiles theme tokens to CSS custom properties (§1, §13, §14) — every
 * component in components/*.ts reads only these variables, never a
 * hard-coded value, so any theme x any content combination renders
 * correctly. Also emits `prefers-reduced-motion` handling (§17).
 */
export function renderThemeCss(theme: ThemeCatalogEntry, colorSeed: string): string {
  const palette = derivePaletteFromSeed(colorSeed);

  const colorVars = (Object.keys(palette) as (keyof typeof palette)[])
    .flatMap((token) => SCALE_STEPS.map((step) => `--color-${token}-${step}: ${palette[token][step]};`))
    .join("\n  ");

  return `<style>
:root {
  ${colorVars}
  --font-display: "${theme.tokens.typography.display}", serif;
  --font-body: "${theme.tokens.typography.body}", sans-serif;
  --radius: ${RADIUS_PX[theme.tokens.radius]};
  --motion-duration: ${MOTION_DURATION[theme.tokens.motion]};
  --type-scale-ratio: ${theme.tokens.typeScaleRatio};
  --step--1: clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem);
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
  --step-1: clamp(calc(1rem * var(--type-scale-ratio)), 1.2rem + 1vw, calc(1.4rem * var(--type-scale-ratio)));
  --step-2: clamp(calc(1rem * var(--type-scale-ratio) * var(--type-scale-ratio)), 1.6rem + 2vw, calc(2rem * var(--type-scale-ratio) * var(--type-scale-ratio)));
}
@media (prefers-reduced-motion: reduce) {
  :root { --motion-duration: 0ms; }
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-body);
  background: var(--color-surface-50);
  color: var(--color-text-900);
  font-size: var(--step-0);
  line-height: 1.6;
}
h1, h2, h3 { font-family: var(--font-display); line-height: 1.2; }
h1 { font-size: var(--step-2); }
h2 { font-size: var(--step-1); }
main { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
p { max-width: 70ch; }
a { color: var(--color-primary-600); }
button, .cta {
  display: inline-block;
  border-radius: var(--radius);
  background: var(--color-primary-600);
  color: #ffffff;
  padding: 0.75rem 1.5rem;
  text-decoration: none;
  border: none;
  font-size: var(--step-0);
  min-height: 44px;
  min-width: 44px;
}
.mobile-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--color-surface-100);
  border-top: 1px solid var(--color-surface-300);
}
@media (min-width: 768px) {
  .mobile-action-bar { display: none; }
}
img { max-width: 100%; height: auto; }
section { padding: 2rem 0; }
</style>`;
}
