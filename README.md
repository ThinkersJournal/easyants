# EasyAnts

The front door to the Ants: small Rust building blocks (ConfigurAnt and PersistAnt today, more to come) that make
common jobs easy. Site: https://easyants.dev (domain registered 2026-10-28; not wired to a host yet).

> Great software shouldn't be hard to build.

A static, script-free page of collapsed cards (Astro, no JavaScript, strict CSP). Each card is a name and one sentence;
opened, it shows a usage example of ten lines or fewer, an install link and a link to that Ant's own page. Released
Ants get full cards; Ants that are still placeholders sit in a "coming" row with a status label and no example.

Every card is read from the Ant's own repository on each build (`easyants-card.toml` format: [docs/CARD-FORMAT.md](docs/CARD-FORMAT.md)); this
hub keeps only the list of repositories and their grouping (`src/data/registry.toml`). A missing, invalid or unreachable
source fails the build. Plan: [ROADMAP.md](ROADMAP.md).

```
npm ci
npm run dev        # local site
npm run build      # reads every Ant's own repository (needs the network)
npm test           # builds from fixture repositories, then Playwright: CSP and zero-script, axe, source validation
```

Licence: MIT OR Apache-2.0.
