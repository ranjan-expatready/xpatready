# Seven lenses for evaluating the Solution 1 one-pager

*Title until 18 October 2026: "Six lenses for evaluating the first usable one-pager". The founder added a seventh lens on 18 October 2026 (AIW-D244); see the section "Lens 7" below. Scores given under the six lenses before that date stay as historical assessments; no seventh score is invented for them.*

17 October 2026 · Independent review method, prepared at the founder's request. This is a proposed evaluation framework, not a new product decision or a verdict on a delivered draft. It supplements draft-2-evaluation-checklist.md; it does not require the maker to expand the one-pager into another artifact.

## Recommendation and purpose

Retain readability, completeness, solution quality, usability and honesty. Add **implementation feasibility** as a separate sixth lens: a coherent and attractive design may still rely on an unsupported form type, unavailable integration or unproven AI behaviour. Giving feasibility its own verdict prevents presentation quality from concealing that problem.

The artifact is an interactive solution blueprint with high-level orientation and medium-level behavioural requirements. It should let intended readers explain the journey and derive detailed requirements without inventing missing business behaviour. It need not contain every API, database column or production test case. Those are later elaborations, not excuses to omit essential conditions, authority or failure behaviour now.

There is no demonstrated universal competition rubric or guarantee of winning. This method adapts established guidance to this problem. It does not claim ISO certification, a formal ATAM engagement, exhaustive testing or independent human-panel approval.

## The six original judgments

| Lens | Central question | Evidence to inspect |
|---|---|---|
| **1. Solution quality** | Is this an effective, appropriately simple answer to the actual problem? | Problem-to-outcome fit; necessary components; correct process/data/authority relationships; substantive alternatives and their tradeoffs; human workload and maintenance implications. Ask what fails if each component is removed. Keep detailed comparison/history outside the main reading path. |
| **2. Completeness and precision** | Is the necessary behaviour covered and stated consistently enough to test? | Coverage from founder needs to activities, actors, records, rules, variants, exceptions and acceptance examples. Check exact trigger, prerequisites, output/readiness and receiving condition. A reader should not have to guess which person, form edition, rule or owner applies. |
| **3. Readability** | Can a new intended reader understand and explain the solution? | Clear problem/outcome; coherent overview and phases; explained terminology; sensible information hierarchy; concise detail; examples that make unfamiliar concepts concrete. Judge understanding, not word count alone. |
| **4. Usability** | Can readers find and use the explanation without losing their place? | Real browser/keyboard/phone use: locate an activity, open/switch detail, expand an example, follow a dependency and return. Check focus, selection, scrolling, legibility and colour-independent meaning. |
| **5. Honesty and transparency** | Can readers distinguish what is required, proposed, implemented, measured or unknown? | Exact supporting evidence; assumptions and capability limits; source versions; proposed targets versus measured results; limits of AI checks and human review. No inference that a working diagram proves a working AI product. |
| **6. Implementation feasibility** | Can the proposed behaviour realistically be built, tested and operated? | Per major capability: existing reusable support, concrete build gap, external dependency, proof needed and recovery route. Include supported form types, subject/repeat resolution, portal changes, review capacity, model/version changes, latency/cost drivers and relevant data-access boundaries. Avoid an invented delivery estimate. |

## Lens 7: functional language and consistency (founder, 18 October 2026, AIW-D244)

| Lens | Central question | Evidence to inspect |
|---|---|---|
| **7. Functional language and consistency** | Could two reasonable readers derive materially different behaviour from the words? | See the eight checks below, applied to the overview, diagrams, panels, rules, examples, exception paths and acceptance checks together. |

The eight checks:

1. **Precise statements.** Where it applies, each statement names the actor, the action, the object, the condition and the observable result.
2. **Complete at the intended level.** Statements are complete and unambiguous at high or medium level; they need not carry build detail.
3. **One term per thing.** Product and domain terms are used consistently. In particular, distinguish a **section**, a **field definition** (canonical field), a **person's value** (fact), a **mapping** (map entry), a **form** (one person's prepared form), a **case** and a **filing**.
4. **Plain business language.** Necessary technical terms are explained; vague phrases are replaced with precise words, not with more jargon.
5. **Consistent obligation and certainty.** Required versus optional, proposed versus agreed, and implemented versus unverified are worded the same way everywhere.
6. **Agreement across levels.** Overview, diagrams, panels, rules, examples, exception paths and acceptance checks agree. A summary may omit detail; it must not contradict it.
7. **Clear references and sequence.** No unexplained "it", "they", "latest", "complete" or "approved"; the order of steps in a story matches the process.
8. **Useful detail without repetition.** No sentence repeated in two places of one panel, and no heading forced onto content that does not need it.

**The test:** could two reasonable readers derive materially different behaviour? If yes, resolve the wording or state the ambiguity explicitly. **Language corrections must not silently change business decisions:** where a precise wording would change a decision, the change goes to the founder.

**How it relates to the other lenses.** Lens 2 asks whether the necessary behaviour is covered; lens 7 asks whether the words that state it are precise and consistent. Lens 3 asks whether a new reader understands; lens 7 asks whether two careful readers would agree. A language defect that changes behaviour is also a lens 2 defect; it is reported once, under the lens where its consequence is clearest, and cross-referenced.

**Historical scores.** Scores given before 18 October 2026 under six lenses (the integrated audit of page `401457aa…71af` and earlier maker and checker reviews) remain valid for their own revision and scope. They are not re-scored retrospectively on lens 7. The first lens 7 score is given on the corrected revision after the cohesion pass.

**Do not add categories for every subtopic.** Non-ambiguity, consistency, traceability and testability are explicit checks under lens 2. Examples support lenses 2–4. AI quality and controls span lenses 1, 5 and 6. Permission, reliability and change-handling issues are assessed where their consequences occur. A material issue cannot disappear merely because it spans categories.

## Why these are credible lenses

The references below support the review techniques, not a claim that they prescribe these six categories or certify this artifact.

| Established reference | Relevant application here |
|---|---|
| [NASA requirements checklist, Appendix C](https://www.nasa.gov/reference/appendix-c-how-to-write-a-good-requirement/), especially C.4 | Examine clarity, consistency, traceability, feasibility and verifiability. Adapt the requirements checks to this software blueprint; do not import unrelated aerospace paperwork. |
| [SEI Architecture Tradeoff Analysis Method](https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/) | Examine consequential design choices using business goals, quality scenarios and tradeoffs. This is a lightweight application of the ideas, not a formal ATAM assessment. |
| [SEI Active Reviews for Intermediate Designs](https://www.sei.cmu.edu/library/active-reviews-for-intermediate-designs/) | This is particularly relevant to a design that is not yet a detailed specification: ask intended consumers to work through scenarios and expose missing understanding. |
| [OMG BPMN 2.0.2](https://www.omg.org/spec/BPMN/2.0.2), especially sections 7.6 and 9.4 | Check that process symbols and connections convey correct meaning. Correct notation is necessary for a BPMN claim; it does not establish a good business solution. |
| [ISO 9241-11 public overview](https://committee.iso.org/standard/63500.html) and [W3C WCAG 2.2 guidance](https://www.w3.org/WAI/WCAG22/Understanding/) | Evaluate usability through actual use and check relevant accessibility behaviour. The public ISO overview was reviewed, not the paid full standard; no full conformance claim is made. |
| [NIST AI RMF trustworthiness](https://airc.nist.gov/airmf-resources/airmf/3-sec-characteristics/) and [AI RMF Core, Measure](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) | Require context-specific evidence, representative evaluation, stated limitations and meaningful oversight. A checker model or a human approval is a control to evaluate, not proof of error-free results. The cited RMF 1.0 material notes that a revision is in progress. |

## How we evaluate without creating bureaucracy

**First, check the requirements we actually intended.** Use one compact review matrix: founder need → activity/record/rule → acceptance example → evidence or open gap. This is separate from the preservation ledger. Preserving old content is not proof that the original need was correctly solved. Check the original need and the current decisions, including amendments.

**Then walk the real journey.** Review setup/release, family case/filling and change handling. Deliberately introduce wrong-person facts, missing data, uncertain mappings, duplicate candidates, unsupported forms and failed validation. Record the expected owner, next state, recovery and impact on dependent work. Include case variations that change behaviour, not every mathematical combination of labels.

**Finally ask readers to use it.** Use the role questions below. The reviewer may inspect each role's concerns, but that is not equivalent to feedback from six independent people. Do not create extra agent sessions or ask the founder to organise a panel merely to finish this review. Record human comprehension as unverified until actual intended readers have tried it; use available founder/team feedback when provided.

| Reader perspective | Task using only the artifact and its explanations |
|---|---|
| Founder or new business reader | Explain the problem, chosen solution and setup-to-filing journey; distinguish AI work from human authority. |
| Product/domain reviewer | Resolve an applicability or document-rule example and identify which source or specialist confirmation it depends on. |
| Developer/architect | Explain how one spouse fact reaches two form copies; identify the source record, relationship, version, handoff and unresolved implementation gap. |
| QA reviewer | Derive happy, failure and boundary checks for a mapping/validation activity, with an observable expected result. |
| AI engineer | Identify AI inputs and outputs, allowed actions, grounding, uncertainty handling, evaluation examples and what happens after model/source changes. |
| UX/accessibility reviewer | Find the example, switch activities and return to the same process position using keyboard and a narrow screen. |

For a small comprehension trial, give a new reader the overview and selected tasks, record correct answers, misunderstandings, time spent finding information and help needed. Ask them to explain the behaviour back. The existing ten-minute orientation ambition is a proposed task target, not a proven comprehension rate. Do not coach an answer and then count it as unaided success. Evaluate the document, not the reader's intelligence.

## Appropriate depth: one concrete test

“AI maps the fields and the agent checks” is too vague. For the mapping activity, a developer and QA reader should be able to determine the destination form edition/field, source subject/relationship and fact, unresolved-match state, reviewer action, release prerequisite and expected wrong-person failure behaviour. The current decisions supply the intended behaviour; the card must make it understandable.

That is medium-level behavioural precision. It does not require final database design or production integration code in the card. If two reasonable readers derive materially different behaviour, record an ambiguity finding. If they can derive a testable detailed requirement without inventing a new business decision, the depth is suitable.

## Verdict and limits

Use **Pass / Partial / Fail / Not verified**, supported by artifact locations or observed results. If a 1–10 score is requested, explain it per lens; do not interpret it as a percentage probability or average away a critical flaw. Keep the project's three existing headline assessments visible: solution quality, communication (readability/usability), and requirements (completeness/precision), with feasibility and honesty explicitly reported alongside them.

Material defects include contradictory rules, missing necessary handoffs/authority, wrong-person resolution, infeasible dependencies represented as proven, or inability to access necessary detail. They prevent an unconditional fit-for-purpose verdict. Minor refinements remain visible without triggering a rewrite of working content. A pending measurement is not itself a failed blueprint, provided the design's dependence on that evidence and the consequence of failure are explicit.

The review output should be short: seven judgments (six before 18 October 2026), material findings with exact locations and smallest fixes, important unverified claims, and a verdict **for high/medium-level solution alignment**. It must not imply that the document is a complete build contract or that production accuracy is established.

Do not promise 100% certainty, universal understanding or best-in-class superiority from an expert score. We can demonstrate declared requirement coverage and observed reader/task performance. Claims of superior solution performance require comparable alternatives and actual evidence. No draft has been evaluated under this framework yet.

Change log, 17 October 2026: grounded the existing review approach in public primary guidance; added implementation feasibility as a distinct lens; made traceability and reader-task evidence explicit while retaining the existing practical checklist.

Change log, 18 October 2026: the founder added a seventh lens, functional language and consistency (AIW-D244). The six original lenses, their references and the reader tasks are unchanged; earlier six-lens scores stay as historical assessments for their own revision.
