# Journey test, reviewer: BK-3 One frame, PR 1 (d2705074e)

11 Nov 2026 · reviewer role (one score for this check) · copy bk3rev on :4446, configured checkpoint, live AI off (US$0).
**How:** Chromium shown on Xvfb, driven by clicks, typing and reading only (no API shortcuts on the walked steps).
**Replays:** the builder's walk (check_bk3_frame_browser.cjs) ran twice, 318/318 both times. Five existing suites ran on their own copies (:4447-4449).
**Evidence:** my walk's screenshots are in the reviewer's scratchpad (`walk/01`-`12`, not committed). The builder's 12 are in `screenshots/`.

## Journeys (persona · goal · result)
1. **Main path. Content publisher: "get around set-up and back without the menu".**
   - Steps: Programs → menu Fields → a field → Back → Back.
   - Result: the line read "Back | Shared library | Fields | Accompanies principal applicant | Cases". Back went to /library/fields, then to `/`. **Held.**
2. **Alternate. Publisher: "open a combination and return to my list".**
   - Steps: Programs → Open (Visitor visa) → Forms tab → Back.
   - Result: the line read "Immigration programs › Temporary residence › Visitors › Visitor visa", each level linking to its list. Back went to `/?sel=visitors.visitor_visa`. **Held.**
3. **Across the screen boundary. Publisher, then case officer: "from set-up to a case and back".**
   - Steps: Cases → (the person becomes Case officer) → SAMPLE-VV-FAMILY-1 → eligibility → Back → Product Studio →.
   - Result: Studio's first page, person back to the author. Works at 375 too. **Held.**
4. **Journey step. Representative: "check the review, then go back to the case".**
   - Steps: /cases/:id/representative-review.
   - Result: the line reads "Cases › Case › Representative's review", generic "Case" where the case page shows the reference. **Minor (m3).**
5. **Client A: "answer my questions; nothing else to get lost in".**
   - Steps: open the questionnaire.
   - Result: "Client questionnaire", no Back, no other area. **Held.**
6. **Wrong role by URL. Client A opens the case officer's case page.**
   - Result: the notice is right ("This page is for the case officer"), but the line says "Client questionnaire › Page not found" on a real route (walk/07). **Minor (m2).**
   - Also: a case officer at /structure gets the existing notice, with Back to Immigration programs. **Held.**
7. **Outside person: link page and demo inbox.**
   - Result: "Your questions" has no Back (right). "Demo inbox" has Back to Cases (demo chrome). **Held.**
8. **Error: an address that does not exist, a missing record.**
   - Steps: /no-such-page, /c/nope, /cases/nope, /cases/nope/sheet/x, /ai/nope, a missing field.
   - Result: each shows its line with Back out. **Held.**
9. **Keyboard only. Combination Forms tab, Tab from the top.**
   - Order: header (4) → draft bar link → menu (12) → Back (stop 18) → crumbs → Cases → page.
   - Focus ring visible (walk/04). axe on the line: 0 violations. **Held.**
   - Back's accessible name is "Back" only. **Minor (m4).**
10. **Recovery: reload a case page, browser Back after Back.**
    - Result: the line re-forms from the address, then names the reference. Browser history is intact (Activity → To review → Back → `/`, browser Back → /review). **Held.**
    - But "Back" means "up", not "previous". **Minor (m4).**

## Screen sizes and timings
- No sideways scroll on the walked screens at 1440, 1024, 512 (1024 at 200 % zoom) or 375. At 375 the line wraps to three rows (walk/10).
- The builder's test excludes /structure and Preview at 375. Both also scroll sideways on main (page content, not this change).
- The line draws at once from the address; each page's own words follow its data (under 1 s on the checkpoint).

## Data underneath
- The frame writes nothing.
- The only side effect is the simulated person, checked in localStorage `xr-actor`: Cases → user-O, Product Studio → user-A.
- Server authorisation is unchanged (403s for the client on staff data, as before).

## Break it (15 minutes)
- **Unknown ids, error states:** Back holds on all of them.
- **Wrong role:** see journey 6.
- **Existing suites at this commit:** three fail because of this change.
  - check_c69_page_browser.cjs:72: its separator regex reads "›" as text.
  - check_screen01_browser.cjs:360: "Page not found" now appears twice.
  - check_w1_programs_s2.cjs:293: it reads the line before the page names the levels; failed twice.
  - These are the review's **M1 (Major)**.
- **Passed:** check_qa317 34/34, check_c76_ready 53/53, check_s6_queue 35/35 (toast stack; the first run lost its server mid-run, the re-run is green).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every route has the line and a way back. Studio ↔ Cases at every width (journeys 1-3, 8; 318/318 twice) |
| Next step obvious | ½ | Back's target is unnamed and on top-level pages it is not "previous" (journeys 9-10) |
| Plain words | ½ | "Page not found" on a real route (journey 6). "Case" for the reference (journey 4) |
| Feedback and state | 1 | Address words while loading, then the page's own. One toast stack (s6 queue 35/35) |
| Correct data | 1 | No writes. Person switch correct both ways |
| Error recovery | 1 | Unknown and missing records keep the line and Back (journey 8) |
| Accessibility and screen sizes | ½ | axe 0 and focus visible. But "Back" name only, a title tooltip that never opens on focus, 13 px off the scale |
| Speed | 1 | The line draws immediately |
| Visual quality | ½ | Calm band, but 13 px text (EXPERIENCE §1 [M] type scale) |
| Trust and sources | 1 | Demo marks kept (Prototype badge, "Acting as (simulated)"). No AI surface changed |

**8 / 10, pass (no 0).**

Fixes that would raise the low criteria, most valuable first:
1. Name Back's target (m4).
2. Use the reference on the representative's review and the questionnaire (m3).
3. Give the client correct words on /cases/:id (m2).
4. Move the line to 12 or 14 px (m1).

The journey score is not the verdict. The review blocks on M1 (red suites).

## Not tested
- A real screen reader.
- Dark theme.
- Long or non-English case references at 375 (`overflow-wrap:anywhere` is set; the builder's test checks the line fits on every route).
- A representative-review round (the checkpoint has none: 404).
- The other 138 selected suites.
- An intended user's unaided walk (D17 and D20 stay with the founder).
