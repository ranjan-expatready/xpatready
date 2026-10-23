---
name: journey-test
description: Human-like end-to-end testing of a built Pathway Configurator screen, module or milestone - real user journeys walked in a visible browser like a person, replayed as automated Playwright checks with accessibility and screen sizes, data verified underneath, plus a short break-it pass - scored out of 10 (pass 8+, no criterion at 0). Use at FINISH (maker), CHECK (reviewer) and LEAD-CHECK, or when asked to test like a user, test end to end, or score a deliverable.
---

# Journey test — test it the way people will use it

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). Scoring rule: P/`QUALITY.md` "Journey score". Bars: P/`EXPERIENCE.md`, P/`STANDARDS.md`.

## 1. Write the journeys (before touching the app)
From the item's `concept.md`, decisions and `PRODUCT.md` §1, write each journey as: persona (author, reviewer/RCIC, case officer, client) · goal in their words · steps · expected result. Cover: main path, an alternate, empty, error (bad input, failed AI, held file), wrong role, recovery (reload, back, double click), and the step across the screen boundary (where this hands to the next screen). At most 10; the main path first.

## 2. Walk them like a person (visible browser)
Start an isolated copy on your lane's port (`LANES.md` in the product home). Use the built-in browser pane (or Playwright headed). Use only what a person sees: click, type, read. No API shortcuts, no reading code first. For each step note what you expected, what happened, wrong turns, unclear words, waits over 1 s. Screenshot each decision point.

## 3. Replay as automated checks
Turn the main and error journeys into a Playwright script (`prototype/studio/tests/`, or the lane's evidence folder): axe WCAG 2.2 A/AA on each state; widths 400, 1024, 1440 px with no sideways scroll; keyboard-only main path; console and page errors; timings against `STANDARDS.md` §9 budgets. Run it twice to catch flakiness.

## 4. Check the data underneath
After each journey, read the API or database: the record exists once, values are exactly what was entered, nothing else changed, the audit line is there, roles were enforced on the server.

## 5. Break it (15 minutes)
Duplicates, very long and non-English text, wrong role by URL, two tabs saving the same record, a hostile file, reload mid-action. Severity: Blocker / Major / Minor.

## 6. Score out of 10 (each 0, ½ or 1, every score with evidence)
task completed · next step obvious · plain words · feedback and state · correct data · error recovery · accessibility and screen sizes · speed · visual quality · trust and sources (AI marked, origin shown).
**Pass = 8 or more and no 0.** Below 8 → list the fixes that would raise each low criterion, most valuable first.

## Report
Write `screens/NN/journey-test-<role>-<date>.md` (under 100 lines): journeys, what held, findings with screenshot or file:line, the score table, verdict. State what you could not test (a real screen reader, an intended user's unaided walk: D17/D20 stay with the founder). Do not fix anything and do not add scope (P-26).
