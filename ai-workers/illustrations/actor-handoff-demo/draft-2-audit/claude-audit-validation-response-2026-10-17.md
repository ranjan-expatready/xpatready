# Validation of the consolidated audit of revised draft 2

17 October 2026 · The Lead's validation of `consolidated-audit.md`, as asked in `claude-audit-validation-prompt.md`. This is advice for alignment. It changes no product file and no founder decision, and it is not the separate checker's verdict.

## 1. Version check

The audit reviewed the current files. Every SHA-256 hash in `input-manifest.json` matches the live files: the one-pager HTML (`8cb68027…9774`), `s3_data.py`, `s3_views.py`, `build_one_pager.py`, `s3_ledger.py`, `check_one_pager.cjs`, the ledger, the browser-check JSON and `decisions.md`. No decision has been recorded after D238. Every finding therefore applies to the current version, and no newer work would be overwritten.

I reproduced the two interface defects myself rather than trusting the audit's JSON (scratch probe, read-only on the HTML):

| Width | Activity | Eye control x | Inspector x | Covered? |
|---|---|---|---|---|
| 1280 | 3.8, 9.3 | 1079–1103 | 820–1280 | yes |
| 1280 | 4.4, 8.4 | 709–733, 579–603 | 820–1280 | no |
| 1440 | 3.8, 9.3 | 1159–1183 | 980–1440 | yes |
| 375 | phone sheet | `aria-modal="true"`, nothing inert, the "Jump to" select is exposed and can be hit | | leaks |

At 1280px the inspector covers the right 36% of the viewport, so this is not limited to two activities. Any activity in the right third of a wide diagram (views 3, 5 and 6 are 1,202–1,232px wide) is hidden when selected.

## 2. Verdicts

**Key:** Agree = confirmed as stated. Refine = real, but the evidence, the cause or the fix needs adjusting. Disagree = already answered, or out of scope.

### Material findings

| ID | Verdict | Class |
|---|---|---|
| A1 Answer stands in for a required document | **Agree, and it is wider than the audit says** | Material behavioural gap |
| A2 Filing boundary and current approvals | **Refine** (half of it is already answered) | Material ambiguity |
| A3 Validation failures routed to the fact | **Agree, plus a root cause the audit missed** | Wrong rule, with a card and diagram mismatch |
| A4 Approval covers the final file | **Agree** | Material ambiguity |
| A5 Review-required items cannot reach review | **Agree, with sharper evidence** | Contradiction between cards and diagram |
| A6 Inspector hides the selected activity | **Agree** (reproduced; broader than stated) | Interface defect |
| A7 Phone modal leaks to the background | **Agree** (reproduced) | Interface defect |

**A1. Agree, and it is wider than stated.**
- **Evidence:**
  - 7.2's ready condition reads "required uploads are present or their questions are answered instead" (`s3_data.py:810`).
  - 7.3's return reads "Unreadable or wrong person: its questions return to the SQR" (`:837`, `:844`).
  - Gateway X9 asks "Every upload read, right person?" and loops on No (`s3_views.py:154,167`).
  - **The audit missed this:** no step after 7.3 checks document lines at all. 8.1's ready condition covers facts only: "No conflict left on any fact a required form reads" (`:864`). 9.3, 9.4 and 9.5 check copies, signatures and time-sensitive checks. 9.5 takes "Approved, signed copies and documents" as input (`:1098`) but has no document readiness condition.
- **Consequence:**
  - A case can reach submission with a required passport line unsatisfied.
  - The X9 loop has no exit for a scan that stays unreadable.
- **Smallest correction:**
  - Keep the SQR fallback, but for facts only.
  - In 7.3, an unreadable or wrong-person upload does two things: it returns its facts' questions to the SQR, and it sets its document line to "re-upload needed" on the client's checklist.
  - X9 becomes "Facts for every required field available?", so the loop ends once the answers are in.
  - Add one ready condition at 9.5, reused from the existing checklist lines: every required document line for this filing is accepted, or the agent has recorded a reason through the existing agent request. Whether a substitute document is allowed is the specialist's value; do not invent one.
- **Do not add:** a new blocking policy, or a hold on unaffected work.

**A2. Refine: half is already answered; the filing boundary is the real gap.**
- **Already answered, so the audit's acceptance examples overstate the gap:**
  - Superseded approvals: 9.3 "Approval is stamped with the versions and fact snapshot it covered; a later fact change withdraws it" (`:1061`). 8.1 withdraws approvals on any change (`:872`). 10.3 withdraws approvals on adoption (`:1195`). 5.3 "A changed draft cannot reuse a stale approval" (`:695`).
  - Known cut-offs: 8.2 "'Not yet supported' arises only when the case must use a form edition Expat Ready has not yet mapped (for example after a government cut-off)" (`:902`). 10.1 "A cut-off date … makes adoption required after it" (`:1158`). 10.3 offers "adopt now, or at the cut-off".
  - So "a late approval for a superseded output cannot restore readiness" is already true.
- **Real gap:**
  - 7.1 says "each applicant has their own forms, fee and decision" and "Each person's filing has its own row" (`:785,788`).
  - Yet 9.3's receiving owner ("The case waits until every required copy is approved", `:1058`), 9.4's trigger (`:1076`), the single catch "Every copy approved" (`s3_views.py:242`), 9.6's "the case closes on the decision" (`:1127`) and the end event "Application decided" are all case-wide.
  - Nothing says which copies belong to which filing, or that one applicant's decision leaves another's filing open.
  - A copy that a fact change newly requires (for example IMM 5409 after a switch to common-law) is not said to join the set. 8.1 only re-renders "the copies that read it" (`:865`).
- **Smallest correction:**
  - Add one rule each to 7.1, 9.3 and 9.6: every copy, approval, signature, fee, receipt and decision belongs to one filing.
  - "Every required copy approved" means the filing's current required set at current versions. A confirmed fact can add a copy to that set, and the case asks for it.
  - Filings that the route requires to go together wait for each other; the specialist confirms which.
  - The case closes when every filing has a decision.
  - Relabel the catch "Every copy of the filing approved" and the end event "Every filing decided". Keep the compact diagram.
- **Cut-off sub-point:** only add "the form edition is still accepted on the submission date" to the existing time-sensitive checks at 9.5. Nothing else is needed.

**A3. Agree, plus a root cause the audit missed.**
- **Evidence:**
  - 9.2's return reads "A validation failure is fixed on the fact (8.1)" (`:1029`). Its rule reads "A validation failure (format, mandatory field) is fixed on the fact" (`:1036`). Its example "Validate reports a format error in the partner's date: fixed on the fact in 8.1" (`:1045`) tells staff to change a correct date to suit a format, which is plainly wrong.
  - After 9.2, the diagram has only "Mapping problem?", with No going to 9.3 (`s3_views.py:196,224–226`). The card's route back to 8.1 is not drawn.
  - **The audit missed this:** 8.4's colour rule makes "red" mean "blocked *or flagged*" (`:956`), and 9.3 says "An unacknowledged red item prevents approval" (`:1057`). Read together, an acknowledged hard block allows approval. That conflation is why "acknowledging" a block reads as "resolving" it.
- **Counter-evidence the audit should credit:** 9.2's exception already treats environment causes: "wrong Reader version or an unsupported field; both are on the edition's known-issues list" (`:1039`). 3.8 already has block, warn and advise severities (`:501`).
- **Smallest correction:**
  - Rewrite 9.2's return, rule and example as three causes using the existing owners: wrong or missing fact → 8.1; format or transform → 8.4 and support; reader or edition issue → known-issues list, or completion by hand (8.5).
  - Draw one "Wrong fact" route from 9.2 back to the existing "Fact to correct" end, so the diagram matches the card.
  - Split 8.4's red into "blocked" (a check with block severity must be resolved and re-run, never acknowledged) and "flagged" (an AI or consistency flag the agent decides, with a reason).
  - Change 9.3's rule to "every amber, flagged and important item acknowledged; no blocked item".
  - Keep 3.8's history-gap rule as it is ("blocks … until it is explained"): there, the explanation is the resolution, not an acknowledgement.

**A4. Agree.**
- **Evidence:**
  - 9.2 types refused fields, runs Validate and "uploads the validated form" (`:1023`).
  - 8.5 produces a copy completed entirely by hand (`:971`).
  - 9.3 approves "the exact copy" with "read-back and validation results" (`:1048`), and its approval is stamped with "the versions and fact snapshot" (`:1054`), not with the file.
  - The 9.1 read-back ran before any hand entry. Nothing re-reads the uploaded file, and 8.5's copy has no rendered values to compare against.
- **Consequence:** a date typed wrongly in 9.2 or 8.5 can be approved beside a green read-back from earlier.
- **Smallest correction:**
  - 9.3 approves the uploaded final file or the current portal screen, and its stamp adds that file's fingerprint.
  - Before approval, the existing 9.1 read-back runs again on that final file where the form type allows it (standard PDF and the barcode form's data). Fields it cannot read, and every hand-entered field, are listed for the representative to read against the confirmed fact.
  - Any later change to the file withdraws the approval; 9.4 already says signed or approved content that changes needs the action renewed (`:1088`).
  - Same mechanism, no new step, no new approval.
- **Acceptance check:** the audit's example stands. A date mistyped in 9.2 shows in 9.3 against the confirmed fact and prevents approval.

**A5. Agree, with sharper evidence.**
- **Contradictions between cards:**
  - 3.1 says a near-duplicate "blocks the draft until a person merges or confirms (5.1)" (`:303,311`). But 4.1 runs "No near-duplicate fields" as a structure check that can block (`:542`), and 5.1 starts only when "Checks pass with no blocking finding" (`:638`). A near-duplicate therefore can never reach the person who resolves it.
  - 4.2 sends a disagreement "for focused review in 5.1" and says "never loop" (`:560,567`). But 4.4's trigger includes "Any failed check … from 4.2–4.3" and sends items back to drafting (`:613,618`). The diagram's "Any check failed?" (X3) takes the 4.2 results into that same branch (`s3_views.py:119–122`).
- **Smallest correction:** use two finding classes, with no new review system.
  - **Blocking** findings return to drafting through 4.4: a structural break, an expected-answer failure, or a missing item.
  - **For review** findings go on to 5.1 or 5.2 marked "decide": a near-duplicate, an "uncertain" mapping or reading, or an AI disagreement. They cannot be released undecided. A reviewer's recorded, evidence-backed decision closes them. The models never have to agree.
  - Edit 3.1 ("blocks release until … 5.1"), 4.1 (list near-duplicates as "for review"), 4.4 (remove 4.2 from the trigger) and X3 ("Any blocking failure?").
  - Technical failures still hold, as now.

**A6. Agree** (reproduced, see §1).
- **Cause:** `open()` (`build_one_pager.py:627–645`) places the panel on the right and never checks where the selected shape is. Docking starts only at 1,760px (`:606`).
- **Smallest correction:** when the panel opens below the docking width, compare the selected shape with the panel. If they overlap, scroll that diagram's own horizontal scroll area so the shape sits left of the panel; if it cannot be scrolled clear, show the panel on the left. Keep closing as it is (scroll position and focus come back).
- **Acceptance check:** at 1280 and 1440, opening 3.8, 9.3 and the rightmost shape of views 3, 5 and 6 leaves the shape's label not under the panel (`elementFromPoint` returns the shape). Another shape can then be opened without closing the panel.

**A7. Agree** (reproduced).
- **Cause:** `applyMode()` sets `aria-modal` (`:624`) but nothing makes the background inactive.
- **Smallest correction:** on narrow screens, while the sheet is open, set `inert` on the page's main content and its navigation, and remove it on close. Opener focus already comes back.
- **Acceptance check:** with the sheet open at 375px, clicking or tapping the "Jump to" select does not move focus out of the sheet. Tab and Shift-Tab stay inside. Escape restores the page and focuses the opener.

### Smaller refinements

| ID | Verdict | Evidence | Smallest correction |
|---|---|---|---|
| B1 | Agree (wording) | 3.1 rule: "'Family name' under the spouse heading never matches the applicant's family name" (`:310`) reads as if there were role-specific fields. | "…resolves to the one 'Family name' definition; whose name it is comes from the mapping (3.2)." |
| B2 | Agree (wording) | 3.7 action: "Attach allowed values and character limits to each field" (`:478`), against 3.1's rule that limits stay on the mapping (`:312`). | "Show each form's limits from its mapping; the definition keeps only its meaning checks." |
| B3 | Refine | Confirmed in code: Escape is handled only while the panel is open (`build_one_pager.py:654`); the tooltip hides on mouse-out; no `aria-describedby`. The preview duplicates the title and the input and output, which a click already shows. | Close the tooltip on Escape and keep it open while the pointer is over it. Do not add `aria-describedby` for content the visible label already gives. Removing it is also acceptable. Low priority. |
| B4 | Agree | The read-back compares with "the selected value" (`:104,510,1006`), but the 9.2 example treats "1991-09-03 → 03/09/91" as a mapping problem (`:1042`). | Read-back compares with the expected value after the mapping's approved transform. A mismatch against that is the mapping's problem. One phrase in each of three places. |
| B5 | Refine (minor) | 1.3 allows "one run at a time per row" (`:228`); 3.1 "runs per form edition, once, shared by every combination" (`:314`). Concurrency of the shared edition run is unstated. The existing near-duplicate route already catches two rows proposing the same new field. | One rule in 1.3: "a form edition's run is shared; a second row needing it reuses that run; two proposals of one new field meet as a near-duplicate in 5.1 (A5)." No locking design. |
| B6 | Refine | 8.3 has no "unavailable" result. But 8.4 already defines grey as "not yet checked" (`:956`), and important fields are always reviewed by people (`:952`). | One rule in 8.3: "If the checker is unavailable, its fields stay grey ('not checked'), never green; the agent reviews them as important; the approval records that the meaning check did not run." No hold: the checker is a proposal whose value is unmeasured (D236). This is a Lead ruling the founder may overrule. |
| B7 | Refine | `BUILD_GAPS` already names XFA rejection and the portal as not built (`:118,121`). 9.1 already gives the XFA fallback, a data-file import (`:1010`). Missing: a proof question per gap, a portal fallback, and the A4 re-read of the final file. | Add a "proof question and fallback" phrase to three rows: XFA write and Validate (answered by the real read, NEXT step 2); portal (fallback: typed by hand under 8.5); final-file re-read (new gap row from A4). No prototype. |
| B8 | Agree | Ledger line 14 still says the 1.1 "trigger now includes the 'not yet supported' alert" (removed by D237). Line 5 says "measures: 6 (two added)", but `MEASURES` has 9. | Correct both metadata lines. The ledger's automatic pass proves preservation, not meaning; the audit is right to say so. |
| B9 | Refine | The archive holds `s3_data`/`s3_views` "draft2-checked" but not that page's HTML or builder. **The current review target is already fully preserved**, though: `draft-2-audit/inputs/` holds hash-verified copies of all six source files and the HTML. | Before the next revision, copy those frozen inputs into `../archive/ai-workers/` with the `-v3-draft2-revised-2026-10-17` suffix. Do not try to recreate the earlier checked HTML; record that only its data and views survive. |
| B10 | Refine | The footer reads "Legal points unconfirmed, no counsel" (`:1258`); the required label (README rule 6) is "Unconfirmed: no counsel". TC-177 and change 9 are already owned in NEXT's "Open" list. | Use the exact label in the footer. Leave TC-177 out of this plan; it is tracked, and the one-pager should not wait on it. |

## 3. Where I differ from the audit

- **The audit missed these:**
  - The missing document readiness at submission (A1).
  - The "red = blocked or flagged" conflation that makes acknowledging a block look like resolving it (A3).
  - The 4.1 near-duplicate check and the 4.4 trigger that create the dead end (A5).
  - A6 affects the right third of every wide diagram, not just two shapes.
- **It overstates these:**
  - Superseded approvals and cut-offs (A2), which version stamping and the 8.2, 10.1 and 10.3 rules already answer.
  - The validation environment (A3), which the known-issues list already covers.
  - B6, where grey "not yet checked" plus the review of important fields already covers most of it.
  - B9, where its own frozen inputs already preserve the current target.
- **Its BPMN self-challenges in §9 are correct:** conditional catches after an event gateway are valid, and no labels are clipped.

## 4. Scores (my own; not inflated to reach 8.5)

| Test | Audit | Lead | Why I differ |
|---|---:|---:|---|
| Best solution | 8 | **7.5** | Two of the issues are wrong rules, not ambiguities: "fixed on the fact" for a format error, and no document check before submission. The design itself is sound. |
| Best communication | 8 | **7.5** | The founder's core request (inspect without losing the activity) fails for the right third of every wide diagram at the two most common desktop widths. |
| Best requirements (high-to-medium) | 7.5 | **7.5** | Agree. |

**After the plan below:** 8.5 on all three is realistic if the scenario walks pass and the checker confirms. Communication could reach 9 after the panel fixes and one new-reader trial. Feasibility stays limited by evidence until the real read (NEXT step 2), which is the right limit.

## 5. Correction plan (data, views and builder only; one build; no new step, service or approval)

| # | Change | Where | Acceptance check (meaningful, not just structural) |
|---|---|---|---|
| 0 | Archive the frozen review target (B9) | `../archive/ai-workers/` | Seven files present; hashes match `input-manifest.json` |
| 1 | Separate facts from document lines; document readiness at 9.5; relabel X9 (A1) | 7.2, 7.3, 9.5, X9 | Scenario: an unreadable passport → the date question is answered and confirmed, but the passport line shows "re-upload needed" and 9.5 is not ready. Re-upload or the agent's recorded reason → ready. The X9 loop ends once the facts are present. |
| 2 | Filing boundary; current required set; new copy joins; filing-level close; two labels (A2) | 7.1, 8.1, 9.3, 9.4, 9.6, catch C6a, end E6 | Scenarios: two required copies with one approved → not ready. Becoming common-law adds IMM 5409 to the set. The principal is decided and the partner pending → case open. Edition past its cut-off at 9.5 → blocked. |
| 3 | Cause-based 9.2 returns; wrong-fact route drawn; red split into blocked and flagged; 9.3 rule (A3, B4) | 9.2, 8.4, 9.3, 9.1, the checks table, view 5 | Scenarios: a correct date with a format error → the fact is unchanged and the mapping is reported. A wrong date → 8.1. A blocked item cannot be acknowledged into approval. The card and the diagram show the same three routes. |
| 4 | Approval binds to the final file; re-run read-back on that file; hand-entered fields listed (A4, B7) | 9.2, 9.3, 8.5, `BUILD_GAPS` | Scenario: a date mistyped in 9.2 shows against the confirmed fact in 9.3 and prevents approval. Editing the file after approval withdraws it. |
| 5 | Two finding classes; 3.1, 4.1, 4.4 and X3 edits (A5) | 3.1, 4.1, 4.2, 4.4, 5.1, view 3 | Scenarios: a near-duplicate reaches 5.1 and the publisher merges it → released. An AI disagreement on a correct mapping is closed with a recorded reason, with no re-draft. A missing mapping returns to drafting. |
| 6 | The panel keeps the selection visible; the phone background is inert (A6, A7) | `build_one_pager.py` JavaScript | New browser checks: occlusion at 1280 and 1440 for 3.8, 9.3 and the rightmost shape of views 3, 5 and 6; the phone background click stays in the sheet. The 84 existing checks still pass. |
| 7 | Wording items B1, B2, B5, B6, B10; tooltip B3 | 3.1, 3.7, 1.3, 8.3, footer, JavaScript | Text present; Escape closes the tooltip |
| 8 | Ledger metadata (B8); re-run the build, ledger and browser suite | ledger, checks | 0 build errors; ledger reasons match the cards; all old and new checks pass |

**Scenario walks:** steps 1–5 are checked by walking Client A's case through the changed cards and diagrams. The new browser checks cover only the interaction findings. The separate checker then gives the formal verdict.

**Founder questions:** none needed. Every correction reuses an existing owner and control. B6 is a Lead ruling the founder may overrule. Which filings must be submitted together is the specialist's call, so it stays pending.
