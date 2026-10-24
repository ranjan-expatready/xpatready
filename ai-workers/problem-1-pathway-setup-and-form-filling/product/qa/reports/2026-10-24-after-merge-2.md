# `/qa after-merge` — Screen 01 small FIX, forms slice 2, runtime R1a, evidence IMM 5409 on main, 24 Oct 2026 (second run)

Tester: the qa lane, cloud session on `claude/qa-e01030`, started by the Lead (note 2026-10-24 22:00). Tested: **main db468e38** (merge of PR #7). Own copies on 4470–4479 (`xr_studio_qa_*`), all stopped; a throwaway lane copy under `.claude/worktrees/` with linked packages for QA-4 and QA-8, removed after. No paid AI: 180 new spend-ledger lines, all stub reservations and settlements at US$0, no live line; restored after the run with the other suite by-products (none committed). No visible browser in the cloud: every walk is headless Playwright.

## Verdict
**Ready, with fixes queued: no Blocker, no Critical.** **Screen 01 passes from the qa side.** Its Major QA-14 is closed and nothing Major is left in its scope; QA-20 and the new QA-22 are Minor. **Forms slice 2** and **runtime R1a** hold up under independent API probes, but each has Majors: D3 (QA-29), D1 (QA-23) and D2 (QA-24). The Lead has already asked for all three in the lanes' next FIX, and they now have replays. **New Major QA-34:** api coverage fell below the floor.

## Retests asked for by the Lead
| # | Result | Evidence |
|---|---|---|
| QA-14 Major | **Closed** | `check_qa14_name_race.ts`: 20 names × 4 at once → one 201 each; new `check_qa14_variants.ts` 20/20 (case, double space, hyphen, underscore, trailing dot at once; category and sub-category; refusal "… already exists under …"); grounding 29/29 ×2 |
| QA-17 Minor | **Closed** | a step moved two days back reads "Oct 22, 6:18 p.m."; today's "today 6:18 p.m." (`QA-17-recent-steps.png`) |
| QA-21 Minor | **Closed** | `check_screen01_browser.cjs` 136/136 in both full runs |
| QA-8 Major | **Closed** | orchestration 22/22 in a lane copy under `.claude/worktrees/` with the main copy's `node_modules` linked (the failing set-up), and in the plain copy |
| QA-4 Major | Open | dot-folder lane copy: pages 5/5, source download 404; plain copy 200 (control). `main.ts:66, :79` `res.download` still without `dotfiles: "allow"` |
| QA-20 Minor | Open | 413 px at 400 px; the culprit is the Portal select in the Filing · Portal row (tabs and table scroll inside their own boxes) |
| C1.6 / C1.7 walk | Works | `check_qa_s01_channels.cjs` 18/19 (only 400 px fails) |

## New capability evidence (API, US$0)
* **Forms slice 2** (`check_qa_s2_probe.ts`, 45/57, same twice): what held: roles (403, 401 for an unknown or missing person), five screen-map starts at once make one job, four A4 drafts at once make one step, a launch key sent twice makes one batch, a stale worst case or plan gives 409 with the new amount, cancel during parts stops them, a restart ends a running job FAILED in plain words, a changed code is not reused. What failed: QA-29 (D3), QA-30, QA-31, QA-32, QA-33, QA-27 (six refusals).
* **Runtime R1a** (`check_qa_r1a_probe.ts`, 59/69, same twice; replayed by me on a second copy): what held: wrong case by id gives 404, wrong role 401 or 403, an unreleased combination 409 with nothing written, stale versions 409 with one current answer, two Confirm section presses give one 201, non-English text is stored exactly, P-78 holds for a spouse, a child and an adult "child", P-72 holds (an unconfirmed answer reaches the fill as "answered on screen"), every refusal is Problem Details. What failed: QA-23 (D1), QA-24 (D2, which also reaches the fill), QA-25, QA-26, plus the gap QA-28.

## New findings (detail in `qa/BUGS.md`)
| # | Type · Sev. | One line | Lane |
|---|---|---|---|
| QA-22 | UX · Minor | Author sees "A configuration author adds combinations here" and a disabled New combination while the session loads (`programs.tsx:47`); 2 of 4 J1 runs; deterministic check | screens |
| QA-23 | Bug · Major | D1: a removed repeated row blocks Confirm section forever (`runtime.ts:254–257`) | runtime |
| QA-24 | Bug · Major | D2: an impossible or future birth date counts as a minor; the principal's answer for that child reaches IMM 5257/5707 as a confirmed fact (`case.ts:27`) | runtime |
| QA-25 | Bug · Minor | Control characters accepted in typed answers (build notes say refused) | runtime |
| QA-26 | UX · Minor | Validator wording on three runtime refusals ("Invalid UUID") | runtime |
| QA-27 | UX · Minor | Validator wording on six forms refusals | forms |
| QA-28 | Gap · Minor | Double "Add child" adds two children (no idempotency) | runtime |
| QA-29 | Bug · Major | D3: undecided screen-map proposals do not stop a second start; LIVE would pay again (`forms.ts:484`) | forms |
| QA-30 | Bug · Minor | Draft request with no mode → 500 (`ai.ts:187`) | forms |
| QA-31 | Gap · Minor | A screen-map job cannot be cancelled (no batch, no endpoint) | forms |
| QA-32 | UX · Minor | Retry after a mid-run cancel: "Nothing to retry: no step failed" | forms |
| QA-33 | Gap · Minor | Part reuse ignores a changed field type (caption and choices only) | forms |
| QA-34 | Gap · Major | api coverage 93.97 / 77.67 below the 95 / 79 floor | forms (Lead assigns) |
Open totals: **0 Blocker · 0 Critical · 5 Major (QA-4, 23, 24, 29, 34) · 12 Minor**. Closed this run: 4 (QA-8, 14, 17, 21).

## Smoke of every Works capability
M2 journeys J1–J8 (`check_qa_m2_journeys.cjs`), fresh copy each, headless at 1440, 1024 and 400 px: **47/47, 46/47, 47/47, 46/47** in four runs. One failure was my own check reading the next step before it loaded; that check now waits for it. The other failure is QA-22. Warm first view 813–857 ms, filter 195–218 ms, create 328–381 ms. `check_qa16_box_words.ts` PASS.

## Suites on db468e38 (`run-suites.sh --demo`, two full runs)
All **16/16 PASS** in run 1: drafting 48, orchestration 22, engine 38, forms channels 106, forms slice 2 52, grounding 29, Screen 01 API 135, channels 42, release race, rules 67, Screen 01 browser 136, Studio browser 40, case engine 20, runtime R1a 85, p2 guard 75, p2 launch 53. Run 2, under coverage, gave the same results except `check_p2_guard` 72/75. That suite passes 75/75 without the coverage preload: the preload file sits outside the sandbox's read list. This is a harness effect, not the product.

## Coverage (c8, run 2: every suite above)
api/src **93.97% lines / 77.67% branches** (floor 95 / 79: **QA-34**) · engine **99.00% / 86.74%** (floor raised to 99 / 86). Lowest branches: `ai-run.ts` 66.2%, `sources.ts` 67.3% (paid-call refusal and provider-limit paths, 351–407), `fill.ts` 67.6%, `studio.ts` 71.8%, `intake.ts` 72.4%, `ai.ts` 74.4%. `runtime.ts` 100% lines / 84.2% branches. Rules with a failing test today: D1 (QA-23), D2 (QA-24), D3 (QA-29). Decision impact: every product decision has a capability or backlog row (no Gap).

## Journey score — Screen 01 (simulated personas)
Task 1 · next step 1 · plain words 1 · feedback and state ½ (QA-22) · correct data 1 (QA-14 closed) · error recovery 1 · accessibility and sizes ½ (axe clean; 400 px QA-20; 200% zoom, screen reader not tested) · speed 1 · visual 1 · trust and sources 1 → **9 / 10, no 0: pass**. D17 and D20 are not awarded (no intended user).

## Could not test
* The read-only walk of the founder's :4400 and QA-19. :4400 in this cloud copy is a disposable demo that the suites reset.
* A headed walk (no display in the cloud).
* 200% zoom and a screen reader.
* Any LIVE drafting call: D3's second payment, saved-part reuse on retry, and whether a call goes out after a cancel. These are US$0 rule limits.
* The runtime screens (R1c) and the real fill (R1d).
* A second workspace for cross-firm cases.

## Questions for the Lead
1. QA-24: I graded it Major, where the PR review said Minor, because the impossible birth date lets a principal's answer fill IMM 5257/5707 as a confirmed fact (P-72). Agree?
2. Minor status comes from the officer's typed birth date before anyone confirms it. Should an unconfirmed birth date decide P-78 at all, or should the answer wait until that date is confirmed? This needs a product decision, not a bug fix.
3. QA-34: should forms add a fake-launcher test for the paid-call failure paths (`sources.ts` 351–407, `ai-run.ts`) in slice 2b? Lowering the floor is not allowed (P-69).

## Suggestions (never built by qa)
* Treat the session as loading (no role-dependent text) until it arrives, on every page that reads duties (QA-22). *Needed for the proof · Capability.*
* One plain-words error map for zod failures in the Problem Details filter, rather than per contract (QA-26, QA-27). *Later · Scaffolding.*
* In `run-suites.sh`, an opt-in coverage mode that leaves the drafting sandbox suites out of the preload. Today qa has to explain the `check_p2_guard` red. *Later · Scaffolding.*
* The suites rewrite tracked screenshots, evidence and the spend ledger in place, so every run leaves a dirty tree that someone must restore by hand. Suggest the suites write them under `var/` unless asked. *Later · Scaffolding.*
