# Journey test · F1 slice 2b (reviewer) · 24 Oct

**Setup:** code `130cea5`, isolated copy `forms_rv` on :4454 (stopped after), US$0 (stub passes plus one hand-written answer; no paid call).
**Why API and file level:** there is no new page. A "viewer that does not run XFA" means poppler: `pdftoppm` for the picture, `pdftotext -layout` for the text.
**Evidence:** renders and probes are in the session scratchpad and are not committed. Each can be reproduced with the commands in the review.
**Builder suite on my copy:** `check_forms_slice2b.ts` 28/28.

## Journeys (main first)
1. **Person fills IMM 5409 (static) and opens it outside Adobe.** Persona: case officer for Client A and partner. Goal: "the declaration shows our details when I open it". Ran the API's request shape (values plus page fields by SOM) through `p5/fill.py` with the evidence lane's 18 values.
   * Got: 18/18 data and 18/18 page fields, intact, UR3 verified, poppler 0 errors, 0.4 s.
   * The page render shows both names, New Delhi / Delhi / India, 11 years, 2015-06-01 to 2026-10-24, and the six Yes/No marks, in the form's Courier 8, black.
   * The oath block and all signature lines are blank. **Held.**
2. **Fill report and person steps for IMM 5409.**
   * Expected: the oath step, plus a sign step for both declarants.
   * Got: only F6, which lists the 10 oath boxes in one sentence, "…The product never fills them."
   * No sign step at all: IMM 5409 marks 0 fields required, and F2 needs `required`. **Major** (review item 2).
3. **Alternate: IMM 5476 (static) through the API**, `POST /combinations/<wp.family>/fill` for the principal.
   * Got: 201 in 0.54 s, 16 written, page fields 16/16, `shown_outside_adobe: true`. The render shows EXAMPLE / CLIENTA / 1990-04-12 / SAMPLE AVERY.
   * History: "…page fields 16/16 shown outside Adobe, intact". Download `GET /artifacts/:id/file` gives 200 application/pdf.
   * `person_steps: []` although the form has 5 signature boxes (same cause as journey 2). **Held, apart from the signing step.**
4. **Capture started with a lower-case code.** Persona: author. Goal: "type the code the way I type it".
   * `imm 5257`, `Imm-5257`, `imm_5257`, `imm5257` and `  imm  5257 ` all gave 201 `IMM 5257`. The library still holds one IMM 5257 (and its SCH1).
   * `ee profile` gave `EE PROFILE`. **Held.**
5. **Error: a bad code.**
   * `IMM 5257!` and `5257` gave 400 on the `form` field with "A form code: letters, then numbers, for example IMM 5257 or EE PROFILE."
   * The words are inaccurate: letters alone pass, and the example has no numbers. **Minor.**
6. **Author presses "draft with AI" (LIVE) again while proposals wait.**
   * First LIVE with no confirmation: 409 "costs at most US$0.43 … send that amount" (correct).
   * After the stub job (no proposals): LIVE is not reused, and the cost is asked again (correct).
   * With 3 hand-written proposals waiting:
     * LIVE gives 201 `reused: true`, the same job id, in 17 ms, with "No new AI call (US$0): the finished draft of these inputs still has 3 proposals waiting. Accept them, or map those inputs by hand…".
     * With a confirmation sent, it is still reused.
     * The job count and spend are unchanged, and the history line is there. **Held.**
7. **Wrong role and bad input on the same route.**
   * Reviewer (user-C): 403 "does not hold the author duty".
   * Unknown combination: 404. **Held.**
8. **Recovery.** Accept 1 of 3, press again: reused, "2 proposals waiting". Accept the rest, press again: 409 asks the worst case for the 10 inputs still open (US$0.38). **Held.**
9. **Break it (page fields).**
   * `JOSÉ ÑÚÑEZ` and `O'BRIEN (JR) \ TEST` are drawn correctly.
   * `ŁUKASZ ŻÓŁĆ` is drawn as **`?UKASZ ?Ó??`**, and Devanagari as `??? ?????`.
   * A 70-character name is clipped at both ends.
   * In all three of those cases the report still says `read_back_equal 1`, `shown_outside_adobe: true`. **Major** (review item 1).
   * Radio value 9 (no widget): not set, and reported. AcroForm not redefined; 37 appended objects encrypted.

## Data underneath
* Captures: one `gov_form_def` IMM 5257; 5 captures under `IMM 5257`, 1 under `EE PROFILE`.
* D3: `drafting_job` count and `sum(cost_usd)` unchanged by the reuses; `audit_event` "reused" line present; accepting sets `accepted_inputs` and then APPLIED.
* Fill: `generated_artifact.detail.page_fields` is set, and the audit line counts the page fields.
* Side effect (pre-existing): stub starts write to the shared `p2` ledger and runs; I restored them.

## Score (reviewer, one score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | IMM 5409 and 5476 show their values outside Adobe; lower-case capture; repeat press reused at US$0 |
| Next step obvious | ½ | the reuse message says what to do; static forms give no "sign" step (journeys 2, 3) |
| Plain words | ½ | reuse and F6 words are plain; the QA-15 message is wrong (5); the F6 sentence lists 10 captions |
| Feedback and state | 1 | `reused`/`reused_message`, `page_fields` in the report, artifact and history |
| Correct data | ½ | exact for Latin-1 values and one form per code; the page shows `?` or clipped text for some names (9) |
| Error recovery | 1 | field error on a bad code; 403 and 404; accept, then the cost is asked again (8) |
| Accessibility and screen sizes | ½ | no page; output is real, extractable text; letters outside the font's set are lost (9); no screen reader |
| Speed | 1 | fill API 0.54 s, filler 0.4 s, reuse 17 ms, capture 6–12 ms |
| Visual quality | 1 | values sit in their fields in the form's own font and size; radio marks drawn |
| Trust and sources | ½ | the AI reuse is marked US$0 with its job id; "shown outside Adobe" can be false (9); Adobe re-check pending |
| **Total** | **7.5 / 10** | **Fail (below 8; no criterion at 0)** |

## Fixes that raise the score (most valuable first)
1. Check that each page-field value encodes in the field's font and fits the field. Report it as not shown, with a reason, otherwise. This raises correct data, trust and accessibility.
2. List signature boxes as a person step on forms that mark nothing required (IMM 5409: the declarants sign at the oath). This raises next step obvious.
3. Correct the QA-15 field message. This raises plain words.

## Not tested
* Adobe Reader (extended features after the page-field update).
* The IRCC upload portal.
* A real screen reader.
* A LIVE AI draft (no paid call).
* An intended user's unaided walk (D17, D20 stay with the founder).
