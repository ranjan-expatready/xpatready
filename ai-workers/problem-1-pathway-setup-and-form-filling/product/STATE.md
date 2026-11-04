# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-04 09:25 IST by **Lead 2 · 4 Nov 00:58 IST (ended)** at 54% of its context; **Lead 3 takes over** (P-286, P-314) · milestone: **M2 — Super Admin configuration** · rules: **`RULES.md`** (as of P-318) · earlier STATE: `history/STATE-2026-11-04-0058.md` (Lead 1's hand-over), `history/STATE-2026-11-03.md` · audit `reports/bottleneck-audit-2026-11-03.md` · RCIC walk report in #782 · gap triage report in #786

## Where we are
* **M2: 43/60 confirmed** (qa); re-scores of this morning's merges running on three qa testers. **M3: 2/17.** R1 6/8 (`tools/progress.sh`).
* **Merged 4 Nov:** #792 (P-214 r146 fix), #781 (C9.1 paid result), #786 #782 #749 #737 (records), batch 3 at 09:07 IST: **#790 (QA-199 Critical, C3.8)**, #793 (QA-184, C11.10, C5.4, answers QA-129), #788 (C7.5, M3), #784 (C6.5, M3), #745 (test-database prune tool).
* **RCIC verdict (#782, merged): an RCIC cannot file a Visitor visa family case today**: no setup-to-case path at US$0 (QA-144), "ready" with 13–14 IRCC-mandatory IMM 5257 fields empty, missing documents and conditional forms, no Prepare application screen.
* **Paid AI:** ledger US$70.48 of the US$120 code cap; **4 Nov cap US$30** (founder ~08:05 IST: "approval for the build cap … whatever is required"); nothing spent yet today. IRM 0002 map (worst ~US$5.84) waits for the IMM|IRM row.
* **CI:** repo **public** since 4 Nov (founder; fork PR runs need approval for all external contributors, Mac runners reachable only from main/schedule/dispatch; never approve an outside PR's run). **SHARDS=6** (founder, ~09:10 IST). Batches take ~28 min on 4 shards (8 batches measured); watch the first 6-shard batch for order-dependent clashes. Founder confirms GitHub **Pro**.
* **Disk: 5.2 GB free at 09:20 IST.** Databases are only 2.1 GB (prune dry run: 10 stale). Worktrees ~19 GB; candidates listed to the founder; **founder: nothing should be deleted** without his OK. `caffeinate` runs to ~23:10 IST.

## Founder direction, 4 Nov (P-317)
QA-144 first, then the other M2 partials; no new M3 rows until M2 reaches 55; gates B (CI) and A (qa partner, capability-completing PRs only); a qa lane every day; auto-mode rules run by the founder (`tools/add-automode-rules.py`). Measure on 6 Nov 08:00 IST: demotions ≤1 a day, product PRs per net Works row ≤4.

## Running now (09:25 IST)
| Session | Work | State |
|---|---|---|
| Builder 8 `local_bf2f3e98-a1cd-4531-be64-10d68509d8ff` | #794 QA-180 (C6.1, C5.1, Critical): conflict resolved, ed077a2eb labelled; **QA-144** #798 slice 1 Visitor visa (walk + review), then DEMO.md row 17 in the checkpoint (QA-207, makes C9.1 reachable), then slice 2 With an LMIA | rulings P-318 (6); IRM 0002 conditional, family form by channel; QA-180 strict for conditional forms; DEMO.md row 9 → IMM 5645 online |
| Builder 7 `local_b1ab169d-a645-45a0-be4c-a6036bc002fe` | #802 QA-196 (C3.4 landers) labelled; now the **IMM\|IRM edition row** (Opus + breaker, guard.ts), then **family forms into configuration** (founder's no-hard-coding order) | |
| Builder 2 `local_c3a6021a-9380-4dcb-b822-624488a35ef5` | #726 C11.13 queued; **QA-182** (C3.10 "box" words, 150dd3e69, review running), then **section titles from printed headings** (QA-206), then **IRCC checklist coverage check**, Visitor visa first | |
| Builder 1 `local_8b65d77f-acac-445e-89d3-e359bae9c600` | **#804 gate B**: round 3 (last) Opus on 7a08bbe10 + my timing-step removal 4b44fb1bc; then the **no-hard-coding guard** (ratchet) | the Lead commits ci.yml/product/tools lines (Builder 1's guard refuses them) |
| paid-runner `local_0c6484d1-a702-4a40-9f67-b03763beb4de` | #771 queued; #785 dequeued, #787 red: told at 09:20 IST to find out and fix; then IRM 0002 map | US$0 so far today |
| qa lane `local_7bb326e9-7911-4840-b6e0-d943982d6ffa` (#801) | the one writer of CAPABILITIES/BUGS; re-scoring C11.10, C5.4, QA-129, C3.8; copies qa-2/qa-3 verdicts | QA-205 Minor, QA-206, QA-207, QA-208/209 logged |
| qa-2 `local_e4f5a5d5-50ca-4358-874a-c09b4812113e` | C11.13, C11.14, C11.7, C3.4 (after #802 + #771), C3.10 | C9.1 Partial (#811) |
| qa-3 `local_d71e7c04-e9c3-4351-9af1-cf46400db2a3` | C6.5, C7.5 now; C6.1 and C5.1 when #794 merges; QA-144's capabilities; gate A partner | |
**Ports:** B1 4430–4434, B2 4435–4439, B8 4470–4479, qa-2 4480–4484, qa-3 4485–4489, qa 4490–4499; demo 4400.

## Leads, in order (highest = current)
**Lead 3 · standby** (`local_abb5875c-a982-41c1-b514-a2ee1d11b90b`) takes over at ~09:25 IST: renames itself, invokes `lead`, creates its 30-minute check · Lead 4 standby: card offered, not started (start it at the founder's next typed turn) · Lead 2 · 4 Nov 00:58 IST (ended, `local_a6443eb7-c1cd-48de-8719-c021d1f7c6c0`) · Lead 1 (ended). Lead 2's running notes: the side-session notes folder (file lead2-takeover-2026-11-04).

## Next (in order)
1. Merges: #794 (Critical), #726, #771, #802, #787, #785, then #804; qa re-scores each batch; M2 count from qa only.
2. QA-144 slices; DEMO.md row 17 (C9.1).
3. **Founder's CI direction (A84, 09:15 IST), Lead 2's evaluation and order:** (a) **fix the nightly** (S, 2–3 h): it runs every suite serially on the Mac with a 90-min timeout, and the full set now takes longer, so it ends "cancelled" (3 and 4 Nov) and also starts hours late; move it to GitHub's machines, sharded like CI; (b) **protected regression set** (S–M, ½–1 day, on gate B's runner): every batch runs each M2 Works capability's pack on the six; about 18 s per pack on GitHub, 3 at a time, so ~5 min for 43; needs a retry-once rule so one flaky pack can't block merges; (c) **quarantine owners and dates** (XS): check_c313_reuse_browser, check_cost_warning_browser, check_forms_c31_formats, check_forms_c36_rule_facts_browser, check_screen01_api; (d) **golden journey nightly** (M, 1 day): setup → release first (red until QA-144 lands, which is the honest signal), case and filled forms later (M3). Founder to confirm the order; then P-320.
4. No-hard-coding order (founder "Yes, this order", ~09:10 IST, P-319 tonight): guard (Builder 1) → family forms (Builder 7) → IRCC checklist coverage (Builder 2) → Study permit filings/checklist (M3, after M2 55) → fees and roles library tables + S7a screens (M3, design first); then the ~2-day cleanup of 44 form-number mentions.
5. After M2 reaches 55: M3 rows, starting with Prepare application and IMM 5257 mandatory-field coverage.
6. Close after their replacement merges: #669 (#771), #671 (#785); #714 if #794 covers it (its lane checks main first); #417 as stale.
7. Follow-ups: #745 R3-m1; check_forms_demo.ts leaves files in p2/jobs; B51 schedule Background questions; QA-205 edition labels (Minor); QA-208/209 Mac-only flakes.

## Waiting for the founder
1. **Disk (5.2 GB):** yes or no to freeing space without losing work: the old Devin explorer worktree `xpatready-devin` (1.1 GB, clean, branch on origin); the 10 stale test databases; and, once their PRs merge, `w726`, `wt794` and the paid-runner copies. Nothing is deleted without his OK.
2. **Confirm the CI order** in Next 3.
3. **Decide #786's five questions**, one at a time (first: add the six filing-risk items to M2, recommended yes).
4. Start the Lead 4 standby (card offered).

## Founder asks of 4 Nov (P-228 (9)); 3 Nov asks A62–A74: `history/STATE-2026-11-04-0058.md`
**A75** (~07:15 IST) detailed morning status, lessons, M2/M3 progress, hand-over or restart: answered in chat ✓ (keep going, no restart; hand over at ~400k) · **A76** (~07:20 IST) draft the auto-mode rules: drafted ✓, script `tools/add-automode-rules.py` ✓ · **A77** (~07:30 IST) why we missed, a stronger model (Fable), partial-first or parallel, confidence: answered ✓ (not a model problem; M2 first; M2 58–60 about 7–8 Nov, ~60%) · **A78** (~07:35 IST) "Yes, QA-144 first": Builder 8 ✓ · **A79** (~07:40 IST) "Label them now" (paid PRs): #781 #787 #771 #785 labelled ✓ · **A80** (~07:45 IST) evaluate the side chat's plan, explain auto mode and labels, do it on his behalf, next steps, M2/M3: answered ✓, "Yes, as amended" → P-317 ✓, qa lane ✓, records labels #782 #786 #737 #749 #745 ✓ · **A81** (~08:05 IST) blanket label approval, paid cap "whatever is required": cap US$30 ✓ · **A82** (~08:35 IST) one capability per hour: answered ✓ (testing is the bottleneck; two more qa testers ✓) · **A83** (~08:50 IST) repo public, Pro, free machines: SHARDS=6 ✓, Mac-runner risk checked ✓ · **A84** (~09:05 IST) no combination hard-coded: sized, order agreed ✓ · **A85** (~09:15 IST) CI direction (regression set, golden journey, nightly, quarantine): evaluated, order proposed (Next 3) · **A86** (~09:20 IST) close unused lanes and space, nothing deleted: inventory given, waiting for his OK.

## Lessons of 4 Nov
A merge label is a merge button: auto mode allows it only when the founder names the PR in that session, and never in a builder session · a re-run of a pull-request check re-uses the old merge snapshot; a fix on main reaches a PR only through a new push · builder sessions cannot close PRs · the Lead's messages stop after 10 per founder turn: put rulings on the PR · a self-reported "labelled" was false once: check GitHub · tests that pass alone and fail after another suite are a risk to every batch.
