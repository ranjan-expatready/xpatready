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

## Founder's answer (P-279, 2 Nov ~16:45 UTC, relayed by the tech lead on #558): dates count
`publishedNumbers()` now walks cut-off and in-force dates by default (`dates: false` turns them off). The work-permit
release publishes **27** numbers (the 19 plus 7 June 2019 ×6 and 1 November 2024 ×2). The import cites only where its
quote states the number in digits, so the "held back" count after Reset grows from the concept's 11 by the dates the
import cannot cite; PR 2a's API suite states the real figure.

## PR 2a part 2: wiring, API, helper (local, 2 Nov)
Built against the tech lead's approval on #558 (decisions 1–5), PR 1's final shape (reviewer MJ-1 on #569: a Sample
answer is its own kind of entry) and his three points from G2's challenge on #568.
* **Engine** (`engine/source-register.ts`): a Sample entry passes only with `demo: true` and is refused elsewhere in
  words that say Sample; `none_published` is `{reason}` (at least 10 characters); a problem's `item` is the item as
  `validate()` names it and its `message` is the sentence after the item, so `problemWords()` reads §5's sentence;
  `numberState()`, `statesInDigits()`, `frozenSources()`, `sourceChanges()`. A validity rule counts as cited only when its
  quote holds its months in digits (decision 4). Suite 39/39.
* **Snapshot** (`engine/snapshot.ts`): `source_entry` read once per workspace in `buildSnapshots()`; `snapshot.sources`
  only when an entry answers a number the snapshot publishes. `diff()` lists "Source" lines (expert signs);
  `isDemoSnapshot()` is true when a frozen source is Sample (the tech lead's condition; concept BR-10 said "unchanged").
* **Gate:** `draftSourceProblems()` in `studio.problems()` and in the catalogue's `draftProblems`, both only for a draft
  that differs from its release or has none (#568: a Live row with no draft changes lists none), never `relProblems`;
  listed after the validator's own problems. The Release page holds a row with "n numbers have no
  source entry: fix on Review and release."
* **Shared refusal** (`api/src/refusal.ts`, for G2 too): `refuseBlocking()` on Submit 400, Approve 409 and
  `releaseRows` 409; a gate tags its problems `gate: "<type>"` and adds its count sentence to `GATE_WORDS`.
* **Workspace key** (`api/src/core.ts`, for G2 too): `STUDIO_WORKSPACE_KEY` (default `demo`), `isDemoWorkspace()`.
* **API** (`api/src/source-register.ts`, `contracts/sources.ts`): GET/PUT as concept §6; `POST …/sources/sample` is the
  demo seed's Sample answer (author, demo workspace, Sample combination only), which the configured load also runs.
* **Import** (`engine/import.ts`): the release's own citations, before Release 1 is frozen: **10 of 27** (18 ×5, 5 ×3,
  1 November 2024 ×2, written "November 1, 2024" in IRCC's words). **17 are held back after Reset (dates on)**: 90 ×5,
  30 ×4, one year ×1, the exceptional-situation letter's 5, and 7 June 2019 ×6 (no quote states it).
* **The Visitor visa** (`tests/runtime/setup_visitor_visa.ts`) publishes only its fee-table numbers today, so its release
  goes through as a Demo release with nothing to seed; the API suite adds "From age 18" to show the Sample path.
* **Helper** `tests/fixtures/source-every-number.cjs` (`sourceEveryNumber(api, id, {cite})`, API only).
* Item words read a field code inside an item's own text by its short name (QA-82; R-37's "then" names one).
* API suite `tests/check_g1_sources_api.ts` 44/44; engine suite 40/40.

**CI blast radius (challenge M4).** 106 suites submit, approve or release, or name the work permit; all were run on
isolated copies (ports 4480–4482) with PR 1's final answer CHECK applied by hand. G1 refused 17 of them; each now answers
its numbers through the API before it submits (`sourceEveryNumber`), or, on the Sample Visitor visa, asks the demo seed
(`POST …/sources/sample`): c18_copies, c41_section_order, c48_sqr_release, forms_w102_fix, pqr, s5_leadcheck,
s5_slice1, w115_slice1, w115_slice2, w115_slice3, who_fills, vv_checklist_api, pqr_browser, s5_slice2_browser,
screen01_browser, studio_browser, x1_tabs_focus_browser; and `acceptance/lib/setup_vv_m3.ts` (run by c69_gates). No
check was weakened. The other failures of the first, parallel run were the runner's own (a shared spend ledger, two
suites on one isolated name, saved-run files of one suite seen by another) and pass alone. Runtime R1 (setup, r1c, r1d,
r1a) and check_case_engine pass.

**Where the concept turned out different:** BR-1 (`concept.md:25`): 27 numbers with dates and 17 held back, not 11; BR-10
(`concept.md:38`): `isDemoSnapshot` now reads Sample sources; BR-7 (`concept.md:33`): the catalogue gates only rows with
changes or no release; BR-4 (`concept.md:29`): fee numbers report `where` "People" (decision 2); §4 Release page
(`concept.md:44`): the held reason is "17 numbers have no source entry: fix on Review and release."
