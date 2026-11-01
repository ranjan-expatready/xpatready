# Review: M3-E answer sheet, "Entered in the portal" (C7.3, MIGRATION `entered_section`)

Spec: `acceptance/C7.3.test.ts`, the C7.3 row of `acceptance/M3-CONTRACT.md`, `contracts/pdf-sections.json`, FQ-6 in `PACK-4-visitor-visa.md`. Backend only, no screen; only the C7.3 commits are reviewed (the C6.12/C11.6 and C7.7 part 1 commits below them are not).

Round 1 (3eab8873) was **Block**:
* Major: M1 (an out-of-date tick could never be redone), M2 (Done with nothing confirmed), M3 (the tick froze what the server held, not what the officer read).
* Minor: m1–m5.
* Its full text is in git history (this file at acb1ee93).

# Round 2: commit acb1ee93 (diff `3eab8873..acb1ee93`)

Reviewer agent, 2 Nov 2026. I used a fresh copy on :4433 (`xr_studio_rev_sheet`), stopped afterwards. US$0, no live AI, no `*_LIVE`.
Journey test: round 2 in `journey-test-reviewer-2026-11-01.md`, **8/10, passes**. The review still blocks, on N1.

## Runs
* `check_vv_answer_sheet.ts`: **11/11**.
* `check_vv_prepare_api.ts` on a fresh copy: **32/32**, including pack 4's C7.3 13/13.
* Pack 4's edit to `C7.3.test.ts` only sends `version` with each tick (per the contract's "every write carries a version"). Its 13 rules and their checks are unchanged.
* Prisma drift (`migrate diff`, against the migrated copy): nothing for `entered_section`. Prisma leaves the partial index alone.

## Round-1 findings, re-checked
* **M1 · closed.**
  * The tick now has `superseded_at`, with the partial unique index `entered_section_one_current` (`migration.sql:42`).
  * A re-tick of an out-of-date section supersedes the old tick and freezes a new snapshot (`case-prepare.ts:227–231`).
  * Seen: 6 parallel re-ticks gave 201 + 5 × 200, leaving 1 current tick, 2 in total, 2 snapshots, and the section current again.
  * A raw SQL insert of a second current tick fails on `entered_section_one_current`, so the database enforces the rule.
  * The audit says "again, after a change".
* **M2 · closed as written** (`:140`): every section entered, current and waiting for nothing. All-ticked with facts waiting is no longer Done. N1 below shows the waiting list itself is wrong.
* **M3 · closed.**
  * Each section carries `version`. The tick checks it: a missing, numeric, list or null version gets 400; an older, superseded or stale-read one gets 409.
  * The frozen hash is the version the officer sent, so the snapshot is the sheet the officer read. A change that lands between the check and the lock correctly shows as out of date afterwards.
* **m1 closed:** foreign key to `runtime_case` and an index on `case_id`.
* **m4 closed:** "1 answer frozen".
* **m5 closed:** `cannot_start` wins (`:136`).
* **m2, m3:** open, Minor, accepted.

## New in round 2

### Major
* **N1 · Parents are folded into the applicant, so IMM 5707 can never read Done.** I missed this in round 1.
  * **Cause:** `engine/runtime/answer-sheet.ts:44` keys each box by `(b.about ?? "").split("/")[0]`. For IMM 5707's parent boxes, `about` is `<applicant>/parent_1` or `<applicant>/parent_2` (`render.ts` `aboutOf`), so they are keyed as the applicant.
  * **Seen, after `fillEverything` on a solo case:** Section A lists 8 waiting entries under the principal's own id, including Family name, Given names, Date of birth, Country of birth, Marital status and Occupation. The sheet confirms those same facts for the principal just above.
  * **Effect 1:** parent 1 and parent 2 fold into one entry, because the waiting de-duplication is by subject and fact.
  * **Effect 2:** once parent answers exist, the answer de-duplication (`:47`) will drop a parent's answer as a copy of the applicant's.
  * **Effect 3:** with M2, IMM 5707 can then never read Done. Its reason meanwhile says "Every fact it reads is confirmed." (`case-prepare.ts:140`, from `formReadiness`), which contradicts the sheet.
  * **Fix:** key answers and waiting entries by the full `about` (person plus relation). Give each waiting entry `person: b.about_label`. Add a pass/fail pair: two parents give two entries, and neither is the applicant.
  * Parents having no question in this release is not a finding: the section correctly waits for them. The PR should say that IMM 5707 cannot reach Done until parents are collected.

### Minor
* **n1 · The 409 on a stale tick reuses the filings wording.** It says "This application's filings or items changed since you read them" (`case-prepare.ts:33`, used at `:224`). **Fix:** "This section's answers changed since you read the sheet. Reload it, check the new answers, then tick it."

## What holds (round 2)
* **Permissions:** client 403, even with a valid version. A bad key with a good version gives 404 before the body is read. Changing the channel to PDF upload makes both routes 409.
* **Audit:** a search of all audit rows for the sample values and names found 0.
* **Speed:** prepare view 74 ms, sheet 15 ms.

## D1–D20 (round 2; changes only)
* D1 Requirement fit: 4 (N1).
* D2 Data integrity: 4 (N1 de-duplication).
* D4 Rule integrity: 4.
* D6 Freshness: 5.
* D16 Testability: 4 (no parents case).
* D18 Provenance: 3 (N1 names the wrong person).
* All other scores as in round 1.

## Not checked (round 2)
As in round 1. Parent answers could not be entered in this release, so the answer de-duplication loss is shown from the code, not from a run.

**Verdict: Block** for commit acb1ee93. Fix N1 with its test. n1, m2 and m3 are Minor.
