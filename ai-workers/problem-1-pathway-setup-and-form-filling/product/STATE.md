# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: local_f02fdadd-e9b5-4e80-8dc0-b0bb01dda46e Lead 31 · 7 Nov 15:45 IST (took over from Lead 30 at ~395k context, P-314)

updated: 2026-11-07 15:55 IST by **Lead 31** (took over 15:45 IST) · milestone: **M2 60/60 holds; M3 clock from 23:17 IST 6 Nov: M3 is now 28 capabilities (P-406: the 17 plus 11 from the coverage audit); 4 Works (C1.3, C11.5, C6.9, C8.2, on qa's #1238 merging)** · rules: **`RULES.md`** + DECISIONS P-354 to P-408 · **this block's plan: `design/next-12-hours-2026-11-07.md`; the 11 new rows: M3 plan's 7 Nov section** · earlier page: `history/STATE-2026-11-07-1555-lead31.md` · this branch: `lead/2026-11-07-lead30`

## Lead 31 progress (15:55 IST)
* Check cron **4b7708bc** (:13/:43, prompt exactly `run lead-watch; read STATE Start here`). Weekly **10% at 15:53 IST**; Lead 31 context 142k.
* **#1238 labelled 15:46 IST** (Approve 6221a4f54, green). **#1221 (B3) labelled ~15:48 IST** (Approve 40319be52, green; P-402); its lane then takes B129, B132.
* **#1222 (A6) answered 15:52 IST:** round 3 diff-only by the same reviewer after CI is green; two code-cause reds: `check_case_feed` ("worked-out value" on neither audit list) and `check_b83_undo_withdraw` (C4.11 M7 now refused on 3 problems; likely the PR's conditional-documents sample).
* **#1054 (A5):** Approve 65069b4b6 (notes-only head), CI on 714f5d77a still queued; schema change (P-278): the Lead reads the diff before any label.
* **Drift audit landed** (`reports/m3-screens-vs-boards-2026-11-07.md`): verdict **"Not yet"**. Real drifts: (1) C7.7's two-stage Prepare application tab (P-122) not built, the case is one stacked page; (2) C6.9 keeps "Eligibility / Likely" though P-236's words were released by P-316 (1), BACKLOG still says held; (3) C11.6 channel in its own panel, each form listed twice; (4) C7.6 "Nothing reaches IRCC unreviewed" beside a "Pass with a reason" button; (5) C8.2 fee receipt typed, not the IRCC page uploaded. Also: only C6.9 has a best-in-class study; B1, A2/QA-293, B124, B126 not on "For the founder" (P-392). **Ruled P-408 (16:05 IST): rows B147 (the tab, UX lane first), B148 (C6.9 words), B149 (C7.6 words, C8.2 upload); F8 below.** Post the audit and B147 on the UX lane's PR 1 when it opens; give B148/B149 to the next free lane.
* New lanes (UX, concepts, build): no push yet at 15:55 IST. C4 pushed `claude/zen-fermi-poiqv8` 15:34 IST, no PR yet.

## Hand-over to Lead 31 (15:45 IST): do first
**The founder is away until about 18:45 IST** (P-407): ask only if urgent; no call that can wait on a prompt (no writes under `.claude/`, no settings). He reads from his phone: report hourly in plain words against `design/next-12-hours-2026-11-07.md` §7, and say proactively what you need from him.
1. **#1238 (qa: C6.9 and C8.2 Works)**: Lead 30 posted `Reviewer: Approve 6221a4f54…`; **label when its CI is green** (records, P-385; the founder's auto-mode rule allows it, P-405: #1226 labelled 15:24 IST with no refusal). Then M3 Works = 4 of 28 (P-406).
2. **Drift audit (Lead 30's read-only subagent):** result file m3-screens-vs-boards (7 Nov) in the notes folder `~/Library/Application Support/Claude/side-session-notes/local_ef20bc85-3aec-48f2-8cb7-46a6f1a34023/`. Lead 30 forwards its summary when it lands. Post it on the UX lane's PR 1 and tell the founder in one line (verdict, and only real drifts).
3. **New lanes (P-407), cloud; read their PRs each check:** UX lane task_f4b1c488 (study → scorecard in EXPERIENCE.md and the screen-concept/screen-review skills → each M3 screen revised; **you approve each UX revision on its PR**, P-316 (3)); concepts lane task_9975ca96 (B135 → B144 → B141; **you approve each concept**); build lane task_404185d0 (B140 → B137 → B142). Also C4 task_3a2d7beb (**you approve each pack's changed lines**, P-400) and B131 task_32589e77 (may merge ahead, P-214).
4. **B3 #1221:** its lane takes B129 then B132 after its label (comment posted 15:43 IST). **C2 #1075** restarts only in a new session after #1223 and #1225 merge: at the founder's next typed turn.
5. **Burn:** weekly 9% at 15:42 IST, about 4%/h, up to about 5%/h with the new lanes; trip-wires (P-399, P-403): 3 of the next 10 batches fail, or weekly over 50% by 22:00 IST → back to 7 builders. At about 4-5%/h the week's plan lasts about a day (resets 13 Nov 04:29 IST): tell the founder at his return, with options.
6. **Records PR #1240 (Lead 30, head b88aad693):** the Approve line on its own records PR was **refused as Self-Approval at 15:43 IST even under P-405**: the rule covers labels and dispatches, not self-approval. Do not approve or label it for Lead 30 (that would route a refused write); the founder names it ("label 1240") at his return. Until then add records on this same branch (it is not labelled), or start `lead/2026-11-07-lead31` from `origin/main` after it merges.
7. **Standbys:** Lead 32 (watchdog, first standby), Lead 33 (spare). Two standbys, so no new one is needed until the next hand-over.

## Account switch, lessons of 7 Nov
Word for word in `history/STATE-2026-11-07-1555-lead31.md` (account switch done 12:35-13:11 IST; Lessons, Leads 25-29).

## For the founder (P-390: asked at his next typed turn, oldest first, one at a time)
F1, F3, F4, F5 answered (P-391, P-393, P-396, P-403; rows in `history/STATE-2026-11-07-1545-lead30.md`); F7 answered (P-406; row in `history/STATE-2026-11-07-1555-lead31.md`).

| # | Question | Lead's recommendation | Blocks | Since | Status |
|---|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with `reports/best-in-class-C6.9-A4-2026-11-07.md` | changes become follow-up rows | nothing | 7 Nov 08:35 | open: qa's walk screenshots landed with #1199 |
| F6 | A hard boundary for `.github/**` changes: a Mergify condition (a GitHub approving review or a founder-only label) or a CODEOWNERS ruleset (#1232's breaker Blocker 1) | after B134 lands, a Mergify condition | nothing now (B134 is the interim) | 7 Nov 15:25 | open |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representative's tab, B124, B126) with the drift audit (`reports/m3-screens-vs-boards-2026-11-07.md`) | show with B147's tab; no decision needed now | nothing | 7 Nov 16:05 | open (P-408) |

## Start here (next Lead)
**Roles (P-384):** the founder gives product direction only; the Lead owns the pipeline. Every label needs a PR comment line `Reviewer: Approve <head sha>` (label guard). Records-only PRs: the Lead labels after reading the diff (P-385); `records` queue. GitHub: curl + `gh auth token` with `allowed_domains` (P-363). Times only from `TZ=Asia/Kolkata date`. Notes: `~/Library/Application Support/Claude/side-session-notes/lead10-saved-2026-11-05/` (never a folder named for a session); Lead 26's are in `history/lead-notes-2026-11-07/`.
**Auto-mode rule (P-405, ~15:15 IST):** `~/.claude/settings.json` `autoMode` now allows the Lead's labels on Approve + green CI, its own records-only PR approval and label, and nightly.yml dispatch on main. First use is the test: on a refusal, ask the founder in one line as before and note it in DECISIONS. **Standing OK (P-402, 14:30 IST):** the Lead labels approved green PRs and dispatches re-tests on main without naming each. **Was refused before P-405:** the Lead's Approve and label on its own records PR (Self-Approval); try under P-405 first, then the founder names it ("label <n>"). **Permission check (7 Nov):** never route a refused write through a lane. Never route a refused write through a lane, and never split a refused command to retry it (12:39 IST: refused as a bypass).
**Stall guard (P-388, P-389):** no prompt-waiting call while the founder is away; `lead-watch.sh` ACT when the last check is over 40 min old. Watchdog: first standby (Lead 32).
**Never run guard/test suites in the main copy** (7 Nov 09:18 incident): scratch clone only, deleted after.
**To-do, in order:**
1. Check (:13/:43, prompt exactly `run lead-watch; read STATE Start here`, cron 2be371d8).
2. **Lanes, counted only after a push:** B124 #1197, B126 #1212 (the Lead labels these two; their briefs say so), C9, C3, B3, A6, B127 (these label themselves after Approve, P-277). Read their PR comments each check. Label on an Approve line for the exact head + green CI.
3. **qa:** #1220 (head 8f1d6193e, main ecbd68301): C6.11 and C8.1 Partial, P-339 met; QA-296 confirmed, new QA-299, QA-300. Label after reading the diff and CI, once the founder gives the OK. **B107 needs a lane at his next typed turn (P-400).** Then: dispatch C8.2 C6.9 on the checkpoint after B126 and B124 land.
4. **P-388 measurement:** 2 failed of the first 10 batches after 09:19 IST (23113b92e5 the C1 and A3 clash; 0f532b98fc not read yet): 20%, over the 10% bar. `flow-measure.py` hit a rate limit today: read `actions/workflows/ci.yml/runs` directly. Trip-wire: P-399.
5. **Hourly report** against `design/next-12-hours-2026-11-07.md` section 7 (P-399); halfway review 20:00 IST, block review 02:00 IST.
6. **Records:** #1229 labelled 14:32 IST (records queue). **Do not push to `lead/2026-11-07-lead29` while #1229 is queued** (a push drops the label); later commits go on a new lead branch after it merges.

## Where we are (15:45 IST)
* M3: 28 capabilities (P-406); Works 4 on qa's #1238 (C1.3, C11.5, C6.9, C8.2). Merged since 13:11 IST: A3 #1198, B124 #1197, B126 #1212, records #1229. Queued: C3 #1225, B127 #1224, qa #1226. Spend today US$0. The 13:11 IST page is word for word in `history/STATE-2026-11-07-1545-lead30.md`.

## In flight
**qa's lane:** `local_0868d426-…`; #1226 (head c237fef9f, QA-235 closed, QA-153 rewritten) gets the P-401 wording, then the Lead reads and labels. QA-228's retest goes with C8.2 and C6.9. C6.9 and C8.2 go to it when they land.
| Lane | Where | Row → next |
|---|---|---|
| B124 #1197 | Labelled 14:16 IST on Approve e3a7d5522, C6.9 20/20 | queue; lane done |
| B126 #1212 | Labelled 14:16 IST on Approve 708eae6ba, C8.2 17/17 | queue; lane done |
| C9 QA-246 (cloud) | #1223 | C7.7 forms waiting on an answer |
| C3 (cloud) | #1225 labelled 14:29 IST | lane ends at the label |
| C4 (cloud) | task_3a2d7beb, requested 15:04 IST (P-404) | C7.6 → C9.2 → C11.6 → C7.7, the Lead approves pack lines before each label |
| B3 → B129 | #1221 (Lead pushed 642d02d61) | after its label, B129 as warm row (P-341) |
| B131 (cloud) | task_32589e77, requested ~15:16 IST (P-405) | gate B NOT TESTED; may merge ahead (P-214) |
| Lead 33 (Mac) | `local_b49efef4-ce4b-4e6d-b821-507aac4b653b` | standby |
| B3 (cloud) | #1221 | sign and scan by screens, QA-251 |
| A6 B102 (cloud) | #1222; concept approved 14:17 IST | calculated age, C6.4, QA-226 |
| B127 QA-296 (cloud) | #1224 |
| B107 (cloud) | task_fb1531a2, started ~14:28 IST | QA-296, QA-299, QA-300: C6.11's path |
| Lead 32 (Mac) | `local_e0d03eb0-39dc-4371-abd7-d2a23216aaf3` | standby + watchdog (after Lead 30 messages it) | representative's names on IMM 5475 |
| Canary (cloud) | task_acca4ca2 | pushed; ends by itself |
| qa (Mac) | `local_0868d426-cf53-4883-b60b-59389b349a35`, started 13:13 IST | re-score C6.11, C8.1 on nightly 42352179701 |
| Lead 31 (Mac) | `local_f02fdadd-e9b5-4e80-8dc0-b0bb01dda46e` | **current Lead** from 15:45 IST |
| UX lane (cloud) | task_f4b1c488 (P-407) | study → scorecard → M3 screens |
| New-rows concepts (cloud) | task_9975ca96 | B135 → B144 → B141 |
| New-rows build (cloud) | task_404185d0 | B140 → B137 → B142 |

**Released 14:34 IST (P-403):** A5 #1054, C2 #1075, B5 (#1233), kind token then b78 (#1232); the old PRs off the critical path are listed in `history/STATE-2026-11-07-1545-lead30.md`.

## Leads, in order (highest = current)
**Lead 31** `local_f02fdadd-…` (from 15:45 IST 7 Nov) · Lead 30 `local_f37a22d1-…` (14:48-15:45 IST, ended) · Lead 29 `local_ef20bc85-…` (12:35-14:47 IST, ended) · Lead 26 `local_ab55f159-…` ended ~12:30 IST; Leads 27 and 28 were standbys on the old account, never led, deleted (P-396) · Lead 25 ended · Leads 1-24 earlier. Standbys: Lead 32 (watchdog), Lead 33.
