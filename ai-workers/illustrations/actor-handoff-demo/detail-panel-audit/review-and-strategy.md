# Detail-panel audit and recommended format

17 October 2026. Independent advisory review for a subsequent maker pass. This does not change the active one-pager or shared records and is not the separate checker's formal verdict.

## Verdict

**Keep most of the information. Change how it is grouped, selected and explained.** The current content is valuable requirements material, but its display mixes a stage summary, an activity contract and a technical checklist. That makes some panels repetitive and others unexpectedly thin.

Recommend **lightweight use-case descriptions adapted to the level of the selected item, with essential information visible and supporting detail on demand**. This is an adaptation of established methods, not a new formal standard or a claim that every internal activity is a complete user-goal use case. Keep the existing side panel on desktop and the existing modal sheet on phones. Add a simple in-panel route back to a parent summary; do not introduce a documentation platform, tab maze or full-screen modal for every selection.

## Scope and evidence

The Lead was actively implementing the earlier annotated-flow prompt. To avoid reading a moving target, this review froze the page at 18:01 UTC: HTML SHA-256 `b868aa2b61322eaadacc13687e9e3681ef0898ee2ca5e17ca6cce086c147575c`. Source copies and hashes are in `manifest.json`; all four captured files were unchanged immediately after copying. This revision already contains changes beyond the founder's screenshot. It is an observed saved revision, not a claim that the Lead had completed its work.

- Opened **57 distinct panels by clicking their controls**: 41 activity panels, 12 stage panels, two entry panels, the symbols panel and the actor guide. No opening failed.
- Expanded each panel's applicable details and example and read all unique content. Full extraction: `all-panels.md`, 26,207 words including repeated content. Exact-line deduplication for reading is in `unique-content.md`; it does not remove material from the audited page.
- Every activity uses the same ten visible contract groups, in addition to four input/action/output/receiver cells, a human-action block, an example control and additional expandable actions/rules/exceptions/source material.
- With examples consistently closed at entry, activity panels expose **173–361 words, median 227**. Expanded activity content ranges **275–1,667 words, median 493**. These counts include labels; they are not reading-time measurements or word limits.
- Activity 7.1 expands to 1,667 words because it includes family, reuse and corporate examples plus the activity contract. Stage 5 starts with 577 words visible because its 15-rule list is expanded, and reaches 1,281 words with its examples. Depth may be justified; the hierarchy needs work.
- Read and visually inspected representative captures, including the screenshot's new-client entry, mapping, case creation and composite change-release panel. Captures deliberately show expanded material; they are not all default-state screenshots.
- Reproduced overview → activity navigation: “New client” → 6.1 replaces the panel and provides no explicit in-panel Back control. Closing returns focus to the parent overview control; that part works. Evidence: `navigation-observations.json`.

This review addresses information design, role clarity and requirement expression. It is not a fresh verification of live Drive/code or legal authority. Role findings compare statements within this artifact. The formal product permissions remain authoritative and must be verified before any changes to them. No new-reader trial, screen-reader trial or production workflow execution was performed.

## Current scores

Expert judgments of **the detail-panel experience**, not a rescore of the entire solution and not measured success percentages.

| Criterion | Current score | Reason |
|---|---:|---|
| Requirements coverage | 8.5 | Inputs, outputs, conditions, exceptions, rules, sources and examples are unusually well represented. Presence does not prove consistency. |
| Precision and role clarity | 7.5 | Most activities have a sensible owner; composite work and payment/receiver language sometimes blur performer, reviewer, recipient and data state. |
| Human readability | 6.5 | Repeated descriptions and ten equally prominent fields obscure the short explanation a reader first needs. |
| Navigation and contextual usability | 7 | In-place disclosure and focus return help; there is no in-panel return to a parent stage, and wide examples are cramped. |
| Suitability to the selected item | 6 | Activity panels share one forced display; stage panels vary between mostly repeated summaries and extensive shared-rule dumps. |
| Overall fit for the founder's purpose | **7** | Valuable content, with a presentation and semantic hierarchy problem rather than a need to discard the requirements. |

## Findings

**D1. Repetition has been mistaken for completeness.** Activity 3.2 repeats its receiver under “Receiving owner” and “Next owner”; its output and “Record handed over” substantially overlap. The action cell, human-action block and expanded Actions often retell the same operation. Trigger, prerequisite and ready-state distinctions are useful, but should not receive equal space when one sentence or shared condition already explains them. Deduplicate the display while retaining the underlying facts and traceability.

**D2. The first view lacks an obvious human reading order.** “Records read · updated” appears before authority, readiness and the outcome. A business reader should first learn purpose, who acts, what happens and what moves next. Technical record names are supporting detail. The mapping panel's “Screen: No screen (background) no screen” is redundant; “Runs automatically” is enough, with the results location where helpful. The stock “No human action at this step. People see its results later” should not obscure which later role reviews the output.

**D3. A stage and an activity need different depth.** The founder's new-client panel is mostly a repeated paragraph and links; its useful story is the client → platform → agent sequence. Conversely, stage 5 opens a long list of shared rules before readers can choose the particular case they want explained. Give overview panels a brief ordered role/action/result story and a clear outcome. Retain detailed activity contracts behind named links. Reference panels such as symbols and actors already use different structures; preserve that sensible difference.

**D4. A single owner label can misrepresent composite work.** Activity 10.2 is headed Content publisher, but its completion requires AI/platform work, specialist confirmation and a separate releaser. It should say who coordinates and show the distinct decision owners, referencing the existing setup/release path. Do not create new approvals or suggest the publisher can release its own draft. Stage 8 says the representative “submits and pays”; 9.5 instead identifies an authorised submitter and fee payer, and the actor guide says the representative “arranges payment.” Align those descriptions with existing permission/assignment rules; do not infer that the representative must personally pay. “The case” is a state container, not a human owner: distinguish “continues at” from “responsible next.”

**D5. Examples are valuable but not always well packaged.** Five-column, paragraph-filled tables inside a 460px panel make comparisons difficult. Keep essential comparison columns and reveal a row's explanation locally, or use short labelled field examples. Preserve the ability to compare relevant rows; do not replace a useful matrix with numerous disconnected clicks. The generic Example button on 10.2 opens only “No separate example.” Omit that misleading button or link directly to a relevant existing setup example. Do not invent a new example for every glossary entry or trivial operation.

**D6. Drill-down loses the parent context.** A stage-to-activity link replaces the stage. There is no explicit Back to “New client” control in the activity panel. Retain the parent title and offer a one-step return that restores its panel scroll and meaningful disclosure state while keeping the map fixed. The diagram's selected element should remain identifiable; do not solve this with nested dialogs or compulsory page navigation.

**D7. Critical conditions must survive simplification.** Do not hide a hard approval/submission gate among secondary rules merely to make the panel short. Visible outcome/readiness must mention any decisive unresolved state; full conditions remain available below. As one current example to validate after the Lead finishes, stage 3 asks “Anything blocking or undecided?” and sends Yes back to drafting, while its rule says uncertain items and AI disagreements go to a reviewer marked “decide.” Undecided human review is not automatically a reason to redraft. The simplified story must distinguish those routes. This is an internal behavioural inconsistency, not a request for another AI loop.

**D8. Truth labels and sources need hierarchy, not deletion.** Keep clear distinctions between required, proposed, built and unverified behaviour. Show consequential proposal/gap status near the relevant summary; put exact source/version references and decision history in the supporting evidence section. Avoid repeating a provenance badge before every sentence in the default reading path when a clear scoped label can convey the same truth. Never turn mixed-status content into an apparently approved statement through grouping.

## Established methods and alternatives

These methods have established published guidance; that does not prove one exact panel layout is universally best.

- [IBM's use-case specification outline](https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/doors-next/7.2.0?topic=cases-use-case-specification-outline) organises purpose, flows, prerequisites and outcomes. Search returned the official outline; direct opening failed. The accessible [IBM use-case writing paper](https://public.dhe.ibm.com/software/rational/web/whitepapers/RAW14023-USEN-00.pdf), pp. 3–10, supports outcome-focused descriptions, a clear success flow, separately explained alternatives and references that reconstruct the journey. We adapt those ideas without treating every low-level job as a whole use case.
- The [EARS author's guide](https://alistairmavin.com/ears/) distinguishes always-applicable, event, state, optional-feature and unwanted-behaviour requirements. This supports writing the actual condition where one exists instead of manufacturing a trigger for an invariant. Use its discipline for individual rules, not as the entire panel format.
- [Cucumber's Gherkin reference](https://cucumber.io/docs/gherkin/reference/) provides context/event/observable-outcome examples. Use a few such examples where they clarify acceptance. Writing those sentences alone does not make a test executable.
- [NN/g's progressive disclosure guidance](https://www.nngroup.com/articles/progressive-disclosure/) supports keeping primary information accessible and revealing secondary detail when needed. [GOV.UK's details](https://design-system.service.gov.uk/components/details/) and [accordion](https://design-system.service.gov.uk/components/accordion/) guidance cautions against hiding essential information or nesting disclosure structures. Apply selectively; a wall of accordions is not the objective.

| Alternative | Strength | Limitation for this page | Fit /10 |
|---|---|---|---:|
| Current fixed activity contract | Good coverage and predictable fields | Repeats content and flattens priorities | 7 |
| Full formal use-case specification everywhere | Detailed scenarios and conditions | Too heavy for internal steps and reference panels | 6.5 |
| Input/action/output summary only | Easy to scan | Insufficient authority, exception and readiness precision by itself | 6 |
| Given/When/Then or rule statements only | Useful testable outcomes | Does not explain the whole multi-actor journey | 6.5 |
| **Adapted lightweight use-case description + conditional activity detail + selective disclosure** | Clear story, complete supporting contract, flexible depth | Requires editorial judgement and meaningful preservation checks | **9 expected fit** |

Fit scores are reasoned suitability estimates. Nine is not a measured score for an unbuilt redesigned panel. Formal use cases, rule syntax and acceptance examples are complementary techniques; the recommendation is one content structure, not several new artifacts or tools.

## Recommended content structure

Use the existing structured data and panel, with three content levels already implicit in the page:

| Selected item | First view | Supporting detail when relevant |
|---|---|---|
| Stage or entry route | Purpose; ordered actor/action/result story; outcome and next step; essential decision | Linked activities; substantive rules/alternatives; one useful example |
| Human or automated activity | Purpose; performer; real start condition/required input; short behaviour; result, next recipient and decisive gate | Rules and exceptions; example; acceptance checks; source/record/permission/version details |
| Reference item | Explain the role, symbol, record or reusable rule in its natural form | Relevant authority, source or example; no invented trigger, receiver or acceptance test |

For an activity, the compact reading order is:
1. **What this achieves** — one sentence.
2. **Who acts** — performer, with review/approval owner only if distinct and relevant.
3. **How it works** — ordered steps, with a role shown where it changes.
4. **Result and what happens next** — output, recipient, readiness and any critical hold.

Merge start event, prerequisites and inputs into a short “Before it starts” explanation where that avoids repetition. Keep them distinct when the distinction changes behaviour. Reference inherited conditions rather than reciting the entire phase contract. Do not require an input or trigger where the selected item is an explanatory reference.

Below the essential story, reveal only applicable sections: **Rules and exceptions**, **Example**, **Acceptance checks**, **Sources and implementation detail**. A short panel need not have all four. Avoid nested accordions. An important block stays visible; incidental mechanics can be disclosed. No arbitrary word limit, no empty “N/A” rows and no forced quota of scenarios.

Preserve semantically different concepts even when merging display fields: a start event is not a precondition; an output is not necessarily the handed-over record; completion is not always the receiving condition; performer is not approver. A merged sentence or table must retain those differences where they matter.

## Worked illustration 1: the screenshot's New client panel

**New client — establish the client record and decide whether to open a case**

Starts when the prospect uses the firm's lead form. The firm's released questions and indicative checks must be available.

| Who | What happens | Result |
|---|---|---|
| Client | Answers the lead form and PQR | Declared information and an indicative result |
| Platform | Finds possible existing records | Candidates, with no automatic merge |
| Agent | Decides identity and whether the firm takes the case | Resolved client record, or closed lead |

**Next:** accepted client → Open the case. If the person already exists, use that record and ask only the new service's remaining questions.

**Important:** a possible duplicate needs the agent's decision. This process does not merge people from their name or email alone.

Supporting controls: Rules and exceptions · Related activities · Example where useful · Sources. This is an illustrative rewrite from existing content, not a new rule or new UI screen.

## Worked illustration 2: automated mapping

**Generate form field mappings — connect each destination field to the appropriate source fact**

**Performed by:** AI-assisted drafting in the platform. **Reviewed by:** the content publisher later, before release.

**Before it starts:** matched fields and their form headings/pages are available.

1. Identify whose fact the form field asks for and the relevant purpose or time.
2. Write the canonical fact reference, destination, format, conditions and repeat position.
3. Save the mapping as a draft with its source evidence.

**Result:** a reusable mapping set for this edition, available to the remaining draft setup and then review. During initial validation all new/changed mappings require review.

**If unclear:** mark the person/meaning for review with its source snippet. Do not guess or claim the mapping is approved.

Example, on demand:

| Form context | Fact source | Meaning |
|---|---|---|
| Applicant / Date of birth | Copy owner's date of birth | Client A's fact on Client A's copy |
| Partner / Date of birth | Copy owner's partner's date of birth | Partner's fact on Client A's copy |

Keep destination identifiers, source traces, exact fields, option maps and technical checks available below. These are illustrative labels; no government internal field identifier is invented.

## Worked illustration 3: composite change release

**Review and release a change — reuse the setup path for changed items**

| Who | Responsibility |
|---|---|
| Content publisher | Coordinates the changed-item run and reviews the proposed changes |
| AI and platform | Redraft and check affected configuration using the existing setup path |
| Immigration specialist | Confirms changed rules and values |
| Different authorised releaser | Releases the reviewed version |

**Next:** the agent sees what changes for the open case and adopts through the existing adoption step. A publisher coordinating this work does not acquire release authority over their own draft.

Link to the existing setup/release explanation and a relevant existing example. Do not expand the whole setup process again or offer an Example button that contains no example.

## Acceptance of this improvement

Review every panel using the item-level notes in `panel-by-panel-review.md`. Keep meaningful requirements, source distinctions, wrong-person safeguards, review/approval boundaries, exception ownership, versioning and examples. Maintain a content-level kept/moved/merged/clarified ledger; counts alone cannot prove preservation.

Verify that a reader can find who acts, what is needed, what happens, what result is produced, who gets it and what blocks or changes the route. Verify only applicable sections appear; omitted display fields remain represented or inherited where behaviour requires them.

Interaction checks must cover direct diagram entry, overview-to-activity drill-down and Back, switching, example state, selected-element visibility, Escape/close/focus return, and phone background inactivity. Check a narrow example table in light/dark and at established widths. Do not claim comprehension trials or screen-reader testing unless actually performed.

After implementation, re-score the panel experience and feed the result into the six-lens page review. The intended improvement is clearer understanding with retained precision, not a smaller word count or more disclosure widgets.

**Timing:** this is the next prompt after the Lead finishes its current annotated-flow revision. Compare with that completed output first; drop findings already fixed. No concurrent edits to the maker's files are requested.
