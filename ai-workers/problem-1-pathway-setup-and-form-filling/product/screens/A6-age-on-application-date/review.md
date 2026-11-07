# A6 (B102): age in whole years on the application date: independent review

* **Reviewed:** commit `78a874439` on `claude/gracious-bardeen-j1ieoh` (PR #1222), the diff `git diff origin/main...78a874439` (merge base `ecbd68301`; 11 app files, the concept, the challenge, 18 screenshots). `api/src/runtime.ts` is not touched (H6 held).
* **Reviewer:** a fresh context that did not build the row, 7 Nov 2026 (about 14:00 IST). Skills: screen-review and journey-test (reviewer role). Isolated copies on :4471 and :4472 only. Live AI off, US$0, no priced button pressed. Paths are under `prototype/studio/` unless they say otherwise.

## Verdict
**Block** (in the skill's terms: Ship after fixes). The row does its job. The minor's lines come in on the checkpoint, the age shows on each person, and both journeys work by screens. I re-ran every number the builder gave, and each one holds. Two Majors are open. (1) The new route turns any missing fact into an age, even one a rule compares with text or yes/no. That rule can then never be true, the release check does not notice, and this row has no undo. (2) The PR adds two new type errors, so CI's "types" job will be red. Both are small fixes.

## What was run (all on my own copies)
| Check | Result |
|---|---|
| `acceptance/C6.4.test.ts 4471 xr_studio_rv_a6`, fresh copy, Demo › Load the configured checkpoint | **30/30**, exit 0 (C6.4-8 to -9b and -19 green) |
| `acceptance/C6.4-screen.test.ts` on the same copy | **17/17** (C6.4-38: axe at 1440/1024/400, no sideways scroll, with the new age line in each heading) |
| `tests/check_b102_worked_out.ts 4472 xr_studio_rv_b102`, fresh copy | **29/29** |
| `tests/check_vv_checklist.ts` | **73/73** |
| `tests/walk_b102_age.ts` (J-A6) and `tests/walk_b102_author.ts` (J-A6a) at 1440 and 1024 | **9/9** and **5/5** at each width |
| My own journeys (`journey-test-reviewer-2026-11-07.md`) | 17 checks. Found: the Major M1 below, a lost focus, and the answered-but-flagged birth date |
| `node product/tools/typecheck.mjs` | **FAIL: 2 new type errors**, `tests/walk_b102_author.ts(34)` TS2351 and `(35)` TS7006 (web 0) |
| `node product/tools/graph.mjs` | G1 0 · G2 0 · G3 12 · G4 0 · G5 0 · G6 7. Nothing names this row's pages or routes: both routes have a caller in `web/src` and a test |

## Findings
### Blocker
None.

### Major
**M1 (Must). A fact that a rule compares with text or yes/no is accepted as a worked-out age, so that rule can never be true. The release does not catch it, and nothing in this row can undo it.**
* **Evidence.** On the checkpoint I added a draft rule `{"field":"person.rv_travels_mode","op":"eq","value":"alone"}`. Then `POST /combinations/:vv/rule-facts/person.rv_travels_mode/worked-out` with the defaults returned **201** ("Age in whole years from Date Of Birth, on Application date.").
* The draft's problems list (`GET /combinations/:id/review`) flags that rule only for its scaffold shape. It never says "compares a number with 'alone'": `engine/validate.ts:47` skips the type check for derived keys.
* `api/src/worked-out.ts:77-78` checks only that some rule reads the fact. The UI offers "Work it out instead" with every choice pre-filled on every row (`web/src/components/rule-facts.tsx:55`, `:85`), so one click commits it.
* The value is workspace-wide (`derived_field`, reaches every snapshot) and cannot be removed ("Not built").
* **Breaks:** STANDARDS §3.6 [M] (no rule that can never be true), §3.4 [M] (service rules check every link), EXPERIENCE §2.8 [M] (prevent errors), and BR-2's intent (a calculation that fits).
* **Fix:** in `WorkedOut.add`, after line 78, refuse (400) unless every condition node in `missing.rules[*].tree` that reads `fact` compares it as a number. That means `lt/le/gt/ge`, or `eq/ne/in` with numbers. Word it like: "Rule … compares person.x with "alone": an age is a number, so add the fact instead." Pass the comparison kind with each row (or have the GET answer it) and show the button only where it fits. Add one pass test and one fail test in `tests/check_b102_worked_out.ts`.

**M2 (Must). Two new type errors, so CI's "types" job (`.github/workflows/ci.yml:338`, fails on any error not in `typecheck-known.txt`) will be red.**
* `tests/walk_b102_author.ts:33-35`: `await import("@axe-core/playwright")` is not constructable under the api tsconfig, and `v` is implicitly `any`.
* **Fix:** load it the way the other `tests/` files do: `const { default: AxeBuilder } = createRequire(import.meta.url)("@axe-core/playwright") as typeof import("@axe-core/playwright");`. Type `v` as `{ id: string }`. Then re-run `typecheck.mjs`.

### Minor (Should)
* **m1. Focus is lost after "Work it out", with no confirmation.** The row is removed and focus falls to `<body>` (my keyboard walk). Nothing says the save worked (`rule-facts.tsx:88-90`). EXPERIENCE §2.12 asks for a keyboard path, and D11 for save feedback. **Fix:** after a save, move focus to the panel heading `#rf-h` and say in a polite live region: "Age years is worked out: it reaches cases with the next approved release."
* **m2. An answered birth date that its own check flags reads as unanswered.** With date of birth 2099-01-01 (saved 200, flagged by B-M2), the line reads `Age: answer "The person's date of birth" first.` The concept's words for this case are BR-7's "check the date of birth and the application date". The engine branch at `engine/runtime/case-checklist.ts:159` cannot be reached for a future birth date, because `api/src/case-checklist.ts:65-66` drops the answer first. **Fix:** pass the keys whose answers have problems, and say "check …" for them at `case-checklist.ts:156-157`. Add one test.
* **m3. The challenge-M3 behaviour is not tested.** `case-checklist.ts:153-155` reads the release's own reference date, but every BR-8 test (`tests/check_vv_checklist.ts:220-231`) uses `case.application_date`, the same key as the old constant. Putting the constant back would still pass. STANDARDS §7 [M]: a rule's test fails when the rule is removed. **Fix:** add one case with `reference: "case.intended_stay_from"` that expects the age on that date and that date's question words.
* **m4. BR-5's by-name branch (challenge m2) has no test.** `worked-out.ts:81` matches `work.keyPreview`, but the test only creates a `ruleFact` proposal (`check_b102_worked_out.ts:85`). **Fix:** one fail test with a proposal from `POST …/rules/:key/fact`.
* **m5. J-A6a's written end is not walked.** The concept ends J-A6a at Review. `walk_b102_author.ts` stops at the refusal. I walked it: Review shows "Calculated answer · Age in whole years from Date Of Birth, on Application date. · added · Immigration expert" (works). **Fix:** add that step to the walk. The J-A6 walk also saves answers through the API. By screens it works too: Agent view › The application › Add, Day/Month/Year, then Save. I did this; it took 2.2 s.
* **m6. The "Choose a date…" option cannot be chosen.** It snaps back to the default (`rule-facts.tsx:85`, `fromKey || default`), so the placeholder is a dead choice. **Fix:** keep the default only until the person picks, or drop the empty option.
* **m7. The challenge-M1 remainder is still open and needs the tech lead's ruling.** A placement retired after the value is worked out is not caught at release (`engine/validate.ts:76-77` checks retired fields, not unplaced ones). The builder named this and proposed it as a follow-up with m3 (the words are in `challenge.md`), and "Lead response" is still empty. I raise no new finding; the ruling is needed before merge.
* **Nits.** The web rebuilds the server's words for "It will read" (`rule-facts.tsx:87`; STANDARDS §7, no duplicated logic), so it could drift. The audit summary says the words twice (`worked-out.ts:107`). Refusals reached from the UI show keys ("person.x is already worked out").

## Standards: [M] lines touched by this row
* **Met.** §3.1 content is data: the 18 and the calculation's dates are in `samples/conditional-documents.json`, and no combination or form number is in code (P-319). §3.2 pick, don't type. §3.8: no AI. §3.9: the age says which date. §3.10: BR-1 to BR-8 each have a pass and a fail. Optimistic and idempotent create: unique key plus P2002 gives 409, the race test passes, and two tabs give "already worked out". Server authorisation, deny by default: 403 for the reviewer, the Approver and the case officer, also by URL. No per-row requests. No migration. Strict TypeScript, no `any` in app code. axe on every state I drew. 1024 px and 200 % zoom (512 css px): no sideways scroll. The team's components and tokens. AGENTS rule 4: Sample, "Unconfirmed: expert" and "Unconfirmed: no counsel" are on the data, the concept quotes Guide 5256, and I matched the quote against the capture the challenge names.
* **Not met.** §3.6 / D4 (M1; m7 needs a ruling). §5 test fails when the rule is removed (m3). The CI type check (M2). RFC 9457: the route uses `fail()` plain messages, as C3.6 does (retrofit, not counted).

## D1–D20 (1–5)
D1 Requirement fit **4**: every BR and §5 copy present; C6.4 30/30 · D2 Data integrity **3**: duplicates and race refused; wrong-type fact accepted (M1) · D3 Reuse **4**: reuses `ageInYears`, CALCULATIONS, C3.6's door and `missingRuleFacts`; the web rebuilds the words · D4 Rule integrity **2**: M1, m7 · D5 Stability **4**: two tabs and parallel adds give one value; reload is fine · D6 Governance **3**: audit line; Review line with the expert's sign-off; one-person write per Q1, still awaiting the Lead · D7 AI trust **n/a**: no AI, US$0 · D8 Orientation **4**: inside Questionnaires and Documents, with the path · D9 Flow **4**: two clicks with defaults; the date question is one dialog · D10 Language **4**: §5 words exact; a few keys in refusals · D11 Feedback **3**: no save confirmation, focus lost (m1) · D12 Visual **4**: calm, aligned (screenshots `walk/`) · D13 Accessibility **4**: axe clean at 1440/1024/400, keyboard path complete; focus lost after save · D14 Team look **4** · D15 Speed **4**: save 207 ms, one GET per open form · D16 Testability **3**: everything reproduced; types red (M2); m3, m4 untested · D17 **simulated only** · D18 Provenance **4**: Guide 5256 quote, Sample labels, the age names its date · D19 Closure **4**: configure, work out, Review, case Documents, C6.5's upload, on the checkpoint · D20 **simulated only**.

**Journey score (the one for this check): 7.5/10, not a pass** (`journey-test-reviewer-2026-11-07.md`). Fixing M1 and m1 raises "correct data" and "feedback and state".

## Retrofit and scope
Retrofit: the concept records "the team's spine authoring has no worked-out values (Unverified: not re-read this session)". That is recorded, and I did not re-read it either. Scope (P-26): I raised nothing from the concept's "Not built" line (other calculations, editing or removing a worked-out value). P-33: step 325 uses the product's own `WorkedOut.add` and C3.6's door. The loader's second-person approval is the checkpoint's own scaffolding, already named.

## What I could not check
A real screen reader. An intended user's unaided walk (D17, D20 stay with the founder). Code coverage against the qa floor. canada.ca live (host not allowed; the quote matches the committed capture). The fixture run of C6.4 (only the checkpoint run).
* Note: `product/qa/built/C6.4.md` (untracked, 08:31 UTC) appeared in the shared working tree during this review. I did not write it, and I left it alone.

**Verdict: Block** — fix M1 (refuse a fact no rule reads as a number; pass and fail test) and M2 (the two type errors in `tests/walk_b102_author.ts:33-35`); m7 needs the tech lead's ruling.

## Builder response (at the fix commit after 78a874439)
* **M1, fixed:** `api/src/worked-out.ts` `notNumberTests`: a fact a rule compares with words is refused (400) and the form reads "Not offered: …" with no save button (`GET …/worked-out?fact=`). Tests: `check_b102_worked_out.ts` "review M1 fail", "review M1 pass and fail"; walk J-A6a step 4.
* **M2, fixed:** `tests/walk_b102_author.ts` loads axe with `createRequire` and types its callback; `tsc -p api/tsconfig.json` shows no error in the B102 files.
* **m1, fixed:** a status line ("Worked out: … It reaches cases with the next approved release.") takes the focus (walk J-A6a step 2). **m3, m4, fixed** with tests. **m6, fixed** ("Choose a date…" stays chosen). **m2:** see break-report mi7 (not changed, named). **m5:** your walk of Review stands as the evidence. **m7:** for the tech lead (follow-up row proposed on the PR).

## Round 2 (diff-only re-review, `78a874439..dfc87cef1`, 7 Nov 2026, about 14:40 IST)
Scope: my M1 and M2 checked against the diff, plus the code that fixes the breaker's MA1–MA3 (`engine/runtime/case-checklist.ts`, `api/src/proposals.ts` LANDERS.field, `api/src/rule-facts.ts`). Copies :4471, :4472, :4473, all stopped afterwards. US$0.

| Check at `dfc87cef1` | Result |
|---|---|
| `node product/tools/typecheck.mjs` | **PASS**, no new type errors (15 known; web 0) |
| `tests/check_b102_worked_out.ts`, fresh copy | **38/38** |
| `tests/check_vv_checklist.ts` | **76/76** |
| `tests/check_forms_c36_rule_facts.ts`, fresh copy (LANDERS.field is shared with C3.6) | **42/42** |
| `acceptance/C6.4.test.ts`, fresh copy, configured checkpoint | **30/30** |
| `tests/walk_b102_author.ts` (J-A6a) at 1440 and 1024 | **7/7** each; "Not offered" screenshot checked |

* **M1: closed.**
  * `notNumberTests` (`api/src/worked-out.ts:36-50`) walks `args`/`arg` exactly as `factsRead` and the engine's `PREDICATE_OPS` do. The route refuses at `:110-112`, after BR-1. The form reads "Not offered: …" with no save button.
  * My probes on the checkpoint: `eq "alone"` gives 400; `and[lt 18, not(eq true)]` gives 400; a fact read `lt 18` by one rule and `in ["a","b"]` by another gives 400, with `fits.ok=false` on the GET; `or[gte 16, exists]` gives 201.
  * The test "review M1 fail" would fail if the refusal were removed (the POST would then answer 201).
* **M2: closed.** `tests/walk_b102_author.ts` uses `createRequire` and types its callback; the typecheck passes.
* **Breaker MA1–MA3 (read and run; scoring them is the breaker's job):**
  * MA1: the age line now uses only a worked-out age that a document line reads (`case-checklist.ts:151-153`), with a pass and a fail test.
  * MA2: the lander refuses a `ruleFact` that is already worked out, inside its transaction.
  * MA3: an add by name counts worked-out keys as taken, both in the preview (`rule-facts.ts:247-248`) and in the lander.
  * C3.6 stays 42/42.
* **m1, m3, m4, m6: closed** (status line with focus, J-A6a step 2; tests at `check_vv_checklist.ts` "review m3" and `check_b102_worked_out.ts` "review m4"; the empty option stays chosen). **m2** is named in break-report mi7 and not changed: it stays Minor. **m7** stays with the tech lead (follow-up row on the PR).
* **New Minors (Should; none blocks):**
  * r2-m1. `WorkedOut.add` is not in one transaction with the lander. If an ask lands between the route's library read (`worked-out.ts:96-100`) and its `derivedField.create`, a fact can still end up both asked and worked out. The window is tens of milliseconds; the common order is refused both ways. Fix: do the read and the create in one `$transaction` that re-reads `canonicalField` before the create.
  * r2-m2. A rule written *after* a value is worked out can still compare it with words: `engine/validate.ts:47` skips derived keys. This is outside this row's diff; it belongs with m7's follow-up. Nit: "compares … with words (eq true)" calls a yes/no "words".
* **No Blocker or Major remains open.**

Verdict: Approve
