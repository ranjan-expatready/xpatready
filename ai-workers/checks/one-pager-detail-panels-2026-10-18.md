# One-pager detail panels: change record, verification and scorecard

18 October 2026 · Lead (Claude Code). Applies `illustrations/actor-handoff-demo/detail-panel-audit/claude-next-pass-prompt.md` with its audit (`review-and-strategy.md`, `panel-by-panel-review.md`). Presentation of the detail panels only: no rule, approval, role, permission, screen or later artifact was added. Not a new full solution, legal or code audit.

- **Order kept.** The annotated-flow revision was finished first: the checker's C-M1 and minor findings are fixed (`one-pager-draft-3-checker-fixes-2026-10-18.md`). That completed version (`9fc94c35…3390`) is archived whole as `archive/ai-workers/*-v3-draft3-final-2026-10-18.*` with `manifest-v3-draft3-final-2026-10-18.sha256`.
- **Result:** `problem-1-pathway-setup-and-form-filling/solution-1-one-pager.html`, hash `401457aa…71af`.
- **Sources:** `tools/s3/s3_panels.py` (new: the reading layer), `build_one_pager.py` (renderers, panel behaviour, checks), `s3_data.py` (role wording), `check_one_pager.cjs` (updated), `check_panels.cjs` (new).

## 1. The audit's findings against the completed version

The audit froze `b868aa2b…` while draft 3 was in progress. The panel renderer was unchanged between that freeze and the completed version, apart from two items, so most findings still applied.

| Finding | At the freeze | In the completed draft 3 | Now |
|---|---|---|---|
| D1 Repetition | Receiver shown twice; output and record handed over; action, person line and Actions retell one operation | Unchanged | **Fixed.** One "Next" (receiver) line; record handed over moved to Sources and detail; the person line and one-line action show only when the steps do not already say it (25 folded into the steps, each listed in the preservation record) |
| D2 Reading order; "No screen (background) no screen"; stock "No human action" line | Present | Unchanged | **Fixed.** Purpose, who acts, before it starts, how it works, result. Nine automatic steps say "Runs automatically. Results appear in …". The stock line is gone; "Checked by" names who reviews the output later |
| D3 Stage and activity depth | New client mostly a repeated paragraph; stage 5 opened 15 rules | Unchanged | **Fixed.** Every stage and way in has a purpose and an ordered Who · What happens · Result story. Stage 5's rules are closed until opened; its hold rule stays visible in Good to know |
| D4 Composite and payment roles | 10.2 headed Content publisher only; stage 8 "submits and pays"; actors "arranges payment" | Unchanged | **Fixed, from verified sources.** 10.2 shows coordinator, AI and platform, SME and a second-person approver who is never the drafter or coordinator. Submission needs the firm's submit permission (AG-07 AG-7-31, BR-10); the fee is paid by "the client, or the firm on the client's behalf" (AG-07 §3.10). Stage 8, 9.5, the actor guide and the terms now say that. No permission was changed. "The case" as a receiver is replaced by where the work continues and who acts next (23 next-step labels) |
| D5 Examples at panel width; empty Example in 10.2 | Five-column tables cramped | **Partly fixed by the Lead after the freeze:** wide tables became expandable rows (a disclosure inside the Example) | **Refined.** Wide tables are now a two-column comparison (key and outcome side by side) with each row's other columns as labelled lines directly under it: nothing hidden, no disclosure inside a disclosure. 10.2 has no Example button; it links to the real examples in 3.2, 5.1 and 10.3 |
| D6 No Back after drill-down | No in-panel return | Unchanged | **Fixed.** "← Back to <parent>" after any in-panel link; it restores the parent's open sections, example and scroll, and puts focus on the link used. Direct entry has no Back. The parent map element stays selected and visible; the map does not move |
| D7 Stage 3 "Anything blocking or undecided?" → Yes back to drafting | Present | **Partly fixed:** "Any blocking failure, correction or rule not signed off?" removed "undecided" but asked about review outcomes before review | **Fixed.** Two decisions, matching view 3: "Any blocking check failure?" (Yes → affected items to stage 2; No → review, where 'decide' items are decided by the reviewer with no re-draft) and "Correction, or a rule not signed off?" (Yes → those items to stage 2; No → the approver) |
| D8 Truth labels | Gap status only inside the Rules list | Unchanged | **Fixed.** A visible "Not built yet in today's code" note sits under How it works on the 16 activities with a build gap; the code reference is in Sources and detail. Rule tags (team requirement, founder decision, proposed, not built) stay on every rule |

Per-panel notes were followed as guidance. One was not applied as written: the note on 3.4 asked for text labels instead of ticks; the current 3.4 example already uses words, so nothing changed.

## 2. What changed

**Activity panels (41).** First view, in order:
1. **What this achieves:** one new sentence each, written from the existing content.
2. **Who acts:** the performer with its product role (or, for 9.3, 9.4, 9.5 and 8.5, the exact performer), the authority line, and "Checked by" where a different person reviews the result (16 activities).
3. **Before it starts:** Starts when (trigger), Needs (prerequisite), Works on (input). These stay three lines because they mean different things.
4. **How it works:** the numbered steps, the person's line only where it adds something, and the build-gap note.
5. **Result and what happens next:** Produces, Next (with the receiving condition as "Then"), Done when, and **If not** (the return or hold route, kept visible).

Below that, at one level only: Rules and exceptions; Example (or links to real examples); Acceptance checks (normal and alternate case); Sources and detail (record handed over, records read and updated, traces, build-gap code references).

**Stage and way-in panels (14).** What this achieves; Who does what, in order (with the stage's runs mark); Starts with; Result and what happens next (way A links to stage 4, way B to stages 4 and 5); Decisions; Good to know; then Rules and exceptions, Example, and Detailed activities.

**Reference panels.** Who is who and Diagram symbols keep their own form. No trigger, receiver or test was added. The lead representative's row and the terms now carry the verified submit and fee wording.

**Behaviour.** Back to the parent; per-panel example state (an example opens only where the reader opened it, or from the map's Example button); the parent stays selected and the panel stays clear of it; Escape and Close clear every selection and return focus to the original opener; phone sheet unchanged (modal, page inert, focus kept in the sheet).

**Data wording (s3_data.py).** Stage 3 decisions split as above. Stage 8's who-line and summary, the lead representative's row and the term name the authorised submitter and the fee payer. 9.5's authority reads "People submit and pay; never the product."

## 3. Content preservation

`checks/one-pager-detail-panels-preservation-2026-10-18.md` is generated at every build. Every original string of every activity and stage panel was compared with the built panel. The strings covered are: title, input, action, output, receiver, person line, trigger, prerequisite, authority, done-when, return route, record handed over, receiving condition, screen, multi-instance, acceptance, steps, rules, exceptions, traces, build gaps, every example cell, decisions, pointers, stage summary and who-lines.

- **2,057 shown word for word.** 116 not word for word: 83 merged (the same content in a named place), 33 clarified (reworded, with the old text and the reason). **None removed.** The build fails if any string is neither shown nor listed.
- Clarified: the 23 next-step labels; the 9 "No screen (background)" lines; 10.2's empty-example reason.
- Merged: 25 one-line actions and person lines that repeat the steps; 5 exceptions that repeat the visible If not route; the 14 stage summaries and their map who-lines, now told by the story tables.
- The automatic "merged" test (80% of content words present, or an exception repeating the If not line) is coverage evidence, not proof of equal meaning. The Lead read every merged row; two rows naming the wrong story row were corrected.
- **Examples kept in full:** 1.1 source set (IMM 5476 row added for draft 3), the 3.2 mapping rows, the reuse example (6 rows) and the scenario matrix (8 rows) in 7.1 and stage 5, the 9.6 two-filings table, and all others.

## 4. Verification

| Check | Result |
|---|---|
| Build structural checks, rewritten for the item type: purpose; start condition; result and next; done-when; route if not; steps; authority on person steps; result location on automatic steps; composite roles with a never-the-drafter approver; an example or a link to one; one acceptance check or more (not exactly two); stage story rows; stage 3's 'decide' route; no disclosure nested in another; no filler ("N/A", "No screen", "No human action", "Receiving owner"); reference panels free of activity fields; one payment wording | All passed |
| Main browser suite (`check_one_pager.cjs`), with the tests for the old layout replaced by tests for the new one (five-part order, per-panel example state, comparison tables, drill-down with Back and restored state) | **150/150** |
| Panel suite (`check_panels.cjs`): 3.2, 5.1, 7.1, 8.3, 9.3, 9.4, 9.5, 10.2, New client, Reuse, stages 3 and 8, Who is who, Symbols; every one of the 57 panels; keyboard drill-down and Back; switching; selection visible at 1,280px; Escape and focus; per-panel examples; phone sheet drill-down and Back with the page inert; examples and story at 375px light and dark and at 768px | **35/35** |
| Visual inspection (screenshots at 1,440px): New client, 3.2, 10.2, 9.5, stage 3, stage 5 with its example, stage 8; phone New client (`checks/s1-onepager-panel-newclient-phone.png`) | Read by the Lead; two layout fixes made (story column widths, runs mark placement) |

The text checks show that each panel states the required thing. They do not execute a product workflow. Not done: a new-reader trial, a screen reader, Safari or Firefox, a real device.

**Size, recorded, not a limit.** Activity first views are now 100–366 words (median 183). Expanded, with every section and the example open, the median is 473. The audit measured 173–361 visible (median 227) on a differently counted, ten-field view. 7.1 is the longest expanded panel (1,728 words, mostly its three examples), and stays closed until the reader opens it.

## 5. Panel scorecard (expert judgement, not measured)

| Criterion | Before | After | Reason |
|---|---:|---:|---|
| Requirements coverage | 8.5 | **8.5** | Nothing removed; every string accounted for. Coverage was already strong |
| Precision and role clarity | 7.5 | **8.5** | Composite roles, submitter and fee payer verified against the team's documents, next-step labels, stage 3's routes. Not 9: 9.5 is still drawn in the representative's lane, and "normally the lead representative" is the page's gloss over the team's default holders |
| Human readability | 6.5 | **8** | A purpose line first, no duplicate fields, plain result locations. Not higher: some first views are still long (7.1, 10.2, 3.2), and no reader has tried it |
| Navigation and context | 7 | **8.5** | Back with restored state, per-panel examples, parent stays selected. No screen-reader test |
| Fit to the selected item | 6 | **8.5** | Stage stories, activity contracts and reference panels each have their own form; 10.2 links to real examples |
| **Overall panel experience** | **7** | **8.5** | A clearer reading order with precision kept. Nine needs a reader trial and a screen-reader pass |

| Panel | Before | After | Why |
|---|---:|---:|---|
| New client (way A) | 5 | 8.5 | Client → platform → agent story with results, next step, both decisions and the no-automatic-merge rule; links follow the explanation |
| 3.2 Generate form field maps | 6.5 | 8.5 | Runs automatically with its result location; the reviewer is named; the uncertain-person hold is visible; the gap note is near its claim |
| 10.2 Re-run and publish the change | 5.5 | 8.5 | Four distinct roles with no self-publication; real example links instead of an empty one |
| Stage 5 Reuse verified information | 6 | 8 | Story and hold first, rules closed. The example is long (1,369 words expanded), but it is the page's key worked example |
| 9.5 Submit and pay | 6.5 | 8.5 | Submitter and fee payer verified and separate; the readiness holds stay in If not |
| Stage 3 | 7 | 8.5 | The 'decide' route no longer looks like re-drafting; matches view 3 |
| Stage 8 | 6.5 | 8.5 | Split decision (C-M1); four distinct authorities |
| 7.1 Convert the lead and open the case | 6.5 | 8 | Clear first view; three large examples behind one closed control |
| Who is who | 7 | 8 | Payment aligned; the proposed SME is stated |
| Diagram symbols | 8 | 8 | Unchanged, as the audit advised |

The whole-page six-lens assessment is left to the separate checker under the saved framework. This record is a panel pass, not a rescore of the solution.

## 6. Status

**Ready for the separate checker** under the existing process: (a) the targeted C-M1 recheck from the draft 3 verdict; (b) this panel pass (material findings and regressions only). No founder decision was needed. No slides, detailed pack, product screenshots or prototype were started. Nothing committed.
