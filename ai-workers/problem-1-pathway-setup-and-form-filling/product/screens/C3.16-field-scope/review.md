# C3.16 shared field scope and stable list entries: independent review (reviewer, 5 Nov 2026)

**Commit 22aef7e01** on `claude/elegant-hawking-qc3qjh`, against `origin/main...22aef7e01`. Basis: concept r4, `challenge.md`, the tech lead's ruling on #1054, `build-notes.md`, STANDARDS, EXPERIENCE, QUALITY. Copies `rev316` :4456 and `rev316b` :4459 (never :4400). Live AI off, US$0. Journey test: `journey-test-reviewer-2026-11-05.md`, **8/10 (pass)**.

**Verdict: Block** (commit 22aef7e01). One open Major (M1). Fix M1 and I expect Approve. The minors may follow in the same PR or later.

## Builder's results, re-run by me
* `acceptance/C3.16.test.ts 4456 xr_studio_rev316` (six part): **31/31, exit 0** on a fresh copy. A first run failed 16/31 only because I had started two runs on one copy at once (my error); the clean re-run is green.
* `setup_visitor_visa.ts 4459` gave 15/15. Then `C3.16.test.ts 4459 xr_studio_rev316b case` gave **12/12, exit 0**.
* `tests/check_c316_field_scope.ts`: **26/26**. `tests/check_sh3_resolver.ts`: **85/85**.
* `graph.mjs`: G1 0 · G2 0 · G4 0 · G5 0. The new route is not in G3. C3.16 is named by a test.

## Scope of the change (hot files, P-319, P-335, demo)
* Hot files: only the approved ones. `engine/snapshot.ts` has one conditional spread plus its import (`:510`). `studio/contracts/resolver.ts` has the scope lists. `api/src/studio.ts` `placeField` has one refusal line plus its import (`:663`). Not touched: `demo.ts`, `render.ts`, `api/src/sources.ts`, `proposals.ts`, `fact-sources.ts` and every `library-*` file.
* No form or combination number in live code. No tenant, firm or workspace work. No demo data change.
* Storage is the case's own record. CLIENT_LEVEL and CASE_LEVEL are kept and mapped in one reader (`engine/field-scope.ts:312`). The claim is Partial, and the fixture case part is named scaffolding (test header, build notes). The saved-AI-results warning is in this PR (`api/src/field-scope.ts:90`).
* Unmarked snapshots stay byte-identical. `markOf` returns `{}` for CLIENT_LEVEL, CASE_LEVEL and undefined (pure check). The six part checks that no release carries a mark, and that the draft is byte-identical after a scope goes back to Person.

## Readers of the mark (checked)
render boxes, deciders and section loop (`render.ts:132,154,174,260`); case view (`case.ts:330`); putAnswer (`runtime.ts:307`); fill path (`fill-case.ts:146,196` go through `formCoverage` → render on the case's release snapshot, so they see the placement's mark); case checklist (`case-checklist.ts:130`); programs (`programs.ts:20`); eligibility (`valueHolder` falls back to the case's value); documents and the coverage gate (`sources.ts:533` adds FILING suppliers, read by `render.ts:101` and `coverage.ts:44` keyed by `about`). Gaps left as the concept says: answer keys and `qd-conditions.ts:202` `askedOnly` still go by the `case.` prefix (concept §4: "the honest limit").

## Blockers
None.

## Majors
**M1. `aboutOf` lets a marked fact reach a representative's box and other people's boxes on the principal's forms.** This goes against concept §4 ("aboutOf: … marked organisation → the case for the principal's forms, none for others, **a representative's box unchanged**") and BR-4 ("A representative's box can never read it").
* `engine/resolver.ts:435` returns FILING for every box on the principal's form, whatever `entry.person` is.
* `:440` (Household) maps the `representative` reading to FILING whenever a representative is on the case.
* Pure probe with a family of principal, spouse, child and representative, mark Organisation, subject principal: `form_subject`, `subject_spouse_or_partner`, `subject_child`, `subject_parent_1`, `subject_sibling` and `representative` all give `case`. Alone, `subject_spouse_or_partner` also gives `case`. With mark Household, `representative` gives `case`.
* BR-2's guard is checked only when the scope is set (`api/src/field-scope.ts:35`). A form field map added afterwards (`api/src/sources.ts:911`, `api/src/impact.ts:235`) is not refused.
* This is the QA-152 trap. Set Organisation on `organisation.name` while only IMM 1295 maps it, then set up a combination with IMM 5476. The representative's "Name of firm" box on the principal's IMM 5476 would then fill with the employer's name from the case. On the six, `organisation.name` is mapped by IMM 5475/5476 `representative` boxes (SQL).
* No test covers a marked fact with a representative, relative or partner box.
* **Fix (in `engine/resolver.ts` only, not hot):**
  * For both marks, a `representative` box keeps today's reading.
  * For Organisation, return FILING only when `personReading(...)` is the subject itself or the filing (`form_subject`, `none`) on the principal's form. Return null for every other reading.
  * Add a pass line and a fail line to `tests/check_c316_field_scope.ts`, labelled C3.16.

## Minors
* **m1. Race in `placeField`.** The scope check (`api/src/studio.ts:663`) runs before `lockItem` (`:673`). A per-row placement can therefore land at the same moment as a Household save, which checks placements under the same lock (`api/src/field-scope.ts:102`). *Fix:* move the same one line inside the transaction, after `lockItem`.
* **m2. Condition refusal: wrong status and no test.** `api/src/question-condition.ts:165` answers **409** "Asked once" where BR-2 and `placeField` give 422. No test reaches `refuseScoped`: the six part says NOTE, and the pure check tests only `placementRefusal`. *Fix:* use 422. Add one fail line, for example a proposal on a marked field through `proposeConditionChange` on the fixture.
* **m3. Read-only line words differ from the rest of the case** (`web/src/runtime/scope-tag.tsx:743-745,772`).
  * It has its own WHO map without user-R, user-T and user-S, so an answer by a representative reads "someone on the case".
  * It shows the date as "Nov 5, 2026", where the questionnaire shows "5 Nov" (en-GB).
  * It shows the raw value "2012-06-30", where the question shows "30 Jun 2012".
  * It names `answer.by`, which is the confirmer, not `answered.by`.
  * *Fix:* reuse the questionnaire's WHO, `when` and value formatting (`questionnaire.tsx:628-629`), and name `answered?.by ?? by`.
* **m4. Focus is lost after "Change it in For the household".** The link switches the tab (`questionnaire.tsx:662`), but focus falls to `<body>` (measured). EXPERIENCE §2 item 12 asks for a keyboard path. *Fix:* after `setWho`, focus the question's line (`lineId(caseSubject, fact)`), which already has `tabIndex=-1`.
* **m5. The read-only state gives no reason when the person cannot change it.** For the approver (or a retired field) the group is disabled with no sentence (`web/src/pages/field-scope.tsx:628-635`). EXPERIENCE §4 lists read-only (no permission) as a state to draw. *Fix:* one line: "Only the configuration author changes whom a field is about."
* **m6. A key prefix is shown on the main path.** "Use a case. fact." (`engine/field-scope.ts:339`) shows a field path, against EXPERIENCE §5. It is the concept's own copy. *Fix:* "Use a fact about the application", or ask the tech lead to change the words.
* **m7. The case-part proof is weaker than it looks.**
  * The fixture's union date is already `once_per_case` and `verified_document`. So "asked once, stored once" would pass without the mark: only the child-blank line, the spouse-save words and the tag depend on it.
  * The client-side tag and `HouseholdReads` in `SqrOverview` are never exercised.
  * The concept's m3 point ("confirmed once, as the client's own") is not asserted.
  * *Fix:* in the case part's SQL scaffolding, also set the placement to `per_person` and `client_questionnaire`, then assert the client view. Or name it as a gap until B82.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Every BR is built; the representative-box guarantee of BR-4 is only checked when the scope is set (M1) |
| D2 Data integrity | 4 | lock plus `expected` give 409, two saves give one; `placeField` race (m1) |
| D3 Reuse | 5 | one reader (`engine/field-scope.ts`); no table, subject or loader added |
| D4 Rule integrity | 4 | the mark reaches every reader that matters; M1 |
| D5 Stability | 4 | stale save gives 409 with reload words; the same scope again writes nothing |
| D6 Governance | 4 | audit line; frozen after publish; goes out with the next release |
| D7 AI trust | 4 | the saved-AI-results warning shows before the save |
| D8 Orientation | 4 | breadcrumb, pill, "Read for" |
| D9 Flow | 4 | one save; the change link moves the tab (m4) |
| D10 Language | 3 | m3, m6 |
| D11 Feedback | 4 | warning, pill, conflict words |
| D12 Visual | 4 | team cards and radio cards (screenshots) |
| D13 Accessibility | 4 | axe 0; 400 / 1024 / 200 %; arrow keys work; m4 |
| D14 Team look | 4 | team components |
| D15 Speed | 5 | route 10–20 ms; no request per row |
| D16 Testability | 3 | pass and fail lines per rule, except M1 and m2; m7 |
| D17 First use | – | simulated only |
| D18 Provenance | 4 | "Answered for the household by … on …" |
| D19 Closure | 3 | Partial by ruling; the case part is fixture scaffolding |
| D20 Wow | – | simulated only |

## Retrofit mapping
CLIENT_LEVEL → PERSON, CASE_LEVEL → FILING, HOUSEHOLD and ORGANISATION as themselves (SA-1B-130 rule 6 as ruled on #1054). Recorded in `prisma/schema.prisma:44` and `engine/field-scope.ts:312`.

## Could not check
A real screen reader. The intended users' unaided walk. The M2 packs against main. The demo's Visitor visa list drift (m8 in the challenge), which belongs to qa.

## Round 2 (608f793af)
Reviewed only the diff since round 1: `git diff 22aef7e01..608f793af` (a69cc0936 for the review fixes, 608f793af for breaks 1–7). I ran it on fresh copies, `rev316` on :4456 and `rev316b` on :4459 (both now stopped). Live AI off, US$0.

**Verdict: Approve** (commit 608f793af). No Blocker or Major is open.

**Re-run:**
* Six part: **33/33, exit 0**.
* `setup_visitor_visa.ts`: 15/15. Case part: **16/16, exit 0**.
* `check_c316_field_scope.ts`: **30/30**. `check_sh3_resolver.ts`: **85/85**.
* `web` tsc: no errors.
* Browser at 1440 px: axe 0 on the officer's application and spouse tabs and on the client questionnaire. No console or page errors.

**Round 1 findings:**
* **M1: closed.**
  * `engine/resolver.ts:182`: a representative's box keeps its own reading for a marked field.
  * `:188`: a marked Organisation fact reads the case only for `form_subject`, `none` or null on the principal's form.
  * The same probe as round 1 now gives, on the principal's form:
    * Organisation: partner, child, parent and sibling boxes → null; `representative` → the representative; `form_subject` and `none` → `case`.
    * Household: `representative` → the representative.
  * Pass and fail lines added at `tests/check_c316_field_scope.ts:51-52`.
  * Side effect, not a finding: a representative's box for a marked field stays blank, because putAnswer saves a marked fact only on the case. It never shows the employer's value.
* **m1: closed.** The scope check is now inside the transaction, after `lockItem` (`api/src/studio.ts:674`). The six-race line (break 3) never leaves Household together with per_row.
* **m2: partly closed.** The status is now 422 (`question-condition.ts:32`), and the check reads the placement's field key. Still no API test reaches `refuseScoped`. I do not hold the approval for it: it is a Minor, and the pure `placementRefusal` lines pin the rule. One fail line through a queued condition proposal on the fixture would close it.
* **m3: closed.** Measured: "30 Jun 2012 · Answered for the household by Client A · 5 Nov, 04:46". This uses the case page's own WHO, `when` and `shown`, and names who answered (`answered ?? answer`).
* **m4: closed.** After "Change it in For the household", focus is on `#a-<case>-relationship-start_date` (measured).
* **m5: closed.** The approver gets a read-only notice (`web/src/pages/field-scope.tsx:256`). Checked in the code only: every field on my post-pack copies was published.
* **m6: closed.** "Ask it as an application fact instead."
* **m7: closed.** In the case part:
  * the scaffolding asks the date per person;
  * the unmarked draft asks each person;
  * the client's questionnaire asks it once, tagged;
  * the client's one answer counts as confirmed.
  * Measured: the client page shows the read-only line on both adults' parts.

**Breaker's items:**
* Break 1: `mergeScopeRefusal` is checked at proposal (`forms.ts:312`) and again inside the approval transaction (`:362`), with a pack line. `forms.ts` is not on the hot list.
* Break 2: placements are read by lineage key or field key (`api/src/field-scope.ts:36`).
* Break m7: a body with an extra or `__proto__` key gives 400.

**New Minor (does not hold the approval):**
* **m8. A field key shows on the main path for a merged field.**
  * `scopeRefusal` appends the target field's key ("… merged into (person.kept_name).", `engine/field-scope.ts:154`).
  * `field-scope.tsx:46` shows that text under each refused choice.
  * This is against EXPERIENCE §5, the same class as round 1's m6.
  * *Fix:* name the field it went into by its label, or leave the key out. The Merged notice already says it in words.
