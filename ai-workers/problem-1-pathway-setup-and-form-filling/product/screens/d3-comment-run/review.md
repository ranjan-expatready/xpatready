# Review: D3 comment-triggered runs (P-506), PR #1658 at `9e65ab0f0`

Independent reviewer, 12 Nov 2026. This is not a screen: it is a CI security change on a public repository. There is no UI walk, and the D-dimensions that do not apply say "n/a". **Commit reviewed: `9e65ab0f083af839170a9da582b649eaf41606c6` only.** While I was reviewing, the branch moved to `3becb50a2` (reverts the `next` skill edit) and then `483367d61` (break-report fixes). I did not review those commits. I read the commit as `git archive 9e65ab0f0` in a scratch copy because the shared working tree was moved while I worked.

## What I ran (exit codes)
* `bash product/tools/check-comment-run.sh` at 9e65: **86 passed, 0 failed, rc 0**. The PR body says 83.
* The same test with both steps run as GitHub runs them (`bash --noprofile --norc -eo pipefail`, scratch copy): 86/86. The two `--jq` expressions checked by hand with jq: empty list → empty, null conclusion → `none`, TSV split correct.
* `python3 product/tools/write-token.py`: **8 workflows, 0 findings**, rc 0.
* `check-guards.sh --mutate`: all **9 "guard 12" mutations go red**. `check-isolated-ttl.sh` fails here only because this machine has no demo database ("start the demo database first"); this PR does not touch it. On GitHub, run 43259724297 (guards, 9e65): the test step succeeded, and then the run was cancelled by the next push.
* Extra parser cases (scratch): BOM, tab, `/RERUN`, U+2028, Arabic-Indic digit → refused. 8 copies of the same id → one id. `C07.3 C7.3 C00.00` → **accepted** as 3 ids (m4).
* GitHub, read only: the repository is owned by a **User** account, default branch `main`. The last 40 PR comments: the cloud lanes' comments (via the claude app) carry `author_association` **OWNER**, `mergify[bot]` is CONTRIBUTOR and `github-actions[bot]` is NONE. So the gate admits the intended users and no bot.

## The ruling's requirements
| Requirement | Result |
|---|---|
| `issue_comment` (created) only; main's copy of the file runs | Met. The shape test checks it. issue_comment always runs the default branch's file, so the PR cannot change the gate it is judged by. |
| Acts only on a PR comment by OWNER/MEMBER/COLLABORATOR | Met. The job `if` and the parser both check it; 9 association values tested; mutations `who` and `if`. |
| First line exactly `/run nightly <caps> [data]` or `/rerun failed` | Met. Trailing spaces and CR are tolerated; anything else is refused. Leading-zero ids pass (m4). |
| Inputs allow-listed; comment only through env; no `${{ }}` in `run:` | Met. Step 2 re-checks the values; `GITHUB_OUTPUT` can only receive validated values or fixed reasons. |
| Never checks out or runs PR code | Met. No `uses:` at all. |
| Least permissions | Met. `actions: write` + `pull-requests: write`, no job override. |
| `/rerun failed` = failed jobs of **the PR's** newest ci run, never cancel | **Not met under input from another PR** (M2). |
| Reply with the run link or the refusal reason | **Not always**: a command can be dropped silently (M1), the link can point to another run (m1), and an oversized comment gets no reply (m3). |
| Pure test, pass and fail cases | Met: 86 checks and 9 mutations. Gaps listed in m6. |

GitHub semantics relied on, from knowledge (not live-tested): `pull-requests: write` suffices for `POST /issues/{n}/comments` on a PR (Issues *or* Pull requests write; ci.yml's `retry-comment` relies on it); a GITHUB_TOKEN `workflow_dispatch` does create a run (the documented exception), with `actions: write`; `rerun-failed-jobs` needs only `actions: write`; `gh api -X GET -f k=v` builds the query string and `-f 'inputs[x]=v'` a nested body; `LC_ALL=C` set in the script applies at once to `[[ =~ ]]`.

I found nothing that would make the first real use fail. The first real use can only happen after merge, because issue_comment reads main's copy.

## Findings (ranked)
**M1. Major: any comment on the PR can silently cancel a member's queued command.**
* Where: `comment-run.yml:26-29`. `concurrency` is set at **workflow** level, so every `issue_comment` run joins `comment-run-<n>` before the job's `if` skips it. That includes runs for an outsider's or Mergify's comment.
* What happens: GitHub keeps one running and one pending run per group, and a newer pending run cancels the older one even with `cancel-in-progress: false`. A member's command waiting behind another command is dropped by the next comment of any kind. No reply is posted, which contradicts line 26, "none cancelled". An outsider on this public repository can cause it.
* Evidence: reasoned from GitHub's documented concurrency behaviour; not live-tested. I found this independently, and the qa break report (same folder) reports it as its M1.
* Fix: drop the group. A second `/rerun failed` is already refused because the run is no longer `completed`. Or move the group to the job, where a skipped job does not enter it.

**M2. Major: `/rerun failed` can act on another PR's run, and an outsider can block it.**
* Where: `comment-run.yml:95`. The run is chosen by `head_sha` + `event=pull_request` + `per_page=1`, with no filter on the PR, branch or `head_repository`. ci.yml:191 already filters on `head_repository` for this reason.
* What happens: anyone can push the member's public head commit to a fork and open a PR.
  * If that fork run is awaiting approval (`action_required`), every `/rerun failed` on the member's PR is refused indefinitely.
  * If the fork run was approved and failed, the member's command re-runs the outsider's run and links it, while the member's own check stays red. The token does not widen.
* Fix: add `branch=<PR head ref>` and select `head_repository.full_name == REPO` (or the PR number in `.pull_requests`).

**m1. Minor: the reply can link someone else's nightly run** (`:82`, `:88`).
The lookup takes the newest `workflow_dispatch` run created since **60 s before** the dispatch, so another lane's or the tech lead's dispatch in that minute is returned by the first poll, before this command's run appears. I do not accept the builder's Q3 "accept" as stated: the window is a minute, and lanes on different PRs run in parallel. Fix: note the newest run id before dispatching and accept only a newer one; if more than one appears, link nightly's page.

**m2. Minor: trimming is quadratic, and the length check runs after it** (`:49-50`). `/run x` followed by 60,000 spaces took **27.2 s** to parse here, then got "not a known command". Members only, and within the 5-minute timeout. Fix: check the length first.

**m3. Minor: an oversized multibyte comment gets no reply.** A first line `/rerun failed` followed by 40,000 emoji is 160 kB in `BODY`. Here `bash` gives "Argument list too long", rc 126, so step p cannot start and step 2 is skipped. Members only. Fix: an `if: failure()` step that posts a fixed refusal, or a clearer job summary.

**m4. Minor: leading-zero ids pass.** `C07.3 C7.3 C00.00` → 3 ids. gate-b.mjs:488 names packs `C\d{1,2}\.\d{1,2}`, so `C07.3` and `C00.00` start machines that find no pack, yet the reply says "started". Fix: `C[1-9][0-9]?\.[1-9][0-9]?`.

**m5. Minor: STANDARDS §1 gate record incomplete.** P-506 says this lands through the §1 gate. The PR body gives the problem, cost and security, but not the options weighed (Lead relay; `pull_request: labeled`; a stored PAT or App secret) or when to reconsider (cloud lanes get Actions write; the repository goes private or moves to an organisation, which changes what MEMBER and COLLABORATOR mean). Fix: add these 5 lines to the PR body. The tech lead's read of the diff is still owed: this review does not replace it.

**m6. Minor: test fidelity.**
`check-comment-run.sh:66,:119` run the steps with plain `bash`, not `-eo pipefail` (I re-ran with it: no difference); the stand-in `gh` ignores `--jq`; no case for concurrency (M1), another PR's run (M2) or two dispatches in a minute (m1); the PR body's "83 checks" and missing `--mutate` result are stale.

## The builder's deviations and questions
* **`fixture` refused:** agree. nightly.yml's `data` input is `type: choice` with only `six` and `checkpoint`, so a dispatch with `fixture` would get HTTP 422. A pack with no run on the chosen data already falls back to its fixture (nightly.yml header).
* **No reply to outsiders:** agree. The ruling acts only on members' comments, and a reply would let anyone make the repository post. Members do get reasons.
* **1 to 8 capabilities:** agree. The ruling's syntax names capabilities; the full set stays with the schedule and the tech lead.
* **Q1 (not a merge condition):** agree for now. `guards` is not in `.mergify.yml`. Because a weakened gate goes live the moment main's copy changes, add `check-comment-run.sh` to ci's part-1 list in the next ci.yml PR (the tech lead's call).
* **Q2 (COLLABORATOR):** keep. The repository is user-owned, and collaborators on a personal repository always have write access. MEMBER cannot occur. Revisit if the repository moves to an organisation (m5).
* **Q3:** see m1.

## D1–D20 (scale 1–5; n/a where there is no UI)
| D | Score / evidence |
|---|---|
| D1 Requirement fit | 3. All ruled parts are present; "PR's newest run" and "always replies" fail under M1/M2. |
| D2 Data integrity | 3. Inputs exact and re-checked; the run selection can target another PR (M2). |
| D3 Reuse | 4. Reuses nightly.yml's inputs and ci.yml's run; the head_repository filter in ci.yml:191 is not reused (M2). |
| D4 Rule integrity | 4. Allow-list closed (injection cases refused); leading zeros slip through (m4). |
| D5 Stability and recovery | 3. In-progress runs are refused, not cancelled; a queued command can be lost (M1); m3. |
| D6 Freshness and governance | 4. Header cites P-506, P-371 and P-439; §1 record incomplete (m5). |
| D7 AI trust | n/a |
| D8 Orientation | n/a |
| D9 Flow | 4. Every refusal names the next step ("re-run once it ends", the usage line). |
| D10 Language | 4. Plain replies; the usage refusal is one long sentence. |
| D11 Feedback and state | 3. A reply in every handled path; a silent drop (M1), no reply on m3, a possibly wrong link (m1). |
| D12–D14 Visual, accessibility, team look | n/a (no UI; the replies are plain Markdown) |
| D15 Speed | 4. Reply in ~1–35 s; the pathological trim takes 27 s (m2). |
| D16 Testability | 4. 86 checks plus 9 mutations, all red when switched off; gaps in m6. |
| D17 First use | simulated only |
| D18 Provenance | 4. Every reply links the run that made it; m1 can mislabel. |
| D19 End-to-end closure | 4. Comment → dispatch or re-run → reply, simulated with a stand-in `gh` only. |
| D20 Pain solved | simulated only (removes the Lead relay: median 0.64 h, worst 15.3 h) |

## Journey test (reviewer; adapted: the workflow's own scripts with a stand-in `gh`, no live GitHub)
Persona: a cloud builder lane (OWNER through the claude app); also an outsider and a second lane.

Journeys: (1) `/run nightly C7.3` pass · (2) `/run nightly C11.10 C5.4 checkpoint` pass · (3) `/rerun failed` on a finished red run pass · (4) typo `/run nightly C7` → usage line, pass · (5) outsider posts the same command → nothing runs, no reply, pass · (6) `/rerun failed` while running → refused "once it ends", pass · (7) injection (`$(…)`, backticks, `\r`, `${{ }}`) → refused, nothing ran or echoed, pass · (8) two commands plus an unrelated comment → middle one lost silently (M1), fail (reasoned) · (9) fork PR with the same head → `/rerun failed` blocked or mistargeted (M2), fail (reasoned) · (10) two lanes dispatch within a minute → link can be wrong (m1), partly.

**Score** (accessibility and visual quality n/a; 8 criteria): task 1 · next step 1 · words 1 · feedback ½ · data ½ · recovery ½ · speed 1 · trust ½ = **6/8 = 7.5/10**, below the pass of 8; no 0. Raise it by fixing M1 (feedback), M2 (data, recovery) and m1 (trust).

**Not checked:** live GitHub behaviour (no API test runs from here); commits `3becb50a2` and `483367d61`; the tech lead's diff read; an intended user's unaided use (D17, D20).

**To fix:** M1 (concurrency group dropped, or moved to the job); M2 (the re-run chooses this PR's run by branch and head_repository). The Minors are for the builder to fix or record. Re-review is needed on the new head.

Verdict: Changes requested

## Re-review cb8d8f0 (diff `9e65ab0f0..cb8d8f0f3` only)
Reviewed `cb8d8f0f3355fe7f199de23f394207bad0fe07d3` as `git archive` in a scratch copy. The shared tree moved on during the re-review to `6c77039e3` (re-break fixes in comment-run.yml); that commit is **not** reviewed here and needs its own Approve before the label.
**Run (exit codes):**
* `check-comment-run.sh` → **102 passed, 0 failed**, rc 0; both scripts run as `bash --noprofile --norc -eo pipefail`, the stand-in `gh` applies the real `--jq` through jq.
* `write-token.py` → 8 workflows, 0 findings.
* `check-guards.sh --mutate` → all **12 "guard 12" mutations go red**, including `queue`, `fork` and `link`. In my partial scratch copy, unrelated tests fail for missing files; in the full tree, only `check-isolated-ttl.sh` fails, for the missing demo database as before.

**The earlier findings:**
* **M1, fixed.** No `concurrency` at workflow or job level; the shape check plus mutation `queue` guard it. A second `/rerun failed` on the same run finds it no longer `completed` and is refused with a reason.
* **M2, fixed.** The PR's `head.sha`, `head.repo.full_name` and `head.ref` are read, and the newest ci run with matching `head_repository.full_name` and `head_branch` is selected. The fork and other-branch cases have tests, plus mutation `fork`. Residuals are r1 and r2.
* **m1, fixed.** The run is matched by `display_title == "nightly · PR #<n> comment <id>"` (unique per comment; both numbers validated as digits), with the nightly page as fallback.
* **m2, fixed.** Lines over 200 characters are refused before trimming; 65,000 spaces now take 0.04 s. Trailing spaces up to 200 are still trimmed and accepted.
* **m3, fixed.** Step `oops` posts a fixed text (no comment text).
* **m4, fixed.** Ids use `C[1-9][0-9]?\.[1-9][0-9]?`: `C07.3` refused, `C10.1 C7.30` accepted.
* **m5, fixed.** The PR body now has the §1 record: problem, four options, upkeep, cost, data, and when to reconsider (including the move to an organisation).
* **m6, fixed** (see the run above).

**The three things to check:**
1. **nightly.yml `run-name` (`:29`).** `inputs.request && format('nightly · {0}', inputs.request) || 'nightly'`. `run-name` accepts the `github` and `inputs` contexts.
   * On the schedule, `inputs` is empty, so `inputs.request` is null and the name is `nightly`.
   * When started by hand with the default `""`, the empty string is falsy, so the name is `nightly`.
   * When comment-run dispatches it, the name is `nightly · PR #n comment id`.
   * The value is display only and reaches no `run:`. Nothing in the repository reads nightly's `display_title`; I grepped tools and workflows.
   * The new input and its use land in the same PR, so main never receives a dispatch for an input it lacks.
2. **gojq `env.TAG` / `env.HREPO` in `gh --jq` (verified live, read-only call, gh 2.89.0).** `TAG='PR #7 comment 1' HREPO=a/b gh api repos/<repo> --jq '[env.TAG, env.HREPO, ("nightly · " + env.TAG)]'` printed both values. Under `LC_ALL=C`, `("nightly · " + env.TAG) == "nightly · PR #7 comment 1"` → `true`, so the C locale does not break the `·` match. `TAG` is exported; `HREPO` and `HREF` are given as a prefix to `gh`.
3. **`oops` cannot double-reply.** Its `if` is `failure() && steps.p.outcome == 'failure'`.
   * If `p` fails, `act` is skipped (implicit `success()`), so `oops` posts the only reply; `p` holds no token and never posts.
   * If `p` succeeds and `act` fails after its own reply, `p.outcome` is `success`, so `oops` does not run.
   * A job cancelled or timed out gets no reply. That is acceptable: the run page shows it.

**Remaining (all Minor; none blocks):**
* **r1. 30 runs per page, branch filter only in jq** (`comment-run.yml:105`). More than 30 newer runs on the same commit from other forks or branches push this PR's run off the page, and the reply wrongly says "no ci run". An outsider would need 30+ fork PRs. 6c77039 says it adds `branch=` on GitHub's side and 100 per page.
* **r2. A tab-separated read collapses an empty field** (`:103`). For a deleted fork, `head.repo` is null, the fields shift, and the result is still a safe refusal ("could not read the PR's head"). 6c77039 says it switches to `:`.
* **r3.** The >200 refusal says "longer than 120 characters". True but imprecise; 6c77039 says it fixed this.

**D-scores changed:**
| D | Score / evidence |
|---|---|
| D1 Requirement fit | 4: every ruled requirement met. |
| D2 Data integrity | 4: this PR's run only. |
| D5 Stability and recovery | 4: nothing cancels a command; fixed reply on a crash. |
| D11 Feedback and state | 4: a reply in every handled path, with its own link. |
| D16 Testability | 5: 102 checks, 12 mutations, run as GitHub does. |
| D18 Provenance | 5: the reply links exactly its run. |

D17 and D20 stay "simulated only". The rest are unchanged.

**Journey test (re-scored; same 10 journeys, the workflow's own scripts with the stand-in `gh`):**
* Journeys 1–7 pass as before.
* (8) Two commands plus an unrelated comment: no group, so nothing is cancelled. Pass.
* (9) A fork PR on the same head: this PR's run is chosen; a newer fork run is ignored. Pass. Residual r1 needs 30+ fork PRs.
* (10) Two lanes dispatch within a minute: each reply links its own run by title. Pass.
* **Score** (8 applicable criteria): task 1 · next step 1 · words 1 · feedback 1 · data 1 · recovery 1 · speed 1 · trust 1 = **8/8 = 10/10**, pass, no 0.

**Not checked:** live GitHub runs; commit `6c77039e3`; the tech lead's diff read (still owed per P-506).

Verdict: Approve
