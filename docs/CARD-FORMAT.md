# Card format

Every card on the page is read from the Ant's own repository on every build (CireSnave 2026-10-28, first-hand: "lets
make the card data pulled from the projects' repos right from the start. We don't want to have to change directions
later and your earlier instinct about never allowing that data to be stale was the right one."). The hub keeps only a
registry: which repositories to read and how they are grouped.

The card design (a collapsed card with a name and one sentence; opened, a short example, an install link and a link to
the Ant's own page) and the catch line are CireSnave's too. This file fixes how the data is written and fetched.

## What an Ant carries

One file at the root of the Ant's repository, named exactly **`easyants-card.toml`**, plus the example file it names.

```toml
name = "ConfigurAnt"                        # must equal the registry's name for this Ant
sentence = "One line, at most 160 characters."
status = "ready"                            # ready | not-ready
install_url = "https://crates.io/crates/configurant"   # ready only, https
install_snippet = "cargo add configurant"   # ready only, optional, one line
docs = "https://github.com/ThinkersJournal/configurant" # ready: required; not-ready: optional; https
example_path = "examples/quickstart.rs"     # ready only: a file under examples/ or tests/
example_lines = [3, 12]                     # ready only, optional: first and last line, 1-based, inclusive
```

A `not-ready` card (a published crate that is not ready for developer use, EXPECTATIONS 6.24) carries `status_label`
instead, for example `status_label = "Early release, not ready"`, and none of `install_url`, `install_snippet`,
`example_path`, `example_lines`. It shows in the "coming" row with that label and no example. Unknown fields are refused.

### The example is never retyped

The text on the card is lines of `example_path` at the commit that was read. The path must be under `examples/` or
`tests/`, the places `cargo test` compiles or runs, so the example is something the Ant's own CI keeps working. Without
`example_lines` the whole file is shown; either way it may be **at most 10 lines** (a longer file needs an
`example_lines` range), must not contain `<script`, and must not be empty. The page prints the source under the example:
`From owner/repo/examples/quickstart.rs @ 1a2b3c4`, or `Excerpt from ...` when only a range is shown.

## What the hub keeps: `src/data/registry.toml`

```toml
[[group]]
id = "foundations"
title = "Foundations"

[[ant]]
slug = "configurant"            # lowercase, unique
name = "ConfigurAnt"
group = "foundations"           # a [[group]] id; groups and Ants show in the order listed
repo = "ThinkersJournal/configurant"   # owner/name; omit while the Ant has no public repository
ref = "v0.5.4"                  # optional branch, tag or commit; default: the default branch
card = "required"               # required | pending
```

- `card = "required"`: the file must exist and be valid. `sentence` and `status_label` are refused here: they belong in
  the Ant's own file.
- `card = "pending"`: the Ant does not carry the file yet. It shows in the coming row with the `sentence` and
  `status_label` written in its registry entry, no example. If the file appears the page uses it and the build warns to
  change the entry to `required`, so a card can never silently go missing later.
- An Ant with no `repo` is never fetched.

## How the build reads it

For each Ant: resolve the ref (default branch unless `ref` is set) to a commit SHA with the GitHub API, then read
`easyants-card.toml` and the example file at that SHA from `raw.githubusercontent.com`, so one Ant is read at one commit.
A missing file is `null` only when the repository answered; a network error, rate limit or server error is retried once
and then fails. `GITHUB_TOKEN`, when set, only lifts the API rate limit.

**The build fails** on any source that is missing (a `required` card file, or an `example_path` that does not exist),
invalid (any rule above, or a `name` that disagrees with the registry), or unreachable. It collects every failing Ant
and names each; it never falls back to an earlier copy and never renders a partial page.

## When it rebuilds

`.github/workflows/live-build.yml` reads the real repositories on every push to `main`, daily at 05:17 UTC and on manual
dispatch (`workflow_dispatch`), so a change in an Ant shows within a day. Nothing deploys yet; the deploy step will follow
the build step in that job. GitHub pauses scheduled workflows in a repository with no activity for 60 days; the push
trigger and the manual dispatch cover that, and a quiet hub is a thing to notice, not to hide.

`ci.yml` (pull requests and pushes) builds and tests from the fixture repositories in `tests/fixtures`
(`EASYANTS_FIXTURES=tests/fixtures`), so those gates need no network and never depend on a real Ant. The same loader
code runs in both; `tests/hub.spec.ts` carries one negative control per rule above.

## Adding or changing an Ant

1. In the Ant's repository: add `easyants-card.toml` and an `examples/` file the Ant's CI runs.
2. In the hub: set that Ant's entry to `card = "required"` (it works as `pending` meanwhile, with a build warning).
3. Moving an Ant between groups, or listing a new one, is a registry change; nothing else in the hub changes.
