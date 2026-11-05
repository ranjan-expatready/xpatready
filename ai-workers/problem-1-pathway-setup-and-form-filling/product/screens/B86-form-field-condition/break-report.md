# B86: break report

Breaker, 5 Nov, port 4449, fresh isolated copies, stopped after. US$0, ledger 0, live AI off, nothing priced clicked.

**The branch moved during the break.** The brief named d68a8b79a. At 11:16 IST the builder committed d906471b0 in this same worktree. So each line says where it ran:
* **d68** = server started 10:56, before those edits.
* **d906** = copies started from 11:17. It replaces the Review panel and adds a list route.

**Scaffolding for a release on Visitor visa (not product steps).** People set to principal only. Three document lines and the Sample rule that read facts outside the library (the B82 lines) removed by SQL. Section and box rows' `updated_by` moved by SQL where the report says so. A second edition was made by cloning rows in SQL. Words and fact changes at approval were made by SQL.

## Blockers
| # | What I did | Expected | Actual | Where | Ran on |
|---|---|---|---|---|---|
| B1 | Approved a box, then pressed Undo before any release (BR-7) | A new waiting change | **409 "This already exists, or someone else saved the same thing at the same moment. Reload…"**, row stays Confirmed. `library_change_one_open` (since 25 Oct) allows one WAITING or APPROVED per key, but the door treats only WAITING and RETURNED as blocking, so the database refuses | `api/src/form-field-condition.ts:18,163` (d906 `:19,181`); `prisma/migrations/20261025080000_screen02_library_changes/migration.sql:18`; screenshot below | d68, d906 |
| B1a | The builder's own `tests/check_forms_b86_door.ts` on a fresh copy | Passes | **29/40.** Its first failure is "approved and not released, it can be undone"; the other 10 include knock-ons of it. The closing of a replaced change (`:65`) can never run | same | d906 |
| B1b | After a release: Undo, approved, then confirm again | The way back | Submit refuses "Hiding a value"; confirm answers the same 409; the approved Undo closes only at a release, and Submit is what refuses. **Held until someone removes the question's condition** | same | d68 |
| B1c | Military service has two cards with different deciding questions. Confirmed from card 1, approved; accepted card 2, approved | Row "Holds a different condition", with a way back | Row offers Undo: 409. Confirm: 409 "undo that first". Withdraw, return and send again: 409. Submit refuses. **The only exit left is removing the question's condition** (`POST /library/fields/:key/placement`, 201; `web/src/pages/library.tsx:132` calls it) | same | d906 |
| B2 | Opened Review and release on Visitor visa with a Hiding problem | The page | **White page, React error #310.** A hook runs after an early return. By the code every combination's Review tab is affected, so that screen and its way out cannot be reached | `web/src/pages/review.tsx:67` after `:46` | d906 only, seen twice; d68 does not have this line |

Screenshot for B1 on the card: `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-b86-conditions-e90483/6cd4ba34-2b55-4427-bac1-9f69998ce65d/scratchpad/shots/undo-refused-card-1024.png` (temporary).

## Major
| # | What I did | Expected | Actual | Where | Ran on |
|---|---|---|---|---|---|
| M1 | Author confirms, the Approver approves (the natural second person), Submit OK, the Approver releases | Done when 5: it can be released | **409 "you changed this draft, so a different person releases it (BR-14)".** The approval writes the box's draft row with the Approver's id, and only the Approver holds the release duty (Content reviewer and author: 403). Proved on its own: with the section and document type rows moved aside, still refused; with the box rows moved too, release 201. Avoided only if the Content reviewer approves; once the Approver has approved, B1 stops Undo as the repair. **`applyCondition` and supplies have the same cause on main**, so this walk is blocked at the condition step too. By the code, every combination filing that form is affected | `api/src/form-field-condition.ts:63`; `api/src/studio.ts:1000` | d68 |

## Minor
| # | What I did | Actual | Where | Ran on |
|---|---|---|---|---|
| m1 | `GET …/form-fields?item=a&item=b` | 500, not words | `form-field-condition.ts:174` (d906 `:193`) | d68 |
| m2 | Question set to HIDE | Panel says "no form field needs to hold it"; Submit says "Make the form or its form fields apply under the same condition" | `form-field-condition.ts:92` | d68 |
| m3 | Approved after the question's condition changed | 201 "approved" for a rule that does nothing; row "different". Safe (BR-1b), and BR-3 does not ask for this check, but the approver read a sentence no longer true, and B1 then holds it | `form-field-condition.ts:56-63` | d68 |
| m4 | Rejected the card behind an approved box, later the same condition landed | The rule came back in force, row Confirmed, with no new look. Same words and same tree, so low harm | `engine/form-field-condition.ts` `ruleInForce` | d68 |
| m5 | Card after approval | "Confirmed: same condition" beside "Failed: form still reads" until a new Saved draft. BR-6 says it re-rates only on a new draft; the two lines still read as a contradiction | card screenshot above | d906 |
| m6 | Made-up words with codes | `form1[0].Page1[0].another form field`, `alias_name_indicator` still shown. Not seen on Visitor visa's real rows; 64 of 523 stored words hold a `_` or `[n]` and were not walked | `plainWords` | d906 |
| m7 | A waiting change proposed by mistake | Refusal says "Decide or withdraw it first", but the screen offers Withdraw only on ADD and RENAME. The route works. Read and API only | `web/src/pages/review-items.tsx:139` | d906 |
| m8 | Undo's approver line | No "other combinations" words; Undo re-holds every combination that files the form. Read only | `form-field-condition.ts` `spread` for `clear` | d906 |

## What held
**The door**
* Approving your own change: 403. Author returning own: 403. Other person withdrawing: 403.
* 401 for nobody or an unknown name; 403 for a case person on GET; 403 for Reviewer or Approver proposing.
* A typed condition (`conditionRule`, `tree`): 400. Array body, bad `item`, reason of 2 or 301 characters, reason of spaces: 400, in words.
* Another question's card, another combination's card, a decided card: 409, nothing written. Unknown item: 404. Another fact on this box: 404.
* 8 proposals at once: one 201, seven 409, one row.
* Approve, return and approve at once: one wins, one rule.
* Approval refused (409, still waiting) after the words, the fact or the outcome changed, or the box became worked out.

**The rule**
* Not confirmed, different condition, HIDE, one edition of two confirmed, merged deciding question: Submit refuses. Both editions confirmed: passes.
* REQUIRE: no Hiding, and the rule is inert.
* Only a box holding the question's own SHOW condition cleared Hiding. Nothing reached Submit's OK without it, on what I tried.
* Merging the deciding question: the rule is not rewritten, the row goes "different" and Submit refuses, as the concept's Not built says (exit limited by B1). Merging the box's question into one with the same condition: rows stay Confirmed.

**The fill, real case and real PDF copies**
* Yes, names, then No, then Yes. Yes writes the names and Y. No writes only N, boxes "not written" with "Not needed: … is No". Yes again restores.
* Each older copy went out of date, naming what changed. Stale answers stayed out of the PDF.
* A hidden name is not on the form's readiness list; unanswered reads "Waiting for" (real released snapshot, engine).
* Release marks the changes RELEASED in pack 1, and the change summary lists both in words for the expert (BR-8).

**The screens** (card, second person's page, returned page, at 1024 px and 200 % as a 512 px window)
* axe clean, no sideways scroll, by keyboard to the button in 5 stops.
* Double Enter makes one change; reload keeps Waiting.
* Hostile, Punjabi and 900-character words are escaped and wrapped. No field code on the second person's page or To review.
* Returned page offers Withdraw and no Name or Meaning (d906). At d68 the review's M2 stood; I did not re-run it.
* Speed on the sample: `form-field-conditions` 35 ms, `form-fields` 46 ms.

## Not run
* **Review panel at 1024 px, 200 % and by keyboard:** the page crashes on d906 (B2), and d68's panel had been replaced before I reached it.
* **`impact.ts` accept with a real held edition:** read, and two editions tested by SQL clone only. The carried rule is at `:231`, unchanged boxes only.
* **Un-confirm then re-draft (BR-6 back to Check):** blocked by B1 before a release.
* **100 programs / 400 combinations:** STANDARDS §9 scale is the team's (P-26), so not seeded.
* **Hostile upload and planted PDF:** this row has no upload.
* **Out of scope, B88:** worked-out boxes and deciding questions on other forms. `sp.outside` shows them `worked_out` and refused.

## Note
My first server ran with a cut-down PATH, so copies failed in the filler. That was my setup, not a finding; the restart fixed it.

## Re-check on 181256299 (5 Nov, port 4449, fresh copies, stopped after; US$0, ledger 0, no live switch, nothing priced clicked)
**Verdict: no Blocker, no Major reproduced. Seven Minors.** Builder's suites: fill 34/34, door 44/44. Scaffolding for a release: people principal only (route); `documentsBySteps`, `sourceGate`; three document lines deleted by SQL (B82). No `updated_by` moved. All file:line below are at this commit.
| Earlier | What I did | Actual | Result |
|---|---|---|---|
| B1, B1a | Approved, Undo; 8 Undo at once; approve, return, withdraw at once on a waiting change; then the later change returned and withdrawn | Undo 201; closed change 409 on approve, return, withdraw, resubmit; 8 at once: one 201, seven 409, one closed. Rule stays until the Undo is approved. Row true each step (Returned, then Confirmed or Not confirmed; Hiding matches the rule), both ways work again | Fixed; record see n2 |
| B1b, B1c | After Release 1: Undo, approved, confirm, returned, withdrawn, confirm, approved. Military service, two cards: card 1 confirmed, card 2 landed, Undo, approved, confirm, approved | Each step true; published row untouched; "Nothing has changed" at Submit. Military: Confirmed, Hiding 0; card 1 refused 409 in words | Fixed |
| B2 | Review with and without Hiding, no forms, back, tab change, person switched live; request 500, abort, 404, `{}`, 6 s | Never a white page, no console error. 1024 px and 512 px: no sideways scroll, axe clean on the block; 33 Tab stops from the top; Undo by Enter | Fixed; n1 |
| M1 | Author confirms, Approver approves, Reviewer signs, Approver releases: question and box | 201, Releases 1, 2, 3; author on record is the Configuration author. Author and Reviewer release: 403. Author is never the approver | Fixed |
| M1 hole | Approver accepts a card (review duty), Reviewer approves; Approver proposing a box | Box 403. Question row keeps the Approver: release 409 BR-14. **No way round by the door**; see n5 | Held |

| # | Minor | Where |
|---|---|---|
| n1 | Request failing or slow: nothing said. The Hiding error stays, the box and Undo vanish, an empty ruled block is left; no loading or error state. Reload recovers, no wrong data. **Misses [M] EXPERIENCE §4** (reviewer's m4): tech lead may rule it higher | `web/src/pages/review.tsx:68,95` |
| n2 | A closed change's record. Confirm approved, Undo closed it, Undo withdrawn, Release 3: the rule went out, its change stays WITHDRAWN, `released_in` null (reviewer's m7, BR-7). Screen: every status not listed reads "Released", so a closed Undo that never took effect reads Released, note hidden; direct link only. Change summary still lists it (BR-8) | `api/src/form-field-condition.ts:186`; `web/src/pages/review-items.tsx:70` (chip from 27 Oct) |
| n3 | Worked-out box reading the hidden answer itself **is written Y** (engine) when the gate is unanswered, the condition is on a code, is `value:false`, is compound, or has a twin: only a confirmed No is caught. Not reachable: it holds no rule (BR-2), so Submit refuses Hiding, by the rule's code | `engine/runtime/forms.ts:56-57`; test `check_forms_b86_fill.ts` "never written Y" |
| n4 | m2 on Review: HIDE leaves an empty block and no words (the one request omits it). Card and refusal words are right | `api/src/form-field-condition.ts:135`; `review.tsx:95` |
| n5 | Approver accepts a card and is then refused release, for something the words call "you changed"; the only exit is unsaid: the author re-saves the placement (201), the row moves to the author, the Approver releases (v2). Draft rows keep the last writer only. A second person did approve; the author chose to | `api/src/core.ts` `revise`; `api/src/studio.ts:677,992` |
| n6 | m4 open: card confirmed, card rejected, same condition later placed: Confirmed, Hiding 0, no new look. Also on Review that row reads Different, "no condition yet" (reviewer's m3) | `api/src/form-field-condition.ts:118` |
| n7 | m6 almost closed: of 457 worded rows only `Row2`, `Row3` still show. Undo's page says "Approving says these say the same" (reviewer's m3) | `engine/form-field-condition.ts:63`; `web/src/pages/review-items.tsx:87` |

**Earlier minors:** m1 fixed (404 in words). m2 fixed on the card, n4 on Review. m3 fixed (409, stays Waiting, nothing applied). m4 open. m5 better (line "rating changes at the next Saved draft" seen). m6 n7. m7 fixed (Withdraw seen). m8 fixed (seen). **New, held:** `spreadOf` matched each snapshot: 2 combinations, 7 and 5 form fields (sp.outside, pnp.express_entry on questions), 0 on a fresh copy, a retired combination drops out. New route: 401, 403 for case people and clients, 404 in words, reviewer 200, 110-135 ms (3.1 s once at load 28). `FormFieldsHeld`: Author has Undo, Approver none; double Enter one change. `showCondition`: two different SHOW twins refused both ways; an unconditioned twin keeps the rule in force, so the box blanks while the question is asked (engine only: 0 twins stored, placement key is one per field). `isWorkedOutYesNo`: all 17 stored Yes/No spellings read true, no year, name or check-code spelling did. **Not run:** approve, confirm and Undo at once with an approved change open (my walk lost its precondition; by the code a waiting change refuses both); real case and PDF on this commit (engine suite only); new edition; screen reader; browser suite (it overwrites tracked screenshots). One sample load failed on "Interrupted system call" under load: Postgres on the Mac, not a finding; I waited out a load of 28 before the last runs.

## Re-check on 8af1b3891 (5 Nov, 14:19-14:41 IST, port 4449, fresh copies, stopped after; US$0, ledger 0, no live switch, nothing priced clicked)
**Verdict: no Blocker, no Major reproduced. Four new Minors; one earlier Minor partly open.** **No SQL scaffolding for the release:** people by the route (principal, spouse `files_own`), `documentsBySteps`, `sourceGate`, Submit, sign-off, release: Releases 1 and 2. SQL only to read a copy's record and to set HIDE, as the builder's suite does. Suites: fill 35/35, door 45/45, C4.11 30/30, browser 39/39 (no `B86_SHOTS`) on fresh copies. The browser suite's first run stopped on Postgres's "Interrupted system call" (the Mac, not a finding); the second passed.
| Check | What I did | Actual | Result |
|---|---|---|---|
| n1, request fails | Review with Hiding at 1024 px: abort, 500, 403, 404; double click Try again while failing; Tab to it; Enter; 3 s delay | Failed block with words and Try again each time; spinner while slow; two requests, no crash; way out returns; axe clean and no sideways scroll on the block at 1024 and 512 px (200 %). Still open: x2, x3 | Fixed where Hiding shows |
| n4, HIDE on Review | HIDE on a not-confirmed question, and on one whose box holds the rule | Panel says "hidden under its condition … Change the condition", no button; door 409 in the same words; Submit refuses, both | Fixed |
| n2, chip | Withdrawn Undo by link, as Author and Approver; Released and Approved pages | "Withdrawn", no buttons; approve, return, withdraw, resubmit all 409; Released reads Released, Approved "in the next release" | Fixed |
| m7, Withdraw while waiting | By keyboard; empty, spaces and 2 characters; double Enter; Approver's page; a note of `<img onerror>` and Punjabi by the API | Disabled until 3 characters; one withdrawal; goes to To review; row back true; Approver has Return and Approve, no Withdraw; API 403 for Approver and client; the note ran nothing on the page | Held; x1, x4 |
| B1 | Confirmed, approved, Undo; confirm while it waits; approve and a second Undo at once (last time's gap; my Withdraw in that race was refused 400 for its one-letter note, so it did not race) | Undo 201; confirm 409 in words; never a 500 or a stuck row. The second Undo slipped in beside the approve: 201, and it closed the first, which had already taken effect and then reads Withdrawn. The rule stayed off, row and Hiding true. Harmless | Held |
| BR-14 | Author confirms, Approver approves, Reviewer signs. Author and Reviewer release 403; Approver 201. After a release: Undo, re-confirm, approve, one other change, Release 2 | Approver 201 both times; author 403; form-field changes RELEASED 1 and 2 | Held |
| The fill, real case, **read from the PDF's own form data** | Yes, names, copy; No, copy; a name typed while No; Yes, copy; corrected name, copy | Yes: `Sample Alpha`, `Y`. No: both empty, `N`. Yes again: only the latest name, never the earlier. Copies go out of date naming the answer, and are current again when the same answers return | Held |
| Stale name: old copy | Same idempotency key after No; lock the old Yes copy | Old copy returned, marked out of date; lock 409 "This copy is out of date (2 changes) … generate a new copy" | Held |
| Stale name: in flight | Yes to No just after the request, three rounds (once at the same moment); No to Yes with generate at once | The copy holds that moment's answers (Yes and the name, or No and none) and reads out of date; the next copy is right. The out-of-date copy carrying a name cannot be locked | Held |
| Stale name: odd answers | Yes/No answer `"false"`, `"No"`, `"true"`, `"Yes"`, `1`, `0`, `["false"]`, `{value:false}`; name stored | Stored with the problem "Answer yes or no"; name never written, Yes/No not written. Only `true` writes | Held |
| Stale name: never answered | Name by the API, Yes/No never answered | Not written | Held |
| Second person | Principal No with own name; spouse Yes with own name, confirmed; each way round | Each copy reads only its own person: no crossing. Spouse's No, even unconfirmed, drops the name from the next copy | Held; x3 |
| Two sessions | Client and officer save the Yes/No from one view | 200, 409 in words; copy follows the winner | Held |
| New case after Release 2 | No, then Yes, in the file | Empty and `N`; then the name and `Y` | Held |

| # | Minor | Where |
|---|---|---|
| x1 | Withdraw on a page left open while the second person approves: refused, safe, but the words are about other things ("Only a new shared field, a rename or a form's role change…") and never say it was approved. Chip stays "Waiting", button stays, until reload | `api/src/library-changes.ts:227`; `web/src/pages/review-items.tsx:216` |
| x2 | Focus falls to the page top when Try again or "Withdraw it instead…" is pressed and goes away (no focus moved to the way out or the box). Tab still reaches it | `web/src/pages/review.tsx:98`; `web/src/pages/review-items.tsx:222` |
| x3 | Yes **not confirmed** over a kept, confirmed name: the copy writes the name beside a blank Yes/No, not out of date. Principal (officer's Yes) and spouse. **Cannot be filed:** readiness lists the Yes/No "not confirmed", lock 409. No is safe either way. BR-5 asks only "true"; the expert may want a confirmed Yes | `engine/runtime/forms.ts:46-49` |
| x4 | A Withdrawn change's page does not show why it was withdrawn: the note is on the record only. Returned shows its note | `web/src/pages/review-items.tsx:121` |
| n1 rest | No Hiding on the draft and the request fails: "Form fields holding a question's condition" and its Undo vanish with no words and no Try again. Reload recovers, no wrong data. **Still misses [M] EXPERIENCE §4 here:** tech lead may rule it higher. A 200 with `{}` leaves the Hiding block empty (no server sends that today) | `web/src/components/form-field-conditions.tsx:77`; `web/src/pages/review.tsx:71` |

**Earlier minors:** n1 see above. n2 chip fixed; a closed change's `released_in` stays null, as it should. n3, n5 not re-walked, code unchanged. n4 fixed. n6 not re-walked. n7 fixed by the suite's own check (`Row2`); no new row walked.
**Not run:** screen reader; new edition; a case moved between releases; hidden gate under another hidden gate (no such row on Visitor visa).
