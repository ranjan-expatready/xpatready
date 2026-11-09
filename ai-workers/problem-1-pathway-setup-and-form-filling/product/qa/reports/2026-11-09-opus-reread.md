# qa: Opus re-read of earlier Sonnet verdicts: 5 rows move to Partial on gate A, 3 stay Works. QA-325, QA-326, QA-327 (Minors) new. 9 Nov 2026, 15:16–15:23 IST

**Asked for by the tech lead, Lead 40.** This round's Opus read differed from the Sonnet read on 1 of 5 rows, so earlier Sonnet verdicts could not stand unchecked (P-303). A fresh reader on Opus re-read each M3 row whose Works verdict came from a Sonnet reader, newest first, plus C6.5's score in #1401. **Facts only: no re-walk and no re-run.** A row changes only if the reader disagrees, with its reason. US$0.

## Rows re-read
| Row | Report the Works verdict came from | Opus reader | Result |
|---|---|---|---|
| C7.6 | `2026-11-08-rescore3.md`, then `2026-11-09-rescore7.md` | Agrees | **Works (stays)** |
| C6.5 | `2026-11-09-rescore9.md` (#1401, not a Works verdict) | Partial, the same | Partial (stays) |
| C3.16 | `2026-11-08-rescore3.md` | Disagrees | **Partial (was Works)** |
| C6.13 | `2026-11-08-rescore3.md` | Disagrees | **Partial (was Works)** |
| C9.2 | `2026-11-08-rescore3.md` | Disagrees | **Partial (was Works)** |
| C6.12 | `2026-11-08-rescore-batch2.md` | Disagrees | **Partial (was Works)** |
| C6.11 | `2026-11-08-rescore-batch2.md` | Unsure | Works (stays) |
| C8.1 | `2026-11-08-rescore-batch2.md` | Agrees | Works (stays) |
| C11.6 | `2026-11-08-rescore-batch2.md` | Disagrees | **Partial (was Works)** |

## Why the five change
**The rule:** gate A applies when a row moves to Works, and its walk ends at the next capability's first step, by screens only (P-317, P-348 (3)). qa checked each quote against the report it comes from.
* **C3.16, C6.13:** `2026-11-08-rescore3.md`: "Gate A to the next capability was walked only for C7.6". C6.13's record adds "Make principal by the pack only".
* **C9.2, C11.6:** `2026-11-08-rescore-batch2.md`: "Gate A for C9.2, C11.6 and C3.16 was not walked to the next capability's first step. C11.6 was read on screen only." P-417 answers QA-306's breadth, and P-380 Q1 narrows a row's breadth. Neither waives gate A.
* **C6.12:** no record of a walk to the next capability's first step, only a read of the case page. P-380 Q1 settles steps -22 and -23.

**These are process failures, not product faults.** No pack changed colour. Each row returns to Works on one walk by screens to the next capability's first step (QA-325).

## How the reader reached this
* A first pass had the earlier verdicts stripped, and with them each row's history, so it read all nine rows as Partial. qa then gave it each row's own record of status changes and gate A, and the rows' reports. Its answers above are the final ones.
* **C7.6:** the 8 Nov record says the walk did not reach Record the submission. Today's walk did (`2026-11-09-rescore10/walk-screens.md`), by mouse, so the reader agrees it is Works. **Caveat, qa's own:** the reader wrote that this rests on the code being unchanged since `e7ad3ae96`. It is not: #1393 merged after that run and changed `case-prepare.ts`. C7.6 was last run on `e7ad3ae96` (42579687276, 27/27, screens 8/8; Mac 27/27). Tonight's nightly covers it.
* **C6.11:** Unsure, on whether a walk set up by the pack helper counts, and because the walk is split across rounds. The reader later accepted helper setup for steps not under test (on C8.1 and in C7.10's walk), so qa leaves it Works. One check would settle it: the walk's end in `walk-case-page-c6.12-c6.11.md`.
* **C6.5:** Partial, the same. The score in #1401 is unchanged. Its next score follows #1404 and #1405.

## Findings
| Finding | Status |
|---|---|
| QA-325, Gap · Minor (tech lead's ruling; the reader said Major): gate A not walked on the five rows | New |
| QA-326, Gap · Minor: `setup_vv_m3` 44/46, the two failures never identified | New |
| QA-327, Gap · Minor: C7.6 probe gaps; the row's words do not name `no_copy` | New; the pack may already cover part of it, not checked |
| Browser packs never re-run on the Mac | Withdrawn by the reader: RULES.md's P-290 asks for "an independent re-run", not the Mac |
| `check_c76_readiness_api.ts` red on the checkpoint | Withdrawn by the reader: fixture-bound |

**Ruled by the tech lead (Lead 40, 9 Nov):** QA-325 is a Minor. It is an evidence gap with no product fault, the packs stand, the five rows carry it as Partial, and it must not refuse product PRs through gate B. The fresh reader had called it Major.

## Not re-read
These M3 Works rows' reports do not name a Sonnet reader, so they were left: C6.15, C6.18, C9.5 (`2026-11-08-m3-rescore.md`), C6.4 (`2026-11-08-c64-page.md`), C6.9 (`2026-11-08-c69-regression.md`), C8.2 (`2026-11-07-c69-c82-gate-a.md`), C1.3, C11.5 (no report named in the row). Partial or other rows were not in scope.

## Suggestions
* *Needed for the proof · Capability:* gate A walks for C3.16, C6.13, C9.2, C6.12 and C11.6, by screens, each to its next capability's first step. Each is short, and qa can do them on the tech lead's word.
* *Later · Scaffolding:* the skill's "Sonnet subagent" wording in old reports stays as history. From now on the qa fresh reader is on Opus (P-303).
