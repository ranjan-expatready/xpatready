# S4 Form library (W1-06 + W1-07 run card): journey test, reviewer role, 27 Oct 2026

Commit 6a32505 (`forms/2026-10-27-s4-form-library`). Isolated copy `forms_rev` on :4450 with the stand-in launcher (stub probe answered first; no model call, no canada.ca call; recorded copies). Walked in headed Chrome through Playwright, by clicking and typing, with screenshots in `review-shots/` (r01–r61). US$0.

## Journeys (persona · goal · result)
1. **Main.** Content publisher (user-A): "find a form, see what it is, where it is used and what IRCC accepts". List, Type chips, Used by, search, no match → Clear filters, drawer. **Held** (r01, r04, r05). Two problems: the drawer says IMM 5257 is "Nothing uses it" although Visitor visa and Super visa attach its PDF; Guides shows 0 after Load sample.
2. **Upload one PDF.** "Add IMM 5604." The card shows four rules steps and "Rules read it … No AI call was made", plus "The very file canada.ca's form page links". The row appears Ready. **Held** (r10).
3. **Upload many files with bad ones.** Four files gave four cards (r11). A non-PDF fails at step 1 with plain words. A blank PDF is held with no AI call. An empty file is refused at once. A duplicate gives "Already in the library … Nothing duplicated". **Partly held:** the failed and held cards' link "See the details" goes to the page you are already on. The held card says "Waiting for a second person", but To review asks the uploader to "Record the IRCC page" first.
4. **Run card, chip and Stop.** A live finder run through the stand-in hangs for 60 s. The chip "Finding forms · step 3 of 6" shows up within about 6 s and follows the person to Fields. Opening the chip by keyboard leads to the card. Stop ended the run in 1.8 s, with no launcher process left, one live call logged, and the next steps "Not needed". **Held** (r21, r22). The chip is hidden below 768 px (at 390 px and at 200 % zoom).
5. **Retire and delete.** Retire on IMM 1295 is refused, with each use listed and the button disabled (r40). Delete on the unused IMM 5604 asks why. The author cannot approve it (403); user-B approves and the row is gone. **Held. Break found:** IMM 5257 can be deleted (journey 9).
6. **C11.18, set what IRCC accepts with a second person.** Sending empty gives "Paste the canada.ca line …, or say why". With the line, the row shows "Change waiting". user-B opens To review, then Approve, and the row shows "PDF upload · Online · Set by a person · Sample". **Held, with problems:** the drawer stays stale ("Not set yet" and the Set button again, so a second send gets a 409). To review reads "Set_accepts the what IRCC accepts." The change page title says "Set what IRCC accepts for what IRCC accepts: …" and shows no before value (r31–r33, r37).
7. **Wrong role (user-B).** There is no Upload PDF. In the menu only "See where it is used" is enabled. The drawer has no Set button and says "Read-only". On the server, upload, Stop and Delete by URL are 403. **Held** (r34, r35).
8. **Empty and error.** A fresh workspace shows "No forms yet", which teaches the first action; axe is clean (r60). Search for nothing shows "No form matches" with Clear filters. **Held.**
9. **Break it.** Twenty proposals of "what IRCC accepts" at once gave 1 created and 19 refused. Two deletes at once gave 200 and 409. A 5,000-character quote and the channel "FAX" each give a 400 on the field. A bad run id gives a 404. A hostile `q`/`type` gives a 400. **Blocker-level break:** the delete of IMM 5257 (an approved official edition, attached to 2 combinations, with 3 field-map jobs) was approved and removed it from the library while its attachments remained (2 rows).
10. **Across the screen boundary.** "Where it is used" links to `/c/:id/forms`, and To review links back. Re-read with AI opens today's drafting dialog, scoped to a combination's copy. **Held.** The shared dialog's copy says "A sent AI call cannot be recalled by Cancel", which is out of date since M7.

## Automated replay and data
* **axe (WCAG 2.2 AA): clean on 16 states.** List at 1440, 1024 and 390; no match; drawer; empty; uploads; card running and stopped; set-accepts form; change page; read-only drawer; drawer at 200 %. No sideways page scroll at 1024, 390 or 720 (200 %).
* **Timings.** The first view took 412 to 690 ms. A Type filter took 136 ms. Search sends one request per keystroke and showed the result within 425 ms.
* **Data.** C11.18 stored exactly the channels and the line entered, with basis PERSON_SAMPLE, the change RELEASED and an audit line. Each upload is one row, and the duplicate added nothing. The held file is in To review.
* **Builder checks rerun on this commit:** `check_forms_s4_runs` 49/49 and `check_forms_s4_canada` 49/49.
* **`check_forms_s4_finder`: 81/83 at first, 83/83 after removing finder job files left in `prototype/p2/jobs`.** The failures were "replay reuses the saved answers …" and "Find again never attaches back …". The leftover files came from a stopped run.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Every main task finishes, but a form in use can be deleted (journey 9) |
| Next step obvious | ½ | The held and failed upload cards link to the same page; To review's next step contradicts the card |
| Plain words | ½ | "Set_accepts the what IRCC accepts."; the doubled change title; IMM 5802 typed "Checklist · Not filed" |
| Feedback and state | ½ | The drawer goes stale after Send; a waiting retire or delete is not visible on the row |
| Correct data | ½ | Records are exact, but "Used by" misses source-attached use, and that let IMM 5257 be deleted |
| Error recovery | ½ | Upload errors are clear; leftover job files break a later replay (finder check 81/83) |
| Accessibility and screen sizes | ½ | axe is clean, but focus is lost after the drawer and dialogs; at 1024 Status and ⋯ are off-screen; no chip below 768 px |
| Speed | 1 | Under 1 s for the first view, 136 ms per filter |
| Visual quality | 1 | Calm, dense, aligned, team tokens (r01, r21) |
| Trust and sources | 1 | AI · Sample, IRCC's words, "Rules read it: no AI call was made", US$ lines, Picked by AI |

**6.5 / 10: not a pass (below 8), with no criterion at 0.** Fixes that raise it most, in order:
1. Count combination sources as uses, and never delete an approved official edition (correct data, task completed).
2. Make the drawer read live data.
3. Fix the To review wording and show before and after.
4. Give the held and failed upload cards the right next step.
5. Keep Status and ⋯ visible at 1024, and return focus to the trigger.
6. Clean finder job files when a run ends.

Not tested: a real screen reader, Firefox or Safari, and a paid live run. D17 and D20 need the founder's or an intended user's unaided walk.
