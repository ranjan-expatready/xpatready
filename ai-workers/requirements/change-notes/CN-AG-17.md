# CN-AG-17: change note to AG-17 Corporate Cases and LMIA

| Field | Value |
|---|---|
| Module changed | AG-17 Corporate Cases & LMIA |
| Version and file | v0.5 of 7 Oct 2026, `02-functional-requirements/agent/AG-17-corporate-cases-and-lmia_v0.5_2026-10-07.md` (Drive snapshot of 9 Oct 2026; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-17-91 (highest AG-17-90); BR-17 (highest BR-16, L849) |
| Companion files | AW-01 (the Case assistant's LMIA duty, labelled Proposal by AIW-D34); CN-AG-11 (Needs you item kinds) |

**In plain words.** Two changes where the Step 2 gaps touch this module. First, AG-17 still says escalation and at-risk marks are off by default, while the newer engine decision makes them on by default once a firm has five or more staff; this note aligns the wording. Second, if the firm's AI is on, the Reader may propose advertising and candidate entries and an assistant may propose a duties comparison, but each waits for a person, and no AI ever screens, ranks or scores a candidate.

---

## 1. Escalation and at-risk marks: off by default only under five staff

1. **Where.** Decision rows AG17-D55 (L173) and AG17-D70 (L188); §0.2 AG-16 row (L255); AG-17-73 (L812).
2. **Current words.**
   > L188: "**Minder:** modules register standard deadlines directly; standard reminders never plan-gated or stopped; escalation and at-risk marks off by default, opt-in per firm. Confirms AG17-D55."
   >
   > L255: "**Add two on/off settings: Minder escalation chains, and at-risk marks — both off by default (AG17-D70).**"
   >
   > L812: "by default they remind only the file owner, and any escalation chain or at-risk flag applies only if the firm has switched it on (AG17-D55)."
3. **Proposed words.** Annotate AG17-D55 and AG17-D70: "*(changed by AG11-D9, 4 Oct 2026: escalation and at-risk marks are parts of Team safeguards — off by default for a firm under 5 active staff, on by default at 5 or more; AG-11-49, AG-16-32.)*" L255: "… both off by default under 5 active staff and on by default at 5 or more, as parts of Team safeguards (AG11-D9)." AG-17-73: "… applies only if it is on for the firm — switched on by the firm, or on through Team safeguards at 5 or more active staff (AG-11-80)."
4. **Why.** IMP-41 ("The AG-17 / AG-11 escalation default: adopt AG-11's (newest)"), relied on by `firm-assistant.md` §9 G-10 ("Decision for the team (IMP-41 adopts AG-11's)"); AG-11 v1.11 §0.2 (L60) lists the AG-17 knock-on as Pending.
5. **Knock-ons.** Closes AG-11 §0.2's AG-17 row; AG-13 BR-20 (overdue-task escalation, AG17-D57) is a different setting and unchanged.

## 2. AI-proposed LMIA entries wait for a person; no AI screens or ranks candidates

1. **Where.** §3.4 recruitment (L527–L563); AG-17-26 (L741); AG-17-32 (L749); new requirement **AG-17-91**; new rule **BR-17**.
2. **Current words.**
   > L741: "entries SHALL be addable singly, in bulk, or imported from a spreadsheet (AG-17-80)."
   >
   > L749: "duties SHALL be captured as one **`dutiesMatch`** yes/no tick per ad/offer, not a field-by-field comparison"
3. **Proposed words.**
   > **AG-17-91 (AI-proposed entries).** Where the firm's AI is on (AG-16-35), the Reader MAY propose advertising-channel entries from a dated screenshot of an advertisement and candidate-log entries from a résumé (the Reader document types are pack content, AG-9-43), and an AI assistant MAY propose a short note comparing an advertisement's duties with the file's job details to help the person's `dutiesMatch` tick (AG-17-32). Each proposal SHALL wait in Needs you for a person to accept under `agent/case:edit`; nothing SHALL enter the channel record, the candidate log or the tick without that acceptance.
   >
   > **BR-17 (No AI judges a candidate).** No AI Doer or AI assistant SHALL screen, rank, score or recommend a candidate, or propose a hiring outcome or a rejection reason. Candidate entries are records only (FD-7).
4. **Why.** AIW-D34 item 10 (the founder: W-13 LMIA Compliance Clerk sits inside the Case assistant, labelled Proposal); `proposals.md` row of 9 Oct (W2 catalogue: "the LMIA Compliance Clerk (W-13) may read advertising proof and CVs and propose a duties comparison, but never ranks, screens or scores candidates"); FD-7 (Founder Decisions Log v1.5 L32: "**no candidate identity plane** (records-only)"); `case-assistant.md` §1.8, §3 and §9 G-15.
5. **Knock-ons.** AG-11 Needs you: which item kind carries an AI-proposed channel or candidate entry is the team's to name in AG-11 §7 (`case-assistant.md` §9 G-15 records the AG-17 Needs you path as a Proposal); AG-17-30 retention and AG-17-53 inspection pack unchanged; counsel on what an assistant may hold about candidates (`case-assistant.md` §7 item 3).
