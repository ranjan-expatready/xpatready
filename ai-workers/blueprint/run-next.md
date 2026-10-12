# What can run next: the AW test cases sorted by what each one needs

*Expat Ready, Workstream 2, Step R blueprint. Maker's draft, 13 Oct 2026. It goes to the checker, then the Lead. Nothing here was executed. Part of `blueprint.md` §7.*

**Source.** `requirements/tests/AW-test-cases.csv` as it stood on 13 Oct 2026. The file has 494 rows: **486 Not run** and **8 Withdrawn**. The brief counted 479 Not run. Since then the parallel AIW-D117 update added seven rows: TC-AW1-314 to -319 and TC-AW2-175. They are included below, so the five buckets add up to 486. If the AIW-D117 update changes the file again, the Lead recounts.

**Every test goes in one bucket: the earliest place it can honestly run.** A test in bucket (a) also lists its real home, because a pass on the prototype proves nothing about the product.

| Bucket | What it needs | Count |
|---|---|---|
| (a) Prototype simulation, now | Only `prototype/index.html`, a browser and the tester. Gives **simulation evidence only**. | **25** |
| (b) The 10 Oct code copy, now | AI-layer code that exists in `code/ERv2-sanitized@042be70-2026-10-10/` | **0** |
| (c) Driving-test harness on made-up cases | A Canada AI provider that has passed the provider test (AIW-D69), a small harness and graded made-up cases (AIW-D83) | **20** |
| (d) Workstream 1 build | The team's product: delegations, approval items, Needs you, the Conductor, permissions, billing, packs | **440** |
| (e) The pilot | Real files or real accounts at pilot firm one (AIW-D112), after the driving test and shadow | **1** |
| **Total** | | **486** |

---

## (a) Can run now against the prototype: simulation evidence only

**How to run.** Open `prototype/index.html` in any browser. It is a single local file and needs no install. Follow the test's steps on the screen named below. Record Pass or Fail and what the screen showed. Write the result as **"Simulated: pass"** or **"Simulated: fail"**, never as "Executed". The test's Status in the CSV stays "Not run" for the product. The prototype has no rules engine and no AI model, and it sends nothing (its About page says so).

| Test | Screen | Covers | Expected on today's prototype | Real home |
|---|---|---|---|---|
| TC-AW1-308 | 3 Assessment | Run proceeds with missing inputs | **Fail.** The prototype stops on missing evidence. AIW-D117 says expected missing inputs never stop the engine. | (d) |
| TC-AW1-309 | 3 | Stop on stale or conflicting evidence | **Fail on the missing case.** It also stops on missing. Under AIW-D117 a newer pack version means a re-run, not a stop. Test being updated. | (d) |
| TC-AW1-266 | 3 | AI-started run is automatic after the check, with the label | Pass expected | (d) |
| TC-AW1-284 | 3 | Explanation cites sources and pack version | Partial. The wrong-number drop is not simulated. | (c) and (d) |
| TC-AW1-287 | 6 Intake chat | Eligibility question handed to a person | **Expected fail.** "Am I eligible?" is answered by an approved template, not handed off. | (c) and (d) |
| TC-AW1-288 | 6 | Unknown question handed to a person | Pass expected | (d) |
| TC-AW1-290 | 6 | AI-written reply never sent unapproved | Pass expected | (d) |
| TC-AW1-281 | 6 | Chat answers only with rule-chosen published templates | Pass expected for the menu. AI topic sorting (AIW-D107) is not simulated. | (d) |
| TC-AW1-289 | 6 | Booking from the chat | Partial. It returns a booking-link template; there is no Scheduler. | (d) |
| TC-AW1-059 | 6 | AI-written client text waits for approval | Partial. Shown for a lead reply only. | (d) |
| TC-AW1-269 | 4 Billing | Changed tax rate voids the invoice approval | Pass expected (demo control) | (d) |
| TC-AW1-268 | 4 | Invoice created and issued once on approval | Pass expected | (d) |
| TC-AW1-271 | 4 | Trust entry runs only on the trust-key holder's approval | Partial. "No other output quotes a trust figure" is not checkable. | (d) |
| TC-AW1-294 | 4 | Linked items show each other | Partial | (d) |
| TC-AW1-277 | 2 File preparation | Review: values first, explicit checks, skipped steps | Partial. Skipped steps are not shown. | (d) |
| TC-AW1-278 | 2 | Correction re-renders dependent drafts | Partial. The sent-message task is not shown. | (d) |
| TC-AW1-035 | 2 | Approve-all disabled until uncertain values are opened | Pass expected | (d) |
| TC-AW1-036 | 2 | Approve-all enabled once they are opened | Pass expected | (d) |
| TC-AW1-037 | 2 | A value held out for the approver to type | Pass expected | (d) |
| TC-AW1-280 | 2 | Template send in a job after the four checks | Partial. The AI-text-in-a-merge-field case is not shown. | (d) |
| TC-AW1-111 | 2 | Biometrics date and the rule task due two working days before | Partial | (d) |
| TC-AW1-120 | 2 | Letter lists the facts used | Partial | (c) and (d) |
| TC-AW1-276 | 5 Settings | Presets: each step against checkpoints | Pass expected | (d) |
| TC-AW1-274 | 5 | Settings change prepared and bound to the preview | Partial. Refusal of protected settings is not shown. | (d) |
| TC-AW1-279 | 5 | Earned Auto conditions and drop back | Partial (demo control only) | (d) then (e) for real evidence |

**What a run of (a) is good for.** It checks that the prototype shows the agreed design. Three tests are expected to fail today: TC-AW1-308, -309 and -287. Together with the prototype's "designed for later" label on the conversational AI, those failures are the **prototype update list**:
- AIW-D117: missing inputs do not stop the run;
- AIW-D107: the conversational AI for leads is in Release 1;
- an eligibility question is handed off, not answered.

---

## (b) Can run now against the 10 Oct code copy: none

**Checked honestly** by searching the code copy on 13 Oct.

**What exists, all Workstream 1:**
- **The pack assessment engine.** Files: `apps/api/src/spine/pack-assessment-*.ts`, `pack-policy-interpreter.ts` (a pure kernel), `pack-policy-scoring.ts`, and the `PackAssessment` model (input hash, result hash, engine version, pack version; replay by idempotency key) in `apps/api/prisma/models/client-spine.prisma`.
- **The rule-based Filler.** File: `apps/api/src/spine/filler.service.ts`, a deterministic renderer.
- **An event bus named Conductor.** File: `apps/api/src/events/conductor-bus.ts`.
- **The document virus-scan status.** File: `apps/api/src/documents/document-av-status.schema.ts`; its own comment says the scanner is a fake for now.
- **The platform's SaaS billing (SA-04).** It has no metered quantity.

**What our search did not find:**
- any AI provider call (no Gemini, OpenAI or Anthropic client);
- an AI run log (`AiRunLog`);
- approval items or Needs you;
- AI delegations (the "delegation" matches are about sign-in and impersonation);
- firm-to-client invoicing (AG-06);
- lead capture;
- the presets or the grid.

Every AW test exercises an AI teammate or AI-layer control. So **no AW test can run against this code**.

**Could the team's own engine tests run locally?** Not safely today:
- The repository needs Node 24 or later (`package.json` "engines"); this machine has Node 22.23.2.
- There is no `node_modules`, so running anything needs `pnpm install` from the internet. That is outside our rules.
- Many of the tests need a Postgres database (`DIRECT_URL`).

If the founder wants the engine's own unit tests run, a team member with the toolchain runs `pnpm --filter @erv2/api exec vitest run src/spine/__tests__/pack-policy-interpreter.test.ts` in their own environment. That would move journey step 3.4 from Implemented to **Executed** for Workstream 1. It still proves nothing about the AI layer.

---

## (c) Driving-test harness on made-up cases, once a Canada provider passes the provider test (AIW-D69)

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

---

## (d) Needs the Workstream 1 build: 440

These need the team's product as specified (assumed complete and tested, AIW-D98). That covers delegations and lendable keys, approval items and Needs you, the Conductor recipes, the audit modes, packs, billing, the provider record and kill switches. A further 22 tests (the 25 in (a) less TC-AW1-284, -287 and -120, which are listed under (c) as well) and all 20 in (c) also need (d) for their product-side half.

| Module | Feature | Tests |
|---|---|---|
| AW-01 | Case assistant | 58 |
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
| AW-02 | Support and account assistant (includes TC-AW2-175) | 32 |
| AW-02 | Pauses and stops | 19 |
| AW-02 | Hard limits | 17 |
| AW-02 | Second person (AIW-D59) | 16 |
| AW-02 | Delegation | 14 |
| AW-02 | Audit / AI run log | 10 |
| AW-02 | Platform engine and tenant stamp | 8 |
| AW-02 | Provider record | 8 |
| AW-02 | Spend caps | 5 |
| AW-02 | Model instructions | 4 |
| **Total** | | **440** (AW-01 274, AW-02 166) |

**Order inside (d) when the build lands (Proposal).** Run the tests in this order:
1. Hard limits and Delegation: the server refusals that keep the AI inside the person's permissions.
2. Pauses and stops.
3. Approvals and safeguards.
4. Each teammate's journeys.

The first group protects every other test.

---

## (e) Needs the pilot: 1

TC-AW1-297 needs a planned portal entry approved and then filled with verified values only. That needs a real government portal session signed in by a real representative (AIW-D113). We know of no test portal (an Assumption). It can run only at pilot firm one (AIW-D112), after the portal's terms check (TC-AW1-302). Its negative cases (TC-AW1-298 to -301) can run in (d) against a recorded copy of the portal page.

**Results the pilot itself produces.** These are not test cases but measures from the product's own records (value map §c): preparation time, review effort, corrections, cost per prepared file, and the checked real examples that earned Auto needs (AIW-D104).

---

## The first 20 tests to run, in order

All 20 can run today and all are **(a) simulation evidence only**. No (c) test can start until a provider passes the provider test, and none in (b), (d) or (e) can start now.

| # | Test | Why this order |
|---|---|---|
| 1 | TC-AW1-308 | AIW-D117, just decided. Expected to fail; it confirms the prototype update. |
| 2 | TC-AW1-309 | Same decision: stale or conflicting evidence stops; a newer pack re-runs |
| 3 | TC-AW1-266 | The AI-started assessment and its label (AIW-D96) |
| 4 | TC-AW1-287 | Eligibility hand-off in the chat (AIW-D41, D107). Expected to fail. |
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
