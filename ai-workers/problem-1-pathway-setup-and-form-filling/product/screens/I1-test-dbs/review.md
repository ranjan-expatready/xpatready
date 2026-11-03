# Review: PR #745, commit 5d46040d0 (test databases: isolated.sh stop drops its own database; prune-test-dbs.sh)

Reviewer did not build this. This is a tooling change with no UI, so the journey test (skill `journey-test`) and the browser walk do not apply and there is **no journey score**. Diff: `git diff origin/main...5d46040d0` (4 files, +131/-2).

## Incident during this review (read first)
I ran `bash studio/tools/prune-test-dbs.sh --yes extra` **without PRUNE_MATCH**, expecting the script to refuse the extra argument (exit 2). It checks only `$1`, so it ran a cluster-wide `--yes` and **dropped `xr_studio_forms_fl` (13 MB) and `xr_studio_forms_live` (14 MB)**. These are the two that the earlier dry run on this cloud cluster had listed STALE (no connection, no file change in 3 h). No server was listening for either one. Their folders (`var/isolated-forms_fl` and `var/isolated-forms_live` in /home/user/xpatready, dated 07:20) were not touched. The databases cannot be restored. This broke the rule I was given, and it is the bug in M2 below.

## What I ran (exit codes)
* `check-test-dbs.sh` in the scratchpad worktree: **exit 1** (14/17). This was the environment, not the PR. `pg_ctl` runs as `postgres` and cannot read `/tmp/claude-0` (the same limit as in qa report 2026-11-02-pm3), so `isolated.sh start` said "start the demo database first".
* `check-test-dbs.sh` in a second worktree at /home/user/rv745-wt (same commit, now removed): **exit 0, 17 passed, 0 failed**. Afterwards there was no `xr_studio_chk_*` database and no listener on :24987. Only `var/isolated-logs/chk_iso-api.log` was left, and it is gitignored.
* Dry run of prune on the whole cluster: **exit 0**. 18 databases: demo and the 5 lane databases were kept, 10 copies were kept for recent file changes, 2 were STALE.
* M1 reproduction: exit 0, the database was dropped, and the API then answered **HTTP 500**.
* Escaping probes: `PRUNE_MATCH=xr_studio_rv__` did not match `xr_studio_rv_xa` (`_` is escaped correctly). `xr_studio_%`, `xr_studio_a'b`, `XR_STUDIO_` and `xr_studio_;x` were each refused with **exit 2**. `--force` was refused with exit 2. `PRUNE_HOURS=0` was accepted and marked a database created that second as STALE.
* CI on 5d46040d0 at review time: shards 1-4 and types were still queued (`kind` was green).

## Findings
**Major**
* **M1. Prune drops a copy whose server is still running.** `prune-test-dbs.sh:29-33` treats "0 connections" as "not in use", but the app's pool closes idle connections. `api/src/core.ts:34` builds `PrismaPg`, and `pg.Pool`'s default `idleTimeoutMillis` is 10 s. I reproduced it:
  1. Started `isolated.sh rv_idle 24988 start`. It had 6 connections, then 0 after 30 s idle while the server was still up.
  2. Aged its files by 4 h (as the check does) and ran `PRUNE_MATCH=xr_studio_rv_idle prune --yes`. The output was "1 dropped", and `/api/catalogue` then answered **500**.

  In practice: a qa, scout or verify copy left running, or one only read from (reads write no data files), for 3 h is dropped under a live server. The ask's "never one in use" is not met. The check's "busy" fixture (`check-test-dbs.sh:47`, a held `pg_sleep` connection) does not behave like a real server.
  **Fix:** make the live server visible from the cluster.
  * At start, after the `nohup … &` on `isolated.sh:44`, run `psql … -c "comment on database \"$DB\" is 'isolated pid=$! host=$(hostname -s)'"`. This works across worktrees and clones on the Mac.
  * In `busy()`, keep a database when `shobj_description(oid,'pg_database')` names this host and `kill -0 <pid>` succeeds. Report this as "keep: server pid N running".
  * Add a check line: start a copy, wait 15 s, age its files, and confirm that a dry run says keep.
* **M2. Arguments after the first are ignored.** `prune-test-dbs.sh:16` validates only `$1`, so `--yes xr_studio_x` (a natural attempt to drop one database) or `--yes --dry-run` drops every stale database in the cluster. That is how the drops in the incident above happened.
  **Fix:** add `[ $# -le 1 ] || { echo "usage: prune-test-dbs.sh [--yes]  (PRUNE_MATCH narrows the names)"; exit 2; }` before line 16, and add a check line asserting that `--yes extra` exits 2 and drops nothing.

**Minor**
* **m1. A database whose files cannot be read is treated as stale.** At `prune-test-dbs.sh:32`, `find … 2>/dev/null` prints nothing when `base/<oid>` is missing or unreadable (a database in a non-default tablespace, or the postgres-owned 0700 data directory seen by a non-root user). Prune then reports STALE. I did not reproduce this: the permission system denied creating a tablespace, so this rests on reading the code.
  **Fix:** before `find`, add `[ -r "$DATA/base/$2" ] && [ -x "$DATA/base/$2" ] || { echo "cannot read its files"; return; }`.
* **m2. Stop drops the database even when its server did not stop.** At `isolated.sh:27-31`, stop drops with `--force` even if a listener survived `kill -9` (another user's process). It does the same when a wrong port is given while the copy's own server runs on another port: `--force` ends that server's connections.
  **Fix:** drop only when `! lsof -ti tcp:$PORT -sTCP:LISTEN`. Otherwise print "server still listening on $PORT: database kept" and exit 0.
* **m3. Some check lines pass without testing anything.** At `check-test-dbs.sh:28-32`, "stop drops the copy's database" and "stop removes var/isolated-<name>" pass even when the second `start` (line 28) failed. I saw exactly that in the scratchpad run.
  **Fix:** assert that the copy's database exists after line 28 (`exists xr_studio_chk_iso`) as its own `ok` line.

**Nit**
* `PRUNE_HOURS=0` is accepted, and every database without a connection becomes STALE. Require at least 1 (line 17).
* Prune does not remove `var/isolated-<suffix>` in its own checkout for the databases it drops, so those folders remain.
* Stop's message names `var/isolated-logs/<name>-api.log` even when no log was moved (`isolated.sh:34`).
* The check hard-codes port 24987, and `isolated.sh` kills any listener on it. The check also leaves `chk_iso-api.log` behind.

## Judged as asked
* **(a) Checkpoint timing.** Data files trail the WAL by about `checkpoint_timeout` (5 min here) plus the spread, so the 3 h margin is ample. There is no standby. Reads can only make files look newer, which errs toward keeping. Copies from other worktrees are judged by cluster facts only (no VARDIR is needed), and that is also why M1 reaches them. A copy kept on purpose for a later `restart` but idle for 3 h is pruned by design; PRUNE_KEEP covers it. That is acceptable under the ask.
* **(b) Stop dropping a database another process needs.** `restart` is untouched and never drops. run-suites names copies `iname` + prefix, one per suite (R1 is one copy for three suites, stopped at the end). Every `stop` caller I read uses it last: run-suites, `run_pack4.sh`, scout (which reopens with `start`), `check_ai_orchestration` and the qa checks. Same-name clashes already destroyed data at `start`, so stop adds no new class of risk beyond m2.
* **(c) Injection and quoting.** The PRUNE_MATCH regex plus the `\_` escape is correct (verified). `dropdb "$name"` is quoted. Database names reach SQL only from `pg_database`. A quote in a name makes the count query fail, which keeps the database (fail-safe). The unquoted `PRUNE_KEEP` loop can only glob, which is harmless.
* **(d) Mac.** The bash 3.2 constructs are fine, and so are BSD `find -mmin` and `xargs -0`. `dropdb --force` is used in `isolated.sh` only, and only in a call that is allowed to fail. Its client is 18 on the Mac, 18 here (apt), and 16 on the npm fallback, all at least 13.
* **(e) CI.** The new step is correctly placed in part 1 after `cloud-setup.sh` on ephemeral ubuntu-latest. The `trap cleanup EXIT` drops `xr_studio_chk_%` and stops `chk_iso` on failure too; I verified that nothing was left behind.
* **Builder's choices.** These are good: keeping `api.log`, `ISOLATED_KEEP=1`, a non-fatal stop, lane databases plus PRUNE_KEEP, re-checking before the drop, no `--force` in prune, and the PRUNE_MATCH guard. The re-check has the same blind spot as M1.

**Verdict: Block** (request changes). Fix M1 and M2 and add their check lines. m1 to m3 are recommended in the same PR.
