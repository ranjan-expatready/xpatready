# Review: C6.4 (a) Documents panel, PR #1073 at 57678a09c (`git diff origin/main...57678a09c`)

Independent reviewer (did not build or challenge it), 5 Nov. Concept: `../M3-design-2026-11-04/documents/concept-draft.md` §4 as changed by `challenge-r2.md` (tech lead's approval on #1073, 06:19 UTC). Own copy `rev64` on :4472, live AI off, US$0, no priced button. Stopped and dropped after. All values Sample. Unconfirmed: no counsel.

**Verdict: Block.** 0 Blockers, 1 Major, 8 Minors. The panel is correct, matches the API on both data sets and follows challenge-r2 closely. One keyboard defect on the main path has to be fixed first.

## What I ran (exact commit)
* **Configured checkpoint:** Demo › Reset, then Load configured as `user-A` (70.6 s, `cost_usd` 0). Visitor visa, Study permit and With an LMIA released.
  * `C6.4-screen.test.ts`: **17/17**.
  * `C6.4.test.ts`: **19/30**. The red steps are only groups B and C (the minor lines, -19), as the builder says.
* **Fixture** (a fresh copy, `setup_visitor_visa` 15/15, then `setup_vv_m3`): `C6.4-screen` **17/17**, `C6.4` **30/30**.
* **Static checks:** `tsc` for web and api shows no error in the changed files. `count-any` 418 (baseline 433). `graph.mjs --check`: G1/G2/G4/G5 are 0. G3 still lists `POST /runtime/checklist-lines/:id/documents`, because only the acceptance pack reaches it and no suite does.
* **My own walk:** a scripted Playwright walk (headless Chrome, not a visible pane), plus a focus probe and axe with the 2.1/2.2 tags. Details are in the journey section.

## Loader (`api/src/demo.ts:264-310`, `:845`)
* **It cannot break the Visitor visa's release today.**
  * `factsOf` collects every `field` in the condition tree.
  * `known` is narrower than the release check (`studio.ts:778`: any field that is not retired), so the loader can only hold back more, never less.
  * All five lines read `person.age_years`, so `n = 0` and the step returns before it adds any fact (`:288`). The release is unchanged and Visitor visa released.
* **Its words name what it held back:** row 7's `why` reads "5 conditional document lines wait: Letter of authorization for a minor (its condition reads person.age_years, which this library neither holds nor calculates); …", naming all five.
* **Row 7 status:** it was already `partial` (29 sections held), so its status does not change.

## Challenge-r2 changes, checked against the build
| Item | Built? | Evidence |
|---|---|---|
| B1 data-independent checks | yes | every check reads `GET …/checklist` in the same step and names no document; green on both data sets |
| M1 `who_words`, condition inside the sentence, one "Kept" | yes | "Once for the couple"; "Needed: the applicant is married." (one full stop); a kept line shows its reason once plus a "Kept" pill |
| M2 checks 31-38 with a pass and a fail, run line | yes | 17 checks; run line in the header |
| M3 a slice, no Works claim | yes (PR body) | but `rows.md:858` and concept DoR `:140` still say QA-149 (Minor 6) |
| M4 menu from `contracts/documents.ts`, m = `required` | yes | probe: Being checked/Approved offer Upload, Not applicable, History; Rejected adds "Request again"; "0 of 2" after Not applicable. No pack check sets these states in SQL as M4 asked (Minor 4) |
| m1 API words, reload on 409 | yes | two tabs: "…changed after you opened it (it is Requested now)…", then the list reloads |
| m2 link to the question | yes | the link opens the spouse's tab and focuses `#a-<subject>-person-marital_status` |
| m3 placement | yes | after "People on this case", before "Eligibility" |
| m4 `StandIn SI-14`, Radix ⋯ menu | yes | `checklist.tsx:41`, `:129` |
| m5 names, file note, Source | yes | "by Case officer (Sample)"; "Opening a file comes with Fill from documents"; Source disclosure |
| m6 types from engine and contracts | yes | `checklist.tsx:14-20` |

## Issues
**Major**
* **M-1. Focus is lost after every line action, so the keyboard path restarts from the top of the page.**
  * **Where:** `web/src/runtime/checklist.tsx:130` (`busy={busy}` disables the ⋯ trigger while it has focus), `:133-136`, and the dialogs at `:141` and `:172`.
  * **Fail scenario (focus probe, :4472):**
    * The officer opens a line's ⋯ menu with Enter and chooses Request. Focus goes to `BODY`, and the next Tab lands on "Cases home".
    * The same happens after Not applicable is saved (`BODY`) and after History is closed with Esc (`BODY`). Only Esc on the menu itself returns focus to the trigger.
    * On a four-person case, every Request, Upload and Not applicable means tabbing through the header, People and every earlier row again.
  * **Standard:** WCAG 2.2 2.4.3 Focus Order (A); EXPERIENCE §2.12 [M] "keyboard path for every task".
  * **The check hides it:** C6.4-38 moves focus with `.focus()` (`acceptance/C6.4-screen.test.ts:178`, `:182`) instead of using keys only.
  * **Fix:**
    * Return focus to that line's ⋯ trigger after each action and when each dialog closes (a trigger ref with `onCloseAutoFocus`, or focus after `run`). Keep the trigger focusable while busy (`aria-busy`, not `disabled`).
    * Make C6.4-38 drive the main path by key presses only, and assert that `document.activeElement` is the line's trigger after Request, after Not applicable and after History. It then fails while the defect is there.

**Minor**
1. **The waiting line says the same thing twice.** It reads `May be needed (the applicant is married): answer "Current marital status" first.` and then `Answer first, in the Agent view: "Current marital status"` (`checklist.tsx:79-80`). The link text also carries literal quote marks. *Fix:* show the reason once, or drop the second "Answer first", and use the question without quotes as the link text.
2. **The new `inSentence` (`engine/runtime/case-checklist.ts:204-207`) lower-cases any capitalised first word.**
   * Proper nouns are lost: `wp.family`'s "Venezuelan passport issued before 7 June 2019…" would read "Needed: venezuelan passport…" once that combination is derived.
   * It shares its name with a different `inSentence` in `contracts/runtime.ts:222` (QA-76: names never changed).
   * No test fails if it is removed: "married.." coming back would pass.
   * *Fix:* rename it or reuse the existing one, keep proper nouns, and add a pass/fail engine test ("The applicant is married." / "Venezuelan …").
3. **The Agent view's hash effect re-runs whenever the list of people changes** (`questionnaire.tsx:652`, `[ids]`). Scenario: after following a panel link, the officer picks another person's tab and then adds a child. The view jumps back to the hash's person. *Fix:* act only on `hashchange` and the first mount, or clear the hash once it is used.
4. **Not in the pack:**
   * M4's states set in SQL (Being checked, Approved, Rejected: pill and menu);
   * the two empty states ("This release has no document lines", "Not worked out for this combination").
   They render correctly in my probe. *Fix:* add a pass/fail check for each.
5. **The loader adds lines before the facts they read** (`demo.ts:276-288`, then `:290-310`). Once B102 lands, a refused `ruleFacts.add` or approval would leave saved lines that read a fact the library lacks, and Submit would refuse the Visitor visa. Separately, the load log says "vv.single: 0 conditional document lines…" without "5 wait" (`:845`). *Fix:* add the facts first (or remove the lines when one fails), and put the wait count in the log line.
6. **Records not updated to the approved changes:**
   * concept §4 still names `setup_vv_m3` (`concept-draft.md:67`);
   * the DoR (`:140`) and `rows.md:858` still say QA-149, not QA-226 (M3);
   * §5 still has the old field-error wording;
   * `notes.md` "Screen part" still says no case screen shows the checklist.
7. **The PR body is behind the commit:** it says "Nothing visible yet", 18/30, and the panel "once approved". Its first line does not say "API words changed" (challenge M1) or name the new pack and the C6.4-4 change. It has no panel screenshots or "On the demo". *Fix:* before the label.
8. **`ROLE` is defined again** at `checklist.tsx:28`, already in `cases.tsx:33` (STANDARDS §7, no duplicated logic). *Fix:* share one.

## Journey test (reviewer, scripted Playwright walk, headless Chrome; checkpoint data)
**Journeys:**
* J1. The case officer goes from Cases to a family case and reads each person's documents. The panel appeared 817 ms after the click.
* J2. Spouse's marriage certificate, "May be needed": the link opens the spouse's tab on the question, the officer answers Married, and the line moves to needed with no reload.
* J3. The officer requests it, then answers Common-Law: the line is kept, with the "Kept" pill and the reason.
* J4. Upload a PDF on a passport line: Received, "1 of 3 received", and History names "Case officer (Sample)".
* J5. Not applicable on a child's fee receipt, with a reason: "0 of 2".
* J6. States set in SQL, on a very long non-English name: the pills and menus follow the contract, and the name wraps.
* J7. Two tabs, then a stale Request: the API's 409 words, and the list reloads.
* J8. Keyboard only: the menu and the empty-reason error work, but focus is lost (M-1).
* J9. 1024 px, 200 % zoom (720 CSS px) and 400 px: no sideways scroll. Axe with WCAG 2.2 A/AA tags is clean on the panel, the menu and the Not applicable dialog at all three widths.
* J10. The wrong role: client A and client B on `/cases/:id` see "This page is for the case officer" and no panel. The server answers 403.

**Break-it:** duplicates and a double Request are refused by version; a long name and non-English text are fine; a text file named `.pdf` gets 415 with words on the line. The console showed only the expected 4xx network lines and no page errors.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J7 done on screen |
| Next step obvious | 1 | the link to the question; ⋯ offers only what is allowed |
| Plain words | ½ | Minor 1 (repeated question, quote marks) |
| Feedback and state | 1 | pills, line errors, busy spinner |
| Correct data | 1 | the screen equals the API (C6.4-31); counts use `required` |
| Error recovery | 1 | 409 with reload, 415, field error |
| Accessibility and screen sizes | ½ | axe and widths clean; focus lost (M-1) |
| Speed | 1 | 817 ms first view |
| Visual quality | 1 | team controls; long names wrap |
| Trust and sources | 1 | Source quote, SI-14 chip, Sample note |
| **Total** | **9/10** | pass (8 or more, no 0) |

## D1–D20 (independent reviewer; browser and script)
* **D1 4:** BRs and r2 met; minor gaps 4, 6.
* **D2 4:** version 409, server states.
* **D3 4:** words come from the engine; ROLE is defined twice.
* **D4 4:** the loader holds back unreleasable lines.
* **D5 4:** reload and two tabs are safe.
* **D6 4:** last change by name.
* **D7:** n/a, no AI.
* **D8 4:** person groups.
* **D9 4.**
* **D10 3:** repeated waiting words.
* **D11 4.**
* **D12 4.**
* **D13 3:** focus loss.
* **D14 4.**
* **D15 5:** one request per view.
* **D16 4:** 17/17 and 30/30, but no `inSentence` test.
* **D17, D20:** simulated only.
* **D18 4:** Source quotes.
* **D19:** not yet evidenced (a slice).

## Could not check
* A visible-browser walk like a person (the skill's step 2): the walk was a headless Playwright script.
* A real screen reader.
* An intended user's unaided walk (D17/D20 stay with the founder).
* CI on this head, and `run-suites --changed`.
* The screen-breaker pass that a new screen needs (WAY-OF-WORKING step 4).

**Note for the tech lead (process, not a finding):**
* The panel commits (06:24–06:42 UTC) came after your 06:23 UTC "M2 first … do not start the next piece" comment on #1073.
* The fixture's `setup_vv_m3` was 44/46 on its first run here; I did not trace its two red steps, and they are outside this diff.

**Verdict: Block.** To fix: M-1, with a check that fails when focus is lost. The Minors are fixed or listed in the PR.

## Round 2: diff-only re-review of `git diff 57678a09c ca2db0311` (5 Nov)
**Verdict for ca2db0311: Approve.** There is no open Blocker or Major. M-1 is fixed with a check that fails without the fix. The breaker's M1 (focus) and M2 (long text) are fixed too.

**What I ran on ca2db0311** (own copy rev64 on :4472; stopped and dropped after; live AI off, US$0):
* **Load:** Reset, then Load configured: 73.7 s, `cost_usd` 0. Visitor visa, Study permit and With an LMIA released. Row 7 still names the 5 held lines.
* **Packs:**
  * `C6.4-screen` **17/17** twice. C6.4-38 now runs on keys only and asserts focus after Request, Not applicable and History.
  * `C6.4` **19/30**, the same red steps as round 1.
  * `check_vv_checklist` **65/65**, including the new `inReason` and `whoWords` pairs.
* **Types:** `tsc` shows no error in `checklist.tsx`, `questionnaire.tsx`, `demo.ts` or `case-checklist.ts`.

**My focus probe:** in every case focus came back to that line's ⋯ button:
* after Esc on the menu;
* after History opened and closed with Esc;
* after Not applicable was saved with a reason that holds a URL;
* after Not applicable was cancelled with Esc;
* after Request;
* after a keyboard-chosen Upload with a 194-character file name.

The next Tab goes to the following control ("Source"), not "Cases home".

**Long text and zoom:**
* At 200 % zoom (720 CSS px) there is no sideways scroll with the URL reason (`scrollWidth` 720).
* History with the long file name fits its dialog (510/510).

**Words and links:**
* The waiting line now reads "May be needed (the applicant is married)." and then "Answer first, in the Agent view: Current marital status", once and without quote marks.
* After the link is used, the hash is cleared and focus is on the question (breaker m5, my Minor 3).

**Code read of the diff:**
* `checklist.tsx`: `back()` refocuses through a ref after a frame and one task. The trigger is `aria-busy`, no longer `disabled`, and Request and Upload are disabled while busy. A `sending` ref stops a second Enter (breaker m2). `[overflow-wrap:anywhere]` is on the state reason, the reason column and History.
* `case-checklist.ts:205-212`: `inReason` lower-cases only listed opening words, so names, nationalities and form numbers keep their capitals. It no longer clashes with `contracts/runtime.ts` `inSentence`.
* `demo.ts:310-319` (`inLib` at `:311`, retire at `:316`): a line whose fact did not reach the library is retired with `saveRequirement(…, { retire: true })` (supported, `studio.ts:806`) and named in `refused`. The sample file is read inside `try` (`:854-856`). Both are unreachable on today's data, where 0 lines go in.
* **Records:** concept §4 `:67` and the definition of ready `:140`, plus `rows.md:139` and `:858`, now name the checkpoint lines and QA-226. `notes.md` is updated.

**Still open (Minor; listed or to list in the PR):**
* Round 1 Minors 4 and 8, and the breaker's m1 (hot `contracts/documents.ts`), as the builder lists them.
* **Minor 5, second half:** the load log still says "vv.single: 0 conditional document lines and the facts they read" with no "5 wait" (`demo.ts:857`). Row 7 names the five, so this is words only.
* **"Kept" pill removed:**
  * Following breaker m3, the "Kept" pill is gone and "Kept on the list" lives only in the reason. Challenge-r2 M1 (approved) said "one small 'Kept' pill only".
  * Either reading says it once, but the change of direction should be named in the PR ("never deviate silently").
* **No spinner on the ⋯ button during a request:** with `aria-busy` instead of `busy`, `Button` (`controls.tsx:36`) draws no spinner, so a slow Request or Upload shows no sign until the pill changes. It is only feedback (the menu items are disabled while busy).
  * *Fix:* show the spinner inside the button without disabling it.
* **PR body:** I could not re-read it at this commit (GitHub API 503), so I take the coordinator's word that it is updated.

**Journey score, round 2: 9½/10.**
* Accessibility and screen sizes: ½ → 1 (focus fixed; no sideways scroll at 200 % with long text).
* Plain words stays ½ ("it is not the case that …" in kept reasons).
* The other eight criteria are unchanged from round 1.
* D13: 3 → 4. D10: 3 → 4. D16: 4, with the new engine word tests.

**Verdict: Approve** (ca2db0311).

## Round 3: diff-only re-review of `git diff ca2db0311 ecec14a69` (5 Nov; covers 66086a31d and ecec14a69)
**Verdict for ecec14a69: Approve.** There is no open Blocker or Major. The same verdict holds for 66086a31d; ecec14a69 adds only one class.

**What I ran** (own copy rev64 on :4472; stopped and dropped after; live AI off, US$0):
* **At 66086a31d:**
  * Reset, then Load configured: 74.6 s, `cost_usd` 0. Visitor visa, Study permit and With an LMIA released.
  * The load log now reads "vv.single: 0 conditional document lines in, 5 waiting for the facts their condition reads (… row 7 names them)", and row 7 still names the five. This closes my round 2 note on Minor 5.
  * `check_vv_checklist` **67/67**.
  * `product/tools/typecheck.mjs`: "no new type errors (15 known, 0 fixed)"; web has 0 errors.
* **At ecec14a69** (copy restarted, web bundle rebuilt; it holds the new class):
  * `C6.4-screen` **17/17**; C6.4-38 focus holds after Request, Not applicable and History.
  * `C6.4` **19/30**, the same red steps as before.
  * My focus probe is unchanged from round 2: focus returns to the line's ⋯ button after every action, there is no sideways scroll at 200 % zoom, and History fits its dialog.
  * **Spinner probe** (the request held back 1.5 s):
    * while it runs, the ⋯ button shows the spinner, keeps focus, is `aria-busy="true"` and is not disabled;
    * the animation is `spin`, and `none` under `prefers-reduced-motion: reduce`;
    * afterwards the spinner is gone and focus is still on the button.

**Code read of the diff:**
* **`demo.ts`:** `conditionalDocumentLines` returns `{ n, waiting }` on both returns. `documentLines += d.n`, so the count is unchanged.
* **`checklist.tsx:15-23`: the line types are declared in the panel.** This drops the engine import that pulled Node modules into the web check.
  * The types match the API fields the panel reads (`missing[].subject` included). C6.4-31 compares the screen with the API, so a dropped field shows up as a failed check.
  * **Minor (new):** this is a second copy of `PersonLine`'s shape. An engine rename would not fail the web type check, only the browser pack. *Fix later:* move the line types to a Node-free file that both sides import (not hot).
* **Devin (a):**
  * `toAsk` sets `subject: about` for a person's question and `null` for the application's. A fact about the filing now counts as the application's, which closes a wrong "person" case.
  * The panel builds the link from `x.subject ?? p.subject`.
  * Pass/fail in `check_vv_checklist`: the principal's employment letter waiting on the spouse's answer names subject B, never A and never the case.
* **Devin (b):**
  * `whyWaiting` strips only `": answer … first."`. The engine's "check … together they do not give an answer" words stay whole.
  * When every question is answered, the links' lead-in reads "Check, in the Agent view".
  * I read this in the code only; today's checkpoint data has no such line.
* **Spinner:** it replaces the icon inside the button, and `aria-label` stays. `motion-reduce:animate-none` matches `components/ui/spinner.tsx:25`.
* **review.md:** the committed copy at 66086a31d and ecec14a69 equals my round 2 record.

**Still open (Minor; listed in the PR):**
* Round 1 Minors 4 and 8, and the breaker's m1.
* The removed "Kept" pill, to be named in the PR (round 2).
* The duplicated line types above.

**Journey score: 9½/10** (as in round 2, nothing changed).

**Verdict: Approve** (ecec14a69).

## Round 4 (diff-only: the B120 merge, 5cdff49c3..ad82c03ec) (6 Nov)
**Verdict for ad82c03ec: Approve.** There is no Blocker, Major or Minor in the merge. ad82c03ec has two parents, 5cdff49c3 (the approved head) and origin/main 3a1bfd8d0 (B120, #1158). It does M3 fix F2 as the last comment on #1073 and #1158's body ask.

**Merge faithfulness (git):**
* `git diff origin/main ad82c03ec -- '*api/src/demo.ts'` is empty, so `demo.ts` equals main's.
* `git diff origin/main ad82c03ec --stat`: 19 files. These are #1073's own 18 files from `git diff ffcfb45c8 5cdff49c3` (merge base), less `demo.ts`, plus `combination/325-conditional-documents.ts`. Nothing of main's is lost.
* For each of those 18 files, the +/- lines of `origin/main..ad82c03ec` equal the +/- lines of `ffcfb45c8..5cdff49c3`. This includes the two conflicted files.
* `git grep` finds no conflict markers at ad82c03ec.

**325-conditional-documents.ts against the old `demo.ts` hunk:**
* The function body is line-for-line the same, with only these swaps:
  * `this.studio`, `this.ruleFacts`, `this.library` (Screen02 in the old constructor) and `this.audit` become `ctx.get(Studio|RuleFacts|Screen02)` and `ctx.audit`;
  * the local `factsOf` copy becomes the import from `_facts-asked.ts:6` (same text).
* The call (`:87-98`):
  * `if (!cc.setup) return` replaces the old `if (setup)`;
  * `cc.key` replaces `keyOf.get(c.id)` (`080-form-setup.ts` builds `cc.key` from `ctx.keyOf`);
  * `placed(cc).p!` replaces `p`. Step 200 sets it on every combination without a guard, as the old code did before `if (setup)`;
  * `formSetup(ctx)` replaces `.placedFacts`, `.refused` and `.documentLines`;
  * `ctx.author`, `ctx.sme` (as the reviewer, as before) and `ctx.approver` replace the old people;
  * `ctx.said` replaces `said`;
  * the log line has the same words.
* Order: `check_features_registry.ts` lists the steps as `…320-cited-documents, 325-conditional-documents, 330-approve-document-types, 400-…`. So the step runs after the cited lines and before the Approver's document-type loop, as the old call did.
* `CONDITIONAL_DOCUMENTS` is defined and read only in the step file.

**The two other conflicts:**
* `tests/check_stand_ins.ts:16-17`: only SI-15 and SI-16 remain. Main's SI-10 removal is kept and this branch's SI-14 removal is kept. SI-14's chip is at `checklist.tsx:47`.
* `web/src/runtime/cases.tsx`:
  * against main it adds only the `DocumentsPanel` import (`:16`), `firm`/`nameOf` (`:168-170`) and the panel (`:207`);
  * `adding` stays `useState<CanAdd | null>` (`:171`), with `CanAdd` imported from `./questionnaire` (`:11`);
  * `roleOf`, the `co_files` pill, `ItemChannels` and `AddPersonDialog` are main's, unchanged.

**What I ran at ad82c03ec** (copy rv_b1 on :4434; stopped and dropped after; live AI off):
* Reset, then Load configured: `ok`, 91.7 s, `cost_usd` 0.
  * The log reads "vv.single: 0 conditional document lines in, 5 waiting for the facts their condition reads (…; row 7 names them)".
  * Row 7 is `partial` and names the five minor lines, each waiting on `person.age_years`.
* Packs:
  * `C6.4.test.ts`: **19/30**. C6.4-4 passes. The red steps are -8, -8a, -8b, -8d, -8e, -8e2, -8h, -8i, -9a, -9b and -19, the minor's lines, the same set as rounds 1–3.
  * `C6.4-screen.test.ts`: **17/17**.
  * `check_features_registry.ts` (with the api tsconfig): **27/27**.
  * `check_stand_ins.ts`: **9/9**. The register and the 8 chips match.
  * `check_vv_checklist.ts`: **67/67**.
* `product/tools/typecheck.mjs`: "no new type errors (15 known, 0 fixed)"; web has 0 errors.

**Note (not a finding):** `check_features_registry.ts` needs `--tsconfig studio/api/tsconfig.json`. A plain `tsx` run fails on `core.ts`'s decorators after 19 PASS. That is main's test, not this merge.

**Still open (as in round 3, not new):** round 1 Minors 4 and 8, the breaker's m1, the removed "Kept" pill to be named in the PR, and the duplicated line types.

**Journey score: 9½/10** (unchanged from round 3). The merge changes no screen code beyond the conflict lines above, and the browser pack walked the panel at ad82c03ec (17/17).

**Verdict: Approve** (ad82c03ec).
