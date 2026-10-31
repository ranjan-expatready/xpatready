# Break report: C1.8 copies per form line (commit 727ea2a7)

Breaker: independent agent, fresh context (did not build it). Date: 31 Oct 2026.
Target: `claude/youthful-pascal-ecazqy` at **727ea2a7** (diff `origin/main...727ea2a7`). Copy: isolated `screens_brk` on :4443 (`xr_studio_screens_brk`), sample loaded, combination `wp.family` ("With an LMIA", READY). The server ran 727ea2a7 code. 6a0535c4 and 5a315d9c landed on the branch while I worked; I did not test them again (see M2). No live AI, US$0.
Scope (P-26): the setup side only (column, contract, PATCH, snapshot, Undo, Forms tab row and drawer). Cases filling N copies belong to runtime and are not findings.

## Verdict: 0 Blocker · 2 Major · 4 Minor

## Major
**M1. A form added back after a released removal loses its copies (it comes back as 1).** `api/src/form-lines.ts:43-44` (`addFormLine`) builds the returning row from a fixed list of fields: who, attachMode, predicateJson, conditionPlain, sourceQuote, channel and signature. `copies` is not on that list, although the comment above says the line "comes back with the content it had when removed".
Repro (API, x-actor user-A):
1. `PATCH /api/combinations/<wp>/forms/IMM%205257%20SCH1 {"copies":6,"minAge":18,"signedBy":"person"}` → 200.
2. Release: submit as A, sign as B and C, approve as B.
3. `DELETE /api/combinations/<wp>/forms/IMM%205257%20SCH1 {}` → 200. Release again.
4. `POST /api/combinations/<wp>/forms {"formKey":"IMM 5257 SCH1"}` → 201.
Expected: copies 6 on the new draft. Actual: copies **1** (who and channel are kept). minAge (18 → null) and signedBy (→ null) are lost the same way: that loss predates this commit, but copies is a new case of it. Nothing tells the author: the row just stops saying "· 6 copies each".
An Undo of a removal that was not released yet, and a re-add before any release, both kept 6 (held).

**M2. A checklist (document) line accepts copies. The value is released, but no screen shows it and the drawer cannot clear it.** At 727ea2a7, `api/src/studio.ts:570-572` accepts `copies` on any line.
Repro: `PATCH /api/combinations/<wp>/forms/IMM%205488 {"copies":5}` → 200.
- The Forms tab row says "Checklist · not filed", with no copies.
- The drawer has no Copies field (`forms.tsx:292`). Every drawer save still sends the hidden value back (`forms.tsx:240, 257-259`), so the UI cannot clear it.
- `GET …/config` carries `{"form_number":"IMM 5488","form_kind":"document",…,"copies":5}`, so the fingerprint moves. The approver sees only "Form IMM 5488 changed".
- Release puts the value into the frozen snapshot.
Expected: refused on the field. Actual: saved and released, and nobody can see it.
The reviewer filed this as m2 (Minor). I rate it Major because the value reaches a release and no screen shows it. Commit 6a0535c4 adds `DocumentLineEdit` (`copies` must be 1 on a document line). Its test should also cover a document line that already holds copies above 1.

## Minor
**m1. Copies typed in non-ASCII digits are dropped without a word, and the line saves as 1.** `forms.tsx:292` keeps only `[0-9]`; `forms.tsx:257` turns an empty field into 1.
Repro: IMM 5707 at 7 copies → Change IMM 5707 → clear Copies → type full-width "３" (or Arabic-Indic "٣") → the field stays empty → Save to draft.
Actual: toast "IMM 5707 saved to the draft", and the server holds copies **1**. Expected: either the digit is accepted, or the field says why it is empty.

**m2. Typing "10" leaves "1", with no message.** `forms.tsx:292` (`.slice(0, 1)`). An author who means 10 saves 1 and is never told that 9 is the most. Expected: the 1-to-9 error.

**m3. Copies sent together with a removal are kept on the removed line and come back later.** `studio.ts:570-575` accepts `copies` alongside `retire: true`.
Repro: `POST …/forms {"formKey":"IMM 5257"}` (a new line, never released) → `PATCH …/forms/IMM%205257 {"retire":true,"copies":9}` → 200 → `POST …/forms {"formKey":"IMM 5257"}`.
Actual: the line returns with **9 copies**, a value no screen ever showed. Expected: the edit fields are refused or ignored when the request removes the line. Only a direct API call can do this.

**m4. The error for a huge value says the same sentence twice.** `PATCH … {"copies":1e308}` (or `99999999999999999999`) → 400, detail "Copies is a whole number from 1 to 9. Copies is a whole number from 1 to 9." Both the `int` and `max` checks fire (`contracts/workspace.ts:94`). Expected: the sentence once.

## What held
- **Roles.** user-B, `approver`, user-C, `sme`, user-O and user-P get 403 on PATCH copies. An unknown or empty x-actor gets 401. Undo as user-B gets 403.
- **Values.** `"2"`, `" 2 "`, -1, -0, 0, 10, 2.5, 9.000000000000002, null, true, `[2]`, 1e308 and 1e20 → 400 on field `copies` with the words, and the saved value stays. A missing `copies` changes nothing. `1e0`, `2e0` and `9.0` are taken as 1, 2 and 9 (correct JSON numbers).
- **Database check.** `UPDATE … SET copies = 10`, `0` and `NULL` are all refused by `combination_form_copies_check` or NOT NULL.
- **Two sessions.** Two PATCHes with the same `baseRevision` at once → one 200 and one 409 "Changed by Configuration author at …". A stale drawer shows that 409 inside the drawer, and the other session's 8 stays.
- **Undo.** Exact after a copies edit. After a later "who" edit, the first Undo restores who and keeps 3 copies, the second restores 1 copy (PUBLISHED). An Undo across a release → 409 "Released since". Undo of a removal brings back copies 6, minAge 18 and signer.
- **Release then edit.** The release snapshot carries `copies: 7`. A later "who" edit makes draft v+1 that still has 7, and Undo goes back to the published row with 7.
- **Removed line.** PATCH → 409 "was removed … Add it again".
- **Fingerprints of untouched combinations.** I ran origin/main (de82e7fd) and 727ea2a7 against the same database. All four untouched combinations give the same sha256 on both; only the combination I edited differs.
- **Odd spellings.** The code `imm  5475` normalises to IMM 5475. An unknown or malformed combination id → 404.
- **Keyboard only (1440).** It takes 43 Tabs to reach "Change IMM 1295". Enter opens the drawer. Focus order is Who fills it › From age › Copies. Tab to "Save to draft" and Enter saves 4, and the row says "Each applicant · 4 copies each".
- **Widths.** At 390 px, 1024 px and 1440 at 200 % (720 px) there is no sideways scroll. The row text wraps cleanly, and the Copies label is tied to its input (getByLabel works).
- **Reload or Back mid-edit.** Nothing is saved; the server value is unchanged.

## Not findings (seen; outside this slice or predating it)
- An empty `PATCH {}` on a published line makes a draft and moves the fingerprint. This is the same for any field.
- At 390 px the drawer footer cuts off "Save to draft".
- Focus goes to `<body>` when the drawer closes.
- Enter inside a drawer field does not submit.
- The "Who fills it" hint contradicted Copies (reviewer m1). It was changed in 6a0535c4.

## Not run
- Hostile uploads, the planted-instruction PDF, and long or non-English text: this slice adds only a 1-digit number. Non-ASCII digits are covered in m1.
- 100 programs / 400 combinations against the budgets: copies adds no request (it rides the existing `workspace?tab=forms` and `config` reads), but I did not measure it.
- A screen reader.
