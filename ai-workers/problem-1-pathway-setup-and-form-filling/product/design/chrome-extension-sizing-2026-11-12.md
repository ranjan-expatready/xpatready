# Chrome extension (M4 Track B) — sizing, 12 Nov 2026, 13:3x IST

**Who and why.** A read-only Fable planner (P-455 (5): Fable plans and challenges, never builds), asked by Lead 24 after the founder's "Yes, size it now" (~13:3x IST, 12 Nov). It sizes P-245 (our own AI-assisted Chrome extension that fills IRCC's representative portal screens from a case's checked answers), BACKLOG row L5, rows E1 to E6. No code was changed, no test was run, live AI stayed off, US$0.

**Read for it** (records on `origin/lead/2026-11-07-lead31` at 13:19 IST, which is newer than `main`'s copy): RULES (as of P-492); DECISIONS P-245, P-152, P-145, P-143, P-137, P-133, P-113, P-102, P-154, P-401; BACKLOG L5; `progress-and-roadmap-2026-11-11.md` §4, §6, §7; `bake-plan-2026-11-10.md`; `xfa-reuse-analysis-2026-11-11.md`; the team's SA-01B v2.1 (SA-1B-35, SA-1B-173, SA-1B-174, SA-1B-175, open questions ch4 Q7, Q8) and AG-18 in `domain/requirements-2026-11-02/`; the parked extension branch `lead/parked-extension-2026-10-26` (code, tests, `screens/F2-extension/` plan, reviews, Lead check); `main` 3ea36a0d3 (`engine/runtime/answer-sheet.ts`, `prisma/schema.prisma`).

## 0. The answer in five lines

* **Size: 40 builder sessions (range 34 to 48), about 145 builder-hours** at today's measured median of 3.6 hours from a branch's first commit to its merge (p75 9.1 h; see §2.0 for the measurement).
* **Most of it is not blocked by counsel.** Everything built and tested on Sample portal screens with test data (35 of the 40 sessions) can run now. Only the use on IRCC's real portal with a client's data, shipping the extension to a firm, and the AI fallback on real portal screens wait for counsel.
* **Forecast: Sample-complete (every row Works on Sample portal screens, exit tests §6 green) 24 Nov to 2 Dec IST** if building starts Mon 16 Nov beside M4 Track A and the hardening work, with two or three extension lanes. Kept last, as today's plan has it, it would be about mid-December.
* **We are not starting from zero.** The extension was built, reviewed to 9.5/10 and merged on 25 Oct (F2: pairing, capture, one-screen fill, re-capture tasks, side panel, 1,700 lines of app code and ~860 lines of tests), then parked on 26 Oct (P-102). Its four database tables are still in `main`'s schema. But `main` has moved 6,311 commits and ~157k lines since, so it is a re-port, not a merge.
* **Biggest unknown, now a cheap spike:** what the real portal pages are made of. The IRCC Portal's terms page answered our fetch with "Sorry to interrupt" and "CSS Error", the messages a Salesforce Lightning site gives, which suggests generated element ids and shadow DOM. The parked reader keys inputs by element id. *Inferred from the page's response, not confirmed: Sample.* Spike SP-2 settles it with three saved screens.

## 1. What the extension must do, in plain words

The representative (P-154: the licensed person named on IMM 5476) works in IRCC's portal in their own Chrome. A side panel from Expat Ready shows the case. On each portal screen the representative clicks **Fill this screen**. The extension fills that one screen with the case's checked answers, shows what it filled and what it could not, and stops. The representative checks the screen and clicks Next themselves. The extension never signs in, never clicks Next or Submit, never touches a declaration or a signature, and keeps nothing in the browser.

| Row | What it must do | What the team's spec and our decisions add |
|---|---|---|
| **E1 Structure reader + AI match per screen version** | Read a portal screen's own structure (headings, labels, input kinds, options) without any values; recognise which screen it is; match each input to our fields by meaning, using exact labels and known aliases first and AI only for what is left; save the match per screen version so AI runs once per screen, never per client; a second person approves the match. | P-245 "page's own structure first … AI vision or screenshots only as a fallback"; SA-1B-175 rule 2 and ch4 Q7 (screen identity = portal + screen name + ordered labels); P-152 (3) "the match is saved per screen and version". Our field maps already carry `screenKey`, `screenOrder`, `inputOrder`, `optionMap` and label aliases (`prisma/schema.prisma`, FormFieldMap, P-65). |
| **E2 Changed-screen detection and re-match review** | Before every fill, compare the live screen with the approved version. Any difference: fill nothing, say "This screen has changed", open one re-capture task, count a signal. Then re-match only what changed, show the changes highlighted, a second person approves the new version. | SA-1B-175 rules 2 and 7; parked XT-6 (one open task per version, screen and kind). |
| **E3 Fill with the representative's per-screen check** | Fill exactly the answer sheet's values for that screen (the same values, transforms and application fixes as C7.3, the Online answer sheet); a blank stays blank, never a default; never a declaration or signature box; never a file upload (listed instead); read every value back and highlight each mismatch; the representative ticks "I checked this screen", which records who and when (no values) and feeds C7.3's "entered" tick. | SA-1B-175 rules 3 to 6 and 8; SA-1B-176 (application fix is what fills); P-401 (the "entered" tick lives on C7.3); SA-1B-35 (AI never sets a value at fill time: the fill itself is deterministic, AI only proposes the map). |
| **E4 Login and navigation helper (never credentials)** | From the case's Online line, open the right portal (fixed by the combination, P-137) in a tab; on a sign-in page the extension reads nothing and fills nothing and says "Sign in yourself"; after sign-in it recognises where the representative is and says which application and screen come next. | P-245 "the representative always signs in themselves (GCKey, bank sign-in, multi-factor); credentials are never stored or typed by the product"; SA-1B-175 rule 1. |
| **E5 Vision fallback with masking** | Only where the page's structure cannot be read (canvas, closed custom widgets): a screenshot of the screen with every input region masked, sent once per screen version to a zero-retention provider in Canada or the US, through the spend ledger; never a client's values. | P-245 "field values masked before any AI call; only Canada or US zero-retention providers (SA-1B-268)"; P-133 (processing outside Canada: counsel); RULES "Money". |
| **E6 Screen-map hand-over for IMM 0008, 5669, 5406, 5562** | Approved screen maps for the four portal-only forms of the permanent-residence portals, passing the answer-key test, and an export the team's portal sheet (SA-1B-173) can read. | SA-1B-174 rule 5 and SA-1B-26 rule 3: "Portal web forms … get the portal sheet and the Chrome extension"; P-113. |

**Missing from E1 to E6 (added as rows E7 to E10):**

* **E7 The safe data path.** How a case's data reaches the extension: a one-time pairing code shown in Expat Ready to the signed-in staff member; an 8-hour, revocable token bound to that person, firm and extension id; the API answers only the fixed extension origin; one screen's answers per request, only for a case that person may work on; nothing stored in the browser; values never in logs or audit (audit = portal, screen, person, time, count). This was built and broken-tested in F2b (XT-1 to XT-3) and needs re-porting to the current roles (BK-4's role picker, P-154 words).
* **E8 People and lists.** Portal screens repeat per person (spouse, each child) and per list row (addresses, education, work history). The extension must never put the principal's values on the spouse's screen (F2 break-report Blocker, fixed by the whole heading as identity) and must handle "Add another": it never clicks it; it says "Add 2 more rows, then fill again". Dependent fields (a country choice that reveals a province list) are filled in order with a wait.
* **E9 Packaging and install.** A production build that can only run on the confirmed portal hosts (today `extension/hosts.json` holds Sample `.invalid` hosts, so a production build cannot touch any real site), a signing key kept safe (a lost key changes the extension id and breaks every pairing), a version handshake with the API, and an install path for firms (Chrome Web Store private or unlisted, or an admin force-install).
* **E10 Proof.** A capability pack for the extension journeys on GitHub's runners (Playwright's own Chromium, because branded Chrome refuses an unpacked extension: the F2 Lead check, 25 Oct), qa's gate-A walk, a fresh reader's verdict.

**One mismatch in the record:** P-245 cites "BR-32" among the team rules it overrides. The 2 Nov snapshot's only BR-32 is AG-10's "a person creates the lead" (WhatsApp leads), which has nothing to do with the portal. Probably a citation slip; the Lead may want to correct the pointer in a later DECISIONS row (append-only).

## 2. Counted rows

### 2.0 How the estimates were made

* **Pace, measured 12 Nov 13:3x IST** from `git log origin/main --merges --first-parent` (8 days): **169 merges in 7 days from builder branches** (not qa, not Lead), **24 a day**; 36 in the last 24 hours. Median time from a branch's first commit to its merge **3.6 h** (p25 1.7 h, p75 9.1 h). Median change **402 lines** (p75 817). These include qa and records merges' interleaving but not their own PRs.
* **One row = one builder session = one PR under ~800 lines** (RULES "Builders and qa"). Reviewer and breaker runs ride inside each PR's flow as today and are not counted separately, as in the Bake plan.
* **Hours per row** = sessions × 3.6 h (median). Where a row is new UI or touches money, schema or permissions, it gets a breaker (P-278) and usually a second review round: those rows are sized at 2 sessions.
* **Re-port factor:** the parked code passed review and breaking on 25 Oct. Rows that re-port it are sized at 1 session; rows that are new (AI match, change review, vision, people and lists, navigation) at 2. **Not measured yet:** how much of the parked code still fits `main`. Spike SP-1 measures it (§4).

### 2.1 The rows

"Before Bake?" = may start before the Bake's exit (co-founder's cold walk 14 Nov, fallback 15, P-482) without touching a Bake lane's files or a baton. Code rows wait for the exit by P-450 and P-463 ("M4 rows start only once the master analysis has counted M4 and each row is briefed").

| # | Row | Done when | Sessions | Hours (median) | Depends on | Before Bake? | Counsel? |
|---|---|---|---|---|---|---|---|
| 1 | **SP-1 Re-port measurement** (spike) | A scratch copy of `main` with the parked branch's extension files brought over; a note lists each file as "fits", "small fix" or "rewrite", the failing parked tests by name, and the line counts; nothing pushed to `main`. | 1 | 3.6 | none | **Yes** (scratch only) | No |
| 2 | **SP-2 Real portal structure** (spike, people only) | The immigration expert or the founder, signed in to their own representative account, saves 3 screens of an **empty** new application (no client data) as "Save page as, complete" from each portal the six pathways use; the files go to the Mac's `sources/` (never committed); a note says: Lightning or not, shadow DOM or not, ids stable across two loads or not, sign-in host names. | 0 builder (expert ~1 h, not measured) | — | none | **Yes** | Unconfirmed: no counsel (saving a page's labels from one's own account; P-152 already lets a person save portal screens) |
| 3 | **E0 Concept and challenge** | `screens/M4-extension/concept.md` by the screen-concept skill: panel states, words, the representative's check, E7 security model carried from F2's XT-1 to XT-7, best-in-class section (P-392), cost of E5 stated, at most three questions; a fresh challenger's notes; the Lead's approval (P-223 (4)). | 2 | 7.2 | SP-1, SP-2 notes | **Yes** (docs only) | No |
| 4 | **E7a Pairing and sessions re-port** | Pair, use, revoke, expire and wrong-origin cases pass and fail on real PostgreSQL (parked `check_forms_f2b.ts` cases, current roles); extension routes take the token only, app routes the sign-in only. | 1 | 3.6 | E0 | No | No |
| 5 | **E7b Extension shell and build** | Manifest V3 build; production build fails on a wildcard, localhost, an extra permission or a host not in `hosts.json` (XT-7); side panel opens; CI loads the unpacked dev build in Playwright's Chromium. Touches `.github/`: the Lead reads the diff (P-423). | 1 | 3.6 | E7a | No | No |
| 6 | **E1a Structure reader and screen identity** | The two readers agree on the Sample fixtures (`contracts/portal-reader-rules.json` conformance); identity = portal + whole heading + ordered labels (not element ids); shadow roots read if SP-2 finds them; a structure carries no values (refused on the server). | 1 (2 if SP-2 finds shadow DOM) | 3.6 | E7b, SP-2 | No | No |
| 7 | **E1b Match proposal per screen version** | Each input gets a proposed field: exact label and alias first (no AI), AI only for the rest through the existing `p2/prompts/screen-map.v1.md`, Saved replay at US$0; unmatched inputs say "You answer this on screen"; the proposal lands in the one review queue. | 2 | 7.2 | E1a | No | No |
| 8 | **E1c Review a screen map** (Studio) | A content publisher sees a screen's inputs beside the proposed fields, accepts, changes or marks "not a fact"; a second person approves; the approved version is what fills. New screen: walk before review (P-352), breaker. | 2 | 7.2 | E1b | No | No |
| 9 | **E2a Changed screen stops the fill** | A reworded Sample screen fills nothing, shows "This screen has changed", opens or updates one re-capture task, counts a signal (parked XT-6 cases pass and fail). | 1 | 3.6 | E1c | No | No |
| 10 | **E2b Re-match only what changed** | The re-capture task shows the old and new screen with changes highlighted; AI runs only on new or changed inputs; approval makes a new version; unchanged inputs keep their match. | 2 | 7.2 | E2a | No | No |
| 11 | **E3a One screen's answers from the answer sheet** | `fill-plans` returns exactly the C7.3 answer sheet's values for the inputs of that screen (transforms, option codes, application fixes, person and row), never a declaration, signature or upload, blanks blank; a test compares the two byte for byte on the checkpoint case. Holds the `case-prepare.ts` baton if it touches it (P-438 (2)). | 2 | 7.2 | E1c | No | No |
| 12 | **E3b Fill, read back, the representative's check** | The content script writes values, reads each back, highlights every mismatch; "I checked this screen" records person and time (no values) and updates C7.3's "entered" state; spies show no click on Next or Submit and no form submit. | 2 | 7.2 | E3a | No | No |
| 13 | **E3c Panel states and words** | Not recognised → Recognised → Filled → Checked, or Changed (nothing filled); "Filled 6 of 9 · 3 need you" with each reason; readable at 360 px; P-473 calm style; the primary button after "changed" says what to do (F2 Lead check Minor). | 1 | 3.6 | E3b | No | No |
| 14 | **E8a People and list rows** | Spouse and child screens get only their person's values (F2 Blocker test kept); a list screen with fewer rows than answers says "Add N more rows, then fill again" and fills the rows present; never clicks "Add". | 2 | 7.2 | E3b | No | No |
| 15 | **E8b Dependent fields, options, dates** | A choice that reveals another field is filled in order with a wait; an option the portal refuses is highlighted, never replaced; date parts follow the portal's own parts. | 1 | 3.6 | E3b | No | No |
| 16 | **E4a Open the portal and guide** | "Open in portal" on an Online line opens the combination's portal host in a tab; on a Sample sign-in page the content script reads and fills nothing (spy on every password and code input) and the panel says "Sign in yourself"; after sign-in the panel names the next application and screen from the approved versions. | 2 | 7.2 | E3c, hosts from SP-2 | No | No |
| 17 | **E5a Vision fallback with masking** | On a canvas-only Sample screen, the captured image has every input region masked (pixel test), the request carries no test value, the ledger reserves the worst case before the call, Saved replay at US$0; a provider adapter that refuses any provider not on the zero-retention list. | 2 | 7.2 | E1b | No | Real screens only |
| 18 | **E5b One measured paid run** | One paid run on 3 Sample screens on the Lead's Go, usual and worst cost first, one attempt (RULES "Money"); cost per screen recorded; qa labels it (P-275). | 1 | 3.6 | E5a | No | No (Sample screens) |
| 19 | **E6a IMM 0008 screen map** | All IMM 0008 screens (from SP-2-style saved empty screens) matched, approved by a second person, passing the answer-key test (SA-1B-181) on Sample answers. | 2 | 7.2 | E1c, saved screens | No | Unconfirmed: no counsel (as SP-2) |
| 20 | **E6b IMM 5669, IMM 5406, IMM 5562 screen maps** | Same as E6a, one PR each. | 3 | 10.8 | E6a | No | as E6a |
| 21 | **E6c Hand-over export** | A versioned export of approved screen maps (screen, order, label, field, option map) with a schema and a test, for the team's portal sheet (SA-1B-173). | 1 | 3.6 | E6a | No | No |
| 22 | **E9a Production build and version handshake** | The extension and the API refuse each other with a plain message when versions do not fit; the production build is signed with a key held outside git; a release checklist. | 1 | 3.6 | E7b | No | No |
| 23 | **E9b Install path** | A written, tested install for the chosen channel (Q3 in §7): private or unlisted Chrome Web Store item, or an admin force-install policy, tried on a test Chrome profile with the Sample hosts. | 1 | 3.6 | E9a, Q3 | No | Shipping to a firm: yes |
| 24 | **E10a Capability pack** | `acceptance/` pack for the extension journeys (exit tests X1 to X10) green on GitHub's runners on the checkpoint data, run id in qa's row. | 2 | 7.2 | E3c, E2b, E4a, E5a | No | No |
| 25 | **E10b qa walk and verdict** | qa walks a case from its Online line through every Sample portal screen to "entered" with no help (gate A), a fresh Opus reader gives the verdict (P-303). | 1 | 3.6 | E10a | No | No |
| 26 | **Walk fixes (reserve)** | Majors from E10b fixed with tests. Sized from the Bake: 10 Nov's gate walks alone logged three new bugs. | 3 | 10.8 | E10b | No | No |
| | **Total** | | **40** (34 to 48) | **~145 h** | | 4 rows before the Bake ends | 35 not blocked |

**Range.** Low (34): SP-1 shows most parked code fits, E1c reuses the field-map review screen, the reserve is half used. High (48): SP-2 finds Lightning shadow DOM and unstable ids (E1a, E8b double), E5 is needed on more screens than expected, and IMM 0008 needs three PRs.

## 3. Order, parallel lanes and forecast

**Before the Bake ends (now to 14-15 Nov), no code on `main`:** SP-1 (one Opus session in a scratch copy, US$0), SP-2 (the expert's hour), E0 concept and challenge, and the counsel brief (Q2). None touches a Bake file or baton.

**After the Bake's exit (from Mon 16 Nov), three extension lanes beside M4 Track A and the hardening work:**

| Lane | Rows in order | Sessions |
|---|---|---|
| A: data path and fill | E7a → E7b → E1a → E3a → E3b → E3c → E4a | 10 |
| B: match and change | (after E1a) E1b → E1c → E2a → E2b → E5a → E5b | 10 |
| C: people, maps, packaging | (after E3b) E8a → E8b; (after E1c) E6a → E6b ×3 → E6c; E9a → E9b | 11 |
| qa | E10a → E10b → reserve | 6 |

**Batons.** `prisma/schema.prisma`: the four extension tables exist; at most one small migration is expected (screen-version approval and signal count), which takes the schema baton for one PR. `api/src/case-prepare.ts`: only E3a may need it. Everything else is new files (`extension/`, `engine/extension/`, `api/src/extension.ts`), so the lanes conflict little with Track A.

**Critical path:** E0 → E7a → E7b → E1a → E1b → E1c → E3a → E3b → E3c → E10a → E10b → fixes: 20 sessions in a row, about 72 h at the median, so about 3 working days at best; review rounds and the queue make it 6 to 9 days.

**Forecast (IST):**
* **Sample-complete: 24 Nov to 2 Dec**, starting 16 Nov with three lanes (24 Nov) or two (2 Dec). This assumes the extension takes 6 to 9 of the ~24 builder merges a day, the rest staying with M4 Track A and the hardening work, which the brief forecasts to end around late November.
* **Kept last** (after Track A and hardening, as `progress-and-roadmap-2026-11-11.md` §4 orders it): starts ~late November, Sample-complete **~6 to 12 Dec**.
* **Real portal with a client's data:** not ours to date. It needs counsel's answer, the expert's confirmed host list, and real users, which are the team's (P-335). From a yes, the steps on our side (host list into `hosts.json`, a production build, the install for one design-partner firm) are about 2 sessions and 1 to 2 days.

## 4. Top risks and the spike that removes each

| Risk | What could happen | Spike or mitigation now | Cost |
|---|---|---|---|
| **Portal pages are not what the parked reader expects** | The IRCC Portal's terms page answered with Salesforce Lightning's error strings ("Sorry to interrupt", "CSS Error"); Lightning pages often generate element ids per load and hide inputs in shadow DOM. The parked reader keys inputs by element id. E1a and E8b could double. *Inferred, Sample.* | **SP-2**: three saved empty screens per portal, checked for shadow DOM and id stability. Identity already moved to heading + ordered labels after F2's break-report. | Expert ~1 h, US$0 |
| **Portal screens change** | IRCC rewords or reorders a screen; a fill writes into the wrong box. | E2's design stops the fill on any difference and re-matches only the change; signals counted per screen. Upkeep: each change costs one approval, not code. Rate of change: **not measured yet**; measured by the signal count once E2a runs on real screens (team's pilot). | Built into E2 |
| **Re-port cost** | 6,311 commits and ~157k lines since parking; the parked code predates BK-4 roles, P-154 words, the C7.3 answer sheet and the current case model. | **SP-1** measures it in a scratch copy before any row is briefed. | 1 session, US$0 |
| **Chrome Web Store and enterprise install** | A public listing waits for Google's review; a private listing is visible only inside one organisation's domain; force-install needs the firm's admin. Google: "Administrators can set policies that automatically and silently install extensions for users in the organization" (developer.chrome.com/docs/webstore/cws-enterprise, read 12 Nov 2026). A lost signing key changes the extension id. | Q3 decides who publishes; E9a keeps the key outside git; dev and test always use the unpacked build. | Account fee and review time: **not measured yet**, checked at registration |
| **IRCC terms of use** | IRCC can end the representative's account access. The IRCC Portal terms (ircc-services.canada.ca/cxp/s/terms-and-conditions, search excerpt 12 Nov 2026; the page itself did not render to our fetch): IRCC "can revoke access if you fail to abide by the Terms and Conditions of Use". No public clause on automated tools was found on canada.ca (terms page "2024-11-01") or in the portal guides, matching the team's 18 Oct research (SA-1B-175 §2). The terms shown at sign-in are not public. | Our design already keeps the person in charge of every screen, Next and Submit; counsel reads the sign-in terms (Q2). **Unconfirmed: no counsel.** | Counsel fees: founder's money, not measured |
| **Privacy of client data** | Values pass through the browser on a firm's machine; a leak or a log of values; data sent to AI. | E7 (token per person, one screen per request, nothing stored, no values in logs or audit); E5 masks every input and sends only screens without client values; exit test X5 checks network, storage and logs. Production processing outside Canada: P-133, counsel. | Built into E7, E5 |
| **AI vision fallback cost** | Many screens need vision, or vision runs per client. | Vision runs once per screen version, never per client (P-245); structure first. Cost per screen: **not measured yet**; E5b's one paid run on Sample screens measures it with usual and worst cost stated first. | E5b, inside the day cap |
| **Representative availability** | SP-2 and E6 need saved empty screens from a real account. | Ask now (Q2 rides with the counsel brief); E6 is the last lane, so a late answer moves only E6. | Expert time, not measured |

## 5. Legal and counsel points

Every point below is **Unconfirmed: no counsel** (AGENTS rule 4).

1. **Do IRCC's portal terms allow a browser extension that fills screens the representative then checks and submits?** No public clause found (§4). The sign-in terms are not public. Asked of counsel.
2. **Does using the extension change the representative's professional duty?** The representative checks every screen and clicks Next and Submit; the product never signs, never declares. Whether that is enough under the College's code of conduct (for RCICs) or a law society's rules is for counsel.
3. **Client data in the browser and in AI.** Processing a client's values in the browser on the firm's machine, and any AI processing outside Canada (P-133), need counsel and the client's consent wording.
4. **Saving portal screens' structure** (labels, no values) from a representative's own account into our library, and Crown copyright in those labels. P-152 already lets a person save portal screens; counsel to confirm.
5. **Liability** if a filled value is wrong and the representative misses it (read-back highlights, but a person decides).

**Blocked by counsel:** use on IRCC's real portal with a client's data (the pilot); shipping the extension to any firm (E9b's last step); E5 on real portal screens that may hold client values. **Not blocked:** every row built and tested on Sample portal screens with test data (rows 1, 3 to 18 and 21 to 26; row 23 up to its trial on a test Chrome profile), which is 35 of the 40 sessions. Rows 2, 19 and 20 (5 sessions) rest on point 4: they need only empty screens, and decision P-152 covers saving them, but counsel should confirm.

## 6. Exit tests (Sample screens and test data only)

Each runs from a script on GitHub's runners (Playwright's Chromium with the unpacked dev build, the Sample portal fixture server, the checkpoint case) unless marked as a person's walk.

* **X1 Fill:** pair with a code, open the checkpoint case, on Sample screen s01 click Fill this screen: every filled value equals the C7.3 answer sheet's value for that input, byte for byte; the declaration box is empty; the upload box is listed, not filled; a spy records no click on Next or Submit and no form submit.
* **X2 Changed screen:** on the reworded fixture nothing fills, the message shows, exactly one re-capture task is open, a signal is counted; re-match proposes only the changed inputs; after a second person approves, X1 passes on the new version.
* **X3 Right person:** on the spouse screen no principal value appears.
* **X4 Read-back:** on the hostile-option fixture the refused option is highlighted and nothing is silently replaced.
* **X5 Privacy:** during X1, every network request goes to the API origin only; after the fill `chrome.storage`, `localStorage` and IndexedDB hold no test value; the audit row has portal, screen, person, time and a count; a search of the server's logs for the test values finds 0.
* **X6 Token:** revoked, expired, another extension id and another origin are each refused (401, or no CORS headers).
* **X7 Manifest:** a production build with a wildcard host, localhost, an extra permission or a host missing from `hosts.json` fails; today's Sample `.invalid` hosts cannot reach any real site.
* **X8 Sign-in:** on a Sample sign-in page the content script reads and writes nothing (spy on every password and code input) and the panel says "Sign in yourself".
* **X9 AI off:** with live AI off and only approved maps, X1 gives the same result (SA-1B-35: the fill is deterministic).
* **X10 Masking:** on the canvas-only fixture the image sent (Saved stub) has every input region masked (pixel check), the request holds no test value, the ledger reserved the worst case first.
* **X11 Maps:** IMM 0008, 5669, 5406 and 5562 maps pass the answer-key test on Sample answers; the export validates against its schema.
* **X12 Person's walk:** qa's fresh reader, from the case's Online line, opens the Sample portal, fills and checks every screen and reaches "entered" on C7.3 with no help and 0 open Majors.

## 7. Founder questions (three, each with a recommendation)

**Q1. Start the extension right after the Bake, beside M4 Track A, instead of last?**
*Recommendation: yes, from Mon 16 Nov, three lanes, on Sample screens only.* Time: Sample-complete 24 Nov to 2 Dec instead of ~6 to 12 Dec (about 10 days earlier). Cost: the same ~40 sessions either way, no paid usage beyond E5b's one run inside the day cap. Quality: same gates; it mostly writes new files, so little conflict with Track A. Risk: Track A gets ~6 to 9 fewer merges a day while the lanes run.

**Q2. Book counsel now, with the immigration expert's saved empty screens in the same ask?**
*Recommendation: yes, a one-page brief with the five points of §5; the expert saves three empty screens per portal this week (SP-2).* Time: counsel's answer only gates the real-portal pilot, so booking now keeps that date from becoming the longest wait; SP-2 removes the biggest build unknown before the first row. Cost: counsel fees are your money and not measured; the expert ~1 hour. Quality: no product bar changes; without it the extension can never leave Sample screens.

**Q3. Who publishes the extension for firms: us or the team?**
*Recommendation: we build the signed production package, the version check and a tested install guide (E9a, E9b); the team owns the store listing and firm installs, as real users and environments are theirs (P-335).* Time: saves a store account and listing review from our path. Cost: about 1 session less on our side. Quality: same; the package is ours and tested.

## 8. Notes for the Lead

* `progress-and-roadmap-2026-11-11.md` §7 said "not sized yet": it is now 40 sessions (34 to 48).
* The pace in the brief (~20-25 a day) matches the measurement (24 a day over 7 days); the roadmap's "30-35 per week" was the weekly-plan limit of the old account, which P-461 lifted.
* P-245's "BR-32" pointer looks wrong (§1).
* Do not merge the parked branch: bring files over row by row after SP-1's note.
