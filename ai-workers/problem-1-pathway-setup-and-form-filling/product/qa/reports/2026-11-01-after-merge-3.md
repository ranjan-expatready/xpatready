# qa after-merge (round 3) — 1 Nov 2026, main 751cbc42

**Scope:** `git log --first-parent 832ee5bd..origin/main`: #225 (QA-76 slice a, runtime), #197 (C4.2 marked by hand: a test, no app change), #232 (run-suites rebuild, tooling), #226 (shard balance, tooling), #167 and #208 (records). Not merged at the time of writing: #230 (dequeued), #210 and #216 (in the merge queue with #233), so QA-119 and the header/strip agreement are **not retested** yet; QA-120 and QA-121 are not fixed yet.
**How:** isolated copies qa_c42 :4471, qa_wk :4472, qa_rt :4473 (`isolated.sh`; no STUDIO_*_LIVE; US$0). Visitor visa released on qa_rt through `setup_visitor_visa.ts` (13/13). The shared demo :4400 runs in this cloud copy but holds no accumulated data here, so the read-only walk adds nothing; it is not counted.
**Lost:** `tests/qa/check_qa_am_1101_walk2.cjs` from the previous qa session is not on this copy (it was in that session's stash, lost with it).

## Verdict
**Ready for what merged; one new Major found by exploring runtime (QA-122).** #225 does what it says on the Forms side. #197's check is sound. Runtime exploration found that a wrongly answered *optional* fact is written into the IRCC form and never blocks "Ready to file".

## Suites and checks (underneath)
| Check | Result |
|---|---|
| `tests/runtime/check_qa76_words.ts` (#225) | 7/7 |
| `tests/check_c42_marking_browser.cjs` (#197) | 32/32 |
| `tests/runtime/setup_visitor_visa.ts` | 13/13 |
| `tests/qa/check_qa_am_1101b_walk.cjs` (new, mine) | 35/41 twice; the 6 red lines are QA-76 (2), QA-123 (2), QA-124, QA-125 |
| `tests/qa/check_qa_am_1101b_api.ts` (new, mine) | 6/7; the red line is QA-122 |

* The full suite set was not run (brief). CI of each merged PR was green in the merge queue.
* **Graph:** not rerun. #225 changes words only and #197 a test, so no route or link changed since 832ee5bd.
* **Coverage (c8):** not run (partial c8 allowed until the weekly nightly lands, #233 answer 2). The context went on runtime exploration.
* `decision-impact.sh`: no decision without a row (P-212 to P-214 are workflow, exempt).

## What works (like a person, then underneath)
* **QA-76 slice a (#225).**
  * Case page as the case officer at 1440, 1024 and 400 px: no decision code and no team word in the page text or any tooltip (title, aria-label).
  * Same on the client's questionnaire at 390 px ("About the application", "About Client A": proper names) and in `GET /runtime/cases/:id/forms`.
  * Axe clean at 1024 px; no sideways scroll at any width.
  * **Still open:** each person tab shows "No answer list yet (forms slice 2): …" for answers with no list (e.g. Applying from country). QA-76 stays open for that line. The lower-case "representative" was not re-tested (no representative on the test case).
* **C4.2 marked by hand (#197), walked as the author by keyboard only, at 400 and 1024 px.**
  * Tab reaches the tick in the drawer and Space ticks it.
  * A double click on Save writes exactly one DRAFT row and the count rises by one.
  * A stale save from a second tab is refused 409 in words ("Someone changed where … comes from after you looked. Reload, then choose again.").
  * The content reviewer gets 403 in words. Axe clean on the ticked drawer.
  * Found three Minors: QA-123 (focus is lost when the drawer closes), QA-124 ("on on"), QA-125 (a race gives 404 "removed by a reset").
* **Runtime API probes (explore, case on Visitor visa).** All of these behave correctly:
  * An answer over 4000 characters, an empty value, an unknown fact or person, a second spouse beyond the release's maximum, and a role the release does not list are each refused in words (400, 404 or 422).
  * Non-English names (Zoë Nguyễn 李) are kept exactly.
  * Wrong role is refused: another client gets 404 "No such case", the author 403, the client 403 on the officer view and on adding a person.
  * Two answers at once give 200 + 409 in words.
  * Invalid values (code not in the list, 2026-02-30, "maybe") are kept, as P-47 says, and flagged "needs a fix" in readiness when the fact is required. **When the fact is optional they are not flagged: QA-122.**

## Bugs (new and retested)
**0 Blocker · 0 Critical · 1 Major · 3 Minor new**
* **QA-122 Bug · Major (runtime), C7.6, P-71.**
  * Steps: the case officer answers an optional date that fills IMM 5257 with "tomorrow", then confirms the section (reply `invalid: 1`).
  * The answer is VERIFIED but still carries "Enter a real date as day, month and year.".
  * Generate wrote it: the copy's snapshot has `…CurrentCOR[0].Row2[0].ToDate[0]` = "tomorrow".
  * Readiness never lists it, because `engine/runtime/forms.ts` `readiness()` filters `q.required`. Once every required fact is fine, the form says Ready to file with a wrong value.
  * Replay: `tests/qa/check_qa_am_1101b_api.ts`.
* **QA-123 UX · Minor (screens):** after Save, Escape or Cancel the Questionnaires drawer leaves focus on the page body. Same family as QA-110.
* **QA-124 UX · Minor (runtime):** the bulk toast reads "Pre-qualification on on 1 question". The #197 reviewer saw it; it is now logged.
* **QA-125 Bug · Minor (runtime):** two saves at once on a question that already has a draft: the loser gets 404 "That combination does not exist (it may have been removed by a reset)" instead of 409.
* **QA-76 retest:** partly fixed (see above); stays Major and open.
* **Not retested:** QA-119 (#216 not merged), QA-120, QA-121 (not fixed yet).

## Journey scores (journey-test, simulated persona; D17/D20 not awarded)
* **C4.2 marking, author, keyboard, 400/1024: 8 / 10.** Task 1, next step 1, words ½ ("on on"), feedback 1, data 1, recovery 1, a11y ½ (focus lost on close), speed ½ (not timed against §9), visual 1, trust ½ (race words wrong). Pass.
* **Case page words, officer and client: 8.5 / 10.** Words ½ ("forms slice 2"), speed ½ (not timed), all others 1 for what was walked. Pass.

## Could not test
* QA-119 and the Overview strip (#210, #216 not merged).
* The evidence area (validated copy read back, C-9 / P-144) and the C2.12 screens (forms slice 3 not open).
* A headed walk (no display in the cloud; headless Playwright with screenshots instead). 200 % zoom. c8 coverage.

## Questions for the Lead
1. QA-122: should a confirmed optional answer with a problem block filing ("needs a fix"), or should it simply not be written to the PDF? Either closes the Major. My recommendation: block, as P-71 says ("facts it would write wrong"), because the officer already sees the problem when confirming.
2. Should Confirm section accept answers that carry problems at all? Today it confirms them and counts `invalid` in the reply. P-72 reads as "the officer vouches", so I tested it as intended.

## Suggestions
* *Needed for the proof · Capability:* confirm-section dialog names the invalid answers it is about to vouch for (today only a count comes back).
* *Later · Scaffolding:* one shared drawer helper that returns focus to its opener (closes QA-110 and QA-123 together).

Evidence: `2026-11-01-after-merge-3/` (case pages at three widths, case tabs, client 390, C4.2 drawer 400/1024, bulk toast).
