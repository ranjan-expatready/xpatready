# Revised one-pager: verification after the consolidated-audit fixes

17 October 2026. Independent advice for the founder and the separate checker. This is not the formal checker verdict and changes no shared product file, decision or status record.

## Recommendation

**Keep this design. The corrections are substantial and the interaction defects are closed in the checks performed. Two behavioural rules still need a small correction, and one diagram boundary needs clarification.** None requires a new component, review tier, product prototype or document rewrite.

The one-pager is ready for the founder to inspect as a draft. It should not yet be called unconditionally accepted or implementation-ready. The next step remains the separate checker's focused re-review, followed by the founder's acceptance of this artifact. The real-form read remains a subsequent evidence step.

## What was actually verified

Reviewed the pasted completion report, current instructions and NEXT, the Lead's validation response, its fix record, changes to activity content and diagram flows, and the panel implementation. Compared the new content with the frozen prior audit target.

Current reviewed HTML SHA-256: `d6d07e4fcd2cbcd69ba95a234334081a8634e920d9f1825f2524f526a996432a`.

- Frozen current inputs and hashes are in this folder's `manifest.json`. These copies keep this recheck reproducible if the Lead subsequently changes the page.
- **Re-ran the maker's complete browser suite against this frozen HTML: 91/91 passed.** Outputs and screenshots were redirected into this review folder; shared check files were not overwritten. See `independent-rerun-results.json` and `rerun-checks.cjs`.
- Additional probes selected **all 41 activities at 1000, 1024, 1100, 1280 and 1440 pixels**. No selected shape intersected the panel in those tested positions. This extends the maker's selected samples; it does not establish every possible scrolling/resizing state.
- At phone width, repeated reverse keyboard navigation stayed inside the panel. Escape closed it, removed background inactivity and returned focus to activity 8.4. The maker's repeated suite also reproduced the corrected background-click and forward-keyboard behaviour.
- Read changed diagram routes and inspected screenshots for views 3–6. Sticky navigation appears over the top of some automated element screenshots; that is a capture condition, not evidence that a diagram label is outside its canvas.
- Confirmed the eight archived files exist. The Lead reports matching their hashes to the original manifest; this recheck did not independently re-hash that archive.

**Verification limits:** the 19 scenario walks are documented in the Lead's fix record. No separate saved executable scenario suite was found among the named current tools/checks, so this report does not claim to have re-run those 19 assertions. Reading requirements and checking rendered wording can verify a documented scenario contract; it cannot establish that the future product executes it. No real PDF filling, Adobe validation, AI accuracy test, portal execution, screen-reader or new-reader trial was performed. The build and preservation pass are Lead-reported here; the browser pass above was independently reproduced.

## Disposition of the earlier material findings

| Finding | Recheck | Reason |
|---|---|---|
| A1: facts versus documents | **Main separation fixed; R1 remains** | Answers supply facts; unreadable evidence has its own re-upload status; submission now checks evidence lines. But the exception permits a recorded reason without defining its authority. |
| A2: filing boundary | **Substantially fixed; R3 clarification remains** | Copies, approvals, signatures, fees and outcomes belong to a filing; a newly applicable form joins the set; one decision does not close another pending filing. The diagram still needs to state how its filing stages repeat. |
| A3: validation cause and blocked/flagged | **Closed for the blueprint** | Wrong facts return to fact correction, mapping/format faults go to support, environment issues have their own handling. An acknowledged hard block cannot become approvable. |
| A4: final artifact approval | **Main correction fixed; R2 arises from the new wording** | Review now covers the actual uploaded final file, including manual/calculated values, with re-read or direct human inspection. The new blanket invalidation rule also captures ordinary signing. |
| A5: review versus technical failure | **Closed for the blueprint** | Near-duplicates, uncertainty and model disagreement can reach human review; genuine blocking failures return for correction. Model consensus is not required. |
| A6: selected activity hidden | **Closed in tested states** | Adaptive placement works in the repeated maker suite and the additional all-activity probe. |
| A7: phone modal background | **Closed in tested states** | Background inactivity, forward/reverse keyboard navigation, close and focus return passed the tests described above. |

The smaller wording, transform, shared-run, tooltip and evidence-gap corrections are useful and should be retained. Do not reopen settled reusable-map, central-release or case-adoption decisions.

## R1 — A reason alone must not satisfy a required document

**Class:** material readiness ambiguity; residual A1.

Current `ai-workers/tools/s3/s3_data.py:1131`, activity 9.5:

> Every required document line of this filing is accepted (read, right person, confirmed) or carries a reason the agent recorded

The rest of that rule assigns permitted substitute-document values to the specialist. That is useful, but it does not qualify the standalone alternative, “or carries a reason.” The same broad alternative appears in 7.2, 7.3 and 9.5's return condition.

**Counterexample:** the passport evidence remains missing. Staff record “client has not supplied it.” Under the literal rule, a reason now exists and the required-line gate can pass. A log entry explains a gap; it does not by itself establish permission to proceed. This is a document ambiguity, not a claim that a deployed product currently bypasses a government rule.

**Smallest correction:** require either accepted evidence, including authorised human assessment when automated reading fails, or an explicit disposition permitted by the applicable checklist/rule and recorded by an authorised role. The existing representative's final approval remains. A permitted alternative/exception is defined or confirmed by the specialist; a reason alone supplies no permission. Preserve warning-only expiry behaviour and hold only the dependent filing where applicable.

**Acceptance:** missing required evidence plus “awaiting client” stays unresolved. An allowed alternative or authorised exception can resolve it with the supporting rule and evidence recorded. A person may accept readable evidence even when OCR failed; successful OCR is not itself the evidence-acceptance authority.

This guardrail should have been stated more clearly in the earlier correction plan. It narrows the wording of the agreed fix; it does not request a new approval process or invent an immigration exception.

## R2 — Ordinary signing must not invalidate the approval that enabled it

**Class:** material lifecycle contradiction introduced by A4's new wording.

Activity 9.3, `s3_data.py:1076`:

> a later fact change or any change to the file withdraws it

Activity 9.4 signs the approved copy, updates the outputs and approvals, and then hands signed copies to 9.5 (`:1089–1107`). Signing an embedded-signature PDF, or uploading its signed scan, changes the file. The existing signature rules do not explain how that expected change preserves the reviewed content approval. Not all routes modify a file, but the blanket rule also covers those that do.

**Counterexample:** the representative approves the completed unsigned form; the required signatory signs it without changing an answer. The file fingerprint changes. The literal rule withdraws approval, although the depicted next step is submission. The document gives no defined resolution for this ordinary path. Do not describe this as a reproduced runtime loop: the workflow is a blueprint.

**Smallest correction:** distinguish a content change from the authorised signing/declaration transition. Preserve the approved content version and link it to the resulting signed artifact and signature evidence. A signature-only change can preserve content approval once the expected transition and unchanged answers are established; an answer, mapping, edition or substantive output change requires affected review/signing again. If the system cannot establish that the signed artifact corresponds to the approved content, keep it for the existing representative's check. Do not merely exempt arbitrary newly uploaded files because they are labelled “signed.”

**Acceptance:** approval → valid signature-only transition → submission remains possible. A signed upload with a changed birth date does not inherit approval. No new service, signature technology or standing extra approval tier is required by this clarification.

## R3 — Explain the per-filing repetition in view 6

**Class:** focused diagram clarification; residual A2, lower severity than R1/R2.

Activity 7.1 now says each applicant has their own filing, and view 6's subtitle refers to “each filing.” However, the pool is still explicitly one process per case (`s3_data.py:45`); view 6 has one 9.4 → 9.5 → 9.6 route, and “Every filing decided? / Not yet” returns only to waiting for a government message (`s3_views.py:233–271`). No note or repeat boundary explains how a second filing reaches signing and submission after the first advances.

This is acceptable abstraction if it is stated. It does not require executable BPMN or a new participant.

**Smallest correction:** add a plain note and, if useful, a recognised repeat/subprocess boundary: approval readiness, signing, submission and response handling apply separately to each filing; the case groups their outcomes. A filing still preparing does not prevent another advancing unless the applicable route requires joint submission, which remains specialist-confirmed. Reuse the existing activities.

**Acceptance:** show one small state table: principal filing submitted, partner filing still preparing; later the partner can be signed/submitted; a principal decision alone leaves the case open. The current common-law-partner form example need not assert that every partner has a separate application; use an explicitly illustrative case with two applicants.

## B6: my recommendation on the unavailable AI meaning checker

**Keep the Lead's human fallback as a proposal.** It is a reasonable simple design because the AI meaning checker is itself proposed and unmeasured, and both agent review and representative approval already exist. Its failure does not automatically justify blocking all work.

Its fields remain explicitly “not checked by AI,” receive the intended focused human meaning review against person/fact/source, and the approval records that fallback. Existing hard validation, missing-fact, evidence, read-back and final-artifact requirements continue to apply. Grey alone is a status, not a completed review. Activity 8.4's trigger can say “meaning check completed or unavailable fallback selected” to match 8.3's exception. This is a wording alignment, not a new workflow.

## Scores and the next step

Scores are expert judgments of the blueprint, not measured success probabilities.

| Founder test | Current | Assessment |
|---|---:|---|
| Solution quality | **8/10** | Coherent, simple architecture and useful recovery controls. R1/R2 still affect ordinary readiness and completion. |
| Communication | **8.5/10** | Meaningful detail is available in context, and the reproduced panel defects are resolved. R3 and a new-reader walkthrough would strengthen it further. Necessary length is not penalised. |
| High/medium requirements | **8/10** | Most important activity contracts are now clearer. R1/R2 need precise expected outcomes; R3 needs one boundary explanation. |

Across the six lenses: readability 8.5, usability 8.5, honesty/transparency 8.5, completeness/precision 8, solution quality 8, implementation feasibility 7. Feasibility remains constrained by the openly pending real-form/XFA/portal evidence, not by the length of this one-pager. Communication and blueprint clarity need not wait for a production implementation to score well.

**Finite next step:** the separate checker validates or refutes R1–R3, confirms closure of A1–A7 on this exact revision, and records its formal verdict. The Lead makes only confirmed local corrections. Recheck the changed scenarios and retain the passing browser checks if the interface changes. Then the founder reads and accepts the one-pager before the real read and later artifacts begin. Do not turn this into another broad redesign or promise a score increase without checking the result.
