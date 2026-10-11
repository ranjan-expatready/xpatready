# Canada-only AI provider test: one-page script for the team's tech lead (AIW-D69)

*Written by the Lead, 11 Oct 2026. The founder decided that AI processing of client data happens only in Canada (AIW-D52). The product keeps the AI switch locked for every firm until Super Admin records "the AI provider, the processing region (Canada only, AG11-D15) and a no-training / no-retention agreement" (AG-16 v1.12 §3.9; AG-16-35; AG-11-93). This test produces the facts for that record. Findings below are from the providers' own pages read on 9 Oct 2026 (`../commercial/provider-and-cost.md` §2); re-read them on the day, they change.*

**Rule for the test:** use made-up text only. No client data, no firm data, no real names.

## 1. Try in this order

| # | Route | Why it is on the list (9 Oct 2026) |
|---|---|---|
| 1 | **Google Gemini on Vertex AI, Montréal region** (`northamerica-northeast1`), a current Flash model and the current Pro model | The only route whose own page lists current models in Montréal. Google: on a regional endpoint "ML processing stays within that specific geographical region"; global endpoints "don't provide regional isolation or data residency guarantees" |
| 2 | **Anthropic Claude on Vertex AI, Montréal region** | Google's locations page lists Claude models in Montréal, but its data-residency page shows no Canada column for partner models. The test settles which page is right |
| 3 | **Cohere, dedicated deployment in Canada** | A Canadian company; a Canadian region is plausible only by a dedicated deployment ("contact Cohere to confirm the regions available"); its default allows training unless switched off |

Not on the list: Anthropic direct, Anthropic on Bedrock, OpenAI direct, Azure OpenAI and the other Bedrock models, because on 9 Oct none processed current text models in Canada.

## 2. For each route, record yes / no with the evidence

1. **Region.** Call the model on the **regional** endpoint for Canada, never a global one. Record the endpoint used and the region the response or the console reports.
2. **Capability.** Send three made-up tasks and keep the outputs: (a) read a made-up passport bio page image and return name, date of birth and expiry as a structured list; (b) draft a four-sentence plain-English email asking a client for two missing documents; (c) compare two made-up paragraphs and list the facts that differ. Note obvious failures; quality is judged later by the evaluation set (IMP-29).
3. **No training.** Copy the provider's exact words that client data is not used to train models, the page address and the date; for Cohere, switch the training opt-out off and keep the confirmation.
4. **No retention.** Record: is request and response logging off; is prompt caching off (Google caches for 24 hours by default and lets you switch it off per project); is zero data retention or the abuse-monitoring exception available, and how it is requested. Keep the provider's words and the page.
5. **Contract.** Is there a data processing agreement naming the Canadian region? Where is it?
6. **Price.** The price per million input and output tokens on the regional endpoint (Google adds about 10 % for regional endpoints; check).

## 3. Pass, and what to send back

A route **passes** when items 1, 3 and 4 are all yes on the provider's own written terms and item 2 shows the three tasks work. Send back to the founder, one page per route: the endpoint and region; the three outputs; the copied terms with page addresses and dates; the price; pass or fail with the reason. The Lead turns a passing route into the provider record and adds it to the build specification as a replaceable provider; if none passes, the founder decides again (AIW-D52).
