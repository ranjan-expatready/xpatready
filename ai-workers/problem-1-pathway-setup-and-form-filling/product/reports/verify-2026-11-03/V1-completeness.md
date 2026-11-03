# V1 — completeness check: is any requirement missing? (3 Nov 2026)

Independent, read-only verification (P-290, P-291 (1)). The tester did not build or score any of this. App code untouched, no app run, live AI off, US$0.

**Question.** Map every requirement in the newest name-free requirements (`domain/requirements-2026-11-02/`) and every product decision in `DECISIONS.md` to a capability (`qa/CAPABILITIES.md`, `BACKLOG.md`) and to a test (`prototype/studio/acceptance/*.test.ts` and the other suites).

**Answer, in one paragraph.** Yes, requirements are missing. This check covers **537 items**: 273 requirements (185 SA-01B v2.1 build cards, 44 SA-01B business rules, 8 SA-01B journey tests, 36 SA-01 v2.8 requirements of its own) and 264 product decisions.
* **65 items in scope have no capability: 29 in M2 and 29 in M3, plus 7 that only a backlog proposal places in M4.** Three of the 29 M2 items are built and tested but missing from the capability list, so 26 M2 items are not built at all.
* **8 more are placed with the team** by a written rule that is not a decision.
* **No item has a capability without a test.** Every capability that an in-scope item maps to is named by at least one test file.
* **"Covered" is shallow.** Of the 141 M2 items with a capability and a test, only **45** are delivered in full by capabilities qa scores Works. The other 88 are delivered **in part**, and 8 depend on a capability that is still Partial.
* **M3:** 2 of 77 covered items are full and Works.
* **Not gaps, listed so nothing is hidden:** 52 items are held for the SA-01B product owner (P-251), 8 are later by a decision, 37 are out of scope (P-70; P-271), 11 are not requirements (withdrawn or pointer cards), 13 decisions are superseded, and 111 decisions are about how the team works and need no capability.

Every number in this report is printed by `v1_count.py` beside it (the counts block below).

## Gaps, in plain words (M2 first, then M3)

How to read the IDs: SA-1B-n is an SA-01B v2.1 build card, BR-n an SA-01B business rule, SA-1-n an SA-01 requirement and P-n a product decision. B-n, R2, SH3 and similar are backlog items. Every item is in the tables further down, with the reader's note on what is missing.

### M2, Super Admin configuration: 29 items with no capability (26 not built, 3 built but missing from the capability list)
1. **Reference tables and scoring (7 cards; the largest M2 hole).** A publisher cannot hold tables as content: language score conversions, occupation codes, wage tables, fee tables by date.
   * Missing cards: SA-1B-190, 191, 192 and 295 (tables), 195 (conditions that read a table or another person), 197 (points grids, conversions, pass marks), 200 (Canada scoring content: CRS, federal skilled worker, provincial calculators).
   * Backlog B16 and B17 hold them, unscheduled, and B16 is size L. Express Entry and provincial nominee eligibility cannot be configured without them. Only the fee table as a dated table is a ready item (R2).
2. **Field model depth (3 cards).**
   * Field groups (SA-1B-6).
   * Lists asked once per person, with dates, tags and "Same as" (SA-1B-10).
   * Purposes for list facts, such as "current", "for post", "all in 10 years" (SA-1B-11, B1).
3. **"Copy on emails" (3 cards: SA-1B-107, 108, 110).** No field group, no section on each individual combination, no release check. Nothing schedules them. The email sending itself is the team's (P-167), but the pack content is ours under P-70.
4. **Document master depth (4 items).**
   * Named alternative sets ("any one of" or "all of"), which a line picks (SA-1B-20, B3).
   * The dates a document captures (SA-1B-153).
   * Upload size limit and file-name pattern per document type (SA-1B-106).
   * Partly built and recorded as partial, not missing: an unordered alternatives list and a "who provides it" role already exist on a document line (SA-1B-19, 151, via C6.4). No capability states them.
5. **Content upkeep (5 cards).**
   * Next-review list, weekly content-team email and the warning at release (SA-1B-40, B22).
   * Completeness view per country (SA-1B-92).
   * Withdraw a published version: ours withdraws only a waiting delete or retire (SA-1B-301).
   * Change watch, and a change-watch entry becoming a draft (SA-1B-299, 300). This one is also a **conflict**, see question 1.
6. **Reuse.** Named line sets that many combinations include, with the affected combinations listed before approval (SA-1B-210). Copying one line exists (C1.5); a shared set does not.
7. **Two SA-1 requirements moved into SA-01B.**
   * Field map export and re-import, all or nothing (SA-1-31, B27).
   * Every pack text per language (SA-1-42, B20; the card itself puts translator tooling in Release 2).
8. **Decisions with no capability:**
   * P-159, one "Ask" co-pilot panel (B47).
   * P-160, named workspace snapshots (B48).
9. **Built and tested, but missing from the capability list (a records gap, not a product gap):**
   * P-58, the shared-draft line on every page (web `App.tsx` `DraftBar`).
   * P-165, the Stand-in chips (`tests/check_stand_ins.ts`).
   * P-04, the left menu.
   * The tester found these in the code; the readers had marked them missing.

### M3, case runtime: 29 items with no capability
1. **Multi-stage cases (B10):**
   * "Start next stage" (SA-1B-67).
   * Open a case at a later stage, with earlier stages "done before we started" (SA-1B-212).
   * Where the journey stands, outcomes and "after the decision" (SA-1B-68).
2. **Values by date, the time rule:** read each value in force on the case's target filing date (SA-1B-251, 252).
   * Document validity: how the end of validity is known, and what a document must outlive (SA-1B-21, 22).
   * P-230 (8) defers these fields only to a later piece of work after the M2 gate, and no backlog item exists.
3. **Moving an open case to a newer release (B9, SH3, SH4):**
   * "What changes for this case" (SA-1B-254).
   * A warning when the case's release was withdrawn (SA-1B-257).
   * Hidden items and requested documents survive the move (SA-1B-258).
   * Resolved items persist as instances (SA-1B-217, BR-18).
4. **Documents on a case:**
   * "I don't have this" and "Alternative used" (SA-1B-152).
   * The passport must outlast the permit (SA-1B-156).
   * Status document mark, key dates and key-date types (SA-1B-157, 104, 233).
   * A document shared by several providers (SA-1B-214).
5. **Case work:**
   * Cross-person inputs, and a warning when a filing others depend on is withdrawn (SA-1B-219).
   * Review items per programme (SA-1B-221).
   * A library form added to one filing (SA-1B-177).
   * A form's accuracy record (SA-1B-180).
   * A staff-only score on an Express Entry or provincial filing (SA-1B-204, needs B16).
   * Platform delivery steps with client labels (SA-1B-46, B26).
6. **Business rules with nothing enforcing them:**
   * BR-24, what a firm may change.
   * BR-25, quiet by default; BR-38, real value, not nudging.
   * BR-41, "Copy on emails" as the one exception to field scopes.
   * BR-43, a new case's programme pre-selected from the most binding source.
   * BR-25 and BR-38 are constraints rather than features. They become testable only once reminders exist.

### Placed in M4 or with the team without a decision (15 items with no capability; see questions 2 and 3)
* **M4 only by a backlog "proposal"**, which is not a decision:
  * Government steps, deadline rules and usual timelines (SA-1B-45, 96, BR-23, B11).
  * Country-specific requirements (SA-1B-103, B14).
  * "Still true?" for returning clients (SA-1B-132, 266, B13).
  * Form box signals across firms (SA-1B-178).
* **With the team**, by STANDARDS §9, P-271 and the backlog heading "items the team also owns today", not by a decision:
  * The firm overlay: hide, rename, the "ExpatReady updated an item you hid" note (SA-1B-270 to 273).
  * Fair share, paging and the load-test release gate (SA-1B-276 to 278).
  * Reading a firm's past filed forms (SA-1B-267).

### Capability but no test: none by the rule asked, but three weak spots
* By the rule in the brief (a test file names the capability in a label, its file name or its opening comment), **every capability an in-scope item maps to has a test**.
* **Nine capabilities have no test naming them at all**, and none of them is M2: C2.8, C2.9, C2.11, C3.9 and C9.4 are Parked, C6.7 and C6.8 are the team's, C7.4 is M4 and C9.3 is W6.
* **Three M2 capabilities scored Works are named only by qa's own walks, never by a CI regression suite:** C3.10 (never "box" on screen), C5.2 (the release page cannot skip submission or the expert's tick) and C11.17 (the Program structure pop-up).
  * Some of this behaviour is exercised by suites that do not name it: `check_w1_structure_browser.cjs` checks the "You are adding" preview.
  * The risk is real but small: a break could land without CI noticing. Confidence: medium.

### How deep "covered" is
The script counts "covered" when a capability exists and a test names it, which says nothing about how much of the requirement it delivers.

| Milestone | Covered | Full, every capability Works | Full, a capability Partial | Only part of the requirement | Capability not built yet |
|---|---|---|---|---|---|
| M2 | 141 | 45 | 8 | 88 | 0 |
| M3 | 77 | 2 | 4 | 61 | 10 |

* The 88 partial M2 items are listed below (table G6), each with the part not covered.
* About half say a point is "not stated in the capability text": what the capability promises falls short of the card. The point may still be partly built in code. **Treat those as gaps in what the capability promises, to be checked in the app, not as proven missing behaviour.**
* The rest name behaviour that was checked missing, such as edition accepted-until on cases, the per-number expert confirm, overflow rules and the 38 release errors of SA-1B-63.

## Questions for the tech lead (each with a recommendation; also posted on the PR)
1. **Change watch against P-65.**
   * The conflict: SA-1B-299 asks for a weekly "page changed" list and a news feed, and SA-1B-300 turns an entry into a draft. P-65's table (line 7) allows only "an optional listing alert … never download", while P-103 later lets the system download forms from canada.ca.
   * **Recommend:** treat the feed and the changed-page list as a listing alert that creates a To review item for a person, with no automatic draft. That fits P-65 and P-103.
   * Founder decision needed (AGENTS rule 2).
2. **M4 by proposal only.** B11, B13 and B14 call their milestones "proposals", and no decision places government steps, "Still true?" or country-specific requirements after M3.
   * **Recommend:** one decision line confirming M4 for B11, B13 and B14, or moving B11's deadline rule into M3 (the Visitor visa runtime needs a biometrics deadline).
3. **Team placements without a decision:** the firm overlay, scale (fair share, paging, load-test gate) and migration import.
   * **Recommend:** a decision line naming them as the team's under P-271 and STANDARDS §9, so they leave the gap list honestly.
4. **Built but missing from the capability list:** P-04 (left menu), P-58 (shared-draft line) and P-165 (Stand-in chips).
   * **Recommend:** add one capability each, named by the existing tests (`check_stand_ins.ts`, `check_uxa3_words_rules.ts`), or fold P-04 and P-58 into an existing capability's text.
5. **Three M2 Works capabilities with no CI suite:** C3.10, C5.2 and C11.17.
   * **Recommend:** move `tests/qa/check_qa1_release_bypass.ts` into the suites for C5.2, and name C11.17 and C3.10 in the labels of the suites that already exercise them. This is a test-only change at US$0.
6. **Decision numbers with no backlog item of their own:**
   * 29 numbers are cited inside other decisions but have no backlog item in `DECISIONS.md` or `decisions/`: P-02, 06, 09, 10, 16, 18, 19, 25, 29, 30, 31, 35, 45, 49, 51, 59, 64, 81, 89, 90, 91, 93, 98, 99, 100, 105, 107, 114 and 127.
   * Some are amended in force: P-45 by P-71, P-114 by a later decision, P-127 by P-128.
   * **Recommend:** the tech lead checks the older log (`ai-workers/decisions.md` or `archive/` on the Mac) and adds a pointer line for each, so this check can cover them next time.

## Method, and how sure this is
* **The items to check come straight from the files** (`v1_count.py --list`): every `#### SA-1…` card heading, `### BR-n` and `### Jn` in SA-01B v2.1, every `- **SA-1-n**` line in SA-01 v2.8 section 4, and every P-n line in `DECISIONS.md` and the `decisions/` files it points to. Shared lines are split ("P-17, P-15, P-14 …"), and so is P-177 inside P-176's line.
* **The mapping** (`V1-mapping.tsv`) was made by seven Sonnet readers. Each read its chunk in full against the 98 capabilities and the backlog, under one written brief: held, later and out of scope only with a decision cited; otherwise a gap.
* **The tester then checked the mapping:**
  * the code for every M2 "no capability" item: P-58, P-165 and P-04 were found built; the partial alternatives and provider fields were found for SA-1B-19 and 151;
  * every "later" item: four moved back to M3, because P-230 (8) defers only past the M2 gate;
  * every "held" item against P-251's text;
  * every "process" decision;
  * a random sample of 14 "full" mappings, all correct;
  * the 12 decisions the first extraction missed, mapped by the tester.
  * Lines the tester changed carry `+V1` in the reader column.
* **Tests:** a test file names a capability when the ID appears in a test label (`ok(…)`, `test(…)`, `it(…)`, `describe(…)`), in its opening comment, or in an acceptance file's name.
  * Also counted: a test file that qa's evidence for that capability cites by name and that exists.
  * Fixtures, setup and helper files are not tests.
  * Each test is marked suite (run by `run-suites.sh` on CI), acceptance (red until built), or qa walk.
  * The check finds tests; **it does not run them**. Whether they pass is V3's job.
* **Confidence:**
  * High for the item list and the counts (a script).
  * High for the M2 "no capability" list (each was checked against the code by keyword search).
  * Medium for "part" against "full": it is a judgment on capability text, and the notes say which.
  * Medium for the M3 gaps: the readers checked capability text and backlog, and the tester spot-checked the code for a few of them only.
* **Limits:**
  * The AG-xx epics, SA-02 to SA-12 and the CRM are outside the POC (P-70) and were not mapped.
  * The 17 "not placed" knock-ons and the open questions inside SA-01B were not mapped as items.
  * DEV-TASKS and the hand-over notes are the team's plans, not requirements.

## Files beside this report
* `v1_count.py`: lists the items, checks the mapping (refuses a missing line, an unknown capability or an unknown backlog item), finds the tests, counts, and writes the two tables and the generated part of this file. Re-run from the repository root: `python3 ai-workers/problem-1-pathway-setup-and-form-filling/product/reports/verify-2026-11-03/v1_count.py`.
* `V1-mapping.tsv`: one line per item, giving class, capabilities, backlog, fit, milestone, note and reader.
* `V1-capability-drafts.md` (follow-up, 3 Nov): draft capabilities with a testable "Done when" for every M2 gap and the top 10 M3 gaps, plus the gaps that need the founder first, each with a recommendation.
* `V1-table.csv` and `V1-table.html`: the full table, with requirement or decision → capability → test (file and label) → status, plus how deep the coverage is. The HTML has a filter box.

<!-- generated by v1_count.py: start -->

## Counts (printed by the script)

```
items: 537 (requirements 273, decisions 264); test files read: 387; capabilities: 98
  SA-01 requirement      out of scope                       36
  SA-01B business rule   covered                            27
  SA-01B business rule   held                               6
  SA-01B business rule   later                              1
  SA-01B business rule   no capability                      7
  SA-01B business rule   not a requirement                  2
  SA-01B business rule   out of scope                       1
  SA-01B card            covered                            79
  SA-01B card            held                               33
  SA-01B card            later                              3
  SA-01B card            no capability                      61
  SA-01B card            not a requirement                  9
  SA-01B journey test    covered                            7
  SA-01B journey test    held                               1
  product decision       covered                            119
  product decision       held                               12
  product decision       later                              4
  product decision       no capability                      2
  product decision       no capability (built, records gap) 3
  product decision       process (no capability expected)   111
  product decision       superseded                         13
by milestone (product items only):
  M2     covered                  141
  M2     no capability            26
  M2     no capability (built, records gap) 3
  M3     covered                  77
  M3     no capability            29
  M4     covered                  4
  M4     no capability            7
  team   covered                  1
  team   no capability            8
  T      covered                  9
part fit among covered or capability-but-no-test: 164
how deep is 'covered' (by milestone):
  M2     full fit, a capability Partial or not yet scored   8
  M2     full fit, every capability Works                   45
  M2     part of the requirement only                       88
  M3     capability not built yet                           10
  M3     full fit, a capability Partial or not yet scored   4
  M3     full fit, every capability Works                   2
  M3     part of the requirement only                       61
  M4     capability not built yet                           1
  M4     part of the requirement only                       3
  team   part of the requirement only                       1
  T      full fit, a capability Partial or not yet scored   1
  T      full fit, every capability Works                   3
  T      part of the requirement only                       5
test evidence kinds (capability x file): {'label': 516, 'opening comment': 78, 'cited in qa evidence': 51} {'suite': 455, 'qa walk': 121, 'acceptance': 69}
covered items with no CI suite test (only an acceptance test or a qa walk): 7 — P-05, P-128, P-63, SA-1B-268, SA-1B-34, P-133, P-142
capabilities named only by acceptance tests or qa walks (no CI suite): C1.3 (M3), C10.2 (M3), C11.17 (M2), C2.5 (Parked), C3.10 (M2), C5.2 (M2), C6.10 (T), C6.5 (M3), C9.2 (M3)
capabilities with no test naming them: 9 — C7.4 (M4, Not built), C2.11 (Parked, Not built), C2.8 (Parked, Not built), C2.9 (Parked, Not built), C3.9 (Parked, Partial), C9.4 (Parked, Not built), C6.7 (Team (P-271; was Later, P-129), Not built), C6.8 (Team (P-271; was Later, P-129), Not built), C9.3 (W6, Not built)
capabilities no requirement or decision maps to: C2.5, C2.8, C2.10, C2.11, C9.4, C10.2
```

### G1. M2: no capability (29)

| Item | Kind | What it asks | Backlog | What is missing (reader, checked by the V1 tester) |
|---|---|---|---|---|
| SA-1-31 | SA-01B card | Export and import of a map, all or nothing | B27 | No capability exports a field map to a spreadsheet and imports an edited one all or nothing; scheduled as B27. |
| SA-1-42 | SA-01B card | Every pack text has a value per language (with SA-1-43) | B20 | Pack texts per language edited side by side are not built; the studio keeps no per-language labels. B20 is unscheduled. Translator tooling is Release 2 per the card itself. |
| SA-1B-10 | SA-01B card | Lists are asked once | - | Lists asked once per person with dates, tags and live Same-as for the current address are not in any capability. |
| SA-1B-106 | SA-01B card | Upload size limit and file-name pattern per document type | - | Upload size limit and file-name pattern per document type are in no capability or backlog item. |
| SA-1B-107 | SA-01B card | The "Copy on emails" field group | - | No Copy on emails field group in the library; email behaviour is the team's (P-167); impact report says add as later, which is no decision. |
| SA-1B-108 | SA-01B card | The "Copy on emails" section on every individual row | - | No Copy on emails section on individual combinations, asked of the adult case client; no capability or backlog item. |
| SA-1B-11 | SA-01B card | Purposes | B1 | Purposes (current, for post, latest, all, date range) for list facts are not built; scheduled as B1. |
| SA-1B-110 | SA-01B card | Publishing blocks a row without the "Copy on emails" section | - | No Copy on emails section or publish check exists; email sending itself is the team's (P-167); the employer-variant part sits in the held corporate area. |
| SA-1B-153 | SA-01B card | Dates a document captures | - | Dates a document type captures (issue, expiry) and their confirmation at upload are in no capability; reading dates from documents is C6.5, not built. |
| SA-1B-190 | SA-01B card | Reference tables are content, not code | B17 | No capability lets a publisher define, change or retire reference tables with columns and key rules; scheduled as B17. |
| SA-1B-191 | SA-01B card | Table rows: upload, AI drafts, confirm the file once then only the changes | B17 | No capability uploads table entries, AI-drafts them with the cited page, or confirms a file once then only changes; scheduled under B17. |
| SA-1B-192 | SA-01B card | Table dates, versions and code systems | B17, R2 | No capability for table versions with in-force dates, lookup for a date or code-system mapping; fees as a dated table is R2. |
| SA-1B-195 | SA-01B card | Conditions that read a table or another person | B16, B17, SH3 | No capability lets a condition read a reference table value or another person's fact (principal's occupation level); resolver contract is SH3. |
| SA-1B-197 | SA-01B card | Scoring definitions: points grids, conversions, pass marks, caps | B16 | No capability authors points grids, conversions, pass marks or caps as definitions; scoring grids are B16 (size L). |
| SA-1B-20 | SA-01B card | A line picks a named set | B3 | A line picking a named set of a document type is not built; scheduled as B3. |
| SA-1B-200 | SA-01B card | Rebuild the practice engine's logic as pack content | B16 | No capability authors the Canada scoring content (language conversions, CRS, federal skilled worker, provincial calculators) with answer keys; part of B16. |
| SA-1B-210 | SA-01B card | Named line sets | - | No named line sets that many combinations include, with list of affected combinations before approval and detach; only copying a line between combinations exists. |
| SA-1B-295 | SA-01B card | Large tables: confirm the source once, then only the changes | B17 | No capability for file-based reference tables or the confirm-once then changed-entries-only flow; reference tables sit unscheduled in B17. |
| SA-1B-299 | SA-01B card | Change watch (day one): news feed and weekly "page changed" list | - | No feed read or weekly page-changed list; P-65 (7) allows only an optional listing alert, never fetching, so the card conflicts with it and goes to the founder. |
| SA-1B-300 | SA-01B card | A change-watch entry becomes a draft | - | No change-watch entry to classify and draft from; depends on SA-1B-299; AI drafting exists only per combination, not from a changed source. |
| SA-1B-301 | SA-01B card | Withdraw a version | B9 | Our Withdraw only cancels a waiting delete or retire (PRODUCT.md); withdrawing a published version and warning open filings are not built. |
| SA-1B-40 | SA-01B card | Next-review list, weekly email and publish warning | B22 | Next-review column, weekly content-team email and publish warning are unbuilt; scheduled only as B22 in the unscheduled requirements backlog. |
| SA-1B-6 | SA-01B card | Field groups | - | No field-group definition (members, shared scope, driven-by member) in any capability; the old composite type is not replaced. |
| SA-1B-92 | SA-01B card | Completeness view per country | - | No completeness view per country (startable, scorable, languages, forms without map, items past review, items without source) is in any capability. |
| P-04 | product decision | Left menu shows only this prototype's screens (PRODUCT.md §3); UI words follow PRODUCT.md §4. / | - | Built, not on the capability list: the left menu shows only this prototype's screens (To review, Programs, Shared library, History; web App.tsx); browser suites open it, but no capability names the menu. |
| P-159 | product decision | One co-pilot, in two steps (founder). One "Ask" panel on every page replaces scattered AI help. Step 1 explains and finds ("why is this field here?", "which combinations use IMM 5257?", "what is missi | B47 | No capability: one "Ask" co-pilot panel on every page that explains and proposes via To review is only in the backlog. |
| P-160 | product decision | Named workspace snapshots (founder). "Take snapshot" saves the whole configuration (shared library, Program structure, every combination's draft and releases) as a frozen, named copy; one is taken aut | B48 | No capability: named workspace snapshots, restore as a draft change, automatic before release and reset, are only in the backlog. |
| P-165 | product decision | Stand-ins are listed in one register and marked on screen (founder). Every place where our build stands in for another module the team owns (AG and SA epics), and every item moved out of our scope, ha | B49, X4 | Built, not on the capability list: Stand-in chips (web components/stand-in.tsx) checked against STAND-INS.md by tests/check_stand_ins.ts (backlog B49); no capability names it. |
| P-58 | product decision | 22 Oct Show shared draft scope at both levels. The global banner reports total changes and affected combination count; the release review gives each combination's own change count and release/hold st | - | Built, not on the capability list: the shared-draft line on every page counts unreleased changes and combinations and links to Review and release (web App.tsx DraftBar); tests e.g. check_uxa3_words_rules.ts; no capabili… |

### G2. M3: no capability (29)

| Item | Kind | What it asks | Backlog | What is missing (reader, checked by the V1 tester) |
|---|---|---|---|---|
| BR-18 | SA-01B business rule | Resolved items persist as instances | SH3 | No capability keeps resolved checklist items as instances with "no longer required", kept uploads and surviving approvals through a version move. |
| BR-24 | SA-01B business rule | What a firm may change, and zero setup | B23 | No capability lets a firm hide items, rename steps or mark "not applicable" with a reason; the firm overlay is B23. |
| BR-25 | SA-01B business rule | Quiet by default | B22, B24 | A constraint (warnings in the filing, no email or badge) rather than a feature; no capability states it; the weekly content-team email is B22. |
| BR-38 | SA-01B business rule | Real value, not nudging | B24, B11 | A constraint on pushed messages; no capability builds reminders at all, so nothing is pushed; the few pushed reminders belong to B11 and B24. |
| BR-41 | SA-01B business rule | Copy on emails: the one named exception to field scopes | - | No capability holds the copy-on-emails field groups or their section on the questionnaire; nothing schedules them. |
| BR-43 | SA-01B business rule | A new case's programme is pre-selected from the most binding source | - | C6.1 opens a case for a combination but nothing pre-selects the programme from a signed retainer, consultation or assessment. |
| SA-1B-104 | SA-01B card | A status document feeds a key date | B24 | No accepted status document filling a key date with officer confirmation; reading documents (C6.5) proposes facts but does not feed key dates. |
| SA-1B-152 | SA-01B card | "I don't have this" and "Alternative used" | - | Client I-don't-have-this switch to an alternative and the Alternative used flag for the officer are in no capability or backlog item. |
| SA-1B-156 | SA-01B card | The passport must outlast the permit | - | The passport-must-outlast-the-permit check against the requested end of stay is in no capability or backlog item. |
| SA-1B-157 | SA-01B card | Status document mark | B24 | The status-document mark and its key-date feed are not built; reminder data is B24 and the reminder engine is the team's. |
| SA-1B-177 | SA-01B card | A library form added to one filing | - | No capability lets an officer add a library form to one filing (mapped fills, unmapped gives blank PDF); no backlog item found. |
| SA-1B-180 | SA-01B card | Accuracy record | - | No capability shows a form's accuracy record (last answer-key test date, open notices, last corrected); the open-notices part depends on SA-1B-179 (held). |
| SA-1B-204 | SA-01B card | Calculate score on an Express Entry or provincial filing (staff only) | B16 | No capability calculates a staff-only case score with breakdown, rules date and levers on an Express Entry or provincial filing; needs scoring definitions (B16). |
| SA-1B-21 | SA-01B card | How a document's end of validity is known | - | P-230 (8) only defers validity fields to a later piece of work after the M2 gate" (M3); no capability or backlog item states how a document end of validity is known." |
| SA-1B-212 | SA-01B card | Start at any stage; "done before we started" | B10 | No way to open a case at a later stage and record earlier stages as done before we started with their key details. |
| SA-1B-214 | SA-01B card | Shared documents with providers | - | No document needed once with several default providers, one approval and already on file reuse; no backlog item schedules it. |
| SA-1B-217 | SA-01B card | Resolved items persist as instances | SH3 | No stored resolved items with stable identity that keep approvals and not-applicable across re-runs; only stale marks on changed facts exist. |
| SA-1B-219 | SA-01B card | Cross-person inputs and dependent filings | - | No pack list of cross-person inputs (principal's occupation level) and no Advisory when a filing others depend on is withdrawn. |
| SA-1B-22 | SA-01B card | What a document must outlive | - | P-230 (8) defers validity windows to a later piece of work after the M2 gate" (M3); nothing states what a document must outlive; no capability or backlog item." |
| SA-1B-221 | SA-01B card | Review items per programme | - | No review items per programme added to the reviewer checklist, ticked before filing; no backlog item schedules it. |
| SA-1B-233 | SA-01B card | Key-date types | B39, B24 | No key-date types (permit expiry, LMIA validity end) with reminder class and watch-after-close; P-151 (3) puts key dates in the library as data. |
| SA-1B-251 | SA-01B card | One time rule: structure is pinned, dated values are read at a named date | R2, S3, B17 | No capability reads values by date. Fees as a dated table (R2), the target filing date (S3) and look-up by date (B17) are scheduled; fee date, validity and edition rules are not built. |
| SA-1B-252 | SA-01B card | Dated values: how the resolver finds the value in force on a date | B17, R2 | No resolver finds the value in force on a date with in-force-from dates and overlap checks. Reference tables with look-up by date (B17) and dated fees (R2) are unscheduled or ready. |
| SA-1B-254 | SA-01B card | Moving a filing to a newer version: "What changes for this case" | B9, SH4 | What changes for this case before moving a case to a newer release is not built; B9 (adopt a published update, P-65) and the pin contract SH4 schedule it. |
| SA-1B-257 | SA-01B card | A withdrawn version raises a CRITICAL warning with one click to move | B9 | No warning or one-click move for a case on a withdrawn release. Not covered by L-SA3 as written; B9 adoption is the nearest row. |
| SA-1B-258 | SA-01B card | Hidden items, requested documents and pins | B23, B9 | Firm hide records and "Request a document" surviving a move to a newer version are not built; firm overlay B23 and adoption B9 are unscheduled. |
| SA-1B-46 | SA-01B card | Delivery steps are platform-standard | B26 | No platform-standard delivery steps with a client label per language; only a backlog item schedules it. |
| SA-1B-67 | SA-01B card | "Start next stage" | B10 | No Start next stage button that opens the next filing with the same people, deadline and Needs-you entry; multi-stage runtime is only a backlog item. |
| SA-1B-68 | SA-01B card | Where the journey stands, outcomes and after the decision | B10 | No route position chips, decision per filing with history, refusal re-routing, extra decision outcomes or after-decision part on a filing. |

### G3. M4: no capability (7)

| Item | Kind | What it asks | Backlog | What is missing (reader, checked by the V1 tester) |
|---|---|---|---|---|
| BR-23 | SA-01B business rule | Steps: government steps are protected; standard steps on employer files only; no ExpatReady to-do lists | B11, B12, B26 | Government steps with calendar-day deadlines, protected from hiding, and employer standard steps have no capability; B11 schedules them as M4. |
| SA-1B-103 | SA-01B card | Country-specific requirements (pack content) | B14 | Country-specific requirement entries beside a document or form are not built; backlog B14 proposes M4, no decision cited. |
| SA-1B-132 | SA-01B card | "Still true?" re-confirmation rule per field | B13 | No per-field Identity or Changeable rule; backlog proposes M4 for returning-client reuse, no decision cited. |
| SA-1B-178 | SA-01B card | Form box signals | B28 | No capability counts officer hand-fixes, Validate failures or feedback across firms; closest input is B28 report-a-mapping-problem (M4, P-73). |
| SA-1B-266 | SA-01B card | Returning clients: reuse inside the same firm with "Still true?" | B13 | Reuse of a returning client's earlier facts with "Still true?" is not built. Backlog B13 places it in M4; no decision cited. |
| SA-1B-45 | SA-01B card | A government step in the library | B11 | No library of government steps with staff and client names, phase, never hidden; B11 is proposed for M4, no decision cited. |
| SA-1B-96 | SA-01B card | Deadline rule and usual timeline | B11 | No deadline rule (anchor, direction, length, unit) that pre-fills a due date the officer confirms; B11 proposes M4, no decision cited. |

### G4. team: no capability (8)

| Item | Kind | What it asks | Backlog | What is missing (reader, checked by the V1 tester) |
|---|---|---|---|---|
| SA-1B-267 | SA-01B card | Migration: reading a firm's past filed forms | - | Reading a firm's past filed forms on import is not built and has no backlog item; the card places the import screens with the team's AG-18. |
| SA-1B-270 | SA-01B card | What a firm may change, and what it may not | B23 | The fixed list of firm changes (hide, rename, request a document) is not built. B23 sits under "items the team also owns today"; STAND-INS SI-11 keeps firm adoption with the team. |
| SA-1B-271 | SA-01B card | Hide a standard item that has no deadline | B23 | Hiding a standard item without a deadline from a firm's new filings is not built; firm overlay B23 is unscheduled. |
| SA-1B-272 | SA-01B card | Rename a client name or step label | B23, B26 | Firm renaming of client names and step labels is not built; B23 and delivery-step labels B26 are unscheduled. |
| SA-1B-273 | SA-01B card | "ExpatReady updated '…', which you've hidden. Review?" | B23 | The "ExpatReady updated an item you hid" note is not built; it depends on the hide list (B23). |
| SA-1B-276 | SA-01B card | Heavy work runs as background jobs with a fair share for each firm | - | Background jobs with a fair share per firm are not built; no capability or backlog item. P-271 leaves multi-tenancy and tenant isolation with the team. |
| SA-1B-277 | SA-01B card | Every list is firm-scoped, keyset-paged and indexed | - | Firm-scoped, keyset-paged, indexed lists are not built; STANDARDS §9 gives scale work to the team and the studio is single-workspace. No row. |
| SA-1B-278 | SA-01B card | Performance budgets and a load test as a release gate | S6 | Load-test release gate with 300 ms read and 600 ms write budgets is not built; S6 only aligns scale numbers (1,023 ms cached is over budget). |

### G5. Capability but no test (0)

None.

### G6. M2: a capability covers only part (88)

| Item | Capabilities | qa status | The part not covered |
|---|---|---|---|
| BR-1 | C3.1, C3.5, C3.13, C4.10 | C3.1 Works, C3.5 Works, C3.13 Works, C4.10 Works | One shared field per fact is built (aliases, merge, where used, one source per combination); scope, "still true?" rule and privacy mark on the field are missing. |
| BR-10 | C11.14, C3.1, C3.2, C11.13 | C11.14 Partial, C3.1 Works, C3.2 Works, C11.13 Works | Setup AI proposes, an independent checker and the rules check, and a person confirms; the firm's Reader on client documents (C6.5) is not built. |
| BR-11 | C11.13, C11.8, C3.6 | C11.13 Works, C11.8 Partial, C3.6 Works | Setup AI is off by default and everything works typed by hand; the Reader-off paths on a case (officer types beside the scan, one Confirm and use) are not built. |
| BR-12 | C5.4, C5.5, C5.7, C5.1, C5.3 | C5.4 Works, C5.5 Works, C5.7 Works, C5.1 Partial, C5.3 Works | Every number needs a source, a passing signed answer-key test is needed, and a second person approves; bulk accept for clean reuse (C3.2) differs from "no approve all" and is held (P-121 vs SA1B-D77). |
| BR-13 | C11.13, C3.13 | C11.13 Works, C3.13 Works | Items are versioned with made-by and the library shows origin (AI or person); that a hand edit clears Checked marks and reports count AI against person items is not stated. |
| BR-20 | C4.4, C6.9, C3.10 | C4.4 Works, C6.9 Works, C3.10 Works | Questions and gates are data in one renderer and wording is not coded; the immigration-token gate in code and "no message wording in the pack" have no capability. |
| BR-21 | C4.3 | C4.3 Works | Client wording is drafted from the official form text and reviewed (C4.3), but no capability checks that client text names no regulator or "required by law". |
| BR-3 | C3.5, C3.7, C3.16 | C3.5 Works, C3.7 Works, C3.16 Not built | Keys are generated and retired items stay in history; list entries get stable ids when C3.16 is built; code-system crosswalks (NOC 2021 to 2026) are not covered. |
| BR-33 | C5.5, C5.7, C9.1 | C5.5 Works, C5.7 Works, C9.1 Partial | Prevent is built (signed answer-key test per map); detect, box notices and re-fill of draft forms are not; reporting a mapping problem is B28; D100 corrections are held. |
| BR-36 | C5.3, C3.3, C11.14 | C5.3 Works, C3.3 Works, C11.14 Partial | To review lists every waiting item and a failed AI run keeps good entries visible; "Could not read" sources and the "3 of 3 AI items checked" count are not stated. |
| BR-40 | C5.4, C5.5, C5.1, C5.6, C5.2 | C5.4 Works, C5.5 Works, C5.1 Partial, C5.6 Works, C5.2 Works | Missing source and missing answer-key test refuse release; other publish errors (AI item not Checked, Unconfirmed number, box entry Proposed) are not shown in any capability. |
| SA-1-28 | C2.1, C7.6, C9.1 | C2.1 Works, C7.6 Partial, C9.1 Partial | Edition date and official file are read on upload; the warning that a case uses a non-current edition and the officer's re-bind exist only as ready-to-file warnings and B9. |
| SA-1-29 | C3.1, C3.2, C3.12 | C3.1 Works, C3.2 Works, C3.12 Works | Field map is reviewable data per edition; versioning, edit-as-new-draft and published maps never changing are not stated in any capability. |
| SA-1-30 | C3.8, C3.1, C5.5 | C3.8 Works, C3.1 Works, C5.5 Works | Validator checks every form field and option is mapped, type enforced in code, missing answer key blocks; checks on whose fact, which entry of a list and box kind are absent. |
| SA-1B-1 | C3.15, C3.5, C3.6, C3.1 | C3.15 Works, C3.5 Works, C3.6 Works, C3.1 Works | Shared fields have type, format, aliases, versioned rename and keys never typed; scope, fallback source, still-true rule, privacy mark; must-verify flag held (L-SA8, P-251). |
| SA-1B-102 | C1.8, C1.6 | C1.8 Works, C1.6 Works | Form line sets copies, minimum age, who signs and channel; signature method (electronic or ink), country variant, who completes, and unset-means-signature-needed (S1) are not stated. |
| SA-1B-111 | C3.8 | C3.8 Works | Loops and unreachable conditional questions block submission; the rule that a condition may read only earlier questions in order is not stated. |
| SA-1B-13 | C4.1, C3.13, C3.4 | C4.1 Works, C3.13 Works, C3.4 Partial | Sections are library items with one title, order per combination, where-used and AI drafting; estimated minutes (B5) and the None-of-these-apply background block are missing. |
| SA-1B-131 | C4.10, C4.9 | C4.10 Works, C4.9 Works | One source per fact (Document, Client or Case officer) exists per combination; the separate fallback source and the two publish warnings are missing. |
| SA-1B-133 | C3.15, C3.5, C3.6, C3.7 | C3.15 Works, C3.5 Works, C3.6 Works, C3.7 Works | Keys never typed, rename versioned, aliases and merges, retire keep history; crosswalk entries between code systems and the Use the new code step are missing. |
| SA-1B-14 | C4.4, C3.14, C3.4 | C4.4 Works, C3.14 Works, C3.4 Partial | Rules as data show and hide questions, are listed read-only and AI-drafted; require, make-optional and add-a-document-from-an-answer effects are not evidenced. |
| SA-1B-15 | C4.4 | C4.4 Works | The renderer repeats groups; the coverage rule with period, gap and explanation question, and the unexplained-gap warning, are not built. |
| SA-1B-150 | C3.13 | C3.13 Works | Document types carry a category and are listed; the fixed list of 11 categories, pick-a-category refusal and checklist grouping by category are not stated. |
| SA-1B-151 | C6.4 | C6.4 Partial | V1 tester: each document line stores who provides it and the case checklist uses it (C6.4); default provider roles, shared documents and the under-18 rule are not built or scheduled. |
| SA-1B-154 | C4.5, C4.10, C6.5 | C4.5 Works, C4.10 Works, C6.5 Not built | A document that supplies facts takes them out of the SQR until missing, and facts have a Document source; reading and Confirm and use (C6.5, L-SA7 held) is not built. |
| SA-1B-159 | C3.13, C3.4, C11.9 | C3.13 Works, C3.4 Partial, C11.9 Works | Document types list with where used, origin and AI drafting exists; grouping by 11 categories, search, version compare and bulk spreadsheet import are not evidenced. |
| SA-1B-17 | C3.13, C11.9, C3.14 | C3.13 Works, C11.9 Works, C3.14 Works | Where used shows on fields, sections, document types and rules before removal; answer lists and field groups have no where-used; three computations to merge (SH2). |
| SA-1B-171 | C2.1, C3.1 | C2.1 Works, C3.1 Works | XFA boxes are listed for mapping; no capability states rejection naming the unsupported feature, or the per-edition form description (Validate button, barcode container) confirmed by a publisher. |
| SA-1B-172 | C3.2, C3.1, C3.8 | C3.2 Works, C3.1 Works, C3.8 Works | Reviewer accepts, edits or rejects each proposal beside the source; filters by changed or carried, next-unconfirmed, full-form preview with a made-up family, and import/export are missing. |
| SA-1B-18 | C3.13, C3.4 | C3.13 Works, C3.4 Partial | Document types have name, category, supplied facts, AI drafting and retire; formats, translation, notarised copy, handling class, per-language client wording, marks missing (L-doc, P-230 (8)). |
| SA-1B-19 | C6.4 | C6.4 Partial | V1 tester: a document line already carries an unordered list of alternatives shown on the case checklist (C6.4); named sets, order, any-one or all-together modes and when-acceptable wording are not built (B3). |
| SA-1B-193 | C5.4, C3.14 | C5.4 Works, C3.14 Works | Release is refused for numbers without a source entry and the rules list shows source and where used; the staff marker beside each number (source, date checked, version) is not stated. |
| SA-1B-194 | C3.14, C4.4, C6.9, C1.8 | C3.14 Works, C4.4 Works, C6.9 Works, C1.8 Works | Conditions and gates are data with a minimum age on a date; 'between', 'can't check' naming the missing input, and one condition language are not stated (SH1 merges helpers). |
| SA-1B-201 | C4.2, C4.7, C4.8 | C4.2 Works, C4.7 Works, C4.8 Works | PQR questions are marked from the SQR per combination, AI-drafted, released with it; country PQR as a view (P-132) and warning on unasked gate inputs are not stated; prospect delivery is the team's. |
| SA-1B-211 | C1.6, C1.7 | C1.6 Works, C1.7 Works | Filing method and portal are set per combination; missing the authority (IRCC, ESDC) on every combination and the refusal when portal or authority is absent. |
| SA-1B-26 | C2.1, C2.4, C3.12 | C2.1 Works, C2.4 Works, C3.12 Works | Library holds form code, edition, published date and new-edition holds; capabilities do not state accepted-until, edition kind, or the rule picking the current edition on a given day. |
| SA-1B-27 | C3.1, C3.8 | C3.1 Works, C3.8 Works | Field map links form field to shared field with option maps and list purpose; no whose-fact or combination per box, no declaration or signature box kind; overflow warning only in B1. |
| SA-1B-290 | C5.4 | C5.4 Works | Sources panel and the release gate on numbers exist; register fields (kind, authority, weekly check rhythm, retire, cited-entry delete refusal) are not stated by any capability. |
| SA-1B-291 | C3.4, C11.14, C11.8, C4.11 | C3.4 Partial, C11.14 Partial, C11.8 Partial, C4.11 Partial | AI drafts sections, document types, rules and lists (Partial, awaiting saved runs), off by default; fees, steps, tables and a Not-found-in-source list are not drafted. |
| SA-1B-292 | C3.13, C11.13 | C3.13 Works, C11.13 Works | Lists show origin (AI or person) and changes are versioned with made-by; no AI-draft-edited mark clearing Checked, and no Content made by report. |
| SA-1B-293 | C3.2, C5.3, C11.14 | C3.2 Works, C5.3 Works, C11.14 Partial | Reviewer accepts, edits or rejects each proposal on To review; submit gate on unchecked AI items missing; bulk accept held (P-121 against SA1B-D77, P-251). |
| SA-1B-294 | C5.1, C5.4 | C5.1 Partial, C5.4 Works | Expert ticks at release and each number needs a source; no per-number Confirm click with name and date, no n-of-m confirmed count, no edit-clears-confirmation. |
| SA-1B-298 | C5.4 | C5.4 Works | In-force dates need a source (P-279); inForceFrom and inForceTo on a rule change and the Use newer rules warning on open filings are not built. |
| SA-1B-33 | C3.1, C9.1, C3.2, C3.3 | C3.1 Works, C9.1 Partial, C3.2 Works, C3.3 Works | AI maps boxes and new-edition comparison exists; carrying confirmed entries forward by identical path and label is missing; bulk accept for clean reuse sits against SA1B-D77 (held). |
| SA-1B-38 | C5.1, C5.3, C5.2, C5.5 | C5.1 Partial, C5.3 Works, C5.2 Works, C5.5 Works | A different person approves and releases, gates cannot be bypassed; approver does not see per-item made-by, Checked and Confirmed marks or before/after on sample families. |
| SA-1B-39 | C5.4 | C5.4 Works | Every published number needs a source or None published; date checked, next review, quoted line and source on non-number items are not covered. |
| SA-1B-4 | C3.8, C3.4 | C3.8 Works, C3.4 Partial | Options are checked as mapped per channel and AI drafts answer lists; retired values shown, per-language labels, table-filled and versioned lists not covered. |
| SA-1B-50 | C11.3, C11.17, C1.2, C11.9 | C11.3 Works, C11.17 Works, C1.2 Works, C11.9 Works | Structure page adds and renames levels with duplicate checks and retire, restore and reorder; the Express Entry-aligned label on provincial streams is not stated (we use five levels). |
| SA-1B-57 | C1.5, C1.8, C4.10, C3.11 | C1.5 Works, C1.8 Works, C4.10 Works, C3.11 Works | Section, document and form lines exist with copies, age and signer; missing government step and review item kinds, for-whom providers, order, and generated reason on every resolved item. |
| SA-1B-61 | C1.5, C4.3, C4.6, C1.1 | C1.5 Works, C4.3 Works, C4.6 Works, C1.1 Works | Copy a line, add or remove across many combinations, and preview a made-up family exist; missing the all-combinations by location view highlighting empty cells. |
| SA-1B-63 | C5.1, C5.4, C5.5, C3.8, C5.2 | C5.1 Partial, C5.4 Works, C5.5 Works, C3.8 Works, C5.2 Works | Blocks exist for no source, no answer key, empty combination, loops and unreachable questions; most of the 38 errors and 13 warnings (review date, copy section, document sets) have no capability. |
| SA-1B-7 | C4.1, C4.3, C3.8 | C4.1 Works, C4.3 Works, C3.8 Works | SQR placements with AI-drafted client wording and a check against hiding a value a form reads exist; help text, hide-optional-members and no-default-answer not evidenced. |
| SA-1B-72 | C11.12 | C11.12 Works | Person roles per combination with maximum counts exist; missing the pack list of relationship kinds with inverses and order, and dependsOnRole. |
| SA-1B-90 | C5.1, C6.1 | C5.1 Partial, C6.1 Works | Release needs a document and a form line, and a case opens only on a startable combination; missing the per-location check, current-edition check and role-section check. |
| SA-1B-91 | C11.10, C1.4 | C11.10 Works, C1.4 Works | Each combination shows its setup steps, status and one next step; no single list of every combination not ready to start with all that is missing and an N-of-M startable count. |
| P-05 | C3.10 | C3.10 Works | UI words follow PRODUCT.md §4: C3.10 enforces form field, shared field and field map (never box); the rest of the word list (P-271 names, K13) is not one capability. |
| P-108 | C11.7, C10.1 | C11.7 Partial, C10.1 Partial | Reset empties configuration and Load sample adds the structure and PDFs with replayed AI proposals; both capabilities are Partial (Provincial nominee map, demo steps 9-12 wait for a release). |
| P-109 | C11.7 | C11.7 Partial | Ontario PNP from the paper twins with the nomination certificate document: part B of C11.7 is still red. |
| P-110 | C11.8, C2.12 | C11.8 Partial, C2.12 Works | Live steps, progress bar, plain errors, Stop and cost logged are built; C11.8 is Partial (live proof of every AI step not complete). |
| P-12 | C3.14, C4.4, C1.8 | C3.14 Works, C4.4 Works, C1.8 Works | Rules are data on fields, sections and combination lines and listed read-only; a shared check with a different value per combination is not stated by any capability. |
| P-121 | C11.14, C3.2 | C11.14 Partial, C3.2 Works | Draft and checker rounds, High-only bulk accept with one Undo built; C11.14 Partial: field-map Ready items on To review (AT-4) wait for G-CORE B5. |
| P-130 | C4.5, C4.10, C4.11 | C4.5 Works, C4.10 Works, C4.11 Partial | Document-first source per fact, Pre-qualification tick, documents not asked in the SQR built; the seven-step draft run C4.11 is Partial (step 5 saves no conditions). |
| P-131 | C4.11 | C4.11 Partial | Live trial of all seven Draft questions and documents steps with saved results after; C4.11 Partial (14 of 23 checks on Visitor visa). |
| P-139 | C11.8 | C11.8 Partial | US$120 experiment cap with each new step run once live is in C11.8, which is Partial; P-179 adds Continue or Cancel at a limit. |
| P-14 | C4.4, C3.14, C7.5 | C4.4 Works, C3.14 Works, C7.5 Not built | Field and consistency checks are data run by the engine (C4.4, C3.14); the staged AI review (C7.5) is not built; promoting recurring AI findings to checks is not stated. |
| P-143 | C1.6, C8.1, C7.7 | C1.6 Works, C8.1 Partial, C7.7 Partial | Four channels with a separate signature value: C1.6 text says the contract still has three channels; per-form accepts by edition and account partly built. |
| P-148 | C11.7, C11.3 | C11.7 Partial, C11.3 Works | Load sample shows only the agreed six combinations with the P-112 names; C11.7 is Partial (Provincial nominee map red). |
| P-149 | C11.14, C11.13, C3.5 | C11.14 Partial, C11.13 Works, C3.5 Works | One door for every proposal, identity rule, versioned items and example cases on rules; C11.14 is Partial and the guarded Add pattern is held (P-251, P-252). |
| P-150 | C1.8, C1.6, C3.8 | C1.8 Works, C1.6 Works, C3.8 Works | Copies, age and signers per line, signature value and per-channel option maps exist; edition attributes, country variants, code lists and length rules are scheduled in W1-16. |
| P-152 | C11.11, C7.3, C7.4 | C11.11 Works, C7.3 Partial, C7.4 Not built | Online-only forms are flagged and brought in by AI or a screen copy, answer sheet follows the PDF twin; extension fill is M4 (P-245). |
| P-156 | C11.11, C11.2, C2.6 | C11.11 Works, C11.2 Works, C2.6 Works | Library-first with a checklist page per combination read into document lines; the library filled once from IRCC's master forms list at US$0 has no backlog item text. |
| P-158 | C3.6, C11.14, C3.8, C4.10 | C3.6 Works, C11.14 Partial, C3.8 Works, C4.10 Works | Items come from a source and completeness is checked per combination; P-252 supersedes "no free Add" and its guarded Add is held (P-251). |
| P-170 | C5.4, C5.6 | C5.4 Works, C5.6 Works | Release refused without a source entry and Sample content kept to the demo are built; a per-value "Source: page, date" label on screen has no capability or backlog item. Research method is process. |
| P-177 | C11.10, C5.3 | C11.10 Works, C5.3 Works | Setup checklist v3: n proposals opens the form page or filtered queue; typed people lists confirmed by author. Board v3 changes the founder asked for are not stated yet. |
| P-193 | C5.3 | C5.3 Works | Only the proposer corrects a field returned for changes; capability states the maker cannot approve their own item but not this return-and-correct rule. |
| P-194 | C11.8 | C11.8 Partial | One Continue covers retries of the same run within the accepted worst case; capability text names Continue but not retries. |
| P-216 | C4.1 | C4.1 Works | Section order movable per combination and one library title everywhere are built; the "Ask it in..." action on a gap line is a later slice. |
| P-23 | C5.1, C6.1 | C5.1 Partial, C6.1 Works | The whole workspace releases together and a case opens only on a released combination; the startable check at case opening is backlog item S4 (built, PR pending per BACKLOG). |
| P-273 | C11.10, C5.3 | C11.10 Works, C5.3 Works | Trust fixes: counts agree across screens, inbox shows blockers, one status, no internal identifiers; backlog item UX-A is the work fixing them. |
| P-274 | C10.1, C4.3 | C10.1 Partial, C4.3 Works | Demo walkability and AI-drafted client wording join M2; phone width (UX-C) and review grouping (UX-F) wait "After the M2 gate". |
| P-287 | C11.10, C5.3, C11.14 | C11.10 Works, C5.3 Works, C11.14 Partial | Programs "Needs you" counts the same items as To review; draft blockers count; no AI proposal Ready without both rounds and rules (C11.14 Partial). |
| P-288 | C11.10, C11.14, C3.2 | C11.10 Works, C11.14 Partial, C3.2 Works | Programs counts combinations, To review counts items, each count named; Ready field-map items tick in bulk on To review. C11.14 still needs paid checker runs. |
| P-32 | C2.1, C2.4, C9.1, C3.12 | C2.1 Works, C2.4 Works, C9.1 Partial, C3.12 Works | Sources enter by upload, code, edition and checksum read without AI, same file and new edition handled; AI impact assessment of a new edition is missing (C9.1). Reset and loaders are scaffolding. |
| P-38 | C2.4, C9.1, C3.1, C11.15 | C2.4 Works, C9.1 Partial, C3.1 Works, C11.15 Works | Replace or remove forms, edition comparison without AI and AI mapping of changed fields exist; AI impact on components and combinations (C9.1) is missing. |
| P-43 | C3.2, C5.1, C5.2, C3.10, C6.2, C7.6 | C3.2 Works, C5.1 Partial, C5.2 Works, C3.10 Works, C6.2 Works, C7.6 Partial | Bulk accept for high-confidence only with Undo, submit/approve/expert-tick release, one glossary and day-month-year dates exist; filled-form review page with Next issue (C7.5) is not built. |
| P-61 | C1.6, C3.11, C8.2, C1.7 | C1.6 Works, C3.11 Works, C8.2 Partial, C1.7 Works | Per-line channel, derived filing method, signed-scan lines and filing record exist; online versions with portal re-check are parked (P-102); filing record is partial (C8.2). |
| P-62 | C3.1, C4.1, C4.6, C3.11, C7.7, C1.6, C3.5 | C3.1 Works, C4.1 Works, C4.6 Works, C3.11 Works, C7.7 Partial, C1.6 Works, C3.5 Works | Shared fields as root, questionnaires from facts, per-channel outputs and Prepare application built; online screen maps and extension fill are parked (P-102, M4). |
| P-76 | C4.2, C4.7, C4.8, C6.7 | C4.2 Works, C4.7 Works, C4.8 Works, C6.7 Not built | PQR picks per combination, AI-drafted with reasons, released with the combination built; country-level PQR and prospect use are the team's runtime (P-271). |

### G7. M3: a capability covers only part (61)

| Item | Capabilities | qa status | The part not covered |
|---|---|---|---|
| BR-16 | C6.1, C6.12 | C6.1 Works, C6.12 Partial | A case is pinned to the release it opened on; moving the pin forward with one reason, everyone together, is B9; the per-filing pin is design-only (L-SA13). |
| BR-17 | C6.1, C6.12, C9.2 | C6.1 Works, C6.12 Partial, C9.2 Not built | Open cases stay on their release so a publish recalculates nothing, and a changed fact marks items stale; resolving each filing on its own triggers is the resolver contract (SH3). |
| BR-22 | C6.4 | C6.4 Partial | Document checks warn at checklist level; key dates, status expiry reminders at 30/15/7/2 days and one-date-one-reminder are not built (B24, reminder engine stays the team's). |
| BR-26 | C6.10, C6.2 | C6.10 Works, C6.2 Works | Principal answers for an adult wait for confirmation; "Keep private from the principal", Send to, minors and reuse only within a firm are B8 and B13. |
| BR-31 | C7.1, C7.2, C7.3, C7.7 | C7.1 Works, C7.2 Partial, C7.3 Partial, C7.7 Partial | Fill, answer sheet and the Adobe Validate round trip exist for the mapped forms; the viewer only after an edition's trial, and "Approve filing" as a batch with one record per form, are not built. |
| BR-39 | C6.6, C6.5, C6.3 | C6.6 Works, C6.5 Not built, C6.3 Works | Source and status per fact and Confirm and use are written; must-verify before filing (L-SA8) and staff entries counting as verified (SA1B-D89, D107) are held by P-251. |
| BR-4 | C7.6, C6.6, C6.4 | C7.6 Partial, C6.6 Works, C6.4 Partial | Only a barcode form's Validate blocks and other problems become CRITICAL warnings passed with a reason, but that is not built; ready-to-file warnings are held by P-251 (L-SA3). |
| BR-42 | C6.12 | C6.12 Partial | Fee lines carry a basis (per application, per person by role, per position) and a total; our P-247 family maximum differs from "pack holds no family-cap rule"; retainer estimates are not built. |
| BR-6 | C1.8, C4.9, C7.1, C7.3, C7.4 | C1.8 Works, C4.9 Works, C7.1 Works, C7.3 Partial, C7.4 Not built | Declarations stay with the client and signatures stay intact, and the extension never fills them; the signedBy and signature method values per line and the representative's own-box signing are not stated. |
| BR-8 | C6.9, C7.6, C6.4 | C6.9 Works, C7.6 Partial, C6.4 Partial | Gates show not answered and missing facts warn, but "Can't check" as a third result with the missing input named, and the "N things can't be checked" count, are not built. |
| BR-9 | C6.6, C6.5, C6.10, C4.10 | C6.6 Works, C6.5 Not built, C6.10 Works, C4.10 Works | Three sources are tracked (Declared, document proposal, officer) but Confirm and use per document and the earlier-case carry are not built; L-SA6, L-SA7 and L-SA8 are held by P-251. |
| SA-1B-105 | C6.4 | C6.4 Partial | C6.4 checks a police certificate is no older than 6 months on the case checklist; issued-within-N-months as a rule per document type and programme is not built (P-230 (8): after the M2 gate). |
| SA-1B-155 | C6.4 | C6.4 Partial | C6.4 has one hard-coded recency check; the validity check against the case target filing date is not built (P-230 (8) puts the fields after the M2 gate). |
| SA-1B-173 | C7.3, C7.7 | C7.3 Partial, C7.7 Partial | Portal sheet lists answers in portal order with copy buttons; section headings and order for PDF answer sheets and 'Empty, fill by hand' lines are not stated. |
| SA-1B-196 | C6.9, C3.14, C5.5 | C6.9 Works, C3.14 Works, C5.5 Works | Gates give Qualifies, Can't tell yet or Does not qualify with what is missing and rules-as-at; advisory severity, value needed, pass-mark join and gate authoring are not stated. |
| SA-1B-198 | C6.9 | C6.9 Works | Case check shows 'rules as at' the release date; rule changes entered with an in-force date and reproducible stored results are not stated. |
| SA-1B-215 | C6.3, C6.4, C11.12 | C6.3 Works, C6.4 Partial, C11.12 Works | Facts and checklist per person exist but spread across four files; missing one resolver per subject per filing with reasons and waiting-for; organisation subject is design-only. |
| SA-1B-216 | C6.4 | C6.4 Partial | A per-person dynamic checklist exists; missing the four layers each labelled, officer-added items on one filing, client extras, and no longer required with uploads kept. |
| SA-1B-218 | C7.6 | C7.6 Partial | Missing or conflicting facts raise a CRITICAL warning; missing the visible Can't check state for every unevaluable condition, count per filing and rule that unknown is never a pass. |
| SA-1B-220 | C6.3, C9.2 | C6.3 Works, C9.2 Not built | An edited fact updates draft outputs and marks items stale; missing the rule that only the changed filing recomputes, age checks at fixed moments and coalescing. |
| SA-1B-250 | C6.1 | C6.1 Works | Each case is pinned to the release it opened on. A pin per filing, with Start next stage and side-by-side rules, is design-only (P-246 (2), P-251). |
| SA-1B-256 | C7.2 | C7.2 Partial | Trial status per edition is scheduled (S2, fill-trial gate). Box notices and the accuracy record are not built; hold against notices is held with no backlog item (P-73 vs SA1B-D75, P-251). |
| SA-1B-260 | C6.3, C6.6, C3.16 | C6.3 Works, C6.6 Works, C3.16 Not built | Facts per person show source, status, history and refuse a stale save. Spouse, household, filing and organisation subjects and source kind are missing (L-SA4 waits; design-only, P-251). |
| SA-1B-262 | C4.5, C6.5 | C4.5 Works, C6.5 Not built | An upload is a checklist line and a document's facts leave the questionnaire. Hiding questions only when AI reads the document needs the reader C6.5 (P-256, M3). |
| SA-1B-269 | C3.16, C6.10 | C3.16 Not built, C6.10 Works | Field scope (L-SA4) and live-link marks are not built. Adult privacy and the code-verified link are B8; confirmation by who answered exists (C6.10). |
| SA-1B-275 | C6.1 | C6.1 Works | A publish leaves open cases untouched because each is pinned (C6.1). Triggers that recalculate only one filing on open or fact change are not built. |
| SA-1B-28 | C6.3, C6.6 | C6.3 Works, C6.6 Works | Agent view shows each fact with source and status per person; the per-box trace on the form (which fact, whose, fix mark) is not stated. |
| SA-1B-29 | C3.8, C7.6, C7.1 | C3.8 Works, C7.6 Partial, C7.1 Works | Unmapped fields are caught at authoring and missing facts warn at ready-to-file; no per-box status or 'N required boxes are empty' count before fill. |
| SA-1B-30 | C4.9, C1.8, C8.1 | C4.9 Works, C1.8 Works, C8.1 Partial | Declarations stay with the client and form lines state who signs; not stated: declaration and signature boxes never ticked, nor the representative's one-click stored signature. |
| SA-1B-47 | C6.11 | C6.11 Works | A Sample firm shows representative licence body and number; missing the pack regulator setup of types, licensing bodies and licence-number formats checked against pass and fail samples. |
| SA-1B-52 | C6.12 | C6.12 Partial | Fee lines with a basis per application, role or position are derived on a case; missing is the authored fee list on the combination, dated fee table, estimate counts and per-person display. |
| SA-1B-64 | C6.12, C6.1 | C6.12 Partial, C6.1 Works | Filings are derived per case with own fee and application number; missing a Filing record with own pin, decision and case owner transfer; pin per filing is design-only. |
| SA-1B-66 | C1.2 | C1.2 Works | P-24 makes Express Entry stages sub-categories in order; missing allowed next stages, repeat, key details, editable after submit and the event that offers the next stage. |
| SA-1B-75 | C6.2, C6.10, C3.16 | C6.2 Works, C6.10 Works, C3.16 Not built | Each fact asked once and minor answers by the principal exist; missing household and filing scopes (L-SA4, design-only), live Same as address, age checks at fixed moments and turned-18 notice. |
| SA-01B J1 | C6.1, C6.2, C6.4, C6.5, C6.6, C6.10, C6.12, C7.1, C7.3, C7.6, C7.7, C11.12 | C6.1 Works, C6.2 Works, C6.4 Partial, C6.5 Not built, C6.6 Works, C6.10 Works, C6.12 Partial, C7.1 Works, C7.3 Partial, C7.6 Partial, C7.7 Partial, C11.12 Works | Case, three filings, client link, checklist, fill and sheet exist; missing: programme pre-selection, Send to adult, offer number step, passport review, officer fix, Approve filing batch, target date, "no longer required… |
| SA-01B J3 | C6.1, C6.12, C11.12, C7.1, C7.3, C6.2 | C6.1 Works, C6.12 Partial, C11.12 Works, C7.1 Works, C7.3 Partial, C6.2 Works | Sponsor and spouse roles, two filings in one group and filling exist; missing: whose-fact boxes by relationship, document sets with alternatives, Send to the spouse, signing rule per line. |
| SA-01B J6 | C5.4, C5.5, C5.3, C9.1, C9.2 | C5.4 Works, C5.5 Works, C5.3 Works, C9.1 Partial, C9.2 Not built | Number sources and signed tests gate release; missing: change watch, rule change against correction, Use newer rules, correction reaching open filings (held, D100), withdraw and rollback with counts. |
| SA-01B J8 | C6.5, C6.6, C11.8, C11.13 | C6.5 Not built, C6.6 Works, C11.8 Partial, C11.13 Works | Setup works with AI off; on a case the Reader (C6.5) is not built, so the officer-types-beside-scan review, expiry entry, reminders and AI switch steps are missing. |
| P-113 | C11.6, C7.3 | C11.6 Partial, C7.3 Partial | Channel per form within what IRCC accepts is built for Visitor visa; the checked answer sheet in portal order for PR portal-only forms is partial (C7.3). |
| P-122 | C7.7, C11.6 | C7.7 Partial, C11.6 Partial | Deliverables list with per-form channel and a "PDF copy, not for filing" line built for Visitor visa; both rows Partial. |
| P-134 | C6.5, C4.5 | C6.5 Not built, C4.5 Works | Passports read by rules plus Textract and "Fill this from my documents" per section moved to M3 with the reader (P-256); reader not built. |
| P-135 | C6.12, C11.12 | C6.12 Partial, C11.12 Works | Filing modes per role and derived filings, forms, fees and groups built for Visitor visa and widened in C11.12; other combinations and fee table are not complete (C6.12 Partial). |
| P-137 | C7.7 | C7.7 Partial | Portal fixed by the combination and shown read-only, forms the portal does not take show Not needed; C7.7 is Partial. |
| P-141 | C6.9, C7.5 | C6.9 Works, C7.5 Not built | Full eligibility page (C6.9) built; the AI form review page from the team's Checker requirements (C7.5) is not built. |
| P-145 | C7.7 | C7.7 Partial | Download PDF copy on Online lines, never filed, is in C7.7 which is Partial. |
| P-151 | C7.6, C6.12 | C7.6 Partial, C6.12 Partial | Past-accepted-until warning exists; "Adopt update", dated fee table and key-date rules are not built; P-237 turns the block into a warning. |
| P-154 | C6.11, C4.10 | C6.11 Works, C4.10 Works | Firm roles, representative of record and Case officer source exist; retiring the word "agent" on every screen has no backlog item beyond K13's questionnaire names. |
| P-155 | C7.6, C6.11, C4.10, C6.5 | C7.6 Partial, C6.11 Works, C4.10 Works, C6.5 Not built | Case officer as source with reason built; representative review before recording, "Prepared by, Reviewed by" and checked-against-document lists are not built (now a warning, P-237). |
| P-164 | C6.9, C7.5, C6.11 | C6.9 Works, C7.5 Not built, C6.11 Works | Eligibility adapter, Sample firm and case team built; AI form review (C7.5) not built; P-236 amends the outcomes to three. |
| P-171 | C6.12, C6.4, C7.2, C7.7, C11.6 | C6.12 Partial, C6.4 Partial, C7.2 Partial, C7.7 Partial, C11.6 Partial | Sourced fees, filings, police-certificate rule and Validate-last built for Visitor visa; other combinations and IMM 5409 oath blanks are not complete. |
| P-172 | C6.4, C7.6 | C6.4 Partial, C7.6 Partial | Express Entry police and medical lines required and non-waivable exist; the Ready-to-file block is a rules-level check awaiting wiring (L-SA3, held). |
| P-229 | C6.9, C6.4 | C6.9 Works, C6.4 Partial | Pack 4 answers accepted as Sample; case check disclaimer, any staff override, one failed rule gives Not eligible. A derived Yes overriding a client's No is a follow-up (D4). |
| P-230 | C6.4, C6.12, C6.9 | C6.4 Partial, C6.12 Partial, C6.9 Works | Researched immigration answers as data: rule outcome "needs representative review", sponsor on same case, minor travels-with, fee table. Document-rule fields (copies, translations, validity) not yet in the model. |
| P-246 | C4.2, C7.2 | C4.2 Works, C7.2 Partial | Per-combination PQR marks stay as input to the released view; Adobe stays the validation oracle. Pin per filing is design-only (P-251, L-SA13). |
| P-271 | C4.2, C6.1, C6.2, C6.3, C6.7, C6.8 | C4.2 Works, C6.1 Works, C6.2 Works, C6.3 Works, C6.7 Not built, C6.8 Not built | Screen names "Smart questionnaire (SQR)", PQR, Client questionnaire, Agent view (K13 relabels); prospect runtime is the team's; each case pinned to its release. |
| P-39 | C6.3, C7.1, C7.2, C7.6, C6.4, C7.5 | C6.3 Works, C7.1 Works, C7.2 Partial, C7.6 Partial, C6.4 Partial, C7.5 Not built | Agent view, filled forms and ready-to-file rules exist in part; independent AI review (C7.5) and the full Adobe round trip are not built; P-46, P-71, P-238 revise it. |
| P-40 | C6.2, C6.10, C6.5, C5.1 | C6.2 Works, C6.10 Works, C6.5 Not built, C5.1 Partial | Family link and release with expert tick exist; AI proposing facts from uploads (C6.5) is not built; mobile-first is left to later phone-width work (UX-C). |
| P-46 | C7.1, C7.2, C7.6, C7.5 | C7.1 Works, C7.2 Partial, C7.6 Partial, C7.5 Not built | Append-only writer and barcode-form hard stop built; Adobe Validate round trip is partial and independent AI review (C7.5) is not built. |
| P-65 | C3.5, C7.1, C8.1, C9.2, C7.2 | C3.5 Works, C7.1 Works, C8.1 Partial, C9.2 Not built, C7.2 Partial | Aliases, merges, append-only fill and signed-PDF states built; changed fact marking signed items stale (C9.2) is not built; fill-trial gate is partial. |
| P-71 | C7.6 | C7.6 Partial | Form's own Validate and AI findings acknowledged with a reason built; P-238 "Supersedes P-71's block" for missing or conflicting facts; readiness not yet wired into the prepare view (L-SA3 held). |
| P-77 | C6.9, C6.8 | C6.9 Works, C6.8 Not built | Staff case check on rules as data built; PQR answers flowing into the SQR as "please confirm" (C6.8) is held (L-SA12, P-251) and is the team's runtime (P-271). |

### G8. T: a capability covers only part (5)

| Item | Capabilities | qa status | The part not covered |
|---|---|---|---|
| BR-5 | C7.1, C6.3, C6.9 | C7.1 Works, C6.3 Works, C6.9 Works | Filling uses only confirmed facts and gates show "not answered", but no capability states that a blank stays blank or that a check says "Can't check: input missing". |
| BR-7 | C6.6, C6.5 | C6.6 Works, C6.5 Not built | Conflicts are never resolved silently; the side-by-side image comparison, recorded pick and out-of-date save case are not built; L-SA6 and L-SA7 are held by P-251. |
| SA-1B-174 | C7.2 | C7.2 Partial | Fill-trial gate (Adobe Validate, barcodes) exists; per-edition trial record with map version, second-person confirmation and withdrawal is S2; P-246 (4): POC builds no in-app viewer. |
| P-67 | C6.1, C6.2, C6.3, C4.4, C7.1, C7.2 | C6.1 Works, C6.2 Works, C6.3 Works, C4.4 Works, C7.1 Works, C7.2 Partial | Thin slice: case with people, answers asked once, renderer, agent view, one filled IMM 5257 exist; Adobe validation of it is partial (C7.2). Lane staffing is process. |
| P-72 | C6.6, C6.10 | C6.6 Works, C6.10 Works | Only confirmed facts fill and AI-read values stay proposed; P-242 amends it to Declared answers fill at once, rework item L-SA6 is held (P-251). |

### G9. M4: a capability covers only part (3)

| Item | Capabilities | qa status | The part not covered |
|---|---|---|---|
| BR-28 | C6.3 | C6.3 Works | Facts are shown once per person with source and status, but carrying earlier-case facts with "Still true?" is B13 (M4); the unanswered warning is not built. |
| SA-01B J5 | C6.1, C6.3, C6.6, C6.5 | C6.1 Works, C6.3 Works, C6.6 Works, C6.5 Not built | Pin to a new release works; missing: carrying facts and verified state, "Still true?", new passport entry, different-firm separation, PQR answers not carried, retired answer values, must-verify warning. |
| SA-01B J7 | C5.5, C5.7, C9.1 | C5.5 Works, C5.7 Works, C9.1 Partial | Answer-key test blocks a bad map version; missing: hand-fix counts, signals list, box notices, draft re-fill, CRITICAL update notice, submitted-forms list (D100 corrections held); B28 covers reporting. |

### G10. team: a capability covers only part (1)

| Item | Capabilities | qa status | The part not covered |
|---|---|---|---|
| SA-1B-274 | C6.1 | C6.1 Works | Released versions are frozen and open cases keep their release (C6.1). The shared cache for every firm is not built; STANDARDS §9: "Scale work ... caching is the team's". |

### G11. M2: mapped to a capability that is not built or only Partial (8)

| Item | Capabilities | qa status | Note |
|---|---|---|---|
| BR-35 | C5.7, C4.3, C10.1 | C5.7 Works, C4.3 Works, C10.1 Partial | Answer-key tests, preview and the demo use made-up families only (Sample); preview creates no case. |
| P-11 | C3.13, C3.4, C3.1 | C3.13 Works, C3.4 Partial, C3.1 Works | The library is filled by AI proposals people accept, and every list shows each item's origin (AI or person). |
| P-112 | C11.3, C11.7 | C11.3 Works, C11.7 Partial | The sample structure uses the six wave 1 names, Express Entry stream and Spouse or common-law partner with no sub-category. |
| P-120 | C11.13, C3.6, C11.14 | C11.13 Works, C3.6 Works, C11.14 Partial | AI drafts masters when a form enters, one Add dialog in plain words, exact duplicates refused, near ones need a reason. |
| P-175 | C11.8 | C11.8 Partial | Live AI paths refused at US$0 with plain words unless the server starts with the explicit live switch. |
| P-179 | C11.8 | C11.8 Partial | A run that would pass a cost limit stops, shows expected and worst cost, and offers Continue (recorded) or Cancel. |
| P-226 | C11.7 | C11.7 Partial | One Demo menu button empties configuration and loads the six combinations; saved AI results are never removed by any reset. |
| P-227 | C11.8 | C11.8 Partial | Every AI step offers exactly Live or Saved; Saved replays the verified result through the same steps; failed Live offers Saved. |

### G12. M3: mapped to a capability that is not built or only Partial (14)

| Item | Capabilities | qa status | Note |
|---|---|---|---|
| BR-30 | C6.5, C11.8 | C6.5 Not built, C11.8 Partial | Canadian-region readers are fixed in C6.5 (not built) and live AI is off by default; per-request region logging and the firm AI switch are not covered. |
| SA-1B-134 | C3.16 | C3.16 Not built | C3.16 states stable list entry ids but is not built; scheduled as L-SA4, which waits on the household and filing scopes. |
| SA-1B-268 | C6.5 | C6.5 Not built | Reader design names Canada for printed text and zero-retention vision (P-133), Sample documents only. No region log and no reader are built; storage in Canada is hosting, not configured here. |
| SA-1B-34 | C6.5 | C6.5 Not built | Document reading into proposals with confidence is C6.5, M3, not built. "Confirm & use" (L-SA7) and the identity collapse (L-SA9) inside it are held. |
| SA-1B-53 | C1.3, C11.5 | C1.3 Not built, C11.5 Partial | Case-level link to an employer case is planned (P-106); missing: pack entries naming linked combinations listed first in an Open linked case picker, which P-106 keeps out of configuration. |
| P-106 | C11.5, C1.3 | C11.5 Partial, C1.3 Not built | Retail and Corporate are set up apart and "Linked to" is gone; the case-level "relies on employer case" pre-fill (C1.3) is not built. |
| P-13 | C11.5, C1.3 | C11.5 Partial, C1.3 Not built | Retail and Corporate stay isolated (C11.5); P-106 moved the links onto the case (C1.3, Not built); multi-step journeys as linked combinations are not built. |
| P-133 | C6.5 | C6.5 Not built | Document reader by kind (coded lines, Textract, AI vision on Sample documents) not built; C6.5 Not built, and its Confirm and use part is held (L-SA7, P-251). |
| P-136 | C7.6, C9.2 | C7.6 Partial, C9.2 Not built | Out-of-date and missing-signature checks exist at rules level; P-237 turns these blocks into warnings; stale marks (C9.2) not built; wiring is L-SA3, held. |
| P-142 | C6.5 | C6.5 Not built | Staff-only checked-against-document marks, always-reviewed identity fields and client "please check" are in C6.5, Not built; must-verify and Confirm and use are held (P-251). |
| P-144 | C7.6 | C7.6 Partial | A barcode form filed by upload or paper without a validated copy read back still blocks Ready to file. |
| P-247 | C6.12 | C6.12 Partial | Every fee line carries a basis including "family maximum"; the case total applies the cap (CAD 500 for 5 or more). |
| P-256 | C6.5, C4.5 | C6.5 Not built, C4.5 Works | Fill this from my documents per section moves to M3 with the document reader; proposals only, never automatic on upload. |
| P-272 | C7.7 | C7.7 Partial | The case tab where staff prepare what gets filed is named "Prepare application". |

### G13. M4: mapped to a capability that is not built or only Partial (1)

| Item | Capabilities | qa status | Note |
|---|---|---|---|
| SA-01B J2 | C6.12, C7.3, C7.4, C9.1, C9.2 | C6.12 Partial, C7.3 Partial, C7.4 Not built, C9.1 Partial, C9.2 Not built | Portal sheet and fees exist; missing: stages and Start next stage, extension fill (M4), Calculate score, government step deadline, Use newer rules, review item, frozen submission record. |

## Not gaps, listed so nothing is hidden

### Held for the SA-01B product owner (P-251) (52)

| Item | M | Capabilities | Why |
|---|---|---|---|
| SA-1B-100 | M2 | - | Release disclaimer in the pack conflicts with this rule; P-251: "the release disclaimer (P-229 (2) Q1 against SA-1B-100, SA1B-D29)" held, no backlog item. No capability states the limit. |
| SA-1B-297 | M2 | - | P-251 holds: corrections reaching open filings (SA1B-D100). The correction versus rule-change mark and its publish check are also unbuilt; no capability. |
| P-15 | M2 | C3.6, C11.13 | The AI meaning check on a hand-made addition is held: P-284 "same held part", P-252 guarded Add held by P-251; exact duplicates and second-person approval are built (C3.6). |
| P-248 | M2 | C5.1 | P-251 holds G5: "release needs a form line, P-248". A combination releases only with a document line and a form line; warns earlier. |
| P-252 | M2 | C11.13, C3.6 | P-251: "Both held until the product owner rules on C2". Guarded Add with search first, reason and source, plus AI co-pilot on every library. |
| P-95 | M2 | C3.6, C11.13, C11.3 | AI meaning check "did you mean" not built: P-284 "same held part"; held for the SA-01B product owner (P-251). |
| BR-14 | M3 | - | P-251 holds "corrections reaching open filings (SA1B-D100)"; correction against rule change, the live overlay and "Corrected: update this form" are not built; B9 covers the rule-change move. |
| BR-15 | M3 | C6.12 | Fees are a dated table (R2) but target filing date and one time rule per case are not built; P-251 designs only "pin per filing (P-246 (2), L-SA13)". |
| BR-2 | M3 | C3.16 | Scope per field is written but not built; P-251 holds household and filing scopes ("household and filing scopes (L-SA4 waits)") and the organisation subject. |
| BR-27 | M3 | - | P-251 holds "the application fix (SA1B-D93)"; no capability records a fix on the filing with "Also update the client's record". |
| SA-1-32 | M3 | C6.1, C9.2 | Pinned release and stale marks exist; corrected map reaching open forms is held by P-251: 'corrections reaching open filings (SA1B-D100)'. |
| SA-1B-109 | M3 | - | P-251 holds the corporate area: the employer onboarding questionnaire and its organisation-scope copy question are not built. |
| SA-1B-112 | M3 | - | P-251 design-only: household and filing scopes (L-SA4 waits); organisation target is the corporate area; no target-versus-scope check exists. |
| SA-1B-130 | M3 | C3.16 | C3.16 is written to deliver scope but is not built; P-251 design-only: household and filing scopes, L-SA4 waits. Fields are per person today. |
| SA-1B-170 | M3 | - | Design-only in P-251: 'reading PartyRelationship for whose fact'; no capability lets a box read the spouse's or child's fact. |
| SA-1B-176 | M3 | C6.3 | P-251 holds 'the application fix (SA1B-D93)'; an agent-view edit updates every draft output, but there is no per-filing fix with form-only tick or update-record button. |
| SA-1B-213 | M3 | C6.3 | Agent view shows each fact once per person; the case relationship record and whose-fact lookup is design-only under P-251: PartyRelationship whose fact, concept first. |
| SA-1B-235 | M3 | C11.5 | Held: organisation subject for employer facts is design-only (P-251) and corporate area held; only the case link prefilling employer facts exists, not the offer step or fields. |
| SA-1B-253 | M3 | - | Rule-change warning is part of L-SA3 (P-237: "A rule change warns and never blocks"), held by P-251. The one-click move to a newer version (B9) is also unbuilt. |
| SA-1B-255 | M3 | - | P-251: corrections reaching open filings "(SA1B-D100)" held with no backlog item until the product owner rules. No capability re-fills drafts or flags approved forms. |
| SA-1B-259 | M3 | C8.2 | Filing record holds application number and UCI. Recording the submission with version, dates and values waits for Ready to file (L-SA3, held by P-251). |
| SA-1B-261 | M3 | C6.6, C7.1 | Capability text says a typed answer fills at once; built behaviour still leaves unconfirmed officer answers blank. Rework L-SA6, must-verify L-SA8 and officer entry L-SA10 are held (P-251). |
| SA-1B-263 | M3 | C6.5, C6.6 | Capabilities state one review per document with "Confirm & use"; not built. L-SA7, L-SA9 and the must-verify clearing L-SA8 are held by P-251. |
| SA-1B-264 | M3 | C6.6, C6.3 | Capability text says conflicts are never resolved silently; the side-by-side pick is part of L-SA6, held by P-251. Built evidence covers only a stale client save. |
| SA-1B-51 | M3 | - | P-251 holds 'family on different programmes and location per person (SA1B-D72, SA1B-D66)'; allowed locations per combination appear in studio code but in no capability. |
| SA-1B-73 | M3 | C11.12 | P-251 holds: family on different programmes and location per person (SA1B-D72, D66). Roles and filing modes exist; per-person combination choice and fitsRoles picker do not. |
| P-237 | M3 | C7.6 | P-251 holds L-SA3: "Don't wire readiness.ts into case-prepare.ts:179 yet". Only a barcode form's own Validate blocks; other stops become passable warnings. |
| P-238 | M3 | C7.6 | P-251 holds L-SA3 (ready-to-file warnings). Missing or conflicting facts become a CRITICAL warning passed with a recorded reason. |
| P-239 | M3 | C3.16, C11.5 | P-251: corporate area held, L-SA4 "waits for the designs". Organisation and filing scope in M3, Sample employer combination in M4; no Corporate configuration built. |
| P-242 | M3 | C6.6, C6.5 | P-251 holds L-SA6-L-SA8. Declared answers fill at once; document-read values need "Confirm & use"; must-verify flag on expert-named fields. |
| P-243 | M3 | C6.5 | P-251 holds L-SA9 (identity collapse). Passport number, birth date, expiry collapse only when check digits pass. |
| P-244 | M3 | C4.9 | P-251 holds L-SA10 (officer background entry). Staff record background answers marked Officer; client re-confirms before signing. |
| BR-34 | M4 | C1.3, C11.5 | P-251 holds "the corporate area" and P-239 says the POC builds no Corporate configuration; only a case-level employer link that pre-fills employer facts exists on paper. |
| BR-44 | M4 | - | P-251 holds "the corporate area"; P-239: "The POC builds no Corporate configuration"; the employer's offer part inside the worker filing is not built. |
| SA-1B-158 | M4 | - | P-251 holds the corporate area; P-239 and L-SA5 put the Sample employer combination and its shareable mark in M4. |
| SA-1B-179 | M4 | - | P-251 holds 'hold against notices (P-73 against SA1B-D75)'; P-73 makes report-and-hold B28, M4. |
| SA-1B-230 | M4 | - | P-251 holds the corporate area; P-239: The POC builds no Corporate configuration. LMIA combination steps and clocks not built. |
| SA-1B-280 | M4 | C3.16, C11.5 | Corporate area held (P-251); P-239: "The POC builds no Corporate configuration". Scope fields come in L-SA4; one Sample employer combination in M4 (L-SA5). No several-position file. |
| SA-1B-281 | M4 | C11.5 | Corporate area held (P-251, P-239). Case link pre-fills employer facts (C11.5, partial); offer number, fee exemption and proof lines are not built. |
| SA-1B-282 | M4 | C1.8, C6.11 | Corporate area held (P-251). Form lines say who signs (C1.8) and a representative of record exists (C6.11); employer roles, signatory warning and portal seats are not built. |
| SA-1B-283 | M4 | C1.3, C11.5 | Corporate area held (P-251). Pre-fill of employer facts from an employer case is partial (C1.3, C11.5); marked "Linked file" copying of documents and facts is not built. |
| SA-1B-284 | M4 | - | Corporate area held (P-251). L-SA5 adds a shareable mark on the Sample employer combination (P-239); no capability covers marks or the privacy barrier. |
| SA-1B-97 | M4 | - | P-251 holds the corporate area; P-239: The POC builds no Corporate configuration. Employer-combination standard steps with done by are not built. |
| SA-01B J4 | M4 | C11.5 | P-251 holds "the corporate area"; the LMIA check, advertising period, per-position fee, validity reminder, Create work permit case and linked copies are not built (P-239). |
| P-245 | M4 | C7.4 | P-251 holds P-245 extension items E1-E6; M4, nothing built now. Our own AI-assisted Chrome extension fills portal screens with the representative's check. |
| SA-1B-202 | team | C6.8 | P-251 holds L-SA12 (PQR to SQR personal details, P-235); P-271: 'the prospect runtime is the team's'. |
| SA-1B-285 | team | - | Corporate area held (P-251); P-239 puts the employer workspace in the team's Release 1. No capability or backlog item for the employer quick check pre-fill. |
| SA-1B-286 | team | - | Corporate area held (P-251); P-239: LMIA employer file and clocks are the team's Release 1. Advertising and validity clocks have no capability here. |
| SA-1B-287 | team | C6.12 | Corporate area held (P-251). Fee lines carry a "per position" basis (C6.12, R2); the count of positions less exempt and retainer pre-fill are not built. |
| SA-1B-288 | team | C7.3 | Corporate area held (P-251). The portal sheet lists answers in portal order with copy buttons (C7.3); the LMIA filing summary as a preparation view is not built. |
| SA-1B-289 | team | - | Corporate area held (P-251); P-239: "The POC builds no Corporate configuration". Slots and the publish check on unfilled slots are not built. |
| P-235 | team | C6.8 | P-251 holds L-SA12; P-271: prospect runtime is the team's. P-235: "Only personal details carry from the prospect questionnaire". |

### Later, by a decision (8)

| Item | M | Capabilities | Why |
|---|---|---|---|
| BR-32 | M4 | C7.4 | P-245: "one extension, built by the POC in M4". C7.4 states the guardrails (never Next or Submit, never declarations, structure match); read-back, no stored data and no LMIA extension are not stated. |
| SA-1B-175 | M4 | C7.4 | P-245: 'one extension, built by the POC in M4'; extension items E1-E6 are also held in P-251. |
| P-73 | M4 | C9.3 | P-73 itself: "Backlog B28, M4". Report a mapping problem and hold it for everyone; not built. |
| SA-1B-32 | later | C7.3, C2.7, C3.9 | P-102: portal capture and online screens 'return in the last wave'; portal sheet from the PDF twin exists, screen editions with their own maps do not. |
| P-178 | later | - | P-178: "Corporate ... comes later as a separately sold module"; Release 1 builds no Corporate (P-239 adds only a Sample employer in M4). |
| P-66 | later | C2.9, C9.3 | P-102 "returns in the last wave, for filling online portals only"; extension is M4 (P-245); capture and form health capabilities exist, not built. |
| SA-1B-203 | team | C6.9 | P-271: 'the prospect runtime is the team's'; P-129: prospect PQR 'move after M3'. Case check gives three outcomes for a case, not ranked per-programme prospect results with levers. |
| P-129 | team | C6.7, C6.8 | P-129 "client and prospect later"; P-271 moves the prospect and client runtime to the team; staff side stays M3. |

### Out of scope, by a decision (37)

| Item | M | Capabilities | Why |
|---|---|---|---|
| SA-1-45 | M2 | C5.1, C5.3 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: submit, expert ticks, different person approves and releases; In review/Approved states and test-only/production labels are not shown. |
| SA-1-47 | M2 | C5.1, C5.4, C5.5, C3.8 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: release refused on validator, source and answer-key errors; "published versions never change" is not stated. |
| SA-1-51 | M2 | C3.8, C5.4, C5.1, C4.10 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: field-map validator, source check, release refusals; no single pass/warning/error report with language and regulator checks. |
| SA-1-52 | M2 | C4.3, C4.6, C5.7 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: preview by person with a sample family and answer-key runs on made-up families; not for a published version. |
| SA-1-53 | M2 | C9.1 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway for new form editions only (field-by-field comparison); no comparison of two pack versions per area. |
| SA-1-61 | M2 | C5.1, C5.3, C2.3 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: the maker cannot approve their own item; no rule against the submitter or an approver who edits. |
| SA-1-63 | M2 | C5.1 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway in part: release refused without a document and a form line; no versioned completeness profile per country. |
| SA-1-74 | M2 | C3.14, C3.4 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway in part: a read-only Checks list and AI-drafted checks; no per-country deficiency library with optional programme. |
| SA-1-75 | M2 | C3.1, C7.1, C7.3 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: field maps, filler and answer sheet for the five combinations' forms; a launch list for every viewer-covered form is not stated. |
| BR-29 | team | C6.9 | P-271: "The prospect runtime is the team's: we don't build C6.7 or C6.8". We build only the staff case check; sales assessment, Send questionnaire and locking are not built. |
| SA-1-1 | - | - | P-70: SA-01 slices stay outside. No capability creates a country with code, timezone and currency. |
| SA-1-2 | - | - | P-70: SA-01 slices stay outside. No capability holds a country code. |
| SA-1-3 | - | - | P-70: SA-01 slices stay outside. No country status Draft, Active or Suspended exists. |
| SA-1-4 | - | - | P-70: SA-01 slices stay outside. No country activation check exists. |
| SA-1-44 | - | - | P-70: SA-01 slices stay outside; also P-34 leaves translations unbuilt. No required-language check at publish. |
| SA-1-46 | - | - | P-70: SA-01 slices stay outside. No per-area version or effective date bundled into a pack version. |
| SA-1-48 | - | - | P-70: SA-01 slices stay outside. No scheduled publish in Eastern time. |
| SA-1-49 | - | - | P-70: SA-01 slices stay outside. No capability rolls back to an earlier published version. |
| SA-1-5 | - | - | P-70: SA-01 slices stay outside. No country suspension exists. |
| SA-1-50 | - | - | P-70: SA-01 slices stay outside. No capability states an audit of draft, approval, publish and rollback steps. |
| SA-1-54 | - | - | P-70: SA-01 slices stay outside. No clone-a-country. |
| SA-1-55 | - | - | P-70: SA-01 slices stay outside. No export of a pack version. |
| SA-1-56 | - | - | P-70: SA-01 slices stay outside. No all-or-nothing import with preview. |
| SA-1-57 | T | C6.1 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: a case opens only on a released combination; per-country firm read is not built. |
| SA-1-58 | T | C6.1, C6.12 | P-70: SA-01 slices stay outside. Same behaviour delivered anyway: a case is pinned to its release; adopting a newer one with a reason is B9. |
| SA-1-59 | - | - | P-70: SA-01 slices stay outside. No published-content cache rule. |
| SA-1-6 | - | - | P-70: SA-01 slices stay outside. No country list or settings page exists. |
| SA-1-62 | - | - | P-70: SA-01 slices stay outside. No count of clients per firm pinned to a version. |
| SA-1-66 | - | - | P-70: SA-01 slices stay outside (BACKLOG-requirements lists SA-1-66). Firm overlay of requests, hides and name overrides has no capability; B23 schedules the same behaviour via SA-1B-95. |
| SA-1-67 | - | - | P-70: SA-01 slices stay outside (BACKLOG-requirements lists SA-1-67). Hiding by Owner and Admin has no capability; B23 schedules the same behaviour via SA-1B-95. |
| SA-1-68 | - | - | P-70: SA-01 slices stay outside. No government domain list. |
| SA-1-69 | - | - | P-70: SA-01 slices stay outside. No letter library; B11 schedules letters as steps with deadlines. |
| SA-1-7 | - | - | P-70: SA-01 slices stay outside. No country audit exists. |
| SA-1-70 | - | - | P-70: SA-01 slices stay outside. No deadline rule from a letter; B11 schedules the officer-confirmed due date. |
| SA-1-71 | - | - | P-70: SA-01 slices stay outside. No three-field unknown-letter report. |
| SA-1-72 | - | - | P-70: SA-01 slices stay outside. No New letter patterns list. |
| SA-1-73 | - | - | P-70: SA-01 slices stay outside. No holiday reference list. |

### Decisions superseded by a later one (13)

| Item | M | Capabilities | Why |
|---|---|---|---|
| P-168 | - | - | P-237 "The only hard stop is a barcode form failing its own Validate" replaces the four hard blocks. |
| P-181 | - | - | Superseded by P-224: "supersedes the process decisions P-181, P-186, P-190, P-195, P-199". |
| P-185 | - | - | Superseded by P-188: "supersedes P-185's seven-item platform build". |
| P-186 | - | - | Superseded by P-224: "supersedes the process decisions P-181, P-186, P-190, P-195, P-199". |
| P-190 | - | - | Superseded by P-224: "supersedes the process decisions P-181, P-186, P-190, P-195, P-199". |
| P-195 | - | - | Superseded by P-224: "supersedes the process decisions P-181, P-186, P-190, P-195, P-199". |
| P-198 | - | - | Superseded by P-224: "P-198 and P-218 (handover at 50% and 60-80%)". |
| P-199 | - | - | Superseded by P-200: "Back to one test slot"; also P-224. |
| P-200 | - | - | Superseded by P-224: "supersedes the process decisions ... P-199, P-200". |
| P-207 | - | - | Superseded by P-248: "Amends P-207 (documents only was enough)"; a form line is now required. |
| P-218 | - | - | Superseded by P-224: "P-198 and P-218 (handover at 50% and 60-80%)". |
| P-24 | - | - | P-112 "Express Entry stream (no sub-category" and P-122 "there is no route choice" replace Profile and PR route steps. |
| P-241 | - | - | Superseded by P-252: struck through, "Superseded by P-252" (guarded Add replaces no free Add). |

### Not a requirement (withdrawn or pointer cards, scope lists) (11)

| Item | M | Capabilities | Why |
|---|---|---|---|
| BR-19 | - | - | Ownership split between epics, one pointer line per screen; P-166 settles what is ours chunk by chunk. |
| BR-37 | - | - | A scope statement listing ten Release 2 items of the team; each is judged on its own card. |
| SA-1B-205 | - | - | Pointer card: the employer's quick LMIA Check is owned by chapter 11, SA-1B-285. |
| SA-1B-23 | - | - | Withdrawn in v2.0 (SA1B-D91); replaced by the validity check; our S5 removes the 90 and 30 day lead times. |
| SA-1B-231 | - | - | Withdrawn by SA1B-D118: ExpatReady puts no automatic to-do list on cases. |
| SA-1B-232 | - | - | Withdrawn with SA-1B-231 (SA1B-D118); no starter set exists to update. |
| SA-1B-234 | - | - | Pointer card only; owned by Chapter 3 (SA-1B-156) with passport expiry as a document key date. |
| SA-1B-24 | - | - | Pointer card: the pack supplies only the validity rule and status mark; reminder timings are fixed and not per document type. |
| SA-1B-25 | - | - | Pointer card: send-back reasons stay firm-owned in AG-09; nothing is added to the pack. |
| SA-1B-265 | - | - | Pointer card; single home is SA-1B-176 (chapter 4). The application fix itself is held (SA1B-D93, P-251). |
| SA-1B-69 | - | - | Pointer card only; says steps live in Chapter 7 (SA-1B-45, SA-1B-96, SA-1B-97) and repeats no rule. |

### Covered in full by capabilities qa scores Works (50)

| Item | M | Capabilities | One test per capability (file — label) |
|---|---|---|---|
| SA-1B-181 | M2 | C5.7, C5.5 | C5.7: tests/check_g4_answer_keys.ts — "C5.7 P-249: ${f} imports no database, file, network or model module"; C5.5: tests/check_g2_answer_key_gate.ts — "C5.5 BR-1: the Visitor visa's testable items are its two PDF field … |
| SA-1B-199 | M2 | C5.5, C5.7 | C5.5: tests/check_g2_answer_key_gate.ts — "C5.5 BR-1: the Visitor visa's testable items are its two PDF field maps (IMM 5257, IMM 5707), no eligibility rules"; C5.7: tests/check_g4_answer_keys.ts — "C5.7 P-249: ${f} imp… |
| SA-1B-296 | M2 | C5.5, C5.7 | C5.5: tests/check_g2_answer_key_gate.ts — "C5.5 BR-1: the Visitor visa's testable items are its two PDF field maps (IMM 5257, IMM 5707), no eligibility rules"; C5.7: tests/check_g4_answer_keys.ts — "C5.7 P-249: ${f} imp… |
| SA-1B-55 | M2 | C1.2, C1.4, C1.5 | C1.2: tests/check_screen02_slice2.ts (opening comment); C1.4: tests/check_setup_checklist.ts — "C1.4: 3 library forms found for its sources → \"Add 3 forms found\", never \"Find forms\""; C1.5: tests/check_x2b_bulk_appl… |
| P-07 | M2 | C1.4, C11.10 | C1.4: tests/check_setup_checklist.ts — "C1.4: 3 library forms found for its sources → \"Add 3 forms found\", never \"Find forms\""; C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record y… |
| P-08 | M2 | C3.12, C3.14 | C3.12: tests/check_forms_c312_field_map.ts — "C3.12 rule pass: a guide or a checklist is read by AI, never filled: 'No field map', whatever rows it has"; C3.14: tests/check_c314_rules.ts — "C3.14 BR-15 pass: the Checks … |
| P-102 | M2 | C11.1 | C11.1: tests/check_c46_preview_channels_browser.cjs — "C11.1 pass: the Online line itself says 'Online (later wave)' (not only its group's heading) and offers no Fill PDF" |
| P-103 | M2 | C11.2, C2.12 | C11.2: tests/check_forms_s4_canada.ts — "C11.2: an https www.canada.ca address is admitted as is"; C2.12: tests/check_forms_c212_complete.ts — "C2.12 IRCC-F08 pass: every form field decided, nothing open above: step 6 i… |
| P-104 | M2 | C11.3, C11.17 | C11.3: tests/check_c113_full_trail.ts — "C11.3 QA-150 pass: a category with no sub-category reads Pathway type › Pathway › Program › Category › No sub-category"; C11.17: tests/qa/check_qa_am_r3_1028.cjs — "C11.17 P-128 … |
| P-115 | M2 | C11.10, C1.1 | C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record yet"; C1.1: tests/check_screen01_smallfix.cjs — "C1.1 QA-22: while the session loads, the author never reads the non-author message" |
| P-116 | M2 | C11.9 | C11.9: tests/check_c119_acceptance.ts — "C11.9 (${kind}): "where used" answers before any action, each use linked and saying whether it blocks" |
| P-118 | M2 | C11.11, C3.12, C11.3 | C11.11: tests/check_forms_s4_canada.ts — "C11.11: page text equals p1/source_text.py's text of the same page (its P1 inventory)"; C3.12: tests/check_forms_c312_field_map.ts — "C3.12 rule pass: a guide or a checklist is … |
| P-119 | M2 | C11.12 | C11.12: tests/check_c1112_modes.ts — "C11.12 BR-1 pass: principal, spouse and child Files own save" |
| P-123 | M2 | C11.15, C3.12, C11.18, C11.12 | C11.15: tests/check_ai_live_switch.ts — "C11.15 Lead Critical fail: with no switch the live plan says AI now is switched off, in plain words"; C3.12: tests/check_forms_c312_field_map.ts — "C3.12 rule pass: a guide or a … |
| P-125 | M2 | C11.16 | C11.16: tests/check_forms_c118_acceptance.ts — "C11.8 AT-2 one door rule (P-175, as the finder, C11.16 AT-8): a live draft on a copy without the switch is refused at the door (409, says AI" |
| P-128 | M2 | C11.17 | C11.17: tests/qa/check_qa_am_r3_1028.cjs — "C11.17 P-128 (2): Add opens the pop-up prefilled from the tab, Pathway and Program filters, focus on the first empty level" |
| P-132 | M2 | C4.2 | C4.2: tests/check_pqr.ts — "C4.2 P-132 pass: one country line per fact and person, with every released combination that asks it" |
| P-138 | M2 | C11.13 | C11.13: tests/check_c1113_draft_fields.ts — "C11.13 pass: a field name an area and a name, with a meaning and a type, passes the rules" |
| P-140 | M2 | C1.6 | C1.6: tests/check_c3_11_signed_scan.ts — "C3.11 engine pass: a release made before C1.6 (channel spelled SIGNED_PDF_UPLOAD) still asks for the signed scan" |
| P-147 | M2 | C4.10, C1.8 | C4.10: tests/check_qa117_person_sections.ts — "C4.10 QA-117 pass: no person lists a section that asks someone else as '0 questions' for them"; C1.8: tests/check_c18_age_case.ts — "C1.8 setup: from age 18 and 'signed by … |
| P-157 | M2 | C11.10 | C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record yet" |
| P-161 | M2 | C11.10 | C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record yet" |
| P-162 | M2 | C3.1 | C3.1: tests/check_forms_c31_acceptance.ts — "C3.1 AT-1 only an author starts a draft: no person 401, a client 403, a reviewer without the author duty 403, each in plain words; no draft " |
| P-174 | M2 | C4.10, C4.1 | C4.10: tests/check_qa117_person_sections.ts — "C4.10 QA-117 pass: no person lists a section that asks someone else as '0 questions' for them"; C4.1: tests/check_c41_questionnaire_roles.ts — "C4.1 pass: each applying per… |
| P-176 | M2 | C11.10 | C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record yet" |
| P-180 | M2 | C11.10 | C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record yet" |
| P-208 | M2 | C1.6 | C1.6: tests/check_c3_11_signed_scan.ts — "C3.11 engine pass: a release made before C1.6 (channel spelled SIGNED_PDF_UPLOAD) still asks for the signed scan" |
| P-209 | M2 | C11.12 | C11.12: tests/check_c1112_modes.ts — "C11.12 BR-1 pass: principal, spouse and child Files own save" |
| P-233 | M2 | C11.12 | C11.12: tests/check_c1112_modes.ts — "C11.12 BR-1 pass: principal, spouse and child Files own save" |
| P-240 | M2 | C5.4, C5.5, C5.6, C5.7 | C5.4: tests/check_g1_source_entry_db.ts — "C5.4 BR-3 pass: a full citation is stored, version 1, not Sample"; C5.5: tests/check_g2_answer_key_gate.ts — "C5.5 BR-1: the Visitor visa's testable items are its two PDF field… |
| P-253 | M2 | C11.13 | C11.13: tests/check_c1113_draft_fields.ts — "C11.13 pass: a field name an area and a name, with a meaning and a type, passes the rules" |
| P-266 | M2 | C11.13 | C11.13: tests/check_c1113_draft_fields.ts — "C11.13 pass: a field name an area and a name, with a meaning and a type, passes the rules" |
| P-279 | M2 | C5.4 | C5.4: tests/check_g1_source_entry_db.ts — "C5.4 BR-3 pass: a full citation is stored, version 1, not Sample" |
| P-34 | M2 | C3.6, C3.5, C3.7, C3.15, C11.13 | C3.6: tests/check_forms_c36_acceptance.ts — "C3.6 pass: ${path} by hand is gone (410, in words)"; C3.5: tests/check_forms_channels.ts — "C3.5: labels compare as people read them"; C3.7: tests/check_forms_s4_library_brow… |
| P-37 | M2 | C11.10, C3.13, C3.14, C4.3, C5.3 | C11.10: tests/check_official_pages.ts — "C11.10 F2 pass: no page attached → no record yet"; C3.13: tests/check_c313_reuse.ts — "C3.13 pass: without a combination, every combination is offered with how many items it uses… |
| P-41 | M2 | C3.12, C2.1 | C3.12: tests/check_forms_c312_field_map.ts — "C3.12 rule pass: a guide or a checklist is read by AI, never filled: 'No field map', whatever rows it has"; C2.1: tests/check_forms_channels.ts — "C2.1: P-102 a saved portal… |
| P-50 | M2 | C1.4 | C1.4: tests/check_setup_checklist.ts — "C1.4: 3 library forms found for its sources → \"Add 3 forms found\", never \"Find forms\"" |
| P-52 | M2 | C3.7, C11.9 | C3.7: tests/check_forms_s4_library_browser.cjs (cited in qa evidence); C11.9: tests/check_c119_acceptance.ts — "C11.9 (${kind}): "where used" answers before any action, each use linked and saying whether it blocks" |
| P-53 | M2 | C3.6 | C3.6: tests/check_forms_c36_acceptance.ts — "C3.6 pass: ${path} by hand is gone (410, in words)" |
| P-57 | M2 | C2.2 | C2.2: tests/check_forms_demo.ts — "C2.2: review-4 Major 2 the demo's off-list copy is a visitor visa form (IMM 5409 here), never a sponsorship form" |
| P-63 | M2 | C3.10 | C3.10: tests/qa/check_qa_explore_1025.cjs — "QA-39 C3.10: the field library says shared field, not 'Canonical fields' (P-63)" |
| P-79 | M2 | C5.3 | C5.3: tests/check_screen02_fix.ts — "C5.3 BR-9 fail (M2): the person who applied the draft cannot approve a field from it (403)" |
| P-80 | M2 | C2.3 | C2.3: tests/check_forms_demo.ts — "C2.2/C2.3: DEMO row 1 the off-list copy was held, then decided by a second person (the reviewer, not the uploader): rejected as not needed, " |
| P-96 | M2 | C3.15 | C3.15: tests/check_gcore_b2_door.ts — "C3.15 pass: a section no release carries is renamed directly through the door (200, change set applied)" |
| P-97 | M2 | C4.9 | C4.9: tests/check_s5_slice2.ts — "C4.9 who fills it is read from the placement: a questionnaire question is the client's, a working-view one the case officer's" |
| P-222 | M3 | C6.6 | C6.6: tests/runtime/check_runtime_r1c.cjs (cited in qa evidence) |
| P-236 | M3 | C6.9 | C6.9: tests/check_c69_gates.ts — "C6.9 BR-2 pass: gates over person.passport_* and person.criminal_history are accepted" |
| SA-1B-35 | T | C7.1 | C7.1: tests/runtime/check_qa122_generate.ts (cited in qa evidence) |
| P-47 | T | C4.4, C4.3 | C4.4: tests/check_c44_part2.ts — "setup: the copy is prepared (Visitor visa released, C4.4 Sample types added)"; C4.3: tests/check_forms_w102_fix.ts — "C4.3: review M1 Preview says which forms are filed Online (IMM 1295… |
| P-78 | T | C6.10, C6.2 | C6.10: tests/qa/check_qa_r1a_probe.ts — "C6.10 another client is told case A does not exist, for reading, answering and adding a row (404)"; C6.2: tests/check_s5_slice1.ts — "C6.2 QA-135 fail: the application itself as … |

<!-- generated by v1_count.py: end -->
