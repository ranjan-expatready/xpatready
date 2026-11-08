# C7.5 part 2: journey test (reviewer, 8 Nov IST)

**What I tested:** commit `8346005d7` (the code is unchanged at head `7f872b70e`, which only adds a records file). I used isolated copies on :4436 and :4437, both started with `STUDIO_MADE_UP_REVIEW_RUNS=1`. The saved review there is **made up by the test fixture** (`tests/fixtures/c75-made-up-run.ts`), and the page says so in a banner. Live AI was off. Total cost: US$0.

**Persona:** the case officer (user-O) at an RCIC firm. Wrong-role checks used the client (user-P), another firm's officer (user-S) and a configuration author (user-A).

**How I walked it:** Playwright driving Chrome headless; this container has no visible pane. I clicked and typed as a person would. The data checks underneath were done afterwards with psql.

## Journeys (main path first)
1. **Main.** Goal: "Check this client's visitor visa form before it goes out."
   - Steps: the case page → Open Review → read the cost → Run review (Saved) → read the findings → Show on the form → Acknowledge the Low finding with a reason → the path link back to the case page.
   - Expected: findings at US$0, each marked as AI's, and the case page warns.
2. **Alternate.** Pick IMM 5707 in Form. Expected: Saved is disabled with the reason, and the button says nothing can run.
3. **Empty.** A case that has only been opened (name and date of birth). Expected: a sheet with what is there, and no saved run.
4. **Error.** The values change in another tab, then Run is pressed. Expected: 409, then the card offers what is now possible.
5. **Wrong role.**
   - A client opens `/cases/:id/review`.
   - Another firm opens the same link.
   - The API is called as a configuration author.
6. **Recovery.** Double-click Run, reload after a run, re-send the same run id.
7. **Sizes and keyboard.** Tab-only to Run; widths 400, 1024 and 1440 px; 200 % zoom (720 px at device pixel ratio 2).
8. **Fact fixed.** The quoted value is changed in the case's answers. Expected: the AI finding is resolved by the rules on the next read, while a dismissed or acknowledged finding is left alone.
9. **Family case.** Two people. Expected: Person lists both, each with that person's own forms.
10. **Boundary.** Ready to file (the case page's readiness panel). Expected: the AI finding shows as a warning, never a block.

## What held
- **J1.** Case page ready in 239 ms; run card 196 ms; Saved run 126 ms.
  - Result: "Saved (made-up test run): 2 new findings. US$0.00. Each finding is a warning…"
  - The run listed "1 AI finding left out by the rules" and "1 box the AI could not judge".
  - Low came first and showed both rounds' reasons. High showed both reasons and the quote.
  - Show on the form highlighted "Country where the person currently lives / Afghanistan" in the source panel, with screen-reader text added.
  - Acknowledge saved the reason, and the counts read "1 open · 1 acknowledged".
  - Back on the case page: "MAJOR finding on IMM 5257: the AI review (High) flags what the form says, “India”".
  - axe was clean on the card and after the run.
- **J2.** Saved was disabled with "IMM 5707: No saved review of this form edition with these values yet…". Run was disabled, with "Nothing can run for these answers now: see the reasons above." axe clean.
- **J5.**
  - The client saw "This page is for the case officer".
  - Another firm saw "This case could not be opened / No such case" (API 404).
  - The configuration author got 403. The representative got 200, which is correct: firm staff.
  - Four forms in one request were refused on the field: "Review at most 3 forms in one run."
- **J6.** A double click gave exactly 1 run (audit `reviewed` lines). After a reload the findings stay, and the result line clears as it should.
- **J7.** The keyboard path reaches Person, Form, the Saved radio and then Run review (Tab stop 10). Stand-in tooltips open on focus. There was no sideways scroll at 1024 px, 400 px or 200 % zoom.
- **J8.** After the value changed, the High finding was `resolved` with `resolved_by = rules` and an audit line "The rules resolved 1 AI finding…". The acknowledged Low finding was unchanged.
- **J9.** Person lists Sample Client A and Sample Spouse A; Form lists that person's forms.
- **Data.** Each AI finding was stored once, with `replayed = true`, one run id and the filing set. The audit line per run names the forms, the mode and US$0.00, and holds no value, quote or reason. No `ai_batch` row was added. No console or page error.
- **Suites, run twice.** The browser suite passed 31/31 and then 30/30. The API suite passed 35/35.

## Findings
| # | Severity | What | Where |
|---|---|---|---|
| B1 | **Major** | IMM 5707's source panel and sheet print codes ("Marital status 4", "accompany… 2"). Its rows for the applicant and the parents carry the same captions, with nothing saying whose row it is. Breaks BR-2. | J2 walk · `api/src/review-runs.ts:320` |
| B2 | **Major** | Two Live POSTs at once can both start: the check at `:219` and the set at `:227` are separated by awaits. The Live guards and Stop have no failing test. On Live, step 3 never shows as running. | `review-runs.ts:219-227` · `web/src/runtime/review.tsx:126` |
| B3 | **Major** | Change the values in another tab, then press Run: "The review did not run … Look at the run card again". The card still offers Saved. Pressing again gives the same 409 until a manual reload. | J4 walk (the 1st and 2nd attempts give identical results) · `review.tsx:122` |
| B4 | Minor | Re-sending the same `runId` after a run that added nothing starts a second run (201 then 201; it should be refused). | `review-runs.ts:226` |
| B5 | Minor | The High and Low pills have their tip as a `title` only; there is no tip on keyboard focus. | `findings.tsx:102-103` |
| B6 | Minor | Focus drops to `<body>` after Run, and again after the Acknowledge dialog on this page. | J1 walk |
| B7 | Minor | "(P-295)" appears in the Live and no-saved texts on the main path. | J1 card text |

Not a finding: a very long family name in Arabic script leaves the IMM 5257 sheet altogether. The filler does not print it, and the sheet keeps only boxes a copy would print. There was no sideways scroll.

## Score (QUALITY "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 end to end on the made-up saved run. On the product, Saved waits for the tech lead's paid run, by design. |
| Next step obvious | 1 | One primary button; "Open Review"; when nothing can run, the page says why. |
| Plain words | ½ | B1 (codes on IMM 5707) and B7 (decision numbers). |
| Feedback and state | ½ | The result is in a live region, and dropped and unjudged items are shown. Against that: Live progress is invented (B2) and focus is lost (B6). |
| Correct data | 1 | Database checked: one row per finding, run id, Replayed, audit without values, dismissed findings never raised again, resolved by rules. |
| Error recovery | ½ | B3: the 409 loops until a reload. |
| Accessibility and screen sizes | 1 | axe clean on every state; keyboard path; 400, 1024 and 1440 px plus 200 % zoom. |
| Speed | 1 | Every step was under 250 ms. |
| Visual quality | 1 | Team look; Source + proposals; one heading per panel. |
| Trust and sources | 1 | Each finding is marked AI and Replayed, shows High or Low and both reasons, quotes the form, and Show on the form highlights the line. Made-up runs are labelled. |
| **Total** | **8.5 / 10** | Pass (8 or more, with no 0). |

**Fixes that would raise the low criteria, most valuable first:**
1. Refresh the run card on a 409 (B3).
2. Print choices in words, and say whose row it is, on IMM 5707 — or offer only IMM 5257 for now (B1).
3. Tick the steps from the real round status, and keep focus on the result (B2, B6).
4. Take decision numbers off the main path (B7).

**Not tested:**
- A visible-pane walk and a real screen reader.
- The Live path (off), Stop during a round, and the real saved run.
- D17 and D20, which need the founder or an intended user.

**Verdict:** the journeys pass (8.5/10), but the review blocks on B1–B3 (see `review-part2.md`).
