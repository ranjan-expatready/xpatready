# Review — C4.11 "Draft questions and documents", QA-162 step 5 (saved conditions)

Reviewer: independent agent (did not build it), 4 Nov. PR #865, commit **6a680d9f** (branch `claude/festive-noether-prh9i1`) against origin/main 9caa043b. US$0 throughout: Saved replays and the stand-in launcher only; live AI off; :4400 not touched. Journey test: `journey-test-reviewer-2026-11-04.md` (**8/10**, pass).

## What I ran (my own copies 4511–4516, all stopped after)
* `check_forms_qa162_saved_matching.ts` on :4452: **33/33 twice** (exit 0). Counts: C4.11 step 5 **9 of 22 readings land** (6 items: Check 3, Decide 3, Ready 0), 13 left out; C4.7 10/23.
* `acceptance/C4.11.test.ts` on Visitor visa from `setup_visitor_visa.ts` (13/13): **24/24 on two fresh copies** (4511, 4513). A second run **on the same copy** gives 23/24 (G5 `ready 0`): see m6.
* Same pack on Demo › Load configured (fresh 4512): **21/24 twice**. The 3 red lines all say "blocked by QA-144 (no question of this combination is placed yet)", as the task asked.
* Stand-in CI checks: `check_forms_c411_contract.ts` 35/35, `check_forms_c411_draft_qd.ts` 77/77, `check_forms_c411_draft_qd_browser.cjs` 50/50 (that run rewrites committed screenshots in `W1-questions-and-documents/screenshots/c411/`; I restored them with `git checkout`).
* My own browser walk at 1024, 720 (200 %) and 400 px, keyboard only; axe; wrong-role refusal by API (approver and reviewer get 403 on `POST /draft`).
* I read every one of the 13 left-out reasons on :4458 and on the demo copy, and checked them against the snapshot. My probe listed the questions each combination asks and IMM 5257's derived Yes/No boxes.

## Checked and holds
* **No guessing in the landing.** `quoteNames` only chooses among the questions the words already tie. The quoted sentence must hold a word that belongs to one of them and no word of the others; two or none gives none. It is never applied to the deciding question (`pickDecider` and `deciderOf` pass no quote). A made-up quote is still refused later by the "sentence is in the guide" rule. The one reading it lands ("Other names used", which quotes "type any other family name that you have ever used") is marked loose. So the item is **Check, never Ready**, and its reason gives the tie and the sentence. The tests cover both pass and fail: sentence naming both, sentence naming neither, sentence naming one.
* `workedOut` only explains; it never lands a condition. A tie returns none, and "Owns a boat in Canada" and "Residence" return none (tested).
* Every left-out reason now comes from data (`miss: several | none | unplaced`), never from parsing the reason's own words. `conditionDetails` gives one line per left-out reading plus one per passage nothing was drawn from. The test checks the count equals left-out + passages.
* Pack changes I checked:
  * PQR ⊂ SQR is **stronger**: the old "or band = decide" escape is gone, and at least one pick must exist.
  * BR-7 expands group values through `WHO_ROLES`, so a sponsor would still fail.
  * Removing `comes_from` from the queue kinds matches main: no step produces such an item, and step 4 runs on rules only and its message says so. The pack now checks step 4 through `/fact-sources`.
  * Run status words, `usd.spent` and the extra step names follow the current contract.
* Plan: steps 5–7 now name their saved run files, date and guide. The checker gets the files' second rounds; the order [draft, check] comes from `draft-qd.ts:136`.
* Run card: the step details are a `<details>` element. It is reachable by Tab and opens with Enter, with a visible focus ring. axe is clean with it open. There is no sideways scroll at 400, 720 or 1024 px.

## Issues (ranked)
**M1 · Major (Must): 3 of the 13 left-out reasons on the fixture state a wrong cause and send the person to the wrong fix. The build notes say otherwise.**
* The reasons:
  * "Other immigration status description" (1st reading), and "Highest post-secondary education details" (both readings), say "No question of this combination asks … If a form asks it, map that form field to a question (Forms › the form › Field map) and place it".
  * In fact Visitor visa **asks** all three "Description of the status … when it is 'other'" questions and all 7 education questions on IMM 5257. They are already mapped and placed (my probe on xr_studio_c411walk; screenshot `walk/4-step5-reasons-open.png`, third bullet).
  * So a person following the reason opens a field map that is already done, and the only fix that works ("set it by hand on the question meant") is not offered.
* Build notes rows 4 and 7/13 say these lines say "set by hand" and "naming both causes"; the product does not.
* The cause: `targetNotAsked` (`engine/qd-conditions.ts` ~308–327) treats `miss: "none"` ("the words name no single question") as "no question asks it". It then adds the map-a-field advice without checking whether this person already has asked questions on that form that share the words.
* `check_forms_qa162_saved_matching.ts` ("every condition left out says what a person can do") only tests that an action phrase is present, not that it is right.
* **Fix:**
  * When the words name no single question, say exactly that.
  * Name the asked questions that hold most of the words, if any, and offer "set it by hand on the one meant".
  * Keep the map-and-place advice only when no asked question of this person shares the words.
  * Add a fail test on "Highest post-secondary education details" and "Other immigration status description".
  * Correct the build-notes table.

**Minor (Should):**
* **m1 Caption cut.** The `workedOut` caption prefix regex (`qd-conditions.ts` ~296) leaves ". Have you had any post secondary education…". The caption is "Education Section Question 1. Have you…", and `question\s+\d+\s*` does not eat the "." that follows. The 140-character cut also ends mid-word ("…for more t", Lived elsewhere). Fix: `question\s+\d+\s*[.)]?\s*(?:[a-z][.)]\s*)?`, and cut at a word.
* **m2 "when if".** On demo data the IMM 5409 reason reads "needed only when if you are in a common-law union". `targetNotAsked` puts "when" in front of a `condition_plain` that already starts with "if", the same pattern as QA-147. Drop a leading "if" before adding "when".
* **m3 Shared run card.** `StepDetails` now shows `detail.details` for **every** run using `RunCard`: form finder, Library › Forms, AI work.
  * A failed finder step's details are `Request <provider request id>` (`api/src/rounds.ts:187`, `finder.ts:424`). They would show as "See the reason → Request req_…": an ID on the main path, under the word "reason".
  * Fix: show only plain-words details (keep request IDs in the log or behind a "Request ID" label), or let the caller opt in.
  * No committed browser test asserts `[data-step-details]`: `var/c411-walk.cjs` is not tracked. Add one assertion to `check_forms_c411_draft_qd_browser.cjs`.
* **m4 Pack BR-10 is weaker.** It now passes on `state: none`. A missing file yields "none" even if the plan's `out_of_date` branch (`draft-contract.ts` ~102) were deleted. The concept's test is "new IMM 5484 edition → Out of date". `staleReading` is covered as a function by contract check O, but the plan wiring is not. Fix: in the pack, point the checklist at a text that a saved reading read at an earlier checksum (as O builds it) and require `out_of_date`. Or add that wiring case to O.
* **m5 Vacuous pack line.** "every fact from a document names a document on the checklist" still filters `kind === "comes_from"`, which no step produces, so it can never fail. Rebuild it from `/fact-sources`: each fact whose source is DOCUMENT names a document type on that person's checklist.
* **m6 Pack only passes on a fresh copy.** On the same copy, the second run fails G5 (`ready.length > 0` once the first run's Ready items are accepted). The line predates this PR, but the header should say "fresh copy" or G5 should count Ready items still waiting.
* **m7 Hidden cause on demo data.** When the quoted sentence breaks a tie but the named question is not placed (demo data), the reason falls back to "could be 2 questions … set it by hand". The real cause, not placed yet (QA-144), is hidden (`named()`: `byQuote && asked(byQuote)` falls through). Return the `unplaced` reason for `byQuote`.
* **m8 Target taken in other words.** For "Country applying from details" and "Previous country of residence details", the reason says the condition "cannot decide 'Description of the status in the applying-from country when it is 'other''". That is the question the words were *taken as*, not one the AI named, and the reason does not say so. The landing path does mark this as "taken as". Fix: add "taken as" to the reason too.

## D1–D20 (1–5)
D1 4 (task met on landing and listing; M1 reasons) · D2 4 (no duplicates on re-run: "6 already waiting there") · D3 4 (one matcher, `fact-words`) · D4 4 (C5 order check kept) · D5 4 (idempotent run; Stop) · D6 3 (Sample basis; saved date shown) · D7 4 (AI marked; Check, never Ready; reasons) · D8 4 · D9 3 (M1) · D10 3 (M1, m1, m2; long sentences) · D11 4 (counts and folded reasons) · D12 3 (19 long bullets) · D13 4 (keyboard, axe, 400/720/1024) · D14 4 (team tokens, existing card) · D15 4 (run 1.9 s; no request per row) · D16 3 (m4, m5, no browser assertion) · D17 simulated only · D18 4 (readings and files named) · D19 3 (QA-144 still blocks on the six) · D20 simulated only.

## Could not check
Live AI (closed, never priced); a real screen reader; an intended user's unaided walk (D17, D20 belong to the founder); the finder's request-ID details in a real failed run (code-read only); CI on this commit (queued when I looked). Retrofit mapping: none needed; no new screen.

**Verdict: Block.** Fix M1 (Major) first. The minors m1–m8 are Should-fixes and may follow, or be recorded in the PR.
