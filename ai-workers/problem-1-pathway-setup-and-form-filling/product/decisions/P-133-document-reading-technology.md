# P-133 — How documents are read: technology per document kind (founder, 29 Oct)

Source: `reports/Document first intake and OCR choice.md` (research, 29 Oct) and the earlier proof-of-concept work (`prototype/p5/reader/`, `prototype/evidence-lane/E1/`).

## Decision
* **The prototype and the demo (Wave 1, M3) use Sample or synthetic documents only.** There is no client data in them, so the AI reader (Claude on AWS Bedrock) may be used now.
* **Before real client documents, counsel decides** whether AI processing may run outside Canada (Unconfirmed: no counsel). Until then, production reads real documents only with what stays in Canada (rules and Textract), and a person checks the rest.
* **One reader per document kind**, the cheapest that is reliable. Every read value is a proposal a person confirms (P-62, P-72, P-130).

## Which technology reads which document
| Document kind | Examples | Reader | Why | Checks after reading | Person |
|---|---|---|---|---|---|
| Passport, travel document | any country | **Rules on the two coded lines at the bottom of the photo page** (MRZ, with the passport standard's check digits) | free, exact, no AI; the coded lines carry number, names, birth date, expiry, nationality and sex | check digits must pass; the printed name is compared with the coded name after the passport's own spelling rules | confirms names and dates (always reviewed, D5) |
| Fixed-layout printed documents | Canadian tax notice of assessment, IELTS/CELPIP/TEF report, WES credential assessment, LMIA letter, medical exam sheet, PR card | **Textract in Canada** (text and tables), then rules | stays in Canada, cheap (about US$0.0015–0.05 a page) | score ranges, dates, issuer, number formats | confirms when a check fails |
| Tables of numbers | bank statements, pay slips | **Textract tables in Canada**, then rules | stays in Canada | balances add up, period covered, account holder's name | confirms totals |
| Free-form letters | employment letter, job offer, invitation letter, itinerary | **AI vision (Claude)**; in production only after counsel | any layout; cites the page and the words behind each value | dates, wages and names against other answers | confirms every value |
| Foreign civil records, any language, handwriting | birth, marriage and divorce certificates, police certificates | **AI vision (Claude)**, with IRCC's certified translation when there is one; in production only after counsel | Textract reads only six European languages and English handwriting | translation present when not English or French (IRCC rule); names against the passport | reviews every one in the first release |
| Photos | application photos | **no reading**; filed as is | — | size and format rules only | — |

The founder's question D2, whether AI may read a passport's printed page, is answered in DECISIONS when settled.

## Notes for the production team (Canada) — needed before real client documents
1. **Data residency.** Claude 5.5 on Bedrock is not hosted in ca-central-1: cross-region routing keeps stored data, logs and settings in Canada, but processing may run in the US (AWS, 24 Nov 2025). Check for a Canada-only profile with `aws bedrock list-inference-profiles --region ca-central-1`. If none exists, counsel decides; meanwhile use Textract plus rules plus a person for real documents.
2. **Opt out of AWS keeping documents.** Textract may keep inputs to improve the service by default: switch on the AWS Organizations AI-services opt-out from day one.
3. **Client notice and contracts** (PIPEDA, the Privacy Commissioner's guidance; CICC Code s.28; Unconfirmed: no counsel): tell clients in plain words where their documents are processed, and secure comparable protection by contract.
4. **Throughput.** Textract's default in Canada is one request a second; raise the limit before load.
5. **Measure before committing.** Test Textract plus rules against Claude Haiku and Sonnet, field by field, on 50–100 synthetic or consented documents per kind. No published benchmark covers immigration documents.
6. **Not checked yet:** Quebec's Law 25, the CICC record-keeping by-laws, Comprehend PII in Canada, Bedrock Data Automation in Canada.
