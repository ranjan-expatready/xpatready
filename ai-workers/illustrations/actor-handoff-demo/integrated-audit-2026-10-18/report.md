# Solution 1: integrated independent audit

18 October 2026 · Frozen page SHA-256 `401457aab0f301fa80bae7f52d84859b6f507d1e329d63e07b1ec6ec6ca471af` · [manifest](manifest.json).

**Verdict: retain and correct; not ready for unconditional acceptance or a 9/10 claim.** The new detail-panel format is a useful improvement. The solution has a sound core—shared facts, reusable edition mappings, deterministic filling and human authority—but source/flow defects remain, two known visual defects persist, and AI's commercial advantage is unmeasured. This is a high/medium-level solution audit, not production certification or the formal checker's verdict.

**Founder clarification during this audit:** preserve the existing approach, format and useful content; improve cohesion and correctness, not a fundamental redesign. The current page and its complete working sources are preserved in [the before-cohesion archive](../../../../archive/ai-workers/solution-1-v3-draft3-before-cohesion-2026-10-18/). All archived file hashes were verified; the active page is unchanged. The next revision must have a clear version and content-level keep/move/clarify/remove record. No percentage of useful content is authorised for deletion.

## 1. What was checked

| Evidence | Independent result |
|---|---|
| Conversation and original intent | Extracted 56 substantive adviser-chat user turns, 47 earlier human/copy maker prompts and 30 relevant adviser responses. Read the meeting digest, applicable decisions, current instructions, earlier audits and maker change records. See [conversation evidence](conversation/README.md) and [need/source coverage](intent-and-source-coverage.md) |
| Current artifact | Frozen HTML plus nine source/check files. Reviewed all 41 activity panels, 12 stage panels, two entry panels and two reference panels, including expanded rules/examples: **57 distinct panels**. Clicked each successfully; extraction approximately 29,757 words. One available control per distinct panel was used, not every duplicate eye instance |
| Browser checks | Independently reproduced **150/150 + 35/35** on the frozen page. Copied tests write only into this audit folder. [Evidence](evidence/checks/) |
| Additional interactions and visuals | Eight viewport/theme combinations at 1440, 1280, 768 and 375px; seven phase diagrams, business overview, supporting technical overview, representative panel screenshots. All 14 stage/entry selections stayed clear of the panel at six desktop widths. Phone records overflow and label collisions confirmed; tooltip persists after scrolling in a headless probe |
| Source freshness | All **51 Drive metadata records** match the snapshot; all **51 local hashes/sizes** match. No newer file found by the modified-file query in the current master folders; the parent still lists the same two FR masters. All **four tracked GitHub captures** match their tracked branches. [Drive](evidence/drive-metadata.json), [local hashes](evidence/source-local-hashes.json), [code](evidence/code-freshness.txt) |
| Source content | Cross-checked relevant SA-01B v1.4 library/configurator/form/filing/PQR rules, Doc-1 v1.3 §5.3–5.8 and amendment A4, AG-07 v2.9 case/authority/closure rules, applicable role/approval amendments and current code mechanisms. Freshness of 51 files is **not** a claim that all 51 were reviewed line by line |

Not executed: live AI/provider calls, official-PDF filling, barcode Validate, government portal automation, migration, production workflow, human comprehension trial, screen reader or real-device use. Do not turn passing documentation/browser checks into a claim that those behaviours work.

The private hosted artifact was not browser-verified in its host wrapper. Its publish copy removes the standalone document wrapper, so standalone-file tests do not certify host behaviour or current sharing/access settings. After authorised republication, verify that the hosted revision and essential interactions match the corrected local artifact.

## 2. Material findings

M1/M2/M4/M5 are confirmed source or visual defects. M3/M6 are material requirement/evidence ambiguities to reconcile, not accusations that the product ran incorrectly.

| ID | Finding and evidence | Smallest complete correction / acceptance check |
|---|---|---|
| **M1 · Source mismatch** | **A decision is treated as case closure; sequential routes disappear.** Overview, stage 9, 9.6 and its two-filings example say the case closes when every filing is decided. AG-07 v2.9 **BR-20** says “A decision moves a case to After decision, not to an end”; **BR-31** closes when every filing is closed. SA-01B v1.4 **SA-1B-67** says the next filing opens when a route level is approved. Current end wording bypasses both. Frozen `s3_data.py:1285–1304, 1448` and stage 9; [source trace](intent-and-source-coverage.md) | Continue into the existing route/after-decision workflow; close only under its existing closure conditions. Make decision/closure authority distinct from merely recording letters (AG-07 BR-10). No new AI component or expanded case-management project is needed. Test: all current filings decided but after-decision work open → case stays open; first level approved in a two-level route → next filing opens with carried facts, not premature closure |
| **M2 · Owner/flow mismatch** | **View 4 can send staff-only gaps to the client and hold the whole case.** Its X9 “Required facts available?” comes **before 8.1**, and No returns to SQR 7.2 (`s3_views.py:148–171`). But 8.1 is where staff enter staff facts, and 7.2 explicitly never asks the client those facts. Stage 6/8.1 also allow unaffected forms to proceed. A missing required staff-only reference can therefore loop at the wrong owner in the drawn flow | Route outstanding items to their actual owner; make staff verification reachable before requiring staff facts to exist. Keep per-fact/per-form readiness rather than a case-wide all-facts barrier. Test a missing staff-only value with all client answers complete, and one incomplete family form beside another ready filing. Do not add client questions to make the diagram pass |
| **M3 · Agreed intent not fully carried forward** | **Past cases became an optional sentence.** D215 explicitly gives old filed cases two jobs: migration during white-glove move-in, with staff confirmation, and mapping proof **before release**. 7.3 merely says past cases “may be read” to seed facts/test mappings; no entry/owner/consent/release condition carries both jobs. D229's bounded real read is not an explicit cancellation of D215 | Find a later amendment if one exists. Otherwise show a compact migration entry through the existing reading → verification path and a clear historical-proof gate/status. Old filed forms are evidence, not automatically correct answer keys. If D215's blanket pre-release condition conflicts with a new/rare form having no historical examples, put that precise conflict to the founder once; do not silently drop or broaden it |
| **M4 · Usability** | **Phone Shared records is still broken.** At 375px, seven header/body cells overflow in both themes; the table is about **2,901px** tall. Names such as “Published pack version” and “Facts per person or organisation” collide with the next column. This reproduces VM-2 on the latest revision, despite both suites passing. [Screenshot](screenshots/375-light-records.png), [probe](evidence/visual-observations.json) | Stack each record on narrow screens: name, description, optional rules, wrapped Read by/Changed by activity links. Retain IDs and local detail links. Verify all six records at 375px in both themes, with no text collision or page-wide horizontal overflow |
| **M5 · Visual readability** | **VM-1 remains.** Question labels intersect flow lines; task multi-instance/call marks compete with text; labels such as Support ticket and Waiting form replaced are struck through by connectors. Confirmed across views 3–7; supporting overview also needs inspection. [View 5](screenshots/1440-light-view-v5.png), [view 7](screenshots/1440-light-view-v7.png) | Adjust existing label offsets, routes and task text/mark clearance. Keep D240/D242's icons, legend and small secondary labels. Verify each affected label at natural size and add targeted visual/geometry regression checks. Do not remove meaningful branches or solve it by zooming out |
| **M6 · Evidence scope** | **“The real read answers it” overstates what the planned read proves.** The 2.1/9.1 build-gap text asks whether code can write XFA data and Validate makes barcodes, then says the real read answers it. D229/NEXT describe inventory and measured matching; the scope clarification explicitly says those do not prove barcode writing, final-file read-back or portal operation | Name separate evidence: inventory; semantic matching; physical writing/Validate; final-file read-back; portal operation. State what the approved bounded exercise actually runs and what remains with the team. Correct 2.1/9.1, stage 1, Evidence and next-step wording together. No need to build a full product POC to write honest requirements |

**C-M1 recheck:** the current 9.3/9.4/stage 8/view 6 distinction is now coherent: unmatched signed content returns to 9.3 without inherited approval; an actual changed fact goes to 8.1. This closes the documentation contradiction, not the unbuilt signing integration.

## 3. Readability and smaller corrections

| ID | Assessment | Focused improvement |
|---|---|---|
| **I1 · Overview geometry** | The setup row is **1,003px** tall while its first two cards are about **390/369px**. Three compact decisions in one narrow card set the row height and leave large dead areas. This is a real hierarchy problem, not an objection to necessary detail or scrolling | Keep the actor journey. Put a short success/handoff summary in each overview card and present the shared review outcomes in a compact row or local detail. Preserve the essential failure/uncertainty distinction. Narrow the end marker column; do not merely add colours or stretch short cards to fill space. [Overview](screenshots/1440-light-overview.png) |
| **I2 · Rules labelled as AI** | 3.7 assembles views from already drafted placements, tiers, conditions and collection settings, yet has the AI lane/authority. That reads as another model dependency for a deterministic projection; D92 says rules-only work is never called AI | Make assembly/validation platform rules unless a specific remaining semantic choice is identified. Keep AI for proposing unresolved meaning/settings. Similarly reuse known section/label assignments before asking AI again. This changes implementation responsibility, not the saved-map decision |
| **I3 · Panel precision** | The new panel format is clearer. Remaining repetition includes Authority/Checked by saying the same thing, 7.1 retelling its actions, and 10.2's coordination/review prose. Stage 11 is explicitly “in order” but shows publisher review before AI re-drafting. 5.1 mixes “Approve/Correct/Flag” with “Accept/edit/reject” | Keep the format; merge genuinely repeated sentences, split stage 11 coordination from later review, and use one review-action vocabulary. Preserve the “decide” route and recheck after a real correction |
| **I4 · Labels/definitions and linked records** | “Two different kinds of check” heads a three-row table. Library says everything references a library item, “never at a form,” although forms are library items. Actor/terms columns have uneven baselines. Legacy TC-177 and CN-SA-01B change 9 still propose a fourth staff tier, replaced by D235 | Rename to “Checks and what each establishes”; say “reference versioned library definitions, not questionnaire section positions.” Align term labels and actor header spacing. Correct/mark the superseded local team-change proposals before handover; do not carry the fourth tier into the detailed pack. The current one-pager correctly uses three tiers. No new terminology catalogue needed |
| **I5 · Status versus risk** | Red/amber/grey each cover several states. The user wanted risk-focused review, not a confidence percentage. Important green fields do get reviewed, which is good | Keep text labels and explicit consequences: state, reason and required action. Colour supplements them. Do not add a numerical risk model or repeated AI votes without evidence. Replace absolute purpose phrases such as “only a correct form” with the observable required checks/reviews |
| **I6 · Visual/accessibility polish** | Phase bands, role colours, readable panel headings, examples and parent Back are worth keeping. Terms strip, actor tags, single-item numbering, narrow-table scroll cues, dark actor colours and chip wrapping remain uneven. Tooltip stays visible after its target scrolls away in the headless probe | Apply one small visual consistency pass; dismiss tooltips on scrolling, including nested scroll containers. Test the essential reader tasks with keyboard. Report real-device/screen-reader/new-reader coverage honestly rather than pretending those tests occurred |

No arbitrary 2,000-word limit is applied. The default overview extraction is about 1,576 words; the whole default document is much larger because it includes seven views, summaries and supporting tables. Size is recorded, not itself a defect. The question is whether each layer earns its place and a reader can follow the flow.

## 4. Where AI earns its place—and where it does not

These are design judgments, **not measured model-performance claims**.

| Work | Simplest justified default | AI value / decision |
|---|---|---|
| Read known PDF fields, types, limits and options | Code parser | No LLM needed for metadata that is already structured; unsupported XFA remains an engineering gap |
| Match an approved label in the same context | Rules/library lookup | No model call needed for a known match |
| Interpret an unfamiliar field/heading, partner relationship or new concept | AI proposal + source + human review | Plausible benefit: semantic drafting across varying labels. Quality/time advantage unmeasured |
| Interpret guide prose and propose conditional rules/document applicability | AI translates into the existing constrained language; SME decides ambiguity | Strongest proposed AI use, because the input is prose. It cannot invent an immigration threshold or publish |
| Choose existing sections/placements | Known defaults/rules first; AI only for unresolved choices | Avoid re-generating settled organisation on every run |
| Assemble PQR/SQR/staff views, select current verified facts, resolve form applicability | Rules over approved definitions and facts | No inference needed once decisions are stored; 3.7 should reflect that |
| Read new scans/uploads | Compare conventional extraction and AI assistance on the supported document set; human verifies | Potential benefit on variable documents; do not assume every upload requires an LLM |
| Recheck mapping/form meaning, 4.2 and 8.3 | Independent expected answers and human review stay; AI checker is a proposed additional control | Measure extra true errors caught, false alarms, reviewer effort, latency/cost and remaining escapes. Fresh context does not guarantee independent errors; never loop until models agree |
| Fill, format, validate known rules, read back, version and adopt | Code and existing human permissions | No AI needed to choose stored values or prove they were copied |
| Sign, approve, pay, submit | Authorised people | Keep human authority. No persistent autonomous “agents” are needed to explain this solution |

**E1 · Strategic evidence gap:** reusable maps, capture-once and deterministic filling are valuable, but they are **not uniquely AI benefits**. A manual author can produce the same reusable map and use the same runtime engine. Compare these fairly:

| Baseline | Cost to count | Fair unit |
|---|---|---|
| Manual authoring + the same reusable library/rules | Authoring, review, correction, expected-answer tests and maintenance | One new form edition; separately, one new combination and one change |
| AI-assisted authoring + the same controls | Source preparation, generation, review, correction, tests, model/prompt maintenance and operating cost | The same units, same quality bar and representative examples |

Do not multiply full map-authoring effort by every combination: **both approaches reuse a form-edition map**. Measure time to an accepted result and errors left after review, not generation speed or field accuracy alone. One mapping mistake can affect many cases. A historical filed form is not automatically a correct expected answer.

**Recommendation:** retain AI-assisted semantic drafting and document extraction as hypotheses worth validating; retain deterministic runtime behaviour; simplify unearned AI steps. Keep the approved saved-map route. The bounded comparison should decide whether AI saves enough work and whether the meaning checker adds enough protection. We cannot honestly say either “AI is unnecessary everywhere” or “AI is proven better.”

## 5. Scorecard: is our rubric right?

**Keep the six lenses.** The conversation settled on five plus implementation feasibility, not eight or nine independent primary categories. Traceability, ambiguity, examples, authority, security, accessibility and maintainability remain explicit subchecks. Aesthetics belongs within readability/usability; AI's actual usefulness belongs within solution quality/feasibility.

| Lens | Current score /10 | Evidence and limit |
|---|---:|---|
| Solution quality | **7.5** | Strong shared-data/mapping core; premature closure, wrong-owner gate and an unearned AI responsibility need correction |
| Completeness and precision | **7** | Substantial useful detail, but M1–M3 show that preserved strings and many cards do not establish coverage of original source intent |
| Readability | **7.5** | Better five-part activity format and examples; overview imbalance, label collisions and a few inconsistent action/sequence labels remain |
| Usability | **7** | All 185 supplied checks pass, all distinct panels open, Back works and stage selection stays visible; the essential phone records table remains broken |
| Honesty and transparency | **8** | Proposals, build gaps and unmeasured results are mostly explicit; real-read proof wording and broad “complete” status need tighter scope |
| Implementation feasibility | **7** | Standard-PDF mechanisms and the identified code gaps are credible; family resolution changes, XFA/portal/final-file proof and actual AI benefit remain unverified |

These are rounded expert judgments, not probabilities or measured reader scores. **No overall average is used to hide material defects.** Headline assessments: solution **7.5**, communication **7.5**, high/medium requirements **7**. The improved panel format alone is roughly **8**, which is compatible with a lower whole-solution verdict.

The maker's 8.5 panel score is a reasonable scoped judgment; it is not a verified 8.5 for the full solution. Earlier reviews were too optimistic about end-to-end coverage when they relied on the current page and preservation evidence without sufficiently revisiting closure/routes and D215. My earlier proposed format's “9” was a suitability estimate, not a delivered-page score. Lower whole-page scores here reflect broader evidence and newly found defects, not proof that the panel redesign made everything worse.

To justify 9, correct material issues, demonstrate consistent source/need coverage and the intended reader tasks on the final revision, and bound the remaining implementation unknowns with the right evidence. A reader can explain back one new/returning family journey, find the correct owner, resolve an exception and derive the same QA outcome. A small actual founder/team walkthrough is enough to start; no new review committee is required. Production performance still needs its own validation. Do not turn a chosen target into a guaranteed result.

## 6. Reusable process: implemented, with honest limits

[Delivery playbook](../../../../playbook/solution-delivery.md), [starter folder](../../../../playbook/solution-template/) and [Solution 1 control](../../../problem-1-pathway-setup-and-form-filling/delivery-control.md) exist and are linked from startup instructions. No product development is required to use them. The template's process link now works unchanged after copying into a future problem folder.

This is a **documented method with an owner**, not automatic synchronisation software. The Lead maintains a compact source/need/artifact/change register; manual updates are acceptable. Shared behaviour has an authoritative home; later artifacts use the accepted spine **and the original sources**, and mark affected outputs Update required when something changes. Acceptance records identify the exact revision and purpose. Reuse the process, not automatically the same diagrams or all the same artifacts. Solution 2 remains parked.

## 7. What happens next

1. Give the maker [the validation/fix prompt](claude-validation-and-fix-prompt.md). It separates confirmed defects, ambiguities and recommendations and asks the maker to challenge this audit with source evidence.
2. Correct validated findings, preserve prior files/content, and check the affected scenarios and visuals. Do not rebuild the deferred slides, pack or prototype yet.
3. The separate checker reviews the **new exact revision**, checks both the maker's claims and this audit, and rechecks material fixes. The founder then accepts or identifies remaining issues. No acceptance is implied by this report.
4. Continue the agreed real-read → walkthrough → detailed pack/workbook with required sketches/prototype sequence. Define the bounded evidence correctly; do not mistake it for a full production POC.

**Founder action now:** one copy/paste prompt for the maker if that session has not already consumed this report. No further setup prompt or new platform is needed. A question is required only if the D215 reconciliation exposes a genuine unresolved decision. Scores remain below the requested nine; do not claim the target has been achieved.
