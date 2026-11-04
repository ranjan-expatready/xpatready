# G5 — Release needs a form line (C5.1, P-248; SA-1B-90)

Build notes for row G5 (screens). Plan and results are in the PR body; this file keeps the decisions taken while building.

## Plan
1. One rule, one place (`api/src/studio.ts`): beside F8's "nothing to release yet", a combination with document lines and no form line gets a release-blocking line in plain words that say what to add. A form line is a filed form (`form_kind` data_form): a PDF form, a portal-screen edition (filed Online, P-245) or an online-only form (P-152 (2)). A checklist or a document form does not count.
2. The release page (Programs › Release) and the Review and release tab list that line while the combination is configured (warning), so the author sees it before submit.
3. Submit and approve (release) are refused: approve with 409, in the same words.
4. Existing tests that expected documents-only to release (`check_f8_empty_release.ts` and any release suites) are updated to the new rule.
5. `acceptance/C5.1.test.ts`: P-248 plus C5.1's existing rule (the author submits, the expert ticks, a different person approves and releases).
