# Review: C4.6 Preview by person per channel (runtime, builder B3)

Reviewer: a fresh context that did not build it, 1 Nov. Commit **7831153e**, branch `claude/runtime-c46-preview-channels`, worktree `/home/user/wt-c46`. Isolated copy `review_c46` on :4439 (web built first). US$0, no AI.

**Spec:** CAPABILITIES C4.6 says "Preview by person shows, for each person, which outputs they get per channel: portal screens, filled PDFs, PDFs to sign (P-62 §7)". What was missing: portal screens are parked (P-102), and the Online group had no later-wave note. I read P-102, P-143 (four channels plus a signature value), P-113, `contracts/forms.ts` (SIGNATURE_WORDS, SIGNATURE_FITS) and `engine/channels.ts` `lineOf`. I agree with how the builder read the spec: portal screens stay parked and are said to be parked, PDFs to sign are shown per person, and there is a count per person by channel.

## Verdict: Changes needed (**Verdict: Block**)
There are two open Majors. Both are small fixes. Everything else holds.

## Tests re-run on :4439 (all green, the same as the builder's)
`check_c46_preview_channels.ts` 16/16 · `check_c46_preview_channels_browser.cjs` 18/18 · `check_preview_sets.ts` 27/27 · `check_preview_sets_browser.cjs` 24/24 · `check_engine.ts` 38/38. Graph: G1 0 · G2 0 · G3 1 (`GET /attachments/:id/file`, not touched by this PR) · G4–G6 0. Nothing was left changed in the worktree except this file and the journey report.

## Findings

### Major 1: the new count calls document checklists "filled PDFs to upload"
- **Evidence:** in the sample, IMM 5488 and IMM 5905 have `form_kind: "document"`. The Forms tab shows both as **"Checklist · not filed"** (`web/src/components/channels.tsx:63`). The new count for the principal reads "Principal applicant gets: 1 filled on the portal (later wave) · **5 filled PDFs to upload** · …". Only IMM 5257 SCH1, IMM 5475 and IMM 5476 are filled and uploaded. Before any change it reads "7 filled PDFs to upload" for 5 filed forms. `outputsLine` (`web/src/pages/workspace/preview.tsx:19`) counts every `channel === "PDF_UPLOAD"`, and `lineOf` defaults a checklist's missing channel to PDF upload.
- **Why it matters:** C4.6 is "which outputs they get". The count is new in this PR and states a wrong number. The product's own Forms tab says the opposite.
- **Fix:** carry the line's kind into the preview form, for example `document: form_kind !== "data_form"` in `engine/runtime/preview.ts:142`. Leave checklists out of the channel counts, or say them as "N checklists (not filed)". Add a pass/fail test using IMM 5488.
- The grouping of checklists under "Filled PDF to upload" existed before this PR. The count line is what makes it a wrong statement.

### Major 2: an Online line outside the "Online" group gets no later-wave note
- **Evidence:** the note renders only when `g.key === "ONLINE"` (`preview.tsx:141`). Lines in "Filed once for the couple" or "Filed once for the application" keep their own group, whatever their channel.
- **How I reproduced it:** I set IMM 5409 (couple once) to Online and IMM 1295 back to PDF upload, then opened Preview → Spouse or partner. The count says "1 filled on the portal (later wave)". IMM 5409 shows only an "Online" pill under "Filed once for the couple". There are **0** `[data-later-wave]` elements on the page (screenshot `/tmp/rv46/spouse-couple-online-1440.png`, not committed).
- The API does carry `laterWave` for that line. Only the web drops it.
- **Why it matters:** P-113's real Online forms (IMM 0008, 5669, 5406) are application-level forms, so they would land in "Filed once for the application" with no note. That is the exact gap this item was meant to close.
- **Fix:** render `f.laterWave` on any line that carries it, or render the group note whenever any line in the group is Online. Add a test with an Online couple line.

### Minor
1. **A decision number is shown on screen.** "(P-102)" appears in `LATER_WAVE_ONLINE` (`engine/runtime/preview.ts:151`) and in the web fallback (`preview.tsx:141`). PRODUCT.md §4 says: "No hashes, run IDs, decision numbers … on the main path". The Forms tab already shows "(P-113)" next to the same choice, which is a precedent but not a licence. The fail-guard `KEYS` only catches snake_case, so it misses this. Drop the number.
2. **The counts overlap without saying so.** "1 PDF to print, sign and mail · 2 PDFs to sign" adds to more than the forms listed, because a Paper line is counted twice. Fix in words, for example "of which 2 to sign" or "2 to sign (in pen or by hand)".
3. **The `PreviewForm` contract does not list the new fields.** `signature`, `signatureWords`, `toSign` and `laterWave` are not in `PreviewForm` (`contracts/workspace.ts`, owned by builder B1). The web casts to `FormOut`. Leaving it unchanged is a reasonable choice given the file's owner, but it should be raised with B1 so the type catches up.
4. **A function sits between imports.** `outputsLine` is declared between import statements (`preview.tsx:11–24`, then the import on line 25). This is legal because imports are hoisted, but it is untidy. Move it below the imports.

## Standards [M], the lines this item touches
- Words in plain language: not met (Minor 1).
- Correct data: not met (Major 1).
- Accessibility: met. axe WCAG 2.2 A/AA found 0 violations on the principal, the spouse and a 720 px view. There is no sideways scroll at 400, 1024 or 512 px (200 % zoom of 1024). The person buttons can be reached by Tab, and Enter switches person.
- Performance §9: met. The Preview tab opens in 273 ms and switching person takes 230 ms. One request per view, no request per row.
- Server authorisation: met. The approver (user-B) gets no "Filed as" select, and a direct PATCH returns 403.
- The draft and the release are kept apart: met. The released preview shows the released channels.
- A signature that does not fit its channel is refused in words: "IMM 5707: "Typed name" does not fit a line filed as Paper. A Paper line is signed in pen."

## Tests fail when a rule is removed
- Removing `outputOf`'s `toSign` or `laterWave`, or the web note, fails R1, R2, R3 and the browser "Online group says … no PDF" step.
- No test covers an Online line outside the Online group (Major 2) or a checklist in the count (Major 1).

## Concept and scope
This is in scope for C4.6. The portal screens themselves stay parked (P-102) and are not asked for here. Changes to the person switch's Back behaviour existed before this PR and are not a finding: Back from Spouse returns to the Forms tab.

## Journey score (reviewer, the one score for this check): **8.5 / 10, pass**
See `journey-test-reviewer-2026-11-01.md`. The low criteria are correct data ½ (Majors 1 and 2) and plain words ½ (Minors 1 and 2).

## What I could not check
- A real screen reader.
- An intended user's unaided walk (D17 and D20 are simulated only).
- Real IRCC portal behaviour for Online lines: Sample, until the immigration expert confirms.

## To fix before Approve
1. Major 1: leave checklists out of the "filled PDFs to upload" count, or name them as checklists; add a test.
2. Major 2: show the later-wave words on every Online line, whatever its group; add a test with an Online couple or application line.
