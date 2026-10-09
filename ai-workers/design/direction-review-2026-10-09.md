# Direction review: are we building the right thing, and what is missing? (9 Oct 2026)

*Written as the Lead's brainstorm with Ranjan, at his request. Opinions are marked as such; facts cite the files.*

## 1. Where we stand, in one paragraph

In one day we turned a voice note into a governed workstream: every current requirement document read in full (46 files), a reference index of 1,300+ AI and Doer requirements, a 28-worker catalogue with a build order, 41 improvement proposals, two hostile reviews, and one published evidence page. Two agents are still correcting the catalogue and the improvements after the second review. Nothing has been written to Drive, any repository or email. What we have is **requirements and strategy on paper**; no AI Worker exists yet, and the team's product itself is partly unbuilt (the case spine, the Minder, the pack content).

## 2. Verdict on direction

**Right direction. Three corrections.**

1. **We are describing, not yet proving.** Everything so far is text. The next unit of work must be something a consultant can click. Your own method says "the prototype is the spec" (`product/README.md` §2), and the simulator already exists. **Build the File Builder as a clickable demo in the simulator**, with the readiness report a licensed person signs. That one screen is the investor demo, the consultant validation and the developer spec at once.
2. **The riskiest assumption is untested and cheap to test.** "Firms will pay per prepared file" has no evidence. Five peers from your network, one demo, one price card, one hour each. Until then every pricing number is a guess, and I will keep labelling it so.
3. **The governed story must become visible, not just written.** VisaFlo says "human release" on a web page. We need the thing itself: every value on the readiness report shows where it came from (document, pack version, who approved). That visible trace is the moat. Nobody's evidence shows it (`research/visaflo.md` §12).

## 3. Gaps we have not closed (ranked by how much they can hurt)

| # | Gap | Why it matters | Cheapest next move |
|---|---|---|---|
| 1 | **No validation with real consultants** | Pricing, the wedge and the raise all rest on it | Demo + price card to 5–10 peers (W3b) |
| 2 | **No AI provider with confirmed Canada-only processing** | Your rules (AG11-D15) keep AI off until one is recorded; the old code used the provider's standard service with no region | One hour: check which providers offer Canadian-region processing and no-training terms; record the answer, not an assumption |
| 3 | **No cost per prepared file** | Decides margin and price | Estimate from the File Builder design: documents per file × model calls per document; label it Assumption |
| 4 | **The Charter still says "no AI in Release 1"** | The team builds to it; we plan the opposite | You update it or write to the team |
| 5 | **Who sells** | The commercial plan says the seller is undecided | Decide with Sanjay before W3 |
| 6 | **Twenty-two decisions waiting on you** | Each one unblocks design | One sitting, plain-words list on the updated page |

## 4. Ideas worth adding (my best-in-class suggestions, all Proposal)

1. **Shadow mode.** Every worker first runs silently beside the staff member doing the same job, then shows the firm "this week I would have prepared 14 files and saved about 9 hours; here is where I disagreed with you." It sells itself, and it produces the time-saved number we currently cannot source. It also answers the regulator's question (nothing happened without a person). Nobody in the field scan does this.
2. **The readiness report as the product.** Make it the unit of value, the unit of billing (one prepared file = one approved report) and the artefact the licensed person signs. Every line traces to a document, a pack version and an approver. This is what "governed" looks like on a screen.
3. **Pack-stamped answers.** Every output carries the Country Pack version it was computed from, so a result can be re-run a year later and explained to a client or a tribunal. Deterministic engines already allow it; make it visible.
4. **"What I prepared today" digest for role twins.** Twins never approve; they hand a person a short daily list. It keeps the human visibly in charge, which is both the regulator answer and the trust story.
5. **Do not chase these:** website chatbot, AI meeting notes, 13 languages, a "knowledge vault" that learns each firm's style. VisaFlo has them; they are commodity and each pulls us toward a generic AI product. Our packs and templates already carry the firm's standards.
6. **Sell the Deadline Guardian free, measure the switch-on.** The hook's job is adoption data, not revenue.

## 5. The strongest argument against all this

A competitor with paying customers and shipped AI (VisaFlo) could add a readiness report and a per-file price in a quarter. Our defence is not the idea; it is that the firm's whole practice runs inside Expat Ready (packs, Doers, Conductor, audit), so the worker is better informed and better governed than a bolt-on. That defence is only true once the product is built and firms are on it. **So the order is: demo → validate → build the wedge → then raise.** Raising on the story alone, against a shipping competitor, is the real risk.

## 6. How to progress (the plan for the next session)

| Step | What | Output |
|---|---|---|
| 1 | Finish W2 fixes (two agents running) and a short re-review | catalogue, improvements, review-W2 closed |
| 2 | Update the visual page: workers on the product map, the 22 decisions in plain words | page republished; Ranjan decides in one sitting |
| 3 | Provider and region check; cost-per-file estimate | `design/provider-and-cost.md` |
| 4 | **Phase B for the File Builder**: requirements in the project's standard format (screens, worked examples, test cases) and a clickable demo in the simulator with the readiness report and shadow-mode summary | `product/requirements/screens/...`, demo in `product/app` |
| 5 | W3b validation: demo script and price card; Ranjan runs 5–10 conversations | written reactions |
| 6 | W3c/d: pricing into the existing plan and model; investor story with 2–3 raise options | `commercial/` |

Steps 1–3 can run in parallel; step 4 is the real work and starts as soon as step 1 closes.
