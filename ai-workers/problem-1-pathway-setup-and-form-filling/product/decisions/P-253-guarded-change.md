# P-253: one guarded change pattern for every reusable item (2 Nov 2026)

**Founder's ask (2 Nov, in their words, lightly cleaned up):** "I want one uniform approach across entire POC … mostly 90%, 80%, 95% work is done by AI, but we want to give ability to human to add or adjust anything. So I want a very guardrailed way of addition so that human doesn't break it, and then a very natural flow where the AI step in and help them out and create on their behalf … you try to add, and then the rules get triggered, and then AI get triggered, and then you say to AI, and then AI has its own rules to check that it doesn't break any of the duplicate or create any anomaly in the rule engine … that's the flow I want everywhere."

**Founder's answers:** review tier "By risk (Recommended)"; timing "Build the core now (Recommended)".

## The pattern (built once, used by every library)

Applies to shared fields, sections, answer lists, document types, rules and conditions, forms, programmes and combinations; to Add, Edit and Retire; to a person and to the AI alike.

| Step | What happens | Always on? |
|---|---|---|
| 1. Search first | Names, aliases and codes; meaning-based matches when AI is on. Each match says why it matched and where it is used. Choose: reuse, add an alias, extend, or create new. | yes (meaning search only with AI on) |
| 2. Rules check | Fixed, tested rules: type and format, a source and a reason for anything new, no exact duplicate, references intact, and for rules and conditions no conflict, redundancy, gap or loop (as decision-table verifiers do). P-240's publish gates apply at release. | yes |
| 3. AI co-pilot | Given the library, where-used and the sources, it drafts a **change set**: name, type, format, scope, source, where used, and why nothing existing fitted. It never writes directly: its change set goes through step 2 like a person's, plus its own checker round (P-121). | AI on only (P-175) |
| 4. Impact preview | Before confirming, a "plan": every section, form, combination, rule, release and open case the change touches, and the before and after. | yes |
| 5. Confirm | The person confirms the change set; it becomes a draft version. | yes |
| 6. Review by risk | Wording, labels and aliases: direct, logged and listed on To review. A new item, a meaning change, a rule change, or anything used by a released combination: a second person (the immigration expert where P-96 requires). The risk rules are fixed in code and tested. | yes |
| 7. Release and audit | Versioned with the release; every item is marked "made by: person / AI / AI, edited by person" for the counts (impact report D1); any version can be rolled back. | yes |

**Industry basis:** search-before-create and match-and-merge (master data management); lineage and impact analysis before a change (data catalogs); plan-then-apply with a visible diff (Terraform); verification of rule sets for conflict, redundancy and gaps (Drools Verifier, DMN decision-table analysis); maker-checker (banking); AI assistants that propose structured changes validated by deterministic checks rather than writing directly.

## What is built now and what waits

* **Now (M2, row G-CORE):** the change-set pipeline, the rules check, the where-used preview and review by risk, used first by today's shared-library flows (rename, merge, AI proposals). Concept first (skill screen-concept, the tech lead's approval after an independent challenger, P-223 (4)).
* **Held for the product owner's ruling on C2 (P-251):** free-standing "create new by hand" (P-252 step 3) and the AI co-pilot's drafting (L-SA11). They plug into the same core when released.
* **Then (M3):** each other library adopts the core.

Legal and immigration values are unaffected: sources follow P-170; anything unconfirmed stays Sample.
