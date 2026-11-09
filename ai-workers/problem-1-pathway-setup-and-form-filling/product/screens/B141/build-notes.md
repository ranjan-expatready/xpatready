# B141 · C7.8 build notes (screens lane, 9 Nov 2026)

Built from `concept.md` revision 2 (Lead 37 approved it for building on #1248). Branch `claude/intelligent-noether-qkzc6a-b141`, origin/main merged once (b9647ea69).

## Where each founder answer lives (one place each, P-390: reversible)
* **F1** (a mapped form with no passed trial is "Blank official PDF" with the reason): `engine/runtime/added-forms.ts` `kindOf`.
* **F2** (a blank added form with no completed copy is a CRITICAL line, passed only with a reason): `engine/runtime/readiness.ts`, the `blank` branch and its one new code `hand_filled_copy` (CODE_WORDS "Filled by hand: upload the completed copy"); the migration adds it to `readiness_pass`'s two code lists.
* **F3** (a release form, applying now or not, is not addable; the refusal names the answer that decides it): `added-forms.ts` `refusalOf`, with the release's own rule read by `form-additions.ts` `releaseNow` (engine/render.ts, as Prepare reads it).

## The join point (M1)
`withAdditions(snapshot, additions)` in `engine/runtime/added-forms.ts`; `Runtime.snapshotOf` returns it (the reached case carries its live additions), and the fill job joins the same way. A line's `who` is `person:<subject id>` (engine/resolver.ts `ONE_PERSON`): one named person, never a role; no combination key or program branch in engine code (P-425). The release fingerprint is checked on `Runtime.releaseSnapshotOf` (case-prepare.ts), never on the joined snapshot.

## Tech lead's questions, decided from the concept's recommendations
* **Q1** yes: an added form adds no client questions; a box whose fact is not on file stays blank and is listed "Not on file" (the panel's coverage list; Ready to file's existing "mandatory field left empty" line, passable).
* **Q2** yes: PDF upload or Paper only (`form-additions.ts` ADD_CHANNELS; a database check too).
* **Q3**: C3/C4's changes to `fill-case.ts` and `case-prepare.ts` are on main; built on main as it is today, no wait.

## Decisions made while building (say so, never silently)
1. **The same form for two people on one case** is one form line naming both (`person:<a>,person:<b>`); the second addition copies the first's frozen form, channel and signature ("one form is filed one way on a case"), so a lookup by form number never mixes two lines or two editions.
2. **"+ Add a form"** sits after each filing's group of form rows (the forms list is per person; rows are grouped by the filing the person is on, from the same /prepare read as Ready to file).
3. **The one upload** of a blank form's completed copy is C8.1's signed-scan table and route (`POST /runtime/items/:id/signed-scan`), with no printing steps: it is the signed copy when it is signed (M5). Printing steps on a blank form are refused in words; generating a copy of it is refused in words.
4. **Signature default:** signed by hand and scanned on a PDF upload, signed in pen on Paper; signer the person, or a parent for a minor (`parent_for_minor`, C8.1's rule); switched off only with a reason (stored, database check).
5. **Frozen fingerprint** is over key-sorted JSON (`stableJson`): PostgreSQL's jsonb stores keys sorted, so a plain JSON.stringify fingerprint never matched on read (found in the first try on the copy).
6. **`snapEntry` / `snapField`** were lifted out of `engine/snapshot.ts`'s `assemble` unchanged, so a frozen form has exactly the release's shape.

## On the demo data (configured checkpoint)
* The only library form with a passed trial that the Visitor visa release does not hold is **IMM 0008** (a barcode form). Added for a person it fills from the case (coverage shown), its copy is made and its trial counts. Its lock is refused for four answers its own map refuses ("code_list: … codes as listed in the inventory" on country and language boxes): that is IMM 0008's map on the demo, on any case, not the add. The pack checks a lock is never refused for the trial.
* Blank picks are the library forms with no passed trial (IMM 0008 DEP, IMM 5604, …); IMM 1344 is refused as a blank barcode form.

## Checks
* `acceptance/C7.8.test.ts` 14/14 (isolated copy, checkpoint), `tests/runtime/check_c78_added_forms.ts` 16/16.
* Suites of the touched files (each on a fresh isolated copy where it needs a server): check_readiness_pass_codes 4/4, check_c76_readiness 91/91, check_sh3_resolver 85/85, check_c76_readiness_api 23/23, check_c81_signing_api 48/48, check_vv_prepare_api 42/42, check_c3_11_signed_scan 32/32, check_c82_filing_record_api 24/24, check_s5_slice1 61/61. `--changed` selects all 385 (shared files): the PR's GitHub check runs the rest.
* `graph.mjs --check` exit 0; `count-any.mjs` 418 = base.
* Walk at 1440 px: `walk/01…11` (Prepare application → panel → fills with coverage → tagged row → blank → release form refused → blank row → Ready to file's CRITICAL line → completed copy uploaded → Remove asks a reason); no page error.
