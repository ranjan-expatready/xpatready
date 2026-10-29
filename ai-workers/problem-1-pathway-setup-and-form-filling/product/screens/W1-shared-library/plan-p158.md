# S6 Shared library: P-158 delta (screens lane, 29 Oct)
P-158 amends P-149 (`plan-p149.md`) and the plan (`plan.md`). Every library item comes from a source; there is no free manual add.
P-158 amends P-149's manual add: every library item comes from a source. People confirm, rename, explain and merge; they never create an item from nothing.

**Manual add found today:**
* **plan.md §3:**
  * "One Add" (`POST /library/add {kind, words}`);
  * "Answer lists through the second person" by Add;
  * "Person role Add (m1)";
  * shared condition "Add from a sentence".
* **This file:**
  * B, "AI-first lists": "Not in the list? Add one".
  * B, rule (1): origin person, its reason and "Added by a person" at release.
  * B, "Manual field Add: where it applies": placements, Q-A1.
  * B, coverage gap: share of manual adds.
  * Q-A4.
  * C: contract `origin: person`, `addReason`, `relatesTo`.
  * Guard rows: P-149.1 reason, Q-A1, Q-A4.
* **Code on main:**
  * Fields page "Add field" (`library.tsx:42`, typed key, `POST /library/fields`, `studio.ts createField`);
  * Sections page "Add section" (`library.tsx:119`, `POST /library/sections`);
  * `POST /library/answer-lists` (`forms.ts:364`).

**Not manual add:**
* document types, made only by applying a checklist (`studio.ts:521`);
* "Add a library section to this questionnaire" (`configuration.tsx:139`), which uses an existing section.

**Delta, agreed by the Lead on 29 Oct (items 1–10, with notes a–c):**
1. **Drops:**
   * the Add buttons and "Not in the list? Add one";
   * `POST /library/fields`, `/library/sections` and `/library/answer-lists` return 410;
   * origin person, `addReason` and "Added by a person";
   * manual placements (Q-A1), Q-A4 and the coverage-gap share;
   * the guard rows P-149.1 reason, Q-A1 and Q-A4.
2. **Stays:**
   * one door: every item is a ProposalItem with a source (AI from a form box; rules from a checklist or the forms);
   * the identity rule, versions, the meaning question and example cases.
3. **What people do:** they act through decide (confirm, rename, explain) and the existing merge (P-65). Nothing else writes a library item.
4. **Sections:** proposed once from the forms' parts (rules group them, AI names them; slice 2). There is no free add.
5. **"Add the fact this rule needs":** offered on a condition, check or PQR pick that reads a fact no form asks.
   * It makes a field item with origin rules. Its source is the rule (key and sentence), and it carries the subject and answer type.
   * The identity rule applies. Without a rule it is refused (400).
   * When the rule retires, Where used flags it.
   * The contract change is forms': `ProposalSource` gains a rule reference beside file and quote.
6. **Traceability:** every library row and side panel shows its sources: "From: IMM 5257 box …", "checklist IMM 5488 line …" or "Needed by rule …", via `GET /library/:kind/:key/sources`.
   * Each library page has one line saying where its items come from.
   * P-162: each Fields row and drawer shows the field's type, its format and its source. A field without a format says "Format: not read yet"; a field without a source is flagged.
7. **Completeness:** a pure engine function per combination, over three measures:
   * every box has a meaning and a source;
   * every required document has a type;
   * every rule fact has a source.

   It is served by `GET /combinations/:id/completeness`, with one view across all combinations, and feeds the P-157 and P-161 checklist.
8. **Guard tests (P-158):**
   * a free add → 410 (fail);
   * a rule fact without a rule → 400 (fail);
   * with a rule → a proposal sourced to that rule (pass);
   * a box with no meaning lowers completeness (pass and fail).
9. **Person roles (note a):** proposed from the guides (Who can be AI, or rules) and then decided. There is no free Add.
10. **Slice R (US$0):** unchanged.

**Notes:**
* **(b) Answer lists:** each comes from a source: the PDF box's choices, or an IRCC code list with its link. That is the only door, so `POST /library/answer-lists` → 410.
* **(c) Shared condition "Add from a sentence":** it stays, but the sentence must cite its source: a guide or checklist quote with its link, or the rule that needs it. Without one it is refused, the same as item 5. A condition is immigration logic, so it still needs the expert's duty (`sme`) at release.

**Order:**
* Built now on main's tables, without the queue:
  * items 1 (routes and buttons), 6 (sources, P-162 row and drawer) and 7 (completeness), with their item 8 tests.
* Built in slice 1, once forms' contract v2 (including the rule reference) is on main:
  * item 5 and the one-door parts.
* Built in slices 2–3:
  * notes b and c, and item 9.

**Folded in (Lead, 29 Oct):**
* **P-162, in S6:** each row and drawer on the Fields page shows the field's type, its format and its source (P-158 traceability, delta item 6).
  * Format is read from the field's form box mappings when a producer has filled it, else "Format: not read yet".
  * The format extraction (PDF box and form instructions, AI with quotes) and the fixed checks in code come later, from the forms and runtime lanes. S6 shows them, and adds no format field of its own until that contract exists.
  * Tests:
    * `P-162 pass: a field row shows type, format and source`
    * `P-162 fail: a field with no source is flagged, never shown blank`
* **P-161:** the setup checklist ("Before forms" block on the Forms tab; the people card moves there) is built after S6, once forms' official-pages record is on main (concept `screens/W1-setup-checklist/concept-draft.md`). S6's completeness function (delta item 7) is what it reads.
