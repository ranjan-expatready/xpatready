# One-pager draft 2: independent audit

17 October 2026, 13:56 UTC · Independent reviewer (a separate Claude session, the Cowork reviewer). This review takes over from the Codex reviewer, which stopped at 12:05 UTC when its credit ran out. Codex had started this audit, but its two helper reviewers failed at once on the usage limit, so it produced no findings and saved nothing.

**What was reviewed:**
- `problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html` (sha256 `c69c11168d730251…`).
- Its source, `tools/s3/s3_data.py` (sha256 `83d87d42da2086f9…`), and `s3_views.py`.
- The plan, the preservation ledger, decisions D229–D236 and the Lead's validation response.

**How it was judged:** with `evaluation-framework-2026-10-17.md` (six lenses) and `draft-2-evaluation-checklist.md`, plus the founder's three tests.

**How the findings were checked:**
- I tested the page myself in Chromium at 1440, 1280, 768 and 375 px. I did not rely on the Lead's 60/60 report.
- A second, separate agent then checked every finding against the files and found two more. It confirmed eight findings outright, confirmed eight with corrections, and rejected none. The corrections are folded in below.

This is a review aid. It does not amend `decisions.md`, and it does not authorise anything beyond the Lead's existing procedure.

## 1. Verdict

**PASS WITH FIXES: 7 Material, 11 Minor.**

Draft 2 is a real step up. It is a genuine BPMN collaboration with four pools, readable phase views at full size, and an inspector that works as the founder asked. It has 39 activity cards, each covering all ten requirement groups with concrete Client A examples. Its honesty labelling is careful.

The Material findings are not presentation problems. They are behaviour gaps: places where a developer or QA reader would have to invent the answer. Most are small, local fixes, about one activity, one gateway or one rule each.

### The founder's three tests

Scores are review judgements, not measurements. The "after fixes" column assumes all Material findings and the marked Minor ones are fixed. 9 or more needs the real read (D229).

| Test | Lead's own score | Reviewer now | After fixes | Why |
|---|---|---|---|---|
| Best solution | 7 | **7.5** | **8.5** | The design is coherent and simple. Two gaps sit at the edges of the core flow:<br>• A form outside the package, and a mapping release reaching a pinned case, contradict each other.<br>• Validation drafting is under-specified. |
| Best communication | 7 | **7.5** | **8.5–9** | The overview, views and inspector are excellent. Phone navigation is badly obstructed. Length is not the problem. |
| Best requirements (judged at the blueprint's intended high-to-mid level) | 5 | **7** | **8.5** | The ten groups per card, acceptance examples, build gaps and proposed team changes are strong. Five handoffs have no owner or path.<br>The Lead's 5 judged it against the detailed pack; that is the wrong yardstick for this artifact. |

### The six lenses

| Lens | Result | Note |
|---|---|---|
| 1. Solution quality | Partial (strong) | M1, M2, M3 |
| 2. Completeness and precision | Partial | M3, M4, M5, M6 and the Minor findings |
| 3. Readability | Pass | Length is justified (§5) |
| 4. Usability | Partial | M7 |
| 5. Honesty and transparency | Pass | One wording slip, m6 |
| 6. Implementation feasibility | Partial, and honestly so | Build gaps are listed with code evidence. Proof is pending the real read. Model-change control is missing (m5). |

## 2. What is strong: keep it

- **Two processes, linked through a shared record.** Setup releases a package that cases *read*; it is not drawn as a handoff. This was the central correction the review asked for.
- **Correct notation.** Sequence flows stay inside a pool and message flows cross between pools. Inclusive and event-based gateways are used where they belong. The form-copy pool runs once per copy.
- **The "no manual mapping" answer line.** It states the founder's point exactly: the engine selects library sections and fields, creates new ones only when none fits, and writes the mappings as data.
- **Mapping resolution.** Each mapping resolves the person, relationship, canonical field, purpose and row. The 3.2 example ("same label, three people") and the 8.2 example (one value fills two copies) are the clearest explanation of mapping produced so far.
- **Two kinds of check.** The "two kinds of check" table separates read-back from meaning. The 8.3 example (read-back passes, the meaning check flags) makes the point unmistakable.
- **D236 is applied throughout.** Every new or changed item is reviewed, unchanged items are reused, and a failure holds dependents.
- **The inspector works.** I tested it myself:
  - it opens beside the map and keeps your place;
  - the Example opens inside the card;
  - Escape returns focus to the eye button;
  - on a phone it is a bottom sheet.
- **Honesty.**
  - Every proposal is labelled.
  - "Nothing is measured yet" appears, and the evidence table has three separate columns.
  - Build gaps cite exact code lines.
  - Proposed changes to SA-1B-7, 27 and 38 are listed.
- **Preservation.** The 110 rules are dispositioned with reasons, and the four removals each name their replacement.

## 3. Material findings

### M1. A form outside the released package has no stated way onto a case, and it enters setup through the wrong door

**Where:**
- 7.1 actions, "The rules decide each person's forms and documents".
- 8.2, "Rules decide which copies exist".
- 4.1: an unmapped required field blocks release.
- The 8.2 and 8.5 examples ("rare employer form with no released mapping").
- The 1.1 trigger.

**Problem:**
- A released package always has mappings for its own forms, so "Not yet supported" (D234) can only arise for a form *not* in the package. No activity says how such a form gets onto a case, or who may add it.
- The Expat Ready side then starts at 1.1, "Create the combination row". But mappings are per form edition and shared across combinations (D233, 3.2).

**Consequence:** a developer cannot build the trigger, and the diagram contradicts the per-edition mapping model.

**Smallest fix:**
1. Name the sources, for example:
   - an officer requests a form (recorded in 9.6);
   - the agent adds a form the package does not list, for a stated reason;
   - a new government edition must be used before Expat Ready has released it.
2. Give the "add a form to this case" action an owner and authority.
3. Route Expat Ready's side to a form-edition path: 1.3 "changed sources only", then 2.1 → 3.1 → 3.2 → view 3 → release. Use 1.1 only when a combination's lines must change.

### M2. A released mapping cannot reach a case that is pinned to its version

**Where:**
- 8.5 ret: "If Expat Ready releases the mapping first, the copy fills automatically".
- 8.2 trigger: "or its mapping was released".
- View 5: "Mapping released" → "Re-render".
- 5.3: "waiting copies are told their form is supported".

**Against:**
- Controls › Versions: "A case pins the version it opened on".
- 10.3: "A case keeps its version until a person adopts".

**Problem:** the page contradicts itself. Releasing a mapping makes a new version, and the waiting case is pinned to the old one. *(Found by the independent check.)*

**Smallest fix:** state one rule, for example:

> A newly released mapping for a form the case has marked "not yet supported" is attached to that waiting copy without re-pinning the rest of the case; no other item of the case changes version.

The alternative is to route the copy through 10.3 adoption. Either way, add an acceptance example.

### M3. A reported wrong mapping has no receiver at Expat Ready

**Where:**
- The 8.4 rule: "A wrong mapping goes to Expat Ready; the copy waits for the corrected release".
- The view 5 message "Not yet supported or mapping flag".

**Problem:** on the setup side, only "Form not yet supported" (view 1) and "Scheduled check" (view 7) start anything. No step receives, triages, corrects and re-releases a reported mapping. *(Found by the independent check.)*

**Consequence:** this is a missing handoff on the exact error the design worries about most, a wrong-person mapping found in the field.

**Smallest fix:**
1. Add a message start "Mapping reported wrong" in the setup pool. It goes to a short correction path: hold the mapping and its dependents (4.4), re-draft in 3.2, then view 3 review and release.
2. State that other cases using the same mapping are listed in the impact report, because a wrong mapping repeats.
3. Add an example.

### M4. AI-drafted validation is not a visible, owned step

**Where:**
- One action bullet in 3.7: "Attach validations, allowed values and character limits".
- The one-line Validation control strip.

**Problem:**
- The founder called validation "a very, very important point". He asked for:
  - the form's own checks;
  - document rules;
  - additional smart checks, with his examples of a passport expiring soon and a police certificate's age.
- The reviewer's earlier note (`form-filling-options-and-validation.md`, "Validation: partly present, incompletely specified") set out five groups to carry into the activities. These did not land as a step:
  - form-native;
  - official programme and document rules;
  - cross-record consistency;
  - advisory readiness;
  - output read-back.
- What is covered: an answer conflicting with a document (7.3), and both names on a shared lease (3.3).
- What is missing:
  - checks *between different facts*, such as date of birth before passport issue, chronology, and address against the lease;
  - when time-sensitive checks are re-run;
  - an example.
- Symptom: in the 9.3 example the representative finds the lease/address mismatch by eye.

**Smallest fix:** add activity **3.8, "Draft field and consistency checks"**, in view 2, or expand 3.7.

- Cover the five groups. Each check carries:
  - applicability;
  - inputs;
  - condition;
  - severity (block, warn or advise);
  - source;
  - when it is evaluated;
  - the user's action.
- Keep D-level policy: expiry warns and never blocks (SA-1B-23), and history gaps block until explained (SA-1B-15).
- Re-evaluate time-sensitive checks before 9.4 and 9.5.
- Example table for Client A:

| Check | Group | Result |
|---|---|---|
| Date of birth before passport issue date | cross-record | pass |
| Partner's passport expires in 70 days | advisory | amber warning, not a block |
| Police certificate age | official document rule | value **pending the specialist**; no invented threshold |
| Lease address against the SQR address | cross-record | flag before the representative sees it |

- A check the rule language cannot express is a named gap.
- Add these checks to the 4.3 test cases.

### M5. A read-back mismatch has no owner or path

**Where:** 9.1 ret, "A mismatch or refused value holds this copy".

**Problem:**
- In view 5, 9.1 leads only to "Type by hand or validate?".
- Refused values have a route (the type-by-hand list). A *mismatch* has none: no owner, no next step, no branch.

**Smallest fix:**
1. Add a "Read-back mismatch" branch: the copy is held and its field turns red in 8.4.
2. The agent classifies the cause:
   - a format or transform problem is a mapping flag to Expat Ready (M3);
   - a field that refuses written data goes on the type-by-hand list.
3. Add one acceptance example.

### M6. No return path when a signatory finds a wrong value at signing

**Where:** 9.4 ret covers only "A signatory is unavailable". In view 6, 9.4 goes straight to 9.5, and the "Fact to correct" catch sits only before 9.4.

**Problem:** signing is the client's last look at their own facts, so a dispute here is a common real-world exception.

**Smallest fix:**
1. Add a gateway after 9.4: "Signatory reports an error" → 8.1.
2. The fact is corrected, approvals are withdrawn, the copy re-renders, it is re-approved and re-signed.
3. Add one acceptance example.

### M7. Navigation covers the page on phones and hides headings everywhere

**Measured in Chromium:**

| Width | Sticky nav height | Effect |
|---|---|---|
| 375 px | 279 px | 38% of a 740 px screen covered permanently |
| 768 px | 145 px | |
| 1280 px | 78 px | |

- `scroll-margin-top` is 0. After a jump to `#view-v5`, the view heading sits at 13–35 px, under the nav, **at every width**.
- The Lead's 60 browser checks did not test this.

**Smallest fix:**
1. Below 1,000 px, collapse the nav to one row: a "Jump to" select, or a single sideways-scrolling strip of about 44 px.
2. Set `scroll-margin-top` to the nav height.
3. Add two browser checks:
   - after a jump, the heading is below the nav;
   - the nav is no more than 15% of the viewport height.

## 4. Minor findings

| # | Where | Finding | Smallest fix |
|---|---|---|---|
| m1 | 3.2 ready state | "A mapping, a 'collected from' source or an explicit 'not filled' mark" treats 'collected from' (a placement setting, 3.4) as an alternative to a mapping. D235 says profile facts resolve through the mapping's subject, so every filled form field still has a mapping. | Reword it to: "every field has a mapping (its subject may be a profile record) or an explicit 'not filled' mark." |
| m2 | View 3; 5.1 trigger | Any failed check sends the whole draft back to view 2 before review, so review of unaffected items cannot start. 4.4 says "keep every unaffected item's review". | Either let 5.1 proceed on unaffected items while held items rework, or state that review starts on a clean report and why. |
| m3 | View 5 header | "Starts: … or Expat Ready releases its mapping". The diagram correctly has one start; mapping release is an intermediate catch. | Fix the header wording only. |
| m4 | View 5 event gateway | A copy waiting for a mapping shows no age. D234 promises no turnaround, which is fine, but nobody sees how long it has waited. | Show "waiting since" on the copy and in the agent's list. Do not claim the wait is bounded. The Lead's chat summary said it "never waits for ever"; the page does not, so keep it that way. |
| m5 | 1.3, 7.3, 8.3, Controls › Versions | Model and prompt versions are logged, but changing them does not trigger re-testing. 7.3 and 8.3 run at case time. | Add a rule: a change of AI model or prompt for any AI step is a change. That step is re-run against the expected answers before use, and the result is recorded. |
| m6 | 7.3 only | "Canada or the US only, under no-training and no-retention terms" appears only at 7.3. It is also weaker than D147, which says "zero-data-retention … with client notice". | State the D147 terms once in Controls, applying to every AI step (drafting, 7.3, 8.3), including client notice. |
| m7 | Cards; client lane | There is no corporate example in any card. The client lane reads "and family members". The case-types table and the 7.1 rule do cover corporate. | Add one employer exception example in 7.1: the employer as subject, a worker's linked case, the employer's signatory. Name "or employer" in the lane label. |
| m8 | 8.4 colour rule | "Grey: not applicable or empty" could be read as "fine". | Say grey means "no check applies or not yet checked; not reviewed". |
| m9 | MEASURES scope | Lists IMM 5707 only, while 1.1 says "5707 or 5645, pending the specialist". It matches D229. | Add "(or IMM 5645 if the specialist so decides)". |
| m10 | 4.3 | One family per rule branch. Rule *interactions* are where errors hide. | Add one combined test family, for example common-law, a child, and the inside/outside Canada form swap. Client A already covers two of the three. |
| m11 | 4.3 | The answer key is "written by hand and signed by the specialist", but reuse is not stated. Specialist workload could scale with combinations, which is a feasibility risk. | State that expected answers are kept per form edition and rule branch and reused across combinations. Show the specialist's workload as a measure to be taken. |

## 5. The Lead's stated limitations, assessed

| Lead's limitation | Assessment |
|---|---|
| Nothing proven on real forms; IMM 5645 or 5707 open | **Agree.** This is not a defect of the blueprint. It is the next step (D229), and the page states it honestly. |
| Some content is the Lead's proposal (AI meaning checker, "collected from", the alert, release waiting for held items, screen names) | **Agree.** Each is tagged. None conflicts with a decision. The founder can confirm them when he reads the page. |
| Two BPMN simplifications ("every copy approved" as one wait; the copy pool as one process run per copy) | **Accept both.** A multi-instance participant is valid BPMN, not a simplification. The single "every copy approved" event behind an event-based gateway with two outcomes is a reasonable abstraction. A one-line note in the key is enough. |
| Visible main path of about 2,500 words, over the 2,000 guide | **Not a problem; do not cut.** The founder accepted length where it carries value, and it does here: the extra words are tables (records, case types, evidence, gaps) a developer needs. What actually hurts reading is M7, not word count. |
| Browser checks only in headless Chrome; no Safari, Firefox or real phone; screen readers use the list; diagrams stay white in dark mode | **Agree, and it matters.** My own Chromium checks found M7, which those checks missed. Safari and a real phone are still untested; the founder should open it once on his phone. White diagrams in dark mode: accept for now. |
| TC-177 and CN-SA-01B change 9 still describe a fourth "staff-only" tier | **Agree.** This is outside the one-pager, but D235 requires the correction before either is sent. The Lead owns it. |

## 6. What lifts the scores to 8.5 or above, and to 9 or above

- **To about 8.5 on all three tests:**
  - fix M1–M7;
  - fix m1, m2, m5, m6, m7 and m11;
  - re-run the build and browser checks, adding the new checks in M7.
- **To 9 or above:** the real read (D229). That means:
  - real field inventories for the four forms;
  - a hand-checked answer key;
  - measured matching, with wrong-person cases;
  - the runtime-AI challenger on the same key;
  - the numbers written into `MEASURES`.

  No blueprint wording can substitute for that evidence. Requirements reach 9 or above in the detailed pack (stories, data dictionary, NFRs with numbers, test plan), which NEXT.md already sequences after the one-pager.

## 7. What was tested, and what was not

**Tested by me:**
- Render with no page errors.
- 78 eye buttons covering all 39 activities.
- The inspector opens beside the map; the scroll position is unchanged.
- Example expands in place (`aria-expanded`).
- Escape closes the inspector and returns focus to the eye button.
- At 375 px: the bottom sheet, focus kept inside, and the list view.
- No sideways scroll at 375, 768 and 1280 px.
- Nav height and jump offset (M7).
- View screenshots checked by eye: overview, 3 and 5.

**Not tested:**
- Safari, Firefox or a real phone;
- screen readers;
- printing.

**Not re-done:** the line-by-line preservation audit. I spot-checked the four removals and the activity dispositions, and they are sound.

**Reader trials:** not done. The six role tasks in the framework remain "not verified" until a real reader tries them.
