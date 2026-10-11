# CN-AG-18: change note to AG-18 Data Import and Migration

| Field | Value |
|---|---|
| Module changed | AG-18 Data Import & Migration |
| Version and file | v1.2 of 7 Oct 2026, `02-functional-requirements/agent/AG-18-data-import-and-migration_v1.2_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-18-92 to AG-18-94 (the module states: "New requirements continue from AG-18-92", L332) |
| Companion files | CN-AG-09 item 4 (key dates from any source); CN-AG-11 items 3, 4, 5 and 6; AW-01 (the Firm assistant, for the Owner) |

**In plain words.** The Firm assistant may help the Owner map an old spreadsheet's columns and read old notes for dates the product should watch. Neither may write anything on its own: mapping proposals sit beside the engine's own suggestions and count as unmapped until the Owner confirms them, and a date found in an old note reaches the deadline watch only after a person approves it. The engine also needs to announce when a batch is ready for mapping, so the assistant knows when to help.

---

## 1. AI mapping proposals sit beside the engine's suggestions and count only when confirmed

1. **Where.** §3.2 (L232–L236); AG-18-8 (L346); AG-18-9 (L347); AG-18-10 (L348); new requirement **AG-18-92**.
2. **Current words.**
   > L348: "The system MAY **suggest** a program for a group (exact or near match); a suggestion SHALL be flagged as exact or near, pre-filled, and **confirmed per group** (with "map all selected to X" for several groups); nothing SHALL be written from an unconfirmed suggestion."
3. **Proposed words.**
   > **AG-18-92 (AI mapping proposals).** Where the firm's AI is on (AG-16-35) and the Owner's AI assistant works under a delegation that includes imports (AW-01), the mapping screen SHALL show the assistant's field, value and program mapping proposals read-only beside the engine's own suggestions (AG-18-10). Each proposal SHALL be checked against the target's field list and allowed values (AG-18-8, AG-18-9) before it is shown, and one that fails SHALL NOT be shown. A proposal SHALL count as unmapped until a holder of `agent/import:run` confirms it, exactly as an unconfirmed suggestion does (AG-18-10); nothing SHALL be written from a proposal alone.
4. **Why.** `proposals.md` row of 10 Oct (Firm assistant, item (2): "an approval-item kind *import mapping* that opens AG-18's own mapping screen with the proposals shown read-only beside the engine's suggestions (AG-18-10), each confirmed by the Owner under `agent/import:run`, and checked against the field list and allowed values (AG-18-8, AG-18-9)"); AIW-D38 (the Firm assistant keeps its delegations); `firm-assistant.md` §9 G-3.
5. **Knock-ons.** AG-11 action `draft_structured` and item kind `IMPORT_MAPPING` (CN-AG-11 items 3 and 6). Open, not written: whether such proposals may run inside an assisted-migration support session (AG-18-46, AG-18-47; `firm-assistant.md` §9 G-19 sends it to counsel and the team, with no decision yet).

## 2. A date found in an imported note reaches the Minder only through a person

1. **Where.** AG-18-29 (L373); AG-18-25 (L369); AG-18-81 (L443); new requirement **AG-18-93**.
2. **Current words.**
   > L373: "Notes SHALL be imported as timeline entries on the matched person, client or case, marked "imported" and historical, with their original date and author name as carried by the source (minimal fields, §7)."
3. **Proposed words.**
   > **AG-18-93 (key dates from imported notes).** An imported note SHALL stay historical and never-send (AG-18-29). Where the firm's AI is on, the Reader MAY read an imported note's text as delimited data and propose a key date it finds (for example a permit expiry), with the note as its source, only for a key-date type the pack declares (AG-18-81). The date SHALL be registered with the Minder only after a person approves it under AG-9-51's rule (the permission for adding the date by hand plus `agent/sqr:verify`); a date SHALL NOT be inferred or completed.
4. **Why.** `proposals.md` row of 10 Oct (Firm assistant, item (1): "allow the Reader on a stored note's text (imported notes, AG-18-29) as delimited data, under the proposal, provenance and approve-equals-verify rules"; item (3): a key date "approved under AG-9-51's rule … registered with the Minder only after approval"); `firm-assistant.md` §9 G-3, G-4.
5. **Knock-ons.** AG-09 AG-9-51 (CN-AG-09 item 4); AG-11 `read_text` and `KEY_DATE` (CN-AG-11 items 3 and 6); AG-18-74 past-date rule applies unchanged.

## 3. The engine announces a batch ready for mapping

1. **Where.** §6 batch lifecycle (L499); new requirement **AG-18-94**.
2. **Current words.**
   > L499: "upload ─► [DRAFT] ──scan clean + mapping complete──► [MAPPED] ──start dry-run──► [DRY_RUNNING] ──done──► [DRY_RUN_READY]"
3. **Proposed words.**
   > **AG-18-94 (batch ready for mapping).** When a batch's file has passed the scan and its columns have been read, so that mapping can begin, AG-18 SHALL emit a first-class event in the standard Conductor envelope (proposed name `import.batch_ready_for_mapping`; the team names it), idempotent per batch. A person MAY also start an assistant's run against a chosen batch on demand (AG-11-7 as extended by CN-AG-11 item 5).
4. **Why.** `proposals.md` Firm assistant events row of 10 Oct ("an import batch reaching mapping, or an on-demand run against a batch"); `firm-assistant.md` §9 G-17.
5. **Knock-ons.** AG-11-110(h) and AG-11-111 (CN-AG-11 items 4 and 5). The event is internal and sends nothing to any client; quiet-state rules (AG18-D9) are unchanged.
