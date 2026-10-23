# Change note CN-SA-09: Platform Analytics and Observability

| | |
|---|---|
| **Document changed** | SA-09 Platform Analytics & Observability, version 2.2, dated 2026-10-02 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-09 v2.4**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-09-platform-analytics-and-observability_v2.4_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.4" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-09 v2.4** (12 Oct 2026). The module was **cut to one Business page and a Usage tab** (SA9-D1 to SA9-D9; about eight numbers counted nightly, no filters, no personal-data columns); `MetricDefinition` is **parked**; eighteen requirements and most rules are withdrawn; `system/analytics:view-usage` and `:export` no longer exist (`:view` and `:view-revenue` only; the CSV download is audited). **ID collision:** our SA-9-24 was taken ("The Business page"); renumbered **SA-9-24 → SA-9-27**; version row 2.3 → **2.5**. **Change 1 is re-stated as a request to the team**, not a change to a metric catalogue: a fixed set of AI numbers (model calls and cost, acceptance of AI-prepared items, provider errors, recalls), aggregated and de-identified, added to the Business page or the Usage tab by a code change; the sentence "`MetricDefinition.category` gains `AI`" is **withdrawn** with the parked entity. **UNSURE** whether the product owner wants AI measures in SA-09 at all after the cut (team question). The SA-9-20 alert-rule pattern is gone: cite the SA-08 status-page red lines (SA-8-27, SA-8-63) instead. Line numbers and quotes below are v2.2's. |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-09-platform-analytics-and-observability_v2.2_2026-10-02.md` |
| **Date of this note** | 11 Oct 2026 (added in the fix round after review S3a, as the Super Admin half that CN-AG-14 points to) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 2 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-09's own style.
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

**Why this note exists.** The firm sees its own AI measures in AG-14; the Agent-plane note CN-AG-14 change 2 adds them as AG-14-39. Expat Ready needs the same measures across firms to:
- run the pilot;
- set spend caps (AIW-D62);
- price the assistants in Step 5 (AIW-D60).

SA-9 is "the **one and only place** cross-tenant aggregate metrics are permitted to exist" (L14).

---

## 1. AI measures in platform analytics, aggregated and de-identified

> **Re-stated 13 Oct 2026 (source reconciliation).** SA-09 v2.4 parks `MetricDefinition` and fixes the Business page in code (SA-9-24 v2.4, SA9-D1 to D9: about eight nightly numbers, no filters, no personal-data columns; `system/analytics:view` and `:view-revenue` only). The sentence "`MetricDefinition.category` gains `AI`" is **withdrawn**. The requirement below, now **SA-9-27**, is offered as a **request to the team**: a fixed set of AI numbers (model calls and cost; acceptance of AI-prepared items as approved unedited, edited, rejected; provider errors and manual fallbacks; recalls), aggregated per firm and platform-wide, de-identified, demo firms excluded (SA-9-23), added to the Business page or the Usage tab by a code change. UNSURE whether the product owner wants AI measures in SA-09 after the cut; AW-02 AW-2-40 keeps its own measures from the AI run log meanwhile.

**(1) What it changes.** §3.4 "Product-Usage Metrics" (L205–L224); §7 `MetricDefinition` (L430); a new requirement after SA-9-23 (the document's last, L374).

**(2) Current words.**

L430 (extract):
> `category` (BUSINESS / USAGE / HEALTH / SUPPORT)

**(3) Proposed words.**

`MetricDefinition.category` gains `AI`.

New requirement:
> - **SA-9-27** *(new — IMP-29; AIW-D60, AIW-D62)* — AI metrics, aggregated per firm, per plan and per day from the AI run log, approval items and audit entries, de-identified (BR-9), with demo firms excluded (SA-9-23):
>   - model calls and their cost, per AI Doer and per assistant;
>   - spend against each firm's cap (SA-12-37);
>   - acceptance of AI-prepared items (approved unedited, edited, rejected), per assistant and per item kind;
>   - provider errors and fallbacks to the manual path;
>   - items withdrawn by the recall (SA-12-36);
>   - the Case Officer's AI's prepared-file count.
>
>   Figures are shown per firm and platform-wide, never per staff member of a firm.

**(4) Why.**
- **IMP-29** asks for "measures computed from the AI run log, approval items and the provenance view" in "AG-14 (firm) and SA-09 (platform)": acceptance, reliability, cost, safety ("items withdrawn"). IMP-29 is relied on by the passed behaviour documents (AW-1-121, as cited by CN-AG-14). IMP-29 also says that firm views "show the firm its own AI, never rank its staff".
- **AIW-D60:** "the others ride inside the plan for the pilot, usage measured", and only the Case Officer's AI is costed.
- **AIW-D62:** spend caps are decided after the pilot.
- Counts of AI items are a new usage family, like SA-9's module activity counters (L208).

**(5) Knock-ons.**
- AG-14-39 (CN-AG-14 change 2) is the firm-side twin.
- SA-12-37 (spend caps; CN-SA-12 change 3).
- AW-01 AW-1-55 (run-record cost) feeds it.

---

## 2. Document control

**(1) What it changes.** The document-control table (L4–L8).

**(2) Current words.** The last row is v2.2 of 2026-10-02.

**(3) Proposed words.** A version row (renumbered 13 Oct 2026; 2.3 and 2.4 are the team's): "| 2.5 | *(date placed)* | Workstream 2 change note CN-SA-09 applied: AI metric category and SA-9-27 (AI usage, cost, acceptance, reliability, recall; per firm, never per staff member). | IMP-29; AIW-D60, AIW-D62 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
