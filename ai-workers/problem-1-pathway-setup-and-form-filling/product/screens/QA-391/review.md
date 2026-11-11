# QA-391 review: a form that no longer applies is kept and listed, never filed

PR #1576, branch `claude/zealous-newton-0eo4z6`, reviewed at commit **a118065290706ee4b09289840e38d15acf14230e** (2 commits on origin/main). Fresh context; the reviewer did not build it. Skill `screen-review`, plus `journey-test` (reviewer role): `journey-test-reviewer-2026-11-11.md`, **8½/10**.
Where: the builder's copy on :4450 (finished story, case SAMPLE-VV-FAMILY-1, read-only except a refused lock), and the reviewer's own copy on :4456 (`rv391`, configured checkpoint, edge cases set up there, stopped after use). Never :4400. Live AI off, US$0, no priced button.

**Verdict: Block.** The bug as reported is fixed, on the server and on the screen, and both suites pass. Three edge cases the row's rule covers still give untrue words or an instruction for a form that will never be filed (M1–M3). Each fix is small and stays in `web/src/runtime/forms.tsx` and `engine/runtime/forms.ts`.

## What holds (evidence)
- **Reported bug (a), on the demo path.** On :4450 the 8 kept rows (IMM 5475 and IRM 0002 × 4 people) read "Kept, never filed". None says "Out of date", "to file it", Generate, Validate, "Facts confirmed", "Checked copy, not for filing" or "Before filing". qa's repro `tests/qa/check_qa391_not_applying_out_of_date.cjs 4450`: 6/6 PASS (the same file failed on main fbfb263c7). Builder's suite `tests/check_qa391_kept_forms_browser.cjs 4450`: 14/14 PASS.
- **Part (b).** The three Online IMM 5257 copies now read "generate a new copy to check the current answers" (`forms.tsx` CopyLine, `use === "check"`).
- **Server rule.** `POST /form-copies/:id/lock {kind:"filed"}` on a kept IRM 0002 copy returns 409 "… no longer applies to this person (…): its copies are kept, never filed." The copy stays unlocked. The author gets 403. `generate` returns 422 "does not apply". Without the new check, the lock falls through to the "out of date" 409, so the suite's `/no longer applies/` line fails when the rule is removed.
- **Not travelling** (:4456, Partner marked not travelling): every Partner row reads "Partner (Sample) is not travelling with this application". It shows Download only and no Generate.
- **Waiting rule ("cannot_tell")**: unchanged. `applies` stays true (`fill-case.ts:213`), so the form is listed as before, with Generate (QA-246). The lock check refuses only `applies === false`.
- **Not proven** (trial not passed): out-of-date copies now say "to check the current answers". The pill "Checked copy, not for filing" is unchanged on forms that apply.
- **Forms that apply**: Generate, Validate, the facts list, lock buttons and "to file it" on a copy for filing (Paper IMM 5257, Child 18 or over) are unchanged.
- **Constraints**: no form number or program branch in `notApplyingWhy` or `fill-case.ts` (P-319, P-425). `case-prepare.ts` is untouched. The contract field is optional. Kept forms are not on `/prepare` items, so `SignSteps` draws nothing for them.
- axe WCAG 2.2 AA on `main`: 0 violations at 1440 and 1024 px. No sideways scroll at 400, 1024 or 1440 px, or at 200 % zoom. No console or page errors. Keyboard-only: Tab reaches a kept row's Download, and Enter downloads it. GET …/forms takes 0.70–0.98 s on the finished story (8 kept rows) and 0.39 s on :4456 (13 kept rows). No request per row.

## Issues
**M1 (Major, Must): a filed copy of a form that later stops applying sits under the words "never filed".** On :4456, Partner's IMM 5257 and IMM 5475 copies were locked Filed (set in the reviewer's own database, standing in for the lock route before the person was marked not travelling: `refuseIfCaseRecorded` allows this until submission). The row reads "Its copies are kept as they were, never filed." beside the pill "Stale · Filed" (screenshot `rv-IMM_5257_5bb99bd8.png`). That is two states for one thing, and one of them is untrue. The same happens when a conditional answer turns No after a lock. Fix: `forms.tsx` FormRow `data-not-applying` line. When a copy is locked, say e.g. "The copy filed on <date> is kept as it was; no new copy is made." Otherwise keep "never filed". Add a check line with a locked copy (pass) and one without (fail).

**M2 (Major, Must): the reason for an age limit contradicts itself.** `notApplyingWhy` skips `whenWords` whenever `min_age` is set and falls back to render's `why`. On :4456, Child 18 or over with a date of birth of 2014 gets these reasons:
- IMM 5257 SCH1: "its own rule reads No on this case's answers (always required for this combination; for a dependent child, from age 18)"
- IMM 5707: "… (always required for this combination; from age 18)"
- IMM 5476: "… (conditional; for a dependent child, from age 18)"

"Always required" beside "no longer applies" is untrue, and "conditional" is an internal word. A person cannot tell that age is the reason. These are 3 of the 6 VV release-2 forms (all of them carry `min_age`). Fix: `engine/runtime/forms.ts` `notApplyingWhy`. Read which part reads No, the rule or the age (render keeps both in `formWaits`). If the age reads No, say "<person> is under <min_age>; this form is for people aged <min_age> or over". If the rule reads No, use `whenWords` even when `min_age` is set. Add a check line with a passing and a failing case.

**M3 (Major, Must): a kept form still gives a filling instruction.** The PR hides "Before filing, on the PDF" for `use === "kept"`. It leaves "To write by hand in Adobe: …" and "Not on this form: …" (`forms.tsx` CopyLine, the `by_hand` and `not_on_form` lines). The kept IMM 5707 rows (Partner not travelling, Child under 18) read "To write by hand in Adobe: How the child is related to the subject …". That asks the person to keep preparing a copy that will never be filed: the class of instruction this row removes. Fix: gate both lines on `use !== "kept"`, as `person_steps` is, and add a check on a kept row that has `by_hand`.

**m1 (Minor, Should): untested branches.** The suite runs on the finished story only. It never meets the not-travelling words (it only checks that they are absent), the age branch, the `!line` branch, a locked kept copy, or a kept row with `by_hand`. That is why M1–M3 passed. Cover these with M1–M3's checks, for example on the configured checkpoint, as the reviewer did on :4456.

**m2 (Minor, Should): "this case's answer says otherwise".** IRM 0002's question is asked per person, and `whenWords` already knows the value. "and <person>'s answer is No" (or "the case's answer is No" for a case question) is plainer and true for both kinds. A string value would print raw: IMM 5409's rule `person.marital_status eq "common_law"` would read `is "common_law"`, a value code. Not reached on any case today (no kept IMM 5409), but in the same function. Use the choice's label. The server's 409 nests these words in brackets inside brackets. Drop the outer pair.

**m3 (Minor, Should; existing words, in class (b)):** `forms.tsx` FormRow `why`: a copy made while Online, of a form whose filling is not proven, is still told "Generate a new copy to file it.", because the `copy_not_for_filing` branch comes before `!f.trial_passed`. The new copy cannot be filed either. Swap the order, or say "to check the current answers" when `use === "check"`.

## Dimensions (D17, D20 simulated only)
D1 the rule P-65 / C9.5 is met on the reported path; edge cases M1–M3 · D2 lock refused under 409, nothing changed · D3 one `notApplyingWhy` for the list and the refusal · D4 waiting rules unchanged · D5 a refused lock leaves the copy as it was, reload holds · D6 n/a · D7 n/a (no AI) · D8 the row names the form and the person · D9 a kept row has no action, as it should; M1 muddles its state · D10 M2, m2 · D11 "Kept, never filed" pill; M1 · D12 team Pill, no new styles · D13 axe 0, reflow ok, keyboard reaches Download · D14 team components · D15 forms GET ≤ 1 s, no request per row · D16 the reported scenario has pass and fail lines; edge branches untested (m1) · D17 simulated only · D18 the reason names the deciding question in its screen words · D19 the demo's E3 path is closed · D20 simulated only.

## BIC (EXPERIENCE §6; this row touches the case forms panel only)
BIC-03 Partly (dependent forms marked "no longer applies"; M2's reason is wrong) · BIC-11 Met (a kept row has no primary button) · BIC-12, -15 N/A (unchanged) · BIC-13 Met (the server refusal says why) · BIC-14 Met (the "Kept, never filed" pill has a title) · BIC-18 Met · BIC-19 Met at 1440 and 1024 px (`kept-row-1024x1.png`) · BIC-20 Met (axe 0, 200 % zoom, keyboard). BIC-01, -02, -04 to -10, -16, -17 N/A for this row.

## Not checked
- The real lock route to a Filed copy: no form on these cases reaches ready to file plus a passed trial without long setup, so M1's lock was set in the reviewer's own copy's database.
- A real screen reader.
- An intended user's unaided walk (D17, D20 stay with the founder).

Screenshots, not committed: `/tmp/claude-0/-home-user-xpatready/ace8db74-715e-5d4a-92c5-f8724332d4d8/scratchpad/shots/` (`kept-row-{1440,1024,400}x1.png`, `kept-row-720x2.png`, `online-row-1440.png`, `full-1440.png`, `rv-*.png`).
