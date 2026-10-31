import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CARD_FILE, MAX_EXAMPLE_LINES, parseCardFile, pickExample } from '../src/lib/card';
import { parseRegistry } from '../src/lib/registry';
import { loadCards } from '../src/lib/load';
import { githubSource, type Source } from '../src/lib/sources';

// ---- fixtures: an in-memory Ant repository per name -------------------------------------------------
const SHA = 'f'.repeat(40);
type Repo = Record<string, string> | 'down';
const mem = (repos: Record<string, Repo>): Source => ({
  async resolve(repo) {
    const r = repos[repo];
    if (r === undefined || r === 'down') throw new Error(`repository ${repo} is unreachable (HTTP 404)`);
    return SHA;
  },
  async file(repo, _sha, path) {
    const r = repos[repo];
    return r === undefined || r === 'down' ? null : (r[path] ?? null);
  },
});

const READY_CARD = `name = "DemoAnt"
sentence = "Does one thing."
status = "ready"
install_url = "https://crates.io/crates/demo"
docs = "https://example.com/demo"
example_path = "examples/hello.rs"
`;
const EXAMPLE = 'fn main() {\n    demo::go();\n}\n';
const goodRepo = (): Record<string, string> => ({ [CARD_FILE]: READY_CARD, 'examples/hello.rs': EXAMPLE });
const lines = (n: number) => Array.from({ length: n }, (_, i) => `let a${i} = ${i};`).join('\n') + '\n';

const REGISTRY = `
[[group]]
id = "g"
title = "Group"

[[ant]]
slug = "demo"
name = "DemoAnt"
group = "g"
repo = "o/demo"
card = "required"
`;
const load = (repos: Record<string, Repo>, registry = REGISTRY) => loadCards(parseRegistry(registry), mem(repos));
const withCard = (card: string, extra: Record<string, string> = {}) => ({ 'o/demo': { ...goodRepo(), [CARD_FILE]: card, ...extra } });

// ---- the real registry -------------------------------------------------------------------------------
test('the real registry parses; every Ant is pending except the ones named here, which are required with a repo (control: it lists the Ants)', () => {
  const reg = parseRegistry(readFileSync(join(process.cwd(), 'src', 'data', 'registry.toml'), 'utf8'));
  expect(reg.ants.length).toBeGreaterThanOrEqual(17);
  // Update this list in the same change that flips an entry to required (board 350 flipped httpant, 2026-10-31).
  const required = reg.ants.filter((a) => a.card === 'required').map((a) => a.slug).sort();
  expect(required).toEqual(['httpant']);
  expect(reg.ants.filter((a) => a.card === 'required').every((a) => !!a.repo)).toBe(true);
  expect(reg.ants.filter((a) => a.card !== 'required').every((a) => a.card === 'pending')).toBe(true);
  expect(reg.ants.filter((a) => a.repo).map((a) => a.slug)).toContain('configurant');
});

// ---- loading ------------------------------------------------------------------------------------------
test('a required Ant is read from its own repository: card file, then the example text from the named file', async () => {
  const { cards, warnings } = await load({ 'o/demo': goodRepo() });
  expect(warnings).toEqual([]);
  expect(cards).toHaveLength(1);
  const c = cards[0];
  if (c.status !== 'released') throw new Error('expected a released card');
  expect(c.sentence).toBe('Does one thing.');
  expect(c.example.code).toBe('fn main() {\n    demo::go();\n}');
  expect(c.example.lang).toBe('rust');
  expect(c.example.excerpt).toBe(false);
  expect(c.example.source).toBe(`o/demo/examples/hello.rs @ ${SHA.slice(0, 7)}`);
});

test('example_lines shows only that range, and says it is an excerpt', async () => {
  const card = READY_CARD + 'example_lines = [2, 3]\n';
  const { cards } = await load(withCard(card, { 'examples/hello.rs': 'a\nb\nc\nd\n' }));
  if (cards[0].status !== 'released') throw new Error('expected released');
  expect(cards[0].example.code).toBe('b\nc');
  expect(cards[0].example.excerpt).toBe(true);
});

test('a pending Ant with no card file is a coming card with the registry text; with no repo nothing is fetched', async () => {
  const reg = `${REGISTRY.replace(/\[\[ant\]\][\s\S]*/, '')}
[[ant]]
slug = "demo"
name = "DemoAnt"
group = "g"
repo = "o/demo"
card = "pending"
sentence = "From the registry."
status_label = "Not yet"

[[ant]]
slug = "ghost"
name = "GhostAnt"
group = "g"
card = "pending"
sentence = "No repo."
status_label = "Reserved"
`;
  const { cards } = await load({ 'o/demo': {} }, reg);
  expect(cards.map((c) => [c.slug, c.status, c.sentence])).toEqual([
    ['demo', 'coming', 'From the registry.'],
    ['ghost', 'coming', 'No repo.'],
  ]);
});

test('a pending Ant that now carries the file is shown from the file, with a warning to make it required', async () => {
  const { cards, warnings } = await load({ 'o/demo': goodRepo() }, REGISTRY.replace('required', 'pending') + 'sentence = "old"\nstatus_label = "old"\n');
  expect(cards[0].status).toBe('released');
  expect(cards[0].sentence).toBe('Does one thing.');
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toMatch(/card = "required"/);
});

test('a not-ready card file makes a coming card whose status comes from the Ant', async () => {
  const card = 'name = "DemoAnt"\nsentence = "Early."\nstatus = "not-ready"\nstatus_label = "Early release, not ready"\n';
  const { cards } = await load(withCard(card));
  expect(cards[0]).toMatchObject({ status: 'coming', statusLabel: 'Early release, not ready', sentence: 'Early.' });
});

// ---- the build refuses, with one negative control per rule -----------------------------------------------
// Each case changes ONE thing in the repository the happy path above accepts, so a failure means that one
// rule fired and not that something else was broken.
test('the build FAILS, with the Ant named, on every missing, invalid or unreachable source', async () => {
  const fails = async (repos: Record<string, Repo>, why: RegExp, registry?: string) => {
    await expect(load(repos, registry)).rejects.toThrow(why);
    await expect(load(repos, registry)).rejects.toThrow(/demo:/);
  };
  // unreachable
  await fails({ 'o/demo': 'down' }, /unreachable/);
  await fails({}, /unreachable/);
  // missing, when the registry says required
  await fails({ 'o/demo': { 'examples/hello.rs': EXAMPLE } }, /missing, but the registry says/);
  // the card file itself
  await fails(withCard('not = [valid'), /not valid TOML/);
  await fails(withCard(READY_CARD.replace('status = "ready"', 'status = "done"')), /status/);
  await fails(withCard(READY_CARD.replace('name = "DemoAnt"', 'name = "OtherAnt"')), /registry calls this Ant/);
  await fails(withCard(READY_CARD.replace('Does one thing.', 'x'.repeat(161))), /sentence/);
  await fails(withCard(READY_CARD.replace('https://crates.io/crates/demo', 'http://crates.io/crates/demo')), /install_url.*https/);
  await fails(withCard(READY_CARD.replace('docs = "https://example.com/demo"\n', '')), /docs/);
  await fails(withCard(READY_CARD + 'colour = "red"\n'), /unknown field/);
  await fails(withCard(READY_CARD + 'status_label = "x"\n'), /ready card must not have/);
  await fails(withCard('name = "DemoAnt"\nsentence = "s"\nstatus = "not-ready"\n'), /status_label/);
  await fails(withCard('name = "DemoAnt"\nsentence = "s"\nstatus = "not-ready"\nstatus_label = "x"\nexample_path = "examples/a.rs"\n'), /not-ready card must not have/);
  // the example: where it comes from, and what it looks like
  await fails(withCard(READY_CARD.replace('examples/hello.rs', 'src/lib.rs'), { 'src/lib.rs': EXAMPLE }), /under examples\/ or tests\//);
  await fails(withCard(READY_CARD.replace('examples/hello.rs', 'examples/../secret.rs')), /under examples\/ or tests\//);
  await fails(withCard(READY_CARD.replace('examples/hello.rs', 'examples/gone.rs')), /does not exist in the repository/);
  await fails(withCard(READY_CARD, { 'examples/hello.rs': lines(MAX_EXAMPLE_LINES + 1) }), /lines, the limit is 10/);
  await fails(withCard(READY_CARD + 'example_lines = [1, 99]\n'), /file has 3 lines/);
  await fails(withCard(READY_CARD + 'example_lines = [3, 1]\n'), /example_lines/);
  await fails(withCard(READY_CARD, { 'examples/hello.rs': '\n\n' }), /empty/);
  await fails(withCard(READY_CARD, { 'examples/hello.rs': '<script>x</script>\n' }), /script/);
});

test('the example limit is inclusive: exactly ten lines is accepted', async () => {
  const { cards } = await load(withCard(READY_CARD, { 'examples/hello.rs': lines(MAX_EXAMPLE_LINES) }));
  expect(cards).toHaveLength(1);
  expect(() => pickExample(lines(30), [5, 14], 'x')).not.toThrow(); // a ten-line excerpt of a longer file
  expect(() => pickExample(lines(30), [5, 15], 'x')).toThrow(/limit/);
});

test('one bad Ant fails the whole build and every failing Ant is listed; no partial page', async () => {
  const reg = `${REGISTRY}
[[ant]]
slug = "second"
name = "SecondAnt"
group = "g"
repo = "o/second"
card = "required"

[[ant]]
slug = "third"
name = "ThirdAnt"
group = "g"
repo = "o/third"
card = "required"
`;
  const repos: Record<string, Repo> = {
    'o/demo': goodRepo(),
    'o/second': 'down',
    'o/third': { 'examples/hello.rs': EXAMPLE },
  };
  const err = await load(repos, reg).then(() => null, (e: Error) => e);
  expect(err).not.toBeNull();
  expect(err!.message).toMatch(/2 of 3 Ant source\(s\) failed/);
  expect(err!.message).toMatch(/second: /);
  expect(err!.message).toMatch(/third: /);
  expect(err!.message).not.toMatch(/demo: /); // control: the healthy Ant is not blamed
  expect(err!.message).toMatch(/does not fall back/);
});

// ---- card file parser, direct ---------------------------------------------------------------------------
test('parseCardFile accepts the ready card and says where a bad one came from', () => {
  expect(parseCardFile(READY_CARD, 'w').status).toBe('ready');
  expect(() => parseCardFile('not = [valid', 'o/r/easyants-card.toml @ abc1234')).toThrow(/^o\/r\/easyants-card\.toml @ abc1234: /);
});

// ---- registry rules -----------------------------------------------------------------------------------
test('the registry refuses each rule it states', () => {
  const bad = (text: string, why: RegExp) => expect(() => parseRegistry(text)).toThrow(why);
  bad('not = [valid', /TOML/);
  bad(REGISTRY.replace('slug = "demo"', 'slug = "Demo"'), /slug/);
  bad(REGISTRY + REGISTRY.slice(REGISTRY.indexOf('[[ant]]')), /duplicate ant slug/);
  bad(REGISTRY.replace('group = "g"\nrepo', 'group = "nope"\nrepo'), /group/);
  bad(REGISTRY.replace('repo = "o/demo"', 'repo = "o demo"'), /owner\/name/);
  bad(REGISTRY.replace('repo = "o/demo"\n', ''), /needs a `repo`/);
  bad(REGISTRY.replace('card = "required"', 'card = "maybe"'), /card/);
  bad(REGISTRY + 'sentence = "belongs in the Ant"\n', /belongs in the Ant's own card file/);
  bad(REGISTRY.replace('required', 'pending'), /pending Ant needs `sentence`/);
  bad(REGISTRY + 'colour = "red"\n', /unknown field/);
  bad(REGISTRY.replace(/\[\[group\]\][\s\S]*?\n\n/, ''), /at least one \[\[group\]\]/);
});

// ---- the GitHub source, against a fake fetch ----------------------------------------------------------
type Call = { url: string; headers?: Record<string, string> };
const fakeFetch = (answers: (url: string, n: number) => { status: number; body?: string } | Error) => {
  const calls: Call[] = [];
  const fetchImpl = async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers });
    const a = answers(url, calls.length);
    if (a instanceof Error) throw a;
    return { status: a.status, ok: a.status < 300, text: async () => a.body ?? '' };
  };
  return { calls, fetchImpl };
};

test('githubSource resolves a ref to a SHA, then reads files at that SHA from raw.githubusercontent.com', async () => {
  const { calls, fetchImpl } = fakeFetch((url) => (url.startsWith('https://api.github.com/') ? { status: 200, body: `${SHA}\n` } : { status: 200, body: 'hello' }));
  const src = githubSource({ token: 'tok', fetchImpl });
  expect(await src.resolve('o/r', 'HEAD')).toBe(SHA);
  expect(await src.file('o/r', SHA, 'examples/a.rs')).toBe('hello');
  expect(calls[0].url).toBe('https://api.github.com/repos/o/r/commits/HEAD');
  expect(calls[0].headers?.Authorization).toBe('Bearer tok');
  expect(calls[1].url).toBe(`https://raw.githubusercontent.com/o/r/${SHA}/examples/a.rs`);
  expect(calls[1].headers?.Authorization).toBeUndefined(); // the token never goes to the raw host
});

test('githubSource: 404 on a file is null; every other failure throws, and a blip is retried once', async () => {
  const s404 = githubSource({ fetchImpl: fakeFetch(() => ({ status: 404 })).fetchImpl });
  expect(await s404.file('o/r', SHA, 'x')).toBeNull();
  await expect(s404.resolve('o/r', 'HEAD')).rejects.toThrow(/unreachable \(HTTP 404\)/);

  const s403 = githubSource({ fetchImpl: fakeFetch(() => ({ status: 403 })).fetchImpl });
  await expect(s403.file('o/r', SHA, 'x')).rejects.toThrow(/HTTP 403/);
  await expect(s403.resolve('o/r', 'HEAD')).rejects.toThrow(/HTTP 403/);

  const flaky = fakeFetch((_u, n) => (n === 1 ? { status: 502 } : { status: 200, body: 'ok' }));
  expect(await githubSource({ fetchImpl: flaky.fetchImpl }).file('o/r', SHA, 'x')).toBe('ok');
  expect(flaky.calls).toHaveLength(2);

  const down = fakeFetch(() => new Error('ECONNRESET'));
  await expect(githubSource({ fetchImpl: down.fetchImpl }).file('o/r', SHA, 'x')).rejects.toThrow(/ECONNRESET/);
  expect(down.calls).toHaveLength(2); // one retry, then it fails; no third try and no stale answer

  const junk = githubSource({ fetchImpl: fakeFetch(() => ({ status: 200, body: '<html>captive portal</html>' })).fetchImpl });
  await expect(junk.resolve('o/r', 'HEAD')).rejects.toThrow(/not a commit SHA/);
});
