# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-01 · milestone: **M2 — Super Admin configuration**, with the thin runtime slice R1 · way of working: `WAY-OF-WORKING.md` · work list: `BACKLOG.md` · why each choice was made: `design/why-we-chose-2026-10-31.md`

## Goals (P-202; the Lead updates them at every handover)
* **Today (1 Nov):** the merge queue clears the ~20 approved PRs; #113 lands, then the runtime pieces follow; qa tests what merged on 31 Oct.
* **This week (to 7 Nov):** F7 done; F1, F2 and F6 well under way; workflow frozen except fixes (P-204).
* **M2 gate:** about three weeks from 31 Oct on the feature sizes (`BACKLOG.md` › Features).

## Resume here (handover written 1 Nov 01:45 UTC; the previous Lead chat reached 59% context)
1. **Set the 20-minute check first** (lead skill standing rule 1, CronCreate). The previous chat's checks and its 10:07 IST reminder die with it: remind the founder to remove the offline runner entry `xr-mac-2` (GitHub › Settings › Actions › Runners), and report the overnight Mergify numbers with keep-or-drop (keep if at least 4 merges an hour after 01:17 UTC and no false failures; drop = remove the Mergify app and switch `automerge.yml` back to its triggers).
2. **Builders (cloud; they receive messages but cannot reply; read them through their PRs, PR comments and pushed branches):**
   * Forms and screens builders (started 31 Oct 12:30, about 13 hours): told to finish their current PR, write a "Handover" comment on their newest PR and stop. Start fresh ones from those comments: forms F2 (C2.4, C11.15, X8, then F3); screens X1 step badges, X2b (founder's answers on #167: form and document lines first; links stay on the case per P-106), then F5.
   * "Runtime builder 2" (started 1 Nov 01:25): keep it. It takes over the previous runtime builder's work on `claude/festive-lovelace-jx2dwb` (its note, handover-runtime-2026-11-01.md under screens/W1-reset-and-sample, is on that branch only): #116 prepared, F7 (X9a, X9b) approved, F6 slice 1 approved; all wait for #113.
   * Mac session local_3b02c2d2 owns #113, told at 01:35 to merge main (conflict in `tests/check_w115_slice2_browser.cjs`: keep main's version). Archive it and its copy `reverent-mahavira-cef858` once #113 merges.
3. **Start a cloud qa session** for `/qa after-merge` on main (never started on 31 Oct): #139, #146, #153, #155, #147, #145 and the 31 Oct screens fixes merged.
4. **Watch the queue:** about 20 approved PRs; #161 (approved PRs join the queue by themselves) is in it. Until it merges, an approved PR joins only with a comment "@mergifyio queue". Mergify drops PRs on conflicts: merge main into them and queue again.
5. **When #177 merges** (real fix for `check_cost_warning_browser.cjs`), remove that suite from `QUARANTINE` in `tools/run-suites.sh` (P-205). #172 (test ports below 49152) is in the queue.

## Lessons of 31 Oct (for speed and quality)
* A builder that looks idle is often blocked. The runtime builder built #116, F7 and F6 slice 1 but could not say it was waiting on #113. Read branches and PRs, not only the session list, and give a blocked builder unblocked work.
* One unreliable suite stalled five Mergify batches, each costing 2–3 hours of re-testing. Quarantine a suite after two random failures on code that also passed it (P-205), then fix it.
* Approved is not queued: until #161 merges, check that every approved PR shows Mergify's "queued" label.
* Closed batches keep their checks running: cancel them every check. The nightly full run also takes the one test slot for about 40 minutes.
* Every push to a PR resets its check; the Lead's own record PRs conflict with each other on `DECISIONS.md`. Batch the Lead's record changes into one PR per chat.
* Two test slots on one Mac are slower in total than one (P-200); GitHub's machines cost about US$120 a month at our volume; free batching (Mergify) is the lever, once tests are reliable.

## Merged on 31 Oct (main)
* Product: #111, #112, #117–#122, #127, #128, #133–#137, #139, #145–#147, #153, #155, and the screens and forms fixes listed in git log.
* Workflow: Mac checks (P-195, #141), three then one test slot plus a light merge slot (P-199, P-200), Mergify merge queue (P-201, #157), quarantine (P-205, #183), demo keeps running after updates (#150).

## Log (newest first; earlier lines are in git history)
- 2026-11-01 01:45 · tech lead: handover at 59% context. Overnight 31 Oct: 8 merges since 17:20 UTC (batch 1 merged 4 at once; five batches failed on one unreliable suite, now quarantined). Fresh runtime builder started; forms and screens asked to hand over.
- 2026-10-31 · tech lead (new chat): took over; rescued P-194 and the qa session's unmerged QA-99 retest; found CI refused by GitHub billing; decided #113's four points and #138's two questions.
- 2026-10-31 · tech lead: the switch-over is done.
  - Merged today: #112, #114, #115, #117–#119, #121–#127, #129, #130. PR checks moved to GitHub's machines, affected tests only (#124); full set nightly on the Mac (#123); auto-merge fixed (#125, #126).
  - Founder decisions: P-189 to P-193.
  - Disk: 6.6 → 22 GB free. Removed idle test databases, stale temp files, updater caches, Chrome's leftover copies and the Codex cache. Three browser tests that loaded Playwright from that cache now load the project's own copy.
