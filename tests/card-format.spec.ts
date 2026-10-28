import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCard, sortCards, MAX_EXAMPLE_LINES } from '../src/lib/card';

const DIR = join(process.cwd(), 'src', 'data', 'ants');
const files = readdirSync(DIR).filter((f) => f.endsWith('.toml'));

const released = `slug = "demo"
name = "DemoAnt"
order = 1
status = "released"
sentence = "Does one thing."
home = "https://example.com/demo"
install = "https://crates.io/crates/demo"

[example]
lang = "rust"
source = "README.md @ abc1234"
tested = true
excerpt = false
code = '''
let x = 1;
'''
`;
const coming = `slug = "soon"
name = "SoonAnt"
order = 2
status = "coming"
status_label = "Name reserved, not released"
sentence = "Will do one thing."
home = "https://crates.io/crates/soon"
`;
const bad = (text: string, file = 'demo.toml') => () => parseCard(text, file);

test('every committed card file parses (control: there are files, and both statuses occur)', () => {
  expect(files.length).toBeGreaterThan(3);
  const cards = files.map((f) => parseCard(readFileSync(join(DIR, f), 'utf8'), f));
  expect(cards.filter((c) => c.status === 'released').map((c) => c.slug).sort()).toEqual(['configurant', 'persistant']);
  expect(cards.filter((c) => c.status === 'coming').length).toBeGreaterThan(0);
});

test('the format accepts a minimal released and a minimal coming card', () => {
  expect(parseCard(released, 'demo.toml').status).toBe('released');
  expect(parseCard(coming, 'soon.toml').status).toBe('coming');
});

// Each negative control changes ONE thing in a card the test above accepts, so a pass means
// that one rule fired, not that the card was broken some other way.
test('the format refuses each rule it states', () => {
  expect(bad(released, 'other.toml')).toThrow(/slug.*file name/);
  expect(bad(released.replace('status = "released"', 'status = "beta"'))).toThrow(/status/);
  expect(bad(released.replace('order = 1', 'order = "1"'))).toThrow(/order/);
  expect(bad(released.replace('https://example.com/demo', 'http://example.com/demo'))).toThrow(/home.*https/);
  expect(bad(released.replace('Does one thing.', 'x'.repeat(161)))).toThrow(/sentence/);
  expect(bad(released.replace('install = "https://crates.io/crates/demo"\n', ''))).toThrow(/install/);
  expect(bad(released.replace(/\n\[example\][\s\S]*$/, '\n'))).toThrow(/example/);
  expect(bad(released.replace('tested = true', 'tested = "yes"'))).toThrow(/tested/);
  expect(bad(released.replace('let x = 1;', Array.from({ length: MAX_EXAMPLE_LINES + 1 }, (_, i) => `let a${i} = ${i};`).join('\n')))).toThrow(/lines/);
  expect(bad(released.replace('let x = 1;', '<script>alert(1)</script>'))).toThrow(/script/);
  expect(bad(released.replace('\n[example]', 'unverified = ["colour"]\n\n[example]'))).toThrow(/unverified/);
  expect(bad(coming + '\n[example]\nlang = "rust"\n', 'soon.toml')).toThrow(/example/);
  expect(bad(coming.replace('status_label = "Name reserved, not released"\n', ''), 'soon.toml')).toThrow(/status_label/);
  expect(bad('not = [valid')).toThrow(/TOML/);
});

test('a card of exactly the line limit is accepted (the limit is inclusive)', () => {
  const ten = Array.from({ length: MAX_EXAMPLE_LINES }, (_, i) => `let a${i} = ${i};`).join('\n');
  expect(parseCard(released.replace('let x = 1;', ten), 'demo.toml').status).toBe('released');
});

test('cards sort by order, then name', () => {
  const a = parseCard(released, 'demo.toml');
  const b = parseCard(coming, 'soon.toml');
  expect(sortCards([b, a]).map((c) => c.slug)).toEqual(['demo', 'soon']);
});

test('capant is a coming card with no example, by PM ruling (README says design phase)', () => {
  const capant = parseCard(readFileSync(join(DIR, 'capant.toml'), 'utf8'), 'capant.toml');
  expect(capant.status).toBe('coming');
  expect('example' in capant).toBe(false);
});
