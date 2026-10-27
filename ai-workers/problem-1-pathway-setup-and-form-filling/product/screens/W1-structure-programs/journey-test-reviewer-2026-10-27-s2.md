# Journey test — S2 Immigration programs + fixes (reviewer, 27 Oct)

Reviewer agent, CHECK of commit `b45ca44`. I walked it on my own isolated copies, :4448 and :4449 (never :4400), with Playwright driving Chrome headless. Every step went through the page: clicks, typing and keys. I read a screenshot at each decision point. The API and SQL were used only to set up states the sample lacks, and to check the data afterwards. Rubric: `QUALITY.md` "Journey score". AI US$0 (saved-run replay only).
**States set up for the walk (scaffolding):** the sample inputs; one saved AI replay on Super visa (84 proposals); one released but Not ready combination ("Spouse of a student"). I used the same recipe as `check_screen01_browser.cjs:76-93`.

## Journeys (persona: content publisher, unless named)
| # | Journey (goal → steps) | Expected | What happened |
|---|---|---|---|
| J1 main | "Where does each application stand, and what do I do next?" Open Immigration programs, read cards, press a card's step | Sections per Pathway, 5-part trail, status, bar, one step | Done. 3 sections (12 / 8 / 1), "2 need you" on Temporary residence (Super visa: proposals; Spouse of a student: Not ready). "Add 1 form from the library" added IMM 5707 in place with a toast; the card moved to "Step 2 of 4 · Draft · 2 forms · Filed: PDF". "Review 84 AI proposals" opened the proposal review. First view 123 ms |
| J2 start | Start setup on a Not started card ("Travel document") | Prefilled page; nothing made until Create | Done. `/new?leaf=…` showed the trail Retail › Permanent residence › Permanent resident documents › Travel document. Counts and the `combination` table were unchanged before Create. A double-click on Create gave 1 row, Not started 15 → 14 and In setup 4 → 5, and one audit line |
| J3 keyboard | List view, then a row, by keyboard only | One tab stop for the rows; Enter opens; Back restores focus | Done. Tab reaches List → Enter. Tab enters the rows; ↓↓↓ then Enter on a Not started row opened Start setup (no start). Back returned to `?sel=` with that row focused. List was remembered after reload |
| J4 search | Find "LMIA", a form number, nothing, very long or non-English text | Matches here; other tab offered, never mixed in | "2 of 21 combinations match", "6 matches in Corporate and employers. Show them". "5257" found the forms. No match gives "Nothing matches" + Clear search. Input is capped at 120 characters. Search 137 ms |
| J5 narrow | A Pathway card, then Status: Not ready | One section; stats name the Pathway; menu explains each option | "8 combinations in Permanent residence"; the menu has 6 options with counts and meanings; Not ready shows 1 |
| J6 error | The catalogue fails (route forced to 500) | Plain error, Retry works | "The combinations could not load … Your work is safe." Retry brought back 21 cards |
| J7 wrong role | Approver, then the same start by URL and by API | Read-only with reasons; the server refuses | New combination disabled; Not started cards have no step; clicking a name gives the toast "…A configuration author starts it." `/new?leaf=` disables Create with the reason. API: 403 (approver), 401 (unknown person) |
| J8 empty | After Reset | Teaches the first action | "Nothing set up in Retail yet … Open Structure"; 0 names, and the read created none |
| J9 boundary | Structure › program panel › Used by › Start setup | Prefilled New combination; footer on screen | Start setup links for Not started ones, Open for set-up ones; the page was prefilled. Footer bottom 883/900 at 1440×900 |
| J10 sizes | 400, 720 (200 % zoom), 1024, 1440 px | No sideways scroll | None at any width; 3 → 2 → 1 columns; at 400 px the List drops the Setup column |

## Break-it pass (about 15 minutes)
* Four parallel `POST /combinations/path` on one leaf: one 201 and three 200 ("existing"); 1 row stored.
* A double-click on Create: 1 row.
* `/?p=corporate.temporary_residence` on Retail: "0 combinations", and "No combinations in … yet" under headers that say 12. **Minor** (review m2).
* `/new?leaf=does.not.exist`, or a Corporate leaf without `pw=`: empty pickers, no message. **Minor** (m9; S3 replaces that page).
* The AI-running card could not be caught: the replay ends before the page reloads.
* Builder check rerun 3×: 73/74, 73/74, 74/74, a different timing step each time (footer 904/900; the prefill read too early). **Minor** (m7, m8).

## What held
* No silent start, from a card, a row, Enter, or the Structure.
* Need-you equals waiting on a person, and is equal on all three surfaces: 2/2, then 1/1 after Reset + replay.
* Data is exact, with one audit line; the server enforces roles.
* axe found 0 violations on 13 states, including Not ready, AI proposals, List and approver. Two console errors, both from the forced 500 in J6.

## Findings
Full list with file:line in `review.md`.
* **Major M1:** the "counts" half of the need-you rule is never tested (`check_w1_programs_s2.cjs:96-108`).
* **Minor:** m1, the bar contradicts the step (Not ready "Step 4 of 4 · Release"; Super visa "Step 1 · Forms" beside "Review 84 AI proposals"); m2 a stale `p=` gives false empties; m3 the Pathway tooltip is missing; m4 the Sample names are unmarked on Programs; m10 the approver sees "Not started" 3×.

## Score (each 0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2, J5, J9 completed through the page alone |
| Next step obvious | 1 | One step per card in the server's words; Not started → Start setup; approver → Open |
| Plain words | 1 | No IDs or hashes; tooltips on tabs, chips, bars, need-you, status options |
| Feedback and state | ½ | Toasts and counts move at once; but the bar contradicts the step (m1), and a stale `p=` says "No combinations yet" (m2) |
| Correct data | 1 | 1 row after a double-click and after 4 parallel starts; nothing created before Create; audit once; Reset → 0 names |
| Error recovery | 1 | Retry recovers; reload keeps view and filters; Back restores focus; failures say "Your work is safe" |
| Accessibility and screen sizes | 1 | axe 0 on 13 states; keyboard path for List and rows; 400/720/1024/1440 with no sideways scroll |
| Speed | 1 | First view 123 ms; browser search 137 ms; server search 4–103 ms (one loaded run 243 ms, not repeated) |
| Visual quality | 1 | Design D, team tokens, calm cards; nothing cut at 1024 |
| Trust and sources | ½ | AI steps marked; but the P-112 names carry no Sample mark on this page (m4) |
| **Total** | **9 / 10** | **Pass** (8 or more, no 0) |

Most valuable fixes to reach 10: (1) mark the names Sample on Programs (m4); (2) make the bar agree with the next step for Not ready and AI-proposal cards (m1); (3) treat an unknown `p=` as All (m2).
**Not tested:** a real screen reader; the AI-running card with Stop (W1-07); an intended user's unaided walk (D17, D20 stay with the founder).
Evidence (not committed): `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-bold-carson-0b4a7e/2efda732-528e-4734-8e13-0ba4f617279a/scratchpad/` (`walk.cjs`, `walk2.cjs`, `probe2.cjs`, `walk-shots/`, logs).
