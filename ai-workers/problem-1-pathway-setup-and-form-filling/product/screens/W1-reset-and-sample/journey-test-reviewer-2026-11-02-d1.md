# Journey test: D1 "Reset to the six" (reviewer, 2 Nov, PR #407 head 123a1c5a)

Copy: isolated `rev407` on :4437, run from a private export of 123a1c5a. Playwright Chrome, headless, driven only by clicking, typing and reading the page. The database was read after each journey. Live AI was off; cost US$0. Screenshots were kept outside the repository (reviewer scratch) and are described below.

## Journeys
| # | Persona · goal | Steps | Result |
|---|---|---|---|
| J1 | Configuration author (demo presenter): "get back to the six, fast" from a configured workspace, 1024 px | Demo › Reset to the six… → read → type RESET → button → Continue | **Held.** Done in 20.4 s. "Emptied: 1394 rows and 34 working files removed … byte-identical … loaded in 19.8 s". Combinations 6, official files 42, proposals 139, forms waiting 8; the not-found and held files are listed. Continue → catalogue Retail 5 · Corporate 1 with "Needs you" on the cards. No console errors. |
| J2 | Same person at 200 % zoom (512 css px at 2x) | Open the dialog, scroll to the button | **Held.** No sideways scroll; button reachable; axe on the whole page: 0 violations. |
| J3 | Approver (wrong role) | Same path as Approver | **Held on the server:** toast "Approver (simulated) does not hold the author duty"; nothing changed. The item is still offered to the Approver, as the blank Reset is (minor, demo chrome). |
| J4 | Author when the load part fails (failure injected in the copy's database at the 3rd combination) | Same path | **Partly held.** The toast says it plainly and tells the person to choose Reset to the six again. The dialog stays open with RESET typed. **But** the database has 2 combinations while the page behind still shows Retail 5 · Corporate 1, "Draft · 7 changes", "To review 6", and still does after Escape (stale). The toast disappears after 9 s. Retry: 6 combinations. |
| J5 | Author reloads mid-run, then tries again | Click, reload at 1.5 s, open the dialog again and confirm | **Held:** 409 "Reset to the six or a sample load is already running: wait for it to finish." Final state: 6 combinations, 1 workspace. After the reload, nothing says a reset is running. |
| J6 | Keyboard only (builder's browser suite, re-run) | Demo → arrows → Enter → type → Tab, Tab → Enter | **Held:** 20/20, including Escape changes nothing, lower-case "reset" refused, double click sends one request, 1440/1024/400 fit, axe clean on both dialogs. |
| J7 | Next screen (catalogue) | After Continue | **Held:** lands on Immigration programs, filtered to the six, with the next action "Resume setup". |

## Data underneath
After J1: one workspace; old workspace gone; 0 orphan rows (builder suite: no table keeps a `workspace_id` that no longer exists); 0 fields, sections, document types, rules, checks, releases or cases; 6 combinations, 3 Pathways, 42 attachments; 6 REPLAY field-map jobs; 0 LIVE AI batches; ledger unchanged; `preserved_unchanged: true`. The reset log has one line per real reset.

## Break-it pass
* Double click: one reset (suite).
* Two parallel requests: 201 + 409.
* Load sample during or after the reset: 409.
* Reload mid-run: 409 on a second try, final state correct.
* Wrong role by direct request: 403/401.
* Partial failure: clear server message, the retry starts clean.
* Stale screen after a failure (Major).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: six in 20 s, one confirmation |
| Next step obvious | 1 | Continue → catalogue with "Needs you" and Resume setup |
| Plain words | ½ | Goes / Comes back / Kept is clear and honest. "(P-148)" in the copy; a file failure would show "ENOENT" and a file path |
| Feedback and state | ½ | Busy button only for 20 s; error only in a 9 s toast; stale catalogue after failure (J4) |
| Correct data | 1 | Exact six, nothing left over, saved results byte-identical |
| Error recovery | ½ | Retry works and 409s are in words, but the screen misstates the state after a failure |
| Accessibility and screen sizes | 1 | axe clean, keyboard path, 400/1024/1440, 200 % zoom |
| Speed | 1 | 20 s, matching "about half a minute" |
| Visual quality | 1 | Three tidy columns, team look. The label touching the field is minor |
| Trust and sources | 1 | Sample pill, US$0, REPLAY only, byte-identical claim shown and checked |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no 0) |

To raise it, most valuable first: (1) refresh the page and keep the error inside the dialog after a failure; (2) say up front that 8 forms will wait for Draft with AI and 4 need an upload; (3) drop "P-148" and raw error codes from the copy; (4) show progress during the run, or that a run is in progress after a reload.

Not tested: a real screen reader; an intended user's unaided walk (D17/D20 stay with the founder); a visible headed browser (headless Playwright only).
