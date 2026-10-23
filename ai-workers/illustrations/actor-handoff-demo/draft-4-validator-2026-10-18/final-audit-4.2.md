# Solution 1: final audit of draft 4.2

18 October 2026 · Independent validator (Codex, founder-assigned). Claude Code remains maker. Purpose: **high/medium-level solution alignment**, not production readiness or founder acceptance.

**Verdict: PASS WITH FIXES.** The approach is sufficiently settled to stop broad design and presentation rounds. One new acceptance example still contradicts the agreed fact-correction rule; fix that narrowly before treating the spine as accepted. One diagram-continuation refinement remains minor. No architecture restart, new component, new agent or general replanning is warranted.

**Exact HTML reviewed:** `8afb68a30dd79c7130443cb5666fccec68bc039744c50bbcc00f99d8d24f02d0`, v3 draft 4.2. [Frozen inputs and hashes](manifest-4.2.json). The audit adds only its own frozen copies, evidence and report; product sources, NEXT, PROGRESS, delivery control and decisions are unchanged. No publication, commits or remote writes.

## Position and recommendation

The solution explanation exists and has been independently checked. The AI/form-filling product described by it has **not** been demonstrated end to end. There is no supported “nine across seven dimensions” result: the maker’s actual seven scores are 8.5 / 8 / 8 / 8.5 / 8.5 / 7.5 / 8. My independent judgments below are the same after reviewing this revision, with different evidence and a remaining finding. These are expert judgments, not measured percentages or implementation completion.

**Recommendation:** close the single fact-correction contradiction, accept any remaining presentation limitations through the existing founder decision, and move into the bounded official-form inventory/matching work already ordered by D229/D232. Further broad polishing is unlikely to be the best next use of time. That recommendation does not itself accept the artifact or reorder the agreed walkthrough/detailed-pack/sketch/prototype sequence. The official-PDF input folder is still empty and no `tools/s3/real-read/` result exists; that dependency needs resolving when that step starts.

## What independently passed

| Evidence class | Result and practical meaning |
|---|---|
| Revision/build | Current HTML matches the maker’s exact hash. Rebuilding from frozen authoring inputs into the validator’s folder reproduces it byte for byte; structural checks report no errors. All 18 frozen source/check/response/ledger files matched the live local files at the integrity check. |
| Preservation | All 16 draft-4.1 archive manifest entries verify. Recomputed ledger: **131 changed strings = 89 clarified + 25 corrected + 17 display; 193 additions; zero undispositioned strings**. Panel preservation independently reproduces **2,123 verbatim / 125 merged or clarified**, no reported removal. Draft-1 rule ledger passes. Stable activity/stage identities survive. |
| Browser automation | **150/150 interaction/layout + 35/35 panel + 41/41 cohesion + 86/86 desktop-pass assertions = 312/312.** Tests ran against the frozen HTML; only input/output paths were redirected. Changed assertions were compared with 4.1: title changes, compact 4A decision count and the added hold note explain them; core focus/Back/selection checks remain. |
| Diagram automation | Eight diagrams import; measured geometry reports **zero collisions**. Independently parsed view-4 XML confirms X9 is inclusive, has no default, and has two conditioned outgoing branches. This does not execute BPMN business processes. |
| Panel coverage | **57/57 panels opened and extracted, zero extraction failures.** Review combines the prior full panel/language review with the current source differences, changed semantic bodies, examples and affected dependencies. It is not a claim that every unchanged sentence was freshly reread in isolation. |
| Source freshness | All **51 live Drive IDs/names/times/sizes match**, and all 51 local hashes/sizes verify. Five master-folder listings show no replacement master/new current requirement. Modified-after-snapshot search found three outside-master operational documents, not replacements for these sources. Four tracked code heads match their captures. |

Preservation was reconciled at content level: base-source attachment still leaves conditional forms to drafted rules; title changes retain actors and authority; 4A/4B retain qualification, duplicate resolution and refusal before case creation; representative fee/permission detail remains in role/stage details; shared facts, changed-version adoption, historical comparison and submitted history survive. The ledger’s “zero removed” is coverage evidence, not proof of correct meaning: the new wrong-fact example below is exactly why a semantic review remains necessary.

Evidence: [build/ledger](evidence-4.2/rebuild-ledger.json), [panel preservation](evidence-4.2/preservation-independent.json), [archive integrity](evidence-4.2/archive-integrity.json), [browser logs](evidence-4.2/check_one_pager.cjs.log), [desktop checks](evidence-4.2/check_desktop_pass.cjs.log), [geometry](evidence-4.2/check_diagram_geometry.cjs.log), [panels](evidence-4.2/panels/all-panels.md), [Drive freshness](evidence-4.2/drive-freshness.json), [tracked code](evidence-4.2/code-freshness.txt).

## Correction response reconciled with actual behaviour statements

| Item | Independent disposition |
|---|---|
| **C-M1: suspicion-time hold** | **Core correction verified; exception still needs R-M1 below.** 4.3, 10.4, stage 10, view 7 and approval/submission guards now apply the scoped hold at suspicion, not confirmation. Ordinary questions hold nothing; disproved suspicion releases the mapping hold with evidence; confirmation follows correction/publication/adoption. D245 §5 says “holds the affected mapping and dependent work pending investigation”. Keeping an existing approval while submission is held is visibly **Proposed here**, not a new founder decision. That proposal can be elaborated later, provided fact/content changes still invalidate approval. |
| **C-M2: ready work alongside missing answers** | **Closed on the explanatory model.** X9 has no `default`; “Facts ready for a form” leads to L4b and “Client answer or document missing” to 7.2; both have conditions. The 8.1 example explicitly continues Client A’s ready form while asking the partner’s previous address. Neither branch suppresses the other merely by being selected. No workflow engine was executed. |
| **C-M3: fact-state boundary** | **Closed for the stated preparation/filling contract.** 8.1/8.2/8.4/9.1, stage 6 and views 4/6 agree: missing/conflicting → preview only, stop at 8.4 before filling; Held with a verified value → preparation/filling may continue, approval/submission wait; no verified value → missing; undisputed verified → normal checks. The later 10.4 wrong-fact exception is the separate remaining contradiction. |
| Earlier dependent fixes | After decision and approved-route continuation remain; next filing uses the case’s pinned pack version; guide-only adoption recomputes checklist/readiness; confirmed wrong mappings invalidate affected unsubmitted approvals across cases; unavailable AI checks stay grey with recorded human review; unmatched signed content returns for approval, changed answers for fact verification. No regression found in these inspected statements. |

[Independent XML and contradiction probes](evidence-4.2/independent-semantic-probes.json) preserve the actual generated passages. This is documentation/model verification, not product execution.

## Remaining findings and smallest corrections

**R-M1 — Material: a disproved mapping fault must not clear a known wrong fact.** [s3_data.py:1433](../../../tools/s3/s3_data.py#L1433), activity 10.4, new alternate acceptance case, says: **“the verified fact was wrong”**, followed by **“keeps its approval and can be submitted.”** The rendered 10.4 panel reproduces both statements. The proposal at line 1443 also says approvals stand whenever the mapping stands, without this qualification.

Counterexample: the map correctly selects the partner’s date of birth, but that stored date was wrongly verified. Proving the mapping correct clears the mapping concern; it does not make the already-approved wrong date safe to submit. The same panel’s return/example sends the fact to 8.1. Activity 8.1 says **“Changing the partner’s date of birth re-renders every form that reads it and withdraws their approvals.”** Activity 9.3 says **“a later fact change or any change to the approved content withdraws it.”** D181, as amended on screen organisation by D221/D235, retains **“the correction re-renders every form and draft that used it and voids approvals on old previews.”** This is an actual contradiction in an acceptance example, not a claim of an observed production bug.

**Smallest correction:** distinguish two outcomes within 10.4’s acceptance/rule/example:

- Disproved mapping concern **with unchanged, correct facts/content**: release the mapping hold with evidence; an earlier approval may remain under the labelled proposal and all normal submission checks.
- Disproved mapping concern **but a wrong fact found**: release only the mapping hold; affected submission stays held while the agent corrects/verifies the fact in 8.1, dependent unsubmitted forms are prepared/filled and checked again, old approvals are withdrawn, and approval/signing requirements apply to the corrected content. Unrelated forms remain usable.

This reuses existing rules and needs no new founder policy. Update only the affected 10.4 wording, its preservation disposition and the targeted semantic check; rebuild and verify the changed panel plus 8.1/9.3/9.5. Do not restart a full design audit for this repair. A green text-presence suite did not catch this counterexample.

**R-m2 — Minor: continuation arrows still lack their actual source.** In [960px setup](evidence-4.2/visuals/960-light-setup.png), “Draft with sources” points down at stage 3 from the left, beneath stage 1, although the source is stage 2 at the right. The [960px case map](evidence-4.2/visuals/960-light-case.png) has the same issue for 4→5, 6→7 and 8→9. At 1280/1440/1920, the 6→7 wrap starts below stage 5’s column rather than stage 6: `build_one_pager.py:1412` uses source column index 2; stage 6 is in column 3. The explicit “stage 6 → stage 7” caption helps, and the technical BPMN remains correct, so this is a bounded visual finding.

**Smallest correction:** use the actual source column for the wide wrap; at 960px either anchor the continuation to the right-hand source or label the cue explicitly with source and destination stage numbers. Preserve 4A/4B→4 and all other routes. D5 is therefore **partially**, not fully, complete; zero label collisions did not verify endpoint meaning.

## Desktop observations against the saved brief

Inspected current captures at 960/1280/1440/1920, light and dark, including representative stage panels and all eight technical diagrams. The separate automated checks cover the width/theme combinations. Captures temporarily make navigation non-sticky for clean section images; navigation/focus behaviour was tested separately on the normal page.

| Brief area | Observation |
|---|---|
| D1 composition | Setup/change proportions are more deliberate; case entry is compact; completion strips are attached. At 960 two cards per row are usable. Blank space below stages 4/5 and the long stage-6 title remain, but do not justify another layout round. |
| D2 hierarchy/language | Compact term pairs and action/object titles improve scanning. 4A/4B explain case initiation and retain the refusal/identity boundary. Long titles still wrap; text remains readable. |
| D3/D4 endings/symbols | “Continues in After decision” is an attached handoff, with eventual closure separate. Start rings retain meaning; per-filing tooltip now survives the apostrophe and displays its full explanation. Decision tooltips distinguish exclusive and combinable outcomes. |
| D5 arrows | Labels no longer split words; eight BPMN views have no detected label collisions. The continuation-source defect above remains in the plain-language map. |
| D6 tables/panels | No overflowing visible table cells found in the eight desktop probes. Stage story rows are easier to read; selected stages 6/8 remain beside 460px panes, and the 540px pane docks at 1920. Back, Escape, example state, focus return, selection and scroll checks pass. The sparse actor matrix remains reference material. |
| D7 actor colours/key | Restrained navy Super Admin, teal firm, plum client; slate system and grey government. Names and lane brackets retain roles; the proposed SME role/permission is still disclosed in details. No permission change or six-colour role scheme. Sampled actor/tag/label/decision contrasts pass 4.5:1 in both themes; this is not full accessibility certification. |

[Visual captures](evidence-4.2/visuals/) and [measured panel/table results](evidence-4.2/visual-metrics.json). Residual uneven card heights and whitespace are acceptable refinements, not additional required fixes. Mobile-only issues were not used to lower the desktop assessment. Actual reader and screen-reader trials remain unexecuted.

## Seven independent judgments

| Dimension | Score | Evidence and remaining limit |
|---|---:|---|
| Solution quality | **8.5** | Reusable mappings, deterministic fact selection/filling and human authority remain a coherent lean approach. C-M2/C-M3 repaired. R-M1 needs a narrow correction; AI value is unmeasured. |
| Completeness and precision | **8** | Coverage, ownership, versions, per-form readiness and recovery are substantially present. R-M1 contradicts an acceptance condition. Ten combinations, input-as-data boundary S11 and the named open decisions belong in detailed work. |
| Readability | **8** | Calmer map, compact terms, functional headings, attached handoffs and explanatory examples. Continuation cues and uneven case-row space remain. No unaided reader trial; no arbitrary length penalty. |
| Usability | **8.5** | 57 accessible panels, intact navigation/keyboard/Back/example behaviour, usable 960 side pane and wide docking. Automated browser observations are not real-user/device or screen-reader results. |
| Honesty and transparency | **8.5** | Proposals, build gaps, unmeasured targets and bounded proof scope remain visible. Investigation approval retention is explicitly proposed. No nine or production-readiness claim justified. |
| Implementation feasibility | **7.5** | Existing standard-PDF foundations are real; person/purpose/repeat mapping, status-aware selection, XFA, final-file and portal gaps remain concrete. Those operations and AI performance have not run here. |
| Functional language and consistency | **8** | Action/object titles and fact-state contract improved. R-M1 still permits two materially different readings of submission eligibility; fix it before unconditional alignment. |

These scores do not need to become seven nines before moving forward. A pending runtime measurement is not itself a failed blueprint; a contradictory acceptance condition still needs correction.

## Dependencies and evidence boundary

Current source grounding was rechecked, rather than assuming the previous audit remained current:

- **SA-01B v1.4 §3.5:** SA-1B-28 says “Every value placed on a form is traceable to an answer”; SA-1B-29 says “a form is not ready while a required box is unmapped or needs review”; SA-1B-35 says “AI never sets a value on a form at fill time.” The revised Held contract preserves the approval/submission stop and never invents a missing value.
- **SA-01B v1.4 §3.6 SA-1B-38:** “publishing runs no test set.” D236’s AI-content test requirement remains a disclosed proposed team change, not falsely described as existing behaviour.
- **AG-07 v2.9 AG-7-56 / BR-21:** “a case in progress SHALL keep its version”; BR-31 says the case “closes when every filing is closed.” SA-01B §6 SA-1B-67 says “the next filing opens carrying the answers forward.” The current diagrams/panels retain these distinctions. Staff closure while a filing remains open is still an explicit team question.
- **Backend capture `b48e4ce`:** `spine-masters.ts:169` has only `canonicalFieldKey`, `formFieldId`, optional `transform`; `filler.service.ts:94` indexes one `valueByKey`; `answer-store.service.ts:432` says current-row selection consumes “ONLY `supersededById` + `effectiveAt`” and does not read status. Family/relationship mappings and fact-readiness enforcement therefore remain build work.
- **Same capture:** `pdf-acroform-inventory.ts:141` rejects XFA: “this parser cannot read”; `pdf-form.adapter.ts:270` pins PDF metadata, and `pack-filler-bridge.service.ts:116` documents controlled map-bound restricted-value reveal. Existing standard-PDF/deterministic and data-access foundations should be reused; none proves XFA/barcode/portal/signature behaviour.

No AI/provider comparison, official-form inventory/matching, XFA write, Adobe Validate, final-file read-back, signature integration, portal capture/fill or production workflow was executed in this audit. The runtime challenger, meaning-checker value, AI accuracy/cost/review effort and real-reader comprehension remain unmeasured. Portal terms and historical-file consent: **Unconfirmed: no counsel (AIW-D94)**. Immigration values and supported combinations remain the specialist’s responsibility.

The next action is a bounded maker correction of R-M1 and targeted verification; R-m2 may be fixed alongside it or accepted as a minor limitation by the founder. Then use the existing acceptance and D229/D232 sequence. No further general score-improvement round is recommended. Founder acceptance remains unrecorded by this audit.
