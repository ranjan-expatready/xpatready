# Journey test — reviewer, 4 Nov 2026: C11.17 "Add to Program structure" field messages (QA-183)

Commit 8494b7a87d6bf802ea4207ac88f73178b89e7067 (PR #867). Isolated copy `rev1117` on :4477, the six loaded, Chrome
headless via Playwright, content publisher (user-A) and approver (user-B). Live AI off, US$0. Script and screenshots:
`/tmp/claude-0/-home-user-xpatready/7c1e1616-e8b3-5ce2-bb1b-dc7ecbd9fe0d/scratchpad/journeys.ts` and `.../scratchpad/out/`
(outside the repo). Run twice on fresh copies: 28/31 both times, the same three lines (two findings, one expected 400).

## Journeys
| # | Persona · goal | Steps | Result |
|---|---|---|---|
| J1 main, keyboard only | Content publisher: "add a category under Visitors" | Enter on Add, type Pathway ⏎, Program ⏎, a 137-character Category, fix it, Tab to Add, Enter | Note "Keep the name under 120 characters." under Category, Add off, Enter sends nothing; fixed name saved once under Visitors, one audit line, nothing else changed |
| J2 alternate | "add two categories in a row" | Add and add another, then a too-long next name, then "Visitor visas" → Keep mine, then make it too long | First saved, pop-up open; long name turns both buttons off; close-name box, Keep mine turns Add on; too long again replaces the box with the rule |
| J3 prefill | "add a program under Temporary residence" from its chip | Open Add from `/structure?p=…`, type a too-long Program | Pathway prefilled with no note; Add tip "Fix the program first: see the note under it." |
| J4 error from the server | "the server refuses my category" (request changed on its way) | Add with an over-long category sent; then change Program | Note under Category, alert "Nothing was added: see the note under Category."; **after changing Program the empty Category keeps the old note and red border** |
| J5 break it | Very long, non-English, invisible characters | 7 × U+FDFA (NFKC → 126), 125 raw that cleans short, zero-width only, "Résidence temporaire é…" (119) | Client and server agree on every case; zero-width only → "Give it a name."; French 119 accepted |
| J6 sizes | Same note at 1024, 1024 at 200 %, 1440 (and 400) | Too-long Category, axe on the dialog | axe clean, note in view, no sideways scroll at 1024/200 %/1440; 400 px page scrolls sideways (pre-existing, desktop only P-128) |
| J7 wrong role | Approver opens Program structure | — | Add is off; server 403 (acceptance pack) |

## Findings
* **Minor — the note is hidden while typing:** the suggestion list sits over the hint row and still offers "Add “…” New"
  for the refused name (`add-to-structure.tsx:331-345`; `out/r-j6-1440.png`, `out/r-j6-1024-at-200pct.png`).
* **Minor — stale refusal after a level above changes** (`:169`, `:243`; `out/r-j4-after-program-change.png`).
* **Minor — FieldNote not linked to its radiogroup** (`:292-294`); **Minor — "Add and add another" tip while blocked** (`:234`).
* Outside the diff: Escape with a suggestion list open closes the whole pop-up and drops what was typed.
* Console: one 400 from J4's deliberate server refusal (expected). No page errors.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2 saved once each |
| Next step obvious | ½ | Note and tip name the fix, but the list hides the note while typing |
| Plain words | 1 | "Keep the name under 120 characters.", "Nothing was added: see the note under Category." |
| Feedback and state | ½ | Message on its field; stale note after changing a level above (J4) |
| Correct data | 1 | 0 POSTs for refused names; one row, one audit line |
| Error recovery | 1 | Fixing the name clears the note and turns Add on; server refusal clears on retyping |
| Accessibility and screen sizes | ½ | Keyboard path, axe clean at three sizes; radiogroup notes not linked |
| Speed | 1 | Client-only check; 137 characters typed and note shown in 0.77 s by script |
| Visual quality | 1 | Team danger token, same note style as other fields |
| Trust and sources | 1 | No AI; "Sample until the immigration expert confirms" kept on locations |

**8.5 / 10 — pass** (8 or more, no 0). Raise it: (1) show the rule in place of "Add “…” New" while a name breaks it;
(2) clear the notes of levels that are emptied; (3) link the radiogroup notes.

Could not test: a real screen reader; an intended user's unaided walk (D17, D20 stay with the founder).
