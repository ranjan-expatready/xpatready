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
2. **"Two list values sharing one printed code": the case does not arise.** The list has one `married`; there are no "two married values" (that came from reading the Applicant's two printed choices as list values). **Decision: the route keeps refusing two values on one code**; no form on hand needs it. Recommendation only; the tech lead rules.
3. **The real married problem runs the other way:** one list value against two printed choices on Applicant and Spouse. The draft's first-word rule would have picked "Married-physically present" silently. Fixed: a first word two printed choices share decides nothing, so it stays with a person. Those two boxes are undecided today; when they are mapped, `married` on them is a person's decision (a further fact, an expert's question), and this step shows it open. Marking it "not on this form" is refused only when the words are exactly printed; "Married" is not exactly printed there, so a person may mark it, and a married applicant is then refused at filling, in words, never guessed.

## Business rules
* **BR-1** Every code comes from the form's printed choices; nothing is typed (STANDARDS §3.2).
* **BR-2** A value is marked only if the form does not print its own words: a value printed in its own words is refused ("…is on this form: it prints …"). A form field whose choices were not read cannot take a mark.
* **BR-3** A marked value passes the release check, and the release shows one warning per form and value ("…a case with that answer is refused at filling…"). An unmarked value with no code still blocks Submit.
* **BR-4** Filling a marked value writes nothing and says why, on that box; a person decides. Never the nearest choice.
* **BR-5** One printed code takes one value. Only the author saves; others read (reason on the greyed control); saving is audited; a new rules draft keeps a person's marks.
* **BR-6** Saved on the edition's draft field map, so it holds for every combination filing that edition and reaches a case only through a release.

## Layout (EXPERIENCE: an existing drawer, no new page)
On the line's drawer (Forms tab › a form › its panel), a section **"Choices this form prints"** under "Reading and matching", only for a PDF form with a form field on an answer list: one sentence ("13 form fields read Marital status. 1 answer has no printed choice.") and a **Set choices** button; a Pill "Blocks release" while a group has problems. It opens a dialog (the `Dialog` used by the Tests tab's editors):
* one block per group of form fields that print the same choices and read the same list, headed with the list's name and the parts ("Mother, Father, Section B, Section C · 13 form fields"), expandable to each form field;
* a table: **Answer on the list** | **This form prints** (a `Select` of the printed choices, plus "Not on this form", plus "Not set"); a value the rules suggested shows "Suggested from the form's words" until saved; a note: "Not on this form: the form prints no such choice, so a case with this answer is refused at filling. Sample until the immigration expert confirms.";
* the printed choices no answer takes are listed under the table ("Printed, no answer uses it: …"); Save per group, all or none; Cancel asks nothing unless changed (`guard`).
States: loading, a read error with Retry, no such field (the section is absent), read-only, a server refusal shown on the dialog in its words. Works at 1440 and 1024 px, keyboard only.

**Best in class:** tax interviews and bank onboarding map to a form's codes behind the scenes and say "not applicable on this form" instead of forcing a nearest answer; we copy the explicit refusal. Sources for this line: none read tonight, so it is judgement, not evidence.

## Contract and tests
`GET editions/:id/option-maps` (`OptionMapsView`) · `PATCH editions/:id/option-maps` (one field, gains `notOnForm`) · `PATCH editions/:id/option-maps/group` (`SetOptionMaps`) · `WorkspaceFormLine.editionId` (additive). No migration: `option_map` is JSON and `notOnForm` is written only when present, so existing snapshots keep their checksums. Pass and fail per BR: `tests/check_forms_b81_not_on_form.ts` (offline, 16), `tests/check_forms_b81_routes.ts` (API, fill refusal, Submit), `tests/check_forms_b81_browser.cjs` (1440 px walk). No question, label or list changes, so list `vv.single-ae2133b8a398` does not move.

**Capability or scaffolding:** capability. **Needed for the proof:** yes (row 9). **US$0**, no AI.

## Questions for the tech lead
1. Approve this drawer section and dialog as the new screen part? Recommended: yes.
2. Two values on one code: keep refusing (finding 2)? Recommended: yes.
3. `married` on Applicant and Spouse: leave open for a person and add a question for the expert when those boxes are decided, outside this row? Recommended: yes.
