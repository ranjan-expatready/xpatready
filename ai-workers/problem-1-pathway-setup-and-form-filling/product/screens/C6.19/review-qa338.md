# Review: C6.19 QA-338 fix (facts from an earlier case), round 2, commit 5b14fc1e7

Reviewed SHA: **5b14fc1e784990394fd675ed028444d0e9bacc72** (`git diff origin/main...5b14fc1e7`; round-2 changes `git diff 52f15e7f1 5b14fc1e7`). Independent reviewer (P-303; I did not build it and did not write round 1), 9 Nov 2026. Judged against concept §1 and §3 (BR-1, BR-6), qa report `2026-11-09-c619.md`, STANDARDS, EXPERIENCE §6 and QUALITY. My copy was `isolated.sh rev2_qa338` on :4436, started with ttl 40 and stopped afterwards. I never used :4400. All values are Sample. US$0. Unconfirmed: no counsel.

**Round 1 (52f15e7f1, another reviewer):**
* M1, a stale copy let through by an unconfirmed correction: **fixed**.
* m1, expiry borrowed from another passport: **fixed**.
* m2, advice pointing to a refused value: **fixed**.
* m3, copies dated by their original time: **fixed in code, no test**.
* m4, no pack check for the Out of date refusal, POST and card reading different cases, candidates read twice: **fixed**.

**Verdict: Changes needed** (commit 5b14fc1e7). 0 Blockers, 1 Major (R1, a regression caused by the M1 fix), 1 Minor. Journey score **9.5/10** (pass): `journey-test-reviewer-2026-11-09-qa338.md`.

## What I ran (on 5b14fc1e7, my copy)
* Pack `acceptance/C6.19.test.ts 4436 xr_studio_rev2_qa338`: **81/81, exit 0** (125 s).
* qa's `check_qa338.cjs 4436`: **4/4, twice**.
* Builder's walk `check_c619_earlier_facts_browser.cjs` (screenshots to my scratchpad): **21/21, twice**.
* Round 1's M1 probe `probe/api.cjs`, re-run.
* My probes, all in scratchpad `probe2/`:
  * `pure.ts`: engine cases, also run against 52f15e7f1 in a temporary worktree to tell regressions from old behaviour.
  * `r1.cjs` and `r1c.cjs`: real cases through the API.
  * `ui.cjs`: the card at 1440 px, 1024 px and 512 px (1024 at 200 %), with keyboard and axe.
* Grep of the added lines for a combination key or program branch: none (P-425/P-426 met).
* Not run: `graph.mjs`. It rewrites `qa/GRAPH.md`, which I may not edit. No page or route was added.

## Round 1 findings: evidence
* **M1 fixed.** Re-running `probe/api.cjs` gives this on C for case B:
  * Number R3310001 and expiry 2031-05-09: **Expired, blocked**.
  * Date of birth: Out of date.
  * POST of B's number: **409** "…The passport expired on 15 Jan 2025… Nothing was copied."
  * In round 1 the same POST returned 201.
  * The new pure check fails without `latestAny`: run against 52f, the same input gives `usable: true`. The new API check (A2/B2/C2) passes.
* **m1 fixed.** `offerFrom` (`engine/runtime/earlier-facts.ts:144-147`) now reads only dates the case itself holds.
  * B with the new number Z8 and no date, next to A's old expired Z7: "not known", usable. In round 1 this showed "expired on 15 Jan 2025".
  * With A's old date still valid, "not known" now stays.
  * A pure check fails if borrowing comes back.
* **m2 fixed.** The advice now reads "Check with the client which is true before using either." (`:158`). It no longer sends the officer to A when A's value is refused (`09-case-b-out-of-date-1440.png` re-shot).
* **m3 fixed in code.** `seenAt` (`api/src/earlier-facts.ts:42`) takes `copiedFrom.at` (`reconfirmed_at`, `runtime.ts:383`).
  * Pure probe: B's copy re-confirmed at t9 is no longer Out of date against A's value from t5. A's value is now the one flagged.
  * On 52f it was the reverse.
* **m4 fixed.**
  * `candidates(c)` runs once per POST (`:109`).
  * POST reads the same first 20 cases as the card, adding the chosen case only when it is beyond them (`:115`).
  * An API check covers the refusal through `newer.words`: 409 "cannot be re-confirmed: Out of date: C619-A2-…".
  * The refusal now gives the Out of date reason first (`:141`). This is a fair choice: the card shows both chips.
* **Still holds.**
  * BR-1, nothing chosen: 0 radios checked at all three widths (`ui.cjs`). Space picks a case.
  * The Out of date flag still uses confirmed answers only (BR-2).
  * axe found 0 violations on the card at 1440, 1024 and 512 px. No sideways scroll. No console errors. GET took 40 ms.

## Major
**R1. A later date typed but not confirmed on another case now lifts a block on an expired passport. Its number and expiry are copied onto case C with no flag** (concept §1 "an expired passport is caught before it reaches a form"; BR-6). This regression comes from the M1 fix.
* Evidence, `probe2/r1.cjs` on :4436, real cases:
  1. On B: old passport Q1110001, expiry 2025-01-15, confirmed (VERIFIED). This is already past today.
  2. On A: the officer starts entering the renewed passport, Q2220002 and 2035-01-15, without pressing Confirm section.
  3. Case C is opened.
* What C's card shows for B: expiry **2025-01-15** and number Q1110001, each with only a **New** chip. Both can be ticked (`probe2/shots/r1-card-1024-z1.png`, the same at 1440 and 512).
* POST: **201 "Re-confirmed 2 facts from R1-B-…"**. C now holds 2025-01-15 and Q1110001.
* Typing only the later date on A (`dateonly`) gives the same result. Without anything typed on A (`r1c.cjs none`), both are Expired, blocked, and the POST returns 409.
* At 52f15e7f1 the pure probe blocks all of these cases (R1 and R1b Expired). So the change in 5b14 caused it.
* Cause:
  * `offerFrom` `:144-147` replaces this case's own date with the newer value from `latestAny`, which includes unconfirmed answers. The newer date is then the only one checked.
  * An unconfirmed value can therefore loosen a block, not only tighten it. A draft, a typo, or another passport's date entered on any earlier case is enough.
* Fix (keep one rule, no program branch):
  * The confirmed `latest` may still replace the date (this keeps round 1's accepted case: a later confirmed valid date for the same passport).
  * `latestAny` may only add a stricter flag. Work out the flags with and without the unconfirmed date, and keep the stronger one per fact (`expiryFlags` `put` ranking).
* Tests, each failing today:
  * Pure: this R1 case and R1b.
  * API: B's own expired passport with a later date typed on A. The card shows Expired, the POST returns 409, and nothing is copied.
  * Keep the M1 checks green.

## Minor
**r1. The m3 rule has no test.** No pack, API or browser check names `seenAt` or `reconfirmed_at` (grep). Replacing `seenOf(a)` with `confirmedAt` would leave all 81 green. Add a pure check: a copy re-confirmed after the other case's value is not Out of date, and the other value is.

## BIC (EXPERIENCE §6; only the checks this change touches; the others are as in `review.md`)
| Check | Score | Evidence |
|---|---|---|
| BIC-03 No stale answers | Partly | Confirmed and unconfirmed corrections: met (M1 probe). Expired copy with an unconfirmed later date elsewhere: not met (R1, `r1-card-1024-z1.png`). |
| BIC-05 Source shown | Met | Out of date names the case, the value and the date (`09-…-1440`). |
| BIC-07 Conflicts shown | Met | Both values are shown; nothing is overwritten. |
| BIC-13 Errors say what and how | Met | 409 words give the reason and say "Nothing was copied". The advice no longer points to a refused value. |
| BIC-14 Tooltips | Met | Unchanged since round 1. |
| BIC-18 States | Met | The nothing-chosen state teaches (`08-…-1440`). |
| BIC-19 Layout | Met | No sideways scroll at 1024 px or at 200 %. |
| BIC-20 Keyboard | Met | Space picks a radio. axe found 0 violations at three widths. |

## D-scores touched (0–2)
D1 1 (R1) · D2 1 (R1 lets an expired passport through) · D5 2 · D10 2 (m2 fixed) · D11 2 · D13 2 · D15 2 · D16 1 (no test for R1; r1) · D18 2 · D17/D20 simulated only.

## Could not check
* A real screen reader.
* A headed walk by a person, or an intended user's unaided walk.
* A race between the POST's read of the other cases and a correction landing during the transaction: the other cases' answers are not locked. This is the existing pattern, as in round 1.
