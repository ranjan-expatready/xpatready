# N7 break report: DV-bb-9 (withdraw is the proposer's only) and DV-bb-8 (one upload door)

Commit 10939d21 on `claude/runtime-devin-fixes` (diff against `origin/claude/reverent-mahavira-cef858`). Isolated copy `n7break`
(database `xr_studio_n7break`), web built with vite, `POST /api/demo/load`. US$0, no model call, never :4400.
Only one author exists (user-A), so a second author was made with SQL (`library_change.proposed_by='user-C'`, and
`program_def.created_by='user-C'` so a delete waits for a second person instead of running at once).
Scope: the withdraw rule for remove/retire/restore (structure_node, combination, library_form), the Withdraw control on
`/review/change/:id`, and the removal of `POST /combinations/:id/attachments`.

Run note: at 02:18:19 another copy (`rev_n7b`, DATABASE_URL `xr_studio_rev_n7b`) started on :4436 and stopped mine. Probes
from about 02:18 went to that copy (all of them read-only or 4xx, so nothing was written). I restarted mine on :4438
(`isolated.sh n7break 4438 restart`) and ran those probes again. Every result below is from `xr_studio_n7break`.

## Breaks

**B1 · Major (latent until a second author exists): any author can "Send again" another person's returned remove/retire/restore, then approve it themselves.**
Repro: C proposes deleting a structure name and the reviewer returns it. A calls `POST /library/changes/:id/resubmit
{"reason":"I changed someone else proposal"}` and gets 201: status WAITING, the reason is overwritten, `proposed_by` stays user-C.
A then calls `POST /library/changes/:id/approve` and gets 201: status RELEASED, `decided_by` user-A, the name is deleted.
Audit: `created, proposed (A), proposed "sent again" (A)`, then approved by A.
Expected: the proposer is the only one who sends again, as with withdraw (the same rule as DV-bb-9). At minimum, the person
who sent it again should not be the one who approves it.
Actual: `Lifecycle.resubmit` (`api/src/lifecycle.ts:242-243`) checks only `need(actor,"author")`. The second-person check
(`api/src/library-changes.ts:80`) compares the approver only with `proposedBy`, never with the person who sent it again.
So one person overrides the reviewer's Return and releases the change. The page also offers "Send it again" to
every author (`web/src/pages/review-items.tsx:97`, `mine || me.has("author")`), while the same panel says
"Only Content reviewer can withdraw it." The person may send it again but not withdraw it, which is inconsistent.

**B2 · Major (latent): a new shared field (field ADD) is withdrawn by an author who did not propose it.**
Repro: insert a `field`/`ADD`/`WAITING` change with `proposed_by='user-C'`. As user-A, call `POST /library/changes/:id/withdraw
{"note":"not mine but gone"}`. Result: 201, WITHDRAWN, `decided_by` user-A. On real data this also sets the form fields
that read the field back to "no decision" and deletes its draft rows (`library-changes.ts:164-166`).
Expected: the same rule as the lifecycle kinds.
Actual: `withdrawChange` (`api/src/library-changes.ts:152-157`) checks only the author duty for this path. The DV-bb-9 check
sits inside `withdrawLifecycle` only, so the field-ADD branch skips it. The UI offers it too: `Correct` always renders
`<Withdraw>` (`review-items.tsx:159`).

**B3 · Major (latent, same class as B1): an author renames another person's returned new field and approves it themselves.**
Repro: insert a `field`/`ADD`/`RETURNED` change with `proposed_by='user-C'`. As user-A, call `POST …/resubmit
{"reason":"rewritten by another author","label":"Renamed by A"}` (201), then `POST …/approve` as user-A (201). Result:
APPROVED with label "Renamed by A", proposed_by user-C, decided_by user-A. One person chose the name and approved it.
`resubmitChange` lets "or a configuration author" correct it on purpose (`library-changes.ts:134`). With the approve check at
`:80`, that lets one person pass the second-person rule.

**B4 · Minor: Program structure still offers "Withdraw" on another person's waiting change, and the server then refuses it.**
Repro: as user-A at 1024 px, open Program structure › Corporate and employers. The row "Break N7 two" (a delete proposed by
user-C) shows a "Withdraw" button. It opens with Enter from the keyboard. Type a reason and click Withdraw: the server
answers 403 "Only the person who proposed a change can withdraw it. Content reviewer proposed this one…".
`GET /api/structure` returns `action.kind:"WITHDRAW"` for this row.
Expected: the same as Shared library › Forms, where `rowActionOf` (`api/src/form-row-action.ts:10`) gives the proposer
Withdraw and gives others the disabled action with "A change to it is waiting for a second person". Also the same as
`/review/change/:id`, which this fix changed.
Actual: `rowAction` (`api/src/lifecycle.ts:115`) returns WITHDRAW for any pending change and ignores `actorId`. The
person only learns the rule after typing a reason. The words are clear and nothing changes, so this is Minor.

**B5 · Minor (next to DV-bb-8, existed before it): the door that remains, `POST /combinations/:id/attachments/sample`, returns 500 when there is no JSON body.**
Repro: as user-A, `curl -X POST -H 'x-actor: user-A' -F files=@x.pdf …/attachments/sample` (or no body at all) returns 500
"Something went wrong on the server". The log shows `TypeError: Cannot read properties of undefined (reading 'officialFile')`
at `api/src/main.ts:83`. Expected: a 400 in plain words. Nothing is stored (27 attachments before and after).

## What held

- **Lifecycle withdraw, each kind** (structure_node DELETE, combination RETIRE, library_form RETIRE): an author who did not
  propose it gets 403 in plain words that name the proposer, and the status does not change.
- **Each open status**: tried with WAITING, RETURNED and APPROVED, and all three refuse an author who did not propose it.
- **Other people**: user-B, user-C, the personas `sme`/`approver`, user-O, user-P and user-Q get 403 "does not hold the
  author duty".
- **Headers**: no header, `bogus`, `USER-A` and `user-A,user-A` get 401. `" user-A"` is trimmed to user-A and the
  proposer check still refuses it.
- **Races**: six rounds of the proposer's withdraw, an approve by user-B and a return by user-C sent at the same moment.
  Each round ended in exactly one outcome (WITHDRAWN). Approve got 409, the name stayed, and the audit has no double entry.
  An earlier round of two withdraws at once gave one 201 and one 409.
- **Undo** (`/library/changes/:id/undo`) keeps its own check that only the proposer undoes (`lifecycle.ts:294-295`, read in
  the code).
- **`/review/change/:id`** as an author who did not propose it, with status RETURNED: there is no Withdraw control, and the
  page says "Only Content reviewer can withdraw it." I checked it by keyboard (40 Tab presses, no Withdraw reached), at
  1024 px, and at 200 % zoom (the text reflows and stays readable).
- **DV-bb-8**: POST and PUT to `/combinations/:id/attachments` return 404, including with a trailing slash, with
  `/Combinations/…/Attachments` and with `?x=1`. The attachment count did not change. GET of the list still works.
  - Other ways to attach files all go through the intake. A test PDF with planted instructions ("Ignore all previous
    instructions…") sent to `POST /intake` with combinationId was "Held for a person… Nothing was added or attached".
    `library/forms/upload` with forCombination goes through `intake.intake` (`upload-run.ts:142`). `attachments/sample`
    only accepts manifest files (`../../etc/passwd` gives 400 "not in the official library").
  - "+ Add" (`/combinations/:id/lines`, `programs.ts:465`) only attaches the stored file of an edition already in the
    library, and only for authors (user-P gets 403).
  - `guide-sources.ts` only links library guide editions.
