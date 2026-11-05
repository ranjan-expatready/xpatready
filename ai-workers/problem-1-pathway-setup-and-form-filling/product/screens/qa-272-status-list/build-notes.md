# QA-272 — IMM 5257 status offers the form's own list

6 Nov 2026, all times IST. PR #1125. Sample data only; immigration values come from the IMM 5257 (09-2023) field inventory. Legal: Unconfirmed: no counsel.

## Cause and change

The saved field-map transform ended in `code_list:imm5257.immigration_status (01..09)`. `shapeOf` treated the range note as one literal choice, so a person could not answer the status question.

At field-map apply, `spellOutCodeRange` now reads the PDF field's resolved options and writes the nine `Label=code` pairs. A release that still holds a bare range leaves the answer open rather than offering `01..09`. Labels containing punctuation that the inline-list parser cannot read leave the transform unchanged.

The existing answer-list path keeps its lowercase keys (`citizen`, `other`), so rules such as `is: "other"` keep their meaning. The configured checkpoint currently uses the inline labels directly.

## Checks

- `tests/runtime/check_case_engine.ts`: **76/76, exit 0**. Passing and failing cases plus a 100-run property: every offered label reads back to its own code; no out-of-range code appears.
- `tests/check_c10_1_configured.ts` on isolated `qa272` :4450: **45/45, exit 0**. The configured release lists Citizen through Foreign National; `01..09` gets a validation problem; Citizen saves; Confirm section returns 201 with ten answers confirmed; a newly generated IMM 5257 request holds `CurrentCOR.Row2.Status = 01`. No live AI and no spend-ledger change.
- Fresh isolated copy `qa272fresh` from exact commit `17e5f4f7218915cda00e03b7a846ae36681e8c47`, the same configured pack: **45/45, exit 0** (01:52 IST), then stopped with its database and files removed. Full output is in the session group's shared `qa272-fresh-acceptance.log`.
- `product/tools/graph.mjs --check`: **exit 0**.
- `studio/tools/count-any.mjs --against origin/main`: **exit 0**, 418 explicit `any` before and after.
- `run-suites.sh --changed origin/main..HEAD` selected ALL because `engine/options.ts` is shared; `--direct` still selected the broad `api/src/sources.ts` callers. Those local fan-outs were stopped. The behavior-specific unit and configured packs above ran by their usage lines; the PR's GitHub check runs the affected set.

## Person walk, 1440 × 900, 6 Nov 01:14–01:18 IST

On isolated `qa272` :4450, acting as the case officer:

1. Demo → Load the configured checkpoint → confirmed the dialog. Loaded with no live AI call, US$0.
2. Demo → Open the case area → `SAMPLE-VV-FAMILY-1` → Client A (Sample).
3. Personal details → Add “Immigration status in the current country of residence”. The combobox's accessibility tree listed exactly Citizen, Permanent resident, Visitor, Worker, Student, Other, Protected Person, Refugee Claimant, Foreign National.
4. Chose Citizen → Save. The answer appeared with no validation problem.
5. Confirm section → the section showed 10 answered, 10 confirmed; the case header showed 12 confirmed answers.
6. Prepare application → IMM 5257 for Client A → Generate a new copy. The new copy became Generated, with 12 form fields written and its own read-back checked. The earlier blank copy stayed under Earlier copies.
7. Reopened the answer and cancelled without changing it: Citizen still selected, “Now: Citizen (Confirmed by the officer).” Browser console: **0 errors**.

Screenshots:

- `status-choices-1440.png`: Citizen selected in the status dialog after the walk; the nine-option accessibility reading is recorded above.
- `status-answer-confirmed-1440.png`: Citizen, Confirmed, fills IMM 5257.
- `status-confirmed-1440.png`: Personal details, 10 answered and 10 confirmed.
- `generated-copy-1440.png`: the newly generated IMM 5257 with 12 fields written and read-back checked.

The acceptance pack, not the browser layout, proves the generated form code is `01`. No priced button was clicked; live AI stayed off; US$0.
