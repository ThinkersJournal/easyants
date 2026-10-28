// The card file every Ant carries at the root of its own repository (docs/CARD-FORMAT.md). This
// module is pure (no Astro, no filesystem, no network) so tests/hub.spec.ts can drive it directly.
// A file that breaks the format throws with where it came from and why; the loader collects every
// such failure and fails the build, it never substitutes a copy.
import { parse } from 'smol-toml';

export const CARD_FILE = 'easyants-card.toml';
export const MAX_EXAMPLE_LINES = 10;
export const MAX_SENTENCE = 160;
// An example comes from a file the Ant's own CI compiles or runs: `cargo test` builds everything
// under examples/ and tests/. A path elsewhere is refused, so the text cannot be retyped prose.
export const EXAMPLE_PATH = /^(examples|tests)\/[A-Za-z0-9._\/-]+$/;

export type CardFile =
  | {
      status: 'ready';
      name: string;
      sentence: string;
      installUrl: string;
      installSnippet?: string;
      docs: string;
      examplePath: string;
      exampleLines?: [number, number];
    }
  | { status: 'not-ready'; name: string; sentence: string; statusLabel: string; docs?: string };

const fail = (where: string, why: string): never => {
  throw new Error(`${where}: ${why}`);
};

function str(t: Record<string, unknown>, key: string, where: string): string {
  const v = t[key];
  if (typeof v !== 'string' || v.trim() === '') fail(where, `\`${key}\` must be a non-empty string`);
  return (v as string).trim();
}

function https(t: Record<string, unknown>, key: string, where: string): string {
  const v = str(t, key, where);
  if (!/^https:\/\/[^\s]+$/.test(v)) fail(where, `\`${key}\` must be an https URL, got ${JSON.stringify(v)}`);
  return v;
}

const KNOWN = ['name', 'sentence', 'status', 'status_label', 'install_url', 'install_snippet', 'docs', 'example_path', 'example_lines'];

export function parseCardFile(text: string, where: string): CardFile {
  let t: Record<string, unknown>;
  try {
    t = parse(text);
  } catch (e) {
    return fail(where, `not valid TOML (${(e as Error).message.split('\n')[0]})`);
  }
  const unknown = Object.keys(t).filter((k) => !KNOWN.includes(k));
  if (unknown.length > 0) fail(where, `unknown field(s): ${unknown.join(', ')}`);
  const name = str(t, 'name', where);
  const sentence = str(t, 'sentence', where);
  if (sentence.length > MAX_SENTENCE) fail(where, `\`sentence\` is ${sentence.length} characters, the limit is ${MAX_SENTENCE}`);
  if (/\n/.test(sentence)) fail(where, '`sentence` must be one line');

  if (t.status === 'ready') {
    for (const k of ['status_label']) if (t[k] !== undefined) fail(where, `a ready card must not have \`${k}\``);
    const examplePath = str(t, 'example_path', where);
    if (!EXAMPLE_PATH.test(examplePath) || examplePath.includes('..')) {
      fail(where, `\`example_path\` must be a file under examples/ or tests/ (what the Ant's CI runs), got ${JSON.stringify(examplePath)}`);
    }
    let exampleLines: [number, number] | undefined;
    if (t.example_lines !== undefined) {
      const l = t.example_lines;
      if (!Array.isArray(l) || l.length !== 2 || !l.every((n) => Number.isInteger(n) && n >= 1) || (l[0] as number) > (l[1] as number)) {
        fail(where, '`example_lines` must be [first, last], 1-based, inclusive, first <= last');
      }
      exampleLines = [(l as number[])[0], (l as number[])[1]];
    }
    const snippet = t.install_snippet === undefined ? undefined : str(t, 'install_snippet', where);
    if (snippet !== undefined && /\n/.test(snippet)) fail(where, '`install_snippet` must be one line');
    return {
      status: 'ready',
      name,
      sentence,
      installUrl: https(t, 'install_url', where),
      installSnippet: snippet,
      docs: https(t, 'docs', where),
      examplePath,
      exampleLines,
    };
  }
  if (t.status === 'not-ready') {
    for (const k of ['install_url', 'install_snippet', 'example_path', 'example_lines']) {
      if (t[k] !== undefined) fail(where, `a not-ready card must not have \`${k}\``);
    }
    return {
      status: 'not-ready',
      name,
      sentence,
      statusLabel: str(t, 'status_label', where),
      docs: t.docs === undefined ? undefined : https(t, 'docs', where),
    };
  }
  return fail(where, '`status` must be "ready" or "not-ready"');
}

// The text shown on a card, taken from the example file. With `lines`, only that inclusive range.
export function pickExample(text: string, lines: [number, number] | undefined, where: string): { code: string; excerpt: boolean } {
  const all = text.replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const picked = lines ? all.slice(lines[0] - 1, lines[1]) : all;
  if (lines && lines[1] > all.length) fail(where, `\`example_lines\` ends at ${lines[1]} but the file has ${all.length} lines`);
  if (picked.length === 0 || picked.every((l) => l.trim() === '')) fail(where, 'the example is empty');
  if (picked.length > MAX_EXAMPLE_LINES) {
    fail(where, `the example is ${picked.length} lines, the limit is ${MAX_EXAMPLE_LINES}${lines ? '' : ' (set `example_lines` to show part of the file)'}`);
  }
  const code = picked.join('\n');
  if (/<\s*script/i.test(code)) fail(where, 'the example must not contain a script tag');
  return { code, excerpt: lines !== undefined && picked.length < all.length };
}

const LANGS: Record<string, string> = { rs: 'rust', toml: 'toml', sh: 'shell', py: 'python', js: 'javascript', ts: 'typescript' };
export const langOf = (path: string): string => LANGS[path.split('.').pop() ?? ''] ?? 'text';
