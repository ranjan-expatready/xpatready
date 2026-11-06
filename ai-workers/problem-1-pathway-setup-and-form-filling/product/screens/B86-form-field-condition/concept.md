# B86 — a form field can hold a question's condition in a form the rule can read (QA-237, C4.11)

Base: main e5f974a02. US$0, live AI off. No board: tech lead approves after the independent challenge (P-223 (4)).

## 1. Job
An author accepts a condition step 5 proposes ("Other family name" is asked only when "Has used other name" is Yes). Today a second person approves it and Submit then refuses "Hiding a value a form reads", with no way out but taking the condition off. **Job: the author says, seeing the form field's own words, that this form field is filled only under the same condition; a second person approves; the condition can be released, and the form really does leave that field empty when the answer is No.** Persona: author, approver. Requirement: SA-1B-7 rule 3 (was SA-1B-9), `RULES-MODEL.md` §5, P-322.

**The trap, on main:** `engine/validate.ts:174` reads a box's `condition`; `bareCond` (`:171`) returns null for text; the column is text (`prisma/schema.prisma:617`). So "a form or box that applies under the same condition is compatible" (`:167`) can never hold for a box.

**A second hole the brief did not name (challenger's probe: true):** `engine/render.ts:138-139` fills a box from any known value and never looks at whether its question is hidden. Only "recorded" Yes/No boxes have a guard (QA-165, `runtime/forms.ts:29-44`). So a client who answers Yes, types a name, then changes to No leaves that name for IMM 5257's "Family name" box, against the screen's own "kept and not used". **A confirmation alone would satisfy the rule on paper while the harm stays, so the fill must obey it too (BR-5).**

**A third, found measuring the six (§8):** a question's condition is library-wide. Approving one on Visitor visa puts new errors on up to 4 other combinations. See §7 Q3.

## 2. What is there and what is new
| Layer | Today | New |
|---|---|---|
| Data | `form_field_map.condition` text, AI's words, kept untouched | one nullable column `condition_rule Json` (additive; null = "not confirmed") |
| Snapshot | entry carries `condition` | adds `condition_rule` only when set, as `screen`, `option_map` do, so every existing fingerprint stays |
| Rule | `boxCond: e.condition` | `boxCond: e.condition_rule`. **The comparison and the message do not change** |
| Door | second-person library change (`question-condition.ts`) | same shape, new kind `form_field_condition`; `revise()` as `setOptionMap` does |
| Fill | `runtime/forms.ts formCoverage` (every writer goes through it) | a box whose rule is in force and not true is not written (BR-5). `render.ts` is left alone, so the preview, the question list and `fills` cannot move |
| Screen | condition card on To review; problems on Review and release | one panel "Form fields that read this answer" on both |

## 3. Business rules
* **BR-1 Same condition, never typed.** The rule stored is the question's own SHOW condition, copied by the server; no route takes a condition from the browser. From a card only while it waits, belongs to this combination, targets this question, and the library holds no condition or the same one; else from the library; else 409. HIDE or REQUIRE: 409.
* **BR-1b In force only while it matches (challenge M1).** A box's rule counts, for the rule and the fill, only while it equals its question's own SHOW condition. Otherwise the box behaves as today and the row says "Holds a different condition". So a rejected card, a removed condition, or an approval order cannot blank an answer.
* **BR-2 Words first.** A box with no words in `condition` cannot be confirmed (409, in words): nothing on the form says it is conditional. **No parsing:** words never become a rule by themselves; a person reads them. Why: the 9 checked say "AliasNameIndicator", "3a", "purpose = Other (03)", and 69 of 222 are not conditions at all (§8). **A worked-out Yes/No box cannot be confirmed either, words or not** (409): it must write No when the answer is No, and a rule would blank it.
* **BR-3 Second person.** The author proposes, a different person approves (existing guards); 401, 403, 404, 409 answer in words, and a refusal writes nothing. At approval it is checked again: the box still reads that question and its words are the same; else 409 "changed since".
* **BR-4 The rule stays as strict.** Not confirmed, a different condition, a second form or edition whose box is not confirmed, or HIDE: Submit refuses in today's words. Existing rule tests are not edited. **The rule file changes by one thing only: `boxCond`.**
* **BR-5 The form obeys.** In `formCoverage`, a box whose rule is in force and not true is not written, whatever is stored, under its own coverage word. Not on a mandatory list (`mandatory.ts`), not "waiting" on the portal sheet (`answer-sheet.ts`). Words: "Not needed: 'X' is No", or "Waiting for 'X'" when unanswered. A changed deciding answer makes a copy out of date (already so through its facts).
* **BR-5b The Yes/No box does not get stuck (challenge M3, probe: true).** Yes, a typed name, then No leaves the Yes/No box unwritten for ever: "correct one of them", yet a hidden question has no control and an answer cannot be cleared. Fix: a fact whose question is hidden by its SHOW condition does not count as "recorded" (`forms.ts:42`, `:66`). The form writes No and never the name. REQUIRE keeps QA-165 exactly. See §7 Q2.
* **BR-6 Ready is earned, not granted.** `form_still_reads` passes on its own once the box agrees (`qd-conditions.ts:248`). A new Saved draft also refreshes a **waiting** item's rating, both ways (it does not today: `draft-qd.ts` only counts them). One round stays Decide; unconfirmed stays Check; un-confirmed goes back to Check.
* **BR-7 Way back (challenge M5).** A confirmed box can be un-confirmed by the same door, second person, before any release too. A returned change can be withdrawn, and proposing again re-runs the checks. Only WAITING or RETURNED blocks a new proposal; an approved change a later one replaces is closed; a release marks it RELEASED.
* **BR-8 A change is visible at release.** A rule change is listed in the release's change summary (`diff`), or a box-only change would read "Nothing has changed".
* **BR-9 New edition.** An unchanged box carries its rule with its other settings (`impact.ts:232`); a reworded or new box does not. A replayed map (`sources.ts:911`) starts unconfirmed.
* **BR-10 Sample.** Every condition stays Sample, Unconfirmed: expert (AGENTS rule 4). Confirming says "these say the same", not "this is correct immigration law".

**The question list does not move:** it holds role, key and label only, and reads `render`'s coverage (`pqr-drafts.ts:77` → `sources.ts:94,100`), which is why BR-5 is not in `render.ts` (challenge M2). A test pins it. Print the sha in the PR (`vv.single-ae2133b8a398`); if it moves, stop.

## 4. Layout (no new page; pattern: a line on the existing card)
**On the condition's card, under its sentence, and on Review and release under a "Hiding a value a form reads" problem:**
```
Form fields that read this answer                                  ⓘ
IMM 5257 (09-2023) · Family name
  "Only when “Have you ever used any other name…” = Y; one name only on the form"
  Not confirmed            [ Says the same as this condition ]

  For every combination that files IMM 5257 · A second person approves · Sample, Unconfirmed: expert
```
States: Not confirmed · Waiting for a second person · Confirmed: same condition (with Undo) · Holds a different condition (with Undo) · No words on the form field (no button, says why by its kind, §7 Q3). Empty: "No form reads this answer." Every edition is listed. Full keyboard; the one button per row; axe clean at 1440 px. On Review and release, "Hiding a value" problems sort first (the list stops at 8).

**No field codes (PRODUCT §4):** the words are the AI's and carry codes. Only an identifier-shaped token (`natIDIndicator`) that exactly matches one data-path segment of that edition is shown as **that field's library question** (never its caption: `usCardIndicator`'s caption wrongly says "national identity"). Any other identifier reads "another form field"; plain words ("purpose", "Other", "3a") stay. The stored text never changes. When a resolved code names a different question from the condition's deciding one, the row says so in words (a warning, not a refusal).

## 4b. Best in class
`reports/verify-2026-11-03/V4-best-in-class.md` S4: competitors have show-if logic on a question and nothing tying it to the form (their forms print what they print). Ours stays ahead on that: the conflict is caught before release, with the form's own words beside the decision. Effort: 1 click per box, on the card where the person already is; §8 gives the real count. Not studied further: no competitor exposes this mapping, so nothing to copy.

## 5. Copy
Tooltip: "A form field that is filled only in some cases. If it says the same as this condition, the client is not asked and the form leaves it empty when the answer is No." · Refusal, no words: "This form field's map has no words about when it is filled, so nothing says it is conditional, and it cannot be confirmed. This combination stays held until the form can carry the condition, or the condition is removed." (Never "correct its map": no route writes those words.) · Line for the second person: "IMM 5257 · Family name is filled only when 'Has used other name' is Yes, for every combination that files IMM 5257. Its words: …". · The second person's line also says how many form fields elsewhere are still unconfirmed.

## 6. Contract and tests
`GET /combinations/:id/questions/:fact/form-fields?item=` → rows above, for the forms this combination files. `POST /library/form-field-conditions` `{ combinationId, fact, formEditionId, dataPath, item?, clear?, reason? }` → 201 + change id. Approval through the existing `/library/changes/:id/approve`. Pass and fail per BR in `tests/`; the brief's 9 Done when as `check_forms_b86_*`; C4.11 pack gains the step (qa's OK); the fill tests are written **first**: stale value (fails on main), Yes→No→Yes, unanswered, mandatory, portal sheet, list sha, `check_c72` green.

## 6b. Capability, not scaffolding
Every element is Capability, on the real path. **Not built:** bulk confirm; proposing a confirmation to other combinations; approving a condition and its box as one line; merge rewriting a box's rule (the rule then refuses until re-confirmed, safely); a door for words on a no-words box.

## 7. Questions for the tech lead (recommendation first)
1. **Order of rows (challenge B1).** A person cannot do this walk on main today: the deciding question needs B83 (#1036, draft, QA-234), and release on the six needs B82 (QA-233). **Recommend: build now on main, since nothing here uses their code, and have the pack reach the deciding question by the route as `pack2.ts` does. The person's walk and the label wait until both are on main.** Say if you would rather hold the build.
2. **Done when 5's "never written" (challenge M3).** Recommend: the name is never written and the Yes/No writes N when its details question is hidden. The other reading needs a way to clear an answer, which is a new capability.
3. **The spread (§8): the real product decision.** A condition is "for every combination that asks it" (`question-condition.ts:43`). Accepting one on Visitor visa adds to other combinations' drafts **Hiding** on every form that reads it, and **Unreachable** where the deciding question is not placed. B clears Hiding on boxes with words, one click and one approval each. It cannot clear Unreachable, nor the 9 worked-out Yes/No boxes (BR-2). **Recommend, within B86: the approver's line names how many other combinations and form fields this holds, and the refusal says so plainly. Then a new row for those Yes/No boxes and deciding questions on the other forms (the ask-as-own-question table holds only Visitor visa, `own-yes-no.ts:32`).** B86's own Done when stays on Visitor visa. The rule is not relaxed for any box (P-303). Not chosen: conditions per combination (bigger; `landsOn: "combination"` is what the item already says, so ask if you want it).
4. **B or C: **your ruling is "C: not now" (#1037 comment 6647414938), and §8 is new evidence, so I name it once for the founder. **Still recommend B.** C (REQUIRE, not SHOW) needs no migration, card or clicks, and has no Hiding error on any form; Unreachable stays. But every client sees "Other family name" whatever they answered, against the form's "If you answered yes"; a stale name still needs BR-5's fix, whose rule would have no box to read; C4.11's "asked only when" stops hiding anything. Cost of B to set against that: 36 boxes across the six (7 on Visitor visa), each with a second person, plus the new row.
5. **Answer values for the 23 `code` fields: next row, not this one.** They add 2 agreed and 2 one-round conditions that then use B's door; they need cited values from the forms (AGENTS rule 4) and touch other screens.
6. **Reading of the team's rule, for the founder, not blocking (P-223 (4)).** SA-1B-7 rule 3 says publish blocks a placement that "hides a field a form box or rule reads", and team requirements outrank our audit's exception (AGENTS rule 2). I read them as consistent: a box under the same condition does not read the field while it is hidden, and BR-5 makes that true. Read literally, B falls and conditions become REQUIRE.

## 8. Measured on fresh sixes (main e5f974a02, US$0, people's steps; the last column simulated on each draft snapshot, not walked)
**Which words are conditions at all,** on the forms `vv.single` files, mapped boxes with words: **222**. Rough pattern: 153 read as a condition, 33 limits or notes, 36 other notes. The runner's 263 counted every outcome on its head; not reconciled further. Only boxes a condition reaches ever need a rule; the rest stay words.
**The 7 questions with landed conditions, by combination** (`lm.high_wage` asks none; Visitor visa's steps first). **45 boxes: 36 plain with words (7 on Visitor visa), 9 worked-out Yes/No (7 with no words).** The same steps in alphabetical order gave a library without `other_given_names` and the expiry date under those keys: seen, cause not traced; QA-236 is the same kind.
| Combination | Boxes reading them | Worked-out Yes/No, no words | Errors a condition adds |
|---|---|---|---|
| Visitor visa | 1 each, IMM 5257 (7) | 0 | Hiding only; deciding question placed by own-question |
| PNP Express Entry | IMM 0008 ×3 + DEP | 2 | Hiding on both forms; Unreachable on 1 of 4 |
| Study outside | IMM 1294 | 2 | Hiding; Unreachable on 3 of 5 |
| Work LMIA inside | IMM 5710 | 2 | Hiding; Unreachable on 5 of 7 |
| Family spouse | IMM 1344 ×2–4 | 1, plus 1 worked out with words | Hiding; Unreachable on 2 of 2 |

## 9. Response to the challenge (`challenge.md`)
B1: §7 Q1. M1: BR-1, BR-1b, smaller rule change. M2: BR-5 moved. M3: BR-5b, §7 Q2. M4: measured, §7 Q3, words changed. M5: BR-7. m1: §4. m2: BR-1. m3: BR-6. m4: BR-10 dropped. m5: §4. m6: Q6 goes to the founder; the source of "C: not now" is #1037's comment 6647414938, which the challenger had not seen. **All accepted.**

## Definition of ready
Acceptance: the brief's Done when 1–9, plus the fill test; `C4.11.test.ts` step agreed with qa. Row: B86. Decisions: §7. Migration: read by the tech lead, the only one open (checked 5 Nov); breaker required.
