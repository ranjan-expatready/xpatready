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

## Re-review (diff 2e7f53506..86070c912)
Reviewer (same as above, did not build), 6 Nov. Diff only: `eligibility-gates-editor.tsx`, `conditions.tsx`, `api/src/eligibility.ts`, `tests/check_b106_gates_browser.cjs`, `build-notes.md` (738aa062e only puts the tech lead's allow-list line back, as on main). Web built from 86070c912. Own copy `rev106c` on :4442, stopped and dropped at the end. Live AI off, US$0. The builder's check wrote its screenshots over `walk/*.png`; I put the committed ones back with `git checkout` (the tree had been clean). `studio/evidence/forms-channels/check_forms_channels.json` changed in the tree at 16:54 UTC while I worked. None of my commands writes it (only `tests/check_forms_channels.ts` does), so I left it alone.

### Verdict for 86070c912: **Block**
The Blocker as written is gone: no button other than Save saves. But the fix only cancels the form's submit event. Inside a `<form>`, a browser also handles Enter in a one-line field by "clicking" the form's first submit button. The team `Button` still has no `type`, so that first button is gate 1's first "Remove this comparison" bin. Pressing Enter therefore does not "do nothing", which is what build-notes and the caller assumed: it silently deletes part of another gate's rule (Major N1 below).

### Major
**N1 (Must). Enter in any one-line field of the dialog removes the first comparison of gate 1's rule, without a word. Save then stores the weaker rule.** It has the same root cause as Blocker 1: buttons with no `type` inside `<form>` (`eligibility-gates-editor.tsx:165`, `conditions.tsx:134`). Seen on screen:
* On the Visitor visa fixture, gate 1 is "Passport number and expiry date answered", `and(exists passport_number, exists passport_expiry_date)`. I opened Edit, changed gate 2's label and pressed Enter in it. Gate 1's rule now shows only "Passport expiry date", 25 rows above and out of view. I pressed Save: 200, v4→v5. The stored gate 1 is `exists person.passport_expiry_date`.
* So the gate is now met by anyone who gives an expiry date, with no passport number. After release, cases get a wrong **Met**.
* The only trace is the SME's Review line: "rule changed: person.passport_expiry_date is answered; was: … and …".
* A second Enter (in a judgement line, say) empties gate 1's rule. The save is then refused with "A gate needs a rule…" under a gate the person never touched.
* While "Changed by someone else" shows, the first button is **Reload**. Enter in a field then reloads and throws the edits away, which goes against BR-8 ("keeps the edit"). Seen: the label I typed went back to the other person's version.
* Why Major, as for M1: the content reviewer reads the changed rule before release. But it is a silent edit to rule data from a single common keystroke.
* Fix (either):
  * (a) Replace the `<form>` with `<div role="group" aria-label="Eligibility rules" onChangeCapture=…>`. This removes implicit submission altogether.
  * (b) Give every button inside the dialog `type="button"`. That covers the editor's Reload, Add a gate, Remove, Keep, Add a line and a line's bin, plus `conditions.tsx`'s bin, Add a comparison, Edit as JSON and Use the simple editor. It is harmless to the four other users.
* Fail test: type in gate 2's label and press Enter. Assert gate 1 still has 2 comparisons, and that a later Save stores gate 1 unchanged.

### What the diff fixed (checked)
* **Blocker 1: gone.** Checked by walk on 86070c912, with no PUT and the version unchanged after each click:
  * the review's repro: a half-typed label in gate 1, then "Add a comparison" in gate 2;
  * the breaker's repro 1: the bin on gate 1's first comparison leaves `exists passport_expiry_date` in the dialog, with nothing saved until Save;
  * Add a gate, which also shows no premature errors and puts focus on Add a gate;
  * Add a line.
* An "all of these" gate with two comparisons can now be built in the simple editor.
* **M1: fixed.**
  * On the row: "Give the value to compare with, or choose "is answered": with no value nobody's answer can meet this rule." It shows for "is" with no value, for "is one of" with nothing, and for "is one of" with only commas. It goes away on "is answered".
  * By the save: 400 with the words under the gate's rule (`gates.N.condition`).
  * `emptyValues` reads the tree the builder emits: flat leaves, `and`/`or` `args`, and `not` `arg`. Empty number and yes/no values reach it as `""`, because `typed` keeps `""`. A route `in []` is refused too.
* **Minors fixed:**
  * Cancel asks "Discard your unsaved changes?", and dismissing keeps the dialog.
  * Focus goes to Keep on Remove, to Add a gate after a Remove, and to Edit after the dialog closes.
  * The ⓘ is the team `Tip` (tabindex 0, the tooltip shows on focus).
  * Each mark has a `title`.
  * "Review and release" is a link to `/c/<id>/review`.
  * The disclaimer is called "(Sample default)" only when the draft did not change it.
  * There is no bare "Draft".
  * A retired refusal shows under "Not saved" with no Reload (tested).
  * Errors are cleared on Remove.
  * Gate mode flags another subject kind at once.
* **Tests:** `check_b106_gates_browser.cjs` **68/68, exit 0** on my fresh copy. The new fail tests would fail on 2e7f53506. I did not re-run them there; I reasoned from what I and the breaker saw on that commit:
  * Add a comparison saved v1→v2 and closed the dialog. The test asserts the dialog is open at the same version.
  * Add a gate showed "Give the gate a label" at once.
  * `[data-empty-value]` did not exist.
  * A route `in []` got 200.
  * No test covers Enter (N1).
* **"Not fixed, listed": reasonable.**
  * The cut name and `· yes_no` at 200 % come from the shared builder's line and show for all of its users. That belongs to a builder row.
  * In-app Back with no guard is the same in every editor, and beforeunload holds.
* **Other ConditionBuilder users:** both `conditions.tsx` changes sit behind `gate` (`only="person-questions"`). With the setting off, the four other users render and check exactly as before. Checked by reading the code, as in the first review.

### New Minors
1. **The server's M1 words name a key.** "The rule compares person.passport_number with an empty value…" (`api/src/eligibility.ts`, `emptyValues` message) appears under the rule after a refused save. Name the question instead, as the row message does, or say "this comparison".
2. **The gate-mode subject words are code.** "a gate is checked for each person: subjectKind must be PERSON" (`conditions.tsx:88`). It shows only in Edit as JSON, so it is a nit. Plain words would be: "A gate is checked for each person: use "PERSON" as the subjectKind."
3. **The ⓘ is read twice by a screen reader.** It keeps `aria-label={TIP}` and now also gets the Tip's `aria-describedby` with the same text. Use a short label such as "About eligibility rules". Nit.

### Journey test (reviewer, re-run on 86070c912)
Journeys 1–8 as above, plus Enter in fields (found N1).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Add, two-comparison gate, M1 refusal, save, by screen |
| Next step obvious | 1 | Review and release is a link; no premature errors |
| Plain words | ½ | Server M1 message shows a key; `yes_no` under rows (listed) |
| Feedback and state | 1 | Row messages at once, toasts, waiting line |
| Correct data | ½ | Enter silently weakens gate 1's rule, then saved (N1) |
| Error recovery | ½ | Cancel guard fixed; Enter while stale reloads and drops edits (N1) |
| Accessibility, sizes | 1 | Tip focusable, focus returned, Keep focused; axe 0 in the builder's run |
| Speed | 1 | Unchanged, under 1 s |
| Visual quality | 1 | Unchanged |
| Trust and sources | 1 | Unchanged |
| **Total** | **8.5 / 10** | At the pass mark, but Major N1 is open |

**Verdict: Block** (commit 86070c912). To fix: **N1**. Remove implicit submission: drop the `<form>` for a `role="group"` div, or put `type="button"` on every button in the dialog including the `ConditionBuilder` buttons. Add the Enter fail test. New Minors 1–3 should be fixed in the same pass.

## Re-review 2 (diff 86070c912..06f1c4d1c)
Reviewer (same as above, did not build), 6 Nov. Diff only: `eligibility-gates-editor.tsx`, `conditions.tsx`, `api/src/eligibility.ts`, `tests/check_b106_gates_browser.cjs`, `build-notes.md`, plus walk screenshots (06f1c4d1c). HEAD stayed at 06f1c4d1c; no file changed, restored or checked out by me. Web built from 06f1c4d1c. Own copy `rev106d` on :4442, stopped and dropped at the end. Live AI off, US$0.

### Verdict for 06f1c4d1c: **Approve**
N1 is gone. The dialog body is now `<div role="group" aria-label="Eligibility rules">` (`eligibility-gates-editor.tsx:166`) and the open dialog has no `<form>` (checked in the DOM). With no form there is no implicit submission, so no button in the dialog can be "clicked" by Enter. No Blocker or Major is open.

### N1: checked by my own walk (Playwright, Visitor visa fixture, author)
Each field got a typed character and then Enter. After each one, gate 1 still had its 2 comparisons, both gates were still there, the dialog stayed open, no PUT was sent and the version did not change:
* gate 1 label and gate 2 label;
* the comparison Field on gate 1 and on gate 2;
* a comparison Value: I added "Passport number is …" on gate 2 and typed `AB123`, Enter;
* the "If not met" radio;
* judgement Line 1;
* the disclaimer textarea: Enter puts a newline in, and nothing is saved.

No confirm dialog came up from any Enter.

**Stale case:** I opened the dialog, someone else saved by route, and my Save got 409 with "Changed by someone else" and Reload. I then typed in gate 2's label and pressed Enter. The label kept "Mine typed!", the notice stayed, the version did not change, and Reload was not triggered. BR-8 ("keeps the edit") holds.

### Nothing else broken (checked)
* **Keyboard Save.** Tab from the disclaimer reaches "Save the eligibility rules", and Enter on it saves once (200, v1→v2). Gate 1's stored rule is unchanged: `and(exists passport_number, exists passport_expiry_date)`. The disclaimer is stored with its newline, and the new text comparison is stored.
* **A short disclaimer** (12 characters) is still refused on its field: "A disclaimer needs more than 20 characters…". This is BR-5 and it is shown in words.
* **Dirty tracking and the leave guard.** `onChangeCapture` now sits on the div. With edits, Escape asks "Discard your unsaved changes?" and dismissing keeps the dialog. Cancel asks the same. Closing the page with edits raises `beforeunload`.
* There were no page errors.
* Nothing else selects the old `form` (grep: only the check uses `[data-editor=eligibility]`), and nothing calls `requestSubmit`.
* **Tests.** `check_b106_gates_browser.cjs` passes **69/69, exit 0** on my fresh copy. That includes axe (WCAG 2.2 AA) on the section and on the open dialog with its errors, and 1024 px with no sideways scroll.
* **The new fail test would fail on 86070c912.** It presses Enter in gate 2's label when gate 1 has 2 comparisons. On 86070c912 that clicks gate 1's first bin, leaving 1 comparison, and the test asserts 2. It does not cover Enter while the stale notice shows; my walk did. Nit, no fix needed for this verdict.

### The three Minors
1. **Fixed.** The server's empty-value refusal now names the question by its library label (`api/src/eligibility.ts:65-66`). It falls back to the key only when the question has no label. The test asserts `compares "Passport number" with an empty value`. It is one extra query per save, not one per row.
2. **Fixed.** The gate-mode subject message is now in words: "an eligibility gate is checked for each person: use the simple editor, or set it to each person (PERSON)" (`conditions.tsx:88`). It still starts in lower case like the other checker messages, which is a nit. It is shown only in Edit as JSON, and the other `ConditionBuilder` users are untouched (`gate` only).
3. **Fixed.** The ⓘ is named "About eligibility rules", and the tooltip text comes through the Tip's description, so it is read once.

### Journey test (reviewer, re-run on 06f1c4d1c)
Journeys 1–8 as above, plus Enter in every field kind, Enter while stale, keyboard-only save, and the leave guards.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Add, edit, save by keyboard, release (69/69) |
| Next step obvious | 1 | Unchanged; Review and release link |
| Plain words | 1 | Server refusal names "Passport number"; JSON-mode message in words (`yes_no` under rows stays listed, builder row) |
| Feedback and state | 1 | Row messages, toast, waiting line, stale notice |
| Correct data | 1 | Enter changes nothing; the keyboard save stores gate 1 intact, v+1 once |
| Error recovery | 1 | Enter while stale keeps the edit; Escape and Cancel ask; beforeunload |
| Accessibility, sizes | 1 | No implicit submit; ⓘ named once; axe 0; 1024 px with no sideways scroll |
| Speed | 1 | Under 1 s, unchanged |
| Visual quality | 1 | Unchanged |
| Trust and sources | 1 | Unchanged (Sample marked, release carried) |
| **Total** | **10 / 10** | Pass |

**Could not check:** a real screen reader. The 200 % zoom pass was not repeated, because the diff does not touch the layout. D17 and D20 stay with the founder.

**Verdict: Approve** (commit 06f1c4d1c). No Blocker or Major is open.

## Re-review 3 (diff c9d77b32f..8345e53a4)

Diff-only review of commit **8345e53a4** on PR #1172 (branch `claude/funny-gates-pgthb4`, PR head 8345e53a4 when checked). I reviewed it read-only on that HEAD.

### What the diff does
* There is one file and one deletion: `product/tools/route-has-screen-allow.txt`, which loses parent line 18, `PUT /combinations/:id/eligibility-gates  # QA-244, C6.9 Partial: … row B106 builds it. …`. No other line is touched, and no other file is in the diff (`git diff --stat`: 1 file changed, 1 deletion).
* **Approval.** The tech lead approved this deletion in this PR: PR #1172 comment 6690886001 (Lead 24, 22:47 IST, 2026-11-06T17:17:47Z) says "approved: delete line 18 of route-has-screen-allow.txt in this PR itself". Line 18 at c9d77b32f is the gates line, so the commit deletes exactly the approved line.

### Checks
* **The route check passes without the line.** `node product/tools/route-has-screen.mjs` exits **0**. It reports 51 mutating routes: 40 have a screen, 11 are allowed with a reason, and 0 have neither. There are 0 stale lines and 0 bad lines. The one note, `PUT /library/fees` with no API route, was there before and is not about this diff.
* **The route is found called from a screen.** `check()` at HEAD gives `PUT /combinations/:id/eligibility-gates` → screen `web/src/components/eligibility-gates-editor.tsx:146`. That line is the editor's `api(\`/combinations/${id}/eligibility-gates\`, { method: "PUT", … })`.
* **No other route loses its allowance.** I ran `check()` with the c9d77b32f allow-list (taken with `git show`, into scratch) against the same tree:
  * The 11 allowed routes are the same list both times.
  * No route's result changes ("changed: []").
  * With the old list, the gates line is reported as **stale**, so the check would exit 1. The deletion is therefore needed, not just allowed.
* **The self-test passes.** `route-has-screen.mjs --self-test`: all 12 checks pass, exit 0.
* **Not part of the commit.** The working tree has an uncommitted change to `prototype/studio/evidence/forms-channels/check_forms_channels.json`, left by a suite run. It is not in 8345e53a4 and not in this review.

### Journey test (reviewer)
I did not run it again. This diff touches only a check's allow-list: no app, API or web code changed. The screen's behaviour is the same as in 06f1c4d1c, and the score from Re-review 2 stands: **10 / 10** (Pass).

### Findings
None. No Blocker, Major or Minor.

**Verdict: Approve** (commit 8345e53a4). No Blocker or Major is open.
