# Break report: PR #1658 (D3 comment-run) at 9e65ab0f0

Target: `.github/workflows/comment-run.yml` and `product/tools/check-comment-run.sh`. Method: the PR's test (86 passed, 0 failed); both `run:` scripts pulled out of the YAML with python3 + yaml and run in a scratch dir the way GitHub runs them (`bash --noprofile --norc -eo pipefail`), with a stand-in `gh` that logs every call; GitHub's behaviour worked out from its documented rules where it cannot be tested offline (marked "reasoned"). No file edited but this one.

## Findings

**M1. Major: any comment on the PR, including an outsider's or a bot's, can silently cancel a member's queued command (reasoned).** `concurrency:` is set at workflow level (comment-run.yml:27-29), so GitHub applies it to the whole run before it evaluates the job's `if:`. Every `issue_comment` on the PR starts a run, and that run joins `comment-run-<n>` even though its job will be skipped. GitHub keeps one running and one pending run per group: a newly queued run cancels the pending one, even with `cancel-in-progress: false`. Input: member A posts `/run nightly C7.3`. That run is in progress for up to about 40 s (dispatch, 10 polls × 3 s, reply). Member B posts `/rerun failed`, which waits as pending. Within that window anyone posts `lgtm` (an outsider, or mergify[bot], whose app token does start workflows). Result: B's run is cancelled before its job starts. B gets no reply, and the only trace is a cancelled run on the Actions page. This also happens with no attacker: three member commands in a row lose the middle one. It contradicts the file's own line 26, "One command at a time per PR, none cancelled (P-371)". The test does not check concurrency at all.

**M2. Major: `/rerun failed` can act on another PR's ci run (an outsider's fork PR with the same commit).** comment-run.yml:95-96 picks "the newest" run with `ci.yml/runs?head_sha=<head>&event=pull_request&per_page=1`. It filters on neither the PR number nor `head_repository`. ci.yml:191 already adds `select(.head_repository.full_name == "$GITHUB_REPOSITORY")` for exactly this reason. Input: an outsider pushes the member's public head commit to a fork and opens a PR, which creates a ci run for the same `head_sha`. Then a member posts `/rerun failed` on their own PR. Result, case (a): the fork run is awaiting approval (`action_required`, or status `waiting`), so the member's command is refused. The outsider can keep this up with no approval from anyone, which blocks `/rerun` on that PR. Result, case (b): the fork run was approved and failed. The bot then re-runs the outsider's run instead of the member's and replies "re-running the failed parts of the newest ci run for <sha>: <the fork run's URL>", while the member's own red check stays red. The token does not widen (the fork run keeps its read-only token), but the stated rule ("the PR's newest ci run") does not hold.

**m1. Minor: the reply can link someone else's nightly run.** comment-run.yml:82-91 takes the newest `workflow_dispatch` run on main created since now−60 s. Input: two `/run nightly` commands on different PRs, or a hand-started run by the tech lead, within 60 s. A run takes a few seconds to appear in the list after the 204 response, so the first poll returns the other run. Result: "re-test of C7.3 …: <URL of the C5.4 run>". A reader may take the wrong run's verdict.

**m2. Minor: trimming a long command line is quadratic (members only).** comment-run.yml:49, `${line##*[! ]}`. Input: `/run x` followed by 65,000 spaces. Result: the parser takes 38.3 s before it refuses the line. During that time it holds the PR's concurrency group, which widens the M1 window. Trailing spaces after `/run ` ×65,000 a: 0.06 s; 65,000 blank lines: 0.02 s.

**m3. Minor: a very large multibyte comment stops step p without a reply (members only).** Input: `/rerun failed` on the first line, then 40,000 emoji below it (160 kB of UTF-8, under GitHub's 65,536-character limit counted by code point). The `BODY` env string is over Linux's 128 KiB limit for a single string (MAX_ARG_STRLEN), so the shell cannot start: `BODY="$b" bash -c …` gives "Argument list too long", rc 126. Step p fails, step 2 is skipped (implicit `success()`), and the job is red with no reply.

**m4. Minor: there is no rate limit or attempt cap (insider abuse, or a builder agent stuck in a loop).** `/run nightly` with 8 ids starts 8 machines for up to 30 minutes each. The only concurrency is per PR, and only for the seconds comment-run itself takes. Repeated comments can fill the account's limit on concurrent jobs and delay every PR's ci and the merge queue. `/rerun failed` can be repeated on a genuinely red run until a flaky test passes. Nothing checks `run_attempt` or enforces P-371's "only when the log shows no code cause", and a green re-run merges by itself.

**m5. Minor: the gate is author_association, not permission on this repository (conditional).** If the repository is owned by an organisation, `MEMBER` means any member of that organisation and `COLLABORATOR` includes outside collaborators with read access only. Both would get actions: write powers (dispatch, re-run) through this workflow. On a personal-account repository, collaborators always have write access, so this does not apply. The owner type could not be checked offline.

**m6. Minor: capability ids are checked for shape only.** Input: `/run nightly C07.3 C7.3 C00.00`. Result: `caps=C00.00 C07.3 C7.3`. The textual dedupe keeps both C07.3 and C7.3, so 3 machines start. gate-b.mjs:488 names pack files `C\d{1,2}\.\d{1,2}`, so `C07.3` and `C00.00` find no pack. Yet the reply says "started … re-test of C00.00 C07.3 C7.3".

**m7. Minor: GitHub's `startsWith` is case-insensitive, the parser is not.** Inputs from a member: `/Rerun failed`, `/RUN nightly C7.3`, `/rerunning once ci ends`. Each passes the job's `if:` and gets a "not a known command" reply on the PR. This is noise only; outsiders still get no reply.

**m8. Minor: the head can change between reading it and the re-run.** The head is read at line 94 and the re-run is posted at line 105, 1-2 s apart. Input: a push lands in that window on a **draft** PR. ci.yml:67 sets `cancel-in-progress: true` for drafts, so the old run coming back into the group cancels the new head's run. A ready PR is not affected: the old run waits.

**m9. Minor: what the test leaves out.** check-comment-run.sh:66 and :119 run the scripts with plain `bash`, not `-eo pipefail` as GitHub does. I re-ran every case with `-eo pipefail` and saw no difference. The test has no case for concurrency (M1), the run's head repository or PR (M2), or a second nightly dispatch inside the 60 s window (m1).

## What held
* **Outsiders cannot start anything.** A comment from NONE, CONTRIBUTOR, FIRST_TIME_CONTRIBUTOR, FIRST_TIMER, MANNEQUIN, `""`, `owner`, `OWNER ` or `OWNER\nMEMBER` is ignored with no reply, both by the job's `if:` and by the parser. A comment on an issue that is not a PR is ignored. "author_association: OWNER" written in the comment text does nothing. Edits never trigger (`types: [created]`).
* **The job's `if:` is correct.** In YAML it parses to `pr && contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), assoc) && (startsWith(..'/run ') || startsWith(..'/rerun'))`: the escaped quotes come out right, the top level is all ANDs, and the OR is inside parentheses.
* **No shell injection.** Tried: `$()`, backticks, `;`, `&&`, `|`, a `\r` in the middle of the line, `\r\r`, a tab, NBSP, Arabic-Indic and full-width digits, U+2024 (lookalike dot), Cyrillic С, `*`, `C*.3`, `${{ secrets.GITHUB_TOKEN }}` and a 65,000-character line. Each is refused or reduced to its validated first line. Nothing ran. The comment text reaches the script only as env.
* **No extra lines can be written to GITHUB_OUTPUT.** Tried: `\nreason=x\naction=nightly` below the command, `\r` with `caps=`, and a `<<` heredoc delimiter. GITHUB_OUTPUT only ever gets `action`, plus the validated `caps`/`data` or a fixed `reason`.
* **No argument injection into `gh api`.** Values go through `-f` (raw, never `@file`) as one argv element after a fixed prefix. `-XPUT`, `C7.3;id` and newlines in CAPS are refused by the second check at :81 before any dispatch.
* **Only nightly.yml, only on main.** Both are fixed strings. There is no way to ask for the full set (at least 1 id is required) or for any data value other than six or checkpoint.
* **The reply never repeats the comment and never @-mentions anyone.** Its text is fixed or comes from GitHub (a URL, a status, 7 characters of the sha) or from the validated CAPS.
* **No loop.** The reply is posted with GITHUB_TOKEN, which starts no workflow, and it begins with `**comment-run`.
* **`/rerun failed` only ever re-runs failed jobs.** It never cancels a run and never re-runs a whole run. It refuses a run that is in_progress, queued or waiting, and one that ended success, skipped, action_required or startup_failure. It refuses a run id that is not a number and a sha that is not 40 hex characters.
* **No write token reaches PR code.** Nothing is checked out and no action is used. The parser step holds no token. Re-running a fork's run uses that run's own read-only token. Every job in ci.yml is read-only.

Open Major or worse: 2

## Re-break cb8d8f0

Scope: `git diff 9e65ab0f0..cb8d8f0f3` (comment-run.yml, nightly.yml, check-comment-run.sh, check-guards.sh). The PR's test: 102 passed, 0 failed. write-token.py: 8 workflows, 0 findings. This time the second step and the new `oops` step were run with the **real** `gh` 2.89.0 (its own gojq for `--jq`, `env.X` included). It talked to a local TLS stand-in for the GitHub API (GH_HOST=localhost) that logs every request, so the query strings, the JSON bodies and the jq filters are GitHub's, not a re-implementation.

**Findings**
* **R1. Minor (what is left of M2): an outsider can still block `/rerun failed`, but can no longer mis-target it.** comment-run.yml:105-106 asks the server only for `head_sha` + `event=pull_request` + `per_page=30`; the head repository and branch are filtered client-side on page 1 only. Input: an outsider pushes the member's commit to a fork, opens a PR and closes and reopens it 30 times. Each `reopened` creates a ci run awaiting approval (`action_required`), with no approval needed from anyone. Stand-in result: page 1 holds 30 `attacker/r` runs, so the reply says "refused: no ci run for the head 0123456", rc 0, and nothing is re-run. Rated Minor, not Major: the wrong-run re-run is gone, and what remains is a deliberate, visible, attributable denial of a convenience command that falls back to the tech lead.
* **R2. Minor: the long-line refusal names the wrong limit.** comment-run.yml:49. Input: `/rerun failed` plus 188 trailing spaces (201 characters). Result: "refused: the command line is longer than 120 characters", although the command is 13 characters; 187 spaces pass. Only the message is wrong.
* **R3. Minor: no group now means parallel commands race (expected, noted).** Two members post `/rerun failed` within a second. Both see the run `completed`/`failure` and both POST `rerun-failed-jobs`. The second should be refused by GitHub (reasoned), and then gets the reply "could not re-run … Ask the tech lead" with a red job. The file says so (line 28). Nothing is cancelled.
* **Unchanged and not claimed as fixed:** m4 (no rate limit or attempt cap), m7 (case-insensitive `startsWith` gives members refusal noise), m8 (the head can change between reading it and the re-run, on drafts). m5 does not apply: the review read from GitHub that the repository is owned by a User account, where collaborators always have write access.

**The fixes, attacked; all held**
* **M1 is fixed.** There is no `concurrency` at workflow or job level (the test checks it, and there is a mutation `queue`), so another comment can no longer cancel a member's run.
* **M2 mis-targeting is fixed.**
  * Stand-in runs tried, newest first: `attacker/r` + the same branch (failure or action_required), a run with `head_repository: null`, then `o/r` + the branch. Real gh re-ran only `o/r`'s run 4.
  * A fork named like the base repository (`attacker/xpatready`) differs in owner, and owner logins are unique. The same branch name in a fork does not match `head_repository`.
  * **Deleted head repository (`head.repo: null`):** "could not read the PR's head", rc 1, no ci call. This holds by a narrow margin. With an empty middle field, `IFS=$'\t' read` collapses the two tabs, so `hrepo` takes the branch (`runtime/d3` even matches the owner/name regex) and `href` is empty. Only the `-n "$href"` test stops it.
  * **Renamed repository or renamed branch (reasoned):** both names are read live from GitHub. A stale name finds no run and is refused, so it fails closed.
* **m1 is fixed; the run link cannot be forged.**
  * The dispatch body is `{"inputs":{"capabilities":"C7.3 C5.4","data":"checkpoint","request":"PR #7 comment 123"},"ref":"main"}`.
  * The reply picks the run titled exactly `nightly · PR #7 comment 123` over `… comment 1234` and `… comment 123 ` (with a trailing space). `LC_ALL=C` does not break the `·` comparison.
  * **Who can dispatch nightly.yml:** only accounts with write access to the repository, and this workflow, which is the only one with `actions: write` (label-guard and records-label hold only `pull-requests: write`). Outsiders and fork-PR tokens cannot.
  * A fork PR that edits nightly.yml to add `on: pull_request` with a forged `run-name` makes runs with `event=pull_request`, which the `event=workflow_dispatch` filter drops.
  * A member forging a tag by hand is an insider, inside a 60 s window, and gains only a wrong link.
* **The `request` input is for display only.** Its only use is `run-name` (grep finds no other `inputs.request` and no `run:` use). `format()` substitutes the value literally, so a `{0}` inside it does nothing.
* **m2 is fixed.** 65,000 trailing spaces are refused in 0.05 s (was 38 s), and lines up to 200 characters are still trimmed.
* **m3 is fixed and `oops` neither double-replies nor echoes.**
  * `oops` runs only when `failure() && steps.p.outcome == 'failure'`. If `p` fails, `act` is skipped by its implicit `success()`; if `act` fails, `p` succeeded. So at most one reply is posted.
  * Its body is a fixed string, its env holds no comment text, and outsiders never reach the job.
  * Real gh posted exactly one fixed comment.
* **m6 is fixed.** `C07.3`, `C7.03` and `C0.0` are refused and `C10.10` passes. No capability id in qa/ or the pack files has a 0 part, so nothing legitimate is now refused.
* **No regression from the first report.** Every attack in "What held" still holds: outsider associations, the `if:`, shell and GITHUB_OUTPUT injection, `gh api` arguments, main + nightly.yml only, no echo or @-mention, no loop, failed jobs only, no write token reaching PR code. The new `COMMENT_ID` and `PR` are checked as numbers before they are used.

Open Major or worse: 0
