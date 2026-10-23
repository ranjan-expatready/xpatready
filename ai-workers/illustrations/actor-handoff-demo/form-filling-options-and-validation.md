# Form filling: runtime interpretation, reusable bindings and validation

17 October 2026 · Proposal for validation with the Lead · No implementation authorised yet

## Decision rule from the founder

Prefer runtime AI if it makes the complete workflow substantially simpler. If AI-generated reusable mappings are comparably simple, prefer their lower repeated inference and review burden. The founder's 90% figure is a hypothesis about draft accuracy, not a measured result or a release threshold. Compare complete forms, omissions and human correction time, not just the percentage of populated fields that look right.

The founder proposes AI interpreting the destination form and meaningful backend fields, an independent adverse AI check, then human approval. This is a credible candidate to evaluate. There is no measured failure rate for that approach on this project's forms, so the review does not assert that it will fail or that a stored map will automatically be more accurate.

## What “mapping” actually means

Two questions were previously mixed together:

1. Which person's fact belongs in a particular input?
2. How does software address that input and write the required representation?

Recognising a sponsor form can correctly establish a default subject. It does not necessarily settle an input asking about a spouse, dependent, representative, previous address or another time period. Meaningful backend names help interpretation, but subject identity, purpose and date context must also be available. The model would receive an authorised field dictionary, role relationships and case values as context; a separate training exercise for each client is not implied.

The logical correspondence between a value and its destination is unavoidable. **A separate persistent mapping catalogue is a design choice.** An AI could infer that correspondence during each run, or generate it once for reuse. Our own PQR/SQR/working views, generated from canonical field identifiers, already have bindings and need no extra government-form mapping just to display those values.

“Box address” should be removed from reader-facing language. Use **form field mapping** for a reusable binding, or **field assignment** for what the AI chose during a particular fill. Do not invent an address service. Do not describe either approach as a person configuring every field manually.

## Concrete targets by form type

| Destination | Possible target reference | Qualification |
|---|---|---|
| Standard fillable PDF / AcroForm | The actual fully qualified field name extracted from that edition. | Field names can be technical or opaque. Read them from the file; do not invent names or assume stability across editions. [PDF-LIB field API](https://pdf-lib.js.org/docs/api/classes/pdffield). |
| Dynamic XFA PDF, including a supported barcode form | An XFA field/data binding or Scripting Object Model path, with repeated instance context where needed. | Needs a compatible reader/filler. It is not an HTML DOM identifier. Adobe documents name, index and SOM expressions; this does not prove this project's adapter supports them. [Adobe scripting reference](https://experienceleague.adobe.com/en/docs/experience-manager-65/content/forms/html5-forms/scripting-support). |
| Flat/scanned PDF | An identified output location and rendered layout, if that output route is acceptable. | May have no interactive field identifiers. Vision/OCR can help discover labels and locations; a coordinate overlay does not recreate hidden form logic. Treat this as a separate supported route, not an AcroForm. |
| Government web form | An available stable field attribute, or accessible label/role scoped to the correct section and repeated subject. | An HTML ID is not guaranteed or permanently stable. Do not rely blindly on generated IDs or “third input.” Verify the route, branch and screen structure; re-read the actual entered value. [Playwright locator guidance](https://playwright.dev/docs/locators). |

A screenshot can help interpret meaning and layout. One screenshot does not expose all hidden conditions, scripts, option values, dynamic rows or later pages. Prefer actual structure when available, combined with visual context. Runtime visual filling can remain a candidate where that materially simplifies supported interaction.

Example binding, with no invented IRCC identifier: **the actual input labelled Date of birth in Sponsor details, on this exact form edition → the sponsor's person record → canonical date-of-birth field → the date format this target requires**. If the target requests another person's date, select that subject explicitly. A form input's technical name is discovered during the real read, not guessed from this explanation.

## What the current code actually establishes

Newest inspected backend capture: `code/ERv2-sanitized@b48e4ce-2026-10-15`.

- `apps/api/src/pack-authoring/pdf-acroform-inventory.ts`, lines 153 and 180–189, reads `getFields()`, then stores `name: field.getName()`, type, `required: field.isRequired()`, maximum length and options. These are real field references, not a proposed screenshot-only inventory.
- The same file, lines 141–150 and 167–176, rejects XFA and active content. Thus this existing parser is not evidence that the proposed reader already understands all embedded validation scripts or dynamic forms. Do not remove those checks as a shortcut; a supported route needs a concrete design and proof.
- `apps/api/src/spine/filler.service.ts`, lines 102–109, pairs `entry.formFieldId` with `entry.canonicalFieldKey` and resolves values into a target-keyed result. That method produces a canonical JSON payload; it should not be described as writing PDF bytes itself.
- `apps/api/src/spine/pdf-form.adapter.ts`, lines 158–178, writes supported PDF inputs by their field names. Lines 208–218 reuse the inventory reader and compare the template inventory. It supports a concrete AcroForm leg, not all PDF and portal types.
- The adapter's opening contract pins metadata and stable write order for byte-identical output with identical supported inputs. Preserve that bounded capability; do not generalise it to every proposed route without evidence. Format transforms are expressly deferred in the code's opening scope comment.

No real IRCC field-name inventory was available in `tools/s3/real-read/` during this review. No claim here identifies a real sponsor form's actual field name. Extracting one is part of the already planned real-read proof, after the one-pager is aligned.

## Fair comparison

| Option | What it simplifies | What remains to solve |
|---|---|---|
| Runtime semantic/visual AI → checks → human | Can infer new form meanings without a separately pre-approved reusable mapping for every supported form. | Still needs accurate target interaction, subject selection, source trace, missing-field detection, validation and a review interface. Repeated inference and correction cost must be measured. |
| AI generates and reviews reusable bindings → rules fill cases → human | Reuses the interpretation for many cases; the current code already contains basic binding and fill concepts. No repeated manual mapping task is required. | Must correctly read supported editions, review generated bindings, handle source changes, and resolve each subject/purpose. A wrong saved binding can repeat an error, so review and regression matter. |
| Structure + vision for interpretation; reuse known bindings and interpret unmatched/changed targets | May combine stable filling with flexibility for new or poorly structured forms. | Avoid building two full engines. Escalation and support boundaries must be clear; this becomes over-engineering if it adds more orchestration than it saves. |

Working recommendation: start with the existing binding/fill model as the simplest baseline, not a new mapping platform. Test a runtime interpretation alternative on the same examples. Do not lock the runtime winner on intuition or require both engines in production. The proof should decide whether the runtime alternative's simplicity outweighs its review and maintenance cost.

The one-pager currently says “No AI at fill time.” Runtime semantic filling would be a proposed change to that design and must be discussed explicitly. It is not a change to the separate decision that only Expat Ready runs configuration generation.

## Maker, checks, independent AI check, human

This is **product form preparation**, distinct from the Claude Lead and Cowork checker who review documentation.

Proposed product sequence:

1. The maker receives the destination edition or portal branch, permitted confirmed facts, subject relationships and applicable approved rules. It proposes field assignments and prepares a draft; missing information remains missing. Retain which source fact supplied each populated input.
2. Repeatable checks verify target existence, supported type, required inputs, values/options, format and overflow. Apply the approved document and cross-field checks. Re-read the produced PDF or web values; a plan to write is not proof of the actual result.
3. An independent AI checker uses a fresh context with the actual prepared output, authoritative facts and instructions. It independently identifies expected values and omissions, then compares. Do not ask it merely whether the maker's explanation sounds convincing. It reports issues; it does not silently amend or approve the form.
4. The maker can correct findings and rerun affected checks. Unresolved material disagreements go to staff; do not let models loop until they agree. A bounded correction policy must be specified for the trial.
5. The human sees the prepared form, subject, source values, remaining findings and evidence, and performs the required approval/signing/submission actions. AI checks do not replace the required human authority.

A different model may add useful diversity, but it is not automatically independent evidence; models can share mistakes. Evaluate whether the checker detects deliberately seeded wrong-person values, missing fields, stale facts, truncation and wrong option selections. A prompt saying “best in class” is not a substitute for these tests.

## Validation: partly present, incompletely specified

The current page already mentions field limits/scripts at 2.1, validation at 3.1 and 3.7, and native form validation at 9.2. It would be inaccurate to say validation is wholly missing. What is missing is an explicit account of AI generating and checking the complete supported validation specification, including document timing and additional consistency checks.

Use the existing rules and validation records wherever possible. Do not add a second validation engine merely because AI drafts the rules.

| Validation group | Examples | Evidence and authority |
|---|---|---|
| Form-native | Required inputs, conditional required fields, allowed options, date/length restrictions, repeat limits, calculations and native validation. | Read actual metadata/scripts and official instructions for the supported edition; use the form's own validation where required. Unread portions remain unresolved. |
| Official programme/document | When a document is needed; whose document; freshness, expiry and validity at the relevant event; permitted substitutes. | Scope to the programme, country, subject, source version and relevant event. Immigration values require specialist confirmation. |
| Cross-record consistency | Declared date versus passport date; sponsor/subject identity; issue date before expiry; chronology and coverage gaps. | Distinguish an objective contradiction from an allowed variation needing review. Do not silently choose a conflicting value. |
| Advisory readiness | A document approaching expiry or travel validity shorter than planned. | Keep warning versus blocking behaviour explicit and approved. A model cannot turn a precaution into an eligibility restriction. |
| Output/readback | Filled value matches intended fact; correct option code; no silent truncation; right repeated instance; expected native validation result. | Inspect the actual output, not just the maker's proposed assignments. |

Each generated check needs its applicability, inputs, condition, severity, source/reason, review authority, evaluation time, user action and test examples. Distinguish form-entry checks from checks relative to a planned submission date; re-evaluate time-sensitive results before submission and after relevant fact/source changes. If date arithmetic or another needed operation is absent from the current rule language, record the specific gap instead of pretending it is supported.

### Small shared checklist for the AI drafter/checker

Proposed categories to reuse in the prompt, without inventing universal immigration thresholds:

1. Required and conditionally required inputs are complete for the actual subject.
2. Values use the target's allowed type, format, length and options.
3. The source person, organisation, relationship and form-copy context are correct.
4. Birth, issue, expiry and event dates are valid and chronologically consistent where applicable.
5. Document freshness and duration are evaluated against the correct official event and programme rule.
6. Declared answers and document evidence conflicts are visible and unresolved values are not guessed.
7. Repeating histories include required entries and any source-backed coverage/explanation requirement.
8. Documentary requirements, substitutes and subject applicability are satisfied or clearly outstanding.
9. Output values, repeated rows and option encodings match the approved facts without truncation.
10. Changed facts, source editions and dates trigger the appropriate recheck and approval withdrawal.
11. Missing or ambiguous rule inputs produce an unresolved result, not a fabricated pass/fail.
12. Every proposed error or warning explains its source/reason and the corrective action.

### Six-month examples: scope matters

Current [IRCC Express Entry police certificate guidance](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/police-certificates.html), page dated 16 October 2026, distinguishes current-residence countries from other countries: current-residence certificates have a six-month pre-submission issue window; other-country certificates are linked to the last qualifying stay, and some expired certificates can be accepted. Therefore “every police certificate must be less than six months old” is not a universal rule.

[IRCC passport guidance](https://www.canada.ca/en/immigration-refugees-citizenship/services/passport-travel-document.html) recommends renewal within six months of expiry for Express Entry, while temporary permit duration is limited by passport expiry. Those do not establish a universal six-month hard stop for every form.

IRCC's [barcode instructions](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=1523) require the form's native Validate step for those forms. A screenshot-only appearance is not a replacement. Its [validation help](https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=767&top=23) also describes mandatory-input and date checks, confirming that the native checks are substantive.

Immigration values remain subject to the specialist's confirmation (AIW-D50). Legal interpretation: **Unconfirmed: no counsel (AIW-D94).**

Current product-policy evidence: SA-01B v1.4 §3.4, SA-1B-23 says “expiry only warns” and “ExpatReady warns, it does not block.” AI must not silently convert an expiry warning into a submission block. If a distinct official programme-readiness check or a policy change is proposed, identify and validate it separately with the founder and specialist.

## What must be resolved before implementation

### Review priority and grey/red/amber/green results

The founder also requests deeper AI and human attention for higher-risk fields, with every field covered by human approval. This applies to reviewing a prepared form, not a change to which configuration-library items require review.

Keep the design small: use the existing form-check view, canonical field significance flags, findings and approval records. Avoid a new risk engine or a numeric score presented as scientific confidence.

Two meanings must remain distinct:

- **Review priority:** high or standard, based on material impact and the existing immigration-significant flag where applicable. Identity, subject selection or a value driving an eligibility condition may warrant high priority. A successful automated check does not make an intrinsically important field unimportant. The precise classification is a proposal to validate with product and the specialist.
- **Check result:** grey, red, amber or green, paired with a text label and a concrete reason. This is separate from human approval state.

| Colour and label | Meaning | Proposed review behaviour |
|---|---|---|
| Grey · Not checked | Evaluation has not run, input is missing or the result is unresolved. | Do not infer a pass. Resolve what is required before the applicable readiness check can pass. “Not applicable” must be an explicit rule/result, not silently conflated with unchecked. |
| Red · Material issue | An identified wrong subject/value, failed required/native check, or another material discrepancy. | Show source and actual output together. Require correction or the authorised resolution under the existing policy, then recheck; route disputed findings to the human. Colour alone does not create a new policy block. |
| Amber · Review needed | Ambiguous interpretation, a warning or a result needing closer review. | Independent targeted check and explicit human attention. An expiry warning remains a warning under current policy; AI cannot promote it to a submission block. |
| Green · Checks passed | Applicable checks completed without a detected issue. | Still included in human form approval. Green is neither human approval nor a guarantee that the fact or assignment is correct. High-priority green fields still receive the required focused review. |

Order the review by red findings, unresolved grey requirements, amber findings and high-priority fields, then the remaining fields. Keep the original government-form order available for the final read-through; risk sorting is a review aid rather than a change to form layout.

For high-priority or disputed items, one additional targeted independent AI check should verify the subject, source fact, actual target value, applicable rule and any omission. Repeating the same prompt several times is not automatically independent checking. Use a fresh context and report unresolved disagreement; do not loop models until a green result appears.

All fields remain covered by the human's approval of the exact prepared form. The simplest proposed interaction is focused resolution/acknowledgement for red/amber/high-priority items, then approval of the full form. Do not assume the founder requested hundreds of separate approval clicks; validate that detail before implementing it. Preserve the existing version-bound approval and re-open affected review when data changes.

Acceptance examples for the eventual design: a green high-priority identity field is still surfaced for focused review; an unchecked field is never green; a material wrong-person value shows source and output with a correction route; an expiry warning stays advisory; and changing an approved value withdraws the affected approval. No colour may be the only way to understand the result.

### Remaining validation decisions

- Confirm the smallest supported path per format, with actual PDF names or web targets extracted rather than invented.
- Compare the current simple binding baseline with runtime AI on the same independent answer key, including wrong-person, omission and date-boundary cases.
- Measure raw draft correctness, checker detection, errors remaining after checking, complete-form correctness, human correction time, run cost and latency. Human approval alone is not a measured detection rate.
- Decide whether known interpretations are reused or inferred again, based on the founder's simplicity rule and observed burden.
- Agree validation scope and warning/blocking behaviour; preserve existing product policies until a change is explicitly approved.
- Put the chosen behaviour into the first one-pager's activities and detail panels before building other artifacts. Screenshots as documentation and product prototyping remain deferred; evaluating vision as a future filling mechanism is a separate question.

The Lead's next response should validate or challenge these points and propose the smallest complete design. It should not implement either alternative yet.
