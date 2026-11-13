# BK-18 (QA-448) — journey test, reviewer (round 2), 13 Nov 2026

Branch `claude/screens-true-record` at `fa982f474377eeeab38f7c07f5e32086d3da6b8e`, my own fresh isolated copy **:4449**
(`review2`; 4446–4449 were checked free before starting, so no database was shared with another agent). Live AI off,
US$0, Sample data only. Screens at 1440 px unless said otherwise; shots in my scratchpad, not the repo.
Personas: the **Representative** (user-R, licence R000000), the **Case officer** (user-O), the **Second representative**
(user-T, R000002), the **client** (user-P).

## The journeys

| # | persona · goal | steps | expected | what happened |
|---|---|---|---|---|
| J1 | Representative: "I did this one myself; the record must say so" | Open a case → work it → Send for review → Approve | "Self-reviewed by me, licence, time"; the idle officer unnamed | **held**. The Approve dialog asks "I prepared and reviewed this filing myself" first; `Self-reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 12:28 p.m.` (walk.cjs, all passed, exit 0) |
| J2 | Case officer prepares, Representative reviews | officer opens the case and types the facts → rep sends and approves | "Prepared by Case officer · reviewed by Representative", no refusal | **held**. `Case officer (Sample) · reviewed by Representative (Sample) (licence R000000)`; no 409 (round 1's M1 gone for this shape) |
| J3 | empty case: the officer opens it, nobody types, the rep reviews from Ready to file | Open a case as the officer → "Review the filing" → "Confirm the review" | nobody prepared it: say so, or name nobody | **failed**. `Prepared by · Reviewed by: Case officer (Sample) · reviewed by Representative (Sample) (licence R000000)` — the officer typed nothing (case `2f8d26e9-…`). Review **B1** |
| J4 | same case through Send for review | Send for review → Approve | a review, or an honest reason | **failed**. 409 *"You prepared this filing with another case officer…"* on both presses; a dead end (case `453d5129-…`). Review **M1** |
| J5 | division of labour: the rep types, the officer makes and validates the filing copies | officer generates IMM 5257's copy and uploads the Adobe-validated copy → rep reviews | two people worked: no self statement | **failed**. `prepared_by ["user-R"]`, the statement is asked for and signed, record `Self-reviewed by Representative (Sample)` (cases `e921086e-…`, `d6d78d7e-…`). Review **M2** |
| J6 | recovery: work after the review | rep self-reviews → officer answers a fact the forms do not read | the record of a review already made does not change | **held**. Still `self_reviewed`, `prepared_by ["user-R"]` (case `7702cce2-…`); round 1's B2 fixed |
| J7 | hand-off: the rep hands the review to the second representative | officer types the facts → rep changes the representative of record → user-T reviews | "Prepared by Case officer · reviewed by Second representative" | **failed**. `Case officer (Sample), Representative (Sample) · reviewed by Second representative (Sample) (licence R000002)` — the Representative only handed it over (case `50a63046-…`). Review **M3** |
| J8 | wrong role by URL | review and prepare as the officer, the client, the configuration author, a rep not of record, the other firm | refused in words, nothing recorded | **held**. 403 / 403 / 403 / 403 / 404; `prepare` 403, 403, 404 |
| J9 | keyboard only, main path | Tab to "Review the filing" → Enter → the 400 in words → the self box → "Confirm the review" | the whole task by keyboard | **held**. 47 tabs to the button; `Self-reviewed by Representative (Sample) (licence R000000)` recorded without a mouse |
| J10 | across the boundary to C8.2 | Ready to file → "Record the submission" | the next step is on the page and says why it waits | **held** (walk 5); the recorded line itself checked through `recordedPeople` only |

## Replay, data and break-it
* Scripted: `walk.cjs 4449` all passed, exit 0, twice; `tests/qa/check_qa447_self_review_record.cjs 4449` all passed;
  `check_bk18_preparers.ts` 25/25; `check_review_rounds.ts` 52/52; `check_c76_readiness_api.ts` 27/27 on a fresh copy
  (26/27 when the same copy also holds the configured checkpoint — IMM 5257 is ONLINE there, so B1's barcode case
  cannot fire; pre-existing order-dependence of that suite, not this change).
* axe WCAG 2.2 A/AA **0 violations** at 400, 1024, 1440 px and at 200 % (1024 → 512 CSS px); no sideways scroll; no
  console or page errors; `GET …/prepare` 0.12 s bare, 0.66–0.75 s on the 5-person sample case (budget < 1 s).
* Underneath: one `filing_review` row per review, the stored `kind` matches the screen's `data-reviewed` on every
  journey above; the seeded demo case reads `prepared_by ["user-O"]`; the work record is one query, 2.0 ms, but its
  audit branch is a sequential scan of `audit_event` with no usable index.
* Break-it: a bare case (J3, J4), a handover (J7), work after the review (J6), the client's own answers (never counted,
  P-242), an act by a person off the case team (named, break N4 kept), wrong roles by URL (J8).

## Score (each 0, ½ or 1)
| criterion | score | evidence |
|---|---|---|
| task completed | 1 | J1, J2, J9 end with the right record |
| next step obvious | ½ | J4 dead-ends: the 409 offers a handover (which then prints a false preparer, J7) or passing the warning |
| plain words | ½ | the record line reads well; the 409's words say something that did not happen |
| feedback and state | 1 | the statement is asked before anything is recorded; toasts and alerts in words |
| correct data | **0** | J3, J5, J7: a person named who prepared nothing, and a self-review claimed where two people worked |
| error recovery | ½ | refusals keep the input and explain; J4 has no honest way forward |
| accessibility and screen sizes | 1 | axe 0 at 400/1024/1440 and 200 %, keyboard-only main path |
| speed | 1 | 0.12–0.75 s, inside STANDARDS §9 |
| visual quality | 1 | one line, one type size, no ids, wraps at 400 px |
| trust and sources | ½ | no AI here; the record never says which act made someone a preparer, and names people who did not act |
| **total** | **7 / 10** | **fail** (below 8, one 0) |

**Fixes that would raise it, most valuable first:** (1) never let a weak act name a *second* person — show "nobody
recorded" instead (raises correct data, trust); (2) count the filing copies and the validated copy as work, so the self
statement is only asked when it is true (correct data); (3) let the review of a case nobody has worked on go through,
with words that match (next step, error recovery); (4) keep administrative case acts (team and representative changes)
out of the work record (correct data).

**Not tested:** a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); C8.2's printed
record end to end on a case with two preparers; the lock-window race named in the review's Minors.
