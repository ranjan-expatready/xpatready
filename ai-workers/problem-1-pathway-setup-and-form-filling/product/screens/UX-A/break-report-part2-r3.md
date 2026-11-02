# UX-A part 2: break report, round 3 (commit 2e662e41, fixes in 4b3786ec + 2e662e41)

Setup:
- Isolated copy `brk_uxa2` on :4471, used by no one else. :4400 was not touched, nothing was priced (US$0), and no `*_LIVE` setting was used.
- Data: the six (reset-to-six), the demo sample (reset + load), and an empty workspace (reset only). People: user-A (author+review), user-B (approver), user-C (reviewer+expert).
- After each change, one script compares, per person and per combination:
  - Programs `needsYou` (catalogue for both Pathway types, plus the card's `viewer.needsYou`);
  - To review's Needs you;
  - each setup row's number against the Review and release tab's errors.

## Earlier breaks re-run
- **Round 1 B1, M1 and M2: still fixed.**
  - No screen-less step (Choose/Confirm the checklist page, Confirm who can apply) is Needs you.
  - The "IRCC accepts" case gives row = card = tab = 7.
  - A filing blocker is Needs you for user-A only, and Waiting for user-B and user-C.
- **Round 2 M2: fixed.** The demo sample now reads "Nothing waits for you, but 5 combinations have nothing to release yet" for all three people, with "Open Immigration programs". The API returns `notSetUp: 5`.
- **Round 2 m1: fixed.** The plain empty state no longer promises next steps.
- **Round 2 m2: fixed.**
  - A stale submission's "Submit again" is Needs you for user-A only; user-B and user-C read "The configuration author submits it again".
  - After the combination is retired (SQL retired_at + restart, because an approved retire waits for a library release), its submission and setup rows leave To review for everyone. Needs you is 0 and the badge is empty.
- **Round 2 M1: not changed, by the builder's choice.** On the six, To review is Needs you 12 for user-B and user-C (10 AI-proposals rows), while Programs `counts.needs` is 0. This is now a question for the tech lead in the PR (P-180, #277); I list it as open, not as a new break.
  - What the builder now claims holds: every combination that is Needs you on Programs is also on To review's Needs you, for A, B and C. My script found **no** combination that is Needs you on Programs but not on To review, on the six, the demo sample, or after each change (filing null, accepts, submission, stale submission, retirement).

## New tries and what they found

**Empty state with one real blocker plus empty drafts (Minor, m1).**
- Steps: demo sample, Visitor visa spouse filing set to null. The other 5 combinations are empty drafts.
- user-B's API returns `blocked: 1, notSetUp: 4`.
- The page says only "Nothing waits for you, but 1 combination has problems to fix before release. Their problems are fixed by the configuration author…".
- The 4 combinations whose tabs also read "Review and release 1 to fix" are not mentioned, because `blocked` wins and `notSetUp` is dropped (`to-review.tsx:100`).
- It is not bare, so the claim holds, but the page names 1 of 5 red tabs.

**Wording (Minor, m2).**
- "Their next step is on Immigration programs: set up the forms **it** files" mixes plural and singular when N > 1 (`to-review.tsx`, notSetUp description).
- The same text tells user-B (approver) and user-C to "set up the forms", which is author work.
- The rows' "The draft changed after it was submitted. **submit** it again …" starts a sentence in lower case (`review-queue.ts:174`, the line this round changed).

**Card and row numbers differ for one combination (Minor, m3; carried over from round 2's detail).**
- On the demo sample with Visitor visa's filing set to null, the Programs card's Needs-you text says "Fix **1** problem".
- The To review row says "**2** problems to fix … Fix them", and the tab says 2.
- Cause: the checklist has no Fix item for "Nothing to release yet".

**A person with nothing at all: held.** In the empty workspace (reset only), all three read the plain "Nothing waits for you · Reviews, confirmations and the problems that block a release appear here when they are yours.", with `blocked: 0, notSetUp: 0`.

**From reading the code, not reproduced (needs a newer edition held by the rules).** `review_edition` counts toward Programs Needs you for its combination. Its To review row (`new_edition`) has `combination: null`, and the setup row skips it as listed elsewhere. So such a combination would be on Programs Needs you with no To review row naming it, which goes against the invariant above only if that invariant is meant per combination.

## What held
- **Row = tab:** every listed setup row's number equals its tab, including the "IRCC accepts" case and "Nothing to release yet" plus a filing error (2 = 2).
- **Programs and To review:** they agree for user-A in every state, and the "Programs Needs you ⊆ To review Needs you" invariant held throughout.
- **Retirement:** retired combinations and their submissions leave To review.
- **Badge and layout:** the menu badge equals "Needs you · N" for A, B and C at 1440 and 400 px. No sideways page scroll, axe 0 at 1440, keyboard reaches the row link (24 Tabs), no console errors.

## Verdict on 2e662e41
**Approve, with Minors m1–m3. Round 2 M1 (AI proposals: reviewers on To review, author-only on Programs) stays open for the tech lead.**
- Every round 1 and round 2 break is fixed except that open question.
- The empty states are never bare beside a red "to fix".
- I found no new Blocker or Major.
