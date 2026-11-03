# Agent-facing files: `llms.txt` and `SKILL.md`, generated and checked (design note, 2026-11-03)

Status: design only, nothing built. Decided by CireSnave 2026-11-03: every consumer-facing project gets a `SKILL.md`
(when to use it, the 3 to 4 calls that matter, pitfalls) and an `llms.txt` (a short index); both are
**auto-generated so they cannot go stale**, and a release is refused when one differs from a fresh generation.
Roadmap entry: `PORTFOLIO-ROADMAP.md`, section "SKILL.md per project, mechanically checked".

## 1. One source of truth per Ant

Inputs, all already in the Ant's repository: `easyants-card.toml` (name, sentence, status, install, docs, example),
the example file it names (compiled by the Ant's own CI), `Cargo.toml` (version, features, description), and the
crate's public API as rustdoc JSON. Nothing is retyped. This extends the rule of docs/CARD-FORMAT.md ("the example is
never retyped") from the card to the two new files.

## 2. What is generated

- `llms.txt` (about 1 to 2 KB): title, one-paragraph summary (the card sentence plus the `Cargo.toml` description),
  links to README, docs, example, changelog and `SKILL.md`, **pinned to the release tag**, never `main`, and a line
  `verified against <version>`. Nothing sensitive: no patent analysis, no security drafts.
- `SKILL.md`: frontmatter (`name`, `description`: when to use the crate), then generated sections (install, the
  example, the public-API surface from rustdoc JSON, the feature list from `[features]`, the CLI flags from `--help`
  where a CLI exists) and a short hand-written section ("pitfalls") where every claim is either tied to a test or
  marked `judgment`. Hand-written lines are the only part that can be wrong, so they stay few.

## 3. The checker (one shared tool, not one per project)

Fails when: a generated file differs from a fresh generation; a link does not resolve (a path in `git ls-files`, or an
https URL that answers 200); a link points at `main` instead of the tag; the version line differs from `Cargo.toml`;
a named type, function or feature is absent from the rustdoc JSON or `[features]`; a code block does not compile as a
doctest; a `--help` flag in the file is absent from the real output. Each failing case needs a mutation test that
makes it fail (a check that never fails proves nothing). It runs in CI on every pull request and as a required step
of the `releaseant` publish flow.
It proves examples compile and names exist. It cannot prove that advice is good.

## 4. Where it lives (open)

Candidates: this hub (it already reads every Ant's card on each build), or a CodeRipper rule family with a standalone
mode. Not decided; the first slice should be a generator plus checker run against ONE Ant locally. Hosting: a repo has
no root path on GitHub, so `llms.txt` is also served from the root of each docs site where one exists.

## 5. Pilot and order

1. Generator and checker for one Ant (ConfigurAnt), run locally, with the mutation tests.
2. Add PersistAnt, CapAnt and HTTPAnt (the Ants that already carry cards).
3. Wire the check into CI and `releaseant publish`; add the files to each crate's Cargo `include` list.
4. Everyone else on their next release. Private repositories wait until they are public.

## 6. Not measured

Whether any model provider's crawler reads `llms.txt` automatically (no confirmation is known); how rustdoc JSON
behaves across the Ants' MSRVs; the cost of generating on every PR.
