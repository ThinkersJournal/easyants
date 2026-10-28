// The card data format (docs/CARD-FORMAT.md): one small TOML file per Ant. This module is
// pure (no Astro, no filesystem) so tests/card-format.spec.ts can drive it directly. A file
// that breaks the format throws with the file name and the reason, which fails the build.
import { parse } from 'smol-toml';

export type Example = {
  lang: string;
  code: string;
  source: string;
  tested: boolean;
  excerpt: boolean;
};

export type Card = {
  slug: string;
  name: string;
  order: number;
  sentence: string;
  home: string;
  unverified: string[];
} & (
  | { status: 'released'; install: string; example: Example }
  | { status: 'coming'; statusLabel: string }
);

export const MAX_EXAMPLE_LINES = 10;
export const MAX_SENTENCE = 160;
const FIELDS = ['status', 'sentence', 'home', 'install', 'example', 'status_label', 'order', 'name'];

const fail = (file: string, why: string): never => {
  throw new Error(`card ${file}: ${why}`);
};

function str(t: Record<string, unknown>, key: string, file: string): string {
  const v = t[key];
  if (typeof v !== 'string' || v.trim() === '') fail(file, `\`${key}\` must be a non-empty string`);
  return (v as string).trim();
}

function url(t: Record<string, unknown>, key: string, file: string): string {
  const v = str(t, key, file);
  if (!/^https:\/\/[^\s]+$/.test(v)) fail(file, `\`${key}\` must be an https URL, got ${JSON.stringify(v)}`);
  return v;
}

export function parseCard(text: string, file: string): Card {
  let t: Record<string, unknown>;
  try {
    t = parse(text);
  } catch (e) {
    return fail(file, `not valid TOML (${(e as Error).message.split('\n')[0]})`);
  }
  const slug = file.replace(/^.*[\\/]/, '').replace(/\.toml$/, '');
  if (t.slug !== slug) fail(file, `\`slug\` must equal the file name (${JSON.stringify(slug)})`);
  const name = str(t, 'name', file);
  if (typeof t.order !== 'number' || !Number.isInteger(t.order)) fail(file, '`order` must be an integer');
  const sentence = str(t, 'sentence', file);
  if (sentence.length > MAX_SENTENCE) fail(file, `\`sentence\` is ${sentence.length} characters, the limit is ${MAX_SENTENCE}`);
  if (/\n/.test(sentence)) fail(file, '`sentence` must be one line');
  const home = url(t, 'home', file);

  const unverified = t.unverified === undefined ? [] : t.unverified;
  if (!Array.isArray(unverified) || unverified.some((u) => typeof u !== 'string' || !FIELDS.includes(u))) {
    fail(file, `\`unverified\` must list field names from: ${FIELDS.join(', ')}`);
  }

  const base = { slug, name, order: t.order as number, sentence, home, unverified: unverified as string[] };
  if (t.status === 'released') {
    const install = url(t, 'install', file);
    const ex = t.example as Record<string, unknown> | undefined;
    if (typeof ex !== 'object' || ex === null || Array.isArray(ex)) return fail(file, 'a released card needs an [example] table');
    const code = str(ex, 'code', file).replace(/\r\n/g, '\n');
    const lines = code.split('\n').length;
    if (lines > MAX_EXAMPLE_LINES) fail(file, `[example] is ${lines} lines, the limit is ${MAX_EXAMPLE_LINES}`);
    if (/<\s*script/i.test(code)) fail(file, '[example] must not contain a script tag');
    if (typeof ex.tested !== 'boolean') fail(file, '[example] `tested` must be true or false');
    if (typeof ex.excerpt !== 'boolean') fail(file, '[example] `excerpt` must be true or false');
    return {
      ...base,
      status: 'released',
      install,
      example: {
        lang: str(ex, 'lang', file),
        code,
        source: str(ex, 'source', file),
        tested: ex.tested as boolean,
        excerpt: ex.excerpt as boolean,
      },
    };
  }
  if (t.status === 'coming') {
    if (t.example !== undefined) fail(file, 'a coming card must not have an [example]');
    if (t.install !== undefined) fail(file, 'a coming card must not have `install`');
    return { ...base, status: 'coming', statusLabel: str(t, 'status_label', file) };
  }
  return fail(file, '`status` must be "released" or "coming"');
}

// Cards sorted for the page: by `order`, then name. Duplicate slugs or orders-in-conflict are
// not errors; two cards may share an order and then sort by name.
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
