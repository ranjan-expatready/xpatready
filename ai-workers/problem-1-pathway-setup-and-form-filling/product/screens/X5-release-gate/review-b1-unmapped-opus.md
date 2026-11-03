# Independent review (stronger model, P-303): V3 B1, release refuses a form with no field map (commit 54d2b6f94)

Scope: `git diff 762dbae6b..54d2b6f94`, read with `git show`. Nothing checked out, no server started (4440–4449 and 4400 are the suite run's), no suite run, `graph.mjs` not run (it always writes `product/qa/graph.json` into the working tree). No AI call anywhere in the change or its test (US$0). I formed this view from the code first, then compared it with `review-b1-unmapped.md`. Paths: `studio/` = `prototype/studio/`.

## Summary
The release rule is right. It uses the case gate's predicate token for token, and every product route that writes a release enforces it. The fixes for the earlier double counts are correct and needed: `check_uxa2_to_review_browser.cjs` depends on them. One gap is left. On the shared Release page, a row whose only blocker is an unmapped form is held with the review gate's general reason. The page and the bulk release's `held` list never name the forms, and the next step they give ("submit it") is refused. That is one Major.

## 1. Is the release predicate exactly the case gate's? Yes, for this cause
- `engine/validate.ts:70` and `engine/programs.ts:66` match exactly: `form_kind ?? "data_form"`, the same `form_number`, `channel !== "ONLINE"`, `entries.length`. Opening a case goes `api/src/runtime.ts:91` → `startableMissing` (`api/src/programs.ts:304-311`) → `missingItems` on the release snapshot. That function builds its `form_without_edition` line from the snapshot (`engine/programs.ts:66-67`), not from the problem list, so the exclusion at `:76` cannot weaken the case gate.
- Every product route that writes a release runs `studio.problems()` → `validate()` again:
  - Submit: `studio.ts:976`.
  - Approve: `:1021`, `:1039`.
  - Bulk `POST /pack/release` → `releaseRows`: `:1082`, `:1091`. Then `publishRow` (`:1131`) checks that the published sha256 is the sha256 that was judged.
  - Each filters on `level` only, never on `waitsForMap`, so the tag cannot let a release through. `releaseGates` (`:1063`) is only the review gate and is never the last check.
- No race. A submission is tied to the draft's sha256, and the snapshot carries `field_maps`. Removing a map after Submit changes the sha256 and holds the row again.
- Demo:
  - The configured checkpoint releases through submit/sign/approve (`api/src/demo.ts:423`).
  - The one path that skips `validate()` is `fromReviewedRelease` (`demo.ts:128-136`: the suites' fixture and Demo › "Start With an LMIA from its reviewed release"). It writes `config_release` directly. Its fixture (`p3/releases/c1-v3`) maps every data form it keeps: IMM 5802 is dismissed, and IMM 5488 and IMM 5905 are not data forms. `check_screen01_api.ts:304` asserts that row is READY.
  - Not a finding (scaffolding). I record it as the only unguarded writer.

## 2. Does it refuse anything it should not? No new refusal
- Document and checklist kinds are skipped (`validate.ts:70`).
- An Online line whose form has a PDF map passes: a map's `channel` is its edition's, not the line's (`engine/snapshot.ts:157-161`).
- A form held only online now gets two errors: `engine/channels.ts:121` ("has no PDF edition") and this one. Minor m3.
- Released snapshots are not judged against a newer library: the rule reads only the frozen snapshot. An older release that has an unmapped form now carries the tagged error in `relProblems` (`api/src/programs.ts:205`). `setup-checklist.ts:138` drops it from `relErrors`, so Not ready still comes from `notStartable` (`:143`) and its item from `notStartableWhy` (`:154-157`), as before.
- A data-form line marked Not needed, with no map, is now refused at release. The case gate already refused it, so this is parity, not a loss. If Not needed lines should need no map, both gates change together; that is not this item.

## 3. Do the exclusions hide the problem before release?
- **Review and release: shown.** The error is in the validation list and the step-1 count (`web/src/pages/review.tsx:55`, `:81`), and Submit names every form.
- **Programs card and the workspace strip: shown.** They say "Map N forms" (`setup-checklist.ts:170`), from `forms.unmapped`. That count uses the same predicate (`api/src/programs.ts:247`). Submit is not offered while the item is open (`:190`). An unreleased row also has the missing line naming the forms.
- **To review / Needs you: consistent with the recorded rule.** `map_forms` is a building step, outside `REVIEWS` (`setup-checklist.ts:64`; N8, restated in UX-A part 2). Keeping it out of `blockers.n` follows that rule, and `check_uxa2_to_review_browser.cjs:55, :100` rely on it.
- **Release page: hidden (Major M1).**
  - `api/src/programs.ts:229` drops the tagged error from `errors`. `draft()` holds and explains a row only from that count: `if (r.errors) why = r.firstError` (`:422`, and `:434` for the summary).
  - Take a row whose only blocker is an unmapped form. That is exactly Part 3 of the new suite: the Live Visitor visa plus IMM 5475. It falls through to the review gate and reads "Held back: Not submitted for review: submit it on its Review and release tab." (`studio.ts:81`, `web/src/pages/release.tsx:59`). Following that step is refused.
  - After a partial release, `POST /pack/release` returns the same general reason in `held` (`:500`). Only the all-held refusal (`:488-496`) names the forms.
  - `errors` feeds only `draft()` and `blockers`, so excluding the error here removes no duplicate on this page.
  - P-297 (3) says release names the forms "as for the six 'condition in words' forms", and those forms do show here through `firstError`. EXPERIENCE §2.7 and §2.10 apply too.
- **Form path (m2).** `api/src/form-progress.ts:89` drops the error from the form's own problems. But `engine/form-progress.ts:78` marks step 2 done once an AI draft has finished (`draft === "done"`), even with nothing applied. Step 6 (`:107`) can then read complete for a form that release refuses. This is narrow: a draft that is decided but not applied.
- **Overview tile (m4).** `web/src/pages/workspace/overview.tsx:19-20, 45-46` now counts it as "1 problem to fix" under **Rules and checks**, beside "Map 1 form". Before, it was a warning there.

## 4. Is the test sound? Yes, with gaps
- **Fails without the rule:**
  - Part 1: "each form as an error" and "submit refused naming exactly the forms".
  - Part 3: "next release refused naming only IMM 5475". On main this submit succeeds.
- **Fails without the exclusions:** "Major 1" for `engine/programs.ts:76`, and the tagged/untagged unit pair for `setup-checklist.ts:134`. Both are honest fail cases.
- **Not covered:** the exclusions at `api/src/programs.ts:229`, `api/src/form-progress.ts:89` and `web/.../forms.tsx:396`, and the Release page (M1).
- **Part 1's case check is weak (m5).** "never released, refused" passes because there is no release at all. The "opening a case keeps refusing" half really rests on the Major 1 check (the same `missingItems` with the tagged error), `check_screen01_rules.ts:47-48` and `check_s4_startable.ts`. Acceptable.
- **IMM 5475 fixture: acceptable.**
  - It runs only in the isolated copy's own database, after the last check that needs a mapped IMM 5475.
  - It stands for a real state (a form read but not mapped), and the comment says so.
  - It deletes the rows of every edition library-wide, which leaves With an LMIA's draft broken in that copy. Nothing reads that copy afterwards.

## 5. Suites most likely to break (by reading; the full run decides)
1. `check_c10_1_configured.ts:69-73`: the checkpoint releases the six through submit/approve, and any of them with an unmapped data form now stays a draft. The asserts are tolerant (`every`, counts tied to what was released), and the K1 words still come first because structure problems lead `problems()`. Its row-10 `why` gains lines.
2. `check_uxa2_to_review_browser.cjs:55, :100`: `blocked` after Reset to the six passes only because of the exclusions. The M1 fix must not touch `blockers` or `fix_problems`.
3. `check_forms_pdf_hardening.ts:193-195`: asserts no `where === "Forms"` error on the Visitor visa's draft after a replay. It breaks if another data-form line there has no PDF map at that moment.
4. These add library forms, then submit or release. Each is safe only if those editions carry a PDF map in the full sample:
   - `check_uxa3_status_words_browser.cjs:89-97` (Super visa with one With an LMIA form)
   - `check_screen02_slice2.ts:138`
   - `check_s5_leadcheck.ts:144-206`
5. `tests/qa/check_qa_am_*.cjs`, which submit the Visitor visa. They start from `setup_visitor_visa.ts` (13/13), so the risk is lower.

Not at risk: the pure `validate()` checks (`check_engine.ts:110`, `check_screen01_rules.ts:143`, `check_s5_leadcheck.ts:117`, `check_c18_age_case.ts:61`, `check_vv_checklist.ts:109`). Each filters by item, or has no unmapped data form.

## Findings
- **Major M1**: `api/src/programs.ts:229` with `:422` and `:434`.
  - **Fix:** keep the count exclusion, but hold and explain from all errors:
    - In `rows()`, add `holding = draftProblems.filter((x) => x.level === "error")` and a `firstHold` taken from it, which says "IMM 5475: No form fields mapped yet…".
    - In `draft()`, test `r.holding` and use `r.firstHold`.
    - Leave `errors`, `blockers` and the checklist as they are.
  - **Add a check** to Part 3: `GET /draft` as user-B holds the Visitor visa with a reason naming IMM 5475. It fails today.
- **m1 (words).** Review and release shows "IMM 5475: No form fields mapped yet for IMM 5475: …", so the form is named twice. "On this release" reads oddly on a draft never released. "(Draft setup)" sits beside the strip's "Map N forms".
- m2, m3, m4 and m5 are described in sections 2–4.

## Scores (1–5, this change only)
| D | | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Rule, parity and refusal match P-297 (3); the Release page misses the "names the forms" part (M1) |
| D2 Data integrity | 5 | Every release writer re-validates; sha256 guard in `publishRow` |
| D3 Reuse | 5 | One predicate reading, one tag, one helper |
| D4 Rule integrity | 5 | Release and case gates agree |
| D5 Stability | 4 | No new state; the one unguarded writer is the demo import |
| D6 Governance | 4 | Refusal is audited as before; no new audit needed |
| D7 AI trust | n/a | No AI |
| D8 Orientation | 4 | No change |
| D9 Flow | 3 | Release page next step leads to a refusal (M1) |
| D10 Language | 3 | m1 |
| D11 Feedback and state | 3 | M1; m4 |
| D12–D14 | n/a | No visual change; not seen |
| D15 Speed | 5 | O(forms × maps) in memory, no new query |
| D16 Testability | 4 | Fail cases bite; three exclusions and M1 untested |
| D17, D20 | simulated only | No intended user walked it |
| D18 Provenance | 4 | The refusal names the form and its cause |
| D19 End-to-end | 4 | Reset to the six → refused by name; mapped → released → case opens (claimed 13/13, not re-run) |

## Journey score (reviewer role; simulated from code: no server allowed)
I wrote four journeys and read them through, without walking them:
- **J1, author:** after Reset to the six, opens the Visitor visa. Review and release names the unmapped forms; Submit is refused, naming them.
- **J2, approver:** on the Release page with a Live Visitor visa plus IMM 5475 in its draft. The row says "Not submitted for review" (M1).
- **J3, author:** maps the forms (setup_visitor_visa) and releases; the officer opens a case.
- **J4, officer:** opens a case on release 1 while the draft waits for its map.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1, J3, J4 hold by reading |
| Next step obvious | ½ | J2 points to Submit, which is refused (M1) |
| Plain words | ½ | Form named twice; "this release" on a draft (m1) |
| Feedback and state | ½ | Release page and Overview tile (M1, m4) |
| Correct data | 1 | No release without a map; release 1 untouched |
| Error recovery | ½ | Recovery needs a second refusal to learn the cause |
| Accessibility and sizes | ½ | No UI change beyond filters; not walked |
| Speed | 1 | No new request |
| Visual quality | ½ | Not seen |
| Trust and sources | 1 | No AI; the cause is stated |

**7/10, below the pass of 8.** The M1 fix lifts "next step" and "feedback"; the m1 wording fix lifts "plain words".

## Could not check
- I did not run the browser, keyboard or 1024 px / 200 % checks.
- I did not re-run `graph.mjs` (the builder reports exit 0), the new suite or the full run.
- Please run `check_b1_release_unmapped.ts` and the five suites listed in section 5 after the current run ends.

Verdict: Block
1. Major M1: `api/src/programs.ts:229` (used at `:422` and `:434`). A row held only by forms with no field map gets the review gate's reason on the Release page and in `POST /pack/release`'s `held` list, never the form names. Fix: hold and explain from all draft errors (a separate `holding` / `firstHold` in `rows()`), keep `errors` and `blockers` as they are, and add a Part 3 check that `GET /draft` names IMM 5475.

## Round 2 (diff-only, ecee311e)
Scope: only `git diff 54d2b6f94..ecee311eb`, read with `git show ecee311eb:<path>`. Nothing checked out. No server, no suite, no `graph.mjs`: a full suite run holds the tree and the ports. No AI call (US$0). Line numbers are at `ecee311eb`. `studio/` = `prototype/studio/`.

### 1. M1: resolved
- `api/src/programs.ts:273-275`:
  - `holding` is every draft error, the tagged ones included.
  - `firstHold` is `firstError` when there is an untagged error.
  - Otherwise it reads "No form fields mapped yet for IMM 5475: map its form fields (Draft setup), or remove it from this combination."
- `draft()` holds and explains from these (`:427`; the summary path `:439`). The Part 3 row (Live Visitor visa plus IMM 5475) now reads "Held back: No form fields mapped yet for IMM 5475: …". It no longer reads "Not submitted for review", and the step it gives (map or remove) is one the server accepts.
- After a partial release, `held` (`:505`) carries the same `why`, so it names the forms too.
- `errors` (`:229`), `blockers` (`:277-279`, still built from `errors`) and the checklist input are unchanged, as the fix note asked. `check_uxa2_to_review_browser.cjs` keeps its basis.
- A side effect, in the right direction: the summary draft bar (`:439`) used to treat an unmapped-only row as not held. The server then refused it. It now agrees with the server.
- The new check "B1 Opus M1 fail" (`tests/check_b1_release_unmapped.ts:75-78`) is an honest fail case. On `54d2b6f9`, `why` was the review gate's reason: it does not contain IMM 5475 and it does say "Not submitted for review". The check reads `GET /draft` as the approver, where the hold test (`:427`) runs before the gate.
- Nothing else in the tree reads the old message text (`git grep` at `ecee311eb`). The only reader, `unmappedErrors`, was updated in the same diff.

### 2. Other Release-page behaviour
- **Only untagged errors: identical to before.**
  - `holding.length > 0` exactly when `errors.length > 0` (with no tagged errors, `holding` is `errors`).
  - `firstHold === firstError` whenever `errors.length > 0`, including the G1 "N numbers have no source entry" summary.
  - So `held`, `why` and the bulk refusal read as on `54d2b6f9`.
- **Mixed (untagged and tagged):** held (as before). The reason is the first untagged error, as before, so the unmapped forms are not named in the row until that error is fixed.
  - This matches the page's existing "first problem" pattern for every multi-error row.
  - The row's label links to Review and release, which lists every error, including each form.
  - Not a finding.
- **Only tagged errors:** held, naming all the forms (M1).
- **Counts:** `holds` is used only as a truth test (`:427`, `:439`), never shown as a count. Nothing on the page counts problems twice.

### 3. The all-held bulk refusal (`:488-501`): consistent, with one small repeat
- **`detail` (`:488`)** reads "Visitor visa: No form fields mapped yet for IMM 5475: map …". It now names the form; before, it gave the review gate's reason.
- **`errors[]` (`:496-499`):**
  - `studio.problems()` still yields one line per unmapped form, as "IMM 5475: No form fields mapped yet: a case could not fill this form, …" (`problemWords`). These are correct.
  - The "say the row's reason once" guard at `:499` tests `r.why.includes(p.message)`. `firstHold` is not built from `p.message`, so the test fails for an unmapped-only row. The row then gets an extra `where: "Review"` line, "Visitor visa: No form fields mapped yet for IMM 5475: …". That repeats the same cause, under "Review", which it is not.
  - The page never shows this: Release is disabled when nothing is ready (`web/src/pages/release.tsx`), so only an API caller or a race reaches the 409.
- **Minor n1. Fix** at `api/src/programs.ts:499`: also accept a tagged problem whose form the reason names:
  `!own.some((p) => r.why!.includes(p.message) || (waitsForMap(p) && r.why!.includes(p.item)))`
  Optionally, extend the Part 3 check: run an all-held `POST /pack/release` and assert one IMM 5475 line and no "Review" line.
- Mixed and untagged-only rows are unchanged here. `r.why` is `firstError`, which contains the first untagged `p.message`.

### 4. New Blocker or Major: none
- **m1 (wording): resolved.**
  - `engine/validate.ts:71` no longer names the form or says "this release". Review and release prints it once with its item: `review.tsx:20-22` → "IMM 5475: No form fields mapped yet: a case could not fill this form, so firms could not open cases on a release with it. Map its form fields (Draft setup), or remove the form."
  - Submit's refusal uses the same `problemWords`.
  - "Draft setup" is the real name of the panel (`web/src/components/ai-launch.tsx:65`).
- **Test edit at `:40`: sound.** Dropping `message.includes(p.item)` follows from the new message. The check still compares the listed items with the unmapped forms exactly, one per form, and finds no warning.
- **Still open from round 1, not raised by this diff:** m2, m3, m4 and m5 are Minors and do not block.
- **Not re-run:** I trust the builder's 14/14 on an isolated copy, by reading only. Please confirm `check_b1_release_unmapped.ts` and the section 5 suites in the current full run.

### Journey score (reviewer role; simulated from code, no server allowed)
J2 again: the approver on the Release page with a Live Visitor visa plus IMM 5475. The row now names IMM 5475 and the step to map it or remove it. J1, J3 and J4 are unchanged.

| Criterion | Round 1 | Round 2 | Evidence |
|---|---|---|---|
| Task completed | 1 | 1 | Unchanged |
| Next step obvious | ½ | 1 | The row names the form and a step the server accepts (M1) |
| Plain words | ½ | 1 | Form named once; no "this release" on a draft (m1) |
| Feedback and state | ½ | ½ | Release page fixed; Overview tile m4 still open |
| Correct data | 1 | 1 | Unchanged |
| Error recovery | ½ | 1 | One step from the reason to the fix |
| Accessibility and sizes | ½ | ½ | Not walked |
| Speed | 1 | 1 | No new query (an in-memory filter over the row's problems) |
| Visual quality | ½ | ½ | Not seen |
| Trust and sources | 1 | 1 | Unchanged |

**8.5/10 (simulated), at or above the pass of 8.**

Verdict: Approve
- No open Blocker or Major.
- Minor n1, which does not block: `api/src/programs.ts:499`. In the all-held 409, an unmapped-only row repeats its cause as a "Review" line. Fix as in section 3.
