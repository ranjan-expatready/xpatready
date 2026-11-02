# Review: QA-82, unwritten questions show the field's short name (PR #469, branch claude/screens-qa82-question-words)

Reviewed commit: **f995d29d** (`git diff origin/main...f995d29d`, base 21d988b7). Reviewer, fresh context. US$0, no `*_LIVE`.

**Verdict: Block (Rework).** The Questions tab part is good. The engine change, though, also reaches the client's questionnaire. There it takes away the only text that said what a yes/no background question covers, and it breaks an existing runtime suite that the builder did not run.

## How I ran it
- The shared clone at /home/user/xpatready was switched to another branch (`claude/screens-g3-demo-release`, 07:27) while I worked. My first r1c run used that tree, so I discarded its result (125/125 on the base, which still counts as base evidence). Every result below comes from a detached worktree at f995d29d (scratchpad `wt/`) with its own `vite build`. Copies ran on 4442 and 4449. The builder's copy took 4441 during my run.
- f995d29d: check_c41_questionnaire_roles **9/9**. With main's `render.ts` and `questionnaires.ts` swapped in it gives **6/9**: all three QA-82 steps fail, so they really test the rule. check_engine **43/43** · check_case_engine **61/61** · setup_visitor_visa 13/13 · **check_runtime_r1c 14/15, stopped at step 15** (base: 125/125).
- My own Playwright walk (journey-test-reviewer-qa82-2026-11-02.md): Questions tab, Details, keyboard, approver, Preview, axe, 400/1024/1440 px.
- I read the client's questionnaire API (`/runtime/cases/:id/questionnaire`, Visitor visa, client mode) for all 188 questions.

## Every consumer of the render question `label` (asked for)
| Consumer | Uses label for | Effect of the change |
|---|---|---|
| `engine/runtime/case.ts:292` → client questionnaire `web/src/runtime/questionnaire.tsx:138` (input label / legend) | what the client reads | **B1 below** |
| `case.ts:319` missing list, `:338/:340` error summary | names in "Check these answers" | short names; fine for the officer, terse for the client |
| `case.ts:277` `from_documents` facts (dedupe by label) | "Passport fills …" list | no collisions: every factName in the c1 draft (186 keys) and in the VV client view is unique per person |
| `runtime/preview.ts:129` (dedupe), `:140` (agent set) | Preview sets | same as above, no collisions found |
| `render.ts:347` sort | tie-break only, after placement order | order is unchanged wherever placement order exists |
| `runtime/questionnaires.ts:53` | `wording` fallback, `meaning` fallback | Questions tab is correct; `asked` is passed |
| `web/src/pages/preview.tsx:91,98` | Preview "Question" column | short names, with the mono key underneath; no "No question written yet" shown (correct) |
| AI prompts, PDF fill, answer sheets | none read `render().questions[].label` (grep of api/src, engine, p2) | no effect |
`render.ts:322-323` still quote `question_text || meaning` inside "whether … is asked" reasons. On the wp.family sample none of these fire, so it is noted only.

## Findings, ranked

**B1 (Blocker, Must). The client now answers background and admissibility questions from a 2–3 word key name, and the definition is shown nowhere to the client.**
- `engine/render.ts:327` replaces the label for every consumer, the client runtime included (`case.ts:292`).
- `questionnaire.tsx` shows `meaning` only for declarations (line 161).
- On the Visitor visa case the client now sees these as the whole question, with no hint text:
  - "Disorder requiring services"
  - "Status violation canada"
  - "Violent organisation association"
  - "Criminal history"
  - "Refused visa or entry"
  - "Accompanies subject to canada"
  - "Has children"
  - "Military service"
- Before, the client read "Whether the person ever committed, was arrested for, charged with or convicted of a criminal offence …".
- The new labels drop the legal scope of the question (arrested / charged / convicted, social or health services, without authorization). A wrong answer here becomes a misrepresentation on the filed form. They also break PRODUCT §4 plain words: lower-case "canada", the internal word "subject", and noun phrases asked as yes/no.
- QA-82 asked for the definition to move "under Details only", not to disappear.

**Fix (in scope, no new feature):** keep `asked` on the case view too. For an unwritten question in the client's questionnaire, either keep showing the meaning (as on main) or show the short name with the meaning as the hint under it (the existing help/note slot). The officer view and the Questions tab may keep the short name. Add a fail test: a client-mode question with `asked:false` carries its meaning to the page.

**M1 (Major, Must). An existing runtime browser suite fails on this commit; the builder ran r1a and r1d from the same runtime group but not r1c.**
- `tests/runtime/check_runtime_r1c.cjs:103` waits for the group "Official language", which is now "Service language". It times out, and 110 steps never run.
- `:204` (`/ever committed, was arrested/`) would fail next.
- `tests/qa/check_qa_r1c_walk.cjs:111` has the same selector.
- `select-suites.mjs:29` puts r1c in RUNTIME_GROUP, so CI on this PR runs it (`run-suites.sh:210`).

**Fix:** with B1's fix, the client keeps the definition and these selectors pass. Otherwise update both suites to the new words and say why in the PR. Then run r1c, r1d and r1a on the head.

**S1 (Should). On the Questions tab the author loses the definition entirely.** Details (`sources.tsx:159`) titles the panel with `wording` and never shows `meaning`. On the tab, an author reading "Subject is principal applicant" cannot see what it means without going to the Shared library. QA-82's fix put the definition under Details. **Fix:** one line with `meaning` in the Details panel, or the mark's tooltip.

**S2 (Should). The "No question written yet" explanation is only in a `title`** (`questionnaires.tsx:393`), so keyboard and touch users never get it. The visible text is enough to pass axe (0 violations). **Fix:** move the sentence into the visible mark or the Details panel. A `title` is not a tooltip by the team's pattern.

**S3 (Should). `factName` is a second copy of `fieldName`** (`web/src/pages/library.tsx:23-24` = `engine/render.ts:166-167`), and both miss "US", "TRV", "TB", "USCIS" and the place-name "Canada" ("Us PR card expiry date", "Requires trv", "Tb history or contact"). **Fix:** one shared helper (`contracts/`), with these abbreviations and proper nouns added.

## D1–D20 (this change only)
D1 Requirement fit 2/4: tab fixed; client loses meaning (B1) · D2 Data 4: contract additive, no writes · D3 Reuse 3: duplicated helper (S3) · D4 Rules 4: conditions untouched, case_engine 61/61 · D5 Stability 4 · D6 Governance n/a · D7 AI n/a · D8 Orientation 4 · D9 Flow 3: author sees what to write, no definition (S1) · D10 Language 2: client-facing key names (B1, S3) · D11 Feedback 4: mark visible to author and approver · D12 Visual 4 · D13 A11y 3: axe 0, keyboard reaches Details, tooltip by hover only (S2) · D14 Team look 4 · D15 Speed 4: tab first view 1.36 s under a busy machine, no new requests · D16 Testability 3: QA-82 steps fail on main (6/9), but no test covers the client view and r1c is red (M1) · D17 simulated only · D18 Provenance 4: "No question written yet" says where the words come from · D19 Closure 2: author → client path regressed · D20 simulated only.

## Retrofit mapping
QA-82 is in BUGS.md (C11.12, C6.x). Wording per placement stays with forms (W1-10). This PR is the screens part (showing it).

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20); the full batch (only the suites above); the client page's look at 200 % zoom (B1 is visible from the API).

## Journey score (reviewer, the one score for this check)
**7/10, fail** (pass needs 8 and no 0). Details: `journey-test-reviewer-qa82-2026-11-02.md`.

**Verdict: Block** on f995d29d. To fix:
1. B1: the client's questionnaire must not lose the field's meaning for an unwritten question (`engine/render.ts:327` → `case.ts:292` → `questionnaire.tsx:138`), plus a fail test on the client view.
2. M1: `check_runtime_r1c.cjs:103,204` and `qa/check_qa_r1c_walk.cjs:111` pass on the head (with 1 they should pass unchanged); run the whole runtime group.

## Round 2: f00b6ea0 (`git diff f995d29d f00b6ea0`)
Reviewer, fresh context. Detached worktree at f00b6ea0 with its own `vite build`. Copies ran on :4449 (`xr_studio_rv_qa82`, wp.family) and :4442 (`xr_studio_rv_r1`, Visitor visa). Never :4400, no `*_LIVE`, US$0.

**Runs on the head:** check_c41_questionnaire_roles **9/9** · check_case_engine **61/61** (the file is now byte-identical to main) · check_engine **43/43** · setup_visitor_visa 13/13 · **check_runtime_r1c 125/125** · check_runtime_r1d **86/86** · check_runtime_r1a **99/99**. That is 99, not the 98 the PR states. It is run after r1c with `--reset`, as `run-suites.sh:213` does. r1d was run on a fresh setup because r1a's reset clears the case.
**The fail test is real:** with f995d29d's `render.ts` swapped in and the server restarted, c41 gives **8/9**. The new step fails ("Service language", "Marital status" in Preview). Restored afterwards.

| Round 1 | Status on f00b6ea0 | Evidence |
|---|---|---|
| B1 the client lost the meaning | **Resolved** | `render.ts:328` label = `question_text \|\| meaning \|\| fact`, same as main (`git diff 21d988b7 f00b6ea0` changes only `asked`). Client questionnaire API on the Visitor visa case: "Whether the person ever committed, was arrested for, charged with or convicted of a criminal offence", the same for refused visa, disorder requiring services, military service and status violation. |
| M1 r1c red | **Resolved** | r1c 125/125. The client groups read the meaning again, so `check_runtime_r1c.cjs:103,204` and the qa walk's selector match unchanged. I did not run the qa walk. |
| S1 Details had no meaning | **Resolved** | `sources.tsx:194` shows "Meaning: Official language (English or French) in which …" at the top of Details (screenshot details-1440). axe 0. |
| S2 explanation only in `title` | **Resolved** | The mark's visible text is "No question written yet (the field's name is shown)", with no `title`. The approver also sees all 7 marks. |
| S3 factName abbreviations | **Partly** | The engine copy now knows TB/TRV/US/USCIS and writes "Canada". Shared library's `fieldName` (`web/src/pages/library.tsx:23-24`, plus `fieldWord` in `api/src/library-items.ts:24`) still lacks them. The same field reads "US PR card expiry date" on the Questions tab and "Us PR card expiry date" in Shared library. The comment "as Shared library names fields" (`render.ts:164`) is therefore not exact, and the tab ignores a checked library label (`labelChecked`). Still a Should, not blocking. |

**New, Should (S4):** `render.ts:164-165` still says "A question with no written wording shows this, never the field's meaning". `render()`'s label does show the meaning now. Fix: the comment should say this applies to the author's Questions tab only (`questionnaires.ts:53`).

**Honesty of the PR (asked):** the description states plainly that "the client's questionnaire and Preview keep the meaning for an unwritten question … So QA-82's client part stays as on main until real questions are written". It gives the reason (legal scope) and the path forward (sample wording, or AI drafting under P-225, options (b)/(c) on #423). The title is limited to the author's Questions tab. This matches round 1's fix option. The only inexactness is r1a 98 vs my 99.

**Regression walk** (Playwright on :4449, by role and visible text):
- The Questions tab has 7/7 rows with a short name and the visible mark.
- Keyboard: Tab reaches "Details of: Service language" and Enter opens it.
- Details shows the meaning. The approver sees the same marks.
- Preview never shows the mark.
- axe on the tab and in Details: 0 violations.
- No sideways scroll at 400, 1024 or 1440 px. No console errors.
- First view of the tab: 1.54 s, while the runtime suites ran on the same machine.

**D1–D20 changes:**
- D1 4: the tab is fixed and the client keeps the meaning.
- D3 3: the helper is still duplicated (S3).
- D9 4: the meaning is in Details.
- D10 3: the tab and the library differ on abbreviations.
- D13 4: the mark is visible.
- D16 4: the new step fails on f995d29d's engine, and r1c is green.
- D19 4: the path from author to client is intact.

All other scores are as in round 1. D17 and D20 are simulated only.

**Journey score, round 2: 9.5/10, pass** (`journey-test-reviewer-qa82-2026-11-02.md`, Round 2).

**Verdict: Approve** on f00b6ea0. There is no open Blocker or Major. S3 (rest) and S4 are Should items and can follow.

## Round 3: 3d650ed7 (merge d95e9822 + one test step)
Reviewer, fresh context. Run from the branch head 3d650ed7 (the shared clone was already on it; its `web/dist` was built after the merge, and 3d650ed7 changes only a test). Isolated copy `rv469` on **:4448** only, stopped after each run. Never :4400, no `*_LIVE`, US$0.

**1. The merge brings in only main's changes.**
- `git merge-tree --write-tree f00b6ea0 045af590` gives tree `752ebc96`. That is exactly d95e9822's tree, so the merge is a clean automatic merge with no hand edits to resolve conflicts.
- QA-82's own diff (`git diff <merge-base> f00b6ea0` vs `git diff 045af590 d95e9822`, outside `screens/`) is the same 6 files with the same lines. Only two hunk offsets moved (`render.ts` -133 → -155, `questionnaires.tsx` 390 → 393).
- `git diff f00b6ea0 3d650ed7 -- . ':!*/screens/*'` is 89 files. 88 come from main, and the 89th is the test file.
- `git diff d95e9822 3d650ed7` changes only `tests/check_forms_c411_draft_qd_browser.cjs`, +4/-1.

**2. The test change is sound and hides no defect.**
- **Why it flaked:** the step read `main` after `settle()`. `settle()` waits for no `aria-busy`, no `.animate-spin` and no `[data-qd-result] .animate-pulse`. While the query is pending, the Proposals page shows `<Skeleton className="h-64" />` (`web/src/pages/proposals.tsx:64`). That skeleton is a plain `animate-pulse` div outside `[data-qd-result]` (`components/ui/skeleton.tsx:20`), so `settle()` can pass during it. On a slow runner the step then read only the heading and intro, which contain no "pre-qualification". The page shows the right content once its data arrives, so this is a race in the test, not in the app.
- **The fail case is kept:** the wait is `.catch(() => {})`, and then the same regex judges `main`. If the text never comes, the step still fails, now printing the URL and the first 300 characters. The builder showed 18/19 with a regex that never matches.
- **The landing did not move:**
  - The link is unchanged: `qd-draft.tsx:61` is ``/review/proposals?group=combination:${id}``. Main's only edits to `qd-draft.tsx` are D2 wording (Saved/Live).
  - Main's edits to `proposals.tsx` (a "Saved"/"Live" reading word and the C3.6 answer-values panel), `review-proposals.ts` (`values` on the view) and `api/src/proposals.ts` (C3.6 answer lists) do not touch how a group is chosen or listed. `ProposalsPage` still reads only `group` (or `c`/`step`), never `form`.
  - K1's `?form=` filter is on main in `to-review.tsx:32` and `return-strip.tsx:14`. Those are the `/review` page, not `/review/proposals`, so K1 cannot narrow this landing.
  - QA-82's 6 files do not touch review or proposals.
  - My run printed `…/review/proposals?group=combination%3Aba30d75c-…`, the drafted combination.

**3. Runs on 3d650ed7:**
- `isolated.sh rv469 4448 start STUDIO_SLOW_QD_STEP=400`, then `check_forms_c411_draft_qd_browser.cjs 4448 xr_studio_rv469`: **19/19**. The step passed with the detail above. No page or console error.
- On a fresh rv469 copy, `check_c41_questionnaire_roles.ts 4448 xr_studio_rv469`: **9/9**, including the 3 QA-82 steps.
- The browser check rewrites `screens/W1-questions-and-documents/screenshots/c411/01-plan-rules-only-*.png` in the clone. I restored them with `git checkout` and left nothing behind.

**Minor (m-r3, not blocking, may follow):**
- The step's regex would also pass on any page whose `main` holds "pre-qualification". It does not check that the open group is this combination. The new detail prints the URL, but the step does not judge it.
- Fix: also check `new URL(p.url()).searchParams.get("group") === "combination:" + <id>`, or check `aria-current` on that group. That is one line.
- Separately, `settle()` could count `[data-slot="skeleton"]` as busy. That would fix this class of race for every page.

**Journey score, round 3: 9.5/10, pass (unchanged).** No product code changed since f00b6ea0 except main's merged work. The round 2 journeys stand, and C4.11's landing on To review was re-walked by the browser check above.

**Verdict: APPROVE** on **3d650ed7**. No open Blocker or Major. S3 (rest), S4 and m-r3 are follow-ups.

## Round 4: ca408820 (6a05dee7 test fix + merge of main ca108010)
Reviewer, fresh context. Own worktree at ca408820 (detached), web built there, isolated copy `rv469` on **:4448** only. `isolated.sh` refused from the worktree (its `pg_ctl status` check fails on the linked `.tools`), so the copy was started by hand as `isolated.sh` does: fresh `xr_studio_rv469`, `prisma migrate deploy`, `tsx api/src/main.ts`. It was stopped and dropped afterwards, and the worktree was removed. Never :4400, no `*_LIVE`, US$0.

**1. The test change is an honest correction. It hides no loss.**
- On main, the Questions table has no column for the forms. Its columns are Question, Comes from, Pre-qualification and Only if. On main, the only "IMM nnnn" in the table's text came from one field's *meaning* shown as the row label when no question was written ("…wording to confirm against the official IMM 1295"). That is a drafting note in a definition, not a list of the forms that need the question. Other rows never showed a form, so no user could rely on the row to see the forms.
- The forms that need a question were always in the Details panel's **Used by** line: `sources.tsx:245`, `(f?.forms ?? q?.neededBy ?? []).join(", ")`. That line is byte-identical to main's (main: line 243). QA-82 adds 2 lines above it, so it shifted.
- QA-82 also keeps the meaning on screen. It moves to a "Meaning:" line at the top of the same panel (`data-fact-meaning`), so the IMM 1295 note is still one click away.
- The new step makes the check stronger, not weaker. It judges the real carrier of "which forms" (`/Used by\s+IMM \d{4}/` on `[data-question-details]`), and it fails if Used by names no form. My run printed "Used by IMM 1295 Used in 1 combination".
- `git diff b1841fbe 6a05dee7` changes only `tests/check_s5_slice2_browser.cjs`, +5/-1. The old step only lost its `/IMM \d{4}/` clause. Its chip-count and who-fills clauses are unchanged.

**2. The merge does not alter QA-82's code.**
- `git merge-tree --write-tree 6a05dee7 ca108010` gives tree `9121acd5`, which is exactly ca408820's tree. It is a clean automatic merge with no hand edits.
- `git diff 045af590 6a05dee7` and `git diff ca108010 ca408820` (outside `*/screens/*`) have identical +/- lines. They cover the same 8 files: QA-82's 7, plus the S5 test.
- `git diff b1841fbe ca408820 -- . ':!*/screens/*'` is 30 files. All of them except the S5 test come from main.

**3. Runs on ca408820, :4448:**
- `check_s5_slice2_browser.cjs 4448 xr_studio_rv469`: **63/63**. Both C4.1 steps passed, with no page errors in the walk.
- On a fresh copy, `npx tsx --tsconfig api/tsconfig.json tests/check_c41_questionnaire_roles.ts 4448 xr_studio_rv469`: **9/9**, including the 3 QA-82 steps.

**Journey score, round 4: 9.5/10, pass (unchanged).** No product code changed since 3d650ed7 except main's merged work. The C4.1 Questions → Details → Used by path was re-walked by the browser check above.

**Verdict: APPROVE** on **ca408820**. No open Blocker or Major. S3 (rest), S4 and m-r3 remain follow-ups.
