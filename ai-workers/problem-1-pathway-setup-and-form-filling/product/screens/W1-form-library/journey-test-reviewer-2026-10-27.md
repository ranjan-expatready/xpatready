# S4 Form library (W1-06 + W1-07 run card): journey test, reviewer role, round 6, 27 Oct 2026

**Setup.** Commit 37f27d0. Isolated copy `rev6_s4` on :4457 (forms lane range) with the stand-in launcher.
* A stub probe on IMM 5257 put 5 stub lines in `fake-launch.log` before any live step; the one live finder run (Super visa) went to the stand-in, stub first, then "live" (a 120 s sleep).
* **Spend: US$0.** Recorded canada.ca copies only. `p2/*` and `p1/inventory` checksums unchanged (529 files).
* Walked in a visible Chromium through Playwright by clicks, typing and the keyboard. Screenshots `review-shots/v7-*`. Round 5 (06556ab, 7.5/10) is in git history.

## Journeys (persona · goal · result)
1. **Main: content publisher (user-A), "find a form, see what it is, where it is used, what IRCC accepts".** **Held.**
   * Menu Forms → list of 14 in 164 ms. Guides chip → 2 rows (104 ms). "5257" → IMM 5257 and SCH1 (60 ms). "zzzz" → "No form matches" → Clear filters → 14. Needs your OK → IMM 5802. Used by Visitor visa → 5 rows.
   * IMM 5257 drawer: edition, "canada.ca last updated 2023-09", page "checked Oct 27", PDF upload · AI · Sample with IRCC's words, Where it is used with each use's reason, History. Esc → focus back on IMM 5257 (v7-j1-*).
2. **Upload one official PDF (IMM 5646).** **Held, provenance wrong.** Four rules steps, "No AI call was made", "The very file canada.ca's form page links: no second person is needed", "Added to the library", 1.8 s. The drawer then says "Official copy loaded with the sample" and "No canada.ca page recorded yet" (v7-j2-*).
3. **Upload eleven at once: empty, not a PDF, damaged, a duplicate, an unreadable one-page PDF, six official PDFs (one with a Devanagari/Chinese name).** **Held; one carried contradiction.**
   * 10 cards plus "Not uploaded: empty.pdf is empty (0 bytes)". Not a PDF and damaged fail at step 1 in words; the duplicate says "Nothing duplicated"; six added (v7-j3-upload-many-1440). The round 5 card cap is gone.
   * The unread file's card: "Held: … cannot be approved. Upload the official PDF from canada.ca instead" with "Open it on To review". But To review offers user-A "Record the IRCC page", and user-A's held page says a second person compares and approves it. Only user-B's page says "This copy cannot be approved" (v7-j3-review-queue-A, v7-j3-held-scan-A).
4. **Run card, chip and Stop (W1-07).** **Held, with the carried cost line.**
   * Live finder launched by API (its button comes with S5); plan stated first: "at most US$5.58".
   * Chip "Finding forms · step 1 of 6" on the library page; focus + Enter → `/ai/:id` card "Step 1 of 6 · Running · first run of this kind … at most US$5.58 · US$0.00 so far".
   * Stop → "Stopping" in 155 ms, Stopped in 1.7 s, later steps "Not needed", no launcher left, chip gone (v7-j4-*).
   * Still "US$0.00 spent" beside "stays counted at its reserved worst case"; the stopped step reads "Waiting for you" with "used.. Choose"; the guide's checker stub pass started 254 ms after Stop (no paid call).
5. **Finder replay on Visitor visa.** **Held.** "Done with problems", US$0 "saved AI answers, no new call"; 7 attached incl. IMM 5257, IRM 0002 downloaded, IMM 5484 to decide, IMM 5782 not for this application, nothing dropped. The IMM 5257 drawer now says "Its current draft lists this form: remove it there first" for Visitor visa (v7-j5-*).
6. **Retire an unused form (IMM 5646), approve, release, restore.** **Held.** "Nothing uses it"; Ask to retire disabled until a reason; focus back on ⋯; row "Retire waiting". user-B: To review → change page → Approve → "Retire approved" → Review and release → "Release 2 published" → Retired (count 2). Restore asked, the proposer's own approve refused (403), user-B approved, released → back in use.
7. **Retire a form a combination reads only as a source (IMM 5881), the round 5 Major.** **Held.** The dialog lists Visitor visa: "it can be retired (the combination keeps its file; AI no longer drafts from it), never deleted"; Delete is disabled in the menu. Approved and released with IMM 5646; the picker leaves it out; Visitor visa still shows its file (v7-j7-*). Gap: user-B's change page shows only the reason and "Key: IMM 5881 (generated from the group and the name)", not where it is used (v7-j7-change-5881-details-B).
8. **Recovery and guards around a retiring form.** **Partly held.** Retired IMM 5646: hand attach 409, library upload for Super visa "Not attached … retired", 0 lines and 0 sources added. With IMM 5257's retire open, the per-source draft is refused (409), but the AI plan for Visitor visa still lists IMM 5257 as "draft" (`ai.ts:84` checks `retiredAt` only). Checklist stub drafting of retired IMM 5881 is accepted (201; live is refused today).
9. **Wrong role (user-B approver, user-C SME, unknown).** **Held.** UI: no Upload PDF; ⋯ items other than "See where it is used" disabled; no "Set/Correct what IRCC accepts"; "Read-only" note (v7-j9-B-menu). API: B and C 403, unknown 401 on retire, delete, accepts, attach, restore; upload as B 403; finder launch as B 403.
10. **Break it.** **Held, Minors only.** Two retires at once → 201 + 409 ("the database refused a duplicate", one change). 301-character reason → 400 in words. Delete of an approved official upload → "retire it instead". No 500 and no console or page errors in any walk.

**Across the boundary:** Where used → `/c/:id`; chip → `/ai/:id`; held card → `/review/held/:id`; To review → change page → Review and release → library.

## Automated replay and data
* **axe WCAG 2.2 AA:** 0 violations on 10 states: list at 1440, 1024, 720@2× and 400 px; IMM 5257 drawer; upload one; upload many; card running; card stopped.
* **Sizes:** no sideways page scroll at 1440, 1024, 720@2× (200 %) and 400 px; ⋯ at x 1388 / 972 / 676 / 371; drawer 560 px (400 px on the narrow screen).
* **Keyboard:** 29 Tabs (18 at 200 % and 400 px) to the first form number, none hidden or partly hidden under the 56 px top bar (round 5's 2.4.11 failure is fixed); Enter opens the drawer, Esc returns focus; two Tabs to ⋯, Enter opens the menu, arrows move.
* **Timings:** list 164–369 ms first view; filters ≈100 ms; search 60 ms; Stop answers in 155 ms.
* **Data:** one change per retire under a race; IMM 5646 and 5881 `retired_at` set by Release 2, IMM 5646 cleared by Release 3; changes RELEASED; audit lines for propose, approve; no new lines or sources for a retired form.
* **Not done:** each journey walked once per size, not twice; the builder's suites were not run (instructed).

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Find, upload one and many, retire (unused and source-read), restore, replay and Stop all complete (journeys 1–7) |
| Next step obvious | ½ | The unread held file is told "cannot be approved" on its card but "Record the IRCC page" on To review; IMM 5802 "Needs your OK" points at nothing |
| Plain words | 1 | Plain; Minors only ("database refused a duplicate", "used..", the change page's "generated from the group and the name") |
| Feedback and state | ½ | A card per file now; stopped "US$0.00 spent" beside "counted at its reserved worst case"; "Needs your OK" with no item; stopped step "Waiting for you" |
| Correct data | 1 | No new use of a retired form by any route tried; release in one transaction; one change under a race; restore exact |
| Error recovery | 1 | Bad files named and the others run; Stop ends the call; refusals in words; restore brings a form back |
| Accessibility and screen sizes | 1 | axe clean on 10 states; four sizes with no page scroll; focus never under the top bar; keyboard main path |
| Speed | 1 | List under 0.4 s, filters and search about 0.1 s, Stop at once |
| Visual quality | 1 | Calm, dense, aligned (v7-j1-list-1440, v7-j7-retire-dialog-1440, v7-j3-upload-many-1440) |
| Trust and sources | ½ | AI marked, IRCC's words and Picked by AI shown; every hand upload called "loaded with the sample" with no canada.ca page though one was matched |

**8.5 / 10: passes the journey bar (8+, no 0).** D18 (provenance) stays at 3 in `review.md`, so the "no dimension below 4" bar waits on Should 1.

Fixes, most valuable first:
1. Record `origin: UPLOADED` and the matched canada.ca page on uploads (trust; lifts D18).
2. One message for the unread held file on To review and the uploader's held page (next step).
3. Show the stopped run's reserved charge, and drop "Needs your OK" for a form with no waiting file (feedback).
4. Guard `plan()` against an open retire, and show where a form is used on the approver's change page (rule integrity, P-116).

**Not tested:** a real screen reader, Firefox or Safari, a paid live run, canada.ca live, browser zoom itself. D17 and D20 need the founder's or an intended user's unaided walk.
