# Cross-check questions for the product owner (26 Oct) — ordered by impact
Sources: xcheck-AG-01/02/04/05/07/16.md. Each verified against the epic line before asking.

| # | Topic | Sources | Status |
|---|---|---|---|
| X1 | Representative's stored signature on government forms | AG-05:332 AG05-D1(6); AG-07:2709 AG-7-21 r7; AG-01:194 AG01-20; G6/SA1B-D90; IRCC IMM 5476 page | asking |
| X2 | "Must verify before filing" (SA1B-D42, 25 Oct) vs three sources (SA1B-D89) — define verified | AG-07:3217; v1.14:116 | |
| X3 | Lead form lead-questions + questionnaire link to leads (AG02-D12 A5, 20 Oct) vs prospect flow SA1B-D74 (18 Oct) | AG-02:1099, :7155 | |
| X4 | Government steps hideable (AG07-D22 Q83) vs Decision 14 / W-15 | AG-07:2241, :7553 | |
| X5 | Services defaults "documents to ask for" on pack programmes (MS-D18, 25 Oct) | AG-16:835 | |
| X6 | Shareable documents: firm setting (AG-16-66) vs pack mark (SA1B-D92(13)) | AG-16:744 | |
| X7 | Which date decides the rules in force (firm's target date vs today) — G2 | AG-07:4316 | |
| X8 | First-forms list: Decision 3/SA1B-D82 vs AG07-D28(27) | AG-07:6111 | |
| X9 | "Approve filing" = batch of per-form approvals? | AG-07:3058; G8(16) | |
| X10 | Retainer block (AG01-6) stays outside the floors? | AG-07:1828 | |
| X11 | Programme pre-selection source order (retainer / consult / assessment) | AG-04 #2, AG-05 #6 | |
| X12 | Two to-do lists: starter per programme vs Service task template | AG-16 MS-D18(2), AG-13-4 | |
| X13 | Billing per stage vs MS-D22(2) "When" options | AG-05 #5 | |
Wording-only / already-decided items → knock-on file, no ruling.

## Harmonising list (after the apply wave, 26 Oct)
- H1 Employer job details: list of jobs on the employer (G8(4) lists with stable entries); the worker's filing points to its entry (ch11 Q9 → resolved by G8).
- H2 Fee basis + count: one home (ch11 SA-1B-287 vs ch6 fee line SA-1B-52 / ch5) — individual per-person basis must live on the general fee card; 287 points.
- H3 Offer-number warning level: Advisory while preparing, CRITICAL at submission (same pattern as G20(a)) (ch7 Q13).
- H4 Submission-day re-check reads the submission date (fees follow the date IRCC receives, G2) (ch8 Q8-8).
- H5 Retainer estimate fee value: the fee in force on the case's target filing date, today if empty, shown "as at <date>" (G28; AG-05 #3) (ch8 Q8-9).
- H6 ch2: filing-scope fields employerOffer.offerNumber, employerOffer.complianceFee (SA-1B-235).
- H7 ch3: document type "Proof of fee exemption".
- H8 ch6: drop STARTER_TODO line kind; replace "Compare the profile" standard step (ch6:280) with review-checklist item; offer step + exemption doc line on exempt work-permit rows.
- H9 ch10 SA-1B-270 rule 1(f): confirm starter text gone.
- H10 ch1 Q1-11: employer onboarding questionnaire may hold filing-scope fields (e.g. positions on this LMIA) — yes; SA-1B-112 matches organisation + filing scopes for an employer questionnaire.
- H11 ch2 Q9: one meaning of "verified" everywhere (SA-05 SA5-D29 uses G23) → knock-on SA-05.
- H12 cross-person conditions read the other person's recorded fact (G5: client answers count) — keep agent's wording; SA-1B-195 and SA-1B-219 each get one line "named cross-person read is outside the order check".
- H13 copy-on-emails keys/sources marked as examples pending content team (fine).
- H14 Cross-person reads: "recorded facts" everywhere (G5) — fix ch5 SA-1B-195 and ch6 SA-1B-219 ("confirmed facts" → "recorded facts").
- H15 Fee basis home = ch6 SA-1B-52 (fee line: basis + count); ch11 SA-1B-287 keeps only the per-position specifics and points to 52; ch5 SA-1B-190 amounts only (already).
- H16 Quick LMIA Check home = ch11 SA-1B-285; ch5 SA-1B-205 points to it.
- H17 Review items home = ch6 SA-1B-221; ch7 SA-1B-97 and ch11 point to it.
- H18 ch6 Q9 pre-selection above row level: picker opens on that branch, staff pick the row (default adopted).
- H19 ch4 judgement calls kept: signer = case's lead representative (AG01-5); signature only on viewer forms; alternatives "can't check" stays Advisory; portal web forms answer-key tested (G17).

## Knock-on merger — unplaced items triage (26 Oct)
1 → H5 settled. 2 Filing record model → developers (backend lead). 3 case link: documents copied (AG-09 Path 2), job/org fields referenced (G8(13)) → harmonise SA-1B-283. 4 status names → glossary alignment ("not applicable" per case vs AG-09 "Not needed") → knock-on wording. 5 AG-09 storage per country → AG-09/SA-08 open, not SA-01B. 6 AG-11 firm-designed reminders → firm's own choice, outside G33 (ExpatReady pushes nothing). 7 AG-14/AG-15 → those epics' open items. 8 LMIA validity start → immigration expert (fact). 9 AG-02/03 assessment items → AG-03 review. 10 SA-03 → SA-03 open. 11 keys → SA-06 open (developers). 12 SA-09 → nightly snapshot counts only (seed). 13 SA-11 consent → counsel. 14 SA-01 content area wording → knock-on. 15 masking → AG-09 owns. 16 XFA O3 → settled by G9 (application fix; write-back only via "Also update record").
17 Family/questionnaire links in a Welcome email Cc'd to the copy list → ASK the product owner (privacy): recommend links never go to copied people; when Cc exists, the links go in a separate email to the client only (same as AG-10-89 portal invitation).
