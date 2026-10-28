# S5 Combination workspace — Lead check (28 Oct, sixth Lead chat)

**Checked:** runtime `459f9d4c` (code `2d8989ec`), merged onto main ebdd50a5 as `lead/2026-10-28-runtime` (f3baaa9f, PR #71; merges clean). Lane evidence: run-suites 53/54 (check_screen01_browser is the screens lane's), demo journey 46/46, US$0.

**How:** diff read by a fresh checker agent (did not build it) and by Devin Review on PR #71, each finding read in the code by the Lead; Lead spot-walk on its own copy (:4420, demo reset + Load sample): Visitor visa → Forms tab → Add from library (toast, row set up) → row menu → Remove (confirm says it stays in the library) → Removed in this draft → Undo bar puts it back. Main path works; guides show as sources.

**Verdict: FIX** (do not merge yet). Two independent reads found the same Undo defect.

| # | Severity | Finding | Where | Fix |
|---|---|---|---|---|
| L1 | Major | Undo after editing minimum age or signed by (or a rule) on a draft line says done but keeps the edit | `form-library.ts` undoNow update restores only status, who, attachMode, conditionPlain, origin, finderBatchId; `form-uses.ts` lineSig leaves them out | restore every saved line setting from `before`; test: edit age, signer, rule → Undo → back as before |
| L2 | Major | "AI now" on Who can be starts a paid live run; live was not in the slice 3 Go | `people-ai.ts` propose live, `questionnaires.tsx` | hide or grey live until the founder approves a live trial (P-110 plan); Rules only stays |
| L3 | Major | Rules-only proposals are saved and shown as AI | `questionnaires.tsx` (origin AI_PROPOSAL for every mode) | origin and pill by mode (rules = Rules, not AI); test both |
| L4 | Major | Filed as offers every channel although S4 records what IRCC accepts for the edition | `workspace.ts` `accepted: [...CHANNELS]`; `engine/channels.ts` | use the edition's acceptedChannels; Sample fallback only when none is recorded; enforce on save and at release |
| L5 | Major (prove) | A form with a minimum age, in a combination with no date-of-birth question, can never be decided | `engine/render.ts` ageGate; `validate.ts` | prove the date of birth is asked as a deciding question, or block release; test |
| L6 | Minor | People Undo still works after a release | `studio.ts` undoPeople | refuse after a release, like forms ("Released since") |
| L7 | Minor | A typed person label is replaced by the library label on save | `engine/people.ts` checkPeople | keep the typed label |
| L8 | Minor | "Use these lines" starts from the saved list, dropping unsaved edits | `questionnaires.tsx` useProposal | start from the editor's lines, or block Fill while edits are unsaved |
| L9 | Minor | Reset leaves person_role rows of the old workspace | migration (no FK to workspace) | FK with cascade, or delete on reset |
| L10 | Minor | Who can be editable on a retired combination | savePeople, undoPeople | refuse with the guard's words |
| L11 | Minor (seen) | Added-from-library row keeps "Draft with AI" and "Why it is here (IRCC's words)" shows our words ("reused from the library") | `workspace/forms.tsx` | no AI step on a matched row; IRCC column only for IRCC quotes |
| D-1 | Minor | carried: signoff/fill without a body → checker confirms 400 now | `studio.ts` | done; keep the fail test |

**P-33:** all of the above are Capability (Super Admin, Combination workspace). Scaffolding: the saved finder replay, Sample channels fallback.
**Next:** runtime FIX L1–L11 with a pass and a fail test each, answer Devin Review's 3 comments on PR #71, local run-suites on the exact commit, hand back; the Lead re-merges into PR #71.

## Re-check after FIX (29 Oct, sixth Lead chat): PASS, merged as PR #71 (main e2cb27a4)
Runtime fixed L1–L12 at bb853222 (lane ad7a0604), each with a pass and a fail test (`check_s5_leadcheck.ts` 46/46, `check_s5_leadcheck_browser.cjs`); full run-suites 56/56; CI on PR #71 green (30 min). The Lead branch's app code is identical to the lane head. Devin Review's first 3 points are resolved (Undo restores the full row; age gate carries the birth date question; Filed as from the edition's accepted channels, L4). Its 3 new 🟡, answered by the Lead (PR comments not permitted from this session):
* form-uses.ts:104, Undo steps recorded before deployment carry five-field signatures: **rejected**. Every :4400 restart does a demo reset, so no pre-deployment Undo step survives; production has no such steps.
* forms.tsx:132, a newer unmapped edition hides Draft with AI because the matched count comes from an older edition: **accepted**, first item of runtime's next pass.
* questionnaires.tsx:143, the browser keeps "AI now" greyed when the server approves a live trial: **accepted**, must be fixed before the W1-10 live trial (P-131); drive the radio from the server's plan.
