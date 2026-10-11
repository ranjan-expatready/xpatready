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
