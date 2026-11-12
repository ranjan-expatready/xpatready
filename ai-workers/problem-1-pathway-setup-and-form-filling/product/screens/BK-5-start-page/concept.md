# BK-5: starting points page, three starting points and a reset (concept, rev 2, approved)

Concept lane (skill screen-concept, steps A1-A7), 11 Nov 2026, **Approved** by the tech lead (Lead 19, series 2) at head 2fa228923, 11 Nov ~21:1x IST (P-223 (4)); rulings recorded as **P-484** (all five recommendations taken). Row: Bake plan row 5 (`design/bake-plan-2026-11-10.md`), P-447 (2); squeeze S3 (`design/bake-squeeze-2026-11-11.md`, #1572), P-481; E1's start, P-456 (1); style P-473. Board: `design/board-bk5.html`. Paths under `prototype/studio/` unless stated; read on `origin/main` 68a7b59d1. Same concept lane as BK-4. **Rev 2** applies the fresh challenge (`challenge.md`: B1, M1, M2, m1-m7); the author's reply is in `challenge.md`, "Author's reply".

## 1. Job and journey
* **Job:** whoever runs the demo or a walk picks where the story starts, in one place, in plain words, and lands on its first screen; today the same choices hide in a Demo menu of seven items with three disabled states (`App.tsx:212-225`).
* **Persona:** the person running the demo (founder, co-founder, qa's fresh reader), as the Configuration author: every load needs the author duty (`api/src/demo.ts:91, 129, 175, 527`).
* **Journey:** sign-in (BK-4a) → **Starting points** → the first screen of the story (E1: Immigration programs, then the pathway to change and release, Q1).

## 2. Ten layers
* **Exists, unchanged (facts):** every load and reset is a server route behind the author duty and the demo guard: `POST /demo/reset {confirm}`, `POST /demo/load {sample:"six"|"configured"}` (refused while programs exist, `demo.ts:149`), `POST /demo/checkpoints/finished-story {confirm}` (a job that empties first under its own lock, `demo.ts:90-110`), `GET /demo/status` → `programsExist`, `checkpoint` (from the last "loaded" audit line since a reset: "configured" | "finished_story" | null), `story` (`main.ts:137-139`, `demo.ts:59-83`).
* **What the configured checkpoint really is (measured, BK-1's load, `qa/reports/2026-11-11-bake-baseline/walk-b-checkpoint-load.json`, 113.6 s):** 5 of the 6 pathways released (Visitor visa, Study permit outside Canada, With an LMIA inside Canada, Express Entry stream, Spouse or common-law partner; `features/checkpoint/110-release-one.ts:21-36`); High-wage position has no form and stays unreleased; Visitor visa released twice; the **family** case open (`120-family-case.ts`). `DEMO.md` row 2 ("A and B released … the thin family case") is out of date: for the Lead's records.
* **New:** one page `/start` in the Studio frame and one Demo menu item "Starting points…". **No API, schema or engine change.** Demo chrome, not for porting (EXPERIENCE §1).

## 3. Business rules
| BR | Rule | Source |
|---|---|---|
| BR-1 | Every starting point empties the demo first and says so before it runs: what goes (with the row count from `/demo/status` `scope`), what comes back, what is kept; the done notice says whether the kept files are byte-identical. | `App.tsx:301, 309-310, 339-343`; `demo.ts:576-577` |
| BR-2 | Destructive: typing RESET, with the red destructive button, **only when the workspace has programs**; an empty workspace starts at once. | EXPERIENCE §2.8; `App.tsx:217`; `demo-finished-story.tsx:32` |
| BR-3 | Only the author duty can start one; others see the doors disabled with the reason and "Sign in as the Configuration author". Not a demo workspace (`/session` `workspace.demo`): doors disabled up front. The server refuses anyway. | `demo.ts:91`; `studio.ts:133` |
| BR-4 | The page says "Last loaded: <door>" only from `/demo/status` (`configured`, `finished_story`, or no programs = "Nothing set up"); anything else reads "Another state (for example the six, or a load not finished)". | EXPERIENCE §2.7 |
| BR-5 | Running shows real progress only (elapsed seconds; the story's own state, which survives a reload); every 409 shows the server's own words. | EXPERIENCE §4; `demo.ts:93, 149` |
| BR-6 | Door 2 is two calls (reset, then load). If the load stops: "Emptied; the configured load stopped part way: <server words>. Start again empties it first." Try again runs both calls (RESET still typed). The page says "Keep this page open until it finishes" for door 2. | challenge M1; `demo.ts:164` |
| BR-7 | US$0: no live AI call on any door. | P-175 |

## 4. Layout (pattern: Dialog/wizard as a page: one choice, three options)
* **Name everywhere:** "Starting points" (menu item, where-line "Demo › Starting points", tab title "Starting points · Product Studio", H1) with a "Demo" pill by the H1.
* **Header:** H1; line: "Each starting point empties the demo workspace and loads a known state. Saved AI answers, official PDFs and the spend record are kept and checked. US$0." Then "Last loaded: …" (BR-4).
* **Three door cards** (one row at 1440 px, stacked at 375 px): name, two lines of what you will see, typical time, one button.
  1. **Nothing set up** — "An empty Studio: add a program, find its forms, let AI draft from saved answers." Typically a few seconds. "Start from nothing" (the reset).
  2. **Pathways released, ready to walk** — "Five of the six pathways released, a family case open on Visitor visa. The walk starts here: change one thing on a pathway and release it through both checks." Typically 2 minutes. "Start here" — **the one filled blue button** (E1's door).
  3. **The finished story** — "The family case all the way through: forms filled, signed, every filing ready to file." A few minutes, in the background. "Load the finished story".
* **Reset:** the last-loaded card shows "Last loaded"; its filled button becomes "Continue to Immigration programs" and a secondary "Start again from here" reloads it (with BR-2). Door 1 is the reset to blank.
* **Confirm dialog** per door: "Empty the demo and start from <door>?" · Goes ("All configuration, releases and cases: {n} rows", from `scope.total_rows`) / Comes back / Kept · Type RESET (only when programs exist) · [Cancel] [Empty and start] (destructive). **Running:** elapsed seconds and the step ("Emptying…", "Loading the configured checkpoint…"). **Done:** toast with the measured seconds and the kept-files check; land on `/` (doors 1-2) or stay with the story's result (door 3, as today).
* **States:** normal · last loaded · another state · not the author · not a demo workspace · running · busy (409 words) · stopped part way (BR-6) · server down (frame notice).
* The six and "With an LMIA from its reviewed release" stay in the Demo menu only (no fold-out here).

## 5. Best in class (4b, P-392; read 11 Nov 2026)
* **Atlassian, "Create a Jira Cloud board with sample data"** (support.atlassian.com KB) and Jira Service Management's sample space ("Test, explore and learn with your sample space"): a realistic, ready project chosen in one step. **Copy:** a named, realistic starting state in one click.
* **Stripe test mode, "Delete all test data"** (docs.stripe.com, testing: Developers › Overview; review what will be removed, then delete; cannot be undone). **Copy:** show what goes before confirming. **Beat:** we also show what is kept and prove it unchanged after (BR-1, `preserved_unchanged`).
* **Start screens with three choices** (Word's Blank / templates; Notion's empty page or template; product knowledge, not re-checked): **copy** few big choices, blank first.
* **Effort saved:** today the walker must know "Load the configured checkpoint" is disabled until "Reset demo…" ran (2 dialogs, RESET, then load). After: one card, RESET only if needed, one wait. BIC: BIC-11, BIC-18, BIC-20 apply; others N/A.

## 6. Copy
Disabled: "Only the Configuration author loads a starting point." + "Sign in as the Configuration author" · Not demo: "This workspace is not the demo: starting points would empty real work, so they are off." · Done (door 2): "Pathways released, ready to walk: loaded in {s} s. Kept files checked unchanged. Pick the pathway to change, then Review and release." · Card times read "typically …" and the done toast prints the measured seconds.

## 7. Contract and tests
* **Contract:** existing routes only (§2). Door 1 = reset; door 2 = reset (when programs exist) then load configured; door 3 = finished-story (`confirm` when programs exist).
* **Browser** `tests/check_bk5_start_browser.cjs` (1440, 375 px, axe, keyboard), one pass and one fail per BR: BR-2: no POST until RESET when programs exist; none asked when empty; BR-3: as the Approver every door is disabled and no `/demo/*` POST is sent; BR-4: after door 2 "Last loaded"; a load running in another tab reads "Another state"; BR-5: a second start reads the 409 words; BR-6: a configured step made to fail **after the six loaded** gives the part-way words and Try again re-runs both; BR-7: no live AI route called. Door 2 end to end once on the lane's copy, seconds recorded.
* The Demo menu item's name avoids Reset, Load and "configured checkpoint" (tests match those, `tests/qa/check_qa_wording_1029.cjs:100`). **Breaker (P-278):** new page, destructive actions, two tabs, double click, reload while running.

## 8. Capability or scaffolding; Needed for the proof
Whole page: **Scaffolding** (demo chrome, P-35) · **Needed for the proof** (E1, E2 start here). Removing the Demo menu's other items (49 test files click them): **Not built**, follow-up.

## 9. The two PRs
| PR | Files (all `web/src/`) | Done when |
|---|---|---|
| **BK-5 PR 1** Starting points, beside BK-4 | new `pages/start.tsx`; `App.tsx` (route `/start`, tab title, Demo menu item "Starting points…" first); `components/where.ts` | BR-1 to BR-7 pass and fail; door 2 lands on Immigration programs; breaker Approve; walk by screens 1440 px: Demo › Starting points → door 2 → Review and release of the named pathway |
| **BK-5 PR 2** sign-in → Starting points, after 4a | `pages/sign-in.tsx` (people with the author duty land on `/start`; other Studio people on `/`), `pages/start.tsx` (disabled state links to `/sign-in`) | gate A walk: sign-in → Starting points → door 2 → change → release, 0 person changes outside BK-4's BR-1 |

## 10. Questions, answered by the Lead (P-484)
1. **E1's pathway (challenge B1): the configured checkpoint leaves no pathway with forms unreleased, so P-456 (1)'s "one pathway left unreleased" cannot be met as loaded.** **Ruled (amends P-456 (1)): E1 is a named change on Visitor visa, then release N+1 through both gates by the screens, zero code; no runtime PR; BK-5 PR 1 does not wait.** As recommended: amend E1 to "a named change on a released pathway, then release N+1 through both checks", as BK-1's Walk B did; name Visitor visa,* so "Open a case on Release N" carries straight on to the family case. Zero code, BK-5 stays web only. Alternative: a runtime-lane change gives the configured load an opt-in "leave one unreleased" (and one call that empties first): a cold walker then sees a pathway marked "Not released", at the cost of one more PR (~5.5 h, beside BK-4) that BK-5 PR 1 would wait for.
2. **Door 2 as two calls or one?** **Ruled: two calls (reset, then load) with BR-6's part-way failure words** (follows Q1's recommendation: no runtime change); if the Lead takes Q1's alternative, the same runtime PR makes it one call and BR-6 shrinks.

## Definition of ready
Acceptance tests named (§7); row text §9; decisions: Q1-Q2 answered (P-484); fresh challenge done; Lead approval given (P-223 (4)). **Ready.** Lanes (Lead 19): BK-5 PR 1 its own lane; PR 2 after BK-4a merges.
