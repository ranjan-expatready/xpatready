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

## Round 2 — diff-only check at 6e14568fd (5 Nov 2026; read-only, US$0)

**Verdict: Changes needed.** Every Blocker and Major of round 1 is fixed in code. Two new Majors stay open, both missing tests and neither a defect I saw on screen: BR-8's two new paths have no test (R2-M1), and the new dialog has no axe run (R2-M2). Round 1 should have caught R2-M2; it was already open at c0c93b571. Paths are under `prototype/studio/` unless stated.

**Read:** `git diff c0c93b571 6e14568fd`, `git diff origin/main 6e14568fd` on the checkpoint files, GitHub's logs, the four committed screenshots.
**Not run (the tech lead's rule, the Mac is overloaded):** no test copy, browser or suite. No walk by me at any size, no keyboard or screen-reader pass, no axe. The walk's 20/20 at 1caaf6e1c and the pack counts are the builder's, taken as given except where a log is cited below. The only commit after 1caaf6e1c adds four screenshots (`git diff --stat`, confirmed). Live AI off, no priced button.

**CI at head, read 05:42Z (11:12 IST), still running.** Run 41973499207: kind, types, the rules step and gate B **success**; shards 1–6 suites **in progress**. So the head has no full green run yet, and I did not see `check_c10_1_configured.ts`, the routes check or `check_qa182_no_box_words` run at this head.

### Round 1's Blockers and Majors
| # | State | Evidence |
|---|---|---|
| B1 Conflicts with main | **Fixed** | GitHub says MERGEABLE; merge base is main's ffcfb45c8. `api/src/forms.ts:261` passes the saved map as `kept`. `tests/check_c10_1_configured.ts` now expects 13 no code, none with no map (result not seen at this head). `api/src/checkpoint-words.ts:15` no longer says "row B81", and three checks pin the new words. `demo.ts` has no diff against main. |
| B2 CI red | **Fixed as far as it has run** | The type error at 982dcbf1e (`engine/channels.ts:145`) is gone and types is green. Gate B is green at head. At 982dcbf1e it refused because the body then named the whole of C10.1. The title's C10.1 no longer widens the claim: body steps replace it (`tools/gate-b.mjs:83-84`). Log: C3.8 12/12 on the six, C10.1 21/24; main's own run at d2e0d82dd also gives 21/24 on the checkpoint (run 41969024051), so B81 costs nothing there. Suites unfinished. |
| M1 "box" on screen | **Fixed** | `web/src/components/form-choices.tsx:54` says "the form field". No added line in `web/src` or `api/src/forms.ts` holds the word. Grep only; the check itself not seen. |
| M2 BR-8 dead ends | **Fixed in code; see R2-M1** | `web/src/pages/review.tsx:25` carries form and edition; `api/src/workspace.ts:78` lists every non-Online edition Submit reads; `web/src/pages/workspace/forms.tsx:391` shows a section for each, however the line is filed, and opens the named one. Both round-1 fail cases are gone by reading. |
| M3 Approver reaches the panel | **Fixed** | `review.tsx:90` shows the link only with `can("author")`; `forms.tsx:71` opens only with `canAuthor` and strips the address; two browser steps fail if either goes. See R2-m1. |
| M4 Dialog guard | **Fixed** | The footer Close and the X both go through `close` (`form-choices.tsx:48,52`), and the question depends on real edits (`:69`), not on `touched`. Browser steps: asked once with an edit, edit kept on No, not asked after a save. They click the X only; the footer shares the function. See R2-m2. |
| M5 Parts and each field | **Fixed for the fail case; heading open** | A person can now see which fields a mark covers: `<details>` lists part, caption, whose answer and row (`form-choices.tsx`, `api/src/forms.ts:288`). The inventory gives Mother, Father, SECTION B and SECTION C on the 13. Still open as Minor: the heading shows role words where `concept.md:30` asks for the parts. The browser step named "told apart in the form's words" (`tests/check_forms_b81_browser.cjs:65`) only counts rows. |
| M6 Stale save | **Fixed for who and when; the rest is Minor** | `baseRevision` is required (`contracts/forms.ts`); the check is inside the transaction (`api/src/forms.ts:355-358`); the 409 names who and when in IST, and a test pins it. It does not say which values changed, so `concept.md:23` ("with the change named") and STANDARDS §4 ("with what changed") are met only as far as `api/src/eligibility.ts`'s own 409 meets them. I hold that as Minor on that precedent, not as a pass. See R2-m4, R2-m5. |
| M7 Rules without a test | **Fixed for the rules; call sites are Minor** | See "Known choices". The label point is now a stated acceptance with an offline test. |

Round 1's Minors, now closed: 2 (labels per list), 4 (the validator's list), 5 (loading when arriving from a problem), 6 (each person's why), 7 (Yes/No groups), most of 8 (audit lines in words; keyboard Save). Open by choice: 1, 3.

### New Majors
* **R2-M1 BR-8's new paths have no test that fails when they go (STANDARDS "A rule's test fails when the rule is removed").** `choiceEditions` is named in no test (grep), and the fixture's link goes to one PDF edition of a line filed as PDF.
  * Fail case: put back `l.channel !== "ONLINE"` at `web/src/pages/workspace/forms.tsx:391`, or reduce `api/src/workspace.ts:78` to the edition in use. Unit, routes and browser checks all stay green, and round 1's Fail A and Fail B return: Submit blocks with nothing to set on screen. A line filed Online is the shape of row 9's release 2.
  * Fix: move the list into a small pure function and test one Online map plus two PDF maps, or assert `choiceEditions` through the route on a line filed Online. Add a browser step if the panel gate at `:391` stays inline.
  * I treat this as Major, unlike BR-4 and BR-7, because those rules have a failing test and only a call site is bare; this one has none.
* **R2-M2 No axe on the new dialog or section (STANDARDS: "axe-core on every screen state").** `tests/check_forms_b81_browser.cjs` has no axe call, and no other test opens `data-choices-dialog` (grep). `tests/check_c10_1_browser.cjs:30` shows the two lines needed.
  * Fail case: nothing checks the dialog's contrast, the names of its Selects or `<details>`, or the states below; D13 stays unscored.
  * Fix: run axe on the section, the dialog before and after a save, and the expanded list. If it reports violations, fix them in the same commit.

### Known choices, judged
* **One-field route with no stale check: accepted, Minor.** `web/src` calls only `/option-maps/group` (grep); the others are `tests/check_forms_channels.ts`, `tests/runtime/setup_visitor_visa.ts` and similar. A script's save still changes the group's revision, because the hash holds the map, so it cannot get past a person's 409. But `concept.md:23` and the PR body read as if every save is checked: say in the concept that this route is API-only and unchecked. A screen using it later must add the check.
* **BR-4 by the pure `notOnFormLines` test: accepted, Minor.** Removing the person there fails the test. Dropping `about_label` at `api/src/fill-case.ts:253` or the person at `web/src/runtime/forms.tsx:220` fails nothing, so the on-screen line stays unproved. I did not check whether a case could be made on the fixture. Row B97 has a real case: read `data-not-on-form` there.
* **BR-7 by the pure `carriedOptionMap` test: accepted, Minor.** Same, the rule is pinned and the call at `api/src/impact.ts:238` is not. Deleting the call fails nothing.
* **Label check moved offline: accepted.** The browser check never read it. By `engine/runtime/case.ts:92-100` the key does not change and only the words may; `concept.md:38` says so, and the test fails if a mark takes an answer off the question. It does not pin "Annulled marriage" and nothing relies on that.
* **Minors left: accepted.** "Married Spouse" stays Minor 1. The Forms tab's list having no link is fine while Review has it, as the panel is on the same tab. That list prints a field code, "(person.marital_status)" (`b81-01-section-1440.png`); those words come from existing code in `engine/channels.ts`, not this PR, and belong on a row of their own.
* **Capabilities line: accepted.** R11a, R11b and R12a are labelled and gate B passed on them. None of the three exercises this PR's change, which P-330 (7) allows and the body states. Open: B97 is on neither this branch's nor main's `BACKLOG.md` (read 05:40Z), and the body still says the follow-up's turn "is yours to set". Add the row and name it in the body.

### What the fixes brought (all Minor)
* **R2-m1** `web/src/pages/workspace/forms.tsx:71`: the effect runs once and reads `canAuthor`, which is false until the session answers (`web/src/lib/api.ts:43`). Fail: an author opens the link in a new tab, the session is slower than the combination, the address is stripped and nothing opens. Fix: wait for `known`. By reading; the race is probably rare.
* **R2-m2** `form-choices.tsx:69`: the effect has no cleanup. Fail: a person edits and saves a group whose result joins another group; it unmounts with its key still in `changed`, and closing asks about nothing. Fix: remove the key on unmount.
* **R2-m3** `form-choices.tsx:35-36`: two editions now mean two `id="choices-h"`, so the second section takes the first's name. Fix: `React.useId`.
* **R2-m4** `form-choices.tsx:67`: after a 409, "Look again" keeps the "Not saved" notice and its button until the next Save, and replaces the person's picks without saying so.
* **R2-m5** `api/src/forms.ts:355-358` with `api/src/core.ts:147`: the read is in the transaction, but the update is by id only, so two saves in the same instant can both pass at the default isolation. `api/src/eligibility.ts` checks in the write itself. The same transaction also skips the file's `CHANNEL_TX` and keeps the 5 s default, with up to 200 updates.
* **R2-m6** Records: `concept.md:38` and the PR body's first line name `WorkspaceFormLine.editionId`, which no longer exists; `choiceEditions` and `form_fields[].part` are listed nowhere. `concept.md:29` still says the section is "only for a PDF form", while a line filed Online now shows it.

### Scores changed since round 1 (1–5; from reading and four screenshots, nothing walked)
D1 4 · D2 4 · D4 5 · D5 4 · D6 5 · D9 4 · D10 4 (role words in the heading) · D11 4 · D12 4 (1440 px screenshots only; no defect seen, 1024 px not seen) · D13 not scored (R2-M2) · D16 3 (R2-M1, R2-M2; suites unfinished) · D19 2 (row 9 needs B97). D17 and D20 remain simulated only.

### Journey test (reviewer's, on paper only)
**8/10, provisional, not a walked score.** Nothing was walked by me: the skill's visible-browser walk was not run under the tech lead's rule, and no journey report was written. Task completed 1 (builder's walk 20/20, screenshots seen) · next step ½ (R2-M1) · plain words 1 · feedback 1 · correct data 1 (by reading; routes check not seen at head) · error recovery ½ (R2-m4) · accessibility ½ (R2-M2) · speed ½ (Minor 3) · visual ½ (1440 px only) · trust 1.

**Verdict: Changes needed.** To fix: R2-M1, R2-M2. Both are additions to tests unless axe finds something, so the next check needs only that diff and the suites' result. The Minors do not hold the merge. Do not label `review: approved` at 6e14568fd.

## Round 3 (narrow) — commit cb307b831 (5 Nov 2026; read-only, US$0)

**Verdict: Changes needed.** R2-M1, R2-M2 and break M1–M4 are fixed. The merge is clean. Two Majors stop the merge. R3-M1 is new: the fix for break m1 lets a person's save overwrite someone else's change unseen. R3-M2 is the half of break M5 still open: the screen says "Blocks release" and Submit does not block. R3-M3 is a missing test, held to round 2's own rule. Paths are under `prototype/studio/` unless stated.

**Read:** Round 2, the break report's Majors, `git diff 6e14568fd cb307b831` on `prototype/studio` without PNGs, `git diff 0722f53f7 fddd3660e` for `fill-case.ts`, `fill.ts` and `web/src/runtime/forms.tsx`, and GitHub's logs. To judge the fixes I also read code the diff calls: `revise`, `effective`, `optionMapsView`, `draftOptionMaps`, `engine/validate.ts`, `engine/form-values.ts`, `engine/snapshot.ts`, the query defaults.
**Not run (the tech lead's rule):** no test copy, browser or suite. No walk, no axe, no keyboard or screen-reader pass, no Prisma call by me. Every defect below is by reading, not seen on screen. The walk's 26/26, its axe result and the routes check's 17/18 at fddd3660e are the builder's, taken as given. `git diff --stat fddd3660e cb307b831` confirms the last commit changes only that test line (`tests/check_forms_b81_routes.ts:68`) and four screenshots. Live AI off, no priced button.

**CI at head, read 06:05Z (11:35 IST), not finished.** Run 41977248107: kind **success**, Devin Review pass; shards 1 and 5 in progress; types and shards 2, 3, 4, 6 queued. So I saw no result for types or for the routes check at this head. At 6e14568fd (run 41973499207) shard 6's only FAIL was `check_forms_b81_routes.ts`, the audit line cb307b831 changes; shards 1 and 4 were cancelled there, so that run does not cover them. GitHub says MERGEABLE.

### The Majors asked about
| # | State | Evidence |
|---|---|---|
| R2-M1 BR-8's paths untested | **Fixed** | `choiceEditionsOf` is pure (`engine/options.ts`), called at `api/src/workspace.ts:79`; one Online plus two PDF maps at `tests/check_forms_b81_not_on_form.ts:75-76`; the gate at `forms.tsx:391` has a browser step on a line filed Online (`tests/check_forms_b81_browser.cjs:85-90`). |
| R2-M2 No axe | **Fixed, two states short (Minor)** | Axe at `check_forms_b81_browser.cjs:38,50,63`: section, dialog, dialog after a save; clean by the builder's run. The expanded list opens later (`:70`) with no axe after it, though round 2 asked for it. See R3-m9. |
| Break M1 Two saves both succeed | **Fixed** | `api/src/forms.ts:330` locks, then re-reads in a new statement, then compares (`:333`). Test: `check_forms_b81_routes.ts:62`, four identical saves; passed in the builder's run. See "Asked to check". |
| Break M2 One-field route overwrites | **Fixed for its fail case** | A field with a mark and no revision gets 409 (`:333`, test `routes.ts:65`). Stale saves of codes alone still pass on this route; `concept.md:23` now says so and round 2 accepted it. See R3-m6. |
| Break M3 Problem cannot be seen or fixed | **Fixed in code, no test (R3-M3)** | Words at `form-choices.tsx:96`; Save enabled at `:75`. Saving rebuilds the map from listed values only (`:81-82`), so a stale mark or code goes. Narrower cases: R3-m1, R3-m2. |
| Break M4 Reworded mark passes Submit | **Fixed** | `engine/options.ts:71` holds a mark against `m.printed`; `engine/channels.ts:139` passes the list. The break's case gives near = "Conjugal", so an error. Pure test `not_on_form.ts:65`. See R3-m4. |
| Break M5 Saved code on a two-Married field | **Half fixed: Submit still passes it (R3-M2)** | The view hides the code and states a problem (`forms.ts:284,287`), Save clears it, and a new draft drops it (`options.ts:30`, test `not_on_form.ts:69`). Submit and the fill are unchanged. |

### Merge
`api/src/fill-case.ts` **held**. From main: `not_for_filing` at `:278`, `copy_not_for_filing` at `:199`, the lock at `:318`, the download name at `:443`. From this PR: `notOnFormLines` at `:26,196`, `not_on_form` at `:200`, the count at `:276`, `about_label` in the boxes at `:279`. Each line carries both sides and nothing was dropped. `api/src/fill.ts` and `web/src/runtime/forms.tsx` also meet C11.6 without harm: the count and `data-not-on-form` beside the new `why`.

### New and open Majors
* **R3-M1 A touched group sends the newest revision, so a save overwrites someone else's change unseen (BR-5, STANDARDS §4). New, from the fix for break m1.** `web/src/components/form-choices.tsx:70` keeps a touched person's picks when a new revision arrives, but `:84` sends `baseRevision: g.revision`, which is by then the new one. The comment at `:68` ("the save then says it is stale") holds only until the query reads again, and any other group's save in the same dialog makes it read (`:73,85`). At 6e14568fd the same refetch replaced the picks, so nothing of the other person's was lost.
  * Fail case: a form with two groups. Author A changes a row in group X and does not save. Author B marks another answer in X and saves. A saves group Y, and the view reloads with X's new revision while A's picks stay. A saves X: 200, "Choices saved". B's mark is gone from every field in X, A's screen never mentioned it, and A's untouched rows wrote back what A read first. Same outcome as break M1, with a window of minutes rather than 100 ms.
  * Fix: keep the revision the picks were based on (a ref, updated only while not touched, sent at `:84`). Add a browser step: edit X, save X through the API as the other author, save Y, save X, expect "Not saved" and "Look again"; then click it and expect the fresh values. That step also gives `touched` and `lookAgain` their first test: no test names either.
* **R3-M2 "Blocks release" on a saved two-Married code, and Submit passes it (break M5, BR-3, `concept.md:16`). Unfixed half.** Only the view, the save routes and the draft read `asksMore` (grep: `engine/options.ts:30`, `api/src/forms.ts:284,287,316,321`). Submit reads `engine/channels.ts:139`, and `optionMapProblems` has no such rule. The fill reads `m.map` directly (`engine/form-values.ts:44`). The comment above `forms.ts:287` still says "The same words Submit lists", which this line now breaks.
  * Fail case: the break report's row (`married → 5` on a field printing the two Married choices), not opened or redrafted. The dialog shows the red pill and "the immigration expert decides"; Submit gives no error; a case with Married is written code 5. That is the silent pick `concept.md:16` rules out, and the release carries it.
  * Reach, plainly: such a row comes from the earlier first-word draft, or from a value reworded after its code was saved (the route break M4 used). No save route can create it now, and `api/src/demo.ts:793` redrafts the filed editions on load, which drops the code. An edition not redrafted keeps it. I did not read a database. The break report rated the same reach Major, and the harm is a wrong choice on an IRCC form under a screen that says it is blocked, so I hold it Major.
  * Fix: make Submit read the same rule. `engine/validate.ts:131` already hands `inventoryFields` (`:24`) to `oathMappedProblems`, so a sibling check can compare a mapped value against the printed choices; not tried. Do not simply put `printed` on every map without checking: `api/src/fill-trials.ts:24` hashes `option_map`. Test it through `channelProblems`. If the tech lead rules this row cannot exist anywhere, drop the view's claim instead and record that ruling in `challenge.md`; the pill must not stay as it is.
* **R3-M3 Break M3's rule and the view half of M5 have no test (STANDARDS "A rule's test fails when the rule is removed"; the same reasoning as R2-M1).** No test reads `data-choice-problems`, "has a code, but", or a Save enabled by a problem (grep over the three B81 checks). Fail case: remove `|| g.problems.length > 0` at `form-choices.tsx:75`, or the second array at `forms.ts:287`, or `&& !asksMore(v, choices)` at `:284`; all three checks stay green and the break's dead end returns.
  * Fix: one routes step (mark, then remove the value by SQL as the break report did: the view names the problem, and a save with the same picks clears it) and one browser step (Save enabled, the words shown). Add a SQL row with `married → 5` for the view's `code: null` and its problem.

### Asked to check, and what held
* **The lock and a new DRAFT: held.** On a published row, `revise` (`api/src/core.ts:142`) inserts and leaves the old row, but the lock is on the old row whatever its status. The second writer waits there, gets it at the first's commit, and its next statement reads the new DRAFT in a new snapshot at read committed; the compare then gives 409. The unique version remains a backstop. `ORDER BY id FOR UPDATE` locks in one order, so overlapping groups do not deadlock each other.
* **`ANY(${dataPaths})`: valid.** Prisma sends a string array as `text[]` on PostgreSQL and `data_path` is text. The builder's routes check got past it at fddd3660e. The array cannot be empty (`.min(1)`, and the one-field route passes one).
* **Both routes' transactions: held.** Both use `CHANNEL_TX` (20 s, 10 s wait), closing R2-m5. A refusal inside rolls back as an `HttpException`. Losers are quick, so only the first writer's length matters.
* **`optionMapRevision`: same rows.** The view (`forms.ts:274`) and the route (`:331-332`) both take full rows through `effective(…, "draft")` and the same sort; the group's fields are the paths sent. `updatedAt` is why four identical saves now differ. One side effect: R3-m7.
* **`printed`: held.** Stored only with marks on both routes. `draftOptionMap` writes today's choices, not the kept ones, and the edition's inventory does not change. `engine/snapshot.ts:169` copies the whole map into a release, and `carriedOptionMap` copies it whole only when the printed choices are the same, so it cannot go stale there. It enters `fill-trials.ts:24`'s hash only for a map with a mark, which is a real change anyway.
* **The third argument: held at Submit.** `listedOf` (`channels.ts:133`) is the same source as `lists`, and the default `[]` keeps old callers safe. One caller was missed: R3-m3.
* **`lookAgain` before `refresh`: fine.** It is called only on a click, when both exist. It closes R2-m4. **Save enabled with problems: fine**, apart from R3-m1 and R3-m5. **`touched`: not fine**, R3-M1.
* **`forms.tsx` and `known`: held.** `known` is declared at `:60`, before the effect's dependency list at `:71`, and the address stays until the session answers. This closes R2-m1, apart from R3-m8.
* **Round 2's other Minors:** R2-m2 closed (cleanup at `form-choices.tsx:76`), R2-m3 closed (`useId`). R2-m6 not read: records were outside this check.

### Minors (none holds the merge)
* **R3-m1** `form-choices.tsx:66,75`: a marked value later reworded to "Married" on a two-Married field has no Select, yet `picked` keeps the mark, so every save of that group gets 400 and nothing on screen clears it. A small remainder of break M5. Fix: treat `v.not_on_form && !v.asks_more` as the mark in both places.
* **R3-m2** `forms.ts:287`: a group takes its problems from its first row only. Two fields with the same view but different saved maps (a stale mark on one, set by the one-field route): if the clean one comes first there is no pill, Save is greyed, and Submit still lists the other. API route only. Fix: join the problems of all rows.
* **R3-m3** `forms.ts:263`: `optionMapProblemsIfFiled` passes no third argument, while its comment says "The same rule as engine/channels.ts", so checkpoint row 9 would not name a break M4 problem.
* **R3-m4** `channels.ts:139`: removing the third argument fails nothing, because the test calls `optionMapProblems` directly. The rule is pinned and the call is bare: the pattern already accepted for BR-4 and BR-7. Row B97 can read it.
* **R3-m5** `form-choices.tsx:96`: every problem ends "Saving these choices clears what no longer holds", including ones a save cannot clear ("no code for…", or a mark the save then refuses). They also show list keys in quotes (`"married"`, `"sample_no_choice"`), the words Submit uses; the label is at hand except for a removed value.
* **R3-m6** `forms.ts:333`: the view gives only a group's revision, so on the one-field route a marked field in a group of two or more is refused whatever is sent, and "Look at them again, then save" cannot be followed. No screen or script reaches it today (callers read).
* **R3-m7** `forms.ts:242`: `draftOptionMaps` compares JSON strings, and PostgreSQL returns stored keys in its own order, so by reading it rewrites every map each time. With `updatedAt` in the hash, a draft click now gives anyone with the dialog open a 409 saying a person "changed these choices" when nothing did. It also takes no lock, so a save in the same seconds can be overwritten by the draft's older read.
* **R3-m8** `web/src/lib/api.ts:41`: `known` also turns true after 4 s with the session still pending, so on a slower session the address is stripped and nothing opens. Far rarer than R2-m1.
* **R3-m9** Axe does not run on the expanded field list, the "Not saved" notice or the problems list: states STANDARDS' "every screen state" covers. Add them with R3-M1's and R3-M3's steps.
* **R3-m10** `contracts/forms.ts:96` raises a group to 2000 fields while `optionMapTarget` loads the library once per field before the transaction, and the 20 s timeout covers the writes. Groups were tried up to 201; 2000 not measured by anyone I can cite.

### Scores changed since round 2 (1–5; from reading, nothing walked)
D13 4 (builder's axe; R3-m9) · D16 3 (R3-M3; suites unfinished) · D4 and D11 drop to 3 while R3-M1 and R3-M2 stand. The rest unchanged.

### Journey test (reviewer's, on paper only)
**7.5/10, provisional, not a walked score.** Nothing was walked by me under the tech lead's rule and no journey report was written, so the skill's visible-browser walk is still outstanding. Task completed 1 (builder's walk 26/26) · next step 1 · plain words 1 · feedback 1 · correct data ½ (R3-M1, R3-M2) · error recovery ½ (R3-M1) · accessibility 1 (builder's axe) · speed ½ (Minor 3) · visual ½ · trust ½ (R3-M2's pill).

**Verdict: Block (changes needed).** To fix: R3-M1 (`form-choices.tsx:70,84`, with its browser step), R3-M2 (`engine/channels.ts:139` or `engine/validate.ts:131`, with a test through `channelProblems`), R3-M3 (one routes step and one browser step). The next check needs only that diff, the suites' result at its head, and the walk's count. The Minors do not hold the merge. Do not label `review: approved` at cb307b831.
