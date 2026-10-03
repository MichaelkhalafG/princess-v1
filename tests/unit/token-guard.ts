// Finds raw design values outside app/globals.css. It looks at CSS declaration values and
// at JSX/TS code — not at comments — so prose never trips it.

export type Finding = { line: number; text: string; reason: string };

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const PX = /(?<![\w-])-?\d*\.?\d+px\b/;
const COLOR_FN = /\b(rgba?|hsla?)\(/;

/** Blank out comments, keeping line numbers. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
}

/** Raw values in CSS declarations. @media preludes are allowed: CSS cannot use var() there. */
export function scanCss(css: string): Finding[] {
  const out: Finding[] = [];
  stripCssComments(css).split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('@media')) return;
    const colon = line.indexOf(':');
    if (colon < 0 || line.endsWith('{')) return; // selectors
    const value = line.slice(colon + 1);
    for (const [re, reason] of [[HEX, 'raw hex'], [PX, 'raw px'], [COLOR_FN, 'raw colour function']] as const) {
      if (re.test(value)) out.push({ line: i + 1, text: line, reason });
    }
  });
  return out;
}

/** var(--x) references that no token defines — a typo there fails silently in the browser. */
export function undefinedVars(css: string, defined: Set<string>): Finding[] {
  const out: Finding[] = [];
  stripCssComments(css).split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/var\((--[\w-]+)/g)) {
      if (!defined.has(m[1])) out.push({ line: i + 1, text: line.trim(), reason: `undefined token ${m[1]}` });
    }
  });
  return out;
}

export function definedVars(css: string): Set<string> {
  return new Set([...stripCssComments(css).matchAll(/(?:^|[{;])\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]));
}

/** Inline styles and raw values in TSX/TS source (comments removed first). */
export function scanTsx(src: string): Finding[] {
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const out: Finding[] = [];
  code.split('\n').forEach((line, i) => {
    if (/\bstyle=\{/.test(line)) out.push({ line: i + 1, text: line.trim(), reason: 'inline style' });
    if (/['"`][^'"`]*#[0-9a-fA-F]{3,8}\b/.test(line)) out.push({ line: i + 1, text: line.trim(), reason: 'raw hex' });
    if (PX.test(line)) out.push({ line: i + 1, text: line.trim(), reason: 'raw px' });
  });
  return out;
}
