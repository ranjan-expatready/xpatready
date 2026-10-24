# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-24 21:10 (Lead, cloud): R1c FIX checked and **merged** (journey 75/75 on the Lead's fresh copy; 20/20 suites). First in the R1d pass: qa QA-35 (blank case area from the Demo menu), QA-36 (Back and Save and continue behave the same under P-47), QA-37 ("boxes" → "form fields"), the rest of QA-26; each with a test. Next stage BUILD R1d (fill and never overwrite: plan §slices, RT-13…RT-17; IMM 5257 filled from confirmed facts only, with the stale and lock rules), then EARLY-LOOK. Sync main first. Paid AI none. Stop isolated copies at the end.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: R1-thin-slice
current_slice: R1c
stage: CHECK
owner: Lead
next_action: R1c accepted; PR 10 review defects fixed (Back keeps a refused draft; case list Load more). Wait for the Lead: PR #10 merged → sync main → BUILD R1d.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · Builder (cloud): PR 10 review: Back keeps a refused draft (Major), case list Load more (Minor), each with a test caught by mutation; journey 79/79, API 97/97, run-suites green; waiting for #10 merge before R1d.
- 2026-10-24 · Builder (cloud): Lead check FIX: journey flakiness root cause = the check read state immediately; now waits for state (no sleeps); reproduced and fixed under R1C_SLOW=6 (60 → 74/74); 75/75 ×3 fresh copies, API 97/97; Lead answers recorded (union date plan item); CHECK owner Lead.
- 2026-10-24 · Builder (cloud): FIX R1c done: review M1–M6 and break M1–M4 plus 11 Minors fixed with tests; journey 75/75, API 97/97, engine 29/29, run-suites --demo green; copies stopped; CHECK owner Lead.
- 2026-10-24 · Builder (cloud): CHECK R1c: review 7/10, Ship after fixes (M1–M6); FIX in progress (rules named after save, group intro, conflict dialog, first answerer kept, country suggestions, wrapping tabs); break report pending.
- 2026-10-24 · Builder (cloud): applied Lead early-look answer (Go with changes): RT-7 two Sample checks seeded and shown in both modes, map labels on answers; engine 29/29, journey 62/62; CHECK started.
- 2026-10-24 · Builder (cloud): qa Minors in R1c per Lead message: QA-25 (control characters refused), QA-26 (plain id refusals), QA-28 (add-person idempotent, migration); API 93/93, journey 53/53, run-suites green; EARLY-LOOK owner Lead.
- 2026-10-24 · Builder (cloud): applied Lead note 22:00 (FIX accepted); BUILD R1c: one renderer, SQR at 390 px and agent view at desktop, case area under /cases; journey 53/53 with axe 0 on 10 states; engine 25/25 (placement order), API 87/87, run-suites --demo green; RT-7 blocked on check authoring (build discovery); EARLY-LOOK owner Lead.
- 2026-10-24 · Builder (cloud): applied Lead note 2026-10-24 22:00; merged main (cd97cb6), cloud-setup; FIX D1 (Confirm section ignores a removed row's answers) and D2 (ageOn refuses impossible and future dates), pass and fail tests each failing on the old code; engine 23/23, API 87/87, run-suites green; BUILD R1c next, owner Builder.
- 2026-10-24 · Builder: applied Lead note 2026-10-24; merged main (conflicts resolved for main), S-9 (release publishes answer lists; main's new check refused the visitor visa), P-78 wording; setup 11/11, API 85/85, engine 20/20, regressions green; copies stopped; CHECK owner Lead.
- 2026-10-23 · Builder: CHECK → FIX → CHECK: review 7.5/10 (2 Must, 5 Major), break 4 Major + 11 Minor, all fixed with tests; fresh copy setup 11/11, API 84/84, engine 20/20; regressions green; owner Lead.
