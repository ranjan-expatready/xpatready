# B115 journey test, reviewer (5 Nov 2026), PR #1131 at b0ec3c37c

Copy `rv_b115` on :4436, configured checkpoint, live AI off, US$0. Headless Chromium driven like a person (role and label locators, keyboard), then data read from the API and Postgres. Probe scripts and screenshots in the reviewer's scratchpad only (not committed).

## Journeys
1. **Main, case officer:** "My client is the sponsored spouse; I need the sponsor on the case so the sponsorship forms appear." Open a case (Family sponsorship › Spouse or common-law partner) → People on this case → Add sponsor → Name → Add. Expected: chip "Sponsor", IMM 1344 and IMM 5532 for the sponsor. **Held** (check lines 1–11; screenshot b115-3).
2. **Keyboard only, 1024 px:** Tab to Add sponsor (6 tabs), Enter, type, Enter. **Held.** Empty name → field error "Give the person a display name." **Held.**
3. **Error, limit:** a second sponsor. Expected refusal in words, nothing added. **Held** ("at most 1 sponsor", count stays 1).
4. **Recovery, double submit:** Enter twice in the dialog. **Held** (one sponsor row, one audit line).
5. **Wrong combination:** Visitor visa case. Expected no Add sponsor; route refuses. **Held** (buttons: spouse or partner (travelling), child (travelling), representative; POST sponsor 422).
6. **Across the boundary, client:** Client A opens the Client questionnaire. Expected a part about the sponsor, role in words. **Held** ("About Sample Sponsor A", "Answering for Sample Sponsor A (sponsor)").
7. **Break-it, officer clicks the other new button:** Add representative on the same kind of case. Expected: either not offered (the representative of record is the case team's, C6.11/C7.7) or harmless. **Failed (M1):** a typed person "Sample Rep Typed" becomes a travelling participant; the Agent view's "The representative" tab with its firm-record answers is replaced by "Sample Rep Typed · 22 missing" (0 "From the firm record"); IMM 5476 blocks 28 → 30; Eligibility lists the representative as "Not run"; the client is asked "About Sample Rep Typed" (4 parts). No way to remove the person from the screens.
8. **Screen sizes:** 400 px, 1024 px, 200 % zoom (512 CSS px): no sideways scroll; axe WCAG 2.2 A/AA clean on the case page (1440) and on the dialog (1440, 200 %). **Held.**

## Data underneath
Postgres: sponsor rows `applies=false`, one per case; representative row `applies=true` (journey 7). Audit: "Case officer added a sponsor to case …", "… added a representative to case …", once each. Server role check unchanged (`reach(…, "officer")`).

## Findings
- **M1 (Major):** journey 7, see `review.md` M1 (`api/src/runtime.ts:44`; `engine/runtime/team.ts:75-78`; `engine/runtime/case.ts:301-302`).
- m1 (Minor): the sponsor chip says "Not travelling: asked only what the principal's forms need about them" (`web/src/runtime/cases.tsx:200`), wrong for a co-filing sponsor with own forms (C11.12 BR-6).
- m2 (Minor): `can_add.max/has` unused; Add sponsor stays offered when full (refused in words after typing a name).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | journeys 1, 2: sponsor added, IMM 1344 and IMM 5532 on the case |
| Next step obvious | 1 | toast "Sponsor added: their questions are now asked"; forms appear in place |
| Plain words | ½ | release words throughout; but m1 pill and "Add representative" invites a wrong action |
| Feedback and state | 1 | toast, field error, limit refusal inside the dialog |
| Correct data | ½ | sponsor data exact; journey 7 replaces firm-record facts with a typed person |
| Error recovery | ½ | double submit and limit safe; a wrong Add representative cannot be undone |
| Accessibility and screen sizes | 1 | keyboard path, 400/1024/200 %, axe clean |
| Speed | 1 | add and refresh under 1.5 s; whole 17-line check 10–16 s |
| Visual quality | 1 | team buttons, chips and dialog; screenshots b115-1..4 |
| Trust and sources | 1 | role words from the release; Sample names; no AI |

**8.5/10, no criterion at 0: pass on score.** The review still blocks on M1 (a Major). The fix that raises the most: M1 (correct data, error recovery, plain words), then m1 (plain words).

## Could not test
A real screen reader; an intended user's unaided walk (D17, D20 with the founder); the base-code failure of the builder's check (not re-run).
