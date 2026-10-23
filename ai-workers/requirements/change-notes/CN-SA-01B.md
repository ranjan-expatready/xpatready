# Change note CN-SA-01B: Content Pack Configurator

| | |
|---|---|
| **Document changed** | SA-01B Content Pack Configurator, version 1.2, dated 2026-10-05 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-01B v1.4**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.4_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v1.4" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-01B v1.4** (12 Oct 2026). No ID collision (the module's highest is SA-1B-100; this note adds none). Version row 1.3 → **1.5**. **Change 5 re-based:** SA-1B-40 v1.4 has **no queue screen** (SA1-D16, SA1B-D35): a sortable "next review" column and a weekly email to the content team (a code constant). The "source page changed" item is therefore proposed as a line in that weekly email and a flag in the "next review" column, not as a queue item (register TC-130 re-based); AW-02 AW-2-56 follows. **Change 4 unchanged** (SA-1B-39 v1.4 pre-fills the dates; the web-address rule still needed). Change 2's rehearsal report is now SA-1-68 (renumbered). SA-1B-48 (required wording) stays withdrawn (SA1B-D29); SA-1B-23's "blocks submission" choice is removed (every document type warns only). AI box-map drafting rules (SA-1B-33 to 35, SA1B-D28) unchanged. Line numbers and quotes below are v1.2's. |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.2_2026-10-05.md` |
| **Date of this note** | 11 Oct 2026 (sixth round: the founder's Step 3 batch, AIW-D74: drafting runs once the provider record is published) |
| **Changed 14 Oct 2026 (the founder's AIW-D146)** | **Change 1 rewritten** (and corrected the same day after the checker's acceptance review: P2's short list, the §3.5 note, FD-5's overlay route, box-map authorship under AIW-D135, the document-control row): full form and portal filling is in Release 1, for all forms and portals ("Full form filling in R1"). SA1B-D28's parking and Phasing v2.20 row 2.6's move to Phase 3 are a conflict with a founder decision (README §0 rule 11); line numbers re-based to SA-01B v1.4 (`drive-snapshot-2026-10-13-1535`). Launch risk recorded as `assumptions.md` R-1. **Accepted 14 Oct 2026:** the checker's acceptance review (PROGRESS 08:47:42Z, PASS WITH FIXES, 6 Material, 9 Minor) applied; second and last round (AIW-D123 Q6). |
| **Changed 15 Oct 2026 (scrum 4b outcome 0 (a); AIW-D135, AIW-D165)** | **Change 8 added:** portal field mappings follow the same versioned, released, rule-tested registry as box maps, and the mapping owner is the **Content publisher** (SA-07 v2.15 SA7-D8, SA7-D48), released by another Content publisher or the Platform Owner (SA1-D6). AIW-D135's "mapping owner (Platform engineer role, Proposal)" is re-based by AIW-D165: the Platform engineer is not a console role (SA-07 v2.15 SA7-X22). The role-names line below now follows SA-07 v2.15. Line numbers are SA-01B v1.4 (`drive-snapshot-2026-10-13-1535`). |
| **Changed 16 Oct 2026 (the founder's AIW-D180)** | *(Superseded 17 Oct 2026 by AIW-D235: no fourth tier; see §9.)* **Change 9 added:** a fourth tier flag, **staff**, on the same canonical fields: filled by staff, never asked of the client. It changes the three-tier rule (SA-1B-2, SA-1B-82, SA-1B-83); register TC-177. Line numbers are SA-01B v1.4 (`drive-snapshot-2026-10-13-1535`). |
| **Changed 16 Oct 2026 (the founder's AIW-D174; the checker's Material 1 of 15:39:43Z)** | **Change 1 (3) updated:** a rare form with no released box map may be filled on its first real file once a licensed reviewer at that firm checks every box; a second Content publisher releases its map before any other firm uses it. Edited in the proposed SA1B-D28 and §3.5 words, the SA1B-D24 group and Phasing L84. Register TC-39 follows. |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 9 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-01B's own style (plain present tense).
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

**Numbering and names.** No new requirement number is needed here: the new rules live in SA-01 (SA-1-68, SA-1-69) and SA-08 (SA-8-69). Role names follow SA-07 v2.15 (SA7-D8): **Content publisher** and **Platform Owner**; there is no separate Content author or Content approver role (SA7-D48), so CN-SA-01 change 5's names are history.

**Two founder decisions bring this module back to the Founder Decisions Log** (changes 1 and 3). A module file never overrides a founder decision by date (README §0 rule 11). Both conflicts went to the founder on 11 Oct 2026, and he decided them. Change 1 was decided again on 14 Oct 2026 (AIW-D146).

---

## 1. Government form filling: full form and portal filling in Release 1 (FD-5; AIW-D43, AIW-D146)

> **Changed 14 Oct 2026 (AIW-D146).** The founder chose "Full form filling in R1": all forms and portals, no top-forms list. The 11 Oct words below ("the team states the route and a date") are replaced by this change's new (3). Line numbers in (1) and the new (2) are SA-01B **v1.4** (12 Oct 2026); the v1.2 quotes are kept below as history.

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

**(1a) What it changes in v1.4 (14 Oct 2026).** SA1B-D28 (L54); SA1B-D24 (L50) and SA1B-D34 (L60), "returns with autofill"; §0.1 deferral row (L80); SA1B-X10 (L105); §0.3 rows (L141, L142); SA-1B-63 (L319), SA-1B-90 (L361) and SA-1B-92 (L363), "returns with autofill"; SA1B-Q6 (L450); §3.5 Release 1 note (L211); §13 P1 (L461) and P2 (L462). Shared **99-Phasing-and-Glossary v2.20**: version row 2.6 (L19), the SA-1B row (L32) and the glossary entry "Startable" (L84).

**(2a) Current words (v1.4).**
> L54: "**Form autofill is parked for Release 1.** … **Parked until the content pack SQR is final:** box maps, deterministic filling, the forms editor, and placeholder P1 (how a filled form reaches the staff). *Reason:* a box map points at purposes and fields the library has not settled yet, so mapping now means mapping twice."
>
> L211 (§3.5): "**Release 1 (SA1B-D28):** only the form *list* ships — a row's form lines, assignment, upload, e-sign and readiness. Everything below about editions, box maps, transforms and filling is parked until the content pack SQR is final; the requirements stand so the work can resume without re-deciding it."
>
> L462 (§13 P2): "| **P2** | **Which forms are mapped for Release 1.** | The Canada content session (slice SA-01.15) | SA-1B-26 – SA-1B-32 are Should now for a named short list. |"
>
> L80: "Box maps and deterministic form filling (SA-1B-27 – SA-1B-32), the forms and field-map editor, and AI drafting of box maps (SA-1B-33) | Maps point at purposes and fields the library has not settled … | The content pack SQR is final"
>
> Phasing v2.20 L19: "form autofill parked for Release 1 (SA1B-D28) — … box maps, deterministic filling, the forms editor and AI map drafting move to Phase 3, to resume when the content pack SQR is final."
>
> Phasing v2.20 L32 (SA-1B row, Phase 1 cell, extract): "form lines on a row (which forms a filing needs, assignment, upload, e-sign, readiness — autofill parked)"
>
> Phasing v2.20 L84 ("Startable", extract): "every form on the row with a current edition (the box-map check returns with form autofill — SA1B-D28)"

**(3) Proposed words (14 Oct 2026, AIW-D146; replaces the 11 Oct proposal below).**
- **SA1B-D28 (L54):** "*(changed 14 Oct 2026 — the founder, AIW-D146; FD-5, AIW-D43)* **Form and portal filling is in Release 1, for every form and portal a published row uses.** Release 1 keeps the form list (assignment, upload, e-sign, readiness) and adds box maps, deterministic filling, the forms and field-map editor, AI drafting of box maps (SA-1B-33) under AIW-D135, and placeholder P1. **Box maps are versioned, released, rule-tested registry rows (AIW-D135):** the AI proposes a map, a rules-only round-trip test on a made-up case must pass for every box, a second person who is not its author releases it, and a form-change watch marks a map out of date when IRCC publishes a new edition, until a new version is released. **While a form edition has no released box map** (a rare form, or a new IRCC edition not yet mapped), *(16 Oct 2026, AIW-D174)* the AI proposes its matches and the form **may be filled on its first real file only after a licensed reviewer at that firm checks every box**. **Before any other firm uses the map,** the content team tests it on a made-up case and **a second Content publisher, never its author, releases it** (AIW-D165). Until that reviewer has checked every box, the case shows the form as filled by hand; this is a safe state, not a release cut. The fill stays deterministic (SA1B-D16): the first-file fill uses the reviewed matches, never AI at fill time (SA-1B-35)." The 23 Sep reasoning stays in the cell as history.
- **What "all forms" means (AIW-D146).** Every form edition and portal referenced by a published row of the Canada Release 1 pack (Release 1 has no Quebec immigration programmes: SA-1-65, "No Quebec immigration programs in Release 1"). The set is bounded by the content session's rows, not by a forms list.
- **§3.5 Release 1 note (L211):** "**Release 1 (SA1B-D28 as changed 14 Oct 2026, AIW-D146):** the form list and everything below — editions, box maps, transforms and filling — ship in Release 1 for every form a published row uses; a form edition with no released box map may be filled on its first file once a licensed reviewer at that firm checks every box, and a second Content publisher releases its map before any other firm uses it (AIW-D174); until the reviewer has checked it, it is filled by hand."
- **§0.1 (L80):** the row leaves the deferral table; "When" reads "Release 1 (AIW-D146)".
- **§0.3 (L141, L142):** L142 "**Defer**" reads "**Must now** (AIW-D146)"; L141's "autofill parked (SA1B-D28)" reads "filling in Release 1 (SA1B-D28 as changed)".
- **SA1B-D24 (L50), SA1B-D34 (L60), SA-1B-63 (L319), SA-1B-90 (L361), SA-1B-92 (L363), SA1B-Q6 (L450):** "returns with autofill" reads "applies in Release 1 (SA1B-D28 as changed)". The box-map check is part of the startable check for every form that has a published box map; a form without one is filled by hand until a licensed reviewer at the firm has checked every box of its first fill (SA1B-D28 as changed; AIW-D174).
- **SA1B-X10 (L105):** "nothing to meter in Release 1, because form autofill is parked" reads "the metric applies in Release 1 if SA-3 keeps it" (SA-03 v2.20 no longer limits prefilled forms, SA3-D14).
- **§13 P1 (L461), "Decide before":** "**Now** — the team states how it delivers FD-5's coordinate-mapped flattened-overlay fill for IRCC's XFA form editions (the four routes above are the team's own options; a route other than the flattened overlay, or the XFA runtime FD-5 defers to a later wave, is a conflict for the founder under README §0 rule 11, not a team choice), and the date by which box maps and filling ship within Release 1 (FD-5, AIW-D43, AIW-D146; the date feeds the launch-risk watch, `assumptions.md` R-1)." The same words are in CN-AG-07 item 26 and register TC-39.
- **§13 P2 (L462):** "Decide before" reads "**Now** — the Canada content session names the forms and portals every published Release 1 row uses; each has a published box map or portal mapping before the row is published"; the note cell reads "SA-1B-26 – SA-1B-32 are **Must now** (AIW-D146); no short list."
- **Phasing v2.20:** a new version row records that box maps, deterministic filling, the forms editor and AI map drafting move from Phase 3 to Release 1 (AIW-D146). **L32**, Phase 1 cell: "autofill parked" reads "box maps and deterministic form filling; the forms and field-map editor; AI drafting and diffing of box maps (AIW-D146)", and the Phase 3 cell drops them. **L84:** "(the box-map check returns with form autofill — SA1B-D28)" reads "(the box-map check applies to every form with a published box map; a form without one is filled by hand until a licensed reviewer at the firm has checked every box of its first fill — SA1B-D28 as changed, AIW-D146, AIW-D174)".

**(3, history) Proposed words of 11 Oct 2026, replaced on 14 Oct.**

SA1B-D28 gains, at the start of its decision cell:
> *(changed 11 Oct 2026 — FD-5 kept by the founder, AIW-D43)* **Founder Decisions Log FD-5 stands: flattened-overlay filling in version 1.** The team states the route for IRCC's forms (P1) and a date for box maps and filling. **While a form edition has no published box map, the case shows that form as filled by hand and offers no filling**; the form list, upload, e-sign and the readiness gate work as today. When filling ships it stays deterministic (SA1B-D16).

The rest of the cell stays as the record of the product owners' 23 Sep reasoning.

P1's "Decide before" becomes: "**Now** — the team names the route and a date (FD-5, AIW-D43)."

§0.1 (L67–L68), §0.3 (L110) and §3.5 (L180) are re-read against the date the team gives. *(v1.2 history only; the v1.4 lines are in the new (1a) and (3).)*

**(4) Why.**
- FD-5 (Founder Decisions Log v1.5, L30): "**Flattened-overlay support in v1** (coordinate-mapped fill + FormFieldMap visual editor), unit-priced per form edition; XFA runtime = named later-wave stub".
- SA1B-D28 parked filling. The conflict went to the founder: proposals row of 9 Oct (carve-out B, "Settle the Filler's release"); Step 2 decision 8, AIW-D43.
- The founder chose "Keep FD-5, ask the team" (AIW-D43; his words are quoted in CN-FDL): FD-5 stands, and the team was asked for the overlay route and a date.
- **A product rule, not a period.** AIW-D43's recorded effect, that the pilot runs without form filling and says so, is written as a state the product can check, a form edition with no published box map, so the rule does not depend on a pilot period (`00-step3-plan.md`, "No 'during the pilot' in a requirement"; re-check S3a-c m-12).
- SA-01B's own P1 (L400) says why the route matters: "The engine fills **AcroForm** PDFs and refuses XFA templates (§12), and IRCC's 2D-barcode forms are XFA."
- **AIW-D146 (14 Oct 2026):** asked by the checker through the interview tool; the founder chose "Full form filling in R1": "Full form and portal filling is in Release 1, for all forms and portals. FD-5, AIW-D43, AIW-D113 and AIW-D135 stand in full; the top-forms list is not adopted." Portal filling is AIW-D113 (verified values and tested field mappings in the representative's own session, with approval of the planned entry) and AIW-D135 (field mappings for form and portal filling are versioned, rule-tested, second-person-released registry rows; the planned-entry approval is needed only on a mapping version's first use in a firm or on a difference).
- **The team's 23 Sep reason** (mapping now means mapping twice) is why the date is asked, not a reason to park: the Canada content session (P2, SA-01.15) settles the library first, then the maps are made.
- **Risk, recorded, not a scope cut:** `assumptions.md` R-1. The team parked filling on 23 Sep and its recorded capacity is limited (the recorded evidence does not support full Super Admin and Agent acceptance by 15 Dec 2026 (the checker's sprint analysis, PROGRESS 04:01:36Z, 14 Oct 2026; the hidden September sprint totals are not current measured speed)); under AIW-D66 (launch waits for AI) full filling in Release 1 raises launch risk. The founder tells the team (we write to no one, AIW-D10).

**(5) Knock-ons.**
- SA1B-X10 (L105, the "auto-prefilled forms" metric) applies if SA-03 keeps it: SA-03 v2.20 no longer limits prefilled forms (SA3-D14).
- The shared 99-Phasing-and-Glossary v2.20 (row 2.6, the SA-1B row L32, "Startable" L84) follows (3).
- Founder Decisions Log FD-5: CN-FDL change 3 (AIW-D146 line).
- Register TC-39 (re-based to AIW-D146).
- AG-07's Filler (CN-AG-07 change 4, new item 26: Release 1, all forms and portals; the team states how it delivers FD-5's overlay and the date).
- AW-02 §12 (L1010, "box maps and the forms editor parked"; L1015, "AI drafting of box maps stays parked"): re-based to Release 1 under AIW-D146 (scrum 4 reconciliation).
- AW-01 AW-1-83, §Phasing (L1619) and tests TC-AW1-118, TC-AW1-119: once the route exists, the form duty (W-05) runs per form that has a published box map; an unmapped form shows "filled by hand" (AIW-D146; scrum 4 reconciliation).
- AIW-D135's registry change note (mapping proposer, round-trip test, second-person release, form-change watch): box maps are change 1 (3); portal field mappings and the mapping owner are **change 8** (15 Oct 2026).
- The Program Charter does carry form-filling lines (V1 – G1 expanded, snapshot 1535, L115: "does not auto-fill government forms (parked by the team, SA1B-D28)"; L328: "Government form auto-fill" under Deferred scope; V2 slide 4). *Corrected 14 Oct 2026:* this note said earlier that it had none. The edits are in `ai-workers/requirements/charter-edits-2026-10-14.md` §3 (register TC-39); the general "Not in Release 1: AI-assisted features" line is TC-41.

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

SA1B-D18 gains: "*(changed 11 Oct 2026 — AIW-D49)* The approver opens the **rehearsal report** attached to every production submission (SA-1-68) before approving; the approve action is available only once it is opened; it is evidence, not a blocking gate."

SA-1B-38:
> - **SA-1B-38** *(changed — AIW-D49)* A change to a gate or a scoring grid is trusted by **second-person approval**, given after opening the **rehearsal report** that every production submission carries (SA-1-68); there are no mandatory or blocking test profiles, and publishing runs no blocking test set.

§0.1 L71 and §0.3 L114 gain: "The rehearsal report of SA-1-68 is not a test profile: it is evidence the approver reads (AIW-D49)."

SA-1-19, SA-1-26 and SA-1B-62 each gain: "The sample client (or family) is always synthetic and marked so (SA-1-68)."

**(4) Why.**
- AIW-D49, 11 Oct 2026, "Attach a rehearsal report" (quoted in CN-SA-01): the rehearsal report goes with each production submission and the second person reads it; no new blocking gate.
- Proposals row 112 (approval waits until the report is opened). Proposals row of 10 Oct (Pack author's AI, test gate). AW-2-52 (AIW-D49).
- The synthetic rule: proposals row of 10 Oct (Pack author's AI, Rule, naming SA-1-52 and SA-1B-62); G-7.

**(5) Knock-ons.** SA-01 SA-1-68 (CN-SA-01 change 1). AG-03 BR-18 (CN-AG-03).

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
- The founder amended its second clause (AIW-D48, "Two people for all"; quoted as worded earlier, and SA-01 v2.4 §3.12 still requires two people): "reference data in a published country pack (fees, wage tables) also needs two people, matching SA-01 v2.2 §3.12."
- Proposals row of 10 Oct (Pack author's AI, test gate, part 2). AIW-D48 (CN-FDL change 1).

**(5) Knock-ons.** The Founder Decisions Log carries the amendment (CN-FDL change 1).

---

## 4. A government source is recorded as its web address, so the watcher fetches only that

**(1) What it changes.** SA-1B-39 (L207).

**(2) Current words.**

L207:
> - **SA-1B-39** Every gate, scoring row, document requirement, form edition, fee, programme definition and reference table carries a **government source, a date checked and a next-review date**.

**(3) Proposed words.** SA-1B-39 gains: "*(changed — read-only source rail)* Where the government source is a web page, it is recorded as the page's **full official web address**. Only addresses recorded here may be fetched by the read-only government source rail (SA-8-69)."

**(4) Why.** Proposals row of 10 Oct (Pack author's AI, outbound fetch): the rail is "limited to the addresses recorded as sources under SA-1B-39, never an address found on a page". Relied on by AW-2-54.

**(5) Knock-ons.** SA-08 SA-8-69 (CN-SA-08 change 3). The Canada pack content the specialist authors (AIW-D50) records addresses in this form.

---

## 5. The overdue-review work queue also carries "source page changed"

> **Re-based 13 Oct 2026 (source reconciliation).** SA-01B v1.4 SA-1B-40 (L239) now reads: a sortable "next review" column and a weekly email to the content team, and "There is no queue screen" (SA1-D16, SA1B-D35; the weekly email is a code constant). The proposal below is therefore re-aimed: the **"source page changed"** signal is (a) a line in that weekly email, naming the content items that cite the page and, where the Pack author's AI drafted one, the proposed change file, and (b) a flag beside the item in the "next review" column; dismissing the flag records who and why. No queue is described as existing (register TC-130 re-based). AW-02 AW-2-56 (who closes the item) applies to the flag.

**(1) What it changes.** SA-1B-40 (L208).

**(2) Current words.**

L208:
> - **SA-1B-40** Overdue items appear on a work queue and warn at publish. Content never expires silently.

**(3) Proposed words.**

> - **SA-1B-40** *(changed — G-4)* Overdue items appear on a work queue and warn at publish. Content never expires silently. The same queue also carries a **"source page changed"** item when the government page recorded under SA-1B-39 has changed since it was last checked. The item lists the content items that cite the page and, where the Pack author's AI drafted one, a proposed change file for the author to review. Dismissing the item records who dismissed it and why.

**(4) Why.** The 10 Oct design gap behind AW-2-56 (Proposal; SA-1B-40): "The work queue of SA-1B-40 carries overdue reviews only; a *changed source* item kind with the proposed change file is needed." The assistant never writes into the pack (AIW-D54 item 7). The comparison and the list of citing items are rule-built and run now; a drafted change file is a model call and waits for CN-FDL open point 3 (`00-step3-plan.md`, "Pack calls before the founder answers").

**(5) Knock-ons.** AW-02 (the watcher, AW-2-53 and AW-2-56).

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
- AW-2-19 (Proposal; IMP-11), from the 10 Oct design gap: "each drafted map line, scoring row or reference row carries an *AI-drafted* marker and the model's confidence inside the import file and on the line after the author's commit, until the author reviews it".
- "Low-confidence lines first" is the first of the approve-all safeguards the founder adopted (AIW-D57, ~~provisional until counsel~~ final by AIW-D108 (12 Oct 2026); G-16). The safeguard cannot be switched off while the approve-all part of the *founder safeguards* setting is on (SA-12-37).
- **Drafting runs once the provider record is published.** Drafting a map line is a model call; since the founder decided CN-FDL open point 3 (AIW-D74, "Yes, Canada for all AI"), it runs once the one published provider record exists (SA-8-66). Until then, and whenever the record is withdrawn, the two columns stay empty and the author maps by hand. The marker rule applies from the first drafted line.

**(5) Knock-ons.** FD-5 and AIW-D146 (change 1) put box maps in Release 1; drafting runs once the provider record is published, under AIW-D135 (change 1 (3)). AW-02 specifies the drafting step.

---

## 8. Portal field mappings are versioned, released registry rows; the Content publisher owns them (AIW-D135, AIW-D165)

> **Added 15 Oct 2026 (scrum 4b outcome 0 (a)).** Change 1 (3) made **box maps** registry rows. This change does the same for the **portal half** of AIW-D135 and names the owner. Line numbers are SA-01B v1.4 (12 Oct 2026, snapshot 1535).

**(1) What it changes.** SA-1B-32 (L219); SA-1B-33 (L220); §13 P2 (L462, already changed by change 1 (3)). No new requirement number.

**(2) Current words.**
> L219: "**SA-1B-32** For categories filed in a government portal there is no PDF; the output is the answers laid out in the portal's own order."
>
> L220: "**SA-1B-33** AI may **draft** a box map for a new form or edition and **diff** a new edition against the existing map; a person approves before publishing."

**(3) Proposed words.**
- **SA-1B-32** *(changed — AIW-D113, AIW-D135, AIW-D146)* For categories filed in a government portal there is no PDF; the output is the answers laid out in the portal's own order, through a **portal field mapping** (portal page and field → purpose plus field, with the same transforms and value maps as SA-1B-27). **A portal field mapping is a versioned, released registry row, like a box map:** the AI may propose one (a proposal item, never used directly); a rules-only round-trip test on a made-up case must pass for every field; a second person who is not its author releases it; a form-change watch marks it out of date when the portal page or the form edition changes, until a new version is released. **While a portal has no released mapping, or its mapping is out of date**, the case offers a copy-ready field sheet (field, value, source) and no assisted filling.
- **SA-1B-33** gains: "The same applies to a portal field mapping (SA-1B-32)."
- **Who owns mappings** (a sentence in SA1B-D28 as changed, and in SA-07 Appendix A's Content publisher row, no new key): "A **Content publisher** writes and maintains box maps and portal field mappings for their assigned countries (SA7-D9). Releasing a mapping version follows the production-pack rule (SA1-D6): another Content publisher or the Platform Owner releases it; its author and its submitter never do; test-only use is exempt. Enabling assisted filling for a portal after its terms-of-use check stays with the **Platform Owner** (AW-01 AW-1-147(h))."

**(4) Why.**
- AIW-D135 (13 Oct 2026): "Field mappings for portal and form filling become versioned, released, rule-tested registry rows". It named the owner as the "Platform engineer role, Proposal".
- SA-07 v2.15 SA7-X22 (L230): "'Security & audit' and 'Platform engineer' are not roles." The six staff roles are Platform Owner, Admin, Support, Billing, Content publisher and Auditor (SA7-D8, L49).
- The Content publisher already "Writes the Canada pack, approves and publishes packs — never their own draft" (SA-07 v2.15 §2 "Users & Jobs-to-be-Done", L346) and is the one country-scoped role (SA7-D9, L50). Box maps live with the form inside the pack (SA-1B-26). So mappings belong to the same people under the same second-person rule; no new role, key or approval flow (AIW-D165).
- AIW-D146: full form and portal filling is in Release 1, so portal mappings are needed for every portal a published Release 1 row uses (change 1 (3), P2).

**(5) Knock-ons.**
- AW-01 AW-1-147(a): "released by a second person who is not its author" now names the rule: SA1-D6 (Content publisher or Platform Owner).
- Register TC-156: its "to write" pointer is this change.
- The form-change watch for portal pages is the same team dependency as for form editions (change 5's "source page changed" signal); no new component beyond AIW-D135's three.
- SA-07 Appendix A: the Content publisher row's description gains "box maps and portal field mappings"; no key changes.

---

## 9. A fourth tier flag: staff (filled by staff, never asked of the client) (AIW-D180)

> **Superseded 17 Oct 2026 by AIW-D235; marked 18 Oct 2026 (Solution 1 cohesion pass). Do not send this change to the team or carry it into the detailed pack.** The three lifecycle tiers stay (lead, prospect, case; SA-1B-2 unchanged). The intended behaviour stands: clients are never asked staff or profile facts. It is met instead by one **"collected from"** setting on the placement (SA-1B-7: client questionnaire, staff working view, profile record, or verified document or existing record), with visibility and editing following the existing permissions. The text below is kept as history.

> **Added 16 Oct 2026 (the founder's AIW-D180).** Line numbers are SA-01B v1.4 (12 Oct 2026, snapshot 1535).

**(1) What it changes.** SA-1B-2 (L166); SA-1B-82 (L347); SA-1B-83 (L348); SA1B-D21 (L47). No new requirement number.

**(2) Current words.**
> L166: "**SA-1B-2** Each canonical field carries a **tier flag — lead, prospect or case** — which decides whether it appears on the lead form, the PQR or only in the SQR (§8)."
>
> L347: "**SA-1B-82** The **PQR** is the lead and prospect fields, delivered by link or filled with the prospect, with save and resume. The **SQR** is everything that applies to the filing."
>
> L348: "**SA-1B-83** Each tier pre-fills the next, and no question is asked twice across the three."

**(3) Proposed words.**
- **SA-1B-2** *(changed — AIW-D180)* Each canonical field carries a **tier flag — lead, prospect, case or staff** — which decides whether it appears on the lead form, the PQR, only in the SQR, or **never to the client**. A **staff** field is filled by firm staff, or from a document a person has verified, and is never asked of the client; it is stored once on the same canonical field, so every form box that reads it shows the same value. The tier flag decides who is asked, not who may see a value: handling classes and Restricted values are unchanged.
- **SA-1B-82** gains: "The SQR is everything that applies to the filing **except staff fields**; staff fields appear only on the staff side of the case, with every form box that reads them."
- **SA-1B-83** gains: "A staff field is never asked of the client; where a document supplies it, staff confirm the read value instead of typing it."
- **SA1B-D21** reads "three tiers by a field flag" as "**three client tiers and a staff tier** by a field flag".

**(4) Why.**
- AIW-D180 (16 Oct 2026): the founder chose "a fourth flag on the same shared facts (AIW-D170), meaning 'filled by staff, never asked of the client' — not a privacy flag (Restricted values stay separate)".
- Full form filling is in Release 1 (AIW-D146, change 1). Government forms carry boxes the client never answers: the application number, the representative's details (IMM 5476), boxes only the firm completes. *(16 Oct 2026, AIW-D180 correction: the UCI is not staff-only; a returning client holds it on past visas and permits, so it stays a client question plus a document read.)* With three flags, each of these either goes into the SQR (the client is asked something they cannot know) or sits outside the canonical fields (a second copy that a form can disagree with, against AIW-D170 and the zero-wrong-values bar of AIW-D175).

**(5) Knock-ons.**
- Register TC-177.
- The case's staff view lists staff fields with the boxes that read them; the screen itself is the team's (AG-07). AW-03 cites this change and does not design the screen.
- SA-1B-29's box status (filled, needs review, unmapped) applies to boxes that read staff fields in the same way.
- Change 7's version row gains "a fourth tier flag, staff".

---

## 7. Document control

**(1) What it changes.** The document-control table (L5–L9).

**(2) Current words.** The last row is v1.2 of 2026-10-05.

**(3) Proposed words.** A version row (renumbered 13 Oct 2026; 1.3 and 1.4 are the team's): "| 1.5 | *(date placed)* | Workstream 2 change note CN-SA-01B applied: form and portal filling in Release 1 for every form and portal a published row uses (SA1B-D28 changed; a form edition with no published box map is filled by hand until mapped; the team states the overlay route and a date), rehearsal report at the publish gate (approve only after opening it), synthetic samples, reference rows under two people (FD-4 as amended), source addresses, changed-source queue item, AI-drafted line marker; portal field mappings as versioned, released registry rows owned by the Content publisher; a fourth tier flag, staff (filled by staff, never asked of the client). | FD-5, FD-4 (amended), AIW-D43, AIW-D48, AIW-D49, AIW-D135, AIW-D146, AIW-D165, AIW-D180 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
