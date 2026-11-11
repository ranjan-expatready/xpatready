# M3-S3: waivable line with a reason, independent review (PR #1524)

Commit reviewed: `aeeb7ac5567f09a44333f373f1779e5d1fbe00da` (branch `claude/runtime-m3s3`). The reviewer did not build it. Copy `rev_m3s3` on :4431 (configured checkpoint, live AI off, US$0), stopped after. Bar: BACKLOG row M3-S3 (no concept.md), P-171 (6), P-380, P-425, P-172 (out of scope: M3-S4), STANDARDS, EXPERIENCE §6, the team's Binder text (requirements-2026-11-02 Doc 3: "staff verify/reject/waive (reason mandatory on reject/waive)", AG-7-41 audit; `Waived` is one of the team's `Document.status` values).
Note: at 06:53 UTC, after my runs, another session changed `api/src/case-checklist.ts` in this working tree (audit reason, upload words). Those changes are not committed and not reviewed here. The breaker's `break-report.md` is in this folder: I re-checked its points and cite them where I agree.

**Verdict: Ship after fixes** on the screen-review scale. For the merge: **Block**, with 5 Majors (listed at the end).

## What I ran
* `tests/runtime/check_m3s3_waivable.ts` 13/13. `check_m3s3_waive_api.ts 4431` 13/13 (116 s). `check_c64_storage_api.ts` 48/48 on the same copy. `check_vv_checklist.ts` 76/76. `check_b164_no_engine_keys.ts` 52/0. tsc: web 0 errors; api 15 (the base's count), none in changed files.
* UI journeys in Playwright, run twice with the same result. The author ticked Waivable on "Letter of acceptance" with the keyboard and saved; I released it through the API (sign-off and approve, not this row's screen). The case officer opened a case through "Open a case" and waived the line by keyboard only. I checked an empty reason, History, reload, Request again, and widths of 1440, 1024 and 400 px plus 720 px (200 %). axe WCAG 2.2 A/AA found 0 problems on 4 states. Report: `journey-test-reviewer-2026-11-11.md`.
* Break pass through the API: author 403, client 403, 501 characters 400, waive and Not applicable racing (one 200, one 409), three waives at once (one 200, one audit line), and a client upload on a Waived line. Database read after each step.
* `graph.mjs`: G3 33, G6 13. `POST /runtime/checklist-lines/:id/waive` is `viaBrowser: false, webUse: false`: the web builds the path in a template string. Both new tests name no capability (`caps: []`).

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | Waivable setting, Waive with reason, 422 on a non-waivable line, take-back all work. "Records who and why" holds only while the line stays Waived (M2) |
| D2 Data integrity | 3 | SQL checks, version lock, one winner in a race. Unticking one flag hides a case's whole checklist and its Waived rows (M1) |
| D3 Reuse | 4 | Reuses `setState`, `state_*` columns, and the Not applicable dialog and contract |
| D4 Rule integrity | 3 | The guard depends on an unrelated flag (M1). Merging lets a not-needed requirement block a waiver (m3) |
| D5 Stability | 4 | Reload keeps Waived, double send is guarded, a stale version gets 409 and the list reloads |
| D6 Governance | 2 | The audit line has no reason (`detail` NULL), so the "why" is lost after Request again (M2). The approver cannot see the setting (M3). No rollback recorded (M4) |
| D7 AI trust | N/A | No AI |
| D8 Orientation | 4 | Dialog title "Waive: Letter of acceptance for Client A" |
| D9 Flow | 4 | ⋯ → Waive… → reason → Waive, then Request again to take it back. The dialog says how |
| D10 Language | 3 | Plain dialog words. A client upload on a Waived line is told "is Not applicable" (m1) |
| D11 Feedback | 4 | Waived pill, reason, "Last change … by Case officer (Sample)"; the "n of m received" count leaves the line out |
| D12 Visual | 4 | Team Pill, Dialog and checkbox (screens c4, c6, a4) |
| D13 Accessibility | 5 | Keyboard path, focus returns to ⋯, axe 0, no sideways scroll at 400/1024/720 |
| D14 Team look | 4 | Same pattern as Not applicable |
| D15 Speed | 5 | Waive 58 ms; checklist GET 20–34 ms |
| D16 Testability | 3 | Engine rules fail when removed. The guard is never exercised end to end, because `sp.outside` is already in the fee table's `checklist` set. The readiness rule has no test (M5) |
| D17 | simulated only | No intended user walked it |
| D18 Provenance | 3 | Who and when are shown on the line. The reason and the setting are not visible where they are needed later (M2, M3) |
| D19 Closure | 4 | Configure → release → case → Waived → readiness drops the "not received" warning |
| D20 | simulated only | — |

## BIC scorecard (case Documents panel; EXPERIENCE §6)
| BIC | Score | Evidence |
|---|---|---|
| 01–03, 05–10, 12, 15–17 | N/A | No facts, AI values, people changes, tasks, filing, signing or review on this change |
| 04 Incomplete normal | Met | Empty reason is refused on the field (c3); Not requested stays a state |
| 11 One primary, named | Met | Dialog has one filled button, "Waive" |
| 13 Errors where they happen | Met | "Give a reason for waiving this document." on the field, typed text kept |
| 14 Tooltips | Met | No new chip or icon-only control |
| 18 States drawn | Partly | Waived is drawn with its reason. The Waived pill has the same neutral tone as Not requested, and the author's list and drawer do not show Waivable (M3) |
| 19 Layout | Met | One primary; grouped by person (c4, c6 at 400 px) |
| 20 Accessible | Met | Keyboard-only walk, 1024 px and 200 %, axe 0 |

## [M] lines not met (all others met or N/A)
* STANDARDS §5: no recorded rollback (M4). §Tests: "a rule's test fails when the rule is removed" fails for the readiness rule (M5). Doc 3 AG-7-41: the audit of a waive must keep the reason (M2).

## Builder's questions
1. **The guard narrowing, as built, is not sound** (M1). It turns "one line may be waived" into "every line of this combination is checked". The breaker reproduced both directions on `fs.spouse`. Two ways to fix it, and the choice is the tech lead's: (a) an explicit, released setting that is not the waiver, per P-425; or (b) leave the guard as it is and record in `challenge.md` why it cannot narrow honestly before M3-S4. Either way, add an integration test on a combination outside the fee table's set.
2. **Allowing Not applicable on a non-waivable line is acceptable for this row.** Both states record who and why. The bypass should be written into M3-S4's acceptance: "Not applicable refused, or still blocking, on a never-waivable line".

## Issues, ranked
**Must (Major)**
* **M1. The guard is switched by the waiver flag.** `engine/runtime/case-checklist.ts:140`. Ticking Waivable on one line derives every line of a combination outside the fee table. Unticking it hides the checklist, and the case's Waived row becomes unreachable (breaker M1: Request again gets 409). The code comment's claim "has had its document lines checked line by line" is not backed by anything. Fix: see question 1.
* **M2. "Why" is lost when the waiver is taken back.** `api/src/case-checklist.ts:185,192`. Request again writes `state_reason = NULL`, and the audit line has no reason (`detail` NULL). Confirmed in the database: after take-back, no row holds "The passport is held by the visa office…". The PR's own words, "History and audit work as for the other states", undersell the problem. Fix: put the reason in the audit line and its detail, plus the prior reason, by and at when a line leaves Waived. Assert it in `check_m3s3_waive_api.ts`.
* **M3. Nobody but the author in Edit can see that a line is waivable.** The drawer (`web/src/pages/workspace/documents.tsx`, "Who and when" section; screenshot a2) and the list do not show it. Review shows only "changed". The second and third person release a relaxation of a required document without seeing it. Fix: one "Waivable" row in the drawer's "Who and when" (breaker M3).
* **M4. No recorded rollback** (STANDARDS §5 [M]; the B137 M4 precedent). `prisma/migrations/20261111120000_m3s3_waivable_line/migration.sql` has none. A rollback must first move `waived` rows (for example back to `requested`, with their reason kept in the audit), then restore both checks and drop `waiver`. Say what is lost.
* **M5. The readiness rule is untested.** `api/src/readiness-inputs.ts:148`: removing `&& st !== "waived"` fails no suite, because no test reads prepare or readiness. Fix: in `check_m3s3_waive_api.ts`, assert the "not received" warning is present before the waiver and gone after it.

**Should (Minor)**
* **m1.** A client upload on a Waived line gets "… is Not applicable: request it again" (`api/src/case-checklist.ts:254`). A client cannot request.
* **m2.** The review checklist's "All required documents verified" counts Waived (and Not applicable) lines as required (`api/src/review-rounds.ts:88`). The same is true of Not applicable before this PR. Fix or add a follow-up row.
* **m3.** In the merge rule, `keep.waivable &&= drop.waivable` (`engine/runtime/case-checklist.ts:233`) lets a requirement that does not apply (`not_needed`) block the waiver. The C6.14 rule two lines below guards the same case for `shared`. It is conservative, so this is not unsafe.
* **m4.** "Copy a line from another combination" drops the waiver (`api/src/lines-bulk.ts:437`, BR-C2 list). `docSig` (`:49`) ignores it. State this in the PR.
* **m5.** The PR body is still the step-1 plan: "configured checkpoint marks P-171 (6)'s police line waivable" was not done. Breaker m2, m3, m5, m6 and m7 stand as Minors; I agree with them.

## Retrofit mapping
Team: `Document.status` has `Waived` (Doc 3 §AG-7, `agent/case:document-manage` "waive Binder documents"). Ours: `checklist_line.state = 'waived'` with `state_reason/by/at`; `document_requirement.waiver` has no team field named. Record it in the PR.

## Not checked
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); CI on the PR; the uncommitted 06:53 edits.

**Verdict: Block.** To fix, each with a test that fails before the fix, then a diff-only re-review of the new commit:
1. Major M1: `engine/runtime/case-checklist.ts:140`. The guard is switched by the waiver flag.
2. Major M2: `api/src/case-checklist.ts:185,192`. The waiver's reason is lost on take-back; the audit line has no reason.
3. Major M3: `web/src/pages/workspace/documents.tsx` (the drawer's "Who and when"). Waivable is invisible to the reviewer and approver.
4. Major M4: `prisma/migrations/20261111120000_m3s3_waivable_line/migration.sql`. No recorded rollback.
5. Major M5: `api/src/readiness-inputs.ts:148`. The readiness rule has no failing test.
6. Minors m1 to m5 above (and breaker m2, m3, m5, m6, m7): fix them, or list them in the PR.

## Re-review at f98ddd221 (diff only: `aeeb7ac55..f98ddd221`)
Commit `f98ddd22175e87cf76957b41a9476174c0031909`. Copy `rev_m3s3b` on :4435 (configured checkpoint, live AI off, US$0), stopped after. I ran `check_m3s3_waivable.ts` (17/17) and `check_m3s3_waive_api.ts 4435` (17/17, 124 s). I also checked the drawer as the approver in Playwright and the release review words through the API. The recorded rollback was run inside a transaction and rolled back.
* **M1 fixed.** The guard is the fee table's data mark again (`engine/runtime/case-checklist.ts:140`). A waiver can no longer switch derivation on or off. The pure test fails if the coupled guard returns: a waivable line on an unmarked combination stays "not derived", and a marked one with no waivable line stays derived. The departure from the row's "the guard narrows" is recorded, with a question for the tech lead, in `challenge.md` (P-188: not silent). I agree with the builder's recommendation. The guard is already data (P-230 (7)), it narrowed through C6.17 after P-425, and M3-S4 removes it. A separate "lines checked" setting would be a new row. **Whether the Done-when counts as met is the tech lead's call**, not a code finding.
* **M2 fixed.** The audit line carries `{to, reason}` and, when a line leaves a state that had a reason, `{from, from_reason, from_by, from_at}`. The summary ends with ": <reason>". The API test asserts both, including after Request again (`waived|reason|user-O`).
* **M3 fixed.** The drawer shows "Waivable · Yes: the case officer may waive it on a case, with a reason" to the approver (read only, screenshot r2-drawer-approver). Submitting a waiver change gives the label "Letter of acceptance (now waivable by the case officer, with a reason)". `validate.ts` names "no longer waivable" and, on an added line, "(waivable …)". There are pure pass and fail tests for both.
* **M4 fixed.** The rollback is recorded in the migration header: Waived → Not applicable (reason, who and when kept; the audit still names the waiver), then both checks restored and the column dropped. I ran it under `ON_ERROR_STOP` in one transaction on a database with a Waived row: no errors, and the row read `not_applicable | rollback probe`.
* **M5 fixed.** The API test reads Ready to file through the prepare view. After the waiver there is no "Passport … not received"; after Request again there is one. Removing `&& st !== "waived"` now fails the first assertion.
* **Minors.** m1 fixed: the upload refusal uses `STATE_WORDS` (`api/src/case-checklist.ts:258`). m4 fixed: a copied line keeps its waiver, and `docSig` adds the waiver only when set, so earlier batches' signatures and Undo are unchanged. The builder answers m2, m3, m5 and the breaker's Minors in `challenge.md`. I accept those answers: each is either the existing behaviour of Not applicable or errs on the safe side. They are fine as listed Minors (P-293).
* **New in this diff:** nothing found. The release snapshot is unchanged, because the diff labels are review words and not snapshot data.

**Left open (Minor, not blocking):** review m2 (the review-round count of required documents), m3 (merge with a requirement that does not apply), the breaker's m2, m3, m5, m6 and m7 (as answered in `challenge.md`), and the tech lead's answer on the row's "guard narrows".

**Verdict: Approve** (commit f98ddd22175e87cf76957b41a9476174c0031909: no open Blocker or Major).
