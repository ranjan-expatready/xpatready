# B81 — independent review of PR #1057, commit c0c93b571 (5 Nov 2026; read-only, US$0)

**Verdict: Block (Changes needed).** 2 Blockers, 7 Majors, 8 Minors. The engine, the release path and the printed-choice claims hold. What blocks: the commit cannot merge, and the screen part misses concept elements and dead-ends on some paths. Paths are under `prototype/studio/` unless stated.

**Not run (Lead 11's rule, the Mac is overloaded):** no test copy, browser or suite. No walk at 1440 px, 1024 px, 200 % zoom or keyboard; no screen reader; `product/tools/graph.mjs` (it rewrites `qa/GRAPH.md`, and this review writes one file only). Everything below is from reading the code, the committed inventories and GitHub's logs. The brief's counts at 147c815e7 are taken as stated: on GitHub I saw those packs only as job states (C3.8, C4.1, C9.1 and C4.8 on the checkpoint success; C4.8 on the six failure), and read counts only for C10.1 at 147c815e7, and for C10.1 and C3.8 (12/12) at c0c93b571. I did not read main's C4.8 count. Effects on the merged result are worked out by reading, not run. No AI, no priced button.

## Blockers
1. **The commit conflicts with main, in text and in meaning (#1009 merged 04:35Z).** `git merge-tree` conflicts in `api/src/forms.ts`. Three meaning conflicts the text merge will not show:
   * main `api/src/forms.ts:259`, `optionMapProblemsIfFiled`, redrafts with `draftOptionMap(values, opts)` and never reads the saved map. Its comment says "the same rule as engine/channels.ts". Fail: a person saves the mark; this read still lists `no code for "unknown"` on all 13, while Submit lists none. Fix: pass `m.optionMap` as `kept`.
   * main `tests/check_c10_1_configured.ts:125` asserts 13 = 11 no code + 2 no option map. With this PR's reading, Mother and Father read their printed choices, so the same read gives 13 no code + 0 no map. Fail: `/11 form fields have no code/` and `/2 have no/` go red on the merged result.
   * main `api/src/checkpoint-words.ts:15` says "Waits for row B81". Once B81 is on main, row 9 on the demo says it waits for something shipped, until the follow-up lands. `check_c101_release_two_words.ts:24` and `check_c10_1_configured.ts:122` pin those words. Fix in the merge or name the follow-up as a row.
   * Lead 11's ruling: if freeing row 9 touches `demo.ts`, the turn follows the order he places. The PR body says both "free to merge" and "row 9 turning green does need `demo.ts`". He must place it.
   * The merge makes a new head: this verdict does not carry to it, so the delta needs a re-read.
2. **CI is red on the reviewed commit, and the suites have not finished.** Run 41968436847: gate B refuses, `C10.1.test.ts` on the six 18/24, because the PR's Capabilities line names C10.1. Shards 2–6 were cancelled when shard 1 failed. At 147c815e7, run 41967755643 gives C10.1 18/24 on the checkpoint too. The brief's results list omits C10.1. Fix: name only the green steps (`tools/gate-b.mjs:6`) or drop the claim, then get a full green run. I did not find main's own C10.1 count, so whether 18/24 is unchanged is open.

## Majors
1. **The word "box" is on screen.** `web/src/components/form-choices.tsx:48`: "Whether IRCC accepts the box left blank". I ran `check_qa182_no_box_words`'s own `BAD` and `wordsOn` over the changed files: this is the one hit. Fail: that check and C3.10 part 2 go red once suites run. The suites being cancelled is why CI has not said so. Fix: "the form field".
2. **BR-8: the release link can land where nothing can be set.** `web/src/pages/review.tsx:25` keeps the form number and drops the edition. Submit checks every non-Online map (`engine/channels.ts:133`), including a PDF map on a line filed Online and an older PDF edition.
   * Fail A: a line filed Online with a missing code. The link opens its panel, but `web/src/pages/workspace/forms.tsx:390` hides the section. That is the shape of row 9's release 2 (IMM 5257 Online), though its marital box prints Unknown.
   * Fail B: a list gains a value while the form holds two PDF editions. The older edition keeps blocking, and the dialog opens on the edition in use (`api/src/workspace.ts:78`), showing no problem to fix. Only the API can fix it.
   * Fix: carry the edition and show the step for any map Submit checks, or say on the row why it is not fixed here.
3. **An Approver reaches the author's whole panel.** The link is not gated (`review.tsx:90`), and `forms.tsx:71` opens the drawer without `canAuthor`. Fail: the Approver on Review clicks "Set this form's choices" and gets who, age, channel, Save and "Remove from this combination" all enabled, each refused only by the server. This PR's link makes the concept's build discovery ("opens only for the author") false. `tests/check_forms_b81_browser.cjs:73-74` passes without testing it, and asserts nothing if the button is there. Fix: no link and no open without `canAuthor`, or a read-only panel, with a test through the link.
4. **The dialog's guard is wrong both ways (concept: "asks nothing unless changed").** `form-choices.tsx:46` calls `onClose` directly, bypassing `web/src/components/ui/controls.tsx:77`; and `touched` (`controls.tsx:90`) is never reset by a save in a dialog that stays open.
   * Fail A: change a Select, click footer Close: the picks are lost with no question.
   * Fail B: click Save, see the toast, press Escape or X: "Discard your unsaved changes?" with nothing unsaved.
   * `check_forms_b81_browser.cjs:59` clicks X after a save; Playwright dismisses the question unhandled, and the next line navigates away, so the check cannot see it.
5. **Concept element missing: the parts, and each form field.** The concept wants a heading with the parts ("Mother, Father, Section B, Section C · 13 form fields"), expandable to each form field. `form-choices.tsx:16,77` shows role words only ("the subject's first parent, … second parent, … child") and no expansion. `form_fields[].caption` and `row` come back and are unused. Fail: an author saves one mark across 13 form fields without being able to see which.
6. **BR-5 and STANDARDS §4 [M], "stale save → 409 with what changed".** `api/src/forms.ts:333` says only "Someone changed these choices since you opened them". It names no person and no change (`api/src/eligibility.ts:62` names who saved last). Also `baseRevision` is optional and the check runs outside the transaction, and the one-field route (`forms.ts:311`) has no check. Fail: two tabs through `PATCH …/option-maps` overwrite silently. Fix: name who, when and which values, and require the revision.
7. **Rules without a test that fails when they go (STANDARDS §3 rule 10).**
   * BR-4's officer line: `api/src/fill-case.ts:177,253` and `web/src/runtime/forms.tsx:220`. No test reads `FormCopy.not_on_form`, `about_label` or `data-not-on-form`; the routes check covers `/fill` only. Removing the person's name fails nothing, and it is ruling 4's wording.
   * BR-7's wiring: `api/src/impact.ts:238`. Only the helper is tested; removing `!samePrinted` from `accept` fails nothing.
   * The concept's "label point to check before Approve" says the browser check reads it. It does not. By reading `engine/runtime/case.ts:92-100`, the label can read "Annulled marriage" when a form's code list is the first to label it. It is cosmetic and the key is unchanged, but it needs its check or a line saying it is accepted.

## Minors
1. BR-2 says a choice sharing the first word refuses a mark, and two or more near choices refuse a pick. `engine/options.ts:92,101` use starts-with and ends-with only; `tests/check_forms_b81_not_on_form.ts:48` pins the narrower rule. Fail: "Married Spouse" against the two Married choices can be marked. Align the concept or the code.
2. `engine/channels.ts:141-144` keys labels and marks by value key across all lists. Fail: `unknown` marked on two lists gives one merged warning, with one list's label.
3. `api/src/forms.ts:329` makes three reads and an inventory parse per form field, up to 200 in parallel. Read once.
4. `api/src/forms.ts:233,255` take the newest list of any status; main's `optionMapProblemsIfFiled` (:252) reads as the validator does. Fail: a list whose newest row is RETIRED: the step shows it and Submit does not.
5. `form-choices.tsx:25` shows nothing while loading, though the concept lists a loading state; arriving from a release problem shows no sign of the dialog coming.
6. `web/src/runtime/forms.tsx:220` shows only the first `why`. Fail: two marked values on one copy name one value for both.
7. `engine/options.ts:107`: `samePrintedChoices` reads through `pdfOptions`, so a Yes/No group printed only in `options` reads as empty on both editions and carries a stale map. BR-7 edge.
8. `form-choices.tsx:86` says "Until then this form field is filled by hand", yet saving that group leaves "Blocks release" and nothing was decided on To review. Also: the audit lines (`forms.ts:320,339`) carry value keys and a field code; the browser check's "keyboard included" (`:48`) is `focus()` plus `selectOption`.

## Asked to check, and what held
* **Printed choices:** `imm5645e.inventory.json` matches the concept: 13 fields with 7 choices (codes 1–7), Applicant and Spouse with 8, no "Unknown", 0 of 139 required. Inventory and PDF sha256 are d6ba4cab…; the manifest gives IMM 5645 (01-2021). IMM 5257 has the 8 values with Unknown. IMM 0008 DEP has 7, no Unknown, its marital field not required.
* **Readers of the option map:** `engine/snapshot.ts:169` passes the mark through; `form-values.ts:39` refuses before "by hand"; `channels.ts`; `runtime/case.ts:98` (falls back to the list label); `proposals.ts:468` (only `map`, fails closed); `fill-trials.ts:24` (hash moves); `validate.ts` diff counts it as a change. A draft with no saved map: the view suggests and writes nothing; Submit blocks only with `hasCodes`, the same rule in both. Fill of an older snapshot is unchanged.
* **C3.8 reach:** 42 drop-downs in 10 forms take the new branch; none has a starred label or a blank code. Field-map effects are through a later rules draft and the Expected editor's list. I did not re-derive the challenge's "only six on a list".
* **Release path: no path found that the concept denies.** Saves `revise` into DRAFT; Submit and approve compare the sha; `publishRow` rolls back if published differs from frozen; cases read the frozen snapshot; `impact.accept` writes drafts. Note: a mark alone needs no expert sign-off (`needs_sme: x.ai > 0`), which the concept does not deny.
* **BRs:** 1 met · 2 met, Minor 1 · 3 met, Minor 2 · 4 met in code, Major 7 · 5 part, Major 6 · 6 met · 7 met in code, Major 7 · 8 part, Major 2.
* **P-319:** no form number in added code, only an old comment re-wrapped. **AGENTS 4:** source, page, quote, date and Sample are present. **AGENTS 5:** no names found in the diff. Field codes: none on the new screen except the audit lines above.

## Scores (1–5, from reading; nothing walked)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | BRs mostly met; concept elements missing (Majors 2, 5) |
| D2 Data integrity | 4 | Server refuses codes, marks, two on one code; group save in a transaction; check outside it |
| D3 Reuse | 5 | One printed-choices reader; no new list or field |
| D4 Rule integrity | 4 | Validator and view share one rule; two-edition gap |
| D5 Stability | 3 | False discard question; lost picks on Close |
| D6 Governance | 4 | Audited; 409 names nobody |
| D7 AI trust | 5 | No AI; "Suggested" until saved |
| D8 Orientation | 4 | Inside the form's panel; dialog names the edition; not walked |
| D9 Flow | 3 | Link dead-ends (Major 2) |
| D10 Language | 3 | "box"; role words instead of the form's parts |
| D11 Feedback | 3 | Toast and refusals good; guard wrong; no loading state |
| D12 Visual | not scored | Not seen |
| D13 Accessibility | not scored | Labelled selects; not walked; greyed Select takes no focus |
| D14 Team look | 4 | Team Dialog, Select, Table, Pill, Gated |
| D15 Speed | 3 | One GET on read; per-field reads on save |
| D16 Testability | 2 | Good engine and route tests; officer line and accept wiring untested; suites unfinished |
| D17 First use | simulated only | No user walk |
| D18 Provenance | 4 | Printed words shown; Sample and Unconfirmed marked |
| D19 Closure | 2 | Row 9 needs the `demo.ts` follow-up; not end to end yet |
| D20 Pain and wow | simulated only | No user walk |

## Journey test (reviewer's, on paper only; the walk runs separately)
**5.5/10, provisional, not a pass and not a walked score.** It must be replaced by the walk. Journeys read: author marks Unknown (main) · accepts suggestions · Applicant and Spouse's two Married · stale save · Approver via the link · form with no list · from Submit to the step · officer sees the refusal · a new edition.
Task completed ½ (not walked; PR's copy saved 13 with 200) · next step ½ (Major 2) · plain words ½ (Major 1) · feedback ½ (Major 4) · correct data 1 (by reading; routes check not seen green at this head) · error recovery ½ (Major 6) · accessibility ½ (not walked) · speed ½ (Minor 3) · visual ½ (not seen) · trust 1. No separate journey report: the brief allows this one file.

**Verdict: Block.** To fix before `review: approved`: Blockers 1–2, Majors 1–7. The review then applies to the new head only.
