# B116: the release asks Background 1 a), Background 6 and the research-contact consent (C10.1 row 12b)

**Where it lands.** B116 lands with row 12b in **one PR, #1123** (tech lead, 6 Nov): its commits are on `claude/forms-b99-validated-copies`, which is stacked on #1052 and #1125. The builder's session cannot edit #1123's body (the same GitHub block as its comments), so this note is the record. The branch `claude/forms-b116-own-unmapped` was only a staging branch and has no PR.

**Why.** The founder ruled on #1123 (6 Nov ~03:15 IST, "Add the questions (Recommended)"): row 12b closes only when the product itself fills every box IMM 5257's own Validate insists on. No hand ticks count. The tech lead's Validate of B99's copies stopped at Background 1 a), and a practice pass (not evidence) showed that Background 6 and the research-contact consent stop it too. No saved AI answer mapped any of the three, so nothing asked them.

**What changed.**
* `api/src/own-question.ts` (B52's door, `POST /editions/:id/form-fields/own-question`) now also takes a Yes/No form field that nothing fills yet (no decision, or "filled by hand").
  * The box is mapped to the question in the form's own Yes and No codes (`yesNoCodes`: exactly one Yes and one No printed); the person is the form's subject.
  * The words come from the reading's printed question. Where the reading prints a neighbour's words, the form's question is quoted, and it is taken only when the form's saved text holds it exactly (`inFormText`, `prototype/expected/source-text/<file>.xfa-template.txt`). IMM 5257's consent box carries Background 6's caption in the reading, and its heading is cut at 120 characters.
  * Undo restores the earlier decision. A draft that only held the ask over a released row is removed, so the release sees no change.
* `samples/own-yes-no.json` (data, Sample, Unconfirmed: expert; nothing hard-coded, P-319): the three boxes are added for the Visitor visa's IMM 5257, each with its label and meaning, plus the consent's quoted question.
* `api/src/demo.ts` passes the quote through.
* `samples/sample-family-imm5257.json`: the Sample family answers No to all three, as E1's Sample did.

**Result on the configured checkpoint** (test copy `b99t`, US$0, live AI off):
* Release 1 maps the three boxes as `yes_no_code:Y/N`, quoting the form.
* All four applicants are asked the three questions (the child under 18 included), answered and confirmed.
* Each copy writes N in the three boxes:
  * Client A and Partner: 66 values written;
  * Child and Child 18 or over: 63.
* The two boxes still open are Taiwan and Israel passport. The form makes them required only when the passport is Taiwan's or Israel's (its own `TaiwanPIN` and `IsraelPassportIndicator` scripts), and the tech lead's practice pass confirmed they do not block.

**Tests.** `tests/check_forms_b116_own_unmapped.ts`: 16 checks covering the pass case (release map, every applicant asked, copies), the fail case (words not in the form's text, a box with no Yes/No, a quote on a worked-out box), and undo.

**Not done here (follow-ups).** The Form fields page's "own questions" list still shows only worked-out Yes/No boxes, so a person cannot yet start this ask from that screen. The route takes it, and the checkpoint uses it. The field list's wrong captions for the consent, Taiwan and Israel boxes come from the reading (`p1/inventory/imm5257e.inventory.json`), and the reading itself is unchanged.
