#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'apps', 'web', 'src');
const ALLOWED_HEX_FILES = /design-system[/\\]tokens\.ts$|globals\.css$|app[/\\]layout\.tsx$/;
const BRAND_ASSET_FILES = /components[/\\]icons\.tsx$|components[/\\]layout[/\\]Footer\.tsx$|components[/\\]forms[/\\]AuthCard\.tsx$|components[/\\]commerce[/\\]ProductShare\.tsx$/;

const MOJIBAKE = /\uFFFD|Ã[\u0080-\u00FF\u02C6\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u2030\u0152\u0153]|Â[\u00A1-\u00FF]|\u00E2[\u20AC\u0153\u201D\u02DC\u02C6\u201A\u0192\u201E\u2026\u2020\u2021\u2030]|\u00E2\u0020?[\u02DC]/;
const RAW_HEX_IN_TSX = /(?<!&)#[0-9a-fA-F]{3,8}\b/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const failures = [];
const files = walk(SRC);

for (const file of files) {
  if (!/\.(tsx|ts|css)$/.test(file)) continue;
  const rel = relative(ROOT, file);
  const text = readFileSync(file, 'utf8');

  if (MOJIBAKE.test(text)) {
    failures.push(`${rel}: mojibake/corrupted character detected`);
  }

  if (!ALLOWED_HEX_FILES.test(file) && !BRAND_ASSET_FILES.test(file) && /\.tsx$/.test(file)) {
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (RAW_HEX_IN_TSX.test(line)) {
        failures.push(`${rel}:${i + 1}: raw hex color in component (move to tokens.ts): ${line.trim().slice(0, 90)}`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error(`UI hygiene gate FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'}):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('UI hygiene gate OK: no mojibake, no raw hex outside the design system.');
