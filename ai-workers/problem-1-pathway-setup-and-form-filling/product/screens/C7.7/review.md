# Review: C7.7 part 1, last two fixes (commit 26964195, PR #357, branch claude/runtime-deliverables)

I did not build this commit. I reviewed only `git show 26964195`:
* IMM 5476's representative block from the firm record (`samples/firms.json`, `engine/runtime/team.ts`, `api/src/runtime.ts state()`).
* `person.has_children` worked out from the case (`engine/runtime/case.ts`).
* `derive_inverse` in `prototype/p5/transforms.ts`.
* Its tests.

Copy: my own isolated copy on :4438 (`xr_studio_review_c77`). The builder's :4440 was reset while I read it, and I did not touch it. :4400 was not touched. Live AI stayed off (US$0). Journey test: `journey-test-reviewer-2026-11-01.md`, **5/10, Fail**.

## Re-run
* `check_vv_prepare_api.ts 4438`: 26/26 (C7.7 18/18, C6.12 24/24, C11.6 14/14).
* `check_case_engine.ts`: 57/57.
* `check_p5_engine.ts`: 31/31.
* Graph: G1 0, G3 2. Neither is from this commit (`pdf-copy` is reached only by acceptance).

## Every consumer of `state().answers` (the brief's question)
* **Case view, readiness, prepare stage 1.** These work: `knownOf` keys the answers by "representative", which is the renderer's `aboutOf` key, and VERIFIED status makes them confirmed. IMM 5476 is now Ready for the principal and the spouse.
* **fill-case.ts generate.** The stored facts carry about=`representative` with the firm values (I checked `answer_snapshot.facts_json`). The `subjectId` checks only cover the form's person, so they are unaffected.
* **case-filings.ts, case-checklist.ts, case-prepare.ts.** They filter ages by participant, so the extra answers are ignored. Safe.
* **Answer and confirm routes.** The server writes nothing, but the refusals are the wrong ones (see M1). The ids are not DB ids, so the zod uuid checks answer before the "not on this case" check.
* **Audit.** Nothing is stored, so there is no audit line. That is correct for derived values.
* **Change detection between copies.** It is broken for object values (B1). A change of representative is detected correctly: e-mail and given names are named.

## Issues

**B1 · Blocker. Every IMM 5476 copy is "out of date" from birth and can never be locked.**
* Evidence: a fresh copy on :4438 showed `out_of_date: true, changed: ["Person's telephone number including country code"]`. `POST /form-copies/:id/lock {kind:"filed"}` returned 409 "This copy is out of date (1 change since it was made); generate a new copy and lock that one". A new copy behaves the same.
* Control: IMM 5257 on the same case is `out_of_date: false`.
* Cause: the snapshot's jsonb stores the phone as `{"number","country_code"}`, because jsonb reorders keys. `firms.json` and `representativeContact` give `{country_code, number}`. `changedFacts` (`engine/runtime/forms.ts:60–66`) and `inputHash` (`:54`) use `JSON.stringify`, which depends on key order. `inputHash` also feeds the validated-file check (`api/src/fill-case.ts:353`).
* Fix:
  * Compare with a stringify that sorts keys, at least in `changedFacts`. For `inputHash`, mind existing `validated_copy.facts_hash` values.
  * Or build the firm-record values in jsonb order (round-trip them).
  * Add a pass/fail line: generate IMM 5476 → `out_of_date === false` → lock as filed returns 200.
* C7.7 acceptance does not lock IMM 5476, so it missed this.

**M1 · Major. Firm-record answers look like ordinary, editable answers, and their source is misstated (D18, EXPERIENCE trust and sources).**
* On the officer's "representative" tab, each line shows a "Confirmed" pill with the tooltip "Confirmed by the officer" (`CONFIRM_WORDS.officer`, because status is VERIFIED). The line reads "answered · Representative · 1 Nov, 19:44" (`CHANNEL` in `web/src/runtime/questionnaire.tsx:487` has no `firm_record`).
* Edit on the e-mail → Save returns 400 "Send the id of the answer you saw, or null when there was none."
* "Confirm section" is enabled because `seen` holds the `firm_record:…` ids. Pressing it gives the toast "Choose whose section to confirm." (400).
* The client's SQR view shows the same representative parts, prefilled and "Confirmed". The tab and its unanswerable questions were there before this commit; the misleading state is new.
* Fix:
  * Mark these answers as from the firm record in the view: their own `why` (for example "From the firm record: the representative of record"), and channel words "firm record".
  * Show them read-only: no Edit, no Confirm, and leave them out of `seen`.
  * Keep the representative's parts out of SQR mode.

**M2 · Major. The record claims the phone is filled, but the copy still asks for it by hand (G25 bar: never by hand for a fact the case holds).**
* The copy's `by_hand` list includes the representative's phone country code and number and the country of the mailing address. The steps `phone:country_code_digits`, `phone:area_code_and_number` and `country_name_text (max 255 characters)` are not executable.
* `qa/built/C7.7.md` and the commit message say "(name, e-mail, office address, phone) is filled".
* Fix: make these three steps executable (`phone_part` already exists), or correct the built note and commit claim and put phone and country under "Not built".

**m1 · Minor ([M] "a rule's test fails when the rule is removed").** In `caseView` (`case.ts`, `derivedYes` filter), the rule that a worked-out Yes is not asked has no test that fails without it. I removed the filter in a scratch copy and `check_case_engine` still passed 57/57. The `knownOf` derivation and the spouse branch are covered: removing either makes the suite fail. Fix: add one caseView line saying no `person.has_children` question for p and s when a child is on the case.

**m2 · Minor. `derive_inverse` is positional.** The regex ignores the clause text: the first code is always used for No. A map written "0 when any child exists, 1 when … no child records" is silently inverted (probed: true → "1"). A comma in the first clause sends the box to hand-writing, which is safe. Today there is one string in use (IMM 5707 `hideChildren`, 12 copies, correct). Fix: require the first clause to describe absence (`\bno\b|none`), otherwise send it by hand. Add the swapped-order case as a fail line.

**m3 · Minor. Deriving only Yes is right; the override is silent.** With no child on the case, No cannot be worked out, because children who are not on the application exist. That is correct. But a client's No is overridden and the line disappears, so the officer never sees the disagreement. Fix: show the line read-only as "Yes (worked out: the case holds this family's children)", or add a note when a stored No is overridden.

**m4 · Minor. Spouse Yes needs expert confirmation.** The spouse's Yes assumes a child on the case counts as the spouse's child too (step-children). Unconfirmed: the immigration expert should confirm against IMM 5707's instructions.

**m5 · Minor. Extra queries in `state()`.** `state()` re-reads `firmKey` with `case.findUnique`, although `c.firmKey` already comes from `reach()`. It also uses `team as unknown as Member[]`. These are two extra queries per `state()`, which runs up to 3 times per write. Fix: use `c.firmKey`, and map the rows to `Member`.

**m6 · Minor, for the Lead.** IMM 5476 copies made before this commit will show as out of date, because they gain new confirmed boxes. This is expected; mention it for the demo.

## D1–D20 (1–5, this commit)
| Dimension | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | The block fills, but phone and country do not (M2). |
| D2 Data integrity | 3 | Nothing stored, but false change detection (B1). |
| D3 Reuse | 4 | Library person facts are reused. |
| D4 Rule integrity | 4 | Yes-only derivation is right. |
| D5 Stability and recovery | 2 | The lock loop (B1). |
| D6 Freshness and governance | 4 | |
| D7 AI trust | n/a | |
| D8 Orientation | 3 | The lower-case "representative" tab opens first (pre-existing). |
| D9 Flow of information | 3 | |
| D10 Language and guidance | 3 | Wrong refusal words. |
| D11 Feedback and state | 2 | "Out of date" from birth; "Confirmed by the officer". |
| D12 Visual quality | 4 | |
| D13 Accessibility and responsive | 4 | axe 0. 400/1024 px fine. Keyboard and zoom not walked. |
| D14 Looks like the team's product | 4 | |
| D15 Speed | 5 | View in 70–80 ms. |
| D16 Testability | 3 | m1, and no IMM 5476 lock test. |
| D17 First-use intuitiveness | simulated only | |
| D18 Information provenance | 2 | M1. |
| D19 End-to-end capability closure | 3 | IMM 5476 cannot reach "filed". |
| D20 User pain solved | simulated only | |

## Not checked
* A keyboard-only walk and 200 % zoom (no new controls).
* The SQR part in the browser (checked through the API only).
* IMM 5707's own instructions on step-children (m4).
* Coverage.
* The demo database.

**Verdict: Changes needed** for commit 26964195.
* Blocker: B1.
* Majors: M1, M2.
* Minors: m1–m6. m6 is for the Lead.

The `review: approved` label should not be applied to this commit.
