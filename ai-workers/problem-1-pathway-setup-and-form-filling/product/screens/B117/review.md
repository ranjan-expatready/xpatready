# B117 review — the people route refuses a representative (runtime lane)

Reviewed commit **eba4db3db** on `claude/amazing-goldberg-yfcnvc` (base a45b4aee7), `git diff a45b4aee7..eba4db3db`.
While I reviewed, the branch moved to **d1c10d58b** (QA-76 walk regex, notes and a screenshot). runtime.ts and
check_s5_slice1.ts are the same in both. Copies :4437 (branch) and :4438 (base runtime.ts, scratch copy), both stopped.
Journey report: `screens/B117/journey-test-reviewer-2026-11-06.md` — **8.5/10, pass**.

## What the row asks, and what I found
| Done when (P-373) | Met? | Evidence |
|---|---|---|
| Route refuses the role in plain words (422) | Yes | runtime.ts:197; live: 422 "The representative is not added as a person: the case's representative of record comes from its case team ("Case team" on the case page). This application can add: spouse or partner, child." |
| 422 list of allowed roles drops "representative" | Yes | runtime.ts:191, shared by the "case" refusal and the new one (`canAdd`) |
| QA-76 walk uses the case team instead | **Not at eba4db3db** | Walk opens the case with `representative: "user-R"` and reads the name from `/team`, but at eba4db3db it fails 19/20, exit 1 (M1). Passes 21/21 at d1c10d58b |
| A pass test and a fail test | Yes | check_s5_slice1.ts:176 fail, :178 and :180 pass |
| Tests fail on the old code | Yes | Base runtime.ts on :4438: `FAIL C7.7 B117 fail … {"status":201,"people":[…,"representative"]}`, then a crash (m1). New code on :4437: 60/60, exit 0 |
| No hard-coded combination or form number (P-319) | Yes | Role key is the engine's `REPRESENTATIVE` (engine/runtime/team.ts:78); the label comes from the release |
| Live AI off, US$0 | Yes | No STUDIO_*_LIVE; no model call |

## Correctness and ordering (runtime.ts:178-198)
* Order: reach (403 for the client) → contract parse (400: empty name, "Representative" in capitals) → "case" refusal →
  "does not list" → new representative refusal → idempotency replay → lock and max. Checked live: 403, 400, 422 in that
  order. A padded " representative " is trimmed by the contract and refused (422).
* "Does not list" first is right: on a release without a representative it is still true, and acceptance/C11.12-runtime
  depends on it (its `notListed` list includes "representative").
* Idempotency: the refusal comes before replay, so a retried key gets 422 again and nothing is added (checked live). A
  key that added a representative before B117 now gets 422 instead of that person. That is acceptable and true.
* The max check is never reached for a representative. Nothing is written before the refusal: no audit line, no party.
* Other ways to create a representative participant: `caseParticipant.create` exists only at runtime.ts:223 (addPerson);
  createCase writes only case and principal (runtime.ts:109). The Sample family (sample-case.ts:15) has no
  representative. `sampleFamilyFacts` in engine/import.ts:172 lists a "representative" only in a sample *profile*
  (demo.ts:390, 454), never as a case participant. The web adds only spouse or child (web/src/runtime/cases.tsx:212).
  The database trigger still accepts the role (person_role.takes_part_in_case), which is fine now that the only writer refuses it.
* Words: plain and true, with no internal key. "Case team" is the real button and dialog title (web/src/runtime/team.tsx:74, 95).

## Other tests the change touches (my own grep of tests/, acceptance/, evidence/, api/src, web/src)
Every POST to `/runtime/cases/:id/people` in tests, acceptance and evidence passes spouse, child, sponsor, parent or case
literally, except: check_vv_prepare_store_api.ts:32 (its callers pass spouse/child only), acceptance/lib/m3.ts:102
(FAMILY only) and acceptance/C11.12-runtime.test.ts:33/38 (see m2). The builder's table in notes.md is complete. The
direct-built representative participants (check_case_engine.ts:279, check_vv_filings.ts:27) are engine unit inputs and
remain valid fail-guards for stored cases.

## Issues
**M1 (Major) — the QA-76 walk is red at the reviewed commit.**
`tests/qa/check_qa_am_1101c_runtime_walk.cjs:43` at eba4db3db fails: `FAIL QA-76 C7.x: a sentence or label never starts
with lower-case "representative" — 1`. The match is the firm record's e-mail `representative@sample-firm.example`, which
C7.7 shows once no added person displaces the firm record. The row's "selected suites exit 0" is not met at eba4db3db.
**Fix:** d1c10d58b (`representative\b(?!@)`), already pushed. I ran that walk on :4437: 21/21, exit 0. The narrowing
excludes only an address, so the check still catches a real lower-case start. Move the review label to d1c10d58b after a
re-check of that commit; its delta is only that regex, notes.md and a png.

**m1 (Minor) — the new pass check crashes on the old code instead of reporting FAIL.**
check_s5_slice1.ts:177: `r.body.detail as string` is undefined when the route answers 201, so `d.match` throws. The
suite reports "unexpected TypeError" and skips every later check. It still exits 1, so the regression is caught, but the
rest of the suite goes unreported. **Fix:** `(r.body?.detail ?? "")` at :172 and :177.

**m2 (Minor, latent) — acceptance/C11.12-runtime.test.ts:36 picks the "capped" role as the first non-principal role with max 1–4.**
On a release that lists the representative before the spouse or child, it would now pick the representative. The first
add would get 422 and the pack would fail. This does not happen today (vv.single, wp.family and DEFAULT_PARTICIPANTS
list it last). **Fix:** exclude the representative in that `find`. Small, and it can ride with this PR or the next runtime row.

**n1 (Nit) — wording.** "is not added as a person" reads as a description. "cannot be added as a person" is clearer.

**Out of scope, pre-existing on main (C7.7, not B117):** the firm-record answers now visible on the case page are wrong:
the phone shows `[object Object]` and "Enter text."; the firm's own e-mail fails the e-mail rule; the country shows `canada`.
The builder logged these in notes.md at d1c10d58b and recommends a separate runtime row. I agree. For C7.7 it is a Major.

## Open point in notes.md (cases stored before B117)
I agree with leaving them, with one caveat for the tech lead: no route removes a person (only `PATCH` applies). A stored
representative participant therefore keeps displacing the firm record's IMM 5476 answers on that case. Nothing on the page
says so, and only a Reset clears it. Every local database here has 0 (`xr_studio_demo` 0). Before closing the point, qa
should run this read-only query on the Mac demo: `select count(*) from case_participant where role='representative'`.

## Dimensions (API-only change; no screen changed)
D1 met (all five Done-when lines at d1c10d58b) · D2 met (no write before the refusal; nothing added) · D5 met
(idempotent retry refused the same way) · D10 met (plain refusal, no internal key) · D16 met (fail and pass tests;
fail-on-old shown, m1 aside) · D13 met on the one path (axe clean at 1440) · D3, D4, D6–D9, D11, D12, D14, D15, D18, D19:
unchanged by this diff · D17, D20: simulated only. The graph step (graph.mjs) was not run because it rewrites qa/GRAPH.md,
outside my write scope. The route already has tests.

## Could not check
The Mac demo (:4400 never used). Gate B and the full suites (the builder's run; C7.7 33/33 per the brief, not re-run).
A real screen reader.

**Verdict: Block** (commit eba4db3db)
To fix: **M1**, the QA-76 walk exits 1 at eba4db3db. It is already fixed at d1c10d58b (walk 21/21 on my copy). Re-check
and label d1c10d58b. m1, m2 and n1 are optional and do not block.

## Re-review (diff only) at 226964dd1
Diff: `git diff eba4db3db..226964dd1` (code: runtime.ts 1 line, check_s5_slice1.ts 4 reads, the walk regex; the rest notes, review files, one png).
* **M1 closed.** The walk's `representative\b(?!@)` is unchanged since d1c10d58b, where I ran it: 21/21, exit 0.
* **m1 closed.** All four reads of `r.body.detail` in the B117 block now use `r.body?.detail ?? ""`
  (check_s5_slice1.ts:172, 176 ×2, 177). On the old code the builder's run gives 2 FAIL lines, 58/60, exit 1, and no crash.
  I re-ran it on head on :4438 (a fresh copy, then stopped and dropped): 60/60, all three B117 checks PASS.
* **n1 closed.** runtime.ts:197 now says "cannot be added as a person", and the test's regex matches the new words. No
  other test asserts the old words (grep).
* **m2 deferred, with a reason.** It is recorded in notes.md for the next runtime PR that touches C11.12. It is not live,
  so it is acceptable.
* notes.md records the findings and a new pre-flight gap: five `tests/runtime/` suites that select-suites names are never
  run by run-suites.sh. That is a tools row for the tech lead, not a B117 defect. Run them by hand before the merge,
  as the builder is doing.
* Not mine: three tracked screenshots under `product/qa/reports/2026-11-01-after-merge-4/` are modified in this shared
  working tree, from a walk run that wrote to its default folder. My runs wrote to the scratchpad. Keep them out of the commit.

No open Blocker or Major.

**Verdict: Approve** (commit 226964dd1)
