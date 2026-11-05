# B86 — a form field can hold a question's condition: independent review (CHECK)

Reviewer agent, 5 Nov. Branch `claude/b86-conditions-box`, commit d46ae4e5f. One copy on port 4448, restarted fresh per suite, stopped after (database dropped). US$0, live AI off, nothing priced clicked. Replaces the review of d68a8b79a, which was code only.

## Verdict: **Ship after fixes**. Journey score **8.5 / 10** (pass, no 0)
The product is sound on the running app: every earlier Blocker and Major on the screen is fixed. Two things stop it, both small and neither in the product's behaviour: CI on this commit is red because of this row's own helper file, and `C4.11-26` has no WAIT line, against the tech lead's ruling. See `journey-test-reviewer-2026-11-05.md`.

## Earlier Blockers and Majors, each on the running app
| Earlier | Result | Evidence |
|---|---|---|
| Review M1: Undo on no screen | **Fixed** | "Form fields holding a question's condition" on Review and release (`web/src/components/form-field-conditions.tsx`, `FormFieldsHeld`). Walked by keyboard: open it, Undo, Waiting |
| Review M2: returned change opens a useless form | **Fixed** | Returned page: notice "withdraw it, then confirm the form field again", "Withdraw it instead…", no Name or Meaning. Queue says "Withdraw it". Withdrawn, then confirmed again: works |
| Review M3: C4.11 steps off qa's wording | **Part fixed: M1 below** | 24 and 25 read the draft's problems, name the exact question, use routes only, check the condition stays in force; lines 1–23 and G5 untouched; 26/26. B88's comment (a `^` that made 24 always fail) does not apply here: 24 reads `draft.problems`, whose message starts with the rule's words, and passes with the rule's sentence. `C4.11-26` is on no line |
| Review M4: Done when 7 could not fail | **Fixed** | Door test reads the plan's own `guide.questions` and compares exactly. It printed `prototype/p2/question-lists/vv.single-ae2133b8a398.questions.json`. No new list file in `git status` after any run |
| Breaker B1, B1a: Undo refused | **Fixed** | Approved, Undo: 201, Waiting; the earlier change WITHDRAWN "Replaced by a later change"; the rule stays until the Undo is approved. Door test 44/44 (was 29/40) |
| Breaker B1b: way back after Undo | **Fixed before a release** | Undo approved, Hiding comes back with the button, confirm, approve, Hiding gone. After a release: not walked (needs B82) |
| Breaker B1c: two cards, stuck | **Fixed** | Military service, walked: card 1 confirmed and approved, card 2 accepted and approved, row "Holds a different condition" with Undo under the problem; Undo, approve, confirm, approve: Hiding gone |
| Breaker B2: Review white page | **Fixed** | Hook above the early return (`web/src/pages/review.tsx:46`). Page opened many times as author, 0 page errors |
| Breaker M1: approver written as author (BR-14) | **Fixed for these two doors** | After approval: `form_field_map` and `section_question` drafts `updated_by` the proposer; Approver's draft rows 0 in those two and `canonical_field`. Release by the Approver on the six not walked (B82). PR names `document-supplies.ts:149`, `who-fills.ts:94` as the same cause, not changed here |

## The four questions asked
* **Guard weakened (P-303)? No.** `engine/validate.ts` changes `boxCond` only, plus the moved `bareCond`; comparison, SHOW-only and message as on main. No existing test edited. `check_grounding_db` 34/34.
* **Anybody stuck? No, on what I walked:** return, withdraw, confirm again, Undo, Undo returned and withdrawn (row back to Confirmed with Undo), different condition. The dead end on other combinations is B88.
* **Wrong value on a form? None found.** `check_forms_b86_fill` 34/34, `check_c72_imm5257_fill` 54/54. Rule removal on a scratch copy, each fails its own line: rule reads the words (4), BR-5b off (1), own-fact guard off (1, closes earlier m2), BR-1b off (4), first-placement rule (1, closes earlier m3). Not on a real case of the six (B82, by ruling).
* **List moved? No.** `vv.single-ae2133b8a398`, exact.

## Builder's numbers, re-run here on d46ae4e5f
Door 44/44 · browser 37/37 · C4.11 26/26, exit 0 · fill 34/34: **all confirmed**. Also grounding 34/34, c72 54/54 (three earlier tries stopped in its setup, two of them showing `psql … Interrupted system call` from the Mac's database connection and one with its output hidden; a fourth setup and c72 were clean, so I read it as the Mac, not this code). `graph.mjs --check`: G1 0, G2 0; G3 names `GET …/form-fields` (false reading, the path is built with `encodeURIComponent`); `count-any` 418 = base. CI `types`, `kind`, shards 3 and 4 pass.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1 to BR-10 behave as written on what was walked; C4.11-26 line missing (M1) |
| D2 Data integrity | 5 | One row per change, rule copied by the server, words untouched, `.strict()` body refuses a typed rule (400), additive column, applied on every fresh copy |
| D3 Reuse | 4 | `revise`, `library_change`, approve, withdraw. Two `isWorkedOutYesNo` remain (m5) |
| D4 Rule integrity | 5 | Rule untouched; rule removals fail; refused at approval if the condition changed |
| D5 Stability | 4 | Two tabs: 409 in words, one change. Row stays stale until reload (m2). Each suite ran once here |
| D6 Governance | 5 | Audit lines at proposal and approval; 401, 403 for Approver, Reviewer, Case officer, by route; change summary names the rule with `needs_sme` |
| D7 AI trust | 4 | The form field's own words beside the decision; Sample, Unconfirmed: expert on panel and second person's page |
| D8 Orientation | 4 | Trail on the change page; the panel does not name its question on Review (m1) |
| D9 Flow | 4 | One click where the person is; panel sits after the whole list, not under its problem (m1) |
| D10 Language | 4 | No field code in anything walked. Two wrong sentences (m3) |
| D11 Feedback | 4 | Pills with focusable tips, toast, busy. Review's request failing draws nothing (m4) |
| D12 Visual | 4 | Team components; "Show all 26" reads as part of the panel above it (m1) |
| D13 Accessibility | 5 | axe clean: card, waiting, second person, Review, held, returned. 1024 px, 200 % as 512 px, 400 px: no sideways scroll. Keyboard: 6 stops to the button, Undo by Enter |
| D14 Team look | 5 | `Button`, `Pill`, `Notice`, tokens; demo chrome apart |
| D15 Speed | 5 | Sample data: panel 230 ms, action to Waiting 307 ms, one request 112 ms, Review to the way out 858–902 ms |
| D16 Testability | 3 | Strong tests, but a helper turns CI red (B1), no WAIT line (M1), `question-condition.ts:67` has no test line (m6) |
| D17 First use | simulated only | My walk, not an intended user's |
| D18 Provenance | 4 | Words, warning when they name another question; a closed change's note can read false (m7) |
| D19 Closure | out of scope | Person's walk and Done when 5 wait for B83 and B82 (ruling 1) |
| D20 Pain solved | simulated only | Not walked by an intended user |

## Issues (Must = Blocker or Major; Should = Minor)
**Must · Blocker B1: CI is red on this commit, from this row's own helper.** `tests/check_forms_b86_setup.ts:1-2` says "Not a suite of its own (no usage line)", but the runner takes every `tests/check_*` (`product/tools/run-suites.sh:136,175`) and runs one with no usage line plain (`:207`). Run 41980744773, shard 1: `check_forms_b86_setup.ts | FAIL | exit 1: connect ECONNREFUSED 127.0.0.1:4440`. The `ci` job fails; shards 2, 5, 6 were cancelled without a result. It fails every time, so nothing merges, and on main it would fail any run that selects it. **Fix:** rename it outside `check_*` (for example `tests/setup_forms_b86.ts`) and change its one caller, `tests/check_forms_b86_panel_browser.cjs:18`. Then a full CI run on the head, which also covers the three cancelled shards.

**Must · Major M1: `C4.11-26` is on no line, so the pack reads complete.** Tech lead on #1053 (05:47 UTC): it "stays a WAIT line naming B82 … A WAIT line is never green (P-334 (6)) … C4.11 cannot be called Works before it runs." `acceptance/C4.11.test.ts:160` goes from step 25 to `T.done()`. I ran it: 26/26, exit 0, no line names 26; gate B reads "exit 0, 26/26". The PR body says "not written yet", but the pack is what qa and gate B read. **Fix:** before `T.done()`, `T.wait("C4.11-26 pass (the fill, BR-5): …", "B82: a release on the six")`. `done()` then exits 2 (`acceptance/lib/pack2.ts`); if gate B or CI treats that as a failure, qa rules. Changes no other line.

**Should · m1: on Review, the panel is not tied to its problem.** Concept §4: "under a problem". It sits after all 8 lines (`web/src/pages/review.tsx:95`), "Show all" after it (`:96`), and the visible panel never names its question, only its `aria-label` (`form-field-conditions.tsx:32`). Two "Document number" rows read alike in the held list. Show `q.question` as the panel's first line and move "Show all" above it.

**Should · m2: two tabs.** The second tab's click gets 409 in words, but the row keeps its button until reload (`useAction` invalidates on success only). Invalidate on this mutation's error too.

**Should · m3: two wrong sentences.** Second person's page for an Undo says "Approving says these say the same" (`web/src/pages/review-items.tsx:87`). A box confirmed from a waiting card reads "Holds a different condition" and "This question has no condition yet" on Review (`api/src/form-field-condition.ts:118`); nothing differs, the condition has not landed.

**Should · m4: Review draws no loading or error state for the panel request** (`review.tsx:68`, `?? []`). If it fails, the way out disappears in silence (EXPERIENCE §4). Use the `ErrorState` the card has.

**Should · m5: still open from the last review.** Contract first: `contracts/form-field-conditions.ts` is types only, the zod body lives in the API file. Two `isWorkedOutYesNo` (`engine/form-field-condition.ts:37`, `api/src/own-question.ts:35`): settle for B88.

**Should · m6: BR-14's fix in `api/src/question-condition.ts:67` has no failing test.** The door test checks only the form field (`tests/check_forms_b86_door.ts:121`). True on my copy. Add one `updated_by` line.

**Should · m7: a closed change's note can read false.** Undo proposed, approved change closed "Replaced by a later change" (`form-field-condition.ts:186`), Undo then withdrawn: the rule stays in the draft and goes out, but its change reads Withdrawn and is never marked RELEASED (BR-7). The combination's change summary still names it (BR-8), so nothing is hidden from the expert.

**Closed since last review:** m1 codes (`PCRIndicator`, dotted, paths), m2, m3, m4 (one request now), m5 (no button without the author duty; pills have tips). Breaker's m1 (`?item=a&item=b` now 404 in words), m8 (Undo's line names what it holds), both seen; m3 (409 at approval) and m7 (Withdraw on a waiting change) by code only.

## Concept, standards, graph
Concept fit: §2–§6 present; §4's "under a problem" partly (m1). [M] lines: met: authorisation on the server, Problem Details, one request per view, axe on each state, keyboard, 1024 px and 200 %, tooltips on statuses, budgets on the sample, a rule's test fails when removed (except m6). Not met: contract first (m5), states every screen draws (m4). Retrofit mapping: still no line in the concept and no `build-notes.md`. Graph: every element serves C4.11; no page or route lacks a test once G3's false reading is set aside. Migration: one additive nullable column, read by the tech lead, applied on every fresh copy here. No scaffolding on the product's path.

## Could not check
A real case or a release on the six (B83, B82, ruling 1): the fill through a PDF, RELEASED marking, Undo after a release, the Approver releasing. Worked-out and no-words rows on a screen: Visitor visa has none (B88); by route in the door test. "No form reads this answer" not seen. A rejected card's row: my one call was refused for a wrong body and not retried; BR-1b holds in the fill test. New edition (`impact.ts`): code only. CI shards 2, 5, 6 on this head (cancelled). A real screen reader; an intended user's walk (D17, D20). My runs overwrote 4 tracked screenshots and one evidence file; I restored them with `git checkout`.

**Verdict: Block**
Fix on d46ae4e5f: **B1** `check_forms_b86_setup.ts` turns CI red (rename it, then a full CI run on the head) · **M1** `C4.11-26` needs its WAIT line naming B82. The Should items do not block. A re-check of these two lines and CI is enough; the walk above need not be repeated unless other code changes.
