# What can run next: the AW test cases sorted by what each one needs

*Expat Ready, Workstream 2. The test standard and the current state (16 Oct 2026, scrum 5.10) come first; below them, the 13 Oct run plan is kept as history. No product acceptance test has been executed. Moved from the deleted `blueprint/` folder on 15 Oct 2026 (AIW-D158 (c)).*

## The test standard: what makes a test usable by QA (AIW-D159; scrum 5, 15 Oct 2026)

The team's QA must be able to run every test from the file alone, with no question to us. A live test (any status but Withdrawn) meets all five parts:

1. **Preconditions.** Step 1 states the starting state, citing fixture IDs from `fixtures.csv` (for example "FX-F, FX-F-C1"), and adds only what this test changes ("Delta: the case officer's delegation is ENDED"). A test never starts from another test ("Continue from the previous test"): it states the state it needs. **A test that depends on what an AI step outputs** (a classification, a confidence, a drafted text, a refused or failed call, a timeout) cites FX-MODEL, the scripted model, and states the exact output in its step-1 delta, for example "the scripted model returns type D at 0.62, 0.81 and 0.95". In the test environment the provider adapter returns exactly that output instead of calling a model (team need TC-176 in the change register). No step says "Let the Reader propose..." or "Make the Writer attempt..." without it. Every trigger names its actor or its event ("As Client A, send...", "When the upload arrives, ...").
2. **Fixtures.** Every firm, person, client, case, lead or record the test uses is either a fixture in `fixtures.csv`, cited by its ID, or a one-off defined in step 1 with "New:" and its values. Fixture text is never repeated in a test.
3. **Steps.** At least two numbered steps, each one act by a named person or one event.
4. **One observable result.** The expected result is one outcome a tester can see on a screen, in a record or in the audit trail, in at most two sentences.
5. **Its requirement.** The comments cite at least one live AW-01 or AW-02 requirement (AW-1-n or AW-2-n) that exists.

`tools/check_tests.py` checks these five parts by pattern and checks that every cited fixture exists. It is a pattern check, not a proof: in increments 5.3 to 5.5 the checker reads 15 randomly drawn rewritten tests per batch, and more than 2 that QA could not run from the file alone fails the batch. Nothing is executed before development (AIW-D139, D160).

## Where the tests stand now (16 Oct 2026, scrum 5.10)

Counted from the files on 16 Oct 2026; `tools/check_tests.py` and `tools/check_evaluation_cases.py` recount them on every run.

| What | Now | Where it is checked |
|---|---|---|
| Test cases | **589 rows: 573 live (AW-01 391, AW-02 182), all "Not run"; 16 Withdrawn** | `AW-test-cases.csv`; `tools/check_tests.py` |
| Meeting the test standard above | **573 of 573**; cited fixtures that do not exist: 0 | `tools/tests-check-latest.json` |
| Tests that depend on an AI output | **288** cite FX-MODEL, the scripted model, with the exact output in step 1 | `fixtures.csv` FX-MODEL; team need TC-176 |
| Fixtures | **54**, each defined once | `fixtures.csv` |
| Model-quality seed cases | **145** made-up cases for AW-01 E-1 to E-18 and AW-02 EV-1, 2, 5 to 9, 11, 12; answers Unconfirmed until the Immigration SME role confirms them; pass bars Unknown | `evaluation-cases.csv`; `tools/check_evaluation_cases.py` |
| Every live requirement has a live test | **Yes** (0 without one) | `tools/score_gates.py` |
| The code copy to read against | backend `b48e4ce` (dev, 14 Oct), frontend `85623d4` (dev, 13 Oct); `bash tools/freshness.sh` compares them with GitHub | the AW-01 and AW-02 §12 code check against `b48e4ce` is carried, not done |

**Where each test runs now.** The 13 Oct buckets below are overtaken in two ways.

1. **All 573 live tests run in the team's build** (the old bucket (d)), from the fixtures alone. Since scrum 5, a test that needs an AI output no longer waits for a provider. It runs with FX-MODEL, which proves the product side only: routing, refusals, records and approvals.
2. **Real model quality is not a test case.** The driving test measures it on the seed cases in `evaluation-cases.csv`, through the harness, which belongs to the team during implementation (scrum 6, AIW-D160). Workstream 2 hands both over and runs neither.

The 27 tests of the old bucket (a) can still be walked on `prototype/index.html` as **simulation evidence only**. Each screen now opens with "About this example" (settings, what it shows, what it cannot prove). The 26 of the old bucket (c) run in the build with FX-MODEL; their model half is the matching seed set. TC-AW1-297 and TC-AW1-331 still need pilot firm one (AIW-D112).

---

## History: the run plan as of 13 Oct 2026

*Kept as written, with only the section headings marked as history. Its counts (500, then 528 rows), its five buckets and its code path `code/ERv2-sanitized@2b1f091-2026-10-12/` are as of 12 and 13 Oct. Paths into `../checks/` point to a folder deleted on 13 Oct (AIW-D121). Read the section above for the present state.*

**Source.** `requirements/tests/AW-test-cases.csv` as it stood on 13 Oct 2026 (recounted after review R11). The file has 500 rows: **492 Not run** and **8 Withdrawn**. *Updated 12 Oct 2026 (audit repair 1):* 36 rows added (TC-AW1-325 to -354, TC-AW2-177 to -182: the shared skill release contract and the AW-02 table repairs F-03, F-04), so the file now has **536 rows: 528 Not run, 8 Withdrawn**; they are bucketed below (c 6, d 29, e 1). The brief counted 479 Not run. Thirteen rows were added since:
- TC-AW1-314 to -318 (AIW-D117);
- TC-AW1-319 and TC-AW2-175 (the Lead's rulings N1 and N2 after review R10-b);
- TC-AW1-320 to -324 (five blueprint steps that had no test);
- TC-AW2-176 (a review R10-b note).

All of them are included below, so the five buckets add up to 492, and with the 36 rows of 12 Oct to 528.

**Every test goes in one bucket: the earliest place it can honestly run.** A test in bucket (a) also lists its real home, because a pass on the prototype proves nothing about the product.

| Bucket | What it needs | Count |
|---|---|---|
| (a) Prototype simulation, now | Only `prototype/index.html`, a browser and the tester. Gives **simulation evidence only**. | **27** |
| (b) The current code copy | Current targeted source inspection at `code/ERv2-sanitized@2b1f091-2026-10-12/`; no AI-layer acceptance path evidenced | **0** |
| (c) Driving-test harness on made-up cases | A Canada AI provider that has passed the provider test (AIW-D69), a small harness and graded made-up cases (AIW-D83) | **26** (20 + 6 of 12 Oct) |
| (d) Workstream 1 build | The team's product: delegations, approval items, Needs you, the Conductor, permissions, billing, packs | **473** (444 + 29 of 12 Oct) |
| (e) The pilot | Real files or real accounts at pilot firm one (AIW-D112), after the driving test and shadow | **2** (1 + 1 of 12 Oct) |
| **Total** | | **528** |

---

## (a) Can run now against the prototype: simulation evidence only (history, 13 Oct)

**How to run.** Open `prototype/index.html` in any browser. It is a single local file and needs no install. Follow the test's steps on the screen named below. Record Pass or Fail and what the screen showed. Write the result as **"Pass in simulation"** or **"Fail in simulation"**, never as "Executed". The test's Status in the CSV stays "Not run" for the product. The prototype has no rules engine and no AI model, and it sends nothing (its About page says so).

| Test | Screen | Covers | Simulation result, 13 Oct (`simulation-run-2026-10-13.csv`) | Real home |
|---|---|---|---|---|
| TC-AW1-308 | 3 Assessment | Run proceeds with missing inputs | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-309 | 3 | Stop on stale or conflicting evidence | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-266 | 3 | AI-started run is automatic after the check, with the label | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-284 | 3 | Explanation cites sources and pack version | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (c) and (d) |
| TC-AW1-287 | 6 Intake chat | Eligibility question handed to a person | Historical Run 2: shown checks pass; current prototype not browser re-run | (c) and (d) |
| TC-AW1-288 | 6 | Unknown question handed to a person | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-290 | 6 | AI-written reply never sent unapproved | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-281 | 6 | Chat answers only with rule-chosen published templates | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-289 | 6 | Booking from the chat | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-059 | 6 | AI-written client text waits for approval | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-269 | 4 Billing | Changed tax rate voids the invoice approval | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-268 | 4 | Invoice created and issued once on approval | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-271 | 4 | Trust entry runs only on the trust-key holder's approval | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-294 | 4 | Linked items show each other | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-277 | 2 File preparation | Review: values first, explicit checks, skipped steps | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-278 | 2 | Correction re-renders dependent drafts | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-035 | 2 | Approve-all disabled until uncertain values are opened | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-036 | 2 | Approve-all enabled once they are opened | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-037 | 2 | A value held out for the approver to type | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-280 | 2 | Template send in a job after the four checks | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-111 | 2 | Biometrics date and the rule task due two working days before | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-120 | 2 | Letter lists the facts used | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (c) and (d) |
| TC-AW1-276 | 5 Settings | Presets: each step against checkpoints | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-274 | 5 | Settings change prepared and bound to the preview | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) |
| TC-AW1-279 | 5 | Earned Auto conditions and drop back | Historical Run 2: shown checks pass (partial test); current prototype not browser re-run | (d) then (e) for real evidence |
| TC-AW1-320 | 6 | With AI off, the chat keeps its menu and hands typed questions to a person | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |
| TC-AW1-324 | 5 | Plain examples per preset | Historical Run 2: shown checks pass; current prototype not browser re-run | (d) |

**What a run of (a) is good for.** It checks that the prototype shows the agreed design.

**Historical evidence:** Run 1 records 23 shown-check passes and four failures; Run 2 records all 27 shown checks passing, with 15 partial tests. Original rows remain in the simulation CSV. These are historical observations, not fresh tests of the current prototype. The 12 Oct audit then repaired identity correction and current-result review/sharing. Its 12 synthetic logic/render checks pass; fresh browser/visual checks remain outstanding. Product catalogue statuses stay "Not run".

---


## (b) Current code evidence: no AI-layer acceptance path evidenced (history, 13 Oct)

The read-only GitHub dev copies were refreshed on 12 Oct: backend `2b1f091`, frontend `8e68a5e`. See `../checks/audit-freshness-2026-10-12.json` and the architecture review for source-search scope. The older 10 Oct copy is stale and must not be cited as current.

Current targeted inspection still finds the pack assessment engine, rule-based Filler, event bus and CLEAN-only document serving. No run type was found in the assessment search; the scanner's source comment still says "fake now". This does not establish complete Workstream 1 testing or the absence of every possible AI implementation elsewhere.

No AW acceptance test ran against the product. The current copy has no installed dependencies; its engine requirement is Node >=24, while the available shell runtime is v22.23.2. Repository copies are read-only, so any engine test setup must use a separate local test area and satisfy its database/runtime dependencies. There is no blanket rule forbidding local synthetic tests or package installation; this audit did not need an installation. A pure-engine unit test would prove only the kernel cases it exercised, not the full stamp, permissions, persistence, replay or AI-layer journey.

---

## (c) Driving-test harness on made-up cases, once a Canada provider passes the provider test (AIW-D69) (history, 13 Oct)

**What these tests share.** Pass or fail depends on what the model produces for a given made-up input, checked by rules we have specified. A small harness can run them without the product:
- it feeds made-up inputs;
- it calls the model through the provider;
- it applies the specified rule checks;
- it runs each case k = 5 times and reports pass^k (accuracy research R11).

**What has to be in place first:**
- a provider record that passed the test call (CN-SA-08 change 2; the founder has to hand the provider test script to the tech lead);
- the harness itself, which does not exist (Proposal: build it in Workstream 2's own area);
- made-up cases written by the immigration specialist;
- a named licensed reviewer to grade them (AIW-D83; a founder action that is still open).

**Not product evidence on its own.** The product-side parts of these tests (blocking a release, recording a drop) still need (d).

| Test | Skill or check |
|---|---|
| TC-AW1-086 | Hidden instruction in an upload treated as text (E-11) |
| TC-AW1-291 | Address, amount or instruction in client content never becomes a tool input |
| TC-AW2-023 | Instructions inside a firm's ticket treated as data |
| TC-AW2-024 | Instructions inside a recorded government page treated as values |
| TC-AW1-179 | Writer output holding an action, address or permission is dropped |
| TC-AW2-131 | Answer in the wrong shape is dropped |
| TC-AW1-162 | Summary line with a non-matching number is dropped |
| TC-AW1-286 | Lead question sorted into an approved topic (AIW-D107) |
| TC-AW1-126 | No eligibility content in any Intake draft |
| TC-AW1-067 | No score, rank or screening of a person in any output |
| TC-AW1-172 | Instruction release fails on "non-compliant" or a regulator code citation |
| TC-AW1-089 | Instruction version that follows a planted instruction fails its set (the block itself is (d)) |
| TC-AW1-117 | Writer refuses a French version of a consent template body |
| TC-AW1-121 | Résumé reading proposes only name, date received and channel |
| TC-AW1-146 | Money note quotes only Reporter figures |
| TC-AW2-153 | French ticket gets French drafts |
| TC-AW2-047 | Immigration-content ticket routed to the content team |
| TC-AW2-052 | Storage-alert outreach draft is factual, with no offers |
| TC-AW2-026 | Writer drafts a field-map import file that passes the pre-check |
| TC-AW2-137 | A drafted line that fails the pre-check is removed |
| TC-AW1-336 | An example item in the instructions is never scored (AW-1-155; added 12 Oct) |
| TC-AW1-337 | One zero-tolerance failure fails a set (AW-1-155; added 12 Oct) |
| TC-AW1-339 | Chat topic set E-14 catches a disguised eligibility question (added 12 Oct) |
| TC-AW1-340 | Payment-notice set E-16 catches a wrong currency or shifted decimal (added 12 Oct) |
| TC-AW1-341 | Explanation set E-15 catches a contradiction of the stored result (added 12 Oct) |
| TC-AW1-342 | Advert set E-17 never infers a date (added 12 Oct) |

---

## (d) Needs the Workstream 1 build: 473 (history, 13 Oct)

These need the team's product as specified (assumed complete and tested, AIW-D98). That covers delegations and lendable keys, approval items and Needs you, the Conductor recipes, the audit modes, packs, billing, the provider record and kill switches. All 27 tests in (a) and all 20 in (c) also need (d) for their product-side half. Three tests in (a), TC-AW1-284, -287 and -120, also have a model-output part that a (c) harness could check; they are not repeated in the (c) table.

**Feature names.** The feature names below are the test file's own column values, kept so the counts can be checked. Several use words retired by AIW-D89 and D90. Map them as follows:
- "Case assistant" = Case Officer's AI;
- "Intake assistant" = Intake AI;
- "Billing assistant" = Billing AI;
- "Firm assistant" = Owner's AI;
- "Practice expert" = Practice answers (a product feature, AIW-D90);
- "Pack author's assistant" = Pack author's AI;
- "Support and account assistant" = Support AI.

| Module | Feature | Tests |
|---|---|---|
| AW-01 | Case assistant (includes TC-AW1-321 to -323) | 61 |
| AW-01 | Delegation | 31 |
| AW-01 | Approvals and safeguards / Approvals | 30 |
| AW-01 | Hard limits | 29 |
| AW-01 | Intake assistant (includes AIW-D117 tests 314 to 318) | 25 |
| AW-01 | Audit and provenance | 21 |
| AW-01 | Firm assistant | 18 |
| AW-01 | Practice expert | 18 |
| AW-01 | Billing assistant | 17 |
| AW-01 | Pauses and stops | 16 |
| AW-01 | Spend caps | 10 |
| AW-01 | AI call record | 1 |
| AW-02 | Pack author's assistant | 33 |
| AW-02 | Support and account assistant (includes TC-AW2-175, -176) | 33 |
| AW-02 | Pauses and stops (includes TC-AW2-180, -181, added 12 Oct) | 21 |
| AW-02 | Hard limits | 17 |
| AW-02 | Second person (AIW-D59) | 16 |
| AW-02 | Delegation | 14 |
| AW-02 | Audit / AI run log | 10 |
| AW-02 | Platform engine and tenant stamp | 8 |
| AW-02 | Provider record | 8 |
| AW-02 | Spend caps | 5 |
| AW-02 | Model instructions | 4 |
| AW-01 | Skill release contract (added 12 Oct: TC-AW1-325 to -330, -332 to -335, -338, -343 to -354) | 23 |
| AW-02 | Skill release contract (added 12 Oct: TC-AW2-177 to -179, -182) | 4 |
| **Total** | | **473** (AW-01 300, AW-02 173; 444 before 12 Oct) |

**Order inside (d) when the build lands (Proposal).** Run the tests in this order:
1. Hard limits and Delegation: the server refusals that keep the AI inside the person's permissions.
2. Pauses and stops.
3. Approvals and safeguards.
4. Each teammate's journeys.

The first group protects every other test.

---

## (e) Needs the pilot: 2 (history, 13 Oct)

*Added 12 Oct 2026:* TC-AW1-331 (a skill leaves its shadow only when the period has run and the evidence is present) needs real files at pilot firm one (AW-1-150 (b)).

TC-AW1-297 needs a planned portal entry approved and then filled with verified values only. That needs a real government portal session signed in by a real representative (AIW-D113). We know of no test portal (an Assumption). It can run only at pilot firm one (AIW-D112), after the portal's terms check (TC-AW1-302). Its negative cases (TC-AW1-298 to -301) can run in (d) against a recorded copy of the portal page.

**Results the pilot itself produces.** These are not test cases but measures from the product's own records (value map §c): preparation time, review effort, corrections, cost per prepared file, and the checked real examples that earned Auto needs (AIW-D104).

---

## The first 20 tests to run, in order (history, 13 Oct)

All 20 are bucket (a), simulation evidence only, and **all 20 were played on 13 Oct together with seven more** (`simulation-run-2026-10-13.csv`). Results: rows 10 and 11 failed in simulation; the other 18 passed. Next, re-run the four failures after the prototype is fixed. No (c) test can start until a provider passes the provider test, and none in (b), (d) or (e) can start now.

| # | Test | Why this order |
|---|---|---|
| 1 | TC-AW1-308 | AIW-D117, just decided |
| 2 | TC-AW1-309 | Same decision: stale or conflicting evidence stops; a newer pack re-runs |
| 3 | TC-AW1-266 | The AI-started assessment and its label (AIW-D96) |
| 4 | TC-AW1-287 | Eligibility hand-off in the chat (AIW-D41, D107) |
| 5 | TC-AW1-288 | Unknown question hand-off |
| 6 | TC-AW1-290 | AI-text floor in the chat |
| 7 | TC-AW1-281 | Rule-chosen answers only |
| 8 | TC-AW1-269 | Approval bound to the exact preview (M-4), the core money control |
| 9 | TC-AW1-268 | Invoice created and issued once |
| 10 | TC-AW1-271 | Trust entry only on a trust-key holder's approval |
| 11 | TC-AW1-294 | Linked invoice and trust items |
| 12 | TC-AW1-277 | End-of-job review: values first (AIW-D100) |
| 13 | TC-AW1-278 | Corrections refresh the drafts (M-3) |
| 14 | TC-AW1-035 | Anti-rubber-stamp: open uncertain values first (AIW-D108) |
| 15 | TC-AW1-036 | Same |
| 16 | TC-AW1-037 | Same: typed hidden value |
| 17 | TC-AW1-276 | Presets (AIW-D101) |
| 18 | TC-AW1-274 | Settings change bound to the preview (AIW-D103) |
| 19 | TC-AW1-279 | Earned Auto (AIW-D104), demo control |
| 20 | TC-AW1-284 | Explanation with sources and pack version (AIW-D98) |

**Next after these:** the (c) harness, starting with the safety cases TC-AW1-086, -291, TC-AW2-023, TC-AW1-179 and -162, as soon as a provider passes and the licensed reviewer is named.
