# Simulation run of bucket (a), 13 Oct 2026

1. **Simulation only.** The prototype shows that the agreed design behaves as specified. It does not show that the product works. The Status column in `AW-test-cases.csv` was not touched and stays "Not run".
2. **Prototype version:** `ai-workers/prototype/index.html` at commit 6e683d4, with no uncommitted changes. Run on 12 Oct 2026 by the machine clock; the file is named for the project date, 13 Oct.
3. **Scope:** the 25 bucket (a) tests in `run-next.md`, plus TC-AW1-320 and TC-AW1-324. That makes 27 tests. The prototype was served from its own folder to a clean browser session, and its demo controls were used.
4. **Counts:** 23 Pass in simulation, 4 Fail in simulation, 0 Not applicable in prototype, 0 Blocked.
5. Of the 23 passes, 14 are partial: some steps have no control in the prototype. The CSV names each uncovered step under "Observed".
6. **Fail: TC-AW1-271.** The trust entry shows the linked invoice and retainer, but not the delivered milestone. The steps for refusing trust:move and checking that no other output carries a trust figure have no control.
7. **Fail: TC-AW1-294.** The link runs one way only, from trust entry to invoice. The invoice is already issued before the trust item appears, so rejecting the trust entry cannot flag an invoice that is still waiting.
8. **Fail: TC-AW1-320.** With AI off, the text box is removed ("Menu only."), so a lead cannot type a free question and get the hand-off. The menu answers pass.
9. **Fail: TC-AW1-324.** The example lists are the same under both presets. Only one heading changes, and there is no separate "can earn Auto" list.
10. **Not the failures run-next.md predicted:** TC-AW1-308, -309 and -287 now pass, so the prototype already reflects AIW-D117 and AIW-D107. Smaller observations: the grid allows "At checkpoint" for AI-written messages, which contradicts "always asks at once". A wrong held-out value still lets the person approve the rest. After the v4 re-run, the pack v3 label stays on screen 3. Screen 2's panel says "Review each step" while its scenario says "Review at checkpoints". Details are in `simulation-run-2026-10-13.csv`.

## Run 2: after the prototype fixes

1. **Simulation only**, as for run 1. The Status column in the test catalogue was not touched.
2. **Prototype version:** commit a146be4 ("prototype fixes for the 4 simulation failures and 5 notes"). Run on 12 Oct 2026 by the machine clock. All 27 tests were re-run, each on a fresh page, through a local server and Playwright.
3. **Counts:** 27 Pass in simulation, 0 Fail, 0 Not applicable in prototype, 0 Blocked. Of the 27 passes, 15 are partial: some steps still have no control in the prototype, and the CSV names them.
4. **All four run 1 failures now pass.**
   - TC-AW1-271: the trust entry now shows the delivered milestone, and a bookkeeper's approval through the delegation is refused.
   - TC-AW1-294: the two items link both ways; a rejected trust entry marks the invoice "Linked item rejected" while it still waits.
   - TC-AW1-320: with AI off, a typed question gets the hand-off and a task.
   - TC-AW1-324: the lists now change with the preset, and there is a separate "Can earn Auto" list.
5. **All five run 1 notes are fixed.**
   - AI-written messages: the examples now match the grid. By default they are asked at once; they may wait for the checkpoint, but are never automatic.
   - A wrong held-out value now blocks "approve the rest" until the person ticks a re-check.
   - Screen 3 shows pack v4 after the re-run.
   - Screen 2 says "Review at checkpoints" in both places.
   - The letter footer names the chosen source.
6. **Two small wording points remain (not failures):**
   - After the invoice is rejected, the trust item's link line reads "Linked item rejected: rejected".
   - The "Refused" notice from the bookkeeper's attempt stays on screen after the invoice is issued.
7. Details are in `simulation-run-2026-10-13.csv`, in the rows marked "Run 2". The rows marked "Run 1" are kept unchanged.
