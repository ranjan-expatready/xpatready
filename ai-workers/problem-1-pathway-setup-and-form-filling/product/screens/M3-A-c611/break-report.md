# Break report: C6.11 Sample firm, users and case team

Branch `claude/loving-cannon-husr9q` at `a9b54597`. Isolated copy `brk_c611` on :4436 (database `xr_studio_brk_c611`), seeded with `setup_visitor_visa.ts` (13/13). Stopped at the end. US$0, no model calls. Scope: the M3-11 row and BR-20 paragraph of `screens/M3-agent-view/concept-draft.md` (Sample firm and solo firm, duties, representative of record, case officers, assign and reassign with history, IMM 5476 change event, firm isolation, SI-9 and SI-15 chips).

Setup used below: `B=http://localhost:4436/api/runtime`, combination `C` from the setup output. `mk A REF` means `POST $B/cases` as `x-actor: A` with `{combinationId:C, reference:REF, clientActor:"user-P", principal:{displayName:"Sample P"}}`.

## Blockers
None found.

## Major
**M1. The activity feed shows another firm's cases and case-team changes.** Steps: as user-R, `mk user-R REF-R1`, then `PUT $B/cases/<id>/team/representative {"userId":"user-T","reason":"Sample reason"}`. As user-S (the solo firm), `GET http://localhost:4436/api/activity`. Expected: user-S sees only its own firm's case events, the same as `GET /cases/:id` (404) and `GET /cases` (its own cases only). Actual: 200 with every Sample firm event, for example `Representative made user-R the representative of record on case 696a5dc5 (was user-T); a new IMM 5476 is needed` and `Representative opened case 696a5dc5 … representative of record user-R, case officers user-O`. It works the other way too: user-R sees the solo firm's openings. So case ids, team members and representative changes cross firms. `api/src/main.ts:79` allows any `case` duty and calls `activity()` (`api/src/studio.ts:839`), which filters by workspace only. C6.11 put the team into the `opened` summary (`api/src/runtime.ts`, audit line in createCase) and added three team events (`api/src/team.ts:79,91,102`).

**M2. A case reference shows whether another firm already uses it.** Steps: `mk user-R REF-R1` (201), then `mk user-S REF-R1`. Expected: the solo firm can use its own reference, or at least learns nothing about another firm. Actual: 409 `A case with this reference already exists`. The unique index is `@@unique([workspaceId, reference])` (`prisma/schema.prisma:1228`) and both firms share one workspace. Result: one firm cannot use a reference another firm holds, and can probe which references exist. The error is raised at `api/src/runtime.ts:107`.

**M3. The idempotency key is shared across firms: user-S's first request returns 404, and a key that exists elsewhere shows up as a 409.** Steps: `mk user-R REF-K1` with `"idempotencyKey":"key-shared-001"` (201). Then as user-S, send the same body and key. Actual: 404 `No such case.`, and nothing is created for user-S. Then send user-S `REF-K2` with the same key. Actual: 409 `This idempotency key was already used for a different case request`. Expected: keys are scoped to the firm, or at least to the actor. The replay at `api/src/runtime.ts:67-72` looks the key up across the whole workspace, its fingerprint leaves out the actor and firm, and it ends in `get()`, which refuses the cross-firm case.

## Minor
**m1. Invisible reasons pass the "at least 5 characters" rule, so a history line can have a blank reason.** Steps: `PUT $B/cases/<id>/team/representative` as user-R with `reason` set to six U+0301 (combining accent), or five U+3164 (Hangul filler), U+2800 (braille blank) or U+FE0F (variation selector). End-officer reason five U+115F. Every one returned 200 or 201. In the database, `end_reason` holds only those characters, and the dialog's History shows empty quotes. Zero-width space, U+202E and lone surrogates are refused correctly. The cause is the `INVISIBLE` set behind `clean` (`contracts/runtime.ts:23`).

**m2. A line break in the Reason box is refused with a misleading message.** The reason fields are `<Textarea>` (`web/src/runtime/team.tsx:106` and the "Take off" form). Pressing Enter in one makes the server reply 400 `Remove the control or invisible characters from this text.` (`contracts/runtime.ts:23` refuses `\n`). Either the box is the wrong control, or the message should say "one line".

**m3. A refusal of the person you chose appears under Reason. "Change to" never shows an error.** `onErr` puts `field("userId") ?? field("reason") ?? message` into one slot (`team.tsx:86`), and the select has `error={null}` (`team.tsx:105`). In the browser at 1024 px, the select gets no `aria-invalid` and Reason gets `aria-invalid=true` even when the server named `userId`.

**m4. After a stale save is refused, the dialog stays stale.** Steps: open Case team as user-R in tab 1. In tab 2, change the representative to user-R. Back in tab 1, the dialog and chip still show "Second representative", and "Change to" still offers user-R. Submit with a reason. Actual: the 409 `Representative (Sample) is already the representative of record; nothing changed.` appears under Reason, but the dialog, its IMM 5476 notice and the chip are not refreshed (`useAction` invalidates only on success). Nothing is corrupted, because the server is right. Also, PUT has no "expected current representative": a stale tab that picks a choice that is still valid replaces the change made in the other tab without warning.

**m5. Keyboard: focus is lost when the dialog closes, and it does not land on a field when the dialog opens.** Tab reaches "Case team" and Enter opens it. Focus then sits on the dialog container, because the fields load after the skeleton. Escape closes it, and focus lands on `BODY`, not on the "Case team" button (the dialog is unmounted, `team.tsx:75`). Tab order inside the dialog is otherwise logical: the Change representative and Assign buttons are skipped while disabled.

**m6. You can take off the last case officer, with no warning.** Steps: `POST $B/cases/<id>/team/officers/user-O/end {"reason":"Sample reason"}` on a Sample firm case with one officer. Actual: 201, and the chip reads `… · no case officer`. The solo firm can do the same to user-S. The concept says each case has "assigned case officers". This needs a rule or a confirm.

**m7. Someone who is not firm admin chooses the team when opening a case.** `mk user-O N-09` with `"representative":"user-T"` returns 201, with `assigned_by user-O`. The firm admin rule (`cannotAssign`) applies only to changes made after opening. If frame 1 intends "the opener chooses", note that in build-notes. Otherwise it gets around "the firm admin assigns".

**m8. The SI-15 chip is missing.** The M3-11 row lists "chips SI-9, SI-15". Only `data-stand-in="SI-9"` renders (Open a case: `['SI-9']`), and `grep SI-15 web/src` finds nothing.

**m9. Small wording and shape issues.**
- The IMM 5476 notice reads `changed on Nov 1, 2026, 01:04 p.m.. IMM 5476` (double full stop; en-CA format plus the literal ". ", `team.tsx:98`).
- `caseOfficers:"user-O"` (a string) returns two errors on one field, one of them `A case has at most 5 case officers.`.
- Six copies of `user-O` are refused as "more than 5", although they collapse to one after de-duplication.
- History rows opened in the same transaction are ordered by random uuid (`team.ts:41`).
- The UI history never shows who assigned or ended a row, although the API returns `assigned_by` and `ended_by`.

## What held
- **Roles.** user-T and user-O: 403 on all three changes, 200 on reading the team (the dialog says "Only the firm admin changes the case team"). user-P and user-Q: 403 everywhere, and no team chip on the client's page. user-A, B and C: 403. No header, empty header and `user-X`: 401. user-S on a Sample firm case: 404 for get, team, questionnaire, forms and every change. user-R on the solo case: 404. `GET /cases` is filtered to your own firm.
- **Choosing people.** user-S, user-ZZZ, user-P and user-A as the person: 422 `That person is not in your firm.` user-O as representative: 422 "not a licensed representative". Same representative again: 409. `" user-T "` is trimmed. `USER-T`, `user-Т`, null, "" and numbers: 400.
- **Request bodies.** A non-JSON body gives 400. An array or empty body gives 400 with field errors. A 301-character reason: 400. A reason of NBSP or ideographic spaces only: 400.
- **Malformed ids.** A non-uuid or unknown case id: 404, not 500. A hostile officer path segment: 404 "not a case officer".
- **Opening a case.** Another firm's representative or officer: 400 on the right field. `[]`: "at least one". Duplicates and spaces are de-duplicated.
- **Concurrency.** 10 parallel representative changes (alternating R and T) were serialized: always exactly one current representative of record, and each refusal was a clean 409. 10 parallel adds of the same officer: 1×201 and 9×409. 10 parallel ends: 1×201 and 9×404. The partial unique indexes and the CHECK constraints hold in SQL.
- **History and IMM 5476.** The earlier representative's row keeps `ended_by` and its reason. After R→T→R the result is `new_needed:true, earlier:user-T`. The facts fill from the current representative (R000002 and R000000).
- **Cases opened before the migration** (team rows deleted). The team reads `representative:null, officers:[], history:[]`, the chip reads "No representative of record yet · no case officer", ending an officer gives 404, and the first add and the first representative work (`new_needed:false`).
- **Size.** A history of 200 changes: `GET team` takes 23 ms for 51 kB, and `GET case` takes 16 ms. At 200 % zoom the dialog does not overflow sideways (scrollWidth equals clientWidth, 894). No page errors at 1024 px.
