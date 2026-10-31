# Backlog — requirements added through the qa lane (split from `BACKLOG.md` on 31 Oct, word for word)

## Planned but missing from the tester's checklist (added through the qa lane's Lead note)
AI reading of uploaded documents (SA-1B-34, one-pager 7.3) · independent AI review of a filled form (one-pager 8.3) · copy a line from another combination and add or remove one line across many (SA-1B-61, Screen 03 concept) · an upload question creates a document line (SA-1B-3 with P-47).

## Open questions from the trace (asked one at a time; answers go to `DECISIONS.md`)
Answered: scope (P-70), ready to file (P-71), verification (P-72), wrong mapping (P-73). PQR model (U1, P-76). Open sub-questions: verdict to the prospect, pre-fill the SQR to confirm, entry links in Release 1.
| B38 | **Document type rules:** validity and what it must outlive, maximum age, translation plus affidavit, certified copy, formats and upload size, photo specification (substitutes and the translation flag may come earlier) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150, P-151 | W4 | — | M |
| B39 | **Key-date types and anchors:** received, age lock-in, status expiry for inside-Canada filings, the 60 days after an invitation, LMIA validity, passport expiry; time-critical rules read them | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150, P-151 | W4 | — | M |
| B40 | **Fee table (dated, CAD) and fee rules:** per role and filing mode, family and biometrics caps, right of PR fee, exemptions (with B19) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150, P-151 | W4 | — | M |
| B41 | **Filing record and package:** submission grouping, paper package order, application number and UCI per person, portal upload slot per document type and upload limits, portal application type (P-135, C8.2) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 | — | M |
| B42 | **Portal screen order** for portal-only answer sheets (P-113): source to be decided (founder question, gap analysis §5 Q1) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 | — | M |
| B43 | **Reference tables and rule-driving country lists:** CLB, NOC/TEER, funds, wages; visa-required, medical-exam, biometrics countries | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 · W5 | — | M |
| B44 | **Field privacy, significance, re-confirmation and review-each classes** | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 · W5 | — | M |
| B45 | **Source freshness:** source, date checked and next review on every item; periodic re-fetch of guides and checklists with a diff and AI impact (SA-1B-39, 40; B22) | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W3 | — | M |
| B46 | **Explanation-letter lines and the request-for-documents → document type map** | gap analysis `screens/W1-shared-library/research-end-to-end-masters.md`; P-150 | W4 | — | M |
| B49 | Stand-in chips | P-165 | M2 | screens | S |
| B48 | **Workspace snapshots (P-160):** take, compare, restore as a draft change; automatic before release and reset | P-160 | W2 | runtime | M |
| B47 | **One co-pilot "Ask" panel (P-159):** explain and find; act only by a To review proposal | P-159 | W2 | Lead | M |
| B50 | **Only the proposer corrects a field returned for changes** (P-193): another author gets a plain refusal, the same as remove, retire and restore; a pass and a fail test (runtime, with #116) | P-193; breaker B3 on #116 | M2 | runtime | S |
