import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // The domain is registered (README) but not wired to a host yet; `site` drives canonical,
  // og:url and the sitemap so they are right the day it is.
  site: 'https://easyants.dev',
  trailingSlash: 'never',
  integrations: [sitemap()],
  // Ship every script and stylesheet as a FILE so public/_headers can ENFORCE
  // `script-src 'self'; style-src 'self'` with no 'unsafe-inline'. Vite inlines any asset
  // under 4096 bytes and Astro inlines small stylesheets by default; both are turned off.
  // tests/security.spec.ts pins the result.
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } },
});
