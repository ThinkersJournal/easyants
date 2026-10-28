# Roadmap

1. Scaffold: Astro static site (zero JavaScript, strict CSP, accessibility test), CI and protection from the first PR.
   DONE in the first PR except protection: CI jobs exist (Linux and Windows); the PM turns on branch protection requiring them once they have run on `main`.
2. Card data format (one small file per Ant) and the build step that pulls each released Ant's example from its README.
   Format DONE (`docs/CARD-FORMAT.md`). OPEN: the build step, and moving each card file into its Ant's repository once a second Ant ships a tested README example (PM target); today each example is a copy with its source commit named.
3. Cards for ConfigurAnt, PersistAnt, CapAnt; "coming" row for the rest, with honest status labels.
   DONE in the first PR: two full cards (ConfigurAnt, PersistAnt); CapAnt is in the coming row as "Early release 0.0.7, not ready" (PM ruling).
4. Point easyants.dev at the site (Cloudflare), staged per-Ant vanity domains redirect here. Not started; the PM and CireSnave run any Cloudflare step.
