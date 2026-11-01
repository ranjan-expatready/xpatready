# C4.1 — the questionnaire per person role: concept draft (runtime builder, 1 Nov)

**Founder's early look needed.** Nothing here is built. It is a draft for the tech lead and the founder, with three
questions in §6. Board: none yet (text only); a board follows once the direction is agreed.

## 1. The job
An author makes sure each person in an application (principal applicant, spouse or partner, each child, the case) is asked
every answer their forms and documents need, once, in a sensible order, and nothing else (C4.1, P-130, P-174).

## 2. What is already built on main (so this draft does not redo it)
* **Questions per person:** person chips on the Questionnaires tab, each with its count and "n not asked"; one row per
  question with Comes from, Pre-qualification, Only if and Status (board v2, P-147).
* **What is asked comes from the forms and rules (P-174):** a question is asked when a form or rule of the combination
  reads it, under the section the shared library places it in. Choosing sections only adds or removes an empty section.
* **Gaps:** "n answers are needed but asked of nobody: release waits for them", with the fix written in words (add the
  library section that asks it, or have the case officer fill it).
* **Where each answer comes from and the tick:** C4.10 and C4.2 (Works and Partial in `qa/CAPABILITIES.md`).

## 3. What is missing (the C4.1 gap: "Section selection only")
1. **Order of the sections for this combination.** P-174 says a combination's section choice "sets only which empty
   sections show, their order and titles". The order is stored (`sqr_section_selection.section_order`) and read by the
   renderer, but nobody can change it: the row menu's "Move up or down" is greyed ("The order is set in the library
   section"), and there is no section-level move. v2 notes §6 lists "section order per combination" as Not built.
2. **A section title for this combination.** Also in P-174; nothing stores or shows a per-combination title today.
3. **Fixing a gap from the tab.** A gap names the missing answer but offers no action: the author must leave for the
   shared library, find a section and place the question there. A button on the gap ("Ask it in…") would send one
   placement change to To review (P-149 one door; the shared library is changed only through a reviewed change).

## 4. Proposed design (smallest that closes the gap)
* **Section order:** each section header gets "Move up" and "Move down" (buttons, not drag; keyboard first). One move is
  one draft change of this combination, with one Undo, named on Review ("Sections reordered: Travel history now 3rd") and
  released with the combination (C4.8, one release). The order is the same for every person of the combination.
* **Section title:** "Rename for this combination…" in the section header menu; blank goes back to the library title. A
  draft change, named on Review, released with the combination. The library's own title is unchanged.
* **Ask a missing answer:** on each gap line, "Ask it in…" opens the one Add dialog (S6) with the library sections that
  fit the person; Send puts one placement change on To review. Nothing changes in the combination until it is approved.
* **Not in this slice:** adding a question no form or rule reads (P-174 says it is not asked); per-person order inside a
  section (the library sets it).

## 5. Rules, each with a pass and a fail test
| # | Rule | Pass | Fail |
|---|---|---|---|
| R1 | Only an author moves or renames a section; the change is a draft of this combination | author's move saves a draft, Review names it | Approver's move is 403 in words |
| R2 | A move is checked against the version read | move from the current order saves | a move from an older order is 409 "changed since, reload" |
| R3 | The first section cannot move up, the last cannot move down | middle section moves | the greyed button says why |
| R4 | A combination's order and titles never change another combination or the library | other combination unchanged | library title unchanged after a rename |
| R5 | Order and titles go out only in the combination's one release (C4.8) | released snapshot carries them | no separate approval route (404) |
| R6 | "Ask it in…" changes nothing until approved | To review shows one placement change | the gap stays until approval |

## 6. Questions for the founder (one at a time, recommendation first)
1. **Section order per combination: Move up and Move down buttons on each section header, released with the combination?**
   *Recommend yes.* It is what P-174 already promises, keyboard-friendly, and one Undo per move. Option: drag and drop
   (harder for keyboard users, more to test).
2. **A section title per combination, or only the library's title?** *Recommend the library's title only for now* and
   strike "titles" from P-174 until a real case needs it: a second title per combination makes the same section read
   differently across combinations, and nothing in the six sample combinations needs it.
3. **"Ask it in…" on a gap line, sending one placement change to To review?** *Recommend yes, but as its own later slice
   (screens' S6 Add dialog is the one door).* Until then the gap's written fix stays.

## 7. Size and owner
Order (R1–R5): runtime, about 1 day, touches `api/src/studio.ts selectSection`, `engine/snapshot.ts`, the Review change
list and `questionnaires.tsx`. Title: half a day if wanted. "Ask it in…": screens' Add dialog, about 1 day, after S6.
Immigration values: none; US$0.
