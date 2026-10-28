# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## 0.1.1 - 2026-10-28

Number provisional until the PM confirms at the gate.

- Card data now comes from each Ant's own repository on every build (CireSnave 2026-10-28), replacing the hub-held data files of 0.1.0: `easyants-card.toml` at the Ant's root plus the example file it names, read at one commit. The hub keeps only `src/data/registry.toml` (repositories and grouping).
- A missing, invalid or unreachable source fails the build, listing every failing Ant; nothing falls back to an older copy (`docs/CARD-FORMAT.md`, `src/lib/`).
- Every Ant is `pending` (coming row, text from the registry) until it adds its card file; the build warns when one appears. CapAnt, ConfigurAnt and PersistAnt therefore all sit in the coming row for now.
- `live-build.yml`: builds from the real repositories daily, on dispatch and on push to `main`. `ci.yml` builds and tests from fixture repositories (`tests/fixtures`).
- `tests/hub.spec.ts` replaces `tests/card-format.spec.ts`: a negative control per rule, and the GitHub source against a fake fetch.

## 0.1.0 - 2026-10-28

First PR; number provisional until the PM confirms at the gate.

- Astro static site, one page: the catch line, collapsed `<details>` cards for ConfigurAnt and PersistAnt, and a "coming" row for fifteen names (CapAnt as "Early release 0.0.7, not ready").
- Card data format, one TOML file per Ant (`docs/CARD-FORMAT.md`), checked at build time by `src/lib/card.ts`.
- Zero JavaScript and an enforced CSP (`public/_headers`), pinned by `tests/security.spec.ts`; axe accessibility with every card open; card-format tests with a negative control per rule.
- CI on Linux and Windows: type check, build, Playwright + axe, plus the advisory CodeRipper portfolio job (pinned to 83585ae, 0.10.0).
