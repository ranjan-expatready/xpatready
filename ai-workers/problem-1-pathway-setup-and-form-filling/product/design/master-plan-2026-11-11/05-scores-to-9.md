# 05 · Scores to 9-10: every audit dimension, the rows that move it, the measured exit

Master analysis, part 5 of 8 (A19 (f); P-460). Read-only, on `origin/main` fbfb263c7 (11 Nov).

**Sources:**
- The hand-over audit page (branch `claude/handover-page-2026-11-10`, `product/design/handover-2026-11-10/pathway-configurator-handover.html`, section "How configurable, flexible and scalable is it?" and appendix E). It scores **three** dimensions; its own words: "Scores are a judgement backed by the evidence below, not a measurement", and "Tenancy and hosting are left out of the scores on purpose: they belong to the team platform".
- The other scored audit on record: the independent Opus code read of 5 Nov in P-358 (design 4/10, safe to change 4/10, readability 3/10, rule logic 6/10).
- The page's "Not yet proven" list (P-460).
- UX scores belong to the UX lane (`design/ux-2026-11-11/`, part 6).

**P-460's target is 8. The founder now asks for 9-10 (A19).** Below, 8 is P-460's step, and 9 and 10 are the founder's ask. **The change this file proposes:** each score is pinned to measured numbers, so a re-score is a count, not an opinion. The re-scorer is a fresh Fable or Opus reader that did not build the work (P-455 (5), P-303). It scores at each milestone's end against the rubric below and cites the numbers.

## 1. Summary

| Dimension | Today | After the Bake (forecast) | 8 needs | 9-10 needs | Milestone |
|---|---|---|---|---|---|
| **Configurable** | 6 | 7 | M4 Track A (seven tables on screens) | screens-only set-up of an unseen pathway; content-freshness loop | M4 (8-9), M5 (10) |
| **Flexible** | 5 (re-measured 6) | 7 | relatives, repeating groups, no fixed family shape | all six to ready-to-file; routes and linked cases; an unseen shape by data | M4 (8-9), M4/M5 (10) |
| **Scalable** | 5 | 5 | durable queue, storage, cache, indexes, the 1,000-case run | concurrency, 10,000 cases, restore drill, soak with alerts | M5 |
| **Design (code)** | 4 (5 Nov; re-measured 4) | 5 | break the 3 folder-level cycles, split the busiest files | one-way module graph, services behind contracts | Bake outside the caps (B165) + M5 |
| **Safe to change** | 4 (5 Nov; re-measured 5) | 5-6 | lint + format in CI, coverage per PR (types and an `any` ratchet are already in CI) | coverage floor per module, mutation spot-checks | M5 |
| **Readability** | 3 (5 Nov; re-measured 3) | 4 | formatter; file size ≤800 lines; `any` 419 → ≤100 | naming and module docs checked by a reader | M5 |
| **Rule logic** | 6 (5 Nov; re-measured 6: 0 of 4 defects closed, 1 partly) | 7 | B112's four defects closed; per-rule pass and fail tests | rules as data with answer keys signed | Bake + M4 |
| **Proven (P-460 "not yet proven")** | 1 of 5 | 2 of 5 | expert answer keys; Validate on every Paper form | load test passed; counsel's word on the extension | A7, M4, M5, team |

The Bake does not reach 8 on any dimension, by decision: P-447/P-448 keep it lean, and Scalable is named for the next milestone (P-460). **9-10 is a two-milestone target (M4 + M5)**, not a Bake target.

## 2. Per dimension: rubric, rows, exit

### Configurable: 6 → 8 → 9-10

**Held back by (page):** "Seven rule tables live in files, outside screens and releases: fees, box gates, script requirements, form roles, own yes/no wording, fact expiry, fill-trial status" (`samples/fee-table.json`, `form-field-gates.json`, `form-script-requirements.json`, `form-roles.json`, `own-yes-no.json`, `fact-expiry-rules.json`, `fill-trials.json`), and "A form set-up table is written in code" (`FORM_SETUP`).

| Score | Measured condition | Rows |
|---|---|---|
| 7 | Form rules in data (**done: BK-10 #1518**); fill-trial status is a released attribute (BK-11); sample case is a setting (BK-12) | Bake |
| 8 | **Rule tables outside screens: 7 → 0.** Each table is edited on a library screen, frozen into the hashed release, and has two-person control | M4 Track A (seven rows, one per table) |
| 9 | **Repository edits to set up a new pathway to filled forms: 5-8 (page's acid test) → 0**, shown twice: Study permit (BK-13 proves data-only; M4 proves screens-only) and one pathway never set up before (e.g. Super visa, which is in `programs.json` but not among the six), by a content publisher on screens, with a recorded walk and an empty `git diff` | M4 Track A exit (P-449) |
| 10 | Content stays right over time: correction vs rule-change publish, "in force from" with its source, change watch (SA-1B-297, 298-300; gap G4 in part 3); **≥1 answer key signed by the immigration expert** | M5 + A7 |

### Flexible: 5 → 8 → 9-10

**Held back by (page):** "Visitor-visa-only guards on the case side" (`engine/filing-modes.ts:31-37`, `engine/runtime/filings.ts`, `engine/runtime/case-checklist.ts`), and "A fixed family shape; the representative form IMM 5476 has built-in logic."

| Score | Measured condition | Rows |
|---|---|---|
| 6 | **B164 allow-list: 12 entries today** (`tests/check_b164_no_engine_keys.ts:31-44`). Done so far: B164 #1501, M3-S1 #1505, M3-S2 #1513, M3-S5 #1507 | done |
| 7 | **Allow-list → 1 entry** (reader content only): M3-S3, M3-S4 (2 entries), BK-8 (1), BK-12 (7), BK-14 (1). **Exit (b) passes**: Study permit reaches filled, checked forms with data changes only (BK-13) | Bake |
| 8 | **Family shape configurable:** relatives and repeating groups from the library; representative form as a library flag (page: Medium, Small) | M4 Track A |
| 9 | **Combinations reaching "ready to file" (Sample): 1 → 6** (part 4's grid all "works" except Validate, which is Proven's); "upgrade" U1 generalised (routes as data, repeatable stages) | M4 |
| 10 | A pathway with a **shape not yet seen** (the employer's LMIA `lm.high_wage`, or a multi-stage PNP → PR route) by data only; linked case U2 | M4 (if the founder places it) |

### Scalable: 5 → 8 → 9-10

**Held back by (page):** "One Python process per form with a 180-second limit; an in-memory queue; files on local disk" (`api/src/fill.ts:64`; `api/src/fill-case.ts:57`, `:167-175`, `:362`; `api/src/core.ts:27-28`), and "No cache for a release snapshot; some database indexes missing; the engine reaches the database directly; no load test" (`engine/snapshot.ts:92`). Also QA-278 (Major): 48 case opens at once give 25 × 500.

| Score | Measured condition | Rows |
|---|---|---|
| 6 | QA-278 fixed: **48 concurrent opens → 0 errors** | Bake row 33 (outside the caps) |
| 7 | **Fill jobs survive a restart** (a durable queue in PostgreSQL, the database already in use, so no new technology under STANDARDS §1); a bounded PDF worker pool; PDFs behind a storage interface (local disk adapter now, object store later through the gate) | M5 |
| 8 | **Measured run: 1,000 cases and 5,000 boxes** on the checkpoint data; p95 300 ms reads and 600 ms writes (budgets from the "not built" release gate, `reports/verify-2026-11-03/V1-completeness.md:316`); 0 5xx; snapshot cache and missing indexes added; the engine reads through an interface, not the database | M5 (P-460's named exit) |
| 9 | **10,000 cases**; fill throughput stated (forms per minute at N workers); **backup and restore drill** timed (restore < 30 min) | M5 |
| 10 | The run is a nightly soak with a trend line and a failing check on a broken budget (part 8, M10); two API processes on one database lose no jobs | M5 |

### Code quality (P-358's independent read, 5 Nov): design 4, safe to change 4, readability 3, rule logic 6

**Re-measured on 11 Nov by a fresh reader: `05a-scores-measured-2026-11-11.md`.** Its numbers replace the first draft's here. The proxies on main today:
- **no linter or formatter** in the studio or in `ci.yml` (no config file; B112's "lint runs in CI on every PR" is not done);
- **419 `any`** by grep in `api/src`, `engine` and `web/src`; CI already has an `any` ratchet (`count-any.mjs --against`, `ci.yml:272`, baseline 433);
- files over 900 lines: `schema.prisma` 2,857, `studio.ts` 1,262, `questionnaire.tsx` 1,044, `proposals.ts` 1,035, `sources.ts` 996, `runtime.ts` 967, `finder.ts` 952, `case-prepare.ts` 952;
- **3 folder-level import cycles**: `engine` root ⇄ `engine/runtime`, `api/src` root ⇄ `features/*`, and `web/src` root ⇄ `components` ⇄ `pages` ⇄ `runtime`; web imports 10 non-contract files. The first draft said 2; the reader's script also parses `@/` imports;

| Dimension | 8 needs (measured) | 9-10 needs (measured) | Rows |
|---|---|---|---|
| Design 4 | 0 import cycles between module groups; no file over 800 lines except the schema (or the schema split by model group through the gate); the case-preparing code split per capability | services behind `contracts` only (web already is); a module map in the repository that CI checks | B165 (Bake outside the caps; make "break the cycles" its first goal), M5 shared services |
| Safe to change 4 (now 5) | lint + format in CI on every PR (B112 remainder; types are already in CI with 16 known errors); coverage printed per module per PR with the `c8` already installed (the last figure is by hand, 28 Oct: api 97.21% lines, engine 99.38%) | coverage floor per engine module (≥85% lines on `engine/`), a weekly mutation spot-check on rule code | M5 pipeline rows |
| Readability 3 | formatter applied once (one PR, no behaviour change); `any` 419 → ≤100 through the existing ratchet (lower its baseline per PR) | ≤20 `any`; module README per engine folder; a fresh reader scores ≥9 | M5 |
| Rule logic 6 | B112's four confirmed defects each with a fail test and fixed (today: approval not atomic `api/src/screen02.ts:134-141`; implication by substring `engine/validate.ts:274`; REQUIRE differs `engine/render.ts:266-272` vs `engine/runtime/case.ts:414`; fill route has an identity check but no duty check, `api/src/main.ts:128`); `npm audit --omit=dev` 0 high (not measured: no audit step in CI) | every rule table has pass and fail tests generated from its rows; answer keys signed | Bake (check B112's status in part 2), M4 |

### Proven (P-460, "Not yet proven"): 1 of 5 today

| Item | Today | Exit | Owner |
|---|---|---|---|
| Content confirmed by the immigration expert | no answer key signed; every release is a "Demo release" (C5.5, C5.6) | Visitor visa answer key signed, then Study permit (expert pack #1510 ready) | **founder books (A7)** |
| Adobe Validate on a complete app-filled form | 1 Paper form (IMM 5257, finished story; C7.2 Partial) | every Paper form the six use: Validate + read-back equal, recorded per field-map version | M4 (fill trials, P-460) |
| A full case on more than Visitor visa | 1 of 6 | 6 of 6 to ready to file (Sample) | Bake (Study permit) + M4 |
| Load test | none | the 1,000-case run (Scalable 8) | M5 |
| Legal (portal extension terms, filing terms) | "Unconfirmed: no counsel" | counsel's written answer | founder / team (outside the build) |

## 3. What to do now (no new rows inside the Bake)

1. **Adopt this rubric** as the re-score sheet. P-460 already says every milestone plan lists the scores. Add "with the measured numbers above", and name the re-scorer: a fresh reader, Fable for planning reads (P-455 (5)).
2. **Done 11 Nov (Lead 16's word):** a fresh Fable reader re-measured all seven scores: Design 4, Safe to change 5, Readability 3, Rule logic 6, Configurable 6, Flexible 6, Scalable 5 (`05a-scores-measured-2026-11-11.md`). **B112's four rule defects are still open (0 of 4 closed, 1 partly).** They are small, so they are proposed as a Bake-outside-the-caps row now (Rule logic 6 → 7 at ~1-2 sessions).
3. **Give B165 a design goal, not only a size goal:** break the three import cycles first (part 3 §3b; 05a). It stays outside the caps.
4. **Ask the founder one question** (through the Lead): is 9-10 the target **after M5**, with 8 after M4 as P-460 says? Recommendation: yes. Reaching 9-10 on Scalable and on the code scores needs M5's rows, and neither the Bake nor M4 alone can show it with numbers.

## Question for the tech lead (posted on the PR)

**Pin the scores to numbers before the next re-score.** The page itself says its scores are "a judgement … not a measurement". The rubric in §2 gives each step a count:
- rule tables outside screens 7 → 0;
- repository edits per new pathway 5-8 → 0;
- B164 allow-list 12 → 1;
- combinations ready to file 1 → 6;
- the 1,000-case run with p95 budgets;
- cycles 3 → 0;
- lint in CI;
- the `any` ratchet.

*Recommend:* record it as the scoring sheet under P-460. Have a fresh reader re-measure the four 5 Nov code scores once now (~1 session, read-only, beside the Bake). Ask the founder whether 9-10 means "after M5" (recommended).
