# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-06 02:35 IST by **Lead 19 · 6 Nov 02:07 IST** (new Claude account, P-369) · milestone: **M2 to 60 first; B104 runs for M3; the M3 sprint starts at 60 (P-369, P-359)** · rules: **`RULES.md`** + DECISIONS P-354 to P-369 · earlier full page (Lead 18, 02:20 IST): `history/STATE-2026-11-06-0220-lead18.md`

## Start here (Lead 20 takes over from Lead 19 at ~03:15 IST, 6 Nov)
**Branch** `lead/2026-11-05-lead14b`, records PR **#1128** (founder named it; label in the morning with the day's records, P-336). `gh` fails TLS: curl with `Authorization: Bearer $(gh auth token)` and `allowed_domains` (P-363). Times from `TZ=Asia/Kolkata date`. Acrobat is granted to Lead 20 and Lead 21 (founder, ~03:05 IST). Demo :4400 up. Disk about 8 GB free (a new lane copy needs 5.4 GB). Sessions cannot be started from timer or message turns: every lane needed tonight is already running.
**Your to-do, in order:**
1. Create the 30-minute check (CronCreate, minutes 13 and 43, lean: only what changed).
2. **#1133** (qa records, M2 58/60): label `review: approved` when its CI is green (qa's records PR, P-306 (3)); the ten qa copies are stopped (terminal, all exit 0).
3. **#1052** (labelled at `6a5ba7956`, Opus re-review approved): watch it land; then tell **fix-1052** nothing (it already has its next row: QA-270's file route for C4.6, P-341).
4. **#1125** queued (Claude Opus re-review APPROVE, Minors logged on the PR).
5. **B99** (`local_632e0756-78a6-4e6f-9513-bf54fbdb71cd`): stacked on #1052 + #1125 locally; when it posts "Ready for Validate — tech lead" on #1123, **you run Acrobat's Validate by computer use** (app "Adobe Acrobat", background `app_*` tools) on each of the four files, File > Save beside them, comment the results; then B99 reads them back.
6. **B115** #1131 (cloud, stacked on #1052): retarget to main after #1052 lands (the lane does it; read its PR comments).
7. **Flow-fix** (cloud, task_b52ff4a6): when its PR opens, post P-372's four additions as a PR comment (the lane cannot get messages). Label it only after #1052, #1125, #1131, #1123 have landed.
8. **B104** #1084 (cloud): label on its "Ready for label" comment only while no M2 PR waits (P-369).
9. qa (`local_42b61af6-…`): message it to re-walk C4.6 when QA-270's fix lands and C10.1 when B99 + B115 land; a fresh subagent gives the verdict.
**Lead messages to sessions are capped at about 10 after the founder's last typed turn:** rulings on PR comments.

## Where we are (02:35 IST)
* **M2: 56/60 on qa's records on `main` `bf12209f1`.** The fall from 58 to 57 to 56 is qa marking rows back to Partial on real Majors it found (QA-255, QA-262, QA-270), not code breaking. Left:
  * **C4.5** (QA-255), **C4.6** (QA-270, fixed by #1114), **C4.11** (QA-262 by #1115, QA-263 by #1068): every fix is on `main`; each needs only qa's walk and a fresh verdict.
  * **C10.1** (long pole): #1052 dequeued twice (last: `regression (C3.6)` + `shard (1)`, "fails with this pull request") → land #1052; #1125 (QA-272, labelled at `7ed8630db`, CI running); B115 (QA-271, no screen adds the sponsor); then B99 row 12b (#1123, draft): a real Acrobat Validate of a product-made IMM 5257, read back. Rehearsal notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/b99-rehearsal/`.
* **M3: 0/17.** B104 = #1084 (gate A PASS on `d89a3afb4`, now conflicted with `main`).

## In flight (all started 6 Nov ~02:15-02:30 IST by Lead 19)
| Lane | Where | Row | Done when |
|---|---|---|---|
| qa-m2-walk `local_42b61af6-fa15-4fbf-9bcb-5c4cb6e17905` | Mac | C4.5, C4.6, C4.11 on `main`; first saves the old qa lane's 6 test files + GRAPH.md from `b82-checklist-facts-853da5` to a fresh branch | each row has a qa status on a named `main` commit in a pushed records PR |
| fix-1052 `local_b81d9314-9cf3-4655-af47-c2aacf2df793` | Mac | #1052's queue failure | #1052 merged, or cause named with run id |
| b115-sponsor (task_4755d887) | cloud, stacked on #1052 | B115 / QA-271 | sponsor added by screens, IMM 1344 + 5532 appear, pass and fail tests; also the cloud canary: running = a push to `claude/b115-sponsor` |
| b104-m3 (task_993c7965) | cloud | B104 / #1084 | merge main, re-review, "Ready for label" comment; Lead labels only while no M2 PR waits |
| Lead 20 `local_fd377295-8ebb-4918-ab1a-180389866716`, Lead 21 `local_85990855-843e-4ee4-ba7c-5c5f4049319e` | Mac | standbys (P-286) | idle until "take over now" |

Old account's sessions (Leads 15-18, row 12b lane, qa, watcher) are gone from the app; their work is on GitHub. Their worktrees stay on disk until unpushed checks: `quirky-bouman-0b534a` (#1052 merge `74dfdee40`, unpushed), `b82-checklist-facts-853da5` (qa files; unpushed merge `8cdc64863` on the old gate-A branch: leave it).

## Added 02:35 IST (P-370)
* **b99-12b-run** `local_632e0756-78a6-4e6f-9513-bf54fbdb71cd` (Mac; the first start `local_1d938a5a-…` failed twice on disk, 4.7 then 3.7 GB free; four merged worktrees removed by terminal at ~02:40 IST → 8.5 GB): stacked on #1052 + #1125 locally so it does not wait for the queue; phase 1 now, read-only (the three empty-read fields, checkpoint copies carrying values), then idle; phase 2 on the Lead's "go" after #1052 and #1125 are on `main`: four IMM 5257 copies → **Lead 19 runs Acrobat's Validate (grant is this session's only; hand over after it)** → read-back.
* **M2 58/60 on qa's records PR #1133** (tested on `bf12209f1`; label when CI green): C4.5 and C4.11 Works; C4.6 Partial on QA-270's file route → **fix-1052 lane takes it next** (warm, P-341). qa told to stop its ten test copies (:4470-:4479). Lead 20 asked to pre-request Acrobat (so a hand-over does not lose it). **Flow-fix lane** (cloud, task_b52ff4a6, P-371): builds now, merges after M2's last PRs. Lead messages used since the founder's last typed turn: 3.
* **#1125** queued; its approval came from the Ollama route: a Claude Opus re-review runs now; label off on a Blocker or Major.
* Lead message cap: about 10 messages to sessions after the founder's last typed turn. Budget: B99 "go", fix-1052, qa, one take-over. Rulings go on PR comments.

## Hourly plan (IST, 6 Nov; judgement, checked at each 30-minute check)
| By | Expected | Slips if |
|---|---|---|
| 03:30 | #1125 merged (Opus re-review clean); fix-1052 has the cause; qa mid-walk; B99 phase 1 pushed; B115 and B104 pushing | re-review finds a Major; cloud lanes never push |
| 04:30 | qa verdicts on C4.5, C4.6, C4.11 → up to **59/60**; #1052 fix reviewed, labelled, in the queue | qa finds a new exit-list fault |
| 05:30 | #1052 on `main` (about 1 h of queue CI); B115 retargeted to `main`, reviewed | #1052's cause is outside #1052 |
| 06:30 | B99 phase 2: four copies generated; Lead's Acrobat Validate done; read-back running | Validate stops at a new field (then fix and repeat, about 1 h each) |
| 08:00 | B99 and B115 approved, labelled, in the queue | |
| 09:30 | both on `main`; qa walks C10.1 on `main`; fresh verdict. P-360 check | |
| 10:00-13:00 | **60/60** (best about 10:00, likely by 13:00) → M3 sprint starts at the founder's next typed message (the app starts no sessions from timer turns) | |

## Next (in order)
1. #1125 lands; label #1128 when the queue is idle.
2. qa's verdicts: C4.5, C4.6, C4.11 → up to 59/60.
3. #1052 lands → B115 retargets to `main` → **B99 starts on the Mac (ask the founder for the Acrobat grant by AskUserQuestion; app name "Acrobat")** → qa → C10.1 → 60.
4. At 60: **the flow fix first (P-371), one lane, 3-4 hours**, with B104 continuing; then the M3 sprint (P-359): B104 first, rows by journey from `screens/M3-design-2026-11-04/rows.md` (refresh first), forecast at 12 hours; the hardening pass for open Majors (P-358) runs alongside.

**Forecast (02:35 IST, judgement, not measured):** 59/60 about 05:00-06:00 IST if qa finds no new exit-list fault; 60 depends on #1052's cause and the Acrobat Validate, best about 09:00, likely by about 13:00 IST on 6 Nov. Proof it is wrong: #1052 still red at 05:00, or qa holds a row on a new exit-list fault.

## Waiting for the founder
1. Sign in to claude.ai in the built-in browser pane, so the checks can see cloud lanes (P-339).
2. Later: the Acrobat grant for B99 (asked when #1052 lands).

## Leads, in order (highest = current)
**Lead 20** `local_fd377295-8ebb-4918-ab1a-180389866716` (from ~03:15 IST) · standby **Lead 21** `local_85990855-843e-4ee4-ba7c-5c5f4049319e` · **Lead 19** `local_8acced9f-c0a1-4b80-b010-d655c20778fe` ended at about 330k · Lead 18 (Ollama, ended 02:20 IST) · Leads 1-17 on earlier accounts. Hand over at about 400k (P-314).

## Founder asks of 6 Nov (A176-A198: `history/STATE-2026-11-06-0220-lead18.md`)
**A199** (~02:07 IST) what was done on the other account and what not; why M2 keeps failing (58 → 57); too many tokens; M2 in 3-4 hours, M3 in 24; strategy with lanes, standbys, cloud; what is needed from him; speed first without lowering quality: answered in chat; lanes started; P-369 ✓ · **A200** (~02:20) connected to his GitHub repo? Yes: fetch and API reads work from the Mac; the GitHub plugin inside Claude fails to connect (not used); cloud proven by the first cloud lane's push ✓ · **A201** (~02:25) M3 tonight: "B104 now, sprint at 60" (P-369) ✓ · **A202** (~02:25) Mac stays awake; signed in to claude.ai (verified: claude.ai/code reads as text); Acrobat approved up front (granted to Lead 19 ~02:25 IST); check what Ollama changed, overnight lessons, approvals up front, hourly plan: P-370, plan above ✓ · **A203** (~02:35) why 10-12 hours for two capabilities; Lean/Six Sigma; standby builders: answered (queue waits and redone checks, stacking B99/B115, warm fix-1052 lane as standby) ✓ · **A204** (~02:45) are we rebuilding, save and resume, M3 at scale: measured, P-371 ✓ · **A205** (~02:55) tokens burned while checking; final way; 150+ capabilities: answered ✓ · **A207** (~03:05) Acrobat for Lead 21 too, more standbys if needed, mind tokens: done, no extra lanes needed ✓ · **A208** (~03:08) truth about Leads and GitHub: answered (work and decisions on GitHub; slow patterns need daily numbers) ✓ · **A209** (~03:10) fix all of these: P-372 ✓ · **A206** (~03:00) make the flow change right away; does an M3 bug reopen M2; visual summary of decisions and how we know it works: flow-fix lane started, merges after M2; visual given ✓

## Lessons (5 Nov lessons: earlier page in history)
* 6 Nov: a lane failed to start on disk (needs 5.4 GB free per new copy); check `df -h /` before every start, and clean merged worktrees by day, not at night: the sandbox refuses deleting them, so it needs the terminal, which asks the founder.
* Why M2 stalled 16 hours (P-360's evidence): stacks of about 8,700 lines open 14-15 hours; batches failing when PRs were first combined; qa finding real Majors at the gate; records PRs outnumbering product PRs 34 to 19; two account switches and the Ollama detour. Small PRs that land fast and walks on `main` are the fix (P-360).
* Token burn: Leads reached 400k+ in about 2 hours by re-reading a 34 KB STATE and long PR threads; long lanes (960k); no prompt caching on the Ollama route (about US$50). Keep STATE one page and checks reading only what changed.
