# Review: M2 "edition in use" (P-32), commit 1a7d63ad8 (branch claude/runtime-edition-in-use)

**Reviewer:** an independent session that did not build this change. **Reviewed:** exactly `git diff origin/main...1a7d63ad8` (6 files), read through `git show` / `git archive` of the commit. The working tree was being edited during the review (forms.ts, render.ts, answer-keys.ts, the test), so its files were not used. **Cost:** US$0, no model call, no server, no :4400, no port 4430–4459.
**Verdict:** Block (in screen-review terms, Ship after fixes). The fill now reaches 11-2025. But the same render change makes the answer-key runner test an older edition's key against the newer edition's boxes. Keys that passed now fail and cannot be fixed, so the release is refused. A wrongly wired older map can also pass.

## The rule: is it right?
* **Yes: one reader rule (`engine/programs.ts:152-156` `pdfMapInUse`), not retiring the old map at release.**
  * Released snapshots are frozen (P-67), and ones already holding both maps can only be fixed by a reader.
  * The edition and its map are shared by every combination using the form (`api/src/impact.ts:64-65`). Retiring at one combination's release would pull the map from the others.
  * Retiring is blocked while in use and needs a different approver (P-52 L3, `decisions/P-52-library-lifecycle.md:13`).
  * Answer keys and their evidence are per edition (`engine/answer-key-gate.ts:27-31,48`).
  * `api/src/studio.ts` changes are additive only (`WAY-OF-WORKING.md:39`).
* **No release gate should refuse two mapped editions.** That is the normal state after impact review, and the rule makes the choice deterministic.
* **The rule itself is sound:**
  * It picks the newest printed month and year (`editionMonth`), so "12-2021" counts as older than "11-2025" even though it sorts later as text.
  * On a tie it takes the later map in the snapshot's order, and the snapshot is sorted by `compareEditions` (`engine/snapshot.ts:157`).
  * The result does not depend on the order of the list, which matters for older snapshots.
  * Online maps are excluded.
  * A label with no readable date sorts oldest, the same as `compareEditions`/`newestEdition`. The intake always builds `CODE (MM-YYYY)` and holds a file with no readable date as "not newer" (`api/src/intake.ts:343`), so that case is acceptable.
* **Forms tab:** behaviour is unchanged. On sorted snapshots `pdfMapInUse` gives the same map as the old `.at(-1)`, and the Online branch still falls through to `.at(-1)` (`api/src/workspace.ts:72`).
* **Render on an Online line:** coverage moves from the oldest PDF map to the newest. That matches what `writeForm` fills for the not-for-filing copy, so it is not a regression.
* **P-67:** a copy is filled from the case's pinned release (`api/src/fill-case.ts:241`). A release holding only 11-2021 still fills 11-2021 (check 12).

## Issues, ranked
**B1. Blocker (Must): the answer-key runner mixes editions.**
* **Where:** `engine/answer-keys.ts:310` takes the key's own edition map `m` (11-2021). But `:320` `formCoverage` (`engine/runtime/forms.ts:20`) calls `render`, and render now uses `pdfMapInUse` (11-2025, `engine/render.ts:115`). Then `:329` `formValues(s, m, inv, cov.boxes)` writes from the coverage boxes (`engine/form-values.ts:32-46`).
* **My probe:** real IMM 5476 inventories, both maps, Client A. Script: `/tmp/claude-0/-home-user-xpatready/9be83169-3abc-5bee-9f64-714e887bafd9/scratchpad/probe/keyprobe.mts`.
  * A correct 11-2021 key: on origin/main it PASSED; at this commit it FAILED with "Unnamed form field: expected nothing (not in the key), got '1990-01-01'". That box exists only on 11-2025.
  * With a wrongly wired 11-2021 map, the key's failure is about the 11-2025 box, not the wiring. The 11-2021 map is never really tested. The break report shows it passing when the two editions share their boxes.
  * On origin/main the mirror image held: the 11-2025 key failed.
* **Why it blocks:**
  * The fix is impossible: `checkExpected` refuses the 11-2025 box for an 11-2021 key (`engine/answer-keys.ts:200`), and the advice "add it to the key or fix the field map" points nowhere.
  * A failing key refuses every release, a Demo release too (`engine/answer-key-gate.ts:57-59`). So a combination whose 11-2021 map had a key cannot reach the scenario's release step.
  * A false pass becomes signed release evidence.
* **Fix:** give `formCoverage`/`render` the key's edition. `runFieldMap` passes `m.form_edition`; every other caller keeps `pdfMapInUse`.
* **Test:** add a pass and a fail. Pass: an 11-2021 key is correct on its own map while the release holds both editions. Fail: a wrongly wired 11-2021 map fails on its own box.

**M1. Major (Must): `fieldsOpen` has no failing test.**
* Reverting `api/src/fill-case.ts:96` to "first map" still gives 12/12 (mutation run on the exact commit).
* This is the case's list of mandatory fields left open. It changed behaviour with no proof, and the brief asks for a pass and a fail per reader.
* **Fix:** two checks. With both editions, the open fields are 11-2025's (for example a box only it has). With only 11-2021, they are 11-2021's.

**m1. Minor (Should): the "online map is never the PDF edition" check is vacuous.**
* `tests/check_edition_in_use.ts:33`: the online label "IMM 5476 online (2027)" has no month, so `editionMonth` is -1 and the old map wins anyway.
* Removing `m.channel !== "ONLINE"` from `pdfMapInUse` still gives 12/12.
* **Fix:** give the online map a newer dated label, for example "(01-2027)".

**m2. Minor (Should): the Forms tab change is untested.**
* Reverting `api/src/workspace.ts:72` gives 12/12. It does not change behaviour on sorted snapshots, so one check on an unsorted list (the newest listed first) is enough.

**m3. Minor (Should): the Channels view does not use the shared rule.**
* `engine/channels.ts:161` takes `versions.at(-1)`. It agrees with the rule on built snapshots; use `pdfMapInUse` so there is truly one rule.

**m4. Minor (note): lock judges the case's current trial, not the copy's edition.**
* `api/src/fill-case.ts:295` checks `trialOf` on the case's current snapshot, and `FormInstance` stores no edition.
* A copy filled from 11-2021 before this deploy, on a two-edition release, would be judged by 11-2025's trial.
* Theoretical today: no IMM 5476 trial is recorded in `samples/fill-trials.json`. This predates the commit; recording it only.

**m5. Minor (acceptable as is): the answer-key fallbacks with no edition.**
* `api/src/answer-keys.ts:44-45` `fieldListOf` and `engine/answer-keys.ts:152,187,284,310` `pdfMap` still fall back to the first (oldest) map when no edition is named.
* Acceptable: the editor always sends the item's edition (`web/src/components/answer-key-editors.tsx:273,293`), the gate is per edition, and a mismatch fails in words (`engine/answer-keys.ts:312`).
* Optional: default to `pdfMapInUse` so an API-only key with no edition lands on the edition in use.

**Not from this commit:** on an Online line, coverage shows the PDF edition while the Forms tab shows the online version. That already held on origin/main (with the oldest PDF edition).

## Tests and suites (re-run on the exact commit, scratch copy outside the repo)
* **The new check:** `check_edition_in_use` passes 12/12.
* **Readers reverted one at a time:** `fill.ts` gives 1 fail, `trialOf` 1 fail and `render.ts` 1 fail. `fieldsOpen` gives 0 (M1) and `workspace.ts` 0 (m2).
* **The rule mutated:** a strict ">" tie gives 1 fail and text order 1 fail. Dropping the online filter gives 0 (m1).
* **Engine suites:** `check_engine` 43/43, `check_vv_prepare` 32/32, `check_line_holders` 19/19.
* **Typecheck:** no type errors in the 6 changed files. The errors elsewhere are in other tests.
* **Not re-run:** the server suites (in progress elsewhere), and `check_case_engine` (no file by that name in tests/).

## D1–D20 (1–5; the change has no screen of its own)
D1 Requirement fit 3: P-32 now holds for the fill, coverage and trial, but the release step breaks (B1) · D2 Data integrity 3: signed key evidence can be false (B1) · D3 Reuse 4: one shared rule, except the Channels view (m3) · D4 Rule integrity 3: key runs mix editions (B1) · D5 Stability and recovery 3: a failing key cannot be fixed · D6 Freshness and governance 4: no change · D7 AI trust: not applicable · D8–D14: no UI change, not walked · D15 Speed 5: one pass over the maps, 2.9 s for 12 checks including two real fills · D16 Testability 2: two readers and the online exclusion have no failing test (M1, m1, m2) · D17 and D20: simulated only · D18 Provenance 4: the edition shown is the one filled · D19 Closure 2: new edition, release, case fill is broken at release when the old edition has a key.

**Graph (P-86):** not run. The change adds no element, page or route, and running `graph.mjs` rewrites `qa/GRAPH.md`, which this review must not edit.
**Could not check:** the browser walk, keyboard, 1024 px and 200 % zoom (no server allowed on the runtime ports), the server suites, and an intended user's walk.
**Journey test:** `journey-test-reviewer-2026-11-03.md`, **5.5/10, fail** (error recovery 0, from B1).

**Verdict: Block.** To fix: B1 (the runner reads the key's edition, with a pass and a fail), then M1 (`fieldsOpen` pass and fail). m1–m3 are cheap and should go in the same push.

## Round 2 (1641a7137)
**Scope:** only `git diff 1a7d63ad8..1641a7137`, re-run from a `git archive` of 1641a7137 in a scratch copy. US$0, no server.
* **B1 fixed:** `runFieldMap` passes the key's own edition (`engine/answer-keys.ts:322`) through `formCoverage` (`engine/runtime/forms.ts:18-21`) to `render`'s `editions` (`engine/render.ts:118-119`). That is the only caller setting `editions`; all others keep `pdfMapInUse`. My round-1 probe now gives: a correct 11-2021 key PASSES with both editions held; a miswired 11-2021 map FAILS on its own box; a correct 11-2025 key PASSES.
* **Also fixed:** M1 (`fieldsOpen` pass and fail, Sample lists in git-ignored `studio/var`, removed after), m1 (the Online check uses "(01-2027)"), m3 (`engine/channels.ts:161` uses `pdfMapInUse`), and breaker m2 (the refusal names the edition in use, `api/src/fill.ts:46-49`).
* **Every rule removed fails a check:** the key's edition 2, `render` ignoring `editions` 2, `fieldsOpen` first map 1, the Online filter 1, `channelsView` first map 1, the refusal without the edition 1.
* **Suites:** `check_edition_in_use` 20/20; `check_engine` 43, `check_gcore_engine` 130, `runtime/check_case_engine` 69, `check_vv_prepare` 32, `check_line_holders` 19 (all green); no type errors in the changed files. Database and server suites not re-run (the builder reports them green).
* **Still open, accepted:** m2 (Forms tab untested: same as before on sorted snapshots, named in the PR); m4 and m5 are notes.
* **Journey score, re-scored:** J3–J5 now hold. 9/10, pass: ½ each for accessibility and visual quality (no UI change, not walked), 1 for every other criterion.

**Verdict: Approve** (1641a7137).
