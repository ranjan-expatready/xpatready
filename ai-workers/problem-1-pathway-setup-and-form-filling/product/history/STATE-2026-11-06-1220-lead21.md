# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: Lead 21 · 6 Nov (session local_85990855-843e-4ee4-ba7c-5c5f4049319e; took over from Lead 20 at about 400k, P-314, P-373, P-374)

updated: 2026-11-06 06:00 IST by **Lead 20** (hand-over to Lead 21) · milestone: **M2 59/60 (only C10.1 left); then the P-376 scale changes; the M3 48-hour clock starts after they land (P-376 amends P-359)** · rules: **`RULES.md`** + DECISIONS P-354 to P-376 · earlier page: `history/STATE-2026-11-06-0600-lead20.md`

## Start here (Lead 21 takes over from Lead 20, ~06:00 IST, 6 Nov)
**Branch** `lead/2026-11-05-lead14b`, records PR **#1128**: label it with the day's records when the queue is idle (records once a day, P-336); the founder's name is needed in your chat for your own records PR. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Lead 20's working notes, with every ruling and id: the file lead20-pending in the side-session notes folder of Lead 19 (outside the repo). Acrobat is granted to Lead 21 too; the Validate recipe that needs nobody is item 6 there.
**Your to-do, in order:**
1. Create the 30-minute check (CronCreate) **and** a Monitor on the open M2 PRs (cron checks do not fire while you are talking with the founder). Lead 20's watcher and check are stopped.
2. **#1123** (C10.1 row 12b + B116, head `aaf2372f7`, CI red): B116's three questions moved Visitor visa's question list `vv.single-ae2133b8a398` → `fd6bb52d92bd`; `check_forms_b114_condition_other_combination.ts` and `check_forms_b86_door.ts` pin the old list ("so the saved pairs still replay"). B99 (`local_632e0756-…`) is costing the options: keep the list, re-key the saved pairs with no AI call, or a paid run (founder's Go with cost first). Fast loop (founder, ~06:00 IST): failing suites + `select-suites --direct` non-browser suites locally, push only on exit 0, exit codes per suite to you. **Validate already PASSED on all four copies (04:06-04:08 IST)**; if the fix changes what the copies write, Validate again.
3. **#1131** (B115, QA-271, head `24ddb2a5a`, retargeted to `main` at 05:29 IST on the founder's word): gate B red: `C11.12-runtime.test.ts` needs `wp.family`, not on the six. **fix-1052** (`local_b81d9314-…`) owns it now; same fast loop; never drop a capability id (P-330 (7)).
4. At a lane's "Ready for label": check the suites it ran against `select-suites.mjs --direct` on its diff, read failing check names, then label. Landing: #1131 and #1123 (any order), then start the C10.1 pack run (nightly.yml dispatch, `capabilities: C10.1`; the founder approved these runs, ~05:15 IST; pick six or checkpoint from qa's C10.1 row), then qa walks C10.1 on `main` with a fresh verdict → **60**.
5. After 60 (P-376): label #1139 (flow fix) and #1136 (guardrails), then B119 (records queue), B122 (flaky retry), B120 (demo.ts split), B121 (exact affected tests), one at a time, each on its "Ready for label". Cloud lanes for B119/B120/B121/B122 were started 05:40 IST (they cannot message: read their PRs; B122 is #1145). B117 could not be started (classifier): start it at the founder's next typed turn or fold it into M3 briefs. B123 (GitHub App) is **parked until the product is done** (founder, ~05:50 IST). Then the M3 clock starts and the M3 plan follows P-376's principles.
6. B104 #1084 (M3): label only after M2 = 60 and no M2 PR waits (P-369); its owner is `session_015r4b4…` (ruling 03:00 IST).
7. Records at the morning write: P-373 to P-376 and B116-B123 are already committed on the Lead branch (`f11cb4546`); still to record: the B123 parking, the fast-loop rule, Lead 20's four lessons (below).

## Where we are (06:00 IST)
* **M2 59/60 on qa's records** (#1144 labelled, in the queue; C4.6 Works from run 42131786563). Merged tonight: #1133, #1125, #1134, #1052. Only **C10.1** left: #1123 + #1131, then its pack run and qa's walk. ETA 60: about 09:30-10:30 IST if #1123 needs no paid run.
* **Scale window (P-376):** about 5-6 hours after 60; M3 clock about 15:00-16:00 IST.
* Plan 7% weekly; live AI off; US$0 tonight.

## In flight
| Lane | Where | Row |
|---|---|---|
| B99 `local_632e0756-78a6-4e6f-9513-bf54fbdb71cd` | Mac | #1123 fix (fingerprint options) |
| fix-1052 `local_b81d9314-9cf3-4655-af47-c2aacf2df793` | Mac | #1131 gate B |
| qa-m2-walk `local_42b61af6-fa15-4fbf-9bcb-5c4cb6e17905` | Mac | idle; walks C10.1 when #1123 + #1131 land |
| b104-m3 | cloud | #1084, held |
| flow-fix / guardrails | cloud | #1139 / #1136, held to after 60 |
| B119, B120, B121, B122 | cloud | P-376 rows, held to after 60 (B120 codes only after #1123 lands) |
| Lead 22 `local_b795aa55-be67-4f08-8bf1-616fb8cb7aaa` | Mac | standby (P-286); top up a second standby at the founder's next typed turn |

## Waiting for the founder
Nothing tonight. A paid run only if B99's options need one (cost first).

## Leads, in order (highest = current)
**Lead 21** `local_85990855-843e-4ee4-ba7c-5c5f4049319e` (from ~06:00 IST) · standby **Lead 22** `local_b795aa55-be67-4f08-8bf1-616fb8cb7aaa` · **Lead 20** `local_fd377295-8ebb-4918-ab1a-180389866716` ended at about 400k (02:50-06:00 IST) · **Lead 19** `local_8acced9f-…` ended · Lead 18 (Ollama) · Leads 1-17 earlier. Hand over at about 400k (P-314).

## Founder asks of 6 Nov (A176-A198: `history/STATE-2026-11-06-0220-lead18.md`)
**A199** (~02:07 IST) what was done on the other account and what not; why M2 keeps failing (58 → 57); too many tokens; M2 in 3-4 hours, M3 in 24; strategy with lanes, standbys, cloud; what is needed from him; speed first without lowering quality: answered in chat; lanes started; P-369 ✓ · **A200** (~02:20) connected to his GitHub repo? Yes: fetch and API reads work from the Mac; the GitHub plugin inside Claude fails to connect (not used); cloud proven by the first cloud lane's push ✓ · **A201** (~02:25) M3 tonight: "B104 now, sprint at 60" (P-369) ✓ · **A202** (~02:25) Mac stays awake; signed in to claude.ai (verified: claude.ai/code reads as text); Acrobat approved up front (granted to Lead 19 ~02:25 IST); check what Ollama changed, overnight lessons, approvals up front, hourly plan: P-370, plan above ✓ · **A203** (~02:35) why 10-12 hours for two capabilities; Lean/Six Sigma; standby builders: answered (queue waits and redone checks, stacking B99/B115, warm fix-1052 lane as standby) ✓ · **A204** (~02:45) are we rebuilding, save and resume, M3 at scale: measured, P-371 ✓ · **A205** (~02:55) tokens burned while checking; final way; 150+ capabilities: answered ✓ · **A207** (~03:05) Acrobat for Lead 21 too, more standbys if needed, mind tokens: done, no extra lanes needed ✓ · **A208** (~03:08) truth about Leads and GitHub: answered (work and decisions on GitHub; slow patterns need daily numbers) ✓ · **A209** (~03:10) fix all of these: P-372 ✓ · **A206** (~03:00) make the flow change right away; does an M3 bug reopen M2; visual summary of decisions and how we know it works: flow-fix lane started, merges after M2; visual given ✓

## Lessons (5 Nov lessons: earlier page in history)
* 6 Nov: a lane failed to start on disk (needs 5.4 GB free per new copy); check `df -h /` before every start, and clean merged worktrees by day, not at night: the sandbox refuses deleting them, so it needs the terminal, which asks the founder.
* Why M2 stalled 16 hours (P-360's evidence): stacks of about 8,700 lines open 14-15 hours; batches failing when PRs were first combined; qa finding real Majors at the gate; records PRs outnumbering product PRs 34 to 19; two account switches and the Ollama detour. Small PRs that land fast and walks on `main` are the fix (P-360).
* Token burn: Leads reached 400k+ in about 2 hours by re-reading a 34 KB STATE and long PR threads; long lanes (960k); no prompt caching on the Ollama route (about US$50). Keep STATE one page and checks reading only what changed.
* 6 Nov (Lead 20): (a) at "Ready for label", check the suites a lane ran against `select-suites --direct` on its diff (seconds) — B99's red #1123 (twice) was in suites a 14-second check names; (b) read failing check names, not `mergeable_state`; (c) when shaping a row, grep the tests for pinned values the change will move (fingerprints, saved AI pairs) and put them in "Done when" (missed on B116); (d) cron checks wait while the Lead talks with the founder: keep a Monitor on the open M2 PRs; (e) Acrobat's File > Open dialog is another process: open files from a terminal tab, then Validate and File > Save in place; (f) say a time only from the clock.
