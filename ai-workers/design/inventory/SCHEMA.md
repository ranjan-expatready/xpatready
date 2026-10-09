# Inventory format: every reader uses exactly this

Source: `sources/drive-snapshot-2026-10-09/` only. Each reader writes two files in this folder: `<slice>.md` and `coverage-<slice>.md`.

## `<slice>.md`

### Part 1: Components
One row per module (for example AG-07) and one per meaningful sub-component (a section that does a distinct job, for example "AG-07 §3.4 Government milestones").

| ID | Plain name | Plane | What it does (1–2 lines, plain words) | Who uses it | Manual work a person does here today (verbs: reviews, types, chases, checks, decides…) | Doers / Conductor used | Rules, country-pack data or engines it relies on | Human judgement or licensed sign-off required? (quote) | Release (R1 / later / unclear, with source) | Citation (file, version, section, short exact quote) |

Plane is one of: Foundation · Admin (SA) · Firm (AG) · Client portal (CP) · Cross-cutting.

### Part 2: Doers and engines seen in this slice
| Doer / engine | What this slice says it does | Inputs → outputs | Deterministic (rule-based) or needs judgement? | Citation |

### Part 3: AI and automation already written into the requirements
Every place the documents already mention AI, machine learning, OCR/extraction, suggestions, "next-best-action", scoring, auto-drafting, or anything an AI Worker could build on. **Quote exactly.** Include anything explicitly excluded or deferred, and the reason given.

### Part 4: Guardrails already in the requirements
Approvals, review-before-share, audit trail, permissions, consent, retention, licence checks: anything an AI Worker must obey. Quote and cite.

### Part 5: Conflicts, gaps and surprises
Contradictions between documents, missing pieces, and anything that matters for AI Workers. Facts only; label any interpretation **Inferred**.

## `coverage-<slice>.md`
| File | Version | Words | Read in full? (yes/no) | Sections covered | Notes |

Rules: read every file in your slice from start to end, in chunks, and write your notes into the file as you go so nothing is lost. Never summarise a section you did not read. Quotes must match the source word for word (under 25 words each). Plain business language.
