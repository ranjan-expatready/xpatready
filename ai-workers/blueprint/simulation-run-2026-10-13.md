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
