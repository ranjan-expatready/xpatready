# B81 — "Not on this form": the choices step on the Forms tab (one-page concept, P-223 (4))

**Job.** On a form's line on the Forms tab, the configuration author sets how each answer on a shared list becomes the choice this form prints, and marks an answer the form does not print as **Not on this form**, so a case with that answer is refused in words at filling and Submit stops refusing the release. Persona: the configuration author. Row: C10.1 row 9 (Lead 10's rulings (a), (c') on #1009), C3.8 "every option mapped".

**Why a new screen part.** The option map has only API routes today (`POST`/`PATCH editions/:id/option-maps`); `web/src` has no screen for it, so "a person marks" cannot happen in the product. Nothing else moves: no new page, no new menu.

## What the form's own words say (AGENTS rule 4; Sample, Unconfirmed: expert)
IMM 5645 (01-2021), official PDF `official-sources/ircc/forms/imm5645e.pdf` (sha256 d6ba4cab…), page 1, the "Marital status:" drop-downs, read from the form's own template 5 Nov 2026 (`prototype/p1/inventory/imm5645e.inventory.json`):
* **Mother, Father, every child in Sections B and C (13 boxes):** "Annulled marriage", "Common-law", "Divorced", "Legally separated", "Married", "Single", "Widowed" (codes 1–7).
* **Applicant and Spouse (2 boxes, still undecided on To review, so not among the 13):** the same, except "Married-physically present" and "Married-not physically present" instead of "Married" (codes 1–8).
* The shared list (`person.marital_status`, IMM 5257's own 8 choices) holds **one** `married` and an `unknown`. IMM 5645 prints no "Unknown".

## Findings that change the brief (evidence, for the tech lead)
1. **The 13 problems are mostly a reading bug, not missing choices.** `pdfOptions` ignored the drop-down's printed two columns and parsed the field map's transform text: Section B's "1=Annulled marriage" lost every multi-word choice (and "3=Divorced" gave the code `Divorced`, not `3`); Father's and Mother's `{…}` form gave nothing, hence "no option map yet". With the form's own columns the rules draft 7 of 8 on all 13 boxes; only `unknown` is left, the one true "not on this form".
2. **"Two list values sharing one printed code": the case does not arise for marital status.** Both marital lists (`marital_status`, `marital_status_2`) hold one `married`; there are no "two married values" (that came from reading the Applicant's two printed choices as list values). **Decision: the route keeps refusing two values on one code.** Recommendation only; the tech lead rules.
3. **The real married problem runs the other way:** one list value against two printed choices on Applicant and Spouse. The draft's first-word rule would have picked "Married-physically present" silently. Fixed: a first word two printed choices share decides nothing. Those two boxes are undecided today. After the challenge (B1): this step neither marks `married` there (the form does print Married) nor picks one of the two (a content guess, ruling (b)); the row says "this form prints two Married choices: the immigration expert decides", and those boxes stay off the map ("filled by hand" already exists) until the expert answers.

## Business rules
* **BR-1** Every code comes from the form's printed choices; nothing is typed (STANDARDS §3.2).
* **BR-2** A value is marked only if the form prints nothing that could be it: the value's own words, a choice sharing its first word, or a choice its label ends with (the draft's own matching; "Legally Separated" against a printed "Separated") each refuse the mark ("…is on this form: it prints …"). Two or more such choices also refuse a pick ("the immigration expert decides"). A form field whose choices were not read cannot take a mark.
* **BR-3** A marked value passes the release check, and the release shows one warning per form and value ("…a case with that answer is refused at filling…"). An unmarked value with no code still blocks Submit.
* **BR-4** Filling a marked value writes nothing and says, apart from "by hand" and naming the person: "the form has no such choice: leave it blank or change the answer". Never the nearest choice. Filing is not held (IMM 5645 marks no field required); whether a blank is acceptable to IRCC is Unconfirmed: expert.
* **BR-5** One printed code takes one value. Only the author saves; others read (reason on the greyed control); saving is audited; a stale save gets 409 with the change named; a new rules draft fills only values with no saved code or mark.
* **BR-6** Saved on the edition's draft field map, so it holds for every combination filing that edition (the dialog says so: "Saved on IMM 5645 (01-2021): N combinations file it") and reaches a case only through a release.
* **BR-7** A new edition carries an option map only when the box's printed choices are identical; otherwise it has none and "no option map yet" blocks release.
* **BR-8** A release problem on an option map links to this step and names it.

## Layout (EXPERIENCE: an existing drawer, no new page)
On the line's drawer (Forms tab › a form › its panel), a section **"Choices this form prints"** under "Reading and matching", only for a PDF form with a form field on an answer list: one sentence ("13 form fields read Marital status. 1 answer has no printed choice.") and a **Set choices** button; a Pill "Blocks release" while a group has problems. It opens a dialog (the `Dialog` used by the Tests tab's editors):
* one block per group of form fields that print the same choices and read the same list, headed with the list's name and the parts ("Mother, Father, Section B, Section C · 13 form fields"), expandable to each form field;
* a table: **Answer on the list** | **This form prints** (a `Select` of the printed choices, plus "Not on this form", plus "Not set"); a value the rules suggested shows "Suggested from the form's words" until saved; a note: "Not on this form: the form prints no such choice, so a case with this answer is refused at filling. Sample until the immigration expert confirms.";
* the printed choices no answer takes are listed under the table ("Printed, no answer uses it: …"); Save per group, all or none; Cancel asks nothing unless changed (`guard`).
States: loading, a read error with Retry, no such field (the section is absent), read-only, a server refusal shown on the dialog in its words. Works at 1440 and 1024 px, keyboard only.

**Challenge:** independent Opus, verdict "Build after these changes" (`challenge.md`); its Blocker and five Majors are taken above (B1 → BR-2, M1 → BR-4, M2 → BR-7, M3 → BR-8, M4–M6 → BR-5, BR-6).

## Contract and tests
`GET editions/:id/option-maps` (`OptionMapsView`) · `PATCH editions/:id/option-maps` (one field, gains `notOnForm`) · `PATCH editions/:id/option-maps/group` (`SetOptionMaps`) · `WorkspaceFormLine.editionId` (additive). No migration: `option_map` is JSON and `notOnForm` is written only when present, so existing snapshots keep their checksums. Pass and fail per BR: `tests/check_forms_b81_not_on_form.ts` (offline, 16), `tests/check_forms_b81_routes.ts` (API, fill refusal, Submit), `tests/check_forms_b81_browser.cjs` (1440 px walk). No question or list changes, so list `vv.single-ae2133b8a398` does not move. A case's answer labels follow the existing rule (`optionsOf`: the first form that labels them), so a saved IMM 5645 code may let one read "Annulled marriage" rather than "Annulled Marriage" if that form comes first; no answer is lost, and a mark takes nothing off the question (offline check).

**Capability or scaffolding:** capability. **Needed for the proof:** yes (row 9). **US$0**, no AI.

## Questions for the tech lead
1. Approve this drawer section and dialog as the new screen part? Recommended: yes.
2. Two values on one code: keep refusing (finding 2)? Recommended: yes.
3. `married` on Applicant and Spouse: no mark and no pick; those boxes stay off the map until the expert answers, outside this row? Recommended: yes.
4. A value refused at filling does not hold filing (BR-4)? Recommended: yes, shown to the officer, the expert's question recorded.

## Tech lead's ruling (Lead 11, 5 Nov, on #1057)
Approved: all four as recommended. `married` on Applicant and Spouse goes to row B90. The reading fix counts as C3.8, so the PR names C3.8 with its pack shown green. The door stays general: B79a (#1050) marks IMM 0008 DEP through it, so it is tested on that form too.

## Build discoveries
* A form's panel opens only for the author today (`canAuthor`), so "read-only" is reached only if that changes; the controls still carry the reason.
* A box the form marks required stays on the open list when its answer is refused (`engine/runtime/mandatory.ts`): the form's own Validate would refuse it blank. Ruling 4 holds on IMM 5645 (no required fields) and on IMM 0008 DEP's marital status box (not required).
