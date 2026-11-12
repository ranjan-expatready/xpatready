# QA-401 review: a change of person re-reads every open page (PR #1583)

Independent reviewer (skill screen-review, fresh context; did not build it), 11 Nov 2026. **Commit reviewed: `9c9078b221d1281b480a81dcc30f33496baea166`** (branch `claude/screens-qa401-person-rights`, stacked on BK-4a #1580 `origin/claude/screens-bk4a-picker` 975779226). Scope: this PR's own diff only (`git diff origin/claude/screens-bk4a-picker...9c9078b22`): `web/src/lib/api.ts` setActor, `web/src/runtime/representative-review.tsx` query key, new `tests/check_qa401_person_rights_browser.cjs`.
Bug: `qa/BUGS.md` row QA-401 (Major, journey) on `origin/claude/jolly-brahmagupta-0khsle`. Rule: P-456 (3), P-484 (a picker change is a login; every open page re-reads the current person's rights). No concept file (a bug fix); the bar is the tech lead's Done when.
Journey test (reviewer role): `journey-test-reviewer-2026-11-11.md`, **9/10, pass**.

## Verdict
No Blocker, no Major; 3 Minor (Should). **Verdict: Approve** (for `9c9078b22`).

## What I re-ran (at the exact commit, scratch worktree, copy `screens_qa401r` on :4449, stopped after)
* `tests/check_qa401_person_rights_browser.cjs 4449 xr_studio_screens_qa401r`: **14/14**, exit 0 (fresh copy, 78 s).
* Rule removed, both parts (old key, no reset): **8/13, 5 FAIL**, both directions, with detail (`{"approve":0,"back":0}`, `{"readOnly":0,"approve":1}`, `{"stale":true}`). The test fails when the fix is removed.
* Reset removed, actor key kept: **13/13 pass** (see Minor 2).
* `tests/check_bk4a.ts` **22/22** (ALLOWED setActor sites unchanged: `lib/api.ts` still has only the definition; the new comments say "setActor resets", no call). `tests/check_bk4a_browser.cjs` **46/46** at the head (sign-in, picker, hand-offs, case area's first person, BR-8, release pill).
* `tsc --noEmit -p web/tsconfig.json`: exit 0, no output. `graph.mjs`: no gap names `representative-review` or `lib/api`; the new check is in the graph's tests.
* Own walk at 1440 and 1024 (Playwright, headless, screenshots), see the journey report.

## Done when (tech lead)
| Item | Result |
|---|---|
| Picker change on the review page: the Representative sees Approve and Send back, the officer's read-only line is gone | Met: 1440 Approve after 1.3 s (cold) / 1024 0.8 s, same address, no reload, no 4xx. |
| The reverse (Representative → Case officer) | Met: by keyboard (arrows mark a choice, Enter makes it; Approve stays until Enter, WCAG 3.2.2), read-only line back, Approve 0. The test's frame watcher saw no Approve after the change. |
| Tests with pass and fail lines | Met (above). |
| C8.3 pack green on the configured checkpoint | Not checked by me (builder runs it on :4447/:4448; not to be used). |
| Opus Approve on the head | This review. |

## Code (STANDARDS §6, §7)
* **resetQueries semantics (query-core 5.101.1, read in `node_modules`)**: `resetQueries` → each `Query.reset()` → `destroy()` → `cancel({ silent: true })`; a fetch started under the old person is dropped (`fetch()`'s catch returns on a silent `CancelledError`, no `setData`, no error state), then `refetchQueries({ type: "active" })`. `actor` is assigned before the reset, so every refetch carries the new `x-actor`. The HTTP request itself is not aborted (`api()` passes no signal), only its answer ignored. Correct.
* **No stale frame**: reset clears data synchronously before the listeners re-render; the review key now names the person, so the first render after the change reads a pending query. `placeholderData` pages (to-review, preview, library-forms) get no previous-person placeholder: after reset `#lastQueryWithDefinedData.state.data` is undefined.
* **Mutations** are not in the query cache and are untouched: an Approve in flight keeps the Representative's header (server records the right person); its invalidations then refetch as the new person. Correct.
* **Case area's silent switch** (`cases.tsx:55`, layout effect): runs while the area renders nothing, so the reset only drops cached Studio answers. BK-4a browser walk green.
* **Hand-offs and the release pill / "Product Studio (as …)"**: correct result, but see Minor 1 (extra refused reads).
* Other rights-bearing reads already carry the person in their keys (release-update `can_move`, proposals and change-batch `can_decide`, programs, cases list, session); the case page guards a client itself. I found no page that still shows the previous person's rights. Other tabs keep their own person (module variable) and send it consistently: not this bug.
* No server, schema or migration change; no data risk. A refused read writes nothing: audit lines come only from writes (e.g. `api/src/review-rounds.ts:160`), and `audit_event` after the walk had no refusal action.

## D1–D20 (independent reviewer, browser and script; only what this diff touches)
D1 5: Done when met both ways · D2 5: no writes; server decides; one `review_opened` per real open · D3 N/A · D4 N/A · D5 5: in-flight answers of the old person dropped (source), second change and fresh-page reverse pass · D6 N/A · D7 N/A · D8 4: frame line and notice name the person · D9 5: Approve / Send back appear where the Representative is · D10 4: unchanged words (see note) · D11 5: notice "Now: Representative (simulated)…", no stale state · D12 4: unchanged look (shots 1440/1024) · D13 4: keyboard picker change works, no sideways scroll at 1024/1440; axe not re-run (no markup change) · D14 4: team frame unchanged · D15 4: re-read 0.8–1.3 s; ~17 extra refused GETs per hand-off (Minor 1) · D16 4: fails when removed, but the reset part untested (Minor 2) · D17 simulated only · D18 4: "Simulated" pill and notice · D19 4: officer → review → Representative decides without a reload · D20 simulated only.

## Best in class (EXPERIENCE §6; the diff touches BIC-11, 18, 20)
| Check | Result | Evidence |
|---|---|---|
| BIC-11 one primary action, named | Met | Representative: Approve + Send back once the person is the Representative; officer: none (walk step 3/4). |
| BIC-18 states drawn | Met | Pending re-read shows the page's skeleton, never the old person's buttons (frame watcher). |
| BIC-20 keyboard-complete | Met | Picker → officer by arrows + Enter at 1440 and 1024; no sideways scroll. 200 % zoom not re-run (no layout change). |
| BIC-01–10, 12–17, 19 | N/A | Not touched by this diff (C8.3 review's own evidence stands). |

## Issues (all Minor, Should; none blocks)
1. **The reset refetches the page being left, as the new person, before a hand-off navigates** (`web/src/lib/api.ts:23`). "Open it as Client A" from the case page: 19 refused GETs as user-P (403) vs 2 with the reset removed; "Product Studio (as Configuration author)": 18 refused GETs as user-A vs 0; each logs a console "Failed to load resource: 403". Also every picker change on the review page GETs the round twice (old key refetched by the reset + new key). Nothing visible, nothing recorded. Fix: reset state now, refetch after the route settles, e.g. `queryClient.getQueryCache().getAll().forEach((q) => q.reset()); setTimeout(() => void queryClient.refetchQueries({ type: "active" }), 0);` (keeps the no-stale-frame property: data is cleared synchronously).
2. **The global reset has no test that fails when it is removed**: with `resetQueries` deleted and the key kept, the check passes 13/13, so P-456 (3)'s "every open page re-reads" is proven only for the review page (the key). Fix: one step that, after a picker change on the review page, sees a read of a page whose key lacks the person (e.g. the case's `/runtime/cases/:id/prepare` with `x-actor` = the new person), or narrow the comment in `api.ts:17-19`.
3. **The test's header overstates coverage**: `tests/check_qa401_person_rights_browser.cjs:7-8` says "Also on the case page (Ready to file's review line)", but no step visits the case page. Fix: add the step (it would also cover item 2) or drop the sentence. Small: step 3's watcher stops as soon as the read-only line appears (step 5 waits 500 ms); give step 3 the same settle.

Note, not this diff (record for qa if wanted): Client A picked on the review page now gets "This review could not be loaded · Only the case officer can do this." with Retry (server words in `api/src/review-rounds.ts`): a refusal shown as a load failure, naming only the case officer although the Representative may read. Before the fix the client saw the stale staff view, so this is an improvement in rights; the words are pre-existing.

## What I could not check
C8.3 pack on the configured checkpoint (builder's :4447/:4448, not to be used). A visible headed browser (the walk was headless Playwright with screenshots; screenshots kept outside the repo). Real screen reader. Unaided intended-user walk (D17, D20 stay with the founder). 200 % zoom and axe (no markup or layout in the diff).

**Verdict: Approve** (commit `9c9078b221d1281b480a81dcc30f33496baea166`; no open Blocker or Major; Minor 1–3 may follow in this PR or a later one).
