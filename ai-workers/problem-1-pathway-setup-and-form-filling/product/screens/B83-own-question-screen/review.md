# B83 review: "Ask as its own question" (independent reviewer, 5 Nov 2026, head f5a4743d5, diff since 689804c9c)

**Verdict: Block.** Skill verdict: Ship after fixes. N1 and N2 are closed, and so are breaker M1 and M2 on the states they named. One new Major, N3, comes from the M2 fix: a field's withdrawal edits a change a second person already approved, and that change stays approved. Everything else is Minor.

**Journey score: 8 / 10, provisional: scored by reading, not walked** (table below). It reaches the pass mark, but N3 still blocks. No copy started (P-348 (5)); no new journey report, as asked. The last walk is `journey-test-reviewer-2026-11-05.md` at 0aff0e0b4.

**Ran, no database, US$0:** the engine functions on N1's state and on how a key is swapped for a name (`/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/555d5da1-189e-4917-97a7-e0d4053a6810/scratchpad/n1-recheck.mts`); `graph.mjs` without `--write` (G1 0, G2 0, G4 0, G5 0; G3 12, G6 5, totals only). **Read:** the whole diff, both suites' changes, the withdraw, approve and release paths around it. **Taken from the builder, not re-run:** route suite 145/145 on this head; browser check 54/54 and C4.11 23/24 on d418cbfee. `library-item-actions.tsx` and `review-items.tsx` changed after d418cbfee, so the browser check must run again before the label.

## Major

**N3. A withdrawal rewrites what a second person approved, and it stays approved.** `api/src/document-supplies.ts:177-193`, called at `api/src/library-changes.ts:272`. By reading; not run. STANDARDS §2 (governance), §3.10, §7.
* **The rule it meets:** the second person approves the whole set (`document-supplies.ts:5-8`). Only the proposer withdraws a change, "whatever its kind" (DV-bb-9, `library-changes.ts:241-242`). The approver's decision stays on the change (R2-M3, `document-supplies.ts:168`).
* **(a) A set nobody approved goes out.** A swap: before `[r]`, after `[F]`, approved. Withdraw F: `after` is `[]`, which differs from `before`, so `nothingLeft` is false (`:184`). The change stays APPROVED, the draft now supplies nothing (`:188`), and the next release removes `r` for every combination that lists the document. The second person approved a replacement, not a removal. A mixed add, `[a, G, F]` to `[a, G]`, has the same flaw with less harm. Mixed sets are the normal shape here: the panel proposes the whole set.
* **(b) It can be someone else's change.** The check at `:241` looks only at the field's change. So author C's withdrawal edits or ends the approved change of author A. Nobody tells A or the approver. The breaker saw a direct withdraw of that change answer 403.
* **(c) One door says nothing.** The Fields row reads only `readers` (`web/src/pages/library-item-actions.tsx:70`) and ignores `taken_out` and `taken_out_of` (`:45`). To review says it (`review-items.tsx:224`), and its toast does too.
* **(d) `nothingLeft` ignores whom a fact is about.** `:184` uses `sameFacts`; `same` (`:30`) compares both. Approved `[a]` to `[a, F]` that also changes who `a` is about: the change ends WITHDRAWN, while the draft keeps the approved `about` (`:188`) and releases it under no open change. On a WAITING change that edit is lost with no word.
* **(e) The record goes.** `matches.after` is overwritten, an ended change's `decisionNote` replaces the approver's (`:190`, against R2-M3), the note names no actor, and the audit line names neither the field nor the proposer (`:191`).
* **(f) A stale read.** `c` is read at `:179`, before the lock at `:182`, with no re-read (compare `:159`) and an unguarded update at `:190`. An approval landing in between leaves its draft holding F, or a WITHDRAWN status over it. Submit still holds by name, so this one is not silent.
* **(g) No test on most of it.** The M2 test has one added fact, so it only reaches the ended path (`tests/check_b83_undo_withdraw.ts:224-227`). The "something left" branch has no test. The WAITING path has none either: the reader at `:163` is removed before the withdraw.
* **Fix:** re-read under the lock. Nothing left (by `same`, facts and whom-about): end it, draft back to `before` and `beforeAbout`, approver's note kept as `withdrawApprovedSupplies` does. Something left on WAITING or RETURNED: narrow it, nothing was applied. **Something left on APPROVED: draft back to `before`, narrow it, status WAITING, `decidedBy` and `decidedAt` null, a note saying why,** so the second person decides the set that will really go out (`api/src/screen02.ts:138` already puts an approved change back this way, and `applySupplies` then passes its "changed since" check). Name the field and the proposer in the audit line. Show taken-out words at the Fields door, before and after. Fail tests: mixed approved set, swap, another proposer, whom-about, WAITING.

## Your five challenges
1. **`dropFactFromChanges` on an approved change: not as written.** Ending a change whose only content was the field is fine: same end state as the proposer's own withdraw, and the fact cannot exist. Narrowing what stays approved is not (N3). Narrowing a WAITING or RETURNED change is fine.
2. **`freeKey` reusing a key nothing reads: accepted.** The field never released and its rows are gone, so nothing can carry the old meaning. A fresh copy has no withdrawn rows, so `keyFor`'s answer and `vv.single-ae2133b8a398` do not move. Pass and fail at `check_b83_undo_withdraw.ts:201-202,209`. The rule-fact route keeping a rule's key (`proposals.ts:599`) is also fine: the second person sees "Needed by" that rule. Its safety is only as good as the reader list: see q1, q2.
3. **"Open or withdraw" under Waiting: accepted.** `state` stays `waiting`, counts run on state (`api/src/review-queue.ts:71`), and `waiting_on` still says a different person acts next. "Needs you" does not grow. The step is optional, and it is the proposer's own. See q3 for the path to it.
4. **The row's link: accepted.** F12 removed a dead link to `/review`; this one goes to the page holding Withdraw, and the state is in the concept. The browser check reads its href (`:103`) and clicks only the queue's step (`:173`), which is enough.
5. **m6, F11, the false "was retired" on a dead merge: accepted as Minors, list all three in the PR.** Dead merge: named before the press, 409 on approval, so not silent. Its words are one small edit (`api/src/forms.ts:348`: no row means withdrawn, not retired), and the published field stays locked until someone rejects it.

## Closure, checked for myself
| | State | Evidence |
|---|---|---|
| Review N1 | **Closed** | Ran: gate gives a named line, and the validator's line goes only when covered; with no named line it stays, key swapped. Fail test `:161`, Undo and Submit. `where-used.ts:125`, `validate.ts:72,85-88`. No unit test for the no-named-line case (q7) |
| Review N2 | **Closed** | Queue step `review-queue.ts:277`, tests `:322` and browser `:173`; row link `own-questions.tsx:77`; Fields door names before and after, browser `:167`, `library-item-actions.tsx:45,97`; concept amended. Its check reaches the queue by `?f=waiting`, not the chip (q3) |
| Review n1 to n3 | Closed | `own-questions.tsx:79` clears the toast; `:57` closes the form; `review-items.tsx:387` keeps loaded data and adds Try again |
| Review n4 | Closed on the change's page, open on the Fields door | `review-items.tsx:221-222` load and fail states, Withdraw disabled while loading. Fields door has neither (q4). After-words still a short toast: accepted, History has them |
| Review n5 | Closed, with q5 | `TYPE_WORDS`; `sameName` uses `factName` |
| Review n6 | Closed, with q6 | Ran: `_2` is left alone, a quoted key gets one pair of quotes |
| Review n7, n8 | Closed | `validate.ts:71,77` and `where-used.ts:144,146` read a validity rule's date and a reference date; `roleOf` at `:66` |
| Review n9 | Closed | `FieldReadersView`, `FieldWithdrawn` in `contracts/`; unknown id 404, test `:324`. Plain types, like the rest of that file |
| Review n10 | Closed | `once` in the race rounds, `server === 0`; BR-10 retired fact `:313`; Submit for a worked-out value, derived branch now fails if removed |
| Breaker M1 | **Closed,** but q1 | `freeKey` at `own-question.ts:166`, `sources.ts:820`, `proposals.ts:599` |
| Breaker M2 | **Closed for its state,** replaced by N3 | `sp.outside` no longer held, `:226` |
| Breaker n1, n2 | Closed | Merge and document type draft in `fieldReaders`, tests `:164` and the draft list |
| Breaker n3 | Closed | Words say "whichever of these is in a combination's draft" at both doors |
| Breaker n4 | Partly, accepted | Clipped to three and a count; toast still brief; before-press list is whole |
| Breaker n5 | Closed | `autoFocus` on the reason, `review-items.tsx:226` |
| F12 | Superseded | Challenge 4 |
| F11, m6 | Open, for the PR | Challenge 5 |

## Minors (fix or list in the PR)
* **q1 One more door to M1's hole.** `api/src/proposals.ts:595`: a drafted field keeps the AI's proposed key when `!used.has(proposed)`, and `used` holds only live rows. A draft proposing a withdrawn key that is still read takes over its readers, as M1 did. Fix: route it through the same check. Worth fixing: one line.
* **q2 A reader missing from the one list.** An open "who fills" change is keyed on the field (`api/src/who-fills.ts:41`) and is not in `fieldReaders`, so Undo withdraws and `freeKey` reuses under it. Needs a placed waiting field; narrow. Answer keys holding the field: not checked by anyone yet.
* **q3 The way to the step after an Undo that keeps the field.** The row goes back to worked out, so `asked_as` and its link are gone. The words say "stays waiting on To review" (`own-question.ts:218`). To review opens on Needs you, which can say nothing waits. Fix: "under Waiting for others" in those words, cheap. Then the check can press the chip rather than `?f=waiting` (`check_b83_own_question_screen_browser.cjs`, the line before `:173`).
* **q4 Fields door states.** `library-item-actions.tsx:70` takes `.data` only: while loading or after a failed GET no readers show and the button works. BR-11 says both doors name them.
* **q5 False type words.** `own-question.ts:151,160`: the fallback "a text question" is wrong for `code`, `country`, `address`, `phone` (`engine/snapshot.ts:34`). Say "not a Yes/No question".
* **q6 A key at a sentence's end survives the swap.** `validate.ts:81`: `(?![\w.])` rejects a final full stop. **Ran:** `This reads person.has_used_other_name.` keeps its key. The old `split` caught it. I found no producer on today's release lines, so no leak today. Fix: `(?!\w|\.\w)`.
* **q7 The class test review N1 asked for.** No unit test that a "not in the library" line with no named line is never lost. It held when I ran it; the next reader type relies on it.
* **q8 Concept.** BR-9 and BR-11 do not record `freeKey`'s rule or the taken-out step, and §6 does not list them. Amend with N3's fix (STANDARDS §10: consequential choices are recorded).
* **q9 A reader hidden but not put right.** `where-used.ts:155` calls a document type draft "put right" for any open change naming the field, but `dropFactFromChanges` edits the draft only for APPROVED. A draft holding F under a WAITING change is left unnamed before the press; Submit still names it. Fix: only for APPROVED.

## [M] lines (met unless named)
EXPERIENCE: §2.5 next action met (N2 closed), q3. §2.8 undo met. §2.10 met, q5. §2.12 by the builder's checks at d418cbfee; not re-run. §4 states met on To review, q4 on the Fields door. §5 words met, q6. STANDARDS: §2 governance **not met (N3)**. §3 second person, no typed key: no typed key met; second person not met on N3's path. §5 no per-row request met for screens; `fieldReaders` does one lookup per proposed merge, few by nature. §6 server authorisation met, contract met. §7 "a rule's test fails when removed": M1, N1, N2 yes by reading; **N3's branch has none.** §10 q8.

## Scores (1–5; by reading)
D1 4 N1, N2 closed; N3 · D2 3 approved change edited · D3 4 F11 · D4 3 N3 · D5 5 n1, n3 closed · D6 3 N3 (e) · D7 n/a, no AI · D8 4 q3 · D9 5 · D10 4 q5 · D11 4 q4 · D12 4 · D13 4 not re-run · D14 5 · D15 5 · D16 3 strong suites; N3 (g), q7 · D17 simulated only · D18 5 · D19 4 · D20 simulated only.

## Journey score (provisional, by reading)
Task completed 1 · next step obvious 1 (row link, queue step) · plain words 1 · feedback and state ½ (the Fields door's silence on taken-out, short toast) · correct data ½ (N3) · error recovery 1 · accessibility and sizes 1 (builder's, d418cbfee) · speed ½ (not measured) · visual 1 (`walk/7`) · trust and sources ½ (m6). **8.0.** N3 fixed makes it 8.5 to 9.

## Could not check
N3 by running: read only, as no copy is allowed here. If you doubt (a) or (d), they need one route script on your copy: a swap approved, then withdraw and read the draft. No walk, keyboard pass or 200 % zoom of my own at this head; no real screen reader or intended user. Retrofit mapping: none needed (no migration).

## Fix list
N3, with its fail tests, then a clean route suite and browser check on the new head. q1, q3, q6 are cheap and worth doing. The other q items, m6, F11 and the dead merge's words: fix or list in the PR.

**Verdict: Block** (head f5a4743d5): open Major N3.
