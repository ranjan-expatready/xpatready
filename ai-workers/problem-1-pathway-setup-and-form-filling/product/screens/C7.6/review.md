# Review: C7.6 Ready to file (L-SA3, P-315), PR #861, commit 0159564

Reviewer: a fresh agent that did not build it. 4 Nov 2026. Scope: `git diff origin/main...0159564` (11 files): API, rules, schema. There is no screen, so the visual checks are skipped.
Read word for word: P-315, P-237, P-238, P-144, P-151, P-155, P-168, P-172. Also read: r5c BR-9, BR-11, BR-19, BR-21; AG07-D24/D25 (the team's DEV-HANDOVER line 228: the Case Officer holds `waive-deficiency`, so the claim holds); M3-CONTRACT C7.6 row; STANDARDS §4–§7, §9.
Ran on my own copy, :4450 / `xr_studio_rev`, server started 07:22:48 before any local edits, so every result below is for 0159564. US$0, live AI off. Copy stopped at the end.
Note: during the review, someone else's session changed 7 tracked files in this clone and added `build-notes.md` and `break-report.md`. Those local changes are not reviewed here.

## Verdict: Rework (Block)
The rules are right and faithful to P-315. The pack rework is honest and tight. But this commit makes the shared prepare view crash on a common case state (it breaks C7.3-13). Two Majors also give wrong results on the P-144 and P-151 rules.

## Exit codes
* `setup_visitor_visa`: 0 (13/13).
* `setup_vv_m3`: 1 (44/46). The failures are S2w (release check) and S7a (`PUT /api/library/fees` 404), both outside this PR's files.
* **C7.6: 0 (25/25)** · **C8.1: 0 (14/14)** · C8.2: 1 (1/12: `PATCH /runtime/groups/:gid/record` is not built, which is C8.2's own row).
* **`check_c76_readiness`: 0 (69/69)** · C6.12: 0 (24/24) · C7.7: 0 (26/26) · C11.6: 0 (14/14).
* **C7.3: 1 (12/13; C7.3-13, Blocker B1)**. qa recorded C7.3-13 green on main (`qa/reports/2026-11-02-vv-m3-round2.md:22`).
* C7.5: 1 (9/16). The failures need C7.5's plan route and saved AI review, not this PR.
* `graph.mjs --check`: 0.
* Mutation spot checks on the engine: 4/4 caught. Barcode made passable: 3 checks fail. Missing-facts key without its facts: 1 fails. No CRITICAL severity: 22 fail. Review rule removed: 6 fail.

## Issues, ranked
**B1 Blocker (Must): `GET /runtime/cases/:id/prepare` answers 500 once an Online section goes out of date after it was entered.**
* `api/src/readiness-inputs.ts:64`: `f.signers.map` runs on `undefined`.
* `api/src/case-prepare.ts:213-214`: the early `out_of_date` return carries no `signers` and no `steps`.
* `case-prepare.ts:242`: the cast `as unknown as PreparedForm[]` hides the gap from the type check.
* Failing scenario: C7.3-13. Tick "Entered in the portal" on IMM 5707 Section A, change the family name, confirm. GET /prepare then answers 500 (`TypeError … readiness-inputs.ts:64:33` in the API log).
* Impact: `review`, `warnings/:code/pass` and `ready` all call `prepare.view`, so all three answer 500 on that case. So does the Prepare application screen. The `entered_out_of_date` input this PR wires is never reached through the API.
* Fix: return `signers` and `steps` on that branch, or read `f.signers ?? []`. Drop the `as unknown` cast so tsc catches the next gap. Add a C7.6 step for an Online line with a stale entered section.

**M1 Major (Must): "Ready to file" never comes back off, so the one hard stop (P-144, P-237) is bypassed after it.**
* `case-prepare.ts:246-248` shows the stored status whatever readiness says.
* `api/src/readiness.ts:313` sets READY_TO_FILE one way; nothing reverts it.
* Failing scenario (probe, live):
  1. The filing reaches Ready to file.
  2. The officer corrects the family name (on the client's behalf, with a reason).
  3. `/prepare` now shows `status: "ready_to_file"` beside `ready: false`, `blocks: [barcode_not_validated]`.
  4. `POST /runtime/items/<IMM 5476>/sign-steps/uploaded_to_ircc` answers **200**, because C8.1's gate (`sign-steps.ts:73`) reads the stored status.
* A second `/ready` correctly answers 409. BR-11 refuses Record on BR-9's blocks at record time, so Ready to file was never a one-time gate.
* Fix inside C7.6: when a READY_TO_FILE filing's readiness has a block or an unpassed warning, set the status back with a conditional update and an audit line ("Ready to file withdrawn: codes"). Then C8.1 and C8.2 gates hold unchanged. Add a pack step: after Ready, a fact change gives status not `ready_to_file` and "Uploaded to IRCC" 409.

**M2 Major (Must): the edition check reads the oldest PDF edition, not the one the case fills (P-151 (1)).**
* `case-prepare.ts:239` uses `maps.find(...)`. `engine/programs.ts:146-153` says a snapshot carries every mapped PDF edition oldest first, and that "a reader that takes the first" gets the oldest. The fill uses `pdfMapInUse` (`fill-case.ts:96`).
* The comment at `case-prepare.ts:236-237` says "as the fill picks it", which is not true.
* Failing scenario (by code; the Visitor visa seed has one edition per form, so the pack never reaches it):
  * The release carries IMM 5707 (01-2023) plus a newer edition, and 01-2023 is past its accepted-until date.
  * The filing is filled on the newer edition, yet it gets a CRITICAL "edition IMM 5707 (01-2023) was accepted by IRCC until …".
  * Before that date it shows a false "Adopt update".
* Fix: `pdfMapInUse(maps, form)?.form_edition`, plus a two-edition check.

**Minors (Should)**
* m1: a repeated `/ready` on a filing that is already ready answers 200 and writes another audit line (`readiness.ts:313` matches status READY_TO_FILE). I saw 3 `ready_to_file` lines on one filing. Make it a no-op without an audit line, or 409.
* m2: `acceptance/M3-CONTRACT.md:31` still lists `missing_facts … edition_expired` as block codes. Per the contract header, a change to what a rule expects goes to the tech lead. Ask for the row to be updated to P-315 (one block; CRITICAL codes; `severity`; `passed[]`).
* m3: one field, filing `status`, mixes `NOT_STARTED` (derived) and `ready_to_file` (stored). `contracts/runtime.ts:240` types it as `"NOT_STARTED"`, and `case-prepare.ts:170`'s `as string` hides that. Pick one form and update the type.
* m4: pass keys.
  * (a) Partly fixing passed missing facts reopens the line: {a,b} passed, then b answered, leaves an open line for "a" that needs a new pass. This fails closed, but it is a nuisance; consider treating a subset of a passed set as covered.
  * (b) `fact_problem` is keyed by the fact only. A pass written for 1990-13-45 still covers 1990-02-31 (probe), but BR-19 says a waiver "reopens when its fact changes". Key it on the answer.
* m5: the new route bodies are checked by hand, with no zod schema in `contracts/` (STANDARDS §6). None of the writes carries a version (contract convention). Ready is still race-safe: two concurrent calls gave one 200 and one 409.
* m6: an edition counts as superseded only when an author has set an accepted-until date (`readiness-inputs.ts:67`). A newer edition with no date gives no "Adopt update", although P-151 (1) says "no longer current" warns. Derive it from a newer edition, or list it under "Not here".

## What held
* **Rules:** only `barcode_not_validated` blocks. The seven former blocks are CRITICAL, with words starting "CRITICAL:". The property check enforces this.
* **The barcode block is refused three ways:** by the route (409), by the engine (`cannotPass`) and by the database (`readiness_pass_code_check`).
* **Pass scope:** a pass stores the keys it covered, so a pass for two facts never covers a third (pure check and pack 22).
* **Roles:** author, reviewer, approver and client get 403 on pass, ready and review. Another firm gets 404. A case officer cannot review (403). An officer setting accepted-until gets 403. A bad date or a missing reason gets 400. Invisible-character reasons get 400.
* **Data:** append-only triggers refuse UPDATE (tried). The migration is additive and records its rollback.
* **Queries:** a constant number per view (5), with no request per row. `/prepare` takes 0.14–0.19 s; `/ready` takes 0.16 s.
* **Pack rework is faithful:** steps 2, 4, 7, 8, 12, 14 and 20 move exactly P-315's codes, and step 12 is stricter than before. Steps 6b and 22 add the hard stop. No assertion is loosened beyond P-315.
* **"Not built" list is honest and acceptable:** open checks, fee dates, out-of-date signed items, P-172. No input source exists yet, and P-315 (2) keeps P-172 for Express Entry, which is not on the M3 path.
* **The representative's review is passable by staff:** this follows P-237 (4) and AG07-D24. The PR's question to the founder is right.
* **Online edition fallback:** reasonable, once M2's fix applies to it too.

## D1–D20 (1–5; API only)
D1 4: P-315 rules exact; M1 breaks P-144's hold after Ready · D2 2: status drift (M1), wrong edition (M2), duplicate audit (m1) · D3 3: contract type and M3-CONTRACT row stale (m2, m3) · D4 4 · D5 1: the view crashes (B1) · D6 4: who, when, reason; licence on the review · D7 n/a.
D8–D14 n/a (no screen) · D15 5 · D16 4: rules mutation-tested; the API path through Online lines untested (B1) · D17, D20 simulated only · D18 4: passes and reviews show their origin · D19 2: Ready leads to "Uploaded to IRCC" with the block back (M1).

## Journey test (reviewer, API-level; the one score for this check)
**Journeys:** J1 main path, officer prepares, representative reviews, officer passes, Ready (held) · J2 solo representative, Self-reviewed (held) · J3 CRITICAL missing facts passed, barcode still blocks (held) · J4 no reason or barcode pass refused (held) · J5 wrong role or firm refused (held).
J6 double click on Ready: one 200, one 409 (held); a third call 200 with a duplicate audit line (m1) · J7 boundary to C8.1: a fact changes after Ready, status stays, upload tick works (failed, M1) · J8 Online line with a stale entered section (failed, B1) · J9 accepted-until by the author (held).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | J1 passes (C7.6-19), but J8 cannot open the view. |
| Next step obvious | 1 | The 409 names every block and warning, who owes it and how it clears. |
| Plain words | 1 | Words, never keys (`cannotPass`); "CRITICAL: IMM 5257 for …". |
| Feedback and state | 0 | `ready_to_file` is shown beside `ready: false` with a block (M1). |
| Correct data | ½ | Passes, reviews and audit are right, but the edition is wrong (M2) and an audit line is duplicated (m1). |
| Error recovery | 0 | A 500 on the view and on all three routes for that case (B1). |
| Accessibility and sizes | ½ | No UI; held at ½. |
| Speed | 1 | 0.14–0.19 s, constant queries. |
| Visual quality | ½ | No UI; held at ½. |
| Trust and sources | 1 | Who, when, reason, severity, licence. |
| **Total** | **6 / 10, fail** | Two criteria score 0. |

Fixes that would raise it, most valuable first: B1, then M1, then M2 and m1.
Not tested: a real browser or screen reader (no screen); an intended user's unaided walk (D17/D20 stay with the founder); C7.3-13 on main by my own run (I relied on qa's record and the stack trace in the new code).

**Verdict: Block**. Fix B1, M1 and M2 before approval. The Minors may follow as rows.
