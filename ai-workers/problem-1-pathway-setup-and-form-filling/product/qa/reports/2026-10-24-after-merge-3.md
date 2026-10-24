# `/qa after-merge` — runtime R1c, screens small FIX, forms slice 2b + qa Minors on main 12e7207, 24 Oct 2026 (third run)

Tester: the qa lane, cloud session on `claude/qa-e01030`, Lead note 2026-10-24 21:10 (one run only: weekly usage). Tested: **main 12e7207** (PR #10). Own copies on 4470–4477 (`xr_studio_qa_*`), all stopped; a throwaway lane copy under `.claude/worktrees/` for QA-4, removed. No paid AI: no live spend-ledger line, US$0. The suites' by-products (screenshots, evidence, ledger lines, stub runs, one generated inventory) were restored and none were committed. Every walk was headless (the cloud has no display).

## Verdict
**Ready, with one Major to fix: no Blocker, no Critical.** 15 of the 17 findings the Lead listed are closed: QA-4, 15, 20, 22, 23 (D1), 24 (D2), 25, 27, 28, 29 (D3), 30, 31, 32, 33 and 34. QA-26 is two thirds fixed.

The **R1c case area works for the officer and the client** at 1440 and 390 px, with axe clean on every state walked. The walk and the checks found three new problems:
* **QA-35 (Major):** the studio's own Demo menu entry "Open the case area" opens a **blank page** for the configuration author, and a reload is the only way out.
* **QA-36 (Minor):** Back stores an impossible date and says "✓ Saved", where Save and continue would refuse it.
* **QA-37 (Minor):** the agent view's edit message says "(3 boxes)" (P-63).

api coverage is back above the floor, and both floors were raised.

## Retests
| # | Result | Evidence |
|---|---|---|
| QA-4 Major | **Closed** | lane copy under `.claude/worktrees/`: pages 5/5, source download 200 |
| QA-20, QA-22 | **Closed** | channels walk 19/19 (400 px fits); author flash check PASS (skeleton until the person is known) |
| QA-23 (D1), QA-24 (D2), QA-25, QA-28 | **Closed** | `check_qa_r1a_probe.ts` 70/71. A double-clicked Add child adds one, both through the API (same key) and in the browser |
| QA-26 | 2 of 3 | `applies` as text still reads "Invalid input: expected boolean, received string" |
| QA-15 | **Closed** | `check_qa_f1_probe.ts` 26/26 |
| QA-27, 29 (D3), 30, 32, 33 | **Closed** | `check_qa_s2_probe.ts` 56/56. A LIVE start with proposals waiting returns them, reused at US$0, with no job and no ledger line |
| QA-31 | **Closed** (not by qa's own probe) | builders' `check_ai_launch_paths.ts` 55/55 (fake launcher) run by qa on 12e7207, plus the code (`forms.ts:499, :557`). I wrote no LIVE-cancel probe of my own (one-run budget) |
| QA-34 Major | **Closed** | coverage below |
| Probe upkeep (Lead note) | Done | `check_qa_s2_probe.ts`: "a new draft starts at once after a cancel" now runs before the retry. The fixed retry starts a new step, so the next draft waits for it. D3 and QA-31 checks rewritten for the chosen designs |

## R1c case area (`check_qa_r1c_walk.cjs`, 24/27; the builders' journey `check_runtime_r1c.cjs` 79/79)
* **Officer, 1440 and 390 px:** case list and case page have no sideways scroll and are axe clean. With 292 cases in the workspace, Load more adds exactly one page on a double click, and clicking it until it disappears lists every case once. Tab reaches "Open a case" and Enter opens its dialog. A double-clicked Add (child) adds one child.
* **Wrong person by address:** a client on `/cases` reads "Cases are for the case officer". A client on another client's questionnaire reads "This questionnaire is not available to you", and nothing of that case is shown. A client on the officer's case page reads "This page is for the case officer".
* **Client, 390 px:** overview, part 1 and saving all work, and are axe clean. A reload mid-part keeps the saved answers, and the stored answers match what was entered.
* **Failed, QA-35:** configuration author → Demo menu → "Open the case area (runtime preview)", or `/cases` typed → blank page (`r1c-author-from-demo-menu-1440.png`). Cause: `runtime/cases.tsx:26` changes the person in a layout effect before `useActorId` (`lib/api.ts:11`) subscribes in its own effect, so nothing re-renders.
* **Failed, QA-36:** part 2, visit start typed as 31 / 2 / 2027 → Back → moves to part 1 with "✓ Saved", and `case.intended_stay_from` = "2027-02-31" is stored. The server flags it, but the client never saw the error. Save and continue refuses the same input with a summary.

## Smoke of every Works capability
M2 journeys J1–J8 47/47 (one run). Warm first view 757 ms, filter 181 ms, create 266 ms. `check_qa16_box_words.ts` **FAIL: 1 in the web app**. The R1c agent view's edit message says "(3 boxes)" (`runtime/questionnaire.tsx:581`), which is **QA-37** (UX · Minor, runtime; P-63). C3.10 moves back to Partial. Decision impact: no Gap.

## Suites on 12e7207 (`run-suites.sh --demo` under coverage, one run)
**20/20 effectively**: 19 PASS, and `check_p2_guard.ts` failed only under the coverage preload (75/75 plain, as on db468e38). Results: drafting 48, launch paths 55, orchestration 22, engine 38, forms channels 106, slice 2 53, slice 2b 60, grounding 29, Screen 01 API 135, channels 42, release race, rules 67, Screen 01 browser 136, small FIX browser (all), Studio browser 40, case engine 29, runtime R1c 79, runtime R1a 97, p2 launch 53.

## Coverage (c8 12.0.0, every suite above)
api/src **95.95% lines / 80.95% branches**, engine **99.39% / 87.53%**. Both are above the floor, which is now raised to api 95 / 80 and engine 99 / 87. Lowest branches: `intake.ts` 71.5%, `studio.ts` 72.9%, `fill.ts` 73.1%, `sources.ts` 75.5%, `import.ts` 75.9%, `ai-run.ts` 77.3%.

## Open after this run
**0 Blocker · 0 Critical · 1 Major (QA-35) · 4 Minor (QA-19 Lead demo data, QA-26, QA-36, QA-37).**

## Could not cover (one run)
* The agent view (C6.3), walked by the builders only.
* qa's own LIVE screen-map cancel probe (QA-31 rests on the builders' fake-launcher suite).
* 200% zoom and a screen reader.
* The founder's :4400 and QA-19 (the cloud :4400 is disposable).
* A headed walk.
* Repeat runs for flakiness: everything here ran once, except the probes, which ran during fixing.

## Questions for the Lead
1. QA-35 belongs to the runtime lane (`cases.tsx` with `lib/api.ts`). Is a one-line fix acceptable, such as subscribing before the switch or rendering the officer directly, or should it wait for the next R1 stage?
2. QA-36: should Back apply the same field checks as Save and continue, as I assumed, or save whatever is typed and flag it for the officer? The second is what the API does today.

## Suggestions (never built by qa)
* Make the builders' R1c journey enter the case area from the studio's Demo menu as the author, the way a person does. It would have caught QA-35. *Needed for the proof · Scaffolding.*
* One shared "save before leaving" path for Back and Save and continue, so they cannot disagree (QA-36). *Needed for the proof · Capability.*
