# Break report: N8 (F2 official-pages confirm, DV-d1-1, DV-d1-2) at commit 0810c25e

Branch `claude/forms-n8-devin-06zafk`, diff `48c8fbef..0810c25e`. Isolated copy `brkf2` on :4456 (fresh database, sample from
`POST /demo/reset` + `/demo/load`), web built from the worktree, Chrome headless + axe (WCAG 2.2 AA). US$0, no AI. Copy stopped.
Paths below are under `prototype/studio/`. Sample ids change on every load; look them up with
`select combination_key, id from combination` and `select id, kind, file_name from source_attachment where combination_id=…`.

## Blocker
None found.

## Major
**M1. An author overwrites the immigration expert's choice (P-176).** Rule: any choice other than the rules' one match belongs to the expert.
Steps: wp.family (one match M, guide page G). `POST …/official-pages/confirm {attachmentId:G}` as user-C → 201, `user-C|expert`.
Then the same as user-A with `{attachmentId:M}` → 201, row now `user-A|author|M`. The expert's decision is silently replaced.
Two people saving at once also ends in last-write-wins: there is no version check and no "already chosen by the expert" refusal.
Expected: 409 (or 403) when an expert-tier record exists and the actor lacks `sme`, or at least a visible replace step.
Where: `api/src/official-pages.ts:61-67` (mayAct judges only the new choice; `upsert` never reads the stored tier).

**M2. A "sure" author confirmation stays done after the rules stop being sure.** Steps: user-A confirms M on wp.family
(1 match, author tier). Attach a second apply page (upload `visa-package-india.html` to wp.family via `POST /combinations/:id/attachments`).
GET official-pages → `matches` would now be 2, but state stays `confirmed`, and `/summary` step 1 shows `done`,
"Confirmed by the configuration author · sure". With two matches P-176 makes it the expert's choice; user-A re-confirming
the same page now gets 403, yet the old record still counts.
Expected: a record saved as `author` with `matches:1` counts only while the rules still find exactly that one page (the
stored `matches` column exists but is never compared). Where: `engine/official-pages.ts:24`.

**M3. "Needs you" and Next now point to a control that does not exist.** Before N8 step 1 had no item. After it, on the
sample: user-C Needs you = 5 (every sample combination with a page), user-A = 2; the cards show "Needs you: Confirm/Choose
the checklist page" and Next goes to `/c/<id>/forms?focus=pages%3Arecord`. Nothing in `web/src` calls `official-pages` or
handles `pages:record`. Following the card's button lands on the combination page with no page control and focus on `<body>`.
The engine already states the rule for this (`engine/setup-checklist.ts:47-48`, confirm_people: "a mark nobody can clear is
noise", kept out of Needs you). The control is planned for slice C (`plan.md` row C), so `confirm_pages`/`choose_pages`
should stay out of `REVIEWS` (line 49) until then, or the UI should ship with this change. The demo updates itself on merge,
so the founder would see it.

## Minor
**m1. Confirm is accepted on a retired combination.** `update combination set retired_at=now()` on vv.single → confirm 201.
Sibling writes refuse with 409 "Retired … Restore it on Structure first" (`api/src/fact-sources.ts:47`, `person-checklist.ts:33`).
Where: `api/src/official-pages.ts:37-44` (load never reads `retiredAt`).

**m2. Re-confirming is never a no-op.** 12 parallel identical confirms by user-A → all 201, 1 row (the race held), but
**12 audit lines** "confirmed the official page" for one decision. A repeated save also moves `confirmed_at` and the confirmer.
Expected: same page and same tier → 200, no new audit line.

**m3. The audit line does not say what it replaced.** For the M1 overwrite the line reads "Configuration author confirmed the official page
of 'With an LMIA': Work permit outside … (… sure)". It does not mention the expert's earlier choice of Guide 5487. Where: `official-pages.ts:68`.

**m4. A record is orphaned when its combination is deleted.** `DELETE /combinations/<fs.outside>` (reason given), approved
by user-B via `POST /library/changes/:id/approve`: combination and attachments are gone, but the `combination_official_pages` row stays.
The table has no foreign key, although the migration says "no other table refers to it"
(`prisma/migrations/20261031120000_f2_official_pages/migration.sql:5-19`). It does no harm today (the state needs an attached
page, and demo reset clears the row by workspace), but it is left-over data.

**m5. The refusal text contradicts itself and shows an internal code.** user-A picks the guide on vv.single (1 match) →
"The rules did not find exactly one apply page here (1 match, and another page was chosen), so the immigration expert chooses
it (P-176)." The rules did find exactly one. "P-176" is shown to people. Where: `official-pages.ts:64`.

**m6. Case people get the configuration explanation on POST.** user-P (Client A) → 403 "…the immigration expert chooses it…
Client A (simulated) does not hold that duty". GET for the same person says "Not for case people". The POST should use `readerOf`
or a matching message.

**m7. Odd body text is not in words.** `[]` → 400 "Invalid input: expected object, received array" (zod default). Where:
`official-pages.ts:16`. (`null` or invalid JSON give raw parser text; this comes from the global body parser and is not new.)

## What held
* Roles: no or unknown `x-actor` → 401 (also `"user-A, user-C"`). Approver, case officer and client → 403, nothing stored.
  Author passing over the one match → 403. Author on 0 matches → 403. Persona header `sme` works the same as user-C (by design).
* Wrong target: another combination's attachment, the IMM 5905 PDF instructions, an upper-case copy of a valid id → 400.
  A non-uuid or unknown combination → 404. An old combination id after reset → 404 for GET and POST (workspace scoping).
* Bodies: missing or number `attachmentId`, a non-uuid, an extra field → 400 in words.
* Race: 12 concurrent upserts → one row, no 500 (native upsert on the unique `combination_id`).
* Cache: the catalogue and `/summary` show the confirm at once (the audit line changes the cache key). fs.outside went 0→1 of 5,
  "Confirmed by the immigration expert".
* Detached page: there is no detach endpoint; reset and lifecycle delete were the only removals tried, and both drop the state as expected.
* Demo reset clears every record, including the orphan from m4. Load starts every combination at `proposed` or `no_record`.
* DV-d1-1: the Used-by count is a `<button>` (link colour, no dotted or line-through decoration) at 1440, 1024, 720 (≈200 % zoom) and
  390 px. Tab reaches it with a visible 3 px ring, and the tip lists the names on focus. Enter and Space open the drawer, which
  shows "Where it is used" without scrolling. Focus moves into the dialog, and Escape returns it to the count. A mouse click opens one dialog and does not navigate.
* DV-d1-2: while the list loads, the container has `role="status"` and `aria-busy="true"`. axe is clean while loading and once loaded at
  1440, 1024, 720 and 390 px. No page errors.
* Not a finding (existing layout): at 390 px the Used-by column sits off the right edge of the table and needs a horizontal scroll.
