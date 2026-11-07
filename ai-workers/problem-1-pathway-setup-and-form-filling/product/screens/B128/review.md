# B128 review (QA-153): the parents' facts on IMM 5645, PR #1256

**Reviewed commit:** `c0fcfae335024c09444becabe6d3f8509da25447` against `origin/main` (base 1e1ca443e), 7 Nov 2026, by a fresh reviewer that did not build it. GitHub's PR head is now `4d73a5a2f` (adds only `screens/B128/walk/`, records); the label, if any, is for `c0fcfae` only. **Copy:** isolated `rv_b128` on :4455, fresh database, Demo › Reset then Load the configured checkpoint (102 s); stopped after. Live AI off, US$0, Sample people only. No new screen: weighed on correctness, data safety and the written standards.

## Verdict (screen-review): Rework (Block)
The engine, storage and filler work, and both checks pass. One Major stays: what this PR now writes into IMM 5645's **Mother** and **Father** boxes is asked as "parent 1" and "parent 2", with nothing on screen saying which is which, and the release's own heading says the opposite ("mother or father").

## What I ran and saw
* `tests/runtime/check_b128_parents.ts 4455 xr_studio_rv_b128`: **18/18**. qa's `tests/qa/check_qa153_imm5645_parents.ts` (from `origin/main`, run from a scratch copy, import path only changed): **3/3** (`parents_written 16, not_written 0`).
* Reviewer probes (API, family case with an adult principal, spouse 38 and child 19): the parents' facts are asked on `<person>/parent_1|2`, stored on their own `answer_subject` (party of the person), read back under the key, and their answers never touch the person's (B128-7 too). A case-level fact on a parent is 422. The application's parent, a sibling and a person not on the case are 404 in words. A stale save from a second tab is 409. Confirm section on a parent's section works through the screen ("1 confirmed").
* **No mixing by party:** no code reads `client_canonical_answer` or `answer_subject` by `party_id` (only creates). Every reader goes through `Runtime.state()` (the parent key) or by participant subject ids. `case-prepare.ts:329` guards undo with `UUID.test`, so a parent's change never reaches a uuid query. The party is per case (`createCase` and `addPerson` create one), so nothing is shared between cases.
* **Fill rule untouched:** `confirmation()` and `knownOf()` (case.ts:59, :227) are unchanged. Only the question filter (case.ts:283-284, 299-302) and the REQUIRE subject (:320) changed, so this does not collide with B150.
* **P-319:** no form number or combination key in live code. `ASKED_RELATIONS` is resolver vocabulary. The test names IMM 5645 only as its subject.
* **Tests not weakened:** r1c's tab assertion went from `count() === 4` to an exact list (stricter). The `(?!:)` and `exact: true` edits only disambiguate. `fillEverything` now also answers a parent's date of birth (70 years ago) and still skips a person's own.
* Browser (headless Chromium, my own walk): axe WCAG 2.2 A/AA clean on the officer's parent tab (1440) and the client's overview and parent part (400). No sideways scroll at 400, 720 (1440 at 200 %), 1024 or 1440. No page errors. Case page 1.7 s, parent tab 89 ms, client questionnaire 0.8 s.

## Findings
**Major**
1. **"Parent 1" is written into the Mother boxes, and nothing says so.** Where: `engine/render.ts:97` (label "X: parent 1"), `web/src/runtime/questionnaire.tsx:534` ("Answering for X: parent 1 (a parent, not on this application)"), and the fills line "fills IMM 5645 for X". Release 2's map: `IMM 5645: subject_parent_1 → SectionA.Mother`, `subject_parent_2 → SectionA.Father` (probe on the pinned snapshot).
   * **Failing scenario:** the client opens "About Sample Client R: parent 1 › Your parent 1 (mother or father)". The release's heading tells them parent 1 may be either, so they enter their father. The officer sees "parent 1" too and confirms. The copy then puts the father's name, date of birth, birthplace and address in IMM 5645's Mother boxes, and the mother's in the Father boxes. A child of 19 on a family case is also asked "parent 1/parent 2", so a principal who is the father is likely to type himself as parent 1 (probe: tabs "Sample Child R: parent 1/2"). On parent 2's own part, the heading reads "Your parent 1 (mother or father)" (screenshot `05-client-parent2-part-400.png` in my scratch walk).
   * Before this PR the boxes stayed empty. Now they are filled with possibly swapped people on an IRCC form. EXPERIENCE [M] 8 (prevent errors before messaging them) and [M] plain words.
   * **Fix:** name each parent part, its "Answering for" line and its fills line by what the release's map calls the boxes it fills (for example the map's own captions or headings, "Mother" and "Father": data, not a constant, so P-319 holds). At the least, show the box group in the fills line ("fills IMM 5645 › Mother"). Add a failing test that the words for `parent_1` come from the map.

**Minor**
2. **Unasked parent facts are accepted and stored invisibly.** `api/src/runtime.ts:105` checks only that some map describes the relation, not this fact, and not that a form applying to this person reads it. In the probe, PUT `<principal>/parent_1/person.passport_number` returned 200 ("Saved.", fills none), and the officer can write a 10-year-old child's parent the same way. Nothing ever shows these answers. Fix: refuse unless `caseView` would ask that fact for that key (STANDARDS §3.4: rules checked on the server).
3. **No database guarantee of one subject per party and relation.** `runtime.ts:96-114` relies on an advisory lock plus "oldest by uuid" (which picks the lowest id, not the oldest). This holds today, but STANDARDS §3.4 asks for the database to check it too. Fix: record the choice in the PR, or add a partial unique index in a later migration row.
4. **The Preview and Questionnaires leave the parents out while the client is asked them.**
   * Where: `engine/runtime/preview.ts:117`, `engine/runtime/questionnaires.ts:67`, `engine/runtime/question-count.ts:8`, `web/src/runtime/questionnaire.tsx:831`. All of them match `subjectId === person` exactly.
   * Effect: the release-2 preview's data has `principal/parent_1` sections, yet the principal's chip still counts 142 questions and the Preview shows none of the 14 parent questions. The client meanwhile gets 4 extra parts per parent ("3 of 83 parts").
   * Fix: include `<person>/parent_*` in `aboutPerson`, or say in words that the parents are asked separately.
5. **Duplicate typing of people already on the case.** `engine/runtime/case.ts:283-284` asks the parents of any person whose form applies, including a child whose parents are the principal and spouse on the same case. This is two sources for one fact, and the values can disagree across one application's forms. Fix: record it as a question for the tech lead, or skip it when R4 can resolve the parent to a person on the case.
6. **Words.**
   * The client overview still says "You answer for everyone travelling on this application" (`questionnaire.tsx:399`), now above six parent sections for people who are not travelling.
   * A parent's client answer reads "confirmed once that person confirms on their own link" (`contracts/runtime.ts:107` via `confirmation()` with no participant), but a parent has no link.
   * The release's headings ("Statutory declaration of common-law union" for a parent's name, "Applicant" for their occupation) and its question-less meanings ("Whether this family member will accompany the subject to Canada.") are configuration. The builder's walk lists them, which is not silent. They stay a question for the tech lead.
7. **The confirm contract repeats the relation list.** `contracts/runtime.ts:95` hard-codes `parent_[12]` next to `ASKED_RELATIONS` (STANDARDS §6: no duplicated logic). Fix: build the pattern from one shared list.

## D1-D20 (1-5)
D1 Requirement fit 4: every IMM 5645 parent fact is asked and written (B128-4, -12, -13); words for which parent is which are missing (#1). · D2 Data integrity 3: own subject per parent, 409 and lock hold; swapped-parent risk (#1) and unasked facts accepted (#2). · D3 Reuse 4: the person's library facts and placements are reused; one rule-list duplicate (#7). · D4 Rule integrity 4: the form waits for parent facts and is ready only once they are confirmed (B128-9, -11). · D5 Stability 4: stale tab 409; double first answer locked. · D6 Governance 4: audit lines per answer and confirm are unchanged. · D7 AI trust n/a (no AI). · D8 Orientation 3: tabs say "X: parent 1" right after the person. · D9 Flow 3: 4 scattered sections per parent. · D10 Language 2 (#1, #6). · D11 Feedback 4: "To confirm", fills line, readiness counts. · D12 Visual 4. · D13 Accessibility 4: axe clean; widths and zoom fine; the dialog opens and saves by keyboard; the tab list was not reached by Tab within 120 presses on the long case page (existing layout). · D14 Team look 4. · D15 Speed 4. · D16 Testability 4: pass and fail per rule; removing the `applies`, key or transform rules turns B128-5b, -9 and -2a red; no test for the "no map describes it" refusal. · D17, D20: simulated only. · D18 Provenance 3: fills names the form, not the box. · D19 Closure 4: answer → confirm → copy written, read back from the PDF.

## Journey test (reviewer role; the one score for this check)
Journeys walked:
1. The officer opens the parent tab, adds a name in the dialog and confirms the section (1440).
2. The client on a phone (400) opens parent 2's part.
3. Recovery and wrong data: a stale second tab, wrong subject keys, a case fact on a parent.
4. Across the boundary: Generate copy, then the PDF read back (the builder's check).

| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | 18/18 and 3/3; 16 of 16 parent boxes written |
| next step obvious | ½ | parent tabs and parts appear in order; 4 sections per parent under unrelated titles |
| plain words | ½ | "parent 1" with the heading "Your parent 1 (mother or father)" on parent 2; library meanings as questions |
| feedback and state | 1 | "To confirm", "fills IMM 5645", readiness "Waiting for 1 fact" after a change |
| correct data | ½ | storage is right and separate; Mother/Father swap is invited (#1) |
| error recovery | 1 | 409 stale with the newer answer; 404 and 422 in words |
| accessibility and screen sizes | ½ | axe clean, no sideways scroll at 400/720/1024/1440; keyboard reach of the tabs not shown |
| speed | 1 | 89 ms tab, 0.8 s client view |
| visual quality | 1 | team look; screenshots consistent |
| trust and sources | 1 | origin line ("Agent view · Case officer · time"), Sample labels |

**Score: 8/10. Pass (no 0).** Raised most by #1 (plain words, correct data).

## Could not check
* An intended user's unaided walk (D17, D20 stay with the founder) and a real screen reader.
* A validated copy going out of date after a parent's change (`out-of-date.ts` already keys relations; not exercised).
* The r1c and c44 browser suites on the fixture, and `run-suites.sh --changed`, were not re-run by me.
* `graph.mjs` was not run (it rewrites `qa/GRAPH.md`, and I may write only this file). The new route `PUT …/answers/:subject/:relation/:field` is exercised by B128-6.

**Verdict: Block** — fix #1 (Major) with a failing test; fix Minors #2-#7 or list them in the PR.
