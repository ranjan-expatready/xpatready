# Review: gate B (PR #804, head 844094baa), CI tooling under P-214

The reviewer wrote this independently, 4 Nov 2026, about 08:20–09:10 IST. It covers the whole PR: `git diff origin/main...844094baa`, three files: `studio/tools/gate-b.mjs`, `studio/tools/check-gate-b.mjs`, `.github/workflows/ci.yml`. The TEMPORARY timing step (ci.yml:111-115) is not counted as a defect.

**Verdict: Block.** Two Majors are open. Both are false passes, and a false pass is the worst way a gate can fail.

## What I ran (US$0, no `*_LIVE` set, ports 4431–4432, never 4400)
* `check-gate-b.mjs`: **43 passed, 0 failed**. The real qa/BUGS.md on main has 77 open rows and each has a severity.
* `--plan` across **all 54 packs**: every run line is read, with no left-over port or database name, and the M3 setup is added where it is needed (C7.5, C11.6, C9.2 …).
* Real packs, `GATE_B_PORT=4431 GATE_B_NAME=b1r_gate GATE_B_JOBS=1`, against main's BUGS.md:
  * C11.13 "on the six": exit 0, 15/15, 46 s (copy 5 s, Reset to the six 37 s, run 5 s). Gate passed.
  * C11.12, two packs one after the other, 134 s: C11.12 20/20; C11.12-runtime red "on the six", so the gate refused (see m4).
* Part 1 on all 20 of main's open PRs: none is refused, because none has a `Claims Works:` line yet. #788 (C7.5 "part 1", whole pack) will be refused on red steps unless its body names its steps. That is the agreed rule.
* PR #804's own CI: the gate step was skipped (the PR names no capability, as designed). The timing step ran 08:24:24–08:25:12 IST (48 s for both measure runs). Its log was not readable while the job was still running.
* Clean-up: after `stop`, `xr_studio_b1r_gate0` and `var/isolated-b1r_gate0` were still there (see m2). I dropped both databases and the folders. No listener is left on 4431–4432 and nothing in git is changed.

## Findings

### Major
**M1: a bug is waived when the body only mentions it near the word "fixed", "closes" or similar** (`gate-b.mjs:45`). Any body line that contains fixes/fixed/closes/closed adds *every* QA-id on that line to `fixes`. Reproduced with the real gate:
* body `Claims Works: C11.13` + `QA-192 is not fixed by this PR; it stays open.` gives exit 0 ("says it fixes QA-192"; passed);
* `Claims Works: C11.13 (QA-192 still open, closes nothing)` gives exit 0;
* `Claims Works: C11.13 — QA-192 to follow (see QA-169 fixed)` gives exit 0.

Fail scenario: an honest builder claims Works for C11.13 and writes that the open Major is still open. The gate passes, which is exactly the silent Works the gate exists to stop. The self-check's negative case only passes because "fix" is not in the list (`check-gate-b.mjs:38`).

Fix: count a fix only on a `Fixes:` line, in the title (per the ruling), or where the verb directly precedes the id (`\b(fixes|fixed|closes)\s+QA-\d+`), never after "not", "no" or "n't". Add the three lines above as self-check fail cases.

**M2: a "Claims Works:" line added after CI has run is never checked** (`ci.yml:25-26`, `gate-b.mjs:213`).
* `on: pull_request:` has no `types`, so editing a title or body does not start a new run.
* `check-success = ci` stays green in Mergify (`.mergify.yml` queue_conditions).
* The merge-queue batch skips gate B "since each PR passed it on its own", but the PR never passed it with that body.
* A Major filed in BUGS.md between the PR's run and the batch is not re-read either.

Fail scenario: this is the ordinary order of work. The builder pushes, CI goes green, then the builder edits the body to "Claims Works: C11.13" while QA-192 is open. The PR gets approved and merges with no bug check.

Fix (CI only, no new scope): in QUEUE mode, do not skip. Run part 1 (`--no-packs`, seconds) for each PR in the batch (its number is in the batch title, "merge queue: checking #801 + #789 …"), with its *current* title and body (`gh pr view`, read-only token) and the batch's BUGS.md. The other option is `types: [opened, synchronize, reopened, edited]`, which reruns the whole CI on each edit.

### Minor
* **m1: a malformed "Claims Works" line silently means no bug check** (`gate-b.mjs:39-40`). `Claims Works:` with a list on the next line, `## Claims Works` on its own line, `Claims Works — C11.13`, `Claims Works for C11.13`, a table row `| Claims Works | C11.13 |`, and lower-case `c11.13` all exit 0 with "claims Works for none". Lower case even finds no pack (`packsOf("c11.13")`). Fix: a line starting "Claims Works" that yields no C<n.n> refuses (exit 1, "write it as Claims Works: C<n.n>"); read CAP case-insensitively and upper-case it.
* **m2: databases and working folders leak on a Mac copy** (`gate-b.mjs:199`). `isolated.sh … stop` stops the server only, so `xr_studio_<name><k>` and `var/isolated-<name><k>` stay (confirmed above). #745 (still open) would fix this in isolated.sh. Until then, drop them in `finally`. A cancelled run also skips `finally`, and a SIGKILL on tsx after 900 s can leave its node child running (`:157`).
* **m3: ports grow with the number of packs, not with parallel slots** (`gate-b.mjs:172, 226`). Port = `GATE_B_PORT + k`, where k is the pack's index. On a Mac copy with 5 packs and GATE_B_PORT=4431, it uses 4431–4435. `isolated.sh start` kills any listener on those ports, which can include another builder's copy. Fix: port = base + slot (0 … GATE_B_JOBS-1).
* **m4: the reason line can be meaningless** (`gate-b.mjs:192`). `tail` is the last output line. For C11.12-runtime the gate printed "exit 1 on the six (})". The FAIL excerpt helped, but it was cut off at 160 characters on a psql error. Fix: use the last non-empty line that is not punctuation, or the pack's "n/m passed" line. Note on the same pack: its header says it needs the suites' fixture until J4, so under the ruling ("pack alone → on the six") every PR naming C11.12 is refused. The pack's header or run needs the tech lead's call. The gate behaves as ruled.
* **m5: a step range written with an en dash is refused** (`gate-b.mjs:53`). `steps 1–4` (en dash, the house style) becomes the single label "1–4", so the gate refuses for a missing step. This fails safe but is confusing. Fix: map `–` and `—` to `-`, as `…` already is.
* **m6: steps on a "Claims Works" line narrow the pack** (`gate-b.mjs:41-43`). `Claims Works: C7.5 (steps 1)` runs only step 1 for a Works claim. Gate A (qa's demo-data PASS) still stands, but gate B reads green on part of a pack. Fix: steps count only on a `Capabilities:` line.
* **m7: the gate reads the PR's own copy of qa/BUGS.md** (`gate-b.mjs:204`). The PR can edit its own ledger: status "Done", or severity changed to Minor. A status starting with "Retested" (for example "Retested: still fails") also reads as closed (`:67`). Fix: read `git show $BASE_SHA:…/qa/BUGS.md`, and close only on "Closed", "Fixed and retested" or "Withdrawn".
* **m8: the gate disappears on the fallback runner** (`ci.yml:199` onwards). With `PR_RUNNER=mac` or `BATCH_RUNNER=mac`, the shard job is skipped and the Mac branch of the `ci` job has neither `check-gate-b.mjs` nor `gate-b.mjs`. Fix: add the two lines there too, or note the gap in WAY-OF-WORKING.
* **m9: a BUGS.md typo blocks unrelated PRs** (`check-gate-b.mjs:103-104`). A notes-only PR (BUGS.md is a notes file) can add a row whose severity cannot be read. The next unrelated code or records PR then fails the rules step. This is loud, not a false pass. Run the same parse in the notes job, or let the gate refuse an unknown severity for a claimed capability.

## What holds
* **Env injection is safe.** Title and body come in as `env:`, never pasted into the script (`ci.yml:109`).
* **Step order and conditions are right.** The `if: matrix.shard == 1 && env.KIND == 'code'` condition is correct. The gate runs before the suites, so a red gate saves suite minutes. A non-zero exit fails `shard (1)`, which fails "the parts' result" in `ci` (`ci.yml:193`), which is the check Mergify needs.
* **US$0 holds.** `cleanEnv` removes every `*_LIVE` variable and `ANTHROPIC_API_KEY`. The API reads live flags only from the process environment. Port 4400 is refused.
* **A red pack reads red** in both modes. Exit 2 (setup missing or WAIT) is red. A run timed out after 900 s is red. A header with no readable run line is an error, never a skip. A named step needs a PASS line and no FAIL line under the same label, so C1.6's three AT-1 lines all count. C7.5-1 is not mistaken for C7.5-10.
* **Bug parsing is right:** Minor "(Major if …)" stays Minor, bold severity is read, `C6.x` covers C6.4 but not C16.4, and references after the first "·" are ignored.
* **The idiom fits** the paired-self-check pattern (check-select-suites.sh, check-merge-guard.sh), `GITHUB_STEP_SUMMARY` lines, and exit codes 0, 1 and 2.

## D1–D20 (CI tool: UI dimensions do not apply)
D1 ½ (done-when cases met; M1 and M2 break the bug rule) · D2 ½ (M1, m7) · D3 n/a · D4 1 (all 54 run lines read) · D5 ½ (m2, m3) · D6 n/a · D7 n/a · D8 n/a · D9 1 (refusals say what to do) · D10 1 · D11 ½ (m1 silent, m4) · D12 to D14 n/a · D15 not judged here (the builder's CI measurement is pending; locally 46 s per pack on the six) · D16 ½ (43 cases, but none catches M1, M2 or m1) · D17 and D20 simulated only · D18 1 ("fixture only" label) · D19 ½ (M2).

## Journey score: **7.5 / 10, not a pass** (`screens/gate-b/journey-test-reviewer-2026-11-04.md`)

## Could not check
* Gate A's own parser (not on main), so I could not compare its "Claims Works" syntax with gate B's.
* The CI log of the timing step, and the under-5-minute figure. Both are for the builder to show on #804.
* Packs other than C11.13 and C11.12 against the gate (one at a time, by the brief).
* Repository variables (`gh variable list` returned nothing).

**Block.** To fix before the label: M1, M2.

## Round 2 (diff only, 844094baa..d61a7fb2b): summary from the reviewer's hand-back
The reviewer (Opus, fresh context, 4 Nov, about 08:55–09:05 IST; corrected from the commit times in round 3) appended its round 2 section to this file in a temporary checkout, which the builder then removed by mistake before committing it. What follows is the reviewer's own hand-back report, condensed by the builder; its test inputs were left in the builder's scratchpad.

**Verdict: Block for d61a7fb2b.** Journey re-walk 7.5/10, not a pass.
* **R2-M1** (review M1 / break B1 not closed): `fixedIn()` still waived open bugs on honest wording: "This closes QA-169 and QA-192 stays open.", "This fixes QA-169, QA-192 stays open.", "Fixes: none (QA-192 stays open)", "Fixes: QA-169 (QA-192 is the next PR)", "**Fix:** … the same rule QA-192 settled" (the shape of a real PR body), and a title "fix: … (QA-192 still open)". Remedy: only a strict Fixes line with ids.
* **R2-M2** (new in d61a7fb2b): "`Claims Works:` C11.13" (the key in code, the ids in text) was a silent skip.
* **R2-M3** (break M6 / review m1, partly open): "## Claims Works", "**Claims Works**" or a bare "Claims Works" with a list under it was a silent skip.
* **Closed:** review M2 (the batch re-runs part 1 per PR, as it reads now); break M1, M2, M4, M5; M6 for lists, tables, case and notes; round 1 m2–m7, m9.
* **ci.yml (4bbcf0a79) correct:** the event's REST user object shows `mergify[bot]` (type Bot) on batches #795–#810; "app/mergify" is only how gh prints the GraphQL login. `pull-requests: read` is enough.
* **Nothing red that was green:** self-check 78/0; none of 128 real non-batch PRs refused; main's 77 open rows parse the same under the old and new code; every real batch title names its PRs.
* Minors r2-m1…m7, among them: odd fence shapes could hide later lines (none of 82 real fenced bodies has them); a capability first named after the PR's own run never gets its pack run (gate A still covers a Works claim); a qa or records PR in a mixed batch; the temporary timing step must come out before the label.

## Builder's response to round 2 (in the commit after d61a7fb2b)
* R2-M1: a fix is only a body line that is "Fixes:" followed by nothing but bug ids ("Fixes: QA-192, QA-169"). The title, prose, "Fix:" and a note after the ids never count. All of round 2's lines are fail cases in check-gate-b.
* R2-M2: a code span is an example only when it holds a capability, a placeholder or a bug id. A code span with only words in it ("`Claims Works:`") is unwrapped and read.
* R2-M3: a key alone on its line (heading, bold label, bare, or with a colon) takes the list under it.
* Self-check 90/90. Part 1 on the 23 open non-batch PRs refuses none; #804's own description was reworded so its examples carry placeholders.

## Round 3 (diff only, d61a7fb2b..7a08bbe10)
Reviewer: Opus, fresh context, 4 Nov, about 09:10–09:20 IST. Scope: `git diff d61a7fb2b 7a08bbe10` (gate-b.mjs, check-gate-b.mjs, review.md). ci.yml is unchanged in this range; 4bbcf0a79 was found correct in round 2. US$0, no ports, no *_LIVE, nothing committed. Probes are in `scratchpad/r3/` (adv.mjs, sim.mjs, t3.sh). The d61a7fb2b gate-b.mjs is kept outside the checkout for comparison.

### (a) Are round 2's Majors closed?
* **R2-M1 closed.** `fixedIn()` now counts only a body line that is `Fixes:` followed by nothing but QA ids, and the title no longer counts (`claims()` returns `fixedIn(body)`). All of round 2's lines now refuse, run through `claims()` and `part1()`: "closes QA-169 and QA-192 stays open", "Fixes: none (QA-192 …)", "Fixes: QA-169 (QA-192 is the next PR)", "**Fix:** … QA-192 settled", the "fix: … (QA-192 still open)" title, "Fixes: QA-169; QA-192 later" and "Fixed: QA-169. Open: QA-192." The control line "Fixes: QA-192" passes, and so do "Fixes: QA-169 and QA-192", "fixes: qa-192", "Fixes: QA-192." and a table row "| Fixes | QA-192 |". A Fixes line inside a fence, or in the title only, refuses.
* **R2-M2 closed.** "`Claims Works:` C11.13", "`Claims` Works: C11.13", "`Claims Works`: C11.13" and "``Claims Works:`` C11.13" all read C11.13 and refuse on QA-192. Where an id or placeholder sits in code next to the key ("Claims Works: `C11.13`, see notes" or "Claims Works: `C11.13 (was C<n.n>)`"), the line counts as unread and refuses. A span that mixes a placeholder or id into the key ("`Claims Works: C<n.n>` C11.13", "`Claims Works (QA-192):` C11.13") is skipped as an example. That is contrived and consistent with the documented rule.
* **R2-M3 closed for the three shapes named, but the class stays open (see R3-M1).** "## Claims Works", "**Claims Works**", a bare "Claims Works", "Claims Works:" with "1." under it, a nested list, "## 2. Claims Works", "- Claims Works" with an indented list, and the singular "Claim Works" / "Claims Work" all read C11.13 and refuse. An empty list, a list that holds only code ids, a list after a blank line, or a table or plain line under the heading all count as unread and refuse. That is fail-safe.

### Major
* **R3-M1: a "Claims Works" heading or line with any extra word, and a list under it, still passes silently.** The new key-alone test is an exact match: `/^(capabilit(?:y|ies)|claims?\s+works?)\s*:?$/i` (gate-b.mjs:82). The fallback at :97 needs an id on the line itself. So these all SKIP or pass with no bug check, while C11.13 has QA-192 (Major) open: "## Claims Works (as built)\n- C11.13", "## Claims Works (after this PR)", "## ✅ Claims Works", "## Claims Works for", "## Claims Works.", "Claims Works —", "This PR claims Works\n- C11.13" and "Claims Works on\n- C11.13". The batch path does the same (t3.sh Q9, exit 0). This is house style, not a contrived shape: of 693 headings in the 128 real PR bodies, **147 end in a "(…)" suffix, in 75 PRs** ("## Plan (as built)" 15 times, "## Checks (US$0, …)" 7 times). It also breaks the gate's own stated rule, "A line that says 'Claims Works' but names nothing the gate can read refuses (never a silent pass)", in gate-b.mjs's header. **Remedy (small):** when a plain line mentions "claims works" outside code and has no colon key, read the list under it as for a key alone. If that list or the line has ids, treat them as Works, or refuse as unread. Add these 8 shapes as fail cases in check-gate-b.

### (b) Does anything that passed before now refuse wrongly?
* `check-gate-b.mjs`: 90 passed, 0 failed (77 open rows in the real BUGS.md).
* The 128 real non-batch PR bodies, under d61a7fb2b and 7a08bbe10 (`r3/sim.mjs`): 5 differ.
  * Four lose a prose fix: #776 QA-193 "Closed: …", #741 "This also fixes QA-142", #722 "**Fix:** … QA-82 settled" and #630 "fixes QA-176". None claims Works, so none changes verdict. This is the intended strictness, and the new "For builders" section states it.
  * The fifth is #804's own earlier body. Its words-only "`Claims Works:`" spans are now unwrapped, so it refuses twice as "unread". The reworded current body is skipped (exit 0).
  * No other body refuses, then or now.
* Batch re-check (t3.sh Q1–Q8) behaves as in round 2. Q10 ("Fixes: QA-192" inside a batched PR) passes.

### (c) PR body
* #804's body (fetched 09:1x IST, head 7a08bbe10) now has **"## For builders: how to write a PR body the gate reads"**. It shows the three lines in a fence and states the strict Fixes rule ("nothing else on the line, no notes and no 'none'"), that the title is never a fix, and that examples in code or fences are ignored.
* #804's own body passes its own gate: "skipped (the PR names no capability)", exit 0, against main's BUGS.md.

### Minor (no fix needed for the label; record them)
* r3-m1: a struck-out "~~Fixes: QA-192~~" still counts as a fix, because `plain()` strips `~`. None of the 128 bodies uses strikethrough.
* r3-m2: a note in a code span that holds an id or "<" vanishes, so the line becomes strict. "Fixes: QA-192 `QA-192 is the next PR`" and "Fixes: QA-192 `<- next PR`" are waived. Contrived.
* r3-m3: a strict Fixes line counts anywhere: under "## Not in this PR", in "> quote", inside a multi-line `<!-- -->` comment or in `<details>`. It also counts when the next line retracts it ("Fixes: QA-192\n(… QA-192 stays open)"). The builder wrote the strict form each time, so these are low risk.
* r3-m4: the most natural markdown, "## Claims Works", a blank line, then "- C11.13", is refused as unread. The message says to write "Claims Works: C<n.n>", which is actionable but reads oddly to a builder who did name it. Taking the list after one blank line would fix it.
* r3-m5: prose that quotes the key as words only, such as "Add a `Claims Works:` line", now refuses as unread (#804's earlier body did). The message could add: "an example in code needs a placeholder, `Claims Works: C<n.n>`".
* r3-m6: the record in review.md says round 2 ran "about 09:50–10:00 IST". Commits put it between 08:53 (d61a7fb2b) and 09:05 IST (7a08bbe10). Correct it to about 08:55–09:05 IST.
* Carried from round 2: the "gate B timing (TEMPORARY, #804 only)" step is still in ci.yml (:112–116) and must come out before the label.

### Journey score (reviewer role; the builder's journey: write a PR body, read the gate's answer)
task completed ½ (the documented format works; a suffixed heading is silently skipped, R3-M1) · next step obvious 1 (each refusal names the exact "Fixes: QA-nnn" line) · plain words 1 · feedback and state ½ (silent skip, R3-M1; r3-m4, r3-m5 messages) · correct data ½ (R3-M1; r3-m1) · error recovery 1 · accessibility and screen sizes 1 (text output only; not applicable beyond that) · speed 1 (part 1 instant; the packs were measured in round 1) · visual quality 1 (not applicable: CLI) · trust and sources 1 (cites the BUGS.md row, read on the base branch). **8.5/10.** It passes the journey bar, but the verdict follows the open Major.

**Block.** To fix before the label: R3-M1 (a "Claims Works" line or heading with an extra word and a list under it is a silent skip; 147 of 693 real headings carry such a suffix). The timing step must also come out of ci.yml.

## Builder's response to round 3 (the commit after 4b44fb1bc)
* R3-M1: a line that says "Claims Works" with no colon key ("## Claims Works (as built)", "## ✅ Claims Works", "This PR claims Works on", "Claims Works —" …) now IS a Works claim for the ids on the line and in the list under it, so the bug check runs. A heading or short label with none refuses as unread; a prose sentence that names nothing claims nothing. All 8 of round 3's shapes are fail cases in check-gate-b.
* Minor: struck-out text (~~…~~) is no longer read (a struck "Fixes:" line is no fix).
* Not changed (Minors, listed for the tech lead): a strict Fixes line counts anywhere in the body (under "Not in this PR", in a quote or a details block); a note hidden in a code span after the ids; the refusal message for a quoted "`Claims Works:`" could suggest a placeholder.
* Self-check 102/102. Of the 75 most recent non-batch PRs (open and closed), none refuses; #804's own body is skipped.
