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
| screens | Screen 01 fix pass: 13 bugs; channels, portal, online sources, drafting source per form, "form field" words (C1.6, C1.7, C2.7, C2.10, C3.10) | Screen 02 (AI work, capture review, screen maps, new-edition impact) once its concept is agreed | Screen 03 (workspace: SQR, PQR, documents, rules, preview by channel, links, release), then Screen 04 (library) |
| forms | Slice 2: sandbox fix, faster drafting by parts (A4), AI for leftover portal questions, Adobe findings | Slice 3: AI drafts sections, document requirements, rules and checks from checklists (C2.6, C3.4) | Extension capture mode (M2, C2.9), then fill mode (M3, C7.4) |
| runtime | R1a: configure and release the visitor visa, complete its questionnaire, case, people, answers, confirm by section | R1b: one renderer for client questions and the agent view | R1c: IMM 5257 from case facts, stale signed copies; then Prepare application (M3) |
| evidence | IMM 5257 fill trial | IMM 1295, 5707, 5409, 5476 | IMM 5532, 5406; 5669 after the expert answers |
| qa | After every merge: retest, new findings | Screen 01 retest before it is closed | Milestone runs at each gate |
| Lead | Agree the drafts (Prepare application, Screens 02–03, extension); check and merge every lane | Screen 04 concept | Each milestone gate |

## Gates (WORKFLOW.md)
Screen 01 closed when its fix pass passes the reviewer, breaker and tester. **M2 accepted** when all 37 M2 capabilities work, the tester's milestone run is clean, an intended user has walked it (D17/D20) and the founder has walked it as author and reviewer. **R1 shown** when the founder has walked case → answers → agent view → IMM 5257. **M3** the same gate for officer, agent and client. Then the demo loop on 3 + 2 combinations.

## What slows us down (watch daily)
Founder decisions waiting (listed in the Lead's reply); expert answers; a Critical bug in a merge; machine load from several browser suites at once.
