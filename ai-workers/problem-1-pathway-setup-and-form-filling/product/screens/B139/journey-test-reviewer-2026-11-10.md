# B139 · C6.17 journey test (reviewer) · QA-375 fix under P-444 · 10 Nov 2026

Commit **17538072eeb1673f9f068e76f4f53961781571ec** (PR #1477). Fresh isolated copy on :4452 with the configured checkpoint (Demo › Reset, Load "configured"; the load took 116 s). Headless Chromium at deviceScaleFactor 1, using only clicks, keys and what is on screen; the API was read only afterwards, to check the data. Script: a scratchpad file outside the repo; 31/31 checks passed. Live AI off, US$0. The replay of the builder's scripted journeys is the walk `check_c617_stages_browser` (42/42 on my run) and the pack (47/47).

## Journeys (persona: case officer of the case's firm)
1. **Main path.** "My client's study permit has its passport copy; when the work permit starts, I want that copy offered, not asked for again."
   * Steps: open a case on Study permit (outside Canada), then upload the passport copy on Documents by keyboard (Tab to the line's menu, Enter, arrow keys to "Upload a file…").
   * Then Start next stage by keyboard, give the reason, start.
   * Expected and seen: "Received" with the file named (325 ms). The dialog says "2 documents on the checklist: Passport or travel document information page photocopy; Proof of fee payment …". The toast repeats it (start 605 ms). The work permit's passport line reads "On file from Study permit, uploaded 10 Nov 2026: check it for this application." Held.
2. **Trust.** Opening "Source" on every line shows:
   * study lines: IMM 5483 (08-2025), page and date;
   * work-permit lines: IMM 5556 (03-2024), "canada.ca PDF modified 2024-04-10, p. 1, documents list item N", or "Sample: not on IMM 5556 … the reviewed release took it from …".
   * Held. (The two Sample lines are conditional and were waiting on this case; I saw them in the release data.)
3. **Prepare across the boundary.**
   * Prepare on the study stage now lists 3 document items, all to do.
   * After the start, Prepare lists only the work permit's 2 items, none from stage 1.
   * The checklist read lists only the work permit's lines. Held.
4. **Alternate.** The officer uploads the work permit's own passport.
   * The line goes Received, but it still says "On file from Study permit … check it for this application" (review m2). Partly.
5. **Error.** A text file named with long non-English characters and ".pdf", uploaded on the fee line.
   * "Send a PDF, JPEG or PNG file (judged by the file itself, not its name). Nothing was stored." appears on the line; the line stays Not requested. Held.
6. **Recovery.** A reload after the start keeps the "On file" words. Held.
7. **Ended stage.** The study stage's panel is read only and lists "Its own documents: sample-passport-study.pdf". It does not list the later work-permit file and has no line menu or file input. Held.
8. **Stale or wrong write, by URL** (the pack, which I re-ran).
   * An upload on the study line after the start gives 409 `stage_ended`: "This document line belongs to an earlier stage of the case, which has ended …". Nothing is stored.
   * A racing upload is refused by the database trigger and also answers a plain 409 (main.ts:216). Held.

## Break-it (15 min)
* **Fail-first.** In a scratch worktree I turned `wp.lmia_inside`'s checklist off and disabled the guard. The pack's three new C6.17-9 steps FAIL (44/47).
* **Money.** The two new fee-table entries have no lines. `rulesFrom` and `feeLinesOf` read them exactly as an absent entry. C6.12's fee walk is the builder's run (58/58).
* **Neighbouring suites on these combinations** (my runs): check_qa144_lmia_release 23/23, check_c10_1_configured 48/48, check_b52_own_yes_no 67/67, C1.3 56/56, check_r2_fee_table 85/85, check_c617_stages 32/32.
* No Blocker or Major found.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 end to end on the product's own screens |
| Next step obvious | 1 | the dialog names the documents; the line says "check it for this application" |
| Plain words | 1 | the error and 409 words say what happened and that nothing was stored |
| Feedback and state | ½ | Received at once; but Received plus "On file … check it" on one line (J4, review m2) |
| Correct data | 1 | lines on the new stage only; the file stays on the study line; Prepare per stage (J3) |
| Error recovery | 1 | J5, J6, J8 |
| Accessibility and screen sizes | 1 | keyboard upload through the menu; axe WCAG 2.2 A/AA 0 on 3 states; no sideways scroll at 1440, 1024 and 400 px |
| Speed | 1 | upload 325 ms, start 605 ms |
| Visual quality | 1 | team line rows; my captures at 1440 and 1024 match the builder's P444a and P444b |
| Trust and sources | 1 | every line sourced with page and date, or Sample with its origin (one quote adds a "." between paragraphs: review m1) |

**Journey score 9.5/10: pass** (8 or more, no 0). To raise it: hide "On file" once the line has its own current file (m2).

**Could not test:** a real screen reader, true 200 % browser zoom (a 400 px viewport stood in), and an intended user's unaided walk (D17 and D20 stay with the founder). A visible-browser walk was not possible in this session, so I used headless Chromium driven by what a person sees.
