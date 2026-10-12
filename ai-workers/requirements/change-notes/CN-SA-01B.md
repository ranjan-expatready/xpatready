# Change note CN-SA-01B: Content Pack Configurator

| | |
|---|---|
| **Document changed** | SA-01B Content Pack Configurator, version 1.2, dated 2026-10-05 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.2_2026-10-05.md` |
| **Date of this note** | 11 Oct 2026 (sixth round: the founder's Step 3 batch, AIW-D74: drafting runs once the provider record is published) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 7 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-01B's own style (plain present tense).
4. Why: the founder's decision (Founder Decisions Log FD-*n*; `ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of the passed behaviour document (`ai-workers/design/behaviours/pack-authors-assistant.md` §9, G-*n*).
5. What else must change.

**Numbering and names.** No new requirement number is needed here: the new rules live in SA-01 (SA-1-66, SA-1-67) and SA-08 (SA-8-52). Role names follow CN-SA-01 change 5 (Content author, Content approver).

**Two founder decisions bring this module back to the Founder Decisions Log** (changes 1 and 3). A module file never overrides a founder decision by date (README §0 rule 11). Both conflicts went to the founder on 11 Oct 2026, and he decided them.

---

## 1. Government form filling: FD-5 stands; the team gives the route and a date

**(1) What it changes.**
- SA1B-D28 (L53);
- §0.1 deferral rows for box maps and P1 (L67–L68);
- §0.3 "Defer" row (L110);
- §3.5 Release 1 note (L180);
- §13 placeholder P1 (L400).

**(2) Current words.**

L53 (extract, first three sentences):
> | **SA1B-D28** | **Form autofill is parked for Release 1.** Release 1 keeps the **form list**: each row lists the forms its filing needs, the case assigns them, staff upload and e-sign them, and the readiness gate applies. **Parked until the content pack SQR is final:** box maps, deterministic filling, the forms editor, and placeholder P1 (how a filled form reaches the staff).

L400 (extract, "Decide before" cell):
> Autofill resumes (after the content pack SQR is final) — parked with SA1B-D28

**(3) Proposed words.**

SA1B-D28 gains, at the start of its decision cell:
> *(changed 11 Oct 2026 — FD-5 kept by the founder, AIW-D43)* **Founder Decisions Log FD-5 stands: flattened-overlay filling in version 1.** The team states the route for IRCC's forms (P1) and a date for box maps and filling. **While a form edition has no published box map, the case shows that form as filled by hand and offers no filling**; the form list, upload, e-sign and the readiness gate work as today. When filling ships it stays deterministic (SA1B-D16).

The rest of the cell stays as the record of the product owners' 23 Sep reasoning.

P1's "Decide before" becomes: "**Now** — the team names the route and a date (FD-5, AIW-D43)."

§0.1 (L67–L68), §0.3 (L110) and §3.5 (L180) are re-read against the date the team gives.

**(4) Why.**
- FD-5 (Founder Decisions Log v1.5, L30): "**Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub".
- SA1B-D28 parked filling. The conflict went to the founder: proposals row of 9 Oct (carve-out B, "Settle the Filler's release"); `00-step2-decisions.md` §2 item 17.
- The founder chose "Keep FD-5, ask the team" (AIW-D43). As recorded in AIW-D43: "FD-5 (form filling in version 1) stands; Step 3 asks the team for the overlay route and a date. Until it exists the pilot runs without form filling and says so; the Form Preparer duty (W-05) stays specified."
- **A product rule, not a period.** AIW-D43's recorded effect, that the pilot runs without form filling and says so, is written as a state the product can check, a form edition with no published box map, so the rule does not depend on a pilot period (`00-step3-plan.md`, "No 'during the pilot' in a requirement"; re-check S3a-c m-12).
- SA-01B's own P1 (L400) says why the route matters: "The engine fills **AcroForm** PDFs and refuses XFA templates (§12), and IRCC's 2D-barcode forms are XFA."

**(5) Knock-ons.**
- SA1B-X10 (L90, the "auto-prefilled forms" metric) is moot: SA-03 v2.17 no longer limits prefilled forms (SA3-D14).
- The shared 99-Phasing-and-Glossary v2.18 SA-1B row (L31) follows the team's date.
- AG-07's Filler (CN-AG-07).
- The Charter line is in `ai-workers/charter-edits.md` §2.

---

## 2. The publish gate: second-person approval, with the rehearsal report attached; synthetic samples everywhere

**(1) What it changes.**
- SA1B-D18 (L42);
- SA-1B-38 (L206);
- §0.1 deferral row (L71) and §0.3 row (L114);
- SA-1-19 (L214), SA-1-26 (L221) and SA-1B-62 (L287).

**(2) Current words.**

L42:
> | **SA1B-D18** | **Rules and scoring are trusted by second-person approval alone** — no mandatory test profiles, no test run at publish, no acceptance test against the V1.5 calculators. *Product owners' call, against the recommendation; the exposure is that a wrong gate or points row reaches clients in writing if the reviewer misses it.* | §3.6 · SA-1B-38 |

L206:
> - **SA-1B-38** A change to a gate or a scoring grid is trusted by **second-person approval**; there are no mandatory test profiles and publishing runs no test set.

L214:
> - **SA-1-19** Rule sets can be test-run against a sample client, showing pass / fail / missing input per rule.

L287:
> - **SA-1B-62** Preview shows, for a sample family, **each person's** questionnaire, checklist and forms exactly as they will appear.

**(3) Proposed words.**

SA1B-D18 gains: "*(changed 11 Oct 2026 — AIW-D49)* The approver opens the **rehearsal report** attached to every production submission (SA-1-66) before approving; the approve action is available only once it is opened; it is evidence, not a blocking gate."

SA-1B-38:
> - **SA-1B-38** *(changed — AIW-D49)* A change to a gate or a scoring grid is trusted by **second-person approval**, given after opening the **rehearsal report** that every production submission carries (SA-1-66); there are no mandatory or blocking test profiles, and publishing runs no blocking test set.

§0.1 L71 and §0.3 L114 gain: "The rehearsal report of SA-1-66 is not a test profile: it is evidence the approver reads (AIW-D49)."

SA-1-19, SA-1-26 and SA-1B-62 each gain: "The sample client (or family) is always synthetic and marked so (SA-1-66)."

**(4) Why.**
- AIW-D49, 11 Oct 2026. The founder chose "Attach a rehearsal report": "Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate."
- Proposals row 112 (approval waits until the report is opened). Proposals row of 10 Oct (Pack author's AI, test gate). `pack-authors-assistant.md` §9 G-11.
- The synthetic rule: proposals row of 10 Oct (Pack author's AI, Rule, naming SA-1-52 and SA-1B-62); G-7.

**(5) Knock-ons.** SA-01 SA-1-66 (CN-SA-01 change 1). AG-03 BR-18 (CN-AG-03).

---

## 3. Reference rows in a production pack need two people (FD-4 as amended)

**(1) What it changes.** SA1B-D17 (L41); SA-1B-44 (L228).

**(2) Current words.**

L41 (extract):
> definitions are versioned pack content needing second-person approval; publishing blocks references to missing columns and rows that break their table's rules.

L228:
> - **SA-1B-44** Rows are maintained in the console and by bulk upload, with the upload validated against the table definition before it is accepted.

**(3) Proposed words.**

SA-1B-44:
> - **SA-1B-44** *(changed — FD-4 as amended 11 Oct 2026, AIW-D48)* Rows are maintained in the console and by bulk upload, with the upload validated against the table definition before it is accepted. **Rows that go into a production pack are approved by a second person with the pack (SA-01 §3.12, SA-1-61)**, exactly like table definitions (SA-1B-42); no setting lets reference rows skip the second person.

SA1B-D17 gains: "*(changed — AIW-D48)* Rows in a production pack also need second-person approval."

**(4) Why.**
- FD-4 (Founder Decisions Log v1.5, L29) read: "**Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data**".
- The founder amended its second clause (AIW-D48, "Two people for all"): "reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12."
- Proposals row of 10 Oct (Pack author's AI, test gate, part 2). `pack-authors-assistant.md` §9 G-25.

**(5) Knock-ons.** The Founder Decisions Log carries the amendment (CN-FDL change 1).

---

## 4. A government source is recorded as its web address, so the watcher fetches only that

**(1) What it changes.** SA-1B-39 (L207).

**(2) Current words.**

L207:
> - **SA-1B-39** Every gate, scoring row, document requirement, form edition, fee, programme definition and reference table carries a **government source, a date checked and a next-review date**.

**(3) Proposed words.** SA-1B-39 gains: "*(changed — read-only source rail)* Where the government source is a web page, it is recorded as the page's **full official web address**. Only addresses recorded here may be fetched by the read-only government source rail (SA-8-52)."

**(4) Why.** Proposals row of 10 Oct (Pack author's AI, outbound fetch): the rail is "limited to the addresses recorded as sources under SA-1B-39, never an address found on a page". See also `pack-authors-assistant.md` §9 G-3.

**(5) Knock-ons.** SA-08 SA-8-52 (CN-SA-08 change 3). The Canada pack content the specialist authors (AIW-D50) records addresses in this form.

---

## 5. The overdue-review work queue also carries "source page changed"

**(1) What it changes.** SA-1B-40 (L208).

**(2) Current words.**

L208:
> - **SA-1B-40** Overdue items appear on a work queue and warn at publish. Content never expires silently.

**(3) Proposed words.**

> - **SA-1B-40** *(changed — G-4)* Overdue items appear on a work queue and warn at publish. Content never expires silently. The same queue also carries a **"source page changed"** item when the government page recorded under SA-1B-39 has changed since it was last checked. The item lists the content items that cite the page and, where the Pack author's AI drafted one, a proposed change file for the author to review. Dismissing the item records who dismissed it and why.

**(4) Why.** `pack-authors-assistant.md` §9 G-4 (Proposal; SA-1B-40): "The work queue of SA-1B-40 carries overdue reviews only; a *changed source* item kind with the proposed change file is needed." The AI teammate never writes into the pack (AIW-D54 item 7). The comparison and the list of citing items are rule-built and run now; a drafted change file is a model call and waits for CN-FDL open point 3 (`00-step3-plan.md`, "Pack calls before the founder answers").

**(5) Knock-ons.** AW-02 (the watcher, `pack-authors-assistant.md` §9 G-21).

---

## 6. AI-drafted box-map lines carry a marker and the model's confidence until the author reviews them

**(1) What it changes.** SA-1B-33 (L189); the import format of SA-1-31 (L199) and SA-1-41 (L234), both in this module.

**(2) Current words.**

L189:
> - **SA-1B-33** AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map; a person approves before publishing.

**(3) Proposed words.**

> - **SA-1B-33** *(changed — G-23)* AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map; a person approves before publishing. **Every drafted line carries an "AI-drafted" marker and the model's confidence, in the import file and on the line after the author commits it, until the author reviews that line**; low-confidence lines are shown to the author first.

SA-1-31 (field-map import) and SA-1-41 (reference-table import) carry the same two optional columns for drafted lines.

**(4) Why.**
- `pack-authors-assistant.md` §9 G-23 (Proposal; IMP-11): "each drafted map line, scoring row or reference row carries an *AI-drafted* marker and the model's confidence inside the import file and on the line after the author's commit, until the author reviews it".
- "Low-confidence lines first" is the first of the approve-all safeguards the founder adopted (AIW-D57, ~~provisional until counsel~~ final by AIW-D108 (12 Oct 2026); G-16). The safeguard cannot be switched off while the approve-all part of the *founder safeguards* setting is on (SA-12-33).
- **Drafting runs once the provider record is published.** Drafting a map line is a model call; since the founder decided CN-FDL open point 3 (AIW-D74, "Yes, Canada for all AI"), it runs once the one published provider record exists (SA-8-49). Until then, and whenever the record is withdrawn, the two columns stay empty and the author maps by hand. The marker rule applies from the first drafted line.

**(5) Knock-ons.** FD-5 (change 1) decides when box maps return. AW-02 specifies the drafting step.

---

## 7. Document control

**(1) What it changes.** The document-control table (L5–L9).

**(2) Current words.** The last row is v1.2 of 2026-10-05.

**(3) Proposed words.** A version row: "| 1.3 | *(date placed)* | Workstream 2 change note CN-SA-01B applied: FD-5 kept (route and date requested; forms with no published box map are filled by hand), rehearsal report at the publish gate (approve only after opening it), synthetic samples, reference rows under two people (FD-4 as amended), source addresses, changed-source queue item, AI-drafted line marker. | FD-5, FD-4 (amended), AIW-D43, AIW-D48, AIW-D49 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
