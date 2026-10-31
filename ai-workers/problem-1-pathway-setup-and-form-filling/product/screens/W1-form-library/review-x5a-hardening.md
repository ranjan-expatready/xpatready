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

---

# Re-check of commit e466adb1 (the fixes for dc93b60f), 31 Oct 2026

Reviewer: I did not build this. I reviewed `git diff 5ae993a0 e466adb1` (code: `*.ts`, `*.tsx`, `*.cjs`) and read the PR's whole change since 0fc3f8a7 for context. The bar is the same as above: P-156 (1), P156-2, STANDARDS, EXPERIENCE and QUALITY.

**How I tested.**
* **Copies.** Copies `x5rva` :4452, `x5rvb` :4453 and `x5rvc` :4454 for the code under review. Copy `x5rvm` :4455 for mutations, built from `git archive e466adb1` into `/tmp/x5rv-e46-mut`. The web was built first with `npx vite build`. All copies are stopped and their databases dropped.
* **Suites.**
  * `check_forms_x5_library` 45/45.
  * `check_forms_s4_canada` 80/80.
  * `check_forms_s4_library_browser` 95/95. The slice3 screenshots it changed are restored.
* **Graph.** G1–G6 = 0/0/2/0/0/0 (run in the `/tmp` copy). The two G3 routes are attachment routes that predate this PR.
* **Spend.** US$0, no `*_LIVE` set, and the ledgers are empty.
* **Scripts and screenshots.** Scripts are in `/tmp/x5rv-e46-scripts/` and screenshots in `/tmp/x5rv-e46-shots/`.
* **Not mine.** `break-report-x5a.md` changed during my session because a concurrent break round is writing there. I left it alone.

**The last review's issues, re-run on this commit.** All are fixed except where noted.
* **1 (M8): fixed.** IMM 5488 with a file dated 2019-01, a 2026-01 mark and an index now at 2024-10 keeps the mark and reads `newer_file`. With the file at 2025-01 the mark is cleared in the database and the row reads `ready`.
* **2 (M9): fixed.** A real held upload (intake, HELD) marks the form when the date moves on, and the fill does not name it "newer" (IMM 1344, IMM 5710).
* **3: fixed.** IMM 5476 whose only edition is held and dated 2025-11, with the index read at 2025-01: no mark and no "newer".
* **4: fixed.** Each of the 3 wirings fails its check when removed: 44/45 each time.
* **5 (m24): fixed.** Six fills at once, 3 rounds: exactly one fill names the form each round, every reply is 201, and there is one mark.
* **6 (m21): fixed.** A held-only IMM 1344 drawer says "Its PDF waits for a second person on To review…". axe finds 0 violations.
* **7: fixed.** The parser keeps every numbered row, and only the fill judges titles.

**Verdict: Approve.** There is no open Blocker or Major. The three Should items below can follow in a later item.

## Your three questions
1. **The pending mark after approval: it agrees with the list's rule, but it outlives a rejection.**
   * Upload IMM 1344 (held), then fill with the date moved on. The fill sets a mark and says "newer []". The row reads Needs your OK.
   * After the second person approves it, the row reads `newer_file`, with `newer_on_index` true and edition "IMM 1344 (09-2024)".
   * That is the list's own rule (`form-library.ts:105`): a hand upload has no canada.ca date.
   * Two consequences, both of which err towards "check it":
     * (a) A held file that is itself canada.ca's newest edition still reads "Newer" once approved. "Check canada.ca" cannot answer it: it returns `check`, because `compareWithCanada` needs a dated edition. Only "Find again" dates the edition. This is the same as for any undated upload with a file, so it is not new here.
     * (b) A rejected held upload leaves the mark behind. See issue 1.
2. **Is the mark write race-safe? Yes.**
   * The first `updateMany` (always written: `listedOnIndexAt`) locks the row for the rest of the transaction.
   * A second fill blocks on that lock. Under read committed it then re-checks `newerOnIndexAt: null` against the committed mark and gets count 0.
   * Every fill walks `plan.listed` in the same order, so no deadlock.
   * Measured: 3 rounds × 6 fills, all 201, one fill names it, one mark (`/tmp/x5rv-e46-scripts/pending.ts`). Removing the `where` makes the suite fail (44/45).
   * By design, a form already marked whose date moves again is not named a second time. The row still shows the mark.
3. **Does `typedRef` leave a stale state? Yes, in one narrow case** (issue 2).
   * The flag is cleared only when the effect runs. An input that ends where `dq` already was leaves it `true`, for example an edit and its undo inside one deferred render. The next Clear filters then waits 700 ms again.
   * Reproduced 5 of 5 times by dispatching two input events in one task. Separate key presses (Playwright `press`) did not reproduce it.
   * The `setOpen` closure is not stale. `tableEl` is memoised on `[pageRows, canAuthor]`, and every input of `countText` also changes `pageRows`, except the error state, when no table is drawn.
   * `data-shown` is 0 on error.
   * `setSpoken` and `setOpened` commit in one render, and `Panel` hides the page in its own effect. Whether a real screen reader speaks the count is unverified.

## Issues, ranked (none Blocker or Major)
1. **Should: a pending mark survives a rejected held upload, and a later upload then reads "Newer edition on canada.ca" with no fill in between (D2, D11).**
   * Repro on :4454 with IMM 5710:
     1. Upload, then fill with the date moved: the form is marked.
     2. Reject the upload: the row reads `no_file`, and the mark stays in `gov_form_def`.
     3. Upload a new copy and approve it: the row reads `newer_file` for "IMM 5710 (09-2023)", which is canada.ca's listed 2023-09.
   * The fill's clear never fires without a current edition, and Check cannot answer an undated edition.
   * Fix: in the reject path (`intake.ts:146`), clear `newerOnIndexAt` when the form has no approved printed edition and no other HELD item. Or clear it in `planIndexFill` for `!hasFile && !hasHeldFile` (`library-index.ts:62`), plus a suite step: upload, fill, reject, upload, approve.
2. **Should: `typedRef` can stay `true`, so Clear filters waits 700 ms again (WCAG 4.1.3, the m22 fix).**
   * `library-forms.tsx:138` resets the flag only when the effect runs.
   * Fix: set `typedRef.current = false` in Clear filters' onClick (`:204`). Or record the typed value and treat input as typing only when `dq` equals it.
3. **Should: the fill's title filter and its "not counted twice" rule have no test that fails when they are removed** (STANDARDS [M]).
   * `const rows = all;` passes 45/45.
   * Dropping `!rows.some(...)` (`form-library.ts:178-179`) also passes 45/45.
   * Only `indexTitleOk` is unit-tested. No recorded row is affected today.
   * Fix: move the filter and count into a small engine function with one step each, or add an API step on a doctored index.

**Every other rule is caught when removed:**
* the clear write, held uploads and `where null` (44/45 each);
* pending named as newer (44);
* the old clear rule (43);
* `heldDated` (44);
* held counted as newer (43);
* best row (44);
* the year bound (44);
* `typedRef`, the speak-at-open and `data-shown` (browser 94/95 each).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | P156-1/2 met; M8, M9 and m24 behave as the list's rule |
| D2 | 4 | No duplicates or wrong Ready; a stale mark after a reject (issue 1) |
| D3 | 5 | One parser; the fill alone judges titles; one plan |
| D4 | 5 | No schema change |
| D5 | 5 | 6-way races ×3: one mark, one name, all 201 |
| D6 | 5 | A clear happens only where the list already answers the mark, so nothing visible changes silently |
| D7 | 5 | No AI; US$0 |
| D8 | 5 | Shared library › Forms unchanged |
| D9 | 5 | A held-only drawer says who acts next |
| D10 | 5 | Plain words, per PRODUCT §4 |
| D11 | 4 | Counts are right; "Newer" is shown after a reject (issue 1) |
| D12 | 5 | Team look; 1440, 1024, 400 and 720@200 % |
| D13 | 4 | axe 0; keyboard path 16 Tabs; focus returns; the `typedRef` edge (issue 2) |
| D14 | 5 | Team components |
| D15 | 5 | Fill 211 ms in the browser; list in budget |
| D16 | 4 | 45 + 80 + 95 green; two fill rules uncaught (issue 3) |
| D17 | simulated only | No intended user walked it |
| D18 | 5 | canada.ca pages linked; the fill's words agree with the list |
| D19 | 5 | Fill → row → drawer → To review hand-off is named |
| D20 | simulated only | The founder's walkthrough |

## Journey score: 9 / 10 (pass, no criterion at 0)
The full record is in `journey-test-reviewer-2026-10-31-x5a-e466adb1.md`.

## What I could not check
* A real screen reader, so I could not hear the count spoken at drawer open (same commit as the dialog).
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* Live canada.ca (only the recorded copy).
* Retrofit mapping: not applicable.

---

# Re-check of commit 89cccd71 ("newer on canada.ca" judged by the dates), 31 Oct 2026

Reviewer, fresh context. Focus: `git diff e466adb1 89cccd71 -- '*.ts' '*.tsx' '*.cjs'`, with `0fc3f8a7..89cccd71` for context. Copy made with `git archive 89cccd71` into `/tmp/x5rv89-mut` (web built with `npx vite build`), run on :4452, :4453 and :4455, all stopped and their databases dropped. The ledger folders stayed empty: no `*_LIVE`, US$0. No slice3 screenshot in this tree was changed (the browser suite wrote to the /tmp copy). Scripts are in `/tmp/x5rv89-scripts/` and screenshots in `/tmp/x5rv89-shots/` (not committed).

**Verdict: Block** (ship after fixes). Issue 1 is a Major: a check that finds the file current can no longer answer "Newer", so the row and the check contradict each other. The coordinator says the outside check raised the same red, and a per-form baseline is planned for the next commit. Everything else in this commit holds.

**Results.**
* `check_forms_x5_library`: 47/47.
* Browser suite: 95/95 (fresh database).
* The sample after a first fill: 15 editions, all Ready, no false "Newer".
* Race on the guard: 3 rounds × 6 fills, exactly one fill names IMM 1295 each round, all answered.

## Your four questions
1. **Is judging by dates sound? Only where both dates come from canada.ca. It is not sound when a printed label stands in for the date.**
   * The index's date is canada.ca's page date, not the PDF edition. The recorded copy shows this. IMM 5475's index and page say 2021-05, while its PDF sits in `/16-12-2022/` and the manifest edition is "IMM 5475 (12-2022)". IRM 0002 is the same: page 2021-03, PDF `/16-12-2022/`.
   * So the claim "in all sample data, the index's date equals the edition's label month" is not true for IMM 5475. That case errs the safe way (index earlier, so not newer). It still proves the two dates are independent.
   * The opposite drift, a page edited later with the same PDF, gives a false "Newer" on the first fill for any edition dated only by its label. That covers every hand upload (`canada_updated` null) and the sample's IMM 5488. No recorded row shows it today, so I could not reproduce it on recorded data. I simulated it by moving IMM 5488's index to 2025-02: the row read Newer, and Check could not read the page.
   * When `canadaUpdated` is known, both sides are canada.ca's page date, and the rule is the same as P156-2's "a later read whose date changed".
2. **What does `compareWithCanada` now mean for a dated file? Nothing for "Newer"** (issue 1).
   * "current" needs `canadaUpdated === page.lastUpdated` (`form-library.ts:243`). The list then compares the index, not the page, against that same month (`:107`). The clear at `:215` only touches `newer_on_index_at`, which the list ignores for a dated file.
   * For an undated file, "current" cannot happen, because it needs `canadaUpdated`. So line 215 is dead code: removing it passes 47/47.
   * In a real page-only change (page and index move together), Check says "check" and points to Find again. Find again on the same bytes re-stamps `canadaUpdated` (`finder.ts:581`) and the row turns Ready. A form no combination uses has no such way out.
3. **Is the guard race-safe? Yes.**
   * `updateMany … where indexDateModified = before` (`:197`) takes the row lock. Under read committed, a waiting fill re-checks the `where` against the committed row and gets 0.
   * `before = null` becomes `IS NULL`. Every fill walks `plan.listed` in the same order, so there is no deadlock.
   * ABA case: a later step back and a stale plan that moves the date on again. The stale fill is named, which is correct, because it did move the date.
   * Removing the `where` fails 1 check (m24).
4. **Does anything still depend on `newer_on_index_at` wrongly?**
   * The list reads it only for an undated edition. The fill writes it only on that path. Check clears it, but only on a path that cannot happen (question 2).
   * No dated path reads it. Old marks left from e466adb1 (pending marks, m27) are ignored once a dated file is approved, so M10, M11 and m27 are fixed by design. The 7 checks that fail with the old list rule restored cover approve, reject, held and step back.
   * The undated path still clears on any step back, even one still later than the file. That is M8 again, now only for undated editions. No index row in the sample is undated (every undated edition there is a guide or a visa-office file, none of them listed), so this is Minor.
   * Removing the fill's undated mark write, or its clear, passes 47/47 (issue 2).

## Issues, ranked
1. **Must (Major, D2/D11/D18): a check that finds the file current leaves "Newer edition on canada.ca" on the row.**
   * Repro (J3, `/tmp/x5rv89-shots/j3-check-current-still-newer-1440.png`):
     1. Take IMM 1295 (09-2023), `canada_updated` 2023-09, and set the stored index date to 2025-06.
     2. Choose ⋯ › Replace with a new edition….
     3. The notice says "IMM 1295 (09-2023) is still the current edition on canada.ca (last updated 2023-09)". The row still reads Newer.
   * The M2 test for the "current" branch is now vacuous (`check_forms_x5_library.ts:113`: `outcome === "current" ? true : …`).
   * For label-dated files, a first fill can mark a current PDF newer (question 1), and nothing on this screen answers it.
   * Fix: the planned per-form baseline. Record the index date last seen as current at the first read with a file, and at a "current" check. Judge newer as index > baseline. Write the check's step as a real assertion.
2. **Should (D16, STANDARDS [M] "a rule's test fails when it is removed"): the fill's undated writes are untested end to end.**
   * Dropping `isMark ? { newerOnIndexAt: now }` passes 47/47. So does dropping `isClear ? { newerOnIndexAt: null }` (`form-library.ts:198`). So does dropping the check's clear (`:215`).
   * Fix: one API step on an undated edition (set by a later date, cleared by a step back), or remove the dead clear together with issue 1.
3. **Minor: two exported `editionMonth` functions with different rules.**
   * `engine/programs.ts:127` returns a number, with the month found anywhere in the label.
   * `engine/library-index.ts:27` returns `YYYY-MM`, with the month only at the end in brackets.
   * A label such as "IMM 5905 E (03-2026), New Delhi…" orders by one and counts as undated by the other. Fix: one parser, or rename one.
4. **Minor: the undated step-back clear repeats M8.** `library-index.ts:81` clears on any earlier date, not only on one at or before the file.

**Caught when removed:**
* the list's date rule (7 checks);
* the guard (1);
* "not named again" (1);
* the label fallback (2);
* `libraryRows` filter and count (1 each);
* the invisible-character classes (1);
* the undated plan clear (1);
* `typedRef` reset (browser 94/95).

So review (e466adb1) issues 2 and 3 are fixed and tested, and m28 has new words.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | P156-2 holds for dated files; the check no longer answers "Newer" (issue 1) |
| D2 | 3 | The check contradicts the row; a label-dated file can read Newer with no new edition |
| D3 | 4 | One date rule in the list and the fill; two `editionMonth` functions (issue 3) |
| D4 | 5 | No schema change; old marks harmless on dated files |
| D5 | 5 | 6-way race ×3: one name per round |
| D6 | 4 | No stored state for dated files; the check's clear does nothing visible |
| D7 | 5 | No AI; US$0, ledgers empty |
| D8 | 5 | Shared library › Forms unchanged |
| D9 | 5 | The held drawer says "is held on To review", without a promise |
| D10 | 5 | Plain words |
| D11 | 3 | "still the current edition" beside "Newer edition on canada.ca" |
| D12 | 5 | No sideways scroll at 400, 1024 and 1440; 720 at 200 % |
| D13 | 5 | axe 0 on three states; 16 Tabs to Fill; focus returns; `typedRef` fixed |
| D14 | 5 | Team components |
| D15 | 5 | Fill 103–128 ms; list 164 ms |
| D16 | 4 | 47 + 95 green; the undated writes and the check clear uncaught (issue 2) |
| D17 | simulated only | No intended user walked it |
| D18 | 3 | The check's canada.ca answer is overridden by the list's date |
| D19 | 5 | Fill → row → drawer → To review hand-off |
| D20 | simulated only | The founder's walkthrough |

## Journey score: 8 / 10 (pass, no criterion at 0)
The full record is in `journey-test-reviewer-2026-10-31-x5a-89cccd71.md`.

## What I could not check
* A real screen reader.
* Live canada.ca. A page-only change could not be shown on recorded data; it is reasoned from IMM 5475 and IRM 0002.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* Retrofit mapping: not applicable.

---

# Re-check of commit 63d2ba6d ("Newer" judged from dates plus a per-file baseline), 31 Oct 2026

Reviewer, fresh context. Focus: `git diff 89cccd71 63d2ba6d -- '*.ts' '*.tsx' '*.sql' '*.prisma'`, with `0fc3f8a7..63d2ba6d` for context.
* Copies ran on :4452 and :4453 (from `/home/user/x5i`, web built with `npx vite build`), and on :4454 and :4455 (a `git archive 63d2ba6d` copy in `/tmp/x5rv63-mut`, `node_modules` entries symlinked to x5i's).
* All are stopped and their databases dropped. The ledger folders stayed empty: no `*_LIVE`, US$0. No `prisma generate` was run.
* The browser suite wrote its slice3 screenshots inside the /tmp copy, so none in x5i changed (`git status` clean).
* Scripts are in `/tmp/x5rv63-scripts/` and screenshots in `/tmp/x5rv63-shots/` (not committed).

**Verdict: Approve** (Ship). There is no Blocker or Major. All four reds from 89cccd71 are closed as their repros were written, and I found no path to a false Ready in product code. Issues 1 and 2 below should be fixed in this PR if cheap; neither blocks.

**Results.**
* `check_forms_x5_library` 59/59.
* `check_forms_s4_canada` 80/80.
* Browser suite 95/95 on a fresh database.
* `tsc --noEmit -p api` clean.
* Sample plus first fill: 15 editions, all Ready, no baseline written (the dated files get none; the 4 undated guides are not on IRCC's list).

## Your four questions
1. **Sound and safe? Yes for "Ready". A false Ready needs a wrong `canada_updated` or a wrong check. I found neither in product paths.**
   * `canada_updated` is written in four places. Three compare the bytes with canada.ca's file first: `finder.ts:581` (same sha), `upload-run.ts:131/157` (same sha), and `finder.ts:633` (the file just downloaded).
   * The fourth, `finder.ts:740` (`fillSample`), stamps the page's date on the sample's file without comparing it. That is the sample loader only, and the recorded PDFs are the sample's.
   * The check writes the baseline on the compared edition only. Proven live: a held "IMM 5257 (02-2025)" copy kept `-` while the current file got `2026-03-01`.
   * A replacement or newly approved edition starts with no baseline, so its dates decide. A fill never gives a dated file a baseline (mutation M2 is caught).
   * Read and write race safely. A fill moving the index while a check runs leaves the check's older date as the baseline, so the row stays Newer (the safe side). The check (dated files only) and the fill (undated only) never write the same row.
2. **The migration on a database with old marks: it carries them as designed, with one documented-claim gap (issue 3).**
   * Setup (:4453): sample, fill, the 140000 migration undone by hand, marks set on 5 forms, then `prisma migrate deploy`.
   * After: the column is dropped. IMM 5257 (dated, index later), IMM 5488 (label-dated, index later) and Guide 5289 (undated, baseline 1990-01-01) read Newer. CIT 0001 (no file) reads "No file yet".
   * IMM 1295 (label-dated, `canada_updated` null, marked, index 2023-09 = its label month) went from Newer (rule at 0fc3f8a7: the mark wins without `canada_updated`) to Ready.
3. **Can a form with no recorded page, or a hand upload with no canada.ca date, be answered?**
   * No recorded page: yes. The check looks the form up in IRCC's list and records the page (`form-library.ts:236-241`). A form not on the list has no index date, so it is never Newer.
   * No `canada_updated`: never by the check. Find again re-dates it (`finder.ts:581`) when a combination uses the form and the finder reaches its fetch step. A byte-identical re-upload says "Already in the library" and re-dates nothing.
   * The same holds for the real page edit. In the recorded copy the index date equals the page's "Last updated" on 27 of 27 pages, and the PDF's folder month is never earlier.
   * So the check's new baseline only fires when IRCC's list is later than the page's own date, which no recorded page shows. J2 (below) moved both dates with the same PDF: the check said "check" and the row stayed Newer.
   * Acceptable to ship: the error is a false Newer, the safe side, and forms in use have a path. It is a gap against the PR's own claim (issue 1).
4. **Finder and intake: they behave.**
   * Intake and the finder refuse a label with no (MM-YYYY) (`read_form_identity.py:122`), so every non-sample file is dated.
   * Re-stamping on the same bytes (`finder.ts:581`) moves the file's month forward, which is right because canada.ca still serves that file.
   * A different file with the same label sets `newerFileSha256`; a new label is held for review. Neither changes the current file's dates.

## Issues, ranked
1. **Should (D2/D18; affects J2): one check does not answer a moved "Last updated" with an unchanged PDF, or any file with no `canada_updated`.**
   * The test "a check that finds the PDF current answers a page edit" (`check_forms_x5_library.ts:365-370`) sets IRCC's list later than the page's own date, a state the recorded copy never shows. The comment at `form-library.ts:216-219` says the same thing.
   * Fix (small, same scope): when the dates differ but `sourceUrl` matches, `compareWithCanada` fetches the PDF (US$0). If its sha equals the current edition's, it re-dates `canada_updated` as `finder.ts:581` does, answers "current" and sets the baseline. The test then edits the page and the list together, as J2 did.
   * Otherwise narrow the comment and the test name, and make the "check" words say what Find again does with the same file.
2. **Should (D16; STANDARDS [M] "a rule's test fails when the rule is removed"): "the baseline is the checked file's own" has no failing test.**
   * Changing the write at `form-library.ts:220` to every edition of the form passes 59/59 (M1). The c5b8be03 test inserts the replacement after the check, so it cannot see the difference.
   * This rule guards a false Ready: a held older file present at check time would inherit the baseline and read Ready once approved.
   * Fix: insert the held copy before the check and assert its `index_date_seen_current` stays null.
   * Also: dropping the fill's `indexDateSeenCurrent: null` guard (`form-library.ts:199`) passes 59/59 (M3). That path is dormant (undated files only), so a Minor.
3. **Should (D4): the migration's note "a form marked newer keeps reading newer" (`migration.sql:4-5`) is not true for a label-dated file whose label month is at or after the index date.**
   * Measured on IMM 1295 above. The new answer is defensible: the printed edition matches IRCC's month.
   * Fix: say so in the note and the PR, and add one migration carry-over check (none of the suites runs the migration on marked data).
4. **Minor: the check's response now returns the internal `editionId` and `indexDate`** (`form-library.ts:250`). Strip them before returning, or describe them in a contract.
5. **Minor: no audit line when a check turns a row from Newer to Ready.** The baseline write is silent; the fill is audited, the check is not. The old mark clear was silent too.
6. **Minor: `formEdition.update` at `:220` throws (a 500) if the edition was deleted between the compare and the write.** `updateMany` avoids it.

**Mutations (in `/tmp/x5rv63-mut`), each run against a fresh :4454:**
* Caught: a fill gives dated files a baseline (2 fail); `fileMonth` takes the earlier month (3); the list ignores the baseline (2); the check's baseline is the page date instead of IRCC's list (1).
* Not caught: M1 and M3 (issue 2).
* Your own results (the check's write 2, the guard 1) were not repeated.
* The property tests cover `newerOnIndex`, `isLaterDate`, `fileMonth`, `realDate` and `libraryRows` against plain models. This meets STANDARDS §7 ([M] when the engine changes).

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | P156-2 per file; the check answers the case it is written for (J1) |
| D2 | 4 | A moved "Last updated" with the same PDF is answered only by Find again (issue 1) |
| D3 | 5 | One `newerOnIndex` for the list, the fill and the check; one `fileMonth` |
| D4 | 4 | Expand, carry over, contract, with rollback written; one row flips Newer → Ready unlike the note (issue 3) |
| D5 | 5 | The check and the fill write disjoint editions; guarded writes; the 4-fill race test passes |
| D6 | 5 | Baseline per edition: a replacement starts clean; approval and rejection write nothing |
| D7 | 5 | No AI; US$0, ledgers empty |
| D8 | 5 | Shared library › Forms unchanged; the tooltip now says "since it was last checked" |
| D9 | 5 | J2 notice and row agree (still Newer); J1 notice and row agree (Ready) |
| D10 | 5 | Plain words |
| D11 | 4 | The "check" words do not cover "same file, page re-dated"; the action sits under "Replace with a new edition…" (unchanged) |
| D12 | 5 | No sideways scroll at 400 and 1024 (400 stands in for 200 % at 1024 CSS px; CSS zoom is not reflow) |
| D13 | 5 | axe 0 on both states ×2 journeys; keyboard: Enter on the row menu, Enter on the item; focus returns to the trigger |
| D14 | 5 | Team components |
| D15 | 5 | First rows 1.19–1.23 s cold; the check's notice is present by 1.27 s |
| D16 | 4 | 59 + 80 + 95 green, with property tests; M1 and M3 survive (issue 2) |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | The canada.ca answer and the row agree; the evidence shows the check's baseline path rarely fires (issue 1) |
| D19 | 5 | Fill → row → check → Find again hand-off named in the notice |
| D20 | simulated only | The founder's walkthrough |

**Graph (P-86):** read from the committed `qa/GRAPH.md`. `graph.mjs` needs a committed tree, so it could not regenerate in the /tmp copy, and I did not run it in x5i, to leave GRAPH.md untouched. G3 lists 2 routes, neither in the form library. `check-canada` and `fill-from-index` are reached by tests. C2.6 is named.

## Journey score: 9 / 10 (pass, no criterion at 0)
The full record is in `journey-test-reviewer-2026-10-31-x5a-63d2ba6d.md`.

## What I could not check
* Find again re-dating the same file end to end: replay stopped at step 1 for "With an LMIA" (no saved page choice), and live AI is not allowed. I checked it from the code (`finder.ts:581`) and the S4 suite.
* Live canada.ca: whether IRCC ever moves "Last updated" without a new PDF, or lists a date later than the page's.
* A real screen reader. An unaided walk by an intended user (D17 and D20 stay with the founder). Retrofit mapping: not applicable.

---

# Re-check of commit 6bc5eb72 ("Check against canada.ca" compares the file itself), 31 Oct 2026

Reviewer, fresh context. Focus: `git diff 63d2ba6d 6bc5eb72 -- '*.ts' '*.tsx' '*.sql'`, with `337cdfd5..6bc5eb72` for context.
* Copies: :4452 (journeys, recorded copies as committed) and :4453 (canada.ca copies edited by `/tmp/x5rv6b-scripts/fx.py` inside the copy's own folder, `STUDIO_CANADA_FIXTURES=fx`), both from `/home/user/x5i`, web built first. :4454 and :4455 from a `git archive 6bc5eb72` copy in `/tmp/x5rv6b-mut` (node_modules entries symlinked to x5i's).
* All stopped, databases dropped, var folders removed. No `*_LIVE`, no `STUDIO_CANADA=live`, no `prisma generate`: US$0. The ledger folders stayed empty, except the finder suite's stub entries (`caller: stub`, US$0) in `/tmp/x5rv6b-l4`.
* Slice3 screenshots: the browser suite ran in the /tmp copy, so none in x5i changed. Scripts are in `/tmp/x5rv6b-scripts/`, screenshots in `/tmp/x5rv6b-shots/` (not committed).

**Verdict: Block (Ship after fixes).** M13 and M14 are closed as written: other bytes → "check", same bytes → "current" with a baseline and an audit line, also for an undated upload. But the check's new re-date of `canada_updated` opens a false Ready (issue 1, Major). The fix is one line and a test.

**Results.**
* `check_forms_x5_library` 60/60. `check_forms_s4_canada` 80/80. Browser suite 95/95 (fresh database). `tsc --noEmit -p api` clean.
* `check_forms_s4_finder` (it calls Replace and the check) could not run: it needs `STUDIO_AI_LIVE=approved`, which this check may not set.

## Your five questions
1. **Replace path (⋯ › Replace edition… on a combination):** it is the same `checkCanada` (`form-library.ts:315-320`). Live on :4452 (J5): toast "IMM 1295 (09-2023) is canada.ca's current file: the same PDF (page last updated 2023-09).", 135 ms, baseline moved to the new index date 2026-10-25, axe 0. Stale version → 409 "Changed since". Approver → 403. On Library › Forms the item is disabled for the approver.
2. **PDF download fails:** 409 "canada.ca could not be read" with the reason and "Upload its new edition's PDF instead, or try again later." (J4: IMM 5257's PDF left out of the copies). The row stays Newer. No baseline and no audit line are written. **But** `checked_at` moved from 11:09:04 to 11:15:21 on the failed check (issue 2).
3. **Cost:** one PDF per click, US$0. Live it is capped at 25 MB and 60 s (`api/src/canada.ts`). On the recorded copies a check takes 122–135 ms. The list and the fill download nothing, and nothing checks per row or in bulk. All 7 sample forms with a recorded page also have their PDF recorded, and the bytes equal the library's. IMM 5488, 5881 and 5905 have no recorded page, so they get 409, as before.
4. **`finder.ts` and the check:** they give the same answer: same bytes means current. Both re-date `canada_updated` from the page (`finder.ts:581`, `form-library.ts:251`). Only the check sets a baseline. The finder re-dates every edition with that checksum and writes null when the page has no date; the check keeps the old value. They share issue 1.
5. **A false Ready: yes, one (J7, issue 1).** None in the other paths I tried:
   * other bytes at the same address;
   * a held copy with canada.ca's date (judged on the approved file only);
   * a failed download;
   * a label for a future month (`fileMonth` drops it, so the file is judged as undated).

## Issues, ranked
1. **Major (D18, D1; a false Ready): the check moves the file's month to the page's month, and the month rule then ignores the check's own baseline.**
   * Where: `form-library.ts:251` writes `canadaUpdated: page.lastUpdated`. `newerOnIndex` (`library-index.ts:45`) compares months once an index date is past the baseline.
   * J7 (:4453), step 1: IMM 1295's page reads "Last updated: October 2026" with the same PDF, and the index says 2026-10-05. The fill marks it Newer. The check says current. The file is re-dated 2023-09 → 2026-10, the baseline is 2026-10-05, and the row reads Ready (all correct so far).
   * Step 2: IRCC lists IMM 1295 on 2026-10-20 (a new edition later that month). The fill says "0 … with a newer edition", and the row reads **Ready** on the 09-2023 file (`j7-B-1295-1440.png`).
   * Rule check: `newerOnIndex("2026-10-20", "2026-10", "2026-10-05")` is false. With the file's own month, `("2026-10-20", "2023-09", "2026-10-05")` is true.
   * At 63d2ba6d this check said "check" and the row stayed Newer. `finder.ts:581` has the same re-date without a baseline (since 89cccd71). I called that re-stamp right at 63d2ba6d; it is not right for this case.
   * Fix: drop the `canadaUpdated` re-date in the check. The baseline alone answers M13 and M14: mutation "nodate" fails only the C2.6 M14 assertion that `canada_updated` is filled, and that row still reads Ready.
   * Change that assertion. Add a test: a page month later than the file's, checked, then a later index date in the same month → Newer. Fix `finder.ts:581` the same way, or record its limit.
   * Not recommended: making the baseline decide alone (`if (seenCurrent) return isLaterDate(...)`). That fails 4 tests (M3, the 89cccd71 test and two property models).
2. **Should (D9; EXPERIENCE "feedback and state"): a failed check still records "checked".**
   * Where: `form-library.ts:243` writes `checkedAt` before the download at `:249`. The detail panel shows "· checked <when>" (`library-forms.tsx:316`), and the API's `checked_at` moved on the 409 in J4.
   * Fix: write `checkedAt` only after the PDF is read.
3. **Should (D16; [M] "a rule's test fails when the rule is removed"): two rules on the new path have no failing test.**
   * (a) Compare with the current file only. Mutation "anyfile" (`pdf.sha256` equal to any edition's) passes 60/60. That mutation is a false Ready: a held copy that is canada.ca's file would vouch for an older approved file. Fix: in the M6 test (`check_forms_x5_library.ts:164-177`), give the held copy canada.ca's real checksum and the approved file another one, then assert "check" and no baseline.
   * (b) The baseline is never lowered (m36). Mutation "lower" passes 60/60. It can only cause a false Newer, so it ranks below (a).
4. **Should (D11): the "check" answer now means "canada.ca serves another file", but its words do not say so.**
   * `form-library.ts:257` gives only the page date and "Run "Find again" on a combination that uses it". In J2 IMM 5257 is "Not used" (`j2-other-bytes-1440.png`), so that is a dead end.
   * Fix: say the library's file differs from canada.ca's PDF, and point to Upload PDF when no combination uses the form.
5. **Minor (D9):** neither menu shows a running state while the check reads a PDF (`library-forms.tsx:282-290`, `forms.tsx:182-193`). Live, that can take up to 60 s.
6. **Minor (D10, recorded copies only):** a missing recorded PDF is reported as "This page is not in the recorded canada.ca copies" (`api/src/canada.ts:120`).

**Mutations (in `/tmp/x5rv6b-mut`, each against a fresh :4454):**
* Caught: "nodate" (1 fail, the re-date assertion only).
* Survived: "anyfile" and "lower" (issue 3).
* Your two (the always-equal comparison, a baseline on every edition) were not repeated.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | Same bytes = current, other bytes = check (J1–J3); J7 false Ready (issue 1) |
| D2 | 5 | M14 answered: an undated upload goes Newer → Ready with one check (J3) |
| D3 | 4 | One check for Library and Replace; the finder and the check re-date differently (null vs kept, all shas vs current) |
| D4 | 5 | Migration note corrected; no schema change in this commit |
| D5 | 5 | Guarded baseline write; `updateMany` (no 500 on a vanished edition); a triple check gives 1 edition, 3 audit lines |
| D6 | 5 | Baseline and re-date on the current edition's id only (`:251-253`); the M6 test (held copy keeps its own) passes |
| D7 | 5 | No AI; US$0 |
| D8 | 5 | Shared library › Forms; menu words unchanged |
| D9 | 4 | Toast and row agree in J1–J5; a failed check still says "checked" (issue 2) |
| D10 | 5 | "…is canada.ca's current file: the same PDF" is plain |
| D11 | 4 | "check" words lead to Find again even for unused forms (issue 4) |
| D12 | 5 | No sideways scroll at 400 and 1024 (CSS zoom at 200 % does not reflow; 400 stands in) |
| D13 | 5 | axe 0 on Newer, Ready and the combination's Forms tab; keyboard: Enter on ⋯, Enter on the item |
| D14 | 5 | Team components and toasts |
| D15 | 5 | Check 122–135 ms on recorded copies; first rows 0.80–1.30 s cold |
| D16 | 4 | 60 + 80 + 95 green; "anyfile" and "lower" survive (issue 3) |
| D17 | simulated only | No intended user walked it |
| D18 | 3 | J7: the row says Ready while canada.ca lists a later date than the check confirmed |
| D19 | 5 | Replace from the combination and Library › Forms give the same answer |
| D20 | simulated only | The founder's walkthrough |

**Graph (P-86):** read from the committed `qa/GRAPH.md` (not regenerated, to leave it untouched). G3 lists 2 routes, neither in the form library. `check-canada` and `…/forms/:code/replace` are reached by tests (x5 library suite; finder and runs suites).

## Journey score: 8.5 / 10 (pass, no criterion at 0)
The full record is in `journey-test-reviewer-2026-10-31-x5a-6bc5eb72.md`. Correct data scores ½ because of J7.

## What I could not check
* `check_forms_s4_finder` (needs `STUDIO_AI_LIVE=approved`).
* Live canada.ca: how often a page's "Last updated" runs ahead of its PDF.
* A real screen reader. Browser zoom proper.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* The breaker's 6bc5eb72 round was being written in `break-report-x5a.md` meanwhile (not by me). I did not use it.

# Re-check of commit 0796fc0c (a file's month is its printed edition's; the check no longer re-dates), 31 Oct 2026

Reviewer, fresh context. Focus: `git diff 6bc5eb72 0796fc0c -- '*.ts'`, with `337cdfd5..0796fc0c` for context.
* Copies from `/home/user/x5i`, web built first (`vite build`), `tsc --noEmit -p api` clean:
  * :4452 runs the suite, then the journeys on the recorded copies as committed.
  * :4453 runs the browser suite.
  * :4454 uses canada.ca copies edited by `/tmp/x5rv7-scripts/fx.py` inside the copy's own folder (`STUDIO_CANADA_FIXTURES=fx`), for J4 and J7.
* :4455 ran the mutations, from a `git archive 0796fc0c` copy in `/tmp/x5rv7-mut` (node_modules entries symlinked to x5i's).
* All copies stopped, databases dropped, var folders removed. No `*_LIVE`, no `STUDIO_CANADA=live`, no `prisma generate`: US$0. The ledger folders were never created.
* The browser suite rewrote the slice3 screenshots in x5i. I restored them with `git checkout`, and the tree is clean apart from these two records.

**Verdict: Approve.** No Blocker or Major is open. The 6bc5eb72 Major is closed, both in the code and live (J7). Three Shoulds and two Minors remain (below). None of them is a false Ready on a dated file.

**Results.**
* `check_forms_x5_library` 63/63. `check_forms_s4_canada` 80/80. Browser suite 95/95 (fresh database).
* `check_forms_s4_finder` not run: it needs `STUDIO_AI_LIVE=approved`.

## Your three questions
1. **Any remaining false Ready: none for a file whose label prints a month.**
   * The new `fileMonth` (`library-index.ts:35`) returns the printed month, or an earlier month than before, never a later one. So the change can only add Newer, never hide it.
   * J7 re-run (:4454): the page reads "October 2026" with the same PDF and the index says 2026-10-05. The check says current, baseline 2026-10-05, Ready. Then the index moves to 2026-10-20. The fill now says "1 with a newer edition on canada.ca (IMM 1295)", and the row reads **Newer** (`/tmp/x5rv7-shots/j7-B-1295-1440.png`). Before this commit it read Ready.
   * Other paths still hold: other bytes ("check", no baseline, J2); an older approved edition holding canada.ca's bytes (the new M13 test); a failed PDF download (J4); a guide (409).
   * **One remains for an undated file** (issue 1, below).
2. **The finder's re-dating (`finder.ts:581`) under the label-first rule.**
   * For a labelled file it no longer matters. Control on :4452: IMM 5409 (01-2023) with `canada_updated` 2026-10 and the index at 2026-10-20 reads `newer_file`.
   * For a file whose label has no valid month (`(13-2025)`, which intake accepts: m35), `fileMonth` falls back to that page month. Then the J7 pattern returns (issue 1).
   * `finder.ts:633`, `:740` and `upload-run.ts:157` write the page month too, but at download or upload time, which is the intended fallback.
3. **The Replace path still answers.** J5 is ⋯ › "Replace edition… (checks canada.ca)" on "With an LMIA" › Forms.
   * Toast in 166 ms: "IMM 1295 (09-2023) is canada.ca's current file: the same PDF (page last updated 2023-09)."
   * The baseline moved to 2026-10-25, and axe found 0 issues. The approver sees the item `aria-disabled`.
   * It is the same `checkCanada` (`form-library.ts:329`).

## Your deferred items: none should block
* **M15 (no way to take a different PDF unless a combination uses the form):** not a blocker. The check refuses nothing and marks nothing wrongly, and Upload PDF on the same page is a way in. The words should still point there (issue 3).
* **Background job and busy state:** Minor. On the recorded copies a check takes 55–166 ms. Live it can take up to 60 s.
* **m34/m35 (undated files):** not a blocker. Please add issue 1 to that list in the PR body: it is the same class of file, and it is not listed today.

## Issues, ranked
1. **Should (D18; a false Ready limited to undated files): `finder.ts:581` still writes the page month onto every edition with canada.ca's bytes, and `fileMonth` uses it when the label has no month.**
   * J8 (:4452; the finder's write stood in for by SQL, since Find again needs live AI):
     * IMM 5409 is relabelled `(13-2025)`, with the index at 2026-10-05. A check says current, sets baseline 2026-10-05, and the row reads Ready.
     * The index moves to 2026-10-20. With no page month on the file the row reads `newer_file` (right).
     * After `canada_updated = '2026-10'`, which is what `:581` writes when the page says October 2026, the row reads **`ready`**.
   * Limits: it needs an undated label *and* canada.ca's bytes, and canada.ca's own PDFs print a real month. So it is rare, and it belongs with m34/m35.
   * Fix: drop `canadaUpdated: fp.lastUpdated` at `:581`, as the check did, or record it with m34/m35.
2. **Should (D16; [M] "a rule's test fails when the rule is removed"): "nothing is recorded as checked when the PDF fails" (m39) has no failing test.**
   * Mutation "early" (write `checkedAt` before the download) passes 63/63.
   * The behaviour itself is right: in J4, `checked_at` stayed at 11:41:39.472 across the failed check.
   * Fix: in the suite, take a form's PDF out of a fixture copy (as `fx.py` does), check, and assert that `checked_at` is unchanged.
3. **Should (D11): the "check" words still send an unused form to "Find again on a combination that uses IMM 5257".**
   * J2: IMM 5257 is "Not used". The first half now says what was found ("canada.ca now serves a different PDF for IMM 5257 than the library's file (IMM 5257 (09-2023))"), which is good.
   * Fix: add "or upload its PDF" (the no-file branch already says it) when the form is not used.
4. **Minor (D18, audit): the audit's `baseline` is the index date read, not the baseline kept.**
   * With a later baseline 2099-01-01 kept, the audit detail says `"baseline": "2026-10-20"` (`form-library.ts:216`, `:262`).
   * Fix: record the stored value (re-read it, or omit it when the guarded write changed 0 rows).
5. **Minor (D10, recorded copies only):** J4's words nest the copy's own message: "…its PDF could not be downloaded (This page is not in the recorded canada.ca copies…)". It reads "page" for a PDF. Live wording not checked.

**Mutations (in `/tmp/x5rv7-mut`, each against a fresh :4455; the unmutated copy gives 63/63):**
| Mutation | Result |
|---|---|
| anyfile (match any edition's bytes) | caught (M13) |
| lower (no guard on the baseline) | caught (m36) |
| maxmonth (old later-of-two rule) | caught (3: M10 pass, the 6bc5eb72 M test, the property) |
| redate (the check writes the page month again) | caught (M14) |
| noclear (keep `newerFileSha256`) | caught (2) |
| guide (no refusal) | caught (m40; only by its words, since the fixture also gives 409) |
| early (`checkedAt` before the download) | **survives** (issue 2) |

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | Same bytes = current, other bytes = check, guide refused, J7 Newer (J1–J7) |
| D2 | 5 | M14: an undated upload goes Newer → Ready with one check, not re-dated (J3: `canada_updated` stays null) |
| D3 | 4 | Library and Replace share one check; the finder still re-dates (issue 1) |
| D4 | 5 | No schema change |
| D5 | 5 | Guarded baseline; 3 quick checks leave 1 edition, the same dates and 3 audit lines |
| D6 | 5 | Writes on the current edition's id only; the older-edition test passes |
| D7 | 5 | No AI; US$0 |
| D8 | 5 | Shared library › Forms; menu words unchanged |
| D9 | 5 | A failed check moves nothing (J4); toast and row agree |
| D10 | 5 | "canada.ca now serves a different PDF for … than the library's file (…)" |
| D11 | 4 | Next step for an unused form (issue 3) |
| D12 | 5 | No sideways scroll at 400 and 1024 (CSS zoom does not reflow; 400 px stands in for 200 %) |
| D13 | 5 | axe 0 on Newer, Ready and the combination's Forms tab; keyboard: Enter on ⋯, Enter on the item |
| D14 | 5 | Team toasts and pills |
| D15 | 5 | Check 55–166 ms; fill 221 ms; first rows 0.76 s |
| D16 | 4 | 63 + 80 + 95 green; 6 of 7 mutations caught; "early" survives (issue 2) |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | J7 closed; undated-file edge through the finder (issue 1); audit baseline (issue 4) |
| D19 | 5 | Replace from a combination and Library › Forms give the same answer |
| D20 | simulated only | The founder's walkthrough |

**Graph (P-86):** read from the committed `qa/GRAPH.md` (`graph.mjs` needs a git work tree, and I did not regenerate it in x5i, to leave it untouched). G3 lists 2 routes, neither of them in the form library. `check-canada` is reached by the x5 library suite.

## Journey score: 9 / 10 (pass, no criterion at 0)
Full record: `journey-test-reviewer-2026-10-31-x5a-0796fc0c.md`.

## What I could not check
* `check_forms_s4_finder` and Find again end to end (need `STUDIO_AI_LIVE=approved`), so J8 stands in for `:581` by SQL.
* Live canada.ca.
* A real screen reader. Browser zoom proper.
* An unaided walk by an intended user (D17 and D20 stay with the founder).

# Round at 521bc9c4

Reviewer, fresh context, 31 Oct 2026. Scope: `git diff 0796fc0c 521bc9c4` (`finder.ts`, `form-library.ts`, `check_forms_x5_library.ts`), plus a sanity pass on `git diff origin/main...521bc9c4`.
* Copies on :4450–4453 only:
  * :4450 ran the suite from the checkout, then the journeys from a `git archive 521bc9c4` copy in `/tmp/rv521`.
  * :4451 and :4452 ran the M16 and no-file repros and the mutations, from `/tmp/rv521m`.
  * :4453 ran the browser suite.
* canada.ca was replayed from edited copies inside each copy's own folder (`STUDIO_CANADA_FIXTURES=fx`, `/tmp/rv521-scripts/fx.py`). Find again ran on saved answers (`replay`). No `*_LIVE`, no `STUDIO_CANADA=live`, no `prisma generate`: US$0.
* All copies stopped and their 7 databases dropped. Nothing in the checkout changed apart from these two records. (`break-report-x5a.md` changed during my run: that is the breaker's round, not mine.)

**Results.**
* `tsc --noEmit -p api` clean.
* `check_forms_x5_library` 65/65, twice.
* `check_forms_s4_canada` 80/80. `check_forms_demo` 23/23. Browser suite 95/95.
* My journey script (`/tmp/rv521-scripts/journey.cjs`) 28/28, twice.
* Graph at 521bc9c4: G1 0, G2 0, G3 2 (neither is a form-library route).

## Each claim, checked live and by mutation
Mutations were made in `/tmp/rv521m`, each on a fresh :4452. Two detectors:
* "suite" is the committed `check_forms_x5_library`.
* "journey" is my US$0 repro (`/tmp/rv521-scripts/j-m16.sh`): IMM 5645's page is re-dated to March 2025 with the same PDF, the index is set to 2025-03-12, then fill and Find again (replay) on "Visitor visa". The index then moves to 2025-06-02, followed by a fill and Find again. Finally a marker is planted, followed by Find again.

| Claim | Live at 521bc9c4 | Mutation | Suite | Journey |
|---|---|---|---|---|
| M16, download (`finder.ts:640`) | Fixed: the downloaded IMM 5645 (01-2021) reads **Ready**, baseline 2025-03-12 (at 0796fc0c: Newer) | drop `indexDateSeenCurrent` at create | **survives** 65/65 | caught |
| M16, same bytes (`:585`) | Fixed: index to 2025-06-02, fill gives "1 with a newer edition (IMM 5645)", Find again gives "already", row **Ready**, baseline 2025-06-02 | `if (false)` | survives (one unrelated timing fail, below) | caught |
| m46 (`:586`) | Fixed: planted marker, Find again gives Ready, marker null | delete the clear | **survives** | caught |
| m48 (`form-library.ts:264`) | Code right: clears only if the marker is still the one read at `:245` | unguard | survives | survives (a race; replay cannot switch files mid-check) |
| m45 (`:267`) | Fixed: the audit says the baseline kept (2099-01-01; J3: 2025-06-02) | revert to `def.indexDateModified` | caught | n/a |
| No file: answer before downloading (`:252`) | Fixed: IMM 5645/5646 with no file and the PDF at 404 gives 201 "…has no approved file in the library to compare… or upload its PDF." (mutated: 409 "canada.ca's PDF could not be read") | `if (false)` | **survives** 65/65 | caught by `/tmp/rv521-scripts/j-nofile.sh` |
| Review 3 words | "…or upload canada.ca's PDF." (J5, IMM 5409 with other bytes) | n/a | n/a | n/a |

## Blocker
None.

## Major
1. **Must (D16; [M] "a rule's test fails when the rule is removed", STANDARDS §7): 4 of the round's 6 fixes have no test that fails when the fix is removed. One of them is the round's only Major, M16.**
   * Removing the finder's download baseline, its same-bytes baseline, or its marker clear leaves the committed suites green: x5 library 65/65. No US$0 suite asserts a baseline after a finder run. Grep: `index_date_seen|newer_file` appears in no finder suite. `check_forms_s4_finder` needs live AI.
   * The new "no approved file" test (`check_forms_x5_library.ts:206–209`) passes without its fix. Changing the edition's `sha256` makes `current` null. The fixture PDF still downloads. So the old tail branch (`form-library.ts:271`) gives the same "no approved file" words. The test's own note ("before: … a missing PDF gave 409") is never exercised.
   * The code itself is right (table above), so this is tests only. A US$0 test is feasible: the `j-m16.sh` sequence runs at US$0 with the committed saved answers and an edited fixture copy.
   * Fix:
     * Add a replay test that downloads IMM 5645 under a re-dated page (expect Ready), then moves the index (expect Newer, then Ready after Find again), then plants a marker (expect it cleared).
     * In the no-file test, give the form's PDF a 404 in a fixture copy, so that removing `:252` turns 201 into 409.

## Minor
2. **m49 (new, from reading the code; not run): the finder's new marker clear (`finder.ts:586`) is unguarded. It has the same shape that m48 fixed in the check.**
   * Run 1 downloads the old bytes. Canada.ca switches files. Run 2 downloads the new bytes and marks the edition (`:627`). Run 1 then clears that mark.
   * The window is from run 1's download to its write (milliseconds), far narrower than the check's 60 s, so it is rare.
   * Fix: guard the write with the marker read in `formFor` (`def.editions`), as `:264` does.
3. **Carried Shoulds from the 0796fc0c review: not addressed, and the commit names only 3 and 4.**
   * (1) `finder.ts:582` still writes the page month, which gives the undated-label false Ready.
   * (2) m39 still has no failing test.
4. **A timing assertion is flaky:** `check_forms_x5_library.ts:127` (list under 300 ms) failed once at 330 ms during the `same` mutation run (unrelated to the mutation). It was 65/65 on both clean runs.
5. **Dead branch:** the `current ?` else-text at `form-library.ts:271` can no longer be reached after `:252`. This is harmless, but it is what lets the test in issue 1 pass.

## Whole-PR sanity (origin/main...521bc9c4)
* The schema change is additive (7 lines). Library page, browser suite and x5 suite are all green.
* Roles, with Check = ⋯ › "Replace with a new edition…":
  * user-B: the item is disabled, and the API gives 403.
  * user-C: 403. No actor: 401.
  * A guide gives 409. Unknown codes and 5,000-character codes give 404.
* 8 checks at once: all `current`, 1 edition, baseline kept, 8 audit lines.
* axe 0 on 4 states. No sideways scroll at 1440, 1024 or 400. 0 page errors.
* Check takes 55–60 ms, fill 200–258 ms, and Find again (replay) about 1.35 s.

## D1–D20
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | J1–J5: download Ready, page edit answered by Find again, no-file in words, other bytes in words |
| D2 | 5 | M16 closed: what the product just fetched never reads "newer" |
| D3 | 4 | Finder and check now share the guarded baseline; finder marker clear unguarded (issue 2) |
| D4 | 5 | No schema change this round |
| D5 | 5 | Guarded never-lower writes; 8 concurrent checks consistent |
| D6 | 5 | Check writes the current edition's id only |
| D7 | 5 | No AI; replay US$0 |
| D8 | 5 | Menu words unchanged |
| D9 | 5 | Toast and row agree (J2–J5) |
| D10 | 5 | "…has no approved file in the library to compare…", "…or upload canada.ca's PDF." |
| D11 | 5 | Unused form now offered upload (review 3 closed) |
| D12 | 5 | 400, 1024 and 1440, no sideways scroll |
| D13 | 5 | axe 0; keyboard ⋯ › Enter, focus returns to ⋯ |
| D14 | 5 | Team toasts and pills (`/tmp/rv521-shots/j4-nofile.png`) |
| D15 | 5 | See timings above |
| D16 | 3 | Suites green, but 4 of 6 claimed fixes survive removal (issue 1) |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | Audit baseline fixed; undated edge carried (issue 3) |
| D19 | 5 | Library and combination give the same answers |
| D20 | simulated only | The founder's walkthrough |

## Journey score: 9.5 / 10 (pass, no criterion at 0)
Full record: `journey-test-reviewer-2026-10-31-x5a-521bc9c4.md`.

## What I could not check
* Live canada.ca. A file switching mid-check (m48, m49).
* `check_forms_s4_finder` (needs live AI).
* A real screen reader. Browser zoom proper (400 px stands in for 200 %).
* An unaided walk by an intended user.

**Verdict: Block.** This is ship after fixes, and the fixes are tests only: the code for M16, m45, m46, m48 and the no-file answer is right, both live and on reading. To fix: issue 1, meaning a US$0 replay test for M16 and m46, and a no-file test that fails without `:252`. Issues 2–5 can follow.

# Round at 7570c9f4

Reviewer, fresh context, 31 Oct 2026. Scope: `git diff 521bc9c4 7570c9f4`: the new `check_forms_x5_finder_baseline.ts`, `finder.ts` (m49 baseline read before the download, m51 marker cleared only if it is the one read) and the removed dead branch in `form-library.ts`. The breaker's M15 is a follow-up proposed to the tech lead, not this commit's scope.
* Copies on :4450–4453 only, through `isolated.sh`.
  * The suites ran from the checkout, each with its own usage line. `check_forms_s4_finder` and `check_forms_s4_runs` were paired with the fake launcher, as their usage lines say.
  * Mutations and journeys ran on a `git archive 7570c9f4` copy in `/tmp/rv757m` (`/tmp/rv757-scripts/mut.sh`), a fresh database for each.
* canada.ca was replayed from fixture copies (`STUDIO_CANADA_FIXTURES=fx`). Find again used saved answers. No other `*_LIVE`: US$0.
* All copies stopped and their 10 databases dropped. A browser suite rewrote the `screenshots/slice3/` files and `check_forms_channels` rewrote its evidence JSON: both restored with `git checkout --`. Only this record and the journey report were written.

**Results**
* `tsc --noEmit -p api` clean.
* The new suite: `check_forms_x5_finder_baseline` 7/7 (39 s), and 7/7 again on the archive copy.
* Regression suites:
  * `check_forms_x5_library` 65/65 (the 300 ms list timing held this time).
  * `check_forms_s4_finder` 144/144 and `check_forms_s4_canada` 80/80.
  * `check_forms_demo` 23/23, `check_forms_s4_runs` 91/91, `check_forms_channels` 105/105 and `check_forms_s4_library_browser` 95/95.
* `select-suites.mjs` picks the new suite for this change, so CI runs it.
* Graph: G1 0, G2 0, G3 2. Both G3 routes are attachment routes, not form-library ones.
* My journey script (`/tmp/rv757-scripts/journey.cjs`) passed 26/26, twice.

## Each fix removed, against the new suite
| Fix removed (archive copy, fresh database) | Result | Check that fails |
|---|---|---|
| A: download baseline (`finder.ts:641` to `null`) | **6/7** | M16 download |
| B: same-bytes baseline (`:585` to `if (false)`) | **4/7** | M16 same bytes, m46, m36 never lowered |
| C: marker clear (`:587` to `false &&`) | **6/7** | m46 |
| D: no-file early answer (`form-library.ts:252` to `if (false)`) | **6/7** | no-file 201 (mutated: 500, because `current.editionLabel` is null) |
| E: the finder's never-lower guard (`:585` OR removed) | **6/7** | m36 |
| F: m39, the check stamped before the download | **6/7** | m39 |
| A2: m49 reverted (`d.indexDateModified`, read after the download) | 7/7, survives | a race: replay cannot land a fill mid-download |
| C2: m51 reverted (the old unguarded clear) | 7/7, survives | a race: replay cannot interleave two runs |

The previous round's Major is closed. M16 (both paths), m46 and the no-file answer each now have a committed US$0 test that fails when the fix is removed. The commit's own counts (A 6/7, B 4/7, C 6/7, D 6/7) are exact. The m39 Should carried from 0796fc0c is closed too (F).

## The finder changes, read and walked
* **m49 (`finder.ts:590, 600, 641`):** `indexAtStart` is `def.indexDateModified` from `formFor`'s read, which comes before `canada.get`. Before this fix, `storeDownloaded` read the definition again after the download, so a fill landing in between could stamp a date the bytes were never checked against.
  * In the usable path, `create` is never reached (`pdfEditions` is non-empty), so passing the value there is harmless.
  * When the definition does not exist at the start, the baseline is null. That is the conservative answer, and the same as before for a form never filled.
* **m51 (`:587`):** clears only `{ id: e.id, newerFileSha256: <value read at the start> }`. This is the same shape as the check's m48 guard. A marker that another run set after this run's read survives.
  * J3 walked a real marker, not a planted one. canada.ca's IMM 5645 PDF got other bytes with the same edition, and Find again showed "Newer file on canada.ca" (`/tmp/rv757-shots/j3-marked.png`), still with 1 edition.
  * canada.ca then served the library's bytes again. Find again showed **Ready**, with the marker null and the baseline kept at 2025-06-02.
* **The dead branch (`form-library.ts:271`):** removed. `current` is non-null there because `:252` returns first. The words for other bytes are unchanged (the J5 words from the last round).
* **No regression:** all finder, library and canada suites are green. 8 concurrent checks all gave `current`, with 1 edition, the baseline kept and no marker.

## Blocker
None.

## Major
None.

## Minor
1. **Should (D16): the two race fixes, m49 and m51, have no test that fails when they are removed** (A2 and C2 above). The code is right on reading. Replay cannot interleave a fill or a second run mid-download, and the m48 guard was accepted on the same basis last round. Fix when there is a way to pause the fake canada source, for example a fixture delay: start Find again, fill a later index (m49) or mark a newer file (m51) during the pause, then assert.
2. **Carried Should from 0796fc0c, still open: the undated-label false Ready.** `finder.ts:582` still writes the page month into `canadaUpdated` on the same-bytes path. This is not this commit's scope, and the commit does not claim it.
3. **Observation, not scored:** the first "Check against canada.ca" after a copy restart took 692 ms (cold process). Warm checks took 107 ms. This is not a product path a user meets after a deploy warm-up.

## D1–D20 (changes from the 521bc9c4 round only; the rest are as scored there)
| D | Score | Evidence |
|---|---|---|
| D3 | 5 | The finder's marker clear is now guarded, like the check (m51). The download baseline is read before the download (m49) |
| D16 | 4 | Every non-race fix has a failing test (A–F). The two race fixes are untested (issue 1) |
| D18 | 4 | Undated-label edge carried (issue 2) |
| D17, D20 | simulated only | No intended user walked it |

## Journey score: 9.5 / 10 (pass, no criterion at 0)
Full record: `journey-test-reviewer-2026-10-31-x5a-7570c9f4.md`.

## What I could not check
* Live canada.ca. A real mid-download race (m49, m51).
* The full selected suite set. CI runs all 70+ selected suites, and I ran the 8 nearest.
* A real screen reader. Browser zoom proper (400 px stands in for 200 %).
* A visible browser (headless only). An unaided walk by an intended user.

**Verdict: Approve** for 7570c9f4. There is no open Blocker or Major. Issues 1 and 2 are Shoulds and can follow.
