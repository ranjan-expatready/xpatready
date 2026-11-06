# B120 — one file per feature for the hot files (plan)

6 Nov 2026, times IST. Runtime lane. P-376 (3); B108 change (2) (`design/scale-phase-2026-11-05.md`, PR #1086). Behaviour unchanged; live AI off; US$0.
Status at 05:50 IST: **plan only.** #1123 (B99, edits `demo.ts`) is still open, so no product code changes until it is on `main` (brief). Line numbers below are `main` 4e26fb22.

## 1. What is hot, measured (git, `main` 4e26fb22, since 3 Nov, no merges)

| Region of `api/src/demo.ts` (1,095 lines) | Lines | Commits since 3 Nov |
|---|---|---|
| Header: imports, constants, types | 1–96 | 33 |
| Core: `status`, `load`, `loadClaimed`, `resetToSix` (and the constructor) | 97–180 | 11 |
| Document-line helpers, `releaseWithSources` | 181–341 | 5 |
| `loadSteps` (the suites' fixture) | 342–400 | 1 |
| `loadSix`, `linesByHand` (Reset to the six) | 401–518 | 6 |
| **`loadConfigured` (the configured checkpoint) and `heldFileApproved`** | 519–955 | **52** |
| `settled`, `scope`, `preserved`, `reset`, `wipe`, `sweepOrphans` | 956–1095 | 1 |

`api/src/form-part-placements.ts` (181 lines): 21 commits since 3 Nov, in three parts: the form-box pass (QA-144 slices 1–3), the condition-facts pass (B82), chosen sections (`keepChosenEveryones`, `everyoneAnswers`: B78, R2-m1), plus the route.

**Open PRs that edit these files now** (fetched 05:40 IST): #1123 (+8 −4: own yes/no line, row 12; lands first), #1073 (+75: C6.4's conditional document lines, a new per-combination step after the cited lines), #1084 (+3: B104's J7 Stage 1, a new step before the form roles), #1072 (+1 −1: a form line's `minAge`/`who` on a conditional line). None edits `form-part-placements.ts`.

**Callers.** `Demo` is imported only by `main.ts` (the `api/demo` controller) and `demo-reset-to-six.ts`; no test imports `demo.ts` or reads it as text (comments only). `placeFromFormParts`/`keepChosenEveryones` are imported only by `demo.ts` and `features/form-part-placements.ts`.

So the cost driver is the checkpoint: every new row step edits the same 400-line method, plus an import, a constant and often a constructor injection at the top of the file. Splitting the rarely edited parts gains little and moves risk onto Reset to the six. They stay in `demo.ts` (see §6, question 1).

## 2. The new layout

```
api/src/features.ts                     the one index: registerFeatures (unchanged) + featureSteps(<folder>), the same scan for steps
api/src/features/*.ts                   Nest registrations, unchanged (a subfolder is not a .ts file, so registerFeatures skips it)
api/src/features/checkpoint/NNN-<feature>.ts               one configured-checkpoint step per file; NNN is its order
api/src/features/checkpoint/combination/NNN-<feature>.ts   one step per file inside "questions, form fields and form rules", run per combination
api/src/features/checkpoint/_*.ts                          shared parts, not steps (the context type, state helpers)
api/src/features/placement/NN-<feature>.ts                 one pass of placeFromFormParts per file
api/src/demo.ts                         Demo: load/claim, Reset, Reset to the six, loadSix, loadSteps, releaseWithSources, scope/wipe; runs the steps
api/src/form-part-placements.ts         placeFromFormParts (runs the passes, then chosen sections) and its route; same exports
```

**Adding a feature becomes adding a file.** A step file is a default export `{ run(ctx) } satisfies CheckpointStep`. Its place in the run comes from its file-name number. `featureSteps` reads the folder in number order and **refuses at start-up**, with the file names, when a file has the wrong shape or two files share a number. Unordered steps would change data (library approvals depend on what came before), so a tie is never broken silently. Files named `_*.ts` are helpers. Any other file must be a step: a misnamed step must never be skipped quietly (the same rule as `features.ts`). Steps are read once, when `Demo` starts (`onModuleInit`), so a bad file stops the start-up rather than the first checkpoint load.

**Why a folder scan and not a hand-written or generated index (a named deviation from row B120's "one generated or listed index", PR #1128).** Two PRs that each add an entry at the end of a hand-written list conflict in git (same lines), and so do two PRs that each regenerate a committed index file. That contradicts the row's other Done-when, two parallel additions in different files. The "one place" is therefore the index function `featureSteps` in `features.ts`, which today's `registerFeatures` already uses for the Nest registrations, and the order lives in the file names. If the tech lead wants a committed list anyway, it can be generated as a read-only report (never read by the app), so it cannot conflict in a way that matters.

**Services without a constructor edit.** Today each new step adds an injection to `Demo`'s one-line constructor (merge notes: "conflict: the Demo constructor, all injections kept"). Steps instead ask `ctx.get(Forms)` (Nest `ModuleRef.get(…, { strict: false })`: same singleton, already in `@nestjs/core`, no new technology). The constructor keeps only what `demo.ts` itself uses.

**Shared state between steps.** Today it is local variables of one method (`irmWhy`, `applied`, `sectionsHeld`, `maritalList`, `fromForms`, `released`, `fam`, …). Each becomes state owned by the step that makes it: `export const sections = stateOf(() => ({ made: [], … }))`, read as `sections(ctx)`. Behind it is a `WeakMap` keyed by the run's context, so a run starts empty and nothing leaks between loads. A later step imports the accessor from the step file that owns it, so the dependency is visible in its imports. Step files never edit a shared context type, and the core context (`_context.ts`: actor, workspace, people, `six`, `keyOf`, `vvId`, `timed`, `said`, `row`, `log`, `get`, `db`, `audit`, `settled`) is stable.

## 3. Step by step: old lines → new file (behaviour and order unchanged)

Top-level steps (`features/checkpoint/`):

| File | Old lines | What | State it owns |
|---|---|---|---|
| runner in `demo.ts` (`loadConfigured`) | 553–568, 951–954 | asks each step to prepare, `loadSix` (with a step's swap), people, `timed`, `said`, `row`; at the end sorts rows, writes the audit line, returns | `rows`, `timings` |
| `010-held-file.ts` | 526–551, 570–580 | row 1: intake, the off-list copy held and approved (`heldFileApproved`, `OFF_LIST_COPY`) | |
| `020-online-capture.ts` | 581 | row 2: parked | |
| `030-irm0002.ts` | 583–596 | IRM 0002 attached, saved answer replayed | `irmWhy` |
| `040-field-map-review.ts` | 598–630 | rows 3–4: decide and apply the replayed drafts | `applied`, counts |
| `050-named-document-types.ts` | 632–651 | C11.7 part B: the named document type accepted, line added | |
| `060-sections-from-forms.ts` | 653–708 | sections from the forms' parts (`sectionsFrom`, exported for release 2) | `fromForms`, sections made/reused/refused/held, `maritalList`, `namedByPerson` |
| `070-library-approvals.ts` | 710–717 | row 5 | |
| `075-reset.ts` | 718 | row 6 | |
| `080-form-setup.ts` | 720–830 | loops over `fromForms` and runs `combination/*` in order, inside the one `timed("questions, form fields and form rules (rules)")` | `placedFacts`, `setUpRefused`, `unchosen`, `byHand`, `lines`, `documentLines` |
| `090-row-seven.ts` | 831–835 | row 7's words | |
| `095-questionnaire.ts` | 836 | row 8 | |
| `100-form-roles.ts` | 838 | `applySampleFormRoles` before any release | |
| `110-release-one.ts` | 839–860 | rows 10 (release 1 loop) | `released`, `visitor` |
| `120-family-case.ts` | 862–866 | the Sample family case (`openSampleFamilyCase`) | `fam` |
| `130-release-two.ts` | 868–926 | row 9, release 2 (mixed channels) | |
| `140-family-case-rows.ts` | 927–930 | row 11 | |
| `150-filled-copies.ts` | 931–935 | row 12 (and B99's read-back once #1123 is in) | |
| `170-new-edition.ts` | 54–61, 554–558, 936–950 | row 17 (`ROW17`); its `prepare` gives the six's edition swap before `loadSix` | `row17` |

Per-combination steps (`features/checkpoint/combination/`), in today's order inside the loop:

| File | Old lines | What |
|---|---|---|
| `100-form-lines.ts` | 729–744 | forms IRCC's words name added from the Form library; each rule's line and channel |
| `110-marital-list.ts` | 745–746 | the shared marital status list, once |
| `120-family-form.ts` | 747–751 | the family information form by channel (`familyForm` moves to `_family-form.ts`, also used by 060 and 130) |
| `130-rule-facts.ts` | 752–760 | facts only a rule reads, added and accepted |
| `140-own-yes-no.ts` | 761–767 | B52's own Yes/No questions |
| `150-approve-library.ts` | 768–770 | the approver approves what waits |
| `200-place-from-parts.ts` | 772–773 | `placeFromFormParts` (its result kept per combination for 210, 220 and #1073) |
| `210-rule-facts-beside.ts` | 774–785 | a rule's fact asked beside the fact it is about |
| `220-placement-results.ts` | 786–787 | what placement refused and unchose |
| `300-reviewed-release-documents.ts` | 256–297, 797 | With an LMIA's lines from c1-v3 |
| `310-checklist-documents.ts` | 223–254, 801 | the Visitor visa's lines from IMM 5484's saved reading |
| `320-cited-documents.ts` | 197–221, 803 | the Study permit's cited lines |
| `330-approve-document-types.ts` | 804–806 | the approver approves the new types |
| `400-edition-form-fields.ts` | 808–828 | per PDF edition: by hand, option maps, not on this form (B81). **Kept as one file**: splitting it would reorder the database writes across editions |

The steps that ran only `if (setup)` check `c.setup` themselves. No step may catch an error that today stops the load: the runner adds no `try` and no `timed` of its own, so the result's `timings` keys, the log lines and "Loading stopped after: …" stay as they are.

`placement/`: `10-form-boxes.ts` (old lines 25–86), `20-condition-facts.ts` (87–101). `_chosen-sections.ts` holds `keepChosenEveryones` and `everyoneAnswers` (113–151). `form-part-placements.ts` keeps `placeFromFormParts` (snapshot once, passes in order, then chosen sections over every placed section, as today), re-exports `keepChosenEveryones` and `PlacedFromParts`, and keeps the route.

## 4. Guards that would go blind, fixed in the same PR

Five suites scan **only the top level** of `api/src` (`readdirSync(API)`). Code moved into `features/checkpoint/` would leave their sight. That is a silent weakening, not a refactor:
* `check_s6_p149.ts`: no library item created outside the one door (P-149). This one matters most, because checkpoint steps write library rows through services;
* `check_irm_editions.ts`: no IMM-only edition pattern;
* `check_forms_qa53.ts`, `acceptance/C11.1.test.ts`, `acceptance/C4.8.test.ts`: route guards (steps have no routes, but a future feature file may).

Each scan reads `api/src` recursively (`.ts`, not `.d.ts`). For each one, a fail test plants a file in a subfolder and checks that it is caught. `count-any.mjs` and `graph.mjs` already walk subfolders. `select-suites.mjs` maps a file under `api/src/features/` to ALL, which is conservative; `demo.ts` already selects 162 suites. Not changed (P-312).

## 5. Checks (Done when)

1. **Byte-equal data, by a dump that compares.** New `studio/tools/demo-dump.mjs <db> <var-dir>` writes one canonical text dump of every table (but `_prisma_migrations`) and every working file:
   * every UUID is replaced by a token made from the table and a hash of the row it identifies (with ids and times masked), so which row points at which is compared, not the random ids;
   * timestamps and measured durations (`… in 12.3 s`, `seconds`, `timings`) are masked;
   * rows are sorted by their canonical text; files are listed by tokenised path and SHA-256.

   **Determinism first:** two runs of `main` must give identical dumps. Anything else that differs between two runs of the same code is masked only by name, and listed in the PR with why. Then `main` and the branch must match byte for byte (`cmp`, exit code in the PR). Done for **Reset to the six** (the brief) **and for the configured checkpoint** (Reset, then Load sample "configured"), because the split's risk is in the checkpoint, which Reset to the six never runs. Each on a fresh isolated copy (runtime ports 4430–4439).
   **Baseline measured on `main` 4e26fb22 (05:15-05:58 IST, fresh isolated copies, US$0):**
   * **Reset to the six is not deterministic on `main` today.** Two runs of the same code differ in 28 of 1,251 rows. The field-map replay runs 2 AI steps at once (`api/src/ai.ts:46`, `MAX_PARALLEL = 2`), so which of two twin proposals comes first varies, and with it `reuse.match` (new/reuse), `relates_to`/`work.twinOf`, `confidence` (ready/check), `identity.near` and the "The same item is drafted for IMM 5257 / IMM 5257 SCH1" reason. A person sees different To review cards after each Reset to the six. This is a finding for the tech lead (it is not caused by B120 and is not fixed here).
   * So byte-equal is tested with the AI queue serialised (`STUDIO_AI_PARALLEL=1`): a one-line local patch to `ai.ts:46`, applied identically to the `main` copy and the branch copy and **never committed** (B120 does not touch `ai.ts`). With it, two runs of `main` are byte-equal: Reset to the six `cmp` exit 0 (1,251 rows, 59 files); the configured checkpoint `cmp` exit 0 (10,391 rows, 136 files).
   * Masks found necessary, each explained in the tool's header: copy folder name in stored paths; merged-run ids (time and random suffix); hashes over ids (`plan_sha256`, `run_key`, `idempotency_fingerprint`); 8-hex short ids (case references, copy file names) as their UUID's token; a row's own id inside its content (`<self>`); generated PDFs compared by size, because IRCC's forms are AES-encrypted (`/V 4 /R 4`) with a fresh IV on every write (their exact input, `request.json`, is compared in full); and three lists `main` returns in no fixed order (`answer_snapshot.facts_json.groups`, one per person in random-id order; `proposal_item.work.affected.*.people`; `form_line_action.detail.after`), sorted. The last three are also findings (an order that depends on random ids).
2. `run-suites.sh --changed origin/main..HEAD` (ALL, since `features.ts` and the scans are shared): every suite green, exit 0; and the merge queue's protected set (`works-set.mjs`) green.
3. **Two parallel changes, each adding a feature, touch different files:** #1073's C6.4 step ported as `combination/325-conditional-documents.ts`, and #1084's B104 step as `checkpoint/097-j7-stage-one.ts` (before the form roles, as today). Each goes on its own throwaway branch from this one; never pushed as product work, kept only as patches in the PR. The checks: `git diff --name-only` of the two is disjoint; each merges cleanly into the other, in both orders (exit codes); and `demo.ts` and `form-part-placements.ts` are untouched by both.
4. Start-up refusals, with tests: two step files with one number, a step file without `run`, and a non-step file not named `_*.ts` each stop the start-up with the file's name.
5. `graph.mjs --check`, `count-any.mjs --against origin/main` (explicit `any` must not rise: moved `any`s move, none added), the builder pre-flight (P-375 (2)), the walk at 1440 px (Demo › Reset to the six, Load the configured checkpoint, the rows panel), the Opus reviewer on the exact head (P-303) and the breaker (schema-adjacent seed data, P-278).

## 6. Questions for the tech lead (also on the PR)

1. **Scope:** `loadSix` (6 commits since 3 Nov) and the core stay in `demo.ts`; change 1 (recipes) replaces `loadSix` anyway. **Recommend: keep.** Splitting it now puts the byte-equal risk on Reset to the six, the route gate B calls, for little gain.
2. **The "one `demo.ts` PR at a time" rule (P-337, P-348 (8))** has a new subject after this lands. **Recommend:** it becomes "one PR per step file". A PR that adds a step file needs no slot; a PR that changes an existing step or the runner keeps the one-at-a-time rule.
3. **Porting the open PRs:** #1073, #1084 and #1072 will conflict once and must move their change into the new files. **Recommend:** the PR body carries the old-line → new-file map (§3), and the dry-run ports from check 3 are offered to #1073 and #1084 as patches; their builders apply them. I do not push to their branches.
