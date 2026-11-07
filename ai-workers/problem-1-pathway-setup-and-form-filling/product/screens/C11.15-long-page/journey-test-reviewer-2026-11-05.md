# C11.15 long page address fix (QA-252) · journey test (reviewer) · 5 Nov 2026

Commit 6277f5df6. Isolated copy forms_rev on :4456, demo reset and sample loaded, live AI off, US$0. I walked it in headless Chrome by clicking, typing and reading, with data checked in xr_studio_forms_rev. The screenshots are in the reviewer's scratchpad and are not committed.

## Journeys (persona: configuration author, user-A, unless stated)
1. **Main (the founder's test).** Super visa › Forms. Press "Find form numbers by rules (free)" and see "Waiting for you: choose the application page". Open "Choose the page and find again", pick Start Up Visa (148 characters), choose Rules only and press Start. **Held:** the dialog closed in 259 ms with no red line, and there was 1 run (RULES, the 148-character page). The run then FAILED ("could not read the application page"). That is expected: the page is not in the recorded copies, as the build notes say.
2. **Alternate: every offered page, Saved and Rules only** (the builder's walk, run twice): 52/52. All four offered pages (120, 103, 132 and 148 characters) in both modes give 1 run each on that page.
3. **Long pasted address.** I pasted the 314-character canada.ca address under "Another canada.ca page" in the page choice, chose Saved and double-clicked Start. **Held:** 1 run with the whole address stored. axe was clean, and there was no sideways scroll at 1440 px.
4. **Error: bad input.** I typed "hello" and saw "This find cannot start · Paste the address of a canada.ca application or guide page." An example.com address showed the server's words about canada.ca. Start stayed off in both cases. No validator text appeared.
5. **Recovery: a wrong page (QA-252 (2)).** After Visitor visa's page finished (0 forms), Find again shows "The page this combination's last find read" and "Another canada.ca page". With "Another" chosen and nothing pasted, the dialog says "Paste the address…" and Start is off. Pasting Super visa's own page gives 1 run on that page. **Finding:** afterwards the label still names Visitor visa's page as the one the "last find read", but the last find read Super visa's page and failed (review Minor 1).
6. **Recovery: a double click, and three concurrent launches with one key.** 1 run each time. In the race, the extra launches got 409 "Already finding". Reload mid-run is fine.
7. **Keyboard only.** In the page choice, focus opens on the first page. I arrowed to Start Up Visa and pressed Tab. **Fails:** the address box takes focus, the choice flips to "Another canada.ca page" and Start is disabled. Find again with a remembered page fails the same way after one Tab past the page radio (review M1).
8. **Screen sizes.** With the dialog open on the 314-character address, at 400 px, 1024 px and 200 % zoom (640 css px): no sideways scroll on the page or the dialog, Start visible, axe clean.
9. **Wrong role.** The content reviewer (user-C) and the approver (user-B) see no find button. A launch by URL gets 403 "does not hold the author duty".
10. **Next step.** After a failed find, the panel reads "AI found 0 forms for this combination · Last find … rules only, US$0" and offers only Find again. It does not say the page could not be read, and the page choice is gone until another find waits for a page (review Minor 3, already true before this diff).

## Data underneath
Each Start made exactly one `ai_batch` row with the chosen mode and the full `page_url` (148 and 314 characters). The old key format is refused with a 400 and starts nothing. There were 0 LIVE batches and `drafting_job.cost_usd` summed to 0.

## Break-it (15 min)
* 314-character and one-character-apart addresses: keys differ, 2 runs.
* Race with one key: 1 run.
* A non-canada.ca address and a non-URL: our words.
* Typing an address by hand sends one plan request per keystroke (26 for 26 characters; already true before this diff, Minor).
* While a plan is refused, the Live radio shows as enabled (already true before this diff; not clicked; the server refuses a live start).
* Severity: 1 Major (keyboard), the rest Minor.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1-3: every offered page and the 314-character address start one run (mouse) |
| Next step obvious | ½ | Journey 10: after a failed find, only "Find again". The page offer is gone |
| Plain words | ½ | No validator text anywhere, but the "last find read" label is wrong after a failed find |
| Feedback and state | ½ | The run card and panel do not say why the find failed ("AI found 0 forms" in rules only) |
| Correct data | 1 | One row per Start, full address, US$0 |
| Error recovery | 1 | Bad addresses get words, a wrong page can be replaced, never a dead end |
| Accessibility and screen sizes | ½ | axe clean, 400, 1024 and 200 % fine; keyboard loses the chosen page (journey 7) |
| Speed | 1 | Start closes in 259 ms, plans under 1 s |
| Visual quality | 1 | Long addresses wrap inside the dialog, team look |
| Trust and sources | 1 | Sample note, US$0 and the full page address shown on every plan |
| **Total** | **8 / 10** | Pass (8, no 0) |

Fixes that would raise the low criteria, most valuable first:
1. Choose "Another" on typing, not on focus (accessibility).
2. Say on the panel how and why the last find ended (feedback, next step; follow-up row).
3. Change the label to "The page the last finished find read" (words).

## Not tested
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 with the founder).
* Live mode.
* The UI on main (no checkout allowed).

Verdict for the check: score passes, but the review blocks on M1 (see `review.md`).
