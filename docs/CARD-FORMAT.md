# Card format

One small TOML file per Ant in `src/data/ants/<slug>.toml`. The page is generated from these files and from nothing
else; `src/lib/card.ts` parses and checks each one, and a file that breaks a rule fails the build with the file name and
the reason. `tests/card-format.spec.ts` holds one negative control per rule.

The card design (a collapsed card with a name and one sentence; opened, a short example, an install link and a link to
the Ant's own page) and the catch line are CireSnave's (2026-10-28, first-hand). This file only fixes how the data is
written.

## Fields

| Field | Applies to | Rule |
|---|---|---|
| `slug` | all | Must equal the file name without `.toml`. Becomes the card's `id`. |
| `name` | all | Display name, for example `ConfigurAnt`. |
| `order` | all | Integer. Cards sort by `order`, then name. Released Ants use 10 to 99, coming Ants 100 and up. |
| `status` | all | `released` or `coming`. |
| `sentence` | all | One line, at most 160 characters. What the Ant does, in plain words. |
| `home` | all | `https://` URL of the Ant's own page. Until an Ant has a site of its own this is its repository (released) or its crates.io page (coming). |
| `install` | released only | `https://` URL to install from (the crates.io page). A coming card must not have one. |
| `status_label` | coming only | The honest status shown on the card, for example `Name reserved, not released`. |
| `unverified` | optional | List of field names (from the table above) whose value has not been checked against a source. Printed as a warning in every build log. |
| `[example]` | released only | See below. A coming card must not have one. |

## The example

At most 10 lines (`MAX_EXAMPLE_LINES`), no `<script`. Fields: `lang`, `code`, `source`, `tested`, `excerpt`.

- `source` says where the text came from: file, repository and commit. The page prints it under the example.
- `tested` is `true` only when the text is a block the Ant's own tests compile or run (a doc test, or a README
  included as the crate's documentation). A README block that nothing runs is `false`, and the page says
  `not run as shown`.
- `excerpt` is `true` when lines were left out of the source block. The page says `Excerpt from`.

An example is copied from the Ant's tested source, never written here. Roadmap row 2 replaces the copy with a build
step that pulls it, so it cannot go stale; until then the `source` commit shows how old it is.

## Who gets a full card

Only an Ant whose README example passes a fresh-eyes read (PM ruling 2026-10-28, EXPECTATIONS 6.24). A published crate
that is not ready for developer use is a coming card with a plain status label: `capant` is `Early release 0.0.7, not
ready` (crates.io has 0.0.7, its README says design phase).

## Unverified facts

A fact that could not be confirmed against a source is listed in `unverified` rather than left unmarked. Today no card
has one. Everything was read on 2026-10-28: crate names, descriptions and repository links from the crates.io API,
examples from each repository at the commit named in `source`. Repository links for the coming Ants were not used
because six of them did not resolve (HTTP 404), so those cards link to crates.io (CapAnt's repository is public and
links there).

## Target (PM 2026-10-28)

The data files live in the hub for now. When a second Ant ships a tested README example, each card's data file moves
into that Ant's own repository and the hub build pulls it, so the card and the Ant cannot drift apart.

## Adding an Ant

Copy `persistant.toml` (released) or `secretant.toml` (coming), change every field, run `npm test`. Moving an Ant from
`coming` to `released` means adding `install` and `[example]`, removing `status_label`, and renumbering `order`.
