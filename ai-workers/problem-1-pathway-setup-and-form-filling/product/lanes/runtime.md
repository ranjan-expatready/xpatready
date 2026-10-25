# Lane: runtime — the thin end-to-end slice, then M3 runtime (P-67)

## From the Lead
2026-10-24 21:10 (Lead, cloud): R1c FIX checked and **merged** (journey 75/75 on the Lead's fresh copy; 20/20 suites). First in the R1d pass: qa QA-35 (blank case area from the Demo menu), QA-36 (Back and Save and continue behave the same under P-47), QA-37 ("boxes" → "form fields"), the rest of QA-26; each with a test. R1d EARLY-LOOK (24 Oct 22:25): Go with changes: P-71 blocks Lock, Filed and "validated copy uploaded back" while the form is not ready to file (UI disabled with the reason; API 409); "box" → "form field" in the save message; summarise long "fills …" lists; IMM 5707 per person stays (expert question). Then CHECK (reviewer + breaker) → owner Lead. Next stage BUILD R1d (fill and never overwrite: plan §slices, RT-13…RT-17; IMM 5257 filled from confirmed facts only, with the stale and lock rules), then EARLY-LOOK. Sync main first. Paid AI none. Stop isolated copies at the end.

Command: `/next runtime` in this lane's own copy (`LANES.md`). This lane writes everything below; the Lead writes only the section above.

current_item: R1-thin-slice
current_slice: R1d
stage: FIX
owner: Builder
next_action: PR #12 review fixes (Online forms not offered, lock checks the file, cap under a case lock) written with tests, R1d 43/43; run-suites --demo running; then tell the Lead the commit. After the Lead PR merges: BUILD the "none apply" fact.
blocked_by: none
updated: 2026-10-24

## Log (last 10 lines)
- 2026-10-25 · Builder (cloud): PR #12 review (Lead): 3 fill-case defects fixed with tests caught by mutation (Online filing line → 422 and not listed; lock refuses a missing or changed file 409; cap counted under FOR UPDATE); R1d 43/43.
- 2026-10-24 · Builder (cloud): Lead accepted R1d (3d47004, 21/21); answers recorded: an empty required group that applies blocks ready to file, cleared by a confirmed "none apply" fact (P-71, P-72); STATUS.md verdict is the trial record (IMM 1344 not passed, IMM 5707 passed). Waiting for the Lead PR merge.
- 2026-10-24 · Builder (cloud): FIX R1d done: review minors 1–2 wording too; fresh copy journey 107/107, R1d 38/38, R1a 99/99, engine 39/39; run-suites --demo 21/21; any 437; copies stopped; CHECK owner Lead.
- 2026-10-24 · Builder (cloud): CHECK R1d: review 7/10 (5 Majors), break 7 Majors 6 Minors; FIX: trial gate per form, readiness (needs a fix, by id), blocking list on the page, focus, delete/insert guards, file checks, cap per case; R1d 38/38, journey 107/107, R1a 99/99, engine 39/39; mutations caught.
- 2026-10-24 · Builder (cloud): R1d early-look changes: P-71 lock only when ready (API 409 + disabled buttons with the reason), "form fields" wording, "fills IMM 5257 for N people"; R1d 27/27, journey 102/102 ×2, run-suites --demo 20/20; CHECK started.
- 2026-10-24 · Builder (cloud): qa on R1c first (Lead): QA-35 blank case area from the Demo menu, QA-36 one leave path for Back and Save and continue, QA-37 "form fields", QA-26 applies wording; tests caught by mutation; journey 99/99, R1a 99/99, R1d 25/25; still EARLY-LOOK owner Lead.
- 2026-10-24 · Builder (cloud): BUILD R1d: confirmed-only fill through the shared filler (S-11), FormInstance/AnswerSnapshot with never-overwrite triggers, job queue, out of date/stale/lock, forms panel; R1d 25/25, engine 36/36, journey 93/93, R1a 97/97, run-suites --demo 20/20; EARLY-LOOK owner Lead.
- 2026-10-24 · Builder (cloud): applied Lead note 21:10 (R1c merged in PR #10); synced main 12e7207; BUILD R1d started.
- 2026-10-24 · Builder (cloud): PR 10 review: Back keeps a refused draft (Major), case list Load more (Minor), each with a test caught by mutation; journey 79/79, API 97/97, run-suites green; waiting for #10 merge before R1d.
- 2026-10-24 · Builder (cloud): Lead check FIX: journey flakiness root cause = the check read state immediately; now waits for state (no sleeps); reproduced and fixed under R1C_SLOW=6 (60 → 74/74); 75/75 ×3 fresh copies, API 97/97; Lead answers recorded (union date plan item); CHECK owner Lead.
