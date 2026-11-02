# G1 (C5.4) build notes

## PR 2a part 1: the pure engine (local, 2 Nov)
`engine/source-register.ts` (no I/O, outside `validate()`) and `tests/check_g1_source_register.ts`: **28/28** (21 at first; +2 for Devin's finding, +5 for the reviewer's MJ-1 and the mutants that survived).
`graph --check` exit 0; `count-any` unchanged (423); `check_setup_checklist` 50/50.

**Count on the work-permit release ("With an LMIA", `p3/releases/c1-v3`):** 19 numbers on 17 items, as the
concept says (18 ×5, 90 ×5, 30 ×4, 5 ×4, 1 ×1). With `dates: true` it is 27 (7 June 2019 ×6, 1 November 2024 ×2).

## Build discoveries (where the concept met the code)
1. **Short name.** The QA-82 helper is `factName` (`engine/render.ts:68`), and it gives "Age years", not "Age in whole years". The refusal therefore reads "Form IMM 5707: Age years: at least 18 has no source entry. …"; concept §4–§5 and both boards now say "Age years".
2. **A check's item words are long.** A check's `message` is its plain condition plus the user action (`engine/import.ts:117`), about 200 characters. A short check label is still missing. Proposal for PR 2b: show the first sentence only.
3. **Fees have no `where` of their own.** Every engine `where` must be in `WHERE_STEP` (`tests/check_setup_checklist.ts:149`). Fee numbers report "People", because fees follow the filing modes there. **Tech lead to confirm.** It is engine-level only until R2 S7a.
4. **Question key.** `<combination>/question:<lineage>`, where "Questions". BR-1 named none; there are none in the sample.
5. **Field-map box conditions** (`snapshot.field_maps[].entries[].condition`, `engine/snapshot.ts:149`) are left out as form-box logic. **Tech lead to confirm.**
6. **Validity months** (`{op:"issued_within_months", months}`, `case-checklist.ts:33`) have no field leaf. Address: `months`; words "Issued within months: at most N".
7. **Signature:** `publishedNumbers(snapshot, {dates, feeLines})`.
8. **How k is counted:** every leaf with the same field and operator, in reading order, whatever its value (0s included), so a clause inserted on another field never shifts it. The suite proves the 0 case (`case.funds_cad|gte|2`).
9. **Numbers stored as text (review MJ-1 on #558).** The predicate contract allows text on gt/gte/lt/lte, and the save check (`checkCondition`) does not test value types (only gates run `valueProblems`). "18" on gte is now a published number; text on eq/neq stays an answer code. **For the tech lead:** the save check could refuse text on an ordering operator; that is a separate row.
10. **A record's own cite wins over an older entry (Devin on #558).** Trade-off for the tech lead (BR-4 against BR-6): a validity rule moved from 6 to 12 months whose own quote still says 6 now passes, where before its old entry caught it. Recommend: in PR 2a, a validity rule counts as sourced only when its quote contains its months in digits.
11. **Not counted, for the tech lead:** numeric `in` lists (none in the sample), and "plus 5 years" written only in words in the derived field `person.venezuelan_extended_passport_expiry` (a published number with no leaf). Recommend: derived calculations as a later row.
12. **"None published" without a reason** counts as answered for now; it narrows to `{reason}` when the ⚑ reason column is agreed.
