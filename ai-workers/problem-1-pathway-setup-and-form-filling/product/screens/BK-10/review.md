# BK-10 Form rules into data: review

Reviewer: Opus screen-reviewer (fresh context; did not build it). Reviewed commit **69b160c8519eb6757019a09adf0772b7139b86aa** (PR #1518, draft), 11 Nov 2026, live AI off, US$0.
Bar: BACKLOG row BK-10, Bake plan row 24 and Challenge 1 (P-448, P-452, P-454), `STANDARDS.md`, `QUALITY.md`. There is no `concept.md`: this row changes code and data, not a screen.
Journey test: `journey-test-reviewer-2026-11-11.md`, **8/10, pass**.

**Verdict: Ship. No open Blocker or Major; four Minors and a Nit, listed below.**

## What I checked, independently
* **Same table.** I loaded `FORM_SETUP` and `FAMILY_FORM_BY_CHANNEL` from the merge base (3a9b91743) and from 69b160c85, plus `documentSources.sample()` on 6 inputs (each named source, null, an unknown stem, empty). With keys sorted, both dumps are deep-equal. That covers every cite, condition, minAge, who, rule fact (label, meaning, beside), family form by channel, document lines and the LMIA "Sample: not on IMM 5556 …" wording.
  * Only the property order inside each moved combination changed. No caller iterates or serialises a FormSetup: the steps run in file-name order and read named fields.
* **Callers.** No live code in `api/`, `acceptance/`, `tests/`, `tools/` or `web/` uses the removed names. Nothing imports the two names from `demo.ts` either. Stale comments remain (m3).
* **Reader.** Every field in `samples/form-setup.json` is taken, at combination, rule and fact level. The new checks (rule cite, one document source, keyed facts through `ruleFactOf`) pass on all five combinations.
* **Fail cases fail for the right reason.** I removed each validation clause in turn (cite, at most one document source, application form, family table, `ruleFactOf` on keyed facts). Each time, exactly its own fail case failed. Putting `"sp.outside"` back into `form-setup.ts` fails both the BK-10 code scan and B164.
* **Data alone, end to end.** On a second copy, I changed only `samples/form-setup.json`: IMM 5646's rule and its fact removed from `sp.outside`. Then I loaded the configured checkpoint.
  * Study permit's released IMM 5646 line changed from `ANSWER_CONDITIONAL` (minor studying without parent) to `COMBINATION_MANDATORY`.
  * In the database, every other line stayed identical to the reviewed copy's.
* **Checks at 69b160c85.**
  * Fast checks: `check_bk10_form_rules_data` 14/14; `check_b164_no_engine_keys` 52/52, and its diff is 21 deletions and 0 additions (shrink-only, no `form-setup.ts` entry left); `check_b104_stage_one` all passed; `check_features_registry` 27/27.
  * Type check: no new errors (15 known). `graph.mjs --check` exits 0, and BK-10 adds no page or route.
  * Release checks on my isolated copy (:4458, forms lane), each loading the configured checkpoint itself: sp 27/27, vv 35/35, lmia 23/23, ee 26/26, fs 28/28.
* **Immigration values.** Nothing new. Every cite moved word for word (the deep-equal above) and stays "Sample, Unconfirmed: expert" (P-170).
* **Rule "one source, not a third".** No new file. `form-library-sample.json` (what an account accepts) is a different fact, and nothing is duplicated there. The one remaining copy is `engine/runtime/team.ts:169`, which holds the fact key `case.uses_representative` and no form rule.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | The brief's done-when is met (keyed rows gone, allow-list shrank, pass and fail tests, packs' release checks green). The BACKLOG's `sources.ts` part is left out, openly (m2). |
| D2 Data integrity | 4 | Bad entries are refused at the read and name the combination. Unknown keys are accepted silently (m1). |
| D3 Reuse | 5 | The four shared facts are defined once in `ruleFacts` and referenced by key. The family form table is defined once. |
| D4 Rule integrity | 4 | A fact whose rule's form is gone is refused (mutation-proven). Condition shape is checked only downstream, by `saveForm`. |
| D5 Stability | 4 | The load is the same, about 110–117 s. A bad data file stops the whole API at boot, as the JSON part already did before. |
| D6 Governance | 4 | Each moved entry's `about` keeps its files, pages, dates and rulings. |
| D7 AI trust | N/A | No AI path is touched. |
| D8–D14 | N/A | No screen changes. The Forms tab was checked unchanged (journey test). |
| D15 Speed | 5 | One read at import, no per-row work. The checkpoint load time is unchanged. |
| D16 Testability | 5 | Pass and fail tests, and each fail case is proven by mutation (above). |
| D17 | simulated only | No intended user walked it. |
| D18 Provenance | 4 | Every rule is cited in the data. The cite is not stored on the released line (seen, not caused here). |
| D19 Closure | 5 | Configured checkpoint → release, for all five combinations. A data edit reaches the released line. |
| D20 | simulated only | |

## BIC-01–BIC-20 (`EXPERIENCE.md` §6)
All twenty are N/A. BK-10 changes no case-side screen and has no concept that opts in (§6 scope). The Forms tab, read as evidence, is unchanged: axe found nothing, there is no sideways scroll at 1024 or 400 px, and keyboard focus is visible (journey test).

## [M] lines (`STANDARDS.md`)
* **Met.** §3.1 "content is data, never constants": this row advances it. §3.10 and §7 "a rule's test fails when the rule is removed": mutation-proven. Strict TypeScript: no new errors. Technology gate: no new tool.
* **Not met.** §7 "no dead code": the `demo.ts` re-export (m4).
* **N/A.** Migrations, concurrency, endpoints, authorisation, uploads, AI, axe on new states: none are touched.

## Issues (none Must)
1. **m1 Should: the reader accepts unknown keys silently** (`api/src/form-setup.ts:49-63`). Verified on a copy:
   * a rule with `"conditon"` loads as an unconditional line, so IMM 5646 would be required of every student;
   * `"familyByChanel"` drops the family form without a word;
   * `minAge: "18"`, `who: "principal_and_cousins"`, `op: "equals"` and a duplicate form also load.

   For vv, wp and sp, the old `FormRule[]` literals refused excess properties at type-check. The release checks still pin those lines, so only new combinations, such as E4's Study permit-by-data, are exposed. **Fix:** a closed key set per combination and per rule (and `minAge` a number), with one fail test.
2. **m2 Should: `api/src/sources.ts` TITLES is left out, though the BACKLOG done-when names it.** I judge this acceptable for this PR, but not for the row:
   * the reviewer brief's done-when names only `form-setup.ts`;
   * the gap was raised openly with evidence;
   * TITLES is a 7-entry fallback display name (`sources.ts:887`, create only), not a pathway's rules.

   BK-10 should not be marked Done while the 8 `sources.ts` allow-list entries still say BK-10. The tech lead should add BK-10b (the builder's option (a), the title from the form's stored record, is sound) or ask for it here.
3. **m3 Should: comments still point to removed constants.** `features/checkpoint/combination/300-reviewed-release-documents.ts:29`, `tests/check_m3_c1_expected_lines.ts:11,12,52,54`, `acceptance/C7.7.test.ts:134`, `acceptance/C4.1.test.ts:74`, `acceptance/lib/m3.ts:252,258`, `samples/fee-table.json:260,266`. **Fix:** point each to `samples/form-setup.json`, combination key.
4. **m4 Should: `api/src/demo.ts:31-32` re-exports `FAMILY_FORM_BY_CHANNEL, FORM_SETUP`, and no file reads them** (`demo.ts` itself does not use them either). **Fix:** delete both lines.
5. **Nit: two claims in the PR are slightly off.**
   * The PR says "byte-identical, in the same key order". The values are identical, but the property order inside the moved combinations changed (harmless, see above).
   * The combination refusal is one generic sentence. It names the combination, not the broken clause, so a data editor must guess which requirement failed.

## The PR's questions
1. **TITLES.** Reasonable; see m2.
2. **`fs.outside` against `fs.spouse`.** Reasonable, and confirmed:
   * `form-library-sample.json:39,114` key spousal sponsorship as `fs.outside`, while the checkpoint uses `fs.spouse` (`wave1.json:53`);
   * `finder.ts:870-874` sets the portal only by key, and it runs before release (`demo.ts:363`).

   Adding the key changes channels on the six and the checkpoint, so it belongs in its own row, not a no-behaviour move.

## Seen, not caused here
* QA-216 (finder replay "AI did not finish" on Study permit and LMIA).
* `100-form-lines.ts` saves condition, who and minAge but not the rule's cite. The line's source reads "added from the library", and "Conditional (a rule)" on the Forms tab has no tooltip giving the condition.

## Could not check
* About 58 Works packs. CI's packs job runs them once the PR is marked ready; only the guard has run on this draft.
* A real screen reader, and 200% zoom as such (400 px stood in).
* An intended user's unaided walk (D17, D20).
* Uncommitted edits to `sources.ts`, the B164 test, `web/src/pages/job.tsx` and a new `check_bk10_form_titles.ts` appeared in the shared checkout at 02:32 UTC, after my server had loaded and my fast checks had run. They are not part of 69b160c85 and are not reviewed: a new head needs a new review.

**Verdict: Approve** (commit 69b160c8519eb6757019a09adf0772b7139b86aa)
