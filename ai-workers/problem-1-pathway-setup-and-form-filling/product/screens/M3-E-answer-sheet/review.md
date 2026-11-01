# Review: M3-E answer sheet, "Entered in the portal" (C7.3, MIGRATION `entered_section`), commit 3eab8873

Reviewer agent, 1 Nov 2026. Backend only, no screen. Branch `claude/runtime-answer-sheet`; only the C7.3 commit is under review (`git diff dd16d505..3eab8873`). It is stacked on C6.12/C11.6 (approved at c0e8dae2) and C7.7 part 1 (f64d63bb), which are not reviewed here. I used a fresh isolated copy on :4433 (`xr_studio_rev_sheet`). US$0, no live AI, no `*_LIVE` variable, never :4400. The copy is now stopped.
Spec: `acceptance/C7.3.test.ts`, the C7.3 row of `acceptance/M3-CONTRACT.md`, `contracts/pdf-sections.json`, and FQ-6 in `PACK-4-visitor-visa.md`.
Journey test: `journey-test-reviewer-2026-11-01.md`, **7/10, does not pass**.

## Runs
* `tests/check_vv_answer_sheet.ts`: **11/11**.
* `tests/check_vv_prepare_api.ts` on a fresh copy: **29/29**. Pack 4's C7.3 passed **13/13**, C6.12 24/24 and C11.6 14/14.
* My own break script on the same copy. The results are in the findings and the journey report.

## Findings

### Major
* **M1 · An out-of-date section can never be brought up to date.** In `api/src/case-prepare.ts:223`, `if (was) return { row: was, created: false }` returns the first tick for good. The unique key `(item_id, section_key)` (`migration.sql:27`, `schema.prisma` `@@unique([itemId, sectionKey])`) allows only one tick per section, ever. Yet the item's reason (`case-prepare.ts:136`) tells the officer: "Enter the new answers, then tick it again."
  * **Seen:** I changed the family name and confirmed it, and Section A read out of date. I ticked it again and got 200 `created:false`; the section was still out of date. The item stays `out_of_date` permanently and can never read `done`, even after the officer re-enters the answers in the portal. The warning loses its meaning, which goes against P-65 and FQ-6.
  * **Fix:** when the existing tick is out of date, ticking again freezes a new snapshot. Either keep the old row as history (for example a `superseded_at` column, with the unique key on the current tick only) or point the row at the new snapshot and keep the old snapshot. Audit it as a re-tick. Ticking a current section stays a 200 no-op (C7.3-11). Add a test that fails without this fix. Fix it in this migration, before any data exists.
* **M2 · The item reads "Done" with nothing confirmed.** `case-prepare.ts:137` (`allEntered`) only checks that every section has a tick. `entered()` (`:215`) accepts a tick on a section with 0 answers and only waiting facts.
  * **Seen:** on a new case with no answers, I ticked Sections A (16 waiting), B (10 waiting) and C. `GET prepare` then gave the IMM 5707 item `state: "done"`, "Every section is entered in the portal." With 26 facts unconfirmed, this state is false, and the next step (readiness, C7.6) would rely on it.
  * **Fix:** count an item as `done` only when every section is entered, current, and has no `waiting` entries. Or refuse the tick (422, in words) while the section is still waiting for facts. Add a pass/fail pair.
* **M3 · The tick freezes what the server holds when the POST arrives, not what the officer saw.** `entered()` rebuilds the sheet inside the request (`case-prepare.ts:217`) and freezes it (`:224`). The POST carries no fingerprint or version of the sheet the officer read.
  * **Effect:** suppose a fact changes between the officer's read and the tick (a client answer, a document read, a second tab). The officer typed the old value into the portal, but the new value is frozen and the section reads current. This is exactly the case the out-of-date check exists to catch, and it is missed silently. It also contradicts the stated rule, "freezes the answers it showed" (schema doc comment; C7.3-10).
  * **Fix:** return each section's `hash` on the sheet and have the tick send it back. If it differs, refuse with 409 ("changed since you read it, reload"), checked under the row lock. This is the same pattern as C11.6's `version` and P-72's "Confirm section". Make the field optional only if the contract must stay as it is; state that in the PR.

### Minor
* **m1 · `case_id` has no foreign key and no index** (`migration.sql:10–21`). The prepare view filters on it (`case-prepare.ts:121`). Deletion is still safe, because rows cascade through `filing_item`. **Fix:** add `@@index([caseId])`, and either a foreign key to `runtime_case` or a note on why there is none.
* **m2 · Switching away from Online and back brings the old ticks back as they were**, including stale ones. Seen: PDF_UPLOAD gave 409 on both routes and the item read `to_do`; ONLINE again showed the old ticks. This is acceptable as history. Say it in the PR, or note the channel change on the ticks.
* **m3 · The source of a row fact uses the first answer of that fact** (`case-prepare.ts:287`, `answers.find(...)` has no row). A repeated fact can show the wrong source.
* **m4 · The audit wording reads "(1 answers frozen)"** (`:229`). Fix the plural.
* **m5 · Out of date wins over `cannot_start`** (`:135–136`). An item waiting to see whether it applies at all shows "Out of date" instead. This is an edge case; order the states as the concept intends.

## What holds
* **Migration:** one new table and no change to existing rows. Rollback is recorded. The cascade runs from `filing_item` and `answer_snapshot`, so a case or demo reset clears it. Section snapshots are reached only through `entered_section`; `FormInstance` reads its own snapshot, so form copies never pick these rows up.
* **P-72:** only `confirmed fact` boxes fill answers; everything else is listed as waiting. Before filling there were 0 answers, with 16 and 10 waiting. After filling, Section A had 14 answers, including the spouse's.
* **The snapshot is never changed:** there is no update path. The `facts_json` md5 was the same before and after a later change.
* **Concurrency:** 6 parallel ticks gave 201 + 5 × 200, with 1 row and 1 snapshot. They are serialised by `FOR UPDATE` on `runtime_case`, with the unique index as a backstop.
* **Bad section keys:** `__proto__`, `constructor`, `toString`, a 3,000-character key, NUL, a space, `/..` and RLO all gave a 404 in words, never a 500.
* **Permissions:** client, client B and author 403; other firm (`user-S`) 404 on GET and POST; no actor 401; a malformed or unknown id 404; a document item 422; a PDF upload form 409 in words.
* **Audit:** the lines name the actor, the section title, the form, the role and the short case id. A search of all audit rows for the sample values and names found **0**.
* **Channel:** the item's own channel comes first, then the line's (`channelOf`). This is the same in `onlineItem` and in the view.
* **Speed:** prepare view 56 ms, sheet 38 ms (averages of 5 runs).

## D1–D20 (1–5)
* D1 Requirement fit: 3. Pack 4 passes 13/13, but M1 and M2 break the state the concept relies on.
* D2 Data integrity: 3 (M3).
* D3 Reuse: 5 (`answer_snapshot`, `formCoverage`, the twin).
* D4 Rule integrity: 3 (M2).
* D5 Stability: 4.
* D6 Freshness: 3 (M1).
* D7 n/a.
* D8–D13: n/a, no screen.
* D14 Team look: 4.
* D15 Speed: 5.
* D16 Testability: 3. Pass/fail pairs, but no test for re-ticking, an empty tick, or a change between read and tick.
* D17: simulated only.
* D18 Provenance: 4 (m3).
* D19 Privacy: 5.
* D20: simulated only.

## Not checked
* No screen, so no browser, axe check or screen sizes.
* `graph.mjs` was not run, because it writes `qa/GRAPH.md` and this review writes only its own files.
* No mutation runs, since I edit no code. Mutation is covered by reasoning: removing the out-of-date rule fails C7.3-12 and C7.3-13.
* canada.ca was not re-read; IMM 5707 being Online is Sample (FQ-2).

**Verdict: Block** for commit 3eab8873. Fix M1, M2 and M3, each with a test that fails without the fix. m1–m5 are Minor.
