import { test, expect } from '@playwright/test';

// Built from tests/fixtures: ReadyAnt and SecondAnt carry a ready card, EarlyAnt a not-ready one,
// PendingAnt has a repository with no card file, GhostAnt has no repository.
const READY = ['ReadyAnt', 'SecondAnt'];
const COMING = ['EarlyAnt', 'PendingAnt', 'GhostAnt'];

test('home has the catch line as its one h1 and a canonical on the apex', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/EasyAnts/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Great software shouldn't be hard to build.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://easyants.dev/');
});

test('ready Ants are collapsed cards built on plain details/summary', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('details.card');
  await expect(cards).toHaveCount(READY.length);
  for (const name of READY) {
    const card = page.locator('details.card', { has: page.locator('.card-name', { hasText: new RegExp(`^${name}$`) }) });
    await expect(card).toHaveCount(1);
    await expect(card).not.toHaveAttribute('open', /.*/);
    await expect(card.locator('summary .card-sentence')).not.toBeEmpty();
    await expect(card.locator('pre')).toBeHidden(); // closed: the example is not shown
  }
});

test('opening a card shows the example text taken from the Ant\'s example file, with its source', async ({ page }) => {
  await page.goto('/');
  const ready = page.locator('details#ready-ant');
  await ready.locator('summary').click();
  // example_lines = [3, 8] of the 12-line file: six lines, the ones the card file names.
  const code = await ready.locator('pre code').innerText();
  expect(code.split('\n')).toHaveLength(6);
  expect(code.split('\n')[0]).toBe('fn main() {');
  expect(code).toContain('let thing = Thing::new("hello");');
  expect(code).not.toContain('use ready_ant');
  expect(code).not.toContain('twelve-line');
  expect(code).not.toContain('thing.close()');
  await expect(ready.locator('.src')).toHaveText('Excerpt from fixture-org/ready-ant/examples/hello.rs @ aaaaaaa');
  await expect(ready.locator('.snippet code')).toHaveText('cargo add ready-ant');

  const second = page.locator('details#second-ant');
  await second.locator('summary').click();
  await expect(second.locator('.src')).toHaveText('From fixture-org/second-ant/examples/tiny.rs @ bbbbbbb');
  await expect(second.locator('.snippet')).toHaveCount(0);
});

test('every opened card has an example of at most ten lines, an install link and a project link', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('details.card');
  for (let i = 0; i < (await cards.count()); i++) {
    const card = cards.nth(i);
    await card.locator('summary').click();
    const lines = (await card.locator('pre code').innerText()).replace(/\n+$/, '').split('\n').length;
    expect(lines).toBeGreaterThan(0);
    expect(lines).toBeLessThanOrEqual(10);
    await expect(card.getByRole('link', { name: /^Install / })).toHaveAttribute('href', /^https:\/\//);
    await expect(card.getByRole('link', { name: / project page$/ })).toHaveAttribute('href', /^https:\/\//);
  }
});

test('the coming row has a status label and no example, and the status comes from the right place', async ({ page }) => {
  await page.goto('/');
  const items = page.getByTestId('coming').locator('li');
  await expect(items).toHaveCount(COMING.length);
  for (let i = 0; i < COMING.length; i++) {
    await expect(items.nth(i).locator('.status')).not.toBeEmpty();
    await expect(items.nth(i).locator('pre, details')).toHaveCount(0);
  }
  for (const name of READY) await expect(items.filter({ hasText: name })).toHaveCount(0);
  // from the Ant's own card file (not-ready), from the registry (pending), and in group order
  await expect(items.filter({ hasText: 'EarlyAnt' }).locator('.status')).toHaveText('Early release, not ready');
  await expect(items.filter({ hasText: 'PendingAnt' }).locator('.status')).toHaveText('Card not published yet');
  await expect(items.filter({ hasText: 'GhostAnt' }).locator('.status')).toHaveText('Name reserved, not released');
  await expect(items.filter({ hasText: 'EarlyAnt' }).locator('.group')).toHaveText('Alpha group');
});

test('unknown route serves the branded 404', async ({ page }) => {
  const res = await page.goto('/no-such-page');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('not here');
});

test('no page loads anything from another origin', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (r) => {
    if (new URL(r.url()).hostname !== 'localhost') foreign.push(r.url());
  });
  for (const route of ['/', '/no-such-page']) await page.goto(route);
  expect(foreign).toEqual([]);
});
