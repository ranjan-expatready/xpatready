# State — overview of all lanes (generated from `lanes/*.md` by `lane.sh state`; the Lead adds the log)

current_milestone: M2 — Super Admin configuration (Screens 01–04 + forms channels F1), with the thin runtime slice R1 (P-67) and independent qa (P-68) alongside
lanes: `LANES.md` · the founder types `/lead` only; the Lead runs `/next screens|forms|evidence|runtime` and `/qa <mode>` sessions
journey and gaps: `history/AUDIT-2026-10-23.md` · capabilities and bugs: `qa/CAPABILITIES.md`, `qa/BUGS.md`
updated: 2026-10-25

<!-- lanes:start -->
| Lane | Item | Stage | Who acts | Next |
|---|---|---|---|---|
| screens | 01-programs-catalogue | CHECK | Lead | Lead check of the small FIX on its exact commit (build-notes "Fixes: small FIX after Screen 01 DONE" and it… |
| forms | F1-forms-channels | CHECK | Lead | Lead check of the qa Minors pass after its FIX: build-notes "qa Minors pass" (its two lines), review-qa-min… |
| evidence | E1-form-acceptance (E1b) | EARLY-LOOK | Lead | Lead: check IMM 5409 (prototype/evidence-lane/E1/imm5409/STATUS.md); send F5 (static forms: page fields sta… |
| runtime | R1-thin-slice (R1d) | CHECK | Lead | Lead checks the PR 13 fix (build-notes-r1d.md "PR 13 review"), then merges; lane stops; R2 waits for a Lead… |
| qa | after-merge on main 8aef175 (runtime R1d forms panel and none apply; qa R1c fixes) | WAITING | Lead | Lead reads qa/reports/2026-10-25-after-merge.md (ready: no Blocker, Critical or Major; QA-26, 35, 36, 37 cl… |
<!-- lanes:end -->

## Log (last 10 lines; older in history/)
- 2026-10-25 · Lead (cloud) · Founder decided P-87 (every change by PR, the Lead merges everything) and P-88 (shared app stays on the Mac); `main` cannot be locked on GitHub's free plan, so the pre-push hook refuses pushes to `main`; `lane.sh table` no longer lets a merged lane branch hide main's note; independent workflow audit recorded in LEAD.md.
- 2026-10-25 · Lead (cloud) · Founder's Mac report: :4400 on 8aef175 after a demo reset, QA-19 check PASS (qa closes it at its next sync); PR #14 merged (e404fcc on main); Mac tools recorded (Playwright Chromium, agent-browser); US$12 drafts Mac-only; P-87: cloud Lead on its own branch, to `main` by PR. All lanes waiting; next work needs Lead concepts (Screen 02, F2, R2).
- 2026-10-25 · Lead (cloud) · PR #13 merged (8aef175); qa after-merge on it: ready, 0 Blocker/Critical/Major, no new findings, QA-26/35/36/37 closed, coverage api 96/81 · engine 99/88 → **R1 thin slice complete**; runtime waits for an R2 plan; QA-19 clears with the :4400 demo reset (Mac).
- 2026-10-25 · Lead (cloud) · PR #12 merged (e619113: runtime R1d, never-overwrite forms, P-71 gate); "none apply" for required groups and its PR 13 fix (entry ids per group, so an added blank entry makes a filed copy stale) checked (21/21) and merged; runtime waits for an R2 plan; qa after-merge next.
- 2026-10-25 · Lead (cloud) · Runtime R1d checked and merged on the Lead branch (forms panel, P-71 gate, never-overwrite triggers; 21/21 suites); next: PR, one qa after-merge; runtime builds the "none apply" fact for required groups.
- 2026-10-24 · Lead (cloud) · Runtime R1d EARLY-LOOK (IMM 5257 filled from confirmed facts, copies never rewritten, lock, stale) → Go with changes: P-71 blocks Lock/Filed while facts are missing; "box" → "form field"; shorter "fills …" lists. `run-suites.sh` runs R1d after R1c, before R1a. Expert question 7 (IMM 5707 per applicant).
- 2026-10-24 · Lead (cloud) · PR #10 merged (12e7207: runtime R1c, screens small FIX, forms qa Minors); qa after-merge on it: ready, 1 Major (QA-35) and 3 Minors to runtime's R1d pass; 15 of 17 retested findings closed; coverage floors raised (api 95/80, engine 99/87).
- 2026-10-24 · Lead (cloud) · Runtime R1c (journey 75/75 after its FIX), screens small FIX and forms qa Minors checked and merged on the Lead branch; 20/20 suites green; next: PR to main, one qa after-merge, runtime BUILD R1d.
- 2026-10-24 · Lead (cloud) · Studio `package.json` gets back `"type": "module"` (dropped by the GitHub migration 428a018): type check 15 errors → 0 in a clean clone; every suite green except R1c's journey (runtime FIX). Screens small FIX accepted but CI red on its new browser suite (bundled browser missing on GitHub's runner) → screens uses the system Chrome like the other browser suites.
- 2026-10-24 · Lead (cloud) · Runtime R1c Lead check → **FIX**: the R1c browser journey gives 69–71/75 on fresh copies (lane reported 75/75; Confirm section, date check and conflict re-save fail every time); diff, S-10 and the migration accepted. Not merged. `run-suites.sh` runs R1c after the visitor-visa setup.
