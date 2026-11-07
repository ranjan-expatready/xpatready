# qa: C8.1's "entered" tick, QA-235 retest, QA-153 re-sort, main ecbd68301, 7 Nov 2026, 13:40–13:50 IST: facts only (no verdict here)

**Asked by:** the tech lead (Lead 29, P-400). **Commit:** `ecbd68301`; `git diff` to this round's copy empty. **Money:** live AI off, US$0, no priced button. **Copy:** qa_c81w on :4470, the fresh configured checkpoint of `2026-11-07-c611-c81/walk.md`, with that walk's cases on it (same launcher, same limits; it stops itself ~14:07 IST). Browser pane at its own size; Chrome and axe not runnable.

## 1. The "entered" tick
* `POST /runtime/items/:id/screens/:key/entered` (`api/src/case-prepare.ts:586`). `grep -rn "/entered\|screens/.*entered" web/src`: no caller. `grep "answer-sheet\|answerSheet" web/src`: no caller. `tools/route-has-screen-allow.txt` has no line for it (that check reads routes a pack's set-up calls; C7.3's pack calls it in its steps).
* The case page says IMM 5257 is typed "into the IRCC account from the answer sheet"; no sheet and no tick on the page.
* **C8.1's row text:** "Signed-PDF states, upload of signed scans, per-screen "entered" ticks". **C7.3's row text:** "Portal sheet: answers in the portal's screen order with copy buttons" (no tick named).
* **C8.1's pack header** (`acceptance/C8.1.test.ts:5`): "The per-section "Entered in the portal" tick is C7.3-9." None of C8.1's 14 steps calls the route. **C7.3's pack** steps C7.3-9 to -13 test it.
* **M3 plan:** row B3 (C8.1) and J-B3: print, signed, scan, Uploaded to IRCC; no tick. Row B4: "Capability: C7.3. Gap: no file in `web/src` shows the sheet or "Entered in the portal"", J-B4 ticks; depends on C2 (#1075, held). P-143: Online = "typed into the portal's screens; answer sheet in screen order"; signed PDFs are another channel. The filing's Online line has `signature` NONE.
* BACKLOG line 40 says "C8.1 signed scans and entered ticks" (older wording).

## 2. QA-235 retest
| Check | Result |
|---|---|
| `tests/check_b84_fill_intact.ts` (no server) | exit 0, 10/10 |
| `tests/qa/check_qa235_schedule1_copy.ts` (new; route, family of four on release 2) | exit 0, 5/5: Schedule 1 202, GENERATED, `intact: true` for the principal, the spouse, a child of 20; child of 10 422 "IMM 5257 SCH1 does not apply to that person on this case."; junk name 404 "No such form.", not echoed |
| Schedule 1 on a filled adult (scratch, route) | counts `written: 7, by_hand: 2, not_written: 31`, intact true |
| IMM 0008 DEP on an Express Entry case opened by screens (scratch, route) | 202, GENERATED, intact true (0 written: no answers) |
| By screens, Sample Walk Principal, Generate a copy on IMM 5257 SCH1 | "Copy of 7 Nov, 13:45 · 0 form fields written · read back and checked", Download; "Checked copy, not for filing" |

The bug row's separate note stands: "no fill trial is recorded for edition IMM 5257 SCH1 (09-2023)", as for other forms; the screen says so.

## 3. QA-153 re-sort
Row today: "IMM 5707's answer sheet waits for 16 facts about each parent" on the fixture, capabilities C7.3, C7.7, C10.2. Plan R1: "QA-153 (IMM 5707's answer sheet waits for facts about the parents) goes to qa to re-sort, since release 2 has no IMM 5707". P-322: case steps count on the configured checkpoint. Not run on the fixture this round.
* **Release 2's forms for an adult:** IMM 5257 Online, IMM 5257 SCH1, IMM 5645, IMM 5476 PDF upload. **No IMM 5707** anywhere on the case.
* **IMM 5257's answer sheet** on a filled adult (route): 16 sections; sections with `waiting`: Personal details 6, National identity document 1, US PR card 1, Second person or place 3, Education 7, Employment 7. One text match for parent/mother/father in the whole sheet (not opened further); no section about parents.
* **IMM 5645's map** (`form_field_map`, PUBLISHED, edition 01-2021): `subject_parent_1` 8 boxes, `subject_parent_2` 8, `subject_sibling` 51, `subject_child` 36, `subject_spouse_or_partner` 7, all mapped.
* **The case has no such people:** Add offers only "spouse or partner (travelling)" and "child (travelling)". The word parent, mother, father, sibling or brother appears nowhere in the case page's text (agent tabs closed). The agent view has one section "Your parent 1 (mother or father)" holding one question, `person.present_address`, on the applicant's own subject, filling IMM 5645 once ("The address where the person currently lives"), which the card then lists as by hand.
* **Filled adult, `tests/qa/check_qa153_imm5645_parents.ts` (new): exit 1, 1/3.** IMM 5645 `ready: true`, missing 0; item `state: to_do`, "Every fact it reads is confirmed."; Father and Mother: 0 boxes written, 16 not written. Copy counts `written 4, by_hand 5, not_written 110`.
* **By screens** (`1-imm5645-facts-confirmed-parents-empty.jpg`): "IMM 5645 for Sample Client F · Checked copy, not for filing · **Facts confirmed**"; "Confirmed answers for 9 of 119 form fields."; the by-hand list names the address and the application type four times, not the parents or siblings. No Readiness line about them.
* **IRCC:** IMM 5645 (01-2021) p. 1: "Include ALL family members even if they are not accompanying you." (`product/compliance-trace.md` IRCC-P2-05, read 2026-11-01). IMM 5645 p.1 has Section A Applicant, Spouse, Mother, Father, Section B children, Section C brothers and sisters (`p1/inventory/imm5645e.headings.json`, `.inventory.json`). IRCC-F09: the Family Information form "must be completed". The packs never assert parents' boxes on IMM 5645 (grep Father, Mother in C7.7, C10.1: not read this round beyond the check).
* The copy is "Checked copy, not for filing" (no fill trial), and it is a by-hand Adobe form: a person could type parents in Adobe, nothing on the screen says to.

## Added after the fresh reader's questions, 13:50 IST (the same copy)
* **The one parent match on IMM 5257's sheet** is "Native language or mother tongue". So no section of the sheet is about parents.
* **"Your parent 1 (mother or father)", read, not typed:** `person.present_address` appears only in that section, on the applicant's own subject; "fills IMM 5645 for Sample Client F, 1 box". So typing there cannot overwrite another answer of the applicant's. It is one fact under a heading that names someone else: a person who took the heading at its word would give the parent's address as the applicant's (on the card, a by-hand line).
* **Spouse and child on a family case:** the family of four's IMM 5645 had 14 boxes written, including `SectionA.Spouse` and `SectionB.Child`. So travelling people reach the form; the empty boxes are parents and siblings, plus any family member not travelling (not added on this case).
* **New check, read for its rule:** QA-153-2 and -3 pass if the parents' boxes hold answers, or if the form stops saying ready and "every fact". It prescribes neither fix.
* **Not walked:** a filing with this form to Ready to file; the client's own questionnaire. IRCC quoted from the trace (read 1 Nov), not re-read. What IRCC does with empty boxes: Unconfirmed: no counsel.
* **Seen in passing, not logged:** a filled adult's IMM 5257 sheet still has 25 facts `waiting` in six sections: previous residence, education and employment (questions exist, required, unconfirmed: they sit in entries the helper answered with none-apply), `has_used_other_name`, `has_national_id`, `us_permanent_resident` (confirmed, yet waiting), and three `case.visit_contact_*` facts my read found no question for (my key may not match a case-level subject). Unexplained; for qa's walk when C2 and B4 land.
* **Origin of C8.1's tick wording:** `history/TRACE-SA01B-2026-10-23.md:254` ("C8.1 entered ticks", the audit's mapping) and BACKLOG line 40. No row in `DECISIONS.md` names C8.1 with the tick.
