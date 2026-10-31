# X5 fill hardening (PR #146): independent CHECK of commit dc93b60f, 31 Oct 2026

Reviewer: I did not build this. I reviewed `git diff 0fc3f8a7 dc93b60f` at head 5ae993a0 (`claude/forms-x5a-fill-hardening-06zafk`; 5ae993a0 only merges #145's later fix). I checked it against P-156 (1), P156-2 ("newer on canada.ca"), the X5 break findings m13–m15 and the outside review on #145, STANDARDS, EXPERIENCE and QUALITY.

**How I tested.**
* **Copies.** Copy `x5hrv` on :4456 for the code under review. Copy `x5hmut` on :4457 for mutations, built from `git archive HEAD` into `/tmp/x5h-mut`. Ledgers were in `/tmp/x5h-rv-ledger*`. The web was built with `npx vite build`.
* **Suites.** `check_forms_x5_library.ts` passes **39/39**. `check_forms_s4_canada.ts` passes **80/80**. `check_forms_s4_library_browser.cjs` passes **93/93** on a fresh copy. My first browser run, on a seeded database, failed 3 steps because of the seeding, not the code. The slice3 screenshots it changed are restored.
* **Graph.** `graph.mjs` was run in a `/tmp` archive so the repo was not written. Result: G1–G6 = 0/0/2/0/0/0. The two G3 routes are attachment routes that predate this PR.
* **Scripts and spend.** My own scripts are in `/tmp/x5h-rv-scripts/` and screenshots in `/tmp/x5h-rv-shots/`. US$0, with no `*_LIVE` set.
* **Not mine.** `break-report-x5a.md` changed in this checkout during my session because a concurrent break round is writing there. I left it alone. Its M8 and M9 match my issues 1 and 2, reached independently.

**Verdict: Block** (ship after fixes: issue 1 is a Major).

## Your four questions
1. **Clearing on a backward date: not right with the list's rule.** The list answers a mark only when the current edition's canada.ca month is at or after the index date (`form-library.ts:105`). The clear (`library-index.ts:53`) compares only with the last date read. That date is the one that set the mark, so any step back clears it, even one still later than the file. See issue 1. A full step back to or before the edition's own date clears correctly.
2. **`hasHeldFile`: it never adds a wrong persistent state, but its words can be wrong, and it misses the product's real held path.** The list hides a mark until a current edition exists (`form-library.ts:105`, `current &&`). The fill's words, however, call a held edition "newer" even when that edition is canada.ca's own current one (issue 3). A real held upload is an intake item, not an edition, so `hasHeldFile` is false for it and m13 still happens (issue 2).
3. **Counts under a real race: they hold.**
   * Six fills at once on an empty library, 3 rounds: one fill reports "230 new, 0 already" and five report "0 new, 230 already". The table has 230 rows, there are 6 audit lines, and every reply is 201. Four fills at once give the same pattern.
   * With the sample loaded (16 forms), 6 fills at once, 3 rounds: one reports "221 new, 9 already" and five report "0, 230". Each fill's created + already = 230 = rows listed.
   * One flaw remains: all six fills claimed the same "1 with a newer edition" (issue 5).
4. **Finder and upload-run: they still read the recorded index exactly as before.** I ran the old and new `parseFormsIndex` on `official-sources/ircc/canada/pages/application-forms-guides.html`. Both give 230 rows, identical field by field, 88 packages, 0 unreadable and 0 null dates. The longest title is 215 characters. The suite's finder, upload-run and check paths are green (80/80). The behaviour change only matters for a blank or over-long title (issue 7).

## Issues, ranked
1. **Major (Must): a partial step back clears a mark that the list's own rule would keep. The form then reads Ready on an outdated file (D1, D2, D6).**
   * Repro on :4456 with IMM 5488. I set its edition's `canada_updated` to 2019-01, its `index_date_modified` to 2026-01 and `newer_on_index_at` to now, as if a previous read had marked it. Before the fill the list says `newer_file`. After filling from the recorded index (2024-10), it says **`ready`** and `newer_on_index_at` is null. canada.ca's 2024-10 is still later than the file's 2019-01, so by `form-library.ts:105` the mark should stay.
   * The fill's words and its audit line say nothing about the cleared mark.
   * The suite pins this wrong case. `check_forms_x5_library.ts:45` expects a clear with `editionDated: "2023-01"` and a new date of 2023-02-01.
   * Fix: clear only when the list's rule would answer the mark, that is `f.editionDated && f.editionDated >= r.dateModified.slice(0,7)`. Otherwise keep the mark: "Replace with a new edition" already answers it (`form-library.ts:207`). Change the suite step to that rule and add a failing step for the partial step back.
   * The break round's M8 shows the same problem with 2025-06 then 2025-03, and with 2025-06-15 then 2025-06.
2. **Should: `hasHeldFile` covers only a state the product does not create, so m13 is not fixed.**
   * The flag needs a printed edition whose checksum is not approved. Today that exists only for records from before the gate, or briefly between `finder.ts:633` and `:643`.
   * A real held upload is a HELD `intake_item` with no edition (`intake.ts:331-345`). Its approval creates the edition later, with `canada_updated` null (`intake.ts:163-176`).
   * Repro: IMM 0008 with a held intake item (row Needs your OK) and `index_date_modified` 2019-01. A fill gives no mark, and the stored date moves to 2026-05.
   * The new suite step (`check_forms_x5_library.ts:47`) is pure, on a hand-built state.
   * I rate this Should, not Major. Once approved, the outcome equals a file approved after the fill, and P156-2 marks only a changed date, so it is not a regression of this commit.
   * Fix: also set `hasHeldFile` for a code with a HELD intake item (`list()` already reads them), or record m13 as open in build-notes.
3. **Should: a held edition's own date is ignored, so the words over-claim "newer" (D11, D18).** `editionDated` is null whenever there is no current edition (`form-library.ts:180`).
   * Repro: I made IMM 5476's 2025-11 edition unapproved and set the index date to 2025-01. The fill says "1 with a newer edition on canada.ca (IMM 5476)". The held file is canada.ca's 2025-11 edition, and the list says "No file yet".
   * This breaks "one rule for both", the m2 fix from the review of 86f9447c.
   * Fix: when there is no current edition, take `editionDated` from the newest held printed edition.
4. **Should: three new wirings have no test that fails when they are removed** (STANDARDS [M] "A rule's test fails when the rule is removed"). In the `/tmp` copy, each of these mutations still passes 39/39:
   * `newer: plan.newer` instead of `marked`;
   * `hasHeldFile: false`;
   * `isClear` not written.

   The engine mutations are all caught: clear, held, latest date, title check, `realDate`, `already`. The drawer rule is also caught (browser 92/93).
5. **Should: concurrent fills all claim the same mark.** `n && isNewer` (`form-library.ts:192`) counts a re-stamp of a mark another fill set a moment earlier. In my race, 6 of 6 fills each said "1 with a newer edition". Fix: count a row as marked only when its `newerOnIndexAt` was null, using the `where` of the `updateMany`.
6. **Should: a form whose only PDF is held tells the person to upload again.** For a Needs your OK row with no approved edition (IMM 0008), the drawer says "Upload or find its PDF first" (`library-forms.tsx:347`). Fix: for `status === "needs_ok"`, say that its PDF waits for a second person on To review. Break round m21 reports the same.
7. **Should: a row with a blank or over-long title now disappears for the finder, upload-run and the check, not only for the fill** (`finder.ts:437,525,696`, `upload-run.ts:126`, `form-library.ts:223`). Those paths would then say "not on canada.ca's list (it may be a visa-office document)" for a number that is listed with a valid page. The recorded copy has no such row, so there is no effect today. Fix: apply the title check in `fillFromIndex`, or keep the row for page lookup and flag it.

What held: hook order in `SetAccepts` (all hooks run before the early return); server authorisation (approver fill 403, author accepts on a no-file form 409 "No edition yet"); no request per row; the fill answers in 117–120 ms.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | P156-1 and P156-2 met, except the clear rule (issue 1) |
| D2 | 3 | No duplicates under 6-way races, but a wrong Ready after a partial step back (issue 1) |
| D3 | 5 | One parser and one plan for the fill, finder and upload-run |
| D4 | 5 | Not touched by this diff |
| D5 | 5 | Races ×3, refill "0 new, 230 already", double fill guarded |
| D6 | 3 | A mark is cleared with no words and no audit detail (issue 1) |
| D7 | 5 | No AI; US$0; the ledger stayed empty |
| D8 | 5 | Shared library › Forms; the drawer names the form |
| D9 | 4 | No-file drawer says what comes first; the held-only case says to upload again (issue 6) |
| D10 | 4 | Plain words; wrong for held-only rows (issue 6) |
| D11 | 4 | Counts right under race; "newer" over-claimed (issues 3, 5) |
| D12 | 5 | Team look; drawer at 1440, 1024, 400 and 720@200 % |
| D13 | 5 | axe 0 after the fill and in the drawer; no sideways scroll at 1024, 400 or 720@200 %; keyboard path of 16 Tabs to Fill; focus returns to the row on Escape |
| D14 | 5 | Team components and words |
| D15 | 5 | Fill 117–120 ms; list in budget |
| D16 | 3 | 39 + 80 + 93 green, but 3 wirings uncaught (issue 4), one step pins a wrong rule (issue 1) and one proves an unreachable state (issue 2) |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | Rows link their canada.ca page; the "newer" words can disagree with the list (issue 3) |
| D19 | 5 | Fill → listed row → drawer → upload/finder path unchanged |
| D20 | simulated only | The founder's walkthrough |

## Journey score: 8 / 10 (pass, no criterion at 0)
Full record in `journey-test-reviewer-2026-10-31-x5a-dc93b60f.md`.

## What I could not check
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* Live canada.ca (only the recorded copy).
* How many pre-gate unapproved editions exist in the founder's demo database. That number decides whether `hasHeldFile` ever fires there.
* Retrofit mapping: not applicable to this hardening diff.
