# Roadmap

1. Scaffold: Astro static site (zero JavaScript, strict CSP, accessibility test), CI and protection from the first PR.
   DONE in the first PR except protection: CI jobs exist (Linux and Windows); the PM turns on branch protection requiring them once they have run on `main`.
2. Card data pulled from each Ant's own repository (CireSnave 2026-10-28): format, fetch, validation, fixtures, daily rebuild.
   DONE in the first PR (`docs/CARD-FORMAT.md`, `src/lib/`, `.github/workflows/live-build.yml`). Every Ant is `pending` until it adds `easyants-card.toml`.
3. Ants add their card files: configurant and persistant first (PM asks them once the format merges); then flip each registry entry to `required`.
4. Point easyants.dev at the site (Cloudflare), staged per-Ant vanity domains redirect here; add the deploy step after the live build. Not started; the PM and CireSnave run any Cloudflare step.
