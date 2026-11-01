# Review — C4.4 part 2 (runtime lane): section error summary, check blocks ready to file, RT-7 authoring, tier 3, PQR

Independent reviewer, 1 Nov 2026. Diff `7a10f5cf..d68d35c6` (asked first for 6a72805d; the builder moved the head to d68d35c6
during the review: b108bbd1 types saveCheck's body, 2fa52fb2 and d68d35c6 adjust part 1's browser check and r1c). The
engine and readiness code (case.ts, forms.ts, contracts) is the same in both. Isolated copy `rev_c44p2` on :4438 (a builder
suite stopped it twice mid-run; I restarted it and re-ran). No `*_LIVE`, no AI calls, US$0. Only this file was written. The
journey-test report is section "Journey test" below, because my brief allowed only this one file.

## Verdict: Block. One Major is open (M1). Everything else holds.

## Claims checked
| # | Claim | Result |
|---|---|---|
| 1 | `problems` per section (field with row, check), officer links move focus | Holds. Engine case.ts:323-332; questionnaire.tsx:731-741; browser: focus lands on the line id (19/19). Screenshot 01 at 1024 px is clean. |
| 2 | A fired check blocks ready to file, never saving | Saving is never refused (200 on crossed dates). The block does more than claimed: see **M1**. |
| 3 | POST /combinations/:id/checks | Holds: 403 officer; 400 for bad op, message under 5 chars, phrase instead of a field, other group; Sample when no quote; audit line read in `audit_event` ("…(draft v1, Sample)"). See m1 and m2. |
| 4 | POST /runtime/cases/:id/review | Holds: 409 in words, "US$0", answers unchanged; client 403; not on the case 404. The "live on" branch is untested (no `*_LIVE` allowed). |
| 5 | PQR mode | Holds: only ticked role\|fact; result lines match P-47's wording ("Looks eligible so far · next: book a consultation. This is not a decision…"). PQR is API only; no screen was claimed (P-26). |
| 6 | Acceptance C4.4 fails instead of crashing | Holds: 28/28 on a fresh database. See m3. |
| 7 | library.tsx and job.tsx offer the five P-47 types | Holds; the server accepts them (studio.ts:21 VALUE_TYPES comes from snapshot.ts:34). |

Suites I ran: check_c44_part2 29/29 · check_c44_part2_browser 19/19 (axe clean, 1024 and 1440 px, no page errors) ·
acceptance C4.4 28/28 · web `tsc` clean · api `tsc`: only the existing error in check_c18_age_case.ts:59 (a file this PR does not touch) · `count-any --against 7a10f5cf`: 428 = 428 at d68d35c6.
At 6a72805d itself, two new explicit `any` (main.ts addCheck `b: any`, studio.ts saveCheck `condition?: any`) would have
failed the ratchet; b108bbd1 removes them. No personal names; Sample labels present.

## Major
**M1. Every fired check on a fact the form reads blocks "ready to file", whatever its group or severity. This contradicts P-168 and P-136.**
engine/runtime/forms.ts:94-96 loops over all of `view.checks`. That list comes from engine/render.ts:288, which keeps every
group except `form_native`: official_rule, readiness_warning, cross_record and section_check, at any severity (warn,
advise, sme_pending) and including Sample ones. ViewCheck (contracts/runtime.ts) has no group field, so readiness cannot
tell a tier-2 consistency check from an advisory. The lock at api/src/fill-case.ts:259 refuses on that same readiness, and
there is no way to pass it with a written reason.
*Failing scenario (engine, release `vv.single`):* a `readiness_warning` with severity `advise`, and an `official_rule` with
`sme_pending` (an unconfirmed rule), each on `case.intended_stay_to` and firing on valid dates. Each one makes
`readiness(view,"IMM 5257",p1)` return `{reason:"a check fired"}` with `ready:false`, so the copy cannot be locked or filed.
P-168: "Four hard blocks stand; everything else warns … a permitted person passes with a written reason". P-71 as confirmed
there also blocks "missing or conflicting facts on that form", and P-47 says validation blocks ready to file.
*On the builder's point (3):* blocking IMM 5257 while the visit ends before it starts is right. That is a conflicting
fact (P-71/P-168), and the r1c change (fail side, fix the dates, continue) is the correct test of it. The fault is that
the rule is not limited to that kind of check.
*Fix:* carry `group` (and severity) into ViewCheck. Block only P-47 tier-2 section checks (`section_check`), or severity
`block`, never `sme_pending`. Leave the others as warnings, exactly as before. Add a fail test where an
advise/readiness_warning check fires and the form stays ready.
Also decide whether a Sample (illustrative) section check may block filing at all. Today the dates check is labelled
"(Sample check)" in the officer's section (screenshot 03) and blocks the form. If it should, say so in the PR. If not,
exempt it. This is a founder call; I did not settle it.

## Minor
- m1. api/src/studio.ts:659-676: there is no duplicate guard. 8 parallel identical POSTs saved 8 checks (8 distinct keys;
  the key is count plus 3 base-36 characters of the time, with no unique guarantee beyond `@@unique(combinationId, checkKey, version)`).
  A double submit from a future screen will duplicate. Fix: reuse an identical draft row, or take an idempotency key.
- m2. studio.ts (appliesTo check): the subject kind of the condition is not checked against appliesTo. A CASE condition with
  `appliesTo: person.date_of_birth` was accepted (201, key SC-14). It fires with the case as subject on a person fact,
  so it lands in no section summary and blocks nothing, silently. Fix: refuse when the kinds differ, in words.
- m3. acceptance/C4.4.test.ts:119 counts `= 1` check by message, so a second run on the same database FAILS (27/28),
  and so does running it after check_c44_part2. Make it count the delta, or use a unique message per run.
- m4. tests/check_c44_part2_browser.cjs:21-22 deletes and rewrites the tracked screenshots on every run (a reviewer's
  run changes committed files), and hard-codes `/opt/homebrew/.../psql`. Write to a temp folder unless asked.
- m5. questionnaire.tsx:731-741: a check whose fact is hidden in the section gets a link to an id that does not exist
  (case.ts:328 falls back to the fact key as its label). Rare: show it without a link.

## Journey test (reviewer role, simulated; D17 and D20 stay with the founder)
Journeys: (1) the officer opens a case with crossed visit dates and an impossible birth date, reads each section's
summary, follows the link to the answer, sees IMM 5257 "What blocks filing" name the check, fixes the dates, and the
block clears. (2) Wrong role: a client runs review (403); the officer tries to author a check (403). (3) Error: a bad op,
a short message, a phrase for the field. (4) Tier 3 at US$0. (5) PQR: unanswered, then answered, as officer and client.
(6) Break it: parallel authoring, a mismatched subject kind, a non-JSON body (400 in words), an unknown combination (404).
All ran on the API and through Playwright (headless). I did not walk them in a visible browser.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1 end to end (browser 19/19) |
| Next step obvious | 1 | The summary link lands focus on the line; the forms panel names the check |
| Plain words | 1 | "The visit ends before it starts. Check both dates."; refusals in words |
| Feedback and state | 1 | "1 to check" badge, Notice tone, block clears after the fix |
| Correct data | ½ | Records exact and audited; readiness over-blocks (M1); duplicates (m1) |
| Error recovery | 1 | Fix → block gone on reload; save never refused |
| Accessibility and sizes | ½ | axe clean at 1024 and 1440 px, focus moves; 400 px and 200 % zoom not run |
| Speed | ½ | Views render in under 10 s waits; §9 budgets not timed |
| Visual quality | 1 | Screenshots 01 and 03: team look, summary at the top of the section |
| Trust and sources | ½ | "(Sample check)" shown, but Sample and sme_pending checks can block filing unflagged (M1) |
| **Total** | **8 / 10** | Pass (8+, no 0). To raise it, fix M1, then m1, then run 400 px and 200 % zoom. |

## Could not check
The "live AI on" branch of review (forbidden here) · a real screen reader · 400 px and 200 % zoom · a visible, unaided
walk by an intended user · the full regression suites the builder lists (I ran only this PR's suites and acceptance C4.4) ·
graph.mjs (P-86) not run.

**Verdict: Block.** To fix: M1 (only tier-2 section checks, or severity `block`, stop "ready to file"; never advisory,
readiness_warning or sme_pending checks; plus a fail test for that). m1–m5 are optional.

## Round 2 — head 32bbd5d1 (diff 7a10f5cf..32bbd5d1), 1 Nov 2026
Fresh isolated copy `rev_c44p2` on :4438, web rebuilt, no `*_LIVE`, US$0. The builder's committed screenshots were put back after the browser run.
- **M1: fixed.** `engine/runtime/forms.ts` `blocksFiling` lets only `group === "section_check"` at severity warn or block stop
  "ready to file". ViewCheck now carries `group` (case.ts, contracts/runtime.ts). I re-ran my round-1 engine scenario on
  the release: the advise-level readiness_warning and the sme_pending official_rule still fire on the end date, and both
  now give IMM 5257 no "a check fired" (they only warn, P-168). The builder's new R2 pass test asserts the same.
  The crossed-dates section check still blocks (R2 fail side, r1c). The lock at fill-case.ts:259 follows readiness, so
  it is correct now.
- **m1: partly fixed.** A repeat of the same draft check gets 409 "This check is already in the draft." But the guard
  in studio.ts saveCheck runs findMany and then create, with no lock or unique key, so 8 parallel identical POSTs still
  saved 2 rows (201 201, then 409 ×6). Remains Minor (API only, no screen yet). Fix later: a transaction with an
  advisory lock per combination, or a unique content hash.
- **m3: fixed.** acceptance C4.4 passed 28/28 twice in a row on one database.
- m2, m4 and m5 are left as follow-ups in the PR, as agreed. The founder question (should a Sample section check block?)
  goes in the PR.
- Re-run: check_c44_part2 31/31 · check_c44_part2_browser 19/19 · `count-any --against 7a10f5cf` 428 = 428 · web `tsc`
  clean · api `tsc`: no errors in files this PR touches; only the existing ones in check_c18_age_case.ts and
  check_x2b_bulk_apply.ts. No new `any`, no personal names, Sample labels intact.
- Journey score: 8.5 / 10. Correct data goes back to 1 (readiness no longer over-blocks), and trust and sources stays at ½
  until the Sample-check question is answered. Accessibility and sizes, and speed, stay at ½ (400 px, 200 % zoom and the
  §9 timings were not run).

**Verdict: Approve** (round 2, commit 32bbd5d1). No Blocker or Major is open. Open Minors: m1 (the parallel race), m2, m4, m5.
