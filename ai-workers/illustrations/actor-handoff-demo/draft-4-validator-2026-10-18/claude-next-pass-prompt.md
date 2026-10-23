# Claude Code: Solution 1 functional and desktop correction pass

Continue Workstream 2, Solution 1 only. You are the maker/Lead; Codex is the founder-assigned validator and guide for this pass. Preserve the current solution approach, useful content, technical views and on-demand detail panels. Make it cohesive and clearer; do not start a redesign or another general planning exercise. This prompt includes the founder's latest desktop, language and actor-colour directions.

## 1. Establish the exact starting point

Read AGENTS.md, ai-workers/README.md, NEXT.md, Solution 1 CLAUDE.md and delivery-control.md, then the latest PROGRESS lines and relevant decisions, including D233–D245. Some handoff entries still describe draft 4 or questions already answered in the current source review; reconcile them rather than repeating stale status.

Current reviewed page: `ai-workers/problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`, **v3 draft 4.1**, SHA-256 **bee3a7a31635663926ce914aca7561a1bdbeebe772564af06fa34c84ee8d01b4**. Verify the hash before using this review as the baseline. If different, identify the intervening revision and reconcile the changes; do not stamp a newer page with this verdict.

Read these saved validator files in `ai-workers/illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/`:

- `current-review.md`: current PASS WITH FIXES, three Material findings and seven scores.
- `desktop-design-spec.md`: selected visual treatment and latest founder refinements.
- `language-review.md`: all 57 current panels; candidate wording, not mandatory renaming.
- `requirements-and-language-method.md`: concise review principles and meaning-preservation checks. Use them internally, not as more prose on the one-pager.

Also read the separate checker's `ai-workers/checks/one-pager-draft-4-checker-review-2026-10-18.md` and its minor-fix line in PROGRESS. The old “every amber” contradiction is **fixed in 4.1**. Do not reopen it as an unfixed defect. The earlier validator `report.md` and `claude-correction-prompt.md` are historical draft-4 records, not the current instruction.

Before major visual edits, archive the complete 4.1 HTML, builder, styles and data/layout sources with hashes. Retain content-level dispositions (kept/moved/changed/removed with reason), not just section counts. Do not overwrite prior archives.

## 2. Correct the three Material findings

Validate each against its cited sources, then implement the smallest complete correction. If you disagree, give the exact current passage and source evidence. No new founder decision is required merely to repair these contradictions.

**C-M1 — Hold at suspicion, not only confirmation.** Activity 4.3 (`s3_data.py`, reviewed line 703) says a suspected material mapping error is held “once confirmed”. D245 §5 says a suspected material mapping error holds the affected mapping and dependent work **pending investigation**. Apply the existing scoped hold from material suspicion, including affected already-approved work. Investigate through 10.4; release with evidence if disproved, or use the existing correction/adoption route if confirmed. Unrelated work continues. Do not turn every ordinary support question into a material hold or invent a new subsystem. Align summaries, activity cards, diagrams, examples, release/submission guards and checks.

**C-M2 — Ready work and missing answers can proceed independently.** In view 4, X9 → L4b “Facts ready for forms” (`s3_views.py`, reviewed line 170) is the inclusive gateway's default. BPMN default flow runs only when the other outgoing conditions do not apply, so a client-gap branch suppresses the ready-form branch. Remove the default designation and express independently applicable conditions. Demonstrate a ready applicant form proceeding while a partner's missing answer is requested. Validate the actual generated gateway/flows and the example; text-presence checks alone are insufficient. This is an explanatory-model correction, not a claim that a live engine was tested.

**C-M3 — One fact-state contract across preparation, filling and approval.** Activity 8.2 says missing or Held facts stop at review 8.4; 8.4 instead allows Held facts to reach filling while preventing approval. Reconcile 8.1/8.2/8.4/9.1, stage 6, views 4/6 and examples. Check the existing accepted rules before applying this candidate interpretation: a missing/conflicting fact may allow a preview but stops at 8.4 before filling; a Held needs-review/still-true fact with an existing verified value may be prepared/filled but cannot be approved or submitted until resolved; no verified value is treated as missing; ready verified facts follow normal checks. If the sources do not settle a boundary, label that exact gap and ask only the necessary founder question rather than silently inventing policy. Make the chosen source-grounded boundary consistent everywhere.

## 3. Refine the desktop presentation

Optimise **desktop**, including a 960px reading pane and 1280/1440/1920px widths. Mobile optimisation is not requested and mobile-only limits must not lower the score. Keep dark mode legible without a separate redesign.

Use the existing bands/cards, technical diagrams and local details. Apply the seven correction areas in the visual specification:

- **D1, composition:** rebalance setup and case cards, entry region and completion strip. Align comparable heading/action/handoff rows. Avoid unexplained blank regions; do not stretch every card to the tallest height or force empty template sections.
- **D2, hierarchy:** compact the terms key, move long role/permission explanations into existing appropriate details, standardise title/body/caption sizes and role-tag positions. Preserve authority and permissions. Keep readable text sizes and paragraph widths.
- **D3, handoff/end:** attach markers to their explanation. Replace the misleading “Each filing's decision → End” presentation with the explicit After decision handoff, next-filing continuation where applicable, and separate eventual case-closure condition. Keep the technical distinction between ending a view and closing a case.
- **D4, symbols:** use consistent, purposeful symbols with adjacent short labels or complete tooltips. Start rings are legitimate BPMN symbols; do not indiscriminately delete them as empty bullets. There were no genuinely empty visible list items in the validator's refined probe.
- **D5, connectors:** align entry/exit anchors, preserve every route, prevent label/card collisions and split words such as “pub-lished”. Do not redirect an arrow merely to make a tidy grid.
- **D6, tables/details:** improve cramped stage stories and sparse reference matrices with deliberate widths, wrapping and readable pane space. Keep the selected activity visible. Preserve Back, Escape, close, keyboard focus/return, scroll restoration and example state. Desktop cell overflow was not found in the reviewed set; do not claim every table is broken.
- **D7, restraint:** use a calm neutral canvas, neutral text, muted phase washes, fine side rules and consistent small accents. No decorative illustrations, gradients or competing bright outlines. Red/amber/green retain their labelled review-state meaning.

**Case initiation:** replace “Two ways in” with a clear parent such as “Start a new case”, with **4A · New-client intake** and **4B · Existing-client new service** as display variants converging on shared case creation. Preserve lead qualification, identity/duplicate resolution, refusal-to-open and the returning person using a lead route. Never imply a case opens before the firm accepts the lead. Preserve stable stage/activity IDs and links through aliases; no renumbering cascade.

**Actor colours, gracefully:** there are six named human roles grouped by three product sides: Super Admin (content publisher, proposed Immigration SME, second-person approver), firm staff (agent, lead representative), client/family. Reuse current human task marks, with restrained navy/teal/plum families as a starting option; retain the actual role names and permission distinctions. AI/platform are system work and government is external. Do not create six new role colours or change product entitlements. Reuse an existing confirmed visual convention when suitable.

Use one compact key in an existing diagram header **only where it helps**, with participating sides only and matching lane-label cues. Do not place legends among arrows or repeat a full key inside every lane. Colour is secondary to text/shape, and must not conflict with phase or review-state colours. If a cue duplicates a clear label, crowds content or degrades contrast, omit/reduce it. Verify the actual result in both themes. Do not add more icon noise to demonstrate that this request was implemented.

## 4. Review the language and completeness without inflating the page

Read every visible heading, label, instruction, handoff, tooltip, diagram annotation and panel against the source-grounded functional method. A short title states action/object; its opening sentence supplies actor, concrete inputs and result. Replace drawing vocabulary or conversational shorthand with Expat Ready terminology. Do not make headings into paragraphs.

Preserve the original actor, condition, obligation/authority, relevant person/data/version, outcome and recovery path. Keep the overview, BPMN, panel, example and requirement/check consistent. Retain existing language that already works. Remove duplication, not necessary meaning; there is no arbitrary word-count ceiling. Include a small visual example, decision table or Input → Action → Output → Receiving owner flow where it makes a difficult behaviour understandable; do not force one into every reference panel or invent inapplicable trigger fields.

For example, the content publisher attaches the **base** government forms, checklist and instructions for the combination; AI discovers/proposes additional conditional requirements under the accepted process. Do not rewrite this as people manually finding every conditional form. IRCC is the Canadian government authority; RCIC is not the government. Keep generic product government scope where appropriate. Correct “one pathway version” where it actually means the published country pack and its pinned version, using the existing model.

Fix the complete per-filing tooltip: `runs_html` currently inserts an apostrophe into a single-quoted `data-tip` attribute, truncating the explanation to “each applicant”. Escape attributes correctly and verify the rendered full text. Make decision tooltips reflect whether outcomes are exclusive or may apply together. Use the exact legal caveat where applicable: “Unconfirmed: no counsel (AIW-D94)”. Immigration values remain specialist-confirmed.

Assess critical journeys/exceptions and implementation boundaries, not every imaginable scenario. Known identity/case lookup, verified-fact reuse, section/view assembly, transforms, filling and version rules should use deterministic product rules. Do not add an autonomous AI agent for tasks the system already knows how to do. Retain the selected saved-map route and human authority; AI value in semantic drafting/document reading remains plausible but unmeasured. Do not claim the second AI checker proves correctness or substitute self-reported confidence for evidence. Preserve the agreed bounded runtime comparison; do not reopen the filling decision wholesale.

Use the current original team requirements, code captures and applicable founder decisions for behaviour. The validator's external references concern writing, requirements review, BPMN semantics and design accessibility, not imported product requirements. Refresh sources before new reliance. Necessary derived gaps may be proposed with a concrete reason; new business choices are not silently accepted requirements. No unnecessary component, review step, text, framework or generic best-practice filler.

## 5. Verify, hand over and stop at the correct gate

Run the relevant existing artifact checks after edits, and add meaningful targeted checks for C-M1–C-M3 and the tooltip defect. Verify rendered/semantic conditions rather than only finding expected words. Inspect every affected panel and cross-level explanation.

Inspect actual desktop screenshots at 960/1280/1440/1920 in light/dark for changed map regions, technical views, tables and representative open panels. Check title/content baselines, whitespace, arrow/label clearance, words, actor-key placement/contrast, focus and eye/panel behaviour. Capture a small named before/after set with observations; screenshot count and zero geometry collisions are not an aesthetic verdict. Preserve the currently passing interactions.

Provide one concise correction response: each C-M/D item → Agree/Refine/Disagree with evidence → changed location → observed result/remaining limit. Keep the content-level preservation ledger and exact final HTML hash. Update NEXT, delivery control and PROGRESS to the actual revision/status and latest founder assignment. Preserve historical scores; give seven new evidence-backed scores: solution quality, completeness, readability, usability, honesty, implementation feasibility, functional language/consistency. Visual quality is included in readability/usability, not a new eighth lens. Aim for nine, but never assign nine to meet a target; distinguish explanatory quality from unexecuted production evidence.

Mark ready for Codex's exact-revision recheck. Do not declare founder acceptance, start downstream artifacts/Solution 2, commit or write remotely/publish. After validation the founder decides high/medium solution alignment and any explicitly accepted remaining limitations.

Continue Workstream 2 from ai-workers/NEXT.md. Work only on its next outcome.
