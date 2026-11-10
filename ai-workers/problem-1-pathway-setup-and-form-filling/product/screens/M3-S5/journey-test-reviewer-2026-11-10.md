# Journey test: M3-S5 answer sheet for online-only forms (reviewer, 10 Nov 2026)

Commit 8648d869a, isolated copy on :4457 with the configured checkpoint, headless Chrome through Playwright (no visible browser pane in this cloud session). Case officer user-O, author user-A, approver user-B. US$0.

## Journeys
1. **Main (case officer):** "Type IMM 5669 into the account for my Express Entry client." Cases › the case › Online line IMM 5669 › Open answer sheet › copy the confirmed answer › tick "Entered in the portal". Expected: the sheet is in the form's parts, the answer is there to copy, and the tick records who did it.
2. **Alternate (author, then approver):** the library records "IRCC accepts IMM 5669 only Online". Expected: the case's line reads "Answer sheet only" with the reason, and no PDF copy is offered.
3. **Error:** ask for a PDF copy of an answer-sheet-only form. Expected: a refusal in words, and nothing made.
4. **Another form unaffected:** IMM 5406 on the same release, with no record, keeps its "Copy, not for filing".
5. **Recovery:** reload the sheet after the record. Expected: the tick is kept and the item is still Online.
6. **Break, copy first:** a PDF copy is made, then the record is approved.
7. **Break, moved channel:** a PDF-upload line with an Online-only record is moved to Online by the officer.
8. **Boundary:** the case's Forms list and the answer sheet, the hand-over to the portal (W6, parked).

## What held
* J1: the case page shows the Online lines in about 1.2 s. The sheet opens in 147–166 ms, in parts "Your full name, father, mother, … Addresses". A confirmed answer shows with Copy, and waiting facts are listed in words. Keyboard-only: 32 Tabs to "Open answer sheet: IMM 5669 …", Enter, 6 Tabs to "Entered in the portal", Enter ticks it, and focus lands on "Take the tick off" (2 px outline).
* J2–J5 (builder's API test re-run: 17/17): after C11.18's propose/approve, `online[]` shows `pdf_copy:false` with "The Form library records that IRCC accepts IMM 5669 only Online: … The record says: "Set by a person: …"". `generate` and `pdf-copy` return 422 with the same words. No `form_instance` is created, IMM 5406 keeps its copy, and the sheet and its tick are unchanged.
* axe-core WCAG 2.2 A/AA: 0 violations on the case page and the sheet at 1440, 1024 and 400 px. No sideways scroll at any width, or at 200 % zoom (512 CSS px, DPR 2). No console or page errors.
* Data: the record exists once per form and account (`form_edition_accept`), basis Sample. A Visitor visa case is unchanged (PDF forms and copies; no Online lines).

## Findings
* **Major (J6):** the copy made before the record vanishes from the Forms list (DB still 1 row), and the line says "with no PDF copy". `api/src/fill-case.ts:197`, `:206`.
* **Minor (J7):** the Forms tab shows "PDF copy, not for filing" and "Generate a copy" for IMM 5562, and pressing it gives the toast "…answer sheet only, with no PDF copy" (`r-generate-5562-refused-1024.png`). `fill-case.ts:254` vs `:306`.
* **Minor:** the reason quotes IRCC's line with no source or date, and a founder record is not labelled Sample (`engine/channels.ts:72`).
* **Minor:** the reason sentence runs to three lines at 1024 px. It is readable, but the pill already says "Answer sheet only".

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 by keyboard and by mouse; tick recorded with who |
| Next step obvious | 1 | "Open answer sheet: IMM 5669 for …" on the line; sheet sections in order |
| Plain words | ½ | Clear, but the reason is long and repeats the pill |
| Feedback and state | 1 | Pill, tick toast, worded 422 toast |
| Correct data | ½ | J6: an existing copy is hidden while it is still stored |
| Error recovery | ½ | J7: the screen offers an action it then refuses |
| Accessibility and screen sizes | 1 | axe 0 at 3 widths, 200 % zoom, keyboard path |
| Speed | 1 | Sheet under 200 ms; case page about 1.2 s with every panel (budget is for the catalogue) |
| Visual quality | 1 | Team pills, cards and buttons; aligned table (`r-sheet-1440.png`) |
| Trust and sources | ½ | A person's reason is marked "Set by a person", but IRCC's line has no source or date and no Sample label |
| **Total** | **8/10** | Pass (8 or more, no 0) |

To raise it, most valuable first: keep earlier copies in view (correct data); make `pdf_copy` and the copy offer follow the same sheet-only test as `generate` (error recovery); name the source, date and Sample in the reason (trust); shorten the reason under the pill (plain words).

## Not tested
A real screen reader. A visible-browser walk by a person (headless here). An intended user's unaided walk (D17, D20: the founder). The portal itself (W6, parked).
Screenshots (scratch, not committed): `/tmp/claude-0/-home-user-xpatready/03fe3e66-fb93-565c-af12-7e162f4de18e/scratchpad/shots/`.

## Round 2: commit e64a1d65a (same day, fresh copy rev_m3s5b on :4457, stopped afterwards)
* **J6 fixed.** The IMM 5406 copy made before the record stays listed (Generated, Download, "Copy, not for filing"). The Online line adds "A copy made before that record is kept with the forms above, not for filing." (`r2-online-lines-1024.png`).
* **J7 fixed.** A PDF line moved Online with an Online-only record shows "Answer sheet only", no copy offer, and a 422 in words (API test R4).
* **Still open (Minor).** The kept-copy row still offers "Generate a new copy", and pressing it returns the 422. The reason still names no source and no Sample label.
* **Checks.** axe 0 and no sideways scroll at 1440 and 1024 px; no page errors. API test 28/28, pure test 29/29.
* **Score, round 2: 9/10.** Correct data 1, plain words 1, error recovery ½ (the refused action is still offered), trust and sources ½. The other criteria are unchanged from round 1. Pass.
