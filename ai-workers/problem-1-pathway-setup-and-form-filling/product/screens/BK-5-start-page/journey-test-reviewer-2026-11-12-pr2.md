# Journey test, reviewer role: BK-5 PR 2 (sign-in → Starting points), 12 Nov 2026

Commit 45009b714 (PR #1628). Isolated copy `rev_bk5p2` on :4481, fresh database, stopped after. Walked headless with Playwright (`/opt/pw-browsers/chromium`), by what a person sees: clicks, Tab and Enter, visible text. Data was read from `localStorage` (`xr-actor`), from the request log, and from `/api/demo/status`. Shots are in the reviewer's scratch copy, not committed. US$0: no AI route was called.

## Journeys (main path first)
1. **J1 main: the person running the demo, as the Configuration author.** *Goal:* "start the walk". Steps: `/sign-in` → the Configuration author card. *Expected:* "Demo › Starting points" with the doors on. **Held.**
   * H1 "Starting points" appeared in 97-107 ms. Tab title "Starting points · Product Studio". No disabled notice.
   * Back → sign-in page, with the author card marked "(signed in now)" and the person unchanged. Forward and reload keep `/start` and the author.
2. **J2 alternate: every other person lands where they work.** **Held:** Approver and Content reviewer → "/", Case officer, Representative, Solo representative and Client A → `/cases`. Nobody but the author sees the doors.
3. **J3 wrong role, keyboard only: the Approver opens `/start`.** **Held.**
   * Doors off, with the reason. Tab reaches "Sign in as the Configuration author" (a link, `href=/sign-in`) with a visible 3 px ring.
   * Enter → `/sign-in`, person still the Approver, 0 non-GET requests.
   * Tab to the author card, Enter → back on `/start` with the doors on.
   * axe WCAG 2.2 A/AA on this state: 0 violations at 1440 and 1024 px.
4. **J4 recovery: a browser remembering an unknown person (`user-Z`).** "/" → `/sign-in` → author card → `/start`. **Held.**
5. **J5 boundary: the header picker.**
   * Case officer on `/cases` picks Configuration author → lands on "/". That is a switch mid-walk and keeps `homeOf`, which is right.
   * The picker's "Sign-in page…" → author card → `/start`. **Held.**
6. **J6 not a demo workspace (session mocked in the browser only).** The author lands on `/start`, where every door is off and the notice says "Nothing here can run in this workspace.", with no link and the Studio menu present. As the concept allows: noted, not a finding.
7. **Step across the boundary (gate A, the builder's script re-run by me):** sign-in → Starting points → door 2 → Immigration programs → change → Review and release → hand-offs.
   * On a fresh copy: **45/45**, 0 person changes outside the hand-offs.
   * On a copy whose last load was "configured": stopped at door 2, because the script waits for "Start here" (finding m1 in `review-pr2.md`).
8. **Sizes:** `/start` (disabled state, link visible) and `/sign-in` at 1024 px, 400 px and 200 % zoom (720 and 512 CSS px): no sideways scroll on any.
9. **Break:**
   * A double click on the author card adds 2 history entries; Back once stays on `/start`. This is older behaviour: `main` did the same with "/".
   * The link sends no write.
   * A direct reset as the Approver still gets 403 (bk5 check step 30).
   * Client A's landing on `/cases` logs a 403 for `/api/runtime/cases`. This is BK-4a's `homeOf`, not this PR.

## Data underneath
* `xr-actor` matched each card exactly after every journey.
* The link changed nothing: still `user-B`, 0 POSTs.
* After gate A, `/api/demo/status` gave `checkpoint: "configured"` and `story: idle`.
* No server code changed, so no audit line is expected. The simulated sign-in is client-side, as in BK-4a.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 and gate A, fresh copy: 45/45 |
| Next step obvious | 1 | Lands on the doors with one filled button; non-authors never land on dead doors (J2) |
| Plain words | 1 | Concept §6 copy; "Simulated" on cards |
| Feedback and state | ½ | A brief "Reading the demo's state…" with the doors off on landing (`bk5-pr2-01`); focus stays on `body` after the route change (frame-wide, older) |
| Correct data | 1 | Person stored exactly; the link writes nothing |
| Error recovery | 1 | Back, Forward, reload, unknown person and wrong role all recover (J1, J3, J4) |
| Accessibility and screen sizes | 1 | axe 0 on the disabled state; keyboard-only J3; 400/1024/200 % with no sideways scroll |
| Speed | 1 | 97-107 ms from card to H1 |
| Visual quality | 1 | Team Button and Notice; secondary link beside one primary |
| Trust and sources | 1 | "Simulated" and "Demo" marked; no AI on this path |

**Score: 9.5/10. Pass** (8 or more, no 0). To raise "feedback and state": take the evidence shots after the doors come on (m2). Moving focus to the H1 after a route change is a frame-wide matter, not this PR.

## Could not test
A real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); making gate A's change step through the screen (the script uses the API, as the reviewed bk4b walk does).
