# B154 break report: permissions and governance of "Background answers"

Commit d81e53821 (PR #1272), isolated copy `br154` on :4437, configured sample. Configuration side only (the runtime side, #1246, is not in scope). Simulated people via `x-actor`. US$0, no AI, no priced button. Copy stopped at the end. Line numbers are at d81e53821.

## Findings

**M1. Major: a returned background change can be sent again through the API with any label, and its checks are not run again.**
- What I did: proposed `details_of_visit_to_canada` on as user-A. user-C returned it with `{"note":"Check with expert first"}`. Then as user-A: `POST /api/library/changes/<id>/resubmit {"reason":"Expert confirmed it","label":"Details of visit to Canada - no longer background answers"}`.
- Expected: a 409 "Propose it again". The change page tells the proposer exactly that ("A returned change of whether a section holds background answers is not sent again from here: withdraw it, then propose it again"), and the server already refuses the same thing for form_role, document_supplies, form_field and rename.
- Actual: 201, status WAITING again. The To review row title now reads "Details of visit to Canada - no longer background answers", while its "what" line reads "Ordinary questions → Background answers". After user-C approved it, release pack 7's `library` list recorded the misleading label, and the section was published as marked. The stored `questions`, `uses` and `sourced` were not recounted, nor was the declaration check run again.
- Where: `api/src/library-changes.ts:185-198` has no `BACKGROUND_KIND` refusal. The release copies `c.label` at `section-background.ts:132`.

**M2. Major: P-244 is broken: a section that asks a declaration can still be unmarked, because approval does not check again.**
- What I did: `national_identity_document` was marked and released. As user-A I proposed `{"on":false,"reason":"Officers copy these from the card"}` (201). Then, still as user-A, a one-person draft edit: `PATCH /api/library/fields/person.has_national_id {"valueType":"declaration"}` (200, draft v2). user-C then approved the unmark.
- Expected: 409 "Declarations stay with the client" at approval, as at proposal.
- Actual: 201. The section got draft v3 with client_only=false. The Study permit release (pack 8) published it while the section asks a declaration-typed field.
- Where: `applyBackground` (`section-background.ts:116-124`) re-checks that the section exists, that it is not retired, and its old mark. It does not re-check declarations, which are checked only at `:79-83`.

**M3. Major: the second person is not told which questions stop coming from the case officer.**
- What I did: proposed `section_b_appointment_of_representative` on, then approved it as user-B.
- Expected: the reach lists every question whose source flips. The representative's own licence number, licensing body and organisation are case-officer facts by rule.
- Actual: the proposal answered `"sourced":[]`. After approval, Visitor visa's Comes from showed `representative.membership_id`, `licensing_body`, `organization_name` and 5 more as CLIENT (agent count 25 → 16), and no one was warned. The release line only said "its 9 questions are background answers now".
- Where: `section-background.ts:89` counts only stored `fact_source` rows that are not CLIENT. The engine's rule defaults are ignored: `engine/sources.ts:113` (representative role, `representative.`/`organisation.` facts, `staff_working_view`).

**M4. Major: a change of who fills a question and the section's mark can both be approved, leaving the library in a contradictory state.**
- What I did:
  1. user-A: `POST /api/library/fields/person.original_entry_date/fills {"to":"CASE_OFFICER",…}` (WAITING).
  2. user-A: `POST /api/library/sections/coming_into_canada/background {"on":true,…}` (201, `sourced:[]`, no mention of step 1).
  3. user-C approved the mark; user-B approved the fills change.
- Expected: one of the two is refused, or at least named to the second person.
- Actual: both approved. The section is at draft v2 with client_only=true, and the placement is at draft v2 with `collected_from=staff_working_view`. A new fills proposal on a sibling question is refused "Always the client", so the rule exists but is only applied at proposal.
- Where: `section-background.ts:84` looks only at its own kind. `who-fills.ts:85-93` (`applyFills`) does not re-check `clientOnly`.

**M5. Major: one author can move a question out of, or into, a background section, with no library change.**
- What I did, as user-A only:
  1. `POST /api/library/fields/case.funds_available_cad/placement {"sectionKey":"passport","collectedFrom":"client_questionnaire","repeats":"once_per_case"}` moved it out of marked "Visit details" (201).
  2. `PUT /api/combinations/<Visitor visa>/fact-sources/case/case.funds_available_cad {"source":"AGENT",…}` was then accepted (200).
- Expected: leaving or joining a background section goes through the same second-person path. A declaration in particular must not leave one (P-244).
- Actual: nothing appeared on To review. The release summary only showed the raw key "Question placement | case.funds_available_cad" plus the line '"Passport": its 1 question is no longer background answers'. Passport was never marked, so the expert is told the wrong section.
- Where: `api/src/studio.ts:658-684` (`placeField` changes `sectionKey` in place). `engine/validate.ts:268-270` files the change under the destination section.

**m1. Minor: an approved mark cannot be undone before release, and can stay stuck.**
- What I did: `POST /library/changes/<approved>/withdraw` gave 409 "Only a new shared field, a rename or a form's role change …", which does not name this kind. Proposing the reverse gave 409 "Already waiting".
- Consequence: a mark approved by mistake blocks every combination that carries the section, and those that chose another source, until a release. The supplies change (C4.5) offers withdrawal after approval; this one does not. A section that no combination carries would keep the change APPROVED for ever. I found this by reading the code only: no such section exists in the demo.
- Where: `library-changes.ts:289-290`, `section-background.ts:26,129-130`.

**m2. Minor: invisible characters pass as a reason.**
- What I did: `{"on":true,"reason":"​​​​​​"}` gave 201. The stored reason is 6 zero-width spaces, and the second person sees an empty "Reason:".
- Expected: as for the field meaning reason (`studio.ts`, which strips `\p{Cf}`), this is refused.
- Where: `section-background.ts:30` (`.trim()` only). The withdraw note `"​​​"` is accepted the same way (`library-changes.ts:291`).

**m3. Minor: the P-244 guard only recognises fields typed `declaration`, and no demo field is.**
- Sections such as "Consent and declaration of applicant", "Your declaration" and "Statutory declaration of common-law union" ask yes_no or text fields. Once marked, they can be unmarked by any author plus one approver. The suite needs an inserted Sample field to exercise the guard (`tests/check_b154_section_background.ts:121-125`). For the immigration expert: is value type the right test?

## What held
- **Proposing:** no actor or an unknown actor gives 401. user-B, user-C, user-O, user-R, user-P and user-Q each get 403 "does not hold the author duty".
- **Approving or returning:** the proposer (user-A) gets 403 "A different person decides". user-O, user-R, user-P and user-Q get 403 "no review duty". The batch door (`/review/changes/batch/:id`) gives 404, and the proposals door refuses the body. No other approval route reaches this kind.
- **Withdrawing:** user-B, user-C and user-O get 403. A return with no note gets 400 "Say why".
- **Concurrency:** 6 concurrent proposals gave one 201 and five 409. user-B and user-C approving together gave one 201 and one 409 "Someone decided this change at the same moment".
- **Validation:** spaces only, 4 characters, 301 characters, `on` sent as a string, a missing reason, an extra `client_only` key, an array body or a broken JSON body: all 400 in words. An unknown key gives 404. "Nothing changes" and "Asks nothing yet" give 409. A proposal while one is returned or approved gives 409.
- **Rename and retire:** a rename while the mark is approved keeps the mark (draft v2 `t`, renamed). A retire while the mark is open gives 409.
- **Comes from:** a combination that chose the case officer is listed in `sourced` ("Visitor visa"). Its submit is then refused in words: "…is a declaration or background answer: only the client gives it, never the case officer. Set Comes from to Client."
- **Release:** one "Background answers" line per section, needs_sme true. user-B (no sme duty) gets 403, the submitter gets 403, user-C signs, user-B releases. Sections are published and the changes RELEASED with the pack.
- **Reading:** a client or a case officer gets 403 on GET of the change, `/review-queue` and `/library/sections`.
- **UI:** at 1024 px, user-A sees the "Background answers…" buttons, user-B none, user-O none. The keyboard (focus + Enter) opens the dialog. HTML in the reason is sent as text.

## Seen, outside B154
After user-B approved the *rename* of "Visit details", the Visitor visa release was refused "you changed this draft, so a different person releases it (BR-14)". The cause is the rename door's "renamed" audit event (`draftAuthors`, `studio.ts:1016-1019`), not the background approval. user-B is the only person with the approve duty, so the combination could not be released.
