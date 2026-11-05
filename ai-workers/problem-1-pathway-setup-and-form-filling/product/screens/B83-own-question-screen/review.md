# B83 review: "Ask as its own question" (independent reviewer, 5 Nov 2026, head 689804c9c, diff since 0aff0e0b4)

**Verdict: Block.** Skill verdict: Ship after fixes. F1 to F4 are closed. Two new Majors, both in the withdraw work added since the last review: N1 lets a broken eligibility gate through release, N2 keeps BR-11's words off the path a person takes.

**Journey score: 7.5 / 10, fail, provisional: scored by reading, not walked** (table below). The tech lead's rule for this Mac says no copy unless a finding needs one, and load read 20 to 29 all through. No copy was started. The earlier walk is `journey-test-reviewer-2026-11-05.md` at 0aff0e0b4; no new report was written.

**Ran:** the engine functions on N1's state (no database, US$0); `graph.mjs` (hard gaps 0; G3 13, G6 5, totals only). **Read:** the whole diff, both suites, `walk/1`, `walk/4`, `walk/7`. **Taken from the builder, not re-run:** browser check 51/51, C4.11 23/24, route suite 118 to 120 of 121.

## Majors

**N1. An eligibility gate reading a withdrawn field no longer holds release, and nothing names it.** `engine/validate.ts:82` with `:59-75`; `api/src/where-used.ts:117`. BR-9, BR-11. Worse than main: there the validator's line held release.
* **Cause:** `gateProblems` (`engine/eligibility-gates.ts:208-209`) says `"<label>": the rule reads <key>, which is not in the library.` `withoutWithdrawnKeys` drops every line holding that text, on the promise that a named line replaces it. `withdrawnFieldLines` has no line for `s.eligibility.gates`.
* **Ran (engine functions):** gate on a withdrawn key. `gateProblems` gives 1 error; after `withoutWithdrawnKeys` 0 errors; `withdrawnFieldLines` 0 lines. Script: `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/555d5da1-189e-4917-97a7-e0d4053a6810/scratchpad/gate-check.mts`.
* **Code, not run through the app:** the gate route accepts a waiting field (`api/src/eligibility.ts:44-47`, every field not retired). `problems()` is the only list Submit and release use (`api/src/studio.ts:476`, `approve` on a draft snapshot). So Submit and release would pass, with a gate reading a field that no longer exists. The gate's own comment calls this kind of state waiting for ever (`eligibility-gates.ts:215`); not run through a case.
* **Undo too (by code):** `fieldReaders` never reads `combination.eligibility`, so Undo would withdraw the field with `withdrew: true`. BR-9's "one list" misses a reader, and the Yes/No fields this screen makes are natural gate facts.
* **Fix:** (a) add the gates to `withdrawnFieldLines` and `fieldReaders`. (b) Close the class: drop a validator line only when a named line exists for the same `where` and `item`; otherwise keep it with the key swapped. Otherwise the next reader type repeats this. Fail test in `check_b83_undo_withdraw.ts`: gate reader, Undo keeps it, Submit names it. A unit test: a "not in the library" line with no named line is never lost.

**N2. BR-11's words sit on a page the author is not led to; the door they are led to has none.** `api/src/review-queue.ts:277`, `web/src/pages/library-item-actions.tsx:44`, `api/src/own-question.ts:230`, `tests/check_b83_own_question_screen_browser.cjs:159`. BR-11, BR-9, EXPERIENCE §2.5.
* **To review:** the author's own WAITING change gets `next: null`, so the row reads "No step for you" under Waiting for others, with no link to `/review/change/:id`, where Withdraw and the readers notice live (`review-items.tsx:130`).
* **What the words promise:** Undo's `kept` says "stays waiting on To review", and `whyKept` adds "so withdraw it there" (`own-question.ts:230`). That leads to the same dead end, while the field holds release (BR-8).
* **The way that exists:** Fields › open the row › where-used › "Add waiting" (`api/src/library-items.ts:109`, by code). The check does not walk it: it opens the URL with an id from SQL (`:159`).
* **The easy door:** the Fields row's own Withdraw calls the same route and shows no readers before the press (no `WherePanel` for WITHDRAW). After it, it says `Withdrawn: "X" stays as it was.` and ignores the answer's `readers`. Submit still holds by name, so the end state is safe, but "the page names the readers before the press, the answer names them after it" is not met there.
* **Decision 4 (F12):** dropping the row's link answered the dead `/review` link, and `asked_as.change_id` is now unused by the web. The ruling on M5 came with this fix round and changes the sum.
* **Fix:** on `review-queue.ts:277`, give the author's own WAITING field ADD a `next` to `/review/change/:id`, state still waiting; `row.asked_as.change_id` can link the row the same way. On the Fields door, show the readers and pass the answer's `readers` to its words. The browser check then reaches the page by clicks. Amend concept §4's "To review shows the author nothing".

## The earlier findings (checked in code and tests)
| | State | Evidence |
|---|---|---|
| F1 | **Closed** | `review-items.tsx:382,386`. Neutral while loading, error state on 500 and wrong id, "Decided" only once loaded; check covers held GET, 500, zero id, 0 undecided. See n2 |
| F2 | **Closed** | `own-questions.tsx:56-62`: `undo` never rejects, words on the row, list refreshed; toast (a) (b) (c) in the browser check. See n1 |
| F3 | **Closed** | `own-question.ts`: `still_asked` names sections and the tab; pass and fail at `check_b83_undo_withdraw.ts:250,255` on a real placement |
| F4 | **Closed** | `check_b83_undo_withdraw.ts:297-313`: never asked, new field unplaced, press clears, waiting holds, approved releases, no second press. Words in section, toast and row: M1's words now there (`walk/4`) |
| F5 | Closed | `onRefused` and undo always refresh; see n3 for one path left |
| F6 | Closed | `own-question.ts:159`; see n5 for words |
| F7, F8, F9 | Closed | `backTo` effect; sort at GET; `known && !failed`; each tested |
| F10 | Closed | `walk/1` shows the line; axe on six states; `graph.mjs` G3 as before |
| F11 | Open, for the tech lead | Limit of C3.6's check; list in the PR |
| F12 | Reopened by N2 | |

Breaker: B1, M2, M3, M4 closed in code and suite. M1 closed except gates (N1) and n7. M5 ruling partly met (N2). m1, m2, m3, m4, m5, m7, m8, m9, m10 closed. m6 open.

## Your decisions
1. **Interception, F3's words and F1's zero state: accepted.** Only rendering is under test, the route side is real at `:250`, and STANDARDS bars nothing here. The gap is the URL at `:159` (N2).
2. **Dropping and swapping: challenged, N1 and n6.** Promoting a check's warning for withdrawn fields only: accepted, it is what BR-11 says.
3. **m6 and F11 left open: accepted, list both.** m6 stays Minor: the row is edited in place, so the old values would have to be kept at the ask. I read no release gate that turns on a form field's origin, but did not search every path.
4. **F12: challenged, N2.**
5. **Form fields out of To review's words: accepted.** The answer counts them, and `check_b83_undo_withdraw.ts:199-201` proves they are put right.
6. **F6's different words: accepted,** with n5.

## Minors (fix or list in the PR)
* **n1 Row Undo leaves the toast up.** `own-questions.tsx:56`: the old `show` replaced it, now nothing does. For up to 10 s: "Asked as X… or release is held" beside "Taken back", and its Undo gives "nothing to take back". Fix: `undoToast.clear()` in the row's path.
* **n2 A failed refetch blanks a loaded page.** `review-items.tsx:382`: TanStack 5 keeps `isError` true with data held, and every action refetches all. An open form and its typed words go, with no retry. Fix: `q.isError && !q.data`; add Try again.
* **n3 `open` survives a refused save.** `own-questions.tsx:81,85`: the form closes because `can_ask` is false, `open` stays. Undo then reopens it, and `:81` hides the undo's words, so F2's `kept` and `still_asked` are lost on this path. Fix: `setOpen(null)` in `undo`.
* **n4 The readers notice has no loading or failed state, and the after-words are short-lived.** `review-items.tsx:209`: while the GET is out or after it fails, no notice, and Withdraw works. `:210`: the names sit in a green toast for 4.5 s (`lib/api.ts:61`), with no browser assertion.
* **n5 Raw type in words.** `own-question.ts:159`: "answered as `valueType`"; `declaration` would read "answered as declaration, not Yes or No". `TYPE_WORDS` exists (`eligibility-gates.ts:61`). Same at `:150`, older. `sameName` can also give a key when `label` is null (`library-changes.ts`), against M5; rare.
* **n6 The swap is by substring.** `validate.ts:82`. **Ran:** `person.has_used_other_name_2` becomes `"Has used other name"_2`, and a quoted key becomes `""Has used other name""`. The regex at `:64` already has the right boundaries.
* **n7 Readers `fieldsOf` cannot see.** A document validity rule's `before` (`runtime/case-checklist.ts:64`) and a derived value's `reference` (`validate.ts:180`) are in neither list. Not Yes/No in the usual case; a warning remains for the first.
* **n8 A raw role in the words.** `validate.ts:72`: "Where this answer comes from (`role`)"; `roleWord` is in `validate`.
* **n9 Contract.** `GET library/changes/:id/readers` and withdraw's answer are inline types, not in `contracts/` (STANDARDS §6, concept §2). The GET answers `{readers: []}` for an id that does not exist.
* **n10 Tests.** `call` presses again on any 5xx (`check_b83_undo_withdraw.ts:21`), in the race rounds too, and `:131` never asserts statuses: a 500 from a race, breaker m3's kind, is hidden. Use `once` there and fail on 500. No test: BR-10 with its named fact retired; Submit for a worked-out value (`:159`, no `submit`); withdrawal lines' derived branch would survive removal.

## [M] lines (met unless named)
EXPERIENCE: §2.5 next action not met (N2). §2.8 undo met but n1, n3. §2.10 met. §2.12 met by the builder's checks (keyboard, axe, widths); not re-run. §4 states met but n2, n4. §5 words: n5, n6, n8. STANDARDS: §3 second person, no typed key met. §5 no per-row request met; `problems()` adds one query. §6 server authorisation met (`readerOf`), contract n9. §7 test pyramid met; axe on the states met; "a rule's test fails when removed": F1 to F4 yes by reading, BR-11's gate has none (N1).

## Scores (1–5; by reading)
D1 3 N1, N2 · D2 4 races now one winner by code and suite · D3 4 F11 · D4 3 N1 · D5 4 F2, F5 closed; n1, n3 · D6 5 withdraw and undo both in history · D7 n/a, no AI · D8 3 N2 · D9 5 rows keep order · D10 4 n5, n8 · D11 4 F1 closed; n2, n4 · D12 4 · D13 4 F7 closed, not re-run · D14 5 team parts · D15 5 · D16 3 strong suites; N1, n10 · D17 simulated only · D18 5 form's words · D19 3 gates · D20 simulated only.

## Journey score (provisional, by reading)
Task completed 1 · next step obvious ½ (N2) · plain words 1 · feedback and state ½ (n1, n4) · correct data ½ (N1) · error recovery 1 · accessibility and sizes 1 (builder's) · speed ½ (not measured) · visual 1 (`walk/4`, `walk/7`) · trust and sources ½ (m6). **7.5, fail.** N1 and N2 fixed would make it 8.5.

## Could not check
No walk, keyboard pass or 200 % zoom of my own at this head, and no real screen reader or intended user. N1 end to end through a route and a case: the filter is proven on the functions, the path by reading. A clean route suite at this head: none seen, and one is needed before Approve. Retrofit mapping: none needed (no migration).

## Fix list
N1 and N2 before approval, each with a fail test, then a clean route suite and browser check. n1 to n10: fix or list in the PR, with m6 and F11. The cheap ones: n1, n2, n3, n6.

**Verdict: Block** (head 689804c9c): open Majors N1, N2.
