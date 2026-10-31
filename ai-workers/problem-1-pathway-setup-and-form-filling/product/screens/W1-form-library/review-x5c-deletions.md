# X5 slice c "remember a deletion": independent CHECK of commit 02ca83a5, 31 Oct 2026

Reviewer: I did not build this. I reviewed `git diff 7570c9f4 02ca83a5` (stacked on PR #146) in the worktree `/home/user/f2`. I checked it against the tech lead's answer on #138 (question 2), P-156 (1), STANDARDS §5 and §7, EXPERIENCE, and QUALITY D1–D20.

**Verdict: Block** (ship after fixes). Issue 1 is a Major. Issue 2 is a Major against a STANDARDS [M] line.

**How I tested.**
* **Copies.** Copy `x5c_rev` on :4454 ran the commit. Copy `x5c_mut` on :4455 ran mutants built from `git archive 02ca83a5` into `/tmp`, so the repo was not edited.
* **Clean-up and spend.** Both copies are stopped and their databases dropped. US$0. No `*_LIVE` was set, except `check_forms_s4_finder.ts` with the fake launcher, as its own usage line pairs them.
* **Suites.** All passed:

  | Suite | Result |
  |---|---|
  | `check_forms_x5_library.ts`, run twice | 72/72 both times |
  | `check_forms_s4_library_browser.cjs` | 95/95 (its screenshots restored with `git checkout --`) |
  | `check_forms_x5_finder_baseline.ts` | 7/7 |
  | `check_forms_s4_finder.ts` | 144/144 |
  | `check_forms_demo.ts` | 23/23 |
  | `check_s6_library_sources.ts` | 39/39 |
  | `tsc --noEmit` | clean |
* **Graph.** G1–G6 = 0/0/2/0/0/0. The two G3 routes are older attachment routes.
* **Migration.** `prisma migrate diff` (database against schema) shows no drift for `library_form_deletion`.
* **Not mine.** `break-report-x5c.md` appeared during my session; I left it alone. Its M1 matches my issue 1, reached on its own.

## What holds
* **The rule is right.** An approved library delete writes one row: who, which change, when (`lifecycle.ts:449`). It is written in the same transaction as the delete, and only when the delete really happens (a returned delete writes nothing).
* **The fill skips it.** The memory is read inside the fill's transaction (`form-library.ts:191`). A person adding the form back forgets it.
* **No creation path is missed.** `grep govFormDef.create|upsert|createMany` finds 6 creation sites. All 5 outside the fill forget the memory:

  | Path | Where |
  |---|---|
  | Intake upload | `intake.ts:353` |
  | Finder guide link | `finder.ts:558` |
  | Finder download (Find again) | `finder.ts:643` |
  | A form drafted from a source | `sources.ts:777` |
  | Sample load | `engine/import.ts:83` |

  No raw SQL insert and no nested create exist. Demo reset clears the memory (`demo.ts:193`) and counts it in the reset summary.
* **The race is handled.** I made it deterministic: a trigger writes the deletion row during the fill's insert of IMM 1295. Result: "229 new … 1 left out that was deleted from the library (IMM 1295 …)", IMM 1295 absent, the counts add up.
  * Two things make this sound. The fill's own row is removed only when it is still bare (`listedOnIndexAt: now`, no edition, no use). An insert racing an uncommitted delete waits on the unique index, so the second look sees the committed memory.
* **Counts and words.** Created + already + left out = every form IRCC lists. The audit line carries `deleted` and the same words.
* **Server authorisation.** Self-approval is refused (403). A person without the author duty gets 403 on fill, and the page shows no Fill button.
* **The migration.** New table only, unique on (workspace, number). It has no foreign key, and the migration says why. Rollback is written (`DROP TABLE`). Nothing existing changes (STANDARDS §5 met).

## Issues (ranked)
1. **Major (Must): deleting a schedule or DEP form is permanent, and the fill's advice cannot work.**
   * Repro on :4454:
     1. Fill.
     2. Delete `IMM 0008 SCH4`; user-B approves.
     3. Fill: it is left out.
     4. Upload `official-sources/ircc/forms/imm0008_4e.pdf` (the upload result is "added").
   * What happens: the upload is read as **IMM 0008 (06-2020)** and attached to IMM 0008. The memory for `IMM 0008 SCH4` stays, and every later fill says "left out … (IMM 0008 SCH4; upload its PDF to add one back)".
     * `IMM 0008 DEP` with `imm0008depe.pdf`: the upload is held ("could not read the edition of IMM 0008"), and the memory stays.
     * `IMM 5257 SCH1` works, because the reader knows SCH1.
     * Find again refuses a file that reads as another number (`finder.ts:622`).
     * Nothing in the product shows or clears the memory; only a demo reset does.
   * Why this slice is the cause: the reader's gap is older (`tools/read_form_identity.py:109-116`). Before this slice the next fill listed the form again. Now about 10 listed forms (IMM 0008 SCH2/4/5/6…, DEP, probably IMM 5373 B) cannot be "added back by a person", against the decision's own "unless a person adds the form back".
   * **Fix:** make the add-back work for every number the fill can leave out. The true fix is that the upload reads the schedule/DEP suffix in the library's spelling (`normaliseCode`). A smaller fix is to not remember, or not promise "upload its PDF" for, a number the upload cannot produce.
   * Seen in passing, older than this slice: uploading SCH4's PDF filed it as an edition of IMM 0008.
2. **Major (Must, STANDARDS §7 [M] "a rule's test fails when the rule is removed"): the race rule has no test.**
   * Mutant A removed the second look (`form-library.ts:195`) and the Find again forget (`finder.ts:643`). The suite still passed 72/72.
   * On that mutant, my trigger test shows the bug the second look exists for: IMM 1295 came back with the memory still there.
   * Mutant B removed the upload's forget: 2 checks fail, so that path is guarded.
   * **Fix:** add a fail check that writes the deletion row from an `AFTER INSERT` trigger on `gov_form_def` during a fill. The fill must leave the form out and count it under `deleted`.
3. **Should: the other forget sites have no check.** Removing the forget call in the finder (×2), in `sources.ts:777` or in `import.ts:83` fails nothing; mutant A proved this for `finder.ts:643`. One check per entry point (at least Find again and the sample load) closes it.
4. **Should, words:**
   * With several forms left out, `form-library.ts:213` reads "15 left out that were deleted … ; upload its PDF to add one back" ("its" and "one" are singular). It also names only upload, though Find again adds a form back as well.
   * The Fill tooltip (`library-forms.tsx:253`, "every form number, listed with no file yet") is no longer true.
5. **Minor (optional, the decision says "hidden"):** neither the delete confirm (screenshot `/tmp/x5c-rev/shots/02-delete-confirm-1440.png`) nor the approver's card says that a later fill will not list the form again. With issue 1, an approver cannot tell that the delete is permanent.

## D1–D20 (1–5, this slice only)
| D | Score | Evidence |
|---|---|---|
| D1 | 3 | The rule matches #138 for plain numbers; for schedule forms the add-back fails (issue 1) |
| D2 | 4 | One row per number (unique). The race is safe (trigger test). Counts are exact. Two fills at once still pass |
| D3 | 4 | One helper (`library-deletions.ts`) used by 5 sites. `import.ts` inlines its own delete instead of the helper |
| D4 | 3 | The memory can become unreachable for about 10 numbers (issue 1) |
| D5 | 3 | Reset clears it, and a double click is one fill (audit count). A dead-end memory survives everything but a reset |
| D6 | 4 | Who deleted it and which change are stored; the fill's audit line names the forms left out |
| D7 | n/a | No AI |
| D8 | 4 | Unchanged page; the words name the forms |
| D9 | 3 | The next step the words give is wrong for schedule forms |
| D10 | 3 | Singular/plural slip; tooltip out of date |
| D11 | 4 | Toast and audit; nothing on the delete confirm |
| D12 | 4 | No visual change; the toast reads cleanly (screenshot `04-refill-1440.png`) |
| D13 | 4 | axe passes on 4 states. Keyboard fill in 16 Tabs. No sideways scroll at 400/1024/1440 px or at 200 % zoom (512 px) |
| D14 | 4 | Team toast and words pattern |
| D15 | 5 | Fill of 230 rows in 140–480 ms; no request per row |
| D16 | 3 | Tests exist for remember, skip, upload forget and reset. None for the race or the other forget paths (issues 2, 3) |
| D17 | simulated only | No intended user walked it |
| D18 | 4 | Memory keeps who and which change; the words name the forms |
| D19 | 3 | Delete → fill → add back closes for plain numbers only |
| D20 | simulated only | No intended user walked it |

**Could not check:** a real screen reader; canada.ca live (fixtures only); IMM 5373 B (no recorded PDF); online-only forms with no PDF.
**Journey test:** `journey-test-reviewer-2026-10-31-x5c-02ca83a5.md`, **8.0/10**, pass.
