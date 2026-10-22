// Assembles the web app into one folder that reaches nothing outside itself, for the deploy
// branch: apps/web at the top (without its tests), the shared package copied inside it at
// vendor/shared, and the one dependency on that package pointed at the copy. Only files git
// tracks are copied, so nothing ignored (.env files, mockups, backups) can ship.
//
// Usage: node .github/scripts/assemble-deploy.mjs <repository root> <output folder, must not exist>

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [root, out] = process.argv.slice(2);
if (!root || !out) throw new Error('usage: node assemble-deploy.mjs <repository root> <output folder>');
if (existsSync(out)) throw new Error(`${out} exists already`);

// Where each tracked file goes. Tests stay behind: the host only builds.
function destination(file) {
  if (file.startsWith('apps/web/tests/') || file.startsWith('packages/shared/tests/')) return null;
  if (file.startsWith('apps/web/')) return file.slice('apps/web/'.length);
  if (file.startsWith('packages/shared/')) return `vendor/shared/${file.slice('packages/shared/'.length)}`;
  return null;
}

const tracked = execFileSync('git', ['-C', root, 'ls-files', '-z', '--', 'apps/web', 'packages/shared'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
let copied = 0;
for (const file of tracked) {
  const to = destination(file);
  if (!to) continue;
  mkdirSync(dirname(join(out, to)), { recursive: true });
  cpSync(join(root, file), join(out, to));
  copied++;
}

// Replaces `from` with `to` after checking it occurs exactly `times` times, so a lockfile of
// a shape this script does not know stops the run instead of shipping a half-pointed folder.
function replaceExactly(file, from, to, times) {
  const path = join(out, file);
  const text = readFileSync(path, 'utf8');
  const found = text.split(from).length - 1;
  if (found !== times) throw new Error(`${file}: expected ${from} ${times} times, found ${found}`);
  writeFileSync(path, text.replaceAll(from, to));
}
replaceExactly('package.json', '"file:../../packages/shared"', '"file:vendor/shared"', 1);
replaceExactly('package-lock.json', '"file:../../packages/shared"', '"file:vendor/shared"', 1);
replaceExactly('package-lock.json', '"../../packages/shared"', '"vendor/shared"', 2);

// In the repository the typecheck also covers the shared package's tests, which do not ship.
{
  const path = join(out, 'tsconfig.json');
  const tsconfig = JSON.parse(readFileSync(path, 'utf8'));
  const at = tsconfig.include.indexOf('../../packages/shared/**/*.ts');
  if (at < 0) throw new Error('tsconfig.json: the shared include was not found');
  tsconfig.include.splice(at, 1);
  writeFileSync(path, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

// Nothing may still point outside the folder.
for (const file of ['package.json', 'package-lock.json', 'tsconfig.json']) {
  if (readFileSync(join(out, file), 'utf8').includes('../')) throw new Error(`${file} still points outside the folder`);
}
console.log(`Assembled ${copied} files into ${out}`);
