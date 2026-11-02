# G-CORE B2 review (rows C11.13, C11.14; QA-167): independent, fresh context

Commit reviewed: `e6f127335165784c29239b5c62b1a74d809f89c1` (branch `claude/hopeful-hawking-5rymj8`) against origin/main `d98041e7`. Isolated copy `rev_b2` on :4458 (stopped after); live AI untouched; :4400 untouched. Concept v2 §3 BR-1…BR-7, §4, §6; P-266, P-253, P-96.

**Verdict: Block** (one Major, below). Everything else is sound and the fix is small.

## What I ran
* `check_gcore_b2_door.ts 4458 xr_studio_rev_b2`: **44 PASS 0 FAIL** (matches the builder).
* Regression on a freshly reset copy: `check_s6_library_sources` 40/40, `check_c119_library_items` 70/0, `check_c119_acceptance` 23/23. `vite build` OK (1.5 s).
* QA-167 by hand: `PATCH /library/fields/person.date_of_birth/name` as user-A answered **202** `{applied:false,status:"WAITING",tier:"second_person"}`; the name was unchanged. Fixed.
* Races by hand: 3 parallel renames of a released field gave one 202 and two 409 "Already exists" (the `library_change_one_open` index, no 500). Two parallel Undos: one applied, one 409 "rolled back at the same moment", 2 rolled_back / 5 applied rows, state consistent.
* Browser (Chrome, 1024 px and 512 px = 200 % zoom): rename dialog and the approver's page. Axe WCAG 2.2 A/AA: 0 violations on both; no sideways scroll; keyboard Enter opens the dialog, focus lands inside, Esc closes; no page or console errors. Panel is a region with a heading, plain lists, refusal in an `alert`.

## Blockers
None.

## Major
**M1. A withdrawn or returned rename (and a rejected merge) leaves its change set "waiting" forever, so the field page lies and Undo disappears.**
* Nothing sets the change set to `withdrawn`/`returned`: the type lists them (`api/src/change-sets.ts` `ChangeSetStatus`) but `grep "changeSet\."` finds writes only at `forms.ts:377` and in `rename-door.ts`. `withdrawChange` (`library-changes.ts:173-181`) and `decideChange` return only touch `library_change`.
* Evidence (database after the run): `select cs.status, lc.status ... join` gave `waiting|WITHDRAWN|1`, `waiting|WAITING|3`; after returning a rename: `RETURNED|waiting`. A rejected merge is the same path (`forms.ts:385` never touches its set).
* Effect users see: `GET /change-sets/renames/field/person.biometrics_required` (withdrawn rename) still answers `{"status":"waiting",...}`; `latest()` (`rename-door.ts:158-165`) picks the newest set in `applied|waiting`, so the field page says "Renaming to ... waits for a second person on To review" for a rename that was withdrawn, and the older applied rename's **Undo rename** button is hidden (BR-6 not reachable). The made-by record (BR-5) also keeps a dead "waiting" row.
* Fix: set the set to `withdrawn` / `returned` (merge: `returned`) in the same transaction as the library_change / field_merge status change; `latest()` keeps its filter. Add a test per path (withdraw, return, reject merge: set status and `latest` answer).

## Minor (fix with M1 if cheap; none blocks alone)
* **m1. Codes in UI text (concept §5: names, never codes).** The panel's Rules line prints the raw key: "Check OR_PASSPORT_PAGE_FACTS · ..." (`ChangePreview.tsx` Rules group). The approver's page shows "Name now: person.date_of_birth" and "Reason: Rename "person.date_of_birth" to ..." when the name was never confirmed (`rename-door.ts:83` uses `cur.shown`, which falls back to the key); the panel's before reads "Date Of Birth" while the dialog title says "Date of birth" (two derivations of the same name).
* **m2. Same-name rename accepted by the API.** `PATCH ... {"name":"person.family_name"}` on a field already shown as that name answered 202 and opened a "Rename X to X" approval. The UI blocks it; the door should refuse a no-change rename in words (R1/R3 table).
* **m3. Approval of a rename sends no `expected`.** Concept BR-3 asks the three hosts to send it; the rename approver page shows the panel but the approve call does not (`review-items.tsx` `RenameChange`; the approve URL has no `expected`). The approval re-check (`rename-door.ts:103-113`) still covers name, retired/merged and rules, so no unchecked write; only the open-case count can change unseen. Acceptable for the prototype; say so in the PR.
* **m4. Direct rename is checked outside the transaction and written without the item lock.** Three parallel direct renames of an unreleased field all answered 200 and only the last name stands (before-images all point at the first state); no 500, no duplicate, but a silent lost update. The old code had the same property and the database index still backs R3, so Minor. `rename()` also skips `lockItem`/`refuseRetired` (`studio.ts:555`) inside its transaction, so a retire approved at the same instant is not seen.
* **m5. Loose test branches.** `check_s6_library_sources.ts` accepts `status === 200 || 202` for the "other group" rename and `if (r.status === 202)` approves the section only when it waits, so a section that wrongly applied directly would still pass there. `check_gcore_b2_door.ts` covers the section tier on its own, so the rule is still held.

## The builder's questions
1. **Released sections wait (engine `riskOf`).** Defensible, and the safer side, but P-266's text says "every other rename ... stays direct", which read literally makes a section rename direct. P-253's table ("anything in a released combination") supports waiting. This is a decision-text conflict, not a defect: the builder asked, and it is not silent. Ask: the tech lead records one line in DECISIONS (sections wait, or are direct) before merge; if direct, change `riskOf` for `section` renames only. Not a blocker for this review.
2. **`PATCH /library/fields/:key` (meaning/value type) and aliases outside the door: out of B2 scope.** Concept §1 and §3 BR-1 name only rename, merge and `decide` as doors; BR-4's "meaning change needs a second person" is a tier row, not a B2 handler. `studio.ts updateField` cannot write a name (it changes meaning, value type, note only), so QA-167's rename hole is closed. P-96 keeps aliases direct and logged. Record the meaning-change gap in the backlog for M3; not a finding.
3. **Approved rename's change is set to RELEASED at approval.** Acceptable: it is the same device as an approved delete and a form's retire (`lifecycle.ts` afterApprove) and frees `library_change_one_open`; the decision note says it goes out with the next release. Side effect to know: `released_in` stays empty. Not a defect.

## Test changes: legitimate, not weakened
`check_s6_library_sources.ts` and `check_s6_library_pages_browser.cjs` now assert the new P-266 behaviour (202, name unchanged, second person approves, then the same end state: version v+1, DRAFT, listed name, audit line in words) and add Undo. The old "direct" assertion for a released field is replaced, not deleted; direct renames remain covered for unreleased fields (`check_gcore_b2_door.ts` "P-96 pass"). Only the looseness in m5 should be tightened. The browser `.cjs` still hard-codes `/opt/homebrew/.../psql` and was not runnable here; I walked the same dialog by hand instead.

## Concept fit (B2 slice)
* BR-1 one door: rename handlers call `Renames.rename` (`library-sources.ts`), merge propose/approve call `sets.guard` (`forms.ts` proposeMerge, approveMerge), no `revise` left in `library-sources.ts`. The scan test is a text match (a comment would satisfy it) but the behavioural tests (QA-167, stale, refused at approval) would fail without the door. Met.
* BR-2 re-check at approval: `lifecycle.ts` `checkApprove` (before `decideChange`) and `afterApprove`; `screen02.ts:126-130` resets APPROVED to WAITING when applying throws, so a failed apply writes nothing and still waits (tested: "approving it is refused in words, nothing changed, it still waits"). Met. The 202 is correct for "accepted, not applied" and handled by the web client (toast text differs by `applied`).
* BR-3 panel: sections, forms, rules, combinations, releases, open cases, before → after, "Not checked" line, tier words, stale "Look again" (409) with fresh check. Met.
* BR-4 tier by risk (second person for released use; direct otherwise): met (see question 1 for sections). BR-5 made-by: recorded and shown ("Made by a person"); the made-by chip on library rows from the concept is not built (the panel and record are). Treat as B3/M3 with the AI marks, or confirm; not raised as a finding.
* BR-6 roll-back: exact restore of `label` and `labelChecked` held (test "back exactly (label and its unconfirmed mark)"; my race run restored correctly); a newer change, a taken name, a double undo and a missing duty are each refused in words; released field's undo waits for a second person. Blocked in practice only by M1 hiding the button.
* BR-7 held seam: no create endpoint added; `noFreeAdd` moved to `no-free-add.ts` and re-exported, 410 unchanged (`check_s6_library_sources` green).
* Migrations: none new in B2 (uses the B1 table). Data kept.

## D1–D20 (short)
Only the dimensions this slice touches are scored; the rest are not in B2.
D1 concept fit 4/5 (M1, no row chip) · D2 correctness 3/5 (M1) · D3 data integrity 4/5 (m4 lost update) · D4 concurrency 4/5 (index guards hold; m4) · D5 authorisation 5/5 (author duty, second person, 401/403 verified) · D6 errors in words 4/5 (m2) · D7 accessibility 5/5 (axe 0, keyboard, 200 % zoom) · D8 words and copy 3/5 (m1 codes) · D9 test strength 4/5 (m5, text scan) · D10 retrofit mapping: old renames are mapped to the new tests in the diff (met). D17 and D20: simulated only; no intended user walked it.

## Journey test (reviewer): 7.5 / 10 (pass needs 8, no 0)
Journeys walked by hand in the browser at 1024 and 512 px: author renames a released field (dialog, panel, "Send for approval"); approver reads the rename and its panel; refused duplicate name; stale panel; withdraw/return then page state; Undo; wrong role by direct URL/API.
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 202 then approval applies; QA-167 fixed |
| Next step obvious | 1 | button reads "Send for approval" when it waits, "Rename" otherwise |
| Plain words | 0.5 | m1 codes and casing |
| Feedback and state | 0 → 0.5 | the field page keeps "waits for a second person" after a withdraw (M1); counted ½ because the toast and 202 words are right |
| Correct data | 0.5 | names, audit and before-images right; stale "waiting" change set (M1), lost update (m4) |
| Error recovery | 1 | duplicate, stale, taken name, double undo all refused in words, nothing written |
| Accessibility and sizes | 1 | axe 0, no sideways scroll at 512/1024, Esc and focus right |
| Speed | 1 | panel in about 1.5 s with a 300 ms debounce; no row-by-row calls |
| Visual quality | 1 | team look, dialog readable (screenshot seen) |
| Trust and sources | 0.5 | tier and made-by said; the rename approval shows keys in places (m1) |
Raising it: fix M1 (+0.5 feedback, +0.5 data) and m1 (+0.5 words) gives 9. Not tested: a real screen reader; the founder's unaided walk.

## Not checked
The browser suite `check_s6_library_pages_browser.cjs` (Mac psql path); the GRAPH report (I may write only this file, so I did not run `graph.mjs`; the new routes `POST /change-sets/:id/undo-rename`, `GET /change-sets/renames/:kind/:key` are covered by `check_gcore_b2_door.ts` by name); merge reject path by running it (inferred from code and the database).

**Verdict: Block.** Fix list: (1) M1, set the change set to withdrawn/returned on withdraw, return and merge reject, with tests; (2) m1 codes in the panel and review page; (3) m2 refuse a no-change rename; (4) tighten the loose branches in m5; (5) the tech lead's one-line ruling on sections (question 1). Re-review the new commit; the rest may stay as is.
