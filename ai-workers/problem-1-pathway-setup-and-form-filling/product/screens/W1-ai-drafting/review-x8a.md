# Review — X8a (cost-warning browser check waits for the page), commit 71e37575

Reviewer: a fresh agent that did not build it. Worktree `/home/user/x8a`, branch `claude/forms-x8a-cost-wait-hfb2om`, diff `origin/main..71e37575` (2 files). Ports 4456–4457 only, no `*_LIVE` variable, queue held, US$0.

**Verdict: Approve.** No Blocker and no Major. Three Minors below; none blocks this row.

## What was checked
1. **The diagnosis is right, shown directly.** `DraftDialog` starts in Live, and its effect at `web/src/pages/sources.tsx:123` (`if (saved.length && !runFile) { …; setMode("replay") }`) runs when the saved answers arrive. In a throwaway copy with `/attachments/:id/draft-options` delayed 3 s, a probe that chose Live straight away read Start as `mode live · loaded false · "Start live AI draft"`. Once the options arrived it read `mode replay · "Use saved AI answer"`. With that label there is no "Start live AI draft" button, so main's wait (old line 111) cannot pass. I could not read the CI logs for runs 41185122197 and 41231387000: the log storage is blocked from this sandbox, and the annotations only say "exit code 1". The time-out at line 111 is therefore matched by mechanism, not by reading the log.
2. **The waits follow the page and fail loudly.** The test waits for `data-options-loaded="true"`, then checks Live, then waits for `data-mode="live"` and `data-start-ready="true"`. No fixed pause is used for readiness. With options delayed 100 s, the test failed after 90 s with: `the field-map dialog never reported its saved answers loaded (Start: mode live, options loaded false, ready false)`. The second change waits for the re-read spend figure (`waitForFunction`, 60 s) and no longer reads the dialog once. The step still fails when its rule is removed. I removed both `draft-options` invalidations from `DraftDialog` in the throwaway copy and rebuilt: the result was `FAIL C11.8 N6 review (10a0e90e) 2 … 120.00 | Draft the field map…`, 25 passed and 1 failed.
3. **The data attributes are harmless.** `Button` passes `...props` to `<button>` (`components/ui/controls.tsx:32`). No style or class keys off `data-draft-start`, `data-options-loaded` or `data-start-ready`. The one other `[data-mode="live"]` selector (`tests/check_s5_slice3_browser.cjs:100`) is scoped to the finder dialog, so the two cannot clash. The 04-forms-tab-warning screenshot shows no visible change. axe was clean on all 3 states in every run. The attribute values are correct. `options-loaded` is `isSuccess || isError`, so it stays true during a refetch. `start-ready` mirrors the button's real `disabled` rule and adds `busy` and options loaded. React renders the bare `data-draft-start` attribute as `"true"`, and `[data-draft-start]` matches it.

## Runs (all on this commit's test and web build)
| Run | Copy | Result |
|---|---|---|
| Baseline | :4456 | 26 passed, 0 failed (34 s) |
| **Main's** test, options delayed 3 s | throwaway :4457 | **FAIL**: `locator.click: Timeout 30000ms` on "Start live AI draft". The 3 s delay is longer than the plan fetch, so main fails one line later than in CI, from the same cause. |
| New test, options delayed 3 s | throwaway :4457 | 26 passed, 0 failed |
| New test, options delayed 100 s | throwaway :4457 | fails loudly as quoted in 2 (expected) |
| Under load 1 / 2 / 3 (6 CPU burners on 4 cores, load avg 6.7–8.6) | :4456 | 26/0 (50 s) · 26/0 (58 s) · 26/0 (49 s) |
| New test, delay 3 s **and** load | throwaway :4457 | 26 passed, 0 failed |
| Mutation: dialog spend re-read removed | throwaway :4457 | 1 FAIL on its step (expected) |

Clean-up done. The screenshots are restored with `git checkout`. The throwaway copy is deleted, the `xr_studio_rv8a_*` databases are dropped, and the `var/isolated-rv8a_*` folders and the scratch ledger are removed. Nothing was committed.

## Issues (ranked)
1. **Minor (Should, product behaviour outside this diff): late saved answers undo the author's Live choice.** Code: `sources.tsx:123`. Repro: delay `draft-options` about 3 s (or run under load), open Forms › IMM 5409 › Draft with AI, choose Live in the first moment, and watch Start turn into "Use saved AI answer". It is the US$0 direction and the label changes visibly, so no money is at risk. Still, the dialog changes a choice the person made. The test now waits it out, as it should for the page as built. Fix as a separate row: switch to the saved answer only if the author has not chosen a mode yet, or keep the mode radios disabled until the options load.
2. **Minor (nit): the `ready()` failure message.** Code: `tests/check_cost_warning_browser.cjs:115`. The message reads attributes with Playwright's default 30 s time-out. If the dialog never opened, the error becomes a generic `getAttribute` time-out after another 30 s. It is still loud, but it does not say what it saw. Fix: `getAttribute(…, { timeout: 1_000 }).catch(() => "absent")`.
3. **Minor (nit): the `fresh` wait matches any `[role="dialog"]`.** Code: `check_cost_warning_browser.cjs:141`. It should match the form's dialog only. It cannot pass falsely today: the warning has closed, and its wording has no "of the US$120.00". Scope it to `dd`.

Also noted, not in the diff and not counted: the fixed pauses at lines 74, 82, 132 and 134 are "nothing happened" pauses, not readiness waits. The copy is started at line 17, outside `try`, so a failed start leaves the scratch ledger behind.

## Journey score (reviewer, simulated only)
Journey: the author, on the Forms tab › Draft with AI › Live › Start, sees the cost warning, then Cancel, Escape, and Continue starting one run. Walked by the automated check only (headless). No visible-browser walk by a person.

| Criterion | Score | Evidence |
|---|---|---|
| task completed | 1 | the run starts once with the override (step N1 pass) |
| next step obvious | 1 | warning with Continue/Cancel, screenshot 04 |
| plain words | 1 | "Nothing is spent until you choose." |
| feedback and state | ½ | Live is switched to the saved answer silently (issue 1) |
| correct data | 1 | ledger lines and batch count checked underneath |
| error recovery | 1 | Cancel and Escape start nothing and keep the dialog open |
| accessibility and screen sizes | 1 | axe clean ×3; 390/1024/1440 screenshots; keyboard Enter/Escape |
| speed | ½ | saved answers arrive late under load (the cause of the race); not timed against §9 |
| visual quality | 1 | screenshot 04 |
| trust and sources | 1 | worst case, spend and cap shown before any spend |

**9/10, no criterion at 0: pass.** D17/D20 stay with the founder. Not checked: a real screen reader, the CI logs (blocked), and a visible-browser walk. The journey-test report is folded into this file, as the caller asked for this one file only.

**Verdict: Approve** for 71e37575.
