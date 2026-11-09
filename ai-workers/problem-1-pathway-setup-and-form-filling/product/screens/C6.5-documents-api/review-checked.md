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

## Re-review of 708b18717

Reviewer: fresh context; I did not build it. Diff-only re-review (P-318 (1)) of `708b18717` against the re-review of `f9bea4a3b` (n1, n4, the m3 duplication). Files: `api/src/case-documents.ts` (`keptOver`, the proposals' `kept_over`, `checkedAgainst`), `web/src/runtime/documents-drawer.tsx` (the resolved row, `markOnly`, the refresh after a refusal), `tests/check_c65_documents_api.ts` (F3 n1, F3 n4), `acceptance/C6.5-screen.test.ts` (C6.5-39b).

### Runs (own copy `rv_c65h`, :4438, fixture; US$0, no `*_LIVE` switch; copy stopped and dropped at the end)
* `check_c65_documents_api.ts`: **74/74**. It ran the two setups itself, since the copy had no Visitor visa.
* `web-fresh.sh build`, then `C6.5-screen.test.ts`: **33/33**, C6.5-39b included.
* **Each test fails without its fix.** I ran mutants on a scratch copy of the studio, served on :4438 against the same database. No repository file was edited, and the scratch copy is deleted.
  * A: the value clause dropped from `keptOver`. API check **73/74**: F3 n1 gets `differs_from_document`.
  * B: `kept_over` set to "differs", without `keptOver`. API check **73/74**: F3 n4 gets `kept_over: true` for CHILD AU.
  * C1: no refresh after a refused mark. Screen pack **26/27, then it stops**: C6.5-39b waits 20 s for the check row, which never shows.
  * C2: the drawer compares by itself again, as `sameShown` did. Screen pack **26/27, then it stops**: C6.5-39b never finds the mark.
  * C1 and C2 show up as a timeout crash, not as a named FAIL, and the steps after 39b do not run (see the Note below).
* **Probes** (scratch scripts, each on a fresh case of the same copy):
  * H1. The check opened by a mark on CHILD AZ. The client changed it to CHILD AW, and the check was resolved keeping AW. Then AZ was typed again. Result: **409 `kept_over_document`**, `kept_over: true`, no check opened.
  * H1-drawer. AZ was typed before Confirm & use, so Confirm opened the check and the row is `conflict`. AW was kept, then one **Undo** brought AZ back. Result: the row is resolved with `kept_over: true`, so the drawer shows "kept over the document, with a reason" and no mark. Marking gives **409 `kept_over_document`**, and no check opens. On `f9bea4a3b` this was probe P2, which gave a fresh check and was judged right.
  * H2. CHILD AX was kept over the passport. Later another check was resolved keeping **the document** (VERIFIED CHILD A). Then AX was typed again. Result: **409 `kept_over_document`**, `kept_over: true`, no check opened.

### Answers to the questions asked
* **Can the value rule wrongly suppress a check? Yes. It is a hole, not an acceptable edge (n5, n6).**
  * `keptOver` (`case-documents.ts:136`) compares the current answer with the check's `typedValueJson`. That is the value **when the check opened**, not the value the officer kept.
  * Since m1, resolve keeps the answer in force **at the resolve**, which may differ from the one the check opened on (`:506`). So a value the officer saw replaced and did not keep counts as kept when it returns (H1).
  * The rule also ignores order. An older keep-answer still applies after a later check on the same document and fact was resolved keeping the document (H2).
  * Neither case makes anything VERIFIED. In both, the officer is told they kept a value they never kept, and the difference with the passport gets no check.
* **Can `kept_over` and `checkedAgainst` disagree?** Not in what I found. Both call the same `keptOver` with the same inputs:
  * the current answer (`rowKey` null, not superseded);
  * the same person, document and fact;
  * resolved checks with `kept: "answer"` only (`:333`, `:563`).
  * In every probe and test run, `kept_over: true` went with 409 `kept_over_document`, and `false` went with a check opening.
  * The proposals skip the server's `notWritable` condition (`:348` against `:551`). That cannot matter: a check never opens on a value left for a person, so no keep-answer exists for one.
  * Note: the drawer filters open checks per document (`checks.some(...)`). The server refuses on an open check of the same fact on **any** document (`open_checks`). So with an open check on another current file, the drawer can show a mark that the server refuses. The refusal now refreshes, and the open check shows in that file's block. This edge predates this commit.
* **Can the restored mark mark VERIFIED an answer the document contradicts?** No.
  * The resolved row is a proposal of this document, so a read value exists for the fact.
  * `checkedAgainst` takes the `differs` path whenever that read value is writable and differs (`:551`). Then it either refuses `kept_over_document` or opens a check. It never writes VERIFIED.
  * C6.5-39b checks this through the screen: DECLARED|CHILD BV, one open check.
  * The row offers the mark only when the answer is not already VERIFIED (`documents-drawer.tsx:249`).
* **Can the refresh after a refusal loop or lose an open form?** No.
  * `refresh` only invalidates queries (`:79`). It runs once per click, from the click handler, never from an effect or a render. Its own failure is swallowed (`:306`).
  * React Query keeps the data while it refetches, so the drawer is not swapped for the skeleton. The blocks keep their keys (`r.id`, `p.id`), so another value's open "Correct it" or "Answer it" form stays mounted with its draft.
  * The only part that unmounts is the clicked `markOnly` control: its row stops being "resolved" once the server's check shows. It has no form.
  * Saving an answer already refreshes on a 409 the same way (`:299`).
* **Does each test fail without its fix?** Yes (mutants A, B, C1 and C2 above).
  * F3 n1 pins the value clause, but through an **older** resolve: AX, kept at check 1, saved again after check 3 kept AV. It is not the plainer case of the kept value re-saved right after its own resolve. That case also passes, through check 3's own typed value.
  * No test covers H1 or H2.

### Each finding of the re-review on f9bea4a3b
* **n1: closed for the case it named.** The kept value saved again as a new row is still kept (`:136`, F3 n1, mutant A). The way it was closed opens n5 and n6.
* **n4: closed.** The drawer says "kept over the document" only on the server's `kept_over` (`documents-drawer.tsx:248`). A later answer of another value offers the mark (`:249`). A refused mark shows the check the server opened (`:306`). Tested by C6.5-39b, mutants C1 and C2.
* **m3 duplication: closed.** `sameShown` is gone, and the drawer reads `kept_over`.
* **n2 and n3: open, as the builder says.** They are raised for the tech lead, and nothing in this diff changes them.

### New issues, ranked (none Blocker or Major)
1. **n5, Minor, Should: a value the officer saw replaced and did not keep counts as kept when it returns.** At `case-documents.ts:136`, `sameValue(fact, k.typedValueJson, answer.valueJson)` uses the value the check opened on.
   * Failure scenario (H1-drawer, walked through the API):
     1. A child's given names are typed "CHILD AZ"; the passport reads "CHILD A".
     2. Confirm & use opens a check.
     3. The client corrects it to "CHILD AW".
     4. The officer keeps AW, with a reason.
     5. Someone presses Undo, and AZ is back.
   * Result: the drawer says "Check resolved · kept over the document, with a reason" for AZ and offers no mark. The server refuses the mark with "you kept this answer". No check ever opens for AZ against the passport, so a spelling nobody kept can go onto the form.
   * Severity: this is a regression of P2, which the re-review on `f9bea4a3b` found right. It is Minor on the precedent of m4 (the same failure class: an answer never kept treated as kept), because nothing becomes VERIFIED.
   * Fix: compare with the value of the answer **kept at the resolve**: the row of this person and fact with `effective_at <= resolved_at`, latest first. That is the rule the n1 note proposed, and it carries the n2 clock caveat. Or compare with the check's `typed_value_json` only when the kept answer is the check's own `answer_id`. Add the H1 case as a fail test.
2. **n6, Minor, Should: an older keep-answer outlives a later keep-document.** `keptOver` takes any resolved keep-answer check of that document and fact (`:135–136`, fed by `:333` and `:563`), whatever came after it.
   * Failure scenario (H2):
     1. The officer keeps "CHILD AX" over the passport.
     2. Later, on another check, they decide the passport is right, and CHILD A is VERIFIED.
     3. The client re-types AX.
   * Result: a mark gets 409 "you kept this answer over what the document reads", and no check opens, against the officer's latest judgement.
   * In the drawer, that row is `used`, so it shows neither the words nor a mark. The false statement is in the API refusal and in `kept_over`.
   * Fix: only the latest resolved check per person, document and fact counts. A keep-document resolved after it ends the keep. Add H2 as a fail test.
3. **Note: a missing element in C6.5-39b aborts the pack instead of failing the step.** The `waitFor` timeouts at `C6.5-screen.test.ts:181` and `:184` throw. So mutants C1 and C2 report "crashed" at 26/27, and steps 40, 41, 34 and 35 do not run. The pack still goes red, so this is a Note only.

### Journey score
The visible change is the drawer's resolved row: the words only on `kept_over`, otherwise the mark, and a refresh after a refusal. The screen pack walks it at 1440 px, including the keyboard and axe steps. I did no new browser walk. The reviewer's journey score for this PR stays **9/10, Pass** (`journey-test-reviewer-checked-2026-11-09.md`). n4, the gap noted then, is closed. The narrower n5 replaces it, through an Undo after a changed-and-kept answer.

### Could not check
A browser walk by hand, a real screen reader, CI on this head, and the configured checkpoint (fixture only).

Verdict: Approve 708b18717

## Builder's fixes (after the Approve on 708b18717)
* **n5 and n6:** `keptOver` now counts only the latest resolved check of this person, document and fact, and only when it kept the answer.
  * The answer kept is the answer in force when that check was resolved: the newest row with `effective_at <= resolved_at`. It is never the value the check opened on.
  * The current answer is kept when it is that answer, or the same value saved again as a new row (n1 still holds).
  * Tests:
    * **n5:** the value the check opened on, typed again after the resolve, opens a check of its own (F3 m4, n5).
    * **n1:** the latest kept value saved again is still refused.
    * **n6:** after a later check kept the document, a value an older check kept shows `kept_over: false`, and marking it opens a check.
* **Checks:** `check_c65_documents_api` 74/74 and `C6.5-screen.test.ts` 33/33, on fresh fixture copies. Type check: no new errors.
* n2 (two clocks) is unchanged: the rule still compares `effective_at` (database time) with `resolved_at` (app time). It stays with the tech lead.

## Re-review of 88194485a

Reviewer: fresh context; I did not build it. Diff-only re-review (P-318 (1)) of `88194485a` against my re-review of `708b18717` (n5, n6).
* Files: `api/src/case-documents.ts`: `keptOver` (`:136–142`), the proposals' `resolved` and `history` (`:338–339`, `:354`), and `checkedAgainst` (`:569`).
* Tests: `tests/check_c65_documents_api.ts`, F3 rewritten.
* The drawer and the screen pack are unchanged since `708b18717`.

### Runs (own copy `rv_c65h`, :4438, fixture; US$0, no `*_LIVE` switch; copy stopped and dropped at the end)
* `check_c65_documents_api.ts`: **74/74**.
* `web-fresh.sh build`, then `C6.5-screen.test.ts`: **33/33**, with C6.5-39 and C6.5-39b.
* **Probes** (my scratch scripts from the last re-review, each on a fresh case, now on this head):
  * **H1.** The check opened on CHILD AZ, AW was kept, then AZ was typed again. Result: **409 `differs_from_document`**, `kept_over: false`, and a check opens. Before: `kept_over_document`.
  * **H1-drawer, the Undo case.** Confirm & use opened the check on AZ, AW was kept, then Undo brought AZ back. Result: the row is `conflict` with **`kept_over: false`**, so the drawer offers the mark and not the words. Marking gives **409 `differs_from_document`**, and a check opens.
  * **H2.** AX was kept, then a later check kept the document, then AX was typed again. Result: **409 `differs_from_document`**, `kept_over: false`, and a check opens.
  * **H3** (new). AX was kept, then later **AW2** was kept.
    * AW2 itself gives 409 `kept_over_document`, `kept_over: true` (m1, n1).
    * AW2 saved again as "child  aw2", with lower case and two spaces, is still kept (`sameValue`).
    * AX, kept only by the older check, now gives **409 `differs_from_document`** and a check. That follows from "the latest judgement only", and it is right: the officer's last word kept AW2, not AX.
* **The tests fail without the fix.** I ran mutants of `keptOver` on a scratch copy of the studio, served on :4438 against the same database. No repository file was edited, and the scratch copy is deleted.
  * **n5 mutant:** any value the person had before the resolve counts, as the opened-on value did. API check **70/74**: F3 m4/n5 gets `kept_over_document`, and the three later F3 lines follow.
  * **n6 mutant:** the latest check that **kept the answer**, skipping a later keep-document. API check **73/74**: F3 n6/n4 fails alone.
  * **n1 mutant:** the same value saved again no longer counts. API check **72/74**: F3 n1 fails, and F3 n6 follows on the check count.
  * **m1 mutant:** the oldest answer row before the resolve, instead of the newest. API check **68/74**: Lead 36 F3, m1, n1 and the rest fail.

### Answers to the questions asked
* **n5: closed.** The kept answer is now the newest answer row with `effective_at <= resolved_at` (`:140`). The value the check opened on is never used. Resolve refuses unless it is sent the current answer (`:512`), so that row is the answer the officer kept. The H1 and Undo cases now open a check (H1, H1-drawer), and F3 m4/n5 pins it (n5 mutant).
* **n6: closed.** Only the latest resolved check of that person, document and fact counts, and only if it kept the answer (`:138–139`). H2 opens a check, and F3 n6/n4 pins it (n6 mutant).
* **Nothing found right before is broken:**
  * **m1:** a newer answer kept at the resolve is still kept (F3 m1, H3, m1 mutant).
  * **n1:** the kept value saved again as a new row is still kept (F3 n1, H3, n1 mutant). The test now uses the plain case: AZ kept, AU typed, then AZ saved again. The older-resolve variant I noted is gone.
  * **n4:** the proposals and the mark call the same `keptOver` with the same inputs. The proposals' `history` (`:339`) holds every row of the person for the facts that have resolved checks; the mark's (`:569`) holds that fact only. They agreed in every probe: `kept_over: true` went with 409 `kept_over_document`, and `false` with a check opening.
  * **The drawer row:** unchanged code, still green on C6.5-39 and C6.5-39b. It still cannot mark an answer VERIFIED that the document contradicts, since `checkedAgainst`'s differs path is untouched.
* **Lead 36's base case** (a check kept on the very answer it opened on) still holds. That answer was in force at the resolve. F3 "Lead 36" pins it (m1 mutant).

### Issues, ranked (none Blocker or Major)
1. **n2, Minor, carried:** the rule now rests wholly on `effective_at <= resolved_at`, because the `answerId` clause is gone.
   * `resolved_at` is the app's `new Date()`, taken before the resolve transaction (`:506`). Most answer rows take `effective_at` from the database's `now()`.
   * If the app clock runs behind the database's by more than the gap between a save and the resolve, the kept answer falls just after `resolved_at`. The row before it is then taken as kept: the m1 loop and the n5 failure, by the clock.
   * On the reference build both clocks are one host's, so this was not seen. It stays with the tech lead, as the builder says, and its fix (a resolve-time database clock, or the kept answer recorded at the resolve) closes this too.
2. **Note, outside this diff:** once a check kept the document, the read value is `used` (`:524` on the resolve path). The drawer then shows that row only as "Used", and the "Check resolved" row with its words or mark never comes back for that document's value. Later keeps of that fact are judged correctly by the server (H3), but the drawer row no longer reflects them. It predates this PR and is not raised as a finding here.

### Journey score
No user-visible code changed. The drawer row now gets correct `kept_over` values for the Undo and keep-document cases. I did no new walk. The reviewer's journey score for this PR stays **9/10, Pass** (`journey-test-reviewer-checked-2026-11-09.md`). n5, the gap noted in the last re-review, is closed.

### Could not check
A browser walk by hand, a real screen reader, CI on this head, and the configured checkpoint (fixture only).

Verdict: Approve 88194485a

## Diff-only check of the merge 9f176ed8c
P-318 (1), fresh context. Head 9f176ed8c merges origin/main 60235a001 (#1375 merged) into ffc5dd843. ffc5dd843 is 88194485a plus the review record only, so it holds the code approved above.

### The merge itself
* **Clean merge:** the tree of 9f176ed8c (`9487a6d00`) is the same as `git merge-tree --write-tree ffc5dd843 60235a001`. No conflict was settled by hand and no line was edited during the merge.
* **This PR's six files:** `git diff ffc5dd843 9f176ed8c` touches none of them. Main changed none of them since the merge base (`47a1a9e70`).
* **What main brought:** `git diff ffc5dd843 9f176ed8c` is byte for byte `git diff 47a1a9e70 60235a001` (36 files: B157, QA-246, qa records).
* **Against main:** `git diff 60235a001 9f176ed8c --stat` shows exactly the six files (472+, 10−):
  * `api/src/case-documents.ts`
  * `web/src/runtime/documents-drawer.tsx`
  * `tests/check_c65_documents_api.ts`
  * `acceptance/C6.5-screen.test.ts`
  * `review-checked.md`
  * `journey-test-reviewer-checked-2026-11-09.md`

### Does what main brought change the meaning of this PR?
None of it does.
* **`runtime.ts` (B157):** only the relatives' subjects changed (`subjectFor` adds a fallback on a unique-index refusal; comments in `relativesOf`). `case-documents.ts` works on a person's own subject (`who.subjectId`, a participant) and never on a relative's. None of the six files names `parent_1`, `parent_2`, `sibling`, `relativesOf` or `subjectFor`.
* **Migration `20261108050000_b157_one_relative_subject`:** it only adds a partial unique index on `answer_subject (party_id, subject_kind)` for the three relative kinds, and changes no rows.
  * It does not touch `client_canonical_answer`, `answer_check` or `read_value`, the tables `keptOver` and `checkedAgainst` read and write.
  * On my copy it applied (finished), the index exists, and the C6.5 run made no relative subject.
* **`fill-case.ts`, `sample-case.ts`, `acceptance/lib/m3.ts` (QA-246):**
  * GET …/forms now leaves out a form whose rule still waits for an answer, and the Online list keeps only `applies === true`.
  * `list()` has a new optional argument. The six files do not call GET …/forms, `forms.list`, `fillEverything` or `includeWaiting`.
* **The answers' channels:** main changed no answer channel. The only `channel` change is the Online forms list. The PR's `checked_against_document` rows are written and read as before: my run left 3 such rows.
* **The C6.5 packs and `case-documents.ts`:** main changed neither. #1375 (`runtime-c65-counts`) was already in this branch (`33ab98d88`), so its merge into main brings nothing new to C6.5.
* **Tests main changed** (`check_b52_own_yes_no`, `check_s5_slice1`, `check_qa246_forms_waiting`, `check_b157_relative_subject_unique`): they are about forms and relatives, not documents or checks.

### Re-run on my own copy (`rv_c65m`, :4438, fixture; US$0, no `*_LIVE` switch)
* `tests/check_c65_documents_api.ts`: **74/74 passed** on 9f176ed8c.
* `tsc --noEmit` on `api/` and `web/`: no error in the six files or in the files main changed.
* The copy was stopped afterwards (database and files removed).
* I did not re-run `C6.5-screen.test.ts`: I take the builder's 33/33. It runs against the same code, untouched by the merge.

### Issues
None new. n2 (Minor, the clock) and the drawer note stay as recorded on 88194485a.

### Journey score
No user-visible change from the merge. The reviewer's journey score stays **9/10, Pass** (`journey-test-reviewer-checked-2026-11-09.md`).

### Could not check
CI on this head, the browser pack by hand, and the configured checkpoint (fixture only).

Verdict: Approve 9f176ed8c
