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
