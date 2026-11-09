# A6 (B102) break report: age in whole years on the application date

Breaker: a fresh agent that did not build the row. 7 Nov 2026, commit `78a874439` (branch `claude/gracious-bardeen-j1ieoh`, PR #1222). Two isolated copies on Linux: `br_a6` on :4475 and `br_a6b` on :4476. Each was reset, then the configured checkpoint was loaded (vv.single released with `person.age_years` worked out on `case.application_date`). Live AI was off, spend was US$0, and no priced button was pressed. Scaffolding, named: breaker rules were added through `POST /combinations/:id/rules`, and two library rows were inserted by SQL (an unasked date and a retired date), as the builder's own walk does. Scope is the concept's "What gets built". Editing and removing a worked-out value, and other calculations, are "Not built" and are not findings.

## Findings

### Major
**MA1. The age line shows an age the minor's lines do not use. It reads whichever worked-out age about a person sorts first, not the one the lines read.** `engine/runtime/case-checklist.ts:151` (`derived.find(... calculation === "age_in_years" && id.startsWith("person.") ...)`). The snapshot carries every worked-out value in the workspace, sorted by key (`engine/snapshot.ts:220`).
* Steps (:4475):
  1. Add a rule on vv.single that reads `person.aa_age`.
  2. `POST /combinations/<vv>/rule-facts/person.aa_age/worked-out` with `{age_in_years, person.date_of_birth, case.intended_stay_from}`. Result: 201.
  3. Submit, have the content reviewer sign off, have the Approver approve. This gives release v3.
  4. Open the family case (`acceptance/lib/m3.ts` openCase, FAMILY). Answer: travels with = alone; application date 2026-11-07; intended stay from 2026-11-17; Child A1's date of birth 2008-11-12.
* Actual: `GET /runtime/cases/5e63075f…/checklist` and the case page › Documents both show "Sample Child A1 · Child · **Age 18 on 2026-11-17 ("Planned first day of the stay in Canada")**". The same person still has "Letter of authorization for a minor" and "Copy of the minor's birth certificate" as **Needed: a child under 18 travelling alone…**. At 17 on the application date the lines are right. The age line is wrong. Before the stay date is answered, every person's age line says "answer "Planned first day of the stay in Canada" first", while the lines wait on the application date.
* Expected (BR-8, challenge M3): the age line is the age the lines read, on their date. Here that is 17 on 2026-11-07 (the application date). It must not depend on which other worked-out age happens to sort first.
* Reach: any author, on any combination, who works out a second age about a person whose key sorts before `person.age_years` changes vv.single's age line at its next release.
* Evidence: Documents section text captured by Playwright at 1024 px on :4475. The clean copy (:4476, same answers) shows "Age 17 on 2026-11-07 (the application date)".

**MA2. Race: a fact can be both proposed to be asked and worked out (BR-5), and then lands as both.** In `api/src/worked-out.ts:79-81`, the waiting-proposal check and the `derivedField.create` at `:102` run with no lock. C3.6's `add` locks on `rule-fact:<combination>:<fact>` (`rule-facts.ts`), but it never sees a derived value written while that lock is held.
* Steps (:4475): fire both requests in parallel. Request one: `POST /combinations/<vv>/rule-facts {fact: person.zz_race, rule, label, meaning, valueType: number}`. Request two: `POST …/rule-facts/person.zz_race/worked-out` (good body).
* Actual: both return 201. It happened 2 of 2 times (`person.zz_race`, `person.zz_race2`). Then the content reviewer accepts the proposal (`/review/proposals/decide`) and the Approver approves the library change `d42d04c5…`. Result: `canonical_field person.zz_race` (DRAFT, number) **and** `derived_field person.zz_race` both exist. Release v3 carries the derived value.
* Consequence: `evaluate` (`contracts/rules.ts:109-115`) silently uses a typed answer while the date of birth is missing, and overwrites it once the date of birth is known.
* Expected: one of the two requests is refused with 409 (STANDARDS §3.4, every link checked twice). Examples: one advisory lock key per fact shared by both doors, or the C3.6 lander refusing a key that is in `derived_field`.

**MA3. After a value is worked out, C3.6's add by name still proposes asking the same key. Challenge m2 (second half) is not done, although the builder's response says "m2, done".** `api/src/rule-facts.ts:246` builds the key from library keys only, so `derived_field` is never consulted.
* Steps (:4475), first case:
  1. Work out `person.zz_byname`.
  2. `POST /combinations/<vv>/rules/R-06-wbh/fact {label: "Zz byname", subject: person, valueType: number}`.
  * Result: 201, `key: person.zz_byname`.
* Second case, on the checkpoint's own value: `POST …/rules/letter_of_authorization_for_a_minor:each_applicant/fact {label: "Age years", subject: person, valueType: number}`.
  * Result: 201, `key: person.age_years`. A reviewer and Approver accepting it gives the MA2 state on the real minor lines. This probe proposal was rejected afterwards.
* For contrast: `POST …/rule-facts {fact: person.zz_byname}` is refused with 409 "is a derived fact".
* Expected: 409 "already worked out", plus a test (challenge m2).

### Minor
* **mi1. A retired library key is worked out (BR-1).** A rule reads `person.kb_retired`, which is a RETIRED library date (inserted by SQL).
  * C3.6's `POST …/rule-facts` refuses it with 409 "a retired library field: restore it" (`rule-facts.ts:185`).
  * `POST …/person.kb_retired/worked-out` returns 201.
  * Restoring the field gives the MA2 state. `worked-out.ts:76` checks only DRAFT and PUBLISHED.
* **mi2. Any date is accepted as "From" and as the subject (BR-3 says the person's date of birth).** All of these returned 201 and carry server words the Approver sees, but they cannot be undone:
  * `person.zz_years` "Age in whole years from Passport Expiry Date, on Application date."
  * `person.kb_years` "…from US Green Card Expiry Date…". This one came from the keyboard walk: one End key in From picked it.
  * `case.zz_years` "Age in whole years from Application date, on Application date." This is always 0, because from and on are the same date and the subject is the case, not a person.
  * The From list offers about 60 person dates, including "Date Of Death" (`worked-out.ts` `choices`).
* **mi3. A key that is not a fact key is worked out.** `person.zz.dot` (two dots) returned 201. C3.6 refuses the same key ("not a fact key (group.name)", `rule-facts.ts:190`). The route has no `FACT_KEY` check. A slash or unicode key held: 404, because no rule can read one.
* **mi4. Keyboard: focus is lost after "Work it out".**
  * At 1024 px and at 512 css px (1024 at 200 %), Enter on "Work it out · US$0" removes the row, and `document.activeElement` becomes BODY.
  * C3.6's own add moves focus (`rule-facts.tsx:45`). The work-out save (`:90`) does not.
  * Screenshots: `kb-1024-z1-03-after-success.png`, `kb-512-z1-03-after-success.png` (breaker scratch, not committed).
* **mi5. An old refusal stays on screen after the choice changes.** After the refusal "Zz unasked date is in the library but no questionnaire asks it…", choosing Date Of Birth in From leaves the alert in place until the next save. `err` is cleared only in `save`.
* **mi6. A row proposed by name still offers "Work it out instead".** For `person.kb_four`, proposed via `…/rules/R-15-ycg/fact`:
  * `GET …/rule-facts` returns `waitingProposal: null`, because `waitingFor` matches only `ruleFact`.
  * The row shows both buttons, and the server then refuses with 409 "decide it there first".
  * The row should say "Proposed: waits on To review".
* **mi7. A saved but invalid date of birth reads "answer first", not "check".**
  * On :4476 the child's date of birth was saved with a problem: `2026-11-08` (future), `2010-02-31`, and full-width `１９９０-01-01`.
  * The age line says "Age: answer "Date of birth" first." although an answer is shown with "Enter a real date…" (`case-checklist.ts:156`; answers with problems are dropped from `known`).
  * BR-7 wording ("check the date of birth…") applies only to a valid birth after the date.
* **mi8. J-A6's step "Clear the application date" cannot be done.** `PUT …/answers/<case>/case.application_date {value: ""}` returns 400 "Give a value (to remove an answer, remove its row…)", and there is no row to remove. The walk `tests/walk_b102_age.ts` skips that step. The only way to reach "answer the application date first" again is to type an invalid date.
* **mi9. An application date years ahead silently drops a minor's lines.** On :4476, application date `2031-05-25` was accepted (within the Sample ±5-year guard). Child A2, aged 15 today, reads "Age 19 on 2031-05-25", and the minor lines go to Not needed with no warning. The guard is existing, but this row now makes it decide documents.

### Known and confirmed, not ranked again
* Challenge M1 remainder: a placement retired later is not caught at release. The builder named this.
* Challenge m3: vv.single's Review listed 7 worked-out values from breaker rules on other keys (`person.zz_*`, `case.zz_years`).

## What held
* Permissions:
  * GET choices: user-A, C and B get 200. Case officer and client get 403. No header or unknown actor gets 401.
  * POST: content reviewer, Approver, case officer and client get 403. No header gets 401.
  * The client cannot answer the application date (403 "The officer enters this fact…") and cannot read the checklist (403).
* Inputs:
  * `__proto__`, `constructor` and `days_until` as the calculation give 400 naming "Age in whole years".
  * Empty, numeric and array bodies give 400 in words. Typed `key` and `plain` give 400.
  * An unknown combination gives 404. A library key gives 409. An already worked-out key gives 409. A sponsor fact from a person date gives 400.
  * An unasked date (UI and API) gives 400 under the form, with focus on the alert.
* Concurrency: 5 parallel adds of one fact with different dates gave one 201 and four 409s, one row and one audit line. No refusal wrote a row or an audit line.
* Engine and age line on the clean copy (:4476):
  * Child 17 on the application date with the 18th birthday 5 days later shows 17 and the minor lines are needed.
  * 29 February: 17 on 28 Feb and 18 on 1 Mar.
  * A birth after the date gives "check … together they give no age".
  * A person not travelling shows an age line and no lines.
  * Application date saved on a person: 422.
* Older release: a release with no worked-out age shows "Age 16 on 2026-11-07 (today: the application date is not answered yet)". A case keeps its pinned release (v2 stays v2 after v3).
* Approver's Review: the line reads "Derived definition · Age in whole years from Date Of Birth, on Intended Stay From.", naming both dates. A date from another combination's section is pulled into the release (`case.study_start_date` in vv.single v3).
* Layout: no horizontal overflow at 1024 px or 512 css px. Tab order runs Work it out instead → Worked out as → From → On → Work it out.
* Budgets: GET choices 7-8 ms; refused POST 55-70 ms; GET checklist 32-37 ms.
* Uploads and planted-instruction PDFs: not in this row's scope (nothing is uploaded).

## Builder response (at the fix commit after 78a874439)
* **MA1, fixed:** the age line uses the worked-out age the release's document lines read (`engine/runtime/case-checklist.ts`); a worked-out age no line reads is not used. Tests: `check_vv_checklist.ts` "break MA1 pass and fail", "break MA1 fail".
* **MA2, fixed at the one landing door:** `api/src/proposals.ts` LANDERS.field refuses a field whose rule fact is worked out (409, "it is not asked: reject this one"), whichever request won the race. Test: `check_b102_worked_out.ts` "break MA2 fail".
* **MA3, fixed:** a worked-out value's key counts as taken in the lander and in C3.6's key preview (`rule-facts.ts`), so an add by name gets another key. Test: "break MA3 pass and fail".
* **mi1, mi2, mi3, mi4, mi5, fixed** with tests (retired key 409; from = on refused; two-dot key refused; a status line takes the focus; a stale refusal clears on change). mi2's other half (any date about the person may be the "From"): not changed; the words name the date chosen, and the Approver reads them on Review.
* **mi6:** not changed on the screen; the server refuses (BR-5 by name, test "review m4").
* **mi7:** not changed: the engine receives only answers without problems (B-M2), so an answer with a problem reads as not answered; the question itself shows the problem. Named, not hidden.
* **mi8, fixed in the concept:** J-A6 no longer clears the date; it opens a case without it (step 1).
* **mi9:** not changed: the application date's 5-year bound is the existing Sample guard (`case.ts`); a date 4.5 years ahead is accepted and ages are measured on it, as the officer entered.
