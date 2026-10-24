# CHECK 24 Oct: small FIX QA-4/QA-20/QA-22 (reviewer agent)

**Commit reviewed:** `12af01a` on `claude/screens-01-fix-c3010a`. Scope: the four files this pass touched in `910ee40..12af01a` (`api/src/main.ts` download lines and the ENOENT mapping, `components/channels.tsx`, `pages/programs.tsx`, `tests/check_screen01_smallfix.cjs`). The other lanes' merged changes are not reviewed. **Verdict: Ship.** 0 Must, 3 Should. **Journey score 9/10 (pass).** The score is in this file; there is no separate report.

**How I checked:** I read BUGS QA-4/QA-20, the Lead's QA-22 note, the build notes section "Fixes: small FIX after Screen 01 DONE" and the diff. I used an isolated copy on :4441 (`xr_studio_screens_rv`, fresh start, web build current: `knowsPerson` is in `index-CcnFXWec.js`) and headless Chromium at `/opt/pw-browsers/chromium`. There were no model calls. Afterwards I stopped the copy and dropped its database. I did not touch :4400.

## Builder's test, run by me
`check_screen01_smallfix.cjs 4441 xr_studio_screens_rv` passed **11/11 on two runs**, each on a fresh copy.

## Does each rule's test fail when the rule is removed? (my own mutations)
| Rule | Mutation | Result |
|---|---|---|
| QA-22 `knowsPerson` | Served the bundle with `s=!!a.data\|\|a.isError` replaced by `s=!0` (pre-fix behaviour); author, session held 1.5 s | Non-author text seen 11 times ("A configuration author adds combinations here"): the test's poll catches it |
| QA-20 `min-w-0 max-w-full` | Removed both classes from the Portal group at 400 px (author) | Page 413 px wide (the QA-20 figure) |
| QA-4 `dotfiles: "allow"` | Standalone Express 5.2.1 (studio's copy): `res.download` of a file under `.dot/` | Without the option: error `status 404`, no code (the old 404). With it: 200. A missing file: `{code: ENOENT, status: 404}`. A plain `fs` ENOENT has `status undefined`, so it still reaches the 500 branch |

## Each fix, as a person sees it
* **QA-22 (Programs while `/api/session` is slow).**
  * Empty catalogue, author: no non-author text in 51 looks. Meanwhile there is a skeleton (8 placeholders), New combination is disabled and its tip reads "Loading…". Then "Create the first one with New combination" appears and the button is enabled.
  * Populated catalogue: no non-author text for the author or the reviewer (user-C), and no console errors.
  * Actor switch on Programs (author → reviewer → author at 1024 px): the button goes enabled → disabled → enabled, with nothing stale.
  * Keyboard: Tab reaches New combination and Enter opens `/new`.
  * First catalogue row appeared in 295/113/93 ms (budget 1 s).
  * **Session failure** (session answers 500): after the one retry (about 1.6 s), the red notice "The studio server is not answering" shows. The empty state below it then tells the author "A configuration author adds combinations here." (Should 2).
* **QA-20 (combination page, Portal row).**
  * Page width equals the viewport for the author at 400 px (select ends at 363 px) and at 1024 px, and for the reviewer at 400 and 1024 px.
  * The reviewer at 400 px with the longest portal set ("Representative Permanent Residence Portal", shown as bold text): 400 px.
  * Programs: 400 px at 400; 512 px at 512 (the 200 % view of 1024).
* **QA-4 (downloads).**
  * Source file and filled PDF under a dot-folder: 200 with `attachment`. Unknown id: 404. A filled PDF whose file is gone: 404 "Not found (it may have been removed by a reset)" instead of a 500.
  * As a person: Sources tab → clicked the first file link → the browser downloaded `imm5257e.pdf`.
  * Safety: `dotfiles: "allow"` applies only to paths read from the server's own rows (`sources.ts:622`, `fill.ts:76-79`). No request value reaches the path.
  * The ENOENT branch (`main.ts:148`) needs both `code === "ENOENT"` and `status === 404`, which only the file-sending layer sets. It does not hide other server errors.
* **Nearby: combination page with a slow session (author).** "A configuration author does this step." (`combination.tsx:91`) was never seen; the author-only controls appear when the session arrives. No other page shows a non-author sentence while loading.

## Issues (ranked)
1. **Should 1: axe "scrollable-region-focusable" (serious, WCAG 2.1.1) on the combination page at 400 px.** Author: 1 node; reviewer: 2 nodes. It is the table's scroll box (`web/src/components/ui/controls.tsx:138`, `overflow-x-auto` with no focus): a keyboard user cannot scroll the forms table sideways. At 1024 px axe is clean. This is not caused by this pass: `controls.tsx` last changed in `a7e40e0`, and the fix only made the 400 px check reachable. It still breaks STANDARDS "[M] axe-core on every screen state" at 400 px.
   * Fix: give the box `tabIndex={0}`, `role="region"` and an `aria-label` (or only when it overflows), then add an axe check at 400 px to `check_screen01_smallfix` or the browser suite.
2. **Should 2: the session-failure fallback still uses author/non-author words.** With the session down, the author reads "A configuration author adds combinations here." under "The studio server is not answering" (`pages/programs.tsx`, the EmptyState description). The header tip says "Only a configuration author can create combinations…". This is the build notes' stated choice and nothing unsafe is allowed. But it is the same wrong statement QA-22 removed, now in the failure state.
   * Fix: when `session.isError`, use a neutral description and tip, such as "Who you are could not be loaded; see the notice above." Add the failing case to the QA-22 block.
3. **Should 3 (for the Lead; a graph tool gap): the graph lists `GET /attachments/:id/file` and `GET /artifacts/:id/file` under G3 ("no test reaches").** The new test does reach them, but through ``fetch(`${BASE}${url}`)``, which `product/tools/graph.mjs:73-74` does not parse. The graph does credit the test for C1.1, C1.6, C1.7, C2.1 and C3.1 (G5 dropped from 5 to 3 after this pass).
   * Fix: call each route with a literal path in the test, or teach the graph to read `fetch` with a template literal.

## [M] standards touched
* Rule's test fails when the rule is removed: **met** for all three (mutations above).
* axe on every screen state: **not met at 400 px** on the combination page (Should 1, existed before this pass). Met at 1024 px.
* No sideways page scroll at 400 px: **met** (QA-20 closed).
* Errors are plain, with no server detail in the browser: **met** (a gone file now gets the plain 404 instead of the generic 500).
* Server authorisation: unchanged. The download routes stay open to any caller, as before; this pass did not change that.

## D scores (dimensions this pass touches)
| D | Score and evidence |
|---|---|
| D5 Stability and recovery | 5: a gone file is a plain 404; downloads work in lane copies |
| D11 Feedback and state | 4: skeleton and "Loading…" until the person is known. The session-failure empty state still names a role (Should 2) |
| D12 Responsive | 5: 400/390/1024 px with no page scroll, as author and reviewer, including the longest portal |
| D13 Accessibility | 4: keyboard path works; axe serious at 400 px on the table box (Should 1); no real screen reader |
| D16 Testability | 4: each rule proven by mutation. The graph cannot see the download calls (Should 3) |
| D17 / D20 | Simulated only |

## Journey score: 9/10 (scoped to this pass)
Journeys (headless Chromium, not a visible browser):
* **J1** Author opens Programs while the session is slow (empty, then populated).
* **J2** Content reviewer does the same.
* **J3** Session fails.
* **J4** Author switches persons on Programs.
* **J5** Author and reviewer read the combination page at 400 and 1024 px.
* **J6** Author downloads a source file from Sources.
* **J7** A file is gone (API).

Scores:
* 1 each: task completed, next step obvious, plain words, correct data, error recovery, speed, visual quality, trust and sources (Sample portals labelled).
* ½ feedback and state: Should 2.
* ½ accessibility and sizes: Should 1.

## What I could not check
* A real lane copy under `.claude/worktrees/`: this cloud copy is not one. QA-4 is proven with the test's `.lane-copy` folder and my Express mutation.
* A visible-browser walk, a real screen reader, 200 % browser zoom (approximated by a 512 px viewport), and D17/D20 (founder).
* The other lanes' merged code, and the `tsc` TS1470 errors the build notes mention.
* Working tree: `break-report.md` shows as modified. That change is not mine (another agent); I did not touch it.

Earlier review (24 Oct, small FIX after the merge): `review-earlier.md`.
