# Review: QA-165 IMM 5257 Yes/No boxes (head 7b986c8b4)

Reviewer: independent session. Not a new screen: engine/runtime change plus Sample setup and a check. Ports 4457 only.

## What I ran
- `check_c72_imm5257_fill.ts` on a fresh isolated copy (rv65, port 4457, setup run by the test): **51/51**. It includes 43/46 filled, open list = only the 3 Adobe boxes, still ready to file, unconfirmed No not written, Yes without names not "N", each gate fills IMM 5257 (1 box).
- Read `git diff origin/main...7b986c8b4` in full. I did not re-run the builder's other checks.

## Concept and rule fit
- Rule is sound as written. markNothingRecorded needs every named fact unanswered AND each fact's gate answered false AND confirmed AND gate not hidden (gates.ts:13-16, forms.ts gateNo). A fact with no gate, a mixed set with one ungated fact, or a Yes / unconfirmed / hidden gate returns the box unchanged (tests cover each).
- Removing the early `asked.some(hidden)` return (forms.ts:48) is needed because a SHOW-effect detail is hidden under a No; the "none apply" branch re-checks hidden itself, so that path is unchanged.
- mandatory.ts:64: reason "needs an answer" names the gate question; the old "no question asks it yet" stays for gate-less facts. P-62 met: the gate question's `fills` now includes the box (case.ts:275-280), and the check asserts it.

## Answers to the four points
- (a) Wording and fields: the three questions are the form's own words (I found the "green card" and alias wording in the requirements copy under domain/requirements-*). Labelled Sample in the setup comments and `plain` text ("Sample until the expert checks"). The citation gives edition and question number but no page or date (P-170 asks page, quote, date). **Minor.**
- (b) Wrong "N"? For the US card, a confirmed No to "lawful permanent resident with a valid green card" means no valid card, so N is right. A person who is a former LPR with an expired card and answers No: "valid... (not expired)" box is N, also correct. The Yes path is never auto-valid (executor sends Yes to hand, tested). Alias: "No" to "any other name" is N. National ID: N. I found no case that writes a wrong N, with one exception, see Minor 1.
- (c) Shared library side effect: acceptable. The gates are OPTIONAL in personal_details/travel_document, so other combinations gain three optional questions and lose no readiness; details now REQUIRE-when-Yes (were OPTIONAL always), which can only make an existing Yes-without-details case stricter, and no existing case has a gate answer yet. The change is in the test setup (Sample), not the engine. No finding.
- (d) Gates optional: **Minor, not Major.** The form marks the boxes mandatory, but the mandatory list already shows them as "needs an answer", so the officer sees them before filing, and the 3 Adobe boxes are the same kind of open item. Making them required would change readiness for cases already ready; that is a product call for the founder, not a defect here.

## Issues
- **Minor 1 (unverified, worth a follow-up test):** a copy that wrote "N" is made out of date only through form facts (inputHash) and group facts (forms.ts:153-170). The gate answer is neither. If the person later changes the gate No to Yes and has not yet entered the details, the existing copy still says "N" and I found nothing marking it stale (details REQUIRE blocks a new copy, but the old one stays). Entering the details changes facts, so it goes stale then. The check covers "none apply" taken back (stale) but has no equivalent for a flipped gate. Fix: include gate answers whose box is "N" in the copy's stored facts, or add the test to prove it already goes stale. I could not run this flip; label this unproven.
- **Minor 2:** the open-list label for the Taiwan PIN and Israel passport boxes shows "Question 1d. Have you taken a test form a designated testing agency..." (printed by the check at the "words are the form's" line). It looks wrong for those boxes. Probably pre-existing from the map's quote, not from this change; flag for the forms lane.
- **Minor 3:** citation gap in (a).

No Blocker. No Major.

## Journey score (reviewer role, this item has no new screen; the journey is the officer answering the three Yes/No questions, confirming, generating IMM 5257)
Walked through the check's API journey (no browser pane; not a UI change).
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | 43/46 filled, 3 boxes "N", still ready to file |
| Next step obvious | 1 | open list says which question to answer and confirm |
| Plain words | 1 | the form's own question words, no field paths |
| Feedback and state | 1 | unconfirmed No writes nothing; reason names the answered question |
| Correct data | 1 | Yes without names is not "N"; no wrong N found |
| Error recovery | 0.5 | flipped gate after a copy not proven stale (Minor 1) |
| Accessibility and sizes | 0.5 | not tested, no UI change |
| Speed | 0.5 | check ran in about 8 min including setup; no page timing taken |
| Visual quality | 0.5 | not applicable, not seen |
| Trust and sources | 0.5 | Sample-labelled, but no page/date (Minor 3) |
**Journey score: 7.5 / 10.** Under 8 because the UI criteria were not exercised, not because of a defect; no criterion is 0. To raise: a browser walk of the three gate questions in the questionnaire, and the stale-copy test for Minor 1.

## Could not check
Real browser/axe walk, the Adobe Validate evidence (Mac), r1c's pre-existing failure, the builder's other suites.

**Verdict: Approve** (for commit 7b986c8b4; no open Blocker or Major).
