# PF-2b — BoldSign Canadian data residency, read at the vendor's own source (Lead B, 14 Nov 2026)

Why: PF-2's tool-check file (#1712) could not reach the vendor's pages from its cloud lane, so the Canadian-residency condition set for a signing vendor (team RFP line 243; contracts §7; founder question 1) was unconfirmed. Lead B read it from the Mac on 13-14 Nov 2026 (~23:0x IST) in the built-in browser. Legal reading: **Unconfirmed: no counsel**.

## What the vendor's own page says
Source: BoldSign, "Data Residency & Regional Compliance", https://boldsign.com/data-residency-compliance/ (read 13 Nov 2026; the page shows no date).
* Region choice at account creation; Canada (CA) stores data at rest in **Toronto, Canada**; "Storage and processing servers are completely separated" per region.
* **Stored only in the chosen region (CA):** documents and templates, audit trails, team and workspace data (not billing), signer information, contract-related data, transactional and analytical information.
* **In the US whatever the region:** organisation metadata (subscription, billing); ID-verification data (processed by Stripe in the US); data processed through integrations and third-party services.
* **Email:** only EU accounts keep email in the EU; "emails for other regions (US, Canada, and Australia) are processed in the US".
* **AI features:** only Europe has its own AI environment; Canada's AI processing runs in the US.
* Supporting: the vendor announced a Toronto data centre (press release, boldsign.com/press-releases/boldsign-adds-new-canadian-data-center/); Canada's API base is `https://api-ca.boldsign.com` (as PF-2's file found). The older support article on region choice lists only US and EU and predates Canada.

## Verdict for our use
**Residency holds for the documents, signatures, audit trail and signer details, but not for the vendor's own emails, AI features or ID verification.** So, if the founder picks BoldSign (question 1), it is usable **only on these conditions**, each built into FO-6 and tested:
1. A Canada-region account (`api-ca.boldsign.com`); the region cannot be changed later.
2. **No vendor emails:** we send every signing invitation, reminder and signed copy ourselves through `MailPort` (Amazon SES in the Canadian region in the test environment), using embedded signing links; the vendor's own notification emails are switched off. (This also meets AG-05/AG-10's rule that signing emails go through the firm's own send path.)
3. **No vendor AI features and no vendor ID verification** (identity by our own email one-time code, D-6).
4. No vendor integrations; only our API calls.
5. Our account's subscription and billing metadata sits in the US (company-level data, no client data): to state in the privacy terms (counsel).
6. The vendor's subprocessor list and data-processing terms are read by counsel before live use (founder's counsel brief).

If any of 2-4 cannot be switched off in the vendor's settings or API, BoldSign fails the condition and the fallback is our own signer (AG-05) or a Canadian-hosted vendor, through the same `SigningPort`.

Sources: [BoldSign data residency](https://boldsign.com/data-residency-compliance/) · [BoldSign Canadian data centre announcement](https://boldsign.com/press-releases/boldsign-adds-new-canadian-data-center/) · [Region selection (older support article)](https://support.boldsign.com/kb/article/13389/data-residency-region-selection)
