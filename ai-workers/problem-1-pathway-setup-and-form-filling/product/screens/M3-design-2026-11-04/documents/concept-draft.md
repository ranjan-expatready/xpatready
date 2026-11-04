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
* **BR-3** **Staff actions:** Request; Upload; Not applicable with a reason. The reason is refused if empty. On P-172 lines (Express Entry police and medical) it is refused, but that is breadth, not on Visitor visa. The client sees no staff actions.
* **BR-4** **"Fill this from documents"** per section, never on upload (P-134 D4). It proposes values with document, page, reader and confidence. Unreadable is flagged, never guessed. Typing always works.
* **BR-5** **One review per document** (P-242). Values stay proposals until one **Confirm & use** on that document, which records who and when. Then they fill at once. There is no Confirm & use across documents (SA1B-D77 bulk accept is still held).
* **BR-6** **Collapse rule** (P-243):
  * passport number, date of birth and expiry are **collapsed** only when the MRZ check digits passed;
  * names, and anything without a passed check, stay **expanded**;
  * each staff correction is counted with its mode.
* **BR-7** **Typed versus document** (r5c BR-7, P-238): a difference opens one check per person and fact, resolved only with a reason. Confirm section answers 409 while it is open. Readiness counts it as a warning (C7.6).
* **BR-8** AI never reads identity documents (P-134). The passport is read by rules. Letters by AI vision are part 3, not this screen.

## 4. Layout
**Documents panel** (in Prepare application, card 1 "Get the information"; frame 1):
* one group per person, with the name and role;
* rows: document type · state pill · reason · last change;
* actions in a ⋯ menu: Request, Upload, Not applicable…, History;
* a count per person ("3 of 5 received").

**Fill drawer** (a right panel; frame 2): opened from a section's "Fill this from documents".
* One block per document: its type, page, reader ("Passport machine-readable lines · rules") and checksum.
* Proposed values under it:
  * collapsed rows show "Checked by the passport's check digits" and can be opened;
  * expanded rows show the value, the source and an editable field.
* One primary button per document: **Confirm & use**. It is disabled with a reason while a check on that document is open.

**Check panel** (frame 3): the typed value against the document's value; choose one or type another, with a reason; Save.

**States:**
* nothing uploaded ("Upload the passport first");
* reading;
* unreadable (which fact, "type it");
* check digits failed (everything expanded);
* 409 Reload;
* client view (no actions).

## 5. Copy
* Confirm & use help: "Writes these values to the case as confirmed by you, {name}, now. You can still change a value later."
* Collapsed line: "Passport number, date of birth and expiry: checked by the passport's check digits. Open to see them."
* Failed check: "The passport's check digits did not match. Review every value."
* Not applicable reason error: "Say why this document is not needed."
* Check: "The client typed {typed}; the passport says {read}. Which is right?"

## 6. Contract and tests
**Contract:** the C6.4 API is built. C6.5's routes are as in `M3-CONTRACT.md` (`fill-from-documents[/plan]`, `GET proposals`, `documents/:doc/confirm-and-use`, `GET checks`, `checks/:id/resolve`, `…/checked-against-document`), plus a new `GET /runtime/cases/:id/corrections` (counts by mode) for P-243's count.

**Tests, one pass and one fail per rule:**
* `acceptance/C6.4-screen.test.ts` (C6.4-31 onward), BR-1 to BR-3:
  * lines per person / an adult without a minor's lines;
  * Request then Received / Not applicable without a reason refused on the field;
  * client sees no actions / client write 403.
* `acceptance/C6.5-screen.test.ts`, BR-4 to BR-7:
  * collapsed when the digits pass / expanded when they fail (the pack's "O for 0" Sample);
  * one Confirm & use writes all, with who and when / a second Confirm & use changes nothing;
  * a difference opens one check / Confirm section 409 while open;
  * correction counted per mode / the client cannot read the count.
* **Plus:** axe clean at 1440, 1024 and 400 px; keyboard only.

## 6b. Capability or scaffolding
* **Capability:** all of the above.
* **Scaffolding:** storage is AG-09's stand-in (chip SI-14); Sample synthetic passports only.

## 7. Questions
1. **(Tech lead) What counts as a correction?** *Recommend:* a staff edit of a proposed value before Confirm & use, plus a later staff change to a value that came from a document, counted by mode.
2. **(Founder) Does Confirm & use write "verified"?** *Recommend:* the same status Confirm section writes today. "Checked against the document" stays its own evidence step. The held SA1B-D89 and D107 are not touched.
3. **(Tech lead) The panel's home.** *Recommend:* card 1 of Prepare application, as r5c. Until the tab lands, the panel sits on the case page above "Agent view", so C6.4 (a) does not wait for C7.7.

## Definition of ready
* Tests: `C6.4-screen.test.ts`, `C6.5-screen.test.ts`.
* Rows: C6.4 (a), C6.5 2b.
* Decisions: P-169, P-133, P-134, P-171 (6), P-172, P-238, P-242, P-243, P-316.
* Approval by the tech lead after `challenge.md`.
