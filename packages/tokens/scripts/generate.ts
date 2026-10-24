// Writes src/css-tokens.ts from the web's globals.css, the approved design's one source of
// tokens. Run it after changing a token there: npm run generate (tests/sync.test.ts fails until
// you do).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseTokens } from '../src/parse.ts';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
export const CSS_PATH = here('../../../apps/web/app/globals.css');
export const OUT_PATH = here('../src/css-tokens.ts');

export function render(css: string): string {
  const { base, overrides } = parseTokens(css);
  const narrow = overrides.find((o) => o.media === '(max-width: 860px)');
  return [
    '// GENERATED from apps/web/app/globals.css by packages/tokens/scripts/generate.ts. Do not edit:',
    '// change the token in globals.css and run `npm run generate` in packages/tokens.',
    '',
    `export const CSS_TOKENS = ${JSON.stringify(base, null, 2)} as const;`,
    '',
    '/** The values globals.css sets under @media (max-width: 860px): every phone. */',
    `export const CSS_TOKENS_NARROW = ${JSON.stringify(narrow?.tokens ?? {}, null, 2)} as const;`,
    '',
    'export type TokenName = keyof typeof CSS_TOKENS;',
    '',
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(OUT_PATH, render(readFileSync(CSS_PATH, 'utf8')));
  console.log(`wrote ${OUT_PATH}`);
}
