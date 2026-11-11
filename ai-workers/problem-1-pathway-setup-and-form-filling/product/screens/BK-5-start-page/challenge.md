# BK-5 start page: fresh challenge (skill screen-concept, part B)

Challenger: a fresh context that did not draft `concept-draft.md` or `design/board-bk5.html`; 11 Nov 2026. Code read on this branch (it contains `origin/main` 68a7b59d1); decisions P-447, P-456, P-472, P-473, P-481 read on `origin/lead/2026-11-07-lead31`. Paths under `prototype/studio/` unless stated. `ai-workers/tools/freshness.sh` stops in the cloud (no `code/` copy); the concept cites no team code, so nothing is marked Unverified for that reason. Live AI off, US$0; nothing run.

## Verdict
**Build after these changes.** The page is the right idea, and so is the choice of the configured checkpoint over the six for door 2. But door 2 does not start E1 as P-456 (1) defines it (B1), and the two-call reset and the "Now loaded" line promise more than the server can tell (M1, M2). Counts: 1 Blocker, 2 Major, 7 Minor.

## Objections

**B1 (Blocker · Needed for the proof): door 2 leaves no pathway E1 can finish and release.**
* *Fact, high confidence:* `api/src/features/checkpoint/110-release-one.ts:21-36` submits, signs and releases every combination that has a form. BK-1's own load (`qa/reports/2026-11-11-bake-baseline/walk-b-checkpoint-load.json`, 113.6 s) released 5 of the 6: Visitor visa, Study permit outside Canada, With an LMIA inside Canada, Express Entry stream, and Spouse or common-law partner. The only one left is **High-wage position**. It has no form (`samples/wave1.json`: `page: null`, EMP5626 "filled online … ESDC publishes no PDF"), it is Corporate, and nothing in it can be set up.
* *What breaks:* door 2's card ("the rest wait to be finished and released") and the done copy ("Pick a pathway that is not released yet") send the walker to High-wage position. E1 then has no set-up to do: either a dead end, or a release that proves nothing.
* *Also wrong in the concept:* §2 copies `DEMO.md:36`, which is out of date. It says "A and B released … the other four not released" and "the thin family case on release 1". In fact 5 are released, Visitor visa is released twice (row 9, `130-release-two.ts`), and the configured load opens the **family** case (`120-family-case.ts`). The thin case belongs to the finished story only (`125-thin-case.ts:1`).
* *Fix:* before BK-5 PR 1's "done when", add a runtime-lane change: an opt-in option on the configured load that leaves one named combination unreleased (for example `{sample:"configured", leave:"<key>"}`). Door 2 is its only caller, so the suites and `check_c10_1_configured.ts` stay as they are. The card and the toast name that pathway. Correct `DEMO.md` row 2 to the measured facts. The other way out: the Lead amends P-456 (1) to "a named change on a released pathway, then release N+1" (what Walk B did, `qa/bake-baseline-2026-11-11.md:60`), and the card's words change to match. See Question 1.

**M1 (Major · Needed for the proof): the two-call reset-then-load gives a false failure message, an undefined Try again, and an unprotected gap between the calls.**
* *Fact:* `reset` frees the server's loading lock at its `finally` (`api/src/demo.ts:533-534`). `load` takes it again only when the second request arrives (`:138-139`). A failure after `loadSix` has written rows leaves the six in place with some checkpoint steps done. The 500 then reads "Loading stopped after: … Reset the demo, then load again." (`:164`).
* *What breaks:*
  * BR-6 and the board's failure state say "The demo is now empty". After a real midway failure it is not empty.
  * Try again cannot be the load alone: that call is refused with "The Structure already has names" (`:149`).
  * The board says "Closing this window does not stop it". For door 2 that is false: close the window between the two calls and the load is never sent, which leaves an empty demo.
  * If another tab starts and finishes a load between the two calls, the refusal is that same `:149` 409, re-thrown at `:155`. BR-5's single sentence ("Another load or reset is running") misreads it.
* *Fix:* preferably one call (Question 2). Otherwise:
  * Failure words: "Emptied; the configured load stopped part way: <server words>. Start again empties it first."
  * Try again runs both calls again, with RESET still typed.
  * Door 2 says "Keep this page open until it finishes".
  * Each 409 is shown in the server's own words.
  * The BR-6 failure test makes a step fail after the six have loaded. A mocked 500 before any write proves nothing about leftovers.

**M2 (Major · Needed for the proof): "Now loaded" and "Loaded now" cannot be told honestly from `/demo/status`, and the loaded card's one filled button reloads.**
* *Fact:* `status()` (`demo.ts:74-83`) knows four things: the last checkpoint audit line since a reset, whether programs exist, whether the sample was loaded (the six's audit line, written at the end of `loadSix`, `:393`), and the finished story's job. It has no flag for "a load is running" and no way to see changes made after a load.
* *What breaks:*
  * A configured load that is still running (another tab, or after a reload) or that failed reads as "the six".
  * After the walker releases the pathway, the page still says "Loaded now".
  * "(changed since loading)" names a cause the page cannot see (EXPERIENCE §2.7).
  * The loaded card's filled blue button is "Start again from here", a destructive reload. BIC-11 says the filled button is the next step the status calls for. PR 2 makes this the page every author sign-in lands on.
* *Fix, with no API change:*
  * Show "Last loaded: <door>" (`checkpoint` configured or finished_story; no programs = "Nothing set up").
  * Anything else reads "Another state (for example the six, or a load not finished)".
  * Replace the "Loaded now" pill with "Last loaded".
  * On that card, make the filled button "Continue to Immigration programs" (or fill no button) and make the reload secondary.

**Minor**
* **m1 (Needed): RESET is asked even on an empty workspace.** E1 starts "from a fresh demo database" (`design/bake-plan-2026-11-10.md:106`). Today that load asks for no RESET (`App.tsx:217`, the configured dialog). The finished story asks only when programs exist (`components/demo-finished-story.tsx:32`). With BR-2 as written, door 2 makes E1's first step longer than today. *Fix:* ask for RESET only when `programsExist`.
* **m2 (Not built): the "Other starting points" fold-out is gold-plating.** It brings the page to 5 options, against the concept's own pattern ("one choice, ≤3 options"). The Demo menu keeps both items anyway (§8). Reusing `ResetToSixDialog` (`App.tsx:322`, not exported) and the inline LMIA dialog (state inside `DemoControls`) means pulling both out of `App.tsx`, the file BK-4a also edits. *Fix:* drop it; they stay in the Demo menu.
* **m3 (Needed): "Empty and start" is filled blue** (board, Confirm state). Every emptying confirm today uses the red `destructive` variant (`ResetDialog` and `ResetToSixDialog` footers). *Fix:* use the destructive variant: same action, same look.
* **m4 (Needed, BK-4 consistency): PR 2 sends every Studio person to `/start`.** That includes the Content reviewer and the Approver, who see only disabled doors (BR-3): a stop with nothing to do on a co-founder's cold walk. *Fix:* only people with the author duty land on `/start`; the others land on `/`. Change BK-4 §5 ("BK-5 PR 2 later sends Studio people to `/start`") to match.
* **m5 (Needed): the "beat" over Stripe is claimed but not built.**
  * Stripe lists what will be deleted before you confirm (docs.stripe.com, test mode: Developers › Overview, delete test data, cannot be undone; checked today). The door's confirm copies `ResetToSixDialog`'s generic lists, not `ResetDialog`'s counts (`App.tsx:309-310`, `status.scope`).
  * Door 2 then lands on `/` with a toast, so the reset's byte-identical check (`preserved_unchanged`, `demo.ts:576-577`) is never shown.
  * *Fix:* put `scope.total_rows` under "Goes", and "Kept: checked byte-identical" (or "CHANGED") in the done notice.
* **m6 (Needed): one page, three names, and no demo marking.** The menu says "Starting points…", the H1 "Where should the story start?", the where-line "Start", and the tab title falls back to "Product Studio" (`App.tsx:66-67` names only menu pages). EXPERIENCE §1 [M] wants demo chrome to look separate, and the board marks nothing as demo. *Fix:*
  * Use "Starting points" in the menu, the where-line ("Demo › Starting points") and the tab title, and add a Demo pill by the H1.
  * Disable the doors in a workspace that is not the demo up front, from `/session` `workspace.demo` (`api/src/studio.ts:133`), not after a click.
* **m7 (Needed): the timings are typed in, not measured.** The done copy hardcodes "112 s". "About 10 s" for door 1 is not measured (the board itself shows 4.2 s). Door 2 from a full workspace takes the reset time plus about 114 s. *Fix:* print the seconds from the responses, and label the card times as typical.

## What is sound
* PR 1 touches the web only and calls existing routes (`main.ts:137-139`, `demo-reset-to-six.ts:10`, `demo-finished-story.ts:11`). Every load and reset holds `need(actor,"author")` (`demo.ts:91, 129, 175, 527`) and the demo-workspace guard, so the server refuses whatever the page shows.
* Door 3 is already one call that empties under its own lock (`demo.ts:90-103, 110`). Its progress comes from `status.story`, which is real and survives a reload.
* Q1's recommendation (the configured checkpoint over the six) is right, given BK-1 §2.5. Making door 2 the one filled button follows P-473.
* Tests that click the Demo menu find items by name, or walk it with the arrow keys until a name matches (`tests/check_d1_reset_to_six_browser.cjs:59-66`). A new first item is therefore safe, provided its name avoids the words Reset, Load and "configured checkpoint" (`tests/qa/check_qa_wording_1029.cjs:100` uses `/Reset/`).
* Adding `/start` to `where.ts` is required by `tests/check_bk3_frame.ts:1-4`, and the concept plans it. BR-7 (US$0), the Scaffolding label and the breaker are right.
* The benchmarks are real: Atlassian KB "Create a Jira Cloud board with sample data"; the Stripe test-mode docs. Notion and Word are honestly marked as not re-checked. The claimed "49 test files" was not recounted.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Last loaded line | `audit_event` "loaded" lines, `program_def` count | `GET /demo/status` | BR-4 (as fixed in M2) | after door 2: "Last loaded"; a load running in another tab: "Another state" |
| Door 1 | the reset (`wipe`) | `POST /demo/reset {confirm}` | BR-1, 2, 3 | no POST until RESET is typed; Approver: doors off, 0 POST; direct POST as Approver 403 |
| Door 2 | `loadClaimed` configured (+ `leave`, B1) | reset then `POST /demo/load {sample:"configured"}`, or one call (Q2) | BR-1, 5, 6; P-456 (1) | lands with the left pathway named and unreleased; a step failing after the six gives M1's words |
| Door 3 | `finishedStory` job | `POST /demo/checkpoints/finished-story` 202 + `status.story` | BR-5 | running shown after a reload; a second start gets 409 |
| Disabled states | none (`/session` `actor.duties`, `workspace.demo`) | `GET /session` | BR-3 | Approver and a non-demo workspace: doors off with the reason |

## Questions for the founder (via the Lead; recommendation first)
1. **Which pathway does E1 finish and release?** *Rec:* an opt-in "leave one unreleased" on the configured load, used only by door 2; the Lead names the pathway. It must have forms and saved answers, and no later checkpoint row may need it. That rules out Visitor visa (the family case needs its release 1) and High-wage position (it has no form). The other way: amend P-456 (1) to "a named change, then release N+1".
2. **Door 2 as one call?** *Rec:* yes, in the same runtime-lane change as Q1. The configured load takes `confirm:"RESET"` and empties the demo under its own lock, as the finished story already does (`demo.ts:95-99, 110`). That removes M1's gap and the half-done Try again. If not, keep two calls with M1's fixes.

## Author's reply (concept lane, rev 2, 11 Nov)
* **B1 (accepted as a fact):** the configured load releases 5 of 6; nothing with forms is left. The concept no longer copies `DEMO.md` and asks the Lead (Q1). **Recommendation differs from the challenge's:** amend E1 to "a named change on a released pathway (Visitor visa), then release N+1 through both checks", as BK-1's Walk B did: zero code, BK-5 stays web only and waits for no other lane, and the release gates walked are the same. The challenge's opt-in "leave one unreleased" is kept as the alternative, with its cost (one runtime PR, ~5.5 h, BK-5 PR 1 waits for it).
* **M1:** with Q1's recommendation there is no runtime change, so door 2 stays two calls with every fix proposed: part-way words, Try again runs both, "Keep this page open", the server's own 409 words, and a fail test that breaks a step after the six loaded (BR-6). If the Lead takes Q1's alternative, the same runtime PR makes it one call.
* **M2:** "Last loaded" from `/demo/status` only, "Another state" otherwise; the last-loaded card's filled button is "Continue to Immigration programs", "Start again from here" secondary.
* **m1-m7:** RESET only when programs exist; the fold-out dropped (both stay in the Demo menu); the confirm button destructive; PR 2 lands only the author on `/start` (BK-4 rev 2 matches); the row count under "Goes" and the kept-files check in the done notice; one name "Starting points" with a Demo pill and doors off in a non-demo workspace; times "typically …" with measured seconds printed.

## Lead response

## Agreement

## Build discoveries
