# Change note CN-SA-09: Platform Analytics and Observability

| | |
|---|---|
| **Document changed** | SA-09 Platform Analytics & Observability, version 2.2, dated 2026-10-02 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-09-platform-analytics-and-observability_v2.2_2026-10-02.md` |
| **Date of this note** | 11 Oct 2026 (added in the fix round after review S3a, as the Super Admin half that CN-AG-14 points to) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 2 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-09's own style.
4. Why: the founder's decision (`ai-workers/decisions.md`, AIW-D*n*) or the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*).
5. What else must change.

**Why this note exists.** The firm sees its own AI measures in AG-14; the Agent-plane note CN-AG-14 change 2 adds them as AG-14-39. Expat Ready needs the same measures across firms to:
- run the pilot;
- set spend caps (AIW-D62);
- price the assistants in Step 5 (AIW-D60).

SA-9 is "the **one and only place** cross-tenant aggregate metrics are permitted to exist" (L14).

---

## 1. AI measures in platform analytics, aggregated and de-identified

**(1) What it changes.** §3.4 "Product-Usage Metrics" (L205–L224); §7 `MetricDefinition` (L430); a new requirement after SA-9-23 (the document's last, L374).

**(2) Current words.**

L430 (extract):
> `category` (BUSINESS / USAGE / HEALTH / SUPPORT)

**(3) Proposed words.**

`MetricDefinition.category` gains `AI`.

New requirement:
> - **SA-9-24** *(new — IMP-29; AIW-D60, AIW-D62)* — AI metrics, aggregated per firm, per plan and per day from the AI run log, approval items and audit entries, de-identified (BR-9), with demo firms excluded (SA-9-23):
>   - model calls and their cost, per AI Doer and per AI assistant;
>   - spend against each firm's cap (SA-12-33);
>   - acceptance of AI-prepared items (approved unedited, edited, rejected), per assistant and per item kind;
>   - provider errors and fallbacks to the manual path;
>   - items withdrawn by the recall (SA-12-32);
>   - the Case assistant's prepared-file count.
>
>   Figures are shown per firm and platform-wide, never per staff member of a firm.

**(4) Why.**
- **IMP-29** asks for "measures computed from the AI run log, approval items and the provenance view" in "AG-14 (firm) and SA-09 (platform)": acceptance, reliability, cost, safety ("items withdrawn"). IMP-29 is relied on by the passed behaviour documents (`case-assistant.md` §9 G-19, `billing-assistant.md` §9 G-19, `firm-assistant.md` §9 G-16, `intake-assistant.md` §9 GI-14, as cited by CN-AG-14). IMP-29 also says that firm views "show the firm its own AI, never rank its staff".
- **AIW-D60:** "the others ride inside the plan for the pilot, usage measured", and only the Case assistant is costed.
- **AIW-D62:** spend caps are decided after the pilot.
- Counts of AI items are a new usage family, like SA-9's module activity counters (L208).

**(5) Knock-ons.**
- AG-14-39 (CN-AG-14 change 2) is the firm-side twin.
- SA-12-33 (spend caps; CN-SA-12 change 3).
- AW-01 AW-1-55 (run-record cost) feeds it.

---

## 2. Document control

**(1) What it changes.** The document-control table (L4–L8).

**(2) Current words.** The last row is v2.2 of 2026-10-02.

**(3) Proposed words.** A version row: "| 2.3 | *(date placed)* | Workstream 2 change note CN-SA-09 applied: AI metric category and SA-9-24 (AI usage, cost, acceptance, reliability, recall; per firm, never per staff member). | IMP-29; AIW-D60, AIW-D62 |".

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
