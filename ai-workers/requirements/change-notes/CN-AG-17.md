# CN-AG-17: change note to AG-17 Corporate Cases and LMIA

| Field | Value |
|---|---|
| Module changed | AG-17 Corporate Cases & LMIA |
| Version and file | v0.6 of 10 Oct 2026, `02-functional-requirements/agent/AG-17-corporate-cases-and-lmia_v0.6_2026-10-10.md` (Drive snapshot of 11 Oct 2026, `sources/drive-snapshot-2026-10-11/`; line numbers below are that file's) |
| Date of this note | 11 Oct 2026 (third fix round, after re-check S3c-c) |
| Status | *Proposed by Workstream 2; the founder places it on Drive; nothing here is written to Drive by us.* |
| Next free numbers used | AG-17-91 (highest AG-17-90, L737); BR-17 (highest BR-16, L850) |
| Companion files | CN-AG-15 (employer seats at launch, AIW-D67); CN-SA-03 (the Super Admin half of AIW-D67); CN-AG-11 change 6 (item kind `LMIA_ENTRY`); CN-FDL open point 1 (FD-7 against CP1-D7); AW-01 (the Case assistant's LMIA duty, labelled Proposal by AIW-D34) |

**In plain words.** Three changes where the founder's decisions and the Step 2 gaps touch this module. First, AG-17 still says escalation and at-risk marks are off by default, while the newer engine decision makes them on by default once a firm has five or more staff; this note aligns the wording. Second, if the firm's AI is on, the Reader may propose advertising and candidate entries and an assistant may propose a duties comparison, but each waits for a person, and no AI ever screens, ranks or scores a candidate. Third, the founder decided that employers get their full portal actions at launch, including extra seats, so AG-17's plan that puts employer seats in Release 2 follows CN-AG-15. Whether the employer sees the recruitment summary in Release 1 (FD-7) is open for the founder and is not touched here.

**What the team changed on 10 Oct (v0.6).** Corporate is now the corporate-case feature of SA-03's catalogue (always on), and limit modes are fixed; no AG-17 requirement changed. Nothing proposed here was already made.

---

## 1. Escalation and at-risk marks: off by default only under five staff

1. **Where.** Decision rows AG17-D55 (L174) and AG17-D70 (L189); §0.2 AG-16 row (L256); AG-17-73 (L813).
2. **Current words.**
   > L189: "**Minder:** modules register standard deadlines directly; standard reminders never plan-gated or stopped; escalation and at-risk marks off by default, opt-in per firm. Confirms AG17-D55."
   >
   > L256: "**Add two on/off settings: Minder escalation chains, and at-risk marks — both off by default (AG17-D70).**"
   >
   > L813: "by default they remind only the file owner, and any escalation chain or at-risk flag applies only if the firm has switched it on (AG17-D55)."
3. **Proposed words.** Annotate AG17-D55 and AG17-D70: "*(changed by AG11-D9, 4 Oct 2026: escalation and at-risk marks are parts of Team safeguards — off by default for a firm under 5 active staff, on by default at 5 or more; AG-11-49, AG-16-32.)*" L256: "… both off by default under 5 active staff and on by default at 5 or more, as parts of Team safeguards (AG11-D9)." AG-17-73: "… applies only if it is on for the firm — switched on by the firm, or on through Team safeguards at 5 or more active staff (AG-11-80)."
4. **Why.** IMP-41 ("The AG-17 / AG-11 escalation default: adopt AG-11's (newest)"), relied on by `firm-assistant.md` §9 G-10; AG-11 v1.12 §0.2 (L61) still lists the AG-17 knock-on as Pending.
5. **Knock-ons.** Closes AG-11 §0.2's AG-17 row; AG-13 BR-20 (overdue-task escalation, AG17-D57) is a different setting and unchanged.

## 2. AI-proposed LMIA entries wait for a person; no AI screens or ranks candidates

1. **Where.** §3.4 recruitment (L528–L564); AG-17-26 (L742); AG-17-32 (L750); new requirement **AG-17-91**; new rule **BR-17**.
2. **Current words.**
   > L742: "entries SHALL be addable singly, in bulk, or imported from a spreadsheet (AG-17-80)."
   >
   > L750: "duties SHALL be captured as one **`dutiesMatch`** yes/no tick per ad/offer, not a field-by-field comparison"
3. **Proposed words.**
   > **AG-17-91 (AI-proposed entries).** Where the firm's AI is on (AG-16-35), the Reader MAY propose advertising-channel entries from a dated screenshot of an advertisement and candidate-log entries from a résumé (the Reader document types are pack content, AG-9-43), and an AI assistant MAY propose a short note comparing an advertisement's duties with the file's job details to help the person's `dutiesMatch` tick (AG-17-32). Each proposal SHALL wait in Needs you as an `LMIA_ENTRY` item (AG-11, CN-AG-11 change 6) for a person to accept under `agent/case:edit`; nothing SHALL enter the channel record, the candidate log or the tick without that acceptance.
   >
   > **BR-17 (No AI judges a candidate).** No AI Doer or AI assistant SHALL screen, rank, score or recommend a candidate, or propose a hiring outcome or a rejection reason. Candidate entries are records only (FD-7).
4. **Why.** AIW-D34 item 10 (the founder: W-13 LMIA Compliance Clerk sits inside the Case assistant, labelled Proposal); `proposals.md` row of 9 Oct (W2 catalogue: the LMIA Compliance Clerk (W-13) may read advertising proof and CVs and propose a duties comparison, but never ranks, screens or scores candidates); FD-7 (Founder Decisions Log v1.5 L32: "**no candidate identity plane** (records-only)"); `case-assistant.md` §1.8, §3 and §9 G-15.
5. **Knock-ons.** AG-17-30 retention and AG-17-53 inspection pack unchanged; AW-1-51 cites BR-17; counsel on what an assistant may hold about candidates (`case-assistant.md` §7 item 3).

## 3. Employer seats move into Release 1 (knock-on of AIW-D67)

1. **Where.** Decision rows AG17-D38 (L157) and AG17-D51 (L170); §0.1 Release 2 table item 3 (L225); §0.2 AG-15 row (L255); §1 release plan (L287).
2. **Current words.**
   > L157: "gives the employer's primary contact portal access (extra seats with AG-15 later)"
   >
   > L170: "**Release 2, in order:** other corporate services (exempt offers, endorsements) · full employer qualifier · employer portal entry and seats · corporate dashboard · full post-approval compliance · recruitment engine."
   >
   > L225: "| 3 | **Employer entering channels and candidates in the portal; extra employer seats** | Depend on AG-15's employer portal; staff do it in Release 1 (CSV import, AG-17-80) |"
   >
   > L287: "| **2** | Other corporate services · full employer qualifier · employer portal entry and seats · corporate dashboard · full post-approval compliance · recruitment engine — in that order | See §0.1 (AG17-D51) |"
3. **Proposed words.** Annotate AG17-D38 and AG17-D51: "*(changed by AIW-D67, the founder, 11 Oct 2026: the employer's portal actions — upload, pay, sign and seat management — are in Release 1; extra employer seats are Release 1, AG-15-12 as changed by CN-AG-15.)*" §0.1 item 3 reads "**Employer entering channels and candidates in the portal**" (seats removed from the Release 2 list); L287 reads "… employer portal entry of channels and candidates …" without "and seats"; the §0.2 AG-15 row adds "Release 1 also gives additional employer seats (AIW-D67; CN-AG-15)". Entering channels and candidates in the portal stays Release 2, as AG-17 plans it: AIW-D67 names upload, pay, sign and seat management, not candidate entry.
4. **Why.** AIW-D67 (the founder, 11 Oct: "Full employer actions at launch … The Charter's "CP-9 Employer view (read-only)" becomes the employer actions the client portal document specifies (upload, pay, sign, seat management) in Release 1"); Doc 4 v1.3 CP-9-10 (L3066: "A seat holding `portal/corporate:seat-manage` SHALL invite/list/capability-grant/request-removal of seats under the SAME organisation only"); README §0 rule 11 (a module's later plan does not override the founder's decision). **FD-7 against CP1-D7 is open for the founder (CN-FDL open point 1); this note does not touch it**: FD-7 (L32) resolves "**CP-9 employer sees read-only summary**", while the team's CP1-D7 shows the employer nothing about recruitment candidates in Release 1 (AG-15-51; AG-17-30). This replaces the first fix round's reading, which presented that question as settled (review S3c-b N-9).
5. **Knock-ons.** CN-AG-15 (AG-15-12, BR-17 and the seat screens); SA-03 (SA3-D20's Release 1 timing and the seats-extra row; CN-SA-03, Super Admin half); the Charter edit is the founder's (`charter-edits.md` §3).
