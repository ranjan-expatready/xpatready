# C11.15 review (forms lane): Redo with AI per stage, Load sample

Reviewed commit: **4093121b6d4589cd61add33c41a5cb9bf769c513** (branch claude/quirky-cannon-thk3q0), isolated copy on :4456 (fake launcher, US$0, no live switch), then stopped.

## What I ran
* `acceptance/C11.15.test.ts` on a fresh copy: **37/37** (reproduced; AT-1, AT-12 x2, AT-24 now pass). `tests/check_forms_c1115_redo.ts`: **16/16**.
* Browser walk (headless Chrome, 1440, then 400 and 1024 px) on the six: line menu, Redo with AI, all three stages, Start. Screenshots in this folder (`walk-*.png`). Journey report: `journey-test-reviewer-2026-11-02.md` (score 6.5/10).
* API probes: plan per stage, start per stage, the run and the Forms tab's finder list afterwards.

## Judgements asked for
* **AT-1 setup change: changes the call, not the rule.** Same assertion (a saved run exists, the lines are Picked by AI, US$0). The Demo menu calls `{sample:"six"}` (web/src/App.tsx:199); the no-body load is "the suites' fixture ... test data only" (api/src/demo.ts:62-63). Testing the Demo menu's own call is the truer check. The pack states it in its header (acceptance/C11.15.test.ts:26-28). Minor: AT-1 proves Visitor visa only.
* **Read = Match (one run): said, partly honest.** The API plan text and the Read hint say "reading and matching run together" (form-redo.ts:28-29, finder.tsx STAGES). But the Match hint does not say it, and the two plans have identical steps (only the fingerprint differs: e352de.. find, d24077.. read, a4a0d8.. match; read and match steps are the same six). I did not count this as a defect on its own (P-123 asks "per stage"; the builder said so). See Major 1 for what is not said.

## Blocker
None.

## Major
**M1. A Redo on one form reports and records the whole combination, and says nothing about that form.** Evidence (six loaded, Visitor visa, saved answers, US$0):
* Before: Forms tab "AI found 7 forms ... 1 to decide", 9 rows in `GET /combinations/:id/forms/find/latest`. After Redo (Match) of IMM 5409: header reads "AI found 1 form for this combination, 1 to decide" and the list shows 3 rows (IMM 5409, IMM 5484 TO_DECIDE, IMM 5782 NOT_FOR_THIS). The other six attached forms are gone from the finder list (walk-3-after-start.png). The lines in the table are intact, so the panel now contradicts the table.
* The run's message "1 form attached or already there, 0 not found, 1 to decide" and status **Done with problems** (`GET /runs/:id`) come from IMM 5484, a form nobody redid. `only` filters just the fetch step (finder.ts:445-446); `decide` and `missing` are not filtered, and the run replaces "latest".
* The redo of an attached line changes nothing on it ("0 attached automatically, 1 already on this combination"; the check's own `line: DRAFT|1`). Nowhere does the run or the dialog say "your line is unchanged" or what AI now thinks of this form. The dialog text for a Redo still says "the forms both rounds agreed on are attached" (finder.tsx FIND_DESCRIPTION). In live mode this would spend up to the plan's cap for no visible effect.
* Why Major: wrong state shown to the author after the one action the row delivers (trust, correct data), and the builder's tests only assert "the run ends, US$0, line unchanged" (check_forms_c1115_redo.ts "Redo read"), so they pass on this.
* Fix (smallest): for a run with `only`, (a) count and list only the `only` forms in the run message and status, (b) do not replace the combination's finder list with a one-form run (keep the last full find as "latest", or show this run as "Redo of IMM 5409: ..."), (c) put one sentence in the run result: what AI decided for this form and "Your line is unchanged" or what changed. Add a test that the other forms' rows survive a Redo and that the message names only the redone form.

## Minor
* contracts/form-library.ts (new RedoBody comment): says read and match "run its field-map draft"; the code runs the finder (form-redo.ts:1-12). Stale; fix the comment.
* The Match hint should repeat "(reading and matching run together today)"; default stage is Match while the menu says "find, read, match".
* Stop: the handler now waits up to 3 s inside the request (finder.ts ~849); fine for replay; a live call can still answer "Stopping". Not a defect, noted.
* `.png` files in W1-form-library/screenshots/c1115 and W1-start-setup/screenshots/c1116 are rewritten by the builder's browser checks (I restored them; not part of this PR).

## Checked and held
* Server: author only (approver 403), unknown stage 400 plain words, form not on combination 404, removed form 409, plan fingerprint includes the stage (a read plan cannot start find: 409), live with the switch off 409 before anything is written, same idempotency key is one run, one run per combination (409 Already finding).
* Money: plans US$0 in replay; live greyed in the dialog with the reason; ledger unchanged.
* UI: dialog axe WCAG 2.2 A/AA: 0 violations; radios reachable and arrow keys move the stage; no sideways scroll at 400 and 1024 px; no console errors; plan loads in about 1 s, run ends in 140 ms.
* Concept/words: menu item "Redo with AI (find, read, match)" per PRODUCT P-123; Find uses a fresh page (plan `page_url` null vs the remembered one for Read/Match).

## Not checked
Real screen reader; keyboard-only run of the whole path (radios only); Stop clicked in the browser (API only, AT-24); double-click on Start (key is per dialog, API same-key test passes); live path (no switch, by rule); GRAPH.md not regenerated (it would write outside the files allowed).

**Verdict: Block** (commit 4093121b6d4589cd61add33c41a5cb9bf769c513). Fix M1 (scope the run result and the finder list to the redone form, and say what the Redo did to the line); the rest is Minor. The AT-1 setup change and the Read=Match decision are accepted as built.
