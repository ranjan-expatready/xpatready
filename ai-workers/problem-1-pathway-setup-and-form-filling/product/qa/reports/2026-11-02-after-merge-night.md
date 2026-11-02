# qa after-merge, night round — main 2562de17 (2 Nov)

Scored together on main 2562de17: #563 QA-163, #570 (already scored on 5e3c046d), #585, #574, #602 G-CORE B2, #587 G1 PR 2a, #554 UX-A part 1, #592 QA-165 part 2, #603 IMM 5532. The work was split across three Sonnet helpers (P-278), each on its own worktree of 2562de17 and its own ports, with one check per fresh copy. US$0, no live variable, no paid run.

## Verdict
**M2 49 → 50/60: C2.6 Works.** No Blocker, Critical or Major found. **Closed: QA-163 (Critical), QA-157 (Major), QA-170.** M2 has no row Not built any more (C5.4 moved to Partial).

## Rows
| Row | PRs | Now | Evidence (short; full lines in CAPABILITIES) |
|---|---|---|---|
| C2.6 | #574 | **Works** (was Partial) | `acceptance/C2.6.test.ts` 32/32 (was 21/32); QA-157 closed |
| C2.12 | #563 | Works | `check_qa163` 12/12: Reset to the six → IMM 5257 Saved replay at US$0 → apply 242 map rows |
| C11.10 | #554 | Works | UX-A part 1: `check_uxa1_counts_rules` 20/20, `_browser` 47/47; counts agree across screens. Part 2 items open (QA-174) |
| C11.13 | #602 | **Partial** | P-266 met (QA-170 closed). One part left, not held: P-120's near-duplicate reason "shown at release" is not on the Release page (pack 14/15). Question below |
| C11.14 | #602 | Partial | 9/13; AT-1 to AT-4 wait for G-CORE B3 |
| C5.4 | #587 | **Partial** (was Not built) | gate built at API level (53/53, 50/50, 19/19; dates count; "None published" passes); screens (PR 2b) to come |
| C3.4 | #585 | Partial | 7/16; every red waits for the paid masters runs and their Saved check |
| C11.7 | #563, #603 | Partial | 18/21, part B (Provincial nominee) red; IMM 5532 saved replays 22/22 |
| C4.11 | #563 | Partial | six 4/23 (needs IMM 5257's map applied first; then 15/23); configured 14/23; step 5 no conditions (QA-162) |
| C7.2 | #592 | Partial | 40/46 mandatory written, the 6 empty now listed before download; barcode report and Adobe evidence missing |
| C11.8 | #570 | Partial | scored on 5e3c046d (live gate on the founder's Go) |

## Bugs
* **Closed:** QA-163 (`check_qa163` 12/12 plus the API walk), QA-157 (C2.6 pack 32/32), QA-170 (rename check 4/4).
* **Narrowed:** QA-165 (6 empty mandatory fields now listed, not written). QA-162 stays Major (C4.11 step 5).
* **New, all Minor:**
  * **QA-173:** `check_forms_c34_masters.ts` reads the wrong "marital" list. It's a test bug, and the product is right.
  * **QA-174:** "333 Form facts" against "120 form facts" under one label.
  * **QA-175:** a second Saved replay on a waiting draft doubles its proposals. A helper saw it and qa has not reproduced it; confirm the severity on retest.

## Could not test
Live AI and the Mac's Adobe run. Browser walks beyond the scripted checks.

## Questions for the tech lead
1. **C11.13:** is P-120's "near-duplicate reason shown at release" met anywhere (the Release page lists approved changes only, open since #405)? If yes, C11.13 becomes "Works, held part excluded" and M2 reaches 51.
2. #602 also makes a *released section* rename wait for a second person, which goes beyond P-266's wording (fields). Keep it?
3. C4.11 after Reset to the six needs a person to review and apply IMM 5257's draft first. Is that the intended order (#563 says golden step 2's "Use Saved" is now redundant)?

## Environment notes for the next qa session
The container restarted once tonight, which stopped Postgres. Start only the database: `runuser -u postgres -- /usr/lib/postgresql/18/bin/pg_ctl -D <repo>/.tools/solution-1-prototype/pg18-data -o "-p 54329 -k /tmp -h 127.0.0.1" -l <same>/server.log -w start`. The shell is zsh: run scripts that split variables under `bash -c`.
