# B83 review: "Ask as its own question" (independent reviewer, 5 Nov 2026, head 4bcf2ae14b, diff since 0509b0910c)

**Verdict: Block.** Skill verdict: Ship after fixes. R1 to R5, M8 and M9 are closed. One new Major, V1, which this diff causes: moving M6's check into a shared function also deleted five other refusals from the rule-fact route. It is one small fix. **Journey score: 8 / 10, provisional: scored by reading, not walked.** No copy started (P-348 (5)), no new journey report, as asked.

**Severity rule:** the tech lead's later ruling on PR #1036 replaces the brief's. A Major this diff causes or reaches is a Major and holds the PR. Nothing here is called old on reading alone: what I think is on main is marked "main: not run", with why.

**Ran, no database, US$0:** `graph.mjs` without `--write` (G1 0, G2 0, G4 0, G5 0; G3 13, G6 5, as last time); `tsc -p api/tsconfig.json --noEmit` (no error in the six API files this diff touches, filtered by name). **On main (`origin/main` d236e3e28), git only, nothing run:** `rule-facts.ts:181-189` still holds the five refusals; `library-items.ts`, `forms.ts` and `engine/snapshot.ts` are unchanged against this PR. **Read:** the whole diff, and the propose, approve, withdraw, undo, release and suite code around it. **Taken from the builder, not re-run:** route suite 168/168. The browser check and packs have not run on this head.

## Major
**V1. The rule-fact route lost five refusals (this diff; not on main).** `api/src/rule-facts.ts:181`. By reading; not run.
* **Cause:** the M6 block became `refuseTakingOverReaders`, but the edit also removed the seven lines after it (`git show 0509b0910c:…/rule-facts.ts`, or main `:181-189`). `missing`, `waitingFor` and `FACT_KEY` are now unused in `add`, the sign of it.
* **What is gone from `POST /combinations/:id/rule-facts`:**
  * MA3, retired field: `library` holds only DRAFT and PUBLISHED (`:147`), so the add answers 201 with a proposal the lander always refuses (`proposals.ts:588`). Reachable from the screen: the fact is still listed as missing.
  * m7, one waiting item per name across the workspace: a second waiting item under one name, from the screen.
  * Derived fact: a worked-out key can be proposed, and landing makes a library field of it (`taken` reads only `canonical_field`). Route only.
  * `FACT_KEY`: a key that is not group.name can be proposed and land. Route only.
  * `waitingFor`: covered by the check in the transaction, so no effect.
* **A named test fails:** `tests/check_forms_c36_rule_facts.ts:142-143` expects 409 with "retired" and "restore"; by reading it now gets 201. That suite is in `run-suites.sh` and not quarantined, so CI should go red. The B83 suite cannot see this; 168/168 is true and does not cover it.
* **Fix:** put the seven lines back under the call at `:181`, unchanged. Run `check_forms_c36_rule_facts.ts` and `check_forms_c36_answer_values.ts` on the final head.

## Closure, checked for myself
| | State | Evidence |
|---|---|---|
| R1 approver told | **Closed**, one false word (Minor 1) | Queue `review-queue.ts:275`, page `review-items.tsx:114`. `what` reaches both the second person and the proposer. Tests: route `check_b83_undo_withdraw.ts:259`, browser `check_b83_own_question_screen_browser.cjs:228`. Note is words, no key; ".." cannot occur (`said` drops the stop) |
| R2 tests run | **Closed: setup cannot skip them** | Both `if (startFacts.length)` are now bare blocks. Setup seeds two facts by SQL and `ok` at `:232` fails unless there are exactly two. `holder.spouse` is valid. `ok` only counts, nothing exits. **168 adds up by hand:** the 159 I counted last time (swap and whom-about included) + R1 1 + R3 1 + R5 2 + M8 1 + M9 1 + the who-fills reader's 3 |
| R3 race | **Closed**, one record (Minor 3) | `applySupplies` re-reads under the withdrawal's lock (`document-supplies.ts:144-146`), not APPROVED writes nothing, `:153-154` refuses a fact with no row. No lock cycle: withdrawal takes field then supplies locks, approval only supplies. Test `:313` fails if `live` goes (`refuseUnusable` and `refuseRetired` pass a key with no rows). The status branch has no test: race only |
| R4 who-fills | **Closed** | `where-used.ts:148-156`. Key is the placement's lineage (`who-fills.ts`, `question-condition.ts`); the set takes the field's key and the lineages asking it. Test: new reader row, route suite |
| R5 undo | **Closed for the case asked**; BR-9 edge (Minor 2) | Ask records `{ edition, undo }` in the same step's audit line (`own-question.ts:178`); undo's own line and `screen02.ts:65` carry no `edition`, so the newest match is the ask. Older asks fall back to a person's change. Test `:327` fails if restoring goes. `needs_sme` counts origin, so the sign-off stays owed |
| M8 check | **Closed on any route that exists** (Minor 4) | `library-changes.ts:235` reads `checks[].condition`, `fact_sources[].fact`: both are real snapshot names (`snapshot.ts:213-214`), so the optional types hide no mismatch. All four `unapprovedOf` sites pass a whole snapshot. Test `:349` |
| M9 lander | **Closed** | `proposals.ts:592`, same function as the route. `field` is not in `READING_DRAFTS`, so a proposal never reads as its own reader and the own-rule re-add still lands (by reading; Minor 5). Test `:371` |
| q4 loading, n10 words, note clip, lock order, M6 no-key test, q8 concept | **Closed** | `library-item-actions.tsx:98`; `where-used.ts:153`, `library-changes.ts:320`, "goes back to a second person" at both doors; `document-supplies.ts:209`; `:194` `orderBy`, `peek` gone; test `:363`; BR-8, BR-11 updated |

## Left open: which, and is it right to leave
None is a Major by my reading. "main: not run": for you to run on main; I ran nothing there.

| Item | Which | Why, and why I think it is on main |
|---|---|---|
| F11 near names | Minor, this PR | The ask form; the limit of C3.6's check. Right to list |
| False "was retired" on a dead merge | Minor, words. **main: not run** | `forms.ts:348`, file unchanged against main. Right outcome, 409, "reject" is the right step |
| n6 own Delete | Minor, route only. **main: not run** | `library-items.ts:248,255`, file unchanged. The outcome is bad (false Submit block), but no screen offers it: the row offers Withdraw. Right to list; it would be Major if a screen reached it |
| n9 approve 409 with a key | Minor, words. **main: not run** | `document-supplies.ts:49`, for any waiting change with a merged fact. Key in words to a second person (STANDARDS §3) |
| n11 preview and audit key | Minor, this PR | `freeKey` causes the mismatch, so it is not old. Words only, hold kept |
| n12 own condition refused | Minor, this PR | The false "unseen" is gone in the new words; BR-11 now records it. Right to list |
| Tests for q1, n8 | Minor, this PR | STANDARDS §7 unmet for two rules, both run by the breaker by hand. Cheap; I would add them, and I do not hold on them |
| `screen02.ts:138` | Minor. **main: not run** for the line | Line unchanged, but **this diff makes it matter**: it now wipes R1's Notice after a failed re-approve. The approver still gets the 409's words. `before.decisionNote` is in scope, so keeping it is one expression. I would fix it now |

**Breaker's follow-ups from the third pass, which the PR list leaves out; add them:**
* **F1, new document type's approved ADD naming a waiting field: not settled, and it could be a Major.** `publishLibraryChanges` (`library-changes.ts:329-347`) publishes the type's draft with no look at what it supplies. Withdraw then answers 201 and a published type names a gone field: M7's result, through the release page. The breaker built it by SQL and tried no route. By reading one looks possible: accept a new type (draft, facts `[]`), propose and approve its facts naming K, approve the ADD, release through `pack/release`. Not run. **The running breaker should try that route before the label: if it holds, it is a Major.** main: not run (I think so because the release path has no such check on main, but this PR's field is what makes the withdraw step reachable).
* F2, approved field supplied only (`snapshot.ts:179-194`, unchanged): stays DRAFT. Withdraw 409, so off the path. **main: not run.**
* F3, raw key in the Release page's why; F4, a merge moves facts, not `supplies_about` (`forms.ts:391`, unchanged). **main: not run.**

## Minors (worth fixing with V1)
1. **"Decided" is false on a change nobody decided.** `review-items.tsx:114`, `review-queue.ts:275`. `dropFactFromChanges` also writes the note on a WAITING change, narrowed before any approval. It then reads "Decide this again: it changed after it was decided" and "Back for a second look". Right outcome, false words. Say "it changed after it was proposed", true in both cases. The browser check's `/Decide this again/` needs the same edit if that part changes.
2. **BR-9: a draft over a released ask is restored as if unreleased.** `own-question.ts:212` tests only `cur.status === "DRAFT"`. Ask released, then a draft over it (merge `forms.ts:377`, options `:264`, list purpose `:280`), then undo: `onlyThisAsk` is false, so the row goes back to the pre-release AI origin and words, where BR-9 and your brief say a person's change. By reading, not run. Minor because it errs toward a sign-off and the words do describe the mapping. Fix: also require `under?.canonicalFieldKey !== key`.
3. **A lost approval says approved.** `document-supplies.ts:146` returns null, then `screen02.ts:145` writes "approved" in History and answers 201 with WAITING. Forced race only; the state is right, the line false. Fix: on approve with `now.status === "WAITING"`, 409 in words and no audit line.
4. **M8's reading is narrower than the hold's.** `library-changes.ts:235` reads `"field"` only; `validate.ts:71` scans the whole condition, because a validity rule names its date in `before`. No API route writes one (`issued_within_months` is not in `api/src`), so no way round today. The fact source half has no test. A field map's `transform` and `condition` (`validate.ts:73`) are in neither: I found only the draft flow writing them, not settled. main: not run.
5. **Tests:** no pass test that an own rule's re-add lands (BR-11's exception); M6's pass stops at the proposal, and M9's new check sits on the landing, so this is the regression to guard. No browser check reads the taken-out words (`data-withdraw-taken-out`).

## [M] lines (met unless named)
EXPERIENCE: §2.5 met, second person now told. §2.8 undo met, Minor 2. §2.10 met. §2.12 to re-run on the final head. §4 states met. §5 words: Minor 1, n9. STANDARDS: §2 governance met, except F1 if it holds. §3 no typed key, second person: n9, n11. §5 no new per-row class. §6 met. **§7 "a rule's test fails when removed": met for R1 to R5, M8, M9; not for q1, n8, Minor 5. The C3.6 suite's test exists and would catch V1, if run.** §10 met.

## Scores and journey (1–5 and out of 10; by reading)
D1 4 V1 · D2 4 V1 · D3 4 F11 · D4 4 Minor 1 · D5 5 · D6 4 V1 retired dead end · D7 4 Minor 2 · D8 4 · D9 5 · D10 4 Minor 1 · D11 5 · D12 4 · D13 4 not re-run · D14 5 · D15 5 · D16 4 B83 suite strong, other suite not run · D17 simulated only · D18 5 · D19 4 · D20 simulated only.
**Journey (provisional, by reading):** task completed 1 · next step obvious 1 · plain words ½ (Minor 1, n9) · feedback and state 1 (R1) · correct data ½ (V1) · error recovery ½ (V1's proposal that can never land) · accessibility and sizes 1 (builder's on an earlier head; to re-run) · speed ½ (not measured) · visual 1 · trust and sources 1 (R5). **8.0.** With V1 fixed, 9.

## Could not check
V1 by running, and any behaviour here by running: read-only (P-348 (5)). No walk, keyboard pass or 200 % zoom of my own at this head; no real screen reader or intended user. Nothing on main run. The new browser lines have not run. Retrofit mapping: none needed (no migration).

## Fix list
V1, then `check_forms_c36_rule_facts.ts`, the route suite and the browser check and packs on the final head. The breaker tries F1's route. Minors 1 to 3 and `screen02.ts:138` are one line each. In the PR: the items above with their "main: not run" marks, plus F1 to F4.

**Verdict: Block** (head 4bcf2ae14b): open Major V1, `api/src/rule-facts.ts:181`; F1 to be settled by the breaker before the label.
