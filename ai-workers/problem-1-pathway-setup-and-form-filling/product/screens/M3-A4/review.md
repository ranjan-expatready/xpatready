# M3-A4 (B106) Eligibility rules on the combination: independent review

Reviewer (Opus, fresh context, did not build), 6 Nov. Commit **2e7f53506** (branch `claude/funny-gates-pgthb4`, PR #1172). Own copy `rev106` on :4442: web built from 2e7f53506 at the start of the review, Visitor visa fixture (setup_visitor_visa 15/15; setup_vv_m3 44/46, the known S2w and S7a gaps; S7 and S8 pass). Then a fresh copy `rev106b` on :4442 for the builder's check. Both copies are stopped. Live AI off, US$0, nothing priced clicked.

## Verdict
**Rework → Block.** The concept is fully built and the server side is sound. But buttons inside the dialog that are not Save submit the form, so they save the whole set and can close the dialog (Blocker 1). Everything else is a Minor.

## Blockers and Majors
**Blocker 1 (Must): "Add a comparison", "Add a gate" and "Add a line" act as Save.** `Button` sets no `type` (`web/src/components/ui/controls.tsx:33-36`). Inside `<form onSubmit={save}>` (`eligibility-gates-editor.tsx:155`) every button that is still on the page after its own click submits the form. That covers `:187` "Add a gate", `:198` "Add a line" and `conditions.tsx:145` "Add a comparison".
* Seen on screen: I typed "Passport on file, half-typed" in gate 1, then clicked "Add a comparison" in gate 2. One PUT went out. The draft went from v1 to v2 with the half-typed label (audit row 11:29:09, "2 gates"), the dialog closed, and the toast said "Eligibility rules saved to the draft" (`b3-add-comparison-saved.png`).
* "Add a gate" and "Add a line" send a PUT straight away and show "Some details need fixing" before anything has been typed. Those errors then stay under the new fields while the person types (`b1-after-add-gate.png`).
* What breaks:
  * BR-1 "one set, one save": a half-done edit reaches the draft and counts as authoring for BR-14.
  * The leave guard is bypassed.
  * A new gate with two comparisons (an "all of these" rule like the checkpoint's own `vv.travel_document`) cannot be built in the simple editor when the rest of the dialog is valid, because the second row's button saves and closes.
* Why the builder's check missed it: it always clicks Add and then Save (`check_b106_gates_browser.cjs:87-89, 129, 229`), so an early save is hidden by the field errors it expects.
* Fix: either give the dialog's non-Save buttons `type="button"`, or replace the `<form>` with a `role="group"` container and keep Save in the footer.
  * Option 1: put `type="button"` on `:156` Reload and on `:181-198`. In `conditions.tsx:134,145` the change is harmless to the four other users, because none of them is inside a `<form>`.
  * Add a fail test: change a label, click "Add a comparison", and assert there is no PUT and the dialog is still open.
* The independent breaker found this too (`break-report.md` B1).

No Major.

## Minors (Should)
1. **The ⓘ tooltip cannot be reached by keyboard and is not the team's `Tip`** (`eligibility-gates-editor.tsx:48`: a span with `title` and no tabindex). The same tab uses `<Tip tip=… focusable>` (`pages/workspace/questionnaires.tsx:175`). EXPERIENCE §2.10, §2.12. Fix: use `Tip focusable`.
2. **Status pills have no tooltip** (`:86`, `:93`: Released / New in draft / Changed in draft / Removed in draft). EXPERIENCE §2.10 [M] asks for tooltips on every status. Fix: a `title` such as "In the newest release; cases opened since read it" or "Saved to the draft; reaches cases after review and release".
3. **Cancel throws away edits without asking** (`:154` calls `close` directly). Escape does ask "Discard your unsaved changes?". The concept says "Leave guard when dirty". It is the same pattern as `answer-key-editors.tsx`. Fix: ask first when `dirty`.
4. **Focus is lost after save or close.** After keyboard Save, `document.activeElement` is `<body>`, because the dialog is unmounted (`:100`). Fix: return focus to the Edit button.
5. **The next step is not a link.** The concept's layout ends "Submit on Review and release →". The footer is plain text (`:99`). Fix: link it to `/c/<id>/review`.
6. **The disclaimer can be mislabelled.** With no draft disclaimer, the section shows the *released* disclaimer marked "(Sample default)" (`:98`). If the released one was a custom text, the words are wrong: the default goes into the next release. Fix: show the default text, or say "the Sample default goes into the next release".
7. **Test gaps** (`check_b106_gates_browser.cjs`): concept §6's "BR-5 empty disclaimer → release carries the default" is not asserted; "If not met: representative reviews" is never chosen by radio (only the round trip is checked); there is no save while a submission is waiting (only the line is checked). My walk saw the last two work.
8. **The empty-state header reads just "Draft"** (`:71`), with no count. Fix: "Draft: no changes", or hide it.

## What held (evidence)
* **J-A4 by screen:** the author added "Passport number answered" (keyboard path included) and saved in 183 ms. It showed New in draft and "Draft: 1 change", which matches Review's one Eligibility line. Submitted; the section and the dialog said "A submission is waiting…". The author's Approve and release is disabled. The approver was refused with the SME words. The reviewer (read-only on the section) signed, and the approver released. The section then read "Released in Release 4", the same as the header. A new case's Eligibility check lists the gate as Not answered.
* **Server:** case officer GET/PUT 403, client PUT 403, content reviewer PUT 403, no actor 401. A stale save gets 409 naming who and when, keeps the edit, and Reload reads their version. A double click on Save sends one PUT.
* **Keys:** a 160+ character Spanish label kept its key on rename. A Chinese label gives `gate.rule_1`. "Passport number answered!" gives `gate.passport_number_answered_2`. A 161-character label is refused on its field.
* **Q1 (`only="person-questions"`):** additive. With the prop off, `subjectLabel`, `typeOf`, the subject select and the derived read behave as before (`conditions.tsx` diff). I checked this by reading the code; I did not walk the four other users.
* **No sideways scroll:** none at 1024 px or 200 % (720 css px), on the section or the dialog. axe WCAG 2.2 AA found 0 issues on the section (filled and empty) and on the dialog at both sizes.
* **Builder's check:** re-run on my own fresh copy, **56/56, exit 0**.
* **Graph:** `graph.mjs` lists no gap for this screen. C6.9 is named by 5 tests. `route-has-screen.mjs` exits 0.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1…BR-9 and m1–m9 are all present and walked; Blocker 1 breaks BR-1's "one save" |
| D2 Data integrity | 3 | Version-checked UPDATE and duplicate labels refused by the server; but stray saves write half-edits (Blocker 1) |
| D3 Reuse | 4 | `ConditionBuilder` reused through one additive prop; library questions only |
| D4 Rule integrity | 4 | No calculated values offered; release-check problems shown under their gate (BR-7 test) |
| D5 Stability, recovery | 3 | 409 keeps edits, a double click sends one PUT, Escape guard; Cancel loses edits; Add buttons save |
| D6 Governance | 4 | Audit row per save; "Saved by …, time"; sign by reviewer, release by approver |
| D7 AI trust | n/a | No AI in this row |
| D8 Orientation | 4 | On the SQR tab below the page path; at the end of a long tab (as the tech lead agreed, m7) |
| D9 Flow | 3 | Review and release not linked; premature errors after "Add a gate" |
| D10 Language | 4 | Plain words, key only under Details; pills have no tooltips |
| D11 Feedback, state | 3 | Toasts and waiting line are good; a stray "saved" toast and premature errors (Blocker 1) |
| D12 Visual | 4 | Team cards, pills, notices; screenshots look clean |
| D13 Accessibility | 4 | axe 0, keyboard path, 1024/200 %; ⓘ not focusable; focus lost after save |
| D14 Team look | 4 | Team components; the ⓘ is not the shared `Tip` |
| D15 Speed | 4 | Save 183 ms, dialog 100 ms, tab switch 0.9 s, full reload 1.8 s; no request per row |
| D16 Testability | 4 | 56/56 on an independent re-run; pass and fail per BR; misses Blocker 1 and the BR-5 default |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | 4 | Sample labels, "(Sample default)", saved by and at; key under Details |
| D19 End-to-end | 4 | Configure → sign → release → case check by screen, on the fixture (A1 not on main) |
| D20 Pain and wow | simulated only | Founder or user walk needed |

## Journey test (reviewer, 6 Nov; no separate file per the caller's instruction)
Journeys:
1. Main: the author adds a gate → reviewer signs → approver releases → a new case lists it.
2. Alternate: rename a gate; choose "representative reviews".
3. Empty: Study permit's empty state → Add.
4. Error: empty label, 161-character label, 121-character line.
5. Wrong role: approver, reviewer, case officer and client, by screen and by API.
6. Recovery: double click, Escape and Cancel with edits, error state on a 500, stale save across two tabs.
7. Boundary: Review and release, and the case's Eligibility page.
8. Break: non-Latin label, duplicate words, "Add a comparison" mid-edit (found Blocker 1).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J-A4 end to end by screen |
| Next step obvious | ½ | Review and release not linked; "Add a gate" shows errors at once |
| Plain words | 1 | No IDs on the main path; copy as written in the concept |
| Feedback and state | ½ | Stray "saved" toast and premature errors (Blocker 1) |
| Correct data | ½ | A half-typed label saved to the draft without pressing Save |
| Error recovery | ½ | 409 and Reload good; Cancel loses edits silently |
| Accessibility, sizes | ½ | axe 0, 1024/200 % fine; ⓘ not keyboard-reachable, focus lost |
| Speed | 1 | Everything under 1 s once loaded |
| Visual quality | 1 | Clean, team look |
| Trust and sources | 1 | Sample marked; no AI; who saved shown |
| **Total** | **7.5 / 10** | **Below the pass mark of 8.** Fixing Blocker 1 lifts "feedback" and "correct data" (→ 8.5); then Minors 1 and 3 |

## Could not check
* A real screen reader, and an intended user's unaided walk (D17, D20 stay with the founder).
* The four other `ConditionBuilder` users, by browser: checked by code reading only.
* The checkpoint with A1's gates (#1084 not on main); C6.9 15/15 was not re-run by me.
* Commits after 2e7f53506: the PR head is now 738aa062e, which only puts the allow-list line back. The shared working tree also gained uncommitted edits to `eligibility.ts`, `conditions.tsx` and `eligibility-gates-editor.tsx` during this review (16:38 UTC, not mine). The evidence above is from the 2e7f53506 bundle built at the start of the review.

**Verdict: Block.** To fix: Blocker 1 (buttons in the dialog other than Save submit the form: give them `type="button"` or drop the `<form>`, and add the fail test). Minors 1–8 should be fixed in the same pass.
