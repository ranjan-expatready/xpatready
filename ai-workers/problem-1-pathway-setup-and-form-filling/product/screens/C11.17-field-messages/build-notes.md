# C11.17 — "Add to Program structure": every refusal shows under its own field (QA-183)

Row: C11.17 (a content publisher adds to Program structure through one pop-up). Bug QA-183 (Minor): a category name over
120 characters is refused (400, nothing saved), but "Keep the name under 120 characters" shows only in the dialog's general
alert, not under the Category field. Rule: P-128; skill qa §2 (the message sits on its field).

## Plan
1. Find why the field message is lost: the server's field error path for a zod refusal of a `{ label }` pick inside the
   union is not `category`, so the pop-up's `errors[field]` map never matches the field.
2. Fix at the root so each refusal names its field (`pathway`, `program`, `category`, `subCategory`, `allowedLocations`,
   `pathwayType`), and check the same name rules in the pop-up as you type (contracts/programs.ts `labelProblem`, US$0),
   so the message is under the field before Add.
3. Check every field of the pop-up for the same defect (Pathway, Program, Category, Sub-category, Pathway type, Cases may
   be opened from) and fix those in the same PR.
4. Tests: C11.17 pack 24/24 on the six and on its fixture, twice each; a pass and fail check per field.
5. 1440 px walk with screenshots of the message under each field.

## What was wrong (found 4 Nov)
`POST /structure/path` refuses with zod field paths: `category.label` (a `{ label }` pick inside the union),
`allowedLocations.0`, `pathwayType`. The pop-up stored `errors[x.field]` and read `errors["category"]`, so no refused
name ever reached its field: every level (Pathway, Program, Category, Sub-category), the Pathway type switch and
"Cases may be opened from" had the same defect. Only refusals the server built by hand (`errors: [{ field: "category" }]`,
e.g. "Name already used", "Retired") reached their field.

## What changed (`web/src/components/add-to-structure.tsx`)
* Each refusal is placed by the first part of its path; the four name fields show it in their own alert (the input is
  `aria-invalid` and the message is its description), the Pathway type switch and "Cases may be opened from" got their
  own message line (`FieldNote`). The dialog's alert then reads "Nothing was added: see the note under Category." A
  refusal with no field of its own (e.g. `decision`) keeps its words in the alert, never lost.
* As you type, a new name is checked with the server's own rule (`contracts/programs.ts` `labelProblem`: at most 120
  characters, letters or digits), so the words are under the field before Add; Add and Add and add another stay off
  and Add's tip says "Fix the category first: see the note under it." Exactly 120 characters is allowed (same rule).
* Typing in a field, or choosing where cases may be opened, or switching Pathway type clears that field's message.

## Checks (cloud machine, isolated copies 4475/4476, never :4400; US$0)
* `acceptance/C11.17.test.ts` on the six (fresh copy each): 24/24, 24/24.
* `tests/check_c1117_field_messages_browser.ts`: 24/24 ×4 (two fresh copies, each run twice); **9/24 with main's
  add-to-structure.tsx** (15 fails: every field above).
* The pack with the older suites' fixture as 4th argument (`wp.family`): 23/24 twice; the one fail is the Tree check
  "the new category is in the Tree, offered Delete", whose `[data-row]` filter matches the parent Pathway row there.
  It is the Tree, not the pop-up, and gate B runs this pack on the six (its run line is the pack alone). Left to qa.

## Screenshots (1440 px, configuration author)
`1-pathway-too-long.png`, `2-program-too-long.png`, `3-category-too-long-QA-183.png` (+ `3b-…-1440-page.png`, the whole
page), `4-subcategory-too-long.png`, `5-server-refusal-under-category.png` and `6-server-refusal-under-locations.png`
(the request was changed on its way so the real server refuses it; the field shows what the pop-up held).
