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


## Re-review at 82cf8e1f

Reviewed diff: `git diff 4093121b 82cf8e1f -- prototype` (finder.ts, form-redo.ts, contracts/form-library.ts, finder.tsx, tests/check_forms_c1115_redo.ts). Isolated copy on :4456 (fake launcher, US$0, no live switch), stopped; tracked screenshots my runs rewrote were restored with git checkout.

### Ran
* `acceptance/C11.15.test.ts`: **37/37**. `tests/check_forms_c1115_redo.ts` (copy restarted): **23/23**. `tests/check_s5_slice3.ts` (Forms tab finder read): 23/23. `check_forms_s4_finder.ts` needs `STUDIO_AI_LIVE=approved`, which I must not set: not run (it fails its own setup without it).
* Own probes by API (replay, US$0; script in my scratchpad) and a headless-Chrome walk of the Forms tab and the Redo dialog.

### M1 fixed (verified, not only the tests)
* Walk, Visitor visa, six loaded: header "AI found 7 forms for this combination, 1 to decide" and the same text after a Redo (Match) of IMM 5409; no console errors. On 4093121b it fell to "1 form".
* API: a run with `only` reports only its forms: message "IMM 5475: both AI rounds name it ...; it is attached", "IMM 5484: the two AI rounds disagree (...); its line is unchanged and a person decides", "IMM 5782: the pages name it as a separate application; ...", unnamed code "AI did not name it on these pages this time; its line is unchanged". Status Done with problems only when that form is missing, undecided or dropped. Dialog text and Match hint now say what the run does.
* `latestForms` merge, tried on a full find with IMM 5475 NOT_FOUND (retired in the library), 9 rows:
  * Find again for the NOT_FOUND form, still missing: same 9 rows, no duplicate, row stays NOT_FOUND, its `runId` is the redo.
  * Same, after the form is restored: IMM 5475 moves to ATTACHED (removed from "missing", not added twice), still 9 rows, the line is `DRAFT|1`, header run = that run.
  * One-form run for a form AI did not name (IMM 1294): rows unchanged. TO_DECIDE (IMM 5484) and NOT_FOR (IMM 5782) redo: rows unchanged.
  * Stopped one-form run (status CANCELLED) and, by the code, FAILED/QUEUED/RUNNING ones: left out (only COMPLETED and PARTIAL lay over), so the list never loses a row to them.
  * Full find after the Redos: one run id on all 9 rows, 9 rows, each once (a state moves from DOWNLOADED_ATTACHED to ATTACHED, which is true on a second find). Redos older than the newest full find are ignored (`newer` slice).
  * Two one-form runs on one form: oldest first, the newer wins.
* Pre-existing and unchanged: a newest full find that failed or is still running gives an empty list (4093121b did the same, `latest` returned that run).

### B1 fixed (verified)
* `plan`, `launch`, `latest`, `latestForms` and `redo` lower-case the id, so the advisory lock, the "already running" query and the scope label see one spelling. Reached the other way too: direct `POST /forms/find` with four ids (two lower, two UPPER) at once gave one 201 and three 409 "already running"; no scope label contains an upper-case id; `GET .../find/latest` with an UPPER id returns the same run and rows. Other callers (start-setup, demo, AI override) go through `plan`/`launch`. The check's two-at-once test (lower and UPPER) passes.

### Other break fixes
* B2: key used by another run is refused in `redo` (409, plain). Not closed for one pair: a key used by a Read run, sent with a Match plan for the same form, returns the Read run (200, same id), because the finder's plan fingerprint is the same for read and match. Not reachable from the dialog (its key includes stage and mode). Minor, see below.
* B4: read/match with no earlier page: 409 "choose Find for IMM 1295", in the dialog as "This find cannot start" with that sentence; picking Find then shows the plan and enables Start (walked). B5: one audit line "started Redo with AI (read) for IMM 5257 ..." per run; three same-key starts at once gave one run and one line. B6: not a form number, 400 without echo; the regex is wider than the contract's code pattern, so no valid number is refused.

### Findings
* No Blocker. No Major.
* **m1 (Minor, new with the M1 early return): no audit line for what a one-form run did.** `if (only) { ... return this.finish(...) }` (finder.ts ~518-526) skips the "found" audit line. Probe: Find again on the NOT_FOUND IMM 5475 attached it (`DRAFT|1`, Picked by AI) and the audit has only "started the form finder for Visitor visa", with no form named and no outcome. Redo has its own line (stage, form) but also no outcome. The run record keeps the sentence and the line carries its origin, so nothing is lost silently; fix: log one "found" line from `result.redo` for an `only` run.
* **m2 (Minor): the Redo sentence is only in the run record.** The dialog says "the run says what AI decided about it", but after the run ends (about 0.14 s) the Forms tab shows only the unchanged header and "Last find ...". The person does not see "its line is unchanged" unless they open the run in AI work. Not a data fault; M1's (c) is met in the run's message.
* m3 (Minor): the key/plan hole above (read key answered for match). m4 (Minor): the read/match refusal reuses the title "This find cannot start". m5 (carry-over, not this PR): B8 raw parser text for a non-object JSON body and B9 Replace on a removed line stay listed as follow-ups; I agree they are pre-existing.
* Test strength: the two M1 checks and the five break checks fail without their fixes (builder showed it; the M1 list check compares full-find rows to post-Redo rows, which fails on the old replace-the-list code). They do not cover the merge cases above (restored NOT_FOUND form, stopped run); I covered them by probe. Should add one test for "Find again for a NOT_FOUND form keeps the other rows".

### Journey (reviewer)
Score **9/10** (was 6.5): task 1, next step 1, plain words 1/2 (m4), feedback and state 1/2 (m2), correct data 1, error recovery 1, accessibility and sizes 1 (markup unchanged apart from text, earlier axe 0 violations; not re-run), speed 1, visual 1, trust and sources 1 (Sample note kept). Pass is 8+ with no 0.

### Not checked
Real screen reader; keyboard-only walk of the whole path; live path (no switch, by rule); the `check_forms_s4_finder`/`check_w1_start_setup` checks (need the live switch); GRAPH.md not regenerated.

**Verdict: Approve** (commit 82cf8e1f). M1 and B1 are fixed in behaviour, the finder list merge neither loses nor duplicates rows in the cases above, and nothing regressed in the three runnable suites. m1 and m2 are Minor follow-ups.
