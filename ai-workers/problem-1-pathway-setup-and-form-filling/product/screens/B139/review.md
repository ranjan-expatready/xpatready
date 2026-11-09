# B139 · C6.17 A multi-stage case: review

The reviewer did not build this. Reviewed commit **b2091b750** on `claude/exciting-mccarthy-up4u21-b139` (draft #1262), diff `origin/main...b2091b750`, 9 Nov 2026.

Checked on a fresh isolated copy `rev139` (:4444, configured checkpoint, stopped afterwards). Re-run: `acceptance/C6.17.test.ts` **24/24**, `tests/check_c617_stages.ts` **31/31**; the migration test was read, not re-run, and C9.5 was not re-run. Also a browser walk with axe and widths, and two API reproductions. Journey test: `journey-test-reviewer-2026-11-09.md`, **7.5/10, below the pass mark**. Graph: no C6.17 gaps (`graph.mjs`).

**Verdict (skill scale): Ship after fixes.** The engine, migration, start transaction and B145 pins are sound. Four Majors remain: one reader the build missed, one founder-decision path, accessibility, and the D1 wording.

## What holds (verified)
* **Area (1), B145 pins.** `reach()` reads only the current combination's chain, checks every pin's hash and combination (`runtime.ts:96-101`) and returns only the current application subject. Scoped: Fill re-check `fill-case.ts:277`, move `release-update.ts:158` and its refusal `:125`, where-used `where-used.ts:251`, Prepare's re-check under the lock `case-prepare.ts:228`, `storedVersion` `:806-811`, plus findings, review runs, tasks, readiness inputs, filing changes, submission, assessments and copies (by the current pins' releases). C6.17-12 (move to rev 2 after the start) passes.
* **Area (2), the migration.** Expand, backfill, constrain; the backfill picks the `case` participant, and only `runtime.ts` creates cases. FAMILY unique now (case, stage) (challenge B2); live-rule finding unique widened. Deferred one-CURRENT check skips a deleted case; forward-only trigger works. The ended-row trigger takes `FOR KEY SHARE`, so a racing write waits for the start's `FOR UPDATE`. FKs NO ACTION, cascades via `pg_trigger_depth`; demo reset deletes routes and stages go with cases (Reset then Load ran clean twice). Rollback note included.
* **Area (3), the start.** Under `FOR UPDATE` it re-checks the current stage id and version, next stage NOT_STARTED, not retired, newest release = the previewed one. Pin revision 1 after the combination moves (D4); a new application subject; audit without values or reason; two starts at once give 201/409.
* **Rules.** P-425: no combination or program key in engine, API or web code; the route is data (`samples/routes.json`). Sample on every route, key detail and deadline. No model call.

## Issues (Must = Major; fix each with a failing test first)
1. **Must (Major), area (1): a recorded ended stage freezes the new stage's people and employer link.**
   * `refuseIfCaseRecorded` counts `filing_record` by case (`api/src/submission-record.ts:33-34`). It is called at `runtime.ts:344` (add person) and `:373` (travelling).
   * `employer-link.ts:86` does the same, and the Sample route's next stage is the LMIA work permit.
   * Repro on :4444: open a study-permit case, Prepare, add one `filing_record` on its filing, Start next stage (no reason needed, correct). Then `POST …/people` (spouse) → **409** "recorded as submitted…". Delete the record row and the same call → **201**.
   * The pack never records stage 1 (step 7 uses the reason path).
   * Fix: count with `filing: { stageId: c.stage.id }` in all three places. Pack step: record stage 1 through C8.2, start, then add person 201, travelling 200, employer link not refused for the record.
2. **Must (Major): P-412 F13 (c) holds on two of three paths.**
   * On open (`runtime.ts` createCase) and on the PUT key details (`case-stages.ts:225-233`), the UCI is also written as the client's answer.
   * On **Start next stage** it is kept only on the stage record (`case-stages.ts:186-188`). The panel still says "(also the client's answer)" (`web/src/runtime/stages.tsx:115`).
   * Repro: start with `person.uci` = 12345678; the principal then has no `person.uci` answer.
   * Fix: one helper used by all three, called in the start transaction. Assert it in C6.17-8.
3. **Must (Major), BIC-20 / STANDARDS [M] "axe-core on every screen state".**
   * The case page with the strip has 2 axe violations: `nested-interactive` (ⓘ button inside the chip button, `stages.tsx:67-70`) and `target-size` (14 px ⓘ, `stages.tsx:25`).
   * After a successful start, focus lands on `<body>`: `returnFocus()` targets the Start button, which unmounts when there is no next stage (`stages.tsx:148`).
   * Fix: make the ⓘ a sibling of the chip with a ≥24 px target, and focus the strip heading or the new current chip. Add an axe step on the strip.
4. **Must (Major), area (5): D1 is honest in the records but not on screen.**
   * The dialog lists "2 documents", and the toast says "5 forms and 2 documents added" (`case-stages.ts:132,136`).
   * In the same view, the new stage's Documents panel says "Not worked out for this combination … Nothing is guessed" (journey r07).
   * No document line, upload or "On file from" exists for either Sample stage, so nothing was added. BR-6 is proved only by the engine test.
   * Fix (no new scope): when `cl.derived` is false, say "2 documents this release asks for (the per-person checklist is not worked out yet for <combination>)" in the dialog and toast. Whether D1 meets "adds documents" (SA-1B-67) stays the tech lead's or founder's call, as the builder asked on the PR.
5. **Should (Minor), concept D6:** by-id form-copy routes do not refuse a copy of the ended stage.
   * `copyFor`, `copy` and `lock` (`fill-case.ts:341-396`) do not check that `x.configReleaseId` is among `c.pins`.
   * IMM 5476, 5475 and 5409 are in both releases, so a stage-1 copy can be read against stage 2's facts, or locked when they match. This conflicts with BR-7 "never cross".
   * D6's "every by-id route is covered" holds only for the five trigger tables.
   * Fix: 409 in `copyFor` when the release is not the current stage's.
6. **Should (Minor), test gap:** pack C6.17-9 reads `/record`, which is not a route. It answers 404 and is excluded, so C8.2's `/filing-record` reader is never checked for leaks (`acceptance/C6.17.test.ts:123-126`).
7. **Should (Minor), BR-8:** the Open-a-case "Earlier stages" step shows no deadline (`stages.tsx:197-217`), while the concept lists the Open-a-case summary among the places it is shown.
8. **Should (Minor):** `carryCounts` (`engine/runtime/stages.ts:134`) is tested but unused. The API counts its own way (`case-stages.ts:118-122`), so the engine test does not guard the shipped count.
9. **Should (Minor), BIC-13:** the dialog shows field errors with no "There is a problem" summary at the top. Dates read "Feb 3, 2027", where the concept's copy reads "3 Feb 2027"; the app already mixes en-CA and en-GB.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | SA-1B-67/-68/-212 paths work (pack 24/24); F13 (c) missing on the start (#2); "adds documents" not met for these two (#4) |
| D2 Data integrity | 4 | uniques per stage, one-CURRENT deferred, ended-row trigger, 201/409 race; by-id copies open (#5) |
| D3 Reuse | 4 | key details are library fields (`person.uci` checked by its release); the deadline date is route-typed (D7) |
| D4 Rule integrity | 4 | `routeProblems` refuses repeats, a bad next, a non-date deadline source |
| D5 Stability | 4 | stale 409 "read again"; Prepare/checklist race write nothing late; reset clean |
| D6 Governance | 4 | `recorded_by/at`, `started/ended_by`; audit without values (C6.17-14) |
| D7 AI trust | N/A | no AI |
| D8 Orientation | 4 | strip under the header, route label, current chip outlined (r02) |
| D9 Flow | 4 | one Start button; the dialog says everything before the click (r05) |
| D10 Language | 4 | concept §5 words; "added" overstates (#4) |
| D11 Feedback | 3 | toast vs page contradiction; focus lost (#3, #4) |
| D12 Visual | 4 | team components; builder walk 02/05/07 |
| D13 Accessibility | 3 | keyboard reaches Start in 10 Tabs; no sideways scroll at 1024/720/400; 2 axe violations (#3) |
| D14 Team look | 4 | GOV.UK task-list statuses on team Pill/Panel/Dialog |
| D15 Speed | 5 | preview 98 ms, start 386 ms, open 133–216 ms |
| D16 Testability | 4 | pack, engine and migration tests fail on their rules; gaps #1, #2, #6, #8 |
| D17 First use | simulated only | |
| D18 Provenance | 3 | Sample everywhere; "(also the client's answer)" false on the start path (#2) |
| D19 Closure | 3 | open later and start next work end to end; the recorded path blocks the next stage (#1) |
| D20 Pain/wow | simulated only | |

## BIC (EXPERIENCE §6)
| Check | Result | Evidence |
|---|---|---|
| 01 Ask once | Partly | person answers read where they are (C6.17-8); UCI typed at the start not kept as the answer (#2) |
| 02, 03, 05, 06, 07, 09, 15, 16, 17 | N/A | no new questions, document reading, principal change, channel, signing or review on this screen |
| 04 Incomplete/invalid | Met | "(optional)" in words; bad UCI/date 400 on the field (r01) |
| 08 Case structure | Met | strip: each stage, state, deadline (r02, r07; 1024 r09) |
| 10 Task list | Met | GOV.UK statuses; "Cannot start yet" not linked |
| 11 One primary | Met | one Start on the strip, one in the dialog |
| 12 Check before it leaves | Met | the dialog lists release, people, counts, forms, documents, deadline, unrecorded, "cannot be undone" (r05) |
| 13 Errors | Partly (Should) | inline on the field; no summary at the top (#9) |
| 14 Help in place | Met | ⓘ on strip, Ended, Done-before (target size under BIC-20) |
| 18 States | Met | skeletons; "Can't set …" state; empty panel texts (r08) |
| 19 Low load | Met | r05 at 1440, r09 at 1024 |
| 20 Accessible | Partly (Must) | #3 |

## Could not check
A real screen reader. True browser zoom (I used a 720 px viewport as a stand-in). The employer link with a real employer case (none in this firm's Sample data; #1 is shown there by code). The migration test and C9.5 were not re-run. An intended user's walk (D17, D20).

Another session's suite (`check_qa144_ee_release.ts` on :15451) ran in this working tree during the review. It left C6.12 screenshots and `studio/evidence/` JSON files modified; this review did not touch them.

**Verdict: Block.** To fix: #1, #2, #3, #4 (Majors, each with a failing test first). Fix the Minors #5–#9 or list them in the PR.
