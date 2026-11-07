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

## Round 2 (diff only, `c0fcfae..f6ca02e`; last round under P-293 (3))
**Copy:** `rv_b128` on :4455, fresh database, configured checkpoint (117 s); stopped after. US$0, Sample only.

**Ran:** `check_b128_parents.ts` **23/23**; qa's `check_qa153_imm5645_parents.ts` **3/3**; my own probe on a family case (principal 40, spouse 38, child 19, child 10); a browser walk (officer at 1440, 1024 and 720; client at 400). axe clean on every state; no sideways scroll; no page errors; parent tab 75 ms.

**Each finding:**
* **Major 1, resolved.** `engine/runtime/relatives.ts` `parentWord`/`relativeLabel` name a parent from the box paths of the forms that apply to that person. `case.ts` puts that name on each parent question's `about_label`.
  * Seen live: tabs, client regions and "Answering for" read "Sample Client R's mother" and "… father" (release 2: Mother → `parent_1`, Father → `parent_2`, as written to the PDF by B128-12).
  * Readiness "about" says "'s mother" or "'s father" (B128-9).
  * The words "parent 1" or "parent 2" appear nowhere in the case, forms or prepare responses.
  * Boxes that name no parent fall back to "first/second parent" (B128-2d; r1c's fixture).
  * The name comes from the release's own box paths, not a form number, so P-319 holds. Removing `labelOf` turns B128-4a red; the rule has a pass and a fail test (2c, 2d).
* **m2, mostly resolved.** A fact no map reads about that parent is now 404, with nothing stored (B128-8a; `runtime.ts:105-106`). Still open (Minor, not a blocker): the check does not ask whether a form *applying to that person* reads the fact. In the probe, PUT `<child of 10>/parent_1/person.full_name` returned 200 "Saved.", and nothing shows it.
* **m3:** the comment is corrected (lowest id). The database check is raised as a question for the tech lead (needs a migration). Accepted.
* **m4, m5:** deferred in the PR with reasons (the screens lane's files; resolver R4's contract). Not hidden, so accepted as follow-ups. Seen live: the 19-year-old child is still asked "Sample Child R's mother/father" although both are on the case.
* **m6, resolved.** A parent's answer waits "for the officer's "Confirm section" (a parent has no link of their own)" (B128-9a). This is presentation only; `confirmation()` and `knownOf()` are untouched (no B150 overlap). The overview adds ", and for the parents its forms ask about".
* **m7, resolved.** `ASKED_RELATIONS` has one home (`contracts/runtime.ts:95`), and the confirm pattern is built from it.

**New in this diff:** nothing blocking. Tests are not weakened: r1c and c44 tab locators moved from `(?!:)` to `(?!'s )`, and r1c still asserts the exact tab list. The release's section titles over a parent's questions ("Your parent 1 (mother or father)" on the father's tab, "Statutory declaration of common-law union" over a name) are configuration. They are a question in the PR, and now sit next to an unambiguous name ("… for Sample Client R's father").

**Journey score, round 2: 9/10.** Plain words ½ (the configuration titles above). Correct data 1. Accessibility ½ (keyboard reach of the tab list still not shown). Everything else is as in round 1.

**Open Minors for the PR's follow-up list:**
* m2 remainder: a form that applies to the person (`runtime.ts:105`).
* m3: database check.
* m4: Preview, Questionnaires and counts.
* m5: a child's parents who are on the case.
* The configuration titles.

Verdict: Approve

## Round 3 (diff only, `2c7f6e422..eb8ff41`; approved by the tech lead, Lead 31)
**bb92858, the Confirm section key moved out of the M2 hot file.**
* `contracts/runtime.ts` is byte-for-byte main's again. `ASKED_RELATIONS` and `SUBJECT_OR_RELATIVE` have one home, `engine/runtime/relatives.ts:11-15`, so m7 still holds.
* `api/src/runtime.ts:39` `ConfirmSubject = ConfirmSection.extend(...)` keeps the contract's messages; `confirmSection` (:498) is its only user, and no web code imports `ConfirmSection`.
* Exercised directly with the schema: a uuid, `/parent_1` and `/parent_2` pass; `/sibling`, `case` and `/parent_1/x` give "Choose whose section to confirm."; a bad `seen` id is refused.
* `import { z }` is a value import, as `.extend` needs. `tsc -p api` shows no error in any touched file (the only errors are old ones in unrelated tests).

**eb8ff41, out-of-date reads a parent by the parent's key (Devin).**
* `engine/runtime/out-of-date.ts:37,41` now call `words.saved`/`words.at` with the whole `f.about`. `case-prepare.ts:227-233` looks answers up by `subjectId`, and `state()` gives a parent's answers the key `<id>/parent_1`, so the lookup now finds the parent's own answer.
* For a person, the application (`subjectOfAbout`) and the representative, `f.about` has no "/" and equals what was passed before, so nothing changes for them.
* Before, a parent's newer unconfirmed value showed as a change to "no answer, confirmed", with no date.
* `tests/runtime/check_b128_relatives.ts` passed **10/10** (fast-check is already a dependency used by other checks).
* Against round 2's `out-of-date.ts` (scratch copy, test unchanged) it is **8/10**: the two factChanges cases fail. The rule's test fails when the rule is removed.

**Not re-run by me:** `check_b128_parents.ts` and qa's check on a fresh checkpoint. The machine's shared database cluster was stopped when I tried (`isolated.sh`: "start the demo database first"), and starting it is not mine to do. The coordinator reports 23/23 and 3/3 on bb92858. The API part of this diff is a schema swap I checked directly; the engine part is pure and covered above.

**New Minor:** an out-of-date line still calls a parent "Sample Client R's parent 1", not "… mother" (`out-of-date.ts:40`, `relation.replace`). Scenario: a validated IMM 5645 copy, then the mother's name changes; the Prepare line names "parent 1" while her tab says "mother". This is wording only, not wrong data, and `check_b128_relatives.ts` pins the current words. Fix later: pass the case view's parent name through `words.person`.

**Journey score, round 3:** 9/10, unchanged (no screen change).

Verdict: Approve

## Round 4 (diff only, `5e63f632b..329b777`; asked for by Lead 32 after merge batch #1280 failed C4.1)
**The fix:** `engine/runtime/preview.ts:101-106` builds the Preview's client questionnaire from the same `caseView`, then drops relatives' sections and checks (`isAskedRelative`). Nothing else changed: no case route, no engine rule, no `acceptance/` file.

**Why it is right:**
* C4.1's rule is "a fact the passport supplies is not asked of the principal". `acceptance/C4.1.test.ts:152-162` is unchanged in this PR (the only `acceptance/` change in the whole PR is round 1's `lib/m3.ts`). So the protected assertion is not weakened.
* The failure came from the test gathering every label of the Preview's questionnaire, which since B128 included the Sample parents' "Family name as shown on passport…" question. That is correctly asked of a parent, who holds no passport on the checklist, but the Preview's parts, chips (`questionsFor`) and document skips are all per person of its Sample family.
* Dropping relatives there brings the questionnaire data into line with what the Preview already showed and counted. That is the round-1 m4 gap stated plainly rather than hidden, and it is still a listed follow-up.
* A case still asks the parents: the check's control case shows `principal/parent_1` and `/parent_2` in a case view of the same family.
* `questionnaire.summary` comes from the unfiltered view. Its only use on the Preview (`web/src/pages/workspace/preview.tsx:177`, `not_asked`) counts placed questions that no form reads, and a parent question that *is* asked is never in it, so the notice does not change.

**Ran:**
* `tests/runtime/check_b128_relatives.ts` passed **13/13**.
* Against round 3's `preview.ts` (scratch copy, test unchanged) it is **12/13**: "the Preview's client questionnaire has … no relative's section" fails with `principal/parent_1`, `/parent_2`. So it fails first.
* The checks-filter assertion cannot fail on this synthetic release, which has no checks. That is a weak control (Minor), not wrong.

**Not run by me:** C4.1 on the six, the Preview suites, the protected regression set, and the checkpoint checks. `isolated.sh` refused a fifth test copy ("4 test copies already run (ports 4450-4453), cap 4"). The coordinator reports C4.1 at 25/25 (24/25 before the fix), `check_b128_parents` 23/23, qa's check 3/3, and C7.7 on the checkpoint with the same 33 verdicts as main. The Preview suites and the regression set were still running when I wrote this; they need to be green before merge.

**Journey score:** 9/10, unchanged (no runtime screen changed; the Preview shows what it showed before B128).

Verdict: Approve

## Round 5 (the merge of origin/main 05d52c06c into the branch, `2372bc4`; asked for by Lead 32, P-270)
**The resolution:** the one conflict, in caseView's fills loop (`engine/runtime/case.ts:300-306`), keeps main's B107 condition `!gatedOff(c, b)` and its line, and puts B128's two statements (`applies.add`; `boxesOf` for a parent) inside the loop as before.
* A box whose gate does not hold now neither asks a parent's question nor names the parent. That is consistent: such a box is never written.
* `gatedOff` evaluates a parent's box on its owner (`b.about.split("/")[0]`), as B128's REQUIRE handling already does (`case.ts` caseView).
* Main's other new code reads no relative key wrongly:
  * `putAnswer`'s `isFilingFact` / `ONCE_WORDS` check still compares with the owner's role, so a parent is a person, not the application.
  * The scope tag's `read_for` (`case.ts:266`) is per form subject.
  * `previewFamily`'s `documentLineHolders` sits next to B128's unchanged relative filter.

**Nothing else entered with the merge:** the changed lines of `git diff 05d52c06c 2372bc4` (prototype files) are identical to B128's own `git diff 05d52c06c...f5d21ce`: same 12 files, +405/−43, and the `+`/`−` line sets compare equal. So the merge adds no change beyond what rounds 1-4 reviewed, on main's newer base.

**Ran on 2372bc4** (my own copy on :4455, fresh database, configured checkpoint loaded in 103 s; stopped after; live AI off):
* `check_b128_relatives.ts` **13/13**.
* `check_b128_parents.ts` **23/23**.
* qa's `check_qa153_imm5645_parents.ts` **3/3**.

Not re-run by me: C4.1 on the six, C7.7 (checkpoint and fixture), R1 r1a/r1c/r1d, and tsc. The coordinator reports them green or matching main's verdicts (C7.7 checkpoint 21/33 = main 05d52c0).

**Journey score:** 9/10, unchanged. The follow-up Minors from rounds 1-4 stand.

Verdict: Approve
