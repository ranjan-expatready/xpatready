# Review: C6.11 Firm, users and case team, on the configured checkpoint (runtime PR #1072, stand-in SI-9)

Reviewer: fresh agent, did not build it · 5 Nov 2026 · **commit e1801f98f** (diff from merge base ffcfb45c8).

Setup:
* Copy `rev611` on :4436 only; configured checkpoint loaded as `user-A` (83 s, US$0). Fresh `setup_visitor_visa.ts` copies for the API checks.
* Main baseline: a worktree of ffcfb45c8 on the same port and database name. All stopped and dropped at the end. Live AI off; no priced button.

Journey test (the one score for this check): `journey-test-reviewer-2026-11-05.md`, **7 / 10, fail** (error recovery 0).

## Builder's evidence, verified
| Claim | Result |
|---|---|
| C6.11 pack 25/25 on a fresh configured checkpoint | **Reproduced**: 25/25. |
| `check_c611_imm5476_browser.cjs` 15/15 at 1440 px | **Reproduced**: 15/15. |
| `check_c611_team_browser.cjs` 22/22 | Not re-run. |
| `check_c611_team` 67/67 and `check_vv_prepare_api` 40/40 | **Reproduced** on fresh copies. |
| "Neighbours show only fail→pass changes" | **Not true** for the suite `tests/check_b52_own_yes_no.ts`: main 52/52, this PR 49 passed and 9 failed (B1). |
| "Only vv.single IMM 5476 changes" | The form-line rules: yes. The filled output of IMM 5475 also changes (M2). |
| VV-R10 quotes | All three match `official-sources/ircc/web-pages/page-imm5476.html` ("Date modified 2025-12-12"). |
| `demo.ts` hot-file line | One line, approved by the tech lead on #1072. Pack check 15 needs it on the checkpoint. |

## Answers to the four questions
1. **"Uses a representative" from the case team.** Right in principle: B68 (P-340) asks for it, and C6.11-5 and -18 hold (exactly one representative of record per firm case). The 422 strands no one by itself, since a case without a firm cannot exist (`firm_key` defaults to the Sample firm). But it hides earlier stored answers (M1) and breaks QA-227's suite (B1).
2. **Firm-record answers replacing stored ones.** Readiness and the filler read state(), so they agree. Out of date (C9.2) compares box facts only; `case.uses_representative` fills no box, so it never shows there. Finished IMM 5476 and 5475 items will correctly go Out of date ("no answer" → the firm value). **Section confirm breaks** (M1), and the earlier answer disappears from the screen with no trace.
3. **The extra contact keys.** Correct for IMM 5476 (11-2021): the checkpoint map reads `person.address_*`, `person.email` and `person.phone_*` under `representative`. The same binding on IMM 5475 (05-2021) makes them fill the designated individual (M2).
4. **A passing and a failing test for each new rule.** Both exist for the licence part, the case-team Yes, the 422 and the e-mail check. Missing: a failing test for the new contact keys, any test of state() replacing a stored answer, and an IMM 5476 check for a dependent child of 18 or older (m2).

## Issues
**B1 (Blocker): a merge-queue suite goes red.**
* `tests/check_b52_own_yes_no.ts` runs in every merge-queue batch and is not quarantined (`run-suites.sh`). On the checkpoint it passes 52/52 on main and fails 9 checks at e1801f9.
* Causes: the new 422 (`api/src/runtime.ts:302`) refuses its PUT of `case.uses_representative` on 6 cases; the firm-record Yes (`runtime.ts:262-263`) makes "a case answering No lists neither" (`:147`, `:153`) list IMM 5476.
* It imports neither changed file, so a PR's direct suite selection probably skips it and the queue would fail.
* B68 changes QA-227's behaviour on purpose, so its suite changes in this PR (WAY-OF-WORKING: "When a decision changes behaviour, its pack changes in the same PR").
* **Fix:** in `caseFor` (`:135`), stop typing `case.uses_representative`; assert the firm-record Yes and the 422; keep the No branch for IMM 5475 only (`case.authorizes_release_to_designated_individual`). Re-run it on the checkpoint.

**M1 (Major): Confirm section is a dead end when an earlier answer is hidden.**
* State() drops a stored `case.uses_representative` (`runtime.ts:263`). `confirmSection` still counts that row as current (`:436`, since `listed` at `:429` contains the fact). The screen never sends its id (`questionnaire.tsx:681` leaves firm-record answers out of `seen`), so a DECLARED row is always "unseen" (`:444`).
* Reproduced: a seeded DECLARED `false` (as any case answered since #967 would hold). Confirming "Personal details" for the application gives 409 `changed: ["case.uses_representative"]`, twice. The toast says "Review them and confirm again" while the screen shows "Yes · From the firm record", and PUT gives 422, so the officer cannot get out.
* **Fix:** in `confirmSection`, leave out of `current` any (subject, fact) the firm record gives (reuse the `firmGives` set). Add a passing and a failing test with a stored earlier answer. Say in the PR what happens to such answers on the demo's existing cases (I could not read :4400).

**M2 (Major): IMM 5475's designated individual is now filled with the representative of record.**
* On the checkpoint, the IMM 5475 (05-2021) map binds its designated-individual boxes to `person=representative` (psql on `form_field_map`).
* On main, only the family and given names came from the firm record. At e1801f9 the office address (7 boxes), e-mail and phone (2) fill IMM 5475 too, locked. The Agent view says "fills IMM 5475 for 3 people", and IMM 5475's prepare items carry `representative` (`case-prepare.ts:315-321`).
* IRCC's page (`page-imm5475.html`) says the form is for "someone who will not act as your representative". The PR and `qa/built/C6.11.md` do not mention the change.
* **Fix**, either: keep the new firm-record keys off IMM 5475 (only forms whose line is the representative's form get them); or record a tech-lead ruling on the PR that accepts it as Sample, with a forms-lane row to rebind IMM 5475's designated individual. In both cases name it in the PR and the qa/built note.

**m1 (Minor): the wording does not point to the real place.** "Uses a representative" shows "Change it in the firm record" (`questionnaire.tsx:718`), while the 422 says "Change the team, not the answer". The firm record has no screen (SI-9), and the client gets the same 422 but cannot change the team. **Fix:** point to the Case team dialog for this row, and give the client words that need no action from them.

**m2 (Minor): test gaps.** No failing test for the new `person.address_*`, `person.email` and `person.phone_*` keys (a firm without them gives none). No IMM 5476 check for a dependent child of 18 or older: the resolver is tested (`check_qa221_who_age.ts`, `check_sh3_resolver.ts`), but this rule's child branch is not.

Seen, not counted (pre-existing on main): IMM 5476 still says "Waiting for 15 facts" on the checkpoint. 7 of them are required representative facts nobody can type (404 "That person is not on this case"): licensing province, fax ×2, supervising lawyer ×2, uncompensated ×2. C6.11 stays Partial because of it; a question for the lead or the forms lane, not this PR.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | VV-R10, B68 and BR-20 built and cited; the 5475 side effect is not (M2). |
| D2 Data integrity | 3 | Nothing stored for firm facts; a hidden earlier answer blocks confirm (M1). |
| D3 Reuse | 4 | One firm record feeds every key; two key namings kept on purpose. |
| D4 Rule integrity | 3 | IMM 5476's who and age rules resolve; QA-227's No branch gone without its test (B1). |
| D5 Stability and recovery | 2 | The 409 loop in M1. |
| D6 Freshness and governance | 4 | Cited with the page date; hot file approved. |
| D7 AI trust | n/a | No AI step. |
| D8 Orientation | 4 | Tabs name the person; "for the representative". |
| D9 Flow | 3 | The firm record is named with no screen behind it (m1). |
| D10 Language | 3 | m1. |
| D11 Feedback and state | 3 | Misleading 409 toast (M1). |
| D12 Visual quality | 5 | Clean pill and layout. |
| D13 Accessibility and responsive | 5 | axe finds nothing at 400, 1024, 1440 px and 200 %; keyboard opens the dialog. |
| D14 Team look | 5 | Team components; demo chrome apart. |
| D15 Speed | 5 | 533 ms to the Agent view. |
| D16 Testability | 2 | B1, m2. |
| D17 First use | simulated only | |
| D18 Provenance | 5 | Source and channel on each line; quotes verified. |
| D19 End-to-end closure | 3 | IMM 5476 still cannot reach ready (pre-existing). |
| D20 Pain solved | simulated only | |

Graph (P-86): no G1–G5 gap touches C6.11's routes or pages.

Not checked: the demo's own cases (:4400); `check_c611_team_browser.cjs` and the neighbouring acceptance packs against main; a screen reader.

**Verdict: Block** (for commit e1801f98f). Fix, then ask for review again:
1. **B1**: update `tests/check_b52_own_yes_no.ts` for B68 and show it green on the checkpoint.
2. **M1**: Confirm section ignores stored answers the firm record replaces, with pass and fail tests.
3. **M2**: keep the firm-record contact off IMM 5475, or record a tech-lead ruling and a forms-lane row on the PR.

## Round 2 (diff-only): code at b1872f158, head e0993dc76
I read `git diff e1801f98f..b1872f158`. e0993dc76 adds only the breaker's notes (`break-report.md`) and no code. Fresh copy `rev611` on :4436 with the configured checkpoint (load 87 s, US$0). It was stopped at the end: database dropped, port free.

| Round 1 | Status | Evidence at b1872f158 |
|---|---|---|
| B1 b52 suite red | **Closed** | `check_b52_own_yes_no.ts` gives **53/53** on the checkpoint (was 49 pass, 9 fail). It now asserts the 422 and keeps IMM 5475's No branch. |
| M1 Confirm 409 loop | **Closed** | `confirmSection` leaves out of `current` the facts the firm record gives for that subject (`runtime.ts`, `firmGives` from state()). `check_c611_checkpoint.ts`: a stored pre-#1072 "No" gives Confirm **201**, and the row stays `DECLARED:none` (not confirmed, not changed). It would have failed at e1801f9, where I reproduced the 409. |
| M2 IMM 5475 designated individual | **Closed** (tech lead's ruling, comment 6652182464, applied as reported in 6652299900) | `representativeContact` no longer gives `person.address_*`, `person.email` or `person.phone_*`. On a checkpoint case the firm record fills only `representative.membership_id`, `licensing_body` and `organization_name` (IMM 5476), plus the family and given names (IMM 5475 and 5476, as on main). A fail test is in `check_c611_team` and `check_c611_checkpoint`. Prepare tags only forms that read `representative.*` (IMM 5476 yes, IMM 5475 no, with a fail test). |
| m1 wording | **Closed** | The line says "Set by the case team (the representative of record)" (walk). A client gets 403 "Your case team sets…", staff get 422 naming Case team. The guard now needs a current LEAD_REPRESENTATIVE, which matches what state() gives. |
| m2 test gaps | **Closed** | A child of 19 gets IMM 5476 and a child of 17 does not (`check_c611_checkpoint`). `licensingBodyKey` has pass and fail tests. The contact-key test now asserts their absence (ruling). |

Re-run by me at b1872f158:
* C6.11 pack **25/25** and `check_c611_checkpoint` **11/11**, on a fresh configured checkpoint.
* `check_c611_imm5476_browser.cjs` **14/14** (the e-mail line was removed with the keys) and `check_c611_team_browser.cjs` **22/22**.
* `check_c611_team` **70/70** and `check_vv_prepare_api` **40/40**, each on a fresh `setup_visitor_visa` copy.
* `check_b52_own_yes_no` **53/53**.

No new findings in the diff. For the tech lead, not blocking this PR:
* On the checkpoint, IMM 5476's office block stays unfilled and cannot be answered, as on main. So do the seven representative facts and the four membership boxes. C6.11 stays Partial until the forms-lane row (IMM 5475's designated individual as its own person) and B107 land.
* Neither row is in `BACKLOG.md` on main or on this branch yet.
* A stored pre-#1072 answer stays in the database unread, with no trace on screen. That is acceptable: the history is kept and nothing is confirmed unseen.

Journey score, re-scored on the round-1 journeys at b1872f158: **9 / 10, pass** (no criterion at 0).
* Journey 4 now completes, so error recovery and feedback rise to 1.
* Journey 7 now matches main, so correct data rises to 1.
* "Next step" stays ½: IMM 5476 still waits on facts nobody can enter (the pre-existing gap above).
* "Plain words" stays ½: the other firm-record lines still say "Change it in the firm record", and that has no screen (SI-9).

**Verdict: Approve**, for code commit **b1872f158** and head **e0993dc76** (notes only on top). No Blocker or Major is open.
