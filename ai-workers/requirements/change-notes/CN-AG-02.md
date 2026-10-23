# CN-AG-02: change note to AG-02 Prospect, Lead and Sales CRM

| Field | Value |
|---|---|
| Module changed | AG-02 Prospect / Lead / Sales CRM |
| Version and file | v1.9 of 7 Oct 2026, `02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`, unchanged since 9 Oct; line numbers below are that file's) |
| Current base (15 Oct 2026, snapshot 1535; scrum 4b outcome 0 (e)) | **AG-02 v1.10**, `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.10_2026-10-12.md` (identical to the 13 Oct 09:26 copy the re-base row checked). The re-base row says what stands, is withdrawn or is re-aimed; a quote or line number marked re-pointed, corrected or "v1.10" is the current file's; any other is the older version's and is history. |
| Date of this note | 11 Oct 2026 (third fix round, after re-check S3c-c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | none (the changes reword existing text; the highest are AG-2-64, L644, and BR-21, L681) |
| Re-based 13 Oct 2026 (source reconciliation, `decisions.md` rows "Reconciliation renumbering" and "Lead rulings, source reconciliation") | Checked against **AG-02 v1.10** (12 Oct 2026, `sources/drive-snapshot-2026-10-13-0926/`). No ID collision (this note proposes none; the team added AG-2-65: a message missing a firm detail is not sent). The IDs cited here (AG-2-35, AG-2-56, AG-2-57, BR-20) still resolve; the speed-to-lead acknowledgement now runs "from day one, no review step" (SA05-R9a) and the going-cold, no-show and post-consult recipes stay off until the firm switches them on (the optional page, AG-12-52). Version string for this note's proposed row: **1.11**. Line numbers and quotes below are v1.9's. |
| Companion files | CN-AG-03 change 2 (BR-19, eligibility only through the consultant); CN-AG-12 change 1 (eligibility mark on templates); CN-AG-11 change 6 (the `STAGE_MOVE` item) and change 13 (AG-11-116, the send-time check); AW-01 (the Intake AI) |

**In plain words.** The founder decided on 11 Oct that no automatic or AI-drafted message to a lead carries eligibility content; the planned "your CRS would change if…" nudge is therefore dropped. Two small alignments follow: the AI writing tool is now called the Writer, and the call-outcome list should be one list, not two.

---

## 1. Drop the "your CRS would change if…" nudge from nurture

1. **Where.** §3.10 Nurture & recycling (L420).
2. **Current words.**
   > L420: "A nurtured lead can be enrolled in a **long-horizon re-engagement** (e.g. quarterly check-in, "draw cut-offs moved" update, "your CRS would change if…" nudge — all CASL-consented and in the lead's locale)"
3. **Proposed words.** "A nurtured lead can be enrolled in a **long-horizon re-engagement** (e.g. quarterly check-in, "draw cut-offs moved" update — all CASL-consented and in the lead's locale). No automatic or AI-drafted re-engagement message SHALL contain eligibility content about the lead (an outcome, a score, a band, "likely", or a lever that would change a result), and no template marked as carrying status or eligibility content SHALL be sent to a lead by an automatic or AI-drafted send (AG-11-116); eligibility reaches a lead only through the consultant's audited share (AG-3-38; AG-03 BR-19 and AG-12-112 as proposed in CN-AG-03 and CN-AG-12)."
4. **Why.** AIW-D41 (the founder, 11 Oct: "The team's "your CRS would change if…" nudge (AG-02 §3.10) is dropped: a change note in Step 3"); `00-step3-plan.md` "Eligibility to leads, exact reach"; `proposals.md` row of 10 Oct (Intake AI, eligibility in lead messages, disclosed conflict); AW-1-90.
5. **Knock-ons.** AG-2-45 (Nurture) is unchanged in shape; the going-cold and post-consult recipes (AG-2-57) carry no eligibility content; the catalogue's W-10 "levers" wording is narrowed by the Lead; any nurture template that touches eligibility is checked against the say / never-say list (unconfirmed Lead guidance; no counsel (AIW-D94); AW-1-90 (no counsel, AIW-D94); counsel pack question 7).

## 2. The AI writing tool is the Writer

1. **Where.** "Applied from AG-11" decision row AG11-D11 (L61).
2. **Current words.**
   > L61: "a Drafter draft sent unedited counts as AI-written"
3. **Proposed words.** "a Writer draft sent unedited counts as AI-written". Elsewhere in AG-02, "Drafter" names the retainer template engine (L179, L764) and stays.
4. **Why.** AIW-D53 (the AI Doer is the **Writer**; *Drafter* stays the template engine).
5. **Knock-ons.** CN-AG-11 change 1.

## 3. One call-outcome list

1. **Where.** §3.12 `outcome` (L469); §3.12 world-class behaviour (L483); AG-2-37a (L608); §7 `Call` (L736).
2. **Current words.**
   > L469: "**`outcome`** — a firm-configurable **picklist**: defaults `Connected`, `No answer`, `Left voicemail`, `Busy`, `Wrong number`, `Callback requested`, `Not in service`."
   >
   > L608: "Staff SHALL **log a call** with an **outcome** (answered / no answer / left message / wrong number / callback requested / not interested)"
   >
   > L736: "`outcome` (answered/no-answer/left-message/wrong-number/callback-requested/not-interested)"
3. **Proposed words.** One default list, used by §3.12, AG-2-37a and `Call`. Recommended form, the list AG-2-37a and `Call` already share: "**`outcome`** — a firm-configurable **picklist**: defaults answered, no answer, left message, wrong number, callback requested, not interested." L483 reads "answered" for "Connected". If the team prefers §3.12's list, AG-2-37a and `Call` change instead; either way there is one list.
4. **Why.** `proposals.md` row of 10 Oct (Intake AI: one call-outcome vocabulary, AG-02 v1.10 §3.12 defaults against AG-2-37a and the `Call` entity, which agree with each other); the 10 Oct intake design gap on two call-outcome lists. A decision for the team.
5. **Knock-ons.** AG-14-7 "calls logged/connected" (AG-14 v1.11) uses the chosen word; the Intake AI's next-step rule reads the outcome (AW-01).

---

## Not changed here (pointers only)

- An assistant's proposed lead stage move is the `STAGE_MOVE` item kind defined in AG-11 (CN-AG-11 change 6); approving it moves the lead through AG-02's own guarded stage service (BR-5) under `agent/prospect:edit`, never to WON or LOST. AG-02 needs no change for it (AW-1-44, AW-1-92).
- Which outbound touch satisfies speed-to-lead and moves a lead to Contacted is Unknown (a 10 Oct intake design gap); no change proposed.
- Restricted fields in exports (AG-2-49a, AG-2-51) follow CN-AG-07 change 1 (FD-15 kept, AG7-D28).
