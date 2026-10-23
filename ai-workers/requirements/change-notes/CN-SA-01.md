# Change note CN-SA-01: Country and Immigration-Pack Management

| | |
|---|---|
| **Document changed** | SA-01 Country & Immigration-Pack Management, version 2.2, dated 2026-09-22 |
| **Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e))** | **SA-01 v2.4**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-01-country-and-immigration-pack-management_v2.4_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v2.4" is the current file's; any other is the older version's and is history. |
| **Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation")** | Checked against **SA-01 v2.4** (12 Oct 2026, `sources/drive-snapshot-2026-10-13-0926/`). **ID collision:** our SA-1-66 and SA-1-67 were taken by the team (SA-1-66 firm overlay; SA-1-67 hide a standard item); renumbered **SA-1-66 → SA-1-68** (rehearsal report) and **SA-1-67 → SA-1-69** (release note) throughout our files; version row 2.3 → **2.5** (2.3 and 2.4 are the team's); L17 "next" → SA-1-70. **Change 3:** the team keeps a **required reason** on adopting newer rules on purpose (SA1-D15 "not adopted", SA1-D3, SA-1-58 v2.4: "one action, with a required reason", pre-filled); the "no reason" part of change 3 is **withdrawn**; the pin-per-case part stays and is re-asked (register TC-71). **Change 5 withdrawn:** the team settled one staff role, **Content publisher** (SA1-D17; SA-07 v2.15 SA7-D8); "Content author" and "Content approver" are not used (TC-129 withdrawn). Firm-added checklist items and questions are withdrawn by the team (W-17); nothing in this note rests on them. SA-1-62 counts are built (console); the firm's own list has no screen yet. Line numbers and quotes below are v2.2's and identify the text that was read. |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-01-country-and-immigration-pack-management_v2.2_2026-09-22.md` |
| **Date of this note** | 11 Oct 2026 (sixth round: the founder's Step 3 batch, AIW-D74: drafting runs once the provider record is published) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-01's own style (plain present tense).
4. Why: the founder decision, improvement or gap behind the change.
5. What else must change.

**Why AI touches this document.** Expat Ready's Pack author's AI works for a Content author. It drafts box-map lines, scoring and reference rows, synthetic sample clients and a plain-words release note; it prepares the rehearsal and watches the government pages a pack cites. It only reads the pack: the author commits and submits, and a second person approves (AIW-D54 item 7). Its behaviour is specified in AW-02, which cites the IDs below and does not restate them.

**Drafting runs once the provider record is published.** The founder decided CN-FDL open point 3 on 11 Oct 2026 (AIW-D74, "Yes, Canada for all AI"): the assistant's drafting steps that need a model call run once the one published provider record exists (SA-8-66), in Canada like every Expat Ready AI call; its rule-built steps (the rehearsal's test runs, the watcher's comparison, the list of affected content) run regardless. The plan rule "Pack calls before the founder answers" is superseded. No requirement below depends on a model call.

**Numbering.** L17 says: "New requirements continue from the highest number (next: SA-1-68)." New requirements here are SA-1-68 and SA-1-69.

---

## 1. Every production submission carries a rehearsal report on synthetic sample clients, and approval waits until it is opened

**(1) What it changes.** SA-01 v2.4 §3.12 first bullet (L267); SA-1-52 (L337); a new requirement SA-1-68.

**(2) Current words.**

L241:
> - **Draft → In review → Approved → Published.** Submit requires a clean validation. A rejected draft returns to **Draft**, editable, with the reviewer's reason.

L290:
> - **SA-1-52** *(changed v2.1)* Preview is a test run of rules and scoring on a sample client, for a draft or a published version. A full "as a firm sees it" preview is deferred (§0.1).

**(3) Proposed words.**

L241 gains: "*(changed — AIW-D49)* A **production** draft is submitted with its **rehearsal report** attached (SA-1-68); the approver opens it before approving."

New requirement:
> - **SA-1-68** *(new — AIW-D49)* Every submission of a **production** draft carries a **rehearsal report**: the test run of SA-1-52 on sample clients the author chooses, for the draft and for the current published version on the same samples, showing every result that differs. The approver sees it in the approval step beside the diff (SA-1-53). **The approve action is available only after the approver has opened the report**, and the approval records that it was opened. The report is evidence for the approver, **not a blocking gate**: no difference stops submission or approval by itself, and no set of test profiles is mandatory (SA1B-D18 stands). Every sample client used for a test run is **synthetic and marked so**; no real client's record, from any firm, is ever used as a sample.

SA-1-52 gains: "Sample clients are always synthetic (SA-1-68)."

**(4) Why.**
- **AIW-D49**, 11 Oct 2026. The founder chose "Attach a rehearsal report": "Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate."
- **Approve only after opening.** Proposals row 112 (AW-02 maker) asks that approval wait until the report is opened; AW-02 AW-2-52 specifies the same. A disabled approve button until the report is opened is not a test gate: it checks only that the approver looked, which is how "reads it before approving" is made checkable.
- **The conflict it settles** is in the proposals row of 10 Oct (Pack author's AI, test gate). That row recommends running "the draft and the current version on the same synthetic samples". It sets SA1B-D18 (SA-01B v1.2, L42), "Rules and scoring are trusted by second-person approval alone — no mandatory test profiles, no test run at publish", against AG-03 v1.4 BR-18 (L421), "A pack version must pass **conformance tests** … before it can be published".
- **Samples are chosen by the author, not fixed** (review S3a M-5).
- **The synthetic-sample rule** comes from the proposals row of 10 Oct (Pack author's AI, Rule): "A sample client used for a pack dry-run (SA-1-52; SA-1B-62) is always synthetic and marked so; no real client's record, in any firm, is ever used as a sample". It rests on SA-01's own code note, "The only Canada artefact is a synthetic `TEST_ONLY` test fixture" (L488). The founder adopted the same "synthetic samples only" rule for the Practice expert's test sets (AIW-D70).
- **Relied on by:** AW-2-50 and AW-2-52.

**(5) Knock-ons.**
- SA-01B: SA1B-D18 and SA-1B-38, the deferral lines, and the synthetic rule for SA-1-19, SA-1-26 and SA-1B-62 (CN-SA-01B change 2).
- AG-03 BR-18 (CN-AG-03).
- The author can run the rehearsal by hand; the Pack author's AI may prepare it with rule-built steps (AW-02).

---

## 2. A plain-words release note on every pack version

**(1) What it changes.** §7 `CountryPackVersion` (L368); a new requirement SA-1-69; the firm prompt of SA1-D3 (L27, "newer rules available since <date>") by reference.

**(2) Current words.**

L368:
> - **CountryPackVersion** — label, classification (`TEST_ONLY | PRODUCTION`), effective date, manifest of content-area versions, content hash; append-only.

**(3) Proposed words.**

L368:
> - **CountryPackVersion** — label, classification (`TEST_ONLY | PRODUCTION`), effective date, manifest of content-area versions, content hash, **release note** (`releaseNote`; plain words, written by the author; required for production) *(changed — proposals row of 10 Oct, release note; G-6)*; append-only.

New requirement:
> - **SA-1-69** *(new — proposals row of 10 Oct, release note; G-6)* Every production pack version carries a **release note** in plain words saying what changed and why, written by the author before submission; an assistant may draft it, and the author owns it. The note is shown in the approval step beside the diff (SA-1-53) and the rehearsal report (SA-1-68), and to firms beside "newer rules available since <date>" (SA1-D3). It is part of the published version and never changes.

**(4) Why.** Proposals row of 10 Oct (Pack author's AI; quoted as written earlier, and SA-05 v3.4 §7 `SystemTemplateVersion` still carries a change note): "A pack version has no change-note or release-note field … while SA-05 v2.2 §3.7 gives every template version 'a change-note'. Firms see only 'newer rules available since <date>' (SA1-D3). Recommendation: add a plain-words note per pack version, written by the author (the assistant drafts it, W-20), shown in the approval step beside the diff and to firms beside the 'newer rules' prompt".

Relied on by AW-2-51 (Proposal). The assistant's draft of the note is a model call, so it runs once the provider record is published (AIW-D74); until then, and whenever the record is withdrawn, the author writes the note.

One name: *release note*, as AW-02 AW-2-51 calls it (README §0 rule 9).

**(5) Knock-ons.** AG-07's adoption prompt shows the note (CN-AG-07). AW-02 cites SA-1-69.

---

## 3. Pinning and adoption brought back to FD-3: pinned at case open; adoption is one click, audited

> **Re-based 13 Oct 2026 (source reconciliation).** SA-01 v2.4 keeps the **required reason** on adopting newer pack rules on purpose (SA1-D15 "not adopted"; SA1-D3 and SA-1-58 v2.4: "one action, with a required reason", pre-filled "Adopting the current rules"; the button reads "Use the newer rules (since <date>)"; built in the back end). The "one click, no reason" part of this change is **withdrawn**. The pin-grain part (pinned per case at case open, FD-3) stays and is re-asked of the team as a question (register TC-71), because the team's text still says "client's assessments and case" (v2.4 L345). The 10 Oct design recommendation of "no reason" is now marked Unknown, not Recommend.

**(1) What it changes.** Every place SA-01 states the pin grain or the adoption reason:
- SA1-D3 (L27);
- §0.2 SA1-X4 (L76);
- Visual C (L155, L159, L161, L162);
- §2 Users (L188);
- §3.12 "Who is on which version" (L246);
- §3.14 "Pinning" and "Adoption" (L260, L261);
- SA-1-58 (L298);
- SA-1-62 (L303);
- BR-5 (L333);
- §6 "Client pin" (L358);
- §7 `PackWorkPin` (L371);
- US-5 (L397–L400);
- §9 (L434).

**(2) Current words.**

L27 (extract):
> **Each client's work stays on the rules it started with; newer rules are adopted deliberately.** A client's assessments and case are pinned to the pack version in force when the work started. When newer rules exist, firm staff see "newer rules available since <date>" and adopt them with one click and a reason (audited); earlier results stay reproducible. New clients always start on the current rules. Super Admin (and firms, for their own clients) can list who is still on an older version.

L76 (extract):
> "Newer rules available since <date>" prompt and one-click adoption with a reason (audited) before new work on a pinned client

L159, L161, L162:
> NEW[New client] --> CUR[Pinned to the current version]
>
> PUB[Newer version published] --> PROMPT{Staff start new work<br/>for this client}
>
> PROMPT -->|adopt, with reason — audited| NEXT[Pinned to the newer version]

L188 (extract):
> "When the rules change, I want to know, and move my client to the new rules deliberately."

L246:
> - **Who is on which version** (SA1-D3): Super Admin can list, per version, how many firms' clients are still pinned to it.

L260 (extract):
> - **Pinning:** a client's assessments and case are pinned to the pack version in force when the work started; outputs are stamped with the version used and can be reproduced.

L298:
> - **SA-1-58** *(changed v2.1 — SA1-D3)* A client's assessments and case are pinned to the pack version in force when the work started; outputs carry the version ids used. When a newer version is effective, new work for that client requires an explicit adoption by firm staff — one action, with a reason, audited; until then the client stays on its version. New clients start on the current version.

L303:
> - **SA-1-62** *(SA1-D3)* Super Admin can list, for each published version, how many clients (per firm) are still pinned to it; a firm can list its own clients on an older version.

L333:
> - **BR-5 (Pinned work, deliberate adoption).** *(changed v2.1 — SA1-D3)* A client's work stays on its version until firm staff adopt a newer one, with a reason, audited.

L358:
> **Client pin:** pinned to a version → (adopt, reason, audited) → pinned to a newer version; the chain is kept.

L371:
> - **PackWorkPin** — firm, client, country, purpose, pinned version, revision chain (adoption = a new revision with reason).

L400:
> - **Given** 40 clients across firms are still on the January version, **Then** Super Admin sees that count against the January version.

L434:
> - **Client pinned to a rolled-back version** → stays pinned to it; adoption offers the current version.

Further current words, not quoted in full:
- L261 reads "… prompts staff to adopt the newer rules — one click, with a reason, audited. …".
- L397 is US-5's title, "Rules change for an existing client".
- L398 and L399 (US-5) describe a firm that "starts a new assessment" for a client, sees the newer rules and "must adopt them (one click, reason) before running it", and a firm that "adds a new client on 2 March … starts on the 1 March version". They are not quoted in full because the example carries personal names.

**(3) Proposed words.** In each case, client becomes case and the reason goes (the reason part withdrawn 13 Oct 2026; see the box above).

- **SA1-D3 (L27):**
  > **Each case's work stays on the rules it started with; newer rules are adopted deliberately.** *(changed — FD-3)* A case is pinned to the pack version in force when the case opens. When newer rules exist, firm staff see "newer rules available since <date>" and adopt them for the case with one click (audited; no reason required — AG17-D65); earlier results stay reproducible. New cases always start on the current rules. Super Admin (and firms, for their own cases) can list which cases are still on an older version.
- **SA1-X4 (L76):** "one-click adoption (audited) before new work on a pinned case".
- **Visual C:**
  - the heading (L155) reads "How a firm's case work uses the pack";
  - L159 reads "New case";
  - L161 reads "for this case";
  - L162 reads "adopt — audited".
- **§2 (L188):** the user's voice becomes *"When the rules change, I want to know, and move a case to the new rules deliberately."*
- **§3.12 (L246):** "Super Admin can list, per version, how many firms' cases are still pinned to it."
- **§3.14 "Pinning" (L260):** "a case is pinned to the pack version in force when the case opens; outputs are stamped with the version used and can be reproduced."
- **§3.14 "Adoption" (L261):** "one click, audited".
- **SA-1-58 (L298):** "*(changed — FD-3; AG17-D65)* A case is pinned to the pack version in force when the case opens; an assessment records the version it ran on (BR-4). When a newer version is effective, adopting it for a case is an explicit act by firm staff — one action, audited, no reason required; until then the case stays on its version. New cases start on the current version."
- **SA-1-62 (L303):** "*(changed — FD-3)* Super Admin can list, for each published version, how many cases (per firm) are still pinned to it; a firm can list its own cases on an older version."
- **BR-5 (L333):** "**(Pinned per case, deliberate adoption.)** *(changed — FD-3)* A case's work stays on its version until firm staff adopt a newer one, audited."
- **§6 (L358):** "**Case pin:** pinned at case open → (adopt, audited) → pinned to a newer version; the chain is kept."
- **§7 `PackWorkPin` (L371):** "firm, case, country, purpose, pinned version, revision chain (adoption = a new revision, audited)".
- **US-5, recast on a case** (the recast leaves out the example's personal names):
  - L397, the title: "Rules change for an existing case".
  - L398: "**Given** a firm opened a case in January and a new pack took effect on 1 March, **When** staff add new work to that case, **Then** they see "newer rules available since 1 March" and may adopt them for the case (one click); until they do, the new work runs on the January version; the case's January results still reproduce under the January version; the adoption is audited."
  - L399: "**Given** the firm opens a new case on 2 March, **Then** it starts on the 1 March version."
  - L400: "40 cases across firms".
- **§9 (L434):** "**Case pinned to a rolled-back version** → stays pinned to it; adoption offers the current version."

**(4) Why.**
- **FD-3** (Founder Decisions Log v1.5, L28) is the founder's decision on this subject: "**Pin at case open + explicit audited re-pin/migrate**". It pins at **case open** and asks for an audited act. It says nothing about a reason. The FDL's own amendment A22-6.2 reads it the same way (L120: "FD-3 pins the Country Pack at case open").
- **SA-01 disagrees with FD-3.** Its per-client wording ("A client's assessments and case …") disagrees with FD-3. A team file never overrides a founder decision (README §0 rule 11), so SA-01 is brought back to FD-3 everywhere it states the grain. Re-check S3a-b R-3 listed the remaining places.
- **US-5 follows the requirement.** Its first criterion described adopting rules for one person's new assessment, which would contradict the case pin of SA-1-58. It is recast on a case (re-check S3a-c m-5). How a lead's assessment, before any case exists, is re-run stays the team's question (knock-on below).
- *(History: the 11 Oct reasoning, withdrawn 13 Oct; see the box above. Today the two team files disagree, AG-07 v2.9 AG17-D65 "no reason" against SA-01 v2.4 SA1-D15 "required reason"; the team settles it, register TC-171.)* **"No reason" is the team's decision, not FD-3's.** AG17-D65 (AG-07 v2.9, L204): "Rules pinned per case, not per client … adopting a newer version is one click, no reason, audited"; also BR-21 (L752). Re-check S3a-b m-5. AG17-D65 is the later team decision, and FD-3 does not require a reason, so the reason is removed.
- Proposals row of 10 Oct (Pack author's AI, adoption reason). Register TC-171.

**(5) Knock-ons.**
- An assessment run before any case exists keeps the version it ran on (BR-4); AG-3-29 already flags a stale assessment. How a lead's assessment is re-run is for the team.
- SA1-X4's owners, AG-03 and AG-07, read "case" for "client" (CN-AG-07).

---

## 4. The Pack author's AI only reads the pack; the key for test runs and diffs

**(1) What it changes.** SA-01 v2.4 §10 Permissions table (L509–L515).

**(2) Current words.**

L450:
> | Pack drafts and publishing | `system/pack:draft-manage` · `:list` · `:submit-review` · `:approve` · `:publish` · `:rollback` · `:retire` | Author: Content Manager. Approve, publish, rollback: Platform Owner or content publisher — never on one's own production draft (SA-1-61) |

**(3) Proposed words.** Two sentences under the table:
> *(new — AIW-D54)* An assistant working for a Content author holds **read** keys only. No delegation includes `system/pack:draft-manage`, `:submit-review`, `:approve`, `:publish`, `:rollback`, `:retire` or `system/pack-transfer:import`. The assistant prepares files for the author, and the author imports, commits and submits them in their own name. These keys are not lendable (CN-SA-06 change 1).
>
> *(new — open question)* The test run (SA-1-52) and the diff (SA-1-53) have no named key. The proposal is that both are read-side and ride on `system/pack:list`; the team confirms or names a read key.

**(4) Why.**
- AIW-D54 item 7: "the pack assistant read-only".
- `ai-workers/decisions.md`, "AIW-D54 note", call 7: "The Pack author's assistant only reads the rulebook, never writes or submits to it."
- SA1-D6 (L30): "its author and its submitter can never approve or publish it".
- AW-02 §13 item 2 (Unknown; the 10 Oct design gap): "No permission key is named for the test run or the diff (SA-01 v2.2 §10)", quoted from the earlier design paper; SA-01 v2.4 §10 (L509–L515) still names none.

**(5) Knock-ons.** CN-SA-06 change 1. AW-02 §10 table A follows the team's answer on the test-run key.

---

## 5. One name for the content author role

> **Withdrawn 13 Oct 2026 (source reconciliation).** The team settled the question the other way on 12 Oct: one staff role, **Content publisher**, writes the pack, is the second person for another publisher's production pack (or the Platform Owner is), publishes firm starter templates and drafts ExpatReady emails (SA-01 v2.4 SA1-D17 and §10; SA-07 v2.15 SA7-D8, SA7-D48, SA7-D49; Glossary v2.20). "Content author" and "Content approver" are not used anywhere in the team's documents. Register TC-129 is withdrawn; our own files rename to Content publisher. The text below is kept for the record only.

**(1) What it changed (history; withdrawn, see the box above).** SA-01 v2.2 §10 (L449–L452), and the role name "Content Manager" wherever SA-01 uses it for the staff role.

**(2) Current words.**

L452:
> | Import / export / media | `system/pack-transfer:read` · `:retry` · `:export` · `:import` · `system/pack-media:upload` | Content Manager, Platform Owner |

**(3) Proposed words.** Where they name the staff role:
- "Content Manager" becomes "**Content author**";
- "content publisher" becomes "**Content approver**".

Each carries "*(changed — SA-07 role names, SA7-D8)*".

**(4) Why.**
- The 10 Oct design note for the team: "One role, two names: 'Content author' (SA-07 v2.10) and 'Content Manager' (SA-01 v2.2, SA-01B v1.2, SA-05 v2.2); likewise 'Content approver' and 'content publisher' / 'Content Approver'" *(quoted as written; history)*.
- SA7-D8 as it read earlier (SA-07 v2.12, L46; history: SA-07 v2.15 SA7-D8 names six roles, one Content publisher): "**Nine starter roles:** Platform Owner · Staff manager · Content author · Content approver · …".

**(5) Knock-ons.** SA-01B (CN-SA-01B, header). SA-05 v3.4 is not changed by this set of notes for role names (it already names the Content publisher, SA05-Q12).

---

## 6. Document control and numbering

**(1) What it changes.** The document-control table (L5–L9) and the numbering line (L17).

**(2) Current words.**

L17 (extract):
> New requirements continue from the highest number (next: SA-1-68).

**(3) Proposed words.**
- A version row (renumbered 13 Oct 2026; 2.3 and 2.4 are the team's): "| 2.5 | *(date placed)* | Workstream 2 change note CN-SA-01 applied: rehearsal report, approve only after it is opened (SA-1-68); release note (SA-1-69); pin per case at case open and adoption without a reason (FD-3, AG17-D65), everywhere SA-01 states the grain, US-5 recast on a case; assistant read-only keys; role names. | AIW-D49, AIW-D54, FD-3 |".
- L17 (v2.4 L19 says "next: SA-1-68"): "(next: SA-1-70)" (our SA-1-68 and SA-1-69 used).

**(4) Why.** Review S3a m-20(c).

**(5) Knock-ons.** None.
