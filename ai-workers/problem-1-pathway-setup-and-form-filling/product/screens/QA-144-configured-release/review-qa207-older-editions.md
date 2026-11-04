# Review: PR #937, QA-207 older editions (HEAD d92c32736)

The reviewer did not build this. US$0: no server, no isolated copy, no model call (the caller's rule for this check).

## What was checked
- **Current forms are unchanged.** All 22 `forms/` labels in `official-sources/ircc/manifest.json` match the printed pattern, and so does every label the converter sees for a current form. Only the 2 `previous-editions/` labels are descriptive. Because of `convert.ts:57`, a printed label always wins.
- **The known edition is trusted.** `job.known` is written only by `Sources.ensureJobFile` (`sources.ts:285`), only when the edition is printed, and from `printedEdition()` (the intake's FormEdition by checksum, `sources.ts:368`). `launch.ts:68 knownOk` refuses a non-printed one. The converter also refuses one (`convert.ts:56`). The approval's edition still comes first (`launch.ts:131`).
- **reconvert is safe.** When the old stamp is descriptive, it fails `PRINTED_EDITION`, so the label is kept. When a current form's stamp is printed, the manifest label wins anyway.
- **Money is unchanged.** The only line changed in `launch.ts` is the call to convert a finished answer (`:131`). Reserve, ledger, ticket and refusal are untouched.
- **Intake paths are unchanged:**
  - C2.4 "Older edition: not used", `older_in_library` and `new_edition_held` return before `attach` (`intake.ts:301`, `:396`).
  - Row 1's off-list copy has bytes appended (`demo.ts:417`), so it matches no manifest checksum and goes the approved-source route.
  - `wave1.json` has no previous editions.
- **Test:** `check_qa207_previous_editions.ts` passes 5/5. Reversing the order in `convert.ts:57` (either way) fails test 1 or test 2. Dropping the KIND entry fails test 4.
- **CI:** the shards were still pending when this was written. Their result is not confirmed here.

## Findings
1. **Major. Apply files the 2021 map under a new form called "IMM 5476 previous edition".**
   - **Where:** `sources.ts:874-891` and `:921-928`. This PR makes the step reachable for the first time: a previous edition is now a Form, so it can be read, drafted or replayed, and then applied.
   - **What goes wrong:** `apply` still takes `item.edition` from the manifest, which is the descriptive label.
     - `formKey` becomes "IMM 5476 previous edition" (`:882`).
     - `govFormDef.upsert` creates that form (`:885`).
     - The intake's "IMM 5476 (11-2021)" edition, found by checksum, is moved onto that new form (`:890`).
     - With no FormEdition, a new edition is created under the descriptive label (`:891`).
     - The combination gets a form line "IMM 5476 previous edition" (`:921`).
   - **Effect:** #885's row-17 path (replay, then `sources.apply`, `demo.ts:478`) would leave IMM 5476 with no 2021 edition.
   - **Fix:** in `apply`, when `official.edition` is not printed, use `await this.printedEdition(a)`. Refuse if that is not printed either. Add a check that the applied 2021 map lands on form key "IMM 5476" with edition "IMM 5476 (11-2021)".
2. **Minor.** The attach message words still name the descriptive label (`sources.ts:160-162` uses `item.edition`). They should use the `edition` resolved at `:158`.
3. **Minor.** The edition lookup at `sources.ts:158` (by checksum) has no test. Test 2 says "meet the contract" but only checks the pattern. It does not run the contract.
4. **Minor (idiom):**
   - `sources.ts:158` writes the regex inline. `EDITION` (`:86`) already holds it.
   - `convert.ts:48` declares a third copy of the pattern (others: `studio/engine/rounds.ts:23`, `launch.ts:35`).
   - `officialLibrary()` (`sources.ts:981`) still reads `KIND` directly, so `/official-library` lists previous editions as "Official file". It should use `officialKind`.
5. **Should.** The converter accepts any printed known edition and does not check the form code. A known "IMM 5257 (…)" on IMM 5476's file would be stamped. Requiring the known edition's code to match the start of the manifest label (`convert.ts:56`) closes this.

## Journey test
**Not run, not scored.** The caller ruled no server and no isolated copy. There is no UI change, and finding 1 is on the apply step, which a journey would reach next. The journey score for this check is open until it is run.

**Verdict: Block**: fix finding 1 (`sources.ts:882`, `:888`, `:891`, `:921`, `:926`, `:928`) and add its check. Findings 2-5 can go in the same push.
