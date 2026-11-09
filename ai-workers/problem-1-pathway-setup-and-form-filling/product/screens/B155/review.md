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

## Round 2 (diff only, P-293 (3)): `0dd8397e..d2d12d24`
**Reviewed commit:** `d2d12d24c622d82971362facc5a31e2301660caf`, 8 Nov 2026, same reviewer. I read only `git diff 0dd8397e..d2d12d24` (11 files; code in `api/src/runtime.ts`, `engine/render.ts`, `engine/runtime/{case,forms,relatives}.ts`, `web/src/runtime/questionnaire.tsx`, two tests). Line numbers below are at `d2d12d24`. The working tree was clean at `d2d12d24`.
**Copy:** isolated `rev155b` on :4473 (fresh database, Demo › Reset, then Load configured as user-A, 135 s; the web build was newer than the source), stopped after. Live AI off, US$0, Sample people only.

### What I ran
* `tests/check_b155_siblings.ts 4473 xr_studio_rev155b`: **33/33**, including the new B155-13, -13a/b/c, -14 and -14a.
* `tests/runtime/check_b128_relatives.ts`: **20/20**.
* `tests/runtime/check_b128_parents.ts` on my copy: **23/23**.
* `tests/runtime/check_case_engine.ts`: **77/77**. `tests/check_engine.ts`: **44/44**.
* `acceptance/C7.7.test.ts` on the checkpoint copy: **33/33**.
* `graph.mjs --check`: exit 0 (G1 0, G2 0).
* **Fail-first, Minor 2:** I used a `git archive` of `d2d12d24` in my scratch folder, with only `render.ts:141` put back to round 1's `e.person === "subject_child" ? null : e.row`. `check_b128_relatives` then gives **19/20**: "a child's repeating fact keeps the map's row" fails with `capacity: null`. So the new test fails on round 1's code and passes on this head.
* **API probes** (new cases on release 2, principal only):
  * *8 entries, everything filled and confirmed* (`fillEverything`). IMM 5645 readiness is `ready: false` with exactly one line: `entry:sibling:8`, "Entry 8 of Sample Client F's brothers and sisters", reason "left empty on the form", why "the form has room for 7 entries: write this one on an extra sheet". The section's `missing` is `[]`.
    * Ready to file shows it as CRITICAL `fields_left_empty`, with key `<filing>|empty|entry:sibling:8`.
    * After removing entry 1, the old 8th entry is the 7th: the line goes away and readiness is clean.
  * *An entry 9 added blank:* IMM 5645 waits on 8 facts, all "not answered" (CRITICAL `missing_facts`). Entry 9 is asked in full.
    * Passing `fields_left_empty` with a reason works (201). The key names `entry:sibling:8,entry:sibling:9`, so a pass never covers a later 10th entry. `missing_facts` still holds the filing.
  * *Minor 3:*
    * "accompanies" on entry 1 gives 422 "The form has no box for this in entry 1: it is asked in entry 7 only."
    * On entry 7 it gives 200 "(2 form fields)". An unknown row key gives 400.
    * When an unconfirmed "accompanies" slides from entry 7 to entry 6, Confirm section confirms 0 of it, even when its id is sent as seen. It stays `DECLARED` and is not read by the fill (row 6 has no box).
* **Browser** (Chromium, my copy, case with 9 entries):
  * Officer, Brothers and sisters tab: entry 9 shows "Does not fit on the form" and all 8 questions. Entry 6 shows no "accompany".
  * Saving entry 9's occupation shows the toast "Saved. This entry has no row on the form: write it on an extra sheet."
  * Ready to file lists "Pass with a reason: CRITICAL: IMM 5645 … 2 form fields IRCC's form marks mandatory would be left empty (Entry 8 of …: the form has room for 7 entries: write this one on an extra sheet, Entry 9 …)".
  * IMM 5645's forms card at 1440 and 400 px: axe WCAG 2.2 A/AA clean, no sideways scroll, no page errors.

### Round 1 findings
* **Major 1, fixed.**
  * The fix: `cellAsked` (`engine/runtime/relatives.ts:38`) asks every question of an entry that has no row on the form. It is used for the section's `missing` (`case.ts:436`) and for readiness (`forms.ts:198-199`). One readiness line per entry off the form (`forms.ts:208-215`).
  * The rule is now the same as for any group's entry past the form's room (the `employment` contrast from round 1). B155-13a/c test it with a passing case and a failing case (B155-13b).
  * **The reason and code choice is right.**
    * `"needs a fix"` counts in `blocksLock` (`forms.ts:229`), so the copy's lock would be held back. IMM 5645 has no 8th row, so nothing on any screen could ever clear it: a dead end.
    * "left empty on the form" never holds the lock back. It stops Ready to file as CRITICAL until a person passes it with a reason (P-237, P-315), keyed by the entries.
    * That is the existing pattern for a box written by hand (QA-165, the tech lead's option 1 on #1318). The entry's own facts still block as `missing_facts` until they are answered and confirmed, which I measured.
    * The remaining issues are its words and where it shows (new Minor 9). They are not the gate.
* **Minor 2, fixed.** `render.ts:141` keeps the map's row for a `per_row` child fact. The test was proven fail-first (above).
* **Minor 3, fixed for refusal and Confirm.**
  * PUT refuses in words (`api/src/runtime.ts:437-446`).
  * Confirm section skips cells an entry does not show (`:635`, `:645`).
  * The web sends only shown cells (`questionnaire.tsx:808-812`). `inEntry` now matches `cellAsked`.
  * One leftover is counted as new Minor 10.
* **Minor 4, half fixed.**
  * The save toast is right (measured).
  * The entry dialog still says "Sample Client H's brothers and sisters · entry 9 · fills IMM 5645 for Sample Client H (7 form fields)" (`questionnaire.tsx:922`).
  * The answer's provenance line still says "fills IMM 5645 for Sample Client H" for entry 9 (`questionnaire.tsx:841`).
* **Minors 5–8:** not changed. The builder raised them as questions for the tech lead, which this round allows (listed in the PR).

### New findings (Minor; fix or list in the PR)
9. **The extra-sheet line is counted on the forms card but listed nowhere there, and its words call it a mandatory form field.**
   * The forms card counts it in `emptyFields` (`web/src/runtime/forms.tsx:131`). The pill reads "2 mandatory form fields left empty", and its title says "(listed below)" (`:150`).
   * But the list below shows only `f.fields_open` (`forms.tsx:165-169`), which is empty here. So nothing on the card names entries 8 and 9 (measured at 1440 and 400 px).
   * Ready to file names them, but under "N form field(s) IRCC's form marks mandatory would be left empty" (`engine/runtime/readiness.ts:168`). IMM 5645 marks no 8th row mandatory: it has none.
   * Fix: list these lines on the card ("Entries to write on an extra sheet"), and word them as entries. The gate itself stays as it is.
10. **An unconfirmed answer that slides into a cell its entry does not show keeps "1 to confirm" forever.**
    * `case.ts:431` and `:442` count every row's answer in `answered` and `confirmed`, including cells that `cellAsked` hides.
    * Measured on a case where "accompanies" was answered on entry 7 and entry 1 was then removed:
      * the section pill (`questionnaire.tsx:860`) reads "1 answered · 1 to confirm";
      * Confirm section, even sent the hidden id, confirms 0.
    * Readiness, the fill and the Confirm button are unaffected (the web's `open` uses shown cells). Only the count is stuck, and the stored answer stays (BIC-03).
    * Fix: count only the cells `cellAsked` keeps, as `missing` already does.

### BIC changes since round 1
* BIC-12 *Check before it leaves*: Partly → **Met**. The 8th entry holds Ready to file until its facts are confirmed and the extra sheet is passed with a reason.
* BIC-03 stays **Partly** (new #10).
* BIC-02 stays **Partly** (#6, a question for the tech lead).

### D1–D20 changes
* D1 4 → 5: Section C now waits for every entry.
* D2 3 → 4: #3 fixed, #10 is count-only.
* D4 3 → 5: the overflow rule is the same as other groups.
* D10 stays 3: #4 dialog, #6, #8, #9 words.
* D16 4 → 5: overflow and refusal tests, fail-first for #2.
* The rest are unchanged.

### Could not check
* The full local suite set (the builder says it is re-running).
* C7.7 on the fixture.
* A real screen reader, and an intended user's unaided walk (D17, D20).

**Verdict (round 2, on `d2d12d24`): Approve.** There is no open Blocker or Major. Fix Minors 4 (dialog and provenance), 9 and 10, or list them in the PR, beside 5–8 for the tech lead. Journey score: **8.5/10, pass** (`journey-test-reviewer-2026-11-08.md`, round 2).

## Round 3 (diff only, `83a5fac..807d5e2`, P-293 (3); the tech lead allowed it at 22:00 IST)

This round covers the two CI fixes for run 42491664598, shard 3: 3 files, +5/−4. Nothing else was re-reviewed. The round 2 findings and the journey score (8.5/10) stand.

### What I checked
* **The refusal's words** (`api/src/runtime.ts:445`). The message is now "The form has no room for this answer in entry N: it is asked only in entry M."
  * It no longer says "box", so P-63 / QA-182 is met.
  * It is plain, it names both entries, and it tells the person where the answer belongs.
* **B155-14's assertion** (`tests/check_b155_siblings.ts:176`). It is not weakened: it is stricter.
  * It still requires a 422 on entry 1 and a 200 on entry 7.
  * The regexp now also requires the "no room for this answer" prefix and the closing full stop.
  * QA-182 and check_c102 were not edited.
* **The finished story's skip condition** (`api/src/finished-story.ts:157`).
  * A section is now skipped only when all of these hold: every answer is confirmed, every row answer is confirmed, and the group has no "none apply" or its "none apply" is confirmed.
  * The API does return `none_apply.confirmed`. `engine/runtime/case.ts:423-426` spreads `confirmation(...)` into it, and `ViewGroup.none_apply` in `contracts/runtime.ts:153` is a `ViewAnswer`, which carries `confirmed: boolean`. So the new optional field in the local `Section` type matches what the API sends; the condition does not always read as false.
  * **Can it loop?** No. The confirm loop is one pass over the sections, inside the existing `for (let pass = 0; pass < 4; pass++)` (`:138`).
    * At worst, a "none apply" the officer's Confirm cannot settle would be posted once per pass: 4 times at most.
    * The section count in the result would then run high. That is the same behaviour unconfirmed answers already had, so it is nothing new.
  * **Can it confirm something unseen?** No. `seen` (`:155`) already lists the "none apply" id beside every answer and row id shown in that fresh read. The fix changes only *whether* to post, not *what* is sent.
    * A stale "none apply" on a group that has rows would also be confirmed. It is in `seen`, so the officer has seen it. That is harmless.

### Run on my own copy (`rev155c`, :4475, fresh database, head `807d5e2`; stopped after; US$0)
* `check_qa182_no_box_words`: **8/8**.
* `check_c102_finished_story_refusals 4475`: **20/20**. M1 shows 161 answers typed and 6 re-confirmed (claimed equals the data). M2 reads `partial` with 1 filing not recorded.
* `check_b155_siblings 4475` on a second fresh database: **33/33**. B155-14 detail: `[422, "The form has no room for this answer in entry 1: it is asked only in entry 7.", 200]`.
* I did not repeat the 18/20 fail-first. I rely on the builder's reproduction (the facts stage named three "Brothers and sisters" lines).

### Findings
* **Minor 11 (words, `api/src/runtime.ts:445`).** The round-2 text pluralised: "entr${size === 1 ? "y" : "ies"}". The new text always says "entry", so a fact mapped to several rows would read "asked only in entry 3, 5".
  * For IMM 5645 today, the only such fact is "accompanies", and it maps to one row (entry 7). The case is not reachable now.
  * Fix: bring the plural back ("entries 3 and 5"), or list it in the PR.
* **Nit.** P-63's own word is "form field". "The form has no form field for this answer in entry N" would match the vocabulary exactly. "No room" is plain and acceptable as it is.

**Verdict (round 3, on `807d5e25e3cf9d959cc439f6d7c0fec8a637e57e`): Approve.** There is no open Blocker or Major. Minor 11 joins Minors 4, 9 and 10 (fix them or list them in the PR), beside 5–8 for the tech lead. Journey score unchanged: **8.5/10, pass** (round 2; this diff touches no screen journey beyond the refusal's words).
