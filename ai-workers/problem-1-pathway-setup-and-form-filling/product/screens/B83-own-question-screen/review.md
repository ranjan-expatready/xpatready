# B83 review: "Ask as its own question" (independent reviewer, 5 Nov 2026, head 0509b0910c, diff since f5a4743d5)

**Verdict: Block.** Skill verdict: Ship after fixes. N3 (a), (c) and (e) are closed, and breaker M6, M7 and n8 are closed. Five Majors remain, all small except R5. R1 to R3 are parts of N3 that did not close. R4 and R5 are items the brief lists as follow-ups, which fail the ruling's test for a follow-up. **Journey score: 8 / 10, provisional: scored by reading, not walked** (table below). No copy started (P-348 (5)), no new journey report, as asked.

**Ran, no database, US$0:** `graph.mjs` without `--write` (G1 0, G2 0, G4 0, G5 0; G3 13, G6 5); a static count of the suite's checks (`/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/555d5da1-189e-4917-97a7-e0d4053a6810/scratchpad/count.py`). G3's entry for this screen, `GET /combinations/:id/own-questions`, is a false alarm: `web/src/components/own-questions.tsx:143` calls it. **Read:** the whole diff, both suites' changes, and the propose, approve, withdraw and release paths around them. **Taken from the builder, not re-run:** route suite 156/156 on this head; browser check 54/54 on d418cbfee. `library-item-actions.tsx`, `review-items.tsx` and a browser check line changed after d418cbfee, so it must run again.

**How I applied the ruling.** Follow-up: on main without this PR and reached only by another route, or off the undo and withdraw paths. Major: on those paths, with wrong data, a wrong or silent outcome, or a named test that does not run. On those paths with only misleading words and the right outcome: Minor, not a follow-up. The ruling has no carve-out for likelihood; if the tech lead wants one for R3 or R4, that is his to rule.

## Major
**R1. The second person is never told why an approved change came back.** `web/src/pages/review-items.tsx:113`, `api/src/review-queue.ts:277`. By reading; N3 (b) and challenge 1.
* `dropFactFromChanges` writes its note (`api/src/document-supplies.ts:202`), but the change page shows `decision_note` only for RETURNED, and the queue row adds it only for RETURNED (`review-queue.ts:276`). The supplies panel shows no note while WAITING (`supplies-panel.tsx:80`).
* **What the approver sees:** "Needs you", the true before and after, the proposer's old reason. Nothing says it was approved, what came out or why. A swap reads "No fact · removes r", with a reason arguing for the field that is gone, so they can approve a removal on words about something else.
* Author A, whose change another author's withdrawal edited, sees nothing either. The next decision overwrites the note (`library-changes.ts`, `decideChange`), so no person ever reads it on the change; only History has the words.
* **Fix:** a Notice on the change page when WAITING with a note, and the note on the queue row as `:276` does. Fail test: the swap's `what` and the page carry the field's name.

**R2. Two of N3's named fail tests never run, and one could not pass.** `tests/check_b83_undo_withdraw.ts:246,279,282`. By counting, not run; N3 (g), (d). STANDARDS §7.
* Both sit under `if (startFacts.length)`. The document is `sp.outside`'s first, and every type of the six has no facts (`api/src/checklist.ts:151`, `document-supplies.ts:2`), so `startFacts` is empty.
* **The count settles it:** the same count gives 145 at f5a4743d5, the builder's figure. At this head it gives 159 with those three checks and **156 without them**, the figure reported. To confirm in a second: grep the suite's output for "N3 fail test (swap)".
* **`:282` cannot pass if it runs:** `"spouse"` is not an allowed value (`contracts/resolver.ts:151`: `holder.spouse`), so the proposal answers 400.
* So putting `sameFacts` back in `nothingLeft` (N3 (d)) leaves the suite green. The behaviour held when the breaker ran it by hand (S6, S7, S8, on b837987e2); the evidence in the suite is what is missing.
* **Fix:** give the document facts in setup by SQL, as the suite does elsewhere; replace both `if`s with a setup check that fails on none; use `holder.spouse`.

**R3. Approval racing the withdrawal still leaves the draft naming a gone field (breaker n7, the other half of N3 (f)).** `api/src/document-supplies.ts:140-149`, reached from `api/src/screen02.ts` `decideLibraryChange`. Breaker ran it, forced; I read it.
* N3 (f) said: "an approval landing in between leaves its draft holding F". The withdrawal now re-reads under the lock, but `applySupplies` takes no lock and writes the `c` it read earlier. In that window: change WAITING with `after` [a], draft [a, F], F gone, approve answered 201 with WAITING.
* Every combination listing the document is then held for a field it does not read, the M2 symptom. Re-approve answers 409; the proposer's withdraw leaves the draft (`library-changes.ts:275`). Only a new proposal clears it, and the panel shows a raw key (`document-supplies.ts:65`).
* **Which:** Major. `dropFactFromChanges` is this row's and on the withdraw path, so it is not a follow-up. Not silent, rare, and small to fix.
* **Fix:** in `applySupplies`, a transaction, the same advisory lock, re-read `c`; not APPROVED or a different `after`: write nothing. Add a check that every fact still has a row: a propose racing the withdrawal lands in the same state (`:95` reads outside the lock).

**R4. A waiting change keyed on the field is missing from the one list (q2).** `api/src/where-used.ts:147,151-152`, with `who-fills.ts:41`, `question-condition.ts:44`. By reading; not run.
* `placement_fills` is not in `open`, and `placement_condition` is matched only on what its condition reads, not on its own key. With a who-fills or when-asked change open on a placed waiting field, Undo withdraws it, `readers` is empty, and BR-9's "waiting changes" is not met.
* **Result:** a dead row stays in the second person's queue, with no word to anyone (approve answers 409 "Return the change"). After a re-ask under the same name, `freeKey` gives the same key, and approving applies it to the new meaning.
* **Which:** Major. It is reached by Undo and the withdraw, not by another route. The state needs a placed waiting field, so it is narrow.
* **Fix:** in that loop, a `c.key === key` match for both kinds, as a `waiting_change` reader; one row more in `READERS`.

**R5. Undo records an AI proposal as a person's decision, and it can drop a sign-off (breaker m6).** `api/src/own-question.ts:208` (with `:174`, `:54`), `engine/validate.ts:294-296`. Breaker ran the record; the effect is by reading.
* On an unreleased AI row, the ask overwrites origin, confidence and quote in place. Undo puts the key back and writes `origin: "HUMAN"`; the others are not restored. Not reached when the draft sits over a released row, because that draft is deleted.
* **The earlier review did not weigh this:** `validate.ts:296` sets `needs_sme: x.ai > 0` for a form's field map, counting `origin === "AI_PROPOSAL"`. So ask then Undo takes one row out of "(N AI-proposed)". If it was the form's only changed AI row, that form's field map line no longer needs a sign-off (`api/src/studio.ts:92`). The row now holds exactly what the AI proposed.
* **Which:** Major. Undo is this row's route, not on main, and BR-9 says it takes the ask back. The reason line does name the person, so the record is not wholly false.
* **Fix (needs a choice):** no migration: the ask's audit line keeps the old origin, confidence and quote in its detail, and Undo restores from the newest one. Or the tech lead rules in BR-9 that an Undo is a person's act, and the row stays counted as AI some other way. Listing it in the PR alone does not settle the sign-off.

## Your four challenges
1. **Approved back to WAITING with the draft restored: it fits, but the approver is not told (R1).** The mechanics are right. `screen02.ts:138` already puts an approved change back this way; `decidedBy` and `decidedAt` are cleared; `decideChange` still refuses the proposer and the applier; `applySupplies` passes "changed since" against the restored draft, and with a merge since it refuses with words. The set shown is the set that goes out, removals named. If the withdrawing author also holds review they may approve another author's narrowed change: acceptable, since they only removed from it.
2. **`unapprovedOf` at four call sites: nothing changes with no waiting field.** `out` is `unapprovedAdds`' answer, and `waitingSupplied` returns `[]` with no supplied key outside the snapshot's fields or no waiting row. Cost: at most one read per call, at sites already reading per row. A combination listing a type that supplies a waiting field is now held even if it reads nothing of it, which is M7's point; the words "it uses" are close enough.
3. **M6: accepted, with one Minor.** The words carry no key, name the readers and say why. Letting the rule's own re-add through is right: C3.6 exists for it, and the second person reads "Needed by" that rule. A second rule on the same combination is refused (`r.ref` must match). The gap: form, document line and question conditions carry no `ref` (`where-used.ts:140-142`), so a condition's own re-add is refused naming itself. Safe side; see Minors.
4. **Left open, each:**

| Item | Which | Why |
|---|---|---|
| m6 | **Major (R5)** | Undo path; this row's route; a wrong record with a sign-off effect |
| q2 who-fills | **Major (R4)** | Reached by Undo and withdraw |
| n7 | **Major (R3)** | Withdraw path; this row's function; rest of N3 (f) |
| F11 near names | Follow-up | The ask form, off the paths; the limit of C3.6's check |
| False "was retired", dead merge | Follow-up | Merge approval's words, `api/src/forms.ts:348`, on main. The merge is named before the press; 409 is right, and "reject" is the right step |
| n6 own Delete | Follow-up | `library-items.ts:248,255`, not in this diff, route only: the row offers Withdraw |
| n9 approve 409 with a key | Follow-up | `document-supplies.ts:49`, on main for any waiting change with a merged fact; a narrowing is not needed to reach it |
| n11 preview and audit key | Follow-up | `rule-facts.ts:250`. Caused by this row's `freeKey`, but off the paths, words only, hold kept |
| New: approved field, supplied only | Follow-up | Read, not run. `snapshot.ts:179-194` and `itemsOf` leave out a supplied fact; `waitingSupplied` covers WAITING and RETURNED. A release can publish a type naming an APPROVED field whose rows stay draft. On main, another route |

## Closure, checked for myself
| | State | Evidence |
|---|---|---|
| N3 (a) set nobody approved | **Closed** | `document-supplies.ts:191,197,202`; mixed test `:266` is live. Swap only by the breaker (R2) |
| N3 (b) another's change | **Partly: R1** | Audit names the proposer, test `:296`; no person sees it |
| N3 (c) Fields door | **Closed** | `library-item-actions.tsx:45,71,98`. No browser check reads the taken-out words (Minor) |
| N3 (d) whom-about | **Code closed; test dead: R2** | `same` at `:191`, draft `about` back at `:197` |
| N3 (e) record | **Closed**, one clip (Minor) | Approver's note kept, actor and field named; audit names field and proposer, test `:243` |
| N3 (f) stale read | **Withdrawal's side closed; R3** | Re-read under the lock `:187` |
| N3 (g) tests | **Partly: R2** | Live: ended, mixed, waiting, another proposer. Dead: swap, whom-about |
| q1 | Closed | `proposals.ts:595`. Breaker ran it (SQL state); no suite test (Minor) |
| q4 | **Half** | Failure state yes (`library-item-actions.tsx:98`). Loading no: the button is live, To review's is disabled (Minor) |
| q3, q5, q6, q7, q9 | Closed | Words at every "stays waiting", chip label `to-review.tsx:18`; words `own-question.ts:150,159`; regex and tests `:44-46`; `where-used.ts:151`. q9 has no test |
| q8 | **Partly** | BR-11 now records `freeKey` and the taken-out step; see Minors |
| Breaker M6 | **Closed** | `rule-facts.ts:183-186`, fail and pass `:323,326`, live |
| Breaker M7 | **Closed** | `library-changes.ts:233-244`, all four call sites, fail test `:310`, live. S15's state cannot now be made by a release |
| Breaker n8 | Closed by reading | `throughMerges` at `:196`, as `:165`. No test (needs three things at once) |
| Breaker n10 | **Partly** | Toast and `said`'s double stop closed. "The change on To review" for an approved change is still at `where-used.ts:151`, and To review lists only WAITING and RETURNED (`review-queue.ts:96`) |

## Minors (worth fixing with the above)
* **q4 loading:** `library-item-actions.tsx:97`: hold the send while `asking.isLoading`, as To review does. One expression.
* **n10 rest:** `where-used.ts:151`: words for an approved change that are true, and say before the press that it goes back to a second person (`review-items.tsx:224`, `library-item-actions.tsx:98`). `library-changes.ts:312` still gives ".." when a reason ends in a full stop.
* **The note can lose the field:** `document-supplies.ts:201-202`: `${earlier}${said}` clipped at 300; a long approver's note drops the field's name and the reason. Clip `earlier`, not `said`. A failed re-approve also clears it (`screen02.ts:138` writes `decisionNote: null`), so R1's Notice would vanish after "Changed since": keep it.
* **Lock order:** `document-supplies.ts:183`: no `orderBy`, and every open change is now locked, not only those naming the fact. Two withdrawals seeing different orders could deadlock (breaker: 5 rounds, no 5xx). Add `orderBy: { id: "asc" }`, `select` the key, drop the `peek` read.
* **M6:** a condition's own re-add is refused naming itself (challenge 3): give those readers a `ref`, or say so in BR-11. The fail test has no `noKey`. The check is at the proposal only, not at accept (`proposals.ts:587`); a reader arriving in between needs a rule on a key the library does not hold.
* **q8 concept (STANDARDS §10):** BR-11's "never takes a withdrawn field's key while something still reads it" is false for M6's own-rule re-add. M7's hold is not in BR-8 or §2. **Tests:** q1 and n8 have none; no browser check reads the taken-out words: add them with R1's.

## [M] lines (met unless named)
EXPERIENCE: §2.5 next action met for authors; **not met for the second person on a change sent back (R1).** §2.8 undo: **not fully (R5).** §2.10 met. §2.12 builder's at d418cbfee; to re-run. §4 states: q4 loading. §5 words: n10. STANDARDS: §2 governance: set approved is the set released, met; second person's information **not met (R1)**. §3 no typed key, second person met. §5 no new per-row class; `peek` adds one read per open change. §6 authorisation and contract met. §7 "a rule's test fails when removed": **not met for N3 (d) and the swap (R2)**. §10 q8.

## Scores and journey (1–5 and out of 10; by reading)
D1 4 M6, M7 closed; R4 · D2 4 N3's set fixed; R3 · D3 4 F11 · D4 3 R1, R5 · D5 5 · D6 3 R1 note unseen, R5 · D7 3 AI mark lost on Undo (R5) · D8 4 · D9 5 · D10 4 n10 · D11 4 q4 · D12 4 · D13 4 not re-run · D14 5 · D15 5 · D16 3 strong suite; R2 · D17 simulated only · D18 5 · D19 4 · D20 simulated only.
**Journey (provisional, by reading):** task completed 1 · next step obvious 1 · plain words 1 · feedback and state ½ (R1) · correct data ½ (R3, R5) · error recovery 1 · accessibility and sizes 1 (builder's, d418cbfee) · speed ½ (not measured) · visual 1 (`walk/7`) · trust and sources ½ (R5). **8.0.** With R1 and R5 fixed, 9.

## Could not check
R2 by running: the count is strong and one grep of the suite's output settles it. R1, R4, R5's sign-off effect and R3's fix by running: read-only here. No walk, keyboard pass or 200 % zoom of my own at this head; no real screen reader or intended user. Retrofit mapping: none needed (no migration).

## Fix list
R1, R2, R3, R4 with their tests; R5 by the fix or the tech lead's ruling. The Minors above are cheap, in the same files. Then a clean route suite, confirming the swap and whom-about checks ran (159 or more), and the browser check and packs on the final head. In the PR: F11, the dead merge's words, n6, n9, n11, the approved supplied field.

**Verdict: Block** (head 0509b0910c): open Majors R1, R2, R3, R4, R5.
