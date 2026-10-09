# B-qualifier: the Qualifier (eligibility and scoring)

**Reference index. The source documents remain the only source of truth.**

*Workstream 2 baseline, carve-out B. Prepared 9 Oct 2026 from `sources/drive-snapshot-2026-10-09/` (newest snapshot) and the founders' June specs in `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/`. Faithful carve-out: each quote is a short identifying extract (at most 25 words, rule AIW-D22), word for word with bold, italics and code marks removed; "…" marks an omission. Open the cited line for the full requirement. No rewording, no improvements. Every extract was machine-checked against the cited line.*

**What it is for.** The Qualifier takes an applicant's profile and runs it against every immigration program in the firm's country pack, returning for each program one of four outcomes (likely eligible, eligible but below the cut-off, possibly eligible with named missing inputs, not eligible with the failed rule), a points breakdown, and suggested improvements. Every run is saved as a frozen, version-stamped record. It is rule-based: same inputs and pack version always give the same answer. **Who uses it:** intake staff and the consultant (RCIC) on leads; the result drives the lead score (AG-03, AG-02). **What it replaces (founders' spec):** no product named; it is a Tier 3 "immigration-only moat" Doer ("eligibility + pathway + CRS scoring"; the IP is the "scoring engine"). **Status in one line:** the core engine is Release 1; what-if recommendations, consultant override, PNP streams, client-shareable assessment and auto-assess are proposed for Release 2 in the 5 Oct scope review.

**Sources used in this file** (short name, then file):

- Founders naming spec v1 (2026-06-13): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-13-er-doers-brand-naming-spec.md`
- Founders IA Doers model v1 (2026-06-14): `code/expat-ready-api@c4117a3-2026-10-09/docs/superpowers/specs/2026-06-14-er-product-ia-doers-model.md`
- Agent 00-Overview v1.11: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/00-Overview_v1.11_2026-10-07.md`
- FDL v1.5: `sources/drive-snapshot-2026-10-09/01-techno-functional/07-Founder-Decisions-Log.md`
- Doc 2 v1.4: `sources/drive-snapshot-2026-10-09/01-techno-functional/04-Doc-2-SuperAdmin-Console.md`
- AG-03 v1.4: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-03-pathway-assessment_v1.4_2026-10-07.md`
- AG-02 v1.9: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-02-prospect-lead-sales-crm_v1.9_2026-10-07.md`
- AG-08 v1.7: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/AG-08-smart-questionnaire_v1.7_2026-10-07.md`
- SA-06 v3.1: `sources/drive-snapshot-2026-10-09/02-functional-requirements/super-admin/SA-06-rbac_v3.1_2026-10-08.md`
- SCOPE-TRIAGE 2026-10-05: `sources/drive-snapshot-2026-10-09/02-functional-requirements/agent/SCOPE-TRIAGE_2026-10-05.md`
- Charter V1 (md dump): `sources/drive-snapshot-2026-10-09/06-program-management/Program Charter V1 - G1 expanded.md`
- Doc 1 v1.3: `sources/drive-snapshot-2026-10-09/01-techno-functional/03-Doc-1-Platform-Foundation.md`

**How to read the table.** "Release label as written" repeats the source's own release words; where the cited line gives none, it says so. A conflict or overlap names the other row or source. Rows are grouped: definition and naming first, then what it does, inputs and outputs, human steps, triggers, audit, release, and the older July documents (Doc 1–4) last.

| Req ID | Exact words | Source (file, version, section, line) | Release label as written | Conflicts / overlaps |
|---|---|---|---|---|
| SPEC-N roster | "Qualifier \| eligibility + pathway + CRS scoring \| scoring engine" | Founders naming spec v1 (2026-06-13), §5 Roster, Tier 3, L77 | Tier 3 (no release date) | — |
| SPEC-N -or rule | "Assessor \| Qualifier" | Founders naming spec v1 (2026-06-13), §3, L38 | None stated | — |
| SPEC-IA My Day | "New assessments \| Qualifier" | Founders IA Doers model v1 (2026-06-14), Home = "My Day", L48 | None stated | — |
| AOVW scope | "AG-3 \| Pathway Assessment (Qualifiers & Calculators) \| Country-pack-driven eligibility + scoring · program-match · explainable breakdown + recommendations · consultant override · version-stamped …" | Agent 00-Overview v1.11, Detailed Scope Index, L82 | "Release 1" | TRI L45, L48 propose to move recommendations and consultant override. |
| FD-16 | "The eligibility/scoring/workflow engine stays fully deterministic, versioned and explainable — no model output is ever a decision." | FDL v1.5, Blueprint batch, resolved 2026-08-02, L52 | None stated (ratified) | Carve-out A covers FD-16 in full. |
| FD-20 | "every assessment result carries an isAutomatedDecision flag, an … a client-facing plain-language explanation, and a REVIEW_OF_AUTOMATED_DECISION request type in the DSR machinery routing to …" | FDL v1.5, Blueprint batch (architect-decided), L56 | None stated (ratified) | AG-03 v1.4 has no isAutomatedDecision flag or review-request type (no match in the file). Charter V1 L115 relies on FD-20 for "Human review". |
| FDL A-3 | "Gates: AG-3 (Qualifier runtime), SA-1 §5.13." | FDL v1.5, A-3 Admissibility / validity-window rules, L193 | None stated | — |
| DOC2 capability | "cap.qualifier \| eligibility \| DOER \| cap.spine.canonicalfields, cap.spine.answerstore \| feature.qualifier.advancedscoring \| growth" | Doc 2 v1.4, SA-CT capability registry seed table, L76 | "growth" (illustrative tier) | — |
| AG-03 what it is | "the in-house Qualifier that, given an applicant's profile, evaluates them against every immigration program and stream in the firm's one destination country and returns …" | AG-03 v1.4, §1 Purpose, L93 | None stated | — |
| AG-03 §3.0 snapshot | "an Assessment is an immutable, version-stamped snapshot of running the Qualifier over a profile at a moment in time." | AG-03 v1.4, §3.0 The assessment model, L134 | None stated | — |
| AG-03 §3.0 inputs | "The Qualifier never owns or re-collects the person's data; it reads the canonical profile that AG-2 captured and AG-8/SQR will reuse." | AG-03 v1.4, §3.0, L136 | None stated | — |
| AG-3-3 | "the surface SHALL render/validate accordingly and SHALL flag missing pack-required inputs as gaps, not zeros." | AG-03 v1.4, §4, L342 | None stated | — |
| AG-3-5 | "The eligibility/scoring brain SHALL be supplied entirely by the active Country Pack version" | AG-03 v1.4, §4 Country Pack, L346 | None stated | Pack content (Canada) not yet authored; values from the Immigration-SME (§13 items 1–7). |
| AG-3-6 | "an unpublished/draft version SHALL NOT be used for a real assessment." | AG-03 v1.4, §4 Country Pack, L347 | None stated | — |
| AG-3-10 | "the engine SHALL return exactly one outcome from: LIKELY_ELIGIBLE, ELIGIBLE_BELOW_CUTOFF, POSSIBLY_ELIGIBLE (missing data), NOT_ELIGIBLE." | AG-03 v1.4, §4 Outcomes, L353 | None stated | TRI L42 keeps "core engine (eligible / possibly / not, with reasons and missing inputs)". |
| AG-3-11 | "A high score SHALL NOT make an applicant eligible for a program whose gate they fail." | AG-03 v1.4, §4 Outcomes, L354 | None stated | — |
| AG-3-12 | "the outcome SHALL be POSSIBLY_ELIGIBLE annotated with the specific missing input(s) — never a false NOT_ELIGIBLE." | AG-03 v1.4, §4 Outcomes, L355 | None stated | — |
| AG-3-19 | "The Canada pack SHALL provide, as rule-sets, at minimum: CRS (Express Entry, draw-ranking), FSW-67 (fixed pass), and the PNP streams OINP / AAIP / …" | AG-03 v1.4, §4 Scoring, L364 | None stated | TRI L47 proposes to move the five PNP streams; Charter V1 notes leave PNP stream depth open. |
| AG-3-20 | "Every score computation SHALL emit a per-factor breakdown alongside the total as a first-class output." | AG-03 v1.4, §4 Scoring, L365 | None stated | — |
| AG-3-22 | "The Qualifier SHALL compute actionable recommendations from the breakdown + pack recommendation levers, each with an estimated point delta" | AG-03 v1.4, §4 Recommendations, L369 | None stated | TRI L45 proposes to move what-if recommendations. |
| AG-3-24 | "Recommendations SHALL be framed as indicative levers (never promises) and SHALL inherit the no-guarantee disclaimer." | AG-03 v1.4, §4 Recommendations, L371 | None stated | — |
| AG-3-25 | "Every Assessment SHALL be stamped at creation with: Country Pack id + version, per-program rulesAsOf, the disclaimer text + locale rendered, an input-snapshot reference, …" | AG-03 v1.4, §4 Provenance, L374 | None stated | Audit content of each run. |
| AG-3-26 | "Given the stored input snapshot and the stamped pack version, the engine SHALL be able to re-derive the identical result (reproducibility invariant)." | AG-03 v1.4, §4 Provenance, L375 | None stated | — |
| AG-3-28 | "Re-running an assessment SHALL be explicit, SHALL create a new immutable Assessment, SHALL record the reason" | AG-03 v1.4, §4 Re-run, L379 | None stated | AG-03 §13 Q10 (L668) asks whether to auto-run on profile-complete. |
| AG-3-29 | "When a pack version newer than a lead's latest assessment publishes, the assessment SHALL be flagged stale" | AG-03 v1.4, §4 Re-run, L380 | None stated | TRI L49 proposes to move the stale queue. |
| AG-3-32 | "Every result rendering SHALL display the regulator-safe no-guarantee disclaimer … the disclaimer SHALL NOT be dismissible or separable from the result." | AG-03 v1.4, §4 Safety, L385 | None stated | Wording: confirm with counsel / RCIC (FDL B-3). |
| AG-3-33 | "A consultant with the override permission SHALL be able to override a program's outcome with a mandatory documented reason; the override SHALL be stored …" | AG-03 v1.4, §4 Safety, L386 | None stated | Human judgement step; TRI L48 proposes to move it ("a note does the job"). |
| AG-3-34 | "An Assessment MAY be marked reviewed/approved by a consultant … whether review is mandatory before client-share is configurable." | AG-03 v1.4, §4 Safety, L387 | None stated | TRI L42 keeps a "reviewed by" stamp; §13 Q9 open. |
| AG-3-35 | "Override and review actions SHALL be audited (actor, target, before/after)." | AG-03 v1.4, §4 Safety, L388 | None stated | — |
| AG-3-36 | "The eligibility outcome SHALL be published to AG-2 as the primary driver of the lead score / NBA" | AG-03 v1.4, §4 Hand-offs, L391 | None stated | TRI L29 proposes to move lead scoring and next-best-action. |
| AG-3-38 | "A consultant SHALL be able to produce a client-facing assessment artifact … sharing SHALL be audited." | AG-03 v1.4, §4 Hand-offs, L393 | None stated | TRI L50 proposes to move client-shareable assessment. |
| AG-3-39 | "The Qualifier SHALL be a deterministic pure function over (resolved inputs, pack version): identical inputs + version ⇒ identical outputs." | AG-03 v1.4, §4 Non-functional, L396 | None stated | — |
| AG-03 BR-16 | "an unreviewed auto-assessment is not silently published as advice." | AG-03 v1.4, §5 Business rules, L419 | None stated | — |
| AG-03 §13 Q10 | "Should an assessment auto-run on profile-complete … or only on explicit "Assess"?" | AG-03 v1.4, §13 Genuinely open, L668 | Open founder question | TRI L52 proposes to move auto-assess. |
| AG-2-36 | "A lead SHALL surface an eligibility score/summary from the Qualifier (AG-3), version-stamped and carrying the no-guarantee disclaimer" | AG-02 v1.9, AG-02 §4, L606 | None stated | — |
| AG-8-22 | "The Qualifier (AG-3) and case forms (AG-7) SHALL read the profile … NOT the raw response" | AG-08 v1.7, AG-08 §4, L384 | None stated | — |
| SA-06 permission | "agent/assessment:run \| Run / re-run the Qualifier" | SA-06 v3.1, Permission catalogue, L716 | None stated | — |
| TRI AG-03 stays | "no-guarantee disclaimer · saved result … core engine (eligible / possibly / not, with reasons and missing inputs) · Canada CRS + FSW as …" | SCOPE-TRIAGE 2026-10-05, AG-03 Stays, L42 | Stays in Release 1 (list heading, TRI L6) | — |
| TRI AG-03 moved | "Entitlement tiers, bulk re-run, auto-assess" | SCOPE-TRIAGE 2026-10-05, AG-03 Proposed to move, L52 | Proposed to move to Release 2 (list meaning, TRI L7) | — |
| CH1 journey | ""Human review" means a client can ask a named person to review an automated eligibility result (FD-20)." | Charter V1 (md dump), Speaker notes, the journey, L115 | Release 1 journey (CH1 §1) | AG-03 v1.4 does not specify the FD-20 review request. |
| DOC1 pure Doer | "The remaining Doers (Scheduler, Minder, Filler, Qualifier, Finder, Messenger's in-process automation) are pure in-house Doers with no external rail" | Doc 1 v1.3, §6.3, L1786 | "not foundation scope" (same line) | — |

Requirement rows: **41**.

## Gaps noticed

- FD-20 (ratified) requires an "automated decision" flag, a factor snapshot, a plain-language explanation and a client right to ask a named human to review; the Charter journey promises it; AG-03 v1.4 specifies snapshots and explanations but not the flag or the review request. Carve-out A also covers FD-20.
- The Qualifier is fully deterministic by requirement (AG-3-39, FD-16). Human judgement sits in override (mandatory reason), consultant review before client-share (configurable), and the open question whether review is mandatory.
- Auto-run is undecided (AG-03 §13 Q10); the scope review proposes moving auto-assess. Inferred: any AI Worker that "runs the Qualifier" would be an explicit re-run, recorded with actor and reason (AG-3-28).
- All immigration values (programs, gates, grids, pass marks, disclaimer wording) are pack content from the Immigration-SME: confirm with RCIC. The Canada pack is not authored yet (review W1 Task 5 row 9).
- AG-03 still uses "Phase" vocabulary in its deferrals; its status line says "Baseline — not yet reviewed" (AG-03 L1).
- Audit: provenance stamped on each run (AG-3-25); override, review, client-share and pinned re-run audited (AG-3-35, AG-3-41).
