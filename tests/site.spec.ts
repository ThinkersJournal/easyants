import { test, expect } from '@playwright/test';

const RELEASED = ['ConfigurAnt', 'PersistAnt', 'CapAnt'];

test('home has the catch line as its one h1 and a canonical on the apex', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/EasyAnts/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Great software shouldn't be hard to build.");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://easyants.dev/');
});

test('released Ants are collapsed cards built on plain details/summary', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('details.card');
  await expect(cards).toHaveCount(RELEASED.length);
  for (const name of RELEASED) {
    const card = page.locator('details.card', { has: page.locator('.card-name', { hasText: new RegExp(`^${name}$`) }) });
    await expect(card).toHaveCount(1);
    await expect(card).not.toHaveAttribute('open', /.*/);
    await expect(card.locator('summary .card-sentence')).not.toBeEmpty();
    await expect(card.locator('pre')).toBeHidden(); // closed: the example is not shown
  }
});

test('opening a card shows an example of at most ten lines, an install link and a project link', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('details.card');
  for (let i = 0; i < (await cards.count()); i++) {
    const card = cards.nth(i);
    await card.locator('summary').click();
    const code = await card.locator('pre code').innerText();
    const lines = code.replace(/\n+$/, '').split('\n').length;
    expect(lines).toBeGreaterThan(0);
    expect(lines).toBeLessThanOrEqual(10);
    await expect(card.getByRole('link', { name: /^Install / })).toHaveAttribute('href', /^https:\/\/crates\.io\/crates\//);
    await expect(card.getByRole('link', { name: / project page$/ })).toHaveAttribute('href', /^https:\/\//);
  }
});

test('the coming row has a status label and no example for each unreleased Ant', async ({ page }) => {
  await page.goto('/');
  const items = page.getByTestId('coming').locator('li');
  expect(await items.count()).toBeGreaterThan(0);
  for (let i = 0; i < (await items.count()); i++) {
    const li = items.nth(i);
    await expect(li.locator('.status')).not.toBeEmpty();
    await expect(li.locator('pre, details')).toHaveCount(0);
  }
  for (const name of RELEASED) await expect(items.filter({ hasText: name })).toHaveCount(0);
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
