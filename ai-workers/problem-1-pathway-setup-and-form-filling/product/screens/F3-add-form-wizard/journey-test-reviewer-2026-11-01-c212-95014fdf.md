# Journey test · reviewer · F2 C2.12 slice 4 (To review by form, the return strip) · 1 Nov 2026 · commit 95014fdf

Copy: forms_rev on :4456 (`xr_studio_forms_rev`, now dropped). Web bundle rebuilt from the commit. US$0, replay only. The browser was Playwright Chrome, headless, driven like a person (clicks, Tab, Enter, Escape, browser Back and Forward). Review: `review-c212-s4.md`.

## Journeys
1. **Main path, keyboard only (content publisher, user-A).** "I'm halfway through IMM 5257 on the Super visa; take me to my step and back."
   - Steps: Forms tab → chip (Enter) → 4 Tabs to the step link → Enter → job page → Tab to "Back to the steps" (16 Tabs from the top) → Enter.
   - Held: the strip reads "Setting up IMM 5257 on Super visa · Step 3 of 6 · Review · Your step · 1 open". Back reopens the rail with focus on step 3. Browser Back and Forward both work.
2. **Alternate (content publisher).** "Show me everything for this form."
   - Steps: rail → "Everything for IMM 5257 on To review".
   - Held: only this form's items on this combination plus library-wide ones. Counts match. "Show every form" brings the held file and the Visitor visa's job back.
   - Wrong turn: clicking the row's "Review 84 AI proposals" opens the job page **without** the strip (m1).
3. **Finish the step (content publisher).** On the job page, Apply / Preview the draft goes to `/c/:id/preview` and the strip is gone (m2). Recovery: go to the Forms tab and use the chip.
4. **Empty.** In the Waiting view: "Nothing for IMM 5257 in Waiting for others. 1 other item of this form is under All." The empty state for IMM 1295 offers "Show every form" and never the whole queue's empty state.
5. **Error.** A form number of 41 characters is refused in words, with "Show every form" and no "Try again". A combination reference of 65 characters is refused under the title "This form number is not one the studio reads" (wrong field, m3).
6. **Wrong role / other roles.**
   - Approver (user-B) and Content reviewer (user-C) see the strip with their own state.
   - A case person gets no strip, by design (`App.tsx`).
   - `?combination=` without `form` gives 400 at the API.
7. **Stale address.**
   - An unknown combination: no strip, and the list still loads.
   - Without `?c=`: "on every combination" and no strip.
   - A crafted `c=../../review-queue…`: **the whole page goes blank** with a page error (m6).
8. **Recovery.**
   - A reload with `back=1` refocuses the step. Escape drops `back=1` and returns focus to the chip.
   - "Show every form" by keyboard drops focus to `<body>` (m5).
9. **Screen boundary.**
   - `/review/proposals?group=…&form=&c=` keeps the strip.
   - Without `group`, the page rewrites the address and the strip goes (m4b). The rail never links there.

## Automated replay
- Builder suites rerun on my copy: `check_forms_c212_to_review_browser.cjs` 25/25 and `check_forms_c212_rail_browser.cjs` 31/31. Both cover axe at 1440/1024/390, 390 px with no sideways scroll, the keyboard Back path, and no page errors.
- My own probe (kept outside the repo, under `/tmp/rev`) covered:
  - the keyboard walk (journey 1)
  - axe on the job page with the strip: clean
  - 390 / 1024 / 720 px (200 %): To review has no sideways scroll. The job page is 732 px wide at 390 with or without the strip, which is already on main.
  - the roles, the stale and crafted addresses, and Back / Forward
- Timing: `GET /review-queue?form=&combination=` takes 15–41 ms. The strip makes two GETs. No waits over 1 s.

## Data underneath
- Read-only slice: every request the strip and the filtered page make is a GET, and the probe saw no writes.
- The API list equals the rows on screen. The review step's count on the path equals the review-kind items To review lists (suite D3).

## Break it (15 min)
- Long, hostile and lowercase input:
  - a form of 41 characters: refused in words
  - a combination of 65 characters: refused, but the notice names the wrong field (m3)
  - `imm5257`: filtered correctly, but the filter line shows "imm5257" (m7)
  - path-like `c`: blank app (m6, Minor because it needs a hand-made address and touches no data)
- Two tabs: nothing to race, since the slice writes nothing.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–2: to the step and back, by keyboard |
| Next step obvious | 1 | The strip names the step; Back lands focus on it |
| Plain words | ½ | "1 open" does not say what it counts (m4); the 400 title names the wrong field (m3) |
| Feedback and state | 1 | Filter line, form-specific empty state, strip state per role |
| Correct data | 1 | API = screen; path count = To review count (K1) |
| Error recovery | ½ | Strip lost after Apply and on To review rows (m1, m2); crafted `c` blanks the app (m6) |
| Accessibility and screen sizes | ½ | axe clean, keyboard path works, 390 px fine; focus lost after "Show every form" (m5) |
| Speed | 1 | 15–41 ms API; no waits over 1 s |
| Visual quality | 1 | The team's tokens; strip and filter line match the rail's look (screenshots `c212/10-*`) |
| Trust and sources | 1 | Read-only, no AI; says which form and combination it narrows to |

**8.5/10, pass (8 or more, no 0).**

Fixes that would raise the score, most valuable first:
- m1 and m2 (carry `form`/`c` through To review rows and the job page's `nav()`)
- m6 (encode `c` and guard `combination?.label`)
- m4 and m3 (wording)
- m5 (focus after "Show every form")

**Could not test:** a real screen reader, an intended user's unaided walk (D17/D20 stay with the founder), or real browser zoom (I emulated 200 % with a 720 px viewport).
