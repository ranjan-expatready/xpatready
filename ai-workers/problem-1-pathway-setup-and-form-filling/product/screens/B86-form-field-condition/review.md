# B86 — a form field can hold a question's condition: independent review (CHECK)

Reviewer agent, 5 Nov. Branch `claude/b86-conditions-box`, commit **8af1b3891**, PR #1053. Final re-review by code, no copy started (tech lead: the breaker has the one copy). US$0, live AI off, nothing priced clicked. Replaces the review of d46ae4e5f, which walked the running app and blocked on two things. That walk stands for what has not changed.

## Verdict: **Ship**. Journey score **8.5 / 10** (pass, no 0), carried from the walk on d46ae4e5f
Both blocks are fixed. No Blocker or Major is open. The score is not re-earned: the five later fixes and `C4.11-26` were read, not walked, so I did not raise it. `journey-test-reviewer-2026-11-05.md` still names d46ae4e5f (nothing else written, as asked). **CI on this head had not finished when this was written (see Could not check). Approve does not stand in for green CI.**

## The two earlier blocks
| Block on d46ae4e5f | Result | Evidence |
|---|---|---|
| B1: the setup helper was a suite, CI red | **Fixed in the code; CI's result pending** | Now `tests/lib/forms-b86-setup.ts`. The runner globs `tests/check_*.ts` and `tests/check_*.cjs` (`product/tools/run-suites.sh:136`), so neither the name nor the folder is picked up. One caller, changed: `tests/check_forms_b86_panel_browser.cjs` |
| M1: `C4.11-26` on no line | **Fixed, by the real step** | `acceptance/C4.11.test.ts:160-198`. The tech lead's later ruling replaced the WAIT line once B82 reached main |

## Question 1: is `C4.11-26` honest? Yes
**Against qa's wording on #1053, line by line:**
* **Must prove: with the deciding answer No, the form field is not written whatever is stored (Yes, a typed name, then No).** Line 197 does exactly that order on a real case of a real release, and needs `release.status < 300`.
* **Through the routes; writes nothing directly.** Every write goes through a route: `T.people`, `T.documentsBySteps`, `T.sourceGate`, submit, sign-off, approve, `/runtime/cases`, answers, generate. `acceptance/lib/pack2.ts` and `tests/fixtures/source-every-number.cjs` hold no `insert`, `update` or `delete`, and `pack2.ts` is unchanged from main. The two SQL calls in `written` (lines 189-190) are `select`s. A read is not a write.
* **Change nothing else.** Against main the only removed line in the pack is the import, which gains names. Lines 1-23 and G5 are as they were; 24 and 25 still read the draft's problems.
* **Stay on Visitor visa.** Yes. qa still rules on the step at gate A (tech lead, #1053).

**Can it pass when the name is really written? No, by the code path.** `engine/runtime/forms.ts:47-49` strips the value and marks the box "not needed"; `engine/form-values.ts:41` turns that into "not written" with the reason. Three things then have to be true at once:
* `no.box.result === "not written"`. A written box reads "written".
* `no.name === undefined` in the frozen facts. `factsOf(boxes)` reads every box of that form, so a second box writing the name also fails this, even though `boxes.find` reads only the first.
* The reason matches `/^Not needed/`. This is the sharp one: with BR-5 removed, the older QA-165 line (`forms.ts:57`) would still keep the name off the form, but its reason reads "answered No, but … is recorded". So the step tells this row's rule from the older guard.

**The control earns its place** (line 198). Saying Yes again, without retyping, writes the name. That proves the name was still stored during the No ("whatever is stored"), that the record's shape is being read correctly (so `undefined` is not a wrong key), and that the step can fail. Every failure on the path also fails the line: an unchecked people, sign-off or generate call surfaces through `release.status` or `GENERATED`, and a missing copy id gives an empty record, so `no.box?.result` fails.

**Does narrowing the people to the principal affect what it claims? No.** `vv.single` is the one-applicant combination, `T.people` is the route, and line 162 runs after 1-25, so it does not touch them. The claim is the principal's own form field, and the rule reads that subject's answer. It claims nothing for a spouse or child on the same release, and the pure fill test is the only evidence for other people. That is a limit of the claim, not a false claim.

**Limits, stated and not blocking:** it generates one form (`toConfirm[0].form`), and the saved map at `prototype/p2/config/c1-draft-1-live-fieldmaps.json` holds one box for this fact, so I read this as complete, on an older config. It reads the copy's record, not the PDF's bytes; the writer takes its values from the same stripped boxes (`api/src/fill-case.ts:222,274`), so the record cannot say less than the file. A comment is out of date (m8).

## Question 2: the breaker's re-check fixes in e87a3d6fc
| Fix | Reading | Test that fails without it |
|---|---|---|
| Words when Review's request fails (n1) | Spinner, then a warning with Try again; "Nothing has changed". `web/src/pages/review.tsx:98`. Closes my m4 | Browser "break n1" aborts the request and recovers |
| HIDE on Review (n4) | Read-only listing. `conditionOf` returns no condition, so `can_confirm` is false and a propose is refused 409. No way to make a HIDE pass; the words say what to do. `api/src/form-field-condition.ts:136-137` | Door "break n4" |
| `Row\d+` in the words (n7) | Display only. `names` only feeds a warning, never a decision. `engine/form-field-condition.ts:63` | Fill "break n7" |
| Undo's page words (n7, my m3 first half) | True for an Undo. `web/src/pages/review-items.tsx:87` | **None** (m9) |
| A closed change reads Withdrawn | `review-items.tsx:70` | **None** (m9) |

**The Withdrawn chip on every change kind: harmless, and a correction.** Before it, every withdrawn change of any kind read "Released", which was false. The contract's five statuses (`contracts/screen02.ts:9`) are now all worded. Only the chip's words and tone path change: no button, no route. The browser checks containing "Released" that I read (`check_screen01`, `check_screens_qa_1029`, `check_studio`, `check_g2_answer_key_gate`, `check_s5_slice1`) mean a release, not this chip; `check_c45_supplies_browser` reads the withdrawal's toast. So it should change no other page's check; CI's shards are the confirmation.

## Question 3: anything new?
* **Guard weakened (P-303)? No.** No row commit since d46ae4e5f touches `engine/validate.ts`; what moved it is main's. Row-only diff against main (53515caef): `boxCond`, the moved `bareCond`, the change summary. No existing suite edited: the only tests in that diff are `check_forms_b86_*`, the new helper and the pack.
* **A person stuck? No new way.** HIDE now shows its way out. The other-combinations dead end is B88.
* **A wrong value? None found.** `check_forms_b86_fill` re-run here: **35/35**. BR-5's lines were not changed by any row commit since the rule-removal runs in the last review.
* **List moved? Not by the code.** `prototype/p2/question-lists/` is not in the row's diff. `render.ts` changes one type only. Door's exact comparison last ran on e87a3d6fc before main was merged, so **on this head it rests on the CI shard**.
* **Merges:** `b15d17942` has an empty remerge diff (clean). `13e89cd34` was approved earlier and not re-read.

## D1–D20 (1–5; unchanged scores come from the walk on d46ae4e5f)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | BR-5 now on a real case; Done when 1 by screens and D19 wait for B83 by ruling |
| D2 Data integrity | 5 | One row per change; server copies the rule; additive column |
| D3 Reuse | 4 | Two `isWorkedOutYesNo` remain (m5) |
| D4 Rule integrity | 5 | Rule untouched; the step tells BR-5 from QA-165 |
| D5 Stability | 4 | Row stale after a 409 until reload (m2) |
| D6 Governance | 5 | Audit lines; roles by route |
| D7 AI trust | 4 | Form field's own words beside the decision; Sample, Unconfirmed: expert |
| D8 Orientation | 4 | Panel does not name its question on Review (m1) |
| D9 Flow | 4 | Panel after the whole list (m1) |
| D10 Language | 4 | Undo's sentence fixed; "Holds a different condition" still wrong in one case (m3) |
| D11 Feedback | 5 | Review's request now has loading and error words |
| D12 Visual | 4 | "Show all" reads as part of the panel above it (m1) |
| D13 Accessibility | 5 | Browser check 39/39 reported; axe at 1440 and 400 px; last walked on d46ae4e5f |
| D14 Team look | 5 | Team components |
| D15 Speed | 5 | Sample budgets on the last walk |
| D16 Testability | 4 | Real step with a control; two words fixes and BR-14's line have no test (m6, m9) |
| D17 First use | simulated only | Not an intended user's walk |
| D18 Provenance | 4 | A closed change's note can still mislead (m7) |
| D19 Closure | out of scope | The person's walk waits for B83 (ruling) |
| D20 Pain solved | simulated only | Not walked by an intended user |

## Issues (no Must; all Should = Minor)
Still open, not blocking, unchanged since the last review unless said:
* **m1:** on Review the panel does not name its question and sits above "Show all" (`web/src/pages/review.tsx:98-99`).
* **m2:** after a 409 the second tab's row keeps its button until reload.
* **m3, second half:** a box confirmed from a waiting card reads "Holds a different condition" (`web/src/components/form-field-conditions.tsx:19`).
* **m5:** contract first, and the two `isWorkedOutYesNo`.
* **m6:** BR-14's fix in `api/src/question-condition.ts` has no failing test.
* **m7:** a replaced change, then a withdrawn Undo: the rule stays and its change reads Withdrawn, never RELEASED (`api/src/form-field-condition.ts:188`). The chip is now at least not "Released". BR-8 still names it to the expert.

New:
* **m8:** `acceptance/C4.11.test.ts:140` still says "until B82 is on main". B82 is on main. qa's reason no longer holds as written; 24 and 25 may stay as they are.
* **m9:** the Withdrawn chip and Undo's sentence (`review-items.tsx:70,87`) have no test line. Words only, so not blocking.

**Closed since last review:** m4 (Review's request), the first half of m3 (Undo's sentence).

## Concept, standards, graph
Concept fit as in the last review, plus §6's pack step now real. Graph `--check`: G1 0, G2 0, G3 13, G4 0, G5 0, G6 5, totals read only (the last review's one G3 reading on this row was false). `route-has-screen` re-run: 51 routes, 0 with neither a screen nor a reason. Scaffolding: the pack reaches the deciding question by route, allowed by qa's wording and concept §7; the walk by screens is out of scope by ruling. Retrofit mapping: still no line and no `build-notes.md`.

## Could not check
* **CI on this head:** at my last read `kind`, `types` and Devin passed; shards 1-6 were pending. This is the first full run of door, browser and the list comparison on merged code.
* **Builder's numbers not re-run (no copy):** C4.11 30/30 on 8af1b3891; door 45/45 and browser 39/39 on e87a3d6fc, before main was merged. Only fill 35/35 is mine. The honesty reading of `C4.11-26` is by code; I did not remove a rule and run it.
* Undo after a release; the Approver releasing on screens. No walk of the five fixes on the running app. A real screen reader; an intended user's walk (D17, D20).
* Out of scope by ruling: the person's walk by screens (B83), B88, B105.

**Verdict: Approve** (8af1b3891). No open Blocker or Major. The label still needs green CI on this head, the breaker's result, and B83 on main, as the PR says.
