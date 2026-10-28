# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## 0.1.0 - 2026-10-28

First PR; number provisional until the PM confirms at the gate.

- Astro static site, one page: the catch line, collapsed `<details>` cards for ConfigurAnt, PersistAnt and CapAnt, and a "coming" row for fourteen reserved names.
- Card data format, one TOML file per Ant (`docs/CARD-FORMAT.md`), checked at build time by `src/lib/card.ts`.
- Zero JavaScript and an enforced CSP (`public/_headers`), pinned by `tests/security.spec.ts`; axe accessibility with every card open; card-format tests with a negative control per rule.
- CI on Linux and Windows: type check, build, Playwright + axe, plus the advisory CodeRipper portfolio job (pinned to 83585ae, 0.10.0).
