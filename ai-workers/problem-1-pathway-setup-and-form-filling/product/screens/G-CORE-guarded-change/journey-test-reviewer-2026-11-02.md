# Journey test: SH2 one where-used service (reviewer, 2 Nov 2026)

Commit: a82614c8 (code in f25a6256). This is a backend refactor, so no screen changes. It changes what four existing views show, and I judge those views here.
How it was tested:
* No visible-browser walk. Every free port belongs to a builder (WAY-OF-WORKING: screens 4440–4449, forms 4450–4459, both in use), and :4400 is never used for tests.
* The journeys were traced through the code instead, and checked with the typecheck, the pure test (17/17) and 15 mutants (10 killed).
* Data was checked by reading every insert and update path in `api/` and `engine/`.

## Journeys (persona · goal · expected)
1. **Main path, author, impact review:** "A new IMM 5476 edition arrived: which combinations does it touch, and how many open cases?"
   * Expected: the Combinations tab lists each combination whose current line files the form, plus "N open cases stay on the release they started on".
   * Held: `formCombinations` gives the newest line per combination, not retired. `openCases` counts status OPEN.
2. **Alternate, author, library form "Used by":** "Can I retire IMM 5476?"
   * Expected: the same combinations, releases and held files as before.
   * Held: line-by-line equivalent, same order.
3. **Alternate, author, a shared field's "Used in" and the lifecycle guard (C3.13, C11.9).**
   * Expected: the same combination sets for field, answer list, section and document type.
   * Held: the same queries and rules, and the same Set insertion order.
4. **Empty:** a form no combination files.
   * Expected: "No combination files this form yet", 0 open cases.
   * Held: `openCases([])` resolves to 0, and `filingCombinations([])` is empty.
5. **Recovery:** a combination removed the form, and the removal was released.
   * Expected: it is no longer listed in the impact review.
   * Before SH2 it **was** listed, because the old PUBLISHED v1 survives the removal (`publish` only promotes DRAFT rows). It is now correct.
6. **Error:** the database fails while counting cases.
   * Expected: a visible error.
   * Got: "0 open cases" (`.catch(() => 0)`, impact.ts:52; the code did this before SH2). Minor m5.
7. **Wrong role:** accepting the impact as a non-author.
   * Unchanged (`need(actor, "author")`, impact.ts:69), and check_screen02_slice2.ts:55-56 still asserts 403.
8. **Across the screen boundary:** accepting the edition writes "N combinations show the change until release" to the audit log.
   * N now counts only combinations that really file the form (fixed by journey 5).

## Data underneath
* `lineageKey = formKey` on every insert (engine/import.ts:84, form-lines.ts:46, `revise`, undo upserts), and `formKey` is never updated. So the lookup by lineage selects the same rows as the old lookup by `govFormDefId`.
* Cases are created only with the default status OPEN (runtime.ts:99), and nothing changes their status. The count is identical today.
* SH2 has no write path, so no audit line is expected. Roles are enforced where they were before.

## Break it (code-level)
* Retired newest line behind an older published line: handled (pure test).
* A superseded edition's mapping: handled.
* A second channel: not tested (m1).
* Retired newest doc, check or question: not tested in the pure test (m1).
* Order of the impact list: accidental (m3).
* Purity scan bypass with a multi-line import: possible (m4).

## Score

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All four where-used answers are equivalent or corrected (review-sh2.md, Equivalence) |
| Next step obvious | 1 | No UI change. The impact tab now agrees with the library form's "Used by" |
| Plain words | 1 | Words unchanged. "Open cases" is now literally true |
| Feedback and state | 1 | Unchanged views. Counts match what is listed |
| Correct data | 1 | Old impact listed combinations that had released a removal. Now fixed |
| Error recovery | ½ | A database error is shown as "0 open cases" (impact.ts:52, already the case before SH2) |
| Accessibility and screen sizes | ½ | Not walked (no free port). The UI is untouched |
| Speed | 1 | Same query count, no per-row requests. form-uses reads lines and releases in parallel |
| Visual quality | ½ | Not walked. The Combinations list order is accidental (m3) |
| Trust and sources | 1 | No AI. The impact review says "without AI", US$0 |

**8.5/10. Pass** (8 or more, no 0). What would raise the halves:
* Make the case-count error visible (m5).
* Sort the combination list (m3).
* Walk the impact tab on a free port at 1024 px and 200 % zoom when one is available.

Could not test: a real screen reader, an intended user's unaided walk (D17/D20 stay with the founder), or the callers' database suites on this commit (the builder runs them).
