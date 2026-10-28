import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/no-such-page'];

const serious = (violations: { impact?: string | null; id: string }[]) =>
  violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''));

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(serious(results.violations).map((v) => v.id)).toEqual([]);
  });

  // axe tags heading-order as best-practice/moderate, so the scan above is blind to it.
  test(`headings stay in order on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withRules(['heading-order']).analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.html))).toEqual([]);
  });
}

// The cards ship closed, so the scan above never sees an example. Open every card and scan again.
test('no serious accessibility violations with every card open', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('details.card');
  const n = await cards.count();
  expect(n).toBeGreaterThan(0); // control: a page with no cards would pass this scan vacuously
  for (let i = 0; i < n; i++) await cards.nth(i).locator('summary').click();
  await expect(page.locator('details.card[open]')).toHaveCount(n);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(serious(results.violations).map((v) => v.id)).toEqual([]);
});

test('mobile width has no horizontal overflow, cards open or closed', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const r of ROUTES) {
    await page.goto(r);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), r).toBeLessThanOrEqual(0);
  }
  await page.goto('/');
  const cards = page.locator('details.card');
  for (let i = 0; i < (await cards.count()); i++) await cards.nth(i).locator('summary').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
