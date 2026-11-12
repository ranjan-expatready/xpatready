# QA-401 journey test, reviewer role, 11 Nov 2026

Skill journey-test, reviewer (the one score for this check). Commit `9c9078b221d1281b480a81dcc30f33496baea166` (PR #1583), isolated copy `screens_qa401r` on :4449 from a scratch worktree, data from `tests/runtime/setup_c83_walk.ts` (the product's own routes; Visitor visa case, round 2 sent for review; Case officer user-O, Representative of record user-R). Playwright Chromium headless, screenshots per step (kept outside the repo). No model call (US$0).

## Journeys
| # | Persona · goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 main | Case officer, then Representative: "I sent it; now I review it as the representative" | Case page → "Open the review" → read-only line → picker → Representative (pointer) | Approve and Send back, read-only line gone, same address, no reload | Held at 1440 (1.3 s, cold) and 1024 (0.8 s); no 4xx |
| J2 reverse | Representative → Case officer by keyboard | Focus picker, arrows to Case officer (Approve still shown: a marked choice, WCAG 3.2.2), Enter | Read-only line back, no Approve | Held at both widths; builder's frame watcher: Approve never drawn after the change |
| J3 wrong role | Picker → Client A on the review page | — | No staff view, no Approve | Held: "This review could not be loaded · Only the case officer can do this." + Retry (server words, pre-existing; see note) |
| J4 hand-off | Case officer: "Open it as Client A" from the case page | Click the link | Client questionnaire as Client A, notice names Client A | Held; 19 refused GETs (403) as Client A in the background (2 without the reset) |
| J5 cross-area | Case officer: "Product Studio (as Configuration author)" | Click the frame link | Studio home as Configuration author | Held; 18 refused GETs as user-A (0 without the reset) |
| J6 Studio picker | Configuration author → Approver on the Studio home | Picker | Page re-read, no 4xx | Held |
| J7 repeat | Representative again, second time; fresh page loaded as Representative → officer | Builder's check steps 4–5 | Same results | Held (14/14) |

## Automated replay
`tests/check_qa401_person_rights_browser.cjs` 14/14 on a fresh copy; with the fix removed 8/13 (5 FAIL, both directions); with only the reset removed 13/13 (the key alone covers this page). `check_bk4a_browser.cjs` 46/46 at the head. Widths 1440 and 1024: no sideways scroll. Page errors: none; console: 403 "Failed to load resource" lines from J3–J5 (refused background reads). axe and 400 px not re-run (no markup or layout in the diff).

## Data underneath
No writes in J1–J7 apart from the Representative's own `review_opened` (once per filing opened, by user-R: `audit_event`). A refused read writes nothing. Server refuses every read the new person may not make (403), so the screen and the server now agree.

## Break it (15 min)
Picker changes back and forth quickly (builder's steps 3–5 and mine): no stale Approve. In-flight read under the old person: dropped by `resetQueries` (query-core 5.101.1 `Query.reset` → silent cancel; read in source, not provoked in the browser). Mutation in flight across a change: not provoked; by source the mutation keeps the header it was sent with and its invalidations re-read as the new person. Other tabs keep their own person: consistent, out of this bug.

## Score (QUALITY "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J7 both directions, no reload |
| Next step obvious | 1 | Approve / Send back appear for the Representative; officer reads the read-only line |
| Plain words | ½ | J3: a refusal shown as "could not be loaded" with Retry, naming only the case officer (pre-existing server words) |
| Feedback and state | 1 | Notice "Now: Representative (simulated)…"; skeleton while re-reading, never the old buttons |
| Correct data | 1 | No stray writes; audit line only for the real open |
| Error recovery | 1 | Second change and fresh-page reverse hold; old answers dropped |
| Accessibility and screen sizes | 1 | Keyboard change with Enter; 1024 and 1440 no sideways scroll |
| Speed | ½ | 0.8–1.3 s re-read; 18–19 refused background GETs per hand-off and a double GET of the round per change |
| Visual quality | 1 | Screens unchanged, team frame |
| Trust and sources | 1 | "Simulated" pill and notice name who acts |

**9/10, no 0: pass.** To raise: refetch only after the route settles (removes the refused reads and the double GET; review Minor 1); plain refusal words on the review page for a client (not this diff).

Could not test: a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); the C8.3 pack on the configured checkpoint (builder's ports).
