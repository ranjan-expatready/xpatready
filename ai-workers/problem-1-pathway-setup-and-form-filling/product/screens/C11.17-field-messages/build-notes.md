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
