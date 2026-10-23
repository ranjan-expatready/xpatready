# One-pager validation: the Lead's response to the independent review

17 October 2026 · Claude Code (the Lead) · Discussion only: nothing rebuilt, installed or recorded. Responds to `claude-validation-prompt.md`, `review-and-tool-selection.md` and `form-filling-options-and-validation.md`.

**Reviewed version check:** `solution-1-one-pager.html` SHA-256 `5e30d278…3a2f` matches the hash the review names, so the review covers the current page.

**Consolidated 17 Oct 2026 (later):** the build plan for one-pager draft 2 is now `../../tools/s3/one-pager-draft-2-plan.md`; where this file and that plan differ, the plan wins. Superseded passages below are struck through and point to the settled position (D233–D236 and the founder's six corrections).

**Labels used:** **Impl** = what the team's code does today (`code/ERv2-sanitized@b48e4ce-2026-10-15`). **Req** = an existing team requirement (`SA-01B v1.4`, snapshot 2026-10-13-1535) or a founder decision. **Prop** = a proposed change that needs a yes.

## Verdict in five lines

1. The review is right about the page: the arrows follow list order, "click a step" only jumps to text that is already showing, the grid is 1,600px wide, and several sentences claim more than the design proves. I accept nearly all of the activity-level corrections.
2. The review misses one important source. The team's own requirement says **"AI never sets a value on a form at fill time"** (SA-1B-35) and **"Nothing on a form is generated"** (SA-1B-28). The founder has twice chosen against AI at fill time (D183 rejected "AI decides at fill time"; D174 says the first-file fill "uses the reviewed matches, not AI at fill time"). So runtime AI filling is not just a change to the one-pager. It would reverse a team requirement and two founder decisions. D174 already contains the minimal hybrid the review proposes as a new option.
3. The review calls the code's mapping "basic". It is narrower than that. A map entry holds only `canonicalFieldKey`, `formFieldId` and an optional transform (`packages/contracts/src/schemas/spine-masters.ts:169-175`). There is no subject, purpose or repeat position, and the filler rejects two values with the same key (`filler.service.ts` header and lines 95-109). So today's code **cannot** fill a principal's form with the spouse's date of birth. This is the largest build gap behind "Generate form field mappings".
4. Tool: I agree with bpmn-js, with two conditions. We generate the layout ourselves from a lane-by-phase grid instead of relying on auto-layout. And we use the viewer only, as a single pinned file. A phone does not get the BPMN canvas; it gets a vertical list built from the same data.
5. A second AI checker earns its place in **setup** (checking drafted mappings) and in **targeted case checks** (high-priority or disputed facts against evidence). ~~It earns little on the fill itself~~ *Corrected:* read-back proves only that the selected value was copied; it does not prove the right person or fact was selected, so the AI meaning check stays and its added value is measured in the real read.

## 1. My understanding, with one sponsor and spouse example

**Normalised views.** Each fact meaning has one canonical field (SA-1B-1). Fields travel in field groups (SA-1B-6). A placement puts a group into a reusable section and may change only wording, help, whether it is required, and whether optional members are hidden (SA-1B-7, SA-1B-8). A combination's row selects sections, documents and forms, each with **who** and **only if** (SA-1B-57). Each person's questionnaire is their row filtered by role and conditions (SA-1B-73).

- The PQR is the lead-tier and prospect-tier fields in country blocks; rows do not own it (SA-1B-77 to 82).
- The SQR is everything that applies to the filing, pre-filled from earlier tiers (SA-1B-82, 83).
- The staff working view is the full set.
- All three are **projections of one set of definitions and one set of values**, never copies.

**Values.** A value belongs to a subject (a person or the employer) and a field. List-shaped facts are asked once, and a **purpose** is derived from the list by one of five fixed kinds (SA-1B-10, 11).

**Output targets.** A government form field resolves through a mapping: *form edition + target reference → canonical field + purpose + subject relative to the form copy's owner + repeat position + transform and value map* (SA-1B-27 gives purpose + field + transform + value map + overflow; subject and repeat position are my addition, needed for family files). What the target reference is depends on the format:

| Format | Target reference | State today |
|---|---|---|
| Standard fillable PDF (AcroForm) | The full field name read from the file | **Impl:** read (`pdf-acroform-inventory.ts:180-189`) and written by name (`pdf-form.adapter.ts:158-200`). Formatting transforms are deferred in the adapter's scope comment, although transform schemas exist in contracts. Not built: subject, purpose and repeat position. |
| Dynamic XFA PDF (barcode or validate-only) | XFA data binding or Scripting Object Model path, with instance index for repeats | **Impl:** rejected (`pdf-acroform-inventory.ts:141-150`). The route is researched in `research/xfa-filling-route-2026-10-17.md`; I have not re-verified it in this pass. |
| Government portal | Accessible label or role scoped to the screen section and repeated block, plus a stable attribute where one exists; checked against the captured screen fingerprint | Not built (Prop, 2.3 and 9.1) |
| Flat or scanned PDF | Page and position overlay | Not built and not needed unless the real read finds such a launch form. It carries no native validation. |

No real IRCC field name is available yet (`tools/s3/real-read/` does not exist; `inputs/ircc-forms/` is empty). None is invented here.

**Runtime interpretation and reusable mappings.** Both need the same correspondence between a form field and a fact. Reusable mapping works it out once per form edition, reviews it once, and saves it. Runtime interpretation works it out again on every fill and reviews it on every fill.

**AI-generated validation.** AI drafts checks only into the product's existing vocabularies:
- field constraints: minimum, maximum, pattern (`packages/contracts/src/schemas/validation-constraints.ts`);
- field-group checks (SA-1B-6);
- the condition language with hard and advisory rules (SA-1-16);
- document expiry and "what it must outlive" (SA-1B-21 to 23);
- coverage rules (SA-1B-15).

Anything those vocabularies cannot express is recorded as a gap, never written as free text.

**Example: a sponsor and a spouse.** A family file has a sponsor and the sponsored spouse, who is the principal applicant.

- **Fact:** the spouse's date of birth is one value, on the spouse's person record. It is proposed from the spouse's passport (7.3) and confirmed once by the agent (8.1).
- **Two mappings, one value:** the sponsor's form copy has a field asking for the sponsored person's date of birth; its mapping says *date of birth, subject = the copy owner's sponsored spouse*. The spouse's own form copy asks for the applicant's date of birth; its mapping says *date of birth, subject = self*. Both resolve to the same confirmed value.
- **Sections do not matter:** moving date of birth from "Personal details" to "Identity" in the questionnaire changes neither mapping. Mappings reference the field and purpose, never the section (SA-1B-12).
- **Checks that apply:** date of birth is before the passport issue date (cross-record consistency). Passport expiry inside the warning window gives a **warning, not a block** (SA-1B-23). Anyone under 18 on the case never receives a questionnaire; a parent answers (SA-1B-76).
- **Today's code:** cannot do this. The map entry has no subject, and one render holds one value per key.

## 2. Agree, disagree or refine

| # | Finding | Verdict | Reason and exact evidence | Kind |
|---|---|---|---|---|
| 1 | Arrows follow list order, not the process | **Agree** | `build_one_pager.py:99-109` joins adjacent entries of `step-order` | Impl |
| 2 | "Click a step" jumps to text already showing | **Agree** | `:137` `href='#st-…'`; every description is rendered at `:143-158` | Impl |
| 3 | The 1,600px grid hides the story | **Agree** | `:55` `min-width:1600px`; `:85` 1,400px on phones | Impl |
| 4 | Subtitle "every actor, every step, every rule" overclaims | **Refine** | The founder asked for all actors and all rules (D232). Keep the scope, drop the completeness claim: "Actors, handoffs and rules, draft 2". | Prop |
| 5 | "Every slip reaches a client's filed form" is too absolute | **Agree** | Review can catch a slip; say "repeats and raises the risk of wrong forms" | Prop |
| 6 | Activity 0.1 adds a fourth tier, "staff-only" | **Refine (corrected after checking)** | Not invented: the founder decided a fourth "staff" flag (AIW-D180) as a proposal to the team (TC-177), against SA-1B-2's three tiers. Both reviews missed this. **Resolved by AIW-D235:** three lifecycle tiers stay; "collected from" and visibility are kept separate from the tier. | Req vs Prop, now decided |
| 7 | The under-18 rule is real | **Agree** | SA-1B-76 exact words. Answering is not signing (9.3). | Req |
| 8 | Rename 3.2 to "Generate form field mappings" | **Agree, and go further** | The mapping must carry subject, purpose and repeat position. Purpose is in SA-1B-27; **none of the three is in the code** (`spine-masters.ts:169-175`). Name this build gap on the page. | Req + Impl gap |
| 9 | No section-to-section map is needed for filling | **Agree** | SA-1B-12. Remove 3.2's "display layer that points at library sections" and 3.4's "per-form layout maps". The form's own headings stay as read-only data on the form inventory (2.1) for the form check view. | Req |
| 10 | 3.4 "exactly one library section" and "the library section holds the union" | **Agree, with a different rule** | SA-1B-13 makes sections reusable sets; a group can be placed in different sections in different rows (a child's date of birth sits under "Family member"). New rule: reuse the existing section for the same meaning; a placement never changes a group's fields (SA-1B-8); publishing blocks hiding a field a form or rule reads (SA-1B-9). | Req |
| 11 | Illustration rule "People do not pre-build a fixed section library by hand" | **Refine** | Reads as a rejection of SA-1B-13. Founder intent (NEXT.md): the AI selects from the master section list it maintains and proposes new sections; a person approves new ones. Say exactly that. | Req + Prop |
| 12 | "Skills, one per step" | **Agree** | Replace with "AI drafting, one pipeline in the platform". Split only for a concrete retry or quality need. | Prop |
| 13 | PQR, SQR and agent view are projections | **Agree** | SA-1B-79, 82, 83. 3.7 already says "derived view"; 6.1 must not imply each row owns a PQR. | Req |
| 14 | Mandatory test families and scoring are proposed changes | **Refine** | SA-1B-38: "no mandatory test profiles and publishing runs no test set". But the founder already chose one sample family per branch (D183) and a measured matching step (D229). ~~Only per-step bars that switch a step off are new.~~ *Superseded by D236:* evidence-based gates; a failed check holds the affected item and its dependents. | Req (D183, D229) vs SA-1B-38 + Prop |
| 15 | 4.1 "Prove the draft is complete and consistent" overclaims | **Agree** | Rename to "Check structure and references". Semantic correctness belongs to 4.2 and review. | Prop |
| 16 | 2.1 "box count must equal the form's own count" | **Disagree with the page (the review did not raise this)** | A fillable PDF publishes no independent count, so the check compares the file with itself. Replace with "every widget on every page belongs to a read field; unread regions are named". | Prop |
| 17 | 6.2 output "One person record" | **Agree** | Output is "match decision"; an authorised person decides same or different. | Prop |
| 18 | 8.1 "the only place a fact is typed" | **Agree** | "The only staff editing surface"; clients also answer (7.2). | Prop |
| 19 | 8.2 wrong fact and wrong mapping have different owners | **Agree** | Already partly there: "a box that shows the wrong fact is a map flag to the content team". Make the two return paths explicit. | — |
| 20 | 9.2 a validate-only form produces no barcode | **Agree** | Expected result per edition; SA-1B-31. | Req |
| 21 | 9.3 approval, signing, payment and submission can be different people | **Agree** | D174: "Submit, Pay, Sign and declarations stay with the person". | Req |
| 22 | 10.1 an unchanged field can be hit by changed prose or conditions | **Agree** | Impact means dependencies (rules, documents, gates that read the field), not only changed fields. | Prop |
| 23 | Expiry warns, never blocks | **Agree; add a precision** | SA-1B-23. But "Expat Ready never blocks" is not universal: an uncovered history gap **blocks submission until explained** (SA-1B-15). The validation design must keep both behaviours exactly as the sources state. | Req |
| 24 | Runtime AI filling is a fair candidate | **Disagree with the framing** | It reverses SA-1B-35 and SA-1B-28, D183 and D174's clause; the review says only that the one-pager would change. It is not "substantially simpler". It still needs subject resolution, target interaction, checks, readback and a review screen, then adds repeat AI cost, a review on every fill at the firm, and loses repeatable output (the filler re-renders byte-identically). D174 already defines the hybrid: a rare form with no released map is matched at first use, a licensed reviewer checks every field, and the map is released before any reuse. **Recommendation:** reusable mappings in the design; runtime interpretation measured as the challenger in the real read, on the same answer key. | Req; a change needs the founder |
| 25 | Independent AI checker on the prepared output | **Refine** | Use it where judgement is involved: (a) at setup, a fresh-context check of drafted mappings against the field's label and page; (b) at case time, a targeted recheck of high-priority or disputed facts against evidence. The write itself is checked by code readback. Never loop models until they agree. | Prop |
| 26 | Review priority plus grey, red, amber, green | **Agree; reuse more** | Base it on existing statuses: box status filled / needs review / unmapped (SA-1B-29) and 8.2's filled / needs a fact / blocked by conflict / staff enters. The colours map onto these. Priority comes from the immigration-significant flag (SA-1B-1: **Req, not in code**, no match in the capture). **One order:** the form's own order, plus a "needs attention" list that jumps to items, instead of a second risk-sorted order. One approval per copy (9.3), with explicit acknowledgement only for red, amber and high-priority items. | Req + Prop |
| 27 | Each generated check states applicability, inputs, source, severity, timing, action and tests | **Agree** | Severity uses the existing hard / advisory split (SA-1-16), not a new scale. Date arithmetic against a submission date may not be expressible today; record it as a gap if so. | Req + gap |
| 28 | bpmn-js over React Flow, draw.io and the others | **Agree, with conditions** | See section 4. | Prop |
| 29 | Eye icon, contextual inspector, no Pin control | **Agree** | Section 5 defines the behaviour. | Prop |
| 30 | Illustration as the model for depth | **Refine** | Its ten fields are present but partly mechanical. 3.2's trigger is "canonical field matches are available."; its input reads "government form fields, fields, copy owner…" (a term-swap leftover); 0.1's "next" mixes data reads with sequence. `first-pager-checks.json` counts fields per activity, so "10 of 10 present" does not show quality. | Impl (illustration) |
| 31 | 0.1 "The library of record" counted as an activity | **New point** | It is a **data store**, not a task. Show it as the shared configuration library record. That leaves 31 activities, with no content lost. | Prop |
| 32 | Founder decision conflict | **New point; founder to decide** | D174 lets a firm's licensed reviewer check a rare form's first fill on a real file. D231 says "no firm-side run or request". Both cannot hold as written. | Req vs Req |

## 3. Keep, correct, move, remove (by content, not by count)

**Preservation method.** The build gets a **disposition ledger**. Every one of the 110 rule entries, 7 principles, 6 case-type rows and 6 measures gets a disposition (keep, correct, move or remove), a reason and its new location. The build fails if any entry is missing. The ledger stays outside the page.

| Content | Keep | Correct | Move | Remove |
|---|---|---|---|---|
| Title, answer | Title; "No manual mapping…" (founder's wording, NEXT.md) | Answer: add "new or changed rules and values confirmed by the specialist; a second person releases; reused approved items are not re-reviewed" | — | — |
| Subtitle, problem | — | Both (rows 4 and 5) | — | "every slip reaches" |
| Principles (7) | Reuse first; cites its source (add version and location); Expat Ready runs the engine | Code reads → "repeatable code, with named limits"; Scored before trusted → Prop, measures pending; Reproducible → "same values from the same versions and facts", byte-identical only where proven (AcroForm adapter); No AI at fill time → keep unless the founder changes it | All seven become one-line items in the **control strips** under the map | — |
| Actors (9) | All roles | AI → "AI drafting (in the platform)"; Government → external pool; 0.1 → data store | — | "skills, one per step" |
| Stages (11) | All 11 stage labels and the activity IDs | — | Grouped under four phase headings: **Set up** (1–5), **Prospect and case** (6–7), **Prepare and file** (8–9), **Change** (10) | — |
| 32 activity records | Every action, rule, screen, output and alternate path not listed as corrected | Rows 6, 8–11, 15–19, 22, 26 above; plus 1.1 (name the required source set), 1.2 (duplicate run, failure, superseded review), 3.1 (canonical meaning separate from one form's limits; form limits move into the mapping), 3.3 (a shared upload needs identity and applicability checks), 3.5 (completeness of passages checked independently), 3.6 (missing-answer result, table version) | 0.1 → data store; 9.4 → external pool detail | "box address" (all 5 uses); "union"; section-to-section layout maps; arrows by order |
| New per activity | — | Add trigger, prerequisites, records read and updated, authority, ready state, return path, acceptance (happy and alternate), next owner, transferred record and receiving condition | — | — |
| 7.3 data handling | "Processing in Canada or the US only…" (based on D147 and its D52 correction) | — | — | — |
| Case types (6 rows) | All rows and cells | "Only the subjects… change" → "same engine; subjects, filings, answerers, repeats and signing differ" | Optional drawer under the map | — |
| Measures (6 rows) | All, all still "to be measured" | Split "target: zero typed by hand" from the measured value; count 9.1's type-by-hand list as known exceptions | Compact "evidence status" strip | — |
| Footer | Version, "Legal points unconfirmed, no counsel", "Immigration values pending the specialist" | — | The artefact list → folder README | Artefact list from the page |

## 4. Tool recommendation

**Recommended: the bpmn-js viewer, version 18.16.0, as one pinned local file** (already saved in this folder as `bpmn-viewer-18.16.0.min.js`, so nothing new is installed). It sits inside our own generated HTML page. Python writes the BPMN XML **and its layout coordinates** from `s3_data.py`, on a grid of lanes by phase columns. The library's overlay API places an HTML eye button on each activity. Those buttons are what give keyboard access, because the drawing itself is not keyboard friendly.

**The concrete need it meets.** Sequence, conditional branch, message, wait, parallel split and join, and rework are drawn in a recognised notation that a CTO or an implementation partner can read and open in a standard modeller. The founder asked for established notations and rejected invented visuals (NEXT.md, "What the founder wants"). A hand-drawn SVG would invent its own symbols. Explicit relationships, the eye icon and the inspector are **not** reasons to change tools: they are a data and page problem, solvable either way.

**Strongest alternative: React Flow with ELK layout.** It gives full control over each node's look and automatic lane-aware layout. The cost: a React build toolchain for a single static page, and we would have to implement process meaning, joins, typed handoffs and export ourselves. Switch only if the BPMN canvas cannot carry the eye control, selection and phase zoom without heavy workarounds.

**Costs and limits, stated plainly:**
- ~~31 activities across 9 lanes make a wide drawing, roughly 3,000px … phase buttons zoom the canvas.~~ *Superseded:* one small overview plus seven phase views, each readable at natural size (at most 1,240px), no zoom dependence.
- Generating coordinates ourselves avoids depending on the auto-layout package. Line routing between lanes still needs a visual check by eye.
- The bpmn.io watermark must stay visible (licence). Commercial terms: **Unconfirmed: no counsel (AIW-D94)**.
- The tool proves neither requirements nor AI accuracy. Our structural checks protect consistency; review protects meaning.

## 5. The smallest revision and its proof plan

### Process model, in BPMN terms

- **Pools:**
  - "Expat Ready product", with lanes grouped by organisation: Expat Ready content team (publisher, specialist, releaser), product (AI drafting, platform), firm (agent, licensed representative), and client and family (they act in our portal).
  - **Government**, as a separate black-box pool connected only by message flows (submission; requests and decision).
- **Starts:** a new combination is needed; a prospect arrives; a scheduled change check runs (timer). **Ends:** package released; application decided; case adopted the new version.
- **Gateways:** check clean?; release approved or rejected (rework to 5.1); same person?; fact conflict?; approval withdrawn after a change?
- **Parallel work:** reading forms, splitting the guide and capturing portal screens (2.1 ∥ 2.2 ∥ 2.3, then a join); SQR answers and document reading (7.2 ∥ 7.3, joining at 8.1).
- **Waits:** client answers; government response.
- **Data records (data stores, not new services):** configuration library · released combination package · case facts per subject · document evidence · review and approval records · prepared and submitted outputs. Each activity says which it reads and which it updates.

### Source changes (one data file, one builder)

- `s3_data.py` gains:
  - `FLOWS`: from, to, type (sequence, conditional, message, rework), condition, record transferred, receiving ready state;
  - `RECORDS` and reads and updates per activity;
  - `EVENTS` and `GATEWAYS`;
  - `CONTROLS` (validation; review and approval; versions; change);
  - the ten detail fields on every activity;
  - the disposition ledger.
- `build_one_pager.py` writes the BPMN XML with its layout, the detail data and the inspector into one HTML file. It also writes a phone list view from the same data.
- The old HTML, builder and data are kept whole in the archive first (AGENTS.md versioning rule).

### Inspector behaviour

| Need | Behaviour |
|---|---|
| Main view | Activity label, lane and handoff lines only. Every activity has an eye button labelled "View 3.2 Generate form field mappings". |
| Open | Click, Enter or Space opens the inspector. On screens 1,200px or wider it is docked at about 420px on the right and the map narrows. Below that it overlays the right side without blocking clicks on the map. The selected activity is outlined. |
| Persistent reading | It stays open until closed. Choosing another activity replaces the content in the same inspector. **No Pin control:** it would add nothing. |
| Preview | Hover or keyboard focus shows a small tooltip after about 300ms: title, then Input → Output. It never shows the full specification. |
| Close | A Close button or Escape. Focus returns to that activity's eye button. The map's pan and zoom are untouched; opening never scrolls the page or the map. |
| Phone | A full-height bottom sheet with a visible Close button, focus kept inside it, and focus returned on close. A location hash (`#a=3.2`) updates without adding history, so Back is never needed. |
| Content order | One overview line (Input → Processing → Output → Next owner), then the ten labelled groups as short bullets. Rules, validations, exceptions and acceptance sit in collapsed sections. Only one inspector, with no nested navigation. |

### Safeguards shown on the page (product, not documentation)

- **At setup:** AI drafts → code checks structure and references → an independent AI recheck of drafted mappings in a fresh context → the publisher reviews every new or changed item (D236) → the specialist confirms rules, gates and values → a second person releases.
- **At case time:** AI proposes values from documents → the agent confirms them → rules fill using released mappings → code reads back every written value → a targeted AI recheck of high-priority or disputed facts against evidence → the representative approves each copy → a person signs, pays and submits.
- This is the product's checking. The documentation maker and checker (this session and the separate checker) are a different thing and stay off the page.

### Runtime versus reuse, proved once, without building two engines

This runs inside the already-planned real read (D229), on one form edition. The made-up family is a principal, a spouse and one child, with a hand-checked answer key and deliberately planted errors: a wrong person's value, a missing field, a stale fact, truncation, a wrong option and a date-boundary case.

- **Path A:** AI drafts the mappings, they are reviewed once, then rules fill.
- **Path B:** AI fills directly from the form plus the confirmed facts.
- **Same checks on both:** code readback and one independent AI check.
- **Measured:** draft correctness, checker detection, errors left after checking, whole-form correctness, human correction minutes, cost and time per fill.
- ~~Only the winner is described in the solution.~~ *Corrected (D233):* the selected route changes only if the evidence supports it and the founder says yes. This is the place to test the founder's 90% figure as a hypothesis.

### Proof steps, in order (each needs the founder's go)

1. The founder answers the open questions, one at a time.
2. Archive the current one-pager, builder and data.
3. Update the data, flows, records, detail fields and ledger.
4. Build. Structural checks (below) must pass.
5. Browser checks at 1440, 1280, 768 and 375px wide, light and dark mode: open, switch, Escape, focus return, the map view unchanged after close, no sideways page scroll.
6. The separate checker reviews it.
7. The founder reads it.

**Structural checks in the build:**
- every activity has all ten fields, non-empty and not left as template fragments;
- every flow points at a real activity or event; every activity is reachable from a start and reaches an end;
- every conditional flow is labelled; every parallel split has a join; message flows only cross pools;
- every cross-lane handoff names the record and the ready state;
- every ledger entry has a disposition;
- banned terms are absent ("box address", "every slip", a fourth tier).

### Coverage checklist

| Requirement from the brief | Where it lives | How it is verified |
|---|---|---|
| Top strip: problem, outcome, phase progression, actor and notation key | Header band: one-line problem, answer, four phase chips, a key of lanes plus 6 symbols (task, gateway, event, message, data store, rework) | Read in the browser; key symbols match those used |
| Horizontal actor lanes with phase headings | BPMN pool and lanes; phase headings drawn above the columns | Every activity's lane equals its `actor` (build check) |
| External participants separated | Government pool; message flows only | Message-flow check |
| Start and end events, decisions with conditions | `EVENTS`, `GATEWAYS`, labelled conditional flows | Reachability and label checks |
| True handoffs (record, next owner, ready condition) | `FLOWS` crossing lanes | Handoff completeness check |
| Messages, waits, dependencies vs sequence | Message flows; intermediate wait events; data associations to records (not sequence lines) | Type check: a dependency never drawn as sequence |
| Parallel work and joins | 2.1 ∥ 2.2 ∥ 2.3; 7.2 ∥ 7.3 | Split and join check |
| Failure and rework paths | Rework flows: 4.1 → 3.x, 5.3 → 5.1, 8.2 → 10 (wrong mapping), 9.2 → 8.1 | Every `alt` maps to a flow or names its stop |
| Shared records shown separately | Six data stores, configuration library apart from case records | Each activity lists reads and updates; no extra store |
| Compact control strips | Validation · review and approval · versions · change, one line each, linked to records | Word cap per strip |
| Activity detail fields 1–10 | Inspector groups, in the brief's order | Ten-field check plus the checker's read |
| Screen or context where useful | Inspector header "Screen:", existing or proposed label | Present on case-time activities |
| Concise main view; eye icon on each activity | Overlays | Count of eye buttons = 31 |
| Docked or overlay inspector; selection visible; scroll, pan and zoom kept | Section 5 table | Browser test: map view before = after |
| Click keeps it open; another selection updates; no Pin | Same | Browser test |
| Brief hover or focus preview | Tooltip | Browser test: never shows the full specification |
| Close, Escape, focus return; phone sheet | Same | Browser and keyboard test |
| Overview first; grouped bullets; expandable rules | Inspector layout | Read in the browser |
| Decisions and history off the main path | Ledger and change notes outside the page | Banned-reference check (no decision numbers in page text) |
| One generation and review workflow, no manual configurator | 5.1 wording kept: "nobody types a mapping from scratch" | Text check |

## Update after question 1 (founder's answer, recorded as AIW-D233)

**Filling:** saved maps, with runtime AI tested. AI generates one reusable mapping set per form edition or portal version, and every combination using that edition reuses it. People review only new or uncertain matches. Runtime AI is measured once in the real read as the challenger. On the page this changes activities 3.1, 3.2, 4.2, 8.2, 9.1 and 10.1, and the principle "No AI at fill time" stays. Each mapping in 3.2 lists: source person or organisation, relationship to the copy owner, canonical field, purpose or time, target field, format, conditions and repeated row.

### Examples inside each activity card (from `alignment-addendum.md`)

**Card layout, top to bottom:**
1. Header: ID, title, lane, phase, and the screen (labelled existing or proposed).
2. One line: **Input → Action → Output → Next owner**, using concrete states. Example: "Spouse passport scan → read date of birth → proposed value, unconfirmed → agent".
3. **What the reviewer does**, or "No human action at this step".
4. The ten requirement groups as short bullets. Rules, validations, exceptions and acceptance are collapsed.
5. An **Example** button inside the same card. It expands the example in place and stays expanded when another activity is selected. It is keyboard and touch operable, and never appears on hover only.

**How examples are drawn:** a small table, matrix, comparison or three-box flow, whichever teaches the point best. The normal case comes first, then one meaningful exception. Every illustrative value carries an "Example" label. No real government field identifier appears before the real read; real ones replace placeholders afterwards. No invented accuracy or duration.

**One made-up family throughout (Client A):** Client A applies for a work permit from outside Canada, with a common-law partner and one child aged 9. Values are illustrative.
- **Client A's date of birth:** 12 Apr 1990.
- **Partner's date of birth:** 3 Sep 1991.
- **Child's date of birth:** 20 Jan 2017.
- **Partner's passport:** expires in 70 days, which triggers the warning.
- **Two addresses:** "lives here now" and "send post here" differ.

The same values appear in every card. A build check confirms they match across cards.

### Example coverage (the addendum's minimum, mapped to activities)

| Concept | Card | Example shown | Exception shown |
|---|---|---|---|
| Canonical fields and values | Library record, 3.1 | One date-of-birth definition; three separate values for Client A, the partner and the child | A form's 10-character limit stays on the mapping, not the definition |
| Master sections and combinations | 3.4 | Existing "Personal details" section reused; a 3 × 4 matrix of combinations by sections, ticked where they apply | A missing "Common-law relationship" section is proposed and waits for review |
| PQR, SQR and staff views | 3.7, 6.1, 7.2 | Marital status asked in the PQR, pre-filled and not re-asked in the SQR, shown in the staff view: one stored value | The child's questions go to the parent; nothing is sent to the child |
| Form field mappings | 3.2 | Field label and form section → person and relationship → canonical field → format | The same "Date of birth" label under the partner's heading: applicant or partner? Resolved by heading context and flagged if unclear |
| Mapping review | 5.1 | Evidence snippet beside the highlighted target; proposed match; Approve, Correct or Flag (proposed interaction) | A wrong mapping (content team fixes it) next to a wrong fact (agent fixes it) |
| Reuse across combinations | 3.2, 10.1 | Three combinations point to one family-information form edition's mapping | What needs a new mapping: a new edition, or a field whose meaning differs |
| Conditional rules and documents | 3.3, 3.5 | If/then table: common-law = yes → the partner's statutory declaration form and proof of cohabitation, for the partner role | A guide passage that depends on an officer's judgement becomes an agent request, not a rule |
| Document reading and confirmation | 7.3, 8.1 | Passport scan → proposed date of birth → agent confirms → confirmed | Scan unreadable → the question returns to the SQR; the declared answer conflicts with the document → both shown, the agent decides |
| Validation and review | 8.2, 9.2, 9.3 | Per-field results: grey, red, amber, green, each with a reason and source; review priority shown separately; approval separate again | Passport expiry warning stays amber (warn, not block); a green high-priority identity field is still surfaced for focused review |
| Handoffs and exceptions | Every cross-lane card | Completed record → receiving owner → ready condition | A missing prerequisite (no released version) → return path named |
| Form edition or guide change | 10.1–10.3 | New edition: 4 fields changed, the rest keep their mappings; one rule rechecked; Client A's approved copy goes stale | The government cut-off date makes adoption required |
| Eligibility gates | 3.6, 6.1 | A gate reads two facts → indicative result plus the gap | A missing answer gives "cannot tell yet", not a fail |
| Filling by form type | 9.1 | Fillable PDF, barcode form, validate-only form and portal, one line each with the write and read-back | A barcode form refuses a value → the field goes on the type-by-hand list |
| Release | 5.3 | Difference from the last version → release or reject with a reason | The releaser is the author → blocked |

### Update after question 2 (recorded as AIW-D234)

A form with no released mapping is marked **"Not yet supported"** on the case (8.2 and 9.1), and the case's other activities continue. Expat Ready drafts, checks and releases the mapping through the normal setup path (1.1 → 5.3). Automatic filling then becomes available on that case. If urgent, authorised staff complete that form by hand through their existing process. No firm-side mapping review and no second configurator. The content-team alert is labelled **proposed** and uses the simplest existing notification; no turnaround is promised.

- **New flow on the map:** a message from 8.2 ("form not yet supported") to the content team's 1.1; a wait; then a message back on release.
- **Example in the 9.1 card:** Client A's case needs a rare employer form → shown as "Not yet supported" while the questionnaire and documents carry on → Expat Ready releases the mapping → the form fills. Alternative shown: the agent completes the form by hand because the case is urgent.
- **Removed from the earlier plan:** any firm review of a first fill.

### Update after question 3 (recorded as AIW-D235)

**Three settings, kept separate, on one shared value:**
- **Lifecycle tier:** lead, prospect or case (SA-1B-2).
- **Collected from:** client questionnaire, staff working view, a profile record, or a confirmed document or existing record. This is a proposed setting on the placement.
- **Visibility:** existing permissions.

AI drafts the "collected from" settings in 3.4 and 3.7; people review new or uncertain ones in 5.1. Representative facts resolve through the mapping's subject ("the case's selected representative"), so they need no special tier.

**Implementation gap:**
- There is no field-level tier and no collection setting in the 15 Oct code.
- The code has per-programme SQR section selections with a marked PQR subset.
- Placements are unbuilt.

**Matrix in the 3.7 card** (also referenced from 8.1); values are examples:

| Fact | Source | Collected from | Who sees it | Form field it fills |
|---|---|---|---|---|
| Representative's licence number | Selected representative's profile | Profile record; no client question | Staff working view | The representative form's licence field |
| Client A's previous application number | Old permit (document) or Client A's answer | Document read, confirmed by the agent; or the SQR | Staff; Client A under existing permissions | The application form's previous-application field |
| Firm administrative field (for example an internal file reference printed on a form) | The firm | Staff working view; left out of client questionnaires | Staff | The relevant form field |

Exception shown: Client A has no old permit to upload, so the SQR asks "Do you have a previous application number?"

### Update after question 4 (recorded as AIW-D236)

**Activity 4.2 becomes "Test against independent expected answers".**
- Representative cases: wrong person, missing field, repeated rows, conditional branches, formatting, changed instructions.
- Results are shown in three labelled columns: **proposed target** (with its business reason), **measured result**, **approved release criterion**.

**Activity 5.1** reviews every new or changed item during initial validation. Reused, approved, unchanged items are not reviewed again. Confidence never skips review.

**On a failure:** only the affected draft or capability is held for correction and re-testing. Approved, unaffected work stays usable. A step is switched off only for a stated reason.

**Change to an existing team requirement:** SA-1B-38 (no mandatory test sets) would change; this goes to the team as a proposal.

**Example in the 4.2 card:**

| Item | What happens | Result |
|---|---|---|
| Client A's own date-of-birth mapping on the application form | Approved earlier, unchanged | Reused; no new review |
| Partner's date-of-birth mapping on the family-information form | New | Reviewed in 5.1 |
| Wrong-person test: the partner's field resolves to Client A's value | Fails against the expected answer | That mapping is held; the rest of the package stays usable |
| Corrected mapping (subject = partner) | Re-tested | Passes; goes on to release |

**Example audit (outside the page):** activity → example location → what it shows → exception, or a one-line reason for no example (likely for 1.2 Run, 2.2 Split sources and 9.4 Government). The checker reads this audit. Browser tests add: the Example button works by keyboard, desktop, phone and touch, and after closing the card the map position and focus return as before.

## Open questions for the founder, one at a time

1. ~~Filling at case time~~ **Answered (AIW-D233):** saved maps; runtime AI tested once as the challenger.
2. ~~D174 against D231~~ **Answered (AIW-D234):** Expat Ready maps it first; urgent cases are completed by hand.
3. ~~Client-never-asked facts~~ **Answered (AIW-D235):** three tiers kept; "collected from" and visibility are separate from the tier.
4. ~~Per-step score bars~~ **Answered (AIW-D236):** evidence-based gates; review new or changed items; hold only what fails.

All four questions are answered. Nothing material is left open before execution. Questions that stay with the team or the specialist (SA-1B-38, SA-1B-35 is kept, TC-177 correction, immigration values) are carried as proposals on the page, not as founder questions.

Change log, 17 Oct 2026 (later): consolidated into `../../tools/s3/one-pager-draft-2-plan.md`; struck the answered filling question, the per-step bar wording, the 3,000px zoom canvas, "only the winner is described" and "earns little on the fill itself".
