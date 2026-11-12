# BK-5 PR 2 sign-in → Starting points: independent review (screen-review + journey-test, reviewer role)

Reviewer: a fresh context that did not build this. Commit **45009b714e55194e72b78c0e59b89bfa27e5a768** (`claude/screens-bk5-signin-start`, PR #1628), 12 Nov 2026. Row: concept §9 "BK-5 PR 2" and challenge m4. Code read with `git show`/`git diff origin/main...45009b714`. Running app: my own isolated copy `rev_bk5p2` on :4481 (never :4400), stopped after. Browser checks were run from a scratch copy, so the repo's screenshots were not rewritten.

**Summary verdict (skill scale): Ship.** No Blocker, no Major; two Minor findings (test robustness, evidence shots). Journey score **9.5/10** (report: `journey-test-reviewer-2026-11-12-pr2.md`).

## What I re-ran (my numbers)
* `check_bk5_start_browser.cjs 4481 xr_studio_rev_bk5p2`: **46/46**. `check_bk4a_browser.cjs`: **47/47**.
* Gate A (`BK5_GATE_A=1 check_bk4b_handoffs_browser.cjs`): **failed at step 3 on a used copy** (m1). On a fresh copy: **45/45**, "0 changes outside" the hand-offs. Then the plain bk4b walk: **42/42**.
* `check_bk4a.ts` 22/22, `check_bk4b_handoffs.ts` 15/15, `check_bk4c.ts` 16/16, `check_bk3_frame.ts` 151/151. `web` `tsc --noEmit`: clean.
* My own walk (Playwright, headless): 25 of 27 steps passed. The 2 that did not pass are older behaviour, not from this PR (see "Seen, not this PR").
* `graph.mjs` on a scratch copy of the commit: G1 0, G2 0, G4 0; no gap names `sign-in.tsx`, `start.tsx` or `/start`.

## Issues (ranked)
**m1 · Minor · Should: the gate A walk passes only on a copy whose last load was not "configured".** If door 2 was the last load, its card shows "Continue to Immigration programs" and "Start again from here", and the script waits 30 s for "Start here", then times out. This is a test problem, not a product one: the screen itself offers the right path. *Where:* `tests/check_bk4b_handoffs_browser.cjs:55-56`. The comment at `:15`, "(RESET when the demo has content)", says the script handles a used copy, but it handles only one with programs and no checkpoint. *Fix:* when "Start again from here" is present, click it (it types RESET). Otherwise keep "Start here".

**m2 · Minor · Should: both new evidence shots show loading states.**
* `screenshots/bk5-pr2-01-start-after-sign-in-1440.png` shows "Reading the demo's state…" with every door off. It is taken straight after `waitForURL` (`check_bk4b_handoffs_browser.cjs:54`).
* `bk5-pr2-02-door2-landed-1440.png` shows skeleton cards (`:63`, which waits for the H1 only).
* This is the same class as PR 1's m3. *Fix:* before the shots, wait for an enabled `[data-start-door]`, and for the first catalogue card.

## The judgement points from the brief
* **Is the link's label honest?** Yes. "Sign in as the Configuration author" is concept §6's copy word for word. It leads to the one place a person is chosen (BK-4a BR-1), where the Configuration author is the first of four cards. That card's accessible name is "Sign in as Configuration author", and choosing it brings you back to `/start` with the doors on (J3). The cost is one extra click. The link changes nobody and sends no request (J3: 0 POSTs, still the Approver).
* **Other ways in:**
  * BR-6's unknown person (`App.tsx:49` → `/sign-in?unknown=1`) and the picker's "Sign-in page…" (`frame.tsx:147`) both end in `choose()`, so both follow the new rule. Verified in J4 and J5.
  * Choosing a person in the header picker keeps `homeOf`, and changes the page only when the area changes (`frame.tsx:149-151`). The author is then on "/", which is right: that is a switch mid-walk, not the start of a walk. The concept names only `sign-in.tsx` (§9).
* **Does any test still wait for "/" after an author sign-in?** None. At this commit, the whole problem folder has 3 clicks on the author card: `check_bk4a_browser.cjs:152`, `check_bk5_start_browser.cjs:130` and `check_bk4b_handoffs_browser.cjs:52`. All three wait for `/start`. The Approver's landing on "/" stays checked (`check_bk4a_browser.cjs:58-61`).
* **WCAG of `Button asChild` + `Link`:**
  * It renders `<a href="/sign-in">` with button styling, the same pattern as 8 other uses.
  * Its role is link, and its name equals the visible text (2.5.3).
  * Enter follows it. Tab reaches it (15 Tabs).
  * The focus ring is 3 px and visible once the 150 ms transition ends (my crop: `link-focused-crop.png`).
  * axe is clean on the disabled state at 1440 and 1024 px. At 400 px and at 200 % zoom (720 and 512 CSS px) there is no sideways scroll and the link stays visible.
  * Space does not follow a link; that is normal for links.

## Concept fit, words, standards, code
* §9 row: `sign-in.tsx:23` sends a person with the author duty to `/start` and everyone else to `homeOf`, which is challenge m4's fix exactly. `start.tsx:98` is now a link. BK-4 concept §5/§67 already reads "walks start at `/sign-in` (BK-5 PR 2)", so nothing there contradicts this.
* The rule uses the duty, not a person id (`p.duties.includes("author")`). Today only user-A has that duty (`simulated-people.ts:13`).
* **Removing the rule fails tests on both sides.** Without the author side, `check_bk4a_browser.cjs:156`, `check_bk5_start_browser.cjs:130` and the gate A step at `:53` fail. If everyone went to `/start`, `check_bk4a_browser.cjs:61` (Approver → "/") fails.
* **setActor allowances:** `check_bk4a.ts:60` and `check_bk4b_handoffs.ts:30` drop `start.tsx`. The static checks still pass, so `start.tsx` has no write left.
* Server authorisation is unchanged: loads still need the author duty, and the Approver's direct reset still gets 403 (bk5 step 30). No API, schema or migration change. Words and menu are unchanged from PR 1.
* **Judged, not a finding: an author in a workspace that is not the demo.** They land on `/start` with every door off ("Nothing here can run in this workspace.") and no action, though the Studio menu is there (J6, session mocked). Concept §9 sets the rule without that exception, and the sign-in page is demo-only scaffolding (its "Prototype · demo workspace" pill).

## D1-D20 (1-5; only what this PR touches)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 5 | §9 row and m4 met; gate A 45/45 on a fresh copy |
| D2 Data integrity | N/A | No data written by the change (the link sends 0 requests) |
| D3 Reuse | 5 | `homeOf`, `Button asChild`, existing sign-in page |
| D4 Rule integrity | N/A | No configuration rules |
| D5 Stability and recovery | 4 | Back, reload and unknown person all recover (J1, J4). Gate A is fragile on a used copy (m1) |
| D6 Freshness and governance | N/A | No audit change (simulated sign-in is client-side, as BK-4a) |
| D7 AI trust | N/A | No AI |
| D8 Orientation | 5 | Lands on "Demo › Starting points", H1 and tab title |
| D9 Flow | 5 | Cold walk: sign-in → doors on in one click; others are never sent to doors they cannot open |
| D10 Language | 5 | Concept §6 copy; "Simulated" on cards |
| D11 Feedback and state | 4 | A brief "Reading the demo's state…" on landing; focus stays on `body` after the route change (frame-wide, older) |
| D12 Visual quality | 5 | Secondary button in the Notice's action slot, as before |
| D13 Accessibility | 4 | See the WCAG point above. No screen reader tried |
| D14 Team look | 5 | Team Button, Notice and Frame |
| D15 Speed | 5 | Card click → `/start` H1 in 97-107 ms |
| D16 Testability | 4 | Both sides of the rule are tested; m1, m2 |
| D17 First use | simulated only | No intended user walked it |
| D18 Provenance | N/A | No values shown |
| D19 E2E closure | 5 | sign-in → Starting points → door 2 → change → release, 0 changes outside (the change itself made through the API, as in the reviewed bk4b walk) |
| D20 Pain/wow | simulated only | One click from sign-in to the doors |

## BIC scorecard
Concept §5: BIC-11, BIC-18 and BIC-20 apply; the rest are N/A (demo chrome, Studio side). **BIC-11** (one primary): Met, unchanged; the link is secondary. **BIC-18** (effort): Met: no "switch person" step on the page, one click from sign-in. **BIC-20**: Met, unchanged from PR 1.

## Seen, not this PR (no action asked here)
* **Double click on any sign-in card adds two history entries.** One Back stays on `/start`. `main` did the same with "/".
* **Client A's card lands on `/cases`,** whose `GET /api/runtime/cases` answers 403 (a console error). This is BK-4a's `homeOf`, unchanged by this PR.

## Could not check
A real screen reader; an intended user's unaided walk (D17/D20, the founder's); making the gate A "change" step through the screen (the script makes it through the API, as the reviewed bk4b walk does); the merge-time CI run.

**Verdict: Approve** (no open Blocker or Major). Should-fix, either in this PR or as a follow-up: m1 (`check_bk4b_handoffs_browser.cjs:55-56`), m2 (`:54`, `:63`).
