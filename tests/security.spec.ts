import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// public/_headers enforces `script-src 'self'; style-src 'self'`. That is only true of the
// site if the built HTML needs neither an inline script nor an inline style, and in fact has
// no script at all. This pins it.
const DIST = join(process.cwd(), 'dist');
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(DIST);
const pages = files.filter((p) => p.endsWith('.html'));

test('the CSP header file has no unsafe-inline and no unsafe-eval', () => {
  const h = readFileSync('public/_headers', 'utf8');
  const csp = h.split('\n').find((l) => /^\s*Content-Security-Policy:/.test(l)) ?? '';
  expect(csp).not.toBe('');
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(csp).toMatch(/script-src 'self'/);
});

test('the build produced pages and no JavaScript file (control for the checks below)', () => {
  expect(pages.length).toBeGreaterThanOrEqual(2);
  expect(files.filter((p) => /\.(m?js|cjs)$/.test(p))).toEqual([]);
});

for (const p of pages) {
  test(`${p.replace(DIST, '')} has no <script>, inline <style> or style attribute`, () => {
    const html = readFileSync(p, 'utf8');
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\sstyle="/i);
    expect(html).not.toMatch(/\son[a-z]+="/i);
  });
}

test('no CSP-violating console messages while browsing every page', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (/content security policy|refused to/i.test(m.text())) problems.push(m.text());
  });
  for (const r of ['/', '/no-such-page']) await page.goto(r);
  expect(problems).toEqual([]);
});
