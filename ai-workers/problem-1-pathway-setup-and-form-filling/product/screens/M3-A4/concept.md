# M3-A4 (B106) Eligibility rules on the combination: concept

Status: **DESIGN** (6 Nov). Row A4 of the M3 sprint plan (PR #1167), built in stream B (fix F3). No board: P-223 (4), the tech lead approves after the independent challenge (`challenge.md`). Capability **C6.9** Case check; closes QA-244's second half. No migration, no new route, no AI (US$0). Base: main 237baacd0. A1 (#1084, the checkpoint's gates) is **not merged** at writing; nothing here depends on its code, only the walk's starting data.

## 1. Job and journey
**Job.** A configuration author adds, changes and removes the eligibility gates and the officer's-judgement lines of one combination by screen; the change is a draft change that the content reviewer signs and a different person releases; the next case check reads it.
* **Persona:** Configuration author (duty `author`). Content reviewer (`sme`) signs; Approver (`approve`) releases. Case officer runs the check (C6.9 page, built).
* **Journey J-A4** (plan §6): author adds "Passport number answered", saves, submits → reviewer signs → approver releases → case officer opens a new case, runs the check: the gate reads Met or Not answered. Removing a gate and releasing it alone is refused. Ends at the case's Eligibility page [J7 4.1].
* **Today:** gates are written only by `PUT /combinations/:id/eligibility-gates` from scripts (`setup_vv_m3.ts` S7, A1's loader); the route is on `route-has-screen-allow.txt`; `answer-key-editors.tsx:274` only reads them. C6.9 concept §8 listed "a gate-authoring screen" as Not built.

## 2. Layers: what exists, what is new
| Layer | Exists (main) | New |
|---|---|---|
| Data | `combination.eligibility` jsonb `{gates, judgement, disclaimer, version, by, at}`; `snapshot.eligibility` on release | none |
| Rules | `engine/eligibility-gates.ts` `checkGates` (save), `gateProblems` (release check, in `draft.problems`, where "Eligibility"), `eligibilityChanges` (change summary, `needs_sme`) | none |
| API | GET/PUT `/combinations/:id/eligibility-gates` (author only, version-checked, Problem Details per field); submit, sign, release with BR-14 (`studio.ts:1091`) | none; `api/src/eligibility.ts` only if a refusal reads badly on screen |
| UI | `ConditionBuilder` (`components/conditions.tsx`), `plainCondition`, `Dialog wide`, `useDuties`, `useSave`, `errorsOf` | `components/eligibility-gates-editor.tsx`: a section plus an edit dialog; one mount line in `pages/combination.tsx` (Questionnaires tab); one additive prop on `ConditionBuilder` (Q1) |
| Team | AG-03 has no authoring screen for gates (its Qualifier is configured elsewhere) | ours, recorded as our addition |

## 3. Business rules
* **BR-1 One set, one save.** The dialog edits the whole set (gates, judgement lines, disclaimer) and sends one PUT with the version read. Source: C (`eligibility.ts` put).
* **BR-2 Only an author saves.** Edit is shown to holders of `author`; others see the section read-only with "An author changes these; you can read them." The API refuses others 403 regardless. Source: C (`need(actor,"author")`).
* **BR-3 A gate is a rule the answers settle, per person.** Each gate: label (≤160, unique in words), condition built with `ConditionBuilder` locked to "each person" and to library questions (no calculated values: release refuses them, `gateProblems`), and "If not met": *Not eligible* (default) or *The representative reviews it* (`needs_review`, gives Possibly eligible). Source: C `checkGates`; P-230 (1).
* **BR-4 The gate's key is made, never typed.** On add, the key is made from the label (`gate.<words>`, lower case, ≤80, `_2` when taken) and never changes after the first save, because answer keys and runs store gate keys (`answer-key-editors.tsx`, `assessment.result_json`). Renaming a label keeps the key, so the change summary reads "changed", not "removed + added". The key shows only under "Details". Source: EXPERIENCE §5 (no IDs on the main path); Q3.
* **BR-5 Judgement lines are plain lines,** 1–120 characters each, at most 20; never a condition. Disclaimer optional (21–2000); empty means the Sample default, shown as the placeholder. Source: C; FQ-5; C6.9 BR-6.
* **BR-6 A draft change, released by others.** Saving changes only the draft. The section shows, per gate, *Released* / *New in draft* / *Changed in draft*, and released gates the draft removed as *Removed in draft* (struck), compared by key with GET's `released`. Releasing goes through Review and release: the reviewer signs each Eligibility line (`needs_sme`), and the author who changed or submitted it cannot release it (BR-14, 409, existing words). Source: C; P-116.
* **BR-7 Problems are said where they are fixed.** `draft.problems` with where "Eligibility" show under their gate (by `item` = key), in the release check's words (e.g. "This gate reads …, which no case of this application is asked"). Source: C `gateProblems`.
* **BR-8 Stale save.** A 409 keeps the person's edits in the dialog and shows "Changed by someone else: <who> saved at <time>. Reload their version, then make your change again." with a Reload button. Source: C; STANDARDS §4.
* **BR-9 Retired: read-only,** with "Retired: restore it on Structure to change its eligibility rules." Source: C (409 retired).

## 4. Layout (Workspace pattern, EXPERIENCE §3; edit in a dialog, §2.3)
Mounted on **Smart questionnaire (SQR)** after "Questions for each person": the setup checklist already sends Eligibility problems there (`engine/setup-checklist.ts:21`), and gates read those questions. Anchor `data-focus="questionnaires:eligibility"`.
```
┌ Eligibility rules (staff check) ⓘ ─────────────── Draft: 1 change · Released in Release 2 ─ [Edit] ┐
│ Rules the answers settle, per person                                                             │
│  Passport number and expiry date answered (Sample)  Met when: Passport number is answered and …  │
│     If not met: Not eligible                                                       Released      │
│  Passport number answered                           Met when: Passport number is answered        │
│     If not met: Not eligible                                                  New in draft       │
│  ⚠ This gate reads …, which no case of this application is asked. (release check)               │
│ Officer's judgement, not checked by rules: Has enough money … · Is in good health · …            │
│ Disclaimer: Indicative only. … (Sample default)                                                  │
│ Saved by Configuration author, 6 Nov 21:10 · Submit on Review and release →                      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```
**Edit dialog (wide):** one card per gate (Label · Rule: `ConditionBuilder` · If not met: two radios · Remove), "Add a gate"; then judgement lines (one input each, Add/Remove); then Disclaimer (textarea). Footer: Cancel · **Save the eligibility rules**. Leave guard when dirty. Keyboard: every control reachable, Remove buttons named "Remove the gate <label>". 1024 px and 200 % without sideways scroll (builder rows wrap).

## 5. States and copy
| State | What shows |
|---|---|
| Empty | "No eligibility rules yet. Add the rules the answers can settle, such as a passport on file; anything only an officer can weigh goes under Officer's judgement. A case check is refused until a release carries at least one." [Add eligibility rules] (author) |
| Loading / error | skeleton lines / "The eligibility rules could not be loaded." [Try again] |
| Saved | toast "Eligibility rules saved to the draft. They reach cases once the draft is reviewed and released." |
| Field error | under the field, the server's words (e.g. "Give the gate a label: what a person reads beside its result."); top notice "Some details need fixing" |
| Conflict / retired / read-only | BR-8 / BR-9 / BR-2 |
| Remove a gate | inline confirm in the dialog: "Remove "<label>"? Cases keep it until the change is released. A test that expects this gate fails until its expected values change." |
Tooltip ⓘ: "Checked per person against the answers on file when a case officer runs Eligibility. Met, Not met or Not answered; never a guarantee: an IRCC officer decides."

## 6. Contract and tests
No contract change. Reads `GET …/eligibility-gates` (`EligibilityGatesView` + `released`) and `GET /combinations/:id` (`draft.problems`, `retired`); writes `PUT …/eligibility-gates` `{gates[{key,label,condition,whenNotMet?}], judgement, disclaimer?, version}`. The UI sends each condition with `subjectKind: "PERSON"` (what the server stores, BR-2a; `/conditions/check` accepts it). Removing the line from `route-has-screen-allow.txt` makes `route-has-screen.mjs` find the call in the new file.

**Browser check** `tests/check_b106_gates_browser.cjs` (Playwright, own copy, checkpoint loaded), labels `C6.9:`. One pass + one fail per BR:
BR-1 add "Passport number answered" (exists Passport number), save → GET has it, version +1 · empty label → field error, nothing saved. BR-2 approver: no Edit, PUT 403 · author: Edit. BR-3 builder offers no subject choice and no calculated value; "If not met: representative reviews" stored as `needs_review` · a rule with no comparison → "A gate needs a rule…". BR-4 rename a label → key unchanged, review lists "changed" · two gates with the same words → refused. BR-5 a 121-character line refused · empty disclaimer → release carries the default. BR-6 J-A4 end to end: submit, reviewer signs, author's own release refused (409 words), approver releases; officer opens a new case, Run eligibility check lists "Passport number answered" Met/Not answered · removed gate shows "Removed in draft" and stays on cases until release. BR-7 a gate on a question the case is never asked shows the release-check line under it. BR-8 two pages, second save 409 keeps edits, Reload. BR-9 retired → no Edit. Plus axe (0 violations) on the section and the open dialog, and no sideways scroll at 1024 px. `acceptance/C6.9.test.ts` 15/15 on the checkpoint (needs A1) is run unchanged.

## 7. Capability or scaffolding (P-33) · scope (P-26)
Section, dialog, draft/released marks, problems under the gate: **Capability, Needed for the proof.** Generated keys: Capability. Not built: trying a gate on a sample person before release; "N tests expect this gate" counts; reordering gates (order is the list order; drag is not needed for the proof); nested conditions beyond the builder's "Edit as JSON".

## 8. Questions for the tech lead (recommendation first)
* **Q1 `ConditionBuilder` gets one additive prop** (`only="person-questions"`: subject fixed to "each person", calculated values not offered), default unchanged for its four users. **Recommend yes:** without it the builder offers subjects the server refuses ("Eligibility is checked per person…") and calculated values release refuses. `conditions.tsx` is outside the row's file list; it is not B2's file. Its users' suites run.
* **Q2 Mount on the Questionnaires tab** (the checklist's Eligibility step already lands there), by one line in `combination.tsx`'s `WorkspaceTab`. **Recommend yes;** the alternative, a new tab, changes `contracts/workspace.ts` TABS (shared contract).
* **Q3 Keys made from the label and fixed** (BR-4), shown only under Details. **Recommend yes;** typed keys put an ID on the main path and a renamed key breaks answer keys silently.

## 9. Definition of ready
Acceptance: `acceptance/C6.9.test.ts` (15/15 on the checkpoint, after A1) + `tests/check_b106_gates_browser.cjs`. Row text: plan §3 row A4. Decisions: none for the founder; Q1–Q3 are the tech lead's. Gates: Opus review, breaker (new screen + permissions), qa gate A. `Fixes: QA-244`.
