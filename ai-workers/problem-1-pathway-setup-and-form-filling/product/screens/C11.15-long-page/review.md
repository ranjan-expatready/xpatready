# C11.15 long page address fix (QA-252) · review (forms lane)

Reviewed commit: **6277f5df686f617604a475d7cb10ca15a2c400c8** (branch claude/eloquent-brahmagupta-r9inu3, base 7bf8db261; diff `origin/main...6277f5df6`). Isolated copy forms_rev on :4456 (db xr_studio_forms_rev), live AI off, nothing priced pressed (0 LIVE batches, US$0 spent), copy stopped afterwards. No code edited, no other commit checked out. I judged it against the brief, `STANDARDS.md`, `EXPERIENCE.md` and the D-dimensions. There is no concept.md.

## What I ran
* `tests/check_finder_long_page_key.ts 4456 xr_studio_forms_rev`: **28/28, exit 0**, twice (once on a fresh copy after the builder's port heads-up; both runs were on my own copy, which I checked from the listener's DATABASE_URL).
* `tests/check_finder_long_page_browser.cjs 4456 xr_studio_forms_rev`: **52/52, exit 0**, twice. It rewrites the committed `C11.15/screenshots/long-page/*.png`, so I restored them with git each time.
* My own walk at 1440, 1024, 400 px and 200 % zoom, keyboard-only, wrong role, a race of three launches with the same key, and the words for bad addresses. Report: `journey-test-reviewer-2026-11-05.md`.
* Web typecheck: 0 errors. `graph.mjs --check`: exit 0.

## The brief, item by item
1. **Key: met.** `find-key.ts:20-22`: `s5-<uuid>-<mode>-<32 hex of SHA-256>` is 78 characters for rules and 79 for replay, whatever the address (148, 314 or none). The same dialog, mode and address give the same key, so a second Start returns the same run (`finder.ts:264-266`). Changing one character or adding one gives another key, and 128 bits make collisions negligible. Three concurrent launches with one key started **1 run**: one 201 and two 409 "Already finding". No duplicate, and the words are not raw.
2. **Sweep: met, and I verified it myself.** Every `idempotencyKey` the web sends (finder Redo, start-setup, ai-launch, sources, bulk-lines bulk/copy, runtime cases/people/findings/generate) is a UUID or fixed and short, and every server validator (120, 100, 90, 128, ≥8) and the text columns hold it. The table has one gap: `ai.ts:481` retry also accepts an optional key, but no web caller sends one, so it does not matter.
3. **No raw validator message: met on this dialog's path.** Plan and Start errors both go through `findErrorWords` (`finder.tsx:110`, `:153`). "hello" shows "Paste the address of a canada.ca application or guide page." An example.com address shows the server's canada.ca words. A key refusal, a 500, a lost connection and a 404 with no words each show fixed words that say what to do. The suite also proves that the old 195-character key gets a 400 on this commit and that the dialog would not show that 400's text.
4. **QA-252 (2): the trace is right, and the change stays inside the row, with one Major (below).** I confirmed the trace. After a rules find on Visitor visa's page COMPLETED, every later plan has `page_url` = that page (`finder.ts:211`, `:252-256`) and never waits for a page, so "Choose the page and find again" is not offered again. A fix in the dialog only is a reasonable way out: the person sees the remembered page and can paste another. It adds no new screen and changes no server code, and with nothing pasted Start stays off.
5. **Tests: met, but I could not re-run the fail on main.** Both new suites cover the 148- and 314-character addresses, each passing and failing, plus "the same address twice is one run, two addresses are two runs", the double click, every offered page in Saved and Rules only, the pasted 314-character address and the next step. I was not allowed to check out main, so the UI half of "fails on main" rests on the build notes. The API half (old key → 400, nothing started) I re-ran on this commit.

## D-scores (one line of evidence each)
D1 Requirement fit 8: brief items 1-5 met. Keyboard regression below. · D2 Data integrity 9: one run per key, even under a race. Page stored whole (314 characters). · D3 Reuse n/a (no library change) · D4 Rule integrity n/a · D5 Stability 9: double click and race give 1 run. Reload mid-run is fine. · D6 Freshness n/a (unchanged) · D7 AI trust 8: Sample note and US$0 on every plan. · D8 Orientation 9: path and tab unchanged. · D9 Flow 6: after a failed find the panel says "AI found 0 forms" and the page offer is gone (Minor 3). · D10 Language 7: the "last find read" label is wrong after a failed find (Minor 1). · D11 Feedback 6: the panel does not show why a find failed (Minor 3). · D12 Visual 9: dialog unchanged in look; long addresses wrap (`break-all`). · D13 Accessibility 5: axe clean in every state, no sideways scroll at 400, 1024 or 200 %, but the keyboard path loses the chosen page (Major 1). · D14 Team look 9. · D15 Speed 9: Start closes in 259 ms, plan under 1 s. · D16 Testability 7: good pass/fail pairs. No keyboard test. The fail on main is the builder's word for the UI. · D17 First-use: simulated only. · D18 Provenance 8: the address used is shown in full. · D19 n/a · D20: simulated only.

## Blocker
None.

## Major
**M1. Keyboard-only: tabbing past the address box silently replaces the chosen page with "Another canada.ca page", and Start turns off.** This violates EXPERIENCE §2.12 [M] (keyboard path for every task) and D13.
* Cause: `web/src/pages/workspace/finder.tsx:115`. The address box has `onFocus={() => setPicked("other")}`, and its only natural Tab stop sits right after the page radios. That box is now reused in the new Find again fieldset (`:141-144`).
* Failing case 1, introduced by this diff. Find again with a remembered page (Visitor visa finished): focus opens on "Saved". Tab, Tab, Tab wraps to the page radio "The page this combination's last find read" (checked). One more Tab lands on the address box. Now "Another canada.ca page" is checked, "Paste the address…" is shown and **Start is disabled**. On main, Find again had no page fieldset and this path worked. A person who arrows back to "The page … last find read" and tabs forward again loses the choice again.
* Failing case 2, the founder's own task by keyboard (the old line, same cause, now on this row's path). In "Choose the page and find again", arrow to Start Up Visa and press Tab: the choice flips to "Another canada.ca page" and Start is disabled. Start is reachable only by Shift+Tab wrapping round from Close, which nobody would find.
* Fix (small): choose "Another" when the person types into the box (onChange already does this) or chooses its radio, never on focus. Add a fail test that walks by keyboard: arrow to a page, Tab to the modes and Start, then press Enter, and expect one run on that page. Do this in both the page choice and Find again.

## Minor
1. `finder.tsx:54` "The page this combination's last find read" is wrong after a failed find on another page. Failing case: after a COMPLETED find on Visitor visa's page, a Rules only find on Super visa's own page that FAILED leaves Find again still showing Visitor visa's page as "the page … last find read". Suggested wording: "The page the last finished find read" (or "The page Find again reads").
2. After one find finishes, the list of offered pages (Super visa's own page among them) is no longer reachable. Find again offers only pasting an address. This is not a dead end, so it is acceptable for this row; I note it for the founder's walk.
3. The panel after a failed find reads "AI found 0 forms for this combination · Last find … rules only, US$0" and gives no reason ("The finder could not read the application page"). The "Choose the page" offer is also gone, so the next step takes Find again, then a wait, then Choose. This was already the case before the diff (the panel code is unchanged), and the builder reported it with a follow-up row. I agree with that row.
4. Already true before this diff, on this dialog: each keystroke in the address box sends a plan request (26 characters typed gave 26 POSTs). While the plan is refused, `liveOff` (`finder.tsx:84`) is null, so "Live" shows as enabled with its normal hint. The server still refuses a live start (START.liveOff), and I did not click it.
5. The suites hard-code `/opt/homebrew/opt/postgresql@18/bin/psql`. The browser walk writes into the committed screenshot folder, so every re-run dirties the tree. Its default ports 4451 and 4452 are in the forms range, which is fine.

## What I could not check
* The UI half of "fails on main", because checking out another commit was not allowed (see item 5).
* A real screen reader.
* An unaided walk by an intended user (D17 and D20 stay with the founder).
* Live mode (never pressed).

**Verdict: Block.** Fix M1 (`finder.tsx:115`, used at `:137` and `:143`) with a keyboard fail test. The Minors can be fixed or listed in the PR.
