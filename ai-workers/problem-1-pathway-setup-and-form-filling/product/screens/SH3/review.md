# Review: SH3, the resolver contract (shared service, no screen; P-258)

Reviewer role. I did not build this. 2 Nov 2026.
* **Reviewed commit: 7a7c5139** on `claude/admiring-galileo-i2ece1` (`git diff origin/main...7a7c5139`). I read everything through git. Mutations ran only in a throwaway copy in the scratchpad, never in the working tree. No server, no port, US$0.
* The branch has since moved to f8b0cbac, a merge of main (QA-82). It touches no SH3 file except render.ts, which gains a field-name helper, so render.ts lines from 64 on move down by 5. All file:line references below are at 7a7c5139.
* Sources I checked against: the BACKLOG SH3 row, P-258, P-251, P-249, and SA-1B-130 and SA-1B-215 (`domain/requirements-2026-11-02/.../SA-01B-content-pack-configurator_v2.1_2026-10-27.md`).
* **Journey test: does not apply** (no UI, so no journey to walk). Instead I scored the code and the tests out of 10 on the same ten criteria: **8/10** (table below). No separate journey-test report.

**Verdict: Block.** The move itself is right: I found **no behaviour change**. The problem is the contract text. It says things the code does not do, and it leaves out rules that are still in the four places, without the follow-up list the row asks for. Both Majors are fixed by changing text only. No code has to change.

## Runs
* `check_sh3_resolver.ts` **48/48**, `check_line_holders.ts` **19/19**, `check_engine.ts` **43/43**, all from `prototype/` as instructed.
* `tsc -p api/tsconfig.json`: no new errors. The test-file errors are the same as on main. `count-any.mjs --against origin/main`: **424, down from 427**.
* **My own old-against-new check:** I loaded origin/main's functions next to the branch's and compared **15,062,933 calls with 0 differences**. Covered: peopleFor, subjectsFor (13 who values × 9 subject kinds), lineHolders, conditionSubjects, aboutOf (11 persons × 7 facts × 6 placements × 5 rows), formSigners (8 signedBy values), signsForOthers, factsOf, kkey, partnerOf/spouseOf, roleOf, rolesNamedBy, linesNamingRemoved, the merge chain (3,000 random graphs with loops) and, on `tests/fixtures/screen01-work-permit-release.json`, the whole output of factSources, checklist, signedScanLines, factSourceProblems, prequalification and render.
* **Line by line:** every moved function matches main token for token. The only edits are the named constants (`ROLE.*`, `FILING`) and `partnerOf`, which replaces render's inline spouse switch and sources' `spouseOf`; both did the same thing. Each inline swap is the same expression: `isFilingFact(m)` with no placement is the old `startsWith("case.")` (render.ts:133, :151), `isFilingFact(p.fact, p)` is the old two-part test (:231), and `sourceKey` is the old template. `resolveKey` keeps 5 lookups and still answers the asked key. A side gain: sources.ts no longer imports render.ts, so that import cycle is gone.
* **Mutations** in the copy, one rule removed at a time: **24 of 30 caught.** These survived all three suites: MERGE_HOPS 5→6, sponsor removed from WHO_ROLES, the render.ts call-site swaps, sources.ts `holder.spouse`, and the form-lines `resolveKey` wiring. See m2.

## Issues
**Major (fix before Approve)**
1. **R1, R5 and SCOPE_RULES describe the filing wrongly.**
   * R1 says "One case is one filing today". The code already makes several filings per case: `engine/filing-modes.ts:84-97` (`filingPlan`, ids `filing-${subject}`) and `engine/runtime/filings.ts` (C6.12).
   * What is built as "filing" scope is really a once-per-case store: the subject `"case"`, read by every filing of that case. But `SCOPE_RULES.filing.lives` states SA-1B-130 rule 3 ("on that filing only; a later filing asks again") as if it were built.
   * SA-1B-215 makes the unit "one subject on one filing". The `Resolver` interface has no filing argument, and `Subject.filing.id` can only be `"case"`. Yet C7.7, C8.1 and C8.2 work per filing.
   * Fix (text only): say that a filing value is stored once per case today and that every filing on the case reads it. Mark `SCOPE_RULES` as the SA-1B-130 target. State that a filing id comes with the held P-251 "filing scopes" design and SH4 (pin per filing).
2. **Rules still worked out in the four places: not moved, and not listed for a follow-up.** The row says "the four places call it, or the PR lists exactly what moves in a follow-up". There is no list.
   * (a) R3 is true for **document lines only** (`lineCondition`). Other line types decide differently:
     * forms decide their condition on the form's own person (`render.ts:93`, `:157`);
     * rules take their holders from the condition's subject kind (`:194`);
     * questions use the person the answer is about (`:211`);
     * checks run for everyone with applies, so an applying representative or sponsor is included, unlike R2's each_applicant (`:249`);
     * `applicants` at `:229` is a second copy of R2's each_applicant.
     So "a line's condition" in R3 is wider than the code, and C7.7 will mix forms and documents.
   * (b) The "a document supplies facts about whom" rule (holder, holder.spouse, parent_1/parent_2) stays in `sources.ts:47-52` and its role-level twin `other()` in `:267`. This is the rule the C6.5 document reader needs, and the contract does not have it. Also still local: `isAgentFact` (`:91`, the `organisation.` prefix), `WHO_OF_ROLE` (`:230`, the reverse of WHO_ROLES), and the `h === "case"` literals.
   * (c) render's deciders call `isFilingFact` without the placement (`:133`, `:151`). So a fact placed once_per_case whose id does not start with `case.` is keyed on the person there. R5 says it is a filing fact.
   * (d) The same rules are copied outside the four places. R5: `runtime/eligibility.ts:45` (it has its own `aboutOf`), `runtime/case-checklist.ts:124`, `api/src/runtime.ts:269` and `:310`, `engine/programs.ts:16`. `coverage.ts:32` has a `roleOf` that returns "the application". The `sourceKey` template appears at `runtime/preview.ts:69`, `runtime/case.ts:365`, `validate.ts:244`, `pqr-picks.ts:82` and `coverage.ts:43`.
   * Fix (text only): add a "Not yet through the resolver (follow-up)" block to the `contracts/resolver.ts` header listing (a)–(d) with file:line. Narrow R3 to document lines, or state per line type what decides the condition.

**Minor**
* **m1. R9 wording does not match the code.** It says "followed at most MERGE_HOPS times; a chain longer than that answers the asked key". In fact a chain of exactly 5 redirects also answers the asked key: the code looks up 5 times and follows at most 4 redirects. The test name ("5 or more") is the accurate one. Reword R9 to match.
* **m2. Some rules are not pinned by any test.**
  * The tests build their chains from `MERGE_HOPS`, so changing 5 to 6 passes. Assert `MERGE_HOPS === 5`.
  * The R10 test title names sponsor, representative and partner but asserts only couple_once and each_dependent_child. Removing sponsor passes. Add those three.
  * The call-site swaps are checked only by source regex. Commit the old-against-new harness the build note cites ("2,559,123 inputs"), or a whole-output equality on the fixture snapshot.
* **m3. `check_sh3_resolver.ts:37` proves nothing, and its claim is wrong.** It compares WHO_HOLDERS to a copy typed into the test. Its claim "one the studio accepts" is false: `api/src/studio.ts:44` WHO does not include `each_adult_18_plus`, which only release data and the runtime use (`case-checklist.ts:149`). Import WHO instead, and word that value accordingly.
* **m4. R2 contradicts itself.** It says "never from its condition's subject", then "A subject kind given with it wins". Say that only rules pass a subject kind (`render.ts:194`) and that `lineHolders` never does.
* **m5. The P-249 import check is narrow.** Its regex (`check_sh3_resolver.ts:109`) only matches single-line `import … from` lines; `export … from` and dynamic imports pass unseen. Widen it.

## Questions asked
1. **No behaviour change:** yes, by line-by-line reading and 15M calls compared.
2. **Contract accurate and the right shape for M3:**
   * R4, R6, R7, R8 and R10 are accurate.
   * R1, R5 and SCOPE_RULES are wrong about filings (M1).
   * R3 is too broad (M2a). R9 wording is off (m1).
   * The shape fits C8.1 signers and C7.5 fact views. C6.5 lacks the "supplies about" rule (M2b). C7.7 and C8.2 lack a filing id (M1).
3. **A passing and a failing case per rule:** yes, R1–R10 each have both. The gaps are in m2.
4. **Still computed outside the resolver:** see M2.
5. **Lift-ready:** yes.
   * The engine resolver imports only the contract, and the contract imports nothing.
   * No database or vendor call: R9 asks its store through a callback.
   * No country value: the IMM numbers appear in tests only.
   * Role keys are the library's person roles, and sponsor is marked Sample.

## D1–D20 (engine-only item; D8–D14 and D17 have no screen to judge)
D1 3/5: four scopes shaped, person and filing built, but filing misdescribed (M1) · D2 5/5: no stored data or keys change (sourceKey and factKey are identical) · D3 4/5: one copy of the rules plus re-exports, copies remain (M2) · D4 4/5: rules unchanged, R3 and R5 reach overstated · D5 5/5: pure, no new failure path, import cycle removed · D6 n/a · D7 n/a (no AI) · D8–D14 n/a · D15 5/5: no added queries (resolveKey still makes 5 lookups at most) · D16 4/5: 24 of 30 mutants caught, see m2 · D17 simulated only, n/a · D18 3/5: the contract cites SA-1B-130 but states its target as built · D19 n/a for a shared service · D20 simulated only, n/a.

## Score of the code and tests (out of 10; the journey test does not apply)
| Criterion, read for a shared service | Score | Evidence |
|---|---|---|
| Task completed | ½ | Contract, tests and callers are in; the follow-up list is missing (M2) |
| Next step obvious for the M3 rows | ½ | C6.5, C7.7 and C8.2 cannot tell what is missing (M1, M2b) |
| Plain words | ½ | Mostly clear; R2, R3 and R9 overstate or contradict (m1, m4, M2a) |
| Feedback and state (test output) | 1 | Each check names its rule and its pass or fail case |
| Correct data (no behaviour change) | 1 | 0 differences in 15,062,933 old-against-new calls |
| Error recovery (edge cases) | 1 | Loops, missing people, null persons, negative counts all pinned |
| Fit and portability (P-249) | 1 | Pure; the store comes in through a callback; imports only the contract |
| Speed | 1 | No new queries or loops |
| Code quality | 1 | Import cycle removed; 3 fewer `any`; old names kept as re-exports |
| Trust and sources | ½ | SA-1B-130 target stated as built (M1) |
| **Total** | **8/10** | A pass on the score, but two Majors are open |

## What I could not check
* Suites that need a server (`check_preview_sets`, `check_w115_slice1/2`, `check_c3_11_signed_scan`, `check_pqr`): the brief said no server. The builder's `run-suites --changed` result is theirs to relay.
* `graph.mjs`: it always writes `qa/graph.json`, and I may write only this file. SH3 adds no page or route.
* Only one release fixture snapshot exists for the whole-output comparison.

**Verdict: Block.** To fix:
* **Major M1:** correct the filing wording in R1, R5 and SCOPE_RULES in `contracts/resolver.ts`.
* **Major M2:** add the follow-up list (a)–(d) and narrow R3.
* **Minor m1–m5:** may follow, or ride along.

## Round 2 (c00868d7)
* **What I read:** `git diff 7a7c5139 c00868d7 -- …/studio`. Since round 1, the head adds three things:
  * f8b0cbac, a merge of main. Its only SH3-file change is QA-82's field-name helper in render.ts; the moved functions are untouched.
  * qa/built/SH3.md.
  * c00868d7 itself, which changes only `contracts/resolver.ts` (comments) and `tests/check_sh3_resolver.ts`.
  * engine/resolver.ts, sources.ts, people.ts, fact-sources.ts and form-lines.ts are byte-identical to 7a7c5139, so round 1's 15M-call result still holds.
* **Runs:** `check_sh3_resolver` **54/54**, `check_line_holders` 19/19, `check_engine` 43/43. `tsc`: no new errors (the same four old test files only).
* **M1, fixed.** R1, R5, `FILING` and `SCOPE_RULES` now say a filing value is stored once per case and that every filing on it reads it. `SCOPE_RULES` is marked as the SA-1B-130 target. "No filing id yet" points to P-251 and SH4. This matches `filing-modes.ts` and `runtime/filings.ts`.
* **M2, fixed.**
  * The "Not yet through the resolver" block (a)–(d) has every file:line I raised. I checked each one on the head and all are correct.
  * It also adds the field-scope-by-prefix copies (`import.ts:41`, `proposals.ts:214`, `snapshot.ts:37`).
  * R3 is narrowed to document lines, and R2 now says only rules pass a subject kind (m4).
* **m1, fixed.** R9 now says "asked at most MERGE_HOPS times, at most MERGE_HOPS − 1 redirects".
* **m3, fixed.** WHO is read from the studio.ts source, with its own fail case.
* **m5, fixed.** The import check covers multi-line imports, re-exports, `import()` and `require`, and has a fail case.
* **m2, mostly fixed.** I reran my 30 mutants plus one new one on the head: **30 of 31 caught** (round 1: 24 of 30). Newly caught: MERGE_HOPS 6, sponsor out of WHO_ROLES, the `resolveKey` wiring (fake db, 3 asks, newest version first), `holder.spouse` and parents through `documentFacts`, and render's open-decider key.
* The builder's reason for not committing the old-against-new harness is fair: main's old copies no longer exist after the merge. Both comparison results are recorded in the PR.
* **Open, Minor (does not block):**
  * r2-m1. Two render.ts call-site swaps still survive every pure suite: `render.ts:156` (the answered-decider key) and `:236` (the placements loop's `isFilingFact(p.fact, p)`). Both are provably the main expression. Fix: one check each, e.g. an answered `person.flag` placed once_per_case stays keyed on the person, and a once_per_case placement is asked once, on "case".
* **Score of the code and tests: 9.5/10.** "Next step obvious", "plain words" and "trust and sources" move to 1: M3 rows can now see what is built, what is held and what is still outside the resolver. "Task completed" stays at ½ for r2-m1.

* **Head moved to cc52f0b1.** It changes only `tests/check_sh3_resolver.ts:70-72`: the three personal names in the R6 fixture values become "principal-name", "partner-name" and "parent-name" (AGENTS rule 5). The values stay distinct, so R6 still tells the people apart. 54/54 on cc52f0b1, and both R6 mutants are still caught.

**Verdict: Approve** (cc52f0b1, and c00868d7 before it). No Blocker or Major is open; r2-m1 can follow.
