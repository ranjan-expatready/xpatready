# Change note CN-SA-01: Country and Immigration-Pack Management

| | |
|---|---|
| **Document changed** | SA-01 Country & Immigration-Pack Management, version 2.2, dated 2026-09-22 |
| **File (11 Oct 2026 snapshot; unchanged since 9 Oct)** | `sources/drive-snapshot-2026-10-11/02-functional-requirements/super-admin/SA-01-country-and-immigration-pack-management_v2.2_2026-09-22.md` |
| **Date of this note** | 11 Oct 2026 (fix round after review S3a) |
| **Status** | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| **Changes** | 6 |

**How to read this note.** Each numbered change has five parts:
1. What it changes, by ID, section and line of the snapshot.
2. The current words, quoted exactly.
3. The proposed words, in SA-01's own style. SA-01 writes requirements in the plain present tense.
4. Why. This points to the founder's decision (Founder Decisions Log FD-*n*; `ai-workers/decisions.md`, AIW-D*n*), the improvement (`ai-workers/design/ws2-improvements.md`, IMP-*n*), the proposals row (`ai-workers/proposals.md`) or the gap list of the passed behaviour document (`ai-workers/design/behaviours/pack-authors-assistant.md` §9, G-*n*).
5. What else must change.

**Why AI touches this document.** Expat Ready's Pack author's assistant works for a Content author. It drafts:
- box-map lines;
- scoring and reference rows;
- synthetic sample clients;
- a plain-words release note.

It also prepares the rehearsal and watches the government pages a pack cites. It only reads the pack: the author commits and submits, and a second person approves (AIW-D54 item 7). Its behaviour is specified in AW-02, which cites the IDs below and does not restate them.

**Numbering.** L17: "New requirements continue from the highest number (next: SA-1-66)." New requirements here are SA-1-66 and SA-1-67.

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
> - **SA-1-66** *(new — AIW-D49)* Every submission of a **production** draft carries a **rehearsal report**: the test run of SA-1-52 on sample clients the author chooses, for the draft and for the current published version on the same samples, showing every result that differs. The approver sees it in the approval step beside the diff (SA-1-53), and the approval records that it was opened. The report is evidence for the approver, **not a blocking gate**: no difference stops submission or approval by itself, and no set of test profiles is mandatory (SA1B-D18 stands). Every sample client used for a test run is **synthetic and marked so**; no real client's record, from any firm, is ever used as a sample.

SA-1-52 gains: "Sample clients are always synthetic (SA-1-66)."

**(4) Why.**
- **AIW-D49**, 11 Oct 2026. The founder chose "Attach a rehearsal report": "Every production pack submission carries the report of the product's rehearsal on sample clients; the second person reads it before approving. No new blocking test gate."
- **The conflict it settles** is recorded in the proposals row of 10 Oct (Pack author's assistant, test gate). That row recommends running "the draft and the current version on the same synthetic samples". The two sides are:
  - SA1B-D18 (SA-01B v1.2, L42): "Rules and scoring are trusted by second-person approval alone — no mandatory test profiles, no test run at publish".
  - AG-03 v1.4 BR-18 (L421): "A pack version must pass **conformance tests** … before it can be published".
- **The samples are not fixed.** The author chooses them, so the report is not a mandatory test profile (review S3a M-5).
- **The synthetic-sample rule** comes from the proposals row of 10 Oct (Pack author's assistant, Rule: "A sample client used for a pack dry-run (SA-1-52; SA-1B-62) is always synthetic and marked so; no real client's record, in any firm, is ever used as a sample"). It rests on SA-01's own code note that "The only Canada artefact is a synthetic `TEST_ONLY` test fixture" (L488). The founder adopted the same "synthetic samples only" rule for the Practice expert's test sets (AIW-D70).
- **Gaps:** `pack-authors-assistant.md` §9 G-7 (Proposal) and G-11 ("Decided (AIW-D49)").

**(5) Knock-ons.**
- SA-01B: SA1B-D18 and SA-1B-38, the two deferral lines that still say test profiles are deferred, and the synthetic rule for SA-1-19, SA-1-26 and SA-1B-62 (CN-SA-01B change 2).
- AG-03 BR-18 (CN-AG-03).
- The report is the product's rehearsal. The author can run it by hand, and the Pack author's assistant may prepare it (AW-02).

---

## 2. A plain-words release note on every pack version

**(1) What it changes.** §7 `CountryPackVersion` (L368); a new requirement SA-1-67; the firm prompt of SA1-D3 (L27, "newer rules available since <date>") by reference.

**(2) Current words.**

L368:
> - **CountryPackVersion** — label, classification (`TEST_ONLY | PRODUCTION`), effective date, manifest of content-area versions, content hash; append-only.

**(3) Proposed words.**

L368:
> - **CountryPackVersion** — label, classification (`TEST_ONLY | PRODUCTION`), effective date, manifest of content-area versions, content hash, **release note** (`releaseNote`; plain words, written by the author; required for production) *(changed — proposals row of 10 Oct, release note; G-6)*; append-only.

New requirement:
> - **SA-1-67** *(new — proposals row of 10 Oct, release note; G-6)* Every production pack version carries a **release note** in plain words saying what changed and why, written by the author before submission; an AI assistant may draft it, and the author owns it. The note is shown in the approval step beside the diff (SA-1-53) and the rehearsal report (SA-1-66), and to firms beside "newer rules available since <date>" (SA1-D3). It is part of the published version and never changes.

**(4) Why.** Proposals row of 10 Oct (Pack author's assistant): "A pack version has no change-note or release-note field … while SA-05 v2.2 §3.7 gives every template version 'a change-note'. Firms see only 'newer rules available since <date>' (SA1-D3). Recommendation: add a plain-words note per pack version, written by the author (the assistant drafts it, W-20), shown in the approval step beside the diff and to firms beside the 'newer rules' prompt".

`pack-authors-assistant.md` §9 G-6 (Proposal). Until the field exists, the drafted note lives in the assistant's run record, not in the pack.

**One name.** The field is called *release note*, as AW-02 AW-2-51 calls it. AW-02's two mentions of a "change-note field" (§0.2 SA-01 row; §13 item 6) are to read *release-note field*, so that "change note" keeps meaning these documents only (README §0 rule 9; review S3a m-2).

**(5) Knock-ons.** AG-07's adoption prompt shows the note (CN-AG-07). AW-02 is corrected as above.

---

## 3. Pinning and adoption brought back to FD-3: pinned at case open; adoption is one click, no reason, audited

**(1) What it changes.** Every place SA-01 states the pin grain or the adoption reason:
- SA1-D3 (L27);
- §0.2 SA1-X4 (L76);
- Visual C (L162);
- §3.14 "Pinning" and "Adoption" (L260, L261);
- SA-1-58 (L298);
- BR-5 (L333);
- §6 "Client pin" (L358);
- §7 `PackWorkPin` (L371);
- US-5 (L398).

**(2) Current words.**

L27 (extract):
> When newer rules exist, firm staff see "newer rules available since <date>" and adopt them with one click and a reason (audited); earlier results stay reproducible.

L76 (extract):
> "Newer rules available since <date>" prompt and one-click adoption with a reason (audited) before new work on a pinned client

L162:
> PROMPT -->|adopt, with reason — audited| NEXT[Pinned to the newer version]

L298:
> - **SA-1-58** *(changed v2.1 — SA1-D3)* A client's assessments and case are pinned to the pack version in force when the work started; outputs carry the version ids used. When a newer version is effective, new work for that client requires an explicit adoption by firm staff — one action, with a reason, audited; until then the client stays on its version. New clients start on the current version.

L333:
> - **BR-5 (Pinned work, deliberate adoption).** *(changed v2.1 — SA1-D3)* A client's work stays on its version until firm staff adopt a newer one, with a reason, audited.

L358:
> **Client pin:** pinned to a version → (adopt, reason, audited) → pinned to a newer version; the chain is kept.

L371:
> - **PackWorkPin** — firm, client, country, purpose, pinned version, revision chain (adoption = a new revision with reason).

L261 reads "… prompts staff to adopt the newer rules — one click, with a reason, audited. …".

L398 (US-5) reads "(one click, reason)". It is not quoted in full because its example carries personal names.

**(3) Proposed words.**

- **The grain is per case.**
  - SA-1-58 becomes: "*(changed — FD-3; AG17-D65)* A case is pinned to the pack version in force when the case opens; an assessment records the version it ran on (BR-4). When a newer version is effective, adopting it for a case is an explicit act by firm staff — one action, audited, no reason required; until then the case stays on its version. New cases start on the current version."
  - BR-5 becomes: "**(Pinned per case, deliberate adoption.)** *(changed — FD-3)* A case's work stays on its version until firm staff adopt a newer one, audited."
  - §6 "Client pin" becomes "**Case pin:** pinned at case open → (adopt, audited) → pinned to a newer version; the chain is kept."
  - §7 `PackWorkPin` becomes "firm, case, country, purpose, pinned version, revision chain (adoption = a new revision, audited)".
  - L260 "a client's assessments and case are pinned" becomes "a case is pinned at case open".
- **The reason is removed** in the other places:
  - L27: "… and adopt them with one click (audited; no reason required — AG17-D65) …";
  - L76: "one-click adoption (audited) before new work on a pinned case";
  - L162: "adopt — audited";
  - L261: "one click, no reason, audited";
  - L398: "(one click)".

**(4) Why.**
- **FD-3** (Founder Decisions Log v1.5, L28) is the founder's decision on this subject: "**Pin at case open + explicit audited re-pin/migrate**". It asks for an audited act and no reason, and it pins at **case open**.
- SA-01's per-client wording ("A client's assessments and case …", "A client's work …") disagrees with FD-3. A team file never overrides a founder decision (README §0 rule 11), so SA-01 is brought back to FD-3.
- The team's own newer decision agrees with FD-3. AG17-D65 (AG-07 v2.7, L201): "Rules pinned per case, not per client … adopting a newer version is one click, no reason, audited"; also BR-21 (L748).
- Proposals row of 10 Oct (Pack author's assistant, adoption reason). `pack-authors-assistant.md` §9 G-9.
- Review S3a M-3 (FD-3 missed in the first version) and M-4 (all eight places listed).

**(5) Knock-ons.**
- How an assessment run before any case exists is stamped and re-run is for the team: BR-4 already stamps outputs, and AG-3-29 flags a stale assessment.
- SA1-X4's owners AG-03 and AG-07 read "case" for "client" (CN-AG-07).
- Proposals row 87 (which routed the grain to the team) is corrected by the Lead.

---

## 4. The Pack author's assistant only reads the pack; the key for test runs and diffs

**(1) What it changes.** SA-01 v2.2 §10 Permissions table (L447–L453).

**(2) Current words.**

L450:
> | Pack drafts and publishing | `system/pack:draft-manage` · `:list` · `:submit-review` · `:approve` · `:publish` · `:rollback` · `:retire` | Author: Content Manager. Approve, publish, rollback: Platform Owner or content publisher — never on one's own production draft (SA-1-61) |

**(3) Proposed words.** Two sentences under the table:
> *(new — AIW-D54)* An AI assistant working for a Content author holds **read** keys only. No delegation includes `system/pack:draft-manage`, `:submit-review`, `:approve`, `:publish`, `:rollback`, `:retire` or `system/pack-transfer:import`. The assistant prepares files for the author, and the author imports, commits and submits them in their own name (these keys are not lendable, SA-06 change note CN-SA-06 change 1).
>
> *(new — open question)* The test run (SA-1-52) and the diff (SA-1-53) have no named key. The proposal is that both are read-side and ride on `system/pack:list`; the team confirms or names a read key.

**(4) Why.**
- AIW-D54 item 7, one of the ten calls the founder confirmed: "the pack assistant read-only".
- `ai-workers/design/behaviours/00-step2-decisions.md` §3 item 7: "The Pack author's assistant only reads the rulebook, never writes or submits to it."
- The two-person rule of SA1-D6 depends on the submitter being a person: "its author and its submitter can never approve or publish it" (L30).
- The missing key is `pack-authors-assistant.md` §9 G-5 (Unknown): "No permission key is named for the test run or the diff (SA-01 v2.2 §10)". Review S3a m-8.

**(5) Knock-ons.** SA-06 (CN-SA-06 change 1). AW-02 §10 table A's "test run and diff … key Unknown" row follows the team's answer.

---

## 5. One name for the content author role

**(1) What it changes.** SA-01 v2.2 §10 (L449–L452), and the role name "Content Manager" wherever SA-01 uses it for the staff role.

**(2) Current words.**

L452:
> | Import / export / media | `system/pack-transfer:read` · `:retry` · `:export` · `:import` · `system/pack-media:upload` | Content Manager, Platform Owner |

**(3) Proposed words.** Where they name the staff role:
- "Content Manager" becomes "**Content author**";
- "content publisher" becomes "**Content approver**".

Each carries the note "*(changed — SA-07 role names, SA7-D8)*".

**(4) Why.** `pack-authors-assistant.md` §9 G-14, a note for the team: "One role, two names: 'Content author' (SA-07 v2.10) and 'Content Manager' (SA-01 v2.2, SA-01B v1.2, SA-05 v2.2); likewise 'Content approver' and 'content publisher' / 'Content Approver'".

SA-07 owns the staff role names. SA7-D8 (SA-07 v2.12, L46): "**Nine starter roles:** Platform Owner · Staff manager · Content author · Content approver · …". An AI assistant's delegation names the role it borrows from, and two names for one role break that trace.

**(5) Knock-ons.** SA-01B uses the same old names (CN-SA-01B, header). SA-05 v2.4 is not changed by this set of notes.

---

## 6. Document control and numbering

**(1) What it changes.** The document-control table (L5–L9) and the numbering line (L17).

**(2) Current words.**

L17 (extract):
> New requirements continue from the highest number (next: SA-1-66).

**(3) Proposed words.**
- A version row: "| 2.3 | *(date placed)* | Workstream 2 change note CN-SA-01 applied: rehearsal report (SA-1-66), release note (SA-1-67), pin per case and adoption without a reason (FD-3), assistant read-only keys, role names. | AIW-D49, AIW-D54, FD-3 |".
- L17: "(next: SA-1-68)".

**(4) Why.** Review S3a m-20(c): every note proposes its version row.

**(5) Knock-ons.** None.
