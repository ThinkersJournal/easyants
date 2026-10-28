import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import registryText from '../data/registry.toml?raw';
import { parseRegistry } from './registry';
import { loadCards } from './load';
import { dirSource, githubSource } from './sources';

// EASYANTS_FIXTURES=<dir> reads <dir>/registry.toml and fixture repositories from <dir>/repos instead of
// GitHub, so the page tests are hermetic. Without it the build reads every listed Ant's own repository.
const fixtures = process.env.EASYANTS_FIXTURES;
const registry = parseRegistry(fixtures ? readFileSync(join(fixtures, 'registry.toml'), 'utf8') : registryText);
const source = fixtures ? dirSource(join(fixtures, 'repos')) : githubSource({ token: process.env.GITHUB_TOKEN });

export const { cards, warnings } = await loadCards(registry, source);
for (const w of warnings) console.warn(`[easyants] ${w}`);
console.log(`[easyants] ${cards.length} Ants from ${fixtures ? `fixtures in ${fixtures}` : 'their own repositories'}`);
