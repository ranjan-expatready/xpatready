# QA-219 break report: C3.5, "Add another name" and "Merge into…" on a field's page

Breaker: an independent session that did not build this. Target: commit **5f50a5731** (`git diff origin/main...5f50a5731`), as served by the isolated copy on **:4445**, database `xr_studio_qa219` (API process started 16:55 IST; it does not reload, so every answer below is 5f50a5731's code). Data: Reset to the six, then the saved field maps of IMM 5257 (vv.single) and IMM 1294 (sp.outside) applied exactly as `tests/check_qa219_merge_alias_browser.cjs` does (about 84 s each time). Tools: Node fetch against `/api` with `x-actor`, psql, Playwright Chrome headless at 1440, 1024 and 720 px (200 % zoom of 1440). Live AI off, nothing priced clicked or called, US$0.
**Note:** while I tested (about 17:15–17:25 IST) another session moved this copy to `bd1f6b07e` and left uncommitted edits to `forms.ts` and `library.tsx`. Those edits fix the reviewer's Minors 1–3 and 6 (`review.md`). They are not in the running server, and they do not touch findings 1–4 below.
Rules held to: P-65 (a merge always needs a second person), P-266 (an alias stays direct and logged), PRODUCT §4 (plain words), STANDARDS §3–§9.

## Findings, most important first

**1. Major: two authors can give the same name to two fields at the same moment.**
Steps: `POST /api/library/fields/person.uci/aliases {"alias":"Race name 1"}` and the same body to `person.uscis_number`, sent together with `Promise.all`, both as user-A. Tried three pairs.
Expected: one 201 and one 409 ("already names the field …"), because one name points to one field (P-266, BR "one label one field").
Actual: in 2 of 3 pairs both answered **201**. `Race name 1` is now an alias of both `person.uci` and `person.uscis_number`, and so is `Race name 2` (`person.birth_city` and `person.occupation_city`). The page then shows the same name on both fields.
Where: `api/src/forms.ts:160-166`. The row lock is taken only on the field that receives the name, and `namedBy` reads every other field without a lock. Two transactions, one on each field, both see "nobody has it" and both write. The m8 comment ("aliases added at the same moment are all kept") covers one field only, not two.

**2. Major: a chain of merges can be made through the page, and the first redirect then points at a field that went away.**
Steps (API, the same calls the dialog makes): merge `person.alt_phone_number` into `person.alternate_telephone_number`, approved by user-C. Then, on the field that stayed, merge `person.alternate_telephone_number` into `person.phone_number` (or `person.telephone_number`), approved by user-B. Both answer 201. A race gives the same result: R→S and S→T proposed together are both PROPOSED, then both approved (`person.birth_city` → `occupation_city` → `education_city`).
Expected: no chain (C3.5 and `check_forms_channels.ts:336`: "no chain, cycle or fork"). The second merge should be refused, or the first field's redirect should move to the new survivor.
Actual: `person.alt_phone_number` stays RETIRED with merged into = `person.alternate_telephone_number`, which is itself merged away. On the page, "Alt phone number" says "merged into Alternate telephone number" and links to it. That page says "merged into Telephone number" and still lists "Merged in: Phone number" as if it had stayed. "Telephone number" lists only "Merged in: Alternate telephone number" and does not name the fields that came in through it. A re-read form then follows only one hop: `engine/normalize.ts:76-79` redirects only when the target is live (`lib.get(moved)`), so `person.alt_phone_number` is no longer reused and a duplicate can be proposed again. The runtime resolver follows hops (`engine/resolver.ts:141`), so the two disagree.
Where: `api/src/forms.ts:306` blocks a pending merge only; nothing checks fields already merged INTO the field that is going away. `approveMerge` (`:354-356`) never updates the older rows' `mergedIntoKey`. `web/src/pages/library.tsx:227` lists "Merged in" by `keepKey` even on a page whose own field was merged away.

**3. Major: after a merge, the name of the field that went away can be given to a different field.**
Steps: approve `person.alt_phone_number` into `person.alternate_telephone_number`. Then `POST /api/library/fields/person.phone_number/aliases {"alias":"Alt phone number"}` as user-A.
Expected: refused, "already names the field Alternate telephone number". The merged-away page itself promises "its names, form fields and questions now point there" (`library.tsx`, the Merged notice).
Actual: **201**. "Alt phone number" is now another name of **Phone number**, the main phone, so a form wording "Alt phone number" finds the wrong field. Before the merge the same call was refused.
Where: `api/src/forms.ts:73` skips merged fields (`!r.mergedIntoKey`). `approveMerge` (`:354`) carries over the gone field's key and aliases but not its name (key words or label). So that name belongs to nobody after the merge.

**4. Minor: two merges proposed at the same moment as a cycle (A into B, B into A) both wait.**
Steps: `POST /library/merges {keep:"person.uci", merge:"person.fax_number"}` and `{keep:"person.fax_number", merge:"person.uci"}` sent together. Both answer **201** and both are PROPOSED.
Expected: the second is refused ("already in a merge waiting…").
Actual: the unique index is only on `merge_key` (`field_merge_one_pending`), and the check at `forms.ts:306` runs outside the insert transaction. Approval does catch it: the second approve is refused with "person.fax_number was merged into person.uci after this merge was proposed: nothing was changed; reject this merge." That message uses raw keys (`forms.ts:341`, `:353`) and appears on the approver's To review panel. A person then has to reject the stuck merge by hand.

**5. Minor: an alias shaped like a key is accepted, then hidden on the page.**
Steps: add `home.phone` and then `person.phone_number` (the key of another live field) as names of "Alternate telephone number". Both answer 201.
Actual: both are stored, but the page's Other names leaves them out (`library.tsx:213`, `:228`, where `isFieldKey` treats anything shaped like `a.b` as a merge redirect). Nobody can see or remove them on the page. Field search (`studio.ts:548`) now finds "Alternate telephone number" when someone types another field's key. A field's own key words ("Alternate telephone number" on itself) are also accepted as a redundant alias.

**6. Minor: a very long name gives sideways scroll at 1024 px and at 200 % zoom.**
Steps: add a 200-character name ("Ünïcødé – long name xxx…", the maximum the box allows). Then open the field at 1024 px and at 720 px.
Actual: scrollWidth exceeds the window by 292 px at 1024 and by 364 px at 720. A field without a long name scrolls by 0 at both widths. The pill does not wrap (`library.tsx:235`). The check's own 1024 px step uses short names only.

**7. Minor: refusals that still use raw keys or code words (PRODUCT §4).**
(a) The merge dialog, when the chosen field was merged away in another tab, shows "person.phone_number is not an active field of the library." on the control, and Send stays on (`forms.ts:303`; the reviewer's Minor 3, fixed in the copy's uncommitted edit). (b) The approval re-check messages above (`forms.ts:341`, `:353`, not in the reviewer's list). (c) API only: "Too small: expected string to have >=2 characters", "Too big: expected string to have <=200 characters" (`contracts/forms.ts:78`). (d) "--" (two characters, so the button is enabled) shows "An alias needs letters or digits." on a page that says "another name" everywhere else (`forms.ts:154`). (e) The activity text: "Configuration author added "…" as a label of person.fax_number" and "proposed merging person.x into person.y" (`forms.ts:169`, `:322`).

**8. Minor: the page stays stale after a refused send.**
Steps: open "Given names", Merge into…, then choose and type a reason. Another tab proposes a merge of Given names. Press Send.
Actual: the refusal is plain ("'Given names' is already in a merge waiting…"). But after Cancel the page still offers "Merge into…" and shows no "Waits for a second person" until a reload: `useAction` invalidates only on success (`library.tsx` MergeDialog). The same happens after another tab approves a merge: the merged-away page keeps "Add another name" (the server then refuses it in plain words).

**9. Minor: keyboard.**
Esc closes the Merge dialog, but focus goes to the top of the page, not back to "Merge into…" (WCAG 2.4.3). The dialog is mounted with `open` and has no trigger (`library.tsx:255`). Enter in "Add another name" does nothing (there is no form); Tab then the button works.

**10. Minor: a reason of ten dots ("..........") is accepted** (`contracts/forms.ts:112` checks length only), and the approver reads "· .........." on the merged-in line.

## What held
* Second person (P-65): the proposer approving as `user-A` or as the persona `author` is refused 403 ("A different person approves a merge"). The proposer's reject is refused too. No header or an unknown header gives 401, and user-O gives 403 (no review duty). user-B and user-C approve, and the page names them ("approved by Approver", "approved by Content reviewer").
* Races on deciding: approve as B, approve as C and reject as C, all at once, give exactly one decision; the others answer "This merge was decided at the same moment". The change set ends `undone`, and nothing moved.
* Stale fingerprint: `expected:"deadbeef"` and `expected:""` give 409 "Look again" on both propose and approve.
* Duties: an alias or a merge proposal by user-B, user-C, user-O, a persona of theirs, no header or `USER-A` is refused (403/401). For B and C the page shows the names but hides "Add another name" and "Merge into…". For user-O the page says "This page is for the configuration people". `GET /library/merges` gives 401 with no header and 403 for user-O.
* Alias twins refused in the other field's name: case, hyphen, double space, trailing colon, "(home)", "required", a curly against a straight apostrophe, full-width against ASCII, and another field's alias. "--" and ".." are refused. French, Hindi and Arabic names are kept as typed. `<script>` is stored and shown as text, and nothing runs. An alias on a merged-away field is refused in plain words. Three identical adds at once on one field store the name once.
* Dialog: only same-kind fields, never the field itself (41 text options for a text field). A reason under 10 characters is refused on the control and Send stays off. While a merge waits, all four second merges touching either field are refused in field names, and the page hides "Merge into…" on both fields. A sequential cycle (the stayed field into the gone one) is refused.
* Page states: waiting (with the proposer and a working link to `/review/merge/<id>` for the approver), merged-in (name, approver, reason) and merged-away (a link to the field that stays) all render. At 1024 px and 720 px there is no sideways scroll without a long name, and no page errors.

Evidence screenshots (not in the repo): the breaker's scratchpad `qa219/shots/`. My probes left the database merged and chained; the check resets it to the six.

**Verdict: Changes needed.** Blockers: 0. Majors: 3 (1 two fields share a name under concurrency, 2 merge chains with a one-hop redirect, 3 a merged-away name is free to take). Minors: 7. The second-person rule itself held against every attempt.
