# One-pager: business-journey overview and returning-client reuse

17 October 2026 · The Lead's record of the founder's two focused changes to `problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`. This is not the checker's verdict, and it is not the comprehensive audit, which follows after the founder reviews these changes.

- **Before:** `d6d07e4f…432a` (the page the independent recheck reviewed). It is archived whole as `../archive/ai-workers/*-v3-draft2-before-journey-2026-10-17.*`: eight files (page, data, views, builder, ledger, browser checks, and the ledger and check outputs).
- **After:** `e1016dea…7731`. It has 41 activities (unchanged) and 226 rules (209 before; 17 added to activities). The shared fact record now carries 15 rules. Every diagram is still at most 1,240px wide.
- **Not changed:** no new service, AI step or approval; no new activity; no founder decision. No slides, pack or prototype. Nothing committed.

## 1. The overview is now a business journey

| Request | Where it landed |
|---|---|
| Plain cards, simple arrows, actor labels, numbered stages; no BPMN needed | `#overview` "End to end: the business journey". Three bands of numbered cards. Each card shows who acts (role chips with small icons), what they **receive**, what they **do** (one sentence), and what they **hand over → to whom**, plus at most two pointers. The arrows between cards are labelled with the handoff. |
| Detail in the contextual panel | Each card's eye opens a stage card in the existing side panel: receives / does / hands over / to, before it starts, rules, exceptions, a Client A example, and links that open each detailed activity card in the same panel. |
| Setup happens once per combination and form edition | Band "Once": 1 Gather the official material → 2 AI drafts the configuration → 3 Check, review and release. A connector below it reads: "Released package: every new case at every firm uses it. Nothing is regenerated for each client." |
| Each case uses the released configuration | Band "Each case": ways in A and B → 4 Open the case → 5 Reuse confirmed information → 6 Collect and confirm the gaps → 7 Prepare and check each form → 8 Approve, sign and submit → 9 Record the responses. |
| Changes are reviewed, released and adopted | Band "On change": 10 Find the change → 11 Review and release the change → 12 Open cases adopt it. A connector reads: "New version: open cases adopt it through the agent (stage 12); new cases start on it." |
| New client and existing client both shown; no forced new lead | Way in **A, New client** (lead form, PQR, duplicate check, 'same person?'). Way in **B, Existing client, new service** (a new case from the client's record; no new lead and no repeat of the lead form or PQR; only the eligibility questions the new service needs). The same entry is now drawn in BPMN: view 4 has the start event "Existing client, new service" → 7.1, and the BPMN overview has the start event → sub-process 4. |
| BPMN views kept; legend moved out of the introduction | The BPMN overview moved to `#overview-bpmn` "End to end in BPMN", after the journey, with a closed "Diagram symbols" disclosure. Every view's tool bar has a "Diagram symbols" button, which opens the legend (symbols, actor colours and the reading note, word for word) in the side panel. The top-of-page legend box and the four phase boxes are gone: the phase descriptions now sit in each view heading, and the view numbers in the band notes. |
| Phone | The bands stack top to bottom, with downward arrows, and a stage card opens as the full-width bottom sheet. |

## 2. Returning clients and several cases: reuse fact by fact

**Design:** deterministic selection of existing structured facts from the shared record. There is no new AI agent, reconciliation service or second master database.

| Location | What was added |
|---|---|
| **Records → "Facts per person or organisation"** (renamed from "Case facts per subject"; same record) | 15 rules giving the full explanation. One record per person inside one firm, reached through the resolved identity and never by name or email. Reuse happens inside the same firm only, under the firm's and the role's permissions. Case-only facts are never reused. Household facts are linked; each partner's personal values stay their own. Each fact is resolved on its own (same person, meaning, purpose, date or context), never by copying the latest case. The selected value is the current confirmed one. A later case-open, upload or edit time alone does not make a value more authoritative. A newer unconfirmed value waits as 'to review'. A correctly replaced value is history, not a conflict. Competing values with no recorded resolution are a conflict, and a person confirms. Past-dated questions keep past values. Re-confirmation rules apply. The case snapshot is never rewritten. Selection is rules, not AI. |
| **7.1 (case creation)** | Trigger: either way in. Input, action, output and person line extended. Two actions and nine rules added: a new case on the same client record on the current release; the full lead form and PQR are not repeated; what is asked; the new case's own rules decide its questions, documents, forms and checks again; a document is reused only if this case's checklist line accepts it, and expiry warnings are unchanged; approvals, signatures, receipts, decisions and an earlier release are never copied; a fact confirmed here marks other open cases' affected copies 'fact changed' under the existing re-prepare and withdraw rule, and submitted copies never change. One exception added (two confirmed values after a merge). Five traces added. **The example table and the scenario matrix are added under "Example · Client A".** |
| **7.2 (questionnaire pre-population)** | Three rules: pre-fill only from a confirmed value for the same person, meaning and date, with the source shown; 'still true? add anything new' for re-confirmation fields, while other reused values are corrected rather than re-typed; the new case's own conditions apply. One exception ('to review') and one example (a returning client). |
| **8.1** | Two rules: a new value replaces the current one only when the agent confirms it as a correction or a change of circumstances; reused values show their source and date. |
| **6.2, 6.3** | Matching names or email alone never link people; an existing client is offered instead of a second record; 'same person' links the record, then reuse happens fact by fact. |
| **Stage 5 panel** | The record's 15 rules (open by default), the same example table and the same scenario matrix, all from one source in `s3_data.py`. |
| **Case types** | New row "Returning client" (individual, family, corporate). |
| **Evidence → code gap** | Today's answer store picks the current value by its replacement link and effective date only, and never reads the confirmation status. So a newer declared answer would replace a verified one (`answer-store.service.ts:432-436, 247-253`). Re-asking re-confirmation fields on a new case **is** built (`capture-once-resolver.service.ts:77-79`). |
| **Evidence → proposed team change** | Doc-1 §5.4: a declared or document-read answer that differs from a verified one waits for review, and only a person's confirmation replaces it. Two current answers that meet after a merge raise a conflict. |

**The example table** (every value is labelled invented) has six rows:
1. A stable date of birth, reused.
2. Address 2, confirmed as a move, replaces Address 1. Address 1 is kept as history and still answers the address-history question.
3. A newer, unconfirmed passport number waits 'to review'.
4. 3 Sep 1991 against 4 Sep 1991 after a merge: no value is selected, and a person confirms.
5. A job-offer employer belongs to the earlier case and is not reused.
6. An earlier police certificate is re-checked against this case's checklist line.

**The scenario matrix** covers: no record; a profile only; one earlier case; several closed or active cases; and missing, outdated, disputed or contradictory information.

## Source check

- **Supported by the team's design:** one Party with many cases, and a returning client getting a new case (AG-07 §3.0, AG-7-73). A new case starts on the current version (AG-8-40). A valid document on file is reused (AG-8-20). Person-level and case-level scope, `mustReaffirmPerCase`, `CaseAnswerOverride` and `CaseSqrSnapshot` (Doc-1 §5.3–5.4). A returning employer's next assessment opens directly (AG-02, AG17-D75).
- **Supported by founder decision AIW-D184:** facts belong to the person, inside one firm; re-confirmation rules; household facts linked; spouse privacy.
- **No conflict** with a founder decision or a team requirement needed a founder question. The one difference is the team's currency rule, which ignores confirmation status. It is shown as a build gap and a proposed team change, not settled silently.

## What was already covered, added and unverified

- **Already covered:** 6.3 'same person' carried confirmed facts, with 'still true?'. 8.1 had one value per fact, history and conflicts. 7.3 never overwrites a confirmed fact. 7.2 had the flag-a-pre-filled-value rule. The versions control pinned cases.
- **Added:** the explicit existing-client entry (journey, view 4, BPMN overview); the per-fact selection rule and its meaning of "most up to date"; the shared-record explanation; the example table and the scenario matrix; the documents, snapshot, non-copy and other-open-case rules; the code gap and the team change.
- **Unverified:** all of this is **documented expected behaviour**, not product capability. Only the re-asking of re-confirmation fields is built in today's code; per-fact selection, status-aware currency, 'to review', conflict on merge and other-case marking are not built. No real client data, family file or form was run.

## Verification

- **Build:** `python3 tools/s3/build_one_pager.py` passes, with five new structural checks:
  - every activity belongs to a journey stage, and every stage names real activities;
  - every stage card has its four parts and a one-sentence "does";
  - every arrow is labelled;
  - stages appear in order;
  - no BPMN legend appears before the journey.
- **Browser:** `node tools/s3/check_one_pager.cjs` passes **123 of 123** (91 earlier and 32 new). The eye-count check now counts activity eyes only, because stage eyes were added.
  - New checks cover: journey before BPMN with no legend needed; reading order A, B, 1–12; card parts and labelled arrows; band connectors; no text overflow; the stage eye opening its card without moving the page (focus and deep link `#c=st-5` included); the stage 5 example and matrix; an activity link opening 7.1 in the same panel, with the reuse tables; way in B; Escape returning focus; the symbols button in views; the view 4 and overview start events; phone stacking and the bottom sheet.
  - **Fifteen reuse scenario walks** are asserted on the rendered records table and cards: each of the five scenarios; stable reuse; superseded address; unconfirmed passport; genuine conflict; timestamps; identity; permissions and the firm boundary; documents; no copying or silent rewrite; no AI selection; 'same person'.
- **Visual:** screenshots at 1440 light, 1280 dark, 375 phone, the stage 5 panel, view 4 and the BPMN overview are in `checks/s1-onepager-journey-*.png`, `s1-onepager-view4-existing-client.png` and `s1-onepager-overview-bpmn.png`. Two overlaps in view 4 were found and fixed by screenshot. The platform icon's dark-mode contrast was fixed.
- **Preservation:** every data string from the archived version is present except 8, each extended rather than removed (listed in the session's diff: the record name and holds, and 7.1's input, action, output, person line, trigger and prerequisites). Visible page text differs only where the legend moved, the overview introduction was reworded and the record was renamed.

## Carried forward, not resolved by this work

- **R1** (a recorded reason alone must not satisfy a required document line).
- **R2** (signature-only changes versus "any change to the file withdraws" approval).
- **R3** (per-filing repetition in view 6).
- The **8.3/8.4 unavailable-checker wording** alignment.

These are the independent recheck's open points (`illustrations/actor-handoff-demo/draft-2-audit/recheck-after-fixes/recheck-verdict.md`), still open. The journey's stage 8 deliberately does not restate the 9.5 document-line wording.

Also still open: real forms not read; AI accuracy not measured; specialist values pending; which filings must be submitted together; no screen-reader, Safari, Firefox or real-device test.
