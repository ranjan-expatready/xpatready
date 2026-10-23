# One-pager draft 2: the Lead's response to the independent audit

17 October 2026 · Claude Code (the Lead) · Responds to `illustrations/actor-handoff-demo/draft-2-independent-audit-2026-10-17.md` (PASS WITH FIXES, 7 Material, 11 Minor). Each finding was checked against `tools/s3/s3_data.py`, `s3_views.py`, the built page and `decisions.md` before deciding. Founder questions are asked one at a time; answers are recorded in `decisions.md`.

| # | Verdict | Evidence checked | Fix |
|---|---|---|---|
| M1 | **Agree**; founder question on who may add a form | 4.1 blocks release while a required field is unmapped, so a released package always maps its own forms; "not yet supported" can only arise for a form the package does not list. No activity adds such a form to a case. The setup side enters at 1.1 "Create the combination row", but mappings are per form edition and shared (3.2, D233). | Founder question 1. Then: name the sources; give "add a form to this case" an owner and authority; route Expat Ready's side through a form-edition path (new step: add the edition to the form library, then a run on that edition only). |
| M2 | **Agree**; founder question on attach versus adopt | Controls › Versions and 10.3 say a case keeps its pinned version until a person adopts; 8.2, 8.5, 5.3 and view 5 say a released mapping re-renders the waiting copy directly. Both cannot hold. | Founder question 2. Then one rule plus an acceptance example. |
| M3 | **Agree** | The setup pool starts only on "form not yet supported" (view 1) and "scheduled check" (view 7); the 8.4 rule sends a wrong mapping to Expat Ready with no receiver. | Message start "Mapping reported wrong" → new triage step (publisher): confirm, hold the mapping and its dependents, list the other cases that use it → re-draft (view 2) → review and release (view 3). A "mapping stands" answer returns the copy to the agent. |
| M4 | **Agree** | Validation appears only as one action in 3.7 and one control line. Cross-record checks (date of birth before passport issue, lease address against the SQR address) are absent; in the 9.3 example the representative finds the address mismatch by eye. | New activity 3.8 "Draft field and consistency checks" with the five groups and the seven attributes per check; Client A table; SA-1B-23 and SA-1B-15 kept; time-sensitive checks re-run before signing and submission; inexpressible checks are named gaps; checks added to 4.3. |
| M5 | **Agree** | 9.1's return path says a mismatch holds the copy, but view 5 has no branch, owner or next step for it. | 9.1 is followed by one decision, "Read-back result": mismatch → back to the agent (8.4), who classifies it (format or transform = mapping flag; a field that refuses written data = type-by-hand list); listed fields or validation → 9.2; all matched → 9.3. |
| M6 | **Agree** | 9.4's return path covers only an unavailable signatory; view 6 goes 9.4 → 9.5 with no return. | Decision after 9.4: "Error reported, or a re-run check blocks?" → back to 8.1 → approvals withdrawn → re-render → re-approve → re-sign. |
| M7 | **Agree** | Draft 2 has no `scroll-padding-top`; the nav is two to six rows of chips. My 60 checks never measured either. | One-row "Jump to" control below 1,000px; scroll padding equal to the nav height; two new browser checks. |
| m1 | Agree | 3.2 ready state lists 'collected from' as an alternative to a mapping; D235 resolves profile facts through the mapping's subject. | Reworded. |
| m2 | **Refine** | Review does start only on a clean report. Running review on unaffected items while held items rework would need a second token path in view 3 for little gain. | Keep the order; state the reason in 4.4 and 5.1, and that earlier approvals of unchanged items are kept. Labelled a proposal. |
| m3 | Agree | View 5 header lists the mapping release as a start; the diagram has one start. | Header wording. |
| m4 | Agree | No "waiting since" on a waiting copy. My chat summary to the founder said the wait "never waits for ever"; that was wrong: it ends only on release or when the agent marks the copy urgent. The page never claimed a bound. | "Waiting since" shown on the copy and in the agent's list; no bound claimed. |
| m5 | Agree | Model and prompt versions are logged (1.3) but a change triggers nothing; 7.3 and 8.3 run at case time. | Rule: a change of model or prompt for any AI step is a change; the step is re-run against the expected answers before use and the result recorded. |
| m6 | Agree | D147: "Canada or the United States, only under written no-training and zero-data-retention terms, with client notice". The page says "no-retention" and omits client notice, and only at 7.3. | D147 terms stated once in Controls for every AI step; 7.3 wording aligned. |
| m7 | Agree | No corporate example in any card; the client lane says "and family members". | Employer example in 7.1; lane sub-label names the employer. |
| m8 | Agree | Grey reads as "fine". | Grey = "no check applies or not yet checked; not reviewed". |
| m9 | Agree | Measures name IMM 5707 only. | "(or IMM 5645 if the specialist so decides)". |
| m10 | Agree | One family per branch misses interactions. | One combined family added. |
| m11 | Agree | Reuse of expected answers is not stated; specialist workload is a feasibility risk. | Expected answers kept per form edition and rule branch, reused across combinations; specialist time added as a measure. |

**On the checker's assessment of my limitations:** accepted. One correction to my own earlier wording is recorded under m4. The two BPMN notes get one line in the key.

**Not done, by instruction:** no content cut for word count; no slides, pack, screenshots or prototypes.

## Founder answers

- **M1 → AIW-D237.** No agent feature to add a form. New forms and editions come through Expat Ready's change watch; an unmapped required edition shows 'Not yet supported' until release. A one-off form an officer requests is an agent request (9.6), completed by hand and uploaded as a case document; recurring gaps go to Expat Ready's support. The founder challenged the first option; the Lead raised the one gap (officer-requested existing forms) and the founder chose the recommended handling.
- **M2 → AIW-D238.** A released mapping reaches an open case only through adoption (10.3); only the affected copy re-renders and loses its approval.

## Fixes made (17 Oct, afternoon)

All seven Material and eleven Minor findings are fixed as dispositioned above (m2 as refined). Page sha256 `8cb68027…`; sources `tools/s3/s3_data.py`, `s3_views.py`; draft 2 as checked: `../../archive/ai-workers/s3_data-v3-draft2-checked-2026-10-17.py` and `s3_views-v3-draft2-checked-2026-10-17.py` (the checked page itself was overwritten by the rebuild; it regenerates from those sources).

- **M1 (D237):** no add-form feature. 1.1 is for new combinations only. New forms, editions and reported mappings enter through view 7: a firm's support report → **10.4 Triage a support report** → **10.2 Re-run and release the change** (views 1–3 on changed items, a new edition through 2.1, 3.1, 3.2) → adoption. "Not yet supported" arises only for a required edition not yet mapped. Officer-requested one-off forms: 9.6, by hand, uploaded as a case document.
- **M2 (D238):** releases reach open cases only through 10.3; the waiting copy is replaced by a newly prepared copy ("Replaced after adoption" in view 5). Removed every "the copy fills automatically when the mapping is released" claim.
- **M3:** 10.4 holds a wrong mapping with its dependents and lists every case using it; "mapping stands" is answered by support and the agent takes the copy back.
- **M4:** new **3.8 Draft field and consistency checks** in view 2 (five groups, seven attributes per check, Client A table, police-certificate value pending the specialist); Controls › Validation rewritten; a third row in "kinds of check"; checks run at 8.1 and 8.2 and again before 9.4 and 9.5; added to 4.3.
- **M5:** after 9.1 one decision, "Anything for a person?"; 9.2 now classifies read-back mismatches; a mapping problem goes back to 8.4 ("Mapping problem?").
- **M6:** decision after 9.4, "Error reported, or a re-run check blocks?" → 8.1; 9.4 and 9.5 cards carry the path and an example.
- **M7:** below 1,000px a one-row "Jump to" select (about 50px); scroll padding set to the nav height. Two new checks per width and scheme.
- **Minor:** m1 3.2 ready state; m2 reason stated in 4.4 and 5.1; m3 view 5 header; m4 "waiting since" in 8.2, 8.4, 8.5 (no bound claimed); m5 model or prompt change re-tested (1.3, 8.3, Controls › Versions); m6 Controls › AI processing with the full D147 terms, 7.3 aligned; m7 corporate example in 7.1 and lane label; m8 grey defined; m9 IMM 5645 noted; m10 combined test family; m11 expected answers reused and specialist time added as a measure. Key note for the two BPMN abstractions.

**Checks:** build structural checks pass; ledger 110 rules (82 kept, 24 corrected, 4 removed); browser checks 84 of 84 (the 60 earlier plus navigation height and heading-below-navigation at four widths, light and dark).

**Re-score (the Lead's, honest):** best solution **8** (the handoff gaps are closed; still unproven on real forms); best communication **8** (phone navigation fixed; view 5 is now the densest diagram, with routed message lines a reader must follow); best requirements, at blueprint level, **8** (every handoff has an owner and a path; numbers and the detailed pack are still to come). 9 or above needs the real read.
