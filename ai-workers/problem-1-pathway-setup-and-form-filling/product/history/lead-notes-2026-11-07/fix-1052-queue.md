# #1052 merge-queue fix (forms lane), 6 Nov ~02:35 IST

* Cause of the dequeues: #1115's `tests/check_forms_b114_condition_other_combination.ts` read "the row's first section" from
  `sqr_section_selection`, which is empty on the six (only the configured checkpoint's loader fills it). #1052's IMM 5532
  leaves 19 Sponsor facts unasked on fs.spouse (held sections, B78), so the placements were refused (400) and the setup line,
  C5.1 break M1 and C4.11 row 2 for Spouse went red (run 42079758027, shard 6, job 127429702604).
* Fix: head `6a5ba7956` (merge of main bf12209f1 = ed03aac6c, then the one-file test fix). No assertion changed.
* Local (isolated copy, US$0): B114 64/64 exit 0 (was exit 1); C3.6 exit 0; C11.12 exit 0; b88_spread exit 0; C4.11-spread exit 0.
  C5.1 not runnable locally: Chromium ProcessSingleton in the sandbox. C11.8 and qa206 browser left to CI.
* Opus diff-only re-review: Approve, 0 B / 0 M. Label `review: approved` re-added 02:30 IST; PR comment posted.
* Sandbox workarounds for local runs (not in the repo): pg_ctl status can't signal the outside postmaster (shim answers via psql);
  tsx CLI's IPC unix socket is blocked (start the server with `node --import tsx`); set PRISMA_SCHEMA_ENGINE_BINARY to the
  cached schema-engine to avoid the ~/.cache utime EPERM; use .tools/node-v24.21.0 (Homebrew node 23 fails prisma's engine check).
* The worktree quirky-bouman-0b534a still holds branch claude/blissful-lamport-bazwku at f29d7dd3d (stale; its 74dfdee40 merge unused).

# QA-270 file half (C4.6), PR #1134, 6 Nov ~03:00 IST
* Branch claude/forms-qa270-file-route, head c06a94486. GET /api/artifacts/:id/file loses @OpenRead → ConfigReadGuard (401 nobody, 403 case people);
  Preview's Download fetches with x-actor (busy while fetching). check_qa270_file_route.ts: exit 1 on main's route, 13/13 on branch.
* Opus: round 1 Blocker (check_studio_browser.cjs looked for a link) fixed; round 2 Approve on c06a94486. Breaker: nothing broke.
* PR comment says "Ready for label once CI is green"; Lead 20 labels (asked to). Not run locally: browser suites (Chrome blocked in sandbox).
* Left running (sandbox refused kill): isolated servers on 4517 (xr_studio_f1052) and 4518 (xr_studio_qa270); prune-test-dbs.sh can clean.

# #1131 (B115) gate B, 6 Nov 05:52-06:30 IST (forms builder owns it)
* Cause: gate B runs C11.12-runtime on the six (exit 2 by design; qa holds it from the six). Fix: title names C6.1, body "C11.12: held from gate B" (P-343 (4)); accepted by Lead 21.
* gate-b.mjs local: old title exit 1; new title/body exit 0; GATE_B_DATA=checkpoint C11.12 exit 0 (4/4, 20/20). Pre-flight: 45 exit 0, 1 quarantined, 5 Chromium-only (sandbox).
* Pushed 06e30042f (records file product/screens/B115-add-sponsor/gate-b-2026-11-06.md). Its CI carries the OLD title (pushed before the edit): gate B will be red there.
* BLOCKED: PATCH of the PR title/body refused by the auto-mode classifier (External System Writes). Ready text: pr1131-title.txt, pr1131-body.md here. After the edit, one more push (synchronize) is needed so CI reads the new title.
* Local-only, untracked: studio/tools/zz-local-gate-b.mjs (delete after); $TMPDIR/shim/{isolated.sh,run-suites.sh}.
* #1131 merged (Lead 21: 08:00 IST). Lane finished, idle until a new row.
* Lead 22 (local_b795aa55-be67-4f08-8bf1-616fb8cb7aaa) is current since ~12:21 IST per CURRENT-LEAD.md; lane idle, branch claude/b115-sponsor clean at 16b3acbcc.
* 12:33 IST Lead 22: CI && row (P-376 (3)); include demo-update.yml:33 and ci.yml:161/162; PR lists all four places before/after; branch only after #1139 merges. Draft lint in scratchpad ci-and-lists.mjs.
* ~18:40 IST Lead 22 chose (b): Lead applies ci-and-lists-b74f356df.patch and opens the PR; this lane sends pre-flight exit codes + Opus verdict; keep local branch claude/ci-and-lists, push nothing.
* 18:13 IST: CI && row handed over as ci-and-lists-c9003a9d5.patch (2 commits on 9775d2f42); Opus R1 b74f356df Approve, R2 c9003a9d5 Approve; direct suites 4/4 PASS; worktree detached at 9775d2f42, branch claude/ci-and-lists kept, nothing pushed; leftover node pid 63148 on :24611 (pf376c) needs a kill outside the sandbox.
- 19:52 IST forms lane: Lead 22 said the Mac token can't push ci.yml; the cloud flow-fix lane applies the patch. Sent the verdicts + exit codes and said apply ci-and-lists-c9003a9d5.patch (sha256 481388c7…), not b74f356df. Lane finished; nothing pushed.
