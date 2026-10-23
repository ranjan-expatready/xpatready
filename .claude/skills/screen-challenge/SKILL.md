---
name: screen-challenge
description: Honest, ranked challenge of an agreed screen concept before anything is built — product logic, data and rules integrity, back-end feasibility, UX, immigration fit, retrofit, standards and quality — written to screens/NN/challenge.md. Used by the builder at stage CHALLENGE and by a fresh agent on the Lead's concepts.
---

# Challenge the concept — assume it is wrong until it survives

Read `ai-workers/problem-1-pathway-setup-and-form-filling/product/screens/NN/concept.md` and `design/`, `PRODUCT.md`, `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, the `domain/` files it touches, the SA-01B sections it cites, and the app code it changes. Run `ai-workers/tools/freshness.sh`; mark stale team sources Unverified.

**Attack from eight sides:** (1) product logic — find a case in `domain/TAXONOMY.md` §4 that breaks a rule; (2) data and rules integrity; (3) back end — record, migration, endpoint and engine per element, feasible with the sample data; (4) UX — where would an RCIC get lost or act wrongly; (5) immigration fit (skill immigration-structure); (6) retrofit — divergence from team names or components without a mapping; (7) standards — which `STANDARDS.md`/`EXPERIENCE.md` rule the design would force us to break; (8) quality — D1–D16, anything below 4.

**Rules:** rank Blocker → Major → Minor; each with what breaks, an example, evidence and a fix; facts separate from judgment, with confidence; say what is sound; never invent objections; **do not add scope** — gold-plating is a defect too. Label every objection *Needed for the proof* or *Not built* (P-26, `WORKFLOW.md` scope test); an objection that only matches what the team's screen already has is *Not built*. Also flag anything where scaffolding (seeding, sample loaders, dev tools) stands in for a capability (P-33).

**Write `challenge.md`:** Verdict (Build as is / Build after these changes / Rethink) · Objections · What is sound · Back-end plan (element → record → API → rule → test) · Questions for the founder (≤3, recommendation first) · Lead response (empty) · Agreement (empty) · Build discoveries (empty).
