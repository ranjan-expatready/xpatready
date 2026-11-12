# Review: QA-415 (C7.1, C6.2: each person's kind of application from their own filing) · PR #1620 at 8e3293429

Reviewer: a fresh session that did not build this (screen-review + journey-test, reviewer role), 12 Nov 2026. Commit reviewed: **8e32934290e23e7a1ec027a077b71edf71c4d3e4** (`git diff origin/main...8e3293429`). Isolated copies only: `rv415head` on :4455 (the PR head) and `rv415trial` on :4456 (the PR head plus a scratch merge of `origin/claude/forms-bk15`, #1591). Both copies are stopped. The scratch merge was aborted, so the working tree is back at 8e3293429. Nothing was pushed. US$0, live AI off, no priced button pressed.
This is a forms and engine fix, not a new screen. Dimensions that only apply to screens are marked N/A, each with its reason.
**Skill outcome: Ship after fixes.** **Verdict: Block.** Two Majors are open (M1, M2). The Minors do not hold the merge.

## What I verified (evidence)
* **Pure check `tests/check_qa415_application_kind.ts`.** On the head: 22/26 (exit 0; the recorder does not set the exit code here). On the trial merge: **26/26**. The 4 red steps on main are the fees-by-role and the waiting-rule steps, which need #1591. `check_b164_no_engine_keys.ts`: 52/52 (green).
* **Pack C7.1 on the head: 5/9, not 7/9.** Four steps are red: AT-1, AT-3, **AT-5** (the spouse has no IMM 5476 copy) and **AT-10** (on main, a child who answered No is on the principal's study permit application, so the form says "Student"). All four need #1591. The PR's note names only AT-1 and AT-3; please correct it.
* **Packs on the trial merge.** C7.1 gave **9/9 twice**. C6.2 gave **8/8 on the head and 8/8 on the trial**. `check_qa403_who_fills.ts` gave 37/37 and `check_qa400_principal_per_person.ts` gave 20/0 (trial). Checkpoint row 4 reads "4 changed to another library field". All checkpoint rows are done.
* **Done-when, read back from the generated PDFs (clicked on the case page, trial).**
  * Study permit family, IMM 5476: Student "Student", Spouse "**Worker**", Child "Student". After the child answers No, the child's filing is "Visitor visa" and their form says "Visitor".
  * Visitor visa family, IMM 5645: both adults tick **Visitor only**, with no by-hand line.
  * The Study permit release attaches no IMM 5645 (sp.outside: IMM 5475 and IMM 5476 only; its family form is IMM 5707). So C7.1-AT-6 only prints a NOTE, and that half of the done-when does not apply to this release.
* **Other combinations (head) agree with their filings.**
  * fs.spouse: principal and child "Permanent residence". The co-filed sponsor gets no IMM 5476 and no kind.
  * pnp.express_entry: all three "Permanent residence".
  * wp.lmia_inside: principal and spouse "Worker", as the filing labels say.
  * vv.single: a spouse who is not travelling has no forms; the others get "Visitor".
  * No combination's agent view asks the kind.
* **The old fact cannot reach a form.** On a fresh load the library has only `person.application_type` (scope PERSON). No field map reads `case.application_type`, and no answers to it remain. Stored answers ("SAMPLE", and a "Student" I PUT for the Study permit spouse) are overwritten: knownOf sets the worked-out value after the answers (case.ts:318-320), and the forms still wrote Worker and Visitor.
* **Mutation checks.**
  * Removing the `q.fact !== APPLICATION_TYPE` exclusion (case.ts:410) turns C6.2 AT-2 and AT-3 red, for both families.
  * Removing the waits skip, the `applying` filter or the role filing turns the pure check red.
  * Removing the `co_filed` skip leaves it green. That line is dead code, because a co-filed filing has no applicants (m6).
* **Citations (P-170), checked against the saved copies.** All four quotes match word for word, with their dates and editions:
  * imm5645.html (2024-06-21), "This form must be completed by each person, 18 years of age or older, applying for a Temporary Resident Visa, a study or work permit outside Canada."
  * imm5645e.pdf p.1 (01-2021), "Type of application: Visitor Worker Student Other".
  * imm5476.html (2025-12-12), Question 4 and "dependent children aged 18 years or older … their own copy".
  * imm5476e.pdf p.1 (11-2025), "Type of application (permanent residence, extension of study permit, etc.)".
* **Ruling constraints.** The words are data (`samples/application-kinds.json`). The engine names no combination or form in code; only a comment mentions the forms, and B164 is green. The free-text question is gone from the who-fills data and from the sample family.

## Issues
* **M1 (Major, Must): when no kind can be worked out, the "Type of application" field is left blank in silence. The code and the data promise "by hand with its reason".**
  * The promise: application-kind.ts:21-22 and application-kinds.json "about" say "A filing this table does not name gives no value: its form fields go by hand with the reason, never a guess".
  * What happens (trial, Study permit family, the child's "6 months or more" not yet answered, so the filing reads "Application to be decided"): the child's IMM 5476 copy has `SectionA[0].application[0]` **not written**, with `by_hand: []`. Its readiness lists nothing for it, and nothing on Ready to file mentions it. Its "why" points at the section "Your full name, date of birth and application", where no question is asked.
  * The same thing happens to anyone whose filing name is not in the table. The added filing's name is typed freely by the author on Questionnaires › Who can be in this application (contracts/workspace.ts:78, 3-80 characters, matched exactly, so even "Study Permit" misses).
  * Before this PR, the officer was asked and the field filled.
  * **Fix:** for a person who applies, on a form field that reads `person.application_type` with no worked-out value, write a by-hand line (or a "left empty on the form" line) with the reason. The reason is either the waiting rule in words or "<filing> has no word in application-kinds.json". Add a fail test on a generated copy. Optionally warn at release when a line's `addsFiling.filing` has no word.
* **M2 (Major, Must): a person on the principal's application whose added-filing rule is still unanswered gets the principal's kind, which is a guess.**
  * Where: application-kind.ts:47-48 checks `waits` only for the filing's **owner**, and line 52 then writes the owner's word for every applicant.
  * Probe (pure engine, BK-15 merged): a child line set to "On the principal's" with `addsFiling: Work permit` and the rule not answered. The fees say "Waits for C's answer … nothing is guessed", but the kinds come out `C: "Student"`. Once the rule is answered Yes, the child's kind becomes "Worker".
  * The shipped data does not reach this case after #1591 (the sp.outside child becomes files_own). It is reachable by configuration, which BK-15 allows on on_principal lines (people.ts). It contradicts the function's own contract (line 34: "no value until it is") and P-486's "never a guess".
  * **Fix:** skip each applicant `a` whose `adds.get(a.subject)?.waits` is set. Add a fixture with an on_principal line and a fail step.
* **m1 (Should): IMM 5475's "Type of application" also reads the fact (the review changes 3 drafts), but the data cites only IMM 5476 and IMM 5645.** Add the IMM 5475 page, quote and date (P-170).
* **m2 (Should): the configuration Preview still treats the fact as a question.**
  * `GET /combinations/:id/preview` lists `person.application_type` with collected_from client_questionnaire, required, status "may be needed", counted in questions_to_ask.
  * Its 6 form fields show coverage "client question".
  * It is never asked. QA-400's is_principal has the same gap. Say "worked out" there, or list the gap as a follow-up row.
* **m3 (Should): the answers route accepts a worked-out fact.**
  * `PUT /runtime/cases/:id/answers/<spouse>/person.application_type` returned 200 "Saved." (runtime.ts:598).
  * The stored answer never reaches a form (verified), but the case page's "Facts from an earlier case" then shows "This case: Student · Different" while the forms write Worker, and it offers "Re-confirm and use".
  * Refuse answers to a worked-out fact (422, with words).
* **m4 (Should): tests/check_qa391_kept_forms_browser.cjs:84-90 still records `case.application_type = "visit"`.** That step now does nothing (`if (!q) continue`), and the comment above it is stale. Remove it, or record the change in the test.
* **m5 (Should, for the expert):** IMM 5476's instruction is "If you have already submitted your application, write: The type of application". The data writes it on new applications too, and its "says" leaves out that condition. It is already labelled Unconfirmed: expert; add the condition to the note.
* **m6 (Nit): application-kind.ts:46 `f.mode === "co_filed"` is unreachable.** The sponsor test passes because a co-filed filing has no applicants. Keep the line if you want, but the test is not checking it.

## D1–D20 (forms and engine scope)
D1 Requirement fit: Partly. Both named families are right and the question is gone; M1 and M2 remain on generic paths. · D2 Data integrity: Partly (m3). · D3 Reuse: Met (one person fact, the same derivation as the fees). · D4 Rule integrity: Partly (M1: a form field depends on a question nobody is asked). · D5 Stability: Met (answering No moves the child's filing to a visitor visa and the forms follow; reload safe). · D6 Freshness: Met (dated sources; Sample, Unconfirmed: expert). · D7 AI trust: Met (source "worked out: the person's own filing"; the AI's proposed key is changed on review with a reason). · D8, D9, D11, D12 and D14: N/A, no UI change (case page unchanged; checked at 1440 and 1024). · D10 Language: Met (no new words on case screens). · D13 Accessibility: Met (axe 0 violations on the case page; no sideways scroll at 1024). · D15 Speed: Met (copies 1-3 s; knownOf adds one in-memory derivation). · D16 Testability: Partly (good pass and fail pairs, but M1's "by hand" claim and M2's on_principal case are untested). · D17 and D20: simulated only. · D18 Provenance: Partly (m1, m2). · D19 Closure: Met on the trial merge; on main alone 5/9 until #1591.

## BIC (EXPERIENCE §6)
BIC-01 Ask once: Met. · BIC-02 Asked for a reason: Met. · BIC-03 No stale answers: Met (C7.1-AT-10). · BIC-12 Check before it leaves: **Partly** (M1: a blank "Type of application" is not listed). · BIC-04 to BIC-11 and BIC-13 to BIC-20: N/A, no screen changed. BIC-20 was spot-checked with axe.

## Graph (P-86)
`graph.mjs`: the new check is linked to C7.1 and C6.2. No page or route was added.

## Not checked
* An unaided walk by an intended user (D17, D20).
* A full keyboard walk (no UI change).
* `run-suites.sh --changed` (it starts copies on lane ports).
* check_qa391 (browser).
* An untracked `screens/QA-415/screenshots/` folder was already being written by another session at 05:31. It is not mine and I left it untouched.

**Verdict: Block** at 8e3293429. Fix list: M1 (by-hand line or readiness line for a missing kind, plus a fail test on a generated copy) and M2 (skip waiting applicants on the principal's application, plus a fail test). Fix the Minors, or list them in the PR. Correct the PR's note: four C7.1 steps (AT-1, 3, 5, 10) wait for #1591.

## Round 2 (diff-only, P-293): `8e3293429..be6243380`, verdict on head 7a4e143da6ab50cbf35b5277ec2b28c94ba74de2
**Scope.** I re-reviewed only the builder's two commits (ef56a0f75 and be6243380). The head adds two commits on top of them:
* 7f8cbac74 brings in main, including #1591 and BK-16. It changes none of the PR's own files. In engine/render.ts it adds BK-16's lines, and the NotWorkedOut row survives the merge.
* 7a4e143da adds 3 PNGs and nothing else (`git diff 7f8cbac74..HEAD`).

**How I ran it.** Every run was on the head as it is, with no trial merge, on my copy `rv415r3` on :4455 (stopped now). Before that head existed, an earlier pass ran on a scratch worktree of be6243380 merged with forms-bk15 (6be6e17d7). That worktree is removed.

**Results:**
* Pure check: 33/33.
* B164: 52/52.
* check_forms_b81, b86, b88 and b99, and check_qa165_mandatory: all green (scratch trial).
* C7.1: **10/10, twice**.
* C6.2: 8/8.
* Checkpoint rows: all done; row 4 shows "4 changed".

**My earlier findings:**
* **M1: closed on the copy.** For the waiting child, the copy has 1 by-hand line with the reason, nothing is written, and Ready to file names the box ("the form's box \"Type of application (permanent residence,extension of study permit, etc.)\" is still to be written by hand … waits for an answer: whether the child will study …"). C7.1-AT-11 fails if the line is missing.
* **M2: closed.** Each applicant's own `waits` is checked (application-kind.ts). The pure fixture with a child on the principal's application fails without the fix.
* **m1, m4, m5 and m6: closed as described.** m6: dropping `co_filed` is safe, because a co-filed filing has no applicants.
* **m2 and m3: not Majors.** I agree they become follow-up rows. m2 is QA-400's own gap. For m3, a stored answer never reaches a form (verified in round 1).

**New, from this diff:**
* **M3 (Major, Must): the forms card tells the officer to fix an answer to a question nobody is asked.**
  * The value is not worked out (the child's rule waits; the same happens for a filing with no word, and for a combination with no derived filings).
  * render.ts writes the row as `coverage: "confirmed fact", value: null, by_hand: why`. engine/runtime/forms.ts:63-64 then runs `checkValue` on the null and turns the row into "answered on screen", with the fix "answered with a problem, not written: Enter text."
  * Seen at 1440 on :4455, case REVIEW-R2-WAIT, IMM 5476 for Sample Child B. The card reads "2 answered but needing a fix stay blank", and "Facts to answer or confirm" lists: "The kind of application this person makes (…) Worked out for each person from their own filing; never asked. (Sample Child B): **needs a fix — answered with a problem, not written: Enter text.**"
  * The readiness reason is "needs a fix". That blocks the lock (blocksLock), and its words point at an answer that cannot be given. The ruling asked for exactly this check.
  * **Fix:** in formCoverage, return a row with `by_hand` before `checkValue` (for example `if (b.by_hand) return b;` after the gate check). Its readiness line should say the row's own reason, in the copy's words, and point to the question it waits for. Add a fail step: the forms readiness for the waiting child has no "needs a fix" or "Enter text" line for `person.application_type`, and has one line carrying the reason.
* **m7 (Should, answering your question): the copy's by-hand line is labelled "A form field"** (api/src/fill-case.ts:287). Its reason names the person and the question they wait for, but not the field. Ready to file already names the box by its caption (case-prepare.ts:621). I would not hold the merge on this. Use the box caption when no question label exists, as Ready to file does, so the copy row reads "Type of application (…)".

**Round 2 verdict: Block** at **7a4e143da6ab50cbf35b5277ec2b28c94ba74de2**. Fix M3, with its fail test. Fix m7 or list it in the PR, and list m2 and m3 as follow-up rows. Everything else from round 1 is closed.

## Round 3 (diff-only, Lead 24, P-293 (3)): `7a4e143da..69622728014b7cfd9b26fb56579c57f58d70fb8a`
**Scope.** I read 318d67177 (M3) and 696227280 (m7). The only other change is my round-2 notes in this file.

**How I ran it.** On the head as it is (main and #1591 already in), on a fresh copy `rv415r4` on :4455 (stopped now).
* Pure check: 33/33. B164: 52/52.
* C7.1: **11/11, twice**. C6.2: 8/8.
* Checkpoint rows: all done.

**M3 is closed.** The waiting child's forms readiness no longer has a "needs a fix" or "Enter text" line for `person.application_type` (C7.1-AT-12). My round-2 probe saw exactly that line on 7a4e143da, so the step is red without the fix.

**m7 is closed.** The copy's by-hand line is now labelled "Type of application (permanent residence,extension of study permit, etc.)" with the waiting reason (C7.1-AT-11). Ready to file names the same box.

**The tech lead's point.** Confirmed: `grep -rn by_hand` over studio/engine, studio/api/src, studio/contracts and p5 shows the row field `BoxRow.by_hand` set only at `engine/render.ts:176`, always with `value: null`. It is read only at `engine/runtime/forms.ts:64` (the new guard) and `engine/form-values.ts:63`. Every other hit is the field-map outcome or decision word `by_hand` (form-field-gates.ts:94, screen02.ts, own-question.ts, the checkpoint steps) or the counts and line lists `counts.by_hand` / `FormCopy.by_hand` (fill-case.ts:296/390, fill.ts:95, contracts/runtime.ts). So no row carrying `by_hand` also carries a value the guard should still check.

**Nit (no hold).** Ready to file still begins with "A form field" before the caption (case-prepare.ts:621: "\"A form field\" (the form's box \"Type of application …\")"). It is clear enough; the same caption fallback could follow later.

**Verdict: Approve** at **69622728014b7cfd9b26fb56579c57f58d70fb8a**. No Blocker or Major is open. These stay as follow-up rows in the PR: m2 (Preview counts the worked-out field as a client question) and m3 (a PUT on a worked-out fact is accepted, but never reaches a form).
