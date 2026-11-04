# Independent review: M3 design records (PR #863, branch `claude/vigilant-noether-l2sgvm`, head 0f6c44a8)

Reviewer: a fresh agent that did not write these records (P-303). Read-only: nothing run except `git`, `grep` and small `python3` reads of JSON. No app, no database, US$0. Base `main` 9caa043b.

## Verdict: Changes needed

No Blocker. Three Majors: a founder recommendation that contradicts a recorded ruling (P-318 (6)) without saying so; gate B described more strictly than the gate as built, which sets the "waits for" columns; and the fee table's approval, cache and Reset, which need two M2-hot files the row says it avoids. The rest is sound and carefully sourced. All five parts are present for all 11 rows (C1.3 and C11.5 are one row, as P-316 (2) says). The four r2 concepts answer every Blocker and Major in their `challenge.md`. Each fix below is small.

**Scope check.** `git diff --stat origin/main...HEAD` shows only the 13 files under `product/screens/M3-design-2026-11-04/`. No edits to STATE, RULES, DECISIONS, BACKLOG or `tools/decision-impact.sh`. No personal names: only roles and Sample people (Client A, Spouse A, Child A1/A2).

## Majors

**M1. The C10.2 Q1 recommendation (and C7.3's Online IMM 5707) contradicts P-318 (6), and the records do not say so.**
* **Where:** `rows.md:762-766` (C10.2 Q1), `:870` (founder question 2) and `:241` (C7.3 Done when, "an Online IMM 5707"). The same row is on `prepare-tab/design/draft-prepare-tab.html` (IMM 5707 · Online).
* **What P-318 (6) says:** "the family form follows the channel (online IMM 5645, paper IMM 5707 per IMM 5484), never by removing one". P-318 (6) is a 4 Nov ruling by the tech lead (`DECISIONS.md:6`).
* **Where the records disagree:**
  * The pack's FQ-2 (IMM 5707 Online, `PACK-4-visitor-visa.md:40`) is older than that ruling.
  * Under the pack's channels the whole application is filed online (IMM 5257 PDF upload, IMM 5476 signed scan uploaded). So P-318 (6) gives IMM 5645, not IMM 5707.
  * `rows.md` lists P-318 (6) among the decisions for C7.3 (`:268`) and C10.2 (`:759`), yet recommends the pack's channels and asks only DEMO.md and C10.1 part B to change.
* **Fix:** reframe C10.2 Q1 as pack and FQ-2 against P-318 (6), DEMO row 9 and #798.
  * Either recommend P-318 (6): an online application uses IMM 5645, and the pack's -6 and C7.3's Done when move to IMM 5645 (it lists the parents too, so QA-153 still applies);
  * or state plainly that the recommendation reverses P-318 (6), so the founder decides with that in view (AGENTS rule 2).
* **Then:** word C7.3's Done when as "the Online family form", not "IMM 5707".

**M2. Gate B is described as stricter than the gate as built, so the order's "waits for" columns are partly wrong.**
* **Where:** `rows.md:54-63`, `:132`, `:822-826`, `:832-833`; `documents/concept-draft.md:140`; `prepare-tab/concept-draft.md:131`. They read gate B as "CI fails a product PR that names a capability with an open Major".
* **What the gate checks:** `prototype/studio/tools/gate-b.mjs:7-10` checks `qa/BUGS.md` only for a capability on a **"Claims Works:"** line ("tech lead, 4 Nov: incremental work is not stopped by the row's bugs"). It accepts a bug as fixed only on a strict `Fixes: QA-nnn` line, and the PR's title and prose never count.
* **Effect on the order:**
  * Row 1 (C6.4 (a)) does not have to wait for QA-149 to close.
  * Row 2 (C7.7 tab) does not have to wait for QA-152.
  * Each only waits before the PR that claims Works.
  * Row 2's list also leaves out QA-153, which names C7.7 too (`BUGS.md:50`). C7.7 at Works therefore needs both QA-152 and QA-153 closed, and QA-153's M3 half lives in C7.3 (row 7).
* **Fix:**
  * Restate gate B as built, and cite `gate-b.mjs`.
  * Move "QA-nnn closed" from "Waits for" to a new "Before Claims Works" column: C6.4 needs QA-149; C7.7 needs QA-152 and QA-153; C7.3 needs QA-153 and QA-165; C10.2 needs QA-153.
  * Use the `Fixes: QA-nnn` form.
  * Note the gap between `RULES.md:19` and the tool for the tech lead.

**M3. The fee table's approval, cache refresh and Reset are not M3-only as designed.**
* **Where:** `rows.md:519-525` and `:834` (row 3, "M3-only"; "Rows 1, 3, 4 and 5 … none touches an M2-hot file", `:864`); `fee-table/concept-draft.md:17-18` and `:24-30`.
* **Facts:**
  * `decideChange` (`api/src/library-changes.ts:112-130`, hot) only flips `library_change.status`. It calls nothing per kind. So `fee_table.status` never becomes "in force", and "a cache the loader refreshes when a version is approved" has nothing to hook into, unless the hot file changes.
  * To review shows a new kind only as the generic noun "change", with no details (`KIND_NOUN` and `changeView`, `:22`, `:69`, hot). P-253 assumes the approver sees what they approve.
  * Reset deletes table by table in `api/src/demo.ts:533-545` (hot). A `fee_table` row with no foreign key survives Reset. That breaks P-108 ("Reset blanks all configuration") and the concept's own test, "GET after Reset to the six gives version 0" (`fee-table/concept-draft.md:80`).
* **Fix (keeps it M3-only):**
  * Give `fee_table` a `library_change_id` FK with `ON DELETE CASCADE`. Reset's existing `libraryChange.deleteMany` then removes it.
  * Derive "in force" at read time: the newest version whose change is APPROVED, as `form-library.ts:111` already reads `form_accepts`.
  * Have the sync readers (G1 from `studio.ts:455`, the checklist's `DERIVED_FOR` built once at import, `engine/runtime/case-checklist.ts:21`) refresh from that read on each async route, not on approve.
  * Accept the generic "change" words on To review until M2 is at 55, or ask now for the hot-file line for `library-changes.ts`.
  * Say which option in row 3.

## Minors

* **m1, `rows.md:60`:** the QA-149 fix check is wrong. CAPABILITIES C6.4 names `tests/qa/check_qa_vv_1102_decider.ts` 5/5 for QA-149; `check_qa_r3_minor_principal.ts` is QA-156's. **Fix:** cite the decider check.
* **m2, `rows.md:519`; `fee-table/concept-draft.md:16`:** the list of fee-table readers is off.
  * `api/src/case-checklist.ts` does not read the table. The readers are `engine/runtime/case-checklist.ts:21` and `engine/source-register.ts`, besides `api/src/source-register.ts`, `case-prepare.ts:23` and `filings.ts`.
  * The concept says "seven readers" and lists six.
  * **Fix:** list the files exactly as `grep -l "FEE_TABLE\|fee-table.json"` finds them.
* **m3, `rows.md:494`; `fee-table/concept-draft.md:106`:** `spouse_dependent_child` carries the quote "dependent child CAD 180" (`quote_kind` "summary of the research file"). The "$270.00" is in its `checked` note and in research row 1c. **Fix:** reword it. The conclusion (Sample until the expert confirms) stands.
* **m4, `rows.md:541`:** "`pr_adult` (CAD 1,590)" is neither cited nor labelled Sample. Its quote in `fee-table.json` is a summary, and the concept's BR-5 makes it Sample. **Fix:** add "Sample".
* **m5, `rows.md:542`, `:872`; fee-table Q1:** "keep P-151 (1)" overstates that decision. P-151 (1) says a fee that is no longer current warns with "Adopt update" (its block was superseded by P-237 (3)). It never says when the version is stamped. **Fix:** "follows from P-151 (1)'s warn-not-reprice, as amended by P-237 (3); the stamp time is new and is the founder's to confirm."
* **m6, `rows.md:833`:** order row 2 says "`App.tsx` one line". `rows.md:393` and prepare-tab BR-1 say no line is needed. **Fix:** drop "`App.tsx` one line".
* **m7, `prepare-tab/concept-draft.md:23`:** "Types in `prepare.tsx` or a **new** contracts file" contradicts `rows.md:18-19` and `:400`, because a new `studio/contracts/` file is hot on every later edit. **Fix:** keep `prepare.tsx` only.
* **m8, `field-scope/concept-draft.md`:** the drafter's response accepts m1, m3 and m4 (`:112-115`), but the body was not updated.
  * §6 -2 (`:70`) omits the draft version of a published key.
  * -6 (`:78`) does not cite RT-9 or limit itself to "a correction keeps `rowKey`".
  * The household stand-in and SA-1B-130 edge 12 appear only in the response.
  * `rows.md:653` and `:659` do have the first two.
  * **Fix:** copy them into BR-1, BR-2 and §6.
* **m9, `rows.md:583-606` (C11.5):**
  * It does not take the organisation test -5 that `rows.md:660` and `field-scope/concept-draft.md:80` hand it.
  * "steps -1 to -9, one per clause" covers 7 clauses.
  * No listed route creates the Sample employer record ("seeded … through the new staff route").
  * **Fix:** add the -5 step that names C3.16, align the count, and name the create route or call the seed SQL scaffolding.
* **m10, `rows.md:171` and `:182`:** C6.5-21 to -23 name no file. The documents concept puts the counts tests in `C6.5-screen.test.ts` and adds `GET /runtime/cases/:id/document-reviews/counts` (`documents/concept-draft.md:106`, `:122`), which is missing from the 2a file list. **Fix:** name the file and the route.
* **m11, new tables (rows C6.5, C7.5, C11.5, C3.16a):** Reset's `case.deleteMany` and `party.deleteMany` are in hot `demo.ts`. Each new table (`read_value`, `document_review`, `answer_check`, `review_run`, `case_employer_link`, `case_household`) needs `ON DELETE CASCADE` to `runtime_case` or `party`, as `review_finding` and `sign_step` have. Otherwise Reset fails and only a hot edit fixes it. **Fix:** say so in each migration line.
* **m12, `rows.md:843` (row 12, C6.12-23 on a study permit Sample):** the order recorded in `STATE.md:36` (P-319) puts "Study permit filings/checklist (M3, after M2 55)". **Fix:** reconcile with that order, or name the difference for the tech lead.
* **m13, `documents/design/draft-documents.html:32`:** "… for Child B first" sits under Child A's group. **Fix:** use Child A.

## Claims checked (19 sampled, all true unless listed above)
| Claim | Evidence |
|---|---|
| Guard matches only modified or deleted files, by prefix | `m3-guard.sh` `--diff-filter=MD`, `case "$f" in "$h"*` |
| Hot list contents (`rows.md:21-25`) | `m2-hot-files.txt`: matches, `contracts/` = `prototype/contracts/` |
| `BUILT_SCOPES`, `HELD_SCOPES` "Held (P-251)" | `studio/contracts/resolver.ts:83-91` |
| `FieldScope {CLIENT_LEVEL, CASE_LEVEL}` | `schema.prisma:44` |
| Parents as relatives `${subject}/parent_1|2` | `engine/resolver.ts:70,93,159` |
| Pack counts: C6.4 30, C6.5 25 red + 7 engine, C7.3 13, C7.5 16 (with -6b), C7.7 26, C11.6 14, C6.12 24, breadth -22…-25, C10.2 -1…-11 | `acceptance/*.test.ts` ids and `ok(` counts; CAPABILITIES |
| No C1.3, C11.5 or C3.16 pack | `acceptance/` listing |
| Review run refused "not built yet (C7.5…)"; `check_c44_part2` checks it | `runtime.ts:263`; `check_c44_part2.ts:120-121` |
| "worked out by C7.6 (not built yet)" | `case-prepare.ts:232` |
| `employerFacts` counts every `organisation.*`; c1-v3 IMM 5476 and 5475 map it as representative | `engine/runtime/employer.ts:12-16`; `p3/releases/c1-v3/configuration.json` |
| `lm.high_wage` `"sources": []` | `samples/wave1.json` |
| `pdf-sections.json` = IMM 5257, 1295, 5707, 5476 | file keys |
| PR Portal account keyed to `fs.outside` | `form-library-sample.json:39,69,70` |
| Fee table has only `vv.single`; biometrics quote is a summary | `samples/fee-table.json` |
| Run costs US$0.63 + US$0.49 | `p2/runs/…150331838z-254739.json`, `…check…150458867z…` (the job budget reads US$3.65, not 3.62) |
| Open Majors on these rows are exactly QA-149, 152, 153, 165 | `qa/BUGS.md` |
| P-316 (1)-(3), P-317 (3), P-300 (2), P-239, P-243, P-171 (3)/(5)/(6), P-245 M4, P-226, P-93 absent; P-319, P-322, P-323 not in DECISIONS | `DECISIONS.md` |
| `per_row` repeat mode exists | `studio.ts:648` |
| Document item always `to_do`; PDF-upload state via `paperLine` | `case-prepare.ts:221-226` |

## What is sound
* Every immigration amount is cited with page, quote and date or labelled Sample, apart from m4.
* The M3-only and M2-hot sorting is right file by file (checked against the hot list and the guard's prefix match), apart from M3.
* The order puts M3-only work first, and the C7.6 dependency table matches the packs.
* Each challenge's Blockers and Majors have a matching rule, test or Definition-of-ready line in its r2 concept.
* Each row has at most three questions, each with a recommendation.

## Re-review (diff only: `git diff HEAD~1 HEAD`, bc42e4ab; the range 7a5b2b0b does not exist in this clone)

**Verdict: Changes needed.** One Major and four Minors remain. M2, M3 and m1–m13 are fixed. M1 is half fixed. The diff touches only this folder (`review.md` came in unchanged).

**Fixed:**
* **M2:** gate B is now described as `gate-b.mjs` checks it. The order table has a "Before Claims Works" column, and the two Definitions of ready match.
* **M3:** "in force" is worked out when the table is read, nothing runs on approve, and `fee_table` cascades from `library_change` (`rows.md:529-538`, `fee-table/concept-draft.md:18`).
* **m1–m13:** all fixed as the response says (QA-149's check, the readers, the child fee, `pr_adult`, the P-151 wording, `App.tsx`, the types, the field-scope body, C11.5-8 and the create route, C6.5's route and test file, the cascades, -23 under P-319, the board).

**Remaining Major**
* **R1 (from M1). The demo story no longer has an Online form, and one claim in the fix is false.**
  * **The false claim.** `rows.md:781` says DEMO.md row 9 "follows" P-318 (6), with "no IMM 5707". Row 9 actually reads "IMM 5257 Online, IMM 5707 PDF upload, IMM 5476 Signed PDF upload" (`DEMO.md:23`), so it also goes against P-318 (6).
  * **The missing Online form.**
    * The new recommendation (`:783`) keeps IMM 5257 as a PDF upload and makes IMM 5645 the family form, but never says IMM 5645's channel.
    * C10.2's Done when still needs "Online sections entered" (`:739`), and its -6 checks an ONLINE item with its sections entered. DEMO row 14 needs a "portal sheet".
    * If IMM 5645 is Online, it has no section list: `studio/contracts/pdf-sections.json` (hot) holds only IMM 5257, 1295, 5707 and 5476, and an Online item without one is refused. If it is a PDF upload, release 2 has no Online item at all.
  * **Fix:**
    * State release 2's channels in full, including IMM 5645's.
    * If IMM 5645 is Online, add its section list outside the hot prefix (as C11.6 (b) proposes, `samples/pdf-sections-*.json`) or get the tech lead's hot-file line. Then add that to C10.2's files and to its "Waits for".
    * Correct the DEMO row 9 claim, and name DEMO row 9 among the records the tech lead corrects.

**Remaining Minors**
* **r1, `rows.md:251`, `:285-286`, `:858`.** C7.3 still says "C10.2 reaching Done on IMM 5707" and still waits for "C10.2's Q1 (whether release 2 has IMM 5707 at all)". With R1, C10.2 no longer uses IMM 5707. **Fix:** "C10.2's family form" or "the Online family form".
* **r2, `rows.md:784`.** C7.3 would score Works only on a Sample fixture whose channel goes against P-318 (6). That fixture is the shared `setup_vv_m3.ts` release, which every M3 pack uses, not a fixture of C7.3's own. P-322 counts Works only where a real user meets the capability. **Fix:** put this to the tech lead as a named question (Works on that fixture, or C7.3 Works waits for C11.6 (b)).
* **r3, `fee-table/concept-draft.md:17`.** The Loader row still says the cache is refreshed "when a version is approved". The concept's back-end plan ("the challenge's table, unchanged") still reads "sync cache refreshed on approve". Both contradict line 18. The `status` column's meaning is also left open. **Fix:** "refreshed from the read (version check)", and say that `status` is never trusted over the change's state.
* **r4, `rows.md:283-284` and `:605-607`.** QA-165 is listed twice in C7.3's "Depends on". C11.5-9 repeats clause 2. **Fix:** remove the duplicates.

## Re-review 2 (diff only: `git diff HEAD~1 HEAD`, 085adfc1)

**Verdict: Approve.** R1 and r1–r4 are fixed, and no new Blocker or Major appears. The diff touches only `rows.md`, `fee-table/concept-draft.md` and `review.md`; this section is the only change to `review.md`.

**What was fixed:**
* **R1.** Release 2 is now IMM 5257 Online, IMM 5645 PDF upload (channel Sample) and IMM 5476 signed scan (`rows.md:779-792`).
  * This matches P-318 (6) and STATE's recorded follow-up "DEMO.md row 9 → IMM 5645 online" (`STATE.md:19`).
  * IMM 5257 has a section list in `pdf-sections.json` (checked), so the hot file is not touched.
  * DEMO row 9 is now quoted correctly.
  * The barcode round trip moves to the thin case on release 1.
* **r1, r2.** C7.3 is rewritten around "the Online form", and Q4 goes to the tech lead under P-322.
* **r3.** The cache is refreshed from the read, `status` is derived when the table is read, and the back-end plan's "Readers" row is overridden.
* **r4.** The duplicate is gone, and C11.5-9 is now a distinct case (the box-owner filter).

**Carry into the builds (Minor, no change needed before merge):**
* **n1. C7.3's Works now needs release 2,** which C10.1 part B (M2, `demo.ts`, #798) builds. Add that to row 7's "Before Claims Works" cell (`rows.md:864`).
* **n2. `acceptance/C10.1.test.ts:50` still expects "IMM 5707 PDF upload" on release 2.** The P-318 (6) follow-up should change it with DEMO row 9. Name it in C10.2 Q1 for the tech lead.
* **n3. Say whether IMM 5645 is a barcode form.** If it is, P-144's one hard stop needs its validated copy read back on release 2 (the Sample step in Q2), and its field map is a #798 dependency. C10.2's Done when (`:740`) says only "filled as a PDF upload".

Re-review 3 (a6c76fb1): Approve. n1 (`rows.md:864`), n2 (`:790`) and n3 (`:740`) are written in as asked; nothing else in `rows.md` changed.
