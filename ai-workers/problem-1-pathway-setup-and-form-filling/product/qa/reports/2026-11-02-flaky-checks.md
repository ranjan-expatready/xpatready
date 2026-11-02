# Flaky and setup-failing checks seen on 2 Nov (qa log, asked for by the tech lead)

One row per check. A failure counts as "flaky" when the same check, on the same commit, passed on a rerun with no code change. A failure counts as "setup" when the check stopped before its own steps. qa adds rows as it runs suites; the tech lead decides on quarantine (P-214).

| Check | Kind | What failed (setup or error line) | Where seen (run id / copy) | Reruns to pass | Status |
|---|---|---|---|---|---|
| `check_c313_reuse_browser.cjs` | setup | "sample inputs loaded — 409, Already in progress or already exists" | CI run 41419363380, shard 1, on #493 head 4dcf9e10; also red in main's full run on 2 Nov (STATE 08:55) | not rerun (403 for the builder session) | quarantine PR #503 open |
| `check_forms_c411_draft_qd_browser.cjs` | flaky | "C4.11 pass: Open To review lands on this combination's items": the list rendered after `settle()` on a slow runner | CI on #469 | passed after 3d650ed7 added a wait of up to 15 s | fixed on main (#469) |
| `check_d1_reset_to_six_browser.cjs` | flaky (reported by runtime-3) | under `QUARANTINE` on main; runtime-3's Handover on #493 asks the tech lead to take it off | — | qa: 25/25 on main 12647032 and 25/25 on #502's head, no rerun needed (cloud copy) | ask: un-quarantine |
| (environment) the demo PostgreSQL on 54329 | setup | the cluster was down after a cloud container restart. Every isolated copy and check fails to connect until it is started again (`pg_ctl … start`, as `start.sh` does) | qa cloud copy, about 12:00 UTC, seen by two qa subagents | it came back after about a minute, or was started by hand | cloud only; `start.sh` already handles it |

Not flaky, although a CI shard was red: `check_queue_tx.ts` on #502 (shard 3). The test expected six replayed forms, and the PR made it ten; 75a3f2aa fixed the expectation.
