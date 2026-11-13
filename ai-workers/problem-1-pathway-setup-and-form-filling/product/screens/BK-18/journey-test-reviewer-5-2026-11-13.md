# BK-18 (QA-448) — journey test, reviewer, round 5, 13 Nov 2026

**Commit:** `ab9ff9bdd6ecd09382c725854a6a7e955234629e` · branch `claude/screens-true-record` · PR #1691 · reviewer agent (did not build it).
**Where:** my own fresh isolated copy of this branch on **:4446** (`review5`; 4446–4449 all answered `000` before I started, 4441 and 4445 were other people's; stopped at the end). Headless Chromium at 1440, 1024, 400 px and at 200 % (1024 → 512 CSS px), the product's own screens, psql underneath. Shots in my scratchpad, not the repo. US$0, no model call.

## The journeys (persona · goal · result)

| # | Persona and goal | What happened |
|---|---|---|
| J1 | Representative of record: do the work alone and approve it | Open a case → type facts → Send for review → Approve. The dialog asks "I prepared and reviewed this filing myself" before anything is recorded; Ready to file reads `Self-reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 02:40 p.m.`, no case officer named. Row check `check_qa447_self_review_record.cjs 4446` **all passed**; `walk.cjs 4446` **all passed, exit 0, 10 of 10** |
| J2 | Representative: review from the Ready to file panel itself (the route this PR rewrote) | "Review the filing" → Confirm the review → refused at the field in plain words ("Confirm you prepared and reviewed it yourself.", no API field name), the statement box appears, tick, Confirm → `Self-reviewed by Representative (Sample) (licence R000000)`, `data-record="self-reviewed"` |
| J3 | **Case officer undoes one of the representative's answers** (round 4 M1) | Representative types the passport twice, the case officer presses Undo (the Out of date button's own route), the representative reviews → **refused**: "You worked on this filing and so did somebody else at the firm…". `prepared_by ["user-R","user-O"]`. Nothing recorded; no Self-reviewed line anywhere |
| J4 | **Two representatives, no case officer work** (round 4 M2) | Second representative types a fact, representative of record types another and reviews → the same true words; the refusal names no role the case does not have. `prepared_by ["user-T","user-R"]` |
| J5 | Recovery: take the escape the refusal names | Change the representative of record to one who did not work on it → that person approves with no statement asked → record `Representative (Sample), Case officer (Sample) · reviewed by Second representative (Sample) (licence R000002)`, `data-record="two-people"` |
| J6 | A case holding nobody's work | Officer opens and sends it, the representative approves → `nobody recorded · reviewed by Representative (Sample) (licence R000000)`, `data-record="nobody-recorded"` |
| J7 | The other escape: pass the review warning with a reason | CRITICAL "The representative of record has not reviewed this filing" passed with a written reason (200), kept with who, when and the reason; no review and no Self-reviewed line is invented |
| J8 | Wrong role, by route | `POST /runtime/filings/:id/review` → 403 for the case officer, the client, the configuration author and a second representative who is not of record; Undo → 403 for the client and the configuration author |
| J9 | Later work after a record exists | A case officer undoes an answer **after** a Self-reviewed record: the review reopens (`reviewed: null`, `representative_review` CRITICAL) and `prepared_by` becomes `["user-R","user-O"]` — no stale one-person record is carried into filing |
| J10 | Keyboard only | 45 Tabs to "Review the filing", Enter, Tab to "Confirm the review", Enter, Shift+Tab to the statement, Space, Enter → Self-reviewed. Visible focus throughout |

## Break pass (15 min)
Two presses of the panel's review at the same instant: both 200, **two `filing_review` rows** for one filing (carried, pre-existing on main — the brief carries it). Stale tab: `facts_hash` refuses it (409, Reload). A review on a case holding nobody's work: self-reviewed on the person who stood behind it, never a second person's review. Client and configuration actors refused everywhere. No page or console error in any journey.

## Data underneath
`prepared_by` matched exactly who acted on every journey (psql + the prepare view). The Undo branch is load-bearing: on my J3 case, the work query **without** `source_json->'restored'->>'by'` returns only `user-R`; the branch alone returns `user-O`. One `filing_review` row per press; audit line written with the review. Prepare view 94–121 ms (five reads).

## Score (each 0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J5, J6, J10 all end in a record |
| Next step obvious | 1 | the refusal names two escapes; both are real (J5, J7) |
| Plain words | 1 | the 409 and the field error carry no role the case lacks and no API field name |
| Feedback and state | 1 | statement asked before anything is recorded; "Nothing was recorded" + Reload on refusal |
| Correct data | ½ | right on every journey walked, but a second person who runs or overrides the **case check** is still not in the work record (`api/src/assessments.ts:87,151,167` log against the assessment, not the case) — reproduced on the sample Visitor visa case |
| Error recovery | 1 | stale tab, reload, double press, refusal keep the typed note and the focus |
| Accessibility and sizes | 1 | axe WCAG 2.2 A/AA **0 violations** at 400, 1024, 1440 px and 200 %, no sideways scroll, keyboard-only completes |
| Speed | 1 | prepare 94–121 ms, well inside the budget |
| Visual quality | 1 | one line, one type size, no ids, at 1440 and 1024 |
| Trust and sources | 1 | name, licence number, time; "nobody recorded" rather than a guess; no AI anywhere |

**Score: 9.5 / 10 — pass** (no criterion at 0).

## Could not test
A real screen reader and an intended user's unaided walk (D17/D20 stay with the founder). The Out of date panel's Undo **button** on screen: this checkpoint's Study permit case has no Online item and no validated copy (no PDF tooling here), so no item ever goes out of date; J3 uses the button's own route and the component at `web/src/runtime/out-of-date.tsx:42`. The live-AI "stop the independent review" path (US$0). Whether CI is green on this commit.
