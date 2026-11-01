# Review: C7.6 part 1, "Ready to file" rules per filing (engine only, M3-E)

Reviewer: a fresh agent that did not build it · 1 Nov 2026 · commit **a8e44952** (`m3a3-c76-readiness`, one commit on origin/main).

What I read and ran:
* **Bar:** concept r5c (BR-8, BR-9, BR-19, BR-21, "One left list"); P-71, P-72, P-136, P-144, P-151, P-155, P-168.
* **Contract and pack 4:** `acceptance/C7.6.test.ts`, the C7.6 row of `acceptance/M3-CONTRACT.md`, `acceptance/lib/m3.ts` `Prepare`.
* **Built data it consumes:** `contracts/runtime.ts` `Readiness` / `CaseForm`, `contracts/forms.ts` `SIGNATURES`, and `prisma/schema.prisma`.
* **Checks run:**
  * `check_c76_readiness.ts`: 34/34, twice.
  * My edge probes: `/tmp/c76probe/probe.ts`, not committed.
  * `tsc -p api/tsconfig.json`.
  * `graph.mjs --check`.
* No server and no port. US$0, no model calls.

Journey test (the one score for this check): `journey-test-reviewer-2026-11-01.md`, **7 / 10, fail**.

## Verdict: Block (commit a8e44952)
The classification is right: every P-168 hard block and every P-71 block is present, and the warnings are the ones BR-9 lists. The tests are honest and fail when a rule is removed. Four Majors stand: two produce wrong block results on data shaped like what is already built, and two leave out or loosen a rule.

## Issues, ranked
**Major 1 (Must): accepted-until dates fail open; `today` is not normalised.**
* `readiness.ts:73,100,106`: `isDate` accepts only `YYYY-MM-DD`.
* An accepted-until given as a timestamp (`2026-10-01T00:00:00.000Z`, which Prisma `DateTime` gives) is silently ignored. The expired edition only warns, and the expired fee disappears entirely (probes 1, 1b). That is a hard block (P-151, BR-9 3) failing open.
* An ISO `today` blocks on the accepted-until day itself (probe 2).
* Fix: compare `slice(0, 10)` of both. Throw on a value that is not a date rather than skip it. Add a test for each.

**Major 2 (Must): `Signature` is redefined with `"TYPED"`, but the contract and database say `"TYPED_NAME"`.**
* `readiness.ts:23-24` against `contracts/forms.ts:19` and schema `SignatureKind`. `Channel` is also redefined (`readiness.ts:23`) instead of being imported from `contracts/forms.ts:9`.
* Part 2 or /prepare passing the stored value (CI runs tsx and does not type-check) turns every typed-name line into a false block: "IMM 5257 … must be signed in pen" (probe 3).
* STANDARDS §4 [M]: domain names come from one place.
* Fix: import `Signature` and `Channel` from `contracts/forms.ts`, and test with `TYPED_NAME`.

**Major 3 (Must): passes cannot be scoped to one finding, and a code-wide pass covers warnings that appear later.**
* `readiness.ts:109` drops `g.id`, so a finding line has no `item`. A pass naming one finding covers nothing (probe 4b). The only working pass is code-wide, and it silences every finding, CRITICAL included.
* `readiness.ts:112`: a pass with no `item` also covers a document that goes missing after the pass was written (probe 8).
* Concept BR-9 and AG-07 BR-26 have a person pass *each* warning with a reason. BR-19 reopens a waived finding when its fact changes.
* Fix:
  * Set `item: g.id` on finding lines.
  * Give `Pass` the items it covered when it was recorded (`items?: string[]`), so a later warning is open again. Pack 4's code-level route can still record them.
  * Test both cases.

**Major 4 (Must): no fee warning before its accepted-until date.**
* P-151 (1) and BR-9 (3): "a form edition **or fee** no longer current warns with 'Adopt update' until IRCC's accepted-until date".
* `Fee` (`readiness.ts:50`) has no `superseded` field, and `readiness.ts:106` only blocks after the date. A replaced fee with a future date gives nothing (probe 5).
* Fix: add `superseded` to `Fee` and warn `edition_superseded` before the date, mirroring line 101. Add a pass test and a fail test.

**Minor 1 (Should): BR-9's "each saying what it unblocks" is not in the words.**
* The lines say the fix but not that clearing it unblocks Ready to file for this form. Pack 4 C7.6-1 names it too.
* Either add it to the words or add a field /prepare can show.

* **Minor 2 (Should): `cannotPass` shows internal keys to people.** `readiness.ts:130-131` returns `"representative_review" blocks…` and `There is no warning "nope"`. Part 2 will return these as 400 or 409 errors. Name the warning in words instead.
* **Minor 3 (Should): `passProblem` checks the 500-character limit on the untrimmed reason** (`readiness.ts:124`): 499 characters plus trailing spaces is refused. Trim once.
* **Minor 4 (Should): a missing signature is always owed by the client** (`readiness.ts:93`). IMM 5476 is also signed by the representative. Owe it to each signer's role, or let the input say so.

**Minor 5 (Should): the test file adds a project type error.**
* `tests/check_c76_readiness.ts:98,101`: `as const` sits on the last literal only, so `channel` and `signature` widen to `string`, which TS2322 rejects under `tsc -p api/tsconfig.json`.
* Use `fc.constantFrom<Channel>(…)` instead.

**Minor 6 (Should): the first property is close to a tautology** (`check:105`). It restates line 118's `ready` formula.
* Make it say something independent. For example: any form with `needsValidate && !validatedCurrent` on PDF upload or Paper, and not Not needed, gives `ready === false`.
* Also add a test that a pass naming a block code does nothing at run time. Today only the types stop it.

**Minor 7 (Should): record the "entered" difference.**
* P-136 counts an *entered* item out of date as a block. P-168 and concept r5c make "an entered Online section out of date" a warning, and the engine follows r5c (`readiness.ts:16,103`).
* That follows the newer decision, but say so in the header or in `challenge.md` so the difference is not settled silently (AGENTS.md rule 2).

**Fit notes for /prepare and part 2 (Minor, no change needed now):**
* `CaseForm.applies === false` lines must be left out by the caller.
* `owesFact`, `signers`, `signed`, `outOfDate` and edition dates have no built source in `contracts/runtime.ts` yet (C8.1, W1-16).
* Pack 4 C7.6-20a sets only an accepted-until date, so /prepare must also set `superseded`, or no warning appears (probe 6).
* "You" in the left list is the viewer, so /prepare maps `staff` and `representative` to it.

## Checked and correct
* **Block or warn:**
  * Blocks: `missing_facts` and `fact_problem` (QA-122, optional facts included), `open_check`, `out_of_date`, `missing_signature`, `barcode_not_validated` (PDF upload and Paper only), `edition_expired`, `representative_review`.
  * Warnings: `missing_document`, `finding` (CRITICAL too), `edition_superseded`, `copy_stale` and `entered_out_of_date` (Online only).
  * Nothing that should warn blocks, and nothing that should block warns.
* **Edge cases:**
  * The accepted-until day itself is still accepted (`>`, `check:60`).
  * Expired means a block and not also a warning.
  * Not needed lines are skipped first.
  * Online has no barcode block.
  * A typed name waits for nothing.
  * Hand-scanned and pen lines block until signed.
  * A reason under 5 characters, or blank, is refused.
  * A pass for another item does not count.
  * A pass never clears a block (`check:81`).
* **Tests:** every rule has a pass and a fail case. Removing each guard I tried makes a named test fail: the Not needed skip, the Online guard, the `else` on superseded, `>` changed to `>=`.
* **Words:** form and person named, no percentages (property test), no AI, US$0.
* **No explicit `any`.**
* **Codes:** match the `M3-CONTRACT.md` C7.6 row. The output fits pack 4 `Prepare.readiness`.

## D1–D20 (engine only)
D1 3: classification right, P-151 fee warning missing (Major 4) · D2 3: dates fail open, the signature value is wrong (Majors 1, 2) · D3 2: `Signature` and `Channel` duplicated from contracts · D4 4: no unreachable rule; superseded needs the caller (fit note) · D5 3: a later warning is covered by an old pass (Major 3) · D6 4: passes keep who, when and why · D7 4: AI findings only warn and keep their severity · D8–D9 n/a, no UI · D10 3: internal keys in `cannotPass` · D11, D12, D13, D14 n/a, no UI · D15 5: pure, no queries · D16 4: pass and fail per rule; one weak property; new type error · D17 simulated only · D18 4: each line names its form, person and owner · D19 n/a, part 1 of 2 · D20 simulated only.

* **Graph:** G1–G6 show nothing for this item (`readiness.ts` is imported by its check). The only open G3 line, `GET /attachments/:id/file`, is unrelated.
* **Could not check:** any UI, keyboard, axe or widths (none exist); real built input from /prepare (not built yet); a server-side race (no store until part 2).

**Verdict: Block.** Fix before approval: Major 1 (dates), Major 2 (the contract's `Signature`/`Channel`), Major 3 (finding `item` and pass scope), Major 4 (fee warning before its date).
