# Solution 1 draft 4: validator review and desktop correction brief

> Historical review of frozen draft 4 (07580481…). The page changed before sign-off, so no verdict was appended for this draft by this validator. Use [the reconciled draft-4.1 review](current-review.md) and [current maker prompt](claude-next-pass-prompt.md). F2 below is fixed in 4.1; additional C-M2/C-M3 are in the current review.

18 October 2026 · Independent validator, assigned directly by the founder in this conversation. Claude Code remains the maker. **Verdict: PASS WITH FIXES for high/medium solution alignment; not ready for founder acceptance yet.**

Reviewed HTML SHA-256: `0758048127c34deace6ab78e7c729e8d3ffabf719d0da43bd091b48597a4f9ef`. [Frozen inputs](manifest.json). Product files have not been edited by this review. The maker's later corrections require a new preserved revision and targeted recheck.

The core approach is worth keeping. Draft 4 improves the lifecycle, ownership, proof wording and rules-versus-AI separation. Remaining work is two concrete functional corrections and a coherent desktop presentation pass—not a fresh architecture or another general solution-planning round.

## 1. Current position and scope

| Area | Status established by this review |
|---|---|
| Problem and solution | Solution 1 only: reusable combination setup, shared facts, questionnaires/documents, form preparation/approval/filing and changes. Solution 2 stays parked |
| Current deliverable | Interactive one-pager, v3 draft 4, high/medium behavioural depth. Not a completed detailed build contract |
| Earlier audit | Read the original 28-need matrix, all-panel review, draft-3 review and current maker dispositions; checked current explanations rather than treating preservation counts as proof |
| Detail coverage | Opened/extracted all **57 distinct panels**, including expanded rules and examples: 41 activities, 12 stages, two entry routes and two references; about **32,222 words**. One available control per distinct panel, not every duplicated eye |
| Independent reruns | **150/150** main checks, **35/35** panel checks, **41/41** cohesion checks; rendered geometry reports **zero collisions across eight diagrams**. Text assertions still miss the two contradictions below |
| Desktop visuals | Captures at **960, 1280, 1440 and 1920 CSS px**, light/dark. Inspected all seven phase diagrams, technical overview, three map bands, stage strip, terms/role introduction, records, controls, evidence and representative open panels. 960 is a desktop reading pane, not a mobile device. All eight diagrams inspected at 1440 light; band/table captures span the width/theme set, not every diagram at every width/theme |
| Source freshness | All **51 live metadata records** match; all **51 local hashes/sizes** match. No newer requirements in the current technical/FR masters; the FR parent still lists the same two masters. All **four tracked code branches** match captures. Changed non-master tracker/team documents are not substituted for the requirement masters. Metadata freshness does not mean all 51 source documents were reviewed line by line |
| Acceptance and publishing | No founder acceptance recorded. The last recorded hosted publication is an earlier revision; do not assume it shows draft 4. Hosted wrapper/access not independently checked here |
| Future deliverables | Bounded real-form read/matching, walkthrough, detailed pack/workbook, required sketches and expected-behaviour prototype remain later work under D229/D232; their absence is not a current one-pager defect |

**Latest founder direction governs the next pass:** optimise desktop, including constrained desktop panes; do not spend effort optimising phones or penalise mobile-only limits. Keep the existing approach and useful content. Use restrained, formal, reader-friendly colour and typography, with subtle visual life rather than playful decoration. Distinguish the two entry routes clearly.

This review does not execute AI/provider calls, actual PDF/barcode writing/Validate, portal automation, production migration/case workflow, real-reader trials, screen readers or real devices. The 226 checks test the explanatory artifact, not those product behaviours. No additional independent person reviewed this validator's final conclusions.

## 2. Two material functional corrections

| ID | Location and exact conflict | Smallest correction and acceptance scenario |
|---|---|---|
| **F1 · Hold timing contradicts D245** | Activity **4.3**, `s3_data.py:703`: a suspected material mapping error is triaged, then **“once confirmed, the mapping and its dependent work are held”**. D245 §5 instead says **“A suspected material mapping error holds the affected mapping and dependent work pending investigation”**. 10.4 describes the confirmed-wrong-mapping action but supplies no earlier investigation hold | Apply the existing scoped hold when a **material error is suspected**, pending investigation; distinguish this from a confirmed correction and its adoption/reapproval. Do not hold unrelated work or every ordinary support question. Test: historical comparison raises a suspected wrong-person mapping while another open case has already approved an affected form. That dependent work cannot pass submission during investigation. If the suspicion is disproved, release the hold with recorded evidence under the existing authority; if confirmed, use the existing correction/adoption route. Do not invent a new subsystem |
| **F2 · Approval instructions still contradict Advisory rules** | Activity **9.3**, `s3_data.py:1208`: **“acknowledges every amber, flagged and important item”**. Its own rule says **“Advisory items are listed only”**; 8.4 also classifies Major/Minor advisory items as amber with **“no reason needed, never blocks”**. AG-07 v2.9 **AG-7-27** says **“MAJOR/MINOR/INFO deficiencies are shown and need nothing passed”** | Replace colour-based obligations with named states: explicit acknowledgement for Warning (Critical), decision/review for flagged and important items, Advisory listed without acknowledgement, Held/Blocked never acknowledged away. Reconcile summary, rule, examples and acceptance wording. Test two equally amber fields—one Critical, one Advisory—and derive different, consistent required actions. No founder decision needs reopening |

Both defects are visible in the rendered templates: [focused probes](evidence/desktop-focused.json). They are requirements contradictions, not claims that a production case was executed incorrectly.

**Why the green tests missed them:** `check_cohesion.cjs:43–44` tests whether the words “mapping and its dependent work are held” occur, not whether the hold begins on suspicion. Its L7 warning test (`:79`) finds the correct policy somewhere in the document, without checking the contrary 9.3 summary. Strengthen these two existing checks around the relevant local statements/scenario; do not build a new general-purpose test framework.

## 3. What the earlier fixes now establish

| Earlier item | Current disposition |
|---|---|
| M1 closure / next filing | **Substantially closed.** 7.1, 9.6, stage 9 and view 6 describe After decision and next-level filings. Two pack-version/closure-authority questions remain honestly labelled for the team. The business-map end presentation still needs D3 below |
| M2 staff gaps / partial readiness | **Substantially closed.** 8.1 reachable before the readiness gateway; staff-only gaps stay with staff; unaffected forms/filings continue. Missing/client/document ownership is explained |
| M3 historical cases | Migration and comparison are explicit; D245 validly resolves unavailable history. **Partly closed because of F1**. Filed forms are correctly treated as evidence rather than automatically correct answer keys |
| M4 phone records | The legacy check now passes. Desktop table has no measured cell overflow. **No new phone optimisation requested** |
| M5 BPMN collisions | Independent geometry rerun: zero under its stated checks. Natural-size diagrams inspected. **Earlier struck-through labels materially improved**. Sparse lanes, tiny secondary labels and layout balance are separate issues, not proof of remaining collisions |
| M6 evidence scope | **Closed in the explanation.** Inventory/matching, writing/Validate, final-file read-back, portal and provider evidence are separated. No performance proof inferred |
| C-M1 signed-file routing | **Closed in the explanation.** Unmatched signed content returns to 9.3; an actually changed fact returns to 8.1. This does not certify signing integration |
| I2 deterministic view assembly | **Closed.** 3.7 is platform rules; unresolved placements return to drafting |
| S4 already-approved affected forms | A confirmed wrong map now withdraws affected approval and holds submission across open cases. **Suspicion interval still F1** |
| S5 document-only adoption | **Closed in 10.3's rules/example/check.** Checklist/questions/form set/readiness recomputed; no form rerender needed if no form changed. Stage 12 could expose this important non-form result more clearly |
| Terminology/tier drift | TC-177 and CN-SA-01B §9 are marked superseded. Three tiers kept. Existing language-pass work is valuable, but F2 proves the last changes still needed rereading |

## 4. Desktop design findings and selected direction

The screenshots support the founder's concern: this is functional, but its desktop visual composition is unfinished. Do not try to solve that with more colours or inflated cards. [Desktop design specification](desktop-design-spec.md) gives the chosen correction method, palette and checks.

| ID | Observed issue | Required direction |
|---|---|---|
| **D1 · Material to the desktop presentation objective** | Setup stages 1/2/3 are roughly **373 / 407 / 703px** tall at 1440; “Good to know” starts about **132px lower** in stage 3 than stage 1. Case entry cards stack beside short stages 4/5 and a tall stage 6, leaving a large empty centre. Matching top edges alone is not aligned content | Keep bands/cards, but rebalance the columns, compact repeated actor explanations without losing roles/authority, and use consistent internal label/action rows where comparable. Give end/handoff content a compact attached strip instead of a full sparse fourth column. Reflow entry choices as a compact shared entry region. Do not make every card 703px tall or force irrelevant sections into them |
| **D2 · Text/role hierarchy** | Terms grid's long representative definition sets an oversized first row and pushes Platform/AI down. Side tags wrap differently across adjacent actor names. Repeated titles/labels and some heavy full-colour text compete. Many body lines above the diagram span almost the entire desktop width | Compact term/definition pairs; separate the long permission explanation into existing role details. Standardise heading/body/caption styles and side-tag position; shorten duplicate wording only, preserve meaning. Break the answer into a few functional statements. Use calmer role accents instead of colouring whole paragraphs |
| **D3 · End markers and handoffs** | The founder's screenshot shows the problem clearly: “Each filing's decision” points at a detached ring headed **“End”**, followed by prose saying After decision continues. On a narrow desktop pane this becomes a large standalone blank region. The setup/change rings also consume space | Make the destination explicit: **“Continue in After decision”**, plus **“Case closes when every filing is closed.”** Show the next-filing route where applicable. Attach the marker to its caption/arrow or label it explicitly as the end of this view, never imply that recording a decision closes the case. Keep the distinctions between process end, handoff, wait and data record |
| **D4 · Symbols/entry choices** | Both New client and Existing client have the same empty green start circle. The common start meaning is valid, but route identity is weak. Some geometric marks look decorative unless read with their labels | Use **A · New client** and **B · Existing client** in the business strip/entry cards, with subtle distinct tints and text labels. Retain BPMN meanings in technical views; no route should be identified by colour alone. Review each marker family systematically, not by adding arbitrary icons |
| **D5 · Connectors and wrapping** | “New pub-lished version” remains split in the change arrow. Horizontal arrow rails often align to the top edge of cards rather than the title/content row. The case return connector is much longer than its nearby cards | Use complete words, deliberate handoff-label widths and one connector anchor baseline per row. Route row-wrap lines at the actual entry/exit points; never send an arrow into an unrelated card merely to make a neat grid. Preserve all branches and use the existing diagram geometry check |
| **D6 · Desktop tables/panels** | Main desktop tables have **no measured overflowing cells**; they are not currently all broken. However the actor-by-view matrix is very tall and sparse; stage-panel three-column stories are cramped inside a roughly 460px panel while the page has spare width. Some activity summaries repeat “In one line” descriptions | Keep useful matrices as references; make the primary reading path easier to scan. Allocate a readable desktop detail pane and enough room for the selected item; use proportional table widths and deliberate line wrapping. Merge duplicated summary sentences. Preserve keyboard/Back/close/focus and example-state behaviour |
| **D7 · Restraint and emphasis** | Thick phase edges, saturated actor text, numbered circles, multiple eye rings and many pill controls compete. Some of the structure works well: bands, local examples, side rules and the stage strip | Keep those useful patterns; use neutral text, muted bands, thin rules, consistent side accents and one clear focus/selected style. No playful illustrations, gradients, confetti palette or new decorative icon system. Use red/amber/green for labelled review states, not decoration |

At 1920px the content remains about 1248px wide. Wider is not automatically better: keep prose at a comfortable reading measure, and use available width selectively for the map and detail pane. At **960px desktop** the current CSS switches to a stacked layout; that is a valid desktop review case, not a reason to dismiss the supplied screenshot as a phone problem.

**Hanging dots:** the supplied examples are identifiable start/end rings, not accidental empty list bullets. A refined probe found **zero genuinely empty visible list items**. An initial broad probe counted hidden closed-details items and was rejected as a false positive. Check marker attachment/meaning under D3/D4 rather than deleting all circles.

**Capture caution:** sticky navigation can appear across a full-section screenshot even though it is simply pinned at the current viewport. Clean captures with navigation made static are saved separately. That capture artefact is not counted as a broken live table/diagram.

## 5. Source grounding, language and AI value

Authority remains original team requirements, code captures and applicable founder decisions; conflicts go to the founder. The maker must not silently rewrite settled behaviour while beautifying. New sources-of-truth are unnecessary: retain existing model/reading/layout homes and the lightweight delivery control.

The updated 28-need interpretation is the earlier [coverage matrix](../integrated-audit-2026-10-18/intent-and-source-coverage.md) plus the dispositions in §3, D244's seventh lens, D245's amendment and the latest desktop/style requests above. The earlier matrix is historical for draft 3; do not present its old unresolved rows as fresh draft-4 defects. Exact source quotations supporting F1/F2 are in §2. The original requirement paths/versions remain in that matrix and the source manifest.

Additional precision improvements: 5.3 still calls a published country pack “one pathway version”; align this with the actual country/row/item-version distinctions without inventing a new model. Explain setup-time view definitions versus case-time filtering. State legal caveats consistently as **“Unconfirmed: no counsel (AIW-D94)”**. Keep “verify once” distinct from re-confirming a changed/time-sensitive fact. Use one actor/action/condition/result vocabulary across summary, diagram and details. Do not force inapplicable headings into reference panels.

AI remains a plausible aid for unfamiliar semantics, prose-to-rule drafting and variable document reading. Rules are the correct default for known matches, settled section placement/view assembly, identity lookup, selecting verified facts, filling, transforms and version adoption. **No new autonomous agents are justified by this review.** Manual authoring can also make reusable maps; compare AI-assisted and manual authoring using the same library, controls, units and quality bar. Actual quality/time/cost benefit and the additional meaning checker's value remain unmeasured. This is not permission to change the selected filling route or remove AI wholesale.

## 6. Seven-lens assessment

These are the validator's expert judgments of this exact artifact for its current purpose, not success probabilities. Latest desktop priority applies; mobile-only limitations are not penalised. Visual/aesthetic subscore **6.5/10**, included within readability/usability, not an eighth lens.

| Lens | Score /10 | Disposition and smallest next action |
|---|---:|---|
| Solution quality | **8** | Partial: strong core and improved flows; correct the D245 hold timing, then retain the chosen architecture |
| Completeness and precision | **7.5** | Partial: substantial high/medium coverage; F1/F2, explicit team/founder questions and scoped later requirements remain |
| Readability | **7** | Partial: useful panels/examples, but desktop imbalance, long terms and competing emphasis remain; apply D1–D7 |
| Usability | **8** | Partial: 226 checks, all panels and no measured desktop table overflow; improve desktop pane/table composition and constrained-width reading |
| Honesty and transparency | **8.5** | Partial: proposed/unbuilt/unmeasured distinctions are strong; test labels overclaim suspicion/advisory checks and hosted revision remains a separate unverified output |
| Implementation feasibility | **7.5** | Not fully verified: concrete mechanisms/gaps named; XFA/portal/final-file and real AI value still need appropriate evidence |
| Functional language and consistency | **7.5** | Partial: better structure, but two actionable contradictions remain; reconcile exact statements rather than another vocabulary-only sweep |

Headlines: solution **8**, communication **7–8**, high/medium requirements **7.5**. No average hides a material defect. No nine claim is supported yet. Missing production measurements do not automatically fail a high/medium blueprint; label each dependency and the consequence if it fails. Founder acceptance can record explicit evidence limits and below-target choices after material contradictions close.

## 7. Next action and boundaries

1. Claude consumes [the implementation prompt](claude-correction-prompt.md), validates F1/F2 and applies the coordinated desktop pass. Preserve the existing page, builder, styles and reading layer first. Retain useful rules, examples and identity/authority distinctions.
2. Save a new exact revision, content-level disposition, appropriate checks and selected screenshot evidence. Record the latest desktop priority and Codex validator assignment in the existing handoff/control; do not change past verdicts.
3. This validator checks the two fixes and affected desktop/text behaviour on that exact revision. A substantially changed region needs its dependencies rechecked; no automatic repeated full re-audit of unchanged material.
4. Founder accepts the corrected high/medium explanation, or identifies remaining problems. Only then follow the existing D229/D232 next-artifact sequence.

No fresh chat is required to finish this pass. A [Codex resume prompt](codex-resume-prompt.md) is available if the conversation is interrupted. Nothing was committed, published or written remotely. The review directory is evidence for the founder-authorised validator assignment; product/shared decision records remain the maker's responsibility, apart from the validator verdict line in PROGRESS.
