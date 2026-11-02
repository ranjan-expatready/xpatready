# Review: PR #528, R-146 saved field maps 2 (IMM 5710, 1294, 5532, 0008)

* **Commit reviewed:** `298a472d0d928e273964dc0126bef4ebcd81538d` (branch `claude/paid-runner-r146-saved-maps-2`), detached checkout.
* **Kind:** saved AI results (P-227). There is no screen, so there is no journey score.
* **Reviewer:** the reviewer agent. I did not build this.
* **Cost: US$0.** I used no `--live` and no `*_LIVE` variable, made no model call and never used :4400.
* **Method:** my own Node 24 scripts, kept outside the checkout:
  * a re-check of every run file against its job, inventory, prompt and schema, using the contracts' Ajv;
  * the studio's own `checkedOutput`, `sameDraftInputs`, `failedOurCheck` and `p2/pathcode.ts hasStubPass`, imported from this commit;
  * `check_queue_tx.ts` on an isolated copy (`4459 rev_qtx4`);
  * an Apply probe on a second isolated copy (port 4461, own database, dropped afterwards). It loads the six, returns every proposal of one draft, then applies it.

  I also read the shared ledger (read only), ran the push guard over the PR's range, ran the PR body's re-check command, and ran `git merge-tree` against current `main`.

## Results of the six checks

| # | Check | IMM 5710 | IMM 1294 | IMM 5532 | IMM 0008 |
|---|---|---|---|---|---|
| 1 | `contract_valid` true, `contract_errors`/`output_errors` null. I re-validated the drafting-run v0 and field-map-output v2 schemas myself | yes | yes | yes | yes |
| 1 | Status | completed_with_unresolved | completed_with_unresolved | completed_with_unresolved | completed_with_unresolved |
| 1 | Not truncated: one attempt and one ledger reserve; settle `"ok"` (not `ok_stop_max_tokens`, runner.ts 78); output tokens under the 128k limit; the raw output parses and closes; `output_sha256` = SHA-256 of `raw_output` | 57,745 tokens | 58,635 | 63,522 | 71,249 |
| 1 | Input SHA-256: run = job = SHA-256 of the committed inventory file, and `admitted` is the same file | yes | yes | yes | yes |
| 1 | Edition read = `known.form_edition` = `launch_evidence.known`, every converted entry the same; `edition_note` null | 09-2023 | 06-2026 | 02-2021 | 05-2026 |
| 1 | `form_sha256` of every entry = inventory `summary.sha256` | yes | yes | yes | yes |
| 1 | Template, schema and settings hashes = today's prompt, schema and 128k job | yes | yes | yes | yes |
| 1 | Unique paths: inventory / answer; answer entries; converted entries; missing 0, outside 0 | 242/242; 242; 242 | 245/245; 245; 245 | 290/290; **314**; 314 | 298/298; 298; 298 |
| 1 | Mapped · unresolved · never filled · not a fact (raw = after `checkedOutput`) | 169 · 14 · 5 · 54 | 170 · 14 · 3 · 58 | 131 · 173 · 10 · 0 | 249 · 22 · 3 · 24 |
| 2 | Non-empty quotes found, ignoring case and spacing (the PR's re-check gives the same) | 242/242 | 245/245 | 314/314 | 294/294 |
| 2 | Non-empty quotes found **verbatim** in the inventory | 242/242 | 245/245 | 314/314 | 294/294 |
| 2 | Quotes inside the entry's **own** field record | 242/242 | 245/245 | 312/314 (m3) | 294/294 |
| 3 | `savedRuns` test, using the same filter and predicate as sources.ts 207–221: it is the only candidate, valid, and `sameDraftInputs` is true against today's 128k job, so Replay picks it | picked | picked | picked | picked |
| 4 | `check_queue_tx.ts 4459 rev_qtx4` | 8/8 PASS, 98 s, together with the others ||||
| 5 | No key, `x-api-key`, `anthropic-version`, `headers`, bearer or e-mail. The 5 "authorization" hits in IMM 1294 are form text ("worked without authorization"). Push guard `clean` over `7180f4d5..298a472d` | clean | clean | clean | clean |
| 5 | Stub pass: `hasStubPass` ok at this commit (code SHA and screening sources current); `path_code_sha256` = the live run's; job id matches; made before the live start; screening sources = the run's digest sources | ok | ok | ok | ok |

**(1) Ledger.** Each run has exactly one reserve and one settle, `"ok"`, caller `paid`, at worst cases of US$3.392244, 3.488556, 3.215308 and 4.347848 (each under US$5).

**(2) The two explanations in the PR.**
* **IMM 0008's four entries without a quote are correct.** AdultFlag, Age, PrevAge and FormVersion have `presence: invisible`, caption `""` and heading null in the inventory. An empty string is the only exact copy available. The schema requires a string, not a non-empty one, and each entry gives a plain reason.
* **IMM 5532's count explanation is wrong in its numbers, and the duplicates are not harmless.** See **M1** and **m1**.

**(4) The test.** The `check_queue_tx.ts` change stays exact:
* it names the 14 files;
* it asserts siblings = SAVED − IMM 5707;
* it never uses `>=`.

My run gave `replayed 14`, `proposals_waiting 497` and `waiting_for_draft_with_ai []`, with 5532 putting 43 proposals on the queue. The ledger did not change.

**(6) Costs match the ledger exactly.**
* **Per run:** US$1.528012, 1.581800, 1.550768 and 2.201624, a total of US$6.862204.
* **Day totals before each run:** US$1.884156, 3.412168, 4.993968 and 6.544736. The day stood at US$8.746360 after the last settle (12:55:48Z).
* **R-146 total:** batch 1 US$1.379724 + batch 2 = US$8.241928.

The ledger now shows US$9.12 for the day. The extra comes from later, unrelated `studio-pqr-picks`/`qd-conditions` runs, not from this PR.

**Other checks.**
* **Canary digest:** the committed `canary-digest.json` (SHA-256 `f51651b1…`, made 12:47:31.879Z) is the one the last launch (IMM 0008) recorded in its screening evidence.
* **Merge:** the PR merges cleanly onto current `main`. Since the merge base, `main` has changed only studio engine/api files and no p2 path-code, job, prompt, contract or inventory file, so the stub gate still holds after the merge.
* **CI:** shards 1–4 were still **pending** when I finished.

## Blocker

None.

## Major

**M1. IMM 5532's saved answer replays, but its draft can never be applied: Apply always fails with a misleading "duplicate" error.**

* **The inventory problem.** `p1/inventory/imm5532e.inventory.json` gives one data path to separate boxes in unnamed subforms (`#subform[n]` is dropped from the path):
  * `page1[0].yesNo[0]` covers 5 different yes/no groups;
  * `page1[0].lastLive[0]` covers 3 boxes ("When did you last live in Canada?", "Where", "…explain why");
  * the 18 cells of `Table2` Rows 1–3 each cover the sponsor's table and the principal applicant's table (`#subform[3]` and `#subform[4]`).

  In all, 44 entries share 20 paths. The AI saw the clash: all 44 are `unresolved`, and 34 of them say so ("Data path shared by sponsor's and principal applicant's previous-partner table; values would collide"). So no wrong fact is proposed.
* **Why Apply fails.** `sources.ts apply` (826) writes `out.entries` with one `createMany`. Nothing removes duplicates (`checkedOutput` and `checkFieldMapOutput` do not), and `form_field_map` is unique on `(form_edition_id, data_path, version)`.
* **What I saw on the isolated copy.**
  * I loaded the six, returned all 43 IMM 5532 proposals as the second person, and pressed Apply as the author.
  * **409, "Already in progress or already exists: the database refused a duplicate. Refresh to see the current state."** No row was written and the job stayed COMPLETED.
  * The same steps on IMM 5710 gave **201, 242 boxes, APPLIED**. The method works; the 5532 data is what fails.
* **Why this matters now.** Before this PR, IMM 5532 sat in "waiting for Draft with AI". From this PR on, "Load sample six" puts 43 proposals on the review queue that a person can decide in full and then never apply, and the message tells them to refresh, which does not help. That breaks "`main` always works" for a form in the sample, and the PR body calls it "expected".
* **Fix (the tech lead's choice; do not loosen the unique key):**
  * **(a)** Take the IMM 5532 run (and its stub pass, if it is no longer needed) out of this PR, and set `check_queue_tx.ts` back to the 13 forms. Then raise a row to fix the inventory's data paths for unnamed subforms (`p1/xfa_inventory.py`). That fix gives a new inventory SHA, so 5532 needs a new paid run of about US$1.55 later. Or:
  * **(b)** Merge first a small fix with a test, so that a draft with shared data paths either applies correctly (one box per real box, which needs the inventory fix anyway) or is refused before review, with a plain reason. Then keep 5532 here.

  Either way, add an assertion that every replayed draft of the six can be applied (or that 5532 is not among them). Then this cannot come back unseen.

## Minors (none blocks on its own)

* **m1. The IMM 5532 numbers in the PR body are off.**
  * The body says "24 data paths twice (315 entries, 291 unique)". The real figures: 20 paths are shared by 44 entries (5 + 3 + 18 × 2), which is 24 extra entries and 290 unique paths. The 315th inventory record has no data path ("Date (YYYY-MM-DD)", `data_path: null`).
  * "Both expected" should not be said of 5532 (M1).
  * The body should also say that IMM 5532's 173 unresolved entries include the 44 on shared paths.
* **m2. Carried over from batch 1 (my m1 and m2 on #502), still open; launcher rows, not this PR.**
  * `launch_evidence.isolation.entry_script` and `launch_evidence.ledger.file` are absolute `/Users/<account>/…` paths. They now also include the worktree path.
  * The attempt records still carry no `stop_reason`.
  * runner.ts 78 also writes `"ok"` when `stop_reason` is `undefined`, so "settled ok, which the runner writes only on end_turn" is slightly too strong. For the live route, runner.ts 150 always sets it, so these four runs are fine.
* **m3. Two IMM 5532 `mapped` quotes come from the follow-up line, not the box's own caption.**
  * `yesNo[3]` quotes "If yes, who introduced you?" and `yesNo[5]` quotes "If yes, how long have you been cohabiting…".
  * Both are verbatim in the inventory and the prompt allows heading text.
  * These are for the reviewing person in the queue, not for a fix here.
* **m4. CI was pending on this head when I finished.** Approval stands only with green CI on `298a472d`, or on a new head after M1 is fixed.

## Verdict

**Verdict: Block.** Changes requested. The four runs pass the data checks (1)–(3), (5) and (6), and the test (4) is exact and passes 8/8. To fix before the `review: approved` label:

1. **M1:** IMM 5532's replayed draft must not be offered as a Saved answer whose Apply always fails. Use option (a) or (b) above, with an assertion that the six's replayed drafts can be applied.
2. **m1:** correct the IMM 5532 counts and wording in the PR body.

A re-review needs only three things:
* the changed files;
* the Apply result for the drafts that replay;
* green CI on the new head.

The IMM 5710, 1294 and 0008 run files need no change.

Commit reviewed: `298a472d0d928e273964dc0126bef4ebcd81538d`.
