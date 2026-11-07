# Break report: C6.11 on the configured checkpoint (runtime PR #1072 at e1801f98f)

Copy `brk611` on :4437 (`xr_studio_brk611`). Reset, then `demo/load {"sample":"configured"}` as user-A: 81 s, US$0. Released: Visitor visa, Study permit, With an LMIA. Stopped at the end. No priced button, no model call. Scope: what changed in `ffcfb45c8..e1801f98f`: the firm-record facts, the 422 on `case.uses_representative`, the hiding in `state()`, `representative` on prepare items, and IMM 5476's who and minimum age. `B=/api/runtime`. A "case" below is a Visitor visa case opened by user-O.

## Blockers
None found.

## Major
**M1. One stored "Uses a representative" answer from before this change stops the application's "Personal details" section from ever being confirmed.**
Steps:
1. Open a case and answer `case.service_language`.
2. Add one stored row for `case.uses_representative = false` (DECLARED, agent_view). This stands for an answer typed before #1072; until now the officer could type it.
3. The Agent view shows Yes, "From the firm record", and does not list the stored row.
4. `POST $B/cases/<id>/sections/personal_details/confirm` with the ids the screen sends.

Expected: 201. Actual: 409 `changed: ["case.uses_representative"]`, every time.
- The UI cannot send the hidden id. Sending the firm-record id gives 400.
- PUT gives 422. `changes/undo` gives 409 "nothing to undo".
- So nothing can clear the row.

Cause: `confirmSection` reads stored rows directly (`api/src/runtime.ts:434,444`) and skips the `firmGives` filter that `state()` applies (`:262-263`). The same case without the old row: 201.

**M2. IMM 5476's membership ID is written into four boxes, including the law society, Chambre des notaires and unpaid-member boxes.**
Steps: on a case with everything else confirmed, generate IMM 5476 for the principal. This runs locally at US$0.
Actual (`form_instance.result_json`): `R000000` is "written" into all four of these boxes:
- `SectionB.question6.questionII.ICCRCMember`
- `…questionII.membership` (law society)
- `…questionII.quebecLaw`
- `…questionI.membership` (unpaid licensed member)

`licensing_body=cicc` is ticked as well. Expected: only the CICC box. The filed form would say the RCIC holds four memberships.
Cause: the release's map sends all four boxes to one fact, and #1072 now supplies that fact (`engine/runtime/team.ts:105-110`).

**M3. IMM 5475's designated individual is now filled with the representative's office address, phone and e-mail. The IMM 5475 item also follows representative changes.**
Steps: answer `case.authorizes_release_to_designated_individual = true` and generate IMM 5475.
Actual: Section `Five` (the designated individual) gets:
- family and given name `Representative` / `Sample` (this part predates #1072)
- **new** in #1072: `apt 200`, `Number 100`, `homeAddress Example Street`, `city Toronto`, `country canada`, `postalCode M5V 1A1`, `province ON`, e-mail `representative@sample-firm.example.com`, and the phone boxes as by-hand steps

After R→T, the IMM 5475 copy is `out_of_date` (e-mail and given names changed). The prepare item also carries `representative: "user-T"`, because `namesRep` is true for any form that reads a representative fact (`api/src/case-prepare.ts:315-320`).
Expected: the person the client designates, who is not the firm by default. IMM 5475 is a different authority from IMM 5476. Cause: the new `person.address_*`, `person.email` and `person.phone_*` keys (`engine/runtime/team.ts:89-94`) match IMM 5475's map too.

**M4. IMM 5476 is never complete on any firm case. Seven representative facts are asked, nobody can answer them, and saving one fails.**
Steps: answer and confirm every applicant and application fact that IMM 5476 reads.
Actual: `GET $B/cases/<id>/forms` shows `ready:false` with 7 missing, all "about The representative":
- `licensing_province`
- `uncompensated_category`
- `uncompensated_other_description`
- `supervising_lawyer_name`
- `supervising_lawyer_membership_id`
- `fax_number`
- `fax_country_code`

Prepare keeps two CRITICAL `missing_facts` warnings for IMM 5476.
- The Agent view's "The representative" tab is the first tab. It shows "7 missing" and 7 Add buttons.
- Add, then Save, says "That person is not on this case." (`PUT …/answers/representative/…` returns 404).
- The officer can save `representative.membership_id` on the principal instead (200, `fills: []`). Nothing reads it, so stray data is stored.

For an RCIC, five of the seven never apply. Breaks STANDARDS §3.6 (no hidden field a form needs, no rule that can never be true). Seen at 1440 px and 1024 px.

**M5. After R→T→R, the Case team dialog says a new IMM 5476 is needed, but the old copy shows as current.**
Steps: generate IMM 5476 with R, change to T, then back to R (`PUT $B/cases/<id>/team/representative`).
Actual:
- `GET …/team` returns `imm5476.new_needed:true, earlier:"user-T"`, and the dialog reads "A new IMM 5476 is needed … the one with the earlier representative is out of date".
- The copy made with R before the two changes returns `out_of_date:false, changed:[]`.
- The Prepare card shows no notice.

The firm-record answer ids are `firm_record:<user>:<fact>` and carry no appointment (`engine/runtime/team.ts:131`), so the value comparison sees no change. Two screens give opposite instructions about a form to file (BR-20; legal point unconfirmed: no counsel).

## Minor
- **m1. A case with no representative of record:** the refusal states a falsehood, and IMM 5476 waits with no path forward. Steps: delete the case's `case_team_member` rows (as for a case opened before the migration). PUT `case.uses_representative` then gives 422 "this case has a representative of record", and IMM 5476 stays `cannot_start`. The check tests `firmByKey`, not the representative (`api/src/runtime.ts:302`). Assigning a representative recovers the case.
- **m2. The client gets 422 "Change the team, not the answer" for PUT `case.uses_representative`, not 403.** The 422 check runs before the client-field check (`runtime.ts:302` vs `:307`).
- **m3. Misleading UI text for "Uses a representative".** The line says "Change it in the firm record" (`web/src/runtime/questionnaire.tsx:718`). It changes with the case team.
- **m4. The prepare item's `representative` appears on no screen.** It is a bare user id. `grep` finds no use of it in `web/src`, and the Prepare card for IMM 5476 does not name the representative. The build note says the item names the new representative.
- **m5. IMM 5476's office address is mostly not written.** City, country, street name, street number, unit and phone country code end as "by hand" (`max 30 characters … not in the executable set`), so 9 boxes are written by hand. The dialog's "IMM 5476 fills … category RCIC" has no box on the form.
- **m6. `licensing_body` is a slug of the body's name** (`team.ts:107`). A lawyer's "Law Society of Ontario" would give `law_society_of_ontario`, which is not the option `law_society`. Not reachable with today's Sample firms.
- **m7. `GET …/forms` lists IMM 5476 as `applies:true` for a child with no date of birth.** The questionnaire and Prepare say `cannot_tell` / `cannot_start`. IMM 5257 SCH1 behaves the same, so this predates #1072.

## What held
- **Roles.** PUT `case.uses_representative` returns 422 for user-R, user-O, user-T and user-P, and 404 for user-S and user-Q. user-A, B and C get 403. No actor and user-X get 401. Reads (agent, sqr, pqr, prepare, forms) follow the same split. user-S reaches nothing on Sample firm cases, and R, O and T reach nothing on the solo case.
- **Client leak.** The client's sqr shows only "Uses a representative" = Yes (by `user-R`). PQR has none of it. No licence, e-mail, office or phone reaches the client, and the client page shows no representative block. The client gets 403 on every `representative.*` fact.
- **Other routes.** Undo of the fact gives 409 and writes nothing. `representative.*` on the application subject: 422. Firm-record ids in `seen`: 400. Groups and PQR expose nothing.
- **IMM 5476 who and age** (VV-R10): principal, spouse and child 18 today: yes. Child 18 tomorrow, child 10, child 5, a child of 20 not travelling and a spouse not travelling: no. Study permit and LMIA (principal, plus spouse on LMIA) match. On the solo firm: R000001, "Sample solo practice", `representative: user-S`.
- **R→T→R facts.** Facts follow each change: R000002 and the second representative's e-mail, then R000000. The copy is marked out of date after R→T, the dialog history is kept, and the prepare item names the current representative.
- **Race.** 6 rounds of a representative change against generate and prepare. Each copy froze one representative's full set, and `out_of_date` was right every time.
- **Screens.** No sideways scroll at 1440 px, 1024 px or 200 % zoom, including the Case team dialog. Axe found 0 violations on the Agent view and client page. Arrow keys move between and select the Agent view tabs. No page errors.
- **Budgets.** Agent questionnaire 52–74 ms, prepare 0.22–0.32 s, forms 0.24–0.32 s, team 12–15 ms, on a 6-person case.

## Re-check at b1872f158 (`git diff e1801f98f..b1872f158`)
Fresh copy `brk611` on :4437, configured checkpoint (86 s, US$0), stopped after. Round-1 findings only.
- **M1: fixed.** With a stored `uses_representative=false` added by SQL, Confirm section returns 201, also with the hidden id in `seen`; the row stays DECLARED and unconfirmed. Not reopened by: the firm-record id in `seen` (400), the "representative" subject (404), `representative.*` on the principal (never listed), or groups (no firm-given fact in one). **New Minor n1:** `changes/undo` on `case.uses_representative` returns 200 "Undone … back to its earlier value" with a current representative and writes a hidden row; nothing on screen changes. Steps: no current representative, type Yes then No, assign user-T, undo. Undo should refuse a firm-given fact, as PUT does (`api/src/case-changes.ts`).
- **M2: ruled (B107).** R000000 is still in all four membership boxes; the copy says "Checked copy, not for filing".
- **M3: fixed for #1072's part.** No address, e-mail or phone is given any more. The IMM 5475 copy writes 2 boxes and its prepare item has no `representative`. Remaining firm-record writes to IMM 5475 (as on main, from C7.7): `Five.AppFamily` = Representative and `Five.AppGiven` = Sample ("firm_record by user-R"). After R→T, the IMM 5475 copy goes `out_of_date` (given names).
- **M4: ruled (B107), and it has grown.** With the M3 keys withdrawn, IMM 5476 has **17** unanswerable "about The representative" facts (was 7; e-mail, address and phone added) and IMM 5475 has 10. The tab reads "The representative 17 missing". The built note and B107 still say "the seven".
- **M5: ruled (C9.2 follow-up).** No change seen.
- **m1, m2, m3: fixed.** With no current representative, staff can type the fact (200); with one they get 422 "Change the team (Case team)". A client gets 403 "Your case team sets…". The line reads "Set by the case team (the representative of record)".
- **m4: fixed** (the note's wording). **m6: fixed** (`licensingBodyKey`): CICC gives `cicc`; the other bodies rest on the unit test, since every Sample firm uses CICC.
- **m5: still open, smaller.** The office block is no longer written (ruled), but `GET …/team` still lists `representative_category: rcic` under `imm5476.facts`, and IMM 5476 has no box for it.
- **m7: still open** (predates #1072). `GET …/forms` says `applies:true` for a child with no date of birth; the questionnaire says `cannot_tell`.
