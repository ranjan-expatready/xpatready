# qa gate A walks of the rows QA-325 names: C11.6, C6.12 and C9.2 return to Works; C6.13 held by a new bug, QA-329 (Major). 9 Nov 2026, 15:27–15:46 IST

Asked for by the tech lead, Lead 40, in the journey order of P-348 (1): C11.6, C6.12, C9.2, C3.16, C6.13. One copy at a time. Live AI off, US$0. Each verdict is by a fresh reader on Opus that ran nothing (P-303, P-360 (3)). A pass moves the row back to Works; a fail stays Partial with its finding. Packs were not re-run: QA-325's gap was the walk.

| Row | Walk | Opus reader | Now |
|---|---|---|---|
| C11.6 | `2026-11-09-gate-a-walks/walk-c116-c612.md` | **PASS** | **Works** (was Partial for QA-325) |
| C6.12 | the same | **PASS** | **Works** (was Partial for QA-325) |
| C9.2 | `2026-11-09-gate-a-walks/walk-c92-c613.md` | **PASS** | **Works** (was Partial for QA-325) |
| C6.13 | the same | **FAIL** | Partial (stays), QA-329 |
| C3.16 | not yet: it counts on the six, and needs its own copy | | Partial |

**New:** QA-328 (UX, Minor): in the Change channel dialog only the small radio takes a click. **QA-329 (Bug, Major, C6.13):** after a person is added to a case, every filing change is refused "Changed since you looked". QA-330 (UX, Minor): two date formats and two names for one action on an out-of-date form.

**C6.13:** the plain path passes (Remove filing with a warning by name; Make principal; on to Ready to file). The reader failed gate A because a case with a child added through C6.12 is refused on every change, and QA-329 holds the row under P-305 (3). The reader asks that C6.12's next step and any other use of that check be confirmed: **C6.12's next step, on the same case, did show the new filing in Prepare application and Ready to file**. Other uses of the check were not looked at.

**Order:** C6.13 was walked before C3.16, because the checkpoint copy was already running; C3.16 counts on the six and needs its own.

## Not proven (the reader's list, and the walk's)
* C11.6's second "PDF copy, not for filing" deliverable was not walked here (it was seen on the Online line in `2026-11-09-rescore10/walk-screens.md`).
* The walk ends at C7.7's first step. P-348 (1) has C6.4 and C6.12 next after C11.6: C6.12 was walked on the same case, and C6.4's document list was read on the page and not changed.
* C6.12's visitor family maximum never bites at 5 people (5 × 100 = 500); only the biometrics maximum was seen applied.
* One pass at 1024 px, one case type, helper setup. C6.12's sponsorship and child-study parts are rows S1 and S2 (P-380 Q1). The packs were last run before main's latest merges, which did not name these rows.
* C9.2 by screens: a submitted item, and opening the scan to see it unchanged, were not walked; the pack holds these. Its employer breadth (P-417) is the pack's too.
* QA-329's cause is read in the code, not proven.

## Left for the next account (weekly plan at 93%, 15:44 IST; the tech lead, Lead 40, called the stop)
1. **C3.16's gate A walk: not started.** It counts on the six (P-322), so it needs its own copy: Reset to the six, then the pack's case part as setup (`acceptance/C3.16.test.ts <port> <db> case`), then by screens: the author's "Asked about" on a draft field; the case asks the fact once; then the next capability's first step (C1.3 or C11.5, P-348 (1)). Opus reader, then a records PR. It stays Partial (QA-325) until then.
2. **C6.5's score:** waits for #1405 on main. #1404 (the client's "please check", QA-322) merged at 15:35 IST as `be293128d`. Ask for nightly `capabilities=C6.5 data=checkpoint` on main's head, run the three packs on the Mac, retest QA-322 by a client walk, walk gate A if the pack is 32/32, Opus reader. With #1405 the pack replays to 32/32 (qa's Saved check, on `60235a001`).
3. **C7.6's run on the head:** its last pack run is on `e7ad3ae96`, before #1393. Tonight's nightly covers it; read that run.
4. **Rows merged and not scored:** #1390 (C6.19) and #1394 (C10.2), on main at `1a2823c53`.
5. **QA-329 retest** when its fix lands, then C6.13's walk (a case with an added person, and the plain path).
6. **Eight M3 Works rows not re-read,** because their reports do not name a Sonnet reader: C6.15, C6.18, C9.5, C6.4, C6.9, C8.2, C1.3, C11.5 (`2026-11-09-opus-reread.md`). The tech lead may want them read too.
7. **Records PRs, in stacking order:** #1410, #1417, #1419, #1420. #1419 and #1420 are stacked on #1417, so each shows the earlier diffs until that one merges.

