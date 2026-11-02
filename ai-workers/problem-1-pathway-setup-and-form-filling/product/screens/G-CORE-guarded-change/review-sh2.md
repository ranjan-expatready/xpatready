# Review: SH2, one where-used service (P-258, inside G-CORE P-253)

Reviewer: a fresh agent that did not build it. Commit reviewed: **a82614c8** on `claude/eager-wozniak-b441sk`, against `origin/main` 12647032. Code is in f25a6256. a82614c8 adds only `concept.md` and `challenge.md` in this folder. I confirmed both are docs only (2 files, 245 lines of markdown, no code) and did not review them.
Adapted from `screen-review` for a backend refactor with no screen. I checked equivalence line by line, list order, client types, P-249 purity, test quality (pass and fail per rule, with mutation spot-checks) and the STANDARDS [M] lines that apply.

## What I ran
* `tests/check_sh2_where_used.ts`: **17/17 pass**, US$0, no server.
* `tsc --noEmit -p api/tsconfig.json`: **no errors** in `api/src/`, `engine/` or the new test. 4 untouched test files have errors already (check_c69_runs, check_vv_checklist, check_x2b_bulk_apply and one other).
* Mutation spot-check (STANDARDS §7) on a scratch copy of `engine/where-used.ts`, 15 mutants: 10 killed, **5 survive** (see Minor m1).
* Not run: the callers' database suites (the builder runs them on 4450–4459) and `graph.mjs` (it rewrites `qa/GRAPH.md`, and I may write only this review). No server was started, no paid AI was used, and no `*_LIVE` variable was set.

## Equivalence, line by line (old 12647032 → new)
* **library-sources `usedInIds` → `itemCombinations` + engine `fieldUses`/`byItem`.**
  * Same seven queries with the same filters. Same `current()` keys per table. Same edition-per-channel rule (`newestEdition`).
  * Same answer-list mapping: `listOf` is read in `version asc` order, so the last version wins.
  * Pairs are pushed in the same order, so each Set's insertion order is unchanged.
  * The new `b.canonicalFieldKey &&` guard (engine/where-used.ts:45) is redundant after `mappedBoxes` filters, and harmless.
  * Equivalent.
* **library-sources `mappedBoxes`, `current`, `fieldsOf`.** Moved as they were. `current` = `newestBy` + status filter, with the same strict `>` tie rule. Equivalent. The `export { current }` re-export keeps library-items' import working.
* **library-items `itemUses`.**
  * `itemCombinations(db, ws, kind)` replaces the `new LibrarySources(db, undefined as never, …)` hack, which is an improvement.
  * `itemReleases` uses the same SQL with `ORDER BY version DESC`. The newest-per-combination map is the same.
  * Equivalent.
* **form-uses `formUses`.**
  * `formLines` runs the same query (`lineageKey`, `version desc`). `formLineByCombination` keeps the first-seen maximum, and its Map insertion order equals the old loop's.
  * `formReleases` runs the same SQL, and `latest` is the same `Number(version) === Number(latest)`. The label is per combination, the same as the join.
  * Release order is unchanged (no `ORDER BY`, as before). The lines and releases are now read in parallel (`Promise.all`), which is fine because neither was in a transaction.
  * Equivalent.
* **Client type.** `Db | Prisma.TransactionClient` typechecks, `$queryRaw` included. Every caller passes `this.db`/`db` today.
* **P-249 purity.** `engine/where-used.ts` imports only `./programs.ts`. That file imports `../contracts/programs.ts` plus two type-only engine imports. No database, framework or file system. **Met.**

## The two deliberate behaviour changes in impact.ts
1. **Combinations: newest line by `lineageKey`, not retired.** Not a regression; it corrects the old code.
   * Every insert path writes `lineageKey = formKey` (engine/import.ts:84, form-lines.ts:46, `revise` copies it, undo upserts restore rows). `formKey` is never updated, so `lineageKey = code` selects the same rows as `govFormDefId = def.id`.
   * The old filter `status: { not: "RETIRED" }` matched **SUPERSEDED** and old **PUBLISHED** rows.
   * A removal is written as a RETIRED version (lines-bulk.ts:251 via `revise`), and `publish` only promotes DRAFT rows (studio.ts:997-999). So after a *released* removal, v1 stays PUBLISHED, and the old impact review kept listing a combination that no longer files the form. It also kept `accept`'s audit line saying "N combinations show the change".
   * The new rule matches form-uses ("It files this form") and the UI text "No combination files this form yet" (web/src/pages/review-items.tsx:285).
   * The one case that drops out on purpose is a combination whose *draft* removes the form. Its released cases stay pinned to their release, and the new edition's maps are drafts for a release that will not carry the form.
2. **Cases: status `OPEN` only.** Not a regression. Every case is created with the default `"OPEN"` (schema `Case.status @default("OPEN")`, runtime.ts:99), and nothing in `api/`, `engine/` or `tools/` updates `case.status`, so today's counts are identical. It also makes the UI sentence "N open cases stay on the release they started on" literally true.
* Neither change is pinned through its caller: no suite asserts `combinations` or `open_cases` of `GET /intake/held/:id/impact` (check_screen02_slice2.ts:52-62 checks only counts, AI and roles). See m2.

## STANDARDS [M] lines that apply
* §3.3 defined once / P-258 "features call it, never copy it": **met** for the three named computations.
* §3.10, every rule passes and fails: **mostly met**. The moved rules keep their caller-suite coverage (check_s6_library_sources.ts:77-110 covers PR #96 (a)/(b) and PR #108 (a)). Gaps are in m1 and m2.
* §4 engine has no I/O: **met**.
* §5 no N+1: **met**. The query count is unchanged.
* §7 strict TS: **met** (no `any`; one non-null `!` at api/src/where-used.ts:76 is safe by construction).
* §7 no dead code: **met**.
* §7 "Property-based tests for the engine … **[M] when the engine changes**": **not met**. See Major 1.

## Blockers
None.

## Majors
1. **No property-based test for a new engine module (STANDARDS §7 [M]).** `engine/where-used.ts` is new engine code, and `tests/check_sh2_where_used.ts` has only example cases. fast-check is already a dependency and is used the same way in `tests/check_forms_x5_library.ts:7,81`.
   * **Fix:** add 3–4 `fc.property` checks in check_sh2_where_used.ts:
     * `newestBy`/`current` give the same set however the input is shuffled.
     * Every row `current` keeps is DRAFT or PUBLISHED and has the highest version for its key; every key it drops has a newest row that is RETIRED or SUPERSEDED.
     * `filingCombinations` is exactly the combinations whose highest-version line is not RETIRED.
     * `byItem` holds exactly the pairs whose key is truthy.
   * Each property should fail when its rule is removed. That also closes most of m1.

## Minors
* **m1. Five rules have no failing case in the pure test**, so a mutant survives for each: `current()` on form lines (engine/where-used.ts:38), docs (:48), checks (:49) and questions (:51), and the per-**channel** edition key (:42).
  * **Fix:** in the `rows` fixture (tests/check_sh2_where_used.ts:43-53), add a retired newest version for a line, a doc, a check and a question, plus a second-channel edition, each with a `fail` assertion.
  * Also correct the header claim at :3 ("Every rule has a passing and a failing case") until this is done.
* **m2. The impact rules have no test through the API** (api/src/impact.ts:51-52, api/src/where-used.ts:65-67,88-90).
  * **Fix:** in check_screen02_slice2.ts, add one pass and one fail case:
    * A combination whose newest IMM 5476 line is RETIRED is absent from `combinations`.
    * A case set to a non-OPEN status by SQL is not in `open_cases`.
* **m3. The impact combination list order changed from unspecified to "highest line version first"** (api/src/where-used.ts:60-67). It is not a regression (the old query had no `orderBy`), but the order shown on the Combinations tab is accidental.
  * **Fix:** sort `formCombinations` by label (or trail) before returning.
* **m4. The purity scan is weak** (tests/check_sh2_where_used.ts:16-18). It reads only single-line `^import … from` lines, so a multi-line import, `import()` or `require` gets past it. Its "fail" case tests the regex against string literals, not against the file.
  * **Fix:** match every `from "…"` and `import(` in the file, and follow `./` imports one level (programs.ts).
  * The "no copy left" scan at :22-23 depends on exact source text. Acceptable, but say so in the test name.
* **m5. An error becomes "0 open cases"** (api/src/impact.ts:52). `.catch(() => 0)` carries over from the old code, so a database error shows a reassuring zero.
  * **Fix:** drop the catch (let the request fail with the Problem Details error) or return `null` and have the UI say "Open cases could not be counted".
* **m6. The header overclaims** (api/src/where-used.ts:2, "Every 'where is this used' answer comes from here"). `library-sources.ts` `ruleFacts` (:250-290) and `lines-bulk.ts:27` still read conditions themselves, and the `fieldsOf` copies are SH1's job (P-258).
  * **Fix:** say "the SH2 callers named below" instead.

## Journey score
**8.5/10, pass.** See `journey-test-reviewer-2026-11-02.md` in this folder. The behaviour was judged from code, the typecheck and the pure test. No UI walk was possible without a free port, and the UI is unchanged.

## Could not check
The callers' database suites on this commit (the builder's run is the evidence). `graph.mjs`/GRAPH.md. Coverage (c8). D17/D20: not applicable (no screen); they stay with the founder.

**Verdict: Block.** Fix Major 1 (property-based tests for `engine/where-used.ts`, STANDARDS §7 [M]). The logic itself is equivalent, and neither impact.ts behaviour change is a regression. Fix m1–m6 or list them in the PR.

## Re-review on 0e8c0958 (fixes on top of a82614c8; origin/main still 12647032)
**What I ran:**
* `check_sh2_where_used.ts`: **24/24**.
* `tsc`: clean in `api/src`, `engine/` and the test.
* My 15 mutants, plus 6 new ones (lines, docs, checks or questions switched to `newestBy` only; `>=` ties; a planted multi-line `@prisma/client` import): **20/21 killed**. The survivor (`>` changed to `>=` in `newestBy`) is equivalent, because (key, version) is unique in the database and in the fast-check data.

**Results:**
* **Major 1: fixed.** Four `fc.property` checks (300 runs each) compare against independent models: order independence, current = newest-and-live, filing combinations, byItem (tests/check_sh2_where_used.ts:89-112).
* **m1: fixed.** There are retired-newest and older-version cases for form lines, docs, checks and questions, and a per-channel edition case (:67-87). All five mutants that survived before are now killed.
* **m3: fixed.** The combinations are sorted by label (api/src/impact.ts:51).
* **m4: fixed.** The scan now catches multi-line, dynamic `import()` and `require`, and is tested on planted bad sources (:15-22).
* **m6: fixed.** The header names today's callers (api/src/where-used.ts:1-5).
* **m2 and m5: left open, listed in the PR.** That is acceptable, because the row keeps the callers' suites unchanged and m5 was in the code before SH2. m2 should be a G-CORE B2 test, as proposed.
* **New Minor: `fc.IProperty<any>`** (tests/check_sh2_where_used.ts:90) breaks §7's no-`any` rule. **Fix:** use `fc.IProperty<unknown[]>`, or add the `eslint-disable-line` comment the same way check_forms_x5_library.ts:81 does.
* My two review files are in this commit unchanged.

Journey score: unchanged at 8.5/10 (pass). Only the m3 ordering improved, and visual quality still has no UI walk.

**Verdict: Approve** (0e8c0958; no open Blocker or Major; Minors m2, m5 and the `any` are listed for the PR)
