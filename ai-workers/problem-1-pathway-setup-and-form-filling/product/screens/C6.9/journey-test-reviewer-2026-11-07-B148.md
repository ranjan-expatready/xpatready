# Journey test: reviewer, 7 Nov 2026, B148 (C6.9 in P-236's words), PR #1250 at 9451799ca

Isolated copy `rev_b148` on :4445, fresh database, Visitor visa release with its two Sample gates. Headless Chrome via Playwright, driven like a person: click, read and type through the UI. The only API calls were to create the case and for the raw role and 404 probes. Script: the scratchpad `walk.cjs` (not committed). Live AI off, US$0. Scope: the words B148 changes (P-26), not new features.

## Journeys (persona · goal · steps · expected → result)
1. **Main path. Case officer: "can this traveller go ahead?"** Open the case page, read the card, click Open case check, click Run case check. Expected: P-236's name and the Can't tell yet outcome. Result: card "Case check from confirmed facts (staff only)" with "Open case check". The h1 and trail read "Case check from confirmed facts · REV148-…". After the run: "Can't tell yet — needs 4 facts" and the people pill "Can't tell yet". **Held.**
2. **Data underneath.** Expected: one run, with a history line in words. Result: 1 `assessment` row and `audit_event` "Case officer ran the case check on case 453e142b for person 1e8322b9 (first run): Can't tell yet". **Held.**
3. **Alternate. Every answer confirmed, then one not confirmed (B124).** Covered by `check_b124_unconfirmed_browser.cjs` 19/19 on a fresh copy, which I read in the page: "Qualifies, on 1 answer not yet confirmed" plus the line "“Qualifies” rests on an answer not yet confirmed: Criminal history" (`screens/B124/walk/3-some-confirmed-1024.png`). The funds gate gives "Does not qualify on this application's rules as written, on N answers not yet confirmed". **Held.**
4. **Override and review. Case officer.** Override result…: the field "Result being overridden" reads "Can't tell yet — needs 4 facts". Keep, then Mark reviewed. Audit: `overrode the case check result "Can't tell yet" on case 453e142b with "Refer to the representative" (the result itself is unchanged)` and `Seen by Case officer (Sample): the case check on case 453e142b`. History drawer: "Can't tell yet · Overridden". **Held.**
5. **Wrong role. Client opens the URL.** Page: "This page is for the firm's staff. Case checks are seen by the firm's staff only." No verdict word. API as the client: 403 "Only the case officer can do this.". **Held.**
6. **Error words.** Unknown check id: 404 "No such case check.". Run again without a reason: refused on the field (`check_c69_page_browser` step). **Held.**
7. **Configuration author: the A4 dialog (across the screen boundary).** SQR tab › "Eligibility rules (staff check)" › Edit. The released gates read "If not met: Does not qualify" and "The representative reviews it (Can't tell yet)". The dialog's radios offer the same two. The change summary reads "was: does not qualify" (`check_b148_words`, `check_c69_runs`). **Held.**
8. **Screen sizes.** 400, 1024 and 1440 px: no sideways scroll, axe WCAG 2.2 A/AA clean on the result state. 200 % zoom is clean in `check_c69_page_browser`. **Held.**
9. **Recovery (reload, double click).** The code paths are unchanged by B148. `check_c69_page_browser` keeps focus-return and the busy guard green. I did not re-break them by hand.

## Break-it (short, words-focused)
* Unknown outcome code: `outcomeWord("SOMETHING")` and `outcomeWord("constructor")` are shown as they are, never guessed (test). No issue.
* Old words by grep: none in web/src apart from the named AI-launch count and the A4 rules' own name. Fail-first holds on main (5/13).
* The fourth outcome: the answer-key editor still offers "Below the cut-off (not used: P-236)", and the page's fallback shows the raw code. Both were already on main. **Minor** (review m3).
* Toast "Case checked" can read as "the whole case was checked". **Minor** (review m4).
* Three browser checks now also match the people pill (review m1). **Minor**.
* No Blocker, no Major.

## Score (QUALITY.md "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–7 complete in the UI |
| Next step obvious | 1 | "Open case check" leads to "Run case check" and then "Run again" |
| Plain words | ½ | P-236's words everywhere. The toast "Case checked" is ambiguous, and "Below the cut-off (not used: P-236)" in G4 is product-internal |
| Feedback and state | 1 | Toast, focus on the result heading, people pill and "Out of date" all in the new words |
| Correct data | 1 | One run row, codes unchanged, history lines in words (journeys 2 and 4) |
| Error recovery | 1 | Field refusal for Run again and the override reason, 404 and 403 in words |
| Accessibility and screen sizes | 1 | axe clean, keyboard path, 400/1024/1440 and 200 % |
| Speed | 1 | Page opens in about 0.5 s with the sample data |
| Visual quality | 1 | The longer title wraps cleanly at 1024 (`screens/C6.9/screenshots/02-cant-tell-yet-1024.png`) |
| Trust and sources | ½ | SI-1 chip, disclaimer and "staff only" kept. The fallback still shows a raw code for the dropped fourth outcome (m3) |
| **Total** | **9/10** | **Pass** (8 or more, no 0) |

To raise it: reword the toasts (m4). Route the fourth outcome through a follow-up row that removes it from G4 and uses `outcomeWord` in the page's fallback (m3).

## Not tested
A real screen reader. An intended user's unaided walk (D17/D20 stay with the founder). The checkpoint (gate B) run. The client's own questionnaire, which B148 does not touch.
