# P-34 — How reusable components are created, and how duplicates are prevented

Adopted 21 Oct 2026 from the founder's suggestion (R-42), with two Lead additions. One home for this topic; `domain/RULES-MODEL.md` §1 points here.

## Reusable components (library masters) in scope
| Component | Example | Made from |
|---|---|---|
| Field (+ answer list) | Date of birth; Marital status (list) | Form boxes, checklist and guide text |
| Field group | Full name, Address, Period (from–to) | Repeated box patterns |
| Section | Personal details; Family; Employment history | Form parts and question order |
| Document type | Passport; Marriage certificate | Checklists |
| Condition (shared sentence) | "Is married or common-law" | Form instructions, checklists |
| Check | Passport valid through the stay | Form limits, guides |
| Form box map | IMM 5257 box → field, transform | The form itself |

## Capability: who creates them
1. **AI, from uploaded sources (main path).** For each item AI proposes *reuse* / *new* / *ambiguous* / *conflict*, with the source passage. A person accepts (bulk for clean reuse), edits or rejects. AI never writes to the library; accepted proposals go through the one service path.
2. **A person, by describing it to AI (founder's design).** No form with technical fields. The person writes in plain words — "the relative's relationship to the applicant" — and AI drafts the whole item (label, type, answer list, help text, who it is about, section placement) and shows likely equivalents already in the library. The person chooses **Use existing** or **Add new, with a reason**. A different person approves; release publishes it.
3. **Removal** follows P-52 (delete an unused draft, otherwise retire; blocked while in use). **AI's role on manual additions** is advice with a verdict, never a block (P-53); both are in `decisions/P-52-library-lifecycle.md`.
4. **Edits.** Wording, help text and translations: direct edit, versioned. Meaning changes (type, answer list, subject, split, merge, retire): impact list of every section, rule, form box and combination using it → accept → release; open cases keep their release.

## Duplicate guard — two layers (Lead addition 1)
* **Layer 1, no AI (always on):** the system writes the key from a naming pattern (`subject.group.attribute`, e.g. `person.relative.relationship`) — people never type keys, and keys stay off the main path. Unique key; label unique within subject and group after normalising (case, spaces, punctuation); same type + same answer list + same form box is flagged as a probable duplicate.
* **Layer 2, AI meaning match:** compares label, help, type, answer list, form boxes and rules against the whole library. The same check runs on AI's own proposals against items people added.
* AI suggests merges of near-duplicates already in the library; a person accepts; every reference is rewritten.

## Without AI (Lead addition 2)
If AI is unavailable, a short structured form (label, type, answer list, who it is about) still works: Layer 1 runs, the item is marked "not meaning-checked", and approval is still required. Production cannot depend on AI to add a field.

## In the prototype (P-26 scope)
Built: AI proposals with reuse/new/ambiguous (Screen 02); **"Describe what you need"** for Field, Section and Document type on Screen 04 (P-53), with Delete, Retire and Restore (P-52) with equivalents shown, Use existing / Add new with reason, approval by a different person (Acting as). Layer 1 in the service. Not built (team): the no-AI fallback form, merge execution, translations, meaning-change impact for library items beyond forms.
