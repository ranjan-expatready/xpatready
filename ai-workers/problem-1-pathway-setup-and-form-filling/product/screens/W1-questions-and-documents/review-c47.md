# Review: C4.7, AI drafts a combination's PQR picks; a person accepts or removes each

## Re-review at c3d62b5e (1 Nov): **Verdict: Approve**
The four Majors from the first round are fixed and I re-proved each one myself. No Blocker or Major is open. In screen-review terms: Ship, with the Minors below logged in the PR.

Reviewer: an independent session that did not build this. I used the isolated copy `rv_c47` on :4463, started with `STUDIO_AI_LIVE=approved` together with `STUDIO_FAKE_LAUNCHER`, as the check's usage line pairs them. No model was called (US$0). The copy is now stopped. The commit has no web changes, so the first round's browser results (21/21, axe clean) still apply. I did not rerun the browser suite, because it rewrites the committed screenshots that another run in this tree is writing.

### What I re-ran
* `check_forms_c47_pqr_picks.ts 4463 xr_studio_rv_c47`: **46/46**. This includes the new B1, B3, B4, B5, B12 and M2 cases. The M2 case accepted 82 Ready picks in 4.4 s.
* My own probes (`/tmp/c47probe/re.mjs`), beyond what the suite covers:
  * **M1, fixed.** Three rules-only drafts at the same moment gave 201 32/0, 201 0/32 and 201 0/32 (proposed/already), leaving **32 waiting picks for 32 facts**. Two "AI now" drafts at the same moment gave 199 waiting picks for 199 facts. The cause was fixed with `pg_advisory_xact_lock` around the read and the insert (`api/src/pqr-drafts.ts`).
  * **M2, fixed.** A bulk accept of **167 Ready picks returned 201 in 8.8 s**, with 167 ticks written. Undo took 0.5 s and left 0 ticks.
  * **M3, fixed.** Quotes "a", "the" and "You must show the officer" (21 letters) are dropped and listed with the reason. A reason of "a.b" is dropped.
  * **M4, fixed.** An edit that changes the person gets 409 in words, and nothing is ticked. An edit of the reason only lands.
  * B3: picks a person removed are not re-proposed by the same producer, and the note says how many.

### Minors (Should; put them in the PR, none blocks)
1. **Quote check: a fragment that starts or ends mid-word passes.** The quote "ou must show the officer that you are elig" was proposed. So was "eligible under Canada's Immigration law", which is a fragment rather than a sentence. `isSentence` counts words and letters but does not check word boundaries or a sentence end (`engine/pqr-picks.ts:36`). *Fix:* the match should start and end on word boundaries in the guide's text.
2. **Bulk accept takes about 53 ms per pick, 8.8 s for 167.** Each pick still builds one snapshot inside the 120 s transaction (`proposals.ts` decide, `acceptPqrPick`). This is safe now, but slow, and it holds the transaction open that long. *Fix (later):* build one snapshot per combination per batch.
3. **An edited reason lands with the rules' or AI's origin.** "Edit reason" stored `CODE_MATCH` with the person's own words. The fact chosen is still the producer's, so this is a provenance nuance only. *Fix:* record that the reason was edited by a person, or show it at release.
4. Still open, and already listed by the builder:
   * the client can read the plan (`pqr-drafts.ts:191`, use `readerOf`)
   * rule keys and the inventory file path in the side panel
   * the key `landedAs` in the toast
   * "Program question pick"
   * focus lost after Esc
   * "210 questions" against the 32 proposed
   * "(P-110, P-131)" in the dialog
   * To review scrolls sideways at 400 px and 200 % zoom; that layout already existed

### Journey (reviewer score)
The score after the fixes is **8/10. Pass**. Details are in `journey-test-reviewer-c47-2026-11-01.md` (re-check section).

### What I could not check
* A real screen reader.
* A headed browser.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A real saved AI run (none exists until P-131).
* Rule-removal runs (I was not allowed to edit code).
* The browser suite at this commit. It is not affected by these changes, because no web file changed.

**Verdict: Approve** for c3d62b5e.

---

## First round at 4ec178e8 (record): Block
* **Suites:** 40/40 and 21/21.
* **D1–D20 at that commit:**
  * D1 4 · D2 2 · D3 4 · D4 3 · D5 3 · D6 4 · D7 3
  * D8 4 · D9 5 · D10 3 · D11 4 · D12 4 · D13 3 · D14 4 · D15 3 · D16 4
  * D17 simulated only · D18 3 · D19 not in scope · D20 simulated only
* **Journey score:** 7/10, fail.
* **Majors (all fixed in c3d62b5e):**
  * **M1.** Two drafts at the same moment gave 62 waiting picks for 31 facts.
  * **M2.** A bulk accept of 80 Ready picks returned 500 after 5.0 s (Prisma's 5 s transaction limit) and accepted nothing.
  * **M3.** A one-letter quote passed the "quote found in the guide" rule (R2).
  * **M4.** An edit ticked another person's fact and recorded it as the rules' pick.
* **Minors then:** the client can read the plan; system keys and decision ids on screen; focus lost; removed picks came back; 210 vs 32; R3 counted length only; a round that throws left the job RUNNING. Of these, the "removed picks", R3, job-RUNNING and Undo-key Minors are fixed in c3d62b5e. The rest are listed above.

## Re-review after merging main (bfda0879)

Scope: the merge resolution only (merge of origin/main be8c79fe into PR head 2f0b6a69). Journey not re-run; the earlier score (8/10 on c3d62b5e) stands.

- `api/src/main.ts` (conflict): the `@Module` line is the exact union. It keeps main's `TeamController` and `Team` and the PR's `PqrDraftsController` and `PqrDrafts`, and drops nothing from either side. Both imports are present (lines 30 and 39).
- `api/src/proposals.ts` (conflict): `decide` now ends with `}, { ...QUEUE_TX, timeout: 120_000 });`. That gives main's `maxWait: 10_000` (unchanged from the PR's value) and keeps the PR's tested 120 s timeout for bulk accepts of 80+ picks (Review M2). The other `QUEUE_TX` user (line 361) keeps main's 60 s. The M2 comment is kept.
- Auto-merged `api/src/fact-sources.ts`, `engine/sources.ts` and `web/src/pages/workspace/questionnaires.tsx` were checked mechanically. For each file, the changed lines from merge-base to main match the changed lines from the PR head to the merge, and the changed lines from merge-base to the PR head match the changed lines from main to the merge. So both sides' changes landed verbatim. The hunks do not overlap: QA-114 `released` versus the C4.7 `acceptPqrPick` `opts.view`, C3.11 signed scans versus the C4.7 one-liner, and QA-91/C4.1 versus the C4.7 three lines.
- The builder's evidence on bfda0879 covers behaviour: tsc is clean for src, the any-count matches base, and the 8 listed suites pass, including the C4.7 API and browser suites, S6 and the queue.

No new Blocker, Major or Minor.

**Verdict: Approve** (commit bfda0879)
