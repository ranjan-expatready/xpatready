# W1-10 AI drafting: updated plan (forms lane, 29 Oct; design only, no code yet)

Follows `challenge.md` (A1–A7, a1–a6; **agreed 29 Oct**, founder P-138, P-139, P-140). Slice 0 and the queue item contract proposal are Go; slices 1–6 wait for the founder's early look (design before build). Every count, condition, document line, channel and cost is **Sample** until the immigration expert confirms it. Legal points: Unconfirmed: no counsel. Labels: **Capability** (production keeps it) or **Scaffolding** (proof only, never ported; P-33).

## 1. One run: "Draft questions and documents" (A1)
It runs on one combination after its forms are attached (S4 finder). Every AI step has its own blind checker round and the rules (P-121). Each step can be Live, Saved or Rules only (P-110 amended), and live runs only on a click (P-125).

| # | Step | How | Needs | Lands as | Label |
|---|---|---|---|---|---|
| 1 | Filing channel per form, with IRCC's quoted line (B37) | AI, inside the finder's two rounds; `channelsFrom` flags a contradiction | S4 (built) | "What IRCC accepts" change (second person, built) | Capability |
| 2 | Facts per person role, from the forms' field maps | rules, US$0 | S6 slice 1 (field maps per edition) | input to steps 5–7 | Capability |
| 3 | Documents each person gives, with their conditions, from the checklist and guide | AI + checker + rules | queue contract | requirement-line proposals; a new document type goes to S6 as a library add | Capability |
| 4 | What each document supplies, and how it is read (P-133, P-134) | rules first (`suppliesFacts`); AI only for a new type; a rule refuses AI reading for identity documents | step 3 | document-type proposal with facts and reader kind | Capability |
| 5 | Comes from per fact: document if one supplies it, agent for representative and office facts, else client; declarations always client (P-97) | rules, US$0 | W1-15 slice 1 (fact record) | proposal per fact | Capability |
| 6 | Who and when: conditions per person role on questions, sections and form lines, plus "if yes, give details" questions | AI + checker + rules (valid condition, shared field, `reachable`) | S6 slice 3 (shared conditions) | condition proposals, referencing a shared condition | Capability |
| 7 | Pre-qualification picks: the facts the guide's eligibility section tests, with reason and quote (P-76) | AI + checker + rules (PQR ⊂ SQR) | step 5 | PQR tick proposals | Capability |
| 8 | Cross-answer checks (tier 2, warn never block; a2) | AI + checker + rules | step 6 | check proposals | Capability |
| 9 | Coverage: every form field has one source; every deciding fact is asked before what depends on it; every document fact's document is on the checklist | rules, US$0 | steps 2–8 | findings on the run card | Capability |

Paid steps: 1 (a few tokens inside the finder), 3, 4 (new types only), 6, 7, 8. The finder, field maps and section names stay their own runs (S4, S6).

## 2. Rules (each with a pass test and a fail test)
* **R-1** A saved result for the same files, fingerprints, prompt, combination and example set replays at once at US$0, labelled "Saved AI result, date, edition, US$0". A newer edition of any file it read, or a new example set, marks it Out of date and never replays it silently (P-110, a4). *Fail test:* new IMM 5484 edition → Out of date.
* **R-2** Live only on a click, with the cost line first (about, at most); refused before starting when the worst case is above what is left of either cap (Wave 1 or experiment), with "use saved results or rules only" (P-110, P-125, a3).
* **R-3** Every proposal quotes its line (file, edition, page) and the rules find the quote in that file; no quote → dropped and listed (P-121).
* **R-4** Ready = rules pass and both rounds agree on item, people and condition; Check = same item and people, conditions differ, or `channelsFrom` contradicts; Decide = otherwise, one round only, or IRCC sends it to the visa office (draft M3, M5).
* **R-5** A condition reads only shared fields, asked of that person before it is needed (`reachable`); it reuses a shared condition when the meaning matches; never copied per combination (S6 M6).
* **R-6** People are roles from "Who can be in this application" (P-119); any other role is refused.
* **R-7** An identity document's reader kind is never AI vision (P-134). *Fail test:* AI proposes "Letter or record" for Passport → refused, shown as Decide with the reason.
* **R-8** `acceptedChannels` keeps its three values and their meaning; nothing is renamed (S5 reads it; lead-check L4). New values wait for the founder's answer on the channel research (PDF only, online only, both, online plus auto-filled PDFs uploaded online).
* **R-9** PQR ⊂ SQR; a PQR tick only on facts that come from the client or a document (P-130).
* **R-10** Bulk accept for Ready only, one Undo per batch, each item re-checked on the server (P-121; S6's queue).
* **R-11** Every accept, edit and reject is stored with its step and reason; AI work shows the acceptance rate per step and flags a step under 70 % (P-130 §6.3, a6).

## 3. Slices, in order (A2, A3, A7)
| Slice | What | Depends on | Label | Cost |
|---|---|---|---|---|
| 0 | **One step runner** (`api/src/rounds.ts` + pure `engine/` parts): draft round, blind checker round, rules, `compareRounds`, saved-result key (R-1), cost first and both caps (R-2), saved label and Out of date. The finder moves onto it; its checks stay green. `people-ai.ts` follows (runtime lane reviews). | nothing | Capability | US$0 (stub, replay) |
| 1 | **Filing channel (B37):** `find_forms` output gains `channel` and its quote in both rounds; agreement plus the `channelsFrom` contradiction flag; the proposal lands as a `form_accepts` change; the channel values follow the founder's research answer (R-8). | slice 0 | Capability | US$0 (replay); live in slice 6 |
| 2 | **Documents per person and what each supplies** (steps 3, 4): `checklist.ts`'s stub becomes this producer; requirement lines and document-type proposals (facts and reader kind, R-7) on the queue item contract. | slice 0; Lead-approved contract (Q-L2) | Capability | US$0 (stub, replay) |
| 3 | **Who and when, and conditional questions** (step 6): `sameCondition` and `reachable` (a5); condition proposals referencing shared conditions. | S6 slice 3 (shared conditions) | Capability | US$0 (stub, replay) |
| 4 | **Comes from and PQR picks** (steps 5, 7, 9). | W1-15 slice 1 (fact record); S6 slice 1 (field maps) | Capability | US$0 |
| 5 | **Cross-answer checks** (step 8). | slice 3 | Capability | US$0 (stub, replay) |
| 6 | **The live trial on Visitor visa (P-131):** each AI step live once, prompt fixed, then twice more; History › AI work compares the three runs; "Keep as saved result"; Load sample replays the saved results through the same rules. Per-step Live · Saved · Rules only on the run card's launch panel (Capability). | slices 1–5; founder Q1 | Scaffolding for the comparison and "Keep as saved"; the spend is the proof | about US$50 (P-131, Sample) |

Slices 0 and 1 need nothing from other lanes and can start as soon as the Lead agrees. Slice 2 starts once the contract is approved. Slices 3 to 5 wait for S6 and W1-15; their stubs and replays can be built against the contract meanwhile, with no live run.

Each slice ends with scripted API journeys, a pass and a fail test per rule, check labels naming capability ids (C2.6, C3.4, C4.10, C4.11, C11.8, C11.13, C11.14; P-86), a fresh reviewer and breaker at CHECK, and the full run-suites. The run card, queue, Undo and lifecycle are reused, never rebuilt (S6 re-check R5).

## 4. Questions (from `challenge.md`)
* **Founder Q1, answered (P-139):** US$120 experiment cap, Wave 1 cap US$60; each new step live once before repeating.
* **Founder Q2, answered (P-140):** the finder's two rounds propose the channel with IRCC's quote. The channel values are not decided yet (research asked).
* **P-138:** drafting a form's masters runs only on a click; a saved draft replays at US$0.
* **Lead Q-L1 to Q-L3, yes:** the runner by the forms lane first (slice 0); the queue item contract proposal in `contracts/` before slice 2; the order above.

## 5. P-149 addendum: the shared library authoring model (founder, 29 Oct; Lead message)
P-149 (on `lead/2026-10-29-devin`, research `screens/W1-shared-library/research-authoring-model.md`) amends P-120: AI drafts first, a person edits and accepts, a second person approves, and a manual Add is the marked exception. What it changes in W1-10, and where each part lands:

| P-149 part | What W1-10 does | Slice | Label |
|---|---|---|---|
| (1) One door: every add is a `ProposalItem` with its origin | `origin` becomes AI · Rules · **Person** in `contracts/proposal-item.ts` (done with this addendum, Lead's ask; `check_forms_proposal_contract.ts`). W1-10's producers write AI or Rules; a Person item comes from S6's one Add. The research's other fields (`notSameAs[]`, `placements[]`) are S6's, through the Lead and the screens lane | contract now; producers 2–5 | Capability |
| (2) One identity rule per type, at proposal and again at approval | One pure identity function per W1-10 kind, called by the rules step and again on accept: document type = name + what it proves; requirement line = document type + roles + condition; condition = the normalised tree (reuse the shared one when equal); cross-answer check = its tree and the facts it reads; comes-from and PQR pick = fact + role. An exact duplicate is refused; a near one is Decide and needs a reason | 2 (document types, requirement lines), 3 (conditions), 4 (comes-from, PQR), 5 (checks) | Capability |
| (3) Approved items are versioned; a draft follows the latest approved version | Nothing new in W1-10: conditions point at the shared condition and its version (S6 slice 3, M6); W1-10 never copies one | 3 | (S6) |
| (4) An edit asks "Does this change the meaning, answer type or allowed values?" | An accepted condition or check edited by hand: a changed tree forces "yes" (second person and expert, with what happens to its users); a sentence-only change asks the question | 3, 5 | Capability |
| (5) Conditions and checks carry example cases; a change re-runs them for every combination using the rule | Steps 6 and 8 draft **two or three example cases per rule** in the same two rounds (no extra call): the answers of a sample family and the expected outcome. The rules run each case through `checkCondition`; a case whose outcome differs from the rule is Decide. Before approval, a pure `runExamples` re-runs every case for every combination that uses the rule (Where used). The expert confirms the cases (Sample until then). This needs an `examples` field on the condition, form-check and cross-check payloads: **a contract change for the Lead with the screens lane**, proposed for slice 3 | 3 (conditions), 5 (checks); S6 for form checks | Capability |
| Manual field Add gets AI's "where it applies" in the background | Not a W1-10 step. S6 runs it on the slice 0 runner with the field-mapping step (`contextKey` per form edition); its results are queue items like any other | S6 slice 1 | (S6, on the runner) |
| AI "did you mean" on the rules shortlist; over about 10 % manual adds is an AI coverage gap | W1-10 adds nothing; the coverage count sits beside R-11's acceptance rate on AI work (both read `origin` per combination) | 6 | Capability |

**Cost:** the example cases come in the same rounds, a few hundred output tokens each, so the P-131 trial stays about US$50 (Sample). **Open for the Lead:** the `examples` payload field (above), agreed with the screens lane before slice 3.
