# C3.6, the part not held (a document type named while adding a requirement waits as a proposal): review

Commit reviewed: **cc83cbdb** on `local/c36` (base `origin/main` f02ef514). Reviewer: independent, did not build it. Date: 2 Nov.
Isolated copy `forms_c36r` on :4457, live AI off, US$0. Journey score: **7/10** (`journey-test-reviewer-2026-11-02.md`).
A follow-up commit 2db95187 (tests only) landed during this review. I did not review it; where it touches a finding, I say so.

**Verdict: Block** (1 Blocker, 3 Majors open). In skill terms: *Ship after fixes*.

## What holds
- Scope: no held guarded Add (P-251, P-252, P-253). No search-first, no co-pilot, no required reason or source. It only sends the hand-made type through the one door, as the finish plan row and P-265 name.
- `saveRequirement` (api/src/studio.ts:688-713) writes no type, no ADD and no line. It makes one `document_type` proposal: rules origin, Check band, lands on the library, scoped to the combination, run on a LOCAL `requirement_type` job at US$0, with an audit line.
  - The same exact name a second time is a 409, in words.
  - 4 parallel POSTs make 1 proposal (202, 409, 409, 409). The advisory lock holds.
  - The author duty is enforced on the server (403). The name's role and length (121 characters) are refused (400).
  - A retired type is still refused (409).
- POST answers 202 with `proposalId` (main.ts:66). The `.then` keeps the 201 on every other path.
- UI: the toast shows the server's words, and the field hint says the type waits.
  - Accepting on To review lands a DRAFT type with its WAITING ADD, credited to the combination.
  - The type then appears in the dialog's select (the `documentTypes` route lists DRAFT rows), and the line goes in (201).
  - The UI is not a dead end. The author re-enters the line: see m2.
- Tests at cc83cbdb on :4457:
  - `check_forms_c36_requirement_type.ts`: 10/10.
  - `acceptance/C3.6.test.ts … wp.family` on a fresh copy: 18/18. It was 17/18 on main (CAPABILITIES.md C3.6 row, "refused 400"), so it fails before.
  - The new check's first assertion (202) also fails on main, where `newTypeName` answered 201.
  - `check_c313_reuse.ts` and `check_grounding_db.ts` passed in the builder's run (`var/suites`, 11:50).

## Blocker
**B1. The change breaks suites owned by other lanes, and CI runs every suite because `studio.ts` is a shared file.** Run at cc83cbdb on :4457:
- `check_screen02_fix.ts` 59/61: line 179 expects 201 for `newTypeName` and gets 202.
- `check_vv_checklist_api.ts`: 5 FAIL, then a TypeError. The "Police certificate" line is now only a proposal, so `policeKey` is "".
- `check_c119_library_items_browser.cjs` 24/26: line 136 reads `made.body.lineageKey` from a 202, and the `c119_own_new_type` row never exists.

2db95187 updates the first two, not the third.

Fix: in each, propose, accept as user-B, then add the line with the landed key, as `check_c313_reuse.ts` now does. Run the full set (`run-suites.sh`, not `--changed`) before asking again.

## Majors
**M1. Duplicate library types get through, and the reuse check no longer matches the key the lander writes.** Reproduced on :4457.
- Reuse looks up `slug(name)` (studio.ts:690). The lander keys with `slugKey` (proposals.ts:222, 291): accents stripped, words kept at 60 characters, a hash when empty. The two keys differ for accented, long (61-120 characters) and non-Latin names.
- **Same combination:** "Relevé bancaire" accepted as `releve_bancaire`, then named again, gives a 409 in technical words: "Proposal 1 (document_type) is already in the library as releve_bancaire … propose reusing it instead". On main this name was reused.
- **Another combination:** the same name gives a 202, and accepting it lands `releve_bancaire_2`. Library › Document types now lists two "Relevé bancaire".
- **Case:** the waiting check matches the exact name only (studio.ts:698). "Hotel voucher" (one combination) and "hotel  VOUCHER" (another) both wait.
- **Root cause:** the default `proves` names the combination (studio.ts:694, `Asked for by a document requirement on "<label>"`). Identity is name plus proves (P-149 (2)), so the same name from two combinations is never a duplicate. The second person also reads this text as "What it means".
- Fix:
  - find an existing type by normalised name (live or retired), or export and use the lander's key function;
  - match waiting proposals by `normalizeLabel(name)`;
  - keep the combination out of `proves`.
- Add a passing and a failing case for an accented name and a cross-combination name.

**M2. Waits that tests rely on now pass silently** (STANDARDS: a wait a test relies on fails loudly).
- `acceptance/lib/setup_vv_m3.ts:68-69` (pack 4 setup, J7) checks `r.status < 300`. It printed `PASS S6 document requirement: … — 202` for all three lines, and no line was written (3 proposals waiting).
- `check_screen01_release_race.ts` exits 0 but now tests nothing. Every round reads "late add 202 → (no line)" and "release 409 (no changes)".
- `tests/fixtures/scale_100.ts:71,80` adds no lines: the first combination proposes, the other 99 get an unchecked 409.
- Fix: for an unknown name, propose and accept, then add the line, or seed the type. Assert 201 where a line is expected.

**M3. A behaviour change to `api/src/studio.ts`, which WAY-OF-WORKING "Shared files" says is "additive only".** The commit removes the direct create and changes what POST answers. B1 and M2 show three other lanes' suites depend on it. Its first line does not name `studio.ts`. The PR's first line must name it, and the tech lead must read it before merge.

## Minors
- m1. PATCH with a new name returns 200 and `{status:"waiting"}`. The line keeps its old type, but the message says "Add the line with it". Say "change the line's type once it is accepted" on edit (or refuse a new name on edit).
- m2. The line's details are dropped on a wait. `work.pendingRequirement` (studio.ts:707) is never read. `attachMode:"BOGUS"` is stored unchecked. The dialog closes, and whose, mode, condition, source quote and note are lost. The "ok" toast that tells the author to come back lasts 4.5 s. Validate `attachMode`, and either drop `pendingRequirement` or keep the dialog's values so they can be reused.
- m3. Stale texts:
  - `check_s6_p149.ts:305` OWED entry (now matches nothing);
  - `check_forms_c36_acceptance.ts:4-5` comment ("stays red … until");
  - check_s6_p149's NOTE prints "owed (1)".
- m4. The audit wording "Sample; a second person approves it" is right. However, the proposer can accept their own proposal on To review (user-A accepted: 201). This is not new: rule-facts work the same way, and the ADD still needs a second person. Recorded only.

## D1-D20 (this change only)
- D1 Requirement fit: 4/5. It waits as a proposal (P-158, P-265). The identity rule is weakened (M1).
- D2 Data integrity: 3/5. Race-safe on the exact name; duplicates get in on case, accents and other combinations (M1).
- D3 Reuse and normalisation: 3/5. Reuse of an accented or long name regressed (M1).
- D4 Rule integrity: n/a.
- D5 Stability and recovery: 4/5. A 409 keeps the dialog open; line details are lost (m2).
- D6 Freshness and governance: 4/5. Audit line written; the job is recorded at US$0.
- D7 AI trust: n/a (no AI). Marked Rules.
- D8 Orientation: 5/5. Unchanged.
- D9 Flow: 3/5. No link to To review; no return path; the line is re-entered.
- D10 Language and guidance: 4/5. Plain toast and hint; one technical 409 (M1).
- D11 Feedback and state: 4/5. The toast says where it waits; it goes after 4.5 s.
- D12 Visual quality: 5/5. One hint line; no layout change (400 px screenshot).
- D13 Accessibility and responsive: 5/5. axe: 0 on the dialog; no sideways scroll at 400, 1024 and 1440 px; the keyboard path works.
- D14 Looks like the team's product: 5/5. Same dialog.
- D15 Speed: 5/5. Save to toast in 289 ms.
- D16 Testability: 3/5. The new rules are tested and fail before; other suites break or pass vacuously (B1, M2).
- D17 First-use intuitiveness: simulated only.
- D18 Information provenance: 3/5. "What it means" is filler; the person's source quote is not carried.
- D19 End-to-end closure: 4/5. Propose, accept, add works across screens.
- D20 User pain solved and "wow": simulated only.

## Could not check
- I did not run `graph.mjs`: it rewrites the tracked `qa/GRAPH.md`.
- No real screen reader. No headed browser (headless Playwright only).
- No 200 % zoom run beyond the 400 px width.
- No full `run-suites.sh`: other suites may break too.
- 2db95187 not reviewed.
