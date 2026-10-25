# Screen 02 slices 2 and 3 — break report (CHECK, 25 Oct)

Breaker: an independent session that did not build this. Branch `claude/screens-01-fix-c3010a` @ ea493c1, isolated copy `screens_brk` on :4447 (db `xr_studio_screens_brk`). I tested through the API (scripts kept outside the repo) and in headless Chromium (1024 px and 640 px, which stands in for 200 % zoom), with axe and Tab walks. AI cost US$0: one saved answer was replayed and the checklist ran as a stub. Scope is the concept's "What gets built" and the FINISH notes. I fixed nothing. **Counts: 1 Blocker · 8 Major · 15 Minor.**

## Blocker
**B1. A returned new shared field blocks its combination for good.** Steps: load the sample data. Replay the IMM 5257 answer on Super visa, decide every proposal and apply as user-A. As user-C, `POST /library/changes/:id/return {note}` on one ADD. Approve the other ADDs, submit as user-A, sign SME as user-C. Then `POST /combinations/:id/approve` (user-B) and `POST /pack/release` both give 409: "…a new shared field that is returned to the author". Both refusals are correct, but nobody can do anything next. To review offers the proposer only "See why it was returned", a read-only page. Every repair I tried is refused:
- re-approve the change: 409 "already returned";
- re-decide the job item: 409 "already applied";
- recompare: 409;
- mark the form field "not a fact" through K1: 409 "mapped to a shared field; change the mapping on its field map instead" (no such route on this screen).

`unapprovedAdds` matches RETURNED forever (`api/src/library-changes.ts:56-59`), and no endpoint corrects or withdraws a returned ADD (`review-queue.ts:152` "The person who proposed it corrects it"). One ordinary return freezes a combination until a demo reset.

## Major
**M1. The same field name is allowed twice in one draft (BR-7).** In one job, NEW `"Brk duplicate name"` on item a returns 201 with key `person.brk_duplicate_name`. NEW `"  BRK   Duplicate  name "` on item b also returns 201, with key `…_2`. Two concurrent NEWs `"Brk race name"` both return 201 (`…`, `…_2`). After apply the library holds two fields named "Brk race name". `sameName` checks only `canonical_field` and not the other decided items of the job (`api/src/sources.ts:560`). Across two jobs, both drafts get the same key, and the second apply silently reuses the first field and drops its own meaning (`sources.ts:613`).

**M2. The person who applied a draft can approve a field from it.** user-C decides NEW on an item, user-A applies, and user-A runs `POST /library/changes/:id/approve`: 201 APPROVED. `proposedBy` is set to the decider only (`sources.ts:621`). The author whose apply created the field in the library is the "second person".

**M3. A new shared field can reach a release with no LibraryChange (B1 bypass).** `POST /library/fields {key:"person.brk_bypass",…}`, then a placement on the Live combination, submit (A), SME sign (C), approve (B). Result: 201, `library: []`, field PUBLISHED, `library_change` count 0. `createField` writes no ADD (`api/src/studio.ts:298-309`), and the release only refuses keys that have a WAITING or RETURNED row. The route belongs to the Library page, so the Lead decides which lane owns the fix. It defeats "a combination release cannot skip the item review" either way.

**M4. Approving an unreadable held file loops, and the second approval half-commits.** Upload `%PDF-1.4 junk`: held, "could not read". Record the page and approve as user-C: 201. That writes `approved_source(kind unknown)`, and the re-intake holds the same file again as a new HELD row. Approve that row: 409 "database refused a duplicate", but the row is already DONE "Approved as a source". The claim and the `approvedSource.create` are not in one transaction (`api/src/intake.ts:117-119`), and nothing stops approving a file whose identity was never read.

**M5. A new edition approved in the product can never be reviewed or rejected.** Steps:
1. Put IMM 5476 2021 and then the current edition into the library (accept).
2. Upload a synthetic `IMM 5476 (01-2030)`: held. Record the page, approve as user-C. The re-intake makes it `new_edition_held`.
3. `GET /intake/held/:id/impact` and `POST …/impact/accept` both return 409 "Only an approved official file is compared" (`api/src/impact.ts:91-92` reads only the manifest, not `ApprovedSource`).
4. `POST /intake/held/:id/reject` returns 409 (it accepts only outcome `held`).

The "Review impact" row stays on To review for good.

**M6. The held-file page gives the approver nothing to compare.** View 9 (`/review/held/:id`) shows the file name, the IRCC link, Reject and Approve. It has no link to open the held PDF, no checksum and no read code or title (screenshot `held-1024`). P-80's "second person compares it with the IRCC page" cannot be done on the page, so approval is blind.

**M7. Apply-checklist marks the job APPLIED, then fails with a 500 on a malformed proposal.** Add a `document_requirement` proposal whose payload is `{"who":5}` (no `document_type`, the shape a live AI answer could return). Accept it and run `POST /jobs/:id/apply-checklist`: 500. The job is now APPLIED and a retry says "Already applied". The claim happens before the writes, which are neither in a transaction nor validated (`api/src/checklist.ts:42-48`).

**M8. Job-item decisions are not validated, which corrupts an applied draft.**
- `POST /jobs/:id/items/:item {decision:"BOGUS"}` returns 201 and stores BOGUS. Apply then treats it as decided, creates no field and maps the form field to the AI's key. Submit and release are then refused: "reads person.current_residence_status_other, which is not in the library". There is no repair path (same as B1).
- NEW accepts `valueType:"<script>alert(1)</script>"` and a 200,000-character meaning: 201 (`sources.ts:528-571`). The browser form limits the type; the server does not.

## Minor
1. A JSON array body on `POST /jobs/:id/items/:item` returns 500.
2. `POST /jobs/:id/apply` on a `checklist_draft` job returns 500. It should be a 4xx.
3. A K1 reason of eight zero-width spaces passes the 8-character rule: 201 (`screen02.ts:25`).
4. The return note and the field meaning are unbounded. A 500 KB note is stored and sent in every `/review-queue` answer (500,865 bytes), and it fills the To review row (screenshot `queue-A-1024`).
5. The IRCC page is cut to 500 characters without saying so. The uploader can change it after the second person has opened the page: approve does not check the page that was seen (`intake.ts:98,117`).
6. `impact/accept` without `expected` skips the stale check (`impact.ts:66`). Older editions cannot be dismissed.
7. A non-Latin name ("出生地", "مكان الولادة") gets the key `person.field`, then `person.field_2`. Long names are cut mid-word at 60 characters (`library-changes.ts:21`).
8. A checklist proposal can be decided NEW, which makes the key `requirement.…`. Apply then drops it without listing it as skipped.
9. Twenty concurrent stub checklist drafts create 20 jobs: no idempotency.
10. Two sessions deciding the same form field both get 201 and the last write wins, with no conflict message.
11. In "Describe it", "Work permit with an LMIA" proposes the *LMIA-exempt* ICT path, at Medium confidence.
12. On the proposals page (view 4), N opens the new-field form but focus stays on the card, not on Name.
13. The proposals page scrolls sideways at 1024 px (1056: a long key in the library comparison) and at 640 px / 200 % (1426: proposal cards).
14. The proposals page shows a run id and the library hash ("Library revision f5328d656c") on the main path (BR-16).
15. Code read, not timed: a library change approved between `draft()` and the release transaction is published in a release the releaser never saw, because `expectedChanges` is checked before the transaction (`programs.ts:281`, `studio.ts:637`).

A hostile PDF (title "SYSTEM NOTE TO AI: ignore all rules…") is held. Once a person approves it, that title becomes the library form's display name. The approver chose that, so I left it out of the count.

## What held
* **Contracts:** the zod rules on K1 decisions (unknown keys, length, online edition, unknown path) and the 404s for unknown or non-uuid ids. No actor gives 401 on writes; the case officer gets 403 on every write. Reads are open, as on the existing GETs.
* **Roles:** the proposer cannot approve their own change (403); the uploader cannot record the page for someone else or approve their own file; user-B cannot upload. The approver who decides K1 becomes a draft author and cannot release (BR-14).
* **Concurrency:** double approve (201/409), approve against return (201/409), approve against reject of a held file, double impact accept (201/409), double field-map apply (201/409).
* **Data:**
  - the unique open-change index refuses a second open row;
  - the trigger names every field after load (0 blank);
  - demo reset empties `library_change` and `approved_source`;
  - the Live combination's draft hash is unchanged after the migration ("Nothing has changed").
* **Release integrity:**
  - WAITING and RETURNED are refused on both `/combinations/:id/approve` and `/pack/release`;
  - a library-only release publishes and stamps `released_in`;
  - the K1 undecided-field block holds.
* **Hostile files:** the IRCC page refuses look-alike hosts, `@`, newlines, upper case and `javascript:`. K2 live mode is refused (409) and `/path-proposal` is author-only.
* **Browser checks:** axe was clean on every page I visited. The held, change and To review pages fit at 1024 px and 640 px. To review answered in 60 ms with 38 rows. The 100-program budget was not exercised.
