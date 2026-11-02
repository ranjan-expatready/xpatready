# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 10:45 UTC by the new account's tech lead · **finish plan agreed (P-264, P-265: wave 1 = 5 cloud builders + qa; M2 gate 59/60 with held parts named); wave 1 waits for a message typed in the desktop app (sessions cannot start over Remote Control)** · plan `design/finish-plan-2026-11-02.md` · earlier: **restart page for a NEW account: soft close done (P-262)**: every lane of the old account finished its row, pushed and left a Handover; the founder now logs in with a new account. Cloud sessions of this account cannot be continued: everything below is on GitHub. · milestone: **M2 — Super Admin configuration** (60 rows, P-240, P-255) plus the Visitor visa M3 path · how we work: `WAY-OF-WORKING.md` (P-224, amended by P-228, P-231, P-250, P-259) · decisions to read word for word: DECISIONS P-246 … P-259

## Start here (fresh `/lead` on the Mac, new account)
0. **First job (P-260, founder): before starting anything, share the finish plan with the founder and discuss it** (every M2 row not Works: blocker, lane, owner, order, parallelism, estimates; lanes = Track A paid-AI data, Track B product gaps, qa scoring, shared services SH2/SH3 and G-CORE, gates G1–G4). **After the founder's OK, launch one long-running orchestrated program** (multi-agent, parallel lanes, running for hours until M2 is 60/60) under P-225, P-227, P-250, P-251, P-254, P-257, P-259. **The plan also covers M3 (P-261):** each M3 row joins a parallel lane only when its stage is ready (SH3 resolver contract for C6.5, C7.7, C8.1, C8.2, C7.5; the product owner's ruling for held rows; its M2 base merged); no forced starts, no session without a ready row, every token used well.
1. `bash product/tools/lane.sh whoami` → lead; read DECISIONS P-246…P-259 word for word, then this page and the lead skill.
2. Start the watch: `bash product/tools/flow-watch.sh` every check (a Monitor loop every 180 s prints new RED lines); every check opens with the session list (P-259); records merge directly only when no Mergify draft is checking; never label a records PR.
3. Start sessions **from the desktop app** (none start over Remote Control), in this order: the **paid-AI tracks** below, then qa, then the open-PR owners.

## Progress (qa scores on main, 09:50 UTC)
M2 **40/60 Works**, 1 built awaiting qa, 15 partial, 4 not built (gates G1, G2, G4, G5; G3 merged) · R1 7/8 · M3 **2/17 Works**, 2 built awaiting qa, 5 partial, 8 not built. **40 PRs merged 05:20–09:50 UTC (29 product)**, among them Reset to the six (D1), Live or Saved parts 1, 2 and 4 (D2), the eligibility check complete (C6.9), document storage (C6.4), fees as data (R2), the Demo release mark (G3), the first **Saved AI result for Visitor visa** (C2.6, #485). AI spend today **US$0.504** (one run). Dates (*estimates*): M2 gate about 11–12 Nov (P-255).

## The 8 M2 rows blocked on paid AI runs: two parallel tracks (first thing on the new account)
Rows: C2.6, C3.4, C4.7, C4.11, C9.1, C11.7 (8 forms, R-146), C11.8, C11.15. Money is approved (P-232: US$25 a day; R-146 up to US$50; today US$0.50 spent). The flow per run is fixed: **job PR → stub → live on the Mac paid runner with the tech lead's Go → tech lead verifies (quotes in the inventory, contract-valid) → qa verdict on the result PR (P-227) → merge**. C2.6 went through it in about 3 hours (#468, #485).
* **Track A, data (one forms builder "ai-runs" + the Mac paid runner + one qa):** batch the job files: one PR with every remaining job (C3.4 sections/rules/answer lists, C4.7 PQR picks, C4.11 step 5, C9.1 impact, R-146's 8 field maps IMM 1294, 5646, 5710, 0008, 5406, 5562, 5532, 5604), each with its usual and worst cost; the tech lead gives one Go per run in sequence; results go into one PR per row; qa checks each. Use `.tools/node-v24.21.0` (launch.ts does nothing on Node 23).
* **Track B, product gaps (one fresh builder per row, in parallel):** C3.4's AI step in the app; C4.7's picks screen (draft, accept, remove); C4.11's live wiring; C11.8's progress, Stop and live cost on a real run (QA-98, QA-106, QA-111); C11.15's Majors QA-101–103 (forms-4, K11). Each consumes Track A's saved result (Live or Saved, P-227).
* **C10.1** closes when Visitor visa is released with its saved results (D3).

## Open PRs at the close (09:50 UTC) — each has a Handover comment with its next command
| PR | What | Next |
|---|---|---|
| #493 | R3, a minor's travel answers (runtime) | approved; Mergify merges it on green |
| #469 | QA-82 (screens) | approved after its C4.11 check fix; Mergify merges it on green |
| #478 | C11.12 PR 2 (migration, SQL read OK) + PR 3 (screen) | reviewer on the head, then the label; split if the reviewer asks |
| #495 | T1 part 1, speed budgets (runtime) | review, then the label; T1 part 2 is the full run on GitHub |
| #417 | D3 spend plan (draft) | the paid-run log; Track A continues from it |

**Rows to pick up, from each lane's Handover (checked by the tech lead at 09:50 UTC; read the Handover before starting, so nothing is redone):**
* **D4 and S4 are BUILT and APPROVED, not yet in PRs** (runtime-5): branch `claude/friendly-newton-urm088` at 81e799bf. D4 = commits 5b4dca12…0790d975 (reviewer Approve, 9/10), S4 = a4d361db…81e799bf on top (Approve, 8.5/10). Open D4 first from 0790d975, then S4; the exact commands are in the Handover on #484. **Do not rebuild them.**
* **C11.12 PR 2 + PR 3** are both on #478's branch (head e291b8c7), which conflicts with main; the next steps are in #478's Handover (resolve, reviewer on the head, label). The SQL of PR 2 is already read OK.
* **D2 part 3 needs no code** (already true on main, forms-1 on #475); D2 is done. forms' next row: C4.11 part 4b, **answered by the tech lead on #390** (option (b)).
* **K11 (C11.15 Majors QA-101–103) is verify-only:** fixed by #274 and closed by qa on 1 Nov (forms-4 on #482); `/next forms K11` only confirms.
* **C11.14** leftovers and **S7** (forms-2, Handover on #477) · **G1** source register (screens-1, answers on #469) · **T1** part 1 #495 needs the reviewer, then part 2 (runtime-4) · **R3** #493 approved, merging.

## Sessions
All lanes of the old account are closed (P-262). The Mac sessions (paid runner, evidence, SA-01B review, old Lead) are archived and the evidence worktree is removed (13 GB free). **The founder archives the cloud sessions on claude.ai/code** (the list is in the founder's message of 2 Nov 09:50 UTC). On the new account start sessions from the desktop app, never over Remote Control.

## Holds (P-251, the product owner of SA-01B): nobody builds these
L-SA3 (ready to file) · L-SA6–L-SA11 · G5 · the P-236 rename · C11 · E1–E6 (extension) · design-only items (pin per filing, several combinations per case, organisation subject, scopes, whose fact) · SH3/SH4 contracts go to the product owner with them. The founder sends the reply drafted by the SA-01B session.

## Waiting for the founder
1. **Log in with the new account at the stop** and start the sessions above from the desktop (Track A first).
2. **Send the reply to the SA-01B product owner**: the draft is on the Mac at `archive/2026-11-02-founder-drafts/` (it names a person, so it is never pushed).
3. **Archive on claude.ai/code** the stopped cloud sessions ("runtime: #336…", "runtime: Visitor visa path…", forms-3, runtime-4, qa-m3) and, on the Mac, the old Lead, SA01B and evidence-c72 sessions once the paid runner is done (its worktree `exciting-pascal-e76970`, 3.8 GB, then frees disk: 9.7 GB free now, alarm under 10).
4. **Public repository (P-263):** kept public for now with the exposure known (commercial documents and the team's requirements copy are readable); revisit private when the founder asks.
5. **Tell the team** they drop their "Fill this screen" (P-245), pending the product owner's ruling.

## Founder asks of 2 Nov (all answered; P-228 (9))
A31 finish plan (P-260 step 1): shared, "Launch as planned" (P-264) ✓ · A32 held rows in the M2 gate: "59/60, held parts named" (P-265) ✓ · A33 launch wave 1: blocked, needs a message typed in the desktop app ·
A3 Reset to the six: merged #407 · A4 Live or Saved: part 1 merged #435, parts 2–4 forms-1 · A5 Visitor visa saved for demos: C2.6 saved (#485), the rest is Track A · A16 SA-01B review: P-235–P-252 · A15/A23 close: P-257 · A17 qa before merge: P-250 · A18 holds: P-251 · A19 keep and fix: flow-watch, hourly records · A20 guarded change: P-253 · A21 big-impact rule: P-254 · A22 M3 wave after the reset (C7.7, C8.1, C8.2, C6.5, C7.5; the account switch may start it earlier) · A24 shared services: P-258 · A25 no idle builder: P-259 · A26 replacements: Track A and B sessions above · A30 at the close, close **every** lane of this account (all builders, qa, the paid runner and the Mac helpers) once each has pushed its work and left a Handover; nothing stays open for the new account (founder) · A29 at the close, archive the paid runner, evidence-c72, the old Lead and SA01B on the Mac and remove the `exciting-pascal-e76970` worktree (founder: "Yes, at the close") · A28 plan M3 in parallel at the right stage, use every token well: P-261 · A27 finish everything fast, discuss first, then a long-running parallel program: P-260, the next tech lead's first job.

## Lessons of 2 Nov (memory and lead skill)
Records merges and pushes to queued records PRs reset Mergify's batches: batch records, merge when quiet, never label them · watch sessions, not only PRs; a cloud builder pushes only to its own branch, so parallel work needs one session per row · a broken check on main fails every batch: quarantine under P-214 at once · state the time, cost and quality impact before recording a choice (P-254) · numbers from tools, never from prose.
