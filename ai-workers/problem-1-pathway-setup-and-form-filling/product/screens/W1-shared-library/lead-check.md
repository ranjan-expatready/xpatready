# Lead check — S6 Shared library, slice R (US$0 part)

**29 Oct · Lead (Mac, eighth chat) · screens branch at 164ef658 (code 21556f3a) · verdict PASS → Lead PR**

## What was checked
* **Diff against `main`** (12 files): `api/src/field-drafts.ts` (the "Draft fields" step for one form edition on the shared runner, keyed `edition:<code>:<edition>`, output limit from the box count), `tools/record-field-drafts.ts` (recording pass), prompt `field-map-check.v1.md`, stub, `drafting-run.v0` kind `field_map_edition`, P-154 word fix in `programs.tsx`, plans `plan.md`, `plan-p149.md`, `plan-p158.md`. Matches the agreed plan (slice R) and P-138 (drafting on a click), P-139 (cap), P-158 delta (agreed, notes a–c).
* **Capability or Scaffolding (P-33):** the step, its key and its cost-before-any-call checks are Capability (S6's "Draft fields with AI"); the recording pass is Scaffolding, labelled so in the file and never ported.
* **Money:** no live call. The recording pass plans first; live needs `--live --max-usd`, re-reads both caps before each round, stops at what is left, and never sends a round above the runner's job budget.
* **Checks rerun by the Lead on the exact commit:** `check_s6_field_drafts.ts` 19/19, `check_p154_words.ts` 4/4. The lane's full `run-suites.sh` 67/67 on the same code (038add4f → d9c8be97); CI on the Lead PR runs the full suites on the merge result.
* **Shared contract:** one new enum value in `drafting-run.v0.schema.json`; no other lane's file touched (no overlap with the forms branch).
* **Graph (P-86):** G3 2, the two older attachment routes, not caused by this lane.

## Notes carried forward
1. At today's runner job budget (US$1 per attempt) the larger Sample forms are refused before any call (IMM 1295: about US$2.75 an attempt). The recording pass becomes useful only after the forms lane's per-step `budget_usd` merges; then `runnerBudgetUsd`'s fallback cast can go.
2. Recording plan today: 8 Sample editions, about US$21 at the output limit, worst US$40 (earlier estimate about US$13, worst US$30). The founder's amount is asked after the forms runner fixes and QA-90 merge.
3. Next for screens: S6 slice 1 (the one review queue on contract v2, one `ProposalItem` table) after the forms merge.
