# Journey test — QA-296 (reviewer, 7 Nov 2026)

Commit `cb03014201720d0467af165e6696cfafd5d771a3`, isolated copy :4431 (`xr_studio_rt127`, configured checkpoint). Never :4400. Live AI off, US$0. Browser: Playwright Chromium (headless), as the case officer (`user-O`, Sample firm). Screenshots were kept outside the repository (scratchpad `walk/shots/`: `rep-tab-1440.png`, `rep-tab-1024.png`, `rep-tab-400.png`, `prepare-1440.png`); the builder's own are in `shots/`.

## Journeys (persona · goal · expected)
1. **Main.** Case officer · "Open a visitor case with our RCIC and see what the firm record fills" · Cases › Open a case (Visitor visa, representative of record user-R, Client A) › Agent view › The representative › Personal details · the names show "From the firm record" and fill IMM 5476 only, never IMM 5475.
2. **Across the boundary.** Case officer · "Make IMM 5475 and IMM 5476 and check what is on them" · generate both copies and read the PDFs back · IMM 5475 Section 5 holds no representative name; IMM 5476 holds the names and the licence number.
3. **Alternate.** Case officer · "My client's own name goes on IMM 5475" · Client A's tab › Family name · still lists IMM 5475 among the forms it fills.
4. **Rule unchanged (#1072).** Case officer · "The designated individual's address is not my office address" · representative tab › City or town · "Not answered · not filled from the firm record", no Add.
5. **Readiness.** Case officer · "Is IMM 5475 ready?" · Forms / Prepare · not ready, never Ready because of the firm record; the names are not listed as missing.
6. **Wrong role / error.** Not applicable to this read-path change (no new route, no new input); the existing refusals are covered by QA-293's checks.

## What happened
* J1: case opened in 787 ms; the representative tab in 240 ms. Family name: "Representative · From the firm record · firm record · Representative · 7 Nov, 08:24 · fills IMM 5476 for Client A · Change it in the firm record"; Given names the same with "Sample"; membership ID R000000 "fills IMM 5476". Held.
* J2: `check_qa296_imm5475.ts` (13/13) reads the filled PDFs with the E5 reader: IMM 5475 holds neither "Representative" nor "Sample"; IMM 5476 holds both and R000000. A probe copy of IMM 5475: `Five[0].AppFamily` and `AppGiven` "not written". Held.
* J3: Client A's Family name lists IMM 5257, IMM 5257 SCH1, IMM 5475, IMM 5476 (API probe). Held.
* J4: "Not answered · not filled from the firm record" / "Only the firm record fills this; it is not added on a case". Held (unchanged).
* J5: IMM 5475 readiness missing list: Client A's facts, three application facts and 9 representative address/phone/e-mail lines; no name lines. Not Ready. Held, with the gap in m1 of the review (Section 5's names are blank and said nowhere).
* Data underneath: no rows written by viewing; the firm-record answers are computed, not stored (`team.ts` `representativeAnswers`); `case.uses_representative` still the firm record's Yes (`check_c611_checkpoint.ts` 14/14).
* Break-it (short): two releases on the copy, both maps read; only IMM 5476 maps `representative.*` about the representative, so the rule picks the right form on each. No pre-fix IMM 5475 copy exists to go stale. Keyboard: arrow keys did not move focus between the Agent view's person tabs in my run (older behaviour, not this diff; Tab key reaches them).

## Automated replay
axe (WCAG 2.2 A/AA) on the representative tab: 0 violations. Sideways scroll at 1024 and 400 px: none. Page errors: none. Run twice (QA-296 check and the walk): same results.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J2: names on IMM 5476 only, PDF read back |
| Next step obvious | ½ | IMM 5475 Section 5's names: nothing says who supplies them (m1, #1072 residual) |
| Plain words | 1 | "fills IMM 5476 for Client A"; no IDs on the line |
| Feedback and state | 1 | "From the firm record" pill, source line with date |
| Correct data | 1 | filled PDFs, both forms |
| Error recovery | ½ | no error path in this change; not exercised beyond reload-free re-reads |
| Accessibility and sizes | 1 | axe 0; no sideways scroll at 1024/400 |
| Speed | 1 | open 787 ms, tab 240 ms |
| Visual quality | 1 | `rep-tab-1440.png`: aligned, team components |
| Trust and sources | 1 | origin shown on every firm-record line |
| **Total** | **8.5 / 10** | **Pass** (8+, no 0) |

To raise it: say on IMM 5475 (or its readiness) that Section 5's designated individual waits for the reviewed map change (m1).

## Not tested
A real screen reader; 200 % zoom; an intended user's unaided walk (D17, D20 stay with the founder); main's code running.
