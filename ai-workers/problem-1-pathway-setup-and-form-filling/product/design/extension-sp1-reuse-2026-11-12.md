# SP-1: how much of the parked extension still fits `main` (12 Nov 2026)

**Who and why.** An Opus builder, spike SP-1 of the Chrome extension plan (`chrome-extension-sizing-2026-11-12.md` §2 row 1 and §4, on `lead/2026-11-07-lead31`; P-245, P-495). Scratch work only. Nothing went to `main`, there is no PR, live AI stayed off and it cost US$0. No Bake file, `prisma/schema.prisma` or `api/src/case-prepare.ts` was touched on any shared branch.

**Scratch branch:** `claude/ext-sp1-scratch`, cut from `origin/main` 3ea36a0d3. It has 3 commits:
1. `38ed338e6`: the 72 files that W1-02 (d57515064, 26 Oct) deleted, copied unchanged from `lead/parked-extension-2026-10-26` (b44f5682b). Parking also renamed 2 fixtures.
2. `c249f875e`: the park commit's hunks in shared files reversed onto today's code. Applied where they apply cleanly. `contracts/forms.ts` and `api/src/main.ts` were union-resolved, keeping P-143's four channels. The other 29 conflicted files were left as `main` has them.
3. `f05effe8c`: the 2 moved fixtures restored under their parked names, plus a 2-line guard adaptation (see E7a).

**Method.** The parked branch is an ancestor of `main`: b44f5682b is the merge base, and `main` is 6,311 commits ahead. So "the parked extension" means exactly what d57515064 removed:
* 72 whole files (4,960 lines);
* hunks in 42 shared files (≈3,000 lines added back, before the evidence JSON).

The type check is CI's own `product/tools/typecheck.mjs` (api + web) plus `tsc -p extension/tsconfig.json`. Tests ran on Node 24.21.0 and PostgreSQL 18 from `cloud-setup.sh`, on isolated copies.

## 0. The answer in five lines

* **The browser side fits almost unchanged.** In the 72 files: **57 fit** (15 code, 2 checks, 40 fixtures), **12 adapt** (6 code, 6 checks), **3 are a rewrite** (1 code, 2 checks).
  * The reader, filler, content script, manifest, build and both readers' rules pass their parked checks with no change: f2a 62/62, f2c_fill 20/20.
  * Both builds succeed.
  * The unpacked dev build loads in Playwright's Chromium under the fixed id `ipomjnfjkniidipddghocobgcfecebaf`.
* **Pairing and tokens work on today's API after a 2-line change.** f2b passes 51 of 52. The one failure is the missing capture code below.
* **What does not fit is the server half.** That is the capture lifecycle, online versions and screen maps, which parking cut out of `api/src/forms.ts` (+839 lines, 7 conflicts). Nothing like it exists on `main`: no `/captures`, `/online-versions` or `/combinations/:id/portal` route. `main` also refuses an ONLINE form edition (`Forms.pdfEdition`).
  * Of the 42 shared files, 12 take the parked hunks cleanly and 30 conflict (77 conflict regions).
  * The plan has no row for this.
* **One file is a rewrite: the fill plan (`engine/extension/fill.ts`).** It fills confirmed facts only, from an online version's map. Today the C7.3 answer sheet fills declared and confirmed answers (P-242, P-411) by form parts, and row E3a needs the two to match byte for byte. Its `portalValue` (dates, codes, lengths) passes its 3 checks and is kept.
* **Estimate: 40 → 42 sessions (range 36 to 49).**
  * +2: a new row E1-0 re-ports the capture lifecycle and online versions in two PRs.
  * E7a, E7b and E1a are confirmed at 1 session each.
  * No row gets cheaper by a whole session: where the parked code fits, the plan had already sized that row at 1.

## 1. Type check (scratch copy)

| Step | Result |
|---|---|
| Parked files alone on `main` | api: 20 new errors. Every one is a symbol that parking removed from a shared file: `portalLabel`, `CAPTURE_CONTRACT` (contracts/forms.ts); `bearerOf` (core.ts); `inputKey`, `rawId`, `screenIdentity`, `screenQualifier`, `draftScreenMap` (twin.ts); `Forms.capture/createCapture/addExtensionScreen/removeScreen/finish` (forms.ts); 2 implicit `any`s that follow from these. web: 0. extension: 0. |
| + the 12 clean hunks, union of contracts/forms.ts and main.ts | api: **6 errors, all `Forms.<capture method>` in api/src/extension.ts**. web: 0. extension: 0. The 15 errors already listed in `typecheck-known.txt` are unchanged. |

## 2. Tests run (scratch copy)

| Check | Result | What it says |
|---|---|---|
| check_forms_f2a (both readers, rules conformance, browser) | **62/62** | It passes once 2 fixtures are back under their parked names. Parking moved them, unchanged, to `fixtures/intake/`. |
| check_forms_f2c_fill (content-script fill, read-back, no submit, Undo) | **20/20** | Unchanged. |
| check_forms_f3a0 (PDF section groups, with the twin.ts hunk) | **17/17** | The hunk applies cleanly. |
| check_forms_f2b (pairing, token, origin, modes) | **17/26** as brought over; **51/52** after the 2-line change | Two guards that `main` gained after parking refuse the extension's token: C6.16 (a Bearer header reaches only `/api/link/`) and QA-53 (every GET is denied by default). The change: let `/api/extension/` past C6.16 and mark the controller `@OpenRead`, since it checks its own token. The 1 failure left is `createCapture` (HTTP 500). |
| check_forms_f2a_api | **17/21** | Screen identity, fingerprint, difference, the spouse-screen qualifier (F2 Blocker B1) and the server-side answer refusal all pass. Capture routes return 404. |
| check_forms_f2c | **3/4** | BR-10's pure `portalValue` passes. It then stops in setup: `setup_visitor_visa.ts` 4.2 (drafting by replay) failed in this copy. That is `main`'s own helper. **Not measured yet** whether it fails on a clean `main` copy too. The rest of the check needs `forms_f2_setup.ts`, which needs the missing routes. |
| check_forms_f2d, check_forms_apr, check_forms_f3c, check_forms_f3c2 | **Not measured yet** | Each one's setup (`forms_f2_setup.ts` releaseOnline, captures) calls routes that `main` does not have, so they cannot pass before E1-0. They can be measured by running them after E1-0 lands. The copies also could not start reliably here: this container resets the scratch folder's permissions, which blocks PostgreSQL. |
| Extension builds | **production and development both built** (Vite 8.1.0, same as parked) | The production manifest holds only the Sample `.invalid` hosts, `sidePanel` and `storage`. |
| Unpacked dev build in Playwright's Chromium | **loads** | Fixed id `ipomjnfjkniidipddghocobgcfecebaf` (XT-2). The panel shows "Not connected / Connect the browser extension". |

Shared-file checks: the 12 clean hunks include 7 test files (f1p, f3a0, slice2b, screen01_api, screen01_channels, screen02_slice1, screen02_slice2). Only f3a0 runs without a server. The others need the same missing routes: **not measured yet**, for the same reason.

## 3. Every parked file

Words: **fits** = builds and its checks pass unchanged. **adapts** = small changes, named. **rewrite** = the reason is named.

### 3.1 Code (22 files, 2,171 lines)

| File | Lines | Verdict | Why |
|---|---|---|---|
| extension/src/reader.ts | 231 | fits | f2a 62/62 (both readers agree on every fixture). |
| extension/src/filler.ts | 123 | fits | f2c_fill 20/20: fill, read back, no submit, hidden inputs skipped, Undo. |
| extension/src/content.ts | 44 | fits | Builds, and f2c_fill drives it. |
| extension/src/api.ts | 18 | fits | Builds. |
| extension/src/background.ts | 3 | fits | Builds, and the service worker registers in Chromium. |
| extension/src/env.d.ts | 2 | fits | tsc clean. |
| extension/src/panel.css | 8 | fits | Builds. |
| extension/panel.html | 12 | fits | The panel renders in Chromium. |
| extension/tsconfig.json | 17 | fits | tsc exit 0. |
| extension/build.ts | 80 | fits | Production and development builds both succeed. |
| extension/hosts.json | 5 | fits | Sample `.invalid` hosts. The real ones wait for SP-2 and counsel. |
| contracts/extension.ts | 44 | fits | tsc clean. Shared by the API and the extension. |
| contracts/portal-reader-rules.json | 80 | fits | f2a conformance passes. |
| tools/read_portal_capture.py | 425 | fits | f2a reads every fixture with this reader and the live one: 62/62. |
| samples/portal-capture-template.csv | 8 | fits | Data, unchanged. |
| extension/manifest.ts | 65 | adapts | The description says "fills one screen from a case's **confirmed** facts". P-242 and P-411 make that "checked answers". 1 string. |
| extension/src/panel.tsx | 365 | adapts | It compiles. Its portal list uses the parked keys (`apr_portal`…), where P-143 now has `IRCC_ACCOUNTS` (`APR_PORTAL`…). Its words point to a Studio page that is no longer routed. Its states become row E3c's (Not recognised → Recognised → Filled → Checked / Changed). |
| engine/extension/screens.ts | 88 | adapts | Compiles once twin.ts's clean hunk is back; f2a_api's identity, fingerprint and difference checks pass. Identity is the heading only. SA-1B-175 Q7 and row E1a want portal + heading + ordered labels: a small change, kept apart from element ids. |
| engine/capture.ts | 80 | adapts | Needs `CAPTURE_CONTRACT` and `portalLabel` back in contracts/forms.ts. The parked `PORTALS` keys must map onto P-143's IRCC accounts (one list, not two). |
| api/src/extension.ts | 297 | adapts | (1) The 2-line guard change above (C6.16, QA-53). (2) `modesOf` gives fill mode to the `case` duty. P-154 and P-245 say the representative fills, so fill mode should follow the `represent` duty (1 line, to confirm in E0). (3) Its capture routes call the `Forms` methods that E1-0 brings back. With (1), f2b passes 51/52. |
| web/src/pages/extension.tsx | 80 | adapts | web tsc is clean. It is not routed: App.tsx's hunk conflicts (5 regions). Its place in the Studio follows BK-4's role picker and hand-offs. |
| engine/extension/fill.ts | 96 | **rewrite** | **C7.3 answer sheet, current case model.** It fills "confirmed fact" only (P-72) from an online version's field map (`onlineMapOf`, a FormEdition with channel ONLINE). Today C7.3 (`engine/runtime/answer-sheet.ts`) fills declared and confirmed answers with their marks (P-242, P-411) by form parts, and `main` refuses ONLINE editions. Row E3a needs the two to match byte for byte. Kept: `portalValue` (≈25 lines, BR-10 checks 3/3) and the not-captured, changed and incomplete-map branches. |

Code: **15 fit, 6 adapt, 1 rewrite.** In lines: fit 1,100, adapt 975, rewrite 96.

### 3.2 Checks and test scaffolding (10 files, 1,758 lines)

| File | Lines | Verdict | Why |
|---|---|---|---|
| tests/check_forms_f2a.ts | 110 | fits | 62/62. Only its 2 fixtures moved. |
| tests/check_forms_f2c_fill.ts | 105 | fits | 20/20. |
| tests/check_forms_f2b.ts | 219 | adapts | Unchanged itself. It passes 51/52 once api/src/extension.ts is adapted; the last case needs E1-0. |
| tests/check_forms_f2a_api.ts | 143 | adapts | 17/21. The capture cases wait for E1-0. 2 implicit `any`s to type. |
| tests/check_forms_f2d.ts, check_forms_apr.ts, check_forms_f3c.ts, check_forms_f3c2.ts | 230, 308, 248, 175 | adapts (**not measured yet** past setup) | These are the browser journeys of the panel and content script, which fit. Their setup goes through `forms_f2_setup.ts` and the capture routes. They get measured by running them after E1-0. |
| tests/forms_f2_setup.ts | 53 | **rewrite** | **Current case model and P-143.** releaseOnline does: `PATCH /combinations/:id/portal` (gone: P-143 sets an IRCC account), channel ONLINE from an approved online version, `/online-versions/:id/screen-map/*`. It goes with E1-0. |
| tests/check_forms_f2c.ts | 167 | **rewrite** | **C7.3 answer sheet.** It asserts fill.ts's confirmed-only rules. Its BR-10 part (3/3) is kept; the rest is rewritten with E3a against the C7.3 sheet. |

Checks and scaffolding: **2 fit, 6 adapt, 2 rewrite** (fit 215 lines, adapt 1,323, rewrite 220). Four of the adapts (f2d, apr, f3c, f3c2) were not measured past their setup.

### 3.3 Fixtures and the fixture server (40 files, 1,031 lines)

| Files | Verdict | Why |
|---|---|---|
| tests/fixtures/portal/ (15: 13 HTML screens and hostile cases, template-with-answers.csv, README.md) | fits | Data. f2a reads every `.html` with both readers: 62/62. |
| tests/fixtures/portal-apr/apr-*.html (13) | fits | f2a reads them all. |
| tests/fixtures/portal-apr/live-*.html (9) | fits (data; its check was not run past setup) | Read by check_forms_apr. They are the shadow-DOM, frame, combobox and unlabelled refusals, which SP-2 may make central. |
| tests/fixtures/portal-fill/*.html (2) | fits | f2c_fill 20/20. |
| tests/fixtures/portal-server.mjs (1) | fits (data server; not run here) | Used by f2d, apr, f3c and f3c2. |

Also, outside the 72: parking moved 2 fixtures byte-identical to `fixtures/intake/` (`portal/imm5257-online-s1-personal.html`, `portal/intake-one-question-answered.html`). They adapt by path only: the scratch branch restores them under their parked names.

### 3.4 Totals (the 72 files W1-02 deleted)

Each file checked against `git diff --name-status d57515064^ d57515064` (72 D rows).

| Verdict | Code | Checks + scaffolding | Fixtures | All | Lines |
|---|---|---|---|---|---|
| fits | 15 | 2 | 40 | **57** | 2,346 |
| adapts | 6 | 6 | 0 | **12** | 2,298 |
| rewrite | 1 | 2 | 0 | **3** | 316 |
| **All** | 22 | 10 | 40 | **72** | 4,960 |

The 3 rewrites have a named reason: fill.ts and check_forms_f2c (C7.3 answer sheet, P-242/P-411), forms_f2_setup.ts (P-143 accounts, current case and configuration model). None is a rewrite because of BK-4's roles or P-154's words: those are adapts (api/src/extension.ts's fill duty, web/src/pages/extension.tsx's route, panel and manifest words).

### 3.5 The shared-file hunks (42 files that parking edited, not deleted)

Reversing d57515064's hunks onto `main` with `git apply --3way`:

* **Clean (12):** engine/twin.ts (+225: no-AI screen-map drafting, screen identity), api/src/core.ts (`bearerOf`), api/src/intake.ts, contracts/screen02.ts, package.json (`extension`, `extension:dev` scripts), tests f1p, f3a0, slice2b, screen01_api, screen01_channels, screen02_slice1, screen02_slice2. **fits / adapts.** f3a0 passes; the rest need the routes.
* **Conflict (30, 77 regions):** api/src/forms.ts (+839/−24, 7 regions), tests/check_forms_channels.ts (8), engine/channels.ts (5), engine/snapshot.ts (5), web/src/App.tsx (5), web/src/components/channels.tsx (5, +210), tests/check_screen01_smallfix.cjs (5), contracts/forms.ts (3), api/src/form-lines.ts (3), api/src/forms-demo.ts (3), api/src/programs.ts (3), tests/check_forms_demo.ts (3), and 18 files with 1 or 2 regions each (main.ts, ai.ts, demo.ts, screen02.ts, review-queue.ts, sources.ts, contracts/programs.ts, contracts/review-queue.ts, engine/programs.ts, engine/validate.ts, web pages combination, review-items, sources, to-review; tests ai_launch_paths, slice2, screen01_browser, screen02_slice2_browser).
  * These conflicts are about meaning, not text. P-143's four channels and IRCC accounts replaced the parked channel list and portals. The Forms service gained ChangeSets and library locks. Online versions (FormEdition channel ONLINE) are refused by `main`. **Verdict: rewrite for the capture and online-version lifecycle in forms.ts** (the current case and configuration model). **Adapts** for the rest: channel UI, review-queue kinds, routes, demo seed.

## 4. What it changes in the plan's estimates

The plan sized re-port rows at 1 session and new rows at 2, without measuring re-port cost (§2.0). Measured:

| Row | Plan | SP-1 evidence | New | Δ |
|---|---|---|---|---|
| **E1-0 (new) Capture lifecycle and online versions back in `api/src/forms.ts`** | — | Missing on `main`; 839 lines in 7 conflicts against P-143, ChangeSets and the ONLINE-edition refusal; carries `forms_f2_setup.ts` (rewrite) and unblocks f2d, apr, f3c, f3c2, f2a_api and f2b's last case. Over 800 lines, so 2 PRs (RULES "Builders and qa"). Its model choice (online version as a FormEdition, or its own screen-version table) belongs in E0. It may need the schema baton, as the plan's one small migration. | **2** | **+2** |
| E7a Pairing and sessions re-port | 1 | f2b 51/52 with 2 lines (C6.16, QA-53) + `bearerOf` (clean) + `represent` duty (1 line). | 1 (low end, confident) | 0 |
| E7b Extension shell and build | 1 | Builds fit unchanged; the unpacked build loads in Playwright's Chromium with the fixed id; manifest 1 string. The Studio page needs a route under BK-4. | 1 (confident) | 0 |
| E1a Structure reader and screen identity | 1 (2 if shadow DOM) | Both readers and the rules fit (62/62). Identity is heading-only: add portal + ordered labels (small). The live-* refusal fixtures exist. | 1 (2 if SP-2 finds shadow DOM) | 0 |
| E1b Match proposal | 2 | No-AI drafting (`draftScreenMap`, twin.ts) reapplies cleanly; the guarded AI job and map storage are in E1-0's forms.ts. | 2 | 0 |
| E1c Review a screen map | 2 | The review pages and queue kinds conflict (review-items 1, to-review 2, combination 2, review-queue 1+1). | 2 | 0 |
| E2a Changed screen stops the fill | 1 | `screenDifference` fits (f2a_api E-3 passes); recapture tasks are in api/src/extension.ts (adapts). | 1 | 0 |
| E2b Re-match only what changed | 2 | Parked F3 re-capture code is in forms.ts (E1-0); f3c, f3c2 **not measured yet**. | 2 | 0 |
| E3a One screen's answers from the answer sheet | 2 | fill.ts is a rewrite against C7.3; `portalValue` kept (3/3). | 2 | 0 |
| E3b Fill, read back, the representative's check | 2 | filler.ts fits (20/20: fill, read-back, mismatch, no submit, Undo). The "I checked this screen" tick into C7.3 is new. | 2 (could be 1 if the tick is small) | 0 |
| E3c Panel states and words | 1 | panel.tsx adapts (portal keys, words, states). | 1 | 0 |
| E8a People and list rows | 2 | The F2 spouse Blocker's identity and qualifier checks pass (f2a_api B1). "Add N more rows" is new. | 2 | 0 |
| E8b Dependent fields, options, dates | 1 | `portalValue` dates and codes pass; the select placeholder and code-clearing cases pass (f2c_fill M6, BR-11). The wait-for-reveal is new. | 1 | 0 |
| E4a Open the portal and guide | 2 | Nothing parked covers it. **Not measured** (new). | 2 | 0 |
| E5a, E5b Vision fallback | 2, 1 | Nothing parked. **Not measured** (new). | 2, 1 | 0 |
| E6a, E6b, E6c Screen maps and export | 2, 3, 1 | They rely on E1-0 (online versions) and the saved-page reader, which fits. | 2, 3, 1 | 0 |
| E9a, E9b Production build, install | 1, 1 | The production build with Sample hosts fits; the signing key and handshake are new. | 1, 1 | 0 |
| E10a, E10b, reserve | 2, 1, 3 | The parked journeys (f2d, apr, f3c, f3c2) are a base for the pack once E1-0 lands. | 2, 1, 3 | 0 |
| **Total** | **40 (34 to 48)** | | **42 (36 to 49)** | **+2** |

**Range.** Low 36: the plan's low (34) + 2. High 49: E1-0 is a third PR if the online-version model changes in E0 (+1), with the plan's high otherwise kept.

**Order.** E1-0 goes on lane B's critical path between E7b and E1b. Lane A (E7a → E7b → E1a) can start on day 1 on the fitting code. The critical path grows by about 2 sessions (≈7 h at the median), and the 24 Nov to 2 Dec forecast moves by about half a day to a day.

## 5. Notes for the Lead

* **One check of `main`'s own helper, not ours:** `tests/runtime/setup_visitor_visa.ts` step 4.2 ("drafted by replay", `items` undefined) failed in this scratch copy. It is **not measured yet** whether it fails on a clean `main` copy (this copy runs Node 22 for child processes and resets folder permissions). If it fails on `main` too, it blocks every F2 setup.
* **The guard change (C6.16, QA-53)** is a security decision: E7a's brief should name it, and the breaker should try a link session's token on `/api/extension/` (P-278).
* **One word to settle in E0:** which duty gives fill mode, `case` (parked) or `represent` (P-154, P-245).
* Nothing here needed the founder. No question was raised.
