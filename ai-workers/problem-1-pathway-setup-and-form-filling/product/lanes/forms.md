# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead
2026-10-24 20:40 (Lead, cloud): slice 2b checked and **merged** (`screens/F1-forms-channels/lead-check.md`; the Lead reproduced F5 on IMM 5409: 14/14 page fields drawn and read back outside Adobe). Set stage BUILD, owner Builder, a short pass of qa Minors: QA-27 (validator wording on six refusals), QA-31 (a screen-map job cannot be cancelled), QA-32 (retry after a mid-run cancel says "Nothing to retry"), QA-33 (part reuse ignores a changed field type); each with a test, then CHECK (reviewer + breaker) → owner Lead. Form code naming ("IMM 5257 1" vs "SCH1") stays until the expert answers. Sync main first. No live AI call. Stop isolated copies at the end.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: F1-forms-channels
stage: CHECK
owner: Builder
next_action: CHECK of the qa Minors pass (QA-27, QA-31, QA-32, QA-33): screen-reviewer and screen-breaker running (review-qa-minors.md, break-report-qa-minors.md); then FIX or owner Lead.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · F1 · CHECK (qa Minors) · reviewer: ship after fixes, journey 6/10, 0 Must, 2 Major (a cancel during a part's stub pass still makes its paid call; AI work page not updated), 6 Minor; breaker running. US$0.
- 2026-10-24 · F1 · BUILD → CHECK (qa Minors) · QA-27 plain words, QA-31 screen-map draft cancellable before its paid call (own batch), QA-32 retry after a mid-run cancel, QA-33 reuse compares the kind of box; launch paths 45/45, slice 2b 60/60, all suites green, api coverage 95.75/79.50. US$0. Reviewer and breaker launched.
- 2026-10-24 · F1 · CHECK → BUILD (qa Minors) · applied Lead note 2026-10-24 20:40 (slice 2b merged, PR #9; main 262750e synced).
- 2026-10-24 · F1 · CHECK (slice 2b) · applied Lead note 19:10 (QA-34, QA-30): fake-launcher suite check_ai_launch_paths 29/29 (every live-draft refusal at US$0; parts provider limit now BLOCKED), capture and fill refusals in slice 2b 57/57; api coverage 95.73/79.09 (floor 95/79), engine 99.12/87.24; QA-30 a plain 400; all suites green. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK → FIX → CHECK (slice 2b) · breaker: 0 Blocker, 2 Major, 7 Minor; every Major and most Minors fixed with a test (page fields set only when drawn exactly, read back from the drawing; sign step on static forms; D3 under-lock race; static read from the file); slice 2b 44/44, all suites green, qa probe 26/0, any 437. US$0. Owner → Lead.
- 2026-10-24 · F1 · CHECK (slice 2b) · reviewer: ship after fixes, journey 7.5/10, 0 Must, 2 Major (page fields drawn with ? or cut off still reported shown; no sign step on static forms), 5 Minor; breaker running. US$0.
- 2026-10-24 · F1 · BUILD → CHECK (slice 2b) · all suites green on lane ports: slice 2b 28/28, forms channels 106/106 (capture check updated for QA-15), slice 2 52/52, guard 75, launch 53, engine 38, drafting 48, orchestration 22, grounding 29, Screen 01 API 135, channels 42, rules 67, browser 136, race pass, runtime 85, case engine 20; qa F1 probe 26/0 (QA-15 fixed); explicit any 437. US$0. Reviewer and breaker launched.
- 2026-10-24 · F1 · BUILD (slice 2b) · F5, F6, QA-15, D3 built (521945f); slice 2b 28/28; full suite run in progress (drafting 48, orchestration 22, engine 38, slice 2 52/52; forms channels check updated for QA-15). US$0.
- 2026-10-24 · F1 · CHECK → BUILD (slice 2b) · applied Lead note 2026-10-24 22:00 (slice 2 merged; cloud clone merged main cd97cb6, cloud-setup.sh run).
- 2026-10-24 · F1 · CHECK (slice 2) · applied Lead note 2026-10-24: merged main (Screen 01, 1cb174a6), resolved 4 conflicts; all suites green on lane ports: guard 75, launch 53, slice 2 52, F1 106, engine 38, rules 65, drafting 48, API 130, channels 42, release race pass, grounding 29, orchestration 22; explicit any back to 437; lane copies stopped. US$0. Owner → Lead.
- 2026-10-23 · F1 · FIX → CHECK (slice 2) · every review Must/Major and break Blocker/Major fixed with a test, most minors too; all suites green: guard 75, launch 53, slice 2 52, F1 106, engine 38, rules 54, drafting 48, API 94, grounding 29, orchestration 22 (lane copy). US$0. Owner → Lead.
