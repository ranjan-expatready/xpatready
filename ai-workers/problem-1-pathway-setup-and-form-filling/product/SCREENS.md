# Screens — register of screens and slices

Register of screens and slices. **Stages live only in `lanes/*.md`** (`lane.sh table`); test results live in each item's `lead-check.md` and the qa reports. Journey step IDs are the solution page's activities; capabilities in `qa/CAPABILITIES.md`.

## Milestone 2 — Product Studio · Pathway Configurator (Super Admin)

| # | Screen (menu item) | Journey steps | SA-01B | Lane | Carried backend work |
|---|---|---|---|---|---|
| 01 | **Programs** — combination catalogue, new combination and full combination page | 1.1 | 1B-50..56, 90..91; 1-12..15 | screens | Forms lane F1 adds channels to rows and lines (slice 3). Release-path defect QA-1 and other bugs: `qa/BUGS.md`. |
| 02 | **AI work** (PDF and online sources, P-61/P-62) + combination "Draft setup / Review proposals" — sources read, AI proposals (reuse / new / ambiguous / conflict) beside the source; **new-edition impact**: box-by-box comparison, AI impact on reusable components and every combination using the form, accept → release (P-32) | 1.3, 2.1, 2.2, 3.1, 3.2 | 1B-33..35 | screens | Builder's 21 Oct AI-orchestration slice (repeat launch, cancel, retry, stale result) is the backend for this screen |
| 03 | **Combination workspace** (P-35) — tabs: Overview · Forms · **PQR** (pre-qualification question authoring; subset of SQR asked at lead stage) · **SQR** (full questionnaire authoring per person) · Documents (checklist authoring per person) · **Rules** (every rule that applies, as sentences, with its source; replaces dropped Screen 05) · **Preview by person** (representative sample-family preview using the shared questionnaire renderer) · Review and release. **Links** to other combinations ("Supported by", "Follows", with the facts and documents they carry; P-59). Agent/case runtime is M3. | 3.3, 3.4, 3.7 | 1B-57..63, 102 | screens | PQR/SQR and representative preview are configuration capabilities; no scoring/verdict engine for PQR (team) |
| 04 | **Shared library** — read-only lists plus **"Describe what you need"** for Field and Section (P-34); **Forms: "Add forms" (one or bulk) through the shared intake, list with code · title · edition · published · box map · used by · status (P-51)** — Fields · Sections · Document types · Forms · Checks: what exists, where used, AI or person, reused vs new per combination; Forms shows each form's editions and any new edition waiting for impact review (P-32). No direct editing, merge execution or rule authoring (P-28) | 3.1, 3.4 | 1B-1..24, 26..32 | screens | — |
| 05 | Rules inside the workspace — rule map per combination: fact rules (from library) vs requirement lines (domain/RULES-MODEL.md) | 3.5, 3.8, 4.1 | 1B-9, 14, 36 | Dropped (P-28) | Audit F3: unreachable conditional questions; hiding a field a form needs must fail release |
| 06 | **Releases** — review and release change set, expert confirmations, approver ≠ author | 4.4, 5.1, 5.2, 5.3 | 1B-38, 39 | Existing Release button only (P-28) | Audit F2: review list must include every behaviour-bearing change (roles, document facts, derived fields) |
| 07 | **Activity** — audit trail and freshness (next review due) | 10.1 | 1B-39, 40 | Dropped (P-28) | — |

## Demo combinations (P-29) — run through 03b in this order
| # | Workspace | Combination | Forms (official PDFs) | Why it is in |
|---|---|---|---|---|
| 1 | Individual | Visitors › Visitor visa (applicant, spouse, children) | IMM 5257 + Schedule 1, IMM 5707, IMM 5476 | Already proven live; principal, spouse, child |
| 2 | Individual | Work permits › Employer-specific work permit › With an LMIA | IMM 1295, IMM 5707, IMM 5476 | Already measured; shows "Supported by: Corporate › LMIA" |
| 3 | Individual | Family sponsorship › Spouse or partner › Applicant outside Canada | IMM 1344, IMM 0008, IMM 5532, IMM 5669, IMM 5406, IMM 5476; checklist IMM 5533 | Permanent residence; sponsor + applicant; biggest reuse test |
| 4 | Corporate | LMIA › High-wage position | EMP5711 employment agreement (PDF) + answer sheet for LMIA Online (a person uploads ESDC's stream pages as sources) | Employer as applicant; feeds combination 2 |
| 5 | Corporate | LMIA › Low-wage position | EMP5712 employment agreement (PDF) + answer sheet for LMIA Online | Shares most facts with 4: reuse across employers |
| 6 | Individual | Economic immigration › Express Entry › Profile → Permanent residence application (route, P-24) | None — online only; a person uploads IRCC's Express Entry pages (saved) as sources; output = answer sheet per step | Most-filed PR program; two-step route; reuses PR facts from 3 (IMM 0008, 5669, 5406 questions) |
| Extension | Individual | Study permit; Post-graduation work permit (inside Canada) | IMM 1294 + checklist IMM 5483; IMM 5710 + checklist IMM 5583 | Reuse; inside Canada |
| Extension | Corporate | LMIA › Global Talent Stream; LMIA › In-home caregiver (household employer) | EMP5713 + answer sheet; answer sheet only | Fast-track stream; "Corporate and employers" label |
Sources: `official-sources/ircc/` and `official-sources/esdc/` (manifests); the files are fetched to disk at every /next (P-31, housekeeping) so a person can upload them in the demo — the product never fetches forms itself (P-32). New-edition test inputs: `ircc/previous-editions/` (IMM 5476 2021, IMM 5257 2019). LMIA application forms (EMP5626/5627/5624/5628) are not public — ESDC issues them only on request — so Corporate proof = filled employment agreement + checked LMIA Online answer sheet (P-30).

## Optional spike (P-45, parked by P-46) — separate folder, copies only, no app code
| S-1 | **Optional, after the demo (P-46)** · **IRCC form in the browser** — render IMM 5532, IMM 5257 and IMM 0008 (dynamic XFA) in a web viewer; run their own Validate button; save; reopen in Adobe Reader and confirm the data and barcodes. Try pdf.js (XFA mode), then commercial SDK trials (Foxit Web SDK with XFA add-on, Apryse). Output: what works, cost, licence, recommendation | — | — | Parked | Only an enhancement; the safe path (P-46) is the design |

## Forms and runtime slices
| # | Slice | Lane | Path | Notes |
|---|---|---|---|---|
| F1 | Forms channels: PDF and online, capture, portal twin, answer lists, aliases and merges, validator (P-61–P-66) | forms | backend, then Screen 01–04 hooks | Concept `screens/F1-forms-channels/` |
| F2 | Browser extension: capture and fill on a saved portal screen (P-66) | forms | backend + extension | After F1 |
| R1 | Thin end-to-end slice: case, people, answers once, renderer, agent view, IMM 5257 from case facts (P-67) | runtime | backend + new runtime pages | Concept `screens/R1-thin-slice/` |
| E1 | Fill trial in Adobe per form edition (P-46, P-65) | evidence | evidence | IMM 1344 passed after two person steps (23 Oct) |

## Milestone 3 — connected case, agent and client runtime

**Prepare application** per filing (portal sheet, filled PDF, signed PDF; P-62) and an extension capture-and-fill proof on a saved portal screen. Use the same P-47 configuration-driven questionnaire renderer built for M2 authoring and representative preview. Deliver PQR/SQR at runtime, case officer case/person workflow, normalized **agent view** with dynamic document checklist and form filling, client family link, and form review/checked PDF or online answer sheet. Include all question types, validation tiers, rules, reuse across combinations, new-edition impact and checked-output proof. Design reference: `decisions/P-39-filled-form-review.md`; journey steps 6.1–9.3 and board steps 10 and 12. Menus are defined when M3 design starts. Linked cases receive the facts and documents their combination links carry (P-59).

## Cross-milestone acceptance loop (after M3)

**Demo loop** (P-18, P-28, P-32): reset → configure and release → case/client answers → checked PDF or answer sheet → add a combination and prove reuse → upload a new edition, review its impact and release. Repeat for the top combinations: start 3 Individual + 2 Corporate/employer, extend to 5 + 5. Run first with proven forms (IMM 5257, combination 1), then once per new combination.
