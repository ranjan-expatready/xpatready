# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-24 21:10 (Lead, cloud): R1c FIX checked and **merged** (journey 75/75 on the Lead's fresh copy; 20/20 suites). First in the R1d pass: qa QA-35 (blank case area from the Demo menu), QA-36 (Back and Save and continue behave the same under P-47), QA-37 ("boxes" → "form fields"), the rest of QA-26; each with a test. R1d EARLY-LOOK (24 Oct 22:25): Go with changes: P-71 blocks Lock, Filed and "validated copy uploaded back" while the form is not ready to file (UI disabled with the reason; API 409); "box" → "form field" in the save message; summarise long "fills …" lists; IMM 5707 per person stays (expert question). Then CHECK (reviewer + breaker) → owner Lead. Next stage BUILD R1d (fill and never overwrite: plan §slices, RT-13…RT-17; IMM 5257 filled from confirmed facts only, with the stale and lock rules), then EARLY-LOOK. Sync main first. Paid AI none. Stop isolated copies at the end.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: R1-thin-slice
current_slice: R1d
stage: CHECK
owner: Builder
next_action: CHECK R1d: screen-reviewer and screen-breaker (incl. S-11, S-12, the migration and triggers), fix, then CHECK owner Lead.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-24 · Builder (cloud): R1d early-look changes: P-71 lock only when ready (API 409 + disabled buttons with the reason), "form fields" wording, "fills IMM 5257 for N people"; R1d 27/27, journey 102/102 ×2, run-suites --demo 20/20; CHECK started.
- 2026-10-24 · Builder (cloud): qa on R1c first (Lead): QA-35 blank case area from the Demo menu, QA-36 one leave path for Back and Save and continue, QA-37 "form fields", QA-26 applies wording; tests caught by mutation; journey 99/99, R1a 99/99, R1d 25/25; still EARLY-LOOK owner Lead.
- 2026-10-24 · Builder (cloud): BUILD R1d: confirmed-only fill through the shared filler (S-11), FormInstance/AnswerSnapshot with never-overwrite triggers, job queue, out of date/stale/lock, forms panel; R1d 25/25, engine 36/36, journey 93/93, R1a 97/97, run-suites --demo 20/20; EARLY-LOOK owner Lead.
- 2026-10-24 · Builder (cloud): applied Lead note 21:10 (R1c merged in PR #10); synced main 12e7207; BUILD R1d started.
- 2026-10-24 · Builder (cloud): PR 10 review: Back keeps a refused draft (Major), case list Load more (Minor), each with a test caught by mutation; journey 79/79, API 97/97, run-suites green; waiting for #10 merge before R1d.
- 2026-10-24 · Builder (cloud): Lead check FIX: journey flakiness root cause = the check read state immediately; now waits for state (no sleeps); reproduced and fixed under R1C_SLOW=6 (60 → 74/74); 75/75 ×3 fresh copies, API 97/97; Lead answers recorded (union date plan item); CHECK owner Lead.
- 2026-10-24 · Builder (cloud): FIX R1c done: review M1–M6 and break M1–M4 plus 11 Minors fixed with tests; journey 75/75, API 97/97, engine 29/29, run-suites --demo green; copies stopped; CHECK owner Lead.
- 2026-10-24 · Builder (cloud): CHECK R1c: review 7/10, Ship after fixes (M1–M6); FIX in progress (rules named after save, group intro, conflict dialog, first answerer kept, country suggestions, wrapping tabs); break report pending.
- 2026-10-24 · Builder (cloud): applied Lead early-look answer (Go with changes): RT-7 two Sample checks seeded and shown in both modes, map labels on answers; engine 29/29, journey 62/62; CHECK started.
- 2026-10-24 · Builder (cloud): qa Minors in R1c per Lead message: QA-25 (control characters refused), QA-26 (plain id refusals), QA-28 (add-person idempotent, migration); API 93/93, journey 53/53, run-suites green; EARLY-LOOK owner Lead.
