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

## PR 2b: the screens (built 2 Nov, after #587)
**Split (one small item = one PR).** PR 2b is the Review block and the Source panel, the two boards a release needs. The
panel's other entry points (the RuleDialog section "Sources of its numbers", a check row's "Sources" action, the "Source"
link under a form line's "From age") are **PR 2c**. Each reuses `SourcePanel` with the item it opens on; none needs a new
API.
* **Review and release** (`web/src/pages/review.tsx`, `web/src/components/unsourced-numbers.tsx`): "Numbers without a
  source (n)", grouped by item, each line in the refusal's own words with **Add source** (or **Check source** when its
  number changed). The first six items show, then "Show all n items". The context line counts the sample load's own
  citations and the fee-table lines. The validation block no longer repeats these numbers: it counts "other" errors.
  When every number has its answer, the block says so in one line. A Live combination with no draft change lists its
  numbers in neutral colours, saying they block the next submission once the draft changes (BR-7 gates only a changed
  draft).
* **Source panel** (`web/src/components/source-panel.tsx`): one card per number of the item. States: missing (opens on
  Official source, the item's own quote and today's date filled in), cited, None published, Sample, changed ("The source
  was written for 18; the number is now 19", **Still correct for 19** / **Write a new source**), field errors in §5's
  words on their fields, conflict (409: who and when, **Reload theirs** / **Keep mine and save again**), read only for a
  non-author ("Only the configuration author adds sources."), empty, loading. Fee-table and validity-rule numbers show
  read only (BR-4, no fee card). The "same source for the other 18 in this item" box writes the twin in one go.
* **Where the build differs from board 2:**
  1. **The address picker** offers the addresses this combination already cites (an HTML list), not the combination's
     approved official pages: no endpoint lists those with their addresses today. A later row can feed the same list.
  2. **"Still correct for 19"** re-saves the same answer, so a citation whose words state 18 is refused on the words, and
     the editor opens with the error in place. That is the agreed rule (the words must state the number), not a bug.
  3. **The None published guidance** stays in view above the reason, also while the reason shows an error.
  4. Item words for a check show the first sentence (build note 2), the whole text on hover.
* **API** (additive): each number carries `item_quote`, its item's own source quote (`itemQuoteOf()`), for the panel.
* **Checks:** `tests/check_g1_source_register_browser.cjs` **41/41** (1440, 1024 and 400 px; axe on the block, the
  panel with errors, the conflict and the all-sourced state; keyboard in and out). API suite 51/51 (`item_quote`).
  `check_s5_slice2_browser` 63/63 (it reads the validation list). Web `tsc` 0; `count-any` 422 (unchanged).

### PR 2b, after the reviewer (Block, 7.5/10) and the breaker (4 Majors), both on b9743d5a
* **MJ-1 / break M2:** "From the sample load" now means *last saved* by the sample load (`updated_by`), so a person's
  save is credited to them. API check plus browser check.
* **MJ-2 / break M1 (WCAG 2.4.3):** closing the panel returns focus to the button that opened it, or to the next
  button when that number left the list, or to the heading. `Panel` takes `returnFocus`. The panel now renders also
  when the last number is answered, so saving the last one no longer makes it vanish. Browser checks after a save and
  after Escape.
* **Break M3:** a save conflict shows what the other save holds ("Saved now: …") before Keep mine; the same author in
  another window is told "You saved this source in another window", never "someone else". API checks for both.
* **Break M4:** a typed, unsaved source asks "Discard the source you typed? It is not saved." before Escape, the
  overlay, the X or Close throws it away. `Panel` takes `confirmClose`. Browser check.
* **Minors fixed:** View (read only) for a non-author, and "No source yet" on a missing card (review m1, break m4); a
  moved number answers "The number changed" with Reload (review m2, break m3); a changed line names its number (review
  m3); the fee count line's tooltip names each line's quote kind (review m4; API `quote_kind`); the all-set line says
  "has its answer: an official source or 'None published …'", with how many came from the sample load (review m5,
  break m8); a failed twin save is named (break m2); long words wrap (break m1); the date read defaults to the
  person's own day and the server accepts up to UTC+14 (break m5); the page note stops at 200 (break m6); the link
  reads its host (break m7); focus moves to the first field once the numbers load (break m9); same-named buttons are
  told apart by their item (break m4). Tests added for the item quote, the twin save, the moved 409 and focus
  (review m6).
* **Noted for PR 2a's rules (not this PR):** French and Arabic-digit quotes are refused; a quote of zero-width
  characters around a digit is accepted; number words show dates as 2019-06-07.
* Browser 55/55, API 54/54.
* **Reviewer round 2 (Approve, 9.5/10 on 3aba0266):** its flaky-check Minor is fixed (a card's state is read once the
  refetch lands). **Follow-up, not built:** the browser's Back still discards a typed, unsaved source without asking,
  as the app's existing Dialog guard does; a `beforeunload` plus route block belongs in a shared row for every panel.

## PR 2c: the panel's other entry points (built 2 Nov, after PR 2b)
* **One component, three places** (`ItemSources` in `web/src/components/source-panel.tsx`), each opening the same Source
  panel on its item, with focus returned to the control that opened it:
  * **Rule dialog** (`pages/configuration.tsx`): a section "Sources of its numbers" lists each number with its chip and
    says the numbers are the draft's as saved ("Save a change first to give a new number its source"). An unsaved edit
    in the dialog is not yet a published number, so it cannot be sourced before the save.
  * **Checks table:** a "Sources" column; a check that holds a number offers "Sources (n)", with "n no source" when
    any is held. A check added without a source quote (Sample, illustrative) opens the panel with §5's note "This check
    stays Sample: …" above its numbers (m3).
  * **Form line drawer** (`pages/workspace/forms.tsx`): a saved "From age" reads "Needs a source before release."
    (was "Sample."), with its chip and a "Source" link. An empty "From age" reads "Leave empty for any age."
* No API change. Browser `tests/check_g1_source_entry_points_browser.cjs` **20/20** (axe on each place, focus return, a
  None published answer saved from the form line).
