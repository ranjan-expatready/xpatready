# R1 thin slice: R1d fill and never overwrite, review (CHECK) · independent reviewer, 24 Oct 2026

Commit `8aa197f` on `claude/runtime-r1-8f1db8`. I did not build this. I read concept items 3–5, plan §3 M5, §8 RT-13…RT-17 and §9 R1d, P-45/63/65/71/72, build-notes-r1d and the code. I walked it on :4430 (headless Chrome, clicking and typing as a person) and read the database after each step. Case `REV-R1D-01` was made for this review. Screenshots are in `screenshots/review-r1d/`.

## Verdict: Ship after fixes (go to FIX). Journey score 7/10, so the journey does not pass yet (pass is 8+ with no 0)
The core promise holds. Copies hold confirmed facts only, go through the shared writer and are read back. A locked copy goes stale and its bytes never change (sha256 on disk and in the row, before and after). An unlocked copy goes out of date, and a new copy is made only on request. Roles, idempotency and the lock race hold on the server. axe finds 0 violations in every state. Nothing scrolls sideways at 400 px, 1024 px or 200 % zoom. Five Majors block a ship: one gap in the fill-trial gate, one test gap and three UX gaps on the main path.

## Journeys walked (officer `user-O`, 1440 px unless stated)
1. **Open a case, add a spouse** (UI dialogs). The Forms panel shows IMM 5257 and IMM 5707 for each person, with "N facts to confirm before filing" and "writes 0 of 161 form fields".
2. **Answer and confirm.** I entered family name, given names and passport number in the agent view and pressed Confirm section twice. I left the spouse's family name `UNCONFSPOUSE` unconfirmed. The draft then read "writes 3 of 161 …; 1 answered but not confirmed stay blank".
3. **Generate for the principal and the spouse.** "Generating…" appears within 0.2 s, and "Generated · read back and checked" after about 1.6 s (01, 02).
4. **Download and open.** The principal copy's XFA data holds `REVIEWER`, `PRINCIPA` and `RVP12345`. The spouse copy holds the principal's names in its spouse section. `UNCONFSPOUSE` is in neither copy. The download's sha256 equals the row's.
5. **Lock before ready.** Both lock buttons are disabled with "Not yet: 38 facts to confirm before filing …", and the API gives 409 with the same words. Client A, Client B and the author get 403.
   * I then made the form ready with a scripted pass of answers and confirmations. This is a shortcut through the agent view's own endpoints, as in `check_runtime_r1d.ts`.
   * The old copy showed "Out of date" (03). I generated a new copy, pressed Filed, confirmed in the page and locked it, by keyboard (04, 05).
6. **Change a confirmed fact** (family name to `REVIEWERX`, section confirmed again).
   * The locked copy shows "Stale · Filed … the locked file is kept as it was. Changed: Family name …". Its file hash, modified time and row did not change.
   * The spouse's unlocked copy shows "Out of date" with the same fact (06). No copy was made on its own.
7. **Generate again.** The new copy holds `REVIEWERX`, and the stale filed copy stays in view with `REVIEWER` (07).
8. **Break pass.** Lock while queued: 409; download while queued: 404. Two simultaneous locks: 201 and 409. A double click on Generate makes 1 copy. A person from another case: 404. A bad idempotency key: 400 as Problem Details. No values in the audit or `api.log`.

## Findings
**Major 1. A form whose fill trial has not passed can be "Ready to file" and "Filed"** (P-65; plan RT-14/M6; concept item 4).
* Neither readiness (`engine/runtime/forms.ts:48`) nor `lock` (`api/src/fill-case.ts:182-185`) checks the form's trial.
* IMM 5707's lane log (`lanes/evidence.md:19-20`) records no pass, yet it returned `ready: true` and `lock {filed}` → 201 (08-forms-400).
* Fix: keep each form's trial status as data from the evidence lane. Until it passes, show "Checked copy, not for filing (fill trial pending)" and refuse the lock. Or the Lead records that 5707 passed; forms added later must still not start out ready.

**Major 2. "An unconfirmed fact blocks ready to file" has no test that fails when the rule is removed** (STANDARDS §6 [M]; P-71 with P-72).
* In a scratch copy, readiness counted an answered but unconfirmed fact as done (`!r.answer` / `!q.answer` in `forms.ts:50`). `check_case_engine.ts` still passed 36/36.
* Every not-ready case in `check_runtime_r1d.ts:78-82` and `check_runtime_r1c.cjs:275` is not ready because facts are unanswered, so those suites cannot catch it either.
* Fix: add a case where every required fact is answered and one is unconfirmed (for example the spouse's marital status answered by the principal, P-78).

**Major 3. The "needs work" state does not say exactly what is missing** (EXPERIENCE §4 [M]; §2.10, §2.12).
* The facts that block filing appear only in the `title` of a `<span>` that cannot take focus, and only the first 12 (`web/src/runtime/forms.tsx:76`). Keyboard and touch users cannot read them, and nothing links to the facts.
* "12 by hand" on a copy (07) names no form field and gives no reason on any screen; the reasons are only in `result_json`.
* Fix: an expandable list on the row of the missing facts, each linked to its question in the agent view, and the by-hand form fields with their reasons.

**Major 4. The draft count does not match what the copy writes** (EXPERIENCE §2.7 [M]).
* The draft says "A copy made now writes 67 of 161 form fields". The copy made seconds later wrote 43, with 12 by hand and 12 blank (07; `result_json.counts`).
* `draft.written_now` counts confirmed facts (`fill-case.ts:69`), not form fields written.
* Fix: word it as what it counts ("67 have a confirmed answer"), or count what the copy will write.

**Major 5. Keyboard focus is lost when locking** (EXPERIENCE §2.12 [M]; WCAG 2.4.3).
* After Enter on "Filed" or "Validated copy uploaded back", and after Lock or Cancel, focus goes to `<body>`. A keyboard user tabs again from the top of a long page.
* Fix: focus the Lock button in the confirmation, then return focus to the copy.

Minor:
1. "Changed:" calls newly confirmed facts "changed" and prints all 38 in one paragraph (03). Summarise it as `fillsText` does, and say "added or changed".
2. Wording:
   * "1 answered but not confirmed stay blank" should be "stays".
   * "N facts to confirm" also counts unanswered facts ("to answer or confirm").
   * IMM 5707 step: "signs "Signature:" and "Signature:" and "Signature:"" (08-forms-400; forms lane `personSteps`).
3. A required repeating group with no rows never blocks ready to file (`forms.ts:50`, the same rule as `case.ts:227`). Whether IMM 5257 needs at least one employment or visit-contact row is a question for the immigration expert.
4. The triggers guard UPDATE only. A DELETE of a locked copy or its snapshot is not refused (P-65 d).
5. Lock race: readiness and up-to-date are checked before `updateMany`, whose WHERE does not cover the facts (`fill-case.ts:178-186`).
6. Background work partly meets STANDARDS §4: no retry, backoff or cancel, and restart recovery is untested (known gap 1). The adapter is noted.
7. Graph G3 reports `GET /runtime/form-copies/:id/file` as untested, but `check_runtime_r1d.ts:65` reaches it through its `bytes` helper.

## [M] lines that apply
* **Met:**
  * STANDARDS §3.7 (copies use the pinned release); §4 concurrency and idempotent launches.
  * §5: expand-only migration with rollback; one list per case; no values in the audit or the log.
  * §6 contracts, RFC 9457 with field errors; §7 deny by default (403 for client, other client and author; 401 with no actor; 404 for malformed ids); §9 budgets (panel 250–280 ms, generation 1.6 s).
  * EXPERIENCE §1 status by shape and text; §2.5 one next action; §2.8 in-page confirmation; §2.9 generating never blocked; §5 "form field" on screen.
  * §4 states: empty, loading, running, error, conflict.
* **Partly met:** STANDARDS §3.4 (DELETE not guarded); §4 background worker (Minor 6); EXPERIENCE §2.10 (the missing-facts tooltip is the only source); §2.12 (axe and widths OK, focus lost).
* **Not met:** STANDARDS §3.10/§6, a rule's test fails when the rule is removed (Major 2); EXPERIENCE §2.7 counts (Major 4); §4 needs-work state (Major 3).
* **Retrofit:** `FormInstance` and `AnswerSnapshot` use team names; the in-process queue maps to the team's Redis worker (build notes). **S-11** is verbatim (diff `12e7207..8aa197f`). **S-12** adds 2 lines.

## D1–D20
D1 3: RT-14 gate missing (Major 1) · D2 4: triggers, CHECKs, idempotency, lock race; DELETE not guarded · D3 5: one writer for preview and case · D4 4: release flags drive readiness; empty groups open · D5 4: double press makes one copy; restart untested · D6 4: audit queued, generated and locked, with no values · D7 n/a (no AI) · D8 4: "form for person" rows on the case page · D9 3: Major 3 · D10 3: Minors 1–2 · D11 4: running, generated, out of date and stale, each with named facts · D12 4: team look, heavy "Changed:" paragraph · D13 3: axe 0 and widths OK, Majors 3 and 5 · D14 4: team names, worker adapter · D15 5: 0.25 s and 1.6 s · D16 3: Major 2 · D17 simulated only · D18 3: changed facts named, by-hand form fields not · D19 4: case → confirmed facts → checked PDF → lock → stale · D20 simulated only.

## Journey score (journey-test, reviewer role)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All 7 steps done (02–07) |
| Next step obvious | ½ | Blocking facts and by-hand form fields not named (Major 3) |
| Plain words | ½ | Minors 1–2 |
| Feedback and state | 1 | 01, 05, 06 |
| Correct data | ½ | PDFs exact and stale bytes unchanged; draft count wrong (Major 4); 5707 can be filed (Major 1) |
| Error recovery | 1 | 409s with reasons, refused when out of date, one copy per press |
| Accessibility and screen sizes | ½ | axe 0; 400, 1024, 200 % OK; focus lost (Major 5) |
| Speed | 1 | 0.25 s and 1.6 s |
| Visual quality | ½ | 03 wall of text |
| Trust and sources | ½ | Ready to file with no fill trial; by-hand form fields not named |
| **Total** | **7 / 10** | Fails. Majors 1, 3 and 4 raise trust, next step and correct data |

## Could not check
* Restart recovery: the shared app could not be restarted.
* Adobe Validate on these copies.
* The forms-lane suites for S-11: I verified the move by diff instead.
* A real screen reader.
* D17 and D20, which need an intended user.

Data I left on :4430: cases `REV-R1D-01` and `REV-R1D-OTHER-*`. One IMM 5257 copy and one IMM 5707 copy are locked as Filed.
