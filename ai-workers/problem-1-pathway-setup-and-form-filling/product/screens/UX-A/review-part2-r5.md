# UX-A part 2, review r5 (diff-only, caaccd6d to 0b692276)

Reviewer: Sonnet (P-278). Scope: the Devin finding on To review's setup row when only the released version has problems.

- **Test run:** `tests/check_uxa2_row_words_rules.ts` 5 passed, 0 failed, exit 0 (no server, US$0, not :4400).
- **Words:** "2 problems in the released version: firms cannot open cases until they are fixed." Singular reads "it is". The phrase matches `problemsItem` in engine/setup-checklist.ts, and "released version" / "next version" match the glossary. Draft problems follow, then the next step, and an empty row falls back to "Open its setup to see what is left." No bare ".".
- **Label logic:** `fixes !== n + releasedProblems(setup)`. With release-only problems, fixes == rel and n == 0, so the link keeps its own text, not "Fix them". With both kinds, "Fix them" shows only when the link's count differs from the sum. For draft-only rows rel is 0, so the old behaviour holds. `releasedProblems` counts only `fix_problems` items with `fromRelease`, which the test covers.
- **Draft-only rows:** the draft wording is unchanged, and the browser checks (to_review, c212) still exit 0 per the builder. I did not re-run them.
- **Nit (not blocking):** when the next step is the release fix item, its own text ("Fix 2 problems: firms cannot open cases until they are fixed") repeats the first sentence of the row. It is accurate, only wordy.

No open Blocker or Major.

**Verdict: Approve** (for 0b692276)
