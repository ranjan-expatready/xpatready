# Review: C6.19 QA-338 fix (facts from an earlier case), round 4, commit 234b81af9

Reviewed SHA: **234b81af94f2a5cea4db989feb177d05043b7626**. Diffs: `git diff a6c11289c 234b81af9` (round 4) and `git diff origin/main...234b81af9` (whole change). The round 3 notes below were made on a6c11289c.

Independent reviewer (P-303; I did not build it), 9 Nov 2026. Judged against concept §1 and §3 (BR-1, BR-6), qa report `2026-11-09-c619.md`, STANDARDS, EXPERIENCE §6 and QUALITY. I used my own copy, `isolated.sh rev3_qa338` on :4436 (ttl 40), and stopped it afterwards. I never used :4400. All values are Sample. US$0. Unconfirmed: no counsel.

**Round 1 (52f15e7f1, another reviewer):** M1, m1, m2, m3 and m4 are all fixed (evidence in round 2).
**Round 2 (5b14fc1e7, me):** R1 (Major) and r1 are both fixed (round 3 evidence below).
**Round 3 (a6c11289c, me):** Approve, with one Minor, R4. R4 is fixed in round 4.

**Verdict: Approve** (commit 234b81af94f2a5cea4db989feb177d05043b7626). 0 Blockers, 0 Majors, 0 Minors open. Journey score **10/10** (pass): `journey-test-reviewer-2026-11-09-qa338.md`.

## Round 4 (234b81af9, my copy `rev4_qa338` on :4436, ttl 40, stopped afterwards)
* **What changed.** Another case's date, confirmed or only typed, can now only add a stricter flag. Each fact keeps the strongest of three flags: from its own dates, from `datedBy(latest)` and from `datedBy(latestAny)` (`engine/runtime/earlier-facts.ts:146-153`). A case's own expired date therefore always blocks, as on origin/main before QA-338.
* **Runs:**
  * Pack: **86/86, exit 0**, including the R4 no-number fail check and the renewal-from-A pass check.
  * qa's check: **4/4, twice**.
  * Builder's walk: **21/21, twice**.
  * The card at 1440 px, 1024 px and 512 px (1024 at 200 %): axe found 0 violations and no radio is checked first.
* **R4 is fixed.**
  * Setup: B holds Q1110001 with 2025-01-15, confirmed. A confirms only 2035-01-15 and has no number (`probe2/r4n.cjs`).
  * B's number now reads **Expired** and cannot be ticked. The date reads Expired and Out of date.
  * POST of the number: **409** "…The passport expired on 15 Jan 2025…". C holds nothing.
  * The card shows the same at all three widths (`probe2/shots4/r4-card-*.png`).
* **Renewal path works, through the product.** A confirms the new passport, Q2220002 with 2035-01-15 (`probe2/renew.cjs`):
  * Picking B: both facts read Expired and Out of date, and the POST returns 409.
  * Picking A: both facts are usable, and the POST returns **201**. C now holds Q2220002 and 2035-01-15.
* **No regressions.**
  * Round 1's M1 probe still gives 409 (expired) and 409 (Out of date date of birth).
  * R1, with both the number and the date typed on A: 409.
  * m1 still says "not known".
  * m3 holds: a newer re-confirmation counts, and the pure check passes.
  * A later date typed within 6 months only warns (Expires soon). B's number can still be ticked.
* **Is it over-blocking?** Not in a way that matters. I accept it.
  * The one new refusal: A confirms a later date for the *same* number (pure case R3). B's copies now read Expired, where in round 3 they were usable.
  * The officer still has a working path through the screen: pick A, where the passport is usable when A holds the number, or enter the passport on C. That is BR-6's "enter the new document".
  * B's own data does say the passport expired, so the block fails safe and has a visible way out.
  * A rarer case: an old copy on B re-confirmed *after* A's renewal can make A's facts Out of date, and now also Expired. This already blocked through Out of date since 52f15e7f1, so it is not new.

## Round 3 notes (a6c11289c)

### What I ran (on a6c11289c, my copy)
* Pack `acceptance/C6.19.test.ts 4436 xr_studio_rev3_qa338`: **85/85, exit 0**. It includes the new R1 checks (pure and API, B3/A3/C3) and the m3 check.
* qa's `check_qa338.cjs 4436`: **4/4, twice**.
* The builder's walk `check_c619_earlier_facts_browser.cjs`: **21/21, twice** (screenshots in scratchpad `probe2/shots3`).
* My API probes, re-run (all in scratchpad):
  * Round 1's M1 probe `probe/api.cjs`.
  * `probe2/r1.cjs`, in its "both" and "dateonly" modes.
  * `probe2/r1c.cjs`, the control.
  * New: `probe2/r4.cjs` and `probe2/r4n.cjs`.
* Pure probe `probe2/pure3.ts`: 12 engine cases (M1, m1, R1, R1b, R2, R3, R4, a date soon, a non-date, m3 from both sides).
* Card walk `probe2/ui.cjs` and `ui4.cjs` at 1440 px, 1024 px and 512 px (1024 at 200 %), with Space on the radio and axe.
* Grep of the added non-test lines for a combination key or program branch: none (P-425/P-426 met).
* Not run: `graph.mjs`, because it rewrites `qa/GRAPH.md`. No page or route was added.

### Round 2 findings: evidence
* **R1 is fixed.**
  * Setup: B holds the old passport, confirmed (Q1110001, 2025-01-15). A holds a renewal that was only typed: the new number and 2035-01-15, or the date alone.
  * Card on C: both of B's facts read **Expired** and cannot be ticked at all three widths (`shots3/r1-card-1024-z1.png`).
  * POST: **409** "…The passport expired on 15 Jan 2025… Nothing was copied". C holds nothing.
  * In round 2 the same POST returned 201.
  * The control, with nothing typed on A, is unchanged (409).
  * Cause fixed:
    * `offerFrom` (`engine/runtime/earlier-facts.ts:146-152`) lets only a newer *confirmed* value replace the date (`datedBy(latest)`).
    * Flags worked out from unconfirmed values (`latestAny`) can only raise a fact's flag (`strength`, `:121`).
  * The new pure check fails on 5b14fc1e7's logic: my round-2 probe of the same input gave `usable: true`.
* **r1 is fixed.**
  * A pure check now covers m3 from both sides: B's re-confirmed copy is not Out of date, and A's value is.
  * My probe agrees.
* **Nothing earlier regressed.**
  * M1 probe:
    * B's number and the 2031 expiry read Expired, and the POST returns 409.
    * B's out-of-date date of birth returns 409 with the Out of date words.
  * m1: "not known" stays.
  * m2: the advice wording is unchanged.
  * BR-1: 0 radios checked at all three widths.
* **Raising flags only fails safe.**
  * A later date typed within 6 months adds an Expires soon warning to B's valid date, which can still be ticked.
  * A non-date typed on A adds the "not known" warning to B's number, which can still be ticked.
* **States.** axe found 0 violations on the card at three widths. No sideways scroll and no console errors.

### Minor (fixed in round 4)
**R4. When another case confirms a later expiry but holds no passport number, an out-of-date passport's number can still be ticked, with no flag on its own row** (BR-6 "every fact the rule covers, e.g. the whole passport").
* `probe2/r4n.cjs` on :4436, with real cases:
  * B holds Q1110001 and 2025-01-15, confirmed.
  * A confirms only a later expiry date, 2035-01-15, and has no number.
* What C's card shows (`shots3/r4-card-1024-z1.png`):
  * B's date row reads **Out of date** and cannot be ticked.
  * B's number Q1110001 shows only **New** and can be ticked.
* POST of the number: **201**.
* Why Minor and not Major:
  * On origin/main, B's own expired date blocked the number. So this behaviour came in with the QA-338 change (52f15e7f1), not with round 3.
  * The row directly above says "Out of date… check with the client which is true before using either".
  * When A also confirms the same number, unblocking the number is right (my pure R3 case). When A confirms a new number, the number reads Out of date (R2).
* The gap is only that, when A holds no number, the card cannot tell a corrected date from a renewal.
* The new pack check "a renewal confirmed on case A replaces the date: B's number is no longer Expired" builds A with no number. It therefore encodes this ambiguous case under the word "renewal".
* Fix (Should, no program branch):
  * A confirmed date from another case may lift a covered fact's flag only when that case confirms the same value for that fact.
  * Otherwise the covered fact keeps a warning ("The expiry date was changed on <case>: check the passport number with the client").
  * Give the pack check's A the same number, and add the no-number case.

## BIC (EXPERIENCE §6; only the checks this change touches; the others are as in `review.md`; state at 234b81af9)
| Check | Score | Evidence |
|---|---|---|
| BIC-03 No stale answers | Met | M1, R1 and R4 are all blocked (round 4: `shots4/r4-card-1024-z1.png`). |
| BIC-05 Source shown | Met | Out of date names the case, the value and the date. |
| BIC-07 Conflicts shown | Met | Both values are shown; nothing is overwritten. |
| BIC-13 Errors say what and how | Met | The 409 words give the reason and "Nothing was copied". |
| BIC-14 Tooltips | Met | Unchanged. |
| BIC-18 States | Met | The nothing-chosen state teaches (`08-…-1440`). |
| BIC-19 Layout | Met | No sideways scroll at 1024 px or at 200 %. |
| BIC-20 Keyboard | Met | Space picks a radio. axe found 0 violations at three widths. |

## D-scores touched (0–2)
D1 2 · D2 2 (R4 fixed) · D5 2 · D10 2 · D11 2 · D13 2 · D15 2 · D16 2 (each fix has a fail test) · D18 2 · D17/D20 simulated only.

## Could not check
* A real screen reader.
* A headed walk by a person, or an intended user's unaided walk.
* A race between the POST's read of the other cases and a correction landing during the transaction: the other cases' answers are not locked. This is the existing pattern, as in rounds 1 to 3.
