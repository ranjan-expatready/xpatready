# UX-A part 3 — diff-only re-review (r6), PR #622, head 893bde72 (was a6861871, approved)

Scope: one test-only commit, `tests/check_s5_slice1_browser.cjs` BR-2. Sonnet per P-278; US$0; no browser run, nothing committed, :4400 not used.

1. **Is the change intended behaviour?** Yes. `web/src/components/setup-strip.tsx` line 44 prints `Live · setup steps ${LIVE_NEXT}: n of 5 done` when the combination's status is LIVE, and `Setup steps · n of 5 done` otherwise. The Live wording is the one agreed in part 3 (`review-part3.md`: "The strip reads 'Live · setup steps for the next release: 3 of 5 done'"; finding 7, QA-129). So the check was stale and the code is right. Not a code regression.
2. **Is the regex tight?** Yes. `/(Setup steps · |Live · setup steps for the next release: )\d of 5 done/` allows exactly two full phrases, each ending in `\d of 5 done`. It is not a loose "contains steps" match. The step's other conditions are unchanged (people step text, `Released versions: Release 1`, no Held/Recent/Add form).
3. **Should the wording follow state?** Nicer, not required. This step already requires `Released versions: Release 1`, so this combination is released and only the Live wording can appear; the "Setup steps · " branch is dead in this check (the never-released wording is covered by `check_x1_overview_strip_browser`, line 45). Minor: drop the old branch or pick by status next time the file is touched. It cannot hide a wrong strip today.
4. **Failure output.** `ovText.slice(0, 300)` as the detail is a useful diagnostic; no behaviour change.

Findings: no Blocker, no Major. One Minor (item 3), not blocking. Builder's reported exit 0 on this and the ten other likely-affected suites is consistent with the diff (test-only, one assertion).

Journey score: not re-scored (test-only diff); the earlier part 3 score stands.

**Verdict: Approve**
