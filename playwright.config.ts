import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  // Test the built output through `astro preview`, not `astro dev`: it is what a host
  // serves, so it is the more faithful gate. The page is built from FIXTURE repositories
  // (tests/fixtures), so these tests need no network and do not depend on any real Ant;
  // the live build (.github/workflows/live-build.yml) reads the real ones.
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { EASYANTS_FIXTURES: 'tests/fixtures' },
  },
});
