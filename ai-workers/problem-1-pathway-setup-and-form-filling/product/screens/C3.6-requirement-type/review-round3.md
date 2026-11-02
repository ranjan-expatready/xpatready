# C3.6, the part not held: review, round 3 (diff 97d8f71a..d4c3d499 only)

Commit reviewed: **d4c3d499** on `claude/lucid-franklin-vb923y` (PR #573). Reviewer: independent, did not build it. Date: 2 Nov. Live AI off, US$0.
Journey score: **8/10**, carried from `journey-test-reviewer-2026-11-02-round2.md`. Only the notice link changed in the journey (now a new tab; `check_forms_c36_requirement_type_browser.cjs` 13/13 covers its name and href); I did not re-walk it.

**Verdict: Block** (0 Blockers, 1 Major open: the fix for round-2 Major 2 leaves a race).

## Round-2 findings
- **Major 1 (one name is one type): fixed.** `document-type-names.ts` matches by `nameKey` only; `waitingDocumentType` uses the same form. Repros on a fresh copy: "Паспорт 2024" then "Брак 2024" answers 202 (its own proposal); two long names sharing 60 characters answer 202; "Café receipt" then "CAFE receipt" on another combination answers 409. No regression: an accepted accented name is reused on another combination (201, same key); a retired type named by its name is 409 "is retired" (suite).
- **Major 2 (Undo under a line): NOT fully fixed.** Sequential case fixed: Undo under a line (as type or as an alternative) is 409, in words; Undo with no line works. But the race is open (Major A below).
- **Minor 3 (non-string fields): fixed.** 400 "must be text" for an object name, a number for `proves` or `sourceQuote`.
- **Minor 1 (link): fixed.** `target="_blank" rel="noopener"`, text "(new tab)", href unchanged.
- **`check_c119_library_items.ts` change keeps its intent.** The retired type is `C11.9 test c119_unused_type`; the new name "c11.9 TEST c119 unused type" matches it by name (case, spacing, punctuation), and the case still asserts 409 `/is retired/` and no write. Without the name rule it would be a 202 proposal, so the case still fails when the rule is removed. 70/70.

## Major
**Major A. Undo versus a line add at once still leaves a line with no type.**
`api/src/studio.ts:743` checks that the type exists *outside* the transaction; the transaction (`studio.ts:746`) then takes the lock and calls `refuseRetired`, which only refuses a *retired* type (`library-items.ts:140`: `v.length && ...`), and says nothing when the type is gone. If Undo takes the per-item lock and commits between the check and the lock, the line is written for a deleted type.
- Repro (fresh copy, `wp.lmia_inside`): user-A names a type (202), user-B accepts; then fire at once, undo started 0 to 20 ms before the line add: `POST /review/proposals/undo/<batch>` (user-B) and `POST /combinations/<wp>/requirements {documentTypeKey:<landed key>}` (user-A). 40 runs: 23 line 201 / undo 409 (correct), 11 line 400 / undo 201 (correct), **6 line 201 / undo 201: the type row is gone and a live `document_requirement` still names it** (checked with SQL). Script: `/tmp/claude-0/-home-user-xpatready/3d16cc09-e6d2-52f8-9c8b-ada7fc854489/scratchpad/repro2.ts`.
- Fix: inside the transaction, after `lockItem`, re-read the types (and alternatives) and fail "Choose a document type" if one is missing, before writing. Add a test that fails without it (the existing case is sequential, so it cannot see this).
- Same data-integrity fault as round-2 Major 2 (D2), reached from the other side.

## Minors (not blocking)
1. The 33 cases are all sequential; none covers Undo racing the line add (it is how Major A passed).
2. Round-2 Minors 2, 4, 5 (stale notice after reject or rename, API-only `documentTypeName`/`proves`, 1280 px wrap) unchanged, not new.

## Checks run on d4c3d499 (fresh isolated copies, one at a time, ports 4458/4459 only)
`check_forms_c36_requirement_type.ts` 33/33 · `…_browser.cjs` 13/13 · `acceptance/C3.6.test.ts … wp.family` 18/18 (path is `studio/acceptance/`, not `tests/acceptance/`) · `check_c119_library_items.ts` 70/70 · `check_c119_library_items_browser.cjs` 30/30 · `check_forms_c1113_acceptance` 21/21 · `check_forms_c36_answer_values` 50/50 · `check_s6_p149` 73/0. All match the builder's numbers. Web rebuilt. The suites rewrote four c119 screenshots; restored with `git checkout --`.

## Could not check
A real screen reader; a headed browser; an intended user's unaided walk; `graph.mjs`; the full `run-suites.sh`.

**Verdict: Block.** Fix list: (1) Major A: re-check that the type and its alternatives exist inside the locked transaction in `saveRequirement`, with a racing test.
