# S3 Start setup: screen challenge (screens lane, 28 Oct, stage DESIGN, no code)

**What is challenged:** S3 as agreed: walkthrough v2 "S3" (founder OK, 27 Oct), P-125 (Start setup opens the workspace with the place read-only; the New combination page goes), P-123 (the form finder runs at Start setup; forms attach with no confirm step), P-110 amended 28 Oct (cost stated first; live only when someone runs live). It also takes runtime's two "Left as it is" points (Lead, 28 Oct). Read against main **06a8fc30** (S4 merged) plus this lane's qa FIX (in Lead PR #67). This refreshes the S3 re-check in `screens/W1-structure-programs/challenge.md` (28 Oct) and its addendum, which this file replaces.

**Freshness:** `ai-workers/tools/freshness.sh` cannot run in this copy (`sources/` and `code/` are Mac-main only). S3 cites only SA-01B C1–C5, already checked in the S1 challenge, so nothing here rests on an unverified team source.

## Verdict: **Build after these changes.** 0 Blocker, 4 Major, 6 Minor.

## Objections (ranked)

**M1 · Major · What Start setup spends (P-125 (3), walkthrough v2 vs P-110 amended).** *Needed for the proof.*
- **Facts:** the walkthrough v2 says the workspace "opens on its Forms tab with the finder already running (rules first, then AI, about US$0.20; US$0 replay in the demo)". P-110 amended says "live cost is spent only when someone runs live" and every run states its cost first.
- **Facts, the finder's API** (`api/src/finder.ts`): `POST /combinations/:id/forms/find/plan`, then `…/find` with `planSha256` and an `idempotencyKey`. Its modes:
  - `replay` exists only for a trail with a saved run;
  - `rules` lists printed numbers and attaches nothing;
  - `live` is capped by the ledger.
- **What breaks:** a combination added today (for example "Transit visa" through the Add pop-up) has no saved run. With replay, the finder stops with "no saved answer". With rules only, nothing is attached. Either way the person lands on a workspace with no forms, after a Start setup that promised them.
- **Fix:**
  - Start setup picks the mode on the server, in one call. Saved replay when a saved run matches the trail (US$0, labelled with its date). Otherwise live rules-then-AI, with the worst case written in the Start setup "i" tooltip and on the run card before the first AI round.
  - When the ledger cannot cover the worst case, it runs rules only and the run card says why, with "Find with AI (about US$0.20)".
  - Pressing Start setup is "someone runs live" in P-110's words. Question Q1 confirms this.

**M2 · Major · The New combination page goes with its callers, endpoints and checks (P-125 (5)).** *Needed for the proof.*
- **Facts, the page and its links:**
  - `web/src/pages/new-combination.tsx` is the `/new` route (`App.tsx:101`).
  - The menu match in `App.tsx:41` includes `/new`.
  - Immigration programs' `open()` sends a Not started name to `/new?leaf=` (`programs.tsx:161`).
  - Program structure's Edit panel `StartSetup` links there too (`structure.tsx:457`).
- **Facts, the endpoints only the page uses:** `POST /combinations/path` (`main.ts:125`) and `POST /path-proposal` (`screen02.ts:166`). They are tested in `check_w1_structure.ts`, `check_screen01_api.ts` and `check_screen02_slice2.ts`.
- **Facts, checks that open `/new`:**
  - `check_screen01_browser.cjs`, `check_studio_browser.cjs` (Pass B), `check_w1_programs_s2.cjs`, `check_w1_s1s2_fix.cjs`, `check_screen02_slice2_browser.cjs:216`;
  - qa's `check_qa_am_s2_1027.cjs` and `check_qa_m2_journeys.cjs`.
- **Fix:**
  - Remove the page, its route and its menu match.
  - Pass B adds its names through the Program structure pop-up, then runs Start setup from the card.
  - The path-builder steps already live in `check_w1_structure_browser` (the pop-up). The other checks open the workspace through Start setup.
  - Remove both endpoints and their API steps in S3, since no page calls them. They would be a second way to place a combination, which P-125 (5) forbids.
  - qa's two checks are qa's files: the Lead routes them.
- **Lead decision:** remove the endpoints now (recommended), or keep the API until a cleanup slice.

**M3 · Major · Start setup on a retired name, or on one with a waiting change.** *Needed for the proof (data integrity).*
- **Facts:** `Programs.createCombination` (`api/src/programs.ts:344`) checks existence, level and "has sub-categories". It does not check:
  - `retiredAt`;
  - a retired name above;
  - an open `LibraryChange` (waiting, returned or approved) on the name or its branch.
- **What breaks:** the author proposes deleting a Program and then starts setup on a category under it. A combination is created, so the second person's approval is refused ("has a setup draft"). The author has blocked their own proposal with one click. On a retired name, a new setup starts under a name nobody may pick.
- **Fix:** one more reason in the one guard (`lifecycle.ts`, next to `nodeCan`), named `start`. It refuses when:
  - the name is retired;
  - a name above it is retired;
  - a change to it or its branch is open.
  
  The words come from `contracts/lifecycle.ts`, for example "Can't start setup: a deletion of "Visitors" waits for a second person." The card and the Edit panel grey Start setup with that reason as visible text (BlockedLine); `POST` answers 409 with the same words.
- **Checks:** a pass and a fail for each of the three.

**M4 · Major · Who builds what after Start setup (S3 vs runtime slice 3).** *Needed for the proof.*
- **Facts:**
  - No page calls the finder today (`grep forms/find web/src`: none).
  - The library's empty state already promises "Forms come in by themselves when a combination's setup starts".
  - The shared `RunCard` (`components/run-card.tsx`) exists and is used by Form library and AI work.
  - Runtime's next slice 3 is "forms from the finder" in the workspace (`lanes/runtime.md`), reading `GET …/forms/find/latest`.
- **What breaks:** both slices would edit the workspace's sources page (`sources.tsx`) and `combination.tsx` at the same time.
- **Fix, a clean split:**
  - S3 owns the Start setup action, the server call that creates and launches, the landing (workspace on "Sources and forms" with the finder's `RunCard` on top), the read-only place, and the end of `/new`.
  - Runtime slice 3 owns the forms list the run fills.
- **Order:** S3 merges first, or runtime rebases on it; the overlap is one `RunCard` line on the sources page.
- **Lead decision.**

**m5 · Minor · One Start setup, everywhere it shows.** *Needed for the proof.*
- **Where it shows:**
  - Immigration programs: the card, the List row and the next step `start` (`engine/programs.ts:31`);
  - Program structure: the Edit panel's Start setup.
- **Fix:** all of them call one shared action, `useStartSetup`. It keeps QA-50 (one history entry) and relies on the server's idempotency (`createCombination` returns the existing one; a second launch with the same `idempotencyKey` returns the same run). Not started → In setup moves at once on both pages.
- **The "i" tooltip** (P-125 (3)) says what it does, with an example and how cases use it once Live. For example: "Creates the setup for Visitor visa and finds its forms on canada.ca (saved answer: free). Once released and Live, new cases for Visitor visa use these forms."

**m6 · Minor · The place stays read-only, in the shared Trail.** *Needed for the proof.*
- **Facts:** the workspace header (`combination.tsx:56–58`) already shows the place as links to Immigration programs filtered to each level. It offers no rename or move, which meets P-125 (3).
- **Fix:** draw it with the shared `Trail` (level colours, Pathway type first, as on the List). No new controls.

**m7 · Minor · "Forms tab" wording.** *Needed for the proof.* P-123 and the walkthrough say the workspace opens "on its Forms tab"; the tab is "Sources and forms" on main. S3 lands on that tab. Renaming it belongs to runtime's S5 slices, not S3.

**m8 · Minor · Runtime "Left as it is" (a): Programs' next step while a released form is removed.** *Needed for the proof.*
- **Facts:**
  - `setupActionOf` (`engine/programs.ts:35`) returns "Add N forms from the library" from `fromLibrary`.
  - Runtime's build notes (`W1-combination-workspace/build-notes.md:28` on `runtime/2026-10-27-s5-workspace`) say that while a released form's removal waits, that list still counts the attached file. The Programs card then says "Add 1 form from the library" when nothing is missing.
- **Dependency:** the removal flow is on runtime's slice 2 branch, not on main.
- **Fix, after that slice merges:**
  - `SetupState.fromLibrary` leaves out a line whose removal is open.
  - The next step names what waits: "Removal of IMM 5257 waits for a second person".
  - Checks: an engine pass and a fail, and the Programs card.

**m9 · Minor · Runtime "Left as it is" (b): rule messages that name field codes.** *Needed for the proof.*
- **Facts:** `engine/validate.ts` on main writes field codes into words a person reads:
  - line 105: "the question for ${p.fact} is hidden when …";
  - line 106: the same for conditions;
  - line 116: the loop, "Questions decide each other …" with codes.
- **Overlap:** runtime's slice 2 adds `label` and `problemWords` for the coverage gap in the same file.
- **Fix, after runtime slice 2 merges:**
  - These three messages use the question's words (its meaning, as `problemWords` does), never `p.fact`.
  - An engine check fails if any problem message matches a field-code pattern (`/\b[a-z]+\.[a-z_]+\b/`), with one pass and one fail.

**m10 · Minor · Say only what runs.** *Needed for the proof.*
- **Facts:** P-125 (3) lists "forms, checklists, conditions"; the finder finds forms and checklists only. "Who can be in this application" and conditions are not built (no code on main).
- **Fix:** the tooltip and run card name forms and checklists only, until S5 or the AI drafting work builds the rest. No new scope here.

## What is sound
- **The server side already has the hard parts:**
  - `createCombination` is idempotent and handles a racing second click;
  - the finder has plan, fingerprint, idempotency, cap, Stop, replay and an honest rules-only mode;
  - the `RunCard` and top-bar chip exist and follow the person.
- **The workspace header** is already read-only.
- **Structure first** (P-125 (1)) is done: every name is added in the one Add pop-up with its checks, and Immigration programs' "Add combination" opens it in place (P-128 (5)).
- **Desktop only** (1440, 1024), as wave 1 says.
- **Scaffolding note (P-33):** Load sample makes its six combinations directly, not through Start setup. That is acceptable because S7 owns Load sample, but the S3 checks must create at least one combination through Start setup itself, not through Load sample.

## Back-end plan (element → record → API → rule → test)

| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Start setup (card, List row, next step, Edit panel) | `Combination` (existing); `AiBatch` find_forms (existing) | `POST /combinations/start {nodeKey, idempotencyKey}`: create (idempotent) + plan + launch in one call; answers `{combination, run, mode}` | the one guard's `start` reason (M3); mode Saved → Live → Rules by saved run and ledger (M1) | API: pass, double call, the three refusals, cap → rules; browser: from each place, one history entry, lands with RunCard |
| Read-only place | none | `GET /combinations/:id` (existing `path`) | no rename or move there (P-125 (3)) | browser: no editable place control; Trail present |
| End of New combination | none | remove `/new`, `POST /combinations/path`, `POST /path-proposal` | P-125 (5) | the moved checks above; `/new` answers the app's not-found page |
| Next step during a removal (m8) | `SetupState` | catalogue / programs read | an open removal is not "from the library" | engine pass and fail; Programs card |
| Messages without field codes (m9) | none | none | the question's words, never `p.fact` | engine pass and fail |

## Questions for the founder (≤3)
1. **Start setup on a new combination with no saved answer: run live at once (about US$0.20, written on the tooltip and run card before the first AI call), or run rules only and wait for a "Find with AI" click?** *Recommendation: live at once, as you marked OK in the walkthrough v2. Pressing Start setup is the person running it live (P-110), and a free replay is used whenever one exists.*

## Lead response
*Lead, 28 Oct (by message), agreed:*
- **M1, founder: wait for a click.** Start setup loads a saved finder result at US$0 when one exists. Otherwise it shows one button, "Find forms with AI (about US$0.20)", with the worst case in its tooltip; the run starts only on that click. Rules only stays the fallback.
- **M2:** remove `/new` now, with its route, its menu match and the `/new?leaf=` links, and move the checks that open it. Also remove `POST /combinations/path` and `POST /path-proposal` with their API steps. The screens lane may route qa's `check_qa_am_s2_1027` and `check_qa_m2_journeys` away from `/new` (only that change), in a commit named for qa.
- **M3:** accepted. A "start" reason in the one guard (`lifecycle.ts`), words in `contracts/lifecycle.ts`, shown greyed; the API answers 409.
- **M4:** split accepted. S3 owns the Start setup action and `POST /combinations/start` (create, then the finder plan, launched only on the click), landing on "Sources and forms" with the shared RunCard and the read-only place. Runtime slice 3 owns the forms list on that tab; both build in parallel on this contract.
- **Minors** m5–m7 and m10 accepted; m8 and m9 wait until runtime slice 2 is on main.
- Desktop only. Save often. EARLY-LOOK by message.

## Agreement
Agreed 28 Oct (Lead): build M1–M4, m5–m7, m10; m8 and m9 later.

## Build discoveries
