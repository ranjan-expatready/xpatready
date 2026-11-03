# Review: PR #643 (UX-A part 4), replay head 65ae1e81 (r5, diff-only)

1. Replay equals approved: `range-diff` shows the five product commits' patches identical in content except three lines of wording in `conditions.tsx`, where main's newer text applies: the Facts-a-rule-needs pointer now reads "Smart questionnaire (SQR) › Facts a rule needs" (main's rename), and context-only changes in `sources.tsx` (main's `liveOff` / Live-off notice kept alongside part 4's lines). Commit 3 and 5 identical; the 6th is records only. The old UX-A part 3 commit is dropped (already on main).
2. Clashes: none found. Condition editor callers (Forms tab, rules editor) unchanged by main's K13/C11.15 in a way that breaks part 4; no stale "Questionnaires ›" string left in web or the part 4 test (one comment in `studio.ts` only). Web and api build clean for product code (tsc errors are only in an older test file, `check_x2b_bulk_apply.ts`, not touched here).
3. Re-run: `check_uxa4_details_browser` on :4447 / xr_studio_rev_643: 46 passed, 0 failed (psql path patched in a scratch copy, removed). Copy stopped. US$0, no priced click.
4. Builder's other runs (exit 0) not repeated.

Findings: none Blocker or Major. Minor: the `studio.ts:49` comment still says "Questionnaires ›" (now Smart questionnaire (SQR)).

**Verdict: Approve**
