# Revised draft 2: consolidated end-to-end audit

17 October 2026 · Independent review advice for the founder and the Lead. This is not the project's formal checker verdict and changes no authoritative decision or product file.

## Verdict

**Keep this design and make targeted corrections. It is a strong high-to-medium-level solution blueprint, with material ambiguities and two reproduced interaction defects still to fix. Do not rebuild from scratch.**

The pasted report describes the earlier 39-activity draft and 60 checks. The current saved artifact has **41 activities, 197 activity rules, eight diagrams (overview plus seven views), 40 separate examples and one justified example reuse**. A separate Claude checker reviewed the earlier version, and the Lead subsequently fixed its findings. This audit evaluates that revised artifact and checks the fixes; it does not repeat the original findings as if no work happened.

The founder's latest instruction explicitly permits more than 2,000 words when necessary and useful. This takes precedence over the older writing guide. There is **no automatic length deduction**. Likewise, requirements are assessed at blueprint level; missing final API schemas or a detailed workbook is not grounds for a score of 5.

## 1. Evidence and scope

- Review target: `ai-workers/problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`, v3, draft 2 revised after the independent audit; SHA-256 **8cb68027178323403fac5ec8adb5105be4593d666f42bc52c86cc8a511f59774**.
- Frozen review inputs and hashes: `input-manifest.json`, captured 17 October at 14:36 UTC. The originals still matched those hashes at the subsequent verification. Source citations below refer to that frozen revision of `tools/s3/s3_data.py`, `s3_views.py` and `build_one_pager.py`.
- Read the complete activity content, all eight rendered diagrams, shared records, control strips, principles, case variations, measures, build gaps, proposed requirement changes, consolidated plan, 110-rule preservation ledger, earlier independent audit and the Lead's dispositions. Read D233–D238 and relevant source requirements/code.
- Code freshness: the four tracked branches matched their captures. The Drive modified-since-snapshot search returned two spreadsheets outside the cited requirement set, with no changed requirement document returned. This is a metadata check, not proof of access to every possible source.
- Re-ran the maker's structural checks and preservation validator without writing to shared artifacts: **no reported errors**. Re-ran its browser suite against the frozen HTML, with output redirected into this audit folder: **84/84 passed**.
- Additional independent browser inspection: Chromium at 1440, 1280, 1000, 768, 375, 320 and 1920 pixels; all 41 inspector cards extracted and inspected; eight diagram screenshots; targeted visibility, tooltip and modal-background tests. No page errors or whole-page horizontal overflow at those widths. This supplements, rather than repeats, the maker's light/dark suite.
- Evidence files: `browser-observations.json`, `followup-observations.json`, `structural-verification.json`, `maker-check-rerun/one-pager-draft-2-browser-checks-2026-10-17.json`, and PNGs in this folder.
- Not performed: actual government form filling, model execution, native Adobe validation, real portal interaction, screen-reader testing, Safari/Firefox/device testing, or trials with new human readers. This audit establishes document and interaction findings, not production correctness.

### Independent-check status

Two helper reviewers were attempted at the founder's request; both failed immediately on an account usage limit. Neither supplied a review. The existing separate Claude audit is real evidence about the earlier revision, not an independent endorsement of this audit. I performed a second adversarial pass on my own findings, including checking counter-evidence and withdrawing unsupported criticisms (§9). **Do not describe that self-check as a second independent reviewer.** The accompanying prompt asks Claude to validate this audit against the saved files.

## 2. Scorecard

Scores are expert judgments for the declared blueprint purpose, not percentages, success probabilities or a weighted competition ranking. Material findings remain visible regardless of score.

| Founder test | Current assessment | Reason | What would justify moving towards 8.5 |
|---|---:|---|---|
| Best solution | **8/10** | Reuse, canonical facts, controlled release, explicit participants and recovery routes form a coherent, restrained design. Document readiness, filing boundaries and validation resolution need clarification. | Close A1–A5 through local rules and examples; show that realistic scenario walks have consistent outcomes. |
| Best communication | **8/10** | Good phase diagrams, a useful actor matrix, concrete cards and examples. Selected activities can disappear behind the inspector, and the phone modal leaks interaction. | Fix A6–A7 and verify visibility/return behaviour. Simplify genuine repetition only where it improves finding information. |
| Best requirements, high-to-medium level | **7.5/10** | Strong activity contracts and acceptance examples; several important expected outcomes are still ambiguous or inconsistent between cards and diagrams. | State and test the missing behavioural contracts in A1–A5. No detailed-pack expansion is necessary to fix these. |

| Six-lens assessment | Score | Evidence-led judgment |
|---|---:|---|
| Solution quality | 8 | Strong design direction; local behavioural corrections remain. |
| Completeness and precision | 7.5 | All activities inspected; missing or conflicting readiness/exception semantics described below. |
| Readability | 8.5 | Meaningful phases and examples, formal but explained terminology, useful hierarchy; no length penalty. Actual new-reader comprehension remains unverified. |
| Usability | 7 | Working core disclosure and navigation, but A6–A7 reproduce failures against the intended experience. |
| Honesty and transparency | 8.5 | Pending evidence and build gaps are prominent. Distinguish desired behaviour from proven capability, and qualify what read-back proves. |
| Implementation feasibility | 7 | Mechanisms and gaps are identified, but XFA, portal, real matching performance and review workload remain unproven. This is an evidence status, not a reason to reject the blueprint. |

An 8.5 target is reasonable for this artifact after correction and re-evaluation. A score must rise because evidence improves. Communication and blueprint requirements can reach 9 without waiting for a full product build; production feasibility/accuracy claims require separate evidence. Neither this report nor a future 9/10 rating guarantees implementation success.

## 3. Preserve these strengths

1. **The main design:** AI drafts configuration and reusable edition mappings; confirmed shared facts feed deterministic filling; people retain approval and submission authority. No manual configurator or firm mapping-authoring workflow was added.
2. **The distinction between definitions and values:** the date-of-birth example demonstrates one canonical definition and separate applicant, partner and child values. Section layout is separated from output mappings.
3. **The process views:** genuine BPMN participants, branches, messages, waits and change handling, with an overview and manageable phase views. Keep the multi-instance form-copy participant.
4. **The disclosure model:** activity cards, Input → Action → Output → Receiving owner, human action, grouped detail, inline examples and clear return controls. It meets the central presentation request much better than anchor links to permanent text.
5. **Review and release:** D236 review of new/changed material, unchanged reuse, specialist confirmation and a different releaser are explicit.
6. **Three check types:** the added field/consistency checks complement meaning checks and write/read-back checks. Preserve their separation.
7. **Correction and change ownership:** staff fix facts; Expat Ready fixes mappings; adoption controls new versions; submitted evidence is preserved. These are valuable rules even where their details need tightening.
8. **Honest evidence status:** measures remain pending; immigration examples require confirmation; source-code gaps and proposed screens are named. Do not disguise the absence of real-form proof with impressive diagram counts.

## 4. Material findings: validate and correct locally

These are high/medium-level behavioural requirements or reproduced interface issues. They are not requests for new services, extra approval layers or production implementation in the one-pager.

### A1 — An answered question is allowed to stand in for required documentary evidence

**Evidence:** activity 7.2, `s3_data.py:810`: **“required uploads are present or their questions are answered instead.”** Activity 7.3 returns unreadable-document questions to the SQR. In view 4, gateway X9 asks **“Every upload read, right person?”** and loops back to the SQR on No. The record model already distinguishes facts from document evidence.

**Why material:** there are two different needs: obtaining a fact and satisfying a required evidence line. Typing a date of birth can replace failed extraction of that fact; it does not itself supply a required passport. Conversely, answering the returned question does not make the original unreadable upload become readable, so the diagram's loop has no explicit success condition for that fallback.

**Smallest correction:** preserve the existing SQR fallback, but separate fact availability from checklist evidence status. State that the applicable source-backed document requirement still needs acceptable evidence, an allowed substitute, or an authorised disposition under existing rules. Hold only the dependent filing/submission while unaffected work continues. Do not invent a universal new blocking policy; use the applicable requirement and existing checklist controls. Change X9 to a readiness condition that recognises authorised fallback without pretending OCR succeeded.

**Acceptance example:** an unreadable passport returns the birth-date question; the declared answer can be reviewed and confirmed. The required passport evidence remains unresolved until replaced or manually reviewed/dispositioned through the existing process. A nonessential unreadable attachment does not send the entire case into endless SQR resubmission.

### A2 — Case, filing and form-copy readiness need one consistent boundary

**Evidence:** the source requirement SA-01B v1.4 §7, SA-1B-74 says **“A family is one case”** and gives each person their own application number, fee and decision. Activity 7.1 preserves this. But activity 9.6, `s3_data.py:1127`, says **“the case closes on the decision.”** View 6 ends at **“Application decided.”** It receives individual **“Copy approved (each)”** messages at a single **“Every copy approved”** catch.

**Why material:** the drawing is a legitimate business abstraction, but a developer/QA reader still needs to know which application's copies are required, how completion is established, and whether one family member's decision closes other pending filings. A note that the event stands for all approvals is useful; it is not the complete readiness contract. Changes can also add/remove conditional copies or invalidate a previously received approval.

**Smallest correction:** keep one family case and the compact diagram. Specify the filing/application to which each required copy, approval, signatory, payment, receipt and outcome belongs. Define “all approved” against that filing's current applicable copy set and the exact current output/fact versions. Ignore superseded approvals. A person's decision updates that filing; the family case remains open while another required filing is unresolved, subject to the existing closure policy. No new orchestration service is required.

Also clarify the existing cutoff/adoption example: a known mandatory new edition may make the old prepared copy unusable even while the case retains its pin; a released mapping still reaches it only through D238 adoption. “Old mapping exists” is not by itself evidence that the edition remains usable after a known cutoff.

**Acceptance examples:** one approved copy cannot satisfy a two-copy filing; a late approval for a superseded output cannot restore readiness; a newly applicable conditional form joins the required set; the principal's decision does not close a partner's pending application. Show these as brief states, not a new large diagram.

### A3 — Validation failures are still routed as if changing a fact is always the remedy

**Evidence:** activity 9.2, `s3_data.py:1029,1036,1045`: **“A validation failure is fixed on the fact (8.1)”** and an example sends a date-format error there. The same card correctly routes a read-back format/transform mismatch to mapping support. In view 5, the gateway after 9.2 asks only **“Mapping problem?”**; No goes to approval, with no explicit wrong-fact return from that point.

**Why material:** a correct birth date must not be changed to satisfy a target date format. A native form can reject a field because of missing/wrong source data, mapping/formatting, a dependent form rule or a validation-environment problem. The remedy depends on the cause. Acknowledging a red hard failure is also different from resolving it; the current general red/acknowledgement wording does not make that distinction explicit enough.

**Smallest correction:** reuse the existing classification and owners: wrong/missing fact → 8.1; wrong mapping/transform → 8.4/support; native-form or validation-environment issue → existing edition issue/manual handling as applicable. Keep the affected copy held until the applicable hard failure is resolved and checked again. Warning acknowledgement and reasoned disposition of a false AI flag must not bypass an unresolved hard check. Add the missing diagram/list return or a clear labelled continuation.

**Acceptance examples:** the canonical date remains unchanged when only its required output format is corrected; an actually wrong date returns to 8.1; a hard validation failure cannot become approvable merely because somebody acknowledged its red status.

### A4 — Approval must explicitly cover the actual final artifact after manual entry and native validation

**Evidence:** 9.1 records read-back, then 9.2 types refused fields, runs native Validate and uploads a validated form. The urgent path 8.5 goes directly through 9.2. Activity 9.3 uses the **“Form check view”** and approves the **“exact copy”**, but the page never explicitly says how that view and its check results are reconciled with the returned/manually edited artifact.

**Why material:** there are two reasonable implementations: approve the actual final PDF/screen state, or approve the earlier reconstructed values with old read-back results beside an uploaded file. Only the first satisfies the intended approval. The existing wording points in the right direction but leaves this high-impact handoff implicit.

**Smallest correction:** state that 9.3 reviews the final returned file or current portal output, including hand-entered and calculated values. Reconcile with the expected confirmed facts where supported, and clearly surface values that need direct human inspection. Bind the existing approval to that output version; a subsequent substantive edit invalidates the affected approval. This is one stronger handoff to the existing approval, not another approval step or a demand for a new universal parser.

**Acceptance example:** a wrong date introduced during manual completion is visible in the final artifact and prevents approval until corrected. Earlier successful 9.1 read-back cannot certify an edit that happened afterwards. Preserve the existing rules for signatures and unchanged submitted snapshots.

### A5 — Clarify which holds require human resolution and which require automatic re-drafting

**Evidence:** 3.1, `s3_data.py:302`, says a near-duplicate **“blocks the draft until a person merges or confirms (5.1).”** But 5.1 starts only after **“Checks pass with no blocking finding”** (`:638`). Activity 4.2 says a disagreement becomes focused human review, while view 3 sends **“Any check failed?”** to 4.4 and back to drafting. Activity 4.4 groups failed checks, corrections and unconfirmed items in that same return.

**Why material:** the intended “AI flags, people decide” workflow is clear in several cards, but the aggregate blocking language also supports an implementation in which people cannot reach the very review that resolves uncertainty. Re-drafting until the checker agrees would contradict the explicit no-consensus-loop rule.

**Smallest correction:** distinguish generation/structural or expected-answer failures from review-required uncertainty, possible duplicates and advisory AI disagreements. A review-required item can reach the existing authorised publisher/specialist but cannot release unresolved. Technical failures return for correction. Specify that an authorised evidence-backed human disposition can resolve an AI disagreement without requiring the models to agree. Do not add another review system or parallel token path merely to fix the labels.

**Acceptance example:** AI proposes two possible canonical matches; the publisher chooses the source-backed meaning in 5.1, then the affected binding is checked and released through the normal path. A correct mapping falsely flagged by the AI checker can be resolved by the reviewer with a recorded reason.

### A6 — The desktop inspector can hide the selected activity

**Reproduced evidence:** at 1440px, open activity 3.8. Its eye control sits at x=1159–1183; the inspector covers x=980–1440. `elementFromPoint` at the eye returns a detail-panel element, not the activity. The node is marked selected, but the reader cannot see it. `browser-observations.json` records this. Docking only starts at 1760px (`build_one_pager.py`, `wide()`), so common desktop widths use an overlay.

**Why material:** preserving scroll alone does not preserve visible context. The founder explicitly asked to keep the selected activity identifiable and avoid closing the card just to find it again.

**Smallest correction:** choose inspector placement/layout so the selected activity remains exposed—for example position the overlay on the opposite side when needed. Keep the original map position on close. Use the existing panel and layout; do not introduce another navigation surface.

**Acceptance:** at 1280 and 1440px, open an activity near each edge, including 3.8 and 9.3. Its label/selection remains visible and another relevant activity can be selected without first closing the inspector. Repeat the return/focus checks.

### A7 — The phone sheet claims to be modal but the background remains interactive

**Reproduced evidence:** at 375px the inspector has `aria-modal="true"`. Main content is neither inert nor hidden from the modal interaction context. A real pointer click on the exposed “Jump to” select moves focus to that background control while the dialog remains open. `followup-observations.json`: `activeTag: SELECT`, `activeInsideDialog: false`. The 14-Tab test passes because it checks only keyboard cycling.

**Why material:** the interface advertises a modal interaction but allows a different interaction model. This can lose place and confuse focus/assistive-technology behaviour. [W3C's modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) describes the background as inactive while the modal is open.

**Smallest correction:** on narrow screens make the background inactive for pointer/focus while the sheet is modal, then restore its previous state and opener on close. Alternatively choose a genuinely nonmodal mobile pattern and implement its semantics consistently. Preserve existing scrolling/focus behaviour; no extra modal is needed.

**Acceptance:** tapping/clicking the exposed background cannot operate navigation while the modal is open; Tab/Shift-Tab stay inside; Close/Escape restores the original accessible page and opener.

## 5. Smaller refinements and audit hygiene

| ID | Evidence / concern | Proportionate correction |
|---|---|---|
| B1 | 3.1 says a spouse's family-name field never matches the applicant's family-name field, while its own example correctly uses one canonical definition. This can sound like role-specific canonical definitions. | Say the definition is reused and the subject/relationship is resolved separately by the mapping. Keep the helpful context example. |
| B2 | 3.7 says “Attach allowed values and character limits to each field”; 3.1 correctly keeps one form's limits on its mapping. | Distinguish canonical semantic checks from destination-specific limits; views may display applicable limits without changing the master definition. |
| B3 | Tooltip is not dismissed by Escape while no card is open; `pointer-events:none`, and moving onto it hides it. No trigger has `aria-describedby` linking to it. Independently reproduced. | Make the optional custom preview dismissible, hoverable/persistent where required and appropriately associated, or simplify/remove the preview. Essential content already works by click. See [WCAG hover/focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html). |
| B4 | Read-back compares with the “selected value”; 9.2 treats a changed date representation as a mapping problem. | Define the expected target representation after the approved transform; permit documented equivalent native representations without weakening semantic checks. Do not compare a raw canonical value with an intentionally formatted string. |
| B5 | 1.3 prevents concurrent runs per row, while the same edition/definitions are shared across many rows. The behaviour when two rows propose the same new item is unstated. | State reuse/uniqueness and supersession behaviour across shared library items, using existing library/version controls. Add one two-row example; do not build a new locking service for the document. |
| B6 | Setup states what happens if AI is unavailable, but the case-time meaning checker has no stated unavailable result. | Define an explicit unchecked/held state or an authorised existing human-review fallback. Do not show green or imply checking completed. Do not silently remove the checker. |
| B7 | Detailed build gaps are helpful, but a few core mechanisms are still only route names: XFA data writing/validation, portal access/branch capture, and final-artifact reconciliation. | Keep them as unproven dependencies with a concrete proof question and fallback/hold consequence. A full prototype is not required at this stage. |
| B8 | The preservation ledger's 1.1 reason still says its trigger includes the unsupported-form alert; D237 and current 1.1 explicitly removed that. Its measures header says two added although three extra rows now exist. | Update the ledger's explanatory metadata. Exact preservation validation of changed prose is still a human check; its automatic pass does not establish meaning. |
| B9 | Only data/views are saved for the earlier checked draft 2; the Lead states the HTML was overwritten. The builder also changed, so those two files alone do not establish exact regeneration of that checked page. Draft 1's HTML/builder/data are preserved. | Preserve complete future review targets and their builder/styles before substantial revisions. Recover a historical full copy only if available; do not claim exact regeneration without checking. This is audit hygiene, not a demand to rebuild the solution. |
| B10 | TC-177 and CN-SA-01B change 9 remain identified as stale outside this deliverable. Legal wording conveys the caveat but does not consistently use the project's required label. | The Lead should correct team-facing text before sending it; keep that separate from accepting the one-pager. Use the agreed legal label where applicable. Unconfirmed: no counsel (AIW-D94). |

## 6. Activity-by-activity coverage

All 41 cards were read, including their examples, rules, acceptance text and returns. “Keep” below means useful at the blueprint level, not production verification. Related findings are deliberately grouped above to avoid duplicate requests.

| Activity | Assessment |
|---|---|
| 1.1 Sources | Keep. Required-source and row boundaries are clearer; reconcile the stale ledger reason. |
| 1.2 Portal capture | Keep as proposed, conditional support. Test-account access/terms and complete branch coverage remain unverified. |
| 1.3 Run | Keep run versioning and unavailable handling; clarify shared-item concurrency (B5). |
| 2.1 Inventory | Keep edition reuse, unread-region handling and explicit XFA gap. Widget completeness is a target, not measured proof of dynamic/source coverage. |
| 2.2 Split sources | Keep verbatim evidence and OCR limitation. Extraction completeness must be checked against source material, not just the extracted list. |
| 3.1 Canonical matching | Keep reuse-first and one-definition example; A5 and B1 clarify review and subject semantics. |
| 3.2 Mappings | Strong subject/relationship/purpose/row explanation and reuse matrix. Keep; specify target representation through B4. |
| 3.3 Documents | Keep applicability/identity checks. A1 preserves the distinction between a fact and required evidence. |
| 3.4 Sections | Keep reuse/proposal and combination matrix. No new manual section setup required. |
| 3.5 Rules | Keep source disposition and human resolution. A5 must allow uncertain rules to reach the specialist. |
| 3.6 Gates | Keep indicative outcomes and unknown handling; specialist values remain pending. Logic-only inputs must still enter the canonical catalogue and collection views. |
| 3.7 Views | Strong collection/visibility distinction. B2 prevents destination limits contaminating definitions. |
| 3.8 Validation | Valuable new owned step. Keep five groups and timing; apply A3 to downstream resolution. |
| 4.1 Structural checks | Correctly distinguishes structure from meaning. Use explicit failure/review classifications (A5). |
| 4.2 AI meaning recheck | Keep independence of reasoning context and flag-only authority. Clarify human disposition, not model consensus (A5). |
| 4.3 Expected answers | Keep independent answers, combined cases and reuse. Real measurements and approved release criteria remain pending. |
| 4.4 Hold | Keep affected dependencies and unchanged reuse; distinguish awaiting review from requiring automatic re-draft (A5). |
| 5.1 Publisher review | Good source-side example and mapping-versus-fact distinction. Make review-required cases reachable (A5). |
| 5.2 Specialist | Keep conflicting-source resolution and reuse of unchanged confirmations. Do not imply specialist sign-off has happened. |
| 5.3 Release | Keep different releaser, no editing and exact reviewed versions. D238 adoption is now explicit. |
| 6.1 Lead/PQR | Keep indicative results, resume and missing-answer behaviour. “Ask once” permits the already-described re-confirmation of changeable facts. |
| 6.2 Duplicate candidates | Keep candidate status and no silent merge. No new identity service proposed. |
| 6.3 Staff identity decision | Keep recorded same/different decision and returning-fact confirmation. |
| 7.1 Case/family/employer | Useful employer example added. A2 clarifies per-filing boundaries without changing one-family-case design. |
| 7.2 SQR/uploads | Correct question reuse, household facts and child answerer. A1 fixes the evidence fallback. |
| 7.3 Document reading | Clear proposed-versus-confirmed distinction and processing terms. A1 fixes the unreadable-upload completion condition. |
| 8.1 Fact confirmation | Keep single staff editing surface and dependent approval invalidation. Readiness should refer to the required confirmed facts for the affected output, not merely absence of conflicts. |
| 8.2 Render | Good three-person example and held-field visibility. A2 clarifies current required copies/editions and version scope. |
| 8.3 Meaning check | Keep targeted important/disputed fields and no editing authority. B6 defines unavailable results. |
| 8.4 Review flags | Strong attention list and important-green review. A3 distinguishes resolved hard checks from warning acknowledgement. |
| 8.5 Manual completion | Preserve narrow urgent fallback through the firm's existing process. A4 binds approval to its actual output. |
| 9.1 Fill/read-back | Keep supported format routes and copy-level hold. B4 qualifies transformed comparison; A4 covers subsequent edits. |
| 9.2 Native validation | Correct ownership of manual typing/native Validate. A3/A4 repair cause-based returns and final-artifact integrity. |
| 9.3 Approval | Good per-copy approval/version binding. A2 defines current required approvals; A4 makes the final reviewed artifact explicit. |
| 9.4 Sign/declare | Earlier signing-error gap is now fixed. Keep correct signatory distinction and re-sign after substantive changes; actual routes remain specialist-confirmed. |
| 9.5 Submit/pay | Keep human authority, time-sensitive check and uncertain-outcome reconciliation. A1/A2 make readiness unambiguous. |
| 9.6 Government responses | Keep manual one-off requests and submitted snapshots. A2 prevents one person's decision closing another's pending filing. |
| 10.1 Watch | Keep guide-only impact and unreachable-source “not verified.” B7 applies to authenticated portal watching. |
| 10.2 Re-run | Reusing views 1–3 is sensible; no separate example is justified. Do not create a row for each edition. |
| 10.3 Adopt | D238 is now clear. A2 tightens current copy-set/approval/version consequences. |
| 10.4 Support triage | Earlier missing receiver is fixed. Keep wrong-mapping impact across cases and the existing support channel. |

## 7. The maker's stated limitations, reassessed

| Limitation | Verdict and practical consequence |
|---|---|
| No real official PDFs read, no field inventory or AI accuracy measured | Correct and prominently disclosed. Does not by itself make blueprint requirements weak. It limits claims of operational feasibility and successful filling. Keep the real-read work in the agreed sequence. |
| IMM 5645 versus IMM 5707 unresolved | Accept as a labelled specialist dependency, not an invented answer. No assumption of universal form applicability. |
| AI checker, collection setting, support behaviour and screen names include proposals | Accept with clear status and authority. Some are now founder-approved design directions while their implementation is still proposed; keep those distinctions. |
| Multi-instance form-copy pool | Accept. It is an appropriate BPMN construct; do not refactor merely because a pool repeats. |
| One “every required copy approved” wait | Accept the visual shorthand, subject to the explicit filing/current-version completion contract in A2. A diagram note cannot replace that behavioural rule. |
| More than 2,000 words | Accept necessary detail. Independently counted main DOM text is approximately 4,006 words at desktop and 5,039 with phone lists visible, excluding closed inspector templates; these counts include repeated diagram/matrix labels and are not a reading-time measurement. No score deduction for the number. Optional reduction should remove repetition, not requirements. |
| Headless Chrome/touch emulation only | Genuine limitation. The 84 passing checks are reproducible; they do not cover all interaction classes, screen readers, other browsers or actual devices. A6/A7/B3 are concrete additions, not generic demands for exhaustive browser testing. |
| Screen readers use list/eye controls | A sensible alternative approach, not itself a defect. Equivalent navigation/content and modal semantics still need real assistive-technology testing before claiming accessibility conformance. |
| White diagrams in dark mode | Accept. Legible content and consistent controls matter more than matching every background. No redesign required. |
| Stale team-facing fourth-tier messages | Correct known debt. Fix before those messages are used; do not demand another product feature or hold the whole one-pager for unrelated paperwork. |
| No production or reader-trial evidence | Keep explicit. The report's expert scores are not observed reader success rates. |

## 8. Earlier independent findings: status after revision

| Earlier finding | Current status |
|---|---|
| M1 unsupported form entry | D237 now states the intended central watch/support route and one-off manual handling. Do not propose the rejected add-form feature again. Readiness details are covered by A2. |
| M2 release versus pin | D238 adoption route is now explicit. Preserve it; A2 clarifies version-bound readiness rather than reopening the decision. |
| M3 no support receiver | Fixed by 10.4 and the view-7 route. |
| M4 validation drafting absent | Fixed by 3.8, controls and checks table. A3 concerns a downstream resolution defect, not absence of drafting. |
| M5 no read-back owner | 9.2 now owns classification with a mapping-return route. A3 concerns native-validation fact errors; A4 concerns later file edits. |
| M6 signing-error return absent | Fixed after 9.4, with a concrete correction/reapproval/resign example. |
| M7 sticky navigation | Fixed at the tested widths; maker's new navigation checks pass. A6/A7 concern different interaction behaviour. |

## 9. Second pass: findings challenged before consolidation

- **Rejected:** punish the word count. The founder permits necessary length, and useful support tables are not verbosity by definition.
- **Rejected:** score blueprint requirements against a complete implementation pack. Appropriate medium-level contracts are the current yardstick.
- **Rejected:** demand a real-form benchmark before giving a high communication score. Communication evidence and model performance evidence are different.
- **Rejected:** call conditional catch events after an event gateway invalid. OMG BPMN 2.0.2 §10.6 explicitly permits conditional event triggers in this configuration.
- **Rejected:** demand a workflow execution engine or a separate service for every logical activity. The diagrams are non-executable documentation.
- **Rejected:** claim diagram labels were clipped. A DOM bounding check found no labels outside the diagram bounds. Dense line routing may deserve readability refinement, but clipping was not established.
- **Qualified:** A2 does not reject the single aggregate approval event itself; it asks for the missing expected-set/version/per-filing contract.
- **Qualified:** A4 is an important ambiguity, not proof that a nonexistent production implementation approves the wrong file. “Exact copy” is good intent; the data handoff must make it operational.
- **Qualified:** A5 identifies contradictory blocking/review language, not a measured runtime deadlock. A clear distinction between flags and blocking technical failures may resolve it with small edits.
- **Confirmed experimentally:** A6 selected-node occlusion; A7 background focus/pointer escape from the phone modal; B3 tooltip Escape/hover/association limitations.
- **Confirmed by text/diagram comparison:** A1 evidence fallback, A3 validation-cause routing, A2 family outcomes. These are not solved merely by every card having ten headings.

## 10. Recommended disposition and next review

1. Ask the Lead to validate A1–A7 and B1–B10 with Agree / Refine / Disagree, exact current evidence, and the smallest correction. A disagreement with evidence is welcome; do not require agreement with every reviewer suggestion.
2. Resolve material ambiguities in the current one-pager and shared generating data. Preserve useful content, decisions and the existing design. Re-run only checks affected by changes plus the established build/browser suite; add scenario/interaction checks corresponding to confirmed findings.
3. Keep acceptance tests meaningful: mandatory evidence is not replaced by answers; approvals are current and filing-specific; correct facts survive formatting failures; final reviewed artifact matches final output; uncertainty reaches authorised review; the selected activity stays visible; a modal background cannot be operated.
4. Present a new scorecard with evidence. Do not prefill 8.5/9 to meet the aspiration. High scores require closing the confirmed defects and recording remaining uncertainty honestly.
5. Use the existing separate checker for its authorised verdict; this review does not replace that session or write its verdict. No slides, detailed pack, product screenshots/prototypes, remote edits or commits are authorised by this audit.

Change log, 17 October 2026: full revised-draft audit, independent browser rerun, targeted probes, activity coverage, limitation assessment and self-challenge pass recorded. Main product artifacts were not edited.
