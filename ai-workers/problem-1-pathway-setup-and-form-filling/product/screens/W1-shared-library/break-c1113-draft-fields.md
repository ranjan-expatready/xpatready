# Break report: C11.13 Draft fields (commit 7396ca5a)

Scope: GET/POST `/api/library/forms/:code/draft-fields` (`api/src/field-drafts-routes.ts`), conversion (`api/src/field-draft-items.ts`), the "Fields drafted by AI" drawer section (`web/src/components/draft-fields.tsx`). Run on my own isolated copy `brk_c1113` on :4454 (stopped afterwards), with demo reset + load before each attempt. Saved readings were written with `tests/field_draft_fixtures.ts` and cleared after each attempt; at the end `p2/runs` had no `brk*` file. No model call, US$0: the spend-ledger checksum was `f4f4eef39e0a` both before and after. Paths below are relative to `prototype/studio/`. I used IMM 5257 SCH1 (09-2023), because another agent's fixtures (`rev1113`) were showing up in the shared `p2/runs` for IMM 5409 while I worked.

## Findings

**M1 (Major): one field whose name collides makes the whole batch fail with 409, on every click, and the author cannot fix it.**
`fieldItems` checks a name for collision only once (`field-draft-items.ts:71-73`). The suffixed name `"<label> · <id>"` is not checked again, and `normalizeLabel` removes the spaces, dots and `·`. So the suffixed name can match a name already in the batch. `insertProposals` then refuses the whole batch (`proposals.ts:124`).
Repro: save a draft reading with fields `person.ab`, `person.abpersonab`, `person.a_b` (in that order) and POST `{mode:"replay"}`. Result: `409 "Proposal 3 (field \"abpersonab\") is in this batch twice: one item per identity."` Nothing is written. The plan still says `saved`, the button stays live and every click gives the same 409. Screenshot: the author sees that sentence as a toast and has no next step.
The same thing happens with long ids. `labelOf` cuts names at 120 characters (`field-draft-items.ts:40,72`), so two ids that share their first ~120 characters both become the same cut name. Repro: `person.<130×"x">_a` and `person.<130×"x">_b` give `409 "Proposal 2 (field \"xxxx…\") is in this batch twice"`.
Expected: each item has its own name (check again after adding the suffix, or suffix with a counter), or the colliding item is dropped with its reason while the rest of the batch goes through.

**M2 (Major): a field with an area longer than 60 characters makes the whole batch fail with 400.**
`FIELD_ID` has no length limit and `fieldRule` lets the field through. `payload.subject = f.id.split(".")[0]` (`field-draft-items.ts:74`) is then longer than the contract's `subject max(60)` (`contracts/proposal-item.ts:34`).
Repro: fields `person.family_name` and `<70×"a">.name`. Result: `400 "Proposal 2 (field) does not follow the queue's contract: payload.subject: Too big: expected string to have <=60 characters; …"`. No item is proposed, and the same happens on every click.
Expected: `fieldRule` drops the reading with a plain reason (an id limit that keeps every derived contract field within its limits). One bad item should never block the rest. The same gap applies to any other contract limit that `fieldRule` does not check.

**M3 (Major): the name-twin conversion ignores the field's area, meaning and type, so a person's field is offered as a reuse of a different library field.**
`sameInLibrary` compares only the normalised label (`field-drafts-routes.ts:117-118`, `proposals.ts:56-60`). Library labels carry no area ("Name", "Address", "Start Date"), while `labelOf` drops the area for `person`/`case`. Both readings agreed in each case below:
- `person.name` ("The person's full name as on the passport") → reuse of `organisation.name` (legal name of the employer). Reason: only "Same name as the library field organisation.name: reuse it."
- `person.address` (home address) → reuse of `organisation.address`.
- `person.start_date` ("Start of studies", type **text**) → reuse of `relationship.start_date` ("Date of marriage…", type **date**).
Accepting each one on its own through `POST /api/review/proposals/decide` returned 201 `landedAs: "relationship.start_date"`. The edition's form would then fill the job or study start date from the marriage date. Several reason texts also contradict themselves: "…reuse it. No existing key; partly similar to person.travel_start_date (0.52). A person decides whether it is the same meaning."
Expected: a twin whose area (subject) or value type differs from the library field is not turned into a reuse without saying so. At minimum it waits as Decide, with the library field's meaning shown next to the reading. Better, it stays "new" under a name that includes its area.

**m1 (Minor): a draft where every reading fails the rules uses up the edition's one draft with 0 fields, and the UI links to an empty group.**
Repro: fields `Bad`, `x`, `person.y` with an empty meaning. POST returns 201 with `proposals: 0`, and the job message says "Not proposed (failed the rules): 3". The drawer then says "Drafted once … 0 fields, 0 still waiting" and shows "Open its fields on To review › Proposals". That link opens "Nothing waits in this group any more: it may have been decided, or the demo was reset." The dropped readings and their reasons (`detail.dropped`) are shown nowhere, and Draft fields can never run again for this edition. Expected: with 0 proposals, record no job (or one that does not count as drafted), and say why nothing was proposed.

**m2 (Minor): duplicate ids in one reading are merged without a word.**
`compareRounds` keeps the first answer for a key (`engine/agreement.ts:19`). Repro: `person.zz_one` (text) twice with different meanings and types gives 1 proposal. The second reading is not listed in `dropped` and is not mentioned in the job message.

**m3 (Minor): an internal id leaks into the shared library.**
Accepting the collision-renamed item "Family name · case.family_name" (from `person.family_name` + `case.family_name`) created the library field `case.family_name_case_family_name` with the label "Family name · case.family_name" (status DRAFT).

**m4 (Minor): a very large saved reading ends in a generic 500.**
3 000 fields on a 57-box form: 201 after 30.4 s, with 3 000 proposals and no limit tied to the box count. 7 000 fields: `500 "Something went wrong on the server"` at 60.1 s (the transaction timeout `QUEUE_TX`). It rolled back cleanly, but the person gets no plain reason, and the workspace-wide `proposal-door` lock was held for 60 s. A live reading is limited by `partOutputTokens`, so this only happens with a hand-made or corrupt saved file.

**m5 (Minor, shared wording): a one-round item says "Its two readings differ".**
Draft-only items (`agreement: one_round`) carry `bulk_why: "Its two readings differ: open it and choose."` (`proposals.ts:309`), but there is only one reading.

## What held
- **Money:** `mode:"live"`, `["live"]` → 409 "live AI is off" with the cost and nothing sent. `LIVE`, `fill` and `{a:1}` → 400 in plain words. No `launch`/live line in the API log, and the ledger checksum did not change.
- **Permissions:** user-B POST → 403 "does not hold the author duty". No actor or an unknown actor → 401 on both GET and POST. user-B GET → 200 read-only, and the UI shows no button.
- **Once per edition:** 12 parallel POSTs → one job, 11 × `again:true`, 2 proposals. A double-click in the browser → 2 proposals.
- **Refusals:** a guide (Guide 5256) and a checklist (IMM 5484) → 409 "not a form with boxes". An unknown code, `../../etc`, a zero-width space before the code, a NUL byte, 5 000 characters, or `IMM 5409/draft-fields` → 404. `imm 5409`, extra spaces and leading/trailing spaces normalise to IMM 5409.
- **Readings and twins:** malformed readings (missing or numeric `value_type`, an uppercase id, a type over 40 characters, a short meaning) were dropped with reasons and the rest were proposed. Hindi meanings were kept, and a 5 000-character meaning was cut to 500. Disagreeing readings → Decide/differ. An unquoted (blank) quote → its reason was stated. A draft-only reading → every item one_round/Decide. An exact library name twin was turned into a reuse rather than causing a 409.
- **Accepting:** new → a DRAFT field. Reuse → `landedAs` set to the existing key.
- **Screen:** at 1024×768 and at 720×450 (about 200 % zoom) there is no sideways scroll and the section is visible. The greyed button is reachable by Tab (5 tabs) and shows its tooltip. The "Draft fields with AI…" menu item opens the drawer from the keyboard. No page errors.
