# Review: C6.11 Firm, users and case team (M3-11, BR-20, SI-9 / SI-15)

Reviewer: fresh agent, did not build it · 1 Nov 2026.

**Round 2 at f3a04f73** (diff from a9b54597; round 1 was a9b54597 and ended in Block, kept in git history).

Setup:
* Isolated copy `rev_c611` on :4435, migration `20261101130000_c611_case_team`.
* Visitor visa released with `setup_visitor_visa.ts` (13/13). The copy was stopped after the review.
* US$0, no AI calls.

Bar:
* `screens/M3-agent-view/concept-draft.md` §11 BR-20, §6 tests and the §8 M3-11 row.
* Board `design/draft-agent-view.html` frames 1 and 2.
* `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md` and `STAND-INS.md` SI-9.
* `break-report.md` (breaker, a9b54597).

Journey test (the one score for this check): `journey-test-reviewer-2026-11-01.md`, **9.5 / 10, pass**.

## Verdict: Approve (for commit f3a04f73)
No Blocker or Major is open. One action belongs to the Lead and does not block this commit: see "Lead action".

## Round 1 findings: how each was closed, with evidence
| Round 1 finding | Status | Evidence at f3a04f73 |
|---|---|---|
| Major 1: the activity feed leaked across firms | **Fixed** | Firm staff get configuration lines plus their own firm's case lines (`studio.ts` `activity`, `main.ts` firm key; review-duty people still see all). Every case audit entity written in `runtime.ts`, `fill-case.ts` and `team.ts` (case, person, case fact, row, group, section, form copy) is in `CASE_ENTITIES`, and lines that match no case are dropped (fails closed). My walk as user-S: 0 Sample firm lines (round 1: 3). Pass and fail checks are in `check_c611_team.ts`. |
| Major 2: no browser journey or axe for the team states | **Fixed** | `check_c611_team_browser.cjs` passed 22/22 **twice** on my copy: axe on 5 states, 1440 and 1024 px, officer read-only, solo isolation, no page errors. |
| Breaker M2 and M3: reference and idempotency key shared across firms | **Fixed** | The migration swaps the unique indexes to (workspace, firm, …), so no existing pair can collide, because every existing case belongs to the Sample firm. The replay is scoped to the firm. Checks: another firm may reuse a reference (201), the same firm may not (409), and the same key in two firms opens two cases. |
| Minor 3: raw ids in audit and history | **Fixed** | Names are written in summaries and history ("by Representative (Sample)"). A check asserts no ids. |
| Minor 4: reference uniqueness revealed other firms' cases | **Fixed** | Same fix as breaker M2. |
| Minor 5: focus not returned after Escape or Close | **Open, listed in the PR** | Still lands on `<body>` (my walk). The cause is the shared conditionally mounted `Dialog`; "Open a case" behaves the same. The fix belongs to the shared component, so it is not a blocker here. |
| Minor 6: last case officer taken off silently | **Fixed** | An in-place warning shows: "This is the case's last case officer: the case has none until you assign another." (screenshot `20-last-officer-1024`) |
| Minor 7: user-T not recorded beyond `firms.json` | **Accepted as recorded** | Recorded in the `firms.json` note, and the coordinator says it is in the PR. The Lead still updates the SI-9 row in `STAND-INS.md` ("two users" → three). |
| Minor 8: no check that `endOfficer` needs firm admin | **Fixed** | user-T taking someone off → 403, checked. |
| Minor 9: copy and consistency | **Partly** | Fixed: "p.m.." and errors now show under their own field (`repUser` / `addUser`). Open and listed in the PR: 400 vs 422, Stand-in words written twice, and hard-coded staff lists in the web. |

Also fixed from the break report:
* **m1:** a reason must contain letters or digits, so a reason of only accents is refused, with a check.
* **m2:** the reason fields are an Input, not a Textarea.
* **m4:** `expectedRepresentative` refuses a change made from a stale view with 409 (checked); the web sends what it showed.
* **m9:** history order is stable.

## Open items (none blocks)
* **Lead action: CI does not run C6.11's suites.** Commit 9ad6db2e removed the runner change from `run-suites.sh` and `select-suites.mjs` (the tech lead's files; proposed on the PR). As a result neither `check_c611_team.ts` nor `check_c611_team_browser.cjs` runs in CI: CI being green says nothing about BR-20. I ran both on this commit myself (57/57; 22/22 twice), so this approval rests on that. The Lead should add both suites to the runtime group (after R1d, before R1a's `--reset`) so a later change cannot break BR-20 unseen.
* **Minor (open, in the PR):** focus return on close (shared Dialog); 400 vs 422 field errors; Stand-in words in both `firms.ts` and `team.tsx`; hard-coded `PEOPLE`, `STAFF` and `WHO` lists in the web.
* **Breaker m7 (the opener picks the team when opening a case): not a finding.** Board frame 1 shows the representative and case officer chosen inside "Open a case". Only the changes afterwards are the firm admin's.
* **Breaker m8 (no SI-15 chip): Minor, not a blocker.** Frames 1 and 2 carry SI-9 only, and `check_stand_ins.ts` keeps SI-15 on its "not on screen yet" list. The case-shell page adds it later.
* **Note:** `qa/built/C6.11.md` now records the capability as built and awaiting qa (P-221).
* **Note:** the activity filter reads `limit × 5` rows and then filters. That is fine for Sample data; a firm column on the audit line would be the scalable form (the team's).

## Judgement on the builder's deliberate choices (unchanged)
* **Third user (user-T):** accepted. The concept's own BR-20 test, changing the representative, needs a second licensed person.
* **IMM 5476 filling not wired:** accepted. The facts and the change flag are built.
* **Last case officer may be removed:** accepted, now with a warning.
* **Client case reads carry no team:** accepted (P-129), and checked.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Every BR-20 element and both §6 tests are built, and isolation now holds on every read I tried. IMM 5476 filling waits for the release. |
| D2 Data integrity | 5 | Partial unique indexes, CHECK constraints, a row lock, the stale-view guard, and uniqueness scoped to the firm. |
| D3 Reuse | 4 | Firms come from one seed file and the library's IMM 5476 keys are used. The web keeps a second copy of the actor lists. |
| D4 Rule integrity | 4 | Opening defaults agree between web and server; the solo default is right. |
| D5 Stability and recovery | 5 | Reload, races (201/409), stale tabs (409) and legacy cases all recover. |
| D6 Governance | 5 | History and audit say who, when and why, with names. |
| D7 AI trust | n/a | No AI. |
| D8 Orientation | 4 | Breadcrumb, with the chip under the title. |
| D9 Flow | 4 | One "Case team" action, prefilled choices, and a warning before the last officer goes. |
| D10 Language | 4 | Words follow PRODUCT.md §4 and names replace ids. The solo chip repeats the name (as the board does). |
| D11 Feedback and state | 4 | Toasts, the IMM 5476 notice, and errors on their own fields. |
| D12 Visual quality | 4 | Team components; the chip matches frame 2. |
| D13 Accessibility | 4 | axe clean (mine and CI's script), keyboard path, 1024 px and 200 % zoom. Focus is not returned on close. |
| D14 Team look | 4 | Shared Dialog, Field, Pill and Stand-in components. |
| D15 Speed | 5 | Opening a case took 230 ms; one team read per dialog. |
| D16 Testability | 4 | 57 API checks and 22 browser checks, each rule with a pass and a fail. Not wired into CI yet (Lead action). |
| D17 First use | – | Simulated only. |
| D18 Provenance | 4 | SI-9 chips; Sample licence values marked. |
| D19 Closure | 3 | Open a case → header → change → new IMM 5476 asked for. The IMM 5476 copy itself is not produced yet. |
| D20 Pain solved | – | Simulated only. |

## Could not check
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* CI on this commit. It would not run these suites anyway: see "Lead action".
