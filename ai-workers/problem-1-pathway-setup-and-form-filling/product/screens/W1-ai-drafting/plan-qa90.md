# QA-90: one spend ledger for every copy (plan, forms lane, 29 Oct)

1. **Path:** `p2/policy.ts LEDGER_DIR` = `P2_LEDGER_DIR` when set, else today's `prototype/p2/ledger` (CI, cloud). The used launch tickets move with it.
2. **Sandbox:** `p2/guard.ts isolatedNodeArgs` already allows read and write on the ledger folder it is given. `p2/launch.ts` passes `P2_LEDGER_DIR` to the drafting process, whose environment is otherwise cut to PATH, HOME, TMPDIR and LANG.
3. **Readers:** `studio/api/src/sources.ts` reads `p2/ledger/spend.jsonl` by a fixed path; it reads `LEDGER_DIR` instead.
4. **The Mac:** `studio/start.sh` and `studio/tools/isolated.sh` export `P2_LEDGER_DIR=<main copy>/.tools/p2-ledger` (the main copy is found from git's common folder, so a lane copy finds the same one). A `P2_LEDGER_DIR` already set wins.
5. **Seed, once:** `p2/tools/seed-shared-ledger.ts` reads every copy's `spend.jsonl` (the main copy and `.claude/worktrees/*`) and writes their union, de-duplicated by entry type and id, in time order. It prints the US$ committed per copy before and the shared total after. The used tickets are copied the same way.
6. **Git:** `prototype/p2/ledger/spend.jsonl` and `used-launch-tickets/` go into `.gitignore` and leave the index (`git rm --cached`); their history stays in git. The restore after a suite run stops touching them.
7. **Check:** `tests/check_p2_shared_ledger.ts` starts two processes that reserve at once into one scratch ledger. Both entries land in one file, and the cap counts both (the second reservation is refused when the two together pass the cap). A pass and a fail; US$0.
8. **Also checked:** the drafting process writes to the shared folder (p2 launch check with `P2_LEDGER_DIR` set). With it unset, everything is as today (CI).
9. **Tests and run-suites:** test servers on the Mac write their US$0 stub entries to the shared ledger too; they count nothing toward any cap.
10. **Order:** after the runner package (`569cc7e3`) is handed back. Lead's question: should run-suites point `P2_LEDGER_DIR` at a scratch folder, so test entries stay out of the real ledger? *Recommend:* yes, a scratch folder per run (run-suites is the Lead's file).
