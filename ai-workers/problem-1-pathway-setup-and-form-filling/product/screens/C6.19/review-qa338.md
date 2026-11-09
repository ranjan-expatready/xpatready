# Review: C6.19 QA-338 fix (facts from an earlier case), commit 52f15e7f1 (`git diff origin/main...52f15e7f1`)

Independent reviewer (P-303; I did not build it), 9 Nov 2026. Judged against concept §1 and §3 (BR-1, BR-6), qa report `2026-11-09-c619.md` §3, STANDARDS, EXPERIENCE §6 and QUALITY. My copy: `isolated.sh rev_qa338` on :4436 (runtime range), never :4400. All values are Sample. US$0. Unconfirmed: no counsel.

**Verdict: Changes needed** (commit 52f15e7f1). 0 Blockers, 1 Major, 4 Minors. The QA-338 case as qa reported it is fixed, and its tests are good. But the same escape is still open when the correction on case A is not confirmed yet (M1). Journey score **9/10** (pass): `journey-test-reviewer-2026-11-09-qa338.md`.

## What I ran (on 52f15e7f1, my copy)
* Pack `acceptance/C6.19.test.ts 4436 xr_studio_rev_qa338`: **76/76, exit 0** (128 s). All 8 QA-338 checks ran, including the `if (own)` one.
* qa's `check_qa338_earlier_cases_disagree.cjs`: **4/4, twice**.
* Builder's walk `check_c619_earlier_facts_browser.cjs` (screenshots sent to my scratchpad): **21/21, twice**. axe found 0 violations in each state.
* My probes (scratchpad):
  * `probe/pure.ts`: engine edge cases (an unconfirmed correction, a missing expiry date, ties).
  * `probe/api.cjs`: real cases A → B (copy) → correction on A → C, then POSTs.
  * `probe/ui.cjs`: keyboard, 1024 px, 512 px (1024 at 200 %), 400 px, axe, refetch on focus.
* Grep of the added lines for a combination key or program branch (`vv.`, `lmia`, `wp.`, `combinationKey ===`): none (P-425/P-426 met).
* Not run: `graph.mjs`. It rewrites `qa/GRAPH.md`, which I may not edit. This diff adds no page and no route.

## What holds
* **BR-1, nothing chosen (QA-338 part 1): fixed.** With two earlier cases, no radio is checked and no fact row shows. The hint reads "Pick the earlier case to see what it offers. Nothing is chosen for you." (`08-nothing-chosen-1440.png`; my probe at 1024, 512 and 400 px: checked 0, rows 0).
  * Keyboard: Space picks the first case, an arrow key picks the next. The pick holds through a focus refetch.
* **Newer confirmed value (QA-338 part 2): fixed.** Case B's 2031-05-09 copy reads Out of date, names case A, and shows A's later value and date. It cannot be ticked (`09-case-b-out-of-date-1440.png`).
  * The server refuses it with the same words. My probe ticked B's out-of-date date of birth: 409 "…cannot be re-confirmed: Out of date: R-A-…, another earlier case, confirmed a different value later… Nothing was copied."
  * A value the other case agrees with is never flagged.
* **Judgement calls I accept:**
  * One earlier case is shown without a radio. There is no choice to make, concept §4's header names a single case, and every fact still needs its own tick.
  * Ties keep the first read and flag neither side (`probe/pure.ts` case 4: different values at the same time, nothing Out of date). This fails safe.
* **Same-case and cross-match:** `latestConfirmed` reads only current answers (one per person and fact on a case), so a "newer value on the same case" cannot arise. It also matches people with the same `matchPeople` that `offerFrom` uses, so the two cannot disagree.
* **Speed:** GET 43 ms and POST 49–93 ms with 3 earlier cases. The card shows in 0.6–1.2 s. Reconfirm now reads up to 21 cases, where the card reads 20. Both are bounded, and `offersOf` makes no query per fact.
* **Tests fail when the rule is removed:**
  * Dropping `!newer` from `usable` fails the pure "cannot be ticked" check.
  * Dropping the `factState` comparison in `newerThan` fails the check on case A's agreeing number.
  * Reading only the chosen case on POST fails the API "viaB refused" check (B's number stays usable).

## Major
**M1. A correction on another case that is entered but not yet confirmed still lets the stale copy through: the expired passport's number is copied onto case C** (concept §1 "an expired passport is caught before it reaches a form"; BR-6; the fix asked for "whose document has expired… cannot be ticked").
* Evidence, `probe/api.cjs` on :4436, real cases:
  1. On A: number R3310001, expiry 2031-05-09 and date of birth, all confirmed.
  2. B re-confirms all three from A (201).
  3. On A, the officer edits the expiry to 2025-01-15 without pressing Confirm section (DECLARED, not confirmed).
  4. Case C is opened.
* What the card on C shows:
  * Case A: passport number **Expired, blocked**.
  * Case B: the same number R3310001 and the expiry 2031-05-09 are **usable, with no flag**.
* POST from B for the number: **201 "Re-confirmed 1 fact from R-B-…"**. The expired passport's number is now on C. The UI shows the same thing at 512 px: B's 2031 row is New and tickable.
* The engine reproduces it (`probe/pure.ts` case 1).
* The card gives opposite answers for the same person and passport depending on which radio the officer picks. That is the QA-338 failure itself.
* Cause:
  * `latestConfirmed` (`engine/runtime/earlier-facts.ts:149-160`) skips `!a.confirmed`.
  * The cross-case `dated` loop (l.183-189) reads only that map.
  * On a case's own answers, the engine reads unconfirmed dates on purpose (l.181: "a confirmed passport number never escapes an expired date").
* Fix: for the expiry dating only, use a second "newest value per person and fact, confirmed or not" map. That can be `latestConfirmed(reads, { anyStatus: true })`. Keep confirmed-only for the `newer` (Out of date) flag, as BR-2 says.
* Tests:
  * Fail test: the probe's sequence. B's number on C is Expired, and POST from B is 409.
  * Pass test: a confirmed correction still behaves as now.

## Minors
**m1. A missing expiry date borrows another case's date even when that case holds a different passport** (the judgement call; BR-6 challenge m1 "with no expiry date on the earlier case the covered facts warn 'not known'").
* `probe/pure.ts` case 2: B holds a newer passport number Z8 with no expiry date, and A holds the old Z7 with 2025-01-15. B's Z8 reads **"The passport expired on 15 Jan 2025"**, blocked. That is another document's date, and the words do not say where it came from.
* Case 3: A's old passport is valid to 2033. B's Z8 loses its "not known" warning, and the card shows no flag at all.
* Fix: borrow a date only from a case whose passport number equals this case's (or that holds the newest number). Otherwise keep "not known".

**m2. The Out of date advice can send the officer to a value that is itself refused.**
* In `09-case-b-out-of-date-1440.png` the advice says "re-confirm it from C619W-A… if that value is still true". Directly below it the card says the passport expired on 15 Jan 2025, and A's row is Expired.
* Fix: when the newer value is itself blocked, end the advice at "Check it with the client".

**m3. "Newer" ignores a copy's `reconfirmed_at`** (the judgement call).
* A copy keeps its source's `at` (`api/src/earlier-facts.ts:159`), so a later re-confirmation with the client never counts. Two consequences:
  * A copy re-confirmed after the other case's value is still marked "confirmed a different value later". That statement is untrue.
  * In one order of events the other value is the one offered as usable. That order is: a case opened after B holds V2 at t5, and B re-confirms V1 from A at t9.
* Rare, and it mostly fails safe. Fix: compare on max(`at`, `reconfirmed_at`).

**m4. Test and bound gaps.**
* No pack check covers the POST refusal through `newer.words` (`api/src/earlier-facts.ts:137`). The API checks refuse only through the expiry branch. My probe shows it works. Add one API fail check with a non-expiry fact, for example the date of birth corrected on A.
* Reconfirm reads the chosen case plus 20 others (`:111`), while the card reads 20. With more than 20 earlier cases, the 21st can make the server refuse what the card offered.
* `candidates()` runs twice per POST.

## BIC (EXPERIENCE §6; only the checks this change touches; the others are as in `review.md`)
| Check | Score | Evidence |
|---|---|---|
| BIC-03 No stale answers | Partly | Confirmed later correction: met (`09-…-1440`). Unconfirmed correction: not met (M1). |
| BIC-05 Source shown | Met | Out of date names the case, the value and the date. |
| BIC-07 Conflicts shown | Met | Both values are shown; nothing is overwritten. |
| BIC-13 Errors say what and how | Partly | The 409 wording is right. The advice can point to a refused value (m2). |
| BIC-14 Tooltips | Met | The Out of date chip is a focusable button with a tooltip. |
| BIC-18 States | Met | The nothing-chosen state teaches (`08-…-1440`). |
| BIC-19 Layout | Met | One heading and one primary button. At 1024 px no sideways scroll. At 200 % the table scrolls inside its own box (as before). |
| BIC-20 Keyboard | Met | Radios work by arrow keys and the hint is visible. axe found 0 violations at all three widths. |

## D-scores touched (0–2)
D1 1 (M1) · D2 1 (M1 lets an expired value in) · D5 2 (the pick holds on refetch; reload is safe) · D10 1 (m2) · D11 2 · D13 2 · D15 2 · D16 1 (m4) · D18 2 · D17/D20 simulated only.

## Could not check
* A real screen reader.
* An unaided walk by an intended user.
* A race between the POST's read of the other cases and a correction landing during the transaction: the other cases' answers are not locked. This is the existing pattern, and I did not probe it.
