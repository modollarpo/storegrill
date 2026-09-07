#!/usr/bin/env node
// Homepage content-honesty gate.
// The Storegrill homepage must be populated exclusively from real, live data
// (region-scoped categories + real product photography, live deals). This gate
// enforces that mechanically so a resurfaced "PS5 Hub" or "Dyson cameras"
// template tile cannot silently ship again:
//
//   1. no generic stock-photo hosts in the homepage component or its data layer,
//   2. no hardcoded `?category=` / `?q=` / `?brand=` marketplace hrefs,
//   3. the component must consume its sections/slides as props, not as
//      hardcoded module-level arrays,
//   4. none of the previously-fabricated marketing campaigns may reappear.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const FILES = [
  join(ROOT, 'apps', 'web', 'src', 'components', 'home', 'AmazonHomeGrid.tsx'),
  join(ROOT, 'apps', 'web', 'src', 'lib', 'home-content.ts'),
  join(ROOT, 'apps', 'web', 'src', 'lib', 'home-content-build.ts'),
  join(ROOT, 'apps', 'web', 'src', 'app', 'page.tsx'),
];

const STOCK_IMAGE_HOSTS = [
  'unsplash',
  'picsum',
  'pexels',
  'placehold.co',
  'via.placeholder',
  'loremflickr',
  'placeholder.com',
];

const QUERY_MARKETPLACE_LINK = /\?category=|&category=|\?q=|&q=|\?brand=|&brand=|category\s*:\s*['"]|q\s*:\s*['"]/;

const FABRICATED_CAMPAIGNS = [
  'Level up your game',
  'Most-loved finds',
  'Go-to gifts for everyone',
  'Seriously good brands',
  'Autumn favourites',
  'Resale: more savings, less waste',
  'Echo, Fire TV, and more',
  "Levi's original style",
  'Second Chance Deal Days',
  'Gifts by interest',
  'Hello Autumn',
  'Electronics store',
  'Games and toys',
  'Workout essentials',
  'Decor & home must-haves',
  'Media',
  'Artist merch',
  'Video games & accessories',
  'Podcasts on Amazon Music',
  'Playlists on Amazon Music',
  'Back to Hogwarts',
  'Save up to 15%',
  'Extra 10% off orders',
  "Smile. You're on camera",
  'Sees. Thinks. Jets.',
  'Summer sale: final days',
  'Shop deals ending soon',
  'Level up your tech',
  'PlayStation',
  'Xbox Series',
  'Nintendo Switch',
  'Echo Studio',
  'Fire TV Cube',
  'Kindle Scribe',
  'Ring Video Doorbell',
  'gifts for him',
  'gifts for her',
  'gifts for teens',
  'gifts for kids',
  'Essentials for the tech-savvy',
  'Certified refurbished & open-box deals',
];

const HARDCODED_ARRAY_IDENTIFIERS = ['HERO_SLIDES', 'HOME_SECTIONS'];

const failures = [];

for (const file of FILES) {
  const text = readFileSync(file, 'utf8');
  const rel = join('apps', 'web', file.replace(ROOT, '').replace(/\\/g, '/'));

  for (const host of STOCK_IMAGE_HOSTS) {
    if (text.includes(host)) {
      failures.push(`${rel}: stock-image host "${host}" must not feed the homepage`);
    }
  }

  const urlIdx = text.search(QUERY_MARKETPLACE_LINK);
  if (urlIdx !== -1) {
    const line = text.slice(0, urlIdx).split('\n').length;
    failures.push(`${rel}:${line}: hardcoded query-param marketplace href (use real category/product data)`);
  }

  for (const campaign of FABRICATED_CAMPAIGNS) {
    if (text.includes(campaign)) {
      failures.push(`${rel}: fabricated copy "${campaign}" must not reappear on the homepage`);
    }
  }
}

const componentFile = FILES[0];
const componentText = readFileSync(componentFile, 'utf8');
for (const identifier of HARDCODED_ARRAY_IDENTIFIERS) {
  if (new RegExp(`const\\s+${identifier}\\s*=`).test(componentText)) {
    failures.push(`${join('apps', 'web', 'src', 'components', 'home', 'AmazonHomeGrid.tsx')}: homepage data must come from server props, not a module-level "${identifier}" constant`);
  }
}
if (!/AmazonHomeGrid\(\{/.test(componentText)) {
  failures.push('apps/web/src/components/home/AmazonHomeGrid.tsx: component must accept sections/heroSlides as props');
}

if (failures.length > 0) {
  console.error(`Homepage content-honesty gate FAILED (${failures.length} issue${failures.length === 1 ? '' : 's'}):\n`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('Homepage content-honesty gate OK: data is real, sourced from live categories/deals only.');