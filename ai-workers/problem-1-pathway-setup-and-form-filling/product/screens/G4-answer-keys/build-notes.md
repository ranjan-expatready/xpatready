# G4 Answer-key families and runner (C5.7): build notes, part 2 slice 2 (the editors)

Branch `g4-part2-local` (local, not pushed), 2 Nov 2026, forms builder; fixes after the break and the review of 860bf1a9 at the end. Builds on slice 1 (the Tests tab: list, Run, Sign, lines). Concept §3–§5, challenge M5 (b), STANDARDS §3.2 "pick, don't type". Sample data only; no AI call; US$0.

## What a person can now do
* **The author writes or changes a made-up family** on the combination's Tests tab (Families → "Write a family" / "Edit"): key (new only), name, reference date, people (id, role from the library's person roles, made-up name, travelling or stays home), facts (about: a person, the application, or a relative a form describes; a library field; row; a value control by the field's type), and "none apply" groups (a library section). Each refusal shows on its own field; a 409 says who saved and offers "Load their version"; a 403 (a race) shows the server's sentence.
* **The expert (or the author) writes the expected values** per item ("Write expected values" for a family with no key yet; "Change" on a key): the Expected editor lists every mapped box of the form in the form's order, per person of the family (one who stays home is marked "not travelling": a form can apply to them), with its caption, the fact it reads and whose; a choice box is a list of the form's own options shown "label (code)"; a text box is typed; empty = stays blank. Boxes a person fills (signature, oath) are not offered. There is no "fill from a run". A signed key's change asks for a one-line reason and returns it to Draft.
* **A rule-set key** (the eligibility rules) is written the same way: per travelling person an outcome and, optionally, each gate's state.

## Files changed
| File | Change |
|---|---|
| `prototype/studio/engine/answer-keys.ts` | `keyBoxes(snapshot, form, inventory)` (pure: the editor's boxes in form order, options, `by_a_person`), `formOptions` (the form's own choices: `pdfOptions` first, then a drop-down's label/code lists, a yes/no group's pairs, a tick box's on/off), `captionsOf` (the run's caption rule, now shared by the editor and the lines; unchanged behaviour) |
| `prototype/studio/api/src/answer-keys.ts` | `GET /api/combinations/:id/answer-keys/boxes?form=` (reader; 400 no form, 404 no PDF map, 422 no field list) and `GET /api/answer-keys/fields` (reader; the field picker) |
| `prototype/studio/contracts/answer-keys.ts` | view types `KeyBox`, `BoxesView`, `LibraryField`, `FieldsView` |
| `prototype/studio/web/src/components/answer-key-editors.tsx` (new) | `FamiliesSection`, `FamilyEditor`, `KeyEditor` (the Expected editor), `WriteKey` |
| `prototype/studio/web/src/components/answer-keys.tsx` | the Tests tab shows Families, "Write expected values" per item and "Change" per key |
| `prototype/studio/tests/check_g4_answer_keys.ts` | +11 lines (engine and API: boxes, options, signature, field picker; break m6) |
| `prototype/studio/tests/check_g4_tests_tab_browser.ts` | +28 lines: the editor journey, read-only by duty, the break's three Majors; axe and 1024 px on five new states |
| `product/screens/G4-answer-keys/screenshots/05…10-*` | new states; 01…04 re-taken (the tab now shows Families) |

## Team names (concept §2b)
| Team (SA-1B-296 f.7) | Ours (unchanged in this slice) |
|---|---|
| `TestFamily { familyKey, persons[{role, …}], answers }` | `TestFamily { familyKey, label, referenceDate, people[{id, role, label, applies}], facts[{about, fact, row, value}], noneApply }`; the editor writes exactly this body |
| `AnswerKey { itemRef, itemVersion, familyKey, expected, state, signedByUserId, signedAt, changeReason }` | the same plus `combinationId`, `itemKind`, `version`; the editor writes `expected.people.<person>.<form field data path>` (map) or `{outcome, gates}` (rules) |
| (none: "Tests" tab, SA-1B-296 f.3) | the editor's boxes are read from the map and the form field list (`keyBoxes`), never from `AnswerKeyRun` |

## Checks run (2 Nov, this copy)
| Check | Result |
|---|---|
| `check_g4_answer_keys.ts` on a fresh `forms_g4s` (:4457) | 88/88, exit 0 (860bf1a9: 87/87, also rerun on the same copy) |
| After the Devin review on #525 (worktree `g4-part2-merge`), fresh copies | `check_g4_answer_keys.ts` (:4456) 88/88, exit 0; `check_g4_tests_tab_browser.ts` (:4458) 50/50, exit 0. Before the fixes the four new lines failed (Devin #1–#3 FAIL, #4 timed out on the refused save). Web tsc exit 0; `any` 426 (base 426); graph exit 0 |
| `check_g4_tests_tab_browser.ts` on a fresh `forms_g4t` (:4459) | 46/46, exit 0 (axe: no WCAG A/AA violation on 9 states; no sideways scroll at 1024 px). Before the fixes the new lines failed: P2-M3 FAIL (201 elements past the dialog), P2-M2 timed out on the second 409 |
| `tsc -p api/tsconfig.json` filtered to the G4 files | no error (other errors there pre-exist) |
| `web: tsc --noEmit` | exit 0 |
| `count-any.mjs --against origin/main` | 426 (base 427): not risen |
| `product/tools/graph.mjs --check` | exit 0 |
| `vite build` | built |

Each rule has a pass and a fail line: §4 boxes (form order, options; a mapped signature is flagged; a form without a PDF map gives none; API 403/404/400), M5 (c) a save of the signature box is 400 on that box, BR-1 field picker (pass; 403), BR-1 in the UI (bad save → errors on Key, Name, Reference date and made-up name; good save stored as typed); read-only by duty (approver: every action greyed with its reason; expert: the family actions greyed), BR-2/BR-4 in the UI (three boxes saved as the form writes them; Run → Failed (3 of 6), the left-out date-of-birth boxes first as "written, not expected", the three written boxes pass), BR-7 in the UI (a signed key's change without a reason → refused on the reason field; with one → Draft, "Back to Draft: …", Not run).

## Deviations, with reasons
1. **Box order: the form's order, not the map's stored order.** The task said "in map order"; the snapshot stores map entries sorted by data path (alphabetical), which is not the form's order. Concept §4 and challenge M5 (b) say "in the form's own order", so `keyBoxes` orders by the form field list (inventory order); a box the list lacks would follow in map order (none on IMM 5257).
2. **New `GET /api/answer-keys/fields`.** `GET /api/library/fields` exists but names no answer list, so the picker could not offer a choice field's values; `GET /library/answer-lists` has the values but not which field uses which list. The new read joins the two (non-retired fields, effective lists). Roles reuse `GET /library/roles`; "none apply" groups reuse `GET /library/sections`.
3. **Addresses and phones are a small JSON box** with a hint (the task allowed it). A field whose type is `address`, or whose current value is an object (a phone), is edited as JSON; a parse error is said on the field before any request.
4. **Empty = left out of the key.** An empty box is not sent; the runner treats a box missing from the key as "must stay blank" (a written value fails "written, not expected"), which is the same check as `""`, with a smaller key.
5. **Saves do not toast their refusal.** The editors use a local save hook (toast on success only) so a 400 is not repeated in a toast over the dialog's footer; the refusal shows on its fields and above the form.
6. **A tick box's options are labelled "Ticked", "Not ticked", "Neither"** (the field list gives only its on/off/neither codes, e.g. "1", "0", "2"); the code shows beside the label.

## Fixes after the break and the review of 860bf1a9 (break-report.md "Part 2 break", review.md "Part 2 review")
| Finding | Fix | Line in the browser check (fail before, pass now) |
|---|---|---|
| P2-M1 key signed while being changed: Save did nothing visible | a 400 on `reason` shows the reason field with the server's words; on any 400/409 the key is read again and a Signed key asks for the reason | "signed meanwhile, Save shows the reason field…"; "with the reason the change saves…" |
| P2-M2 / review Major 2: a 409 could not be recovered | both editors read the latest saved version when they open (`refetchOnMount: "always"`, opened only once fetched) and pin the version they opened; a 409 invalidates the lists and offers "Load their version" | "after a 409 on a family / on a key, Cancel and reopen shows their version and the next save goes through" |
| P2-M3 Facts table wider than the dialog | fieldsets and grid tracks may shrink (`min-w-0`, `minmax(0, …)`) | "with E1's 48 facts nothing … reaches past the dialog at 1440 or 1024 px, every Remove reachable" (screenshot 10) |
| Review Major 1: no read-only state | `Gated` buttons (aria-disabled, focusable, reason as title and description): Write a family and Edit for the author; Write expected values, Change and Run for the author or the expert; Sign for the expert; the approver sees "Read-only for you" | approver: six controls greyed with reasons and open nothing (screenshot 06); expert: family Write and Edit greyed |
| m1 control changed while typing | a fact's control is chosen from its field (and a stored object), never from the typed text | — |
| m2 values of a dropped person removed silently | the Expected editor warns before saving that they will be removed | — |
| m4 long family name scrolled the page | the name wraps | — |
| m6 same values unsigned a signed key | the API keeps the signature when the values are unchanged | API: "a signed key changed to the same values keeps its signature" |
| m7 reload lost an open editor | `beforeunload` asks while an editor has unsaved changes | — |
| Review minors 3, 4, 5, 7 | rule-set lines in words; rule-set editor copy; the toast counts wrong values like the pill; the field picker shows labels (key below and on hover) | — |

## Fixes after the Devin review on #525 (head 1fcfbd48)
| Finding | Fix | Line in the browser check (fail before, pass now) |
|---|---|---|
| 1 the Expected editor offered only travelling people, though a field map can apply to one who stays home | a field map offers every person of the family (one who stays home marked "not travelling"); a person left empty is not sent; rule sets stay travellers only (C6.9 BR-7). Values of a person the server would refuse (no longer in the family; not travelling, for rules) are said before saving and removed by it, as the server refuses them | "a field map's editor offers the husband who stays home…" |
| 2 a key for an older edition could not be moved | the editor says "Written for X; the map is now Y: saving moves it to Y" and sends the map's edition (a signed key still needs a reason) | "a key for another edition is shown as such; saving … moves it … and it runs" |
| 3 a new phone fact was a one-line text box | `GET /answer-keys/fields` marks `parts` (composite, address, phone, or read part by part by a form's `phone…` transform); such a fact, or any stored object, gets the JSON box | "a new phone fact is written as parts" |
| 4 Remove on a person left their facts, so Save was refused | Remove asks first, naming the count, then removes their facts (and `<id>/parent_1`, `/parent_2`, `/sibling` facts) and "none apply" groups | "Remove on the husband asks first, naming his facts…" |
| Review last minor: the 409 notice gave the way out twice | the notice keeps the server's sentence and says only what "Load their version" drops | — |

## Not built / follow-ups (with reasons)
* **m3 focus after Save, Cancel, Remove:** needs the shared `Dialog` (controls.tsx, all screens) to return focus to its opener; a shared-file change for its owner, not this slice.
* **Review minor 6 (stale reason after a family change names the key change):** needs the run state to know the family version; part 1's engine `runState` and the key row would both change (small row).
* **Review minor 8:** no browser line for the rule-set editor and run (API lines cover it); the UI "signature not offered" line cannot fail on IMM 5257 (the engine and API lines do, with a mapped signature); the zod messages are not reached from the screen. `libraryFields` now filters retired rows explicitly.
* **Review minor 9 / part 1 minor 2:** the 16 amended IMM 5257 boxes carry no mark in the editor; it needs the amendments stored with the key (expert question first).
* The browser's Back button (in-app history) while an editor is open is not guarded (only reload and closing the tab ask).
* Box search over the 161 boxes; scoring keys (concept Q1); auto-run at submit (G2).
* The immigration values in the family and keys stay Sample; the 16 amended IMM 5257 boxes remain expert questions (concept §6c).
