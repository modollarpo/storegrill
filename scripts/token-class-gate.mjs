#!/usr/bin/env node
// Cross-checks every custom design-token class referenced in apps/web/src
// against the token vocabulary actually declared in tailwind.config.ts.
// Catches the class of bug where a component references e.g.
// `hover:border-gray-200-strong` or `bg-freedback-danger` — a class that
// LOOKS like a design-system token but was never declared, so Tailwind's
// JIT silently emits no CSS for it. No build step required.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'apps', 'web', 'src');

const FAMILIES = {
  ember: ['DEFAULT', 'dark', 'deep', 'light', 'pale'],
  charcoal: ['DEFAULT', 'light', 'mid', 'soft', 'line'],
  tealink: ['DEFAULT', 'hover'],
  midnight: ['DEFAULT'],
  deal: ['DEFAULT'],
  smoke: ['25', '50', '100', '150', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  footerdark: ['DEFAULT'],
  surface: ['DEFAULT', 'raised', 'overlay', 'sunken', 'page'],
  border: ['DEFAULT', 'strong', 'focus'],
  text: ['primary', 'secondary', 'tertiary', 'disabled', 'inverse', 'link', 'link-hover'],
  action: ['primary', 'primary-hover', 'primary-active', 'primary-fg', 'secondary', 'secondary-hover', 'destructive', 'success'],
  feedback: ['success', 'success-bg', 'warning', 'warning-bg', 'danger', 'danger-bg', 'info', 'info-bg'],
  success: ['DEFAULT', 'bg'],
};

const SHADOW_VALID = new Set(['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'focus', 'card', 'card-hover', 'sticky', 'inner', 'none', '']);
const RADIUS_VALID = new Set(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'pill', 'full', '']);

const COLOR_PREFIXES = ['bg', 'text', 'border', 'ring', 'divide', 'from', 'to', 'via', 'fill', 'stroke', 'outline', 'accent', 'caret', 'decoration', 'placeholder'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

function extractClassTokens(source) {
  const tokens = new Set();
  // className="..." / className={`...`} / className={cn(...)} literal string spans
  const stringSpanRe = /(?:className\s*=\s*|cn\(|clsx\()[^;]*?(['"`])((?:(?!\1).)*)\1/gs;
  let m;
  while ((m = stringSpanRe.exec(source))) {
    for (const tok of m[2].split(/[\s,]+/)) {
      if (tok) tokens.add(tok);
    }
  }
  return tokens;
}

function baseUtility(token) {
  // Strip responsive/state modifiers (hover:, focus-visible:, group-hover:, md:, dark:, etc.)
  const parts = token.split(':');
  return parts[parts.length - 1];
}

const KNOWN_TAILWIND_DEFAULTS = new Set(['transparent', 'current', 'inherit', 'black', 'white']);

function checkToken(token, file, issues) {
  const base = baseUtility(token).replace(/^['"`]+|['"`}]+$/g, '');
  if (base.includes('[')) return; // arbitrary value, not a token-family reference

  for (const prefix of COLOR_PREFIXES) {
    const lead = `${prefix}-`;
    if (!base.startsWith(lead)) continue;
    const rest = base.slice(lead.length);
    if (!rest || /^\d/.test(rest)) continue; // e.g. bg-2 (spacing-like), not a color ref
    // strip a trailing opacity modifier e.g. `ember/5`
    const [famAndSuffix] = rest.split('/');
    const dashIdx = famAndSuffix.indexOf('-');
    const family = dashIdx === -1 ? famAndSuffix : famAndSuffix.slice(0, dashIdx);
    if (KNOWN_TAILWIND_DEFAULTS.has(family)) return;
    if (!(family in FAMILIES)) continue;
    const suffix = dashIdx === -1 ? 'DEFAULT' : famAndSuffix.slice(dashIdx + 1);
    if (!FAMILIES[family].includes(suffix)) {
      issues.push(`${file}: "${token}" — "${family}" has no "${suffix}" variant`);
    }
    return;
  }

  if (base.startsWith('shadow-')) {
    const suffix = base.slice('shadow-'.length);
    // Ignore colored shadows (e.g., shadow-ember/30)
    const familyCheck = suffix.split('/')[0].split('-')[0];
    if (familyCheck in FAMILIES || familyCheck === 'black' || familyCheck === 'white' || familyCheck === 'transparent') return;
    
    if (!SHADOW_VALID.has(suffix)) issues.push(`${file}: "${token}" — undeclared shadow "${suffix}"`);
    return;
  }
  if (base.startsWith('rounded-')) {
    const suffix = base.slice('rounded-'.length).replace(/^(t|r|b|l|tl|tr|bl|br|s|e|ss|se|es|ee)-/, '');
    if (!RADIUS_VALID.has(suffix)) issues.push(`${file}: "${token}" — undeclared radius "${suffix}"`);
  }
}

const files = walk(ROOT);
const issues = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  for (const token of extractClassTokens(src)) {
    checkToken(token, file.replace(ROOT, 'src'), issues);
  }
}

if (issues.length) {
  console.error(`Token class gate FAILED: ${issues.length} undeclared design-token class(es)\n`);
  for (const line of issues) console.error(' - ' + line);
  process.exit(1);
}
console.log('Token class gate OK: every custom design-token class resolves to a declared token.');
