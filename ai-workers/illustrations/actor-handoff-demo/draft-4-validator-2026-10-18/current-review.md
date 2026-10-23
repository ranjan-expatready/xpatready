# Solution 1: current validator handoff

18 October 2026 · **Draft 4.1 review: PASS WITH FIXES.** This is not founder acceptance or a production-readiness verdict. Claude Code implements; Codex validates under the founder's current assignment.

**Exact reviewed HTML:** `bee3a7a31635663926ce914aca7561a1bdbeebe772564af06fa34c84ee8d01b4`. [Frozen inputs](manifest-4.1.json). The page changed during the earlier draft-4 review; that sign-off was stopped. This review reconciles the separate checker's saved verdict and every changed source passage, re-extracts all 57 panels and reruns the four checks on frozen 4.1. Earlier draft-4 findings/scores remain historical in [report.md](report.md).

## Current status

| Done | Still needed |
|---|---|
| Core saved-map / shared-fact / human-authority approach retained; previous versions archived by maker/checker | Three existing Material corrections below; no architecture restart |
| Draft-4 minor changes independently compared; “every amber” contradiction is fixed in 4.1 | Full functional wording and desktop composition pass, preserving business meaning |
| 150/150 + 35/35 + 41/41 independently pass; geometry reports zero collisions; all 57 current panels open | Targeted semantic checks: green text-presence tests did not establish correct conditions |
| Desktop tables have no measured overflowing cells in the captured set; former phone layout corrected | Better card/label alignment, glossary/panel/table proportions, connectors and symbol captions |
| All 51 master-file metadata and local hashes match; four tracked code branches match | Refresh source/version checks on later reliance; metadata is not a line-by-line review of all 51 sources |
| Existing source/need trace, delivery process and future artifacts recorded | Maker updates stale NEXT/control, then exact-revision validator recheck and founder acceptance |

The next filing's version is now tied to the case's pinned version, using AG-07 v2.9 AG-7-56 / BR-21. Staff closure while a filing remains open and the wider manual-fallback scope remain explicitly unresolved. No new founder answer is needed to fix the three Material items.

## Three Material fixes, reconciled with the separate checker

| ID | Current defect | Smallest fix / required result |
|---|---|---|
| **C-M1** | 4.3 still says a suspected material mapping error is held **“once confirmed”**. D245 §5 requires the hold **pending investigation** | Use existing scoped hold at suspicion, investigate through 10.4, record release if disproved or correction/adoption if confirmed. An affected, already-approved form cannot be submitted during investigation; unrelated work continues |
| **C-M2** | View 4 X9's ready-form branch is marked default (`s3_views.py:170`). At an inclusive BPMN gateway, the default fires only when the other conditions do not; a client gap therefore prevents the ready-form branch | Remove the default attribute and give independently applicable branches clear conditions. Show client A's ready form continuing while the partner's missing client answer is requested. This is a diagram/requirements correction, not proof of a live workflow bug. [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2/PDF), Inclusive Gateway execution semantics |
| **C-M3** | 8.2 still says **“a missing or held fact stops it at review, 8.4”**, while 8.4 allows Held fields to proceed to filling but stops approval. The minor pass changed view 6 wording but did not settle the whole contract | Use one state boundary everywhere: missing/conflicting fact → preview can render, stop at 8.4 before filling; Held needs-review/still-true fact → may prepare/fill only from an existing verified value, no approval/submission until resolved (without a verified value, treat it as missing); ready verified facts → continue under normal checks. Reconcile 8.1/8.2/8.4/9.1, stage 6 and views 4/6. If a boundary is not actually settled by the accepted rules, identify that exact gap rather than silently choose |

I independently agree with the separate checker's C-M2/C-M3 findings after checking the current source and the BPMN rule. My initial draft-4 pass did not isolate those two defects; they are now included. The previously noted “every amber” summary is closed by 4.1, not carried forward as an open Material finding.

## Desktop and language correction scope

Follow [desktop-design-spec.md](desktop-design-spec.md), with these latest founder amendments:

- **Desktop first**, including a 960px reading pane alongside another panel. Do not optimise phones or penalise mobile-only limits.
- Keep the current bands/cards, diagrams and local details. Correct large unexplained blank regions, inconsistent internal text alignment, oversized glossary rows, cramped story tables, split handoff words and detached end markers. Do not equalise heights with empty padding or shrink text.
- Use calm, formal colours, neutral body text, muted bands and thin side rules. Small accents are welcome; no playful/decorative effects. Keep red/amber/green review-state meanings separate.
- Replace drawing-oriented “Two ways in” with **case initiation**. Present **4A new-client intake / 4B existing-client new service** as variants reaching shared case creation. Preserve pre-case qualification, duplicate resolution and refusal-to-open; retain stable internal IDs/aliases. Details in the language method.
- **Six named human roles, three product sides:** Super Admin (content publisher, proposed Immigration SME, second-person approver); firm staff (agent, lead representative); client/family. Reuse human task marks with proposed muted navy/teal/plum and role names retained. Add a compact key in the existing diagram header only where helpful, showing participating sides; match lane cues without repeated full legends. Omit redundant cues or any that crowd the flow. AI/platform are system work; government is external. Colours do not grant permissions.
- Use meaningful labels for entry, wait, decision and end/handoff. “Each filing's decision → End” must become an attached After decision handoff with eventual closure stated separately. Start circles are meaningful symbols, not empty bullet defects.
- Fix the truncated per-filing tooltip: an apostrophe is inserted into a single-quoted attribute without escaping in `runs_html`. Make the complete explanation appear. Make the generic decision tooltip agree with whether outcomes can occur together.

## Requirement and solution quality, without added bureaucracy

[Requirements-and-language method](requirements-and-language-method.md) records the primary guidance checked: Canada.ca/GOV.UK for task-based, direct labels; NASA for clarity/consistency/traceability/verifiability; SEI ARID/ATAM for scenario-based design suitability and tradeoffs. These guide the **method**, not product behaviour. No formal certification or exhaustive scenario claim is made.

The [57-panel language review](language-review.md) covers current body meanings and candidate labels. It is not a requirement to rename every good heading. A short title can state the action/object; the first sentence supplies actor, concrete inputs and outcome. For example: “Attach government forms and instructions for the combination.” The first sentence names the content publisher and **base** forms/checklist/guide/eligibility sources. Do not imply people must manually find every conditional form; that would change the agreed AI behaviour. Use IRCC in Canadian examples, not RCIC as the government authority.

Meaning must survive: actor, condition, obligation/authority, person/data/version, outcome and exception/recovery. Each meaningful rewrite traces to the original requirement/decision and affected summaries/details/examples/tests. New completeness gaps may be raised, but new business choices are Proposals, not silently accepted requirements. No fluff, automatic word-count cut, repeated explanation or unnecessary component. The founder confirmed “BCSO/Bosco” was a typo; no additional framework is needed.

**AI value:** semantic drafting and variable document reading are plausible AI uses; identity/case lookup, selecting verified facts, known section/view assembly, transforms, filling and version rules should use the product's deterministic rules. No additional autonomous agent is justified by this audit. AI's actual time/cost/quality benefit and the extra meaning checker's value remain unmeasured; keep the agreed bounded comparison rather than claiming or removing value without evidence.

## Seven scores on this revision

| Solution | Completeness | Readability | Usability | Honesty | Feasibility | Functional language |
|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7.5 | 7 | 8 | 8.5 | 7.5 | 7.5 |

Solution/completeness are limited by the three semantic defects; readability by uneven desktop composition; usability by cramped local details and ambiguous markers; honesty by remaining proposal/evidence boundaries; feasibility by unexecuted form/portal proofs; functional language by inconsistent states and vague labels. The full report gives the observations rather than treating these scores as measured performance.

Expert judgments, not probabilities. Visual/aesthetic subscore **6.5**, included in readability/usability. Main limits: three unresolved semantic defects; desktop balance/wording; no real-reader trial; unmeasured AI value and unexecuted XFA/portal/final-file proofs. These do not all require more one-pager text or a production POC before high/medium acceptance. No nine claim is warranted. Source grounding and exact evidence remain in the linked frozen records.

## Next action

Give Claude **only [claude-next-pass-prompt.md](claude-next-pass-prompt.md)**. It includes the functional fixes, latest desktop/language/symbol directions, preservation and recheck requirements. After a new saved hash and evidence, Codex rechecks affected material and desktop regions. Then the founder decides acceptance and any explicit below-target limitations. Slides, detailed pack/workbook, sketches/prototype and Solution 2 remain deferred under the existing sequence.

No product files were edited by this validator. No commits, publication or remote writes. The hosted copy has not been verified and may show an older revision. Start a new Codex chat only if useful for continuity; [resume prompt](codex-resume-prompt.md) points to this current review.
