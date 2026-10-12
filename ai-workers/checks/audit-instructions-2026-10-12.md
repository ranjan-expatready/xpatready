# Audit: instructions and guidance against AIW-D81 to D105 (12 Oct 2026)

*Read-only audit for the Lead. Nothing outside this file was changed. Ratified baseline: `decisions.md` AIW-D81 to AIW-D105 (lines 87 to 111). The founder's direction today: deliver the full agreed scope in this release; simplest complete implementation; design against a completed and tested Workstream 1 as a labelled assumption (AIW-D98); proportionate safeguards enforced through the existing product; no external validation (AIW-D94). No proposal is treated as ratified here: anything not in `decisions.md` is called a Proposal or the Lead's ruling.*

**Type codes:** **S** stale instruction superseded by a decision · **C** contradiction between files · **R** repeated guidance that needs one home · **P** answered question still shown as pending (or the reverse) · **X** proposal presented as ratified.

**Line numbers** are as of commit `07fc6cc`. "Mark superseded" means: keep the text, add `*(Superseded by AIW-Dnn, 12 Oct 2026: ...)*` in place, as the files already do for append-only history.

---

## 0. The ten edits that matter most

1. **Handbook front page and profiles still forbid what D96, D103 and D104 now allow** (Intake AI never runs the assessment; Billing AI never creates a money record or touches trust; Owner's AI never exports or deletes; every note goes to a person in the pilot). The handbook is the front door (AIW-D88), so these are the most damaging stale lines. See H-1 to H-5.
2. **The framework document still asks the founder seven questions he has already answered**, and its class 2 and class 4 rules contradict D93 and D96. See F-1 to F-4.
3. **The autonomy model has neither D104 nor D105 built in**, though NEXT.md says it has. It still shows D5 and D7 as open, and limits earned autonomy to notes with a fixed 1 in 20 sample. See A-1 to A-4 and N-7.
4. **Counsel and the consultant conversations are still on the critical path** in NEXT.md, PROGRESS.md, AGENTS.md, README §5, the framework §7 and nine handbook lines (D94 removed both). See N-3, P-3 to P-6, AG-1, R-5, F-8, H-9.
5. **The framework's question F4 was never decided**, yet NEXT.md says no framework question is left. See N-6.
6. **README §1 still says "the same input gives the same result" and "nothing takes effect until a human approves it".** The first is false for class 3 under D92. The second does not match D101, D104 and D105. See R-1 and R-2.
7. **The ai-worker-designer agent still designs a worker "under its own role and permissions" with "same input, same result" outputs.** This breaks FD-16, AIW-D13 and D36 (no AI principal) and D92. See G-1.
8. **The reviewer and cartographer agents check against the narrow "Release 1" of the Charter**, which still says AI is NOT IN RELEASE 1. That pushes them back toward "later release" answers, against D82 and the founder's direction today. See G-2 and G-3.
9. **PROGRESS.md has no Step R row, still says the Step 3 batch is pending, and still lists a "held batch" that D73 to D76 answered.** See P-1, P-2 and P-6.
10. **PROMPTS.md §6 still coaches a 1–2 worker "wedge" and a validation step.** Both are now superseded (D66, D82, D94). See PR-1 and PR-2.

---

## 1. `ai-workers/handbook/ai-team-profiles.md` (the front door, AIW-D88)

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| H-1 | 15; 102; 108; 122–123 | "Never runs the eligibility assessment"; "asking that person to run the eligibility assessment [22]"; "Never does: runs the eligibility assessment"; "a task asks you to run the assessment … You run it." | S, C (autonomy model row 4) | AIW-D96 (reopens D40) | L15 → "May run the eligibility assessment when the facts are ready or you ask; the rules calculate every result (AIW-D96). Never tells a lead the result and never sends eligibility content (AIW-D41)." L102 → "On a new enquiry with the facts ready, running the eligibility assessment under your permission; the rules calculate (AIW-D96) [22]." L108: delete "runs the eligibility assessment;". L122–123: rewrite the day so the teammate runs it and the person reviews the saved run. Skill 22 (L309, "assessment task"): add "or the run itself (AIW-D96)". |
| H-2 | 16; 147; 149 | "Never creates a money record or touches trust money"; "creates any money record, not even an unsaved draft invoice … proposes a refund … touches trust money (no entry …)"; "you save every invoice and payment yourself" | S, C (autonomy rows 12–14) | AIW-D103 (supersedes D44; amends D72 and its corrections and D77) | L16 → "Prepares invoices and proposed trust entries for an authorised person to approve exactly as previewed; the rules calculate every amount; never moves money (FD-12)." L147 → "Never: approves or issues an invoice itself; records a payment; moves money; changes an amount the rules calculated; reads an amount out of a message. A refund is prepared, never recorded, by it (AIW-D103 amending D77)." L149 → "You approve each prepared invoice or trust entry as previewed; any change voids the approval (AIW-D103)." The trust-report reminder (L144) stays. |
| H-3 | 17; 183; 185 | "Never imports, exports or deletes"; "verifies identity, exports or deletes"; "Identity checks, exports and deletions stay yours" | S, C | AIW-D103 | L17 → "Prepares export and deletion requests and settings changes for the Owner to approve as previewed (AIW-D103); never imports or verifies identity." L183: remove "exports or deletes". L185 → "Identity checks stay yours; exports and deletions run only after you approve the exact preview." Note: D103 does not cover imports, so "never imports" stays. |
| H-4 | 71; 290 (skill 3) | "during the pilot every AI-drafted note goes to a person"; "in the pilot every note goes to a person" | S | AIW-D104 (extends D71, D80) | Replace with "Goes to a person until the skill earns Auto for this firm: tests passed, checked examples from real use and the Owner's approval; it drops back to approval when quality falls (AIW-D104)." Apply the same to filing labels and ordinary tasks wherever the handbook mentions them. |
| H-5 | 11; 14; 9 | "Nothing they prepare reaches a client … until a named person acts"; Case Officer's AI "Never sends"; "using the product's four AI tools (reader, sorter, writer, checker)" | S | AIW-D105 (template sends inside a job); D104; D93 (teammates call read and action tools) | L11 → "Nothing AI-written reaches a client, and no consequential action runs, until a named person approves it. Published firm templates chosen by a rule, and routine internal work that has earned Auto, run as the firm has set (AIW-D104, D105)." L14: "Never sends" → "Never sends AI-written text by itself". L9: add "It may call the product's read tools, and propose actions through the person's own permissions (AIW-D93)." |
| H-6 | 23; 27 | "to be refined by a separate research file"; "It cannot copy the rules, the packs, the record …" | S | AIW-D97 (amends D91); D99 | L27 → "The rules themselves are public. A rival cannot quickly copy the combination: packs reviewed by two people and dated, accuracy measured per skill, the full record of every client file, and Expat Ready as the firm's system of record (AIW-D97)." L23: drop "to be refined …"; add the D99 headline and supporting line above this section (customer benefit first, then proof). This also closes review R1-b N-M1. |
| H-7 | 33; 93; 131; 169; 240; 278; 323; 336; 356 | "provisional until counsel"; "Every limit above is provisional until counsel reads it"; "counsel's question"; "set with counsel"; "until counsel answers"; "for counsel"; "only after counsel has read the counsel pack"; "counsel confirms the wording"; "until counsel reads the final list" | S | AIW-D94 (supersedes D64's gate and D68) | Replace each with "Lead's guidance, unconfirmed: no counsel is engaged (AIW-D94); the founder decides". L323 → "Real files with names removed are used only on the founder's decision; AIW-D94 removed the counsel gate, and the Lead's recorded risk stands." L336 → "… the say/never-say list governs the wording (AIW-D92, AIW-D94)." L356 → "Client- and regulator-facing wording follows AIW-D89 and the say/never-say list (AIW-D92)." |
| H-8 | 341 | FD-16: "Marketing may say 'AI-assisted' …" | S | AIW-D92 (narrows FD-16) | Add "Narrowed by AIW-D92: never 'AI-assisted' for assessments, scoring or any rules-only capability." |
| H-9 | 93; 296 (skill 7) | "form filling stays switched off until the team's form route exists"; "**Switched off** until the team's form route exists" | S | AIW-D98 (Workstream 1 assumed complete and tested), D87, founder's full-release direction | → "Depends on the team's form route (AG-07; AW-1-83). Designed live on the AIW-D98 assumption; if the route is not built, the skill stays off and nothing else waits (AIW-D83)." |
| H-10 | 41–47 (§2 "Three kinds, never mixed") | three kinds: product features / product AI / teammate skills | C | AIW-D92 (four classes, each output labelled) | Keep the three kinds (they say *who owns* the AI call) and add the D92 class label (1 rules only, 2 AI explains rule results, 3 AI language, 4 person only) as a new "Class" column in the §4 catalogue. The framework §10 already lists this as a pending Lead action. Skills 19–23 are class 1 and must never be sold as AI. |
| H-11 | 71 | "upload verdicts and values land in your 'Needs you' list" | S (partial) | AIW-D100, D101 | Add "or, under 'Review at checkpoints', in the end-of-job review, provisional and beside their source, with explicit checks for identity details, consequential values and conflicts (AIW-D100)." |
| H-12 | 3 | "decisions AIW-D81 to D91" | S | D92 to D105 | → "decisions AIW-D81 to D105". |
| H-13 | 95–131 (Intake AI) | no launch chat or automatic guided intake | S (gap) | AIW-D102 | Add under "Good at": "At launch, guided intake questions and approved templates run automatically, and an interactive chat may show approved content chosen by a rule (AIW-D102). Any newly AI-written reply waits for approval." |
| H-14 | 278 | "reading across several firms is not in version 1" | S? (needs a source) | Founder's full-release direction; D82 | If a decision or team requirement defers it, cite it. If it is our own deferral, either bring it into Release 1 or put it to the founder as a named exclusion. "Later" is not a default answer. |

## 2. `ai-workers/design/rules-and-ai-framework-2026-10-12.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| F-1 | 3; 160–170 (§9) | "Nothing here is decided until the founder says yes to the decisions in §9"; F1 to F7 all shown with only a recommendation | P | F1 = D92, F2 = D102, F3 = D99, F5 = D96, F6 = D97, F7 = D98; F8 (not in the table) = D93 | Status line → "Founder decisions taken: F1 (AIW-D92), F2 (D102), F3 (D99), F5 (D96), F6 (D97), F7 (D98), F8 (D93). **F4 is still open.**" Add a "Decided" column to §9, and add the F8 row. |
| F-2 | 51; 55; 67; 153 | class 2: "The AI never calls a tool, picks a rule or computes a result (AG-11-94 …)"; "the AI never calls tools on its own"; "Tool calling: Only the safe form (class 2)"; §8 item 1 | S, C (autonomy model row 1, (f) 6) | AIW-D93 | Replace with D93's own effect: "The AI may also call read tools itself, and may propose actions through the person's permission; every action with an effect is approved before the platform performs it; the rules engine still computes every rule result. Conflicts with the team's AG-11-94, raised with the team (AIW-D93)." |
| F-3 | 53; 63; 154 | class 4 lists "Running the assessment (AW-1-88)"; "a person runs it (class 4)"; §8 item 2 "Letting the AI run it would reopen AIW-D40" | S, C | AIW-D96 | Class 4 → "Telling a lead the eligibility result (AIW-D41); advice; signing; submitting". L63 → "Rules (class 1); an AI teammate may run it for a person, labelled 'Run by [AI teammate] for [person]; calculated by the rules, pack v[n]' (AIW-D96)". §8 item 2 → "Superseded by AIW-D96; knock-ons AW-1-88, CN-AG-03 change 1, test R-I4 (Lead)". |
| F-4 | 39; 98–101; 166 | "Proposed headline: 'Rules you can defend. AI that does the legwork.'"; three headline options; F3 "Test it in the ten conversations" | S | AIW-D99; AIW-D94 | → Lead headline "An AI team for your immigration practice."; supporting line and supporting message as in D99; customer benefit first, then proof. Drop the conversation test. |
| F-5 | 65; 66; 165 | Calendar: "An AI booking by itself conflicts with FD-16 and AIW-D13"; Talking with leads: "The AI drafts; a person sends … This is your decision F2" | S | AIW-D102 | → "Launch: guided intake and approved templates run automatically; an interactive chat may show approved content; newly AI-written replies need approval. Later: a conversational AI for administrative intake, FAQs and booking, by a separate decision with the team (AIW-D102)." See §13 for the open tension. |
| F-6 | 113 | "That narrowing is your call (F1)" | P | AIW-D92 | → "Narrowed by AIW-D92." |
| F-7 | 114; 146 | "Counsel reads the phrase list before anything is published (AIW-D68)"; §7 item 4 "Counsel has read the counsel pack and the phrase list" | S | AIW-D94 | Delete §7 item 4. L114 → "The say/never-say list is our only guard on wording (AIW-D94)." |
| F-8 | 63; 143 | "pack rules are published without being tested (SA1B-D18)"; §7 item 1 "The Canada rules are written and tested before publishing" as a precondition | S (framing) | AIW-D98 | Reframe as a recorded Workstream 1 dependency: "Workstream 2 assumes the engine and packs are complete and tested (AIW-D98, extends AIW-A1); SA1B-D18 is flagged to the team." The precondition should not read as a Workstream 2 gate. |
| F-9 | 32 (§1 point 6) | "A person approves every value. No colour, score or signal ever removes that approval." | X | Not a founder decision (review R2's open question 1; the Lead's rule). It is consistent with AG11-D10 and AIW-D100. | Label it "Lead's rule (Proposal), consistent with the team's floor AG11-D10 and AIW-D100", or record it as a Rule in `proposals.md` and merge it into README §0. |
| F-10 | 183 | README §1 "needs your yes to change it" | P (correctly pending) | Still open (NEXT L15). D92 already makes the current README sentence untrue for class 3. | Keep as pending, but put it to the founder next. See R-1. |

## 3. `ai-workers/design/ai-autonomy-model-2026-10-12.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| A-1 | 265–271; 26 | "Still open: D5 … D7 … D9"; "Three decisions remain open" | P | D5 = AIW-D104; D7 = AIW-D105 | Move D5 and D7 under "Already decided" with the decision IDs. L26 → "One decision remains open (D9)". |
| A-2 | 22 (summary 8); 183–197 (c.6) | "an AI-drafted internal note may stop needing a click"; "This applies to row 3 … only"; "1 in 20 notes still goes to a person" | S | AIW-D104 | c.6 scope → "routine, reversible internal actions: draft internal notes, ordinary tasks, filing labels". Conditions: skill tests passed, checked examples from real use, the Owner's approval; an unchanged-approval rate alone is not enough; **the sample rate is set from evidence, not 1 in 20**; drop back when quality falls; retest on any material change. Update summary item 8 to match. |
| A-3 | 80; 105 (row 5); 291 (E11) | "subject to the founder's answer on D7"; "founder question D7"; "The founder (D7)" | P, S | AIW-D105 | Cite D105, and add its conditions to row 5: merge fields only from verified facts or approved engine results; checks for recipient, consent, current case status and duplicates; mandatory checkpoints kept; any AI-written or AI-edited text, including text in a merge field, needs approval. E11 → "Decided: AIW-D105". |
| A-4 | 1; 3 | "(Proposal, revision 3)"; "Nothing here is ratified" | C (with PROGRESS log, last line: "revision 4") | — | Title → "revision 4 (D103 built in; D104 and D105 to build in)". Status → "Proposal. Rows marked with an AIW-D number are the founder's decisions; the rest is the Lead's or maker's design." |
| A-5 | 282 (E2) | "The founder, if ever widened" | S | AIW-D104 widened it | → "Widened by AIW-D104 to routine, reversible internal actions; never client-facing or floored." |
| A-6 | 17 (summary 3); 97 | "Anything linked to a government deadline is always 'ask now'" | X | The Lead's ruling on R6 B-1, not a founder decision. D101 locks the "safety floors", but the deadline lock is ours, not a team floor. | Label it "Lead's ruling (Proposal); the founder confirms it as a safety floor under AIW-D101". |
| A-7 | 7 | "D92 to D103" | S | D104, D105 | → "D92 to D105". |

## 4. `ai-workers/NEXT.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| N-1 | 25 | "Founder's critical path, in order: engage counsel by 31 Oct (AIW-D68); run the ten consultant conversations …" | S | AIW-D94 | → "Founder's critical path: get the Canada pack written and tested (Workstream 1, AIW-D98); provider test (AIW-D69); contract the immigration specialist (AIW-D50)." |
| N-2 | 38; 39 | Step 4 "cannot start on real client files until: counsel has read the counsel pack …"; "Step 5 conversations (AIW-D63)"; founder actions "engage counsel by 31 Oct … run the first three consultant conversations" | S | AIW-D94 | Remove the counsel and conversation items. Step 4 gate → provider test passed (D69), specialist pack content (D50), driving tests passed (D83). |
| N-3 | 13; 29 | "Founder question 1 of 2 (moat wording …) answer pending"; "Put two questions to the founder … (1) restate 'hard to copy' … (2) … SA1B-D18" | P | AIW-D97; AIW-D98 | Delete, or → "Answered: AIW-D97, D98". |
| N-4 | 31; 35 | "→ three consultant conversations →"; "decide the version 1 scope with the founder" | S | AIW-D94; AIW-D82 | Order → "names → profiles → handbook and prototype → appendix trim and archive → hand to the team". Remove "decide the version 1 scope" (D82: full specification). |
| N-5 | 20 | "Then none left from the framework or the autonomy model." | P (reverse: shown as closed, still open) | Framework F4 (AI explains a stored assessment to staff, factor by factor) has no decision row | → "Then framework F4, then none left." |
| N-6 | 21 item (1) | "autonomy model revision 4 needs a short re-check of the D103 rows, the D104/D105 build-in …" | C | The file has no D104 or D105 (`grep` finds neither; title still "revision 3") | → "(1) build D104 and D105 into the autonomy model (A-1 to A-5), then a short re-check". |
| N-7 | 24 | "Research is frozen after the framework … (Lead's improvements adopted 12 Oct)" | X | No decision row; not in `proposals.md` | Record it as a Rule in `proposals.md` and merge it into README §0 (Lead's own rule), or label it "Lead's rule". |
| N-8 | 5; 12; 16 | "State, 11 Oct"; "If either file is missing, re-run it"; "Makers started …" | S | Framework landed; D92 onward | Replace the 12 Oct "in progress" block with the current state (the file says "replace, don't append"). |
| N-9 | 14 | R1-b fixes "Held on purpose until the rules-and-AI framework lands" | S | D92 to D99 landed | → "Release the hold: apply the R1-b fixes together with H-1 to H-14." |

## 5. `ai-workers/PROGRESS.md` (plan sections, lines 1–60)

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| P-1 | 12 | "Done, 11 Oct 2026; founder batch pending" | P | AIW-D73 to D80 | → "Done; founder batch decided (AIW-D73 to D80)". |
| P-2 | 7–15 | the plan table has no Step R | C (with NEXT.md, rethink-plan.md and the session-start hook, which says "Work the plan in PROGRESS.md") | AIW-D81 to D88 | Add a row: "R. Rethink | AI Team Handbook + coded prototype + one blueprint (AIW-D86, D88) | built on D81–D105 | In progress". |
| P-3 | 14; 25; 37; 41 | "Ten conversations with future customers"; gate "Ten scored conversations before any price is called final"; "Step 5 conversations start …"; "prototype is shown in the Step 5 conversations" | S | AIW-D94 (drops D60/D63 conversations) | Mark superseded by AIW-D94. The new price gate is the founder's to set. Suggest (Proposal): price from the money model and the pilot's measured figures (AIW-D83). |
| P-4 | 24 | "a privacy impact assessment signed off by counsel before any pilot on real client files" | S | AIW-D94 | → "a privacy impact assessment prepared by the Lead, unconfirmed (no counsel, AIW-D94); the founder approves before real client files". |
| P-5 | 38; 47; 56 | "Step 5 does not quote a price to a lawyer before counsel has read that list"; "then counsel"; "Engage counsel by 31 October 2026 (AIW-D68)" | S | AIW-D94 | Mark superseded by AIW-D94; delete the L56 action. |
| P-6 | 50 | "Held for one batch …: (1) FD-11 … (2) FD-4 … (3) FD-7 … (4) AIW-D52 …" | P | AIW-D76, D75, D73, D74 | Delete items 1 to 4. Keep only the CP-01 upload action. |
| P-7 | 54 | "Run the ten conversations with licensed consultants (AIW-D63 …)" | S | AIW-D94 | Delete. |
| P-8 | 13 | Step 4 pilot "with a named person approving everything" | S | AIW-D101, D104, D105 | → "with approvals as the firm's preset sets ('Review each step' by default, AIW-D101)". |

## 6. `ai-workers/README.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| R-1 | 25 | "Because the product fixes the method, the AI cannot freelance. The same input gives the same result" | S, C (framework §1.3, class 3) | AIW-D92 (class 3: "No; measured instead"); AIW-D84 | The framework's §10 proposal waits for the founder's yes (NEXT L15). Recommended text: "Same facts, same rules, same answer: rule results are exact and stamped with the pack version; AI answers are stored and replayed, and their accuracy is measured, not guaranteed." |
| R-2 | 37; 39 | "output approved by a named person"; "nothing takes effect until a human approves it" | S | AIW-D101 (checkpoint approval before effect), D104 (earned Auto), D105 (published template = approval) | L39 → "nothing an AI writes, and no consequential action, takes effect until a person approves it, at once or at a checkpoint before the effect (AIW-D101). The firm's approval of a published, rule-chosen template counts for its sends (AIW-D105), and routine internal work may earn Auto (AIW-D104)." |
| R-3 | 19 (rule 9) | "An 'AI persona' is one assistant … a 'worker' is one catalogue entry (W-nn) … 'AI assistance' … Counsel reads the final list" | S | AIW-D89 (AI teammate / skill / step; persona and worker retired); AIW-D94 | Replace with D89's terms. Client-facing: "Your AI team"; teammates shown as "Case Officer's AI". Wording follows the say/never-say list (AIW-D92). Remove "Counsel reads". |
| R-4 | 28–37 | four shapes: "Role twin … with that role's permissions"; "the expert co-pilot answers only and never acts (AIW-D25)" | S | AIW-D81, D89, D90 (Practice answers is a product feature), D93, D13/D36 (the named person's permissions, not a role's) | Mark superseded: "Superseded by AIW-D81, D89, D90, D93: six AI teammates made of reusable skills; see `handbook/ai-team-profiles.md` §1." |
| R-5 | 99; 100 | "The exact limits get the label confirm with counsel / RCIC"; "Each wave shows what the AI scope means for the March 2027 launch date" | S; C (with rule 3a, L11 "timelines … not Workstream 2's concern") | AIW-D94; AIW-D21, D66, D82 | L99 → "Legal limits are the Lead's guidance, unconfirmed (AIW-D94); immigration values come from the immigration specialist (AIW-D50) and licensed grading (AIW-D83)." L100: drop the per-wave date effect, or keep only "the launch waits for the AI (AIW-D66)". |
| R-6 | 6–21 (§0) | no rule for D84, D98, D94 or the full-release direction | S (gap) | AIW-D84, D98, D94, D82 | Add rule 12: "Design against a completed and tested Workstream 1 (AIW-D98, labelled assumption AIW-A1). Deliver the full agreed scope in Release 1 (AIW-D82); 'later release' needs a founder decision. Simplest complete design; safeguards enforced by the existing product (AIW-D84). No external validation (AIW-D94)." |

## 7. `.claude/agents/*.md`

| # | File:line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| G-1 | ai-worker-designer.md:7 | "an AI Worker is a governed user of the product … under its own role and permissions … Its outputs are reproducible (same input, same result) … release, and regulatory flags (confirm with counsel / RCIC)" | S, C (README L39 "not its own user") | FD-16 (no AI principal), AIW-D13, D36, D89, D92, D82, D94 | → "An AI teammate acts for a named person, with only that person's delegated permissions (AIW-D13, D36). It is made of reusable skills (AIW-D81, D89). Rules compute; AI does language (four classes, AIW-D92). Rule results are exact; AI outputs are stored, replayed and measured. It stops at the approvals and floors in the autonomy model." Drop the "release" field (D82). Replace "confirm with counsel" with "Unconfirmed (AIW-D94)". |
| G-2 | adversarial-reviewer.md:3, 7 | "scope creep against Release 1"; "any change to … Release 1 scope" | S | AIW-D82; founder's direction 12 Oct | → "scope against the agreed full Release 1 scope (AIW-D82); flag any 'later release' deferral that has no founder decision, and any rules-only capability called AI (AIW-D92)". |
| G-3 | requirements-cartographer.md:7 | "Release 1 or later (per the Program Charter and Phasing)" | S | AIW-D1, D66, D82 (the Charter's "NOT IN RELEASE 1" for AI is overridden) | Add: "For AI items, Release 1 per AIW-D66 and D82, whatever the Charter says." |
| G-4 | all five, line 9 (7 in two) | the same "Before anything … Progress rule … No-duplication rule …" paragraph | R | — | One home: README §0 (add "Agent rules" as rule 12a). Each agent says "Follow `ai-workers/README.md` §0." The no-names rule (AIW-D35) is missing from commercial-strategist, competitor-analyst and requirements-cartographer. It is fixed once the rules live in one place. |

## 8. `AGENTS.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| AG-1 | 16 | "legal and immigration values get 'confirm with counsel / RCIC'" | S | AIW-D94 | → "legal points are labelled 'Unconfirmed: no counsel (AIW-D94)'; immigration values come from the immigration specialist (AIW-D50)". |
| AG-2 | 12 | "Drive requirement documents → GitHub code → the founder's decisions" | C (README §0 rule 11: a conflict with a founder decision is never settled by file date; it goes to the founder) | README rule 2, 11 | Add: "A conflict between a source and a founder decision is recorded and goes to the founder; it is never settled by this order." |

## 9. `ai-workers/PROMPTS.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| PR-1 | 35; 50 | "one or two AI Workers that ship in Release 1 as the wedge, the rest as the roadmap"; coached ask step 4 "Choose a wedge" | S | AIW-D66, D82; founder's direction 12 Oct | Mark superseded: "Superseded by AIW-D66 and D82: the full specification ships in Release 1; per-skill driving tests (AIW-D83) let a weak skill ship switched off." |
| PR-2 | 36; 51 | "Add a short validation step … 5–10 licensed consultants"; step 5 "Validate" | S | AIW-D94 | Mark superseded by AIW-D94. |
| PR-3 | 13 | "Start Step 1 (the AI organisation) … no new features" | S | Step R; AIW-D82 ("fix any gaps") | → "Continue Step R as defined in NEXT.md …"; "no new features" → "no new non-AI features; AI gaps are fixed (AIW-D82)". |
| PR-4 | 57–66 (§7) | the four Charter edits restated | R | `charter-edits.md` (AIW-D65) is the one home | Replace with a pointer to `charter-edits.md`. |

## 10. `ai-workers/rethink-plan.md`

| # | Line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| RP-1 | 16 | "Decide the version 1 scope … the smallest set of assistants and duties … everything else parked" | S | AIW-D82 | Mark superseded by AIW-D82 (full specification). |
| RP-2 | 34 | "→ consultant conversations →" | S | AIW-D94 | Mark superseded by AIW-D94. |
| RP-3 | 38; 41 | "made-up samples only until counsel has read the pack (AIW-D64)"; "'AI assistance' until counsel reads the list" | S | AIW-D94; AIW-D89 | Mark superseded. Real-file use is now the founder's decision. |
| RP-4 | 42 | "For the founder: whether Practice answers is presented as an AI teammate or as a product feature" | P | AIW-D90 | → "Decided: AIW-D90". |
| RP-5 | 18 | "a high-fidelity prototype (Figma or HTML)" | S | AIW-D86 (coded prototype) | → "a working coded prototype (AIW-D86)". |
| RP-6 | 50–51 | AIW-D91 "the moat is the platform under the AI" | S (partial) | AIW-D97 | Add "amended by AIW-D97: the moat is the combination". Add a closing pointer: "Decisions since: AIW-D92 to D105 (`decisions.md`)". |

## 11. `CLAUDE.md` and hook scripts

| # | File:line | Quote (brief) | Type | Superseded by / conflicts with | Recommended edit |
|---|---|---|---|---|---|
| CH-1 | CLAUDE.md:5; session-start.sh:6; AGENTS.md:3; README §0 | the session rules said four times | R | — | One home: README §0. CLAUDE.md and the hook keep only "read README §0, PROGRESS, NEXT; end with **Continue Workstream 2.**" The hook already injects §0, so its line 6 repeats it. |
| CH-2 | AGENTS.md:14; README:13 (4a); README:95; CLAUDE.md:5 | the access rule (read all, write nothing outside) | R | — | One home: AGENTS.md (it applies project-wide). README cites it. |
| CH-3 | tools/freshness.sh:5 | "see .claude/skills/ai-workers-resume/SKILL.md" | S | the file does not exist (`.claude/skills/` is absent) | → "see `ai-workers/README.md` §4 step 1". |
| CH-4 | tools/stop-check.sh:9 | path list includes `company-planning` | S | archived 9 Oct (folder absent) | Remove it (harmless, but stale). |
| CH-5 | tools/session-start.sh:6 | "Work the plan in ai-workers/PROGRESS.md step by step" | C | P-2 (Step R missing from the plan) | No change once P-2 is fixed. |

---

## 12. Repeated guidance: one home each

| Guidance | Now repeated in | One home | Others become |
|---|---|---|---|
| Agent working rules (sources, citations, progress line, no duplication, no names) | 5 agent files | README §0 (new 12a) | "Follow README §0" |
| Session rules and closing line | CLAUDE.md, AGENTS.md, README §0, session-start.sh | README §0 | pointer |
| Access rule | AGENTS.md, README §0.4a and §5, CLAUDE.md | AGENTS.md | pointer |
| Headline and story order (AIW-D99) | framework §1 and §5 (stale), autonomy (a) 11 and (f) 7 | `decisions.md` AIW-D99; shown once on the handbook front page | cite AIW-D99 |
| Say / never-say list | framework §5, handbook §6, README rule 9 | handbook §6 (by AIW-D94, our only guard on wording) | pointer |
| AI taxonomy (three kinds; four classes) | handbook §2, rethink-plan L45, framework §2 | framework §2 for classes (D92); handbook §2 for ownership, with a class column | cross-reference |
| Open founder questions | NEXT, PROGRESS "Waiting on the founder", framework §9, autonomy (d) | NEXT.md (handoff) | each design file shows only "Decided: AIW-Dnn" or "Open: see NEXT" |
| Questions for the team (AG-11-94, AG-11-60, SA1B-D18, AW-1-88, AG-6-46/47, E4, E9, E10, E14) | NEXT L21 item 7, framework §8, autonomy (e) | one "For the team" list (NEXT item 7 until the blueprint's traceability section exists) | pointer |
| Charter edits | PROMPTS §7, `charter-edits.md` | `charter-edits.md` | pointer |
| Freshness procedure | AGENTS.md L18, README §4.1, session-start.sh L11, freshness.sh L23 | README §4.1 | pointer |

## 13. The unresolved tension: AIW-D102 against the founder's full-release direction

**What D102 says (ratified):** at launch, approved templates and guided intake questions run automatically, and an interactive chat may serve that approved content. Newly AI-written replies need approval. **Later (design now, switch on by a separate decision with the team):** a conversational AI for administrative intake, FAQs and booking. Any automatic AI-written reply needs a separate decision with the team.

**What the founder said today:** deliver the full agreed scope in this release; later releases are not the default answer.

**The precise tension.** Is the conversational AI part of the "agreed scope"? D102 itself puts it after launch, and so does D82 if read alone. Today's direction makes "later" a choice that needs a reason, not a default. Until the founder says which, the blueprint cannot tell whether to design the conversational AI as a Release 1 item or only as a future design.

**What a Release 1 conversational AI would touch:**

| Floor or decision | Owner | Words | Touched how |
|---|---|---|---|
| AG11-D1 and AG-11-53 (team AI-text floor) | the team | "Hard floor — never below `APPROVE`: AI-written text to a client …"; "Lowering an AI-text floor is impossible." | Any model-written reply sent live breaks the floor. Whether a **lead** counts as a "client" under AG-11-53 is **Unknown**; the team must say. Our autonomy model already treats leads as covered (row 6; c.2 examples). |
| FD-16 | the founder (ratified, Drive) | "every output is human-approved before it has effect"; "AI is NOT a first-class actor" | A live AI reply has an effect without a person's approval. AIW-D105's reading (a published template's one-time approval counts) cannot stretch to free model text: D105 itself says AI-written text needs approval. |
| AIW-D11 | the founder | "No applicant-facing AI Workers in the design or the investor story." | A lead-facing conversational AI is applicant-facing. D102 has already partly strained this (the launch chat), but only with rule-chosen approved content. |
| AW-1-46 (ours) | Workstream 2 | "A template SHALL be chosen by a rule, never by a model" | Even a model that only *picks* among approved answers breaks it (autonomy model E15). |
| AIW-D41 | the founder | eligibility only through the consultant's audited share | Stays: the chat must route "Am I eligible?" to a consultation offer. |
| AIW-D13, D93 | the founder | effects approved before the platform performs them | Booking through the Scheduler's own link is rules (class 1) and is fine. An AI booking by itself is not. |
| AIW-D94 | the founder | no counsel | Raises the Lead's recorded risk on lead-facing AI (privacy, Competition Act claims, the consultants' Code). |

**Exact amendment needed (append-only; two options for the founder; the Lead recommends A):**

- **Option A (Release 1, no floor lowered).** New row: "*AIW-D1xx: Amends AIW-D102 and AIW-D11. Release 1 includes the lead-facing intake assistant for administrative intake, FAQs and booking, built so that no AI-written text reaches a lead without approval: (1) a model may classify the lead's typed question into one of the firm's approved intents (class 3, read only); (2) a rule maps the intent to the firm's published answer or guided-intake step, which is sent automatically under AIW-D105; (3) booking uses the Scheduler's own offered times and link (rules); (4) anything outside the approved intents, any eligibility question (AIW-D41) and any low-confidence match hands off to a person with a holding message from a template; (5) any newly AI-written reply waits for approval (the team's floor, AG11-D1, unchanged). AW-1-46 is amended to: 'a model may classify intent; a rule chooses the template'. AIW-D11 is amended to allow this lead-facing assistant only.*" This touches **no team floor**. It needs the founder's reading that FD-16's approval is satisfied by the firm's approval of the answer set plus the rule mapping (the same reading as D105), and the Lead's change to AW-1-46.
- **Option B (fully generative live replies in Release 1).** This needs (i) the team to lower AG11-D1 and AG-11-53 for leads, which the team's own words call impossible; (ii) the founder to amend FD-16 on Drive; (iii) amendments to AIW-D11, D13 and D102. Workstream 2 cannot deliver it alone, and it carries the highest unmitigated risk under AIW-D94.

**Recommendation to the Lead:** put this to the founder as one question (Option A in Release 1, Option B by a decision with the team, or keep D102 as "later"). Record the answer before the blueprint's lead-intake journey is written.

---

## 14. Checked and correctly pending (no edit)

- Autonomy D9 (make the AIW-D57 safeguards final): genuinely open (NEXT L20; autonomy (d); E8).
- README §1 repeatability wording: open, waiting on the founder's yes (NEXT L15; framework L183). D92 makes it urgent.
- Framework F4: open, but missing from NEXT (N-5).
