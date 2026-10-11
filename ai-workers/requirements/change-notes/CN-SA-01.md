# Change note CN-SA-01: Country and Immigration-Pack Management

| | |
|---|---|
| **Document changed** | SA-01 Country & Immigration-Pack Management, version 2.2, dated 2026-09-22 |
| **File (9 Oct 2026 snapshot)** | `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-01-country-and-immigration-pack-management_v2.2_2026-09-22.md` |
| **Date of this note** | 11 Oct 2026 |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 5 |

**How to read this note.** Each numbered change has five parts: (1) what it changes, by ID, section and line of the 9 Oct snapshot; (2) the current words, quoted exactly; (3) the proposed words, in SA-01's own style; (4) why, pointing to the founder's Workstream 2 decision (`ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of the passed behaviour document (`ai-workers/design/behaviours/pack-authors-assistant.md` §9, G-*n*); (5) what else must change.

**Why AI touches this document.** Expat Ready's Pack author's assistant works for a Content author: it drafts box-map lines, scoring and reference rows, synthetic sample clients and a plain-words release note, runs the rehearsal, and watches the government pages a pack cites. It only reads the pack; the author commits and submits, and a second person approves (AIW-D54 item 7). Its behaviour is specified in AW-02; this note fixes what SA-01 must hold for it, and records one founder decision on the publish gate.

**Numbering.** SA-01 continues its own series ("New SA-1B requirements are numbered SA-1B-1 upward and do not continue this series", L323); its last requirement is SA-1-65, so new requirements start at SA-1-66.

---

## 1. Every production submission carries a rehearsal report on synthetic sample clients

**(1) What it changes.** SA-01 v2.2 §3.12 first bullet (L241); SA-1-52 (L290); a new requirement SA-1-66.

**(2) Current words.**

L241:
> - **Draft → In review → Approved → Published.** Submit requires a clean validation. A rejected draft returns to **Draft**, editable, with the reviewer's reason.

L290:
> - **SA-1-52** *(changed v2.1)* Preview is a test run of rules and scoring on a sample client, for a draft or a published version. A full "as a firm sees it" preview is deferred (§0.1).

**(3) Proposed words.**

L241 gains: "*(changed — AIW-D49)* A **production** draft is submitted with its **rehearsal report** attached (SA-1-66), which the approver reads before approving."

New requirement:
> - **SA-1-66** *(new — AIW-D49)* Every submission of a **production** draft SHALL carry a **rehearsal report**: the test run of SA-1-52 on a fixed set of sample clients, for the draft and for the current published version side by side, showing every result that differs. The approver SHALL see it in the approval step beside the diff (SA-1-53) and the approval SHALL record that it was opened. The report is evidence for the approver, **not a blocking gate**: a difference never stops submission or approval by itself (SA1B-D18 stands). Every sample client used for a rehearsal SHALL be **synthetic and marked so**; no real client's record, from any firm, is ever used as a sample.

SA-1-52 gains: "Sample clients are always synthetic (SA-1-66)."

**(4) Why.** AIW-D49, 11 Oct 2026, the founder chose "Attach a rehearsal report": "Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate." The conflict it settles is recorded in the proposals row of 10 Oct (Pack author's assistant, test gate): SA1B-D18 ("Rules and scoring are trusted by second-person approval alone — no mandatory test profiles, no test run at publish", SA-01B v1.2 L42) against AG-03 v1.4 BR-18 ("A pack version must pass **conformance tests** … before it can be published", L421). The synthetic-sample rule is the proposals row of 10 Oct (Pack author's assistant, Rule: "A sample client used for a pack dry-run (SA-1-52; SA-1B-62) is always synthetic and marked so; no real client's record, in any firm, is ever used as a sample"), grounded in SA-01's own code note that "The only Canada artefact is a synthetic `TEST_ONLY` test fixture" (L488); the founder adopted the same "synthetic samples only" rule for the Practice expert's test sets (AIW-D70). `pack-authors-assistant.md` §9 G-7 (Proposal) and G-11 ("Decided (AIW-D49)").

**(5) Knock-ons.** SA-01B SA1B-D18 and SA-1B-38 point to SA-1-66 (CN-SA-01B change 2). AG-03 BR-18 is reconciled by the Agent-plane note (CN-AG-03). The Pack author's assistant builds the report (AW-02).

---

## 2. A plain-words release note on every pack version

**(1) What it changes.** §7 `CountryPackVersion` (L368); a new requirement SA-1-67; the firm prompt of SA1-D3 (L27, "newer rules available since <date>") by reference.

**(2) Current words.**

L368:
> - **CountryPackVersion** — label, classification (`TEST_ONLY | PRODUCTION`), effective date, manifest of content-area versions, content hash; append-only.

**(3) Proposed words.**

L368:
> - **CountryPackVersion** — label, classification (`TEST_ONLY | PRODUCTION`), effective date, manifest of content-area versions, content hash, **release note** (plain words, written by the author; required for production) *(changed — release note)*; append-only.

New requirement:
> - **SA-1-67** *(new)* Every production pack version SHALL carry a **release note** in plain words saying what changed and why, written by the author before submission (an AI assistant may draft it; the author owns it). The note SHALL be shown in the approval step beside the diff (SA-1-53) and the rehearsal report (SA-1-66), and to firms beside "newer rules available since <date>" (SA1-D3). It is part of the published version and never changes.

**(4) Why.** Proposals row of 10 Oct (Pack author's assistant, "A pack version has no change-note or release-note field … while SA-05 v2.2 §3.7 gives every template version 'a change-note'. Firms see only 'newer rules available since <date>' (SA1-D3). Recommendation: add a plain-words note per pack version, written by the author (the assistant drafts it, W-20), shown in the approval step beside the diff and to firms beside the 'newer rules' prompt"). `pack-authors-assistant.md` §9 G-6 (Proposal): until the field exists the drafted note lives in the assistant's run record, not in the pack. A firm asked to adopt newer rules with no words for what changed cannot judge whether to adopt.

**(5) Knock-ons.** AG-07's adoption prompt shows the note (CN-AG-07). The assistant's drafting step is specified in AW-02.

---

## 3. Adopting newer rules: one click, no reason, audited (align to AG17-D65)

**(1) What it changes.** SA1-D3 (L27); §3.14 "Adoption" bullet (L261); SA-1-58 (L298); BR-5 (L333); §6 "Client pin" (L358).

**(2) Current words.**

L27 (extract):
> When newer rules exist, firm staff see "newer rules available since <date>" and adopt them with one click and a reason (audited); earlier results stay reproducible.

L261:
> - **Adoption:** when a newer version is effective, new work for a pinned client prompts staff to adopt the newer rules — one click, with a reason, audited. Until then, the client stays on the older version. New clients start on the current version.

L298:
> - **SA-1-58** *(changed v2.1 — SA1-D3)* A client's assessments and case are pinned to the pack version in force when the work started; outputs carry the version ids used. When a newer version is effective, new work for that client requires an explicit adoption by firm staff — one action, with a reason, audited; until then the client stays on its version. New clients start on the current version.

L333:
> - **BR-5 (Pinned work, deliberate adoption).** *(changed v2.1 — SA1-D3)* A client's work stays on its version until firm staff adopt a newer one, with a reason, audited.

L358:
> **Client pin:** pinned to a version → (adopt, reason, audited) → pinned to a newer version; the chain is kept.

**(3) Proposed words.** In all five places the reason is removed, citing AG17-D65:
- L27: "… and adopt them with one click (audited; no reason required — AG17-D65); …"
- L261: "… prompts staff to adopt the newer rules — one click, no reason, audited (AG17-D65). …"
- SA-1-58: "… requires an explicit adoption by firm staff — one action, audited, no reason required (AG17-D65); …"
- BR-5: "… until firm staff adopt a newer one, audited (AG17-D65)."
- L358: "pinned to a version → (adopt, audited) → pinned to a newer version; the chain is kept."

**(4) Why.** Proposals row of 10 Oct (Pack author's assistant, adoption reason): "SA-1-58 says adoption is 'one action, with a reason, audited' (SA1-D3 'one click and a reason'); AG-07 v2.7 BR-21 says 'adopting a newer version is one click, no reason, audited' (AG17-D65, 7 Oct). Recommendation: AG-07's, the later decision; align SA-01 v2.2 §3.14, SA-1-58 and BR-5 in Step 3." AG-07 v2.7 (2026-10-07) BR-21 (L748) and AG17-D65 (L201) both read "adopting a newer version is one click, no reason, audited". AG-07 is the newer file and the later team decision, and no founder decision is involved. `pack-authors-assistant.md` §9 G-9 ("Decision for the team").

**(5) Knock-ons.** AG17-D65 also pins rules **per case, not per client** ("Rules pinned per case, not per client", AG-07 v2.7 L201), while SA-1-58 and BR-5 speak of "a client's" work. This note changes only the reason, which is what the proposals row covers; the pin grain is flagged as a further team decision, not proposed here. US-5 (L397–L400) follows whichever wording the team adopts.

---

## 4. The Pack author's assistant only reads the pack

**(1) What it changes.** SA-01 v2.2 §10 Permissions table (L447–L453).

**(2) Current words.**

L450:
> | Pack drafts and publishing | `system/pack:draft-manage` · `:list` · `:submit-review` · `:approve` · `:publish` · `:rollback` · `:retire` | Author: Content Manager. Approve, publish, rollback: Platform Owner or content publisher — never on one's own production draft (SA-1-61) |

**(3) Proposed words.** A sentence under the table:
> *(new — AIW-D54)* An AI assistant working for a Content author holds **read** keys only. No delegation SHALL include `system/pack:draft-manage`, `:submit-review`, `:approve`, `:publish`, `:rollback`, `:retire` or `system/pack-transfer:import`: the assistant prepares files for the author, and the author imports, commits and submits them in their own name (SA-6-34).

**(4) Why.** AIW-D54 item 7, one of the ten calls the founder confirmed: "the pack assistant read-only". `ai-workers/design/behaviours/00-step2-decisions.md` §3 item 7: "The Pack author's assistant only reads the rulebook, never writes or submits to it." The two-person rule of SA1-D6 depends on the submitter being a person: "its author and its submitter can never approve or publish it" (L30).

**(5) Knock-ons.** SA-06 marks these keys non-delegable (CN-SA-06 change 1). AW-02 lists the assistant's read subset.

---

## 5. One name for the content author role

**(1) What it changes.** SA-01 v2.2 §10 (L449–L452), and the role name "Content Manager" wherever SA-01 uses it for the staff role.

**(2) Current words.**

L452:
> | Import / export / media | `system/pack-transfer:read` · `:retry` · `:export` · `:import` · `system/pack-media:upload` | Content Manager, Platform Owner |

**(3) Proposed words.** "Content Manager" becomes "**Content author**" and "content publisher" becomes "**Content approver**" where they name the staff role, with the note "*(changed — SA-07 role names, SA7-D8)*".

**(4) Why.** `pack-authors-assistant.md` §9 G-14 ("One role, two names: 'Content author' (SA-07 v2.10) and 'Content Manager' (SA-01 v2.2, SA-01B v1.2, SA-05 v2.2); likewise 'Content approver' and 'content publisher' / 'Content Approver'", Note for the team). SA-07 owns the staff role names (SA7-D8, SA-07 v2.10 L44: "**Nine starter roles:** Platform Owner · Staff manager · Content author · Content approver · …") and is the newer file. An AI assistant's delegation names the role it borrows from; two names for one role break that trace.

**(5) Knock-ons.** SA-01B uses the same old names (its change note says role names follow this change). SA-05 does too; it is not covered by this set of notes.
