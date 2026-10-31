# N7 break report: DV-bb-9 (withdraw is the proposer's only) and DV-bb-8 (one upload door)

Scope: the withdraw rule for remove/retire/restore (structure_node, combination, library_form), the Withdraw control on
`/review/change/:id`, and the removal of `POST /combinations/:id/attachments`. US$0, no model call, never :4400, no *_LIVE.
Only one author exists (user-A), so a second author was made with SQL (`library_change.proposed_by='user-C'`, and
`program_def.created_by='user-C'` so a delete waits for a second person instead of running at once).

## Round 1: commit 10939d21 (copy `n7break`, :4436 then :4438)

Run note: at 02:18:19 another copy (`rev_n7b`, `xr_studio_rev_n7b`) started on :4436 and stopped mine. Probes from about
02:18 reached that copy; all were read-only or 4xx, so nothing was written. I restarted mine on :4438 and ran them again.
Every result below is from `xr_studio_n7break`.

**B1 · Major (latent): any author can "Send again" another person's returned remove/retire/restore, then approve it alone.**
Repro: C's structure delete is returned. A sends `POST /library/changes/:id/resubmit {"reason":"I changed someone else
proposal"}` and gets 201: WAITING, reason overwritten, proposed_by still user-C. A then sends `POST …/approve` and gets 201:
RELEASED, decided_by user-A, the name is deleted. Audit: created, proposed (A), "sent again" (A), then approved by A.
Cause: `Lifecycle.resubmit` (`api/src/lifecycle.ts:242-243`) checked only the author duty. The second-person check
(`library-changes.ts:80`) compares the approver only with `proposedBy`. The page offered Send again to every author
(`review-items.tsx:97`) while saying "Only Content reviewer can withdraw it".

**B2 · Major (latent): a new shared field (field ADD) can be withdrawn by an author who did not propose it.**
Repro: field/ADD/WAITING change with proposed_by user-C. As user-A, `POST …/withdraw` returns 201 WITHDRAWN. On real data
this also sets its form fields back to "no decision" (`library-changes.ts:164-166`). Cause: the DV-bb-9 check sat only in
`withdrawLifecycle`; the field branch of `withdrawChange` (`:152-157`) and the page (`review-items.tsx:159`) skipped it.

**B3 · Major (latent): an author can rename another person's returned field and approve it alone.**
Repro: field/ADD/RETURNED with proposed_by user-C. As user-A, `resubmit {"reason":"…","label":"Renamed by A"}` returns 201,
then `approve` as user-A returns 201: APPROVED, label "Renamed by A", decided_by user-A. `library-changes.ts:134` allows
"or a configuration author" on purpose; with the check at `:80` that lets one person pass the second-person rule.

**B4 · Minor: Program structure offered "Withdraw" on another person's waiting change; the server then refused it.**
At 1024 px as user-A, the row of user-C's delete showed Withdraw, opened by keyboard, took a reason, then got 403
(in words). Cause: `rowAction` (`lifecycle.ts:115`) ignored `actorId`; the Forms library did it right (`form-row-action.ts:10`).

**B5 · Minor (existed before): `POST /combinations/:id/attachments/sample` with no JSON body returned 500.**
`TypeError … reading 'officialFile'` at `api/src/main.ts:83`. Nothing was stored (27 attachments before and after).

**Held in round 1**
- Lifecycle withdraw by a non-proposer author returns 403, naming the proposer, for all three kinds and in WAITING, RETURNED
  and APPROVED. Other people (B, C, O, P, Q, persona names) get 403 "no author duty". No header, `bogus`, `USER-A` or
  `user-A,user-A` get 401. `" user-A"` is trimmed and still refused as a non-proposer.
- Races: six rounds of withdraw, approve and return sent at once each ended WITHDRAWN only. Approve got 409 and the audit
  has no duplicates. Two withdraws at once gave 201 and 409. Undo keeps its proposer-only check (`lifecycle.ts:294-295`).
- `/review/change/:id` (RETURNED, not the proposer) has no Withdraw. Checked by keyboard (40 Tab presses), at 1024 px and
  at 200 % zoom.
- DV-bb-8:
  - POST and PUT to `/combinations/:id/attachments` return 404, also with a trailing slash, different case or `?x=1`.
    The GET list works.
  - A test PDF with planted instructions sent to `POST /intake` was held, "Nothing was added or attached".
  - `library/forms/upload` with forCombination goes through `intake.intake` (`upload-run.ts:142`).
  - `attachments/sample` takes only official-library files (`../../etc/passwd` gives 400).
  - "+ Add" (`/combinations/:id/lines`, `programs.ts:465`) only attaches a library edition's file, for authors only
    (user-P gets 403).
  - `guide-sources.ts` only links library guide editions.

## Round 2: commit cddef56a (copy `n7break2` on :4439; `git diff 10939d21..cddef56a`)

Web rebuilt with vite, fresh database, `POST /api/demo/load`; second author made with SQL as before.

**Re-tried**
- **B1 fixed.** Non-proposer resubmit gets 403 "Only the person who proposed a change can send it again…", for a structure
  delete and a library form retire alike, and the reason is unchanged. The proposer's own resubmit gets 201.
  `/review/change/:id` (returned, not mine) shows no Send again and no Withdraw, only "Only Content reviewer can send it
  again or withdraw it."
- **B2 fixed.** A non-proposer withdrawing a field ADD gets 403 when it is WAITING and when RETURNED. On the change page a
  non-proposer sees no Withdraw (field waiting and field returned).
- **B3 still open, and the only open hole of B1-B5 (left as a product question for the Lead).** On cddef56a, non-proposer
  resubmit `{"label":"Renamed by A"}` returns 201, approve by the same user-A returns 201: APPROVED, label "Renamed by A",
  proposed_by user-C, decided_by user-A. The page still offers this person Send again (`Correct`, `review-items.tsx:149`).
- **B4 fixed.** For user-A, `GET /structure` gives another person's waiting or returned delete `{kind:"DELETE",
  why:"A change to it is waiting for a second person."}` with `pending.mine:false`. The proposer's own row gives WITHDRAW.
  In the browser the greyed Delete is `aria-disabled`; Enter on it opens no dialog and sends no request. Send again shows
  only on own rows. No page errors.
- **B5 fixed.** No body, or a multipart body, returns 400 "That sample is not in the official library."
- Withdraw by a non-proposer still gets 403 in WAITING, RETURNED and APPROVED. The proposer's own withdraw still gets 201
  (combination retire).
- To review queue for user-A: another person's returned lifecycle change is "waiting", with "The person who proposed it
  sends it again or withdraws it." and no action. The proposer's own sent-again change is "waiting" ("You proposed it…").

**New in cddef56a**

**N1 · Minor: Program structure contradicts itself on another person's returned change.**
At 1024 px as user-A, the row "Break alpha" reads "Deletion returned · Returned by Approver: Returned: check" and, right
below, "A change to it is waiting for a second person." It waits for its proposer, not a second person. The row does not
say who can act; the change page and the queue do. Cause: the greyed row reuses `WHY.waiting` for every status
(`api/src/lifecycle.ts:116`). The Forms library row has the same words (`form-row-action.ts:10`).

**N2 · Minor (latent; product question): a returned remove/retire/restore whose proposer is gone can never be cleared, and it blocks its name.**
Repro: set a RETURNED structure delete's proposed_by to `someone-gone`. Then:
- resubmit and withdraw as user-A both get 403 ("Another person proposed this one…");
- approve and return as user-B and user-C get 409 "already returned";
- a new delete or retire of the same name gets 409 "A change to it is already open: approve, return or withdraw it first".
None of these can be done. Before cddef56a, any author could Send it again, which was a way out. Now nobody can.
Simulated people never leave, so this cannot happen today.

**Held in round 2:** `withdrawLifecycle` no longer checks the proposer itself, but its only caller is `withdrawChange`, which
checks before it (`library-changes.ts:156-158`, grep). A lifecycle resubmit carrying a label still gets 400 before the
proposer check, so it does not reveal the proposer's name.
