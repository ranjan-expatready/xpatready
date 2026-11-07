Title: plan: M3 sprint rows (P-359, P-376)
Head: claude/plan-m3-sprint-cd84b8 (510052b2e) · Base: main · not labelled

Notes only: two new files under `product/`, no product code, no shared notes file (`STATE.md`, `RULES.md`, `DECISIONS.md`, `BACKLOG.md`, `qa/*` untouched, P-314). For the tech lead to read and copy approved rows into BACKLOG. Not labelled.

## What is in it
* `product/design/m3-sprint-plan-2026-11-06.md`: the plan. Shared causes, a ready row per group (first red step, cause with file and line, change, files, acceptance test, Done when, dependencies, decisions), three builder streams with disjoint files and two named hand-overs, the 12-hour checkpoint (P-359), the journeys by screens written before the build (P-352, P-371 (5)), seven rulings for the tech lead, three questions for the founder.
* `product/screens/M3-plan/packs-2026-11-06.md`: the raw results. All 16 M3 packs on `main` 50e47a6fd, each on a fresh configured checkpoint and on its own fixture (gate B's run line): exit code, steps passed, every step line; plus a dump of what the checkpoint's Visitor visa release holds.

## The finding
* On the fixture 12 of 16 packs exit 0. On the checkpoint 2 do (C1.3 54/54, C6.12 24/24).
* Ten packs are green on the fixture and red on the checkpoint. The causes are about the checkpoint's data and five missing screens, not missing engine code:
  1. the release has no account, gates or "signed by" (B104, #1084);
  2. "uses a representative" is an asked Yes/No, not the case team (#1072);
  3. the packs name a three-form Sample release, while a case opens on release 2 (seven forms, IMM 5257 Online, IMM 5645 in place of IMM 5707): needs the tech lead's ruling that packs follow the case's own lines;
  4. the conditional document lines are missing (#1073, B102);
  5. review, pass a warning, Ready to file, sign steps and the signed scan have routes and no screen (QA-229, QA-251).
* Not built: C7.5 part 2, C6.5 part 2, C10.2, C6.12's breadth, the gate-authoring screen.

## How it was run
One isolated copy at a time, started and stopped in the same command, live AI off, no priced button, US$0. Two deviations forced by the session's sandbox are written in the results file (the tsx loader instead of the tsx command; a database check by query instead of `pg_ctl status`). No browser step ran. The numbers match the B104 lane's run on `main` bf12209f1 where they overlap.

## Not checked
The six written PRs were not re-run; causes are read from the code and two diagnostic runs, not proven by a fix; the forecast (5 capabilities in 48 hours, range 4 to 7) is an estimate to be replaced at hour 12.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
