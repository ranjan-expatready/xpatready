# BK-5: start page, three starting points and a reset (concept DRAFT)

Concept lane (skill screen-concept, steps A1-A7), 11 Nov 2026, for the tech lead's approval (P-223 (4)); not yet `concept.md`. Row: Bake plan row 5 (`design/bake-plan-2026-11-10.md`), P-447 (2); squeeze S3 (`design/bake-squeeze-2026-11-11.md`, #1572), P-481; E1's start, P-456 (1); style P-473. Board: `design/board-bk5.html`. Paths under `prototype/studio/` unless stated; read on `origin/main` 68a7b59d1. Same concept lane as BK-4 (one author keeps sign-in and start page consistent).

## 1. Job and journey
* **Job:** whoever runs the demo or a walk picks where the story starts, in one place, in words a newcomer understands, and lands on the first screen of that story; today the same choices hide in a Demo menu of seven items with three disabled states (`App.tsx:212-225`).
* **Persona:** the person running the demo (founder, co-founder, qa's fresh reader): signed in as the Configuration author, because every load needs the author duty (`api/src/demo.ts:91, 129, 175`, `need(actor, "author")`).
* **Journey:** sign-in (BK-4a) → **start page** → first screen of the story (E1: the Studio's Immigration programs with one pathway left to release, P-456 (1)).

## 2. Ten layers
* **Exists, unchanged (facts):** every load and reset is a server route behind the author duty and the demo-workspace guard: `POST /demo/reset {confirm:"RESET"}`, `POST /demo/load {sample:"six"|"configured"}` (refused while programs exist), `POST /demo/reset-to-six {confirm}`, `POST /demo/checkpoints/finished-story {confirm}` (a job; it empties first), `GET /demo/status` → `programsExist`, `checkpoint` ("configured" | "finished_story" | null), `story` (`api/src/main.ts:137-139`, `demo.ts:59-103`, `demo-reset-to-six.ts`, `demo-finished-story.ts`). The dialogs that call them are in `App.tsx:226-288` and `components/demo-finished-story.tsx`.
* **What each starting point is** (`product/DEMO.md` "Checkpoints"): blank (sources only); the six (Sample, nothing reviewed); configured (A and B released, the thin family case on release 1; the other four not released); finished story.
* **New:** one page `/start` in the Studio frame; one Demo menu item "Starting points…" at the top. **No API, schema or engine change.** Demo chrome, listed as not for porting (EXPERIENCE §1).

## 3. Business rules
| BR | Rule | Source |
|---|---|---|
| BR-1 | Every starting point empties the demo first and says so before it runs; kept: saved AI answers, official PDFs, spend record (checked unchanged). | `App.tsx:301, 339-343`; P-35 |
| BR-2 | Destructive: one confirmation, typing RESET, as every reset today. | EXPERIENCE §2.8; `demo.ts:177` |
| BR-3 | Only a person with the author duty can start one; others see the doors disabled with the reason and the way (sign in as the Configuration author). The server refuses anyway. | `demo.ts:91`; P-456 (3) (the picker is an allowed change) |
| BR-4 | The page says which starting point is loaded now (from `/demo/status`), or "Something else (changed since loading)" when it cannot tell. | EXPERIENCE §2.7 "counts say what they count" |
| BR-5 | Running shows real progress only (elapsed time; the finished story's own state); one run at a time (the server's 409 shown in words). | EXPERIENCE §4; `demo.ts:93` |
| BR-6 | A failure midway says what is left (e.g. "The demo is now empty; the configured load stopped: <server words>") and offers Try again. | D1 review 2 (`App.tsx:331-333`) |
| BR-7 | US$0: no live AI call on any door (replayed answers only). | P-175; `App.tsx:229` |

## 4. Layout (pattern: Dialog/wizard as a page: one choice, ≤3 options)
* **Where:** `/start`, Studio frame; where-line "Start"; no Back (an area's first page for the demo). PR 2 (after 4a): signing in as a Studio person lands here.
* **Header:** H1 "Where should the story start?"; one line: "Each starting point empties the demo workspace and loads a known state. Saved AI answers, official PDFs and the spend record are kept. US$0." Status line: "Now loaded: Pathways released, ready to walk".
* **Three door cards** (one row at 1440 px, stacked at 375 px), each: name, two lines of what you will see, time, one button.
  1. **Nothing set up** — "An empty Studio: add a program, find its forms, let AI draft from saved answers." ~10 s. Button "Start from nothing" (the reset to blank).
  2. **Pathways released, ready to walk** — "The six pathways set up; each released where its rules allow (Visitor visa and With an LMIA at least, DEMO.md), a family case on Visitor visa's release 1; the rest wait to be finished and released. The walk starts here." ~2 min (BK-1: 114 s). The builder records the exact released count on its own copy and puts it in the card's words. Button "Start here" — **the one filled blue button** (E1's door, P-456 (1)).
  3. **The finished story** — "The family case all the way through: forms filled, signed, every filing ready to file." a few minutes, runs in the background. Button "Load the finished story".
* **The reset:** the loaded door's card says "Loaded now" and its button reads **"Start again from here"** (reloads that door). Doors 1 and 2 run reset then load, two calls in a row (door 1 is the reset alone).
* **Fold-out "Other starting points"** (FoldOut): "The six pathways, nothing reviewed" (Reset to the six) and "With an LMIA from its reviewed release" (after the six). Same dialogs as the Demo menu, reused.
* **Confirm dialog** per door: "Empty the demo and start from <door>?" · Goes / Comes back / Kept columns (as `ResetToSixDialog`) · Type RESET · [Cancel] [Empty and start]. Running: spinner with elapsed seconds and the step ("Emptying…", "Loading the configured checkpoint…"). Done: toast + land on `/` (doors 1-2) or stay with the story's result (door 3, as today).
* **States:** normal · loaded-now · not the author (doors disabled, reason, link "Sign in as the Configuration author" → `/sign-in`, or the picker before 4a) · running (another tab running: 409 words) · failed midway (BR-6) · server down (frame notice) · not a demo workspace (server words, doors disabled).

## 5. Best in class (4b, P-392)
* **Atlassian Jira "sample data" / JSM "sample space"** (support.atlassian.com "Create a Jira Cloud board with sample data"; "Test, explore and learn with your sample space"): a ready, realistic project chosen at creation and named so it is easy to delete. **Copy:** a named, realistic starting state chosen in one click. **Beat:** we say exactly what is in it and what is kept.
* **Stripe test mode, "Delete all test data"** (docs.stripe.com testing; Developers › Overview: review what will be removed, then delete; cannot be undone): **copy** "review what goes, then confirm". **Beat:** we also list what is kept and check it unchanged.
* **Start screens with few choices** (Word's Blank / templates / recent; Notion's empty page or template, product knowledge, not re-checked today): **copy** three big choices, the blank one first.
* **Effort saved:** today the walker must know that "Load the configured checkpoint" is disabled until "Reset demo…" has run, type RESET, then load (3 menu steps, 2 dialogs). After: one card, one RESET, one wait. BIC scorecard: BIC-11, BIC-18, BIC-20 apply; others (questions, documents, filing): N/A.

## 6. Copy
Disabled reason: "Only the Configuration author loads a starting point." · 409: "Another load or reset is running in this workspace: wait for it to finish, then try again." · Not demo: the server's words. · Done (door 2): "Pathways released, ready to walk: loaded in 112 s. Pick a pathway that is not released yet to finish and release it."

## 7. Contract and tests
* **Contract:** existing routes only (§2). Door 2 from a non-empty workspace = `POST /demo/reset` then `POST /demo/load {sample:"configured"}`; door 1 = reset; door 3 = finished-story with `confirm`.
* **Tests:** browser `tests/check_bk5_start_browser.cjs` (1440, 375 px, axe, keyboard): one pass and one fail per BR. BR-1/2: no request until RESET is typed; BR-3 fail: as the Approver every door is disabled and no `/demo/*` POST is sent; BR-4: after door 2, "Loaded now" on card 2; BR-5 fail: a second tab's start reads the 409 words; BR-6 fail: load routed to 500 after the reset → "The demo is now empty…" + Try again; BR-7: no request to a live AI route. Door 2 run end to end once on the lane's own copy (~2 min).
* **Breaker (P-278):** new page; destructive actions; double click, two tabs, reload while running.

## 8. Capability or scaffolding; Needed for the proof
Whole page: **Scaffolding** (demo chrome, P-35; not ported) · **Needed for the proof** (E1, E2 start here). The Demo menu's other items stay for now: 49 test files click them; removing them is a follow-up, **Not built**.

## 9. The two PRs
| PR | Files | Done when |
|---|---|---|
| **BK-5 PR 1** start page, beside BK-4 | new `web/src/pages/start.tsx`; `App.tsx` (route `/start`, Demo menu item "Starting points…" first); `components/where.ts` (words for `/start`) | BR-1 to BR-7 pass and fail; door 2 lands on Immigration programs with the released pathways marked; breaker Approve; walk by screens 1440 px: Demo › Starting points → door 2 → first set-up step |
| **BK-5 PR 2** sign-in → start page, after 4a merges | `pages/sign-in.tsx` (Studio people land on `/start`), `pages/start.tsx` (disabled state links to `/sign-in`) | gate A walk: sign-in → start page → door 2 → the pathway to release, 0 person changes outside BK-4's BR-1 |

## 10. Questions (recommendation first)
1. **The second door: "the six" (Bake plan) or the configured checkpoint (P-456 (1))?** *Rec: the configured checkpoint as door 2*, because E1 starts there by ruling and the six cannot be walked to a release (BK-1 §2.5); the six stays under "Other starting points". This changes the plan's door name "Six pathways set up".
2. **Door 2 as two calls (reset, then load) or one new server route?** *Rec: two calls in the Bake* (no API change, BR-6 covers the midway failure); a one-step route is a follow-up only if the breaker finds the gap unsafe.

## Definition of ready
Acceptance tests named (§7); row text §9; decisions: Q1-Q2 answered by the Lead; fresh challenge done; Lead approval (P-223 (4)).
