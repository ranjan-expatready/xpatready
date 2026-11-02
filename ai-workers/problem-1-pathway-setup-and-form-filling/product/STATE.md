# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-02 08:55 UTC by the tech lead "LeadX" (took over 05:20 UTC) · **restart page for a NEW account (P-257)**: the weekly plan stops builders at 95% (about 09:50 UTC, *estimate*); the founder then logs in with a new account. Cloud sessions of this account cannot be continued: everything below is on GitHub. · milestone: **M2 — Super Admin configuration** (60 rows, P-240, P-255) plus the Visitor visa M3 path · how we work: `WAY-OF-WORKING.md` (P-224, amended by P-228, P-231, P-250, P-259) · decisions to read word for word: DECISIONS P-246 … P-259

## Start here (fresh `/lead` on the Mac, new account)
0. **First job (P-260, founder): before starting anything, share the finish plan with the founder and discuss it** (every M2 row not Works: blocker, lane, owner, order, parallelism, estimates; lanes = Track A paid-AI data, Track B product gaps, qa scoring, shared services SH2/SH3 and G-CORE, gates G1–G4). **After the founder's OK, launch one long-running orchestrated program** (multi-agent, parallel lanes, running for hours until M2 is 60/60) under P-225, P-227, P-250, P-251, P-254, P-257, P-259. **The plan also covers M3 (P-261):** each M3 row joins a parallel lane only when its stage is ready (SH3 resolver contract for C6.5, C7.7, C8.1, C8.2, C7.5; the product owner's ruling for held rows; its M2 base merged); no forced starts, no session without a ready row, every token used well.
1. `bash product/tools/lane.sh whoami` → lead; read DECISIONS P-246…P-259 word for word, then this page and the lead skill.
2. Start the watch: `bash product/tools/flow-watch.sh` every check (a Monitor loop every 180 s prints new RED lines); every check opens with the session list (P-259); records merge directly only when no Mergify draft is checking; never label a records PR.
3. Start sessions **from the desktop app** (none start over Remote Control), in this order: the **paid-AI tracks** below, then qa, then the open-PR owners.

## Progress (qa scores on main, 08:41 UTC)
M2 **40/60 Works** (34 at 05:20), 16 partial, 4 not built (gates G1–G4) · R1 7/8 · M3 1/17 Works, 7 partial (C6.9 and C6.4 just merged, not yet scored). 26 PRs merged 05:20–08:50 UTC (17 product). AI spend today **US$0.50** (C2.6). Dates (*estimates*): M2 gate about 11–12 Nov (P-255).

## The 8 M2 rows blocked on paid AI runs: two parallel tracks (first thing on the new account)
Rows: C2.6, C3.4, C4.7, C4.11, C9.1, C11.7 (8 forms, R-146), C11.8, C11.15. Money is approved (P-232: US$25 a day; R-146 up to US$50; today US$0.50 spent). The flow per run is fixed: **job PR → stub → live on the Mac paid runner with the tech lead's Go → tech lead verifies (quotes in the inventory, contract-valid) → qa verdict on the result PR (P-227) → merge**. C2.6 went through it in about 3 hours (#468, #485).
* **Track A, data (one forms builder "ai-runs" + the Mac paid runner + one qa):** batch the job files: one PR with every remaining job (C3.4 sections/rules/answer lists, C4.7 PQR picks, C4.11 step 5, C9.1 impact, R-146's 8 field maps IMM 1294, 5646, 5710, 0008, 5406, 5562, 5532, 5604), each with its usual and worst cost; the tech lead gives one Go per run in sequence; results go into one PR per row; qa checks each. Use `.tools/node-v24.21.0` (launch.ts does nothing on Node 23).
* **Track B, product gaps (one fresh builder per row, in parallel):** C3.4's AI step in the app; C4.7's picks screen (draft, accept, remove); C4.11's live wiring; C11.8's progress, Stop and live cost on a real run (QA-98, QA-106, QA-111); C11.15's Majors QA-101–103 (forms-4, K11). Each consumes Track A's saved result (Live or Saved, P-227).
* **C10.1** closes when Visitor visa is released with its saved results (D3).

## Open PRs and owners (08:50 UTC) — the next step of each
| PR | What | State → next |
|---|---|---|
| #485 | D3: saved C2.6 reading of IMM 5484 (US$0.504) | waits for **qa's verdict** (P-227), then the tech lead labels it |
| #484 | C7.7 part 1, PDF copy (runtime-5 took over #357) | approved; queues when green; close #357 after it merges |
| #482 | S2 trial per edition (forms-4) | queued |
| #478 | C11.12 PR 2, migration (c1112) | SQL read OK by the tech lead; approved; queues when green; then PR 3 ("What a case gets") |
| #477 | C11.14 part (forms-2) | queued |
| #471 | G3 Demo release mark (screens-1) | queued; next G1 (source_entry table, answers on #469) |
| #469 | QA-82 (screens-1) | approved |
| #455 | R2 fees as data (runtime-4 stopped) | queued; any fix → a fresh runtime session |
| #436 | spouse samples (screens-1) | conflict resolved by the tech lead; needs the reviewer on its head and the label |
| #463, #453 | qa records (P-250 verdicts) | merge directly when green and the queue is quiet; never labelled |
| #417 | D3 spend plan (draft) | keep as the paid-run log |

## Sessions (this account; re-create on the new one)
Builders: runtime-3 (D1 check fix merged #479 → R3), runtime-5 (#484 → D4 → S4), forms-1 (D2 parts 2–4), forms-2 (C11.14 → S7), forms-4 (S2 → K11 → S9 done), screens-1 (QA-82, G3 → G1 → K-rows scored by qa), c1112 (C11.12 PR 2 → PR 3). qa: P-250 verdicts, then the fast-close list (C4.5, C3.12, C11.13, C11.3, C2.12, C11.10, C4.1). Stopped at their limits: forms-3, runtime-4, qa-m3. Mac: paid-runner (waits for a Go), demo at :4400.

## Holds (P-251, the product owner of SA-01B): nobody builds these
L-SA3 (ready to file) · L-SA6–L-SA11 · G5 · the P-236 rename · C11 · E1–E6 (extension) · design-only items (pin per filing, several combinations per case, organisation subject, scopes, whose fact) · SH3/SH4 contracts go to the product owner with them. The founder sends the reply drafted by the SA-01B session.

## Waiting for the founder
1. **Log in with the new account at the stop** and start the sessions above from the desktop (Track A first).
2. **Send the reply to the SA-01B product owner** (draft by the SA-01B session; it names a person, so it is not in the repository).
3. **Archive on claude.ai/code** the stopped cloud sessions ("runtime: #336…", "runtime: Visitor visa path…", forms-3, runtime-4, qa-m3) and, on the Mac, the old Lead, SA01B and evidence-c72 sessions once the paid runner is done (its worktree `exciting-pascal-e76970`, 3.8 GB, then frees disk: 9.7 GB free now, alarm under 10).
4. **Tell the team** they drop their "Fill this screen" (P-245), pending the product owner's ruling.

## Founder asks of 2 Nov (all answered; P-228 (9))
A3 Reset to the six: merged #407 · A4 Live or Saved: part 1 merged #435, parts 2–4 forms-1 · A5 Visitor visa saved for demos: C2.6 saved (#485), the rest is Track A · A16 SA-01B review: P-235–P-252 · A15/A23 close: P-257 · A17 qa before merge: P-250 · A18 holds: P-251 · A19 keep and fix: flow-watch, hourly records · A20 guarded change: P-253 · A21 big-impact rule: P-254 · A22 M3 wave after the reset (C7.7, C8.1, C8.2, C6.5, C7.5; the account switch may start it earlier) · A24 shared services: P-258 · A25 no idle builder: P-259 · A26 replacements: Track A and B sessions above · A30 at the close, close **every** lane of this account (all builders, qa, the paid runner and the Mac helpers) once each has pushed its work and left a Handover; nothing stays open for the new account (founder) · A29 at the close, archive the paid runner, evidence-c72, the old Lead and SA01B on the Mac and remove the `exciting-pascal-e76970` worktree (founder: "Yes, at the close") · A28 plan M3 in parallel at the right stage, use every token well: P-261 · A27 finish everything fast, discuss first, then a long-running parallel program: P-260, the next tech lead's first job.

## Lessons of 2 Nov (memory and lead skill)
Records merges and pushes to queued records PRs reset Mergify's batches: batch records, merge when quiet, never label them · watch sessions, not only PRs; a cloud builder pushes only to its own branch, so parallel work needs one session per row · a broken check on main fails every batch: quarantine under P-214 at once · state the time, cost and quality impact before recording a choice (P-254) · numbers from tools, never from prose.
