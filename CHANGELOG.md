# Changelog

Versions follow the portfolio rule: every pushed change bumps the version; pre-1.0 the second number is the
breaking-change number.

## 0.1.11 - 2026-11-26 (allocated by pm-assist; CI only: portfolio workflow pinned to coderipper 467fd259, 0.48.1; no code change; not breaking)

## 0.1.10 - 2026-11-25 (allocated by pm-assist)

WebHostAnt hub entry: card set to required (easyants#12, supersedes #6); astro 7.4.7 lock rider.

## 0.1.9 - 2026-11-21

Hub registry: SemanticAnt added as a required entry (group foundations; pm-ants confirmed). Number allocated by pm-assist.

## 0.1.8 - 2026-11-21

ReleaseAnt card = required; canonical Apache-2.0 LICENSE-APACHE. Number allocated by pm-assist.

## 0.1.7 - 2026-11-20

SecretAnt card required (secretant 0.2.1 has the card); registry + hub test. Number allocated by pm-assist.

## 0.1.6 - 2026-11-19

Registry rows 1-3 (src/data/registry.toml) and ROADMAP; data only. Number allocated by pm-assist.

## 0.1.5 - 2026-11-16

CI only; number provisional until the PM stamps it at the gate (no version files touched).

- CI workflow: the advisory CodeRipper `portfolio` job moves to the shared workflow at coderipper c72a6e0 (0.47.5). No `.coderipper.toml` or rule-name references here, so the rule-id migration changed nothing.

## 0.1.4 - 2026-11-03

- Docs: `docs/AGENT-FILES-DESIGN.md`, the design note for generated and checked `llms.txt` and `SKILL.md` files (CireSnave 2026-11-03: "Agreed. It should be auto-generated so it stays up to date."). Design only.

## 0.1.3 - 2026-10-31

- Registry: HTTPAnt is `card = "required"` with `repo = "ThinkersJournal/httpant"` (CireSnave 2026-10-31, board 350: A, flip it now). Its crates are on crates.io since 0.5.19; the card, the example and the install link are read from the Ant's own repo on every build, and the build fails if the card is missing or invalid.

## 0.1.2 - 2026-10-29

Number provisional until the PM confirms at the gate.

- CI: `.nvmrc` pins Node 22.23.4 (was `22`, which the Ubuntu runners resolved to 22.23.3, below Astro's minimum), and `engines.node` requires >=22.23.4. Type check and Build on Ubuntu failed on `main` for this reason.

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
