# Lead check — W1-15 slice 3, Documents tab

**29 Oct · Lead (Mac, eighth chat) · runtime branch at 740ef734 (code dfd1a018) · verdict PASS with two minors → founder early look, then Lead PR**

## What was checked
* **Diff against `main`** (28 files): `api/src/person-checklist.ts` (each person's checklist, Move up or down, Undo of the author's own removal), `engine/sources.ts` `checklist()` (lines per role from the engine, what each supplies about whom, taken out of the questionnaire), `engine/snapshot.ts` `effective(…, heldRetires)` (a removal saved in the draft stays out of the published view until a release), `studio.ts` alternatives (library types only), migration (two nullable columns, expand only, rollback written), `web/src/pages/workspace/documents.tsx`.
* **Against board v2 frame 3 and P-147:** person chips with counts, All · Always · Only if · Needs you, find, rows of five (Document · Who · When · Supplies · Status), ⋯ menu, drawer (who and when, alternatives, facts supplied with about whom and taken out), Remove from checklist with Undo, Edit. Matches.
* **Capability or Scaffolding (P-33):** all Capability (the author's Documents tab); values Sample.
* **Checks rerun by the Lead on the exact commit (isolated copies, ports 4421–4422):** `check_w115_slice3.ts` 31/31, `check_w115_slice3_browser.cjs` 32/32. Lane's full run-suites on dfd1a018: 64 pass, one timing failure under load (`check_w1_programs_s2`, 87/87 twice alone); CI on the Lead PR reruns everything on the merge result.
* **Release path:** a released removal supersedes its predecessor for documents, rules and forms (`studio.ts` release), so a removed line does not come back after release; the end-of-release equality check rolls back any difference.

## Minors for the runtime lane's next FIX (with QA-84, QA-85, QA-91)
1. `effective(…, heldRetires = true)` is also used for checks, but the release's "retired row released" step covers documents, rules and forms only. No path retires a check today, so nothing is wrong now; add `tx.check` to that step so a future check removal cannot come back after a release. One test.
2. The drawer lists the line's own document under "Alternatives · any one counts" and then says "No alternative". Show only real alternatives, or "None yet: set one in Edit". Also "Imported release" in the drawer header: plain words ("From the sample setup").

## Next
Founder early look (screenshots `screenshots/slice3/01–05` at 1440 and 1024), then the Lead PR. Not before: the two minors may ride with the FIX pass.

## Founder early look
**Go (29 Oct)**, with the two minors above; the runtime lane fixes them with QA-84, QA-85, QA-91, then the Lead merges the branch by Lead PR.
