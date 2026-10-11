# Change note CN-SA-01B: Content Pack Configurator

| | |
|---|---|
| **Document changed** | SA-01B Content Pack Configurator, version 1.2, dated 2026-10-05 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.2_2026-10-05.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-01B's own style; (4) why, pointing to the founder's decision (Founder Decisions Log FD-*n*; `ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of the passed behaviour document (`ai-workers/design/behaviours/pack-authors-assistant.md` §9, G-*n*); (5) what else must change.

**Numbering.** SA-01B states its range: "new requirements are SA-1B-1 – SA-1B-95" (L9). Any new requirement here would start at SA-1B-96; none is needed, because the new rules live in SA-01 (SA-1-66, SA-1-67) and SA-08 (SA-8-40). Role names follow CN-SA-01 change 5 (Content author, Content approver).

**Two founder decisions bring this module back to the Founder Decisions Log** (changes 1 and 3). A module file never overrides a founder decision by date (README §0 rule 11); both conflicts went to the founder on 11 Oct 2026 and he decided them.

---

## 1. Government form filling: FD-5 stands; the team gives the route and a date

**(1) What it changes.** SA1B-D28 (L53); §0.1 deferral rows for box maps and P1 (L67–L68); §0.3 "Defer" row (L110); §3.5 Release 1 note (L180); §13 placeholder P1 (L400).

**(2) Current words.**

L53 (extract, first three sentences):
> | **SA1B-D28** | **Form autofill is parked for Release 1.** Release 1 keeps the **form list**: each row lists the forms its filing needs, the case assigns them, staff upload and e-sign them, and the readiness gate applies. **Parked until the content pack SQR is final:** box maps, deterministic filling, the forms editor, and placeholder P1 (how a filled form reaches the staff).

L400 (extract, "Decide before" cell):
> Autofill resumes (after the content pack SQR is final) — parked with SA1B-D28

**(3) Proposed words.**

SA1B-D28 gains at the start of its decision cell:
> *(changed 11 Oct 2026 — FD-5 kept by the founder, AIW-D43)* **Founder Decisions Log FD-5 stands: flattened-overlay filling in version 1.** The team states the route for IRCC's forms (P1) and a date for box maps and filling. Until filling exists, the pilot runs without form filling and says so. When filling ships it stays deterministic (SA1B-D16).

The rest of the cell stays as the record of the product owners' 23 Sep reasoning.

P1 "Decide before" becomes: "**Now** — the team names the route and a date (FD-5, AIW-D43)." §0.1 (L67–L68), §0.3 (L110) and §3.5 (L180) are re-read against the date the team gives.

**(4) Why.** FD-5 (Founder Decisions Log v1.5, L30, resolved 3 Jul 2026, "BINDING"): "**Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub". SA1B-D28 parked it; the conflict went to the founder (proposals row of 9 Oct, carve-out B, "Settle the Filler's release"; `00-step2-decisions.md` §2 item 17) and he chose "Keep FD-5, ask the team" (AIW-D43: "FD-5 (form filling in version 1) stands; Step 3 asks the team for the overlay route and a date. Until it exists the pilot runs without form filling and says so; the Form Preparer duty (W-05) stays specified."). SA-01B's own §13 P1 (L400) records why the route matters: "The engine fills **AcroForm** PDFs and refuses XFA templates (§12), and IRCC's 2D-barcode forms are XFA."

**(5) Knock-ons.** SA1B-X10 (L90, the "auto-prefilled forms" plan limit) and SA-03 SA-3-4 follow the date. AG-07's Filler requirements and the Case assistant's Form Preparer duty (CN-AG-07; AW-01). The Program Charter line on form filling is in `ai-workers/charter-edits.md` §2 (the founder pastes it; not repeated here).

---

## 2. The publish gate: second-person approval, with the rehearsal report attached

**(1) What it changes.** SA1B-D18 (L42); SA-1B-38 (L206).

**(2) Current words.**

L42:
> | **SA1B-D18** | **Rules and scoring are trusted by second-person approval alone** — no mandatory test profiles, no test run at publish, no acceptance test against the V1.5 calculators. *Product owners' call, against the recommendation; the exposure is that a wrong gate or points row reaches clients in writing if the reviewer misses it.* | §3.6 · SA-1B-38 |

L206:
> - **SA-1B-38** A change to a gate or a scoring grid is trusted by **second-person approval**; there are no mandatory test profiles and publishing runs no test set.

**(3) Proposed words.**

SA1B-D18 gains: "*(changed 11 Oct 2026 — AIW-D49)* The approver reads the **rehearsal report** attached to every production submission (SA-1-66) before approving; it is evidence, not a blocking gate."

SA-1B-38:
> - **SA-1B-38** *(changed — AIW-D49)* A change to a gate or a scoring grid is trusted by **second-person approval**, given after reading the **rehearsal report** that every production submission carries (SA-1-66); there are no mandatory test profiles and publishing runs no blocking test set.

**(4) Why.** AIW-D49, 11 Oct 2026, the founder chose "Attach a rehearsal report": "Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate." It answers the exposure SA1B-D18 itself records. Proposals row of 10 Oct (Pack author's assistant, test gate); `pack-authors-assistant.md` §9 G-11 ("Decided (AIW-D49)").

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
> - **SA-1B-44** *(changed — FD-4 as amended 11 Oct 2026, AIW-D48)* Rows are maintained in the console and by bulk upload, with the upload validated against the table definition before it is accepted. **Rows that go into a production pack are approved by a second person with the pack (SA-01 §3.12, SA-1-61)**, exactly like table definitions (SA-1B-42); there is no separate setting that lets reference rows skip the second person.

SA1B-D17 gains: "*(changed — AIW-D48)* Rows in a production pack also need second-person approval."

**(4) Why.** FD-4 (Founder Decisions Log v1.5, L29) read: "**Dual-control for rule/scoring/eligibility artifacts; platform-config toggle for reference data**". The founder amended its second clause (AIW-D48, "Two people for all"): "reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12." SA-1B-42 requires a second person for table definitions; SA-1B-44 names no second person for rows. Proposals row of 10 Oct (Pack author's assistant, test gate, part 2, "Reference rows"); `pack-authors-assistant.md` §9 G-25 ("Decided (AIW-D48)"). Fees, funds and wages are values a client's file depends on.

**(5) Knock-ons.** The Founder Decisions Log carries the amendment (CN-FDL change 1). SA-01 §3.12 already puts the whole production pack under two people; no change there.

---

## 4. A government source is recorded as its web address, so the watcher can fetch only that

**(1) What it changes.** SA-1B-39 (L207).

**(2) Current words.**

L207:
> - **SA-1B-39** Every gate, scoring row, document requirement, form edition, fee, programme definition and reference table carries a **government source, a date checked and a next-review date**.

**(3) Proposed words.**

SA-1B-39 gains: "*(changed — read-only source rail)* Where the government source is a web page, it is recorded as the page's **full official web address**. Only addresses recorded here may be fetched by the read-only government source rail (SA-8-40)."

**(4) Why.** Proposals row of 10 Oct (Pack author's assistant, outbound fetch): the read-only rail is "limited to the addresses recorded as sources under SA-1B-39, never an address found on a page". A source recorded only as free text cannot limit what is fetched. `pack-authors-assistant.md` §9 G-3.

**(5) Knock-ons.** SA-08 SA-8-40 (CN-SA-08 change 3). The Canada pack content the specialist authors (AIW-D50) records addresses in this form.

---

## 5. The overdue-review work queue also carries "source page changed"

**(1) What it changes.** SA-1B-40 (L208).

**(2) Current words.**

L208:
> - **SA-1B-40** Overdue items appear on a work queue and warn at publish. Content never expires silently.

**(3) Proposed words.**

> - **SA-1B-40** *(changed)* Overdue items appear on a work queue and warn at publish. Content never expires silently. The same queue also carries a **"source page changed"** item when the government page recorded under SA-1B-39 has changed since it was last checked, with the content items that cite it and, where the Pack author's assistant drafted one, a proposed change file for the author to review. Dismissing the item records who dismissed it and why.

**(4) Why.** `pack-authors-assistant.md` §9 G-4 (Proposal; SA-1B-40): "The work queue of SA-1B-40 carries overdue reviews only; a *changed source* item kind with the proposed change file is needed." The watcher is the duty the persona card sells ("Watches the official pages a pack cites", proposals row of 10 Oct, outbound fetch). The proposed change file is a proposal only; the assistant never writes into the pack (AIW-D54 item 7).

**(5) Knock-ons.** AW-02 (the watcher and its stored page copies, `pack-authors-assistant.md` §9 G-21).

---

## 6. AI-drafted box-map lines carry a marker and the model's confidence until the author reviews them

**(1) What it changes.** SA-1B-33 (L189).

**(2) Current words.**

L189:
> - **SA-1B-33** AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map; a person approves before publishing.

**(3) Proposed words.**

> - **SA-1B-33** *(changed — per-line marker)* AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map; a person approves before publishing. **Every drafted line carries an "AI-drafted" marker and the model's confidence, in the import file and on the line after the author commits it, until the author reviews that line**; low-confidence lines are shown to the author first.

**(4) Why.** `pack-authors-assistant.md` §9 G-23 (Proposal; IMP-11): "each drafted map line, scoring row or reference row carries an *AI-drafted* marker and the model's confidence inside the import file and on the line after the author's commit, until the author reviews it. SA-1-31's import carries a canonical field → form field map and SA-1B-29 a box status, neither a marker nor a confidence". IMP-11: the product keeps the "AI-written" marker on every artifact. "Low-confidence lines first" is the first of the automation-bias safeguards the founder adopted for every "approve all" (AIW-D57, provisional until counsel; `pack-authors-assistant.md` §9 G-16).

**(5) Knock-ons.** SA-01 SA-1-31 import format carries the two fields (the same line marker applies to drafted scoring and reference rows imported under SA-1-41). FD-5 (change 1) decides when box maps return. AW-02 specifies the drafting step.
