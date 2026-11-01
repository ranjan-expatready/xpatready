# Team board (P-220 swarm, from 1 Nov 2026; kept current by the tech lead)

Every worker reads this first. One owner per capability and per shared file; never build another worker's rows. When your list is done, say so in your PR and the tech lead gives you the next rows. Plan: `design/delivery-plan-2026-11-01.md`.

## Builders (cloud), capabilities they own
| Worker | Journey | Capabilities, in order |
|---|---|---|
| B1 | J1 forms in | C2.12, C3.12, C1.6, C11.1 · owns `contracts/workspace.ts` |
| Forms builder | J3 draft the rest | #270, #274 (C11.15, C11.11), #277 C2.6, then C3.4, C3.6, C11.13, C11.14 |
| B2 | J2 map fields, trust AI | C3.1, C3.3, C11.8, C9.1 |
| B3 | J4 questionnaires | C4.1, C4.5, C4.6, C4.4 |
| B4 | J3/J4 AI drafting | C4.7, C4.11 |
| B5 | J5 library upkeep | C3.13, C3.14, C11.9, C3.15 |
| Screens builder | J1/J5 setup | C1.5, C11.16, C11.10, C11.3, C11.12 |
| Runtime builder 2 | J6 demo, runtime | #113 (C10.1, C3.11, C11.7), runtime Minors, X9, #116 |
| M3-A | J7 Visitor visa | C6.11, C11.5 (firm, team, case) |
| M3-B | J7 Visitor visa | C6.12, C11.6, C6.4 (filings, fees, checklist) |
| Flaky-checks fixer | merge flow | batch-breaking checks (P-214) |

## Test writers (Mac, Day 0)
Pack 1 J1–J2 · Pack 2 J3–J4 · Pack 3 J5–J6 · Pack 4 Visitor visa M3 path. Output: `prototype/studio/acceptance/`, `acceptance/journeys/`, and the compliance trace table (product folder, created by the packs). Builders adopt their rows' tests when they land.

## qa
qa-1: after-merge rounds, re-score the rows each merged PR names · qa-2: Visitor visa baseline walk, then journey walks.

## Shared files
* Prisma schema and migrations: the tech lead reads each one; one migration in flight at a time; say "migration" in the PR's first line.
* `contracts/workspace.ts`: B1. Other contracts: the area that created them; a change is named in the PR's first line.
* `api/src/studio.ts`: additive changes only, named in the PR's first line.

## Every PR
Capability IDs in the title; run the any-ratchet (explicit any must not rise) before pushing; merge origin/main into your branch and re-run the touched suites right before the label (an approved PR behind main conflicts at merge), then push and add the label (a push after the label drops the PR from the queue); add `qa/built/<ID>.md` (one line: PR and what a person can now do) and never edit `qa/CAPABILITIES.md` (P-221: parallel PRs collide on it); suites of the touched files green (P-217); the reviewer approves the current commit; then the label (it queues itself). Never wait for a merge: start the next row. Stuck for 10 minutes: write "Question for the tech lead" with your recommendation and carry on with the next row.

## Spend tokens like money (founder, 1 Nov)
Same quality, fewer tokens: read only the files and line ranges you need (no whole-file dumps of big files); run only the suites your files touch (P-217), never ALL by hand; one reviewer run per commit, rerun only after a fix; helper agents only for real parallel work, with a short exact brief; cheaper models for read-only searches; no repeated status reports (one PR comment per change of state); stop and ask when stuck for 10 minutes rather than retrying blindly. The tech lead keeps its own checks silent when nothing changed and reviews spend each hour.
