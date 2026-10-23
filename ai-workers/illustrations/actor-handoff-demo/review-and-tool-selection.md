# First usable one-pager: review and tool selection

17 October 2026 · Independent advice and isolated illustration · Proposal, not an approved product specification

**Current instruction: discuss and validate first.** The founder will copy the validation prompt to Claude. Claude should challenge these findings and return an agreed or disputed plan before the founder authorises execution. The execution brief is deferred; no tool migration or authoritative one-pager revision is authorised by this review alone.

**Later clarifications are preserved in `form-filling-options-and-validation.md`.** That note compares runtime visual/semantic filling with reusable AI-generated mappings, explains actual PDF/web targets, adds AI-generated validation coverage and the proposed product AI maker/checker/human sequence, and applies the founder's simplicity-versus-risk guideline. The diagram-tool recommendation does not decide the form-filling architecture.

## Recommendation

Enhance the existing one-pager. Keep its useful 32 activity records and source generator; replace the single ordered connecting line with an explicit process model and make the requirements disclosure consistent.

**Selected for the process map: bpmn-js, embedded in a web page whose layout and detail panel we control.** Use a small, correctly applied BPMN vocabulary: activities, actor lanes, decisions, parallel work, waits and messages. Keep long requirements in a contextual inspector beside or over the map, reached from an eye control on each activity. Use the existing structured source to generate the diagram and details together.

This is a recommendation for documenting the proposed solution. It does not select the product's workflow engine or prove that its AI works. Screenshots and product prototyping are deferred at the founder's request.

React Flow with ELK is the strongest alternative for unrestricted custom graph presentation. It is not necessary merely to obtain an eye icon, rich detail, actor lanes or a different page layout: those are already feasible around bpmn-js. Switch only for a demonstrated presentation need that the selected approach cannot meet without excessive complexity.

## What the founder is asking for

The conversation moves from “show the end-to-end idea” to “give me one place from which I can explain how it works.” The last ten-hour review covered 47 human prompts across six local Claude sessions; the substantive prompts reviewed ran from 08:31 to 15:09 IST on 17 October. Assistant replies and the saved outputs were also inspected. This does not imply access to an unsaved live Claude conversation.

The required result is one vertically scrollable reading surface, with high-to-mid-level requirements and optional detail. It is not a request to squeeze the entire implementation specification onto one printed A4 sheet. Its essential unit is an **activity and its handoff**, not a generic rectangular shape.

For every activity capture: owner; initiating event; prerequisites; input; processing; output and ready state; decision authority; business rules; exception and return path; next owner and acceptance evidence. A handoff must say what is transferred and what lets the receiving activity begin. A dependency is not automatically a sequential instruction.

The page itself should carry the problem, proposed solution and behaviour. Method comparisons, review commentary, decision history and coordination prompts belong outside its main reading path.

**Latest visual/disclosure clarification, 17 October 2026:** the full checklist is now explicit in `claude-validation-prompt.md`: top orientation and phase/actor key; labelled actor lanes and external participants; activities, conditional handoffs, waits and rework; shared-record references; compact supporting control strips; and all ten activity-detail fields. The main view remains concise. Click opens readable detail beside/over the map and keeps it open; another selection updates the same inspector; Close/Escape preserves map position and restores focus. Hover/focus preview is optional and brief. A separate Pin control is unnecessary unless it adds a distinct docking function.

This applies progressive disclosure: provide a short overview first and reveal supporting detail on request, rather than move the reader through a long page. [NN/G guidance](https://www.nngroup.com/articles/progressive-disclosure/) supports that principle; the choice of a contextual inspector is our design recommendation. A mobile modal overlay should use appropriate focus and close behaviour under the [WAI dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). The older illustration's above-journey panel remains a documented experiment, not the final interaction requirement.

## Tool, notation and automation are different choices

| Choice | Meaning here |
|---|---|
| BPMN | The shared process language: what a task, message, branch, wait or join means. |
| bpmn-js | The browser diagram library that reads and displays BPMN and can provide an editor. |
| Custom web page | The presentation: eye controls, detail panel location, terminology, responsive layout and optional views. |
| Structured requirements data | The content: rules, inputs, outputs, authority, acceptance and links to the evidence. |
| Build and check process | Claude updates editable records; a build generates views; checks detect missing records, invalid references and rendering problems. |
| Product automation | The future AI, rules, permissions and services doing real case work. A diagram library does not implement these. |

The [bpmn-js walkthrough](https://bpmn.io/toolkit/bpmn-js/walkthrough/) documents browser embedding, event handling, overlays, custom modules, rendering and BPMN XML. Its [current extension example](https://github.com/bpmn-io/bpmn-js-examples/tree/main/properties-panel-extension) demonstrates custom properties persisted in the XML. These support the feasibility of the selected approach; the exact Expat Ready interface remains implementation work.

## Alternatives assessed

The fit judgments below are our reasoning against this brief, not vendor rankings or measured scores.

| Option | Useful strengths | Relevant tradeoff | Selection |
|---|---|---|---|
| **bpmn-js + custom requirements panel** | Established process meaning; machine-readable BPMN; actors, messages, waits and branches; extensible events and properties. | Requires a good process model and deliberate layout. Rich requirements and the requested panel must be built. Standard notation constrains symbol meaning. | **Primary process map.** Reuse the current web page and data builder. [Official toolkit](https://bpmn.io/toolkit/bpmn-js/), [extension example](https://github.com/bpmn-io/bpmn-js-examples/tree/main/properties-panel-extension). |
| **React Flow + ELK** | Custom React activity components, handles, edge labels and grouped graphs; saved node/edge data; broad presentation control. | A graph library supplies no BPMN semantics. We must implement process validation, joins, typed handoffs, exports and layout integration. | Strong alternative if custom presentation becomes the overriding need. [Custom nodes](https://reactflow.dev/learn/customization/custom-nodes), [layout comparison](https://reactflow.dev/learn/layouting/layouting), [save/restore](https://reactflow.dev/examples/interaction/save-and-restore). |
| **JointJS / JointJS+; GoJS** | Mature programmable diagrams. JointJS offers SVG customisation; its commercial tier supplies additional UI, export and BPMN features. GoJS demonstrates collapsible and resizable swimlanes. | Still require our requirements model and custom interface. Commercial capabilities and licence terms need checking for the chosen package. | Credible alternatives; no demonstrated need to add them here. [JointJS tiers](https://docs.jointjs.com/), [GoJS swimlanes](https://gojs.net/latest/samples/swimLanes). |
| **draw.io / diagrams.net** | Existing visual editor; editable XML, shape metadata, tooltips, links and tags; embedding is documented. Claude can generate and revise the XML. | It can store details, but the precise top-panel experience and relationship checks need extra work. Drawing BPMN-like shapes is not proof of valid BPMN interchange. | Best simple fallback when direct human diagram editing is the priority. [Shape data](https://www.drawio.com/docs/manual/shapes/shape-data/), [embed protocol](https://www.drawio.com/docs/reference/embed-mode/). |
| **Visio** | Familiar cross-functional flowcharts, BPMN shapes and desktop diagram validation. Data Visualizer can generate supported flowchart templates from spreadsheet data. | Web BPMN requires Plan 2; Microsoft distinguishes desktop validation from web capabilities. Its validation does not establish correct attribute values. The exact custom requirements panel still needs integration. | Strong conventional diagram editor; less direct for this particular local web reading surface. [BPMN capabilities](https://support.microsoft.com/en-us/visio/create-bpmn-compliant-processes), [Data Visualizer](https://support.microsoft.com/en-us/visio/create-a-data-visualizer-diagram). |
| **Camunda Desktop Modeler** | Local BPMN/DMN files, extensibility and configurable linting; available for macOS. | An authoring tool, not the exact founder-facing one-pager. Deploy/run features are not needed for this milestone. | Optional human editor for the same process files later; do not adopt an execution platform to produce this document. [Official overview](https://docs.camunda.io/docs/components/modeler/desktop-modeler/). |
| **Lucidchart / Miro** | Shared editing and workshops; Lucid supports structured import and extensions, Miro provides shape and connector APIs. | Accounts, API access and platform behaviour become dependencies. Exact control over the reading interface is less direct than owning the page. This is a fit judgment, not a claim that automation is impossible. | Useful for workshops; not the preferred source for this code-maintained one-pager. [Lucid developer overview](https://lucid.readme.io/docs/welcome), [standard import](https://lucid.readme.io/docs/overview-si), [Miro connectors](https://developers.miro.com/reference/create-connector-1). |
| **SAP Signavio / IBM Blueworks Live** | Existing process repositories, activity properties, custom attributes and documentation views. Blueworks explicitly includes participants, inputs and outputs. | Adopting an enterprise repository adds a platform decision. Vendor-defined interfaces provide less freedom for this exact page. No hands-on account evaluation was performed. | Consider if enterprise-wide process governance becomes the objective. [Signavio attributes](https://help.sap.com/docs/signavio-process-manager/sap-signavio-process-manager-api/custom-attributes), [Blueworks process details](https://www.ibm.com/docs/en/blueworks-live?topic=process-adding-details). |
| **Mermaid / PlantUML-style diagrams as text** | Fast to create and review; useful for small supporting diagrams. Mermaid includes flowcharts and a requirements relationship diagram. | Less direct control over this dense interactive reading experience. A diagram's requirements relationships do not replace activity handoff definitions. | Supporting diagrams. Do not dismiss them as incapable of clicks: Mermaid supports callbacks under its documented security configuration. [Flowchart interactions](https://mermaid.js.org/syntax/flowchart.html), [requirements diagram](https://mermaid.js.org/syntax/requirementDiagram). |

The [React Flow project](https://reactflow.dev/pro) describes its library as MIT licensed, with optional paid examples and support. The [bpmn-js licence](https://raw.githubusercontent.com/bpmn-io/bpmn-js/develop/LICENSE) requires its linked watermark to remain visible. Therefore “complete control” cannot honestly mean freedom to remove every vendor mark or disregard standard semantics. Commercial package and deployment obligations: **Unconfirmed: no counsel (AIW-D94).**

### What the forums add

Forums were used for reported experience and implementation pitfalls. Current official documentation takes priority for capability claims. Promotional replies and isolated opinions were not treated as benchmarks.

| Evidence | What it tells us | Consequence |
|---|---|---|
| [bpmn.io, March 2022: auto-layout discussion](https://forum.bpmn.io/t/why-bpmn-io-project-doesnt-provide-an-auto-layouting-feature/7318) | A maintainer explains why automatic layout alone does not ensure a readable diagram. | Review line crossings, labels, waits and branch meaning after generation; do not equate automatic placement with good communication. |
| [bpmn.io, July 2020: auto-layout limitations](https://forum.bpmn.io/t/problem-with-bpmn-auto-layout/5016) compared with the [current project](https://github.com/bpmn-io/bpmn-auto-layout) and [current layout design](https://github.com/bpmn-io/bpmn-auto-layout/blob/main/docs/LAYOUT.md) | Older advice says lanes were unsupported. The current design documents nested horizontal lanes, cross-lane routing and collaborations. | Do not repeat the old limitation as a present fact. Pin and test a released version; checking the main-branch documentation does not validate a particular installed release. |
| [xyflow maintainer answer, January 2023](https://github.com/xyflow/xyflow/discussions/2788) and [subflow discussion, October 2023](https://github.com/xyflow/xyflow/discussions/3495) | React Flow deliberately leaves layout choice external; nested graph representation needs integration work. | React Flow gives freedom, but it does not remove layout engineering. The current [official comparison](https://reactflow.dev/learn/layouting/layouting) confirms that distinction. |
| [Business analysis discussion, September 2025](https://www.reddit.com/r/businessanalysis/comments/1ncd7fv/whats_the_use_case_for_bpmn/) | Practitioners disagree about how readily business readers understand BPMN. Some favour simple swimlanes; others favour a small consistent BPMN subset. | Use a small vocabulary and clear activity names. This is qualitative audience feedback, not proof that business users cannot read BPMN. |
| [Business analysis discussion, November 2025](https://www.reddit.com/r/businessanalysis/comments/1p7cmbu/has_anyone_else_given_up_on_static_process/) | The original question describes maintenance drift between a static map and working process. | Generate map and detail from linked records, and make changes traceable. A live-looking map alone does not prevent drift. |

### Why the other methods are supporting views

BPMN addresses sequencing and coordination. A service blueprint adds the customer-facing versus supporting-service distinction; it is useful later for the screen experience, but does not by itself settle all conditions and ready states. A sequence diagram helps with specific system requests. A data-flow view helps with canonical definitions, case values and form mappings. C4 explains software boundaries. A decision table can make a complicated rule clearer than a large branch tree. None needs to become a second master document.

Use the [OMG BPMN specification](https://www.omg.org/spec/BPMN/2.0.2/About-BPMN) for process semantics and [DMN](https://www.omg.org/spec/DMN/1.5/About-DMN) as an optional decision representation. Do not add a DMN engine merely to draw a decision table.

## How Claude can maintain it

Keep the existing source builder as the authoring entry point. Extend it with explicit relationships rather than inferring a path from the order of the activity list. Generate the process XML and requirements payload with stable activity identifiers. One build joins them and checks every reference. Diagram coordinates are presentation data, not a substitute for process relationships.

Each relationship needs a type: sequence, conditional branch, message, required input, parallel split/join or rework. Record the relevant condition, transferred record, source and destination, and the receiving ready state. Do not turn every dependency into a BPMN sequence flow, or treat the AI as an independent legal actor merely because it has a lane. Use separate pools for genuinely separate participants; message flows and sequence flows obey their own rules.

Claude can change these local text records, regenerate the page, inspect it in a browser and run structural checks. That is an inference from the documented APIs and editable file formats, not a promise that Claude will always infer the right requirements. Review protects meaning; tooling protects structure and consistency.

Keep the page read-only for the first usable version. Do not build a new drag-and-drop requirements editor. If human diagram editing is added later, define how edits return to the authoring model; silently rebuilding over a manually edited export would lose changes.

Potential checks include all 32 source activities accounted for, every detail present, every dependency resolved, conditional routes labelled, no orphaned requirement, and correct split/join and handoff structures. [bpmnlint](https://github.com/bpmn-io/bpmnlint) can add configurable process checks. [Token simulation](https://github.com/bpmn-io/bpmn-js-token-simulation) can illustrate routing later; it does not establish AI accuracy or immigration correctness.

## Review of Claude's current activity descriptions

Source for this entire table: `ai-workers/tools/s3/s3_data.py`, **Solution 1 v3 draft 1**, `STEPS` at the stated activity ID. Quoted titles below are exact. The current HTML is `problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`. All 32 descriptions were inspected, including their screen, actions, rules, output and alternate-path fields.

The content is a useful foundation. The repeated gap is the lack of explicit trigger, prerequisite, inputs, authority and receiving ready state. The current builder connects activity positions in order; that should not be mistaken for a model of actual dependencies, messages and concurrent work. The table identifies the additional issue at each activity, rather than repeating the common gap 32 times.

### Visible content, navigation and wording

The entire generated page was read, not just its source inventory or headings. A text extraction preserving its displayed wording is saved as `current-one-pager-reading.txt`. Reviewed file: `solution-1-one-pager.html`, v3 draft 1, modified 17 October 2026 at 15:22:33 local time; SHA-256 `5e30d278a16519681d153146d8d5a06888541f10dcd7043c69d0a8925d392a3f`. This identifies which version the review covers.

The current page contains seven principle statements, nine actor definitions, eleven stage columns, 32 activity descriptions with 110 rule entries, a six-row case-type comparison, six measurement rows and a footer. The following review covers the visible material in addition to the activity table below. Not every word needs rewriting: the aim is to preserve useful content and change wording when it changes meaning or comprehension.

| Exact wording or visible element | What works | What should change |
|---|---|---|
| Title: “Solution 1 · Pathway Setup to Form Filling” | Concrete and understandable. | Keep. |
| Subtitle: “every actor, every step, every rule” | Clearly states the ambition. | It currently promises more completeness than the handoff and exception model establishes. Use “Actors, handoffs and operating requirements” until completeness is demonstrated. |
| Problem: “every slip reaches a client's filed form” | Connects configuration errors to downstream harm. | Too absolute: review may catch an error. Say manual work repeats and raises the risk of inconsistent or incorrect forms. |
| Answer: “No manual mapping” and “master section list it maintains” | Captures the core intended outcome and automatic library maintenance. | Keep prominently. Clarify that new/uncertain structural items are reviewed, new/changed immigration rules and values are confirmed, and a separate person releases. Do not imply that every reused rule needs a new review. |
| Principle: “Code reads, AI judges, people decide” | Useful separation of responsibilities. | Keep with precise limits: extraction can fail, and an approved-label match needs validated context. “Exact code” is not a guarantee that an extractor understands every form. |
| Principle: “Reuse first” | Prevents duplicate fields, sections and document types. | Keep. Approval “once” means approval of an exact version and context, not immunity to later source changes. |
| Principle: “Every item cites its source” | Evidence beside the proposal helps review. | Keep; include the actual source version and location. The page should distinguish proposed source tracing from an implemented feature. |
| Principle: “Scored before trusted” | Independent expected results are an appropriate proposed control. | Keep, but mark measures pending. Specify what is scored and how a below-threshold item is handled. Do not imply that measured results already exist. |
| Principle: “Versioned, pinned, reproducible” | Core to safe reuse and case changes. | Keep. Define reproducibility of output values using pinned configuration, reference data and fact context; do not casually promise byte-identical PDFs. |
| Principle: “No AI at fill time” | Makes the difference between setup inference and rule-based filling clear. | Keep. “The same facts always give the same form” also depends on the form edition, rule/map versions and relevant context. |
| Principle: “Expat Ready runs the engine” | Clear central operating model. | Keep; no firm-side run or request. |
| Nine actor labels and stage headings | Useful ownership and lifecycle coverage. | Preserve roles, but separate firm staff from an AI skill and use activity verbs. A lane records performing responsibility; permissions and approval limits still need explicit detail. Government is an external boundary. |
| Diagram explanation: “arrows follow the step order” | Accurately describes what the current drawing code does. | This is an index of ordered activities, not proof of the actual flow. `build_one_pager.py`, `js()`, loops over adjacent entries of `step-order`. Replace the inferred line with explicit relationship records. |
| “Click a step to read its screen, actions and rules” | Gives a clear navigation action. | In this reviewed version, the control is an anchor to an already visible description farther down the page. It does not open hidden detail. Replace this with the requested eye/panel mechanism; preserve the description content. |
| 9 actors × 11 stages | Puts scope and ownership on one canvas. | The builder sets a 1,600px minimum width and 1,400px on phones. Much of the grid is empty, and horizontal panning obscures the end-to-end story. Split into linked vertical phase views if necessary; do not shrink labels to make everything fit. |
| Repeated “Does”, “Rules”, “Gives”, “If it goes wrong” | A helpful consistent starting template. | Use “Processing”, “Business rules”, “Output and readiness”, “Exception and return path”; add trigger, prerequisite, input, authority, next owner and acceptance. Keep screen references in detail. |
| “Same engine, same package shape; only the subjects and the 'for whom' on each line change.” | Shared mechanisms across case types are valuable. | “Only” understates differences in filings, access, answerers, repeated structures and signing. Keep the six-row comparison with those distinctions, preferably as optional detail rather than deleting it. |
| Six measurement rows with “to be measured” or “baseline not yet measured” | Honest about the absence of evidence. | Preserve that honesty. Separate a zero-manual-entry target from actual performance and account for manual exceptions already described in activity 9.1. Use an optional evidence/measurement view. |
| Footer: “Part of the pack” followed by slides, workbook and prototype | Identifies related outputs. | Move the artifact catalogue outside the main solution path. Keep version/status and specialist/legal confirmation labels. Defer new screenshots and product prototyping. |

Additional source comparison: activity 0.1 lists “tier (lead, prospect, case, staff-only)”. SA-01B v1.4 §3.1, SA-1B-2 says exactly “tier flag — lead, prospect or case”. Staff visibility should not silently become a fourth tier; label it separately or record the proposed change for validation. Conversely, the under-18 answering rule in activity 7.1 is not an invented rule: §7, SA-1B-76 explicitly states “Nothing is sent to a person under 18; a parent answers for them.” Preserve this as the current product rule, while avoiding a claim that it establishes every jurisdiction's signing or representation requirements.

### Activity-level review

| ID · exact source title | Useful content to retain | Clarification or correction needed |
|---|---|---|
| 0.1 · “The library of record” | Shared, versioned definitions and approved reuse. | Distinguish definition from value and form constraint. Separate sections/views/layout. The source's three tier flags should not silently become four; staff visibility is a separate concern. |
| 1.1 · “Create the combination row and attach its sources” | Full combination and source fingerprints. | “At least one form edition or a checklist” is insufficient as the only readiness rule; identify the required source set and missing inputs. |
| 1.2 · “Run the engine” | Draft isolation and pinned run inputs. | Specify retry, duplicate request, competing run, failure and superseded-review behaviour. Firms never request or run it. |
| 2.1 · “Read every box of every form edition” | Field inventory, edition identity and scripts. | Inventory counts help detect structural omissions; they do not prove semantic coverage. Name unsupported field types and scripts. |
| 2.2 · “Split the checklist, the guide and the eligibility page” | Original text and source location. | A text match does not establish complete OCR or correct interpretation. Preserve unreadable and omitted-region findings. |
| 2.3 · “Capture portal screens” | Versioned portal field capture. | A usable test account and capture permission are unverified. Show supported branches and prevent uncaptured branches being represented as complete. |
| 3.1 · “Match each box to a master field, or propose a new one” | Reuse and subject context. | Model confidence is not measured accuracy. A form's length restriction must not narrow the shared definition of a fact. |
| 3.2 · “Write the box address for every box” | Subject, purpose, repeat position, value mapping and overflow. | Rename to form field mapping. Define which form-copy owner, whose fact and purpose each mapping refers to. |
| 3.3 · “Build the document list” | Conditional document requirement and provider role. | Shared uploads require applicability, identity and permission checks; one upload is not automatically evidence for every person. |
| 3.4 · “Place fields in the section library” | Reuse before proposing a section. | State that AI grows the master section library as combinations are configured; every combination selects its relevant fields. Government headings stay independent. |
| 3.5 · “Draft the conditional rules” | Traceable conditions, per-person scope and passage disposition. | Verify source coverage independently; an AI cannot establish completeness merely by checking its own extracted passages. |
| 3.6 · “Draft the eligibility gates” | Source dates and specialist approval. | Specify missing-answer results, reference-table versions and testable boundaries. Immigration values require specialist confirmation. |
| 3.7 · “Assemble the PQR view, the SQR and the agent view” | Appropriate subsets and reduced repeated collection. | Separate generated definitions from case-time rendering and answer state. Explain prefill, changed context and re-confirmation. |
| 4.1 · “Prove the draft is complete and consistent” | Reference checks and explicit unresolved items. | Rename: structural checks cannot prove the meaning of every rule. Reference existence and semantic correctness are separate tests. |
| 4.2 · “Generate test families and score the run” | Hand-verified answer key and step measures. | One family per branch misses interacting conditions. Include boundary, negative and interaction cases and a defined fallback below threshold. |
| 5.1 · “Review new or uncertain items” | Evidence beside proposed changes. | Corrections must return through affected checks. Show how the reviewer resolves ambiguity without creating a second manual setup workflow. |
| 5.2 · “Confirm rules, gates, documents and values” | Specialist responsibility. | Record what version and evidence was approved, and route conflicting sources explicitly. Do not imply every structural item needs specialist review. |
| 5.3 · “Release the versioned package” | Separate release authority and pinned version. | Publish atomically; any relevant edit invalidates affected approvals. An approver rejects for correction rather than quietly editing the submitted package. |
| 6.1 · “Lead form and PQR” | Country PQR and reuse into later collection. | Specify incomplete-answer result, deciding rule, gap and rule version. Avoid suggesting that each combination owns a separate PQR. |
| 6.2 · “Duplicate check wherever a person is created” | Duplicate detection before record reuse. | A possible duplicate is a candidate, not already “one person record.” Show the authorised match/create decision. |
| 7.1 · “Convert the lead and open the case” | Individual, family and employer participation; the current under-18 answering rule is source-backed. | Preserve the row per person/filing and define permissions. Do not confuse a questionnaire answerer with the required signatory or treat one combination selection as every family member's filing row. |
| 7.2 · “Complete the SQR, per person” | Shared facts and conditional collection. | Show which rule adds a question, its subject and where the confirmed value is stored. Reuse must respect current case context. |
| 7.3 · “Read documents into facts” | Document proposals and human confirmation. | Extraction produces proposed values, not confirmed facts. Show conflicting evidence, document date and field context. |
| 8.1 · “Confirm every fact once in the working view” | Central staff confirmation and history. | “Only place” must refer to the staff editing surface; clients also supply information. Distinguish reusable identity facts from dated or case-specific facts. |
| 8.2 · “Render every form copy from the facts” | Value trace and form preview. | A wrong fact and a wrong mapping have different owners and return paths. Preview readiness must include all required dependencies. |
| 9.1 · “Fill each form type” | Different PDF and portal routes. | Supported editions and route readiness need evidence. Capture, mapping and actual filling are different capabilities. |
| 9.2 · “Validate barcode forms and check every copy” | Person validates where the form requires it. | A validate-only form can correctly produce no barcode. Test the expected result for the particular form edition. |
| 9.3 · “Approve and submit” | Versioned approval and withdrawal after change. | Review, required signatures, declarations, payment and submission can belong to different authorised people. Preserve receipt and uncertain-submission recovery. |
| 9.4 · “Receive, process, decide” | Government responses and case follow-up. | Show the external response boundary; do not imply the product controls government processing. |
| 10.1 · “Watch for change” | Fingerprints, impact list and affected open cases. | An unchanged field can be affected by changed guide prose or conditions. Reuse approval only after dependency impact is checked. |
| 10.2 · “Review and release the change” | Reuse the release path. | Preserve structure review, specialist review and separate release; retest affected dependencies, not just changed fields. |
| 10.3 · “Adopt the change on open cases” | Case pin and explicit adoption. | Adoption may reopen collection, checking and signing. Preserve filed evidence and earlier snapshots. |

## Terms and automatic sections

### Build-stage simplicity: what actually needs mapping

The normalized-view intention is sound. The staff working view should organize the relevant, permitted facts and document requirements needed for the case's filings. PQR and SQR should select the appropriate questions from shared definitions, rather than create separate versions of the same facts. PQR may also need eligibility inputs that do not appear on a government form. SQR collection is narrowed by subject, conditions and usable existing values; a document requirement belongs on the associated checklist, not in a new upload question type.

That does not remove the final link to the government's own form inputs. The government controls their identifiers, labels, order, option codes, repeated rows and edition changes. Our normalized view controls the collection experience. These are different responsibilities.

| Relationship | Why needed | Simplest representation |
|---|---|---|
| Combination/filing → applicable fields, groups, document requirements and conditions | Defines what this subject's filing actually needs. | Reuse the product's row selections, subject roles and conditions. Do not add a second requirements catalogue. |
| Normalized section → question/group placements; audience/tier → visible subset | Gives PQR, SQR and staff a consistent reading order without copying facts. | Reuse the section/placement model and view rules. Avoid three independently maintained field libraries. |
| Government form field → canonical field + purpose and correct subject | Resolves the correct confirmed value into the required output input. | One form field mapping per supported edition, reused across combinations. Format/value conversion and repeating position are metadata only when needed. |
| Uploaded evidence → subject, checklist requirement and proposed values | Makes evidence and confirmation traceable. | Use existing document and fact references; no new mapping service is implied. |

Illustration: `date_of_birth` is one canonical definition. The spouse has one confirmed date-of-birth value. The principal applicant's form may ask for the spouse's date, while the spouse's own form asks for their own date. Both target form inputs can resolve the same spouse value. Moving the question from one normalized section to another should not change either output mapping.

This separation is explicitly supported by SA-01B **v1.4 §3.2, SA-1B-12**: “Form boxes, rules and coverage rules reference a purpose, never a section, so re-organising sections cannot break a form map.” Section-to-section mapping is therefore not a necessary filling mechanism. The same source's **§3.5, SA-1B-27** specifies a form input mapped to a purpose plus field, with format/value conversion and overflow handling. These are existing requirement concepts; “box address” is unnecessary extra terminology for them.

| Build-stage issue to validate | Assessment and proposed action |
|---|---|
| 3.2: “Write the box address for every box” | Keep output mapping, rename to **Generate form field mappings**. Treat subject, purpose, target input and necessary formatting as mapping data. Do not introduce a separate address service or a new manual mapping workflow. |
| 3.4: “Place each new field in exactly one library section” | Stronger than the source's reusable placement model. Validate whether one preferred display location is intended; do not impose a global database restriction merely to keep views visually consistent. |
| 3.2/3.4: map original form sections onto library sections | Preserve original form headings for review, but a separate section-to-section map is unnecessary for filling unless a concrete display function requires it. Field/purpose mappings already join output inputs to facts. |
| 3.4: “the library section holds the union” | A library may contain the reusable material, but a case or questionnaire must not show the unfiltered union of every form's questions. Select the combination's applicable placements, then filter by role, conditions, tier and usable known values. |
| 3.1: create a new field using one form's limits | Keep canonical meaning separate from destination length, format or option restrictions. Reuse a shared date of birth rather than create form-specific duplicates. |
| 3.7: separate PQR/SQR/agent assembly | Keep them as projections of shared definitions and values. Do not create three independent canonical stores or three sets of mapping work. Country PQR blocks still need their existing intended purpose. |
| 3.4: arbitrary field selection inside a group | Validate against §3.2, SA-1B-8: “A placement can never change the group's field list, its checks, or how a purpose is derived from it.” AI must not silently trim required group members. A new or revised definition requires the appropriate review. |
| “skills, one per step” | Useful logical responsibilities do not require one deployed service, agent or model call per activity. Start with one generation pipeline and shared rules; split only for a concrete control, quality or retry need. |
| Separate mapping per combination | Reject duplicate authoring. A supported form edition's mapping is shared; combination-specific applicability stays in row/role/condition selections. |
| Required evidence and document collection | Preserve this alongside facts. A normalized question view alone cannot represent document applicability, missing uploads, evidence conflicts or confirmation. Reuse the existing checklist rather than invent a second document system. |

This is the substantive simplification to discuss with Claude: **shared definitions and placements → relevant normalized views → confirmed case values → reusable form field mappings → original government outputs**. A new diagramming tool cannot correct an unnecessarily complicated or wrongly coupled data model.

The under-18 questionnaire routing and the source's three tiers are current product requirements, not optional simplifications. Mandatory AI scoring/test gates and automatic setup are proposed solution controls that must be distinguished from the earlier source's manual authoring and test deferrals. Validation should surface such changes explicitly rather than silently claim that the team already agreed or implemented them.

### Reader-facing terms

The team's requirement document itself uses “box map,” so that word was not invented by Claude. It means a government form input, not a section. Use formal terms in the reader-facing page and keep source aliases in traceability.

Source: `sources/drive-snapshot-2026-10-13-1535/02-functional-requirements/super-admin/SA-01B-content-pack-configurator_v1.4_2026-10-12.md`, **v1.4, 12 October 2026**:

| Source section and exact words | Reader-facing term |
|---|---|
| §3.1, SA-1B-1: “Every question asked anywhere is a canonical field in the library, defined once” | **Canonical field**: a shared definition; its value belongs to a person or organisation and context. |
| §3.2 heading: “Field groups, placements and purposes” | **Field group**, **placement**, **purpose**; do not collapse these into “section.” |
| §3.3 heading: “Sections” | **Master section** for the reusable definition; **questionnaire section** for the relevant placement in PQR/SQR/staff views. The qualifiers clarify the proposal rather than claim a new source entity. |
| §3.5, SA-1-29: “Each edition has a field map (canonical field → form field), editable as data.” | **Government form field**, **form field mapping**. |
| §3.5, SA-1-30: “The PDF's fillable fields are read on upload; every mapping must point at an existing form field and an existing canonical field.” | A mapping must resolve both ends; a section is neither end of that link. |

Terminology is checked against the latest snapshot. Live tracked branch checks in this review matched all four captured repositories; a Drive search after the snapshot timestamp returned no changed master documents. That is a freshness observation, not evidence that every requirement is implemented.

Proposed flow: **combination sources → reuse canonical fields and master sections → AI proposes only missing definitions → review/release → select relevant fields per combination → PQR/SQR/staff subsets → collect and confirm case values → map values into original government form fields.** Original government section headings and order remain intact in the form review.

Use **IRCC** for Immigration, Refugees and Citizenship Canada; **RCIC** for Regulated Canadian Immigration Consultant. The government's [form help](https://www.ircc.canada.ca/english/helpcentre/answer.asp?qnum=1523&top=4) uses “fields”; the College's [register](https://register.college-ic.ca/Public-Register-EN/Public-Register-EN/Default.aspx) distinguishes licensed consultant designations. A representative is not always a consultant; use the specific role only where applicable.

## Human correction and AI reliability

Recommend one generation workflow, with accept/reject/correct or clarification in the existing review. Regenerate and recheck affected results. Do not add a second manual configurator, an AI/manual switch or a parallel set of manually maintained mappings for this first version.

If generation fails, retain the draft, name the unresolved item and pause the dependent work. A simple retry and correction route is worthwhile; promising certainty is not. This recommendation does not establish a new founder policy about every possible future fallback. A measured answer key, precision/recall, missed-condition tests and an agreed release threshold must establish actual reliability.

## Brand, existing screens and deferred work

The current frontend capture contains a brand guide, semantic design tokens and screen source for the pack workspace, country pack, SQR section editor and questionnaire views. Source: `code/ERv2-frontend@85623d4-2026-10-14/docs/style-guide/foundations/brand.md`, §Logo: “Use `BrandLogo`”; §Palette: “The only layer components use” refers to semantic `--color-*` tokens. The component and feature paths are inspectable in that capture.

Claude can use that source to understand the documented structure and implement the brand later. Source code alone does not establish the exact appearance or behaviour of a deployed screen. No current-screen screenshot was verified for this illustration.

Defer screenshots and product prototyping now. Later, put a small optional screen reference inside activity detail, clearly labelled **Existing screen** only after verification or **Proposed screen** for a new design. Prototype only an interaction the process and requirements cannot explain sufficiently. Do not fill the main map with screenshot thumbnails.

## What the isolated illustration establishes

`first-usable-pager.html` is a **content and disclosure illustration**, not the final BPMN implementation. It contains all 32 activity records, including the shared library; three layouts expose the same records: sequence/handoffs, actor responsibilities and a handoff matrix. Each eye/View control opens one panel above the journey with ten requirement fields. Inputs and following activities are linked, and back/close returns to the activity.

The annotation and corrected requirements are proposals. They illustrate documentation depth; they do not prove implementation, the final process model, compliance, AI accuracy or measured business benefit. The earlier `actor-handoff-layout.html` is an experimental 22-task BPMN sketch and is not the deliverable. Do not mistake its smaller inventory for preservation of all 32 records.

Browser results are saved in `first-pager-checks.json`. These are interface checks only. The maker should use the illustration's content contract while implementing the selected bpmn-js map in the authoritative one-pager, preserving useful original content at activity level.
