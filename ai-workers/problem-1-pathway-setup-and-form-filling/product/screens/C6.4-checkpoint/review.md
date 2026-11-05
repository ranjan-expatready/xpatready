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
