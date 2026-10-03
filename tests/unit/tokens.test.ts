import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { definedVars, scanCss, scanTsx, undefinedVars } from './token-guard.ts';

const root = join(import.meta.dirname, '../..');
const TOKENS = join(root, 'app/globals.css');

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
}

const sources = ['app', 'components'].flatMap((d) => walk(join(root, d)));
const cssFiles = sources.filter((f) => f.endsWith('.css') && f !== TOKENS);
const codeFiles = sources.filter((f) => /\.tsx?$/.test(f));
// next/font sets these two on <html> at runtime (app/fonts.ts)
const defined = new Set([...definedVars(readFileSync(TOKENS, 'utf8')), '--font-heading', '--font-body']);

test('the guard itself catches what it must (and ignores comments)', () => {
  assert.equal(scanCss('.a {\n  color: #fff;\n}').length, 1);
  assert.equal(scanCss('.a {\n  padding: 0 13px;\n}').length, 1);
  assert.equal(scanCss('.a {\n  box-shadow: 0 0 0 4px rgba(0,0,0,.1);\n}').length, 2); // px + colour fn
  assert.equal(scanCss('/* 13px #fff */\n.a {\n  color: var(--color-ink);\n}').length, 0);
  assert.equal(scanCss('@media (max-width: 860px) {').length, 0);
  assert.equal(undefinedVars('.a { color: var(--colour-ink); }', new Set(['--color-ink'])).length, 1);
  assert.equal(scanTsx('<div style={{ color: "red" }} />').length, 1);
  assert.equal(scanTsx('const c = "#FF4D8D";').length, 1);
  assert.equal(scanTsx('// width 15px\nconst x = 1;').length, 0);
});

test('the scan covers every component stylesheet and component', () => {
  assert.ok(cssFiles.length >= 10, `only ${cssFiles.length} css files found`);
  assert.ok(codeFiles.length >= 10, `only ${codeFiles.length} code files found`);
});

test('no raw hex, px or colour values outside app/globals.css', () => {
  const findings = [
    ...cssFiles.flatMap((f) => scanCss(readFileSync(f, 'utf8')).map((x) => ({ f, ...x }))),
    ...codeFiles.flatMap((f) => scanTsx(readFileSync(f, 'utf8')).map((x) => ({ f, ...x }))),
  ];
  assert.deepEqual(findings.map((x) => `${relative(root, x.f)}:${x.line} ${x.reason}: ${x.text}`), []);
});

test('every var(--token) used is defined in app/globals.css', () => {
  // a stylesheet may also use custom properties it defines itself (e.g. a mark's width)
  const findings = [TOKENS, ...cssFiles].flatMap((f) => {
    const css = readFileSync(f, 'utf8');
    const known = new Set([...defined, ...definedVars(css)]);
    return undefinedVars(css, known).map((x) => `${relative(root, f)}:${x.line} ${x.reason}`);
  });
  assert.deepEqual(findings, []);
});
