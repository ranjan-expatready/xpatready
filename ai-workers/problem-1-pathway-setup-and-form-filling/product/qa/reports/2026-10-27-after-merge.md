# `/qa after-merge` — W1-02 (extension parked) and S1 Structure on main 76628a4, 27 Oct 2026

Tester: the qa lane, Mac, worktree `claude/qa-after-merge-s1-21bfdf`, Lead note of 27 Oct (in Lead PR #51, read from `origin/lead/2026-10-27`). Tested: **main 76628a4**. The app code is the same as d393155 (PR #42); later merges change only documents. The scope was two merges: W1-02 (PR #39) and S1 Structure (PRs #40 and #42). I used my own copies on :4471 (empty, as after Reset) and :4476 (Visitor visa configured and released through the PDF path by `setup_visitor_visa.ts`, replayed AI). I never touched :4400. AI cost: US$0 (ledger lines added by the suites: 0.00). Evidence: `reports/2026-10-27-after-merge/`. Check: `tests/qa/check_qa_am_1027.cjs`. It passed 50/57 and then 51/57; every fail is a finding.

## Verdict
**Not ready on two Majors in S1 Structure, both screens lane:**
* **QA-45:** a publisher cannot add the first sub-category on the page.
* **QA-48:** a released combination can be retired or restored only through the API, although the page says "retire it first".

**QA-38 (runtime, Major) is still open.** W1-02 is clean. Every removed route answers 404. Old addresses show "Page not found" with a way back. Nothing on the menu or on the combination page mentions the extension. The whole PDF path works.

New Minors: QA-44, QA-46 (screens) and QA-47 (forms). Closed: QA-41, QA-42 and QA-43.

## W1-02, PDF path only (P-102)
* **Gone cleanly.** These routes now answer 404, none with a 5xx:
  * capture: `POST/GET /captures`
  * pairing: `/extension/sessions`, `/extension/pair`
  * portals: `/portals`, `PATCH …/portal`, `…/online-forms`
  * screen maps: `/online-versions/…/screen-map/draft`

  `/extension`, `/review/capture/x` and `/review/screen-map/x` show "Page not found" with "Back to programs", with no page error. The menu and the combination page have no Extension, Pair, Capture or "Add an online form".
* **Online lines.** A line set to Online shows "Needs the browser extension (later wave)". In Preview (draft), the Forms and coverage tab gives that line the same note instead of "Fill PDF". The Studio fill refuses it with 409 and the same words.
* **PDF path, end to end.** `setup_visitor_visa.ts` passed 13/13 on 76628a4 on every run (5). That covers intake of the official IMM 5257 and IMM 5707 files, AI field maps replayed from the saved run (US$0), sections and fields through the library change flow, submission, the expert's sign-off on 342 changes, and release by a different person. The Studio fill of IMM 5257 from the release read back 44/44 and the file stayed intact. The held-files list answers. To review opens for the author with no page error.
* **Old data still opens:** not fully tested. No database made before W1-02 was at hand, and :4400 had been reset to the wave-1 names with no forms. The W1-02 break report and its `check_forms_w102_fix.ts` (23/23) cover older releases with a portal or an Online line.
* **QA-40 under W1-02.** A release whose IMM 5707 line is Online, with a case opened on it: the case's forms panel lists only IMM 5257, and IMM 5707 is silently absent. It stays open (runtime).

## S1 Structure, walked as a content publisher (typed on the page)
* **Works:**
  * Empty after Reset: one next step, Add pathway, and no cards row.
  * Add rows typed in place, with the free check as you type.
  * The exact twin "visitor-VISA" is refused on the row ("'Visitor visa' already exists under Visitors. Choose it instead. Show it") and Add is disabled.
  * "Visiter visa" asks "Did you mean … Visitor visa" with Use existing and Add mine anyway.
  * A 300-character name gets "Keep the name under 120 characters." (400, nothing stored).
  * "Visa de résident temporaire — 签证" is stored exactly as typed.
  * Locations: Outside is kept for the next adds.
  * Pathway cards: All, one card per Pathway, and + Add pathway. A card opens only its own tree and puts it in the address.
  * Used by on a Pathway lists each combination by its path, and Not started ones have no Open. On a Live combination it shows "Live · Release n" and Open goes to `/c/:id`.
  * Rename keeps the key and confirms "Saved" in the panel, with no toast. It gives one name-only change per combination under the program, and release 1 keeps the old name.
  * Move down applies at once.
  * Two tabs: the older tab's Save gets "Changed meanwhile" with Reload, and the typing is kept.
  * Remove waits for a second person; the asker gets 403. The approver approves on To review and the name is removed at once.
  * The approver is read-only on the page (Add pathway, the name and Save are disabled), and gets 403 in plain words through the API.
  * Keyboard: arrow keys into the outline, Enter opens the details, End reaches "+ Add pathway" and Enter focuses its row.
  * Widths: no sideways scroll at 1024 or 390 px, and the panel fits both.
  * axe is clean on 4 states: empty, panel, approver, and 390 px with the panel.
* **QA-45 (Major):** "Add sub-category" on a category with no sub-categories closes the panel and opens no row. The outline only draws a sub-category add row under a category that already has one, so the first sub-category can be added only through the API.
* **QA-48 (Major):** a Live combination's name cannot be retired until its combination is retired, and Where used says "retire it first". No screen retires or restores a combination. Through the API, everything after that works:
  * the asker is refused (403);
  * after approval and release, the combination leaves All, and a new case gets 409 "'Visitor visa' was retired by a release: new cases are not opened on it";
  * the name then retires from the panel and leaves the pickers;
  * Restore (the name from the panel, then the combination) brings it back, and cases open again.
* **QA-44 (Minor):** the first letters of a name typed straight after Enter are wiped when the add finishes. This happened on 6 of 7 runs. By hand at normal speed, the whole next name was lost.
* **QA-46 (Minor):** the page says Remove, but To review says "Delete structure name: …".
* **Known and not logged** (Lead note, slice 3): the Programs page and the combination header still say "Individual"; Used by gives only a count on the Programs side.

**Journey score, Structure (journey-test, simulated author): 7/10, not a pass.** Task completion loses points for QA-45 and QA-48. Words, recovery, roles, keyboard, widths and axe are sound. No criterion is at 0. D17 and D20 were not awarded.

## Retests
| # | Result |
|---|---|
| QA-38 | **Open.** After a name-only release 2, the dialog still lists "Visitor visa · release 1" |
| QA-39 | **Open** (source unchanged: "Canonical fields", "Versions: … (user-A)") |
| QA-40 | **Open,** re-seen with an Online (later wave) line |
| QA-41 | **Closed.** Focus opens on "Case reference" |
| QA-42 | **Closed.** No "not set up yet" note on a Live combination |
| QA-43 | **Closed.** The route was removed by W1-02 (404) |

## Suites on 76628a4
* **CI:** the full suites ran on identical app code (run 40458413406 on 77cb250; main's own run reused it). Result: **35/35 PASS**, including the demo-reset Studio browser suite (45/45), Structure 83 + 61 + 33, R1c 120, R1d 63 and R1a 99.
* **Mac, under coverage (no `--demo`, one run):** 30 of 35 passed while my walks ran. `check_forms_demo`, `check_forms_p80_guard`, `check_forms_pdf_hardening`, `check_screen01_browser` (first view 1.7 s under load) and `check_p2_guard` (known: fails under the coverage preload) went red.
* **Mac, plain rerun of those five with nothing else running:** all pass (26, 41, 49, 129, 75). The red came from the coverage harness and machine load, not from the code.

## Coverage (c8 12.0.0)
api/src **96.78% lines / 81.84% branches**; engine **99.38% / 89.05%**. Both are above the floor. The engine branch floor rises from 88 to **89**; the api floor stays at 96 / 81.

The demo-reset browser suite was not run under coverage on the Mac, so these figures are without it.

## Graph and decisions
* `graph.mjs --write`: G1–G6 are 0, except G3 1 (`GET /attachments/:id/file`, the same gap as before, already explained). G4 is 0.
* `decision-impact.sh`: every product decision has a capability row or a backlog item (P-73 → B28).

## Could not test
* Old pre-W1-02 data opening (see above).
* AI did-you-mean and the meaning check: both are off until W1-07.
* Immigration programs (S2) and New combination: not merged; out of scope.
* The Form library: out of scope.
* 200% zoom on the Structure page.
* The demo-reset suite under coverage.

## Questions for the Lead
1. QA-48: is Retire and Restore of a combination meant to come with Immigration programs (S2 cards) or on the Structure panel? Until then, the panel tells a person to do something no screen offers.
2. Running suites under coverage on the Mac turned five suites red under load. For the next milestone run, should qa run coverage in the cloud, or in a quiet window on the Mac?

## Suggestions (never built by qa)
* Draw an "Add sub-category" ghost row under every category with no setup, so the outline and the panel agree (fixes QA-45). *Needed for the proof · Capability*
* Keep what is typed while an add is saving: clear only the text that was sent (fixes QA-44). *Later · Capability*
* Give `POST /combinations/:id/fill` a zod contract like the other routes (QA-47). *Later · Scaffolding*
* Each lane takes back its suite by-products (evidence JSON, screenshots, ledger stub tickets) before committing. The qa lane did so this run. *Later · Scaffolding*
