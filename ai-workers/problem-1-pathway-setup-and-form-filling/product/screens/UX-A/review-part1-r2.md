# UX-A part 1 re-review: one definition per count (commit a8715173, merged as 6446a2db)

Reviewer agent (did not build it), 2 Nov 2026. I checked `a8715173` on `claude/friendly-davinci-dfsq83` against `origin/main`. Mid-review the builder merged main in (`6446a2db`; the only hand-resolved hunk is the `combination.tsx` imports), so this verdict is on **6446a2db**. The merge brings no change to any file this row touches except that import line and the new Tests tab, which sits in the same tablist.
Earlier round: `review-part1.md` (Block on M1, m1–m8) and `break-report-part1.md` (B1–B3 Major, B4–B6 Minor). Spec: BACKLOG row UX-A (P-273), finding 1 of `screens/UX-baseline-2026-11-02/findings.md`. There is no `concept.md`, so the row's Done-when is the bar.
Run: isolated copy `rev_uxa1b` on :4446, restarted on the merged API, with the web build already in the checkout (not rebuilt). `POST /api/demo/load` as user-A. US$0: no live AI, no priced button. Journey test: `journey-test-reviewer-2026-11-02-part1-r2.md`, **8.5 / 10**.

## Verdict: Block

All of the earlier findings are fixed. The fix for break 3 brought in one new Major (N1): a form a second person approved in the product (P-80) no longer appears anywhere on the Forms tab, and an existing check now fails because of it.

## Earlier findings: status on the running app
| Item | Status | Evidence |
|---|---|---|
| **M1** release words | **Fixed** | Visitor visa draft problem: "Nothing to release yet: no form is set up on this combination and it has no documents…" (`api/src/studio.ts:79`). The browser check's pass and fail cases both hold. Nothing in api/engine/web still says "has no forms". |
| **B1** a role no Sample family holds | **Fixed** | LMIA with Spouse max 0: the summary says 259 = chips 135 + 109 + 15. The Overview tile reads "Principal applicant 135 · Child 109 · Representative 15". Fact-sources 224 = 96 + 16 + 97 + 15. The Child chip is present. See n1 for a side effect. |
| **B2** removed, then released | **Fixed** | LMIA: I removed IMM 1295, submitted (user-A) and approved (user-B) as Release 2. The summary then said 7 / 7, the Forms tab "7 forms", with no pending row and no "Add 1 form from the library". `POST /forms {"formKey":"IMM 1295"}` brings back 8 / 8 and 377 questions. |
| **B3** tab rows vs count | **Fixed for library files** | 6 parallel attaches of IMM 5409 still create 2 attachments (the older race in `sources.ts:130-157`, out of this row). The count says "3 forms · 0 set up" and the tab draws 3 rows: "2 can be added…; 1 needs reading". **But see N1.** |
| m1 tips name the steps | Fixed | AX tree: "Forms 4 to do", with the description "4 setup items open on Forms (Official pages, Who can be in this application, Forms)". It is reachable by keyboard in 12 Tab presses at 720 px. The Before forms panel names the same steps on screen. |
| m2 two kinds of "problems" | Fixed by wording | The tile reads "no rule or check problems" next to the badge "1 to fix". The rest goes to part 2. |
| m3 second computations | Fixed | LMIA footer: "143 questions for Principal applicant" = the chip (`questionnaires.tsx:428`). The facts line uses `personFactRows` and gives 120 (22), the same as the dialog. |
| m4 forms total | Fixed | `counts.forms` = `forms.onCombination` = the card's `forms.length` (`programs.ts:233`). |
| m5 loading or failed | Fixed in code | The filing line says "counting forms…", or on failure "forms count not loaded" with Retry. I could not make the summary fail live. The finder line has no failure state (n2). |
| m6 memo | Fixed | Keyed by snapshot `sha256` and day. A people change recounts (B1 run). Catalogue warm 9–12 ms, LMIA summary 56 ms. |
| m7 labels | Fixed | Every step reads "UX-A1: …". |
| m8, B4–B6 | Listed as follow-ups | Minor, so acceptable as listed. n1 makes B4 worse in one state. |

## Blockers
None.

## Majors
**N1. A form approved in the product (P-80) is attached, but the Forms tab no longer shows it. It cannot be read or drafted from there, and `check_forms_demo.ts` now fails.**
* *Reproduced:* demo Visitor visa. I uploaded a byte-different IMM 1344 (the `check_forms_p80_guard.ts` method), recorded its IRCC page, and user-C approved it. The response said "Attached to Visitor visa", and the attachment is `kind: Form, recognised: false, status: RECOGNISED`, "Next: read the form on this computer, then AI drafts its field map".
* The Forms tab shows only IMM 5257 and IMM 5707. IMM 1344 is not in the rows and not in the Sources line (screenshot `vv-p80-forms.png` in my scratch folder). The count also stays at "2 forms · 0 set up".
* *Existing check broken:* `tests/check_forms_demo.ts:76-77` looks for `tr[data-attachment=<approved copy>]` → "Read form". Run on a fresh :4446 copy, it fails with "locator.click: Timeout 30000ms exceeded" right after the SC-3 step. Every earlier step passed.
* *Cause:* `contracts/counts.ts:46` skips `recognised === false`, and `web/src/pages/sources.tsx:81` now uses that rule. Before this commit, `pendingForms` listed every `kind === "Form"` attachment. Break 3 asked for one rule, and the fix took the narrower side. `recognised: false` is not "unrecognised": `sources.ts:138-145,157` gives `kind: "Form"` only to a manifest file or one approved in the product, and an unrecognised upload is `kind: "Unrecognised file"`.
* The rules check bakes in the wrong rule. Its fixture `{ kind: "Form", recognised: false, edition: null }` (`tests/check_uxa1_counts_rules.ts:32,37`) is a state the intake never writes.
* *Fix:*
  * Count and list every `kind: "Form"` attachment in `attachedNotSetUp`, on both sides: drop the `recognised` clause, so the count includes the approved form too, which is what P-80 promises ("drafted like an official one").
  * De-duplicate by `edition ?? officialFile ?? id`, not `edition ?? ""`, so forms with no edition do not merge.
  * Make the rules check's fail case an approved-in-product form, which is one waiting form.
  * Add a browser step: after approval, the tab shows the row and the count includes it.
  * Run `check_forms_demo.ts` before asking again.

## Minors (fix or list in the PR)
* **n1 (made worse by the B1 fix).** In LMIA with no spouse, the Preview says "Principal applicant · 136 questions" above "The same count as the Questionnaires tab", while the Questionnaires chip says 135 (`web/src/pages/workspace/preview.tsx:117`). The Preview has no single-parent family, so it cannot show the Child that every other count now includes. Before the fix both said 136. Same class as B4: either give the Preview the same household (`largest()`), or say the Preview is per family and drop "the same count" when they differ.
* **n2.** If the summary fails, the finder line keeps "Counting the forms on this combination…" with no end (`finder.tsx:151`). Only the filing line offers Retry.
* **n3.** The Questionnaires footer still says "from the largest Sample family the combination allows" (`questionnaires.tsx:541`). After B1 the household can be one no Sample family holds.
* **n4 (records).** The PR's first line should name the contract changes: `SetupInput.forms.onCombination`, `WorkspaceView.forms.removedEver`, and the new helpers in `contracts/counts.ts`.

## Regressions looked for (none found apart from N1 and n1)
* **removedLines, used by programs.ts and workspace.ts.** Both read line versions newest first (`programs.ts:128`, `workspace.ts:64`). LMIA's history already carries a removed IMM 5802 (`removedEver: ["IMM 5802"]`) and the count is unchanged at 8. Adding a removed form from the library brings it back on every surface.
* **largest().**
  * Only `questionCounts` and `questionnairesView` call it. Coverage and the Preview keep their own households, so no validation or release result moved: the default LMIA count is still 377 = 143 + 110 + 109 + 15.
  * Couple and alone are unchanged (rules check). The Visitor visa and LMIA defaults are unchanged.
* **EMPTY_WORDS.** `check_f8_empty_release.ts` was updated. `check_screen01_browser.cjs` was updated for "no rule or check problems".
* **Tab tips.** Each tip sits in a `hidden` span outside the tab, referenced by `aria-describedby`. That is valid: axe is clean on every tab, and the name still equals the visible text (2.5.3). With the merged Tests tab there is no sideways scroll at 400, 720 and 1024 px.
* **Checks.**
  * `check_uxa1_counts_rules.ts`: 16/16.
  * `check_uxa1_counts_browser.cjs`: 47/47, twice. I ran a scratch copy with screenshots sent to scratch, so no repo file changed.
  * No console or page error.

## D1–D20 (only those this row moves)
* D1 4: the row is met except N1.
* D2 3: N1 drops an attached, approved form from a capability path (C2.3/C3.1 on the Forms tab).
* D3 4: one contract, and the rule is now wrong in one place.
* D5 4: n2.
* D9 5: m1 is fixed.
* D10 5.
* D11 4.
* D13 5.
* D15 5: memoised.
* D16 3: the rules check encodes N1, and no step covers P-80.
* D17 and D20 are not scored: simulated only.

## Not checked
* A real screen reader, touch, and an intended user's unaided walk.
* The summary failing live (m5 was read in the code).
* `graph.mjs`: it rewrites `qa/graph.json`, and I may only write these two files. No page or API route was added.
* `run-suites.sh --changed`: left to CI.
* `check_forms_demo.ts` on the base commit: N1's cause is shown from the diff (`sources.tsx:80` before and after).

**Verdict: Block** on 6446a2db (includes a8715173). To fix: N1 (count and list approved-in-product forms with one rule, correct the rules check fixture, add a P-80 browser step, re-run `check_forms_demo.ts`). n1–n4: fix or list in the PR.
