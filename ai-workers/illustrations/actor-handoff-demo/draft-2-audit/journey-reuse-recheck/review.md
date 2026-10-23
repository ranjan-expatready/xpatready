# Focused review: business journey and returning-client reuse

17 October 2026. Independent advice, not the formal checker verdict. No shared product files or decisions were changed.

## Verdict

**Keep both additions. They substantially meet the requested direction, but one reproduced interface regression and two reuse-state ambiguities need local corrections.** Do not redesign the page or add an AI agent for structured fact selection.

Reviewed revision: HTML SHA-256 `e1016dea6aeb7e33506b4049fe9df8077d00c97fd974269852715ea7eb3d7731`. Frozen inputs and hashes are in `manifest.json` in this folder.

Read the Lead's completion report/change record, the overview content and generation logic, the new shared-record rules and examples, affected activities, panel implementation and browser tests. Inspected the maker's light/dark overview, phone and stage-panel screenshots. Repeated the entire maker browser suite against the frozen page, writing evidence only here: **123/123 passed**. Independently probed new stage-card occlusion at 1280 and 1440 pixels; results are in `stage-observations.json` and the corresponding screenshots.

This is a focused review of the two requested additions. The later comprehensive audit, formal checker verdict and founder acceptance remain separate. No live source/code freshness check was repeated here, so the Lead's new source/code-gap assertions are not independently endorsed as current in this report. Findings below rely on the current artifact's own content and observed UI.

## What is improved

- The introduction now shows three understandable bands: setup once, each case, and change. Plain arrows, role labels and receives/does/hands-over explanations replace the need to decode BPMN first. Detail remains in context; the BPMN views and optional legend remain available.
- Both client entry routes are visible. An existing client can open a new case directly. Needed new eligibility questions remain in the detail; the completion report's shorter phrase “no repeat of PQR” should be read with that qualification.
- Stage 5 and activity 7.1 explain fact-by-fact reuse. The shared record distinguishes confirmed, unconfirmed, historical and conflicting information; the latest case is not copied wholesale.
- The examples cover no record, profile only, one prior case, multiple cases, document reuse and restricted/case-specific information. Existing approvals, signatures, receipts and outcomes are not carried into the new case.
- Deterministic rules are the appropriate simple design for selecting already structured, identity-linked facts. AI remains useful for proposing information extracted from documents. No new AI agent or master database is needed for the selection step.
- The page identifies this as desired behaviour with build gaps. It does not establish working product capability or measured accuracy.

## J1 — The new overview cards are covered by their detail panel

**Material usability regression, reproduced.** The old BPMN placement fix was not extended to the new stage cards.

In `ai-workers/tools/s3/build_one_pager.py`, `placePanel()` obtains `DATA.acts[current]` and returns when that is absent. The new stages belong to `DATA.cards`, so they always get the right-hand overlay rather than adaptive placement.

At 1440px, opening stage 3 leaves its card at x975.7–1331 while the panel occupies x980–1440. Almost the entire visible card width is covered. Its eye control is covered too. Stages 5, 6, 9 and 12 are also covered to differing degrees at both tested widths. At 1280px, the panel covers stage 3's entire card width.

**Smallest fix:** use the selected overview card's bounds, as well as BPMN shape bounds, when positioning the existing panel. Keep the selected card's title, role and eye visible; preserve page position and close/focus-return behaviour. No new panel is needed.

**Acceptance:** at 1280 and 1440, open stages 3, 5, 6, 9 and 12, verify the selected card stays visible and another stage can be selected without closing, then verify Escape returns focus. Retain the passing BPMN and phone checks.

## J2 — A newer unconfirmed replacement must have an explicit effect on readiness

**Material behavioural ambiguity, not a reproduced product bug.** The new passport example says “Confirmed passport stays current · new number 'to review'.” The record rule appropriately prevents an unconfirmed value silently replacing a confirmed one. Activity 8.1 says the agent acts on “to review” values. However, its ready condition still asks only that required facts are confirmed with no conflict left; the old value already meets that literal condition, and “to review” is distinguished from a conflict.

The reader needs to know what happens while evidence suggests the confirmed value might no longer be appropriate for the new filing. Preserving the old record is not the same as clearing that value for filing.

**Smallest fix:** distinguish the retained stored value from its current filing readiness. An unresolved proposed change affecting a required fact must be explicitly resolved before the affected output is approved/submitted, using the existing review. The reviewer can confirm the replacement or reject the proposal with evidence; the old value is not automatically discarded or automatically treated as fit to file. Unrelated facts and copies can continue.

Similarly, a value awaiting required “still true?” confirmation may be displayed pre-filled but must not count as having completed that reconfirmation. Do not add routine review of every unchanged fact or a new approval tier.

**Acceptance:** confirmed old passport + declared new number → display the statuses separately; the relevant review remains open; resolve by confirming the new fact or rejecting the proposal before that output is cleared. A required address reconfirmation stays pending until answered. A stable confirmed fact with no dispute/reconfirmation requirement continues normally.

## J3 — The scenario matrix contradicts the examples on pre-filling

**Minor consistency issue.** The last row groups “missing, outdated, disputed or contradictory information” and gives “Nothing for that fact” in the pre-filled column. But the same row asks “still true?”, the address example displays Address 2, and the passport example retains the confirmed passport while the new value waits for review.

**Smallest fix:** make the cells status-specific. Missing → blank; due for reconfirmation → candidate shown pre-filled/pending; proposed replacement → old confirmed and new proposal separately shown, with affected readiness pending; unresolved competing confirmed values → alternatives shown, no selected output value. Use the same meanings in stage 5, 7.1, 7.2 and 8.1.

There is also a small absolute-wording mismatch: 7.1/stage 4 says an earlier case “is never changed,” while 7.1 later says a confirmed shared-fact change marks another open case's affected outputs for preparation/review. Narrow the first statement to “opening a case does not alter an earlier case; later confirmed shared-fact changes follow the explicit affected-case rules; submitted snapshots remain unchanged.”

## Evidence and remaining scope

The 15 new “reuse walks” in the browser suite assert that rendered text contains expected phrases. They are useful **documentation coverage checks** and did pass in the repeated suite. They do not execute a fact resolver against competing records or demonstrate a working case workflow. No product simulation or prototype is needed now; describe the evidence accurately and validate the documented expected outcomes by reasoning through the states above.

The overview is more accessible to a business reader but remains a detailed reading surface: roughly 1,900px tall in the supplied desktop capture and much longer on a phone. This is acceptable under the founder's preference for justified scrolling. Do not remove useful handoff descriptions merely to shrink it. The five-column example table in the narrow panel is a candidate for a later readability check; it is not an automatic failure or a reason to redesign during this correction.

The original R1 (document disposition authority), R2 (signature-only changes) and the view-6 part of R3 (filing repetition), plus the 8.3/8.4 unavailable-checker trigger wording, remain tracked. Stage 8 now explicitly explains independent filings unless joint submission is required: that improves R3's high-level explanation, though the detailed diagram boundary still needs consistency.

**Next:** validate J1–J3 and make only confirmed local corrections. Then the founder reviews the two additions, followed by the comprehensive quality audit using the saved framework. Report scores from evidence; do not claim nine out of ten merely because the requested features are present.
