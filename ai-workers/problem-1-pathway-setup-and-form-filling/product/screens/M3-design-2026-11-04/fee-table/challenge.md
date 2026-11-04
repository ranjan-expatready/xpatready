# Fee table: fresh challenge (4 Nov; a challenger that did not draft the concept; skill screen-concept part B)

Read: `concept-draft.md`, `design/draft-fee-table.html`, `../rows.md` C6.12, `samples/fee-table.json`, `engine/runtime/filings.ts`, `tests/check_r2_fee_table.ts`, `acceptance/C6.12*.test.ts`, `acceptance/lib/setup_vv_m3.ts`, every reader of `FEE_TABLE`, `prisma/schema.prisma` (Filing, SubmissionGroup, LibraryChange), `api/src/library-changes.ts` `decideChange`, `compliance-trace.md` VV-R13–15, research rows 1a–1c, P-151, P-171, P-237, P-247, P-253 (and its page), P-316, P-317, SA-01B v2.1 SA-1B-52 and SA-1B-190 (`domain/requirements-2026-11-02/`).
**Freshness:** `ai-workers/tools/freshness.sh` could not run (no `code/README-copies.md` in this cloud clone). The team requirement used (SA-01B v2.1, 27 Oct) is therefore **Unverified** against the team's newest copy. No app run, no database, US$0.

## Verdict
**Build after these changes.** The idea is right: a dated, cited table that a case is priced from, kept as configuration and not code. It is not buildable as drawn, for two reasons. First, the stored table would be a second source next to `samples/fee-table.json`, which six readers keep using (B1). Second, a one-person direct `PUT` that reprices a released combination conflicts with P-253 (B2). Both fixes are M3-only.

## Objections

### Blocker
**B1. Two fee tables, not one** (*Needed for the proof*; fact, high confidence)
* **What breaks:** The concept names `filings.ts` as the only reader. Six more readers load the JSON at import:
  * `case-prepare.ts:23` (biometrics ages) and `:254` (the family-maximum words on a split);
  * `case-checklist.ts:21` (`checklist: true` decides which combinations get a checklist, C6.4);
  * `workspace.ts:140,151` (`hasFeeRules`, `defaultModeOf`: the studio's "What a case gets" and C11.12's default modes);
  * `api/src/source-register.ts:20` (G1: fee numbers need a source at submit, called synchronously from **`studio.ts:455`, M2-hot**);
  * `C6.12-breadth.test.ts:12,20`, whose steps -22 and -24 read the file and never the stored table (scaffolding standing in for a capability, P-33).
* **Contract gap:** the PUT contract has no `modes`, `checklist` or `group_why`.
* **Empty start:** after Reset to the six (seeded by `demo.ts`, hot) no stored table exists. Every Visitor visa case would then read "No fees set", and C6.12.test.ts would pass only after `setup_vv_m3.ts`.
* **Example:** S7a saves CAD 120. `/prepare` says CAD 120, but the split refusal still names "CAD 500 for 5 or more" from the JSON, and the release gate checks the JSON's sources.
* **Fix:**
  * The JSON becomes **version 0**, the table used while nothing is stored. The page shows it as "Shipped table, as of …".
  * One loader in the new `api/src/fee-table.ts` returns the existing `FeeTable` shape, with modes, checklist and group_why carried over from the previous version.
  * `deriveFilings` already takes `rulesFor`, so pass it in. `case-prepare.ts` and `case-filings.ts` use the loaded table, `:23` and `:254` included.
  * `feeLinesOf` and `case-checklist` keep their synchronous signatures by reading a cache that the loader refreshes when a table is approved. Otherwise `studio.ts` changes, and it is hot.
  * The breadth test reads `GET /library/fees`, not the file.
  * New test: a PUT-changed amount reaches `/prepare`, the split words and the G1 count.

**B2. A direct one-person PUT conflicts with P-253** (*Needed for the proof*; P-253 is a fact, the reading is judgment, high confidence)
* **The decisions:**
  * P-253 covers every change to a reusable item, "human or AI, Add, Edit or Retire", not only editing on a screen.
  * Its step 6 says "anything used by a released combination: a second person".
  * Its page says "Then (M3): each other library adopts the core".
  * The team's SA-1B-190 rule 6 also says "a table definition is versioned pack content and needs second-person approval".
* **What breaks:** `vv.single` is already released (release 1) when S7a runs. The concept's PUT lets one author change what every new Visitor visa filing costs.
* **Concept framing:** BR-6 and Q2 treat P-253 as a question about on-screen editing. A read-only page does not make the route compliant.
* **Every other S6–S6a setup step** waits for a second person (`setup_vv_m3.ts:104–111, 131–137`).
* **Fix (M3-only, no hot file):**
  * PUT stores a new version as WAITING and writes a `library_change` (kind `fee_table`, action EDIT, reason required, proposed by the author). `finder.ts:547` already writes its own kind (`form_accepts`) from a non-hot file.
  * A version prices nothing until that change is APPROVED through the existing `POST /library/changes/:id/approve`. `decideChange` is generic and already refuses the proposer (`library-changes.ts:112–119`).
  * The PUT answers 202 with an impact count: the combinations using each changed line and the open cases on the older version.
  * S7a needs no new step: S8's loop already approves every WAITING change (`setup_vv_m3.ts:176`).
  * The guarded change's search and AI steps stay Not built. They do not apply to a table of amounts.

### Major
**M1. A stamp per filing breaks the family maximum** (*Needed for the proof*; fact, high confidence)
* **The facts:** the maximum is worked out per submission group (`filings.ts:145, 214`). A filing row is created when `/prepare` first derives it (schema "C6.12 /prepare … stored the first time"). A person added later gets a new filing (C6.12-19).
* **Example:** a family of 4 is priced on version A (CAD 100). Version B is approved (CAD 120, maximum CAD 600). A fifth person is added. One group then holds four filings on A and one on B, so which maximum applies is undefined.
* **Fix:** put `fee_table_id` on `submission_group`. A group split out inherits its parent's table, and a person who joins a group takes the group's table.
* **Tests:** BR-1 pass: a person added after a newer approval is priced on the group's table. BR-1 fail: a split never mixes tables.

**M2. BR-3, the contract and S7a disagree** (*Needed for the proof*; fact, high confidence)
* **What disagrees:**
  * BR-3 needs a URL, IRCC's quote, the page date and the read date, but the contract makes `quote?` and `pageDate?` optional.
  * S7a (`setup_vv_m3.ts:160–163`) sends neither of them and no `reason`, so the concept's own refusal ("give IRCC's page and quote, or mark it Sample") fails S7a.
  * S7a cites the CAD 85 biometrics amount to the biometrics exemption page, which does not state it.
  * In version 0, the biometrics quote is "summary of the Lead-checked record" (`fee-table.json:51–52`), and `spouse_dependent_child` and `pr_adult` are summaries too, so BR-3 makes them Sample.
* **Fix:**
  * `source {url, quote, quoteKind, pageDate, read}` is required unless `sample: true`.
  * Amend S7a in the same PR (acceptance README rule): add a reason, cite fees.asp with the VV-R13 and VV-R14 words ("Maximum fee for a family of 2 or more people applying at the same time", research row 1b), and put the biometrics page on `exempt.source`.
  * Replace the biometrics quote in version 0 with those words (rows.md already asks for this).

**M3. `as_of` has three meanings** (*Needed for the proof*; fact, high confidence)
* **The three:** the JSON uses `2026-09-21`, the IRCC page date. S7a uses `2026-11-01`. The board says "as of 1 Nov 2026", as if it were the date the table was saved.
* **Why it matters:** BR-1's "the table in force" depends on which meaning holds.
* **Fix:** `as_of` is the date the table takes effect. That is the team's "in force from" (SA-1B-190 rule 10, SA-1B-192). It is never after today in M3: a future table is Not built. Each line keeps its page date and read date.

**M4. What a PUT replaces is undefined** (*Needed for the proof*; fact, high confidence)
* **What breaks:** S7a sends 2 lines and 1 combination. Replacing the whole table would delete the study, work, open work and extension lines (C6.12-24) and the six other lines, and drop `vv.single`'s modes and checklist flag.
* **Fix:** a new version is the previous one with the given lines upserted by key. A combination entry replaces only its list of lines. Nothing is deleted in M3 (Retire is Not built). Test: S7a leaves C6.12-24's lines in force.

**M5. A conflict with the team's rule is not surfaced** (*Needed for the proof*; fact, medium confidence, team copy Unverified)
* **The conflict:** BR-1 freezes the price when a filing is first derived. SA-1B-52 rule 2 reads "the fee-table version in force on the date the authority receives the application … until submission, the submission date at submission".
* **Example:** IRCC raises a fee from 5 Dec. A case opened on 1 Nov and filed on 6 Dec shows the old fee under BR-1 and the new fee under SA-1B-52.
* **Rule:** AGENTS rule 2 says a conflict between the team's requirement and a founder decision goes to the founder. **Fix:** Q1.

**M6. The read-only page is partly gold-plating** (judgment, medium confidence)
* **Not in done-when:** neither C6.12's nor S7a's done-when (`rows.md` §2) names a page, so the page is *Not built for the proof*.
* **The founder's ask:** the order of P-319 lists "fees … library tables + S7a screens (M3, design first)" (`STATE.md:36`). A minimal list is justified there. With B2 in place, it is also where the approver sees what they approve.
* **Fix:**
  * Make it a **second PR** after the route and the stamp.
  * Keep: one table (Fee · Basis · CAD · Family maximum · Exempt · Source with page date and read date · Sample badge · Used by, read from the table's combination entries), each version's status (in force / waiting for a second person), and the loading and could-not-load states.
  * Drop: the row panel's history of tables and the "page date older than 12 months" warning. That threshold is new, Sample, and no decision backs it.
  * The empty state never happens once B1's version 0 exists.

### Minor
* **m1. BR-1's "Adopt update until accepted-until"** (*Not built*): a table has no accepted-until data, and the concept defines no Adopt route and no test. P-237 (3) replaced P-151 (1)'s block with a CRITICAL warning. That belongs to C7.6 (L-SA3), which reads the stamp. Remove it from BR-1.
* **m2. BR-5 belongs to C6.12-22** (*Not built here*):
  * "per application (bundled)" on the board is not a P-247 basis;
  * the contract cannot say "on the sponsored person's filing";
  * `rulesFrom` refuses `co_files` (`filings.ts:101`).
  -22's PR defines it.
* **m3. BR-4 is already built:** the words are "Fees not worked out yet for …; nothing is guessed." (`filing-modes.ts:62`), and the check is `check_r2_fee_table.ts:56`. Reuse both instead of new "No fees set" copy.
* **m4. The new `studio/contracts/fees.ts` is under the hot prefix `studio/contracts/`.** Every later edit needs a hot-file approval, which is the trap the concept avoids for `library-fees.ts`. Export the types from `api/src/fee-table.ts` instead.
* **m5. Board errors:**
  * the header says "4 lines from IRCC's fee list · 1 Sample line", but the table has 4 rows and one of them is the Sample line;
  * it shows 4 of the 10 lines;
  * "Used by: Spouse or common-law partner" is shown, but there is no `fs.spouse` entry (`fee-table.json:211–226`);
  * "Studio › Reference" does not exist. The team's name is Library › Reference tables › Fee table (SA-1B-190 §3).
* **m6. Retrofit:** the team keeps amounts in the fee table and puts basis and roles on the row's fee line (SA-1B-52 rule 1, `ProgramRow.feeLines[]`; SA-1B-190 rule 3). Write the mapping: our `lines[].basis/roles` = their `feeLines[].basis/roles`, our `combinations{}` = their `feeLines[]`. No code change.
* **m7. P-319 is cited but not in `DECISIONS.md`** (only `STATE.md:36`). The tech lead records it.

**M2-hot check:** the concept's files are new, or modified but not hot (`filings.ts`, `case-prepare.ts`, `case-filings.ts`, `schema.prisma`, `setup_vv_m3.ts`, `App.tsx`). It would hit a hot file without saying so in one place: moving G1's fee read to the database by changing its signature touches `studio.ts:455` (B1 fix avoids it). Freezing into the release (`snapshot.ts`, `studio.ts`) is hot, and the concept says so.

## What is sound
* **Fees stay data:** a dated table, never code (P-230 (7), P-319). The engine is already shaped for it: `deriveFilings(rulesFor)`, `soundLine`, and a basis that names the table that priced it (`check_r2_fee_table.ts:94`).
* **Stamp a version instead of freezing into the release.** This is closer to the team's model than R2's "the release's fee table" wording: reference tables have their own versions with in-force dates (SA-1B-190, SA-1B-192), and one IRCC change should not need a release of every combination. BACKLOG R2's wording needs updating.
* **The values** are the ones already cited (VV-R13–15, rows 1a–1c). The child line stays Sample until the expert answers (concept Q3 stands).
* **File names:** `fee-table.ts`, not `library-fees.ts`; the route registers through `features/`, and `/library/fees` collides with no existing route.
* **P-247's four bases, and per_position refused.** The family maximum is kept within one submission group.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Version 0 | `samples/fee-table.json` | `GET /library/fees` gives it while none is stored | B1 | GET after Reset to the six gives version 0; C6.12.test.ts 24/24 with no S7a |
| Dated version | `fee_table` (id, as_of, lines JSON, status, created_by, reason) + `library_change` kind `fee_table` | `PUT /library/fees` → 202 {id, as_of, impact} | BR-2, BR-3, M3, M4 | refused: no source and not Sample (400 on the field), a family maximum without fromPeople, as_of after today; upsert keeps C6.12-24's lines |
| Second person | `library_change` WAITING → APPROVED | existing `POST /library/changes/:id/approve` | B2 | the author approving gets 403; until approved, `/prepare` stays on the old version; client and case officer get 403 on PUT |
| Stamp | `submission_group.fee_table_id` (migration) | `/prepare` and `/filings` load the group's table | M1, BR-1 | the group keeps its table after a newer approval; a split inherits it; a person added joins the group's table |
| Readers | sync cache refreshed on approve | — | B1 | a PUT-changed amount reaches `/prepare`, the split words and the G1 count |
| Page (PR 2) | — | `GET /library/fees` | M6 | the 10 lines with sources, Sample badges, waiting/in force; axe clean at 1440 and 1024 px |

## Questions for the founder
1. **Which table prices a filing?**
   * **Recommended:** keep P-151 (1) as decided. The table is stamped on the submission group when its filings are first derived, a newer table never reprices them, and C7.6 warns later. The team is told that this differs from SA-1B-52 rule 2.
   * The alternative is the team's rule: the version in force on the target filing date until submission, then frozen at submission.
2. **A second person on the fee table route?**
   * **Recommended:** yes. PUT waits as a library change, and a different person approves it through the existing approve route. This is M3-only, adds no setup step, and is what P-253 step 6 asks.
   * The alternative is a one-person route with a reason, recorded as a P-253 exception.

## Lead response

## Agreement

## Build discoveries
