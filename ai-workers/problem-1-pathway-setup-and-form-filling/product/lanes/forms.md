# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-24 21:10 (Lead, cloud): qa Minors pass **merged** (QA-27, QA-31–33 and the cancel/reset findings; c0bf023's QA-30/QA-34 with it). Waiting: F2 (working extension on saved screens, P-66) needs a Lead concept first; the US$12 drafts run on the Mac after qa's after-merge.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F1-forms-channels
stage: CHECK
owner: Lead
next_action: Lead check of the qa Minors pass after its FIX: build-notes "qa Minors pass" (its two lines), review-qa-minors.md, break-report-qa-minors.md; rerun run-suites.sh. Note: web/src/pages/ai.tsx got a one-line change (Retry follows the server's retryable flag); qa's check_qa_s2_probe.ts needs its order changed after a cancel+retry. Then F2; the US$12 paid drafts wait for the founder.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · F1 · CHECK → FIX → CHECK (qa Minors) · breaker: 2 Major (paid call after a cancel while the launch waited; reset crash), 6 Minor; every Major and most Minors fixed with a test (cancel honoured up to the paid call on every path; answer of a call cancelled mid-way never applied; retryable per step; reset safe); launch paths 52/52, slice 2 53/53, all suites green, api coverage 95.89/79.67. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (qa Minors) · reviewer: ship after fixes, journey 6/10, 0 Must, 2 Major (a cancel during a part's stub pass still makes its paid call; AI work page not updated), 6 Minor; breaker running. US$0.
- 2026-10-24 · F1 · BUILD → CHECK (qa Minors) · QA-27 plain words, QA-31 screen-map draft cancellable before its paid call (own batch), QA-32 retry after a mid-run cancel, QA-33 reuse compares the kind of box; launch paths 45/45, slice 2b 60/60, all suites green, api coverage 95.75/79.50. US$0. Reviewer and breaker launched.
- 2026-10-24 · F1 · CHECK → BUILD (qa Minors) · applied Lead note 2026-10-24 20:40 (slice 2b merged, PR #9; main 262750e synced).
- 2026-10-24 · F1 · CHECK (slice 2b) · applied Lead note 19:10 (QA-34, QA-30): fake-launcher suite check_ai_launch_paths 29/29 (every live-draft refusal at US$0; parts provider limit now BLOCKED), capture and fill refusals in slice 2b 57/57; api coverage 95.73/79.09 (floor 95/79), engine 99.12/87.24; QA-30 a plain 400; all suites green. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK → FIX → CHECK (slice 2b) · breaker: 0 Blocker, 2 Major, 7 Minor; every Major and most Minors fixed with a test (page fields set only when drawn exactly, read back from the drawing; sign step on static forms; D3 under-lock race; static read from the file); slice 2b 44/44, all suites green, qa probe 26/0, any 437. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (slice 2b) · reviewer: ship after fixes, journey 7.5/10, 0 Must, 2 Major (page fields drawn with ? or cut off still reported shown; no sign step on static forms), 5 Minor; breaker running. US$0.
- 2026-10-24 · F1 · BUILD → CHECK (slice 2b) · all suites green on lane ports: slice 2b 28/28, forms channels 106/106 (capture check updated for QA-15), slice 2 52/52, guard 75, launch 53, engine 38, drafting 48, orchestration 22, grounding 29, Screen 01 API 135, channels 42, rules 67, browser 136, race pass, runtime 85, case engine 20; qa F1 probe 26/0 (QA-15 fixed); explicit any 437. US$0. Reviewer and breaker launched.
- 2026-10-24 · F1 · BUILD (slice 2b) · F5, F6, QA-15, D3 built (521945f); slice 2b 28/28; full suite run in progress (drafting 48, orchestration 22, engine 38, slice 2 52/52; forms channels check updated for QA-15). US$0.
- 2026-10-24 · F1 · CHECK → BUILD (slice 2b) · applied Lead note 2026-10-24 22:00 (slice 2 merged; cloud clone merged main cd97cb6, cloud-setup.sh run).
