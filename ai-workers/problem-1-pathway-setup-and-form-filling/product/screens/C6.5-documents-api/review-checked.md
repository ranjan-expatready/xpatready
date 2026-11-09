# Review: "checked against the document" never vouches for a differing answer (PR #1386)

Reviewer: fresh; I did not build it. Commit reviewed: **`107aefb7d70d10711f181b06aa69322d49de6064`**. Scope: this PR's own change only, `git diff origin/claude/runtime-c65-counts...107aefb7d` (`908f3baff`, `107aefb7d`): `checkedAgainst` in `api/src/case-documents.ts`, the resolved row in `web/src/runtime/documents-drawer.tsx` (and the removed `markOnly`), C6.5-39, API checks F1 to F3. Rules read: Lead 36's follow-up row on #1369 (the 2b reviewer's note and its recommendation), P-142 D3, P-242, P-243, M3 concept BR-7, drawer concept BR-12, and the builder's knock-on comment on #1386. Journey test: `journey-test-reviewer-checked-2026-11-09.md`, **9/10, Pass**.

## Re-run on my own copy (`rv_c65f`, :4434, fixture; US$0, no `*_LIVE` switch)
* Setups: `setup_visitor_visa.ts` 15/15, `setup_vv_m3.ts` 44/46 (not this PR). `bash studio/tools/web-fresh.sh build` before the screens.
* `check_c65_documents_api.ts` **67/67** · `C6.5-screen.test.ts` **32/32, twice** · `C6.5-counts.test.ts` **13/13** · `C6.5.test.ts` **30/32** (only 19b and -20, the saved letter read). The builder's figures are confirmed.
* `tsc --noEmit` for api and web: no error in the four changed files. `graph.mjs --check` exit 0; `git status` clean.
* Probes and a browser walk in the scratchpad, not committed (journey report).

## What holds
* **The compare (Lead 36).** In one transaction: no open check for the fact, the current answer, this document's read value, then `notWritable` and `sameValue` (the same functions Confirm & use and `left_why` use, so the server and the drawer agree on "left for a person"). A comparable differing value returns before any write (`case-documents.ts:536`). The VERIFIED row copies the answer it compared, guarded by `updateMany … supersededById: null` (409 `changed`).
* **Races.** Five simultaneous clicks on a differing answer: five 409 `differs_from_document` naming **one** existing check, **one** audit line (`answer_check_one_open` plus the P2002 fallback, `:556`). Mark raced against an answer change to the document's value, eight rounds: never VERIFIED with a value the passport contradicts (0/8). When the answer changes between the compare and the check's creation, the check names the superseded answer. That is the same state as "check opened, then answer changed", which resolve already handles (it sends the current `answerId`, break M1). The triggers accept it: the answer belongs to the person and fact.
* **Audit holds no value.** "Case officer asked to mark person.passport_number for the principal checked against Passport or travel document on case …; the answer differs from the document, so a check was opened instead". No typed or read value; the reason stays on `answer_check`.
* **Place of birth:** still 422 `not_evidence` (F2 fail).
* **Knock-on (kept over the document).** A resolved check that kept this answer gives 409 `kept_over_document`, with no second check and the answer not VERIFIED (F3, C6.5-39, my walk). A different answer saved after the keep opens a fresh check (probe 5), which is right.
* **Drawer.** The resolved row reads "SAMPLEDE · Check resolved · kept over the document, with a reason" and offers no mark, at 1440 and 1024 px and 200 %. It persists on reload. axe found 0 violations at both widths. The resolve form works by keyboard. No page errors. The drawer opens in 162–188 ms. The mark stays only on rows where the read gave no comparable value (could not read, left for a person, not on these documents), so the drawer never triggers `differs_from_document`. The departure from BR-12's "an answer kept by a resolved check" is disclosed to the tech lead in the PR comment, not silent.
* **Tests fail when a rule is removed:** without the compare, F1 fail gets 200; without the `notWritable` exception, F2 pass gets 409; without the kept lookup, F3 gets `differs_from_document` and a second check; without `data-kept-answer`, C6.5-39 times out.

## D1–D20 (1–5), this change
D1 Requirement fit 3: the rule as written holds, except for M1 · D2 Data integrity 3: M1 lets a contradicted value become VERIFIED · D3 Reuse 4: `sameValue`, `notWritable`, `labelOf`; m3 duplicates the compare in the web · D4 Rule integrity 3: M1, m1 · D5 Stability 5: one check under five racing clicks · D6 Governance 5: an audit line for the opened check, without values · D7 AI trust N/A (coded-line rules) · D8 Orientation 4 · D9 Flow 4: nothing left to click on a settled row · D10 Language 4: m2 · D11 Feedback 4: the row says what was kept · D12 Visual 5 · D13 Accessibility 5: axe 0, keyboard resolve · D14 Team look 5 · D15 Speed 5 · D16 Testability 4: m4 · D17 simulated only · D18 Provenance 4: the row does not show the document's value it was kept over · D19 Closure 3: M1 · D20 simulated only.

## BIC (EXPERIENCE.md §6, the changed row only; the rest as scored for 2b)
| Check | Score | Evidence |
|---|---|---|
| BIC-07 conflicts never silent | Met | differs → a check (BR-7); kept → "kept over the document, with a reason"; walk w2, w3 |
| BIC-13 errors in the server's words | Met (API) | 409 `differs_from_document` / `kept_over_document` with `detail`; the drawer never reaches them |
| BIC-18 every state drawn | Met | resolved-and-kept is now its own state (`data-kept-answer`); w3-resolved-1440/1024 |
| BIC-20 keyboard, 1024 px, 200 % | Met | keyboard resolve; no sideways scroll; w4-resolved-1024-200 |
| Others | unchanged | no other element changed |

## Issues, ranked
1. **M1, Major, Must: a passport that was never read vouches for any answer.** `case-documents.ts:535–536` compares only `if (read && …)`. If the document has no read, `read` is null and the route marks any answer VERIFIED. Probe: upload the spouse's passport (coded line SAMPLES35), do not read it, answer "WRONG0001", POST checked-against-document → **200, `VERIFIED|WRONG0001`**, `document_review` count 0 (three runs). The PR body calls the officer's-judgement case "a value the read could not give (an unreadable field)", but here nothing was read, so nothing was compared. The drawer never offers this (it lists read documents only). The API route is the contract, though, and the server must hold the rule (STANDARDS §2 [M], authorisation and rules on the server). **Fix:** when the document's kind has a reader and the document has no `document_review`, refuse with 409 `not_read`, "Read it with Fill this from documents first. Nothing changed." (Alternatively, read the coded lines then, by rules, at US$0.) No drawer path changes. Add F4: a fail test (an unread passport and a differing answer → 409, not VERIFIED) and a pass test (after the read, an equal answer → 200). If the tech lead rules that an unread document is the officer's judgement, this becomes a note.
2. **m1, Minor, Should: a check resolved on a newer answer still opens a second check.** The kept lookup (`:547`) matches `answer_check.answer_id`, the answer the check was **opened** on. Resolve can keep a newer answer (`answerId` sent, break M1). Probe 6: check opened on "SAMPLEX", answer changed to "SAMPLEY", resolved keeping it, then mark → **409 `differs_from_document` and a 2nd check**: the loop the knock-on meant to prevent. API only; the drawer hides the mark. **Fix:** also treat as kept a resolved `kept: "answer"` check on this document and fact whose `resolvedAt` is not earlier than the current answer's creation.
3. **m2, Minor, Should: the refusal words.** `labelOf` falls back to the fact's last word, so the reply reads "given names: you kept this answer over what Passport or travel document reads …". The label is lower case, and the type name is capitalised mid-sentence. API only today. **Fix:** use the person's question label (as the drawer does) and "the passport" or "this document".
4. **m3, Minor, Should: the web repeats the server's compare, differently.** `documents-drawer.tsx:265` `sameShown` ignores case for every fact; `sameValue` does so only for names. A non-name answer kept over the document that differs only in case would show "Check resolved" without "kept over the document". This also conflicts with STANDARDS §2 [M] "no duplicated logic between web and API". **Fix:** let the API mark a resolved row as kept (from `answer_check.kept`) and show that.
5. **m4, Minor, Should: `kept_over_document` has a fail test only.** Add F3 pass: after a keep, a different answer opens a fresh check (my probe 5 shows that it does).

**For the tech lead (not counted against this PR):** the motivating case still passes. Citizenship "Afghanistan" checked against a passport reading IND → **200, `VERIFIED|Afghanistan`** (probe 4), because a country given only as a code is "left for a person" under the rule as ruled. F2 pass asserts this for "India", and "Afghanistan" passes the same way. The drawer shows "IND" beside the mark, so the officer's judgement is informed. A sourced ICAO Doc 9303 code table would close the gap. That is a decision for the tech lead or the founder, not a finding here. Separately, the concept's BR-12 still lists "an answer kept by a resolved check" and needs your amendment once you answer the builder's question.

## Could not check
A real screen reader, and an intended user's unaided walk (D17, D20 stay with the founder). The configured checkpoint: I ran the fixture only. CI on this head.

Verdict: Block 107aefb7d70d10711f181b06aa69322d49de6064. To fix: **M1** (Major) with its pass and fail tests. m1 to m4 are Should and do not block on their own.

## Builder's fixes (on the Block of 107aefb7d)
* **M1:** a document that was never read is refused: 409 `not_read`, nothing changes (`case-documents.ts`, before the compare). Test F4 fail: the child's renewed passport, unread, gives 409 with no review row and the answer unchanged. Test F4 pass: once it is read and agrees, 200 VERIFIED. A document that was read but could not give this fact stays the officer's judgement, as Lead 36 ruled.
* **m1:** the answer kept is the one in force when the check was resolved. That is either the check's own `answer_id`, or an answer at least as old as `resolved_at`, because resolve refuses unless it is sent the current answer. Test: a check opened on "CHILD AZ", resolved keeping "CHILD AW", then marking gives 409 `kept_over_document` with no third check.
* **m4:** the pass side. An answer typed after the resolve was never kept, so it opens a check of its own (409 `differs_from_document`, 3 checks).
* **m2:** the refusals now read `"<Question>": the answer differs from what the document (<name>) reads …`. The fallback label is capitalised. A test checks the wording.
* **m3:** the drawer's `sameShown` ignores case only for names, as the server's `sameValue` does. It has no screen step of its own. The screen pack passes 32/32 on a fresh fixture copy; the rule it mirrors is tested in `check_c65_document_rules` (R3).
* **Checks:** `check_c65_documents_api` 72/72 and `C6.5-screen.test.ts` 32/32, on fresh fixture copies. Type check: no new errors.
* **Not changed (for the tech lead):** the country-code note and BR-12's wording wait for your answer on the PR.

## Re-review of f9bea4a3b

Reviewer: fresh context; I did not build it. Diff-only re-review (P-318 (1)) of `f9bea4a3b` against the Block above: `api/src/case-documents.ts` (`checkedAgainst`, `labelOf`), `web/src/runtime/documents-drawer.tsx` (`sameShown`), `tests/check_c65_documents_api.ts` (F3 m1, F3 m4, F3 m2, F4 fail, F4 pass). The branch head `33ab98d88` is a merge of review records only: no prototype file differs from `f9bea4a3b`.

### Runs (own copy `rv_c65g`, :4438, fixture; US$0, no `*_LIVE` switch)
* `check_c65_documents_api.ts` on the head: **72/72**.
* **Tests fail when the fix is removed.** I ran mutants on a scratch copy of the studio, with the same tests: no repository file was edited.
  * M1 guard off, plus the kept lookup back to `answerId` only: **68/72**. F4 fail gets 200 `VERIFIED`. F3 m1 gets `differs_from_document` and a second check. F3 m4 and F3 m2 fail as a knock-on.
  * Kept lookup made over-broad (`find(() => true)`): **69/72**. F3 m4 gets `kept_over_document` instead of a fresh check.
  * So both directions of the m1 rule are pinned, and so is M1.
* **Probes** (scratch script, deleted after the run):
  * P1: keep "CHILD AX", then Confirm section, then mark. Result: **409 `differs_from_document`, a 2nd check** (finding n1).
  * P2: the answer was typed before the check, changed, the newer one kept, then Undo restored the earlier one. Result: 409 `differs_from_document`, a fresh check, which is right.
  * P3: an unread letter gives 409 `not_read`. A replay read is then refused, `no_saved_read` (note n3).
  * P4: a passport read, then replaced. The old file gives `not_current` and the new one gives `not_read`, which is right.
* I did not run the screen pack: the caller scoped this run to the API check. The builder reports `C6.5-screen` 32/32.

### Answers to the questions asked
* **Can an answer typed before the check opened, then restored, count as kept?** No. Undo writes a new row with `effective_at` = the undo time (`case-changes.ts:69`), which is later than `resolved_at`, and with a new id. So it opens its own check (P2). An answer typed before the check that stays current through the resolve was the one in force at the resolve, so it was kept, and that is right. Resolve refuses unless the answer sent is the current one (`case-documents.ts:491`).
* **Changed by a client.**
  * Before the resolve: the officer can only resolve on the current id, so what they kept is what they saw. Right.
  * After the resolve: a new row with a later `effective_at` opens a check. Right.
* **Changed by Confirm & use.**
  * Of this document: it runs once, before any of these checks.
  * Of another current document of the same fact: it writes a new row only when it **agrees** with the current answer (same value, new id, new time). So does Confirm section (`runtime.ts:678–682`), and so does a client's re-confirm (`runtime.ts:508–510`). Each of these breaks the kept chain (n1).
* **M1, "no `document_review` ⇒ 409 `not_read`".**
  * A **letter** is refused the same way (P3). That is consistent with M1's fix, but it is a dead end on a copy with no saved read (n3).
  * A **replaced file** is refused `not_current` first (`:520`).
  * A **file read, then replaced**: the old file is `not_current`, and the new file needs its own read, because the review row is unique per document (P4).
  * The review row and its values are written in one transaction (`:278–281`), so there is no "reviewed but no values yet" window in which `read` is null.
  * A passport that was read but gave no coded zone has a review row, so marking it stays the officer's judgement, as Lead 36 ruled.
  * The guard sits outside the transaction, but a review row is never deleted, so a read landing in between is still compared inside the transaction.

### Each finding of the Block
* **M1: closed.** `case-documents.ts:524–525`. F4 fail and pass. The mutant shows it bites.
* **m1: closed as written** (the newer answer kept at the resolve). `:548–550` and F3 m1. The rule leaves the same loop open by another path (n1), so the closure is partial in spirit. Minor.
* **m2: closed.** It reads `"Given names": the answer differs from what the document (Passport or travel document) reads …`. The `not_read` and `kept_over_document` words follow the same pattern.
* **m3: closed as a mismatch.** `documents-drawer.tsx:266` now ignores case only for `_name(s)` facts, as `sameValue` (`document-values.ts:4–8`). The logic is still duplicated between web and API (STANDARDS §2), and the fix the review preferred (the API marks the row as kept) was not taken. That was a Should; it is noted, not re-raised.
* **m4: closed.** F3 m4. The over-broad mutant shows it bites.

### New or remaining issues, ranked (none Blocker or Major)
1. **n1, Minor, Should: a value-carrying rewrite after a keep reopens the settled difference.** `case-documents.ts:549–550` treats an answer as kept only by row identity or time. Confirm section (`runtime.ts:678–682`), a client's re-confirm (`runtime.ts:508–510`), and a mark against another agreeing document (`case-documents.ts:537–539`) all write the **same value** as a new row, later than the resolve.
   * Scenario (P1): the officer keeps "CHILD AX" over the passport with a reason, then presses Confirm section. Marking then gives 409 `differs_from_document` and opens a **second check** for the difference already settled. That is the loop the knock-on and m1 meant to prevent.
   * It is API only (the drawer hides the mark on a resolved row), and the gap was already there on `107aefb7d`.
   * Fix: treat as kept when the current value `sameValue`s the answer in force at `resolved_at`. That answer is the row with `effective_at <= resolved_at` whose successor, if any, is later. Or record the kept answer and value at the resolve.
2. **n2, Minor, Should: the m1 rule compares two clocks.**
   * `effective_at` is the database's `now()`, the transaction start (`schema.prisma:1527`, used by `runtime.ts:466` and `case-documents.ts:447/501/539`).
   * `resolved_at` is Node's `new Date()`, taken before the resolve transaction even starts (`case-documents.ts:485`). Resolve also reads the current answer without a lock (`:488–491`).
   * Failure scenario 1: the app clock runs ahead of the database's. An answer typed shortly after the resolve then has `effective_at <= resolved_at` and is counted as kept. The reply is a false "you kept this answer" (409 `kept_over_document`), and no check opens.
   * Failure scenario 2: the app clock runs behind. An answer kept moments after it was typed is not recognised, and that is the original m1 loop.
   * Failure scenario 3: an answer save whose transaction starts before the resolve's `at` and commits after the resolve's read gives the same false "kept".
   * On the reference build the app and the database share one host, so this has not been observed.
   * Fix: match by row identity recorded at the resolve, or take both times from one clock (for example `resolved_at` from the database inside the resolve transaction).
3. **n3, Note: `not_read` on a letter can be a dead end.** On a copy with no saved read of the letter, "read it in Fill this from documents first" leads to 409 `no_saved_read` (P3). A live read is refused here. It is API only, since the drawer lists read documents only. The words could say that a saved read is needed.
4. **n4, Minor, carried from `107aefb7d`, not introduced here: the drawer contradicts m4.** `documents-drawer.tsx:240` and `:246` show "Check resolved · kept over the document, with a reason" for **any** current answer that differs once the Confirm-opened check is resolved, including one typed after the resolve. The server now says plainly (m4) that such an answer was never kept. The drawer offers no mark on that row, so in the drawer no check ever opens for the new difference (BIC-07, D18). This is from reading the code, not walked. It belongs to the tech lead's next item, not to this PR.

### Journey score
This diff changes one user-visible line, the drawer's resolved row (`sameShown`). The API changes are not reachable from the drawer. I did no new walk. The journey score for this PR stays the reviewer's **9/10, Pass** (`journey-test-reviewer-checked-2026-11-09.md`). n4 is the only journey-level gap seen, and it predates this commit.

### Could not check
The screen pack, a browser walk, a real screen reader, CI on this head, and the configured checkpoint (fixture only).

Verdict: Approve f9bea4a3b

## Builder's fixes (after the Approve on f9bea4a3b)
* **n1:** the kept answer also covers its own value saved again as a new row, for example by Confirm section or a client's re-confirm. The rule now lives in one function, `keptOver` in `case-documents.ts`, used by the mark and by the proposals. Test: the first kept value saved again gives 409 `kept_over_document`, with no further check.
* **n4:** the proposals carry `kept_over`, computed by the same rule. The drawer says "kept over the document, with a reason" only then. Any other answer on a resolved row offers the mark again, where the document gives the fact. After a refusal the drawer reads again, so the check the server opened shows at once.
  * API test: `kept_over` is true for the kept value and false for a later answer of another value.
  * Screen step C6.5-39b: a later answer shows no "kept over" words, offers the mark, and clicking it opens a check, shown in the drawer and never VERIFIED.
* **m3 (duplication):** the drawer's `sameShown` is gone. The drawer reads `kept_over` from the server.
* **n2 (two clocks):** not changed. Making it exact needs the resolve to record the answer it kept, and the migration's guard forbids changing `answer_id`, so it would take a new migration. The app and database share one host on the reference build. Raised for the tech lead.
* **n3 (a letter with no saved read):** not changed. Reading it replays only (FQ-10), so `not_read` is the honest answer until part 3.
* **Checks:** `check_c65_documents_api` 74/74 and `C6.5-screen.test.ts` 33/33, on fresh fixture copies. Type check: no new errors.
