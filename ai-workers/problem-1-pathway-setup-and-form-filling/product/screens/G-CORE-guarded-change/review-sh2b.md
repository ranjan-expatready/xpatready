# Review: SH2b, a document type's alternatives and fact sources in the one where-used service

The commit I reviewed is aa38b485 on base 74bbb717 (#504 head). I reviewed it in my own worktree at that commit and changed no repo file. I did not build this change.
To run it, I started my own copy on port 4478 with database `xr_studio_review_sh2b`, because 4440–4471 were not allowed. US$0, no `*_LIVE`.
For the walk I used Chrome through Playwright, headless. It was not a visible browser and no person walked it.

## What I checked
- **The diff, line by line.** `where-used.ts:27-40`, `library-items.ts:54-56`, `proposals.ts:19,114-121`, `impact.ts:52-53` and the new `tests/check_sh2b_doc_type_uses.ts`.
- **Equivalence for each caller of `itemCombinations("document_type")`:**
  - **`itemUses`**, the retire and delete guard (`library-items.ts:56`). Before, it added alternatives and fact sources from all rows, then took `current` (newest version per line, then PUBLISHED or DRAFT). Now it filters LIVE first (PUBLISHED, DRAFT, RETIRED), then takes `current`. The only difference is when a line's newest row is SUPERSEDED and an older row is live. No writer creates that state: SUPERSEDED is only ever written to the `supersedesId` predecessor at release (`studio.ts:995-1015`, `library-changes.ts:203`). A RETIRED newest row is kept by LIVE and then dropped by `current`, exactly as before. So no answer changes in any reachable state. The listed-type branch already used the same filter in SH2, so a line's type and its alternatives are now read the same way.
  - **`LibrarySources.usedIn` and `usedInIds`** (the Document types "Used by combinations" column) now include alternatives and fact sources, which was intended. I saw it in the browser.
  - **C3.13 reuse marks** (`library-sources.ts:110-116`): the per-combination counts and marks now include these uses too. "With an LMIA (24 used)" showed both test types as "New here". That is the intended single answer, and c313_reuse passes.
  - **`whereUsedWords`** (`proposals.ts:117-121`): same ids, same id-to-label mapping, same dedupe, sort and "no combination" wording as `usedIn`. It works on a transaction client (`Client`) and the `undefined as never` cast is gone.
- **`impact.ts:53`.** A database error now produces a 500. The page turns that into "The impact could not be shown" with a way back (`web/src/pages/review-items.tsx:262-267`), so the failure is loud and the person can recover.
- **Mutation spot-checks (STANDARDS §7 [M], "a rule's test fails when the rule is removed").** I re-ran the new check on a fresh copy for each mutation:
  - Unchanged: 8/8.
  - Alternatives line (`where-used.ts:37`) commented out: 6/8. The two alternative checks fail as they should, but the "SH2b fail" guard check still PASSes.
  - Fact-source line (`where-used.ts:38`) commented out: **8/8, the mutation survives.**
  - After the mutations I restored `where-used.ts`; the worktree was clean apart from my links.
- **The fact-source case through the product.** I added a checklist line for a type that supplies date of birth, pointed the principal's date of birth at it with `PUT /combinations/:id/fact-sources/principal/person.date_of_birth`, then retired the line. The list showed `["With an LMIA"]` and the guard showed 1 combination use, and the retire was refused. So the code is right; only its test is missing.
- **Typecheck.** `tsc -p api/tsconfig.json` shows no errors in the changed files. There are 13 errors, all in other test files (check_vv_checklist, check_x2b_bulk_apply, ...). Lint was not run: there is no eslint binary in node_modules.

## Findings

### Major
**M1. The fact-source half of the move has no working test (STANDARDS §7 [M]; QUALITY D16).**
- **Where:** `tests/check_sh2b_doc_type_uses.ts:48-53`.
- **What happens:** the sample load writes no `fact_source` rows (only `fact-sources.ts` and `proposals.ts` create them). So the `if (fact)` setup always takes the `else ok(..., true)` branch.
- **Evidence:** the builder's database `xr_studio_forms_forms_sh2b` has `select count(*) from fact_source` = 0, and so does my run. Deleting `where-used.ts:38` leaves the check at 8/8.
- **Elsewhere:** no other suite asserts a fact-source use of a document type. I searched c119, c119_acceptance, s6, c313, sh2_where_used and w115.
- **Why it matters:** the PR claims "8/8" while one rule it moves, with a new status filter, has no coverage, and the check prints a PASS that hides this.
- **Fix:** make the setup real and drop the silent branch.
  1. `update document_type set supplies_facts = array['person.date_of_birth'] where document_type_key = 'sh2b_fact_source_only'`
  2. `POST /combinations/<the combination that has fact sources>/requirements` with `{documentTypeKey: FACT, attachMode: "COMBINATION_MANDATORY", appliesToRoles: "principal_applicant", providedBy: "client"}`
  3. `PUT /combinations/:id/fact-sources/principal/person.date_of_birth` with `{source: "DOCUMENT", documentTypeKey: FACT, version: 0}`
  4. `PATCH .../requirements/:lineage` with `{..., retire: true}`
  5. Assert the list equals the uses equals 1, and that the retire is refused.

  A setup failure must FAIL, never pass. I ran exactly this sequence on 4478 and the code passes it.

### Minor
- **m1. The "SH2b fail" check cannot fail.**
  - **Where:** `tests/check_sh2b_doc_type_uses.ts:44-45`.
  - **What happens:** `DELETE ... === 409 || r.status === 409`. The inserted type is PUBLISHED, so its delete is always 409 with "released items are kept", whatever its uses. With the alternatives removed, the check still passed.
  - **Fix:** assert `r.status === 409 && /With an LMIA|still uses it/.test(r.body?.detail)` on the retire alone. Also record the combination's label from the line you picked.
- **m2. A second copy of the label mapping, against P-258's "never copies it".**
  - **Where:** `proposals.ts:118-120` repeats `LibrarySources.usedIn` (`library-sources.ts:88-92`).
  - **Fix:** add `usedInLabels(db, workspaceId, kind)` to `where-used.ts` and call it from both places.
- **m3. A stale doc comment.**
  - **Where:** `where-used.ts:22-24` still says "a document type where a current checklist line lists it".
  - **Fix:** add "or names it as an alternative, or a fact is read from it". The inline comment at :28-29 already says this.
- **m4. Misleading reason on the refusal (pre-existing since C11.9 M4, not introduced here, for the tech lead to place).**
  - **Where:** `library-items.ts:67`.
  - **What happens:** for a type used only as an alternative, or only as a fact's source, the refusal says "Its document checklist lists it: remove the line there first" and links to `/c/:id/documents`. No line lists that type, so the next step is a dead end. Walked: `retire-sh2b_alternative_only.png` and `retire-sh2b_fact_source_only.png`.
  - **Fix:** have the service return the kind of each use so the reason and link can say "named as an alternative on a line" or "a fact is read from it (Facts tab)".
- **m5. Setup skips the product's route.**
  - **Where:** the test sets alternatives with SQL (`:37-38`), though `POST/PATCH /combinations/:id/requirements {alternatives}` exists (c119 uses it).
  - **Why it matters:** the SQL picks a DRAFT or PUBLISHED row that may not be its line's newest. The route keeps the setup honest.

## Quality dimensions touched

| Dim | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | The ruling is implemented as written: the block at `library-items.ts:57-64` is gone, the uses are in the service, and the alternative-only check is present. |
| D2 Data integrity | 5 | The guard and the list agree; the newest-version and LIVE equivalence is argued above. |
| D4 Rule integrity | 4 | All callers give one answer; m4's wording predates this change. |
| D5 Stability and recovery | 5 | The impact page now fails loudly and has a working error state. |
| D9 / D10 Next step and words | 3 | m4 (pre-existing). |
| D13 Accessibility and responsive | 5 | axe WCAG 2.2 A/AA found 0 violations at 1440, 1024 and 400 px; no sideways scroll; keyboard reaches View and Retire on each row. |
| D15 Speed | 5 | First view of the list 0.83–1.09 s including Playwright's networkidle wait; no request per row. |
| D16 Testability | 2 | M1, m1. |

All other dimensions are not touched by this change. D17 and D20 are simulated only. I did not run the graph tool (P-86) because it writes into the repo.

## Journey test (reviewer, the one score for this check)

**Journeys:**
- **J1.** The content publisher opens Document types and sees where a type used only as an alternative is used.
- **J2.** The same for a type used only as a fact's source (after its line was retired).
- **J3.** They try to retire each one and are refused, naming the combination.
- **J4.** They pick the combination "With an LMIA" to see the reuse marks.
- **J5.** Break-it: the impact review when its database read fails (not run; checked in code only).

**What held:** J1 and J2 show "With an LMIA" in the list, matching the guard's single use (I checked the API and the database). J3 refused both, the refusal named the combination, and Close and Escape work. J4 showed both as "New here" and the count was 24.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | `doc-types-1440.png` |
| Next step obvious | ½ | m4: "remove the line there first", but there is no such line |
| Plain words | ½ | m4 |
| Feedback and state | 1 | The refusal names the combination and the "Stops it (1)" count |
| Correct data | 1 | List = uses = 1 in both cases, checked in the database |
| Error recovery | ½ | The impact error state was read in code, not exercised |
| Accessibility and screen sizes | 1 | 0 axe violations at 3 widths, keyboard path |
| Speed | 1 | Under 1.1 s |
| Visual quality | 1 | Team look, aligned table |
| Trust and sources | 1 | Sample types labelled; "No source recorded" shown |

**Score: 8.5/10. Pass.**

**Not tested:** a real screen reader, 200 % zoom, an unaided walk by an intended user.

Screenshots are in `/tmp/claude-0/-home-user-xpatready/806baabe-ff32-537a-9e20-e02ba9018edc/scratchpad/journey/`.

## Verdict: Block

To fix before Approve:
1. **M1.** Make the fact-source check real at `tests/check_sh2b_doc_type_uses.ts:48-53`: set it up through the product's routes as described above, and make a setup failure FAIL instead of passing.

Minors m1–m3 and m5 are fixes in the same PR worth making now. m4 is pre-existing; the tech lead decides where it goes.
