# End-to-end seed and journey plan (8 Nov 2026)

**Tech lead's review (Lead 33, 8 Nov ~09:55 IST), read before the plan.** The plan below was written by an independent planning agent (Fable model, high effort, read-only on main a228f5e25), on the founder's ask (~09:35 IST): one cohesive end-to-end test data plan. I checked its key claims against main and corrected these:
* **F9, F10, F12 and F13 are not open.** The founder answered all four on 7 Nov 18:25-18:36 IST (P-412). The agent read only main's DECISIONS, which ends at P-411; P-412 to P-418 are on `lead/2026-11-07-lead31` and reach main with the next records PR. So nothing in this plan waits on them.
* **Phase 1's blocker list is out of date.** B128 (#1256), B129 (#1275), B132 (#1278), B130 (#1290) and B152 (#1279) are merged, and QA-300 is closed (qa, 8 Nov). Still open: QA-165 (lane on #1318), C7.6 -12/-19 (QA-300 lane), and C7.7 -16/-18 (G25 and BR-9, C7.7 lane).
* **Confirmed: the C10.2 test conflicts with release 2.** `acceptance/C10.2.test.ts` (step C10.2-6) expects IMM 5707 Online and IMM 5257 as a validated PDF upload, but release 2 (`features/checkpoint/130-release-two.ts:1-3`) files IMM 5257 Online, with IMM 5645 as the family form and IMM 5476 signed by hand. Ruled for the C10.2 lane: the story uses release 2 as it is; the test's lines read the release's own lines (P-319, as for C7.7); a validated read-back is kept by moving one person's IMM 5257 to Paper (P-380 Q3), PENDING until QA-165 is fixed.
* **One real founder question:** DEMO.md row 18 (a fact entered once is reused across a person's cases and combinations) has no capability. It goes to the founder.

---

# End-to-end seed plan — every journey walkable on seeded data

Written 8 Nov 2026 against `origin/main` a228f5e25 (qa's 8 Nov re-score). Paths: S = `prototype/studio`, P = `product`. Every person, number and document below is **Sample**; immigration values marked **[official source needed]** come only from canada.ca with page, quote and date, or from the immigration expert (AGENTS.md rule 4).

## 0. What exists today (verified)

* **Reset to the six** loads configuration for six combinations and no case; nothing released (`S/samples/wave1.json` `setup.participants` per combination; `S/api/src/demo-reset-to-six.ts:1-2`).
* **The configured checkpoint** runs step files in name order through the screens' own services as user-A / user-C / user-B (`S/api/src/demo.ts:376-411`; a refusal stops the load and says the rule's words, `demo.ts:383-385`). Release 1 goes to every combination whose draft passes the validator (`features/checkpoint/110-release-one.ts:21-35`); release 2, mixed channels, to Visitor visa only: IMM 5257 Online, so IMM 5645 as family form, IMM 5476 a PDF upload signed by hand (`130-release-two.ts:1-3`). One case, SAMPLE-VV-FAMILY-1, on release 1 (`120-family-case.ts:1-5`, `S/api/src/sample-case.ts:19-24`). Adobe Validate is never simulated; validated copies live on the Mac (`150-filled-copies.ts:9-13`). IMM 5476 11-2025 arrives as a held new edition (`170-new-edition.ts:14-19`).
* **Firms, employer cases, fees and filing-number rules are files, not cases:** `S/samples/firms.json` (Sample firm: user-R, user-O, user-T; Sample solo practice: user-S), `employer-cases.json` (one Sample employer case per firm, copied once into a worker's case; L-SA5 in M4 replaces it), `fee-table.json`, `filing-numbers.json` (pattern from the team's AG-7-95, not IRCC).
* **Finished story (C10.2) is not built:** `demo.ts` has no `finished-story` route; the pack expects `POST /demo/checkpoints/finished-story`, two Visitor visa cases, four filings Ready to file, US$0 (`S/acceptance/C10.2.test.ts:13-39`). A lane is on phase 1 (per the Lead, 8 Nov; not on main yet).
* **Packs each build their own state**, by API as the acting people (`S/acceptance/lib/m3.ts:1-4, 26`), or by named scaffolding with SQL that never counts as Works (`S/tests/runtime/setup_visitor_visa.ts:1-5`; P-33, P-322).

## 1. Journey map

The person's journey and the capabilities each step exercises (statuses from `P/qa/CAPABILITIES.md`, 8 Nov):

| Step | Who | Capabilities | Status today |
|---|---|---|---|
| Setup | author | C1.2, C1.5, C1.6, C1.8, C11.3, C11.10, C11.12, C11.16, C11.17 | Works |
| Sources and library | author, content publisher, second person | C2.1-C2.6, C2.12, C3.1-C3.15, C11.11, C11.13-C11.15, C11.18 | Works (C3.16 Partial) |
| Questionnaires | author | C4.1-C4.11 | Works |
| Release | author, SME, approver | C5.1-C5.7, C4.8, C9.1 | Works |
| Case | case officer, firm admin | C6.1, C6.11, C6.12, C1.3/C11.5, C6.13, C6.16, C6.17 | C6.1, C6.11, C6.12, C1.3 Works; C6.13, C6.16, C6.17 Not built |
| Facts | client, principal, staff | C6.2, C6.3, C6.6, C6.10, C6.18, C6.9, C4.4, C3.16 | Works (C3.16 Partial) |
| Documents | client, staff | C6.4, C6.5, C6.14, C6.15 | C6.4, C6.15 Works; C6.5 Partial; C6.14 Not built |
| Forms | staff | C7.1, C7.2, C7.7, C11.6, C7.3, C7.8 | C7.1, C11.6 Works; C7.2, C7.3, C7.7 Partial; C7.8 Not built |
| Prepare and verify | staff, representative | C7.5, C7.6, C7.9, C7.10, C8.3 | C7.5, C7.6 Partial; rest Not built |
| Sign | applicant, parent, representative | C8.1 | Works |
| File | representative | C8.2 | Works |
| After filing | staff | C8.2 corrections, C9.2 (C8.4 team's) | C9.2 Partial |
| Change and adopt | author, approver, staff | C9.1, C9.5, C9.2 | C9.1, C9.5 Works; C9.2 Partial |

Alternative flows and where they live:

| Flow | Capabilities | Natural home |
|---|---|---|
| Family members: travelling spouse, child under 18 answered for by the principal, adult child answering alone | C6.10, C6.12 (family maximum, no biometrics under 14), C7.7 (forms by role and minimum age), C8.1 (a parent signs) | Visitor visa family |
| Adult privacy: "Send to …", principal sees progress only | C6.16, C6.10, P-411 | the adult child of that family |
| Linked employer and worker | C1.3/C11.5, C3.16 (organisation facts asked once), C9.2 breadth | With an LMIA inside Canada worker, relying on the Sample employer case |
| Two-filing sponsorship (sponsor never an applicant) | C6.12 breadth -22 (held as row S1), C8.2 (two numbers, one group), C6.13 (a dependent filing named in the warning), C6.14 | Spouse or partner sponsorship |
| Multi-stage | C6.17 (B139, #1262, founder question F13 open) | Provincial nominee, Express Entry: nomination done before we started, then the PR stage |
| Refusals and corrections (the product's own refusals; IRCC's decision is the team's, SI-18) | C7.6 CRITICAL warnings passed with a reason, C6.9 override, C7.5 acknowledge/waive, C6.5 typed-vs-document check, C8.2 "Correct a number" | every case; corrections on the filed one |
| Staff entry | C6.18 (B140, #1246), C6.6 "entered by staff" | a single adult reached by phone |
| Stale item after a change | C9.2, C7.3 section out of date, C8.3 approval withdrawn (F9 open) | the case left on release 1 |
| Channel per form | C11.6, C1.6, C7.3 (portal sheet), C8.1 (hand-signed scan) | release 2's mixed channels |
| Paper and Online | P-380 Q3 (one person's IMM 5257 to Paper with a written accommodation reason → Validate round trip, print, sign in pen); B132 PEN steps; P-113 answer sheets for portal-only PR forms (row S5) | Visitor visa family (Paper); Express Entry (answer sheets) |

## 2. The seed design: seven cases

Rule for every seed: loaded only through the product's routes as the acting people (user-A author, user-C SME, user-B approver, user-O case officer, user-R / user-T / user-S representatives, user-P client), as `demo.ts` already does for configuration. No SQL. **Why that makes the seed a test:** every rule the product has is exercised on the way, and a refusal stops the load and prints the rule's words as a row (`demo.ts:383-385`), so a seed that loads is a passed journey and one that stops is a found bug; permissions are exercised because the wrong actor gets 403 (`C10.2.test.ts:15`); a schema change cannot leave the seed silently lying, because it never writes tables; and under P-322 Works counts only where a real user meets it, so only product-built data is admissible evidence. The seed's fixed Sample facts are also the key for saved AI answers and saved validated read-backs (`lib/m3.ts:37` `FIXED`; `150-filled-copies.ts:9-13`): a value drift shows as "waiting", never as a fake pass.

| # | Seed (reference) | Combination, firm | People | Stage reached | Exercises | Depends on | Never fakes |
|---|---|---|---|---|---|---|---|
| 1 | VV-FAMILY-2 (the hero; phase 1) | Visitor visa release 2, Sample firm, user-R of record | Client A 40, Spouse 38, Child 10, Child 19 (dates far from the 14 and 18 thresholds) | **Filed:** one submission group recorded, then one "Correct a number" | family flow; adult privacy (C6.16 on the 19-year-old before signing); channels (IMM 5257 Online → portal sheet with entered ticks, C7.3; IMM 5476 hand-signed scan, C8.1); Paper for one person with a reason (P-380 Q3) → Validate round trip (C7.6's one hard block, C7.2); passport read by rules + typed-vs-document check (C6.5); case check with override (C6.9); rules review replayed (C7.5); representative review with one send-back round (C8.3); fees and biometrics step (C6.12); C8.2 record and correction | C7.6 Works (15/25 on main); **QA-165 Major** (16 of 46 mandatory IMM 5257 boxes empty on a ready copy: Validate cannot pass until fixed); QA-153/B128 (parents on IMM 5645); B129/B132/B130 (sign steps); B152 (fees frozen at recording); C6.16, C8.3 Not built → the seed stops at those steps and says so until they land | Adobe Validate (a person on the Mac, read back as B99 does); AI (replay, US$0; `C10.2.test.ts:35` checks `ai_batch`); approvals by a second person; IRCC numbers (Sample pattern) |
| 2 | VV-FAMILY-1 (exists) | Visitor visa release 1 | the checkpoint's family | **Adopted:** facts confirmed, one copy generated and validated, stays on release 1 while release 2 is out; then release 3 (IMM 5476 11-2025 through C9.1) and "What changes for this case" → adopt | row 16; C9.1 real new edition (not a synthetic change as `lib/sample-release.ts:1-4` makes today); C9.5; C9.2 (the validated copy marked out of date, file unchanged); the filed seed 1 untouched | F10 (#1252) answer; C9.1's saved comparison (#781); C9.2 breadth ruling | a changed signed or submitted item |
| 3 | SP-STUDENT-1 | Study permit outside Canada release 1, **Sample solo practice**, user-S | one adult student, 24 | **Ready to file, not filed:** warnings passed, figure shown | single adult; staff entry by phone of two background answers, re-confirmed by the client (C6.18); proof of financial support met by a substitute (C6.15, Sample set); must verify before filing (C7.9); readiness figure (C7.10); solo "I prepared and reviewed this myself" (C7.6-21); add a library form to one filing (C7.8); firms isolated (user-O sees nothing of it) | sp.outside release 1 on the checkpoint by product steps (B114 class of problem); IMM 1294 saved field map (R-146: verify a saved run exists); B140, B141, B142, B143 | a filing recorded with blocks open |
| 4 | WP-WORKER-1 | With an LMIA inside Canada release 1, Sample firm | worker 33 + spouse 31 | **Preparing:** employer facts linked, spouse's filing removed, forms generated | C1.3/C11.5 (relies on Sample employer case; copies once, Declared); C3.16 organisation facts asked once; C6.13 remove a filing; IMM 5707 and IMM 5476 maps reused, IMM 5710 new (DEMO.md reuse proof); C9.2 breadth (an employer fact changed on the case reaches the worker's items) | release of wp.lmia_inside by product steps (today only the "Start With an LMIA" shortcut reaches it: Demo release after 17 numbers, QA-212); IMM 5710 saved map; B135 (#1242); C3.16 case part Works | a live link to the employer file (copies only, SA-1B-283 r4) |
| 5 | FS-SPOUSE-1 | Spouse or partner sponsorship release 1, Sample firm | sponsor 36 (never an applicant), sponsored spouse 34, child 6 on the principal's filing | **Collecting:** two filings in one group with fees; sponsor's IMM 1344 and 5532 on the sponsor; marriage certificate asked once | two-filing sponsorship (S1); C6.14 one document for the application; C6.13 warning naming the dependent filing (refused, by design); C8.2 later: two application numbers, one group | S1 (#1074 fee part held); B115 (no screen adds the sponsor); IMM 1344/5532/5604 saved maps; **[official source needed]** sponsorship fee CAD 1,260 cited on #1074; sponsor and Schedule A questions to the expert (`P/DEMO.md` "Combination C"); B136 after C3.16 | the sponsor filing anything |
| 6 | PNP-EE-1 | Provincial nominee, Express Entry release 1, Sample firm | principal 41, spouse 39, child 20 non-accompanying | **Opened at stage 2:** nomination "done before we started", PR stage with police and medical lines blocking | multi-stage (C6.17); one filing with people on the principal's filing; the one hard block besides Validate (P-172, S4, **[official source: EE completeness check, cited in P-172]**); online lines IMM 5669/5406 as answer sheets (P-171 (3), S5, Sample); IMM 0008 DEP; nomination certificate line (Sample: no official page names it, `wave1.json` lines basis) | B139 (#1262, F13); S3-S5 rows; IMM 0008/5669/5406/0008DEP/5562 saved maps (R-146, R-98/R-101) | waiving an Express Entry police or medical line |
| 7 | LM-EMPLOYER-1 (optional, DEMO.md) | LMIA high-wage, Corporate | Sample Employer Ltd as applicant | **Opened only** | EMP5626 online-only form with no PDF → our-format answer sheet (C7.7 breadth, not built); later the real employer case seed 4 relies on (L-SA5, M4) | C7.7 breadth; L-SA5 | an ESDC form we do not hold |

Why seven and not more: each seed owns one combination and one stage, so the demo's "Everything" view shows the whole lifecycle at once, and no flow is proven twice. Why not fewer: the sponsorship, multi-stage and employer-link flows cannot live on a Visitor visa, and the solo firm needs a case of its own so firm isolation is seen, not assumed (P-335 keeps the two-firm checks as the spec).

**One gap, not to be papered over:** DEMO.md row 18 ("one fact entered once fills every form of every combination", B reuses A's family facts) has no capability or route for reuse across cases; C6.3 is within one case. Seed 4 therefore uses its own worker, and row 18 needs a founder decision (a returning-client mechanism, or the row is reworded to C6.3's meaning).

## 3. Dependency graph: the ordered build list

1. **Phase 1 (in progress): seed 1 to one filing recorded.** Blockers in order: QA-165 (Validate cannot pass with 16 mandatory boxes empty; without it the Mac read-back for the Paper copy cannot exist), B128/QA-153, B129 → B132 → B130, B152, C7.6 to Works. **Ruling needed now:** `C10.2.test.ts:27-28` asserts IMM 5707 Online and IMM 5257 as a validated PDF upload, which is `lib/setup_vv_m3.ts`'s channel choice, not release 2's (IMM 5257 Online, `130-release-two.ts:1-3`). The test must follow release 2 plus P-380 Q3 (Validate on the one Paper copy), or the seed cannot go green.
2. **Phase 2: seed 2's change-and-adopt** (release 3 from the held edition, adopt, stale). Needs F10, #1252, C9.2 breadth ruling. Small, because the case and the held edition already exist.
3. **Phase 3: seed 3, the solo student.** Needs sp.outside release 1 by product steps on the checkpoint (today's row 10 says which combinations release, `110-release-one.ts:21-35`), B140, B142, B143, B141; the IMM 1294 saved map.
4. **Phase 4: seed 4, the worker.** Needs a product-step release of wp.lmia_inside (replacing the shortcut's 17-number step, QA-212), B135, C3.16 case part; IMM 5710 map.
5. **Phase 5: seed 5, sponsorship.** Needs S1, B115, B136, saved maps for IMM 1344/5532/5604, the expert's answers **[official source needed]** on sponsor forms and the fee.
6. **Phase 6: seed 6, Express Entry multi-stage.** Needs B139 (F13), S3-S5, the PR form maps **[official source needed]** for police and medical rules beyond P-172's cited page.
7. **Phase 7 (optional): seed 7**, after C7.7 breadth and L-SA5.

Cross-cutting, first: the **seed data contract** (section 6, row 1): one file naming every seeded person, fixed dates with a "safe until" date (ages cross no threshold before it), channels per form per release, the Validate list, cites per value; B118's consistency test reads it.

## 4. How the seeds plug into tests

* **The seed is the journey test.** Each seed is one step file under `S/api/src/features/finished-story/` (B120's pattern, `demo.ts:382-385`), run after the configured checkpoint by `POST /demo/checkpoints/finished-story`; its row in the result dialog says done / partial / waiting / not built yet, with the rule's words. The `timings` the runner already keeps (`demo.ts:395`) give a per-seed load time.
* **One end-to-end test per seed:** `S/acceptance/E2E-<seed>.test.ts` loads the story on a fresh copy, asserts the end state by the API as the acting people (what the person would see), then the browser walk (`journey-test` skill) goes from the end state to the next capability's first step, by screens only (P-348 (3)). qa's one-walk rule stays the verdict.
* **Packs that should reuse a seed** (they need the seed's end state and only read or extend it): C9.5 and C9.2 on seed 2 (dropping `sample-release.ts`'s synthetic release), C8.2 corrections on seed 1, C1.3 on seed 4, C6.14 and the S1 steps on seed 5, C6.17 on seed 6, C7.10 and C6.18 on seed 3. Fewer set-up lines, and the pack proves the capability on the demo's own data (P-322).
* **Packs that should stay separate** (they probe refusals in many orders or mutate state): C7.6 blocks, C8.1 step order, C6.5 conflicts, C6.12 splits, C6.11 reassignments, C9.2's Undo. Rule: a pack may read a seed, never change it; if it must change state it opens its own case on the seeded release. Otherwise one pack's run breaks the next.
* **Speed against quality:** the finished story will take longer than the checkpoint (C10.2 allows 600 s, `C10.2.test.ts:17`). Seeds on different combinations are independent, so they can run in parallel inside the load; the budget to measure against is the checkpoint's time plus about a minute per seed. PR gate B runs only the seed its capability touches (B125's `GATE_B_DATA` gains a `finished` mode); the nightly runs the whole story and every E2E test on main (RULES "nightly full journey").

## 5. Risks and what not to build now

* **Not ours (P-249, P-335):** tenants, environments, real users, sign-up, invitations, client accounts, document storage beyond the thin stand-in (SI-9, SI-14), deadlines and reminders (SI-17), withdrawal of a submitted application (SI-18), a stored signature (SI-19), IRCC decision outcomes. One demo workspace, simulated actors and two Sample firms are enough.
* **No scenario framework, no SQL fast path:** step files and `samples/*.json` with cites (P-319), as the checkpoint does. The scaffolding setup scripts stay named scaffolding and never count.
* **Never fake** Validate (P-46, P-171), AI (replay only), second-person approvals (P-79), signatures, IRCC numbers. A seed that cannot reach a step stops and says why; that is the point.
* **Date drift:** fixed dates make replays and validated read-backs stable but ages move. Choose dates far from 14 and 18, record "safe until" in the contract, and let B118's test list the expired ones.
* **Immigration values:** seeds 5 and 6 lean most on **[official source needed]** values (sponsor forms, fee, Schedule A, police and medical rules, nomination certificate); they stay Sample and carry cites like `samples/checkpoint-stage-one.json` does.
* **Open founder questions gate three seeds:** F9 (C8.3) and F12 (C6.16) gate seed 1's last steps, F10 seed 2, F13 seed 6.

## 6. The first three rows to start next

| # | Row | Done when | Size |
|---|---|---|---|
| 1 | **Seed data contract** (`S/samples/finished-story.json` + B118's test) | one file names every seeded person (role, Sample name, fixed date of birth, "safe until"), every fixed fact a replay or validated read-back is keyed on, the channel per form per release for seeds 1-2 (release 2 + P-380 Q3 Paper copy, settling `C10.2.test.ts:27-28` by the Lead's ruling), the Validate list, and a cite or the label Sample per value; a test fails on an inconsistency (ages vs forms, "Same as" rows, a person's forms vs their role) and lists expired "safe until" dates; phase 1's step file reads it | S |
| 2 | **Seed 2 change-and-adopt** | on the finished story: the author decides the held IMM 5476 11-2025 comparison (C9.1, saved comparison, US$0), a second person approves, Visitor visa release 3 is out; VV-FAMILY-1 shows "What changes for this case" and adopts (C9.5); its validated copy reads out of date with file unchanged (C9.2); VV-FAMILY-2 untouched; `E2E-VV-FAMILY-1.test.ts` exit 0 on a fresh copy; walk at 1440 and 1024 px. Waits on F10 | M |
| 3 | **Seed 3 solo student to Ready to file** | sp.outside release 1 reached by product steps on the checkpoint (or its row says the validator's words); a case opened by user-S on the Sample solo practice; the client answers, staff record two background answers by phone and the client re-confirms (C6.18); proof of financial support met by a substitute (C6.15); the must-verify field passed with a reason (C7.9); IMM 1294 filled; the readiness figure shown (C7.10); self-reviewed; not filed; user-O sees no trace of it; `E2E-SP-STUDENT-1.test.ts` exit 0; walk. Steps for rows not yet built print "not built yet" until they land | M |

## Summary for the founder

1. Today the demo has one case on one release; every other journey lives only inside tests that build their own state.
2. The plan is seven seeded cases, one per combination and stage, loaded only through the product's routes as the acting people, so loading them is itself the test.
3. Phase 1 (the Visitor visa family filed) is blocked by QA-165 and a channel ruling on C10.2's test; then the thin case's adopt flow, then the solo student.
4. Sponsorship and Express Entry seeds wait on official values and your open answers F9, F10, F12, F13; the corporate seed stays optional.
5. Nothing is faked: Validate, AI, approvals and IRCC numbers stay real or stop the load and say why.
