# BK-18 (QA-448) — journey test, reviewer, round 4, 13 Nov 2026

Commit `72f0001a626e3703006d05acc403cf6724acc22d`, branch `claude/screens-true-record`, PR #1691. My own fresh isolated copy, **:4447** (`review4`; 4446–4449 all answered `000` first, 4441 and 4445 were other people's; stopped at the end). Real browser (Chromium, Playwright), 1440/1024/400 px and 200 %, live AI off, US$0. Shots in my scratchpad, not the repo. The reviewer's score is the one journey score for this check.

## The journeys (persona · goal · expected)

| # | persona | goal | expected | what happened |
|---|---------|------|----------|---------------|
| J1 | Representative, solo work | open a Study permit case, do the work, review it, read the record | "Self-reviewed by me, licence, time"; the idle Case officer unnamed | **held** — the walk (`walk.cjs 4447`, 10 of 10, exit 0): the Approve dialog asks "I prepared and reviewed this filing myself" first, Ready to file reads `Self-reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 01:58 p.m.` |
| J2 | Representative, second person | review a filing the Case officer prepared | both named, never a self-review, no refusal | **held** — walk 7/7a; `Case officer (Sample) · reviewed by Representative (Sample) (licence R000000)` |
| J3 | Case officer + Representative | nobody did any work; review it anyway | the record says so rather than guess | **held** — `nobody recorded · reviewed by Representative (Sample) (licence R000000), 02:11 p.m.`, `data-record="nobody-recorded"` (`J3-nobody-recorded-1440.png`) |
| J4 | Representative reviewing | add a finding on the case/review page, then approve | the review stands; the finding is not my preparation | **held** (round 3 B1 fixed) — Add finding on the screen, then Approve: 200, record `Case officer (Sample) · reviewed by Representative (Sample)`, `prepared_by ["user-O"]`; by routes, **waiving a CRITICAL** finding and **acknowledging** one behave the same (case `c3f179d9-…`) |
| J5 | Case officer undoing a change | put one of the representative's answers back (C9.2 Undo) | the record names the officer, or at least refuses the self statement | **FAILED** — `prepared_by ["user-R"]`, the statement is asked and signed, record `Self-reviewed by Representative (Sample) (licence R000000)` (cases `63a40f9b-…` browser, `20d71050-…` routes; `J5-record-after-undo-1440.png`) |
| J6 | wrong role | review as the case officer, the client, the configuration author | refused by the server | **held** — 403, 403, 403 |
| J7 | two representatives | the Second representative prepares part, the representative of record reviews | refused in words that are true | **FAILED (words)** — 409 *"You prepared this filing with another case officer…"*; no case officer worked on it (case `bf8a1300-…`) |
| J8 | recovery | reload, double press, two presses at once | one record, said in words | **partly** — the screens hold; two simultaneous presses of the panel's own review route wrote two `filing_review` rows (filing `e89a9215-…`), pre-existing on that route |
| J9 | keyboard only | reach and make the review without a mouse | the whole path works | **held** — 47–48 tabs to "Review the filing", Enter, one tab, Enter → the record line appears |
| J10 | across the boundary | carry on to C8.2 Record the submission | the next step is on the page and waits with a reason | **held** — walk 5 |

## Replayed as checks
Row check `tests/qa/check_qa447_self_review_record.cjs 4447` all passed (twice). `walk.cjs` all passed, exit 0, 10 checks. My own Playwright pass (journeys J3–J7, J9) ran twice with the same result; axe WCAG 2.2 A/AA **0 violations** at 400, 1024 and 1440 px and at 200 % (512 CSS px), no sideways scroll, no console or page errors. `GET …/prepare` 0.13–0.20 s (STANDARDS §9 first view < 1 s).

## Underneath the screens
`check_bk18_preparers.ts` 29/29 · `check_review_rounds.ts` 52/52 · `check_c76_readiness_api.ts` 30/32 (the two reds are the documented order-dependence on a copy holding the configured checkpoint). psql: one `filing_review` row per press; the undo writes the restored answer with the **earlier** author in `source_json.actor` and the undoer only in `source_json.restored.by`, and its audit line is keyed `entity "case fact", entity_key <fact>` — which is why J5 is invisible. The audit branch is a seq scan of `audit_event` (3 977 rows) plus seq scans of `filing_item` and `filing` (2.3 ms).

## Break it (15 minutes)
Review by the wrong role (403 ×3) · two approvals at once (two rows, pre-existing, see J8) · a reviewer's own findings, waives and acknowledgements (no longer counted — the round-3 Blocker is really gone) · a case holding nobody's work (honest empty record) · 400 px and 200 % (no sideways scroll) · the Undo door (J5, Major) · the refusal's words with a second representative (J7, Major).

## Score (each 0, ½ or 1)
| criterion | score | evidence |
|---|---|---|
| task completed | 1 | J1, J2, J3, J4, J10 all complete on the screens |
| next step obvious | 1 | "Record the submission" on the page, with the reason it waits (walk 5) |
| plain words | ½ | the record line reads well; the 409 names "another case officer" for a representative (J7) |
| feedback and state | 1 | the statement is asked before anything is recorded; refusals are in words |
| correct data | **0** | J5: the record claims a self-review over another person's change |
| error recovery | ½ | reload, stale tab and double press hold; two simultaneous presses write two review rows (J8) |
| accessibility and screen sizes | 1 | axe 0 at 400/1024/1440 and 200 %; keyboard-only path completes |
| speed | 1 | prepare 0.13–0.20 s |
| visual quality | 1 | one line, one type size, no ids, at 1440 and 1024 (`J7-record-1024.png`) |
| trust and sources | ½ | licence number and time shown, "nobody recorded" honest; a second person can still be missing and no act is named |
| **total** | **7.5 / 10** | **fail** (below 8, and a 0) |

## To raise the low criteria, most valuable first
1. Count the undoer of an answer (`source_json->'restored'->>'by'`, or key C9.2's audit line to the case) — "correct data" 0 → 1.
2. Make the 409 name who really worked on it instead of "another case officer" — "plain words" ½ → 1.
3. Say on the record what act made someone a preparer — "trust and sources" ½ → 1.
4. Refuse a second review of the same filing and facts on `POST /runtime/filings/:id/review` (pre-existing) — "error recovery" ½ → 1.

## Not tested
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); the Out of date panel's Undo **button** on screen (my set-up never made an item out of date, so J5 used the button's own route); C8.2's printed record on a case with two preparers; the live-AI "stop the review" path (US$0).
