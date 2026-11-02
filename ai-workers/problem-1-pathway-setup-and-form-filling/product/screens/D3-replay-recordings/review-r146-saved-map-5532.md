# Review: R-146, saved field map of IMM 5532 (row C11.7, after PD #576)

* **Commit reviewed:** `8c39c2a0` (branch `claude/forms-imm5532-saved`, two commits on top of `d98041e7`). I read `git diff d98041e7 8c39c2a0` (five files). `git diff origin/main..8c39c2a0` also shows other people's later changes on `main` (now `88ed986a`), which are not part of this change.
* **Kind:** a saved AI result (P-227) plus two test edits. No screen, so there is no journey score (the journey test needs a screen).
* **Reviewer:** the reviewer agent. I did not build this.
* **Cost: US$0.** I used no `--live` and no `*_LIVE` variable, made no model call and never used :4400. I used one isolated copy (`rv5532`, port 4461, database `xr_studio_rv5532`, stopped afterwards) and one `check_queue_tx.ts` copy (`rv5532q`, same port). The shared ledger stayed at 180,011 bytes through every run.
* **Method:** my own Node 24 scripts, kept outside the checkout (the ledger, the run file against its job, inventory, prompt and schema, using the contracts' Ajv); the studio's own `pathcode.ts` `hasStubPass`; then the suites below.

## Results

| # | Check | Result |
|---|---|---|
| 1 | Run file is genuine | `contract_valid` true, `contract_errors` and `output_errors` null. The raw output passes `field-map-output.v2.schema.json` (Ajv), and `drafting_run` passes `drafting-run.v0` with `field-map-entry.v0`. Status `completed_with_unresolved`. `output_sha256` = SHA-256 of `raw_output`, the same in the run and in `launch_evidence`. Same keys, same layout and same label as the PR #528 runs. |
| 1 | Input | Inventory SHA `0237b7c8…` is the same in the job, in the run (`inputs` and `admitted`) and on disk. Every entry's `form_sha256` is the inventory's `summary.sha256` (`c26963fd…`). |
| 1 | Edition | `IMM 5532 (02-2021)` in the answer, in `known.form_edition` and in all 314 entries. `edition_note` is null. |
| 1 | Paths | The inventory has 315 records and 314 unique data paths (one record has `data_path: null`). The answer has 314 entries and the run has 314 converted entries on 314 unique paths. **0 missing, 0 outside the inventory, 0 repeated.** The converted entries equal the raw answer (outcome and fact) with no difference. |
| 1 | Evidence | 309 entries carry a quote. 309/309 are found verbatim in the inventory and 309/309 inside the entry's own field record (the earlier run on the old inventory had 312/314 in the own record, so its m3 is gone). The 5 without a quote are the "$" cells `Table1 Row2..6 Cell6[1]`; each is `unresolved` with a plain reason. `weak_evidence`, `needs_person` and `set_aside_fields` are empty. |
| 1 | Settings | The run's settings equal the job's (128k, 2 attempts, US$5). Prompt file SHA `fb6c3883…` and schema SHA `a9583204…` equal today's files. One attempt, `ok`, 66,362 output tokens, under the 128k limit, so not truncated. |
| 1 | Cost | 70,082 × US$4 / 1M + 66,362 × US$20 / 1M = **US$1.607568**, which is the run's `usage.cost_usd` (PRICE_PER_MTOK, `claude-opus-5-5` 4 / 20) and the ledger settle. |
| 2 | Ledger | Exactly two lines for this run: one reserve (`worst_usd` 3.215332, caller `paid`) and one settle (`actual_usd` 1.607568, `ok`). Worst 3.215332 is under the 3.22 estimate and the US$5 job budget. **Day total before the reserve: US$9.11554** (my own sum of 2 Nov settles, with open reserves at worst), so 9.11554 + 3.215332 = 12.33 against the US$25 day cap. Day total after: US$10.723108. Experiment total 49.616872 against the US$120 cap (`launch_evidence.ledger.committed_usd` says the same). Nothing was written after this run's settle. |
| 2 | Stub pass | `hasStubPass` is **ok** at this commit (my import of `p2/pathcode.ts`): the path-code SHA `907f4c24…` equals the run's, the job id matches, and the screening sources equal the run's digest sources. The stub (20:02:55Z) was made before the live start (20:04:03Z) and has its own zero-cost ledger lines. The committed `canary-digest.json` hashes to `74e89c59…`, which is the `screening.digest_sha256` the run recorded. |
| 2 | Privacy | No key, `x-api-key`, `anthropic-version`, bearer or e-mail in the run file. The push guard is **clean** over `d98041e7..8c39c2a0`. The 2 `/Users/<account>/…` paths (`launch_evidence.isolation.entry_script` and `ledger.file`) are the launcher's own, as in every earlier saved run (the old m2). |
| 3 | Test edit, `check_queue_tx.ts` | Exact. `SAVED` lists the fourteen files in file order (imm5532e.pdf between imm5476e and imm5562e); comments and labels say fourteen and thirteen siblings; still no `>=`. My run: **8/8 PASS**, `replayed 14`, `proposals_waiting 476`, `waiting_for_draft_with_ai []`, ledger unchanged. |
| 3 | Test edit, `check_s7_load.ts` | Correct. **23/23 PASS.** The line now needs `Array.isArray(...) && length === 0`. It keeps a real fail side: the list holds every plan target that is not `reuse_saved_output` or `skip` (demo.ts 252), so a saved run that is lost, or no longer matches its job, puts its form back on the list and the assertion fails. |
| 4 | Apply | `check_forms_pd_apply_replayed.ts` on `rv5532`: **8/8 PASS.** All 14 replayed drafts answer 201; IMM 5532 writes 314/314 boxes; the unique key still refuses a duplicate. (This is the failure that blocked #528's IMM 5532.) |
| 5 | Other suites on `rv5532` | `check_d3_saved_edition.ts` 11/11. `check_d1_reset_to_six.ts` 23/25: the two FAILs report files "added" to `p2/runs` (stub runs and `…-live-2099…c1113ui` files). They come from the other suites I ran in the same checkout before it, so I do not attribute them to this change. A clean CI copy settles it. |
| 6 | Merge | `git merge-tree` against `origin/main` (`88ed986a`) is clean. Since `d98041e7`, `main` changed no p2, p1 inventory, contract, `demo.ts`, `sources.ts` or the three test files, so the stub gate and the test edits still hold. |

## Blocker

None.

## Major

**M1. `check_c10_1_configured.ts` row 3 now fails: this change makes the "waiting for Draft with AI" sentence disappear, and the test still demands it.**

* **Evidence.** I ran `tsx studio/tests/check_c10_1_configured.ts 4461 xr_studio_rv5532` on this commit: **26 passed, 1 failed.**
  * `FAIL  C10.1 row 3: every saved AI field-map answer is replayed (US$0); forms without one are listed as waiting for the paid run — {"row":"3","status":"done","shows":"14 saved AI answers replayed (US$0)","why":null}`.
  * Line 56 of the test asserts `/paid run the founder approves/.test(r("3").why)`. `demo.ts` 346–348 only writes that sentence when `waiting_for_draft_with_ai` is non-empty. With IMM 5532 saved, the list is empty, the row becomes "done" with `why: null`. That is the right product behaviour (the row is honest: 14 of 14 saved, applied 14 of 14 on row 4).
  * The same two lines of the test passed before, because IMM 5532 was the form waiting.
* **Why it matters.** `select-suites.mjs` returns `ALL` for this change (`prototype/p2/ (shared)`), so every suite runs on the PR and this one turns the shard red. It is a test that was true for one form only; no behaviour is wrong.
* **Fix (test only, the same PR, no new scope).** Change the row-3 assertion to the new fact and keep a fail side: `r("3").status === "done"`, `r("3").why === null`, `shows` starts with `${jobs} saved`, and `jobs === 14` (a replay lost under load drops `jobs` and turns the row to "partial" with the form named, so the assertion fails). Also update the header and comment of that file where they say forms wait for the paid run (row 12's IMM 5257 sentence is a different thing and still holds). Re-run the file and show 27/27.

## Minor (none blocks on its own)

* **m1. Honest follow-up, not a reason to withhold the run: 229 of 314 boxes are unresolved.** The split is 75 mapped, 229 unresolved, 10 never filled (signatures and signature dates, with the reason said). The earlier run on the old inventory mapped 131, but that inventory gave 44 boxes only 20 paths and could never be applied, so the counts do not compare. The 229 reasons are specific and principled: tables of persons with no question text in the inventory (24, 12, 9, 8), former spouses or partners with no person category that fits (9 + 9 + 9), the "$" cells with no caption meaning, and an empty caption. Confidence is high 13, medium 71, low 230. No wrong fact is proposed; each unresolved box reaches a person. A person review is where those are decided, and a richer inventory (table headings) or new person categories is a forms row, not this PR. I judge this saveable: it is the real answer to this inventory, it applies cleanly, and it replaces a form that waited for a paid run. Say so in the PR body so nobody reads "saved map" as "mostly mapped".
* **m2. The PR comment says "fourteen" in two places; the run adds 22 proposals to the queue (454 → 476 in my copy), not "the whole form".** Suggest the PR body states 14 forms, 476 proposals, so the next review matches (the old number in the #528 review was 454 for thirteen forms).
* **m3. Person assignment of the mapped tables is for the reviewing person.** The sponsor's boxes are `form_subject` and the partner's `subject_spouse_or_partner`; the employment, education and residence tables are all `form_subject` with "Only if the sponsor has … number n" conditions. It is consistent and verbatim, but it is a modelling choice a person should see on the queue.
* **m4. Carried from #528 (launcher rows, not this PR).** `launch_evidence.isolation.entry_script` and `ledger.file` are absolute `/Users/<account>/…` paths; the attempt record has no `stop_reason`.
* **m5. My test runs left tracked files changed in this checkout** (stub-pass files of IMM 5257 parts, `canary-digest.json`, three c1113 screenshots, `check_ai_orchestration.json`) and removed the untracked `runs/stub-pass/studio-fieldmap-imm5409e.json` that was there when I started. My attempt to restore them was refused. Do not commit them; the builder's clean clone is unaffected. CI is the check of record.

## Not checked

* CI on this head (shards were not visible to me).
* The browser suites (`check_c10_1_browser.cjs`, `check_d1_reset_to_six_browser.cjs` and the qa walks): I found no text in them that depends on a waiting form, but I did not run them.
* The legal and immigration content of the mapped facts (not my duty; "Unconfirmed: no counsel").

## Verdict

The run file is genuine and consistent, the ledger and the cost limits match, and Apply works for all fourteen replays. One test (`check_c10_1_configured.ts` row 3) was true for IMM 5532 alone and now fails; fix it in this PR.

**Verdict on 8c39c2a0: Block**

* **Blockers:** none.
* **Majors:** M1, `check_c10_1_configured.ts` row 3 fails (26/27) because no form waits for Draft with AI any more.
* **Minors:** m1 (229 of 314 unresolved: honest follow-up), m2 (state 14 forms and 476 proposals), m3 (person choices for a human), m4 (launcher path, carried), m5 (my runs dirtied the checkout).

A re-review needs only: the changed test file, `check_c10_1_configured.ts` 27/27, and green CI on the new head. The run file, stub pass, canary digest and the two other test edits need no change.

---

## Re-review on 9560dd3d

* **Change read:** `git diff 8c39c2a0..9560dd3d`: two files. The review file (added unchanged) and `check_c10_1_configured.ts` (one assertion plus a comment). No run file, stub pass, canary digest, product code or other test changed.
* **Cost: US$0.** No `--live`, no `*_LIVE`, no model call, port 4461 and `rv5532` only; the shared ledger stayed at 180,011 bytes. I ran the committed test from `9560dd3d` through an untracked temporary copy of the file (deleted afterwards), against my isolated copy of `rv5532`, which was stopped afterwards. The app code on my copy equals the app code at `9560dd3d` (the diff touches no app file).

| Re-check | Result |
|---|---|
| M1: row 3 assertion | Now `jobs === 14 && status === "done" && why === null && shows.startsWith(`${jobs} saved`)`. It states the new fact exactly. |
| M1: fail side kept | A saved run lost or mismatched gives `jobs` 13, fails `jobs === 14`, and the row turns "partial" with the form named, which also fails `status`/`why`. The assertion is not satisfied by an empty list alone. |
| M1: result | `check_c10_1_configured.ts` **27 passed, 0 failed** (row 3 PASS: `status "done"`, `why` null, "14 saved AI answers replayed (US$0)"). Rows 4 and 12 still pass. |
| Header line 5 ("IMM 5257 waits for the paid run") | Still true: it is row 12's sentence, which the test still checks. Agreed to leave it. |
| Rest of the change | Unchanged from my first review: the run file, stub pass, digest and the two other test edits need no change. |

The Minors m1 to m5 stand as written (m1: 229 of 314 unresolved is an honest follow-up; m5: do not commit what my first test runs left in the checkout). CI on the new head is not visible to me; approval holds only with it green.

**Verdict on 9560dd3d: Approve**

* **Blockers:** none.
* **Majors:** none (M1 closed).
* **Minors:** m1 to m5 as above, none blocks.

---

## Re-review of merge 61965282

* **Change read:** `git show --cc 61965282` (merge of `origin/main` `d04d2572` into `9560dd3d`'s line, first parent `f431cc82`) and `git diff f431cc82..61965282` over `prototype/studio/tests/`. Reading only: **no suite, server or isolated copy was run** (the coordinator runs the four replay checks), and no tracked file was edited. US$0, no model call.
* **What main brought:** QA-163 (#568/#570): the plan no longer skips a listed form that has no field map, so the six now also replays the saved answer of `imm5257e.pdf` (the Visitor visa's IMM 5257). That makes **fifteen** saved forms with this PR's `imm5532e.pdf`.

| Check | Result |
|---|---|
| Net change against `origin/main` (`d04d2572`) | Six files: the IMM 5532 run file, its stub pass, `canary-digest.json`, and the three tests. `git merge-tree` with `origin/main` is clean. |
| My files since `8c39c2a0` | The run file, the stub pass, the canary digest, the job and the inventory of IMM 5532 are byte-identical to the commit I approved. The only p2 file main added is the new job `studio-fieldmap-imm5645e.json`; main changed none of `launch.ts`, `draft.ts`, `runner.ts`, `guard.ts`, `isolation.ts`, `ledger.ts`, `policy.ts`, `prompt.ts`, `convert.ts`, `screen.ts`, `pathcode.ts`, the contracts' `fact-key.ts`/`portal-capture`/`rules`, or the prompt and schema. The path-code SHA that the stub pass and the live run record (`907f4c24…`) therefore still holds, so the stub gate stands. |
| `check_queue_tx.ts` conflict resolution | Correct. `SAVED` is main's fourteen (with `imm5257e.pdf` after `imm5257_1e.pdf`) plus `imm5532e.pdf` between `imm5476e` and `imm5562e`: fifteen names, in the file-name order the test's own query uses (`order by a.file_name`). The strings now read "the fifteen forms" and "its fourteen siblings", still no `>=`, and the header and doc comments keep both histories (QA-163 and R-146). The test still asserts `replayed === SAVED.length` and siblings = `SAVED` minus IMM 5707. |
| `check_c10_1_configured.ts` row 3 | `jobs === 15`, status "done", `why` null, `shows` starts with the count. Still exact, still has the fail side (a lost replay gives 14 and a "partial" row naming the form). |
| `check_s7_load.ts` | Wording only; the empty-list assertion is unchanged. |
| Other tests on main's side | Searched the merged tree for `replayed`, `waiting_for_draft_with_ai`, `fourteen`/`thirteen`, 13/14 beside saved/draft/replay, and `5532`: only the three files above hard-code the count or a waiting form. The rest use `>= 6`/`>= 3` or the load's own list (`check_forms_pd_apply_replayed.ts`, `check_forms_pd_unique_paths.ts`). `check_qa163_listed_form_saved.ts` (main's new test) counts neither replays nor waiting forms. |

**Observation, not a finding on this change.** `demo.ts` row 12 of the configured checkpoint still says "IMM 5257 has no saved field-map answer under today's 5-part drafting: it waits for the founder's paid run", and `check_c10_1_configured.ts` still asserts it. After QA-163 the sample replays an IMM 5257 saved answer (the whole-form one of 21 Oct), so that sentence now reads stale. It is main's wording, it is not from this PR, and a test passes on it; a forms or qa row can reword both together.

**What I could not check here:** that the four replay checks and CI pass on `61965282` (the coordinator is running them). In particular, QA-163 adds the IMM 5257 replay to the list that `check_forms_pd_apply_replayed.ts` applies; that check takes its list from the load, so it covers it without a change, and its result is the one to read.

The Minors m1 to m5 above stand (m5 concerned my own first test runs; do not commit those leftovers).

**Verdict on 61965282: Approve**, on the condition that the coordinator's replay checks (`check_queue_tx.ts` 8/8 with fifteen forms, `check_c10_1_configured.ts` 27/27 with `jobs === 15`, `check_s7_load.ts`, `check_forms_pd_apply_replayed.ts`) and CI are green on this head; any red one reopens it.

* **Blockers:** none.
* **Majors:** none.
* **Minors:** m1 to m5 as above; the stale row-12 sentence (main's, not blocking).

---

## Re-review on 0ae77d14

* **Change read:** `git diff 61965282..0ae77d14` (three files: the review file, `check_c10_1_configured.ts`, `check_s7_load.ts`; the `*.ts` diff is the two tests). Reading only: no suite, server or isolated copy run by me; no tracked file edited. US$0.
* **Correction to my merge review.** I approved 61965282 on the condition that the replay checks were green, and I wrote that the empty waiting list "is unchanged". That was wrong. I noted main's new job `studio-fieldmap-imm5645e.json` but did not follow it through: QA-163 (commit `49da2f96`) added IMM 5645 (01-2021) to the six, it has a job and no saved run (`p2/runs` holds no `imm5645` file), so exactly one form waits for Draft with AI again. The coordinator's runs on 61965282 (s7_load 22/1, c10_1 26/1) caught what my reading missed.

| Check | Result |
|---|---|
| Cause | Matches the repo: main adds the IMM 5645 job and no run file for it. The waiting list is the plan's non-reusable targets (demo.ts 252), so it holds that one form. |
| `check_s7_load.ts` | Now `JSON.stringify(waiting_for_draft_with_ai) === JSON.stringify(["IMM 5645 (01-2021)"])`. Exact on the name and on the length. Fail sides: a lost or mismatched saved run adds its form (list differs); a saved run for IMM 5645 landing later also fails it, which is the intended prompt to update the line. The label equals the job's `known.form_edition`. |
| `check_c10_1_configured.ts` row 3 | `jobs === 15 && status === "partial" && shows.startsWith(`${jobs} saved`) && why` matches `^1 forms have no saved AI answer and wait for Draft with AI, a paid run the founder approves: IMM 5645 \(01-2021\)\.$`. I compared it character by character with the sentence in `demo.ts` 348 (`${n} forms have no saved AI answer and wait for Draft with AI, a paid run the founder approves: ${names.join(", ")}.`): it is the same, "1 forms" included (the product's own plural wording, not this PR's to change). A lost replay changes `jobs` and the sentence, so both sides fail. |
| Comments | Both updated and accurate (fifteen saved, IMM 5645 alone waiting). |
| Everything else | Unchanged since 61965282: my run file, stub pass, digest, `check_queue_tx.ts` (fifteen forms; it does not assert the waiting list), no product code. |
| Reported results (not run by me) | s7_load 23/23 and c10_1 27/27 on 0ae77d14; ledger unchanged at 180,011 bytes; earlier on 61965282, PD apply 8/8 and queue_tx 8/8. |

**Minor (new, not blocking):** the row-3 sentence reads "1 forms have…" (no singular). It is `demo.ts` wording from before this work and the test now pins it, so a reword of `demo.ts` would need the test changed with it.

Minors m1 to m5 and the stale row-12 sentence above stand.

**Verdict on 0ae77d14: Approve**, conditional on CI being green on this head.

* **Blockers:** none.
* **Majors:** none.
* **Minors:** m1 to m5, the stale row-12 sentence, and "1 forms" (all non-blocking).

---

## Re-review of merge 375897d8

* **Change read:** `git show --cc 375897d8` (parents `b348127f` and `origin/main` `d9488d5e`), `git diff b348127f..375897d8` (42 files under `prototype/`), and greps of the merged tree. Reading only: no suite, server or isolated copy run by me; no tracked file edited. US$0.
* **What main brought:** C3.4 (#585) and C2.6 (#574): library masters (four new `studio-masters-*` jobs with stub passes, prompts, schemas and stubs; `form-masters.ts`, `masters-ai.ts`), the checklist/review-queue "one door" work (`checklist.ts`, `proposals.ts`, `saved-readings.ts`, `rounds.ts`, `draft-qd.ts`, `review-queue.ts`, `sources.ts` +5 lines), tests for those, and `qa/check_qa_p227_imm5532_saved.ts` (QA's check of this PR's run).

**1. Keeping our `canary-digest.json` is right.**

| Question | Evidence |
|---|---|
| Does a check or the stub gate read the committed digest? | No. `launch.ts` 50 writes it afresh on every launch ("the latest, kept as evidence of what the screen looks like") and a launch compares only the digest SHA and nonce it just wrote with what the child screened (110). The drafting process reads its own per-run ticket (`draft.ts` 49, `ticketFile(runId)`), never `DIGEST_FILE`. `hasStubPass` (`pathcode.ts`) reads the stub-pass file's path-code SHA and `screening_sources` only. `check_ai_launch_paths.ts`, `check_forms_c34_ai.ts` and `check_forms_pa_track_a_jobs.ts` only save and restore the file (`keep`/`writeFileSync(CANARY, before.canary)`); `tests/check_p2_launch.ts` compares a launch's own ticket. Nothing compares the committed file's content with anything. |
| Which side is the later evidence? | Ours: made 20:04:03.873Z by the IMM 5532 live launch; its SHA-256 (`74e89c59…`) is the `screening.digest_sha256` that run's record carries, as reviewed before. Main's is 18:25:46Z from a C3.4 stub launch (`studio-masters-form-check-…-stub-20261102t182546802z`), earlier, so ours is the "latest" the file is meant to be. |
| Cost of the choice | None for any gate. The C3.4 stub's run record names its own digest SHA, and a later launch rewrites the file anyway. |

**2. Do main's incoming changes touch what this PR depends on? No.**

| Check | Result |
|---|---|
| Path-code files behind the IMM 5532 stub pass | **None changed** since `b348127f`: `launch/draft/runner/guard/isolation/ledger/policy/prompt/convert/screen/pathcode.ts`, `contracts/fact-key.ts`, `portal-capture.ts`, `portal-capture.v1.schema.json`, `rules.ts`, `field-map.v2.md`, `field-map-output.v2.schema.json`, `studio-fieldmap-imm5532e.json` and the IMM 5532 inventory are all identical. So `pathCodeSha` is still `907f4c24…` and the stub gate (`hasStubPass`) still holds. |
| `contracts/drafting-run.v0.schema.json` | Changed, but only by adding `masters_form` and `masters_guide` to the `kind` enum (and to the `output_sha256` rule). `kind` for IMM 5532 is `field_map`, so its run file validates as before. The file is not in `pathCodeSha`. |
| Replay counts and the six's waiting list | `demo.ts`, `ai.ts` and the field-map plan are unchanged. `sources.ts` adds two guards that refuse a `checklist_draft` job; they do not touch `field_map`. `proposals.ts` keeps `ON_ITS_PAGE = {field_map}` and removes only `checklist_draft`. The new masters jobs are kind `masters_form`/`masters_guide`, which the replay count (`kind = 'field_map'`) and the waiting list (non-reusable field-map targets) never include. The count stays 15, the waiting list stays `["IMM 5645 (01-2021)"]`. |
| My three tests and the replay count | `check_queue_tx.ts`, `check_s7_load.ts` and `check_c10_1_configured.ts` are identical to `b348127f` (main changed none of them). Greps of the merged tree for `replayed`, `waiting_for_draft_with_ai`, `fifteen`/`fourteen`, `5532` and `5645` find no new place that hard-codes a count or a waiting form. |
| QA's new `check_qa_p227_imm5532_saved.ts` | Compatible: it needs `replayed >= 14` and IMM 5532 absent from the waiting list (true: 15, and only IMM 5645 waits), 314 entries with 75/229/10, US$1.607568, and exactly one saved live run file for the job. It reads my committed files, which are unchanged. |
| My files | Run file, stub pass and job: unchanged since `8c39c2a0`. The only change in `canary-digest.json` against `origin/main` is the file kept as ours. |

**What I could not check:** the suites and CI on this head (the coordinator is running them). The new masters tests (`check_forms_c34_ai.ts` and others) are main's and not mine to re-run.

Minors m1 to m5, the stale row-12 sentence and the "1 forms" wording stand; nothing new.

**Verdict on 375897d8: Approve**, conditional on the coordinator's runs and CI being green on this head.

* **Blockers:** none.
* **Majors:** none.
* **Minors:** as above, none new.
