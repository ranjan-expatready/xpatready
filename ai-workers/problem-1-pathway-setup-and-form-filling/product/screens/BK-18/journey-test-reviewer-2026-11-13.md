# BK-18 (QA-448) — journey test, reviewer, 13 Nov 2026

Commit `c8c28c199a6aa5629b3e622699fedf75871f2569` (branch `claude/screens-true-record`, PR #1691). Fresh isolated copies
from this branch: `rev_c76` on **:4447** (Visitor visa release 2, the C7.6 pack's own setup) and `rev_bk18` on :4446 —
see "What I could not test" about :4446. Live AI off, US$0. Screens driven in a real browser (Playwright, 1440/1024/400 px);
data read back through the product's own routes and psql.

## Journeys walked

| # | Persona · goal | What happened | Held? |
|---|---|---|---|
| J1 | Representative: open a Study permit case with the dialog's default team, work it, send for review, approve alone | the Approve dialog asked "I prepared and reviewed this filing myself"; record read `Self-reviewed by Representative (Sample) (licence R000000), Nov 13, 2026, 11:20 a.m.`; the Case officer is not named | **yes** |
| J2 | Representative: review a case **the Case officer opened** and nobody else touched | no statement asked; record read `Prepared by · Reviewed by: Case officer (Sample) · Representative (Sample) (licence R000000), …` — the QA-448 line again | **no** (B1 below) |
| J3 | Representative: type the case's facts on a case the Case officer only opened, then approve | 409 "You prepared this filing with another case officer…" — no other officer prepared anything | **no** (M1) |
| J4 | Case officer ticks "none apply" on three sections; Representative does the rest and approves | record read `Self-reviewed by Representative (Sample) …`: the officer's recorded work is invisible and BR-8's second-person guard never fires | **no** (M2) |
| J5 | Case officer answers one question **after** a self-review that still counts | the self-reviewed filing's line turned into a two-person record: `Representative (Sample), Case officer (Sample) · Representative (Sample) (licence R000000), Nov 13, 2026, 11:20 a.m.` while the stored review is `self_reviewed` at 11:20:17 | **no** (B2) |
| J6 | Two people really worked (officer answered, representative reviewed) | both named, never a self-review (C7.6 pack N4 case, and the builder's walk step 6 on a seeded `ACC-` case) | yes |
| J7 | Wrong role and recovery: the case officer approves · the client approves · two approvals at once · reload | 403 "Only the representative of record approves or sends back…", 403 "Only the case officer can do this.", one 200 + one 409 "This filing was decided meanwhile. Reload.", exactly **1** `filing_review` row | yes |

## Replayed as checks
* The row's check `tests/qa/check_qa447_self_review_record.cjs 4446`: **all passed** (A and contrast B).
* `product/screens/BK-18/walk.cjs` on a fresh copy: **7 of 8** — "walk 6 setup: a case two people worked on is on the list" fails,
  because that step hunts for a leftover `ACC-…` case from the acceptance suite, not a case the walk itself makes (walk.md says 8 of 8).
* `tests/runtime/check_bk18_preparers.ts` 14/14 · `tests/runtime/check_review_rounds.ts` 52/52 · `tests/check_c76_readiness_api.ts` on :4447 **24/24**.
* axe WCAG 2.2 A/AA on the case page at 400, 1024 and 1440 px: **0 violations**, no sideways scroll, no page errors; 1024 px at 200 % zoom: no sideways scroll, the record line readable.
* Speed: `GET /runtime/cases/:id/prepare` 72–136 ms over 4 runs per case; the new grouped query plans as two index scans (0.09 ms, `EXPLAIN ANALYZE`). Within §9.

## Break-it pass (15 min)
Double approval (one wins, 409 for the loser, one row) · wrong role by API · the client as approver · a fact changed after
the review (the review is withdrawn and the record line disappears, as C7.6 intends) · a fact changed after a review that
still counts (**B2**: the record rewrites itself). No console or page errors anywhere.

## Score (reviewer, this check)

| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | J1 end to end in the browser |
| next step obvious | 1 | Send for review → Approve → the statement is asked before anything is recorded |
| plain words | ½ | the two-people line reads `A, B · C (licence …)` — three names, two kinds of separator; the 409 of J3 names an officer who prepared nothing |
| feedback and state | ½ | J5: `data-record="two-people"` on an element whose `data-reviewed` is `self_reviewed` |
| correct data | **0** | J2, J4, J5: the professional record is untrue in three reachable journeys — the very harm P-525 (1) names |
| error recovery | 1 | J7; refusals in words with a way out |
| accessibility and screen sizes | 1 | axe 0 at 400/1024/1440, 200 % zoom clean |
| speed | 1 | prepare 72–136 ms; added query 0.09 ms |
| visual quality | 1 | one quiet line in the panel, team tokens, no layout change |
| trust and sources | ½ | the record infers "prepared" from "opened the case"; C8.2 still reads team membership, so the two records can disagree |

**Score 7.5 / 10 — fail** (below 8 and one criterion at 0).

Fixes that would raise it, most valuable first: (1) take the work record as at the review's time and name nobody whose
first act came later (B2); (2) do not treat opening a case as preparing its filings (B1, M1); (3) count the acts that
leave no answer row — "none apply", repeating rows, uploads — or say on screen that the record covers typed facts only (M2);
(4) write the two-people line as `Prepared by <A> and <B> · Reviewed by <C>`.

## What I could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); the C8.2 recorded-filing line on a
case whose preparer is not a case officer (reaching Ready to file needs a validated barcode copy, BK-19/BK-20).
**Caution:** my first start of an isolated copy on :4446 reported success, but the port was still held by another
agent's copy (`xr_studio_breaker18`; `var/isolated-rev_bk18/api.log` shows `EADDRINUSE`). That server runs this same
working tree and commit (its pages show the new `data-record` line), so what it showed is this branch's behaviour, but
J3, J4 and J5 were walked on its data (the configured checkpoint's Study permit) and only J1, J2, J6 and J7 were
re-walked on my own copy :4447 (Visitor visa), where every new answer withdraws the review and so hides J5.
