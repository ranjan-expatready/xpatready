# Break report: C4.11 part 1 "Draft questions and documents" (branch claude/hopeful-maxwell-4etgzs @ ee66d870)

Isolated copy `br411` on :24471 (`STUDIO_SLOW_QD_STEP=150`, fresh database `xr_studio_br411`, sample loaded via
POST /api/demo/load), combination `wp.family` (id `185870bf-…`, 245 facts), 1 Nov 2026. Actors: user-A author, user-B
approver, user-O case officer (runtime). Copy stopped afterwards. Screenshots went to /tmp only. 14 attacks.
Note: while I was testing, the builder pushed 8458dd2d to the same branch (restart recovery). The restart check below
ran on that code; the other findings are the same at both commits (8458dd2d only adds `onModuleInit`, +8 lines).
`P=prototype/studio`. Shell helpers: `plan(){ POST /api/combinations/$C/draft-qd/plan {"mode":"rules"} }`, `$S` = its `plan_sha256`.

## Breaks

**Blocker at ee66d870, fixed in 8458dd2d (I checked it again): a run cut off by a server restart stayed RUNNING forever.**
At ee66d870 `DraftQd` had no restart sweep, and finder.ts:166 and people-ai.ts:143 both do have one. The run happens inside the
HTTP request, so killing the server mid-run left `ai_batch.status='RUNNING'`. Every later POST /draft-qd for that
combination hit the "Already running" 409 under the lock, and Stop could not clear it because the loop that checks Stop was gone.
Repro: POST /draft-qd with the slow env set → after 0.5 s run `isolated.sh br411 24471 restart` → POST /draft-qd again.
At 8458dd2d: the batch is FAILED with "The studio server stopped during this run…", the new run returns 201, and `?active=1` is empty. HELD.

**Major 1: anyone can Stop someone else's draft run, including the approver and a case person. The Stop is not audited.**
Repro: user-A POST /draft-qd (slow env) → 0.4 s later `POST /api/runs/<id>/stop` with `x-actor: user-B`, and again with
`x-actor: user-O`. Expected: 403 (people-ai.ts:195 `need(actor,"author")` for the sibling run). Actual: 201 both times, and the
run ends `stopped` with steps 3–7 CANCELLED. No audit row says who stopped it. The only row is user-A's "drafted questions and documents …
0 to review, 0 findings" (draft-qd.ts:137), which wrongly says the stopped run drafted. Code: `P/api/src/runs.ts:107`
(QD branch sets `cancelRequested` with no duty check and no audit). Only an unknown actor is refused (401).

**Minor 2: a case person can read the plan.** `plan` with `x-actor: user-O` (case officer, runtime) → 200 with the
combination label, its steps and fact counts per role. The controller uses `actorOf`, which accepts runtime actors
(`P/api/src/draft-qd.ts:145` at ee66d870). Break m8 (core.ts:58) says configuration reads use `readerOf`, which refuses case people.

**Minor 3: a Stop during step 7 is accepted, then ignored.** Repro: poll until `drafting_job.kind='qd_check'` is RUNNING →
POST /runs/<id>/stop (user-A). The reply says `status_word: "Stopping"` and `can_stop: false`. The run then ends COMPLETED / "Done"
with `cancel_requested=t`. Nothing checks Stop after the last step (draft-qd.ts:88 runs only before each step, and :133 sets
COMPLETED without checking Stop again). So the person is told "Stopping" and then sees "Done".

**Minor 4: a run with a failed step reports success in the response, and its card offers no real next step.** Repro: plan
`{"mode":"replay"}` → run with that sha. Step 6 is FAILED ("No saved AI answer for this guide…") and the batch is
PARTIAL / "Done with problems". But the response has `status:"done"`, and `note` = "0 items for To review; All four rules pass… 2 steps
are not available yet." It never mentions the failed step (draft-qd.ts:133–134 counts `failed` only to choose the status).
On GET /runs/<id>, `error.what` repeats that success note, and `error.next` = "See the details" →
`/c/<id>/questionnaires`, the page already open (runs.ts:95; nextOf's own comment says "never a link to the page already open").
Also, the replay plan labels step 6 "saved AI answers" even though nothing is saved, so the run can only fail that step.

**Minor 5 (UI): pressing Esc or Cancel mid-run loses the run, and the 409 that follows is a dead end.** Repro at 1024 px: Questionnaires tab →
focus "Draft questions and documents" with the keyboard, Enter → Draft → Esc right away. The dialog closes (qd-draft.tsx:52 closes
even while `busy`) and the run keeps going with no card. Open the dialog again → Draft → red text: "'With an LMIA' is being drafted
already: its run card shows each step." No card or link appears, although the 409 includes `runId`
(qd-draft.tsx:45 keeps only `.message`). Draft stays enabled.

## What held
- Five parallel POST /draft-qd with the same sha: one 201, four 409 "Already running" (advisory lock + check inside one transaction).
- QD run plus 3 parallel C4.7 `pqr-picks/draft` at the same moment, after removing the 32 waiting picks: 32 waiting, 32 distinct
  identity keys. No duplicates, and step 6 of QD proposed 0. A second QD run proposed 0 (dedupe works).
- Roles: user-B POST /draft-qd → 403 "does not hold the author duty". A missing or unknown actor → 401 on plan, run and Stop.
- Body: extra field → 400 (strict). `[]` → 400. `null` → 400. Missing `planSha256` → 409 "Look at the plan again". A rules sha sent with replay
  → 409. `mode:"live"` → 409 with the P-131 wording. A malformed or unknown id → 404. A retired combination → 409 "Retired" on both plan and run.
- `lm.high_wage` (no forms or guide): plan → 409 "No forms yet", with plain words. Nothing is created.
- A Stop between steps (step 3 to 6) works: later steps are CANCELLED, the batch is CANCELLED, and the card says "Stopped". Stopping a finished run → 409 "Already ended".
- UI: keyboard Enter opens the dialog. A double-click on Draft sends one POST. The run card renders in the dialog. Cost line US$0. The live option is disabled.
- Not tried: replay with corrupt saved files. The saved answers live in the shared `SOLUTION` folder, not in the isolated var folder,
  and C4.7's reader falls back to `""` on bad JSON (pqr-drafts.ts:74).
