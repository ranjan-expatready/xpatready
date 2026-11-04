# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-04 07:50 IST by **Lead 2 · 4 Nov 00:58 IST** (context 22%) · milestone: **M2 — Super Admin configuration** · rules: **`RULES.md`** (as of P-318) · earlier STATE: `history/STATE-2026-11-04-0058.md` (Lead 1's hand-over), `history/STATE-2026-11-03.md` · audit `reports/bottleneck-audit-2026-11-03.md` · RCIC walk report in #782 · gap triage report in #786

## Where we are
* **M2: 43/60 confirmed** (qa, 3 Nov 22:17 IST); no re-score since, because no qa lane ran overnight. **M3: 2/17.** R1 slice 6/8 (`tools/progress.sh`).
* **Night of 3–4 Nov:** 2 merges (#791 C6.12 step 24 fee lines; #792 the P-214 fix for check_r146's test-order fault). Merging stalled about 5 h: labels and PR comments refused by auto mode, the Lead's messages capped at 10 per founder turn, and check_r146 failing five PRs.
* **RCIC verdict (#782): an RCIC cannot file a Visitor visa family case today.** Blockers: no setup-to-case path at US$0 (QA-144), "ready" with 13–14 IRCC-mandatory IMM 5257 fields empty, missing documents and conditional forms, no Prepare application screen.
* **Paid AI:** about US$21 overnight (C9.1 US$0.32 #781, C11.7 US$4.66 #787, C11.14 US$0 #785); ledger US$70.48 of the US$120 code cap. P-313's US$150 cap was for the night only; **no cap is set for 4 Nov**.

## Founder direction, 4 Nov (P-317)
QA-144 first, then the other M2 partials; no new M3 rows until M2 reaches 55; gates B (CI) and A (qa partner, capability-completing PRs only); a qa lane every day; auto-mode rules run by the founder (`tools/add-automode-rules.py`). Measure on 6 Nov 08:00 IST: demotions ≤1 a day, product PRs per net Works row ≤4.

## Running now (07:50 IST)
| Session | Work | State |
|---|---|---|
| Builder 8 `local_bf2f3e98-a1cd-4531-be64-10d68509d8ff` | #794 QA-180 (C6.1, C5.1, Critical), then **QA-144** draft #798 (slice 1 Visitor visa) | #794 labelled, CI on the main merge 16588762a; #798 rulings given (P-318 (6)); IRM 0002 paid map waits for worst cases |
| Builder 7 `local_b1ab169d-a645-45a0-be4c-a6036bc002fe` | #790 QA-199 (C3.8, Critical), #793 QA-184 (C11.10, C5.4), then **QA-196** (C3.4 landers) | #790 fd87d003f, #793 c52fe5c62 labelled, CI running; QA-196 final suites |
| Builder 2 `local_c3a6021a-9380-4dcb-b822-624488a35ef5` | #784 C6.5 (M3, approved), #726 C11.13 (QA-192), then **QA-182** (C3.10 "box" words) | #784 labelled, main merged 316d558a8; #726 merging main, **needs the founder's label** |
| Builder 1 `local_8b65d77f-acac-445e-89d3-e359bae9c600` | #788 C7.5 (M3, approved), then **gate B** CI check (P-214) | #788 main merged 7f570e25e, review running; gate B PR number due 10:00 IST |
| paid-runner `local_0c6484d1-a702-4a40-9f67-b03763beb4de` | #771 C3.4, #785 C11.14 red CI (check_forms_c34_ai_live, check_c42_marking_browser) | merging main and reproducing; US$0 |
| qa lane `local_7bb326e9-7911-4840-b6e0-d943982d6ffa` | after-merge re-scores of everything merging today; gate A partner | started 07:47 IST, ports 4490–4499 |
**Labelled, waiting for green CI or a batch:** #794 #793 #790 #787 #786 #785 #784 #782 #781 #771 #749 #745 #737. **Ports:** B1 4430–4434, B2 4435–4439, B8 4470–4479, qa 4490–4499; demo 4400.

## Leads, in order (highest = current)
**Lead 2 · 4 Nov 00:58 IST** (`local_a6443eb7-c1cd-48de-8719-c021d1f7c6c0`, current) · **Lead 3 · 3 Nov · standby** (`local_abb5875c-a982-41c1-b514-a2ee1d11b90b`) · Lead 4 standby: card offered, not started · Lead 1 (ended).

## Next (in order)
1. Merge the labelled PRs; qa re-scores each batch; M2 count updated by qa only.
2. QA-144 slices (Visitor visa, LMIA, Study permit, Express Entry after #787, Spouse after #787).
3. Gate B (Builder 1), gate A via the qa lane.
4. M2 partials by holding bug: QA-196 (C3.4), QA-182 (C3.10), QA-162 (C4.11, C4.7), QA-176 (C11.14), then C1.6 and C5.1 (G5).
5. After M2 reaches 55: M3 rows, starting with the Prepare application screen and IMM 5257 mandatory-field coverage (RCIC walk).
6. Close after their replacement merges: #669 (#771), #671 (#785); #714 if #794 covers it; #417 as stale.
7. Follow-ups: #745 R3-m1 (stop and prune should match the copy's own server, not any studio server); `check_forms_demo.ts` should not leave files in `p2/jobs`; B51 schedule Background questions.

## Waiting for the founder
1. **Run once:** `python3 ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/add-automode-rules.py` (adds the P-317 auto-mode rules to `~/.claude/settings.json`, with a backup); restart builder sessions after.
2. **Label #726** once green (the classifier refuses the Lead without the PR named). Archive the Lead 1–8 parents and cloud lanes of 3 Nov on claude.ai/code.
3. **Decide #786's five questions** (one at a time): first, add the six filing-risk items to M2 (recommended yes).
4. **Set today's paid cap** (P-313 covered only the night); first use: IRM 0002 saved map, draft ≤ US$4.42 plus checker.
5. Earlier, still open: send the SA-01B product owner the drafted reply and SH3/G-CORE notes; tell the team to drop "Fill this screen" (P-245).

## Founder asks of 4 Nov (P-228 (9)); 3 Nov asks A62–A74: `history/STATE-2026-11-04-0058.md`
**A75** (~07:15 IST) detailed morning status, lessons, M2/M3 progress, hand-over or restart: answered in chat ✓ (keep going, no restart; hand over at ~400k) · **A76** (~07:20 IST) draft the auto-mode rules: drafted ✓, script `tools/add-automode-rules.py` ✓ · **A77** (~07:30 IST) why we missed, a stronger model (Fable), partial-first or parallel, confidence: answered ✓ (not a model problem; M2 first; M2 58–60 about 7–8 Nov, ~60%) · **A78** (~07:35 IST) "Yes, QA-144 first": Builder 8 ✓ · **A79** (~07:40 IST) "Label them now" (paid PRs): #781 #787 #771 #785 labelled ✓ · **A80** (~07:45 IST) evaluate the side chat's plan, explain auto mode and labels, do it on his behalf, next steps, M2/M3: answered ✓, "Yes, as amended" → P-317 ✓, qa lane ✓, records labels #782 #786 #737 #749 #745 ✓.

## Lessons of 4 Nov
A merge label is a merge button: auto mode allows it only when the founder names the PR in that session, and never in a builder session · a re-run of a pull-request check re-uses the old merge snapshot; a fix on main reaches a PR only through a new push · builder sessions cannot close PRs · the Lead's messages stop after 10 per founder turn: put rulings on the PR · a self-reported "labelled" was false once: check GitHub · tests that pass alone and fail after another suite are a risk to every batch.
