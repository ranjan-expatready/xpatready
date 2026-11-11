# BK-10 journey test: reviewer, 11 Nov 2026

Commit 69b160c8519eb6757019a09adf0772b7139b86aa. Two copies on forms-lane ports, never :4400:
* **:4458**, the reviewed code (`isolated.sh bk10rev`);
* **:4459**, the same code with one data edit (IMM 5646's rule and its fact removed from `sp.outside` in `samples/form-setup.json`).

Each copy loaded the configured checkpoint (Demo reset, then load "configured"; 110–117 s; live AI off, US$0). The browser was headless Chromium driven by Playwright with clicks only: Immigration programs › card › Open › "Forms N to do". It ran twice on :4458 and gave the same result both times. The script and screenshots are reviewer-local (scratchpad), not committed.

## Journeys
| # | Persona and goal | Steps | Expected | Result |
|---|---|---|---|---|
| J1 main | Configuration author: "Does Study permit ask for exactly the forms IRCC's words set?" | Programs › Outside Canada › Open › Forms | IMM 1294 Always; IMM 5409, 5475, 5476, 5646 "Conditional (a rule)"; IMM 5707 Always, 18+ | As expected. In the database, each condition equals the data (`combination_form.predicate_json`) |
| J2 alternate | Same, Visitor visa (filed online) | Programs › Visitor visa › Open › Forms | IMM 5257; SCH1 "Principal, spouse or partner, and…"; 5409, 5475, 5476, IRM 0002 conditional; IMM 5645 (the online family form) 18+ | As expected |
| J3 alternate | Same, With an LMIA – inside Canada | … › Forms | 5409, 5475, 5476 conditional; IMM 5707 (paper) 18+; IMM 5710 | As expected |
| J4 the claim | Content author: "Change Study permit's rules by editing data only" | Edit `form-setup.json` on :4459, reset, load, Forms | IMM 5646 no longer conditional; nothing else moves | IMM 5646 became "Always" (`COMBINATION_MANDATORY`). The other 5 lines were byte-equal to :4458 in the database |
| J5 error | Content author makes a mistake in the data | 6 bad entries (no cite, orphan fact, unknown fact, two document sources, no online family form, no application form) | Refused, in words, naming the combination | All 6 refused. Each fail case is proven by mutation (`review.md`) |
| J6 break | Typos and odd values | `conditon`, `familyByChanel`, `minAge:"18"`, unknown `who`, `op:"equals"`, duplicate form, 11 500-character French cite | Refused, or harmless | **All accepted silently.** A `conditon` typo makes IMM 5646 required for everyone (review m1). The long text is fine |
| J7 recovery | Author reloads the Forms tab | Reload | Same lines | Same lines |
| J8 boundary | The hand to the release and the case | Release checks sp, vv, lmia, ee, fs on :4458 | Green | 27/27, 35/35, 23/23, 26/26, 28/28 |

Wrong role: N/A. No endpoint or screen is touched, and the data file is not reachable from the app.

## Automated replay, :4458 (two runs, identical)
* **axe** WCAG 2.0, 2.1 and 2.2 A/AA on the Study permit Forms tab at 1440 px: no violations.
* **Widths:** 1024 and 400 px, page sideways overflow 0 px.
* **Keyboard:** 40 Tabs from the LMIA Forms tab reach tabs, buttons, selects and row actions, each with visible focus.
* **Errors:** 0 page or console errors across 3 combinations.
* **Timing:** the Forms tab painted within the script's fixed 3 s waits. The checkpoint load took 110–117 s, the same as the builder's 110 s.

## What held
The moved data is deep-equal to what the code held. The released lines follow the data, and a data edit alone changes a released line. B164 shrank by 21 entries and catches a key put back into code.

## Findings
* **Minor (m1):** the reader accepts unknown or misspelt keys and wrongly typed values silently (J6). Fix: a closed key set per combination and per rule, with a fail test.
* **Minor:** a refusal is one generic sentence, so the author is not told which clause failed (J5).
* **Seen, not caused here:**
  * The released line keeps no rule cite, and "Conditional (a rule)" has no tooltip giving the condition.
  * QA-216: the finder replay "AI did not finish" on Study permit and LMIA.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1–J4: every combination's lines are exactly the data, and a data edit reaches the release |
| Next step obvious | ½ | A refusal names the file and combination but not the broken clause |
| Plain words | 1 | Refusals are in words. The Forms tab is unchanged |
| Feedback and state | ½ | J6: a typo gives no feedback and changes a line silently |
| Correct data | 1 | Deep-equal before and after. The database lines equal the data. Five release checks are green |
| Error recovery | ½ | A bad file stops the whole API at boot (fix and restart). This was already so for the JSON part |
| Accessibility and screen sizes | 1 | axe clean, 0 px overflow at 1024 and 400 px, focus visible |
| Speed | 1 | One read at import. Load time unchanged |
| Visual quality | 1 | Forms tab unchanged (builder's 1440 px screenshots, and mine) |
| Trust and sources | ½ | Every rule is cited and stays Sample in the data. The cite is not shown on the line (pre-existing) |

**Score: 8/10, pass (8 or more, no 0).** The fixes that would raise it, most valuable first:
1. Refuse unknown keys (feedback, next step).
2. Name the failed clause in the refusal (next step).
3. Show the rule's words on the line (trust; a separate row).

## Could not test
* A real screen reader.
* 200% zoom as such (400 px stood in).
* An intended user's unaided walk (D17 and D20 stay with the founder).
* The ~58 Works packs (CI, when the PR is marked ready).
