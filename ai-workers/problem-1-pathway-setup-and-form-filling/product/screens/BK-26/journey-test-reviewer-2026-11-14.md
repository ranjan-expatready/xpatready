# Journey test — BK-26 (reviewer, 14 Nov 2026), PR #1749 head c6d3f3e14

Scope is proportionate to an engine row. The person-facing surface is the case page's "Prepare application" copy lines for the student's Paper IMM 1294. Copy: fresh isolated `forms_bk26r` on :4458, reset + configured load (BK-13), stopped by trap. Headless Chromium as the case officer (`user-O`). Answers were changed on the officer's own API routes (as the builder's walk does), then the copy was generated with the page's button. The probe script is in the scratchpad and not committed.

## Journeys
1. **Main.** Case officer: "Make the student's IMM 1294 and see that the school's city is filled." Open the case, then look at the IMM 1294 copy line. Expected: no city to write by hand, nothing "not on this form".
2. **Error.** Officer: the school's city is MONTREAL while the province says ON. Expected: refused in words, nothing written.
3. **Real cities.** Officer: the school is in Hamilton ON, Waterloo ON (keyboard only, 1024 px), Montréal QC, or Quebec QC. Expected: written, because each is on the form's own list.
4. **Recovery.** The officer fixes the city ("toronto" in lower case, at 200 % zoom), then "TORONTO" again, and regenerates. Expected: written again, nothing refused.

## What happened
| # | Result | Evidence |
|---|---|---|
| 1 | Held: "73 form fields written", nothing by hand, nothing refused | walk 8/8; builder shot 01 |
| 2 | Held: "1 not on this form" in the copy line, plus the line `"MONTREAL" is not in the form's own list of choices for "Province" ON …, so nothing is written and nothing is guessed: check the answer.` | walk; builder shot 02 |
| 3a | **Wrong:** "Hamilton" (ON) is refused as not on the form, but the form lists "Hamilton, ON" (code 3324) | probe `hamilton-1440.png` |
| 3b | **Wrong:** "Waterloo" (ON) is refused the same way; the form lists "Waterloo, ON". The run was keyboard only: focus on "Generate a new copy", then Enter, at 1024 px | probe `waterloo-1024-1024.png` |
| 3c | "Montréal" (QC) is refused; the form spells it "Montreal" | probe |
| 3d | "Quebec" (QC) is written as "Quebec City" (2030), the only label starting with "Quebec" | probe |
| 4 | Held: "toronto" and "TORONTO" are written (3812); the refusal line clears | probe |

Data underneath, from the pure fill on the same inventory and lists:
* Toronto/ON → 3812.
* "Pierrefonds"/QC is written as 1740 "Pierrefonds Est" (a guess between Est and Ouest).
* Kingston, Sherbrooke and Saint John are refused although the form lists them with a ", XX" suffix (286 such cities).
* A separator value `---------------` is "written" as "".

## Break-it (short)
* Double regenerate and reload: the newest copy wins, and "Earlier copies (n)" counts up.
* No page errors over 6 regenerations.
* Province missing: the city goes by hand with a reason (pure test).

## Accessibility and sizes
* axe WCAG 2.2 A/AA is clean on the walk's settled states at 1440 px.
* Widths 1440 and 1024, and 200 % zoom: no sideways scroll. The keyboard path (focus, Enter) works.
* My probe caught one `color-contrast` hit while the button was still spinning (screenshot taken mid-generation). Settled states were clean; I could not tie it to this PR.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Sample works (3812); Hamilton, Waterloo and Kingston are refused although they are on the form |
| Next step obvious | ½ | "check the answer" points the officer at a correct answer (3a, 3b) |
| Plain words | ½ | "(its datasets, CityList.ON.City: 971 entries)" is an internal path; 971 includes 127 separators |
| Feedback and state | 1 | "1 not on this form" in the copy line, the line in warning colour, the toast |
| Correct data | ½ | right code for Toronto; false refusals (3a, 3b); "Pierrefonds" guessed |
| Error recovery | ½ | MONTREAL→TORONTO recovers; for Hamilton the only way through is typing "Hamilton, ON" |
| Accessibility and screen sizes | 1 | keyboard Enter, 1024 px, 200 %, axe clean on settled states |
| Speed | 1 | each copy about 1.1 s |
| Visual quality | 1 | team look; the line sits in the copy's panel |
| Trust and sources | 1 | names the form's own list and the province; nothing is written on refusal |
| **Total** | **7.5 / 10** | **below the pass mark of 8**; no criterion is at 0 |

Fixes that raise the score, most valuable first:
1. Match labels with their ", <province>" suffix removed (task, correct data, next step, recovery).
2. Plain words and the true count of cities in the refusal line (plain words).
3. Refuse an ambiguous first-word match rather than guess (correct data).

## Not tested
* A real screen reader, and an intended user's unaided walk (D17/D20 stay with the founder).
* Adobe Validate on the written copy (BK-20).
