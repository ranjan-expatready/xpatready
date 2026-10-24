# R1 thin slice: R1c questionnaire renderer review (CHECK) · independent reviewer, 24 Oct 2026

Commit `36a6a3d` on `claude/runtime-r1-8f1db8`. The reviewer did not build it. Read: concept, plan §5, §8 (RT-4…RT-12), §9 R1c and "Build discoveries", lead-check, build-notes-r1c, the board `design/questionnaire-kit.dc.html`, and STANDARDS, EXPERIENCE, QUALITY, PRODUCT §3–§4. Code: `web/src/runtime/{questionnaire,cases}.tsx`, `App.tsx`, `engine/runtime/case.ts`, `contracts/runtime.ts`, `api/src/runtime.ts` (addPerson), migration `20261024200000_runtime_r1c_people_key`, and the tests. App: :4430 (lane copy, already running, shared with the breaker). My cases: `REVC-viaq` (principal, spouse, one child) and `REVC-big` (principal, spouse, four children). Screenshots: `screenshots/review-r1c/`. AI cost: US$0.

## Verdict: Ship after fixes (go to FIX)
The renderer is one component with two modes and is mostly driven by data. Saving, history, 409s, roles and add-person idempotency hold on the server (database checked). axe found 0 violations on every state I scanned. Pages load in under 300 ms. The journey still fails the bar at **7/10**. Three things cause it. Rules are not live in the client's part: required-after-"Yes" and show/hide are never surfaced. Two repeating groups have no name, and one of them hides a required question. The conflict dialog cannot recover. No Must: no data is lost or wrong in storage.

## Journeys walked (Playwright, headless Chrome, as a person: click, type, read; data read after each)
1. **Officer opens a case and adds a family (1440, then 1024).** Empty submit gives field errors (03). Spouse and child are added. Double-pressing "Add" makes **one** child, but two "Child added" toasts appear (05). A second spouse is refused with the release's limit (06). The database has 4 participants.
2. **Client on a phone (390), one part per screen.** Overview has 41 parts, grouped person by person (10). The radio cards, the select, day/month/year dates and CAD money all work (13). 31 Feb is stored and flagged. The error summary takes focus and links to each field (14). An end date before the start gives the RT-7 Sample check "Check these answers" (15). A visit-contact entry is added with Unicode text, and typed drafts survive adding the entry (16). The database has one current row per fact and keeps history.
3. **Answering for the family.** The spouse part shows the P-78 words "Answered by the principal for an adult…" (24). The child part says "Answering for … (child)" (25).
4. **Leave and resume.** "Save and come back later" returns to the overview. On a fresh browser context, "4 of 41 parts done" shows, and "Continue where you left off" opens part 4 (23).
5. **Officer agent view (1440).** Each fact shows its value, a confirmation pill, the source (channel · who · when) and "fills IMM 5257 for …" (30). Edit opens a dialog that names the forms and boxes, and the toast repeats them (31, 32). Confirm section confirms 7 answers (33). The spouse tab lists the officer-entered identity facts (34).
6. **Conflict.** The client saves while the officer's dialog is open. The officer gets a 409 in the dialog (35). Confirm section after a client change is refused: "nothing was confirmed" (36).
7. **Wrong role.** Client B on Client A's case sees "not available" (404). A client on `/cases` or on the case page gets a plain refusal. API: client agent view 403, no header 401, author 403. The client view holds no passport facts (40).
8. **Break pass.** A double click on "Add an entry" makes **two** entries (26), and removing one needs an in-page confirmation (27). A full household at 1024 px scrolls sideways (42). 200 % zoom also scrolls sideways (41).

## Findings
**Major 1. Rules are not live in the client's part, and required questions are never named there** (plan §5 and RT-8, concept "rules as data (show/hide, required)", board "If Yes, 3 more questions appear", EXPERIENCE §4 "needs work: exactly what is missing").
Principal, Background declarations: I answered criminal history **Yes**, left the details empty and pressed Save and continue. The client moved on with no message (21). The view lists "Details of criminal history" as missing, but the part's summary shows only `problems` and `checks` (`questionnaire.tsx:304`), never `missing`. The details question shows "(optional)" until the part is saved, because `required` comes from the server's last view. `q.hidden` is never read by the renderer (no use in `questionnaire.tsx`), so a SHOW-rule question would be shown to the client with no reason given. Today's release has only REQUIRE rules, so this is not visible yet. An empty Save and continue skips required questions silently (12). *Fix:* evaluate the part's REQUIRE and SHOW rules on the drafts, or re-read them after each save. List the part's `missing` in the summary as "Still to answer" (warn, not block). Hide `hidden` questions with their reason. Add a pass and a fail browser test for "details after Yes".

**Major 2. Repeating groups that share a section have no name, and one hides a required fact** (board: "Work history · last 10 years · Add every job"; D4).
Under "Your visit" and "Residence and immigration status" the client sees only "Nothing added yet. Add an entry if this applies" (14, 20). Nothing says that the entries are contacts in Canada, or the country where you live. `person.current_residence_country` is required and placed per row (`residence_history`). Because a group with no rows is never missing (`engine/runtime/case.ts:223`), the required country is never asked and never counted. It will reach R1d's P-71 "missing facts" check as complete. *Fix:* give each group a heading and help from the release (group or section label). In setup 4.5, place `current_residence_country` as a single question (or make a required group need at least one row). Add a fail test: "a required fact behind an empty group".

**Major 3. The conflict dialog cannot recover** (STANDARDS §4 [M] "stale save → 409 with what changed", EXPERIENCE §4 conflict).
After a 409 the dialog says "the newer answer is shown". In fact "Now:" still shows the value from when the dialog opened (client saved 7 100, dialog showed 5 200), and the input keeps the officer's draft. A second Save is 409 again, every time (37). `EditDialog` keeps the `q` captured on open (`questionnaire.tsx:434, 518`), so `expectedId` never updates. The journey test checks only the first message (`check_runtime_r1c.cjs:181`). *Fix:* read the question from the refreshed view, by fact, subject and row, and show the newer value. Add a test "second save after reviewing the newer value succeeds".

**Major 4. The agent view loses the source once a section is confirmed** (concept §2 "each fact with its source", D18).
After Confirm section every confirmed fact reads "confirmed section · Case officer" (33). Client A as the person who answered is no longer shown, for exactly the facts that will fill forms. This is build-notes known gap 2. *Fix:* show "answered by Client A (questionnaire), confirmed by the case officer, time", read from the confirmed version's `from`.

**Major 5. Countries are typed, and internal notes reach the client** (STANDARDS §3.2 [M] "pick, don't type", EXPERIENCE §5 [M]).
"Country or territory you are applying from" is a free text box with the note "No answer list yet (forms slice 2): the officer checks this answer…" (20, `case.ts:215`). The address group's Country is free text too: "Canada" was stored (16), although the country list exists (240 values, used by `current_residence_country`). The phone country code is typed. The board shows a country picker. *Fix:* use the country list for every country input, including the address part. Keep the officer note in agent mode only, in plain words.

**Major 6. The agent view scrolls sideways at 1024 px with a lawful household** (EXPERIENCE §2.12 [M] "1024 px and 200 % zoom work").
A principal, a spouse and four children (within the release's limits): the person tabs reach 1 622 px wide at 1024 (42). At 200 % zoom (512 px) the tabs reach 819 px (41). The builder's check used one child. *Fix:* wrap or scroll the tab list inside its own box (or use a person select below `lg`). Add a "no sideways scroll" check with 4 children.

**Minor**
- Double-click on "Add an entry" adds two entries (26). It has no busy state and no idempotency (same class as QA-28). Also, two success toasts appear for one child.
- Focus is not returned to the Edit button when the dialog closes (`activeElement` is body; WCAG 2.4.3).
- "Save and come back later" with a refused answer opens the summary without moving focus to it (`questionnaire.tsx:387`).
- Labels: "Another telephone number (optional) (optional)": the label already has "(optional)" and the renderer adds it again. "CAD $" wraps at 390 px (14). The client's own phone and email sit under "Representative and authorizations" (22). Field meanings are used as questions ("Whether the person…"). This is F-R1c-2, setup wording.
- Kinds and display data live in code: long text and email are guessed from field keys (`/detail|explain|describe|reason/`, `/email/`, `questionnaire.tsx:50`, `case.ts:143`). Plan M8 promised value types as data (`person.email` is still `text`). `WHO` (`questionnaire.tsx:401`) maps simulated actor ids to names inside the renderer that is meant for porting.
- Speed: a part saves one PUT per answer in sequence, 850 ms for the visit part. This is within budget (known gap 4).
- Graph (P-86), run with its output redirected to the scratchpad: it sees no `/cases` page and no `/api/runtime` route (the routes are nested under `RuntimeApp`, and the controller prefix is `api/runtime`). No test names C4.4, C6.1–C6.3, C6.6 or C6.10. So the graph cannot see this slice. Owner: the Lead's tool.
- Scaffolding (P-33): the two RT-7 checks are seeded by SQL in setup 4.5b, as the Lead directed. This is recorded, not a finding. Authoring stays with Screen 03.

## [M] lines (applicable)
- **Met:** one renderer (P-47); server authorisation and deny by default (wrong role 401/403/404); optimistic concurrency on the server, with 409 for answers and Confirm section; idempotent create for case and person; expand-only migration with recorded rollback; contract first (`QuestionnaireView` in `contracts/runtime.ts`); axe on every state (0 violations in 12 scans); warn, don't block (P-71); errors on the field; in-page confirmation for removing an entry; demo chrome separate (dashed "Acting as (simulated)"); path on the case page; one row of tabs; edit in a dialog; no hashes or IDs on the main path; one current answer with history in the database.
- **Not met:** §3.2 pick, don't type (Major 5); EXPERIENCE §4 conflict state (Major 3) and "needs work" (Major 1); §2.12 1024 px and 200 % zoom (Major 6); §5 copy (Major 5 note); §3.1 kinds by key name (Minor).

## D1–D20 (independent reviewer, browser and script)
| D | Score | Evidence |
|---|---|---|
| D1 | 3 | Types, P-72/P-78 words, RT-7 shown. RT-8 not live (M1). |
| D2 | 4 | One current answer, 409s, one child on double press. Double entry rows (Minor). |
| D3 | 4 | One question fills IMM 5257 for three people. Facts asked once. |
| D4 | 2 | A required fact sits behind an empty group (M2). Show/hide ignored (M1). |
| D5 | 3 | Reload and resume hold. The conflict dialog is stuck (M3). |
| D6 | 3 | Who and when are shown, but lost after confirm (M4). |
| D7 | n/a | No AI. |
| D8 | 4 | "Part N of 41", "Answering for", path on the case page. |
| D9 | 3 | One part per screen and "Continue where you left off". Unnamed groups, and the required step is silent. |
| D10 | 3 | Mostly plain, but field meanings as questions, "(forms slice 2)", "(optional) (optional)". |
| D11 | 4 | ✓ Saved, the summary takes focus, toasts. The conflict text is wrong (M3). |
| D12 | 4 | Team tokens, matches the board. Minor wraps. |
| D13 | 3 | axe 0, keyboard path works, 44 px targets. 1024 and 200 % overflow (M6). Focus is not returned. |
| D14 | 4 | Team names in the contract and team components. |
| D15 | 5 | Case page 252–288 ms, overview 217–248 ms, save and next 214 ms. |
| D16 | 3 | Engine 29/29 (rerun by me). The journey test misses M1, M2, M3 and M6. The graph is blind to the slice. |
| D17 | — | Simulated only (founder's walk). |
| D18 | 3 | Source and "fills" shown, then replaced by the officer (M4). |
| D19 | n/a | R1d not built. |
| D20 | — | Simulated only. |

## Journey score (skill journey-test): **7 / 10, below the pass mark (8), no criterion at 0**
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Whole questionnaire path to Confirm section done (05–36). |
| Next step obvious | ½ | Unnamed entries (14, 20). Silent skip after Yes (21). |
| Plain words | ½ | Field-meaning questions, "(forms slice 2)", "(optional) (optional)" (19, 20). |
| Feedback and state | ½ | Good summary and saved state, but the conflict says "newer shown" when it is not (35, 37). |
| Correct data | 1 | Database: values exact, history kept, one current, one child, 404/403/401 on the server. |
| Error recovery | ½ | Field errors are fixable in place. The conflict dialog loops on 409 (37). |
| Accessibility and screen sizes | ½ | axe 0 and keyboard OK. Overflow at 1024 and 200 % (41, 42). Focus lost after the dialog. |
| Speed | 1 | Every view under 300 ms. Save of the visit part 850 ms. |
| Visual quality | 1 | Clean, matches the board and team look (10, 14, 30). |
| Trust and sources | ½ | The source is overwritten by "Case officer" after confirm (33). The Sample check is labelled. |

Raise to 8+: fix M1 (next step, feedback), M3 (recovery), M6 (screen sizes), M4 (trust).

## Not checked
I did not rerun `check_runtime_r1c.cjs`, because it deletes and rewrites the builder's `screenshots/r1c/`, which is outside my write scope. I did not do a code mutation of web rules (the server is shared and must not restart). The walk was headless, not a visible browser. No real screen reader. D17 and D20 need the founder's or an intended user's unaided walk.
