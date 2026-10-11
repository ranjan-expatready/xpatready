# Step R: step back, simplify, raise quality (founder's ask, 11 Oct 2026)

*Plain English. Owner: the Lead. The founder is the product owner of the AI layer; he approves.*

## Why
The founder asked, after Step 3: where are we, what is the quality, is there junk and needless complication, does our AI cover what VisaFlo does, are we building on the team's requirements without a second source of truth, how are AI workers actually built, are we overdoing it in a compliance industry, and how do we get a best-in-class blueprint.

## The honest starting point (measured 11 Oct)
- Our Workstream 2 files hold about **920,000 words** (design 394k, requirements 232k, review files 207k, plus PROGRESS 24k and proposals 21k). The team's entire functional requirements hold about **634,000**. The AI layer is written bigger than the product it sits on. That is the clearest sign of over-building.
- Quality is high on **rigour** (every claim cited, every file attacked by a hostile checker) and low on **simplicity, validation and usability**: no customer has seen it, nothing runs, and a team member would struggle to find the one page that matters.
- There are **too many layers saying related things**: a 28-worker catalogue, 7 personas, 7 behaviour documents, 2 build modules, 33 change notes, 436 tests. Each was checked, but together they repeat ideas and drift.
- The carve-out of the team's AI requirements exists (`design/ws2-baseline/`), but it is from the 9 Oct snapshot and is a long index, not the one clean map the founder needs.

## The plan (each step one outcome, maker then checker then founder)
1. **Evidence (running 11 Oct):** (a) research on what works and fails with AI in regulated professional work, how it is built, and whether we overdo it (`research/ai-in-regulated-work-2026-10.md`); (b) AI capability coverage against VisaFlo and peers (`research/ai-coverage-vs-competitors-2026-10.md`); (c) the one carve-out register: every team AI requirement with its ID, every AW item marked "extends" or NEW, duplications, and one glossary (`design/ai-carve-out-register-2026-10-11.md`).
2. **Decide the version 1 scope with the founder:** from the evidence, the smallest set of assistants and duties that is safe, valuable and buildable; everything else parked by name, not deleted.
3. **Consolidate to one source:** one blueprint document for the AI layer that points to the team's requirement IDs and holds only what is NEW; the AW modules and change notes trimmed to that scope; superseded design files moved to `archive/` with a pointer (nothing deleted, git keeps all).
4. **The blueprint, best in class:** a visual product map (team modules with the AI layer on top), a short PRD, use cases and user stories for the version 1 scope, the technical design (how the AI steps run on the team's own automation engine, the model provider, evaluation, monitoring), and a high-fidelity prototype (Figma or HTML; the founder has approved spend).
5. **Build readiness:** what the team needs beyond normal coding (evaluation sets, prompt and version control, safety tests, monitoring), the risks, and what not to promise.

## Quality dimensions to raise (score each 1 to 10 before and after)
Single source of truth and traceability · Simplicity (words per decision, layers) · Competitive coverage · Compliance safety · Buildability by the team · Customer validation · Presentation (can a buyer, a developer and an investor each find their page in a minute).

## Added by the founder, 11 Oct: agents, micro-agents and seeing them work
- **Structure:** one AI team member per firm role (for example the Case Officer's AI), with **skills** (micro-agents) under it, each skill doing one job (read documents, check readiness, chase the client, draft a letter). Each skill has its own run record, its own test set and its own health, so a failure points to one skill, not the whole agent.
- **Seeing it work:** a person clicks the AI team member and sees its skills and what each is doing now; the detail is optional, opened on click (like an agent panel that expands to show its steps): what it read, what it proposed, from which source, who approved, what failed and why.
- **This maps onto what exists:** today's assistant (persona) = the AI team member; today's duties (W-01 to W-28) = skills; today's AI Doer steps (Reader, Sorter, Writer, Checker) and product actions = the steps inside a skill. Step R names these three levels once and designs the screens for them.
- **Method:** the Lead interviews the founder one question at a time, with examples and a recommendation; answers become AIW-D rows; the blueprint and the high-fidelity prototype are built from them.

## Founder's decisions in the Step R interview (11 Oct)
AIW-D81 role AI with skills · D82 full scope at launch, every gap fixed, best in class · D83 a driving test per skill (test set, shadow, live, automatic drop back) · D84 the platform is the guardrail (AI only where language or judgement is needed; reusable, diagnosable, cost-controlled skills; access by delegation) · D85 three linked views (AI team page, case panel, detail drawer) · D86 one blueprint plus a working coded prototype · D87 buildable and agnostic of build status, every dependency named, edge cases and failure responses in every journey. Naming of the levels: from the architecture research (question 6).

## Chosen way forward (AIW-D88): Option E
Handbook + coded prototype + three consultant conversations, from the same AI profiles; the existing specification becomes the trimmed technical appendix. Order: names (question 6, from the architecture research) → AI profiles → Handbook and prototype in parallel → consultant conversations → appendix trim and archive → hand to the team.
