# Journey test (reviewer): C11.3 QA-150, full trail on the Forms list and the finder

Reviewer agent, 2 Nov 2026 · commit **c8840db6** · isolated copies :4443 (`rev_c113`) and :4444 (`rev_s4`, with the fake launcher and canada-alt fixtures from the suite's usage line) · headless Chromium `/opt/pw-browsers/chromium` · live AI off, US$0.
The scripts and screenshots are scratch work and are not committed. They are in `/tmp/claude-0/-home-user-xpatready/12cd23a1-e5cf-5cbe-9208-eb5654594dca/scratchpad/jt/` (scripts `j1.cjs` to `j6.cjs`, screenshots under `shots/`).

## Journeys (persona · goal · expected)
1. **Main path.** Content publisher (user-A) · "Which combinations use this form?" · Demo › Load sample, then Shared library › Forms. Each Used by entry names Pathway type › Pathway › Program › Category › Sub-category, in the same words as the Immigration programs card.
2. **Alternate.** Publisher · "Show me only Visitor visa's forms" · the Used by filter, chosen by keyboard. The list narrows, and the filter shows which combination it is set to.
3. **Where used.** Publisher · "Can I retire IMM 5257?" · Actions › See where it is used, by keyboard. Each combination is named by its full trail.
4. **Across the screen boundary.** Publisher · "Find this combination's forms" · finder plan, run, run card, AI work. The plan shows the full trail. The AI gets the same names as before.
5. **Wrong role.** Case officer (user-O) and an unknown caller read the list. Expected: 403 and 401. The approver (user-B) can read it.
6. **Break it.** Rename the Visitors program to a long French name, then look at the cell at 1024, the plan, the card and `ai_trail`. Also check 200 % zoom.

## What held
* J1: all 9 single Used by cells read name first, then the muted context, for example "Visitor visa · Retail › Temporary residence › Visitors". The API labels are the full five parts, and the acceptance pack's AT-10 passes. `forms-list-1440.png`.
* J3: Where used reads "Retail › Temporary residence › Visitors › Visitor visa › No sub-category" and the same for Super visa. axe found 0 violations. The keyboard path worked: the Actions menu button, Enter, the menu item, Enter.
* J4: the plan's `combination.trail` equals the card's `trail` exactly, and `ai_trail` = ["Temporary residence","Visitors","Visitor visa"]. The AI round's job id was `studio-finder-guide-temporary-residence-visitors-super-visa-…`, so the AI still got the old names. The run card scope and the AI work Scope show the full trail.
* J5: the case officer got 403 and the unknown caller 401, both in plain words. The approver got 200.
* J6: after the rename, the Used by entries, the plan and the card all show the new name, and `ai_trail` shows it too. That is the existing rename behaviour, not a change. The long-name cell is not clipped. At 200 % zoom (720 px) `scrollWidth` is 720.
* Data underneath: `GET /library/forms/list` and `/uses` match the catalogue, and nothing was written. Suites: check_c113 8/8, check_forms_s4_finder 144/144, C11.3 pack 21/27 (the 6 fails are the expected AT-5 and AT-9 ones, owned by other rows).
* Speed: warm Forms first view 337 to 653 ms, list API 116 ms. Console and page errors: none.

## Findings (Minor only)
1. **J2: the filter hides its own value.** With Visitor visa chosen, the closed select reads "Retail › Temporary residence" at 1440 and 1024. That is the same for 5 of 6 combinations: the option text is 464 px, the box is 222 px (`library-forms.tsx:200`). Screenshots: `filter-vv-1440.png`, `filter-vv-1024.png`. This regression comes from this commit.
2. **J1 at 1024: Used by cells are 8 to 10 lines tall** (160–200 px in a 95 px column, `library-forms.tsx:241`). The programs list uses one truncated context line with a hover title. EXPERIENCE §1 allows a trail to wrap to a second line. Screenshot: `forms-list-1024.png`.
3. **Test gap:** nothing fails if `execute` gives the AI the five-part trail instead of `ai_trail`. The fallback for older plans is also untested (`check_c113_full_trail.ts:51-52`).
4. **Mixed placeholder:** "No sub-category" shows as plain text in Where used, the filter, the run card and AI work (7 lines at 1024, `ai-work-1024.png`). The cards and the Used by cell hide it.

## Score (0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J3 and J4 show the five parts; AT-10 passes |
| Next step obvious | 1 | Actions and See where it is used unchanged; menu reached by keyboard |
| Plain words | 1 | The card's words exactly; no ids |
| Feedback and state | ½ | Finding 1: the filter does not show its value |
| Correct data | 1 | Plan = card; `ai_trail` and job id unchanged; nothing written |
| Error recovery | 1 | Older plans fall back to `trail` (code read, `finder.ts:314`); rename follows |
| Accessibility and screen sizes | ½ | axe 0, keyboard and no page-level sideways scroll at 400/1024/1440/200 %, but finding 2 |
| Speed | 1 | 337–653 ms warm |
| Visual quality | ½ | 1024 row height; `TrailText`, not the shared `Trail` |
| Trust and sources | 1 | The AI's input is unchanged; "Picked by AI" and Sample notes intact |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no criterion at 0) |

What would raise the low ones, most valuable first: (1) name-first option text in the filter; (2) one truncated context line with a hover title in the Used by cell, or the shared `Trail`; (3) one rule for "No sub-category" across every list.

## Not tested
A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder). A live AI run. The library browser suite (`channel: "chrome"`); my own Playwright walk stood in for it.
