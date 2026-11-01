# Review: C1.6 filing method in the combination header (commit d7a2c84f)

Reviewer (did not build it), 31 Oct. Branch `claude/screens-c16-header`, diff `origin/main...d7a2c84f`: `web/src/pages/combination.tsx` +3 lines, new `tests/check_c16_header_browser.cjs`, two screenshots. Isolated copy `screens_rev3` on :4446 (fresh database, sample loaded), Chromium `/opt/pw-browsers/chromium`, US$0. No tracked file was rewritten.

## Concept fit
* Screen 03 concept §Layout asks for "one muted facts line (release, draft changes, filing method, portal, people, Sample)". The facts line now ends "… · filing: PDF only" (or "Mixed: PDF and paper", etc.), from `summary.filing` = `filingKind()`, the same function and words as the Forms tab strip (`workspace.ts:91`) and the Programs API (`programs.ts:223`). BR-6 (worked out from the lines, never typed) holds: there is no input for it.
* Said only when a non-checklist line is on the combination; a combination with no forms says nothing (vv.single), never a guess.

## Checks run
* Builder's check, copied to /tmp: **8/8** on a fresh copy. Run again on the same database: **6/7** (see m2).
* Graph (`graph.mjs`): G1 0 · G2 0 · G3 2 · G4–G6 0; C1.6 is named by tests (12). No new page or route.
* Rule-removal: deleting the new line fails steps 1 and 3; dropping its condition makes vv.single read "filing: No forms yet" and fails the "says nothing" step. The test guards the rule.

## Journey test (reviewer, scored)
Journeys: J1 content publisher opens With an LMIA (wp.family) and reads how it is filed; changes IMM 1295 to Paper **in the Forms tab UI**; reloads; changes it back. J2 approver (user-B) reads the same page. J3 widths 400 / 1024 / 1440 and 200 % zoom at 1024 (512 css px). J4 empty combination. J5 break: every line Not needed.
* J1: header "filing: PDF only" in 0.6 s; after the UI change the header updated without reload in 0.9 s to "filing: Mixed: PDF and paper", draft count "1 draft change", Forms tab strip said the same words with detail "(PDF uploads + paper forms)"; held after reload; reverting gave "PDF only" and "draft matches the release". Summary API agreed each time.
* J2: approver sees the same line (read-only data; nothing to enforce on the server for a derived label).
* J3: no sideways scroll at any width or at 200 %; the line wraps cleanly (400 px screenshot); axe WCAG 2.2 A/AA clean at all three widths; no console or page errors.
* J4: vv.single facts line has no "filing:".
* J5: with every data line set Not needed (database write; the UI only offers Not needed when the library records the account asks it itself) the header says **"filing: Checklists only"** (m1).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 header names the method, all states |
| Next step obvious | 1 | informational; next-step card unchanged |
| Plain words | ½ | m1: "Checklists only" for forms the account asks itself |
| Feedback and state | 1 | header follows a channel change in 0.9 s without reload |
| Correct data | 1 | header = summary API = Forms tab in every step |
| Error recovery | 1 | reload holds, revert restores "PDF only" |
| Accessibility and sizes | 1 | axe clean 400/1024/1440, 200 % no sideways scroll |
| Speed | 1 | 0.6 s to the line, 0.9 s after a change |
| Visual quality | 1 | one muted line, same style as people:, wraps cleanly |
| Trust and sources | ½ | the header's method is derived from Sample channels; the Forms strip says "Sample until the immigration expert confirms", the header does not (the concept puts "Sample" in the line only for illustrative combinations, so not raised) |

**Journey score 9/10, pass** (no 0). Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder).

## Findings
No Blocker, no Major.
* **m1 Minor, Should** `combination.tsx:82`: the condition is `!f.document`, but the comment says "said only once a form that is filed is on it". When every data line is Not needed, `filingKind` returns "Checklists only" and the header prints it; the forms are not checklists. Fix: also require `f.channel !== "NOT_NEEDED"` (then the header says nothing, as for no forms), or let the engine word that case ("Nothing to file", as `filingMethod` already does). The Forms tab strip prints the same engine words, so it is a one-place engine fix if chosen.
* **m2 Minor, Should** `check_c16_header_browser.cjs:45`: the check changes IMM 1295 to Online by SQL and never restores it, and step 1 expects "PDF only", so a second run on the same copy fails (6/7). Restore the line at the end (or read the baseline from the API). It also changes the channel by SQL, not the Forms tab; my J1 covered the UI path and it holds.
* **m3 Minor, Should** order: the concept lists the filing method before people; the line puts it after people. Move the entry above `people:` to match the concept.
* Note, not a finding of this item: the concept's line also lists "portal"; it is not in the facts line (the Forms tab shows the IRCC account). Pre-existing; for the lead's list.

## The builder's two questions
* **Programs card:** agree with not adding it. Board v4 notes (§7 "Card": "five things only … Gone from the card: … facts line") are the founder-agreed card; C1.6's "Programs row" wording now conflicts with it. Settling that is the tech lead's / founder's (AGENTS.md rule 2), not this PR's; the PR should carry the question. Not a finding.
* **`FilingLine`** (`components/channels.tsx:45`): it was already unused on origin/main before this commit (git grep finds only its definition), so "now unused" is not quite right. Dead code: delete it here or in the next screens item; not blocking.

**Verdict: Approve** commit d7a2c84f (no open Blocker or Major; m1–m3 are Should-fix Minors for a follow-up or this branch).

## Re-check at 44058fd6 (after b4c3a7b9 and a screenshots-only commit)
Fresh copy `screens_rev3` on :4446, the builder's check copied to /tmp (screenshots to /tmp), the same journey script as above; copy stopped and no tracked file rewritten afterwards.
* **m1 fixed** (`combination.tsx:82`): the condition is now `!f.document && f.channel !== "NOT_NEEDED"`. With every line set Not needed, the header has no "filing:" (J5 re-run). The check's new fail step covers it.
* **m2 fixed:** the check records each line's channel and signature and puts them back, with two steps that prove it. Run twice on one copy: **11/11, then 10/10** (the second run skips the sample-load step). Nit, not blocking: the `string_agg` comparisons have no `ORDER BY`, so they depend on the database returning rows in the same order; adding `order by id` would make that certain.
* **m3 fixed:** the line reads "… cases opened outside Canada · filing: PDF only · people: …", and the first step checks the order.
* J1 to J4 re-run: the header updates in 0.9 s after a Forms tab channel change, survives a reload and reverts cleanly; the approver sees the same line; axe is clean at 400/1024/1440 px; no sideways scroll at 200 %; no console errors. The journey score rises to **9.5/10** (plain words now 1; trust and sources stays ½ for the reason above).
* `FilingLine`: agreed to leave it and list it in the PR (dead code from before this item).

**Verdict: Approve** commit 44058fd6 (no open Blocker, Major or Minor).
