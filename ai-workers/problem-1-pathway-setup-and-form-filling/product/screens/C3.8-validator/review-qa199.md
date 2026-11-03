# C3.8 validator, QA-199 (Background questions by the form's own reading): review of 724b48fb5

Branch `claude/forms-background-rule`, diff `origin/main..724b48fb5` (HEAD 834b4c444 adds only the builder's four screenshots). Reviewer did not build it. US$0: no model call, no STUDIO_*_LIVE switch, isolated copies on 4630–4632 only.

**Verdict (screen-review scale): Ship.** No Blocker or Major. Three Minors below are Should-fix, none blocks the done-when.

## What I ran (on this commit, isolated copies)
- `tests/check_c38_completeness.ts`: 20/20. `tests/check_c38_background_forms_api.ts` on 4630: **33/33** (IMM 1295, 5257, 1294; Q4/Q5/Q6 each refused 409, error on release by caption, cleared by "filled by hand").
- `acceptance/C3.8.test.ts` on 4631: **12 pass, 0 fail, 1 NOTE** (AT-5 per channel, pre-existing). `tests/check_c38_completeness_api.ts` (#691) on 4632: **9/9**.
- **Does the test fail without the rule?** I mutated a scratch copy of `engine/form-completeness.ts` three ways and ran the unit check against each: old path rule 16/20 (all four forms fail), no consent stop 11/20, any field type instead of yes/no 15/20. I did not re-run the API check on main. The builder's 12/33 matches 4 passes × 3 forms (only the "filled by hand" and plain-field cases pass on main).
- **Section bounds, read from every inventory in `p1/inventory/` with a script.** Only imm5257e, imm1295e, imm1294e and imm5710e have a "BACKGROUND INFORMATION" heading:
  - IMM 5257, 1295 and 1294: 9 questions each (1a, 1b, 2a, 2b, 2c, 3a, 4a, 5, 6).
  - IMM 5710: 10 questions (its extra one is `Occupation[0].Choice[0]`, "employed by a government in a security-related capacity").
  - Nothing the old path rule caught is lost on any form.
  - Details boxes and `backgroundInfoCalc` are excluded. The consent yes/no (`Consent0.Choice`, `Signature.Consent0`, 5710 `FutureComm`) falls after the stop and is excluded.
- **Callers.** All three use `backgroundPathsOf(ed.inventoryFile)`: the decision refusal (`screen02.ts:56`), the `background` flag (`screen02.ts:69-71`) and the validator (`studio.ts:226-231`). No `isBackgroundQuestion` is left anywhere (`git grep`). `web/src/pages/job.tsx:257-272` is unchanged and reads the flag. In the walk it marked exactly the nine IMM 5257 questions and offered only "Filled by hand".
- **Approved-sources path (P-80).** `read_form.py:78` writes `inventory_file` relative to `X.SOL`. That is the same folder as `SOLUTION` in `core.ts:12`, and the approved copy sits under the copy's own `var/…/approved-sources`. `forms.ts:281` and `form-masters.ts:162` already read it the same way, so the paths are consistent.
- **Query** (`studio.ts:226-228`):
  - One edition query, then one `OR` of per-edition `dataPath IN (≤10)` lists. With a handful of editions per combination that is no per-row request.
  - `GET /combinations/:id/review` takes 0.57 s warm.
  - The PDF-only filter matches the decision route, which refuses non-PDF editions (`screen02.ts:49`), and W1-02, which parks online editions. All 27 editions in the copy are PDF.
  - Like before, every PDF edition of each current form is checked (the earlier review's Minor is unchanged and not a regression).
  - A failed read is not cached: after I restored the file, the error came back without a restart.
- Graph (`graph.mjs`): no new page or route without a test; C3.8 is named by 8 tests.

## Findings (ranked)
1. **Minor, Should: an unreadable reading turns the Critical rule off silently** (`api/src/background-questions.ts:18`, `catch { return new Set(); }`).
   - Probe on 4630: I pointed IMM 5257's `inventory_file` at a missing file. Q6 "not a fact" then answered **201**, Form fields showed `background:false`, and Review and release showed no error. Restoring the file brought the error back.
   - The code comment covers `inventoryFile` null ("no reading, so nothing drafted"). It does not cover a set path whose file is missing or corrupt, and the field map's rows still exist in that case.
   - Elsewhere the same situation fails loudly: `form-masters.ts:162` says "The reading of … is missing on this computer: read the form again."
   - Fix: return the empty set only when `inventoryFile` is null. When a set file cannot be read, return a marker so the decision route answers 409 and the validator raises an error, in those same words.
2. **Minor, Should: schedules with yes/no background questions are not covered, and the new test says so as if decided** (`tests/check_c38_completeness.ts`, "a form with no Background information heading has none (a schedule, a guide)").
   - IMM 5257 Schedule 1 (`imm5257_1e`) has military service, ill-treatment, organisations, government positions and previous travel as yes/no questions.
   - IMM 5669 Schedule A, "SCHEDULE A BACKGROUND / DECLARATION", has 11 (`aYesNo`…`kYesNo`).
   - This is not a regression: the old rule missed them too. They are also outside the done-when and outside IRCC-F08's citation (IMM 5257 page and Guide 5256).
   - Fix: none in this PR. Reword the test line so it does not claim schedules have none, and give the tech lead an open question on whether IRCC-F08 extends to these schedules, with the official quote. Do not widen the rule silently.
3. **Minor, Should: IMM 5710's government security-capacity question has an empty caption.**
   - Its refusal and its release error therefore read "This question is a Background information question…" and do not say which question (`engine/form-completeness.ts:33-34`).
   - The reading's `heading` carries the question text.
   - Fix: when the caption is blank, fall back to the heading. IMM 5710 has no field map in the sample today, so no case is affected yet.

Seen on the page but not from this diff (#691 or older, recorded so they are not lost):
- IMM 5257's consent box carries the Q6 caption (an inventory caption error), so Form fields shows two rows that both start "Question 6…".
- An empty reason gives only a toast ("Say why in a sentence"), not a message on the Reason field.
- After Save, focus falls to the page body.

## D1–D20 (1–5, evidence-only; this change only)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | IRCC-F08 now holds for Q1–Q6 on 5257, 1295 and 1294, and on 5710 too. Schedules are open (finding 2). |
| D2 Data integrity | 4 | 409 leaves the row unchanged (check 33/33). Fails open on a missing reading (finding 1). |
| D3 Reuse | 5 | One rule in the engine, one loader, three callers. |
| D4 Rule integrity | 4 | The section is bounded by the form's own heading and consent block. Any heading wording change would empty it silently (finding 1). |
| D5 Stability | 4 | Failed reads are not cached and it recovers without a restart. |
| D6 Governance | 4 | The audit line and reason are unchanged. |
| D7 AI trust | n/a | No AI in this change. |
| D8 Orientation | 4 | Release error names the form and the question. |
| D9 Flow | 4 | Error → To review › Form fields → "Filled by hand" clears it (walked). |
| D10 Language | 4 | Captions and the IRCC reason, never a PDF path. Blank caption on 5710 (finding 3). |
| D11 Feedback | 4 | The note before the choice and the 409 words match. Empty-reason feedback is a toast only (pre-existing). |
| D12 Visual | 4 | Unchanged team components. |
| D13 Accessibility | 4 | axe: 0 violations on list, open-decision and release states. Reached by keyboard only. 400, 720 and 1024 px: no sideways scroll. |
| D14 Team look | 4 | Unchanged. |
| D15 Speed | 5 | Page 0.6 s. Review API 0.57 s. |
| D16 Testability | 5 | Per-form unit and API checks. Three mutants all caught. |
| D17 | simulated only | No intended user walked it. |
| D18 Provenance | 4 | Rule read from the form's own reading. Not shown on screen. |
| D19 Closure | 4 | Decide → validator → release, end to end on 3 forms. |
| D20 | simulated only | |

## Journey score (reviewer role): **8.0 / 10**, pass, no criterion at 0
Report: `screens/C3.8-validator/journey-test-reviewer-2026-11-04-qa199.md`.

## Could not check
- A visible (headed) browser walk by eye: I walked it in headless Playwright with screenshots.
- 200 % zoom at 1440 px, approximated by 720 px.
- A real screen reader.
- GitHub CI on this commit.
- The API check run against main (see the mutation evidence instead).

Verdict: Approve — commit 724b48fb5 (tip 834b4c444 adds only screenshots; the code is the same)
