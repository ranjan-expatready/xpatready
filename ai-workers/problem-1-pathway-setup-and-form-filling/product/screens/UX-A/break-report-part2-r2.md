# UX-A part 2: break report, round 2 (commit 2b6b82cf, fixes in 47c79e78 + 2b6b82cf)

The rule under test is `engine/setup-checklist.ts` `needsYouItems`. A combination is on Needs you when the person has one of three things on it:
- a review;
- a confirmation that a screen offers;
- release-blocking problems this person fixes.

The builder says Programs and To review both read this one rule. Screen-less confirmations are never Needs you. A release blocked for someone else's fix shows as Waiting for others.

Setup: isolated copy `brk_uxa2` on :4471, used by no one else. I tested the six (reset-to-six) and the demo sample (reset + load), as user-A (author+review), user-B (approver) and user-C (reviewer+expert). Nothing was priced (US$0) and :4400 was not touched.

After each change I ran one script that compares, per person and per combination:
- Programs `needsYou` (catalogue for both Pathway types, plus the card's `viewer.needsYou`);
- To review's rows;
- each setup row's number against the Review and release tab's errors.

## Round-1 breaks re-run
- **B1: fixed.** No Choose/Confirm the checklist page or Confirm who can apply row appears for anyone, on the six or the demo sample.
- **M1: fixed.** With IMM 5409 on Paper plus an approved "IRCC accepts: PDF upload", the row, the card and the tab all say **7** ("Fix 7 form problems", "7 to fix").
- **M2: fixed.** A filing set to null (LMIA in the demo sample, Visitor visa in the six) makes Needs you plus "Fix 1 problem" for user-A only. user-B and user-C get Waiting, "The configuration author fixes them". None of user-C's own rows disappear.
- **m1: fixed.** Titles now include the Pathway ("Temporary residence › Visitors › Visitor visa").
- **m2: fixed.** The empty state now says "Their problems are fixed by the configuration author".
- **m4: fixed.** There are no "See 1 problem" rows.
- **m3:** left as the 15 s poll, as the builder said; not re-tested.

## New breaks

**M1 (Major): Programs and To review still disagree on "Needs you" for user-B and user-C.**
- Six: Programs reports `counts.needs = 0` for user-B and user-C in both Pathway types. Each card's `viewer.needsYou` is empty.
- The same people's To review says "Needs you · 12", and the menu badge shows 12. Ten of those rows are AI proposals on four combinations.
- My script flags 8 combination/person pairs where the two disagree.
- Cause: in To review the AI proposals row is Needs you for anyone with the review duty (`review-queue.ts`, `holds(actor, "review")`). In the rule, `review_proposals` acts for the author only (`engine/setup-checklist.ts:43`, used by `needsYouItems`).
- So for the reviewer and the approver, the claim that one rule is "read by Programs and To review alike" does not hold.

**M2 (Major): on the demo sample, To review shows a plain "Nothing waits for you" to all three people while 5 of 6 combinations show "Review and release 1 to fix".**
- Steps: reset + load the demo sample, then open /review as each person. `counts.needs = 0`, `blocked = 0`, and the empty state is the plain "Nothing waits for you". Visitor visa's page reads "Review and release 1 to fix", the error being "Nothing to release yet".
- Expected (claim and baseline finding 2): Needs you includes the problems that block release, and a person never reads a bare "Nothing waits for you" while a release is blocked.
- Actual: "Nothing to release yet" (`emptyProblem`) is counted on the tab and in the row's number, but the checklist has no Fix item for it. So `fixable` is false (`review-queue.ts`, `fixable`) and an empty draft gets no row.
- With one real blocker added (Visitor visa filing set to null), user-B reads "Nothing waits for you, but **1** combination has problems to fix before release". The other 4 tabs still say "1 to fix".
- The same blocker gives three different numbers:
  - the Visitor visa card says "Fix 1 problem";
  - the To review row says "2 problems to fix … Fix them";
  - the tab says 2.
- Screenshots: scratchpad `shots/r2-demo-B-empty.png` and `shots/r2-demo-B-blocked.png`.

**m1 (Minor): the empty state promises what the rule now leaves out.** The plain Needs you text still says "When you add sources to a combination, its next steps, AI draft, … appear here" (`to-review.tsx:100`). Building next steps (find, add, map, draft) no longer appear.

**m2 (Minor; rows this diff did not change, but they break the "alike" claim).**
- A stale submission's "Submit again" is Needs you for user-B and user-C (`review-queue.ts:168`). Programs says nothing for them, and `POST /submit` as user-B returns **403**.
- After I retired LMIA (SQL retired_at + restart), its setup row went away as it should. Its stale "Submit again" row stayed Needs you for all three, and the menu badge stayed at 1.

## What held
- **Author:** Programs and To review agree for user-A on the six and the demo sample, after a filing set to null, an accepts change, a submission and a retirement.
- **Sign:** after a submission, user-C's Programs card says "Review and sign" and To review matches. The setup row is not repeated.
- **Row = tab:** every listed row's number equals the tab, including with "Nothing to release yet" plus a filing error (2 = 2, link "Fix them", landing on the people card).
- **Retired:** a retired combination has no setup row, and Programs says needs false for it.
- **Badge and layout:** the menu badge equals "Needs you · N" at 1440 and 400 px. No sideways page scroll, axe 0 at 1440, keyboard reaches the row link, no console errors.

## Verdict on 2b6b82cf
**Not ready.**
- The round-1 B1, M1 and M2 are fixed.
- The new rule is still not shared: user-B and user-C have Needs you 12 on To review and 0 on Programs (M1).
- On the founder's demo sample, To review again says a plain "Nothing waits for you" while 5 combinations show "1 to fix" (M2), which is the baseline finding 2 pattern.
