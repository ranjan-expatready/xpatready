# Journey test (reviewer) — C11.14 Clear the choice, forms-c1114 @ eeff3f40, 2 Nov

Copy `rev_c1114` on :4467, live AI off. Persona: content reviewer (user-C) on To review › Proposals. Data: Load sample six,
then (separately) the suite fixture plus `tests/seed_proposals.ts` for IMM 1111 (02-2026) and IMM 2222 (03-2026).

## Journeys
1. Main: open the oldest group, Choose all 2, Clear the choice, Accept is off. **Held** (mouse and keyboard only).
2. Alternate: tick one item by hand, Clear the choice → none chosen. **Held.** Choose all, untick one, Clear → none. **Held.**
3. Boundary: pick one, switch to IMM 2222 (no acceptable Ready item: band says "None in this group", no bulk buttons),
   Back → IMM 1111 with nothing chosen and Clear off. **Held.**
4. Demo path: Load sample six (139 waiting, 6 groups) → To review › Proposals: no group shows Choose all or Clear the
   choice, every Ready item reads "It is decided on its form-field page." **Not reachable** (review M1).
5. Recovery: double click Clear, reload, Back. **Held**, no console or page errors.
6. Wrong role / server: no server change; the merged suite's guards (31/31) still pass.

## Automated replay
Builder suite 31/31; my script (scratch, not committed): axe WCAG 2.2 A/AA 0 at 1440, 1024, 400; no sideways scroll at
1440, 1024, 720 (200 %), 400; queue open 398 ms.

## Findings
M1 (Major) demo data never shows the band; m1 focus lost to body after Clear; m2 suite misses partial pick and group switch.
Details and fixes: `review.md`.

## Score: 9 / 10 (pass, no 0) — table in `review.md`.
To raise it: make the record honest about M1 and, when the lead rules, let Load sample data reach the band; keep focus on
"Choose all N" after Clear.

Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder).
