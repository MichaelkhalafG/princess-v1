// The design tokens as React Native takes them. globals.css stays the one source (css-tokens.ts is
// generated from it); this file only translates what CSS has and React Native does not:
//   - var(--x) references, resolved here;
//   - clamp(min, Nvw, max) — fluid sizes — computed from the window's width (fluid());
//   - rgb(r g b / a), the space syntax, written out as rgba(r, g, b, a);
//   - "px" units dropped (px()), ratios "4 / 3.3" divided out (ratio()).
// A phone is always under the 860px breakpoint, so its values (CSS_TOKENS_NARROW) win.

import { CSS_TOKENS, CSS_TOKENS_NARROW, type TokenName } from './css-tokens.ts';

const ALL: Record<string, string> = { ...CSS_TOKENS, ...CSS_TOKENS_NARROW };

/** The token's value with every var(--x) replaced, and colours in rgba() form. */
export function raw(name: TokenName | string): string {
  const value = ALL[name];
  if (value === undefined) throw new Error(`no design token --${name}`);
  return normaliseColours(resolveVars(value, new Set([name])));
}

function resolveVars(value: string, seen: Set<string>): string {
  return value.replace(/var\(--([a-z0-9-]+)\)/g, (_, ref: string) => {
    if (seen.has(ref)) throw new Error(`design token --${ref} refers to itself`);
    const v = ALL[ref];
    if (v === undefined) throw new Error(`no design token --${ref}`);
    return resolveVars(v, new Set([...seen, ref]));
  });
}

/** rgb(122 41 72 / .12) → rgba(122, 41, 72, 0.12); rgb(1 2 3) → rgb(1, 2, 3). */
function normaliseColours(value: string): string {
  return value.replace(/rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+%?)\s*)?\)/g, (_, r, g, b, a?: string) => {
    if (a === undefined) return `rgb(${r}, ${g}, ${b})`;
    const alpha = a.endsWith('%') ? Number(a.slice(0, -1)) / 100 : Number(a);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });
}

/** A colour token, as React Native's colour parser takes it. */
export function color(name: TokenName | string): string {
  return raw(name);
}

/** A length in px, as a number ("16px" → 16). Throws for anything that is not one length. */
export function px(name: TokenName | string): number {
  const v = raw(name);
  const m = v.match(/^(-?[\d.]+)px$/);
  if (!m) {
    if (/^-?[\d.]+$/.test(v)) return Number(v); // unitless: z-index, weights
    throw new Error(`design token --${name} is "${v}", not a length in px`);
  }
  return Number(m[1]);
}

/** A unitless number token (a weight, a line height, a duration's ms). */
export function num(name: TokenName | string): number {
  const v = raw(name);
  const m = v.match(/^(-?[\d.]+)(ms)?$/);
  if (!m) throw new Error(`design token --${name} is "${v}", not a number`);
  return Number(m[1]);
}

/**
 * A length that may be fluid: clamp(min, Nvw, max) at this window width, otherwise its px.
 * React Native has no clamp() or vw; the screen's width is what the browser's viewport was.
 */
export function fluid(name: TokenName | string, windowWidth: number): number {
  const v = raw(name);
  const m = v.match(/^clamp\(\s*(-?[\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*(-?[\d.]+)px\s*\)$/);
  if (m) return Math.min(Number(m[3]), Math.max(Number(m[1]), (Number(m[2]) * windowWidth) / 100));
  return px(name);
}

/** An aspect ratio "4 / 3.3" as width ÷ height (React Native's aspectRatio). */
export function ratio(name: TokenName | string): number {
  const m = raw(name).match(/^([\d.]+)\s*\/\s*([\d.]+)$/);
  if (!m) throw new Error(`design token --${name} is not a ratio`);
  return Number(m[1]) / Number(m[2]);
}

/** A box-shadow, resolved, for React Native's boxShadow style (0.76+: several layers, spread, inset). */
export function shadow(name: TokenName | string): string {
  return raw(name);
}

/** An em token as a multiple of the font size (".75em" → 0.75). */
export function em(name: TokenName | string): number {
  const m = raw(name).match(/^(-?[\d.]+)em$/);
  if (!m) throw new Error(`design token --${name} is not in em`);
  return Number(m[1]);
}

/** A padding/margin shorthand token ("22px 16px 20px") as its four sides, the CSS way. */
export function edges(name: TokenName | string): { top: number; right: number; bottom: number; left: number } {
  const parts = raw(name).split(/\s+/).map((v) => {
    const m = v.match(/^(-?[\d.]+)px$/);
    if (!m) throw new Error(`design token --${name} is "${raw(name)}", not lengths in px`);
    return Number(m[1]);
  });
  const [top, right = top, bottom = top, left = right] = parts;
  return { top, right, bottom, left };
}
