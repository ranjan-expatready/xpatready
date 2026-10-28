# Extraction technology for immigration documents (AWS-first, Canada data residency)

Research date: 29 Oct 2026. Every claim below is sourced from a page fetched or searched this session; anything not verified this session is in Gaps. Legal points: Unconfirmed: no counsel.

## 1. AWS options: what each extracts, document support, price, ca-central-1, data terms

### Takeaway
Amazon Textract runs in ca-central-1, but its identity reader (AnalyzeID) is documented only for US-government-issued IDs and its handwriting, ID and Queries features are English only. That makes it a weak fit for passports and civil documents from many countries. Bedrock Data Automation (BDA) supports six European languages only and I could not confirm it runs in ca-central-1. Claude on Bedrock is reachable from ca-central-1 only through cross-region inference (no in-region Claude). AWS says data at rest stays in Canada in that case, but the model processing may happen in the US or another global region.

### Cited Findings
**Textract features and price** (US West (Oregon) list prices. The page gives no effective date beyond its 2026 copyright, and no Canada price table) — [Textract pricing](https://aws.amazon.com/textract/pricing/)
- DetectDocumentText: US$0.0015/page for the first 1M pages a month, then US$0.0006.
- AnalyzeDocument Forms: US$0.05, then US$0.04. Tables: US$0.015, then US$0.01. Queries: US$0.015. Signatures: US$0.0035, then US$0.0014. Layout: free with Tables.
- Combined Forms+Tables+Queries: US$0.070, then US$0.055. Custom Queries (adapters): US$0.025, then US$0.015.
- AnalyzeID: US$0.025/page for the first 100K pages, then US$0.01. AnalyzeExpense: US$0.01, then US$0.008. AnalyzeLending: US$0.07, then US$0.055.
- The pricing page's own worked examples contain arithmetic errors (one uses $0.00035 where the rate is $0.0035). Confirm with the AWS calculator for ca-central-1.

**AnalyzeID scope.** The documentation says AnalyzeID extracts "passports, driver licenses, and other identity documentation issued by the US Government". It returns normalised key-value pairs (for example "Document ID"), implied fields (name, address), the raw text and confidence scores. Front and back of a driver's licence can be sent in one request. The page says nothing about foreign passports or about a structured MRZ field — [Textract AnalyzeID docs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html)

**Textract languages.** Printed text, forms and tables are supported in English, German, French, Spanish, Italian and Portuguese. In the FAQ's words, "Handwriting, Invoices and Receipts, Identity documents and Queries processing are in English only" — [Textract FAQ](https://aws.amazon.com/textract/faqs/)

**Textract in Canada.** There is a ca-central-1 endpoint, with FIPS endpoints too. "Other Regions", which includes Canada, have low default throughput: 1 TPS for AnalyzeDocument, DetectDocumentText and AnalyzeID, 2 TPS for StartDocumentAnalysis, and 100 concurrent async jobs (against 10/25/600 in us-east-1). AnalyzeLending also has quotas in the "Other Regions" column — [Textract endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/textract.html)

**Textract data use.** Textract "may store and use document and image inputs … to improve and develop the quality of Amazon Textract". An account opts out through an AWS Organizations AI services opt-out policy, and after opting out content "will not be stored in another AWS region". Deletion of stored inputs can be requested through AWS Support — [Textract FAQ](https://aws.amazon.com/textract/faqs/)

**Bedrock Data Automation (BDA)**
- BDA turns documents into structured output using generative AI. It offers Standard Output and Custom Output (blueprints), with "visual grounding and confidence scores" — [BDA overview](https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html)
- Limits: input languages are English, German, Spanish, French, Italian and Portuguese only. No vertical text. Minimum text height 15 px (about 8 pt at 150 DPI). Printed and handwritten text are both supported. Sync calls take up to 10 pages and 50 MB. Async calls take up to 3,000 pages with the splitter, 500 MB, and PDF, TIFF, JPEG, PNG, DOC or DOCX. Password-protected PDFs are not accepted. A blueprint holds at most 100 leaf fields and there are 40 blueprints per project — [BDA prerequisites](https://docs.aws.amazon.com/bedrock/latest/userguide/bda-limits.html)
- Price (secondary source, US East N. Virginia): Standard Output US$0.010/page, Custom Output US$0.040/page for 1–30 fields, plus US$0.0005 per extra field — [Tutorials Dojo cheat sheet](https://tutorialsdojo.com/amazon-bedrock-data-automation-cheat-sheet/). I could not read this from the official [Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) because the content was truncated.
- Region: one secondary article says BDA runs only in us-east-1 and us-west-2 ([CloudThat](https://www.cloudthat.com/resources/blog/intelligent-document-processing-with-amazon-bedrock-data-automation)). That may be dated. I did not confirm whether ca-central-1 is supported.

**Claude on Bedrock from ca-central-1**
- In ca-central-1, Claude Haiku 5.5, Sonnet 5.5 and Opus 5.5 are listed as in-region "Not supported". They are reachable only through Geo and Global cross-region inference — [Bedrock model region compatibility](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html)
- AWS blog of 24 Nov 2025: requests from Canada (Central) "can be routed to supported US Regions" (US profile) or to a global region. "Inference processing (the transient computation) may occur in another Region", while "all data at rest—including logs, knowledge bases, and any stored configurations—remains exclusively within the Canada (Central) Region". Traffic stays on the AWS network — [AWS ML blog, Canada CRIS](https://aws.amazon.com/blogs/machine-learning/accelerate-generative-ai-innovation-in-canada-with-amazon-bedrock-cross-region-inference)
- The models page lists a "CA" geography. A `ca.guardrail.v1:0` profile routes between ca-central-1 and ca-west-1 only — [Bedrock guardrails cross-region](https://docs.aws.eu/bedrock/latest/userguide/guardrails-cross-region-support.html). I did not confirm whether a Canada-only Claude profile exists. The Nov 2025 blog names only the US and Global profiles.
- Bedrock data protection: model providers "don't have access to Amazon Bedrock logs or to customer prompts and completions". Models run in AWS-owned Model Deployment Accounts. TLS 1.2 is required, and FIPS endpoints and PrivateLink are available — [Bedrock data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html)
- Bedrock pricing: as of 7 Oct 2026, the Claude Sonnet 5.5 cache-read price is cut by 50%. Batch inference for Anthropic models is 50% cheaper than on-demand — [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/). Per-token Claude rates did not render.

### Inferences
- The only AWS document service confirmed to run fully in Canada is Textract (DetectDocumentText, AnalyzeDocument). It reads text and layout for documents in English, French and four other European languages. It cannot handle foreign-language civil documents, non-Latin scripts or non-US IDs as a structured product.
- Using Claude from ca-central-1 today is a cross-border processing decision for personal information: the computation may run in the US. Stored data stays in Canada. This needs a founder and counsel decision (see section 5).
- BDA is unlikely to be the main path. Its language list excludes Hindi, Punjabi, Chinese, Arabic, Tagalog, Farsi and similar, which are common in Canadian immigration files, and its Canada availability is unconfirmed.

### Gaps
- Comprehend PII detection: I did not check ca-central-1 availability or price this session.
- Textract and Claude prices for ca-central-1 specifically, and the per-token Claude prices on Bedrock (page truncated).
- Whether a `ca.` Claude inference profile exists in Oct 2026. Check with `aws bedrock list-inference-profiles --region ca-central-1`.
- BDA region list and official price.

## 2. LLM vision for unstructured documents: accuracy, hallucination, cost, evidence

### Takeaway
Independent 2025–2026 benchmarks show frontier vision models (Claude, GPT-5, Gemini) level with or ahead of classic OCR on messy, handwritten and complex-layout pages, while classic OCR (Azure, Textract, Google Vision) is about equal on clean printed text (around 95–96%). No independent benchmark I found tests immigration documents (employment letters, civil certificates, IELTS or WES results), so we have to benchmark on our own sample set.

### Cited Findings
- AIMultiple DeltOCR Bench (300 documents, product versions as of Nov 2025, page updated Dec 2025 / Jul 2026; text compared by SBERT similarity; key-value pairing and text location not tested):
  - Printed text: Azure Document Intelligence 96%; GPT-5, Gemini 2.5 Pro, Google Vision and Amazon Textract 95%.
  - Printed media: Gemini 2.5 Pro, Google Vision and Claude Sonnet 4.5 85%; GPT-5 77%.
  - Handwriting: GPT-5 95%, olmOCR-2-7B 94%, Gemini 2.5 Pro 93%; the range was 46–95%.
  - Source: [AIMultiple OCR accuracy](https://aimultiple.com/ocr-accuracy)
- A vendor (Nanonets, which sells a competing product) claims Textract reaches about 80–85% on clean, simple forms and falls behind on complex documents — [Nanonets](https://nanonets.com/ocr/blog/amazon-textract-alternatives). Treat as biased.
- Codesota (Dec 2025) reports Claude Opus 4.5 as the costliest model tested on invoices, at US$0.045 per invoice against US$0.0006 for Gemini 2.5 Pro — [Codesota](https://www.codesota.com/guides/invoice-processing-vllm)
- Stack AI ranks Claude 3.7 Sonnet 2nd and Textract 8th for document extraction, with no published method — [Stack AI](https://www.stack-ai.com/blog/llm-leaderboard-which-llms-are-best-for-which-tasks). Weight this lightly.
- BDA, which is built on generative models, returns "visual grounding and confidence scores" — [BDA overview](https://docs.aws.amazon.com/bedrock/latest/userguide/bda.html). Textract returns per-field confidence and geometry — [AnalyzeID docs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html)

### Inferences
- An LLM's text is not grounded in pixels the way OCR geometry is. LLM output needs evidence back to the page: a page number and a quoted source span, checked against an OCR layer or by rules. That is how a reviewer can confirm a value, and it limits the risk of the model inventing one.
- Cost per page is driven by image tokens, so Haiku-class models or batch runs (50% off) suit high-volume intake. Sonnet or Opus fit the hard cases.

### Gaps
- No published accuracy figures for immigration document types (IELTS/CELPIP/TEF report forms, WES ECA, LMIA, police certificates, non-English civil records).
- No published hallucination rates for document extraction by Claude 5.x. Claude per-page cost and latency were not measured this session.
- Anthropic's citations feature and structured outputs (PDF page-level citations) were not fetched this session; check the current Claude docs.

## 3. Hybrids: OCR plus LLM, MRZ check digits, cross-check, human routing

### Takeaway
The defensible design is layered. Deterministic checks come first (MRZ parse and ICAO 9303 check digits, date and format rules). Then OCR text with geometry, then LLM structuring that cites its evidence. Where key fields disagree or confidence is low, the document goes to a person. The sources support each building block, not one packaged recipe.

### Cited Findings
- Textract returns structured JSON with per-field confidence (`IdentityDocumentFields`) plus the raw text — [AnalyzeID docs](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html). That makes it a cheap text-and-geometry layer (US$0.0015/page) for an LLM to structure — [Textract pricing](https://aws.amazon.com/textract/pricing/)
- Azure's prebuilt ID model returns the MRZ as a field for international passports (Microsoft docs mirror) — [Mintlify mirror of Azure docs](https://www.mintlify.com/MicrosoftDocs/azure-ai-docs/ai-services/document-intelligence/overview). This is evidence that MRZ-first passport reading is standard practice.

### Inferences
- Passport: read the MRZ (from OCR text, or an LLM reading only the MRZ lines), parse it with an open-source ICAO 9303 parser and check every check digit. A passing MRZ is very strong ground truth for name, number, date of birth, expiry, nationality and sex, and it costs nothing at run time. Compare the visual zone (from the LLM) against the MRZ; any mismatch goes to a person.
- Dual extraction (OCR+rules against LLM, or two models) is worth its cost only for fields that drive a decision (CRS points, fund totals, language scores, employment dates).

### Gaps
- I did not fetch the ICAO Doc 9303 text this session. The check-digit algorithm (weights 7-3-1, mod 10) should be confirmed from ICAO's published Doc 9303 Part 3 before it is coded.

## 4. Other vendors (brief)

### Takeaway
Azure has the broadest prebuilt passport/ID support including the MRZ. Google's identity parsers cover the US and France only. KYC vendors (Onfido, Veriff, Mindee) solve identity proofing, not civil-document extraction, and add another processor outside AWS.

### Cited Findings
- Azure Document Intelligence prebuilt ID covers US and international passports and national ID cards, with an MRZ field. It is billed per page, has a free F0 tier and offers commitment tiers. Canada Central availability and price did not render — [Azure pricing](https://azure.microsoft.com/pricing/details/ai-document-intelligence/); [docs mirror](https://www.mintlify.com/MicrosoftDocs/azure-ai-docs/ai-services/document-intelligence/overview)
- Azure topped DeltOCR printed text at 96% — [AIMultiple](https://aimultiple.com/ocr-accuracy)
- Google Document AI identity parsers: US Driver License and US Passport are GA; French Driver License and National ID are in preview. The listed multi-region locations are us and eu (pages from 2022–23, likely dated) — [Google Cloud blog](https://cloud.google.com/blog/products/ai-machine-learning/google-cloud-extends-document-ai-with-new-parsers-for-identity/)

### Gaps
- Onfido, Veriff and Mindee were not researched this session (pricing, Canadian hosting).

## 5. Privacy and compliance for Canada (Unconfirmed: no counsel)

### Takeaway
PIPEDA does not forbid processing abroad, but the firm stays accountable, must protect the data by contract and must tell clients their data may be processed in another country. CICC licensees owe indefinite confidentiality, with disclosure allowed to people assisting the licensee. So US-routed Claude inference is probably permissible with notice and contracts, but it is a founder and counsel decision, not a default.

### Cited Findings
- OPC guidelines on cross-border processing (modified 27 Jan 2009, old but still the reference guidance):
  - A transfer to a processor is a "use", not a disclosure.
  - The organisation remains accountable and must ensure a "comparable level of protection" by contract, with audit rights.
  - Individuals must be told, in plain language and ideally at collection, that data may be processed abroad and be accessible to foreign authorities.
  - Some highly sensitive information should not go abroad at all.
  - Source: [OPC guidelines](https://www.priv.gc.ca/en/privacy-topics/airports-and-borders/gl_dab_090127/)
- CICC Code (SOR/2022-128), s. 28(1): a licensee "must keep confidential all information in relation to a client" and take the measures needed to keep it confidential "indefinitely". s. 28(2)(e) allows disclosure to a person assisting the licensee in providing the services — [Justice Laws s.28](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/section-28.html)
- CICC Code s. 37: licensees must keep records "in accordance with the by-laws". s. 36: client documents are returned within 30 days of termination, and the file is transferred within 10 business days — [Justice Laws SOR-2022-128](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/page-3.html)
- AWS controls: Textract AI-services opt-out (no training use or other-region storage of content); Bedrock gives model providers no access to prompts or completions; data at rest stays in ca-central-1 under cross-region inference — sources in section 1.

### Gaps
- CICC by-law retention period; Quebec Law 25 (cross-border privacy impact assessment), if Quebec clients are in scope; the current OPC position on generative AI. None were fetched this session.

## 6. Recommended pipeline per document kind (inference from the above; benchmark before committing)

### Takeaway
Run AWS-native, Canada-resident processing by default (Textract in ca-central-1 plus deterministic rules). Add Claude on Bedrock for structuring and non-English documents only after a founder decision on US-routed inference, or once a Canada-only Claude profile is confirmed. Send every document with a disagreement or low confidence to a reviewer.

### Cited Findings
- Building blocks and their limits are as cited in sections 1–5.

### Inferences
| Document kind | Primary | Check | To a person when |
|---|---|---|---|
| Passport / travel document (any country) | MRZ read from OCR text + ICAO 9303 parse; LLM for the visual zone | Check digits; MRZ vs visual zone; expiry vs travel dates | Any check digit fails; mismatch; no MRZ |
| Canadian/US IDs, PR card | Textract AnalyzeID (US IDs only, per docs); LLM otherwise | Format and date rules | Confidence below threshold |
| Language tests (IELTS, CELPIP, TEF), WES ECA | LLM structuring of a fixed template; Textract text as evidence | Score ranges, date validity windows, reference number format | Any score field without cited evidence |
| Employment letters, job offers, LMIA | LLM extraction with page and quote citations | Dates, hours and wage arithmetic; NOC/TEER plausibility | Missing required elements; conflicting dates |
| Bank statements | Textract Tables (+Layout) for rows; LLM for summary | Opening/closing balance arithmetic | Arithmetic fails; non-English |
| Birth/marriage certificates, police certificates (many languages) | LLM vision (Textract does not cover the script or language) | Names vs passport MRZ; dates | Always for the first release (translation and certification rules apply) |
| Travel history | LLM from stamps and pages + client entry | Overlap and gap checks | Gaps or overlaps found |

### Gaps
- No measured accuracy on our own documents. Next step: a labelled sample set of 50–100 synthetic or consented documents per kind, comparing Textract+rules against Claude Haiku and Sonnet on Bedrock, scored per field.
