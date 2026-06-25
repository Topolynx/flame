#!/usr/bin/env node
// Generates lib/iconsData.json from @mdi/svg meta.json
// Output is the search index used by the icon picker - name, tags and aliases
// Run via `npm run icons:build` (also wired as prebuild for lint/ typecheck/ test/ build)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(__dirname, '..');
const META_PATH = resolve(REPO_ROOT, 'node_modules', '@mdi', 'svg', 'meta.json');
const OUT_PATH = resolve(REPO_ROOT, 'lib', 'iconsData.json');

const toMdiName = kebab =>
  `mdi${kebab
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')}`;

const rawIconsMeta = JSON.parse(readFileSync(META_PATH, 'utf8'));

const icons = rawIconsMeta
  .filter(({ deprecated }) => !deprecated)
  .map(({ name, tags, aliases }) => ({
    name: toMdiName(name),
    kebab: name,
    tags: tags ?? [],
    aliases: aliases ?? [],
  }));

icons.sort((left, right) => left.name.localeCompare(right.name));

writeFileSync(OUT_PATH, JSON.stringify(icons));

console.log(`Wrote ${icons.length} icons to ${OUT_PATH}`);
