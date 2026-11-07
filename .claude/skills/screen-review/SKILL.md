---
name: screen-review
description: Independent review of one built Pathway Configurator screen against its concept, the written standards and the quality dimensions D1–D20, using the running app and the code, with a verdict. Use in a fresh context that did not build the screen.
---

# Screen review

You did not build this screen. Use only saved files, the running app and the tests: `ai-workers/problem-1-pathway-setup-and-form-filling/product/screens/NN/concept.md`, `design/`, `challenge.md`, `build-notes.md`, screenshots; `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, `PRODUCT.md` §3–§4.

**Check:** (1) concept fit — every element, state, BR and tooltip present and behaving as written; (2) use it as the content publisher (and approver), once keyboard-only, once at 1024 px and 200 % zoom; (3) menu and words exactly per `PRODUCT.md` §3–§4; team look; demo chrome separate; (4) every [M] line of both standards: met / not met with evidence; (5) code — correctness, migrations keep data, concurrency, duplicates under race, server authorisation, field errors, no per-row requests, and whether a rule's test fails when the rule is removed; (6) retrofit mapping recorded; (7) **scorecard (P-407):** score each check BIC-01–BIC-20 of `EXPERIENCE.md` §6 Met / Partly / Not met / N/A, with a screenshot at 1440 and 1024 px or a step as evidence; severity per §6.

**Scope:** flag correctness gaps, standard violations and concept mismatches only. Do not request new features or extra polish beyond the bar.

**Write `screens/NN/review.md`** (under 100 lines): Verdict (Ship / Ship after fixes / Rework) · D1–D20 scores with one line of evidence each (D17 and D20 "simulated only" unless an intended user walked it) · the BIC table · issues ranked, each Must or Should, with file:line or screenshot and the fix · what you could not check. Edit nothing else (the Lead check and the founder's walkthrough live in `lead-check.md`).

**Graph (P-86):** run `node ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/graph.mjs` and read `ai-workers/problem-1-pathway-setup-and-form-filling/product/qa/GRAPH.md` for this screen: every element must serve a capability of this screen (else it is scaffolding or misplaced); its pages and API routes without a test, and capabilities it claims that no test names, are findings.

**Capability or scaffolding (P-33):** a demo step that works only through scaffolding (sample loader, script, replay) instead of the product's own screen is a Major finding.
**Scope (P-26):** check only what the concept's "What gets built" section lists. Anything on its "Not built" line is not a finding, and "the team's screen has it" is never a finding.
