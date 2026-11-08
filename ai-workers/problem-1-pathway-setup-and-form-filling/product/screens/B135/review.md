# B135 · C6.13 Filing changes while preparing: review

Reviewer: a fresh context that did not build the screen (screen-review), 7 Nov 2026. Commit `5c5f726591e6d4e9d82ccf71742bef14786363db` on `claude/intelligent-noether-qkzc6a` (diff `origin/main...5c5f72659`). Read: concept r2, challenge, board, build notes, screenshots, STANDARDS, EXPERIENCE, QUALITY. Ran on my own copy (:4444, stopped after): engine checks 23/23, pack C6.13 24/24, builder walk 10/10, my API probe (`probe.mts`, 3/4) and two browser walks (keyboard, 1440/1024/720/400 px, axe). Journey score: `journey-test-reviewer-2026-11-07.md`, **7.5/10 (below the pass of 8)**. Paths: `S/` = `prototype/studio/`.

## Verdict
**Ship after fixes (Block).** The rules hold where it matters most. BR-3b: the client stays the same person; 32 answers, 16 "none apply" groups, an adult child and minors, and no confirmation flipped. Apply is serialised: two racing changes and a double click each gave one 200 and one 409. The migration is additive and its CHECKs accept the PATCH door's `travelling_flag` row. Four Majors remain:
* the preview and the apply disagree about which filings lose Ready to file;
* that rule has no test;
* the conflict state is never shown;
* focus is lost after a change.

## Issues (Blocker / Major / Minor; each Must or Should)
**Major 1 (Must): apply resets Ready to file on filings the preview does not name (BR-4, BR-6, preview ≠ apply).**
* Probe 1 marked all four filings Ready to file, then ran Make principal on the spouse.
* The preview names "Marked Ready to file → Not started" only for Client A and Spouse A. The apply set **all four** to `NOT_STARTED`, Child A1 and Child A2 included: their only line was the signer moving.
* Cause: the words are worked out over the fee and applicant diff without the extra words (`S/api/src/filing-changes.ts:93-94`). The reset runs over `view.changes`, which includes the signer lines (`:133-134`).
* Fix: work out one set and use it for both. Add the Ready to file line after the other extra words, for every person in `view.changes`, or reset only the set the words came from.

**Major 2 (Must): the Ready to file reset has no test (STANDARDS §7 [M] "a rule's test fails when the rule is removed"; challenge M2 asked for a pass and a fail check).**
* No check in the pack, the engine checks or the walk mentions READY_TO_FILE, NOT_STARTED or "Ready to file". Deleting `S/api/src/filing-changes.ts:133-134` fails nothing.
* Fix: add pack checks that mark filings ready (the pack's `readyToFile`) and then apply:
  * pass: every filing set to Not started is named in the preview, and the stored status is NOT_STARTED;
  * fail: a filing that does not change keeps READY_TO_FILE.

**Major 3 (Must): the conflict state (BR-8; EXPERIENCE §4 [M] "conflict") is never shown.**
* On a 409 the dialog sets the refusal and calls `load()` (`S/web/src/runtime/filing-changes.tsx:123`). `load()` clears the refusal before it awaits (`:109`).
* My walk changed Child A2's age underneath an open Remove dialog and clicked Remove filing. "This case changed since you opened this" was never on screen, at 150 ms or at 1.5 s. The dialog went quietly from "2 other filings depend…" to "No other filing changes", and a second click applied the change.
* The server guard holds (nothing changed on the 409), but the person is not told why the numbers moved.
* Fix: keep a "changed since you looked" notice that `load()` does not clear (for example a separate `stale` state), shown above the new preview until the next apply. Add it to the browser walk.

**Major 4 (Must): focus is lost after a change (concept §4 "focus returns to the row"; EXPERIENCE §2.12 [M] keyboard path; BIC-20).**
* After a keyboard-only Remove filing, `document.activeElement` was `BODY`. Escape and Cancel do return focus to the row's ⋯.
* Fix: on `done` (`filing-changes.tsx:77`), focus the changed person's row menu button (or the Undo button) once the dialog closes. Add it to the walk.

**Minor (Should):**
1. The refused menu items cannot be reached by keyboard.
   * Radix `disabled` gives them `tabIndex -1`, and arrow keys skip them (`filing-changes.tsx:89-92`).
   * The principal's menu opens with focus on the empty `role=menu`, so the reason "Make someone else principal first" is not read item by item.
   * Fix: keep the items focusable with `aria-disabled` and stop `onSelect`, so the reason is announced (concept §4 "menu fully reachable").
2. The Role ⓘ is a `title` on a span and an svg `aria-label` (`:56`): it is not focusable, so it fails BIC-14 (tooltip on keyboard focus). Fix: use the app's tooltip on a focusable button.
3. A child's Make principal words leave out the way out the concept gives ("To make a child the principal applicant, open a case for them"). They also say "a child cannot swap with a parent" for any role that is not the spouse (`:91`). Fix: use the engine's words per role.
4. BR-3b words on the client's own page are wrong after a swap.
   * `S/web/src/runtime/questionnaire.tsx:533` puts "(you)" on whoever is principal, so the client reads "(you)" on the new principal and "(spouse or partner)" on themselves.
   * The adult-child words still say "Answered by the principal" (`S/engine/runtime/case.ts:71`), though the client answered.
   * Fix: key both on `client`.
5. The words when a filing is recorded fall short of BR-7. The row says only "Recorded as submitted: no person or filing changes here" (`filing-changes.tsx:70`). The in-lock refusal leaves out the name, date, number and "case's lifecycle" (`S/api/src/filing-changes.ts:129`). Fix: reuse the engine's BR-7 sentence in both.
6. BR-10, said differently from the concept and not listed in the build notes' "Differences":
   * the PATCH door does not apply BR-0;
   * it keeps its old refusal words (404 "Only a spouse…", `refuseIfCaseRecorded`'s words);
   * it stores a null reason, not "set by the travelling flag" (`S/api/src/runtime.ts:259-276`).
   * Fix: list these in the build notes (keeping C11.12's behaviour is reasonable), or route them through `applyChange`.
7. Test gaps:
   * pack C6.13-10 tries only Remove and Make principal; the concept says "all three" (`S/acceptance/C6.13.test.ts:129`), so add Add filing back;
   * C6.13-6c compares only the total (`:54`), so compare the fee lines per filing too.
8. Graph G3 lists both `/runtime/cases/:id/filing-changes` routes as reached by no test, and GET as used by no page. The tests build the path through `ROUTE()`. Fix: write the literal path once in the pack, so the graph sees it.
9. Other small points:
   * the migration refuses UPDATE only, while the concept §2 says "update and delete". The migration comment explains why (cascade); say so in the build notes;
   * the signer line is added for a minor child who is not travelling (`S/api/src/filing-changes.ts:99`);
   * one `signedScan.count` is run per child (`:104`).
10. At 400 px (not an [M] width) long names break mid-word in the Person column.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Every BR is built; the BR-4 Ready to file naming is incomplete (Major 1) |
| D2 Data integrity | 4 | Lock, re-read and basis: race and double click → 200 + 409; append-only trigger; silent resets of Ready to file (Major 1) |
| D3 Reuse | 5 | One derivation (`CaseFilings.deriveFor`) for the preview and the filings view; no copy of the fee rules |
| D4 Rule integrity | 4 | Refusals are in the engine with words; BR-0 guard; PATCH not through BR-0 (Minor 6) |
| D5 Stability and recovery | 3 | Double click safe; 409 conflict silent (Major 3); Undo works |
| D6 Governance | 5 | `filing_change` row with reason, who and when, read back on the row; no reason in the audit |
| D7 AI trust | N/A | No AI |
| D8 Orientation | 5 | Section on the case page, under the case's path |
| D9 Flow | 5 | ⋯ → dialog → reason → done, with Undo inline |
| D10 Language | 4 | Plain words; child and recorded words short of the concept (Minor 3, 5) |
| D11 Feedback | 3 | Done line with `role=status`; conflict silent (Major 3) |
| D12 Visual | 5 | Team components; screenshots 1440 and 1024 aligned |
| D13 Accessibility | 3 | axe clean on 4 states; 1024 and 720 px with no sideways scroll; focus lost (Major 4); refused items and ⓘ not reachable |
| D14 Team look | 5 | Same tokens and table style as the case page |
| D15 Speed | 5 | Preview 44 ms; case page ready 1.1 s cold |
| D16 Testability | 3 | 23 + 24 + 10 checks; the Ready to file rule untested (Major 2) |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 5 | Amounts "from the cited fee table, Sample"; reasons with who and when |
| D19 Closure | 4 | Prepare application agrees on fees after a change (pack 6, 6c) |
| D20 Wow | simulated only | — |

## BIC scorecard (EXPERIENCE §6)
| Check | Score | Evidence |
|---|---|---|
| BIC-01 to 07, 10, 12, 15, 17 | N/A | This screen asks no questions, reads no documents and files nothing |
| BIC-08 Structure | Met | `r05-1024.png`, `01-people-and-filings.png`: each person, role, filing and status in one table |
| BIC-09 Principal change safe | Partly | Named action, preview by person, Cancel safe, history row, Undo; preview leaves out some Ready to file resets (Major 1) |
| BIC-11 One primary | Met | One filled button, named for the action ("Remove filing", `03-remove-dialog.png`) |
| BIC-13 Errors | Partly | Reason error on the field, typed text kept; conflict never shown (Major 3) |
| BIC-14 Tooltips | Partly | Role ⓘ hover only (Minor 2) |
| BIC-16 Recorded events | Met | Recorded case read-only, status Submitted (walk 2) |
| BIC-18 States | Partly | Skeletons, read-only says why; conflict missing |
| BIC-19 Low load | Met | One heading, one primary per panel |
| BIC-20 Accessible | Partly | Keyboard path works; focus lost after apply (Major 4); 1024 and 200 % fine |

## Retrofit and scope
* The mapping is recorded: our `principal` is the team's case principal, and each filing keeps its own principal (concept §2, BR-3b).
* "Not built" items (BR-0 combinations, `dependsOnRole`, removing a person, taking back a submission) were not checked as findings (P-26).
* Capability or scaffolding: every step was done on the screen; none uses scaffolding.

## Not checked
* A real screen reader (VoiceOver or NVDA), so how the refused items are announced is inferred from the DOM.
* An intended user's unaided walk (D17, D20).
* The rollback SQL, which I read but did not run.
* C6.12, C8.2, r1a and r1c suites, which I did not re-run (the builder's run reports them green).

Verdict: Block
* Major 1: preview and apply disagree on the Ready to file reset (`S/api/src/filing-changes.ts:93-94` vs `:133-134`).
* Major 2: the reset has no pass or fail test.
* Major 3: 409 conflict words never shown (`S/web/src/runtime/filing-changes.tsx:109,123`).
* Major 4: focus not returned to the row after a change (`filing-changes.tsx:77`).

## Re-review (diff 5c5f72659..37750f8ad)
This is the second and last round (P-293): I reviewed only the diff `5c5f72659..37750f8ad`, on a fresh copy `rv135b` (:4445, stopped after) with the web rebuilt at `37750f8ad`.

**Re-run results:**
* pack C6.13 **32/32**, exit 0;
* engine checks **26/26**;
* walk **13/13**;
* my earlier probe **4/4** (probe 1, which failed on the first round, now passes);
* my keyboard and stale walk, axe clean on all four states, and no sideways scroll at 1024, 720 and 400 px.

**My four Majors, all fixed:**
* **Major 1, preview vs apply (also break M4):** fixed.
  * The Ready to file words are now built after the signer lines, over the same set the apply resets (`S/api/src/filing-changes.ts:108-111`, `:140-141`).
  * Probe 1 again (all four filings Ready to file, then Make principal): the preview names all four, Child A1 and Child A2 included, and the apply resets exactly those four.
* **Major 2, no test:** fixed. C6.13-13 and -13a (pass) and -13b (fail: the 10-year-old's unnamed filing keeps READY_TO_FILE) now fail if the reset is removed or widened.
* **Major 3, swallowed 409 (also break M3):** fixed.
  * A separate `stale` notice survives the preview reload (`filing-changes.tsx:108-109,128,138`).
  * My walk showed "Changed since you opened this" at 150 ms and still at 1.5 s, above the new preview; nothing changed until a second press. Walk 7a covers it.
* **Major 4, focus:** fixed. After apply, focus is on "Actions for <the person>"; Cancel does the same (walks 6a and 7b; my walk).

**The breaker's other two Majors, both fixed:**
* **M1, the client's page after a swap:** fixed.
  * The case view's people carry `client` (`S/api/src/runtime.ts:157-159`). "(you)" and the badge key on it (`questionnaire.tsx:535,630`), and `confirmation` says "Answered by the client" once `client === false` (`case.ts:71-74`).
  * In my browser check, after the swap the client reads "Answering for Sample Client A (you)" and "Answering for Sample Spouse A (principal applicant)".
  * C6.13-6e and 3 more engine checks cover it.
* **M2, the PATCH door:** fixed.
  * The door now takes back every Ready to file mark of the case when it changes a filing (`S/api/src/runtime.ts:279`), after `refuseIfCaseRecorded`.
  * It names nothing, because the door has no preview and no screen. That is said in the build notes and acceptable. C6.13-13c covers it.

**Minors listed as fixed:** checked, and fixed. Each was confirmed by a run or a read:
* refused menu items are reachable by keyboard: focus lands on the `aria-disabled` item with its reason, and Enter keeps the menu open without opening a dialog;
* the role ⓘ is focusable, with a label;
* the child's words now include "open a case for them";
* the recorded-case words (the row and the refusal under the lock) now name the date, the number and the case's lifecycle;
* a reason of invisible characters is refused (C6.13-2a), and the CHECK also refuses a whitespace reason: a direct insert of `E'\t '` failed;
* a 403 now comes before a 400 (C6.13-11c);
* Add filing back is in C6.13-10;
* the signer line is added only for a child who files;
* the Undo reason is cut to 500 characters;
* the DELETE trigger refuses a delete while the case exists (C6.13-13d), and a case delete still cascades: in a rolled-back transaction, 15 rows → 10.
* The migration file was edited in place. That is acceptable because it is not on `main` and no shared database has applied it.

**"Still differs from the concept":** I accept it as written, as these are tech-lead calls or outside the [M] bar:
* The PATCH door skips BR-0 so that C11.12's "declared only" switch keeps working. The tech lead should rule on it in the PR.
* TRUNCATE is not guarded.
* The pre-click BR-0 words appear in the dialog, not in the menu.
* One correction to the notes: at 400 px the mid-word break is in the table's Person column (`[overflow-wrap:anywhere]`, `filing-changes.tsx:66`), not the shared dialog.

**Left over (Minor, Should; none blocks):**
1. Graph G3 still lists both `/runtime/cases/:id/filing-changes` routes as reached by no test, after `node product/tools/graph.mjs`. The written-out `${c.id}` paths in `acceptance/` are not picked up, so the build-notes line "route paths written out so the graph sees them" did not take effect. Fix: a literal path in a file under `tests/` the graph reads, or a graph rule; or drop the claim.
2. The preview's Ready to file line skips inactive filings (`x.active`, `S/api/src/filing-changes.ts:111`), but the apply resets by person (`:141`). An inactive filing still marked READY_TO_FILE would be reset on Add filing back without being named. The current doors no longer leave such a filing (Remove resets it, the PATCH resets all), so only older data can hit this. Fix: drop `x.active` from the words, or add it to the reset.

The journey score after the fixes, in the same walk:
* rises to about 9: feedback, correct data, recovery and accessibility move from ½ to 1;
* stays at ½ for plain words (the 400 px break, and the menu not saying BR-0 before the click).
That is a pass. The first-round report stays as the record.

Verdict: Approve 37750f8ad4bd400c32db378830861e61d3fa5d53

## Round 4: diff-only check of 296864ae0 (CI shard 3 fix)
Scope: `git diff 763c2cbd4 296864ae0`, one file, `tests/check_c613_filing_changes_browser.cjs`, 14 lines added and 5 removed.

**Parsing by `product/tools/run-suites.sh` (:334-345):**
* I ran the same `grep -m1` and `[[ … =~ … ]]` over the new usage line.
* Result: uname `screens_c613w`, port `4443`, tool `node`, args `4443 xr_studio_screens_c613w`. `[screenshot-dir]` is dropped, as for the other suites.
* With a prefix (`x`, port 5543), the args become `5543 xr_studio_x_screens_c613w`.
* So CI now starts the walk's own copy instead of the plain branch that read the missing `xr_studio_accept`.

**Self-setup (:26-31): sound, no silent pass.**
* Setup runs only when `vv.single` is absent. It runs `setup_visitor_visa.ts` and then `acceptance/lib/setup_vv_m3.ts` through `node_modules/.bin/tsx`, with the copy's port and database.
* It is recorded as a step that FAILs unless the combination now exists. If tsx is missing or crashes, `vv.single` stays absent and the step FAILs. A wrong database makes `sql()` throw, so the exit is non-zero.
* Every later step asserts the screen's own behaviour, so incomplete data makes them fail rather than pass.
* The step does not use the setups' exit codes. That is acceptable: `setup_vv_m3` exits non-zero on main today (44/46, S2w and S7a, see round 3), so requiring exit 0 would fail the walk for reasons outside this PR.
* The per-suite limit is 1200 s (`run-suites.sh:257`), far above the 25 s this took.

**Clashes:**
* The name `screens_c613w` is used by no other suite.
* Port 4443 is the screens lane's shared port, also used by about 10 other suites (b83, b151, c95b, uxa1, qa77, s02c, …).
* run-suites runs suites one after another within a shard. Each starts its copy, runs, then stops it, and `isolated.sh` frees the port at start. Prefix and slot shift name and port per lane.
* So this is the same arrangement as the other 4443 suites, with no new clash.

**Re-run by me at `296864ae0`:**
* A fresh isolated `rv135w` on :4448, run with exactly the parsed arguments (port and database renamed). It was stopped after and its database dropped.
* Result: **14/14, exit 0 in 25 s** (`setup: a fresh copy gets the released Visitor visa combination` PASS, then walk 1-13).
* The database afterwards has `vv.single` release 1 SUPERSEDED and release 2 RELEASED, so `setup_vv_m3` did run.

**Blockers / Majors:** none.

**Minor (Should):** the setup step's detail, which holds each setup's exit code and last line, is printed only on FAIL (`ok`, :20). A partial `setup_vv_m3` is therefore invisible in a green log. Fix: put `done` in the step's name, or check for release 2 rather than any `vv.single`.

The round-3 Minors still stand. Journey score unchanged (9/10): the walk itself was not changed.

Verdict: Approve 296864ae002aab2f9806cf5f2d9a1bfa04142b83
