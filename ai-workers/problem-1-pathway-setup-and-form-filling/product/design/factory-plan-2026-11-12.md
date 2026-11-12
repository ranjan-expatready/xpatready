# The delivery factory: size, causes, structure and decisions (P-502)

Planning study by the Fable planner (P-455 (5)), 12 Nov 2026, for the founder and the current Lead (`tools/current-lead.sh`). Read-only: no app code changed. Live AI off, US$0.

**Data.** Pulled 12 Nov ~14:30 to 15:45 IST: `origin/main` at `56b630913`; GitHub REST (1,300 closed PRs back to 1 Nov, 3,544 issue comments, 7,200 issue events, 273 `nightly.yml` runs); the team's requirement snapshot `domain/requirements-2026-11-02/` (name-free copy); the ER v2 captures `code/ERv2-sanitized@2bcde9c-2026-10-28` and `code/ERv2-frontend@24cae6b-2026-10-28`, read for **size and structure only** (P-502 (2)); no ER v2 code is copied here. Every number names its sample (P-500). Scripts and outputs are in `factory-plan-2026-11-12-evidence/` and re-run in minutes (section "Evidence").

**Words.** *App PR* = a merged PR that changed app code, by files changed (P-500 folders: `prototype/studio/{api/src,web/src,engine,prisma,contracts,samples,packages}`). *Works* = a capability qa confirmed (RULES "When a capability counts as Works"). *Requirement* = one numbered line in the team's spec (e.g. `AG-7-12`). *Card* = the team's headed, buildable unit with its own status marker. *H-n* = a hypothesis, with the test that settles it; never shipped as a fix (P-502 (1)).

## The short answer (plain words)

1. **The product is bigger than 500-600 capabilities.** The team's own spec has **2,253 live numbered requirements in 32 modules**. Measured against how our own capabilities cover the configurator spec, that is roughly **1,400 capabilities still to build for the parts that are ours or nobody's yet** (band 850 to 2,300), plus the platform foundation the team is already building in ER v2. The 500-600 figure is a hypothesis below that band; a two-hour test settles it (section 1).
2. **Our app was built as one big box, on purpose, for a prototype; it is now the brake.** It has **one** NestJS module, 141 files side by side in one folder, seven files over 800 lines, no lint and no rule that keeps one area out of another. ER v2, the team's code, has 78 modules, a hard 800-line limit with no exceptions, enforced module boundaries and its database schema split into domain files. Nobody decided against modules here; the prototype grew into a product without the step that makes a code base safe for many builders.
3. **What it costs, measured on 301 app PRs (2-12 Nov):** 29% of them hit a real merge conflict, which roughly doubled their time (about **300 PR-hours** lost, size-matched). A further **270 PR-hours** were spent between a reviewer's Approve and the label, beyond the time CI needs. Each confirmed capability took about **5.5 app PRs**, because gaps are found after the merge and fixed in new PRs. Merges themselves are not slow (queue median 1.1 h) and machines are not short (runner wait median 0, P-489).
4. **The fix is a known pattern, not an experiment:** a *modular monolith* with *bounded contexts* (DDD), one owner lane per module (*Team Topologies*), an 800-line file limit and import boundaries checked by the same lint plugin ER v2 uses, a contract between "what was released" and "what runs a case", and flow measured with *DORA* and *Little's law*. We move there in about 15 small, behaviour-unchanged PRs after the Bake's tag commit, each kept only if conflicts fall (P-438 (3)).
5. **Five decisions for you** are at the end (section 6). The rest is the Lead's to run (P-384).

---

## 1. Size of the whole product

### In plain words
The team's spec is the honest ruler: it lists every requirement the finished product must meet. It has 32 modules (19 for the firm's staff, 13 for the platform team). We have built mostly inside two of them, the configurator (SA-01B) and case delivery (AG-07 to AG-09, AG-19). Even there we are roughly a third of the way by the team's own measure. Front-office modules (CRM, booking, retainers, billing, messages, automation, tasks, reports) are not started here. The platform foundation (tenants, sign-in, roles, subscriptions) is the team's, and their code base already holds most of it.

### 1.1 What ER v2 is (measured, read-only)

| Measure | ER v2 backend (`apps/`) | ER v2 frontend (`src/`) | Our app (`prototype/studio`) |
|---|---|---|---|
| Source files (non-test) | 1,656 | 2,466 (1,460 `.tsx`) | 228 api + 125 web + 88 engine |
| Test files | 2,769 | 589 | packs and checks in `tests/`, `acceptance/` |
| Lines incl. tests | 1,122,402 (`apps/`); 940,624 in `apps/api/src` | 436,548 | 32,931 api + 20,668 web + 13,739 engine |
| NestJS `@Module`s | 79 (78 in `apps/api/src`) | n/a | **1** (in `main.ts`) |
| Top-level backend folders | 41 (median 29 files, p90 248) | 28 feature folders | 1 flat folder of 141 files + `features/` |
| Controllers / routes | 117 / 453 (decorator count) | n/a | 69 / 401 |
| Prisma models | 200, split into domain files under `prisma/models/` | n/a | 103 in one `schema.prisma` |
| Largest non-test file | **800** lines exactly; **0 files over 800** | 794; 0 over 800 | 1,284 (`api/src/studio.ts`); **7 over 800** (6 api, 1 web) |
| File-size rule | `eslint-rules/max-file-lines.mjs`: hard 800, "no exceptions" | same rule | none (no ESLint in the app) |
| Module boundaries | `eslint-plugin-boundaries`: default disallow; other modules may import a module's public files, never its `internal/` | ESLint rules | none |

How measured: `measure_structure.py` (physical lines, as ER v2's own rule counts them; routes = `@Get/@Post/@Put/@Patch/@Delete/@All/@Head/@Options` decorators). The Lead's earlier figures (91 modules, 139 controllers, 554 routes) counted the whole repository; mine count `apps/` only. Both say the same thing: ER v2 is built as many small, fenced modules; ours is one.

ER v2's architecture record calls itself a **"NestJS 11 modular monolith ('modulith')"** with **"one module, one bounded context"** (`Docs/02-Architecture-Decision-Record.md`, `Docs/03-Doc-1-Platform-Foundation.md` §1.1). Its multi-developer note (`Docs/MULTI-DEVELOPER_WORKFLOW.md`) found the same conflict sources we have: central lists every feature adds to, generated files, shared fixtures; it fixed them by per-module registry files, a split schema and fast CI. We can reuse the method (not the code).

### 1.2 The team's spec, counted

| Unit | Count | How |
|---|---|---|
| Modules | 32 (AG-1 to AG-19, SA-1, SA-1B, SA-2 to SA-12) | files in `02-functional-requirements/{agent,super-admin}` |
| Live numbered requirements | **2,253** (86 withdrawn) | `count_frs.py`: lines that start with the module's own id; struck-through or "Withdrawn" excluded |
| Cards with the team's status marker | 610: **531 Not built, 78 Partly built, 1 Built** | `count_cards.py`; only modules rewritten in card format carry markers (SA-1B 176, AG-7 106, AG-2 64, AG-6 51, AG-4 47 …) |
| Cards per requirement (modules with both) | median ~0.8 (SA-1B 0.81, AG-7 0.95, AG-4 0.94, AG-19 0.95, AG-6 0.78, AG-2 0.59, AG-5 0.42) | the two tables above |

Parser error: on SA-01B my parser finds 218 numbered lines where the hand trace (`master-plan-2026-11-11/03a-trace-SA01B-v2.1.md`) counted 179 cards, so requirement counts run ~20% above card counts. That is inside the band below.

### 1.3 Mapped to ours: have, partly, lack

| Group (ER v2 module map, Doc 1 §1.1) | Team modules | Requirements | Ours today | Status here |
|---|---|---|---|---|
| **A. Content pack configurator** (ER v2 `spine`, `pack-authoring`) | SA-1, SA-1B, SA-5 | 369 | C1-C5, C9, C11 (~70 rows, Works) | **Partly.** SA-1B hand trace: 20 of 179 cards built, 92 partly, 15 M4, 9 M5, 15 not planned. Global templates (SA-5) lacking |
| **B. Case delivery** (Questionnaire · Documents · Forms · Workflow) | AG-3, AG-7, AG-8, AG-9, AG-15, AG-17, AG-19 | 440 | C6-C8, C10 (~28 rows) | **Partly.** Case, people, questionnaire, documents, fill, readiness, filing record exist on Sample data; client portal (AG-15) only the family link; corporate/LMIA (AG-17) one Sample employer case; pathway assessment (AG-3) only the staff case check C6.9 |
| **C. Firm front office** | AG-2 CRM, AG-4 booking, AG-5 retainer, AG-6 billing, AG-10 messages, AG-11 automation, AG-12 templates, AG-13 tasks, AG-14 reports | 692 | fees worked out (C6.12), a signing order; nothing else | **Lacking.** ER v2 frontend has screens for several (pipeline 29k lines, tasker 12.5k, scheduler, esign, invoicing), many reading mocks; ER v2 backend has no CRM, booking or case module yet |
| **D. Firm admin and data** | AG-1, AG-16, AG-18 | 242 | stand-in firm and team (C6.11) | **Team's** (P-335, P-357) |
| **E. Platform foundation** | SA-2, SA-3, SA-4, SA-6 to SA-12 | 510 | simulated users only | **Team's**, and largely in ER v2 code (`auth` 737 files, `billing` 609, `firm` 413, `authz`, `entitlements`, `governance`, `platform-flag` …) |

### 1.4 Capabilities still to build: estimate, method, error band

**Method (calibrated on our own work, not on opinion).** One of our capability rows is a qa-tested user ability. To convert the team's units into ours, I use the one module traced card by card: in SA-01B, **81 of our capabilities** cover **20 cards fully and 92 partly**. Counting a "partly" card as half done gives **66 card-equivalents** (band 48-84 if "partly" means 30-70% done), so **1.23 of our capabilities per card** (band 0.96-1.69). The whole spec is ~1,800 card-equivalents (2,253 requirements × 0.8; band 1,350-2,140 for 0.6-0.95 cards per requirement).

| Scope | Requirements | Card-equivalents (×0.8) | Our capabilities at 1.23 per card | Band | Done (Works) | **Still to build** |
|---|---|---|---|---|---|---|
| A + B (ours: configurator + case delivery) | 809 | ~650 | ~800 | 470 to 1,370 | ~94 (partly covering ~70-110 card-equivalents) | **~700** (band 380-1,280) |
| C (front office, not started) | 692 | ~550 | ~680 | 400 to 1,110 | ~0 | **~680** (band 400-1,110) |
| **A + B + C** | 1,501 | ~1,200 | ~1,480 | 870 to 2,480 | ~94 | **~1,400** (band ~800-2,400) |
| D + E (team's; largely in ER v2) | 752 | ~600 | not ours to build | | ER v2 code | merge, not build |

**H-1: "The product is 500-600 capabilities."** Not supported by the spec counts: 500-600 sits below the band unless one capability equals 2-3 of the team's cards. **Test that settles it (2 hours, read-only, Sonnet, US$0):** take three modules of different kinds (AG-4 booking, AG-9 documents, AG-6 billing), group their cards into capability rows the way qa writes them (one user ability, one pack), count, and recompute the ratio. If the ratio is ≥2.5 cards per capability, the founder's figure stands; if near 1, the ~1,400 estimate does.

**H-2: "Group C is ours to build."** Unconfirmed. ER v2's frontend has screens for CRM, booking, e-sign, invoicing and tasks (some on mocks); whose backend builds them after the merge (P-450) is a product decision (section 6, D1).

---

## 2. Root cause of our current speed (measured, ranked by cost)

### In plain words
Building is not the slow part, and machines are not short. The time goes to **builders tripping over each other in the same few files**, to **waiting between steps** (approved but not labelled, labelled but queued), and to **doing a capability several times** because gaps show up only after it merges. Under all three sits one design fact: the app is a single box where most changes touch the same central files, so more lanes mean more collisions, not more output.

### 2.1 The sample
**301 app PRs** merged 2-12 Nov IST (GitHub `merged_at`; files from `git diff H^1 H` of each merge on `main`). Same classification as the Lead's `merged-prs-by-files-2026-11-02-to-12.tsv`: on the 612 PRs in both lists, app/non-app agrees on all but one. Of all 657 merges in the window, 301 are app (46%); 212 records or docs, 81 tests only, 63 tooling.

### 2.2 Flow today (app PRs only)

| Measure | Value | Sample |
|---|---|---|
| App PRs merged per day | **28.1** (1.17/h); by day 65, 58, 31, 23, 12, 25, 16, 25, 9, 18, 19 (2-12 Nov) | 301 app PRs |
| Opened → merged | median **3.25 h**, p75 6.8, p90 12.3; mean 6.3 | 301 |
| Work in progress (Little's law, L = λW) | **7.3** app PRs open at once on average | 257 h window |
| App lines changed per PR | median 100, p90 505; 11 over 800 | app folders only |
| Capabilities reaching Works for the first time | 55 in 10 days (2-11 Nov), **5.5/day**, median 4 | `qa/CAPABILITIES.md` history on `main` |
| Works → lower (re-opened) | 39 (2-12 Nov), 15 and 11 of them on 3-4 Nov (Opus re-proof, P-432) | same |
| App PRs per first-time Works | ~5.5 (301 / 55); all history 388 app PRs / 94 Works = 4.1 (a floor: 19 rows reached Works on 25 Oct before PRs) | |

### 2.3 Causes, ranked by measured cost

| # | Cause | Measured cost | Sample, method | Mechanism |
|---|---|---|---|---|
| 1 | **Rework after merge (the Partial loop)** | ~5.5 app PRs per first-time Works; 39 Works→lower moves; each costs a PR cycle (mean 6.3 h) plus a qa walk: **~250 PR-hours** at one cycle per re-open | `works_per_day.py`; P-501 restates builder PRs per row at 6.5 (title-based) | a capability's gaps are found by qa after merge; the fix is a new PR through every gate. Part is deliberate (3-4 Nov Opus re-proof) |
| 2 | **Real merge conflicts on shared files** | **86 of 301 app PRs (29%)** had ≥1 conflicted merge of `main`; 145 conflicted merges. Size-matched, a conflicted PR took 4.9 h vs 2.1 h (<200 lines), 9.2 vs 3.3 h (200-500), 7.4 vs 5.3 h (500-1,000); all 6 PRs over 1,000 lines conflicted (median 52 h). **≈300 PR-hours** extra | `conflicts_from_git.py`: every merge commit inside a PR branch is re-merged with `git merge-tree`; exit 1 = a real textual conflict. Floor: rebases and Mergify conflict dequeues are not seen | 66 app files had conflicts; **the top 7 hold 39%**: `api/src/demo.ts` 16, `case-prepare.ts` 12, `runtime.ts` 9, `schema.prisma` 9, `engine/runtime/case.ts` 8, `questionnaire.tsx` 7, `main.ts` 7. Two are **central lists** every feature adds to (`demo.ts`, `main.ts`), exactly ER v2's finding |
| 3 | **Waiting between Approve and label** | median 0.72 h, p75 3.45, p90 7.3; **271 PR-hours beyond a 1-hour CI floor**; 34 of 131 PRs waited over 3 h | 131 app PRs with both a `Reviewer: Approve` comment and a `review: approved` label (the other 170 predate the label guard or used another format) | after Approve the lane must see green CI and label; a cloud lane that has gone quiet, a baton rule ("one unlabelled baton PR at a time", P-481), or a Lead read (migrations, money, P-423) holds it. Which one dominates is **H-3** (below) |
| 4 | **Chasing `main` without a conflict** | 62 app PRs merged `main` 96 times with **no** conflict; a small one took 3.1 h vs 2.1 h clean. Each merge drops the label (label guard) and buys a new review and a ~40-50 min CI run: **~60 PR-hours** | same replay | P-270 says merge `main` only on a conflict; the rule is not checked by any tool |
| 5 | **Queue wait after the label** | median 1.06 h (p90 2.5) against a 42-min batch run (P-489): **109 PR-hours** beyond a 0.7 h floor | last label → merged, 131 PRs | batches (avg 1.6 PRs), dequeues, records merges resetting the queue (55 resets by 9 Nov, earlier study) |
| 6 | **The Lead relays by hand; lanes cannot dispatch CI or message back** | lane asks for a `nightly.yml` dispatch → next dispatch: median **0.64 h**, p90 **15.3 h** (62 asks); recorded idles: a qa lane 3.4 h with 7 PRs unscored (P-420), four approved green PRs 2-3.5 h (P-439), 8 PRs Ready 7.4 h on an unattended prompt (7 Nov) | comment text match ("dispatch"/"nightly.yml" with a request word) to the next `workflow_dispatch` run; heuristic, so a rough measure | cloud lanes get HTTP 403 on Actions (P-439) and cannot message a session (one-way); only the Lead can dispatch, steer and start |
| 7 | **Session starts need the founder's typed turn** | app PRs **opened** 01-06 IST: **24** over 11 nights vs **109** in 12-17 IST (4.5×); merges keep flowing at night (68 vs 93), so the queue is not what stops | 301 app PRs by IST hour of `created_at` | sessions start only in a founder-typed turn (P-348 (5)); P-489 records "that cost hours on 11-12 Nov". **H-4:** the night gap is mostly unstarted lanes, not idle ones. Test: compare night opens on nights with ≥3 warm spare lanes (P-489 (5)) against nights without |
| 8 | **Capacity events** | 4 Nov cloud outage ~13 h (20 of 20 lanes); account switches 5, 6, 9 Nov; the 93% weekly stop 9 Nov | recorded (memory, DECISIONS), not re-measured | the 9 Nov challenge found these, not the pipeline, behind the fall from 80-97 builder merges a day to 20-36 |

PR-hours overlap (a PR can wait and conflict), so the rows are not added up. They rank which cost is biggest.

### 2.4 The root cause under 1, 2, 4 and part of 3: one box, cross-cutting changes

**Measured:** I mapped every app file to 12 proposed modules (`module-map.tsv`, section 3) and counted the modules each app PR touched. Only **83 of 301 (28%)** stayed in one module (hub files `studio.ts`, `validate.ts`, `render.ts`, `main.ts`, `core.ts`, `App.tsx` excluded); 130 touched 3 or more. At a coarser cut (configurator / case delivery / platform) **154 (51%)** stayed in one; **96 (32%)** touched both configurator and case delivery. Hub files: `studio.ts` in 39 app PRs, `validate.ts` 28, `render.ts` 20, `main.ts` 19.

**Why (5 whys, each step from the data):**
1. Why do PRs collide? They edit the same files (top 7 = 39% of conflict hits).
2. Why the same files? Central lists (`main.ts` routes, `demo.ts` sample data) and grab-bag services (`studio.ts` "programs and combinations, the shared library, configuration, previews, validation, review and release" in one file, 1,284 lines).
3. Why grab-bags? No module boundary exists: one `@Module`, one folder, no lint, so the nearest file is the easiest place to add code.
4. Why does a capability touch configurator and runtime together? The runtime reads configuration directly, not through a stable released-pack contract; a new rule needs both an authoring change and a runtime change. (DDD calls the missing piece a **Published Language** between two contexts.)
5. Why was it never fixed? The prototype was sized for one or two builders (P-438 kept one repository and deferred splits to "after the 26"); nobody set a file-size or boundary rule, and the per-file splits were planned one at a time, without a target map.

**What is not the cause (measured):** runner capacity (wait median 0, 316 jobs, P-489); PR size alone (median 100 lines; small PRs still conflict, 34 of 204 under 200 lines); the queue run itself (42 min).

**H-3: "Approve → label waits are mostly lanes gone quiet after Approve."** Test: for the 34 waits over 3 h, read whether the lane pushed or commented in the gap (lane awake) and whether a baton or Lead read was pending (from STATE history). Cheap, read-only, one Sonnet pass.
