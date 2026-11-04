# qa verification: is Demo › Load the configured checkpoint built by the product's own steps? (P-322)

**Verdict: yes, with one small, labelled shortcut.** Checked by the qa lane (Opus, P-303) on main 10868af42, 4 Nov 2026 ~12:15 IST, by reading the loader's code. The founder's decision (~12:00 IST, to be recorded as P-322, amending P-304 (2)): capabilities after setup count on the configured checkpoint, but only if it is built by the product's own steps and never written straight into the database. qa checks that once, here.

## What the checkpoint does (`prototype/studio/api/src/demo.ts`, `loadConfigured`, lines 316–446)
It starts from Load sample (the six, `loadSix`). Then it does each DEMO.md row through the same services the screens call, as the person who holds each duty:

| Row | Steps | Service called | Who |
|---|---|---|---|
| 1 | Off-list IMM 5476 copy uploaded, its page recorded, approved | `intake.intake`, `intake.recordPage`, `intake.decideHeld` | author, then a second person |
| 3–4 | Each replayed field-map proposal decided, then the draft applied | `sources.recompare` (when the library moved), `sources.decide` (accept, one edit, one return), `sources.apply` | author |
| 5 | New library items approved | `library.decideLibraryChange` | a second person |
| 9–12 | Release 1 for each combination the rules pass | `studio.submit`, `studio.signoff`, `studio.approve` | author, the immigration expert, a second person |

A step a rule refuses stays undone, and its row shows the rule's own words. A combination with no form is never submitted. Rows 7 and 17 say "not built yet". US$0: saved AI answers only.

## The one shortcut
Before each submit, `seedSampleSources(db, combinationId)` (`api/src/source-register.ts:169`) writes Sample source entries straight into `source_entry` for every published number that has none. It runs only in the demo workspace and only on a Sample (ILLUSTRATIVE) combination. The same function sits behind a Demo control a person can click, `POST /combinations/:id/sources/sample` (`SourceRegister.sample`, author only, refused outside the demo workspace). So it is a Demo step on a product route, not a hidden write. qa counts it as allowed, labelled Sample. A capability about the source register itself (C5.4, C5.5, C5.6) must not count on these entries: it counts on the person's own Add source.

## Not the checkpoint, and not valid evidence under P-322
**Demo › "Start With an LMIA from its reviewed release"** (`releaseWithSources` → `fromReviewedRelease`, `demo.ts` ~127–170) imports the reviewed work-permit release (p3/releases/c1-v3) with `importConfiguration`. It then writes the release straight into the database (`packVersion.create`, `configRelease.create`) and marks its files as in the library (`sourceAttachment.update`). No submit, sign-off or approval runs. So a capability after setup proven only on this With an LMIA release does not count under P-322.

Two of qa's verdicts today used that path for their demo-data walk: **C6.1** (the case opened on With an LMIA's release 1, batch 4) and **C5.4** (With an LMIA's Review and release tab, batch 3). Their packs and CI runs stand. The tech lead ruled (4 Nov ~12:30 IST, P-294 under P-322): both go back to Partial, held by QA-144, and the shortcut is QA-212 (Gap · Major).

## What this means today
On main, the configured checkpoint releases nothing (QA-144, `released: []`). So no capability after setup can count on it yet, until QA-144's slices land. Re-score then: C4.1, C4.8, C10.1 (the tech lead), and every release and case row that P-322 names.
