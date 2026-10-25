# Plan — order of work and counted progress (no dates: everything as soon as possible)

Owner: the Lead. Founder rule (23 Oct): no dates; show progress. Progress is **counted** from `qa/CAPABILITIES.md` by `tools/progress.sh` (status set only by the tester after testing), never estimated. Lanes run in parallel; each line below starts as soon as what it depends on is done.

## Progress now (refresh: `bash tools/progress.sh --md`)
| Milestone | Works | Partial | Not tested | Broken | Not built | Total |
|---|---|---|---|---|---|---|
| M2 · Super Admin setup | **5 of 37** | 6 | 2 | 3 | 21 | 37 |
| R1 · thin runtime slice | **0 of 7** | 1 | 1 | 0 | 5 | 7 |
| M3 · case, agent and client | **0 of 12** | 0 | 0 | 0 | 12 | 12 |

## Order of work per lane (now → next → after)
| Lane | Now | Next | After |
|---|---|---|---|
| screens | Screen 02 FIX (breaker + re-check items), then merge (first) | Screen 04 shared library (board redrawn after the 25 Oct re-check) | PQR picks by AI through Draft setup (C4.7) |
| forms | F2 extension: re-score, sync, then merge | Drafting guard admits ApprovedSource files (P-80) | Slice 3: AI drafts sections, documents, rules and checks from checklists (C2.6, C3.4) |
| runtime | Screen 03 S2 (S1 fixes, SQR tab; "filled by" and coverage block after the screens merge) | S3 documents and links, S4 copy, bulk, PQR, Rules, Review and release | R2 / Prepare application (M3) |
| m3 (P-94) | DESIGN challenge of Prepare application (`screens/M3-prepare-application/`) | BUILD in new files: portal sheet, filled PDFs with Validate, signed copies, documents, filing record | merge after runtime's Screen 03 |
| evidence (Mac) | IMM 5476 in Adobe (Goose task G4) | IMM 5532, 5406 | IMM 5669 after the expert answers |
| qa | Stood down until the next app merge | `/qa after-merge` on each merge | `/qa milestone` at the M2 gate |
| scout (Mac) | `firm-admin-day-one` (Goose task G2) | Charters in `scout/CHARTERS.md` order | — |
| Lead | Check and merge screens, forms, runtime; Goose tasks for Mac work | A re-check of every concept before its BUILD (R-109) | M2 gate with the founder's end-to-end walk |

## Gates (WORKFLOW.md)
Screen 01 closed when its fix pass passes the reviewer, breaker and tester. **M2 accepted** when all 37 M2 capabilities work, the tester's milestone run is clean, an intended user has walked it (D17/D20) and the founder has walked it as author and reviewer. **R1 shown** when the founder has walked case → answers → agent view → IMM 5257. **M3** the same gate for officer, agent and client. Then the demo loop on 3 + 2 combinations.

## What slows us down (watch daily)
Founder decisions waiting (listed in the Lead's reply); expert answers; a Critical bug in a merge; machine load from several browser suites at once.
