# Break report: C6.4 document checklist per person (M3-B), re-test at fa2fab91

Scope: `GET /api/runtime/cases/:id/checklist`, Visitor visa (`vv.single`), backend only. Code: `studio/engine/runtime/case-checklist.ts`, `studio/api/src/case-checklist.ts`, plus the edits in `engine/render.ts`, `engine/validate.ts`, `engine/runtime/case.ts`. Isolated copy `brk64` on :4467, database `xr_studio_brk64`. Setup, `check_vv_checklist_api.ts` (26/26) and `check_vv_checklist.ts` (48/48) all pass. Probes changed `config_release.snapshot` on my own copy only, put it back afterwards (checked equal), then stopped the copy. No UI is in scope, so keyboard, 1024 px, zoom and upload items do not apply. US$0, no model calls.

## Earlier Majors: re-test

| ID | Re-test | Result |
|---|---|---|
| B-M1 | Added requirements whose "whose document" differs from the condition's subject: principal line with a SPOUSE condition, spouse line with a PRINCIPAL condition, child line with a PRINCIPAL condition, principal line with a DEPENDENT condition. Case: adult principal, minor spouse, one adult child and one minor child. | **Fixed.** Each line is on its own holder's list and is decided by the subject's answers. For example, the marriage certificate is on the principal's list and is not needed when the spouse is 11; the consent letter is needed on the principal's list. With no spouse or child on the case, the line is "Not needed: it depends on the spouse or partner, and there is none on the case." |
| B-M2 | Application dates 2200-01-01, 1900-01-01, 2026-13-01, 2026-11-01T00:00; birth dates 2200-01-01, 1850-01-01, tomorrow, "garbage". | **Fixed.** Every rejected value is ignored and the line goes back to Answer first. There is no age of 191. |
| B-M3 | Same cases as B-M2, plus no answers at all. | **Fixed for the reported case.** `person.age_years` is never named; the line names the input questions in words. 1900-01-01 now has a problem ("within 5 years of today"). A neighbouring case still names the wrong question: see M1. |

## Findings

### Major

**M1. A date with spaces around it is accepted with no problem, but the line then waits forever on a question that is already answered.**
- Repro: open a case. Save `person.date_of_birth` = `" 1980-01-01 "` (or `case.application_date` = `" 2026-11-01"`). The PUT returns 200 with `problems: []`. Then GET the checklist.
- Expected: the trimmed value is used and the police line is Needed. Or, if the value is unusable, the answer has a problem.
- Actual: police certificate = `answer_first`, why = `answer "Date of birth" first`, `missing: [person.date_of_birth]`, even though the birth date is answered. Saving the same value again changes nothing. With a padded application date, `ages_on` also quietly falls back to today.
- Cause: `checkValue` trims before it checks (`engine/runtime/case.ts:111`). `day()` (`case-checklist.ts:59`, `:82`) and the age calculation do not trim. When every input is "known", `toAsk` falls back to naming those same inputs (`case-checklist.ts:90`). B-M3 asked that Answer first name the question that is actually missing; here it names one that is answered.

**M2. A validity rule that `validate` says is "not used" is used anyway, and shown without its citation (P-170).**
- Repro: change the `VV_POLICE_CERT_6_MONTHS` row in the released snapshot:
  - (a) remove `cite`: the line's `rule.source` is `{page:"", url:"", read:""}` and months is 6;
  - (b) `before: "x.nope"`: the rule is used;
  - (c) `source_quote: "   "`: the rule is used, with a blank quote.
- `validate()` on the same snapshot gives, for (a), "Document validity rule not used: it has no source quote, page and date read (P-170)", and for (b), "...the date it is measured to is not a field in the library". For (c) it gives no warning.
- Expected: the engine and `validate` apply the same test, so a rule without page, URL and date read never reaches a line.
- Actual: `validityRules` checks only `months`, the type of `before` and whether `source_quote` is truthy (`case-checklist.ts:49-50`). It does not check cite url/read, whether `before` is in the library, or a blank quote. `validate.ts:96-99` says the opposite. An officer can be shown an immigration rule with no traceable source.

### Minor

- **m1. Duplicate rules: the last row wins silently and nothing warns.** Repro: two `document_validity` rows on `police_certificate`, 6 and 3 months. The line shows whichever comes later in `checks` (3, then 6 when the order is swapped). `validate` returns `[]`. Code: `case-checklist.ts:51` (`Map.set`), `validate.ts:93-101` (no duplicate check). Today such rows can only be added by SQL; no screen authors checks yet.
- **m2. No upper bound on months, and the cite is not checked.** `months: 100000` is accepted on the line and `validate` is silent. `cite.url: "javascript:alert(1)"`, `page: "<script>x</script>"`, `read: "yesterday"` all pass through to the response, and `validate` is silent. Nothing renders them yet, but the future screen would get an unsafe link. `case-checklist.ts:50-52`, `validate.ts:99`.
- **m3. The two age paths disagree when there is no application date.** Principal born 1980, no application date. `ages_on_why` = "Ages are worked out on today's date ... until the application date is answered". An `each_adult_18_plus` line follows that and is Needed. The release's police line, through `person.age_years`, is Answer first naming the application date. One list, two age rules. `case-checklist.ts:82-83` vs `:115`.
- **m4. A case-level line with a per-person condition is decided only on the principal's answers.** Repro: `who: "case"`, condition `EACH_APPLICANT age_years < 18` ("an applicant is under 18"). Adult principal with a minor spouse and a minor child: Not needed. Minor principal with an adult child: Needed. Code: `conditionFor` maps a null role to `[holder]`, which is the principal (`case-checklist.ts:146-148`). Preview (`render.ts:204-206`) evaluates the same line on "case", so the two views can disagree.
- **m5. People not applying still decide other people's lines.** Repro: spouse (adult) and child (2016) both with `applies:false`. The principal's marriage certificate (SPOUSE condition) and consent letter ("a child is under 18") are both Needed, because the child is a minor even though not travelling. This matches `render.ts`. It is a question for the immigration expert, not a defect for certain.
- **m6. A birth date after the application date names the answered birth date.** `ageInYears` returns undefined when birth > reference. The line says `answer "Date of birth" first` (`case-checklist.ts:110-111`) instead of saying the dates conflict. This case is rare.
- **m7. Merging duplicate lines keeps the first line's text.** Repro: an A requirement on the case (conditional, `provided_by: officer`) and an A requirement on the principal (base, client), both Needed. The result is `base:false`, `provided_by:"officer"`, "Needed: its condition holds". "Always needed" and the client as provider are lost, apart from the `also_from` lineage (`case-checklist.ts:129`).
- **m8. The "within 5 years" bound is 5×366 days from now, time included.** 2021-10-31 and 2031-11-04 are both accepted on 2026-11-01 (`case.ts:129`). The bound is labelled Sample, so this is cosmetic.
- **m9. Wrong message for 2200-01-01.** It gets "Enter a real date as day, month and year." because `realDate` caps the year at 2100 (`case.ts:29`), not the new "within 5 years" text. The date is real, so the message misleads.
- **m10. The line's `rule` does not say the rule is Sample.** The `check_def` row is `illustrative: true`, but the line's `rule` object does not carry that flag. Only the response-level `basis` says Sample (`case-checklist.ts:51`).
- **m11. A malformed snapshot is not refused.** With `document_requirements: "oops"` (a string), the response is 200 and the string is iterated character by character, giving empty lists that do not say anything is wrong. With `null`, the response says "empty release", which is right. This can only happen by tampering with the database, because the pin hash matches the release row and not its contents.

## What held
- Permissions:
  - user-O (and persona `officer`), user-R and user-T (same-firm staff with the case duty): 200.
  - user-S (another firm): 404.
  - Clients user-P and user-Q: 403.
  - Configuration people user-A, user-B and user-C: 403.
  - No header, an empty header, `user-o` or `nobody`: 401.
  - Odd ids (not a uuid, SQL text, `%00`, 5,000 characters): 404.
  - POST, PUT or DELETE on the route: 404.
- 409 when the snapshot's combination is null or names another key (`VV.SINGLE`, `wp.family`). A `wp.family` case gets `derived:false` with "not derived yet" and no lists.
- People:
  - not applying: an empty list;
  - one child's birth date missing: only that child's lines are Answer first, and the consent letter becomes Needed from the other child;
  - the principal cannot be set to not applying (its lines stay).
- Age boundaries on 2026-11-01: born 2008-11-01 is 18 (Needed); born 2008-11-02 is 17 (Not needed); born 2008-02-29 is 18 on 2026-11-01 and 17 on 2026-02-28.
- Malformed validity rules that are refused: months as `"6"`, 6.5, 0 or -3; an empty quote; a null or array condition; a wrong op; the wrong group; `applies_to` in another case (`Police_Certificate`). The rule follows its document type: `applies_to` = passport moves it to the passport line. A null message falls back to the default text. A 25,000-character Japanese message is passed through intact. Render and validate skip `document_validity` checks; the questionnaire still reads 200.
- `issuedWithin`: 30 Apr + 6 months = 30 Oct; 31 Aug → 28 Feb (31 Aug → 1 Mar is stale); a document issued after submission is refused; 30 Feb is refused.
- Load: 400 requirements × 6 people in 38.6 ms of engine time. An HTTP read takes about 21 ms. There is no per-row query.
- Concurrent saves: a second save of the same answer with a stale `expectedId` gets 409; the reads around it get 200.
