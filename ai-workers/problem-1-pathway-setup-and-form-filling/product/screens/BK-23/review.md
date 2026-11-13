# BK-23 — independent review (Opus, fresh context), PR #1702 at f94770e6d1845deb2f9247c2f68a620d277498d4

Scope: `git diff origin/main...f94770e6d` (base d77b06220): `engine/runtime/team.ts`, `engine/runtime/forms.ts`, `engine/runtime/case.ts`, new `engine/runtime/compared.ts`, `engine/render.ts`, `engine/form-values.ts`, `api/src/runtime.ts` (one call site), new suite `tests/runtime/check_bk23_phone_and_compared.ts`. This is a runtime row with no screen of its own and no `concept.md`: the row text, the Lead 36 rulings on #1695 (C4) and #1698 (option A), `STANDARDS.md` and the repo rules are the bar. Reviewed 13 Nov, ~20:30–21:15 IST. US$0, live AI off, ports 4436 only.

## What I checked, and the evidence
1. **The phone shape on all six releases** (`/home/user/snaps.json`). `person.fax_number` is a phone on all six (IMM 1294, 5710, 0008, 5257 write it part by part). `person.phone_number` is a phone only on the Study permit (IMM 1294). On every release IMM 5476 (11-2021) maps question 7's number and fax `as_is`, and its country codes `digits_only`. So `writesAsIs` + `phoneInOneBox` (forms.ts:77) covers every IMM 5476 box that gets a phone object. No firm in `samples/firms.json` has a fax, so the fax change has no visible effect today. A fax is covered by the suite.
2. **Before/after on the six releases, main vs this branch.** I wrote a scratch script that dumps `caseView` questions with fills, problems and values, `render` needs, unplaced and summary, and `formCoverage` facts, `inputHash` and `formValues` for every form and person, using firm-record answers plus sample answers. Result: **byte-identical on wp.lmia_inside, pnp.express_entry, fs.spouse, vv.single v1 and v2.** On sp.outside the only change is on the representative's `person.phone_number`. It was `"4165550100"` with "Enter the country code and the number." It is now `{country_code:"1", number:"4165550100"}` with no problem. Each of the three IMM 5476 copies now writes `phoneNumber = "4165550100"`, the same text the other five releases write, and has 17→18 facts.
3. **The same dump on main + #1695 + #1698, before and after this exact patch.** I built a fresh tree because `/home/user/wt-combo` holds an older copy of this branch without the `readHere` filter. The only changes are the IMM 5476 ×3 phone line (as above) and IMM 1295 for the spouse. There, `current_residence_country` fills IMM 1295, `SameAsCORIndicator = "Y"` is now written, and one `#compared:` fact is added. `person.mailing_address` is now also named on IMM 1294, IMM 1295, IMM 5257 and IMM 1344, but every one of those forms reads it itself. So no new question appears, and none of their facts or hashes change.
4. **`comparedFacts`** on every "equals" step of the six releases. On main it names facts only for IMM 5257's two `derived:` steps, and IMM 5257 reads both facts itself, so they are filtered by `readHere`. The drafters' spellings name nothing on main, because the filler does not run them. Once #1698 lands, they name exactly the compared fact. The step is gated on the word "equals", and a "recorded" Yes/No is excluded, so no tick-by-a-word step is probed on current data. The probe calls `runTransform` with a stand-in value and records which facts it asks for. That is pure, and the cache is keyed by own fact + step and returns a copy.
5. **The BK-13 replay, run unchanged** (`tests/check_bk13_zero_code_run.ts`) on my own isolated copy (:4436) of main + #1695 + #1698 + this patch:
   - **44/45, exit 1.** All three IMM 5476 copies pass with no "needs a fix". IMM 1295 (spouse) has 1 by-hand line: "person.current_residence_country is not confirmed". The cause is the missing Sample answer.
   - With the one Sample line added to my scratch copy only (spouse `"person.current_residence_country": "India"`): **45/45, exit 0, "Met: every check passes".** IMM 1295 (spouse): 47 written, 0 by hand, read back equal.
   - This matches the PR's numbers.
6. **The officer's no-override rule.** `PUT …/answers/representative/person.phone_number` as the case officer gives **422** "The representative's details come only from the firm record of the representative of record…". The code path is unchanged.
7. **Out-of-date detection.** I changed the spouse's current residence country to Canada on the replayed case. Only IMM 1295 (spouse) turned `out_of_date: true`, with changed = "Country or territory where the person currently resides". No other copy moved.
8. **Mutation check of the new suite (26/26).** I switched off each part of the change in turn: render need, case.ts fills, `oneBox`, forms.ts `compared`, the `#compared` facts, the form-values loop, team.ts number→text, team.ts fax→text, the `readHere` filter, and the `place.has` guard. **Every one turns at least one check red (1 to 6 FAIL each).** So every rule in the change has a check that fails without it.
9. **Static checks.**
   - Related suites: `check_qa289_rep_phone` 17/17, `check_case_engine` 86/86, `check_b128_relatives` 20/20.
   - `check_c611_team`'s pure part has one FAIL ("never under the keys IMM 5475's designated individual reads…"). It **fails identically on origin/main**, so it was already failing and is not from this PR.
   - `check_b164_no_engine_keys` 52/52.
   - `typecheck.mjs`: no new type errors (15 known).
   - `count-any`: 417, the same as main.
   - `graph.mjs --check`: exit 0.
   - No schema change. Form numbers appear in comments only; the logic reads fact keys and steps.

## Journey test (reviewer role; the one score for this check)
Journeys:
- J1: a case officer opens the Study permit Sample case and checks the representative's phone. It shows "+1 4165550100 · From the firm record · fills IMM 5476 for 3 people", with no fix.
- J2: the case officer opens the spouse's questions. "Country or territory where the person currently resides" shows "fills IMM 1295 for Spouse (Sample)".
- J3 (error): the case officer tries to override the representative's phone and gets 422 with plain words.
- J4 (recovery): changing the spouse's residence marks IMM 1295 out of date and names the change.
- J5: the replay's copies are generated and read back equal.

Walked in Chromium against :4436 at 1440, 1024 and 400 px, and at 720 px ×2 (200 % zoom):
- no sideways scroll at any width;
- axe WCAG 2.2 A/AA: 0 violations at 1440 and 1024;
- no console or page errors;
- keyboard only: Tab reaches the spouse's tab and Enter opens it.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and J2 as above; replay 45/45 with the Sample line |
| Next step obvious | 1 | "fills IMM 1295 for Spouse" on the question; nothing left to fix on the representative's tab |
| Plain words | 1 | No new words; the by-hand reason stays plain ("… is not confirmed, so it cannot be compared") |
| Feedback and state | 1 | Out of date named with the changed question (J4) |
| Correct data | 1 | The box writes "4165550100" and the country code "1" in its own box; Y/N written from the confirmed answer; other releases unchanged (dump diff) |
| Error recovery | 1 | 422 unchanged; unanswered → by hand with its reason, never guessed |
| Accessibility and sizes | 1 | axe 0; 400/1024/1440 px and 200 % with no sideways scroll; keyboard path works |
| Speed | ½ | Case page about 2.0–2.1 s to network idle at 1440 and 1024 (that page existed before this PR; not timed against §9 here) |
| Visual quality | 1 | Same components; the phone reads as a phone ("+1 4165550100") |
| Trust and sources | 1 | "From the firm record", "Change it in the firm record", who and when on every answer |

**Journey score: 9.5 / 10, pass** (no criterion at 0).

## Findings
- **Minor m1. A compared fact is counted as a form field written.** `engine/runtime/forms.ts:88` adds `<box>#compared:<fact>` to a copy's facts, but `isGateFact` (forms.ts:25) matches only `#gate:`. The "written now" figure (`api/src/fill-case.ts:239`) and the audit line's "(N confirmed facts)" (fill-case.ts:364) therefore count it as a written form field. Seen on the replayed case: IMM 1295 (spouse) has 65 facts, 1 of them `…SameAsCORIndicator[0]#compared:person.current_residence_country`, so "written now: 65" overstates the written fields by 1. Fix: make the "not a form field" test cover `#compared:` too (for example one `isKeptFact` used in both places).
- **Minor m2. The three places that decide "one person's own fact" can disagree.** `render.ts:185` uses `factRow`, which is null for a `subject_child` box at row 0. `case.ts:411` and `forms.ts:81` use `b.row`, which is 0 there. So for an "A equals B" step on a `subject_child` box, the question would be asked (render need) but would list no fills, and its value would never reach the filler. No current release has such a step, so this cannot happen today. Fix: use the same test in all three places.
- **Minor m3. Some existing copies go out of date when this merges.** This is intended, but not said in the PR text. Every Study permit IMM 5476 copy made before the merge goes out of date, because the phone is now written (17→18 facts). After #1698, an IMM 1295 spouse copy with a confirmed residence country also goes out of date (one new fact). No other release's copies or validated copies change (point 2). Say it in "On the demo:".

**Open dependency (not a finding against this code).** The row's "0 by-hand lines on IMM 1295 (spouse)" needs the spouse's Sample answer in #1695's `samples/sample-student-answers.json`. Lead 36's ruling on #1698 puts that answer in BK-13's Sample file ("BK-13's Sample file then answers it for the spouse"). Point 5 shows 45/45 with that line and 44/45 without it. The tech lead decides where the line lands (PR Question 1).

## What I could not check
A real screen reader. An intended user's unaided walk (D17/D20 are simulated only). The Mac's fill trials (BK-20, shown as WAIT). The PDF's printed look of the phone box: I trusted the replay's XFA read-back. The demo at :4400 (never used). The skill's D1–D20 table and BIC table, which are for screens with a concept: this row has no screen element of its own, so I scored nothing there and the journey score above stands in.

No Blocker, no Major.

Verdict: Approve f94770e6d1845deb2f9247c2f68a620d277498d4
