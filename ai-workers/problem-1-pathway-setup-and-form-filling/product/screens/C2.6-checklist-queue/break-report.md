# Break report: C2.6 checklist to review queue (PR #574, commit 643a2116)

Copy: isolated `brk26` on :4454, sample "six", live AI off, stopped afterwards. Combination `vv.single` (f77d8403…), IMM 5484 attachment 182d787d…. Final checks: `sum(drafting_job.cost_usd)` = 0, no document_requirement PUBLISHED, `git status` clean. Not run: browser checks (keyboard only, 1024 px, 200 % zoom), the 100-program / 400-combination budget run, the hostile-PDF upload. A checklist is replayed from files in the repo by checksum, so an upload cannot reach this path, and `/attachments/sample` only copies library files. Release was not exercised.

## Blocker
None.

## Major

**M1. Undo of a decision that created a document type erases the type under a line accepted in another batch (dangling line).**
- Repro (natural, no edit): with the IMM 5484 checklist attached to two combinations (`POST /api/combinations/677fc613…/attachments/sample {"officialFile":"imm5484e.pdf"}`) and both replayed, user-A accepts `purpose_of_travel_evidence` on vv.single (batch X: the type is created and the line written). User-A then accepts the same line on the study permit, and it lands on the type X created. Within 10 s `POST /api/review/proposals/undo/X` answers 201 `{"undone":2}`.
- Same with one combination: accept the type item alone (batch X), accept its line (batch Y), undo X: 201 `{"undone":1}`.
- Actual: `document_type` is empty, but `document_requirement purpose_of_travel_evidence:each_applicant` (DRAFT) stays, pointing at a type that no longer exists. `GET /api/combinations/:id/config` lists the requirement with `document_types: []`. The accepted line stays "edited".
- Expected: Undo refuses (409) while an accepted line of another batch uses the type, as it already does for reused items ("is now reused by…").
- Cause: `proposals.ts:565` only looks at items with `reuse.match = "reuse"`. These lines are `new` or relate to the type, so the guard misses them.

**M2. An edit that changes the line's document type is silently ignored; the line lands on the proposed type instead.**
- Repro: line `marriage_certificate_copy` (id 92df6785…). `POST /decide {ids:[id], action:"edit", payload:{kind:"requirement_line", documentType:"banana_peel_photo", roles:["each_applicant"], always:true, condition:null, alternativeGroup:null}}` answers 201 `landedAs: marriage_certificate_copy:each_applicant`.
- Also an empty `documentType:""` and `" fee payment receipt "` (extra spaces): the line lands under the line's own proposed type (`proof_of_financial_support`). The stored payload says one thing and the draft line another.
- Expected: 409 saying the typed type is not in the library (as the no-relatesTo path does), or the typed type used.
- Cause: `proposals.ts:292-293` falls back to `r.relatesTo` whenever the edited name is not found, without checking that the name still means the related item.

**M3. Accept and Reject of the same line at once both answer 201; the loser is told it worked and the state is the other one.**
- Repro: fire `decide accept` (user-A) and `decide reject` (user-B, reason "nope not needed") together on one waiting line. In 5 of 6 rounds both answered 201 with different batchIds; the line ended `accepted|user-A` with 1 requirement written.
- User-B's batch is gone: `POST /undo/<B batch>` answers 404 "No decision with this id". The activity log says "Approver rejected 1 proposal" and "accepted 1 proposal".
- Two accepts at once held (one 201, others 409). Only reject has no row lock; `decide` reads status at `proposals.ts:480-482` without `FOR UPDATE`.
- Expected: one 201, the other 409 "already decided".

**M4. The lander accepts a condition that reads a retired field; the requirement writer refuses it.**
- Repro: a field `person.old_fact` with status RETIRED. Edit a line to `always:false` with `tree:{op:"eq", field:"person.old_fact", value:"x", subjectKind:"EACH_APPLICANT"}`: `decide` answers 201 and the draft line is written. The writer, `POST /api/combinations/:id/requirements` with the same tree, answers 400 "reads "old fact", a retired field: restore it in Shared library › Fields first".
- Expected: the same refusal, since `landRequirementLine` says it follows "the requirement writer's rules".
- Cause: `proposals.ts:314-315` loads only non-retired fields and then strips every "not in the library" error, so retired and never-existing fields look the same. The writer (`studio.ts:662`) rewrites the retired case so it is not stripped.

## Minor (7)

1. **Duplicate roles make two identical lines.** Edit `roles:["each_applicant","each_applicant"]` answers 201 and writes `…:each_applicant` and `…:each_applicant:mvzjatl8`, so the client is asked twice. `proposals.ts:319,324`: the "twice" check only looks at lines already on the combination. Expected: dedupe or 400.
2. **Photo documents are not marked "person only".** `checklist.ts:145` tests `/\bphoto/i` on the raw key `visa_application_photos`; `_` is a word character, so it never matches. The proposed type reads `letter_or_record`, not `person_only`. The passport case works because underscores are replaced first.
3. **Every accepted conditional line reads facts the library lacks.** In the sample the library has no fields, so all five conditional lines (marital status, is_minor, …) landed with conditions that cannot be true yet. Accept answers 201 with no word about the missing facts; only release blocks them (by design, P-223 a). Expected: the accept reply or queue row names the missing facts.
4. **A rejected or unused type item stays waiting.** Editing a line onto a library type, or the second combination's line landing on a type the first created, leaves the other combination's `document_type` item waiting. Accepting it later is a 409 twin conflict. Expected: closed with the line, or hidden.
5. **`alternativeGroup` in an edit is dropped.** `landRequirementLine` writes `alternatives: DbNull`. Expected: used or refused.
6. **Wrong place named in the Undo refusal.** After a line is edited, undo says "retire or delete it in the shared library instead", but the line lives on the combination (`proposals.ts:~551`).
7. **Vague 409 on a lost race.** A concurrent accept of a line that creates a type gives "the database refused a duplicate. Refresh", not "already decided".

## What held
- Non-author writes: user-B, user-C, user-O, user-P and an unnamed actor get 403 or 401 on replay and on accept/edit of a line. Nothing was written (counts unchanged). Reject is allowed with the review duty.
- Old doors: `apply-checklist` returns 410 for the author (403 for user-B), `items/:item` returns 410 for every decision, actor and unknown item; unknown job 404. Proposals, requirements, types, library changes and audit rows were unchanged.
- Replay: `mode` "live" or "banana" refused (409, no spend); 5257 refused 400; 5483 (no saved reading) 409; unknown attachment 404; replay while lines wait returns the same job (no new proposals); after a full reject or accept-one-reject-rest it re-proposes only what is not on the combination.
- Type rejected then line accepted gives a clear 409; line and type rejected together and undone returns both to waiting; accepting a line and its type together is refused ("Only Ready items") with nothing written.
- Edits refused: unknown role, empty roles, missing fields, wrong kind, `always:false` with no condition or a string tree, `{}`, `[]`, garbage `op`, documentType over 120 characters.
- Duplicates: the same line on the combination is 409 for `fee_payment_receipt`, `Fee Payment Receipt` and `FEE_PAYMENT_RECEIPT`.
- Double accept (3 at once, 5 rounds) and line-plus-own-type at once: one wins, no second type, no second line.
- Undo: a second person's approval of the type (user-B) gives 409 and keeps both; a different user gets 403; undo after the draft line was edited gives 409; the first Undo within 10 s removes the line, the type and the library change.
- Delete or retire of a type used by a draft line is refused (409, names the combination).
- Money and status: cost sum stays 0 across all runs; nothing PUBLISHED; the Super visa part is left out of vv.single.
