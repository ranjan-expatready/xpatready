# G4 Answer-key families and runner (C5.7): build notes, part 2 slice 2 (the editors)

Branch `g4-part2-local` (local, not pushed), 2 Nov 2026, forms builder. Builds on slice 1 (the Tests tab: list, Run, Sign, lines). Concept §3–§5, challenge M5 (b), STANDARDS §3.2 "pick, don't type". Sample data only; no AI call; US$0.

## What a person can now do
* **The author writes or changes a made-up family** on the combination's Tests tab (Families → "Write a family" / "Edit"): key (new only), name, reference date, people (id, role from the library's person roles, made-up name, travelling or stays home), facts (about: a person, the application, or a relative a form describes; a library field; row; a value control by the field's type), and "none apply" groups (a library section). Each refusal shows on its own field; a 403 or 409 shows the server's sentence in the dialog.
* **The expert (or the author) writes the expected values** per item ("Write expected values" for a family with no key yet; "Change" on a key): the Expected editor lists every mapped box of the form in the form's order, per travelling person, with its caption, the fact it reads and whose; a choice box is a list of the form's own options shown "label (code)"; a text box is typed; empty = stays blank. Boxes a person fills (signature, oath) are not offered. There is no "fill from a run". A signed key's change asks for a one-line reason and returns it to Draft.
* **A rule-set key** (the eligibility rules) is written the same way: per travelling person an outcome and, optionally, each gate's state.

## Files changed
| File | Change |
|---|---|
| `prototype/studio/engine/answer-keys.ts` | `keyBoxes(snapshot, form, inventory)` (pure: the editor's boxes in form order, options, `by_a_person`), `formOptions` (the form's own choices: `pdfOptions` first, then a drop-down's label/code lists, a yes/no group's pairs, a tick box's on/off), `captionsOf` (the run's caption rule, now shared by the editor and the lines; unchanged behaviour) |
| `prototype/studio/api/src/answer-keys.ts` | `GET /api/combinations/:id/answer-keys/boxes?form=` (reader; 400 no form, 404 no PDF map, 422 no field list) and `GET /api/answer-keys/fields` (reader; the field picker) |
| `prototype/studio/contracts/answer-keys.ts` | view types `KeyBox`, `BoxesView`, `LibraryField`, `FieldsView` |
| `prototype/studio/web/src/components/answer-key-editors.tsx` (new) | `FamiliesSection`, `FamilyEditor`, `KeyEditor` (the Expected editor), `WriteKey` |
| `prototype/studio/web/src/components/answer-keys.tsx` | the Tests tab shows Families, "Write expected values" per item and "Change" per key |
| `prototype/studio/tests/check_g4_answer_keys.ts` | +10 lines (engine and API: boxes, options, signature, field picker) |
| `prototype/studio/tests/check_g4_tests_tab_browser.ts` | +19 lines: the editor journey, axe and 1024 px on four new states |
| `product/screens/G4-answer-keys/screenshots/05…08-*` | new states; 01…04 re-taken (the tab now shows Families) |

## Team names (concept §2b)
| Team (SA-1B-296 f.7) | Ours (unchanged in this slice) |
|---|---|
| `TestFamily { familyKey, persons[{role, …}], answers }` | `TestFamily { familyKey, label, referenceDate, people[{id, role, label, applies}], facts[{about, fact, row, value}], noneApply }`; the editor writes exactly this body |
| `AnswerKey { itemRef, itemVersion, familyKey, expected, state, signedByUserId, signedAt, changeReason }` | the same plus `combinationId`, `itemKind`, `version`; the editor writes `expected.people.<person>.<form field data path>` (map) or `{outcome, gates}` (rules) |
| (none: "Tests" tab, SA-1B-296 f.3) | the editor's boxes are read from the map and the form field list (`keyBoxes`), never from `AnswerKeyRun` |

## Checks run (2 Nov, this copy)
| Check | Result |
|---|---|
| `check_g4_answer_keys.ts` on a fresh `forms_g4s` (:4457) | 87/87, exit 0; run a second time on the same copy: 87/87, exit 0 |
| `check_g4_tests_tab_browser.ts` on a fresh `forms_g4t` (:4459) | 37/37, exit 0 (axe: no WCAG A/AA violation on 8 states; no sideways scroll at 1024 px) |
| `tsc -p api/tsconfig.json` filtered to the G4 files | no error (other errors there pre-exist) |
| `web: tsc --noEmit` | exit 0 |
| `count-any.mjs --against origin/main` | 426 (base 427): not risen |
| `product/tools/graph.mjs --check` | exit 0 |
| `vite build` | built |

Each rule has a pass and a fail line: §4 boxes (form order, options; a mapped signature is flagged; a form without a PDF map gives none; API 403/404/400), M5 (c) a save of the signature box is 400 on that box, BR-1 field picker (pass; 403), BR-1 in the UI (bad save → errors on Key, Name, Reference date and made-up name; good save stored as typed; the approver's save → the server's 403 reason in the dialog), BR-2/BR-4 in the UI (three boxes saved as the form writes them; Run → Failed (3 of 6), the left-out date-of-birth boxes first as "written, not expected", the three written boxes pass), BR-7 in the UI (a signed key's change without a reason → refused on the reason field; with one → Draft, "Back to Draft: …", Not run).

## Deviations, with reasons
1. **Box order: the form's order, not the map's stored order.** The task said "in map order"; the snapshot stores map entries sorted by data path (alphabetical), which is not the form's order. Concept §4 and challenge M5 (b) say "in the form's own order", so `keyBoxes` orders by the form field list (inventory order); a box the list lacks would follow in map order (none on IMM 5257).
2. **New `GET /api/answer-keys/fields`.** `GET /api/library/fields` exists but names no answer list, so the picker could not offer a choice field's values; `GET /library/answer-lists` has the values but not which field uses which list. The new read joins the two (non-retired fields, effective lists). Roles reuse `GET /library/roles`; "none apply" groups reuse `GET /library/sections`.
3. **Addresses and phones are a small JSON box** with a hint (the task allowed it). A field whose type is `address`, or whose current value is an object (a phone), is edited as JSON; a parse error is said on the field before any request.
4. **Empty = left out of the key.** An empty box is not sent; the runner treats a box missing from the key as "must stay blank" (a written value fails "written, not expected"), which is the same check as `""`, with a smaller key.
5. **Saves do not toast their refusal.** The editors use a local save hook (toast on success only) so a 400 is not repeated in a toast over the dialog's footer; the refusal shows on its fields and above the form.
6. **Who may write is not pre-greyed.** The family buttons stay enabled for every studio person; the server refuses (author for families; author or expert for keys) and the dialog shows its sentence (the task's "show the server's message on 403"). Sign stays greyed for the author as in slice 1.
7. **A tick box's options are labelled "Ticked", "Not ticked", "Neither"** (the field list gives only its on/off/neither codes, e.g. "1", "0", "2"); the code shows beside the label.

## Not built
* A 409 "load their version" button: the 409 is said in words; closing and reopening loads the latest.
* A search or filter over the 161 boxes (the editor scrolls); a per-box "why blank" hint.
* Families listed per combination use: families are per workspace (concept Q2) and list on every combination's Tests tab.
* Scoring keys (no scoring tables yet, concept Q1); auto-run at submit (G2).
* The immigration values in the family and keys stay Sample; the 16 amended IMM 5257 boxes remain expert questions (concept §6c).
