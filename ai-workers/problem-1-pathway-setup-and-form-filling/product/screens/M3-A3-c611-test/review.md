# Review: M3-A3, pack 4's C6.11 acceptance test adopted on the routes as built (runtime lane)

Commit reviewed: `223ae94ef39ba2ab67f9b6dc9d71a57b38a4e780` (branch `claude/loving-franklin-t3vxdr`, 2 commits over origin/main).
Files: `prototype/studio/acceptance/C6.11.test.ts`, `acceptance/lib/m3.ts`, `product/tools/run-suites.sh`, `product/tools/select-suites.mjs`.
Reviewer: a fresh context that did not build this. The change is test-only, so there is no screen and no new UI. The built C6.11 screen was reviewed under #288 (`screens/M3-A-c611/review.md`).

## What I ran (isolated copy `rev_c611` on :4439, never :4400; US$0, no model calls)
* `setup_visitor_visa.ts`: 13/13 passed. Then `C6.11.test.ts`: **22/22 passed, 3 PENDING, exit 0**.
* Then `check_runtime_r1a.ts --reset` on the same copy, after C6.11 (the CI order without R1c, which needs a browser): **99/99 passed**. C6.11's extra cases, including a solo-firm case, do not upset R1a.
* After the reset: setup again, then C6.11 twice more from a `git archive` of the HEAD commit: **22/22 both times** (not flaky, and references are unique per run).
* `C7.6.test.ts` with the HEAD helper runs to its end: 1/23, which is expected while `/prepare` is not built. Its IMM 5257 round trip passes on a case opened through the new `openCase` with an explicit team. No crash.
* `select-suites.mjs`, by changed file: `acceptance/C6.11.test.ts` and `acceptance/lib/m3.ts` pick R1a, R1c and R1d. `api/src/team.ts` also picks the R1 group (through r1c), plus check_c611_team. Other `acceptance/*.ts` files still pick ALL, as before.

## (1) Does each adapted line still prove its rule?
| Line | Judgement |
|---|---|
| -1, -2, -3, -4 | Same rules on `GET /runtime/firm`, read once per firm. SI-9 must be on **both** firms' answers. Not weakened. |
| -3a, -19a (new) | They add BR-20 firm isolation: users are not listed across firms, and the solo case gives 404 to the Sample firm. This makes the test stronger. |
| **-5** | **The expectation changed.** Before, a case opened without a representative had to be refused (400). Now it must open with the firm's default representative. "Never none" is still proven, but the refusal is no longer proven at the API level, and no seeded firm can trigger it. The refusal branch is tested only in the engine (`tests/runtime/check_c611_team.ts:39-40`, "a firm with two representatives must choose"). The default itself was reviewed in #288 (D4). See S1. |
| -6 | 400, not 422: this is `fieldError` in `runtime.ts:28` as built. The line now also requires `errors[0].field === "representative"`, so it is stronger, not weaker. |
| -7, -8, -12, -18 | Same rules. -12 now names the ended user, which is stronger. |
| -9, -10 | Same rule (only the firm admin assigns; a reason is required) on add and end. Both must give 403. Not weakened. |
| **-11** | **"Who" is weakened.** The original required `h.by === f.admin`. Now `ended_by` and `assigned_by` only have to be non-empty (`C6.11.test.ts:56-59`). See m2. |
| **-13** | For the representative, the stale-write rule is equivalent: the line fails if the guard is removed, because the change would succeed with 200. The officer half of the old line is gone. With per-person add and end, that half no longer applies (a duplicate gives 409 and an already-ended officer gives 404; the breaker verified both under a race at #288). But `expectedRepresentative` is optional (`contracts/runtime.ts:49`), so a write that leaves it out is not guarded. See m4. |
| **-14** | It accepts 404 for the client, but the build gives **403** (`runtime.ts:49` refuses before the lookup; observed `[403,403]`). The extra tolerance is unneeded and the comment is wrong. Nothing changed after these calls: -17 then succeeds with `expectedRepresentative: f.rep`. See m1. |
| -15, -17a | Moved to PENDING (IMM 5476 is not in the Visitor visa release, and `/prepare` is C6.12's). The reason is right, but the condition is not. See M1. |
| -16, -16c | -16 now reads `team.imm5476.facts` (engine output) instead of the questionnaire. The "source Firm, not typed per case" half is in -16c, which is pending unconditionally. See M1. |
| -16b | Same rule, and it now names the field `userId`, so it is stronger. |
| -17 | It is stronger: it checks `new_needed`, `earlier`, the ended history row with its reason, and the audit line. The out-of-date half is -17a (pending). |

## (2) Can m3.ts's change break the other pack-4 tests?
No.
* `firms()` keeps the `Firm` shape (`actor`, pack duty words through `DUTY`), so C7.6, C8.1, C8.2 and C9.2 read `rep`, `rep2`, `officer`, `admin` and `soloRep` as before. They now hold real values (user-R, user-T, user-O, user-R, user-S) where they used to be null.
* `openCase()` without a team now sends `{representative: user-R, caseOfficers: [user-O]}`. That is exactly the server's `openingTeam` default (`engine/runtime/team.ts:35-47`, `samples/firms.json`), so C6.12, C6.4, C6.5, C7.3, C7.5 and C7.7 open the same case as before.
* C7.6's solo case now opens as user-S, a valid runtime actor (`api/src/core.ts:46`). Before, it fell back to user-O.
* `C9.2.test.ts:50-52` still calls the old `PUT /runtime/cases/:id/team` with `version`. Now that `f.admin` and `f.rep2` are set, it sends real requests to a route that does not exist. It was red before and is still red, so this is for its own lane when it is adopted (m7).
* Pack-4 tests other than C6.11 are not in the suites (`acceptance/README.md:5`), so CI cannot break.

## (3) Checks that can pass vacuously
* **M1 (below)**: the PENDING condition on -15 and -17a.
* -3a (`:26-27`): if both `GET /runtime/firm` calls fail, `?? []` gives two empty lists and the line passes. Only -1 catches this.
* -5 (`:33-34`): if `f.rep` is null and no representative row exists, the check compares `null === null`. -1 and -2 catch this.

Each line should stand alone (m3).

## (4) run-suites and select-suites
* The placement is right: on the R1 copy, after R1d and before R1a's `--reset`, which is the last step of R1a (`check_runtime_r1a.ts:327`).
* Exit 2 (setup missing) is reported as FAIL. PENDING lines do not change the exit code.
* The regex in `select-suites.mjs:208` matches studio-relative paths, as the runs above show.
* `acceptance/README.md:5` says that a passing test **moves into `tests/`** and that `acceptance/` is not run by run-suites. This PR keeps the test in place with a special run line. That is reasonable, because the test shares `lib/m3.ts`, but the README now contradicts the suites (m6).

## Issues, ranked
**Major**
* **M1. The PENDING condition is the absence of the thing under test** (`C6.11.test.ts:70`, `:86`), and `:74` is pending unconditionally.
  * Once IMM 5476 is in the release, a bug that drops the principal's IMM 5476 makes -15 and -17a print "PENDING … not in the Visitor visa release yet". The run stays green and the message is false. The same happens if `/prepare` 404s, because `prepare()` then returns `p = null`.
  * -16c never runs at all. So removing VV-R10 or BR-12 would not fail this test, even after its dependency lands.
  * **Fix:** decide pending from the dependency, not from the result: the case's pinned release lists IMM 5476 (for example `GET …/forms`, or the release snapshot in SQL), and `/prepare` answers 200. When both hold, run `ok(...)`, which fails on an empty list. Give -16c the same condition, using the original questionnaire assertion (`channel === "firm"`).

**Should (Minor)**
* **S1.** Record the change to C6.11-5's expectation (refused → firm default) for the tech lead, in the PR's first lines or in `screens/M3-A3-c611-test/challenge.md`. `acceptance/README.md:13` and `M3-CONTRACT.md` ("a change to what a rule expects goes to the tech lead first") require it. The commit message does not mention it, and the contract's "Builds already open" note says "the rules match".
* m1. C6.11-14 (`:65`): require 403 for the client and fix the comment.
* m2. C6.11-11 (`:56-59`): compare `ended_by` and `assigned_by` with the firm admin's name, which is `f.firm.users` where `actor === f.admin`. History rows carry names, not ids.
* m3. -3a: require both lists to be non-empty. -5: require `!!f.rep`.
* m4. For the tech lead, not this PR: the contract says "every write carries a version", but `expectedRepresentative` is optional. Only clients that send it (the web does, `web/src/runtime/team.tsx:88`) are protected from stale writes.
* m5. Not this PR: the same "not a licensed representative" refusal gives 400 at Open a case (`runtime.ts:28`) and 422 at change (`team.ts:23`).
* m6. The usage line `C6.11.test.ts:5` still says port 4440, `xr_studio_accept` and "after lib/setup_vv_m3.ts". CI runs it after `setup_visitor_visa.ts` only, and that is enough. Update `acceptance/README.md:5` to name the exception.
* m7. Not this PR: C9.2 still uses the old team route.

## D1–D20 (test-only change; scored for what it touches)
* D1 Requirement fit 4: BR-20 and VV-R11 are proven; VV-R10's IMM 5476 half is deferred, with M1.
* D2 Data integrity 5: SQL checks one current representative, ended rows kept and audit present.
* D3: n/a.
* D4 Rule integrity 4: see -5 and S1.
* D5 Stability and recovery 5: 3 runs, all green; R1a 99/99 after it.
* D6 Freshness and governance 4: the history is checked, but "who" is loose (m2).
* D7: n/a.
* D8–D14 (UI): not touched (#288 review).
* D15 Speed: not timed; under 10 s per run as observed.
* D16 Testability 3: M1 means two rule lines cannot fail when their rule is removed; everything else fails as it should.
* D17, D20: simulated only.
* D18 Information provenance 3: the "source Firm" proof is deferred unconditionally (-16c).
* D19: n/a.

## Journey score: 7.5 / 10
Report: `journey-test-reviewer-2026-11-01.md`, written next to this review. Every ½ is either a criterion that could not be walked here (no Chromium in this container) or the deferred IMM 5476 proof. None is a defect found in this change.

## Not checked
* No browser walk: there is no Playwright browser, so R1c and check_c611_team_browser.cjs were not run.
* `graph.mjs` was not run (it rewrites `qa/GRAPH.md`, which is outside my write scope).
* No mutation runs (editing the code would be outside my scope); "fails when the rule is removed" was judged by reading the code.
* Another process in this checkout set `acceptance/lib/m3.ts` back to origin/main for a few minutes during my run (16:42 UTC) and then restored it. I reran everything from a `git archive` of the HEAD commit, and the results above are from that.

**Verdict: Block**: fix M1. S1 and m1–m3 and m6 are cheap and worth doing in the same PR; m4, m5 and m7 are for the tech lead and other lanes.
