# B135 · C6.13 build notes

Built 7 Nov 2026 (screens lane) on the concept approved by the tech lead (#1242; Q0 to Q3 as recommended). Main merged once before any code (C3 #1225 had landed).

## What was built, by business rule
| Rule | Where | Proved by |
|---|---|---|
| BR-0 only where everyone files their own | `engine/runtime/filing-changes.ts` `everyoneFilesOwn`, `applyChange` | `tests/runtime/check_filing_changes.ts` BR-0 |
| BR-1 Remove filing / Add filing back, ids and items kept | `applyChange`; `api/src/filing-changes.ts` (`applies` flag, the C11.12 fact) | pack C6.13-3, -4; walk 6, 7 |
| BR-2 the principal's filing never removed | `applyChange` (422); menu item refused in words | pack C6.13-5; walk 2 |
| BR-3 swap with the spouse or partner only | `applyChange` | unit BR-3; pack C6.13-6, -7, -8; walk 3, 8, 9 |
| BR-3b the client stays the same person | `clientPersonOf`, `withClient`; `engine/runtime/case.ts` `confirmation` reads `client`; `Runtime.peopleOf` | unit BR-3b; pack C6.13-6b |
| BR-4 what changes, named by person | `diffFilings` over `CaseFilings.deriveFor` (the filings view's own derivation, M7); items, Ready to file, a minor's signer in the API | pack C6.13-1, -1a, -6c, -6d; walk 4, 8 |
| BR-6 reason on a row; Ready to file back to Not started | table `filing_change` (migration `20261107190000_c613_filing_change`, append-only trigger) | pack C6.13-2, -3, -3b, -12b; walk 5, 6 |
| BR-7 nothing changes once recorded | `applyChange` + re-check under the lock | unit BR-7; pack C6.13-10 |
| BR-8 stale preview refused | `basisOf` (the preview's own result) + participants re-read under `FOR NO KEY UPDATE` | unit BR-8; pack C6.13-9 |
| BR-9 who | `Runtime.reach(…, "officer")` | pack C6.13-11, -11a, -11b |
| BR-10 one door | `Runtime.updatePerson` writes a `travelling_flag` row | pack C6.13-12, -12a |
| BR-11 Undo | the apply's `undo`; the case page's Undo opens it with "Undo: <reason>" | pack C6.13-3a; walk 7 |
| m2 stored applicant role refreshed by a swap | `api/src/case-prepare.ts` `sameApplicants` compares the role (one line) | pack C6.13-6 |

## Differences from the concept, said plainly
* **Undo is next to the change's words in the section, not in a toast.** The app's toasts carry text only; the inline line keeps the Undo button reachable by keyboard and visible until the next change.
* **No "household questions now asked of someone else" line.** With BR-3b the household's questions stay on the case's own subject, answered by the client, so nothing moves. The line would always be empty.
* **The "answered by the principal" words:** a principal who is not the client reads `CONFIRM_WORDS.by_client` ("Answered by the client for this adult…"). Other adults keep the existing words.

## Not built (as the concept says)
* Combinations with people on the principal's application (BR-0 refuses in words).
* SA-1B-219 `dependsOnRole` (Q2).
* Removing a person from the case (AG-7-107).
* Taking back a submitted application (C8.4, SI-18).
* `qa/built/C6.13.md`: not added, because this lane's brief says never to edit `qa/`. The PR body carries the line instead.

## Round 1 fixes (review.md: Block, 4 Majors; break-report.md: 4 Majors), on top of 5c5f72659
| Finding | Fix | Fail test |
|---|---|---|
| Review M1, break M4: the preview named fewer Ready to file resets than the apply made | one changed set (fees, applicants, items and a minor's signer), built after the signer lines; the apply resets exactly the named filings | pack C6.13-13, -13a, -13b |
| Review M2: the reset had no test | as above | pack C6.13-13b fails if the reset reaches an unnamed filing; -13a if it is removed |
| Review M3, break M3: the 409 "changed since you opened this" was cleared by the reload | a separate notice that a preview reload never clears | walk (dialog) |
| Review M4: focus lost after a change or Cancel | focus returns to the person's menu button | walk |
| Break M1: the client's page called the new principal "(you)"; their answers read "Answered by the principal" | the case view's people carry `client` after a swap; "(you)" and the badge follow it; `confirmation` says "Answered by the client" for a non-client after a swap | pack C6.13-6e; engine BR-3b (3 more) |
| Break M2: the travelling-flag door left Ready to file marks on filings whose fees it changed | the door takes back every Ready to file mark of the case when it changes a filing (it has no preview to name them) | pack C6.13-13c |
| Minors | refused menu items keyboard-reachable (aria-disabled, not removed from the order); the role ⓘ focusable; the child's words say "open a case for them"; the recorded row and the refusal under the lock name the date, number and the case's lifecycle; reasons need a letter or a digit and refuse invisible and direction-override characters (API and CHECK, which also refuses NULL); the Undo reason is cut to 500; a row is not deleted while its case exists (trigger; a case delete still cascades); a client's malformed body is 403 before 400; Add filing back is in C6.13-10; signer lines only for a child who files | pack C6.13-2a, -10, -11c, -13d |

**Still differs from the concept (said here, review m):** the PATCH travelling-flag door does not apply BR-0, because C11.12's "declared only" switch for on-the-principal's combinations uses it. It keeps its existing refusal words and writes `reason` NULL (the CHECK allows NULL only for this kind). Whether it should apply BR-0 is a call for the tech lead. TRUNCATE is not guarded (only a full database reset uses it). Long unbroken names wrap mid-word at 400 px in the table's Person column (`web/src/runtime/filing-changes.tsx`). The menu does not say before the click that a combination with people on the principal's application refuses the changes; the dialog shows the server's words.

**Left after the re-review (Minors, review.md "Re-review"):** the test graph (`graph.mjs`, G3) still lists the two filing-changes routes as reached by no test, although the pack and the walk call both; and the preview's Ready to file line counts active filings only while the reset does not filter on `active` (only data older than this PR can hold an inactive filing marked Ready to file). Both go in the screens lane's daily Minor PR.
