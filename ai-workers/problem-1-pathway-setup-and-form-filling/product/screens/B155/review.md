# B155 review, round 1 (QA-153 Section C): brothers and sisters on IMM 5645, PR #1367

**Reviewed commit:** `0dd8397eef9bc9557ece24d6b617a8c21953e30a` (branch `claude/pensive-bell-7ko7fb`) against `origin/main`, 8 Nov 2026, by a reviewer that did not build it. Line numbers below are at this commit. Uncommitted edits by another session showed up in the shared working tree during the review (14:13–14:15 UTC). My copy's server and web build were started at 14:01 from the commit, so none of my runs used those edits.
**Copy:** isolated `rev155` on :4471 (fresh database, Demo › Reset, then Load configured as user-A, 115 s), stopped after. Live AI off, US$0, Sample people only. **Scope:** there is no `concept.md` for B155, so I checked against the BACKLOG row's done-when (tech lead, 8 Nov), the standards, and B128 as the pattern. There is no new screen: the work adds a group to the existing Agent view and client questionnaire.

## Verdict (screen-review): Ship after fixes → **Block** (one Major open)
Storage, refusals, Confirm section, the fill and the second child's Section B fix all work and are tested. One Major remains: an 8th brother or sister (an entry the form has no row for) is never waited on. IMM 5645 reads ready while the client has been told "your officer adds it on an extra sheet".

## What I ran
* `tests/check_b155_siblings.ts 4471 xr_studio_rev155`: **27/27**. `tests/runtime/check_b128_relatives.ts`: **18/18**. `acceptance/C7.7.test.ts` on the checkpoint: **33/33** (fixture not re-run). `graph.mjs --check`: exit 0 (G1 0, G2 0).
* **API probes** (family case on release 2):
  * Storage: two adds raced with "none apply". Result: 201, 201, 409 ("This group has 2 entries…"), and exactly **one** `answer_subject` of kind `sibling` on the principal's party.
  * Fits: 8 entries give name fits `T×7,F` and "accompanies" fits only at index 6.
  * Refusals:
    * Confirm of `personal_details` on the sibling key: 404 in words.
    * Client Confirm: 403.
    * A sibling row removed through the person's own route: 404.
* **Weakened tests? No.** In B128-8, `no2` went 404→422 and `no4` went 400→404 because the rule changed, and both still assert the words. B128-5 and the minors property now state the B155 rule just as strictly. `ASKED_RELATIONS`→`ONE_PERSON_RELATIONS` keeps the parents property about parents.
* **P-411 / B150 unchanged:** `confirmation()` and `knownOf()` are not touched. B155-12 shows a declared sibling answer written at once and readiness saying "not confirmed".
* **Browser** (my walk, Chromium; details in `journey-test-reviewer-2026-11-08.md`): axe WCAG 2.2 A/AA clean, and no sideways scroll, at 1440, 1024, 720 (1440 at 200 %) and 400 px. Keyboard-only save of entry 1's name and keyboard Confirm section both worked. No page errors.

## Findings
**Major**
1. **An entry past the form's rows is never waited on, so the 8th brother or sister can be dropped from the filing silently.**
   * Where: `engine/runtime/forms.ts:197` and `engine/runtime/case.ts:435` both filter rows with `x.fits` for a list relative. An entry at index ≥ capacity fits no fact, so it is exempt from readiness and from the section's `missing` entirely.
   * Failing scenario (probe, case `9b3a83aa…`): 7 entries complete and confirmed, plus an 8th with only a name. IMM 5645 readiness is `ready: true`, with no sibling line. The section's `missing` is `[]`. The 8th entry shows "This entry does not fit on the form … your officer adds it on an extra sheet" (my screenshot `j4-400-entry7-8.png`), yet nothing ever asks for that sheet's facts.
   * Contrast on the same case: the principal's `employment` group (capacity 3) with a 4th blank entry gives 7 missing, and IMM 5257 is `ready=false`. That is the existing rule for rows that do not fit.
   * IMM 5645 p. 1 says "Include ALL family members". The break report on this PR (finding 1) found the same.
   * **Fix:** exempt a list entry only for a fact that has no box in a row that *does* exist. That is, require when `x.fits || x.index >= capacity`, in both places. Add a failing test: 8 entries with the 8th incomplete must give "not ready".

**Minor** (fix or list in the PR)
2. **The `subject_child` row fix drops capacity for children's repeating facts on other forms.**
   * Where: `engine/render.ts:140-142`. `factRow = null` also stops adding the row to `needs.rows`.
   * Measured with `render()` on the checkpoint's `pnp.express_entry` snapshot: the child's `person.trip_destination` (IMM 5562) and `person.previous_residence_country` (IMM 0008) rows go from `[0]` on main to `[]`. The capacity becomes null and every entry "fits", so a child's 2nd trip or previous country loses its "Does not fit on the form" flag.
   * What it does not change: the values filled. Row-less known equals row 0 (`case.ts` knownOf). IMM 5645 Section B, IMM 5406, IMM 5707 and IMM 5257 are also unaffected (only row 0 or none).
   * Fix: keep `e.row` for `needs.rows` when the fact is a per-row placement, or record the trade-off in the PR.
3. **Answers a row has no box for are accepted, hidden, then confirmed unseen.**
   * Where: `api/src/runtime.ts:434` has no per-row fit check.
   * Scenario: "accompanies" PUT on entry 1 gives 200 "fills IMM 5645 (2 form fields)". The `inEntry` filter (`questionnaire.tsx:651`) hides it, but Confirm sends every row's id (`:808`), so the probe confirmed it (`confirmed: 2`). It is reachable without the API: answer it on entry 7, then remove an earlier entry, and the answer slides to index 5, hidden.
   * This is against "Confirm section vouches only for the answers shown".
4. **The save message counts all rows' boxes.**
   * Where: `api/src/runtime.ts:466`.
   * An entry's name says "fills IMM 5645 … (7 form fields)", including on entry 8, which fills none. The entry dialog repeats the 7.
5. **A child's sibling key is accepted.**
   * Where: `api/src/runtime.ts:135` checks that *a* form maps `subject_sibling`, not one that applies to that person.
   * `POST …/groups/<child>/sibling/rows` gives 201 and creates a hidden `sibling` subject on the child's party. This is the same gap B128 review m2 noted for parents, extended to lists.
6. **The intro lists every fact for every entry.**
   * Where: `questionnaire.tsx:700, :966`.
   * "Each entry asks: … Whether this family member will accompany the subject to Canada" appears, though only entry 7 asks it. The builder lists this as a question.
7. **Out-of-date lines for siblings have no time.**
   * Where: `api/src/case-prepare.ts:308/312`. `answerOf` takes `!a.rowKey`, so `at` is always null for a sibling change. The "saved" value is null too, which is safe: no wrong value is shown.
8. **Question order and words come from the map and the library.** Address comes first, and labels end with periods ("The person's current occupation."). This is release data (B158's area), not a defect of this row, and is listed in the builder's walk.

## D1–D20 (1–5)
D1 Requirement fit 4: Section C asked, stored, written, and its blanks give reasons; the 8th entry gap (#1). · D2 Data integrity 3: one subject per person under a lock, raced; #1 and #3. · D3 Reuse 4: B128 subject and groups reused. · D4 Rule integrity 3: #1 breaks the existing overflow rule. · D5 Stability 4: races hold (409s). · D6 Governance 4: audit per add, remove and none-apply, naming "'s sibling". · D7 AI n/a. · D8 Orientation 4: tab "…'s brothers and sisters" after the parents. · D9 Flow 4: one section, entries in order. · D10 Language 3: #4, #6, #8. · D11 Feedback 4: toast, "1 answered · 1 to confirm", readiness lines. · D12 Visual 4. · D13 Accessibility 4: axe clean, keyboard save and confirm. · D14 Team look 4. · D15 Speed 4: tab 144 ms, client view 1.4 s. · D16 Testability 4: pass and fail per rule; no test for the overflow entry. · D17, D20: simulated only. · D18 Provenance 4: "Agent view · Case officer · time · fills IMM 5645". · D19 Closure 4: answer → confirm → PDF read back.

## BIC scorecard (case-side; evidence = my walk steps and screenshots in the journey report)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 Ask once | N/A | siblings are not people on the case; nothing to carry |
| BIC-02 Asked for a reason | Partly | asked only for adults whose IMM 5645 applies (B155-3b); the intro lists "accompany" for entries that do not ask it (#6) |
| BIC-03 No stale answers | Partly | a removed entry is no longer read; a slid "accompanies" answer stays hidden and stored (#3) |
| BIC-04 Incomplete normal | Met | "Not answered", "(optional)" on the client's address parts |
| BIC-05/06/07 | N/A | no document or AI values |
| BIC-08/09 | N/A | no applications or roles changed |
| BIC-10 Task list | Met | client part list "Brothers and sisters · 6 to answer / Not started" |
| BIC-11 One primary | Met | Confirm section is the only filled button in the panel (1440, 1024) |
| BIC-12 Check before it leaves | Partly | readiness passes with an unwaited 8th entry (#1) |
| BIC-13 Errors | Met | refusals in words (422 "Name the row…", 409 "This group has 2 entries…") |
| BIC-14 Tooltips | Met | "Does not fit on the form" pill titled "The form has room for 7 entries" |
| BIC-15/16/17 | N/A | no channel, signing or review step here |
| BIC-18 States | Met | "No entries. The forms need one or the other before filing." with Add an entry / None apply |
| BIC-19 Layout | Met | one heading and one primary button per panel; no sideways scroll |
| BIC-20 Accessible | Met | keyboard save and confirm; 720 px (200 %) clean |
The three Partlys are Should. The BIC-12 one is the same defect as Major #1.

## Could not check
An intended user's unaided walk (D17, D20) and a real screen reader. C7.7 on the fixture and the full local suites were not re-run by me (builder: green). Signing and filing past Prepare.

**Verdict: Block.** Fix Major #1 with a failing test. Fix Minors #2–#7, or list them in the PR. Journey score: **8.5/10, pass** (`journey-test-reviewer-2026-11-08.md`).
