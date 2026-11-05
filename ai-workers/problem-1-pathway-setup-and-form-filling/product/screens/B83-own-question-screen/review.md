# B83 review: "Ask as its own question" (independent reviewer, 5 Nov 2026, head 0aff0e0b4)

**Skill verdict: Ship after fixes.** The ask itself, its rules and its data are sound; four Majors are in feedback and in what undo says. Journey score **7.5 / 10, fail** (`journey-test-reviewer-2026-11-05.md`). Ran: `check_b83` 24/24, `check_b52` 66/66, C4.11 after `b83_six_steps finish` 23/24 (only G5, known). US$0.

## Majors
**F1. The page says "Decided" when it knows nothing.** `web/src/pages/review-items.tsx:367,371`. `undecided` is false until data arrives, so the else branch shows "Form fields · Decided · Every form field of this edition has a decision."
* **Ran:** IMM 5257 with 14 undecided, GET held: "Decided" until it loads, then "Needs you". GET answers 500: "Decided" stays. Wrong id (all zeros): "Decided". On main this page never claimed that. It is the page that gates release (K1).
* Concept §4 also says only that the chip shows with something undecided; the "Decided" chip is added. Tolerable once loaded. No test touches the title.
* **Fix:** branch on loaded data; while loading use a neutral title with no chip; on error or no edition show the error state. Test: held GET, 500, wrong id, 0 undecided.

**F2. Undo in the toast gives no word, loses "kept", and fails silently.** `web/src/components/own-questions.tsx:45-48,68` with `components/lifecycle/index.tsx:129` (`run` calls `clear()` after the action, wiping the toast `undo` just showed, and has no catch). BR-9.
* **Ran:** (a) toast Undo: toast vanishes, "Taken back" never appears. (b) A rule reads the waiting field: the field stays WAITING (by BR-8 it holds release) and "The new field stays waiting…" is never shown. (c) Another tab undid first: 409, no message, row still "Asked as", unhandled page error.
* `check_b83:101` only counts the button; no test clicks it.
* **Fix:** catch in the toast's path, refresh, and show the result after `run` ends (in the section's own status line; leave the shared hook alone). Test (a), (b), (c) in the browser.

**F3. Undo after placement leaves the question placed and says nothing.** `api/src/own-question.ts:168-201`, `own-questions.tsx:48`. Challenge B1 fix step 2 ("If a question was already placed, say so in words and leave it for 'Remove from …'") did not reach BR-9, so **B1 is not fully closed**.
* **Ran:** alias asked as library "Criminal History", placed (1 section question), Undo. Toast: "Taken back: worked out from other answers again." Section question still 1 and the tab shows no gap, so nothing tells the person: by the code a client would be asked a criminal-history question no form field reads, which is B1's own example (not run through a case or a release). Same for an approved field ("Has national ID", still placed).
* **Fix:** undo returns the sections still asking it; the toast says so and names "Remove from …" on the Smart questionnaire tab. Pass and fail test.

**F4. BR-8 has no test, so challenge M1 is not closed.** `tests/check_b52_own_yes_no.ts`, `tests/check_b83_own_question_screen_browser.cjs`. Concept §3 and §6 want one pass and one fail per rule; the challenge named them: never asked, not held; after placement, held until placed; new field, held until approved. Neither check has any of the three.
* The behaviour is right: I saw gaps go 0 → 1 after a post-placement ask.
* The words are soft: M1's "or release is held" is in neither toast nor row, and the intro says "It counts from the next release, once … pressed", which reads as optional. Concept §5's toast copy matches the code, but BR-8 says "the toast and the row say so".
* **Fix:** add the three tests. Ask the tech lead whether the toast should add M1's words; recommendation yes.

## Minors
* **F5 Conflict refreshes only on a wording match.** `own-questions.tsx:97`, `:77-80`. Ran, two tabs: "already asked … Undo it first", yet the row still shows Ask and no Undo. Stale row Undo: message, row still "Asked as". Concept §4 says the list refreshes. Fix: refresh on any refused save or undo.
* **F6 Same-name refusal points at a field the picker does not hold.** `own-question.ts:144`. Ran: "National Id Number" → "choose it as the library field instead"; it is not Yes/No, so it is not offered. Concept §5's "returns the field's key as data" is not built; the client twin (`own-questions.tsx`, `twin`) covers Yes/No only. Fix: different words for a non-Yes/No twin.
* **F7 Focus falls to BODY after Undo** (row and toast). `own-questions.tsx:45-48`. Ran; Tab recovers in Chrome. Fix: move focus to the row's Ask button.
* **F8 Rows reorder after each save.** `own-question.ts:70` has no order. Ran: p. 1, p. 3, then asked rows p. 1, p. 2, p. 2; also in the builder's `walk/5`. Fix: sort by page, then data path.
* **F9 Read-only words during a slow or failed session.** `own-questions.tsx:55` ignores `known`/`failed` (`lib/api.ts:33-44`). Ran: the author sees "A configuration author asks these" and no buttons until the session answers, and for good if it fails. Fix: neutral until known.
* **F10 Evidence and tests.** `walk/1-smart-questionnaire-line-1440.png` does not show the line (y ≈ 1,146; `check_b83:38` does not scroll). Axe runs on one state only (`:81`), though STANDARDS §7 says every state; my runs on the others were clean. The pack through the screen is by hand, not chained in a suite (concept §6): I ran it and it held. Graph G3 lists `GET /combinations/:id/own-questions` as untested: an artefact of the conditional path in `useApi`; the browser check does reach it.
* **F11 M6's own example still passes.** `own-question.ts:147`. Ran: with "Has national ID" present, "Holds a national ID" and "Has national IDs", same meaning, need no reason. The code does what the challenge and BR-5 prescribe (`nearLabels`, words in order), and a second person still approves. For the tech lead: accept as the limit of C3.6's check, or widen it later.
* **F12 The row's "To review" link shows the author nothing.** Ran: the Approver sees the waiting field there; the author does not. Words are accurate ("a second person approves"). Consider dropping the link for the author.

## Challenge closure
B1 **partly** (F3); picker meaning, route and buttons done. B2 closed (route 409, row reason, line counts `can_ask` only). M1 **partly** (F4). M2 closed in `library-changes.ts` with a test; depth with the breaker. M3 closed (empty, carries over). M4 closed (no table on the screen; meaning from the form). M5 closed (no key in any refusal I drew, 10 tried). M6 closed as prescribed (F11).

## What else changed behaviour
`readOnly` prop: unchanged; the section ignores it and uses `canAuthor`, right for the Approver (Ran). `pack2` `applyOnly`: taken only when passed; `nearReason` is ignored unless the name is near, and labelled Sample; `check_b52`'s checkpoint row is clean. GET `asked` now excludes a fact the step names: its readers (`pack2`, `check_b52`, the screen) are fine. Title and Notice: F1 only; the shared cache key means no extra request.

## [M] lines (met unless named)
EXPERIENCE: §2.7 reasons met. §2.8 undo not met in full (F2, F3). §2.10 met. §2.12 met except F7 (axe, 1024, 400, 200 %, keyboard). §4 states: conflict partly (F5), error state missing on load (F1), others drawn. §5 words met. STANDARDS: §3 no typed key, second person, reasons met. §5 no per-row request met (one GET; `toAsk` loops over the combination's few editions, 64 ms). §6 contracts and server authorisation met (401, 403 Ran). §7 "a rule's test fails when removed" spot-checked: BR-1, BR-2 (`canAuthor`), BR-6, the line would fail; BR-8 and the title have no test.

## Scores (1–5)
D1 3 BR-8 words, BR-9 gaps · D2 4 one row under double click and tabs · D3 4 near check, F11 · D4 4 gate holds, F3's orphan · D5 3 F2, F5 · D6 4 who and why recorded · D7 n/a, no AI · D8 5 crumb, link lands · D9 4 F8, line low on page · D10 5 words · D11 2 F1, F2 · D12 4 · D13 4 F7 · D14 5 team parts · D15 5 · D16 3 F4, toast and title untested · D17 simulated only · D18 5 form's words, page, date · D19 4 conditions land; G5 known · D20 simulated only.

## Could not check
A real screen reader; an intended user's walk. Undo and withdraw races are the breaker's. Retrofit mapping: none needed (no migration, existing page). Skill note: `qa/GRAPH.md` not rewritten (no `--write`); `node graph.mjs` printed hard gaps 0.

## Fix list
F1, F2, F3, F4 before approval, each with a fail test. F5 to F12: fix or list in the PR.

**Verdict: Block** (head 0aff0e0b4): open Majors F1, F2, F3, F4.
