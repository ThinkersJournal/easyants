# EasyAnts

The front door to the Ants: small Rust building blocks (ConfigurAnt and PersistAnt today, more to come) that make
common jobs easy. Site: https://easyants.dev (domain registered 2026-10-28; not wired to a host yet).

> Great software shouldn't be hard to build.

A static, script-free page of collapsed cards (Astro, no JavaScript, strict CSP). Each card is a name and one sentence;
opened, it shows a usage example of ten lines or fewer, an install link and a link to that Ant's own page. Released
Ants get full cards; Ants that are still placeholders sit in a "coming" row with a status label and no example.

Each card is one small file in `src/data/ants/`; the format, and which facts are still unverified, is in
[docs/CARD-FORMAT.md](docs/CARD-FORMAT.md). Plan: [ROADMAP.md](ROADMAP.md).

```
npm ci
npm run dev        # local site
npm test           # builds, previews, then runs Playwright: CSP and zero-script checks, axe, card format
```

Licence: MIT OR Apache-2.0.
