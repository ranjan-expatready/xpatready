# Review: PR #502, R-146 saved field maps 1 (IMM 5604, 5562, 5406, 5646)

* **Commit reviewed:** `85d30cfbf157d5445527db73057a73fe7f8c1d02` (branch `claude/paid-runner-r146-saved-maps-1`), detached checkout.
* **Kind:** saved AI results (P-227). No product code and no screen, so there is no journey score.
* **Reviewer:** the reviewer agent. I did not build this. It cost US$0: no `--live`, no `*_LIVE` variable and no network call to a model.
* **Method:** my own Node 24 scripts, written outside the checkout:
  * a re-check of every run file against its job, inventory, prompt and schema, using the contracts' Ajv;
  * a copy of the exact commit made with `git archive` (`scratchpad/sim`), where I ran the studio's own `checkedOutput`, `sameDraftInputs`, `failedOurCheck` and `p2/pathcode.ts hasStubPass` with the commit's code.

  I also read the shared ledger (read only), ran the push guard over the PR's range, and read the CI logs of this commit.

## Results of the five checks

| # | Check | IMM 5604 | IMM 5562 | IMM 5406 | IMM 5646 |
|---|---|---|---|---|---|
| 1 | `contract_valid` true, `contract_errors`/`output_errors` null; drafting-run v0 and field-map-output v2 schemas re-validated by me | yes | yes | yes | yes |
| 1 | Status | completed_with_unresolved | completed | completed_with_unresolved | completed_with_unresolved |
| 1 | Untruncated: one attempt, ledger settle `"ok"` (not `ok_stop_max_tokens`, runner.ts 78), output tokens far under the 64k limit, raw output parses and closes, `output_sha256` = SHA-256 of `raw_output` | 4,643 tokens | 8,671 | 14,456 | 27,193 |
| 1 | Input SHA-256 in the run = job = SHA-256 of the committed inventory file; `admitted` is the same file | yes | yes | yes | yes |
| 1 | Edition read = `known.form_edition` = `launch_evidence.known`, every converted entry the same; `edition_note` null | 02-2023 | 07-2024 | 05-2026 | 01-2023 |
| 1 | `form_sha256` of every entry = inventory `summary.sha256` = SHA-256 of the committed official PDF | yes | yes | yes | yes |
| 1 | Template, schema and settings hashes = today's prompt, schema and job (`sameDraftInputs` true) | yes | yes | yes | yes |
| 1 | Fields: inventory / answer / unique / converted; missing 0, outside 0 | 19/19/19/19 | 27/27/27/27 | 50/50/50/50 | 136/136/136/136 |
| 1 | Mapped · unresolved · never filled (raw = after `checkedOutput`) | 2 · 9 · 8 | 25 · 0 · 2 | 46 · 2 · 2 | 62 · 30 · 44 |
| 2 | Quotes found, ignoring case and spacing (the PR's re-check also gives these) | 19/19 | 27/27 | 50/50 | 136/136 |
| 2 | Quotes found **verbatim** (case and spacing kept) anywhere in the inventory | 19/19 | 27/27 | 50/50 | 136/136 |
| 2 | Quotes found inside the entry's **own** field record (caption or heading) | 19/19 | 8/27 | 43/50 | 136/136 |
| 3 | `savedRuns` test (same filter and predicate as sources.ts 207–221): the only candidate for its job, valid, so the Replay plan (ai.ts 135–141) picks it | picked | picked | picked | picked |
| 4 | No API key, `x-api-key`, `authorization`, `anthropic-version`, `headers`, bearer or e-mail in any run file; push guard `clean` over `1264703..85d30cf` | clean | clean | clean | clean |
| 5 | Stub pass: `hasStubPass` ok at this commit (code SHA and screening sources current), `path_code_sha256` = the live run's, job id matches, made before the live start, screening sources = the live run's digest sources | ok | ok | ok | ok |

Costs match the ledger exactly: US$0.124368, 0.226972, 0.364056 and 0.664328 (total US$1.38). Each was reserved per attempt at US$1.36 to 1.55.

The committed `canary-digest.json` is the one the last launch (IMM 5646) wrote: its file SHA-256 `fad2c3b0…` and nonce `63fd3c0d…` equal that run's screening record. It holds only salted hashes and lengths.

All 9 files are in `p2/runs/`, `p2/runs/stub-pass/` and `p2/screening/`, as expected. The stub run files are not committed, which `.gitignore` line 30 requires. The PR merges cleanly onto current `main` (`git merge-tree`). `main` has not touched p2 code, jobs, prompts, contracts, expected or inventories since the merge base, so the stub gate still holds after the merge.

The R-146 128k change (#501 / `ce05d8c0`) applies only from 240 fields. All four forms are below that (19 to 136), so their jobs stay at 64k and these runs keep matching after #501 merges.

## Blocker

**B1. CI is red on this commit, and the cause is this PR's data.** Shard (3) of run 41428766723 failed (job 125221744548) in `prototype/studio/tests/check_queue_tx.ts`: 6 passed, 2 failed.

* `C11.7 pass (queue transaction room): all six saved field-map answers replay…` asserts `s1.length === 6 && a.body.drafts.replayed === 6`. With these four runs, "Load sample six" now replays **10** saved answers. The log lists imm1344e, 5257_1e, **5406e**, 5409e, 5475e, 5476e, **5562e**, **5604e**, **5646e** and 5707e, all COMPLETED.
* `C11.7 fail: its five siblings still complete…` asserts `rest.length === 5`, and there are now 9.

The data is sound: all ten complete with their proposals. The test's constant is what is now out of date. Even so, the merge guard (WAY-OF-WORKING: "no merge without green CI") and "`main` always works" mean this cannot merge as it is. Neither qa's PASS nor the tech lead's check covers it: CI finished at 10:48 UTC.

**Fix.** Update `check_queue_tx.ts` in this PR, or in a small PR merged first, so that it expects the forms of the six that have a valid saved run. Do not loosen it to `>= 6`: the test exists to catch a replay **lost** under load (the IMM 5257 Schedule 1 and IMM 5707 loss).

* Name the expected set: the ten files above. Or take it from the REPLAY plan's `reuse_saved_output` targets before launch, and assert that every one of them completes.
* Assert siblings = expected − 1.

Then rerun shard (3) to green. Check that the step timings still sit well inside the 60 s room: the suite took 102 s with ten replays. The other suites that count replays use `>= 6` (check_d1_reset_to_six, check_qa145_clean_clone, check_s7_load) and passed in shards 1, 2 and 4.

## Majors

None.

## Minors (follow-up rows; none blocks)

* **m1. The OS user name is in committed run files (already the case before this PR).** `launch_evidence.isolation.entry_script` and `launch_evidence.ledger.file` are absolute Mac paths under `/Users/<account>/…`. All 262 committed run files carry them, and the push guard's name list does not catch them. Under AGENTS.md rule 5 the launcher should record these paths relative to the repository root, or `.tools/…`. That is a launcher change, not a change to this PR.
* **m2. The stop reason is not kept in the run record.** `p2/launch.ts` 140 copies each attempt without `stop_reason`. "Untruncated" can therefore be proved only indirectly: the status would be `invalid_output` on max_tokens (launch.ts 124), the ledger settle is `"ok"`, the token counts are far under the limit, and the JSON closes and validates. Recording `stop_reason` on each attempt would make check (1) direct. That is also a launcher change.
* **m3. Some evidence is a section heading, not the box's own caption.** In IMM 5562, 19 of 27 quotes are row-group headings ("a) You", "b) Your spouse…", ") Your dependent child 18 years old or older"). In IMM 5406, 7 of 50 are "SPOUSE, COMMON-LAW PARTNER OR CONJUGAL PARTNER".
  * The prompt allows this ("caption or heading text"), and every quote is verbatim. These quotes say whose row it is, not what the box is.
  * Some IMM 5562 drafts need a reviewer's eye in the queue:
    * The "did not travel" check boxes are mapped to `person.trip_from_date` with a `derive_no_trips` transform.
    * The "Family name and given names" boxes are mapped to `person.family_name` with a concat transform.

  These are AI proposals that a person reviews, as designed. They are listed for qa and for the reviewing person, not for a fix here.
* **m4. A wording error in the PR text.** Once B1 is fixed, the PR body should say that "Load sample six" now replays 10 saved field-map answers, not 6, so the demo's proposal count is not a surprise. The D1 and S7 suites already allow more than 6.

## Verdict

**Verdict: Block.** Changes requested. The four saved runs pass every data check above (1 to 5). The one item to fix before the `review: approved` label is:

1. **B1:** update `check_queue_tx.ts` to the ten forms that now replay, keeping it able to catch a lost replay, and bring CI shard (3) to green on the new head.

After that, a re-review only needs to confirm that CI is green and that the run files are unchanged on the new head. Commit reviewed: `85d30cfbf157d5445527db73057a73fe7f8c1d02`.
