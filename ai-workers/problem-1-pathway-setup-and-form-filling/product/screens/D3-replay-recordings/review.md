# Review: D3 slice, the Saved field-map answer's edition comes from the file (commit 6f6e7a40)

Reviewer: independent (did not build it), 2 Nov 2026. Branch `claude/relaxed-knuth-hgakgd`, diff `origin/main...6f6e7a40`. The two-dot diff also shows `run-suites.sh`, but that is only main's newer quarantine line (#410). The merge-base diff is `sources.ts` (+4/-1), the new `check_d3_saved_edition.ts`, and `check_forms_c312_field_map.ts`.
Not a screen: no concept.md. I checked it against BACKLOG D3, QA-144, `p2/convert.ts`, STANDARDS and EXPERIENCE. Journey test: `journey-test-reviewer-2026-11-02.md` (**7.5/10**).

## Verdict: Approve (Ship)
The change is correct and small. I checked it against both samples, and it fixes more than the PR says. No Blocker or Major in this diff. One gap I found while testing is older than this change and stays open on D3 (see "Open on D3"). It is not this PR's defect, but the PR body must not claim it is fixed.

## What I ran (isolated copies on 4481–4483, US$0, no *_LIVE, ledger unchanged)
* `check_d3_saved_edition.ts`: **8/8 twice** on 6f6e7a40. **6/8 on the merge base 2c6cb092** (scratch copy): proposals `IMM 5257 (06-2018):84`, library `Not mapped yet`. So the check fails without the fix.
* `check_forms_c312_field_map.ts`: **48/48 twice**. `check_forms_c1113_acceptance.ts` on the six sample: **21/21**. Its "several editions" setup still holds with the clean labels.
* Demo-menu sample (`/demo/load {"sample":"six"}`, the one people load), Form library and Proposals compared before and after the fix:
  * **Base:** all six replayed forms show **"Not mapped yet"** in the Form library. The Proposals groups are titled with the model's text, cut at 60 characters, for example "IMM 5475 (edition date not given in the inventory; source fi", "IMM 5409 (E): edition date not given in the inventory; confi", and "IMM 1344 (07-2014)" for a 09-2024 file.
  * **After:** "AI draft · 48 / 29 / 11 / 18 / 24 / 9 to review" for IMM 1344, IMM 5257 SCH1, IMM 5409, IMM 5475, IMM 5476 and IMM 5707 (139 proposals). The groups are titled with the library's edition labels.
  * This is the larger visible effect of the PR, and nothing in the PR says or tests it (Minor 1).

## Correctness of the edition choice
* `printedEdition(a)` (sources.ts:342) reads the library's `form_edition` row by the file's sha256, else `a.edition`.
* The apply step writes the field map to that same row: `findFirst({ sha256: a.sha256 })` first (sources.ts:799). So proposals, Form library counts (form-library.ts:112) and the applied map now share one label.
* **Approved-in-product files:** intake creates the row with the approval's `edition_label` (intake.ts:357), so the label agrees.
* **Recompare:** `ingest({recompare})` deletes and reinserts by `runId`, so it relabels. It keeps decisions matched by `proposedKey`, not by edition. Correct.
* **ONLINE editions:** they have no PDF sha256 and no field-map draft path, so they are not reachable here.
* **One real disagreement, older than this PR:** sha 938af318… (imm5475e.pdf) is `IMM 5475 (05-2021)` in the library but `IMM 5475 (12-2022)` in the official manifest that convert.ts uses. Proposals now follow the library (05-2021). That is consistent with the Form library and with apply. However, the comment's justification "(p2/convert.ts)" points to the manifest, not the library. `quoteOf` still writes `a.edition` (12-2022) as `source.edition` in the same proposal (sources.ts:604). See Minor 3.
* **Other readers I checked:** review-proposals.ts:25/60/85 (group title and key, code prefix match unchanged), review-queue.ts:85/132, programs.ts:113/197, proposals.ts:123–136 (the twin rule across editions: labels are now consistent, and a file in two combinations still carries one label), proposals.ts:414. I also checked `form_edition_drafted` (job detail only).
* **Unaffected:** field-drafts.ts:33/110 (rounds path and the live refusal for another edition), p2/assemble.ts (uses the run's entries), launch.ts:73.
* There is no per-row query. `printedEdition` runs once per ingest.

## Open on D3 (older than this PR, not in this diff; must not be claimed as fixed)
* **On the Demo-menu sample, IMM 5257 itself still shows "Not mapped yet", and a person cannot replay its Saved answer on screen.**
  * Cause: the six load's form finder first puts IMM 5257 into Visitor visa's configuration. The catalogue REPLAY plan then skips it with "IMM 5257 is already in this combination's configuration." (ai.ts:118; demo.ts:220–223). `drafts.replayed` is 6, and IMM 5257 is not one of them.
  * Visitor visa › Forms › IMM 5257 › **Draft with AI** offers "Use the saved AI answer … studio-fieldmap-imm5257e-live-20261021t060247723z". Clicking it returns 400, and a toast says the same refusal. The dialog offers something it then refuses.
  * The new check proves the IMM 5257 outcome only on the suites' fixture: `POST /demo/load` with no body, which demo.ts:62 calls "older sample kept as test data only". Its "Load sample" wording is therefore misleading.
  * Under P-33 this is a Major for row D3 / QA-144 ("from the Demo menu … at US$0"), not for this commit.

## Minors (Should; none blocks)
1. **Test the visible effect on the six sample.** Add an assertion to `check_d3_saved_edition.ts` after `{"sample":"six"}`: every waiting field_map proposal's `form_edition` equals a library `edition_label`, and the six forms read "AI draft · N to review". Rename "Load sample" in its texts to "the suites' fixture load".
2. **Port.** The usage line uses **4474**, which is in qa's range (WAY-OF-WORKING:16). Forms is 4450–4459. `isolated.sh` kills whatever listens on its port. A qa server was listening on 4474 during this review.
3. **One edition per proposal.** Let `quoteOf` use `fileEdition` as well, so `scope.formEdition` and `source.edition` agree (sources.ts:604). Record the IMM 5475 library/manifest disagreement (05-2021 against 12-2022) as a row or in challenge.md for the immigration expert. Do not settle it here.
4. **Wording.** The check says the model's reading "stays visible on the job", but no web code reads `edition_note` / `form_edition_drafted`. It is kept, not shown. Say "kept on the job".
5. **Nits.** `?? a.edition` is redundant, because `printedEdition` already falls back to it. The last fallback, `?? out.form_edition`, still lets the model's reading label an unrecognised file, against the new comment's rule. It is harmless because apply refuses such a file (sources.ts:789–790), but `null` would match the rule.
6. **No data migration.** Waiting proposals already in a database keep their old labels until the next Load sample or Compare again. That is acceptable for the demo; mention it in the PR.

## D1–D20 (scored only for what this change touches)
* D1 requirement fit 3/4: the file's edition rule is now applied end to end. The QA-144 IMM 5257 outcome is still not reached on the Demo sample.
* D2 data integrity 4/4: one label per file across proposals, library and apply.
* D3 reuse: n/a.
* D5 stability 4/4: two runs each, no flakes. Recompare relabels and keeps decisions.
* D7 AI trust 3/4: "Saved AI answer … US$0" is labelled. The model's misread is kept but not shown.
* D10 language 4/4: model text is gone from the group titles.
* D11 feedback 3/4: the refusal toast is clear, but there is no way forward for IMM 5257 (older gap).
* D13 accessibility 3/4: axe 0 on the dialog, Form library and Proposals. No sideways scroll at 400, 1024 and 1440. I did not do a keyboard-only walk.
* D15 speed 4/4: the replay finishes in seconds. One extra query per ingest.
* D16 testability 3/4: fail-first proven. The six-sample effect is untested.
* D18 provenance 3/4: same as D7.
* D19 closure 2/4: the QA-144 path is still open.
* D17 and D20: simulated only.
* D4, D6, D8, D9, D12, D14: no change.

## Could not check
* The printed edition inside imm5475e.pdf: it is an XFA form, and pdftotext gives no footer.
* The PR body: there is no PR for this branch yet.
* The graph tool: `graph.mjs` rewrites qa/GRAPH.md, which this review may not edit, and this is not a screen.
* A real screen reader, and an intended user's walk.

Journey score (reviewer, the one score for this check): **7.5/10**, with no criterion at 0. The points lost come from the older D3 gaps above, not from this diff.

**Verdict: Approve** (for commit 6f6e7a40). This diff has no open Blocker or Major. Minors 1–6 are Should items. The IMM 5257 Demo-sample gap stays open on D3 / QA-144.
