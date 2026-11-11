# 07 · M4 and every milestone before the Chrome extension: counted lists, exit tests, shared services first

Master analysis, part 7 of 8 (A19 (d), (j); P-450, P-460). Read-only. **A proposal for the Lead and the founder, not a decision.** Sizes are builder sessions, loosely held until each row has its design.

**Built from:**
- P-245, P-258, P-447 to P-462;
- the after-29 plan (branch `claude/handover-page-2026-11-10`, §11 "The gap list");
- the hand-over audit's lift plan;
- B108's scale design (#1086);
- B170's XFA analysis (#1527);
- parts 1-5 and 8 of this folder.

## 1. The milestones, in one table

| Milestone | Purpose in one line | Outcome a person can see | Exit (measured) | Sessions |
|---|---|---|---|---|
| **Bake (M3.5)**, running | What works feels like one product, and a second pathway runs on data alone | the walk without logins or dead ends; Study permit filled with no code change | E1-E4 (Bake plan §4) | 40 + 16-17 outside the caps |
| **M4: any pathway by set-up, proven** | A content publisher sets up a pathway on screens alone, and every form the six use is proven to fill | Study permit **and a pathway never set up before** reach filled, Validate-passed forms with **zero repository edits**; all six combinations at "ready to file" (Sample) | M4-E1 to M4-E5 below | ~50-65 |
| **M5: production running** | The internal tool runs like production: survives load, restarts and mistakes; problems show the moment they happen; screens at 9-10 | the 1,000-case run inside its budgets; a restore drill; a red check before anyone notices; journey screens scored ≥9 | M5-E1 to M5-E6 below | ~45-60 |
| **M6: the Chrome extension** (P-245, P-450: after these) | The representative fills portal-only forms screen by screen, checking each | "Fill this screen" on IMM 0008, 5669, 5406, 5562 with the representative's check before Next | E1-E6 rows (BACKLOG L5); counsel's word on the portal terms first | ~15-25 (hand-over: 10-15 days) |

**Why M4 and M5 are split this way:**
- M4 is everything that makes the product **general and proven**: Configurable and Flexible to 8-9, fill trials on every form (P-460).
- M5 is everything that makes it **run** (Scalable to 8-10, monitoring, code scores) and **feel** best-in-class (the UX lane's plan).
- They can overlap: the M5 lanes that touch no baton (monitoring, lint, UX polish) start as soon as their shared service exists.
- **The order matters for one reason:** M4's fill trials on every form run hundreds of fills, so the durable fill job service (S2 below) must exist first. M5 then scales it.

## 2. Shared services: build these first (they serve M4, M5 and the extension)

P-258 named four shared services. On main: **SH2 where-used is done** (`where-used.ts`, #504 era) and **SH3 resolver contract is done** (`contracts/resolver.ts`, commit 11b4637d1). **SH1** (merge the condition helpers) and **SH4** (release and pin-per-filing contract) have no build commit on main. The founder's ask (A19 (j)) is to build the shared services first. Proposed set, each with one owning area, a contract in `contracts/` with contract tests, and callers that never copy it (P-258):

| # | Shared service | Serves | What it replaces today (evidence) | Exit | Sessions | Baton |
|---|---|---|---|---|---|---|
| **S1** | **Library rule-table service**: one generic, versioned table with rows carrying source (page, quote, date, P-170), two-person approval, frozen into the release hash; the seven tables become instances | M4 Track A (all seven screens), M5 content freshness, extension (fees and roles read through it) | seven JSON files in `samples/` read by hand-written loaders | contract + one table (fees) moved; the other six are data migrations with no new code path | 3 | **schema** |
| **S2** | **Fill job service**: durable queue in PostgreSQL (no new technology), a bounded worker pool for the PDF process, a storage interface (local-disk adapter now), job status and retry | M4 fill trials, M5 Scalable, extension (no), QA-275, QA-278 | in-memory one-at-a-time queue `api/src/fill-case.ts:167-175, :362`; one process per form `api/src/fill.ts:64`; local disk `api/src/core.ts:27-28` | a restart mid-batch loses no job; 2 fills in the same minute keep 2 files (QA-275); 50 queued fills finish with N workers | 3 | none (migration for the job table: schema, short) |
| **S3** | **Filing values service**: per filing, per form, the ordered field values with the field-map version and their facts' sources; one contract read by the PDF filler, the online answer sheet (C7.3, M3-S5) and later the extension | M4 (fill trials record `map_version`), M6 extension (E3 fill), B170 adapter | values computed inside `api/src/case-prepare.ts` and the answer-sheet code separately | the PDF fill and the answer sheet read the same contract; a test proves equal values | 2 | **case-prepare** |
| **S4** | **Release and pin contract** (SH4, open) | every M4 table freezes into a release; C9.5 newer rules; routes (U1) | pins in four or more files (P-258) | one contract; callers use it; packs unchanged | 2 | schema (read) |
| **S5** | **Condition helpers merged** (SH1, open) | M4 relatives and repeating groups; QA-237/239's family | `fieldsOf` ×5, `engine/validate.ts` + `engine/eligibility-gates.ts` | one helper each, tests unchanged | 1 | none |
| **S6** | **Proof record service**: per form × map version, the fill trial, Adobe Validate result, read-back and barcode check (B170b/B170c use the team's engine as a check, not a writer) | M4 fill trials (M4-E2), release attribute (BK-11 builds on it), M5 | `samples/fill-trials.json` (`map_version` null), `samples/validated-imm5257-paper.json` | every proof row names its map version; the release shows a form's proof | 2 | none |
| **S7** | **Health, request log, browser errors** (part 8 M1-M3) | M4 and M5 lanes see their breakage at once; the founder's demo | `GET session` as health; error/warn logs only | part 8's exits for M1-M3 | 2.5 | none |
| | **Total** | | | | **~15.5** | |

**Start now, beside the Bake:** S7 (no baton; pipeline lane) and S5 (no baton). Also write the **S1, S3 and S4 contracts** as concept documents (no code) so they are agreed when the schema baton frees. S2 can start after QA-275's Bake fix lands, to avoid a clash on `fill-case.ts`.

## 3. M4: any pathway by set-up, proven (counted list)

| # | Row | Area | What changes for the user | Sessions | Depends on | Source |
|---|---|---|---|---|---|---|
| 1-7 | S1-S7 shared services (above) | runtime / forms / pipeline | — | 15.5 | Bake's baton rows done | P-258; A19 (j) |
| 8 | **A1 Fees on a library screen** | screens | a publisher enters fees with source and date; frozen in the release | 1 | S1 | P-448, P-460 |
| 9 | **A2 Box gates (form-field gates)** | screens | which boxes a form fills, by condition, set on screens | 1-2 | S1 | page lift plan |
| 10 | **A3 Script requirements** | screens | a form's own script rules (mandatory boxes, country codes) set on screens | 1-2 | S1 | QA-165's cause |
| 11 | **A4 Form roles** | screens | who fills which form (each person, family, sponsor) set on screens | 1 | S1 | QA-221 ruling |
| 12 | **A5 Own Yes/No wording** | screens | QA-234's "ask a form box as its own question" wording as a table | 1 | S1, QA-234 | B83 |
| 13 | **A6 Fact expiry rules** | screens | how old a document or fact may be, set on screens | 1 | S1 | SA-1B-153/155 (gap G1) |
| 14 | **A7 Fill-trial status** (screen over S6) | screens | a release shows each form's proof | 1 | S6, BK-11 | P-460 |
| 15 | **A8 Relatives and repeating groups** | runtime + screens | a pathway names its people (sponsor, applicant, parents …) and repeating lists | 2-3 | S5, S4 | page: Medium |
| 16 | **A9 Representative form as a library flag** | forms | IMM 5476's built-in logic becomes a flag | 1 | S1 | page: Small |
| 17 | **A10 Who files what, as a pathway setting** | runtime | `engine/filing-modes.ts:31-37`'s visitor-visa knowledge becomes data | 1-2 | Bake M3-S1/S2 | after-29 §11 B |
| 18 | **A11 Set-up from the six** | screens | P-456: start a new pathway from one of the six | 1-2 | rows 8-16 | P-456 |
| 19 | **U1 Routes as data, repeatable stages, "Start next stage" in Needs you** | runtime + screens | "upgrade a case" (part 4 U1) for any route | 2-3 | S4; founder's answer | AG-07 `:2133`; C6.17 |
| 20 | **U2 Linked case, Change stream** | runtime + screens | a follow-on case joined to the earlier one | 2-3 | U1; founder's answer | AG-07 `:346`, `:358` |
| 21-24 | **Content for four pathways** (`wp.lmia_inside`, `pnp.express_entry`, `fs.spouse`, and one never set up, e.g. Super visa): fees, documents, form rules, maps, cited from canada.ca with page, quote and date, labelled Sample | forms (data) | each reaches "ready to file" (Sample) | 3-5 each, 12-20 | rows 8-18 | after-29 step 10 |
| 25 | **F1 Fill-trial runner on the app's own maps** | evidence | trials record `map_version`; re-run on a map change | 1-2 | S2, S6 | after-29 step 11 |
| 26 | **F2 Fill trial + Adobe Validate on every Paper form the six use** (19 mapped, 13 with no trial) | evidence + **a person on the Mac** (15-30 min per form) | each form proven, recorded per map version | 5-8 | F1 | P-460 |
| 27 | **QA-383 and other fill Majors left after the Bake** | forms | — | 1-3 | — | `qa/BUGS.md` |
| 28 | **T1 re-trace SA-01B v2.1** (part 3), closed: every card placed | analyst (read-only) | — | 1 | — | P-450 |
| 29 | **M4 walk + zero-code test** (M4-E1) | qa | — | 1-2 | all | P-449 |
| | **M4 total** | | | **~50-65** | | |

**M4 exit tests:**
* **M4-E1, screens only (P-449's Track A exit).** From M4's tag: a content publisher sets up Study permit **and** one pathway never set up before, on the screens alone, releases them through both gates, opens a family case, answers, reviews, reaches filled forms. **Pass:** `git diff --stat <tag>` is empty; the walk is recorded; 0 help.
* **M4-E2, every form proven.** Every Paper form the six use has a fill trial on its current map version, Adobe Validate passed, and a read-back equal to the facts (S6 records). **Pass:** proof rows = Paper forms used; 0 "no trial".
* **M4-E3, the six (or five) ready to file (Sample).** Part 4's grid reads "works" in every cell except where the founder has placed a combination outside M4 (the employer's LMIA, question 1).
* **M4-E4, scores.** A fresh reader scores against part 5's rubric: **Configurable ≥8 (9 with E1), Flexible ≥8**.
* **M4-E5, 0 open Majors** on M4's capabilities (Gate B, P-317).

**Not buyable with sessions:** signed answer keys (the expert, A7) and Adobe runs need a person; counsel. Without the expert, M4 ends with every release still a "Demo release" (C5.5, C5.6). That is honest, and acceptable for internal use on sample data (P-455 (3)).

## 4. M5: production running (counted list)

| # | Row | Area | Sessions | Exit | Source |
|---|---|---|---|---|---|
| 1 | Snapshot cache + missing indexes; the engine reads through an interface, not the database | runtime | 2-3 | p95 budgets met on the checkpoint | page lift plan |
| 2 | Storage interface → object store adapter (through the STANDARDS §1 gate) | runtime | 1-2 | PDFs survive a copy move | page |
| 3 | **The 1,000-case run** (1,000 cases, 5,000 boxes), then 10,000; fixes it forces | runtime + qa | 3-5 | p95 300 ms reads / 600 ms writes, 0 5xx (Scalable 8; 9 at 10,000) | P-460 named exit |
| 4 | Backup and restore drill | pipeline | 1-2 | restore < 30 min, timed | after-29 §11 C |
| 5 | Monitoring M4-M10 (part 8; M1-M3 are S7) | pipeline | 4-5 | part 8's exits | A19 (j) |
| 6 | Lint + formatter in CI, `any` ratchet, coverage per module (B112 remainder) | pipeline | 2-3 | lint 0 errors on every PR; `any` ≤100 | P-358 |
| 7 | B165 splits with the three import cycles broken first (if not done in the Bake's outside rows) | runtime | 3-5 | 0 cycles; no file >800 lines but the schema | P-438 (3) |
| 8 | Internal workspace walkable (name on sign-in, no demo controls, "copy the client's link") and sign-in page | screens | 3 | qa walk passes | after-29 1e, 1c+, 1d+ |
| 9 | **UX to 9-10:** the UX lane's plan (`design/ux-2026-11-11/`): polish, wording cuts, proof on screen | screens | per that plan (after-29 estimated 20-24) | journey screens ≥9 on the journey-test score | A19 (h) |
| 10 | Content freshness loop: correction vs rule-change publish, "in force from", change watch (gap G4) | runtime + screens | 3-5 | a rule-change publish dates its effect and cites its source | SA-1B-297-300 |
| 11 | Off-journey Majors and the Minor triage (165 Minors: fix, merge into rows, or drop proposed) | any | 3-5 | 0 Majors; every Minor placed | `qa/BUGS.md` |
| 12 | B108's factory items that the 1,000 scale needs (per-batch test selection, generated indexes) | pipeline | 2-4 | CI wall time per batch ≤35 min at 10 lanes | #1086 |
| | **M5 total** | | **~45-60** (UX row sized by its lane) | | |

**M5 exit tests:**
* **M5-E1:** the 10,000-case run inside budgets, nightly (Scalable 9).
* **M5-E2:** restore drill passed.
* **M5-E3:** part 8's M1-M10 live; a forced fault shows at the next check.
* **M5-E4:** code scores re-measured ≥8 (part 5).
* **M5-E5:** the UX lane's journey scores ≥9.
* **M5-E6:** 0 open Majors; every Minor placed.

## 5. Sequence and parallel lanes (about 10 lanes, batons respected)

| Lane | During the Bake's tail (now → Bake exit) | M4 | M5 |
|---|---|---|---|
| **Runtime, schema holder** | Bake baton rows (M3-S3, M3-S4) | S1 → S4 → A8 → A10 → U1 → U2 | cache and indexes → 1,000-case fixes |
| **Runtime, case-prepare holder** | BK-8 → QA-165/318 → QA-315 | S3 → content fixes that touch case preparation | B165 split of `case-prepare.ts` (last) |
| **Runtime, no baton** | QA-355 if still red | S2 (after QA-275) → S5 | storage, backup |
| **Screens ×2** | BK-3 → BK-4 → BK-5 | A1-A7 tables in parallel (after S1), A11 | internal workspace; UX plan rows |
| **Forms / content ×2** | QA-237/239, BK-11, BK-13 | content for four pathways (rows 21-24), A9 | content freshness loop |
| **Evidence** | B170 adoption rows | S6 → F1 → F2 (with the person at the Mac) | — |
| **Pipeline** | S7 (health, logs, browser errors), SHARDS 8, M5 runner-wait | M4-M6 monitoring rows, T2 | lint, coverage, B108 items |
| **qa** | retests, walk 1, the co-founder's walk | Track A walks per table; M4-E1 | the 1,000-case run's verification; M5 exits |
| **Analyst (read-only)** | T1 re-trace v2.1 | score re-measure (part 5) | — |

**Critical path to M4-E1:** S1 (3, schema) → A1-A7 (parallel, ~2) → A11 → content for the unseen pathway (3-5) → walk. About **8-12 sessions in series ≈ 2.5-4 days** with lanes running continuously. **Critical path to M4-E2:** S2 → S6 → F1 → F2. F2 is bounded by **a person's Adobe time: 19 forms × 15-30 min = 5-10 hours**. Book it.

## 6. Honest forecast

* **"Complete M4 in ~8 hours" (A19 (d)) is not possible.** The schema chain alone is ~4-6 sessions in series, F2 needs a person's 5-10 hours of Adobe checks, and M4 starts when the Bake's baton rows have merged. What 8 hours can buy now: S7 and S5 built, the S1/S3/S4 contracts written and agreed, T1's re-trace done, and the content research for one pathway (citations only). All of them are off the Bake's batons.
* **With ~10 lanes, no budget cap (P-461, P-462) and lanes running continuously:**
  * Bake rows done and the full walk ~13-14 Nov IST (P-472), the co-founder's walk within 24 h after (P-455 (4));
  * **M4 ~20-24 Nov**: the schema chain, the person's Adobe time, and review rounds set the pace, not lane count;
  * **M5 ~27 Nov-2 Dec**, overlapping M4 from about the 22nd.
  * These are planning ranges, not promises. Each row's design and the first five rows' measured cost (P-453) will narrow them.

## 7. Questions for the founder (through the Lead; one at a time; each with a recommendation)

1. **The employer's side of the LMIA pathway (`lm.high_wage`, EMP5626 online-only): M4, M5, or after the extension?** *Recommend after M5.* It is a new kind of case (positions, LMIA clocks, fee per position: SA-1B-280-289). The stand-in employer case covers today's work, and M4 is already the largest milestone. (Was Fable's question 17, ruled out of the Bake.)
2. **What "upgrade a case" means** (part 4). *Recommend:* the family's next application (study → work → PR), so U1 and U2 go in M4.
3. **9-10 scores after M5, with 8 after M4** (part 5). *Recommend yes.*
4. **Who watches for a new edition of an IRCC form, and re-proves the map?** (after-29 §11 D: "No owner today. A production-grade form filler with an out-of-date form is worse than none.") *Recommend:* the content publisher role, with S6 flagging a proof older than the form's edition date, from M4.

## Question for the tech lead (posted on the PR)

**Start the shared services that touch no baton now, and write the three contracts, so M4 does not start cold.**
- S7 (health, request log, browser errors; part 8 M1-M3, ~2.5 sessions) and S5 (SH1 condition helpers, open since P-258, ~1) touch no baton.
- The S1 rule-table, S3 filing-values and S4 release-and-pin (SH4, open) contracts can be written as concept documents now and agreed before the schema baton frees.

*Recommend:* two lanes now (pipeline: S7; runtime, no baton: S5) and one concept lane for the three contracts. M4's first schema row (S1) then starts the hour M3-S4 merges.
