// Every Arabic sentence the app shows comes from the website or @princess/shared, word for word —
// or is in src/drafts.ts, the one place new, unapproved copy lives, or in src/copy.ts, the app's
// own copy once approved. A string typed into a screen that the website does not have fails here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (f === 'node_modules' || f === '.next') return [];
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(f) ? [p] : [];
  });
}
const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const read = (fs: string[]) => fs.map((f) => readFileSync(f, 'utf8')).join('\n');

const APP = files(root('../src/'), /\.tsx?$/).filter((f) => !f.endsWith('drafts.ts') && !f.endsWith('copy.ts'));
// the website's text, with its markup and JSX line breaks flattened, so a sentence split across
// lines or around a <bdi> or <a> still matches; a   escape read as the space it is
const SOURCE = read([
  ...files(root('../../web/app/'), /\.tsx?$/),
  ...files(root('../../web/components/'), /\.tsx?$/),
  ...files(root('../../web/lib/'), /\.tsx?$/),
  ...files(root('../../../packages/shared/src/'), /\.ts$/),
]).replace(/\\u00a0/g, ' ');
const WEB = [
  SOURCE.replace(/\s+/g, ' '),
  SOURCE.replace(/<[^>]*>/g, '').replace(/\{[^{}]*\}/g, ' ').replace(/\s+/g, ' '),
].join('\n');

const ARABIC = /[؀-ۿ]/;

/** The Arabic pieces of a string literal: the parts between ${…} holes and isolate marks, trimmed. */
function pieces(literal: string): string[] {
  return literal
    .split(/\$\{[^}]*\}|[⁦-⁩]/)
    .map((s) => s.replace(/\s+/g, ' ').trim().replace(/^[\s:،.«»—-]+|[\s:،«»—-]+$/g, ''))
    .filter((s) => ARABIC.test(s) && [...s].length > 2);
}

test('every Arabic string in the app is on the website, in drafts.ts or in copy.ts', () => {
  const missing: string[] = [];
  for (const f of APP) {
    const text = readFileSync(f, 'utf8');
    // string literals ('…', "…", `…`) and JSX text (>…<)
    const literals = [
      ...[...text.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]),
      ...[...text.matchAll(/>([^<>{}]+)</g)].map((m) => m[1]),
    ];
    for (const l of literals) for (const p of pieces(l)) if (!WEB.includes(p)) missing.push(`${f.split(/[\\/]src[\\/]/)[1]}: ${p}`);
  }
  assert.deepEqual([...new Set(missing)], []);
});
