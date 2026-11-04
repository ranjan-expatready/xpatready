# C1.6 — forms channel slice: plan (forms lane, 4 Nov)

Capability: the Programs row and the combination page show each form's channel and the combination's filing method;
the author sets the channel per form line (P-61, P-62, P-143, P-208).

## What main has today (measured on this cloud machine, main 9caa043b, isolated copy, US$0)
* The contract already has the four channels and the signature value (`contracts/forms.ts`: ONLINE · PDF_UPLOAD ·
  PAPER · NOT_NEEDED, SIGNATURES). The row's reason for Partial ("the contract still has three channels") is out of date.
* `acceptance/C1.6.test.ts` on the fixture: **23/23**.
* `tests/qa/check_qa_am_ch_1030.cjs` on a fresh fixture copy: **46/47**; the one red is QA-134 (the accepts panel's
  hint shows "(P-143)" on screen).
* Reset to the six: only Visitor visa has form lines (7, all PDF upload, no IRCC account); the card says "PDF only".
  IMM 5645 **and** IMM 5707 are both filed lines on Visitor visa, so a case would file both family forms.

## Gaps against the row's words
1. **QA-134**: decision id on screen in the "what IRCC accepts" panel (forms lane, Minor) → remove it.
2. **"Online with its portal"**: an Online line says "Online (typed in by hand for now)" but not the IRCC account it is
   typed into; the Programs row does not show it either. → an Online line names its portal from the combination's
   IRCC account ("Online · IRCC secure account"; "Online · account not set" when none); the Programs List row and the
   card's filing tag tooltip name each form's channel.
3. **The family form follows the channel (P-318 (6))**: online → IMM 5645, paper → IMM 5707 (IMM 5484), never by
   removing one, and no form number in code (P-319). Needs #833's `form_role` (queued). Question for the tech lead on
   the PR before building this part.

## Checks (Done when)
C1.6 pack and the qa check, each twice, on Reset to the six and on the fixture; a 1440 px walk of the Programs row
and the combination page with screenshots; `run-suites.sh --changed` exit 0; graph check; count-any.
