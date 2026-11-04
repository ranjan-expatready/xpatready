# Documents per person and "Fill this from documents": concept addendum (drafter, 4 Nov; tech lead's approval after a fresh challenge, P-316 (3))

Board: `design/draft-documents.html`. Rows: **C6.4 (a)** (the checklist on screen) and **C6.5 part 2b** (the drawer with "Confirm & use"). It updates `../../M3-agent-view/` BR-3 to BR-7 and board frames 3 and 5, and journey J7 steps 3.1–3.8, to:
* P-242 (one "Confirm & use" per document);
* P-243 (collapse rule and correction count);
* P-316 (holds lifted);
* the case page as built.

All documents, names and values are **Sample**; identity documents are synthetic (P-133). Unconfirmed: no counsel.

## 1. Job and journey
* **Job:** the case officer sees what each person must provide, asks for it, receives it, and turns a received document into confirmed facts once, without typing them.
* **Persona:** the case officer.
* **Journey:** J7 3.1–3.8; activities 7.2–7.4. SA-1B-34; one-pager 7.3.

## 2. Ten layers
| Layer | Exists (main 9caa043b) | New here |
|---|---|---|
| Checklist | lines per person, states, request, upload (20 MB, judged by the file), Not applicable with a reason, history (`api/src/case-checklist.ts`, `GET /runtime/cases/:id/checklist`) | the **Documents** panel (UI only) |
| Reader | passport by rules, MRZ check digits, collapse rule (`engine/runtime/mrz.ts`), resolver R11 | routes, `read_value`, `document_review`, `answer_check` (C6.5 2a); the **drawer** (2b) |
| Team | AG-09 owns storage and status (SI-14, P-169); team state words | — |

## 3. Business rules
* **BR-1** **One list per person** (P-169, r5c BR-3): release requirement × role × mode × that person's facts. It is recomputed when answers change, and each line shows the reason it is there.
* **BR-2** **States in the team's words:** Not requested · Requested · Received · Being checked · Approved · Rejected (reason) · Not applicable (reason, file kept). "Uploaded to IRCC" is a tick, done only after Ready to file.
  * Being checked, Approved and Rejected are shown with no action here (AG-09, P-169).
  * **Dynamic lines** (challenge M5):
    * a "May be needed: answer … first" group per person, with no actions (a waiting line has no stored id, QA-155);
    * kept lines are marked "Kept on the list";
    * the API's `basis` is the panel's note;
    * two empty states: "This release has no document lines" and "Not worked out for this combination".
  * "n of m received" counts Received, Being checked and Approved, out of needed lines that are not Not applicable.
* **BR-3** **Staff actions:** Request; Upload; Not applicable with a reason (refused if empty).
  * Each action sends the line's `version` (409 → "Someone else changed this. Reload.").
  * Upload is hidden on Not applicable lines, which offer Request instead (`UPLOAD_FROM`).
  * P-172 lines refuse Not applicable (breadth, not Visitor visa).
  * **The panel is staff only** (challenge M4): the client's checklist read, Request and Not applicable answer 403. The client's own upload stays allowed and belongs to the client screens after M3 (r5c BR-7).
  * History shows the file versions and the last change. A full history of state changes is *Not built*.
* **BR-4** **"Fill this from documents"** per section, never on upload (P-134 D4). It proposes values with document, page, reader and confidence. Unreadable is flagged, never guessed. Typing always works.
* **BR-5** **One review per document** (P-242). Values stay proposals until one **Confirm & use** on that document, which records who and when. There is no Confirm & use across documents (SA1B-D77 bulk accept is still held).
  * **Confirm & use writes every value that agrees or is new.** Each value that differs from a typed answer **opens one check instead and keeps the typed value** until the officer chooses (challenge B1; pack C6.5-9b, -10, -12; P-242 "never resolved silently").
  * The drawer says so before the click: "1 value differs from what the client typed: it opens a check and keeps the client's value until you choose."
  * A differing value is shown expanded beside the typed one even where the rule would collapse it. It is still counted as collapsed for P-243.
  * The request carries `read` (the read the officer saw) and `edits` (values the officer changed). It answers 409 if the document or the read changed since.
* **BR-6** **Collapse rule** (P-243):
  * passport number, date of birth and expiry are **collapsed** only when the MRZ check digits passed;
  * names, sex, citizenship and country of issue stay **expanded**, each shown one by one (challenge M1). The drawer lists **every** value Confirm & use will write, with its section named;
  * names carry the reader's note "The name may be cut short: check it against the printed name";
  * a value whose check digit failed is **not proposed** ("Could not read the passport number: type it from the passport page");
  * place of birth sits under "Not on this document: type it", apart from the proposals;
  * per fact, `document_review` stores the mode, the proposed value, the used value and whether it was corrected;
  * a later staff change to an answer whose source is `document_read` is also counted;
  * the counts (corrected and reviewed, per mode) are a staff-only read handed to the team (P-243). They are not shown in the drawer.
* **BR-7** **Typed versus document** (r5c BR-7, P-238): a difference opens one check per person and fact, resolved only with a reason. Confirm section answers 409 while it is open. Readiness counts it as a warning (C7.6).
* **BR-8** AI never reads identity documents (P-134). The passport is read by rules. Letters by AI vision are part 3, not this screen.
* **BR-9** **See the document** (challenge M7). A staff-only `GET /runtime/documents/:id/file` (through `bytesOf`, sha256-checked, one audit line) backs an "Open the passport" link in the drawer and in History. It opens in a new tab; there is no side-by-side viewer.
* **BR-10** **Checked against the document** (C6.5-17, J7 3.6). On a value already used, a staff action "Mark checked against the passport" records `source_json.checked_against = {document, by, at}`. The test asserts that record, not just VERIFIED.
* **BR-11** **Status of a corrected value** (founder Q1): a value the officer corrected before Confirm & use is written like the officer's own typing today (it waits for Confirm section). An unchanged value is written VERIFIED, as C6.5-11 needs. So SA1B-D107 ("corrected by staff counts as verified") is not decided in passing.

## 4. Layout
**Documents panel** (in Prepare application, card 1 "Get the information"; frame 1). `web/src/runtime/checklist.tsx` is self-contained; `cases.tsx` only mounts it, so the C7.7 tab re-mounts it without rework.
* One group per person, with the name, the role and the chip **SI-14**.
* Rows: document type · state pill · reason · last change; kept lines marked.
* "May be needed: answer … first" lines, with no actions.
* Actions in a ⋯ menu: Request, Upload (not on Not applicable lines), Not applicable…, History.
* A count per person ("1 of 2 received").
* Lines are drawn from the Visitor visa release (`acceptance/lib/setup_vv_m3.ts`): passport per person; proof of funds on the principal; the minor's letter of authorization from "travels with" (P-230 (3)).

**Fill drawer** (a right panel of 480–560 px, EXPERIENCE §; frame 2). It opens from a section's "Fill this from documents", shown in agent mode only (a one-line hook in `questionnaire.tsx`).
* **One block per document:** its type, page, reader ("Passport machine-readable lines · rules"), "Check digits: passed/failed", and an "Open the passport" link.
* **Every value Confirm & use will write**, with its section:
  * collapsed rows ("Checked by the passport's check digits", openable);
  * expanded rows, each editable, names with the cut-short note;
  * values that differ from typed answers, shown beside the typed value;
  * "Not on this document: type it" (place of birth).
* **One primary button per document: Confirm & use.** It is never disabled by a difference: the difference opens a check, as the line above it says. With nothing proposed there is no button.
* **After use:** "Mark checked against the passport" on each used value.

**Check panel** (frame 3): the typed value against the document's value. Keep the document's, the client's, or another (with its value); a reason is required; Save. `resolve {keep: document|client|other, value?, reason}`.

**States** (all staff views):
* nothing uploaded ("Upload the passport first");
* reading;
* a value not read ("Could not read the passport number: type it from the passport page");
* no text layer ("A scan or photo: type the values");
* two passports in one file ("Upload each on its own line");
* nothing proposed (no Confirm & use);
* 409 Reload;
* the release has no document lines;
* not worked out for this combination.

## 5. Copy
* **Confirm & use help:** "Writes these values to the case as confirmed by you, {name}, now. Values that differ from what the client typed open a check and keep the client's value until you choose."
* **Collapsed line:** "Passport number, date of birth and expiry: checked by the passport's check digits. Open to see them."
* **Name note:** "The name may be cut short: check it against the printed name."
* **Not applicable reason error:** "Say why this document is not needed."
* **Check:** "The client typed {typed}; the passport says {read}. Which is right?"

## 6. Contract and tests
**Contract:**
* The C6.4 API is built.
* C6.5's routes follow `M3-CONTRACT.md`, with the changes from the challenge:
  * `documents/:doc/confirm-and-use {subjectId, read, edits?}`;
  * `checks/:id/resolve {keep: document|client|other, value?, reason}`;
  * new staff-only `GET /runtime/documents/:id/file`;
  * new staff-only `GET /runtime/cases/:id/document-reviews/counts` (corrected and reviewed, per mode).
* New types are exported from `api/src/case-documents.ts`. They do not go in a new `studio/contracts/` file, where every later edit would be hot. Never edit `studio/contracts/documents.ts` or `runtime.ts` (M2-hot).
* The tests change in the same PR, and its first line says so (`acceptance/README.md`).

**Tests, one pass and one fail per rule:**
* **`acceptance/C6.4-screen.test.ts`** (C6.4-31 onward):
  * lines per person / an adult without the minor's lines;
  * a waiting line shown, with no action / acting on it 404;
  * Request then Received / Not applicable without a reason refused on the field;
  * stale version 409 / client checklist read, Request and Not applicable 403.
* **`acceptance/C6.5-screen.test.ts`:**
  * collapsed when the digits pass / not proposed when one fails (the pack's "O for 0" Sample);
  * all 8 proposals listed;
  * one Confirm & use writes all agreeing values with who and when / a second changes nothing;
  * a typed difference opens one check and keeps the typed value while the rest fill (C6.5-10) / Confirm section 409 while open;
  * a stale `read` 409;
  * corrected per mode counted / the client cannot read the counts;
  * "Mark checked" records `checked_against`;
  * the file route: staff 200 / client 403.
* **Plus:** axe clean at 1440, 1024 and 400 px; keyboard only.

## 6b. Capability or scaffolding
* **Capability:** all of the above.
* **Scaffolding:** storage is AG-09's stand-in (chip SI-14); Sample synthetic passports only.

## 7. Questions
1. **(Founder) The status of a value the officer corrects before Confirm & use.** *Recommend:* as the officer's own typing today: it waits for Confirm section. Unchanged values are written VERIFIED, as the pack needs. SA1B-D107 ("corrected by staff counts as verified") stays held until the founder rules on it.
2. **(Founder) One value differs from what the client typed: does Confirm & use still write the others?** *Recommend:* yes. It writes the values that agree or are new, opens one check per difference and keeps the client's value until a reason is given (pack C6.5-10, -12; P-242). Refusing the whole document would leave the passport unused over one name.
3. **(Tech lead) The panel's home.** *Recommend:* card 1 of Prepare application, as r5c. Until the tab lands, the panel sits on the case page above "Agent view", so C6.4 (a) does not wait for C7.7.

## Definition of ready
* Tests: `C6.4-screen.test.ts`, `C6.5-screen.test.ts`.
* Rows: C6.4 (a), C6.5 2b.
* Decisions: P-169, P-133, P-134, P-171 (6), P-172, P-238, P-242, P-243, P-316.
* **qa retests and closes QA-149** (CAPABILITIES says fixed) before the C6.4 (a) PR, which gate B otherwise refuses; or the PR names QA-149 as the bug it fixes.
* Approval by the tech lead after `challenge.md`.

## Drafter's response to the challenge (4 Nov)
All of B1 and M1 to M7 are taken into BR-2, BR-3, BR-5, BR-6, BR-9 to BR-11, §4 to §6 and the Definition of ready. Minors m1 to m7 are taken too: the board was redrawn from the release, the states reworded against the reader, SI-14 shown, the drawer widened, resolve given `other`, the ⋯ menu matched to the built rules, the hot-file note added and the mount kept self-contained. Nothing is left open except the two founder questions.
