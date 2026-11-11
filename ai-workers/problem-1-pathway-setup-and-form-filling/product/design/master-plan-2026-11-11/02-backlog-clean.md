# 02 · Backlog clean: every open item, one verdict, nothing silently dropped

Master analysis, part 2 of 8 (A19 (e); P-450: "whatever we have discussed should not get silently dropped off"). Read-only. Written 11 Nov 2026 ~13:0x IST.

**Lists covered (512 items):**
- `BACKLOG.md` (Lead's branch, 242 rows);
- `BACKLOG-requirements.md` (B1-B37) and `BACKLOG-requirements-qa.md` (B38-B50);
- the Bake plan's "outside the caps" rows (28-36) and its "not in the Bake" items;
- STATE's founder asks (A1-A19, plus A14-A17 from history) and "For the founder" (F2, F8, F14-F19);
- P-460's items;
- **every open row of `qa/BUGS.md`** (179, §6).

**How the verdicts were made:**
- A reader drafted each verdict against fixed rules.
- **done** needs a merged PR whose title or builder commits name the id, matched by a script over all 805 merges on main, or the capability's row reading Works. `lead:`/`qa:` records commits never count.
- I checked a random sample of ten "done" rows against main's merge commits; all ten matched.
- I added the bugs section and the analyst's notes below.

**Milestone words used** (defined in `07-m4-and-on.md`):
- **Bake:** M3.5, row number from the Bake plan.
- **M4:** any pathway by set-up, proven.
- **M5:** production running and polish.
- **M6:** the Chrome extension.
- **team:** owned by the team's platform (P-335, P-357, P-271, P-406).

## Verdicts in one table

| Verdict | Backlog lists (333) | Bugs (179) | All (512) |
|---|---|---|---|
| done (evidence) | 161 | 0 | 161 |
| Bake | 28 | 15 | 43 |
| M4 | 48 | 0 | 48 |
| M5 | 46 | 156 (111 into the UX lane's plan, 45 triage with a re-test first) | 202 |
| M6 extension | 2 | 0 | 2 |
| team | 8 | 0 | 8 |
| parked (by decision) | 1 | 0 | 1 |
| duplicate of X | 14 | 0 | 14 |
| **drop proposed to the founder** | **4** | 0 | **4** |
| check (exact check named) | 5 | 0 | 5 |
| open: founder | 9 | 0 | 9 |
| open: Lead | 5 | 8 (rulings on Ambiguity/Conflict rows) | 13 |
| mapped to two places (P-460) | 2 | 0 | 2 |
| **Total** | **333** | **179** | **512** |

## What the founder needs to see (through the Lead, one at a time)

**Four drops proposed.** None leaves the list without his yes.

| id | Reason | Decision / evidence |
|---|---|---|
| B108 (scale-phase design, draft PR #1086 open since 5 Nov) | the scale changes were built as rows B119-B123 instead | P-376 (6 Nov) |
| X12 | each of its parts was settled or replaced | P-271 (PQR runtime is the team's), P-188 workflow, the lead-watch skill |
| B12 (requirements list) | starter to-dos withdrawn; the to-do engine is the team's | SA1B-D118; BACKLOG row S5 |
| B35 (requirements list) | a per-pathway reset is no longer needed: the start page has three starting points and a reset | P-447 (2), BK-5 |

If B108 is dropped, close draft #1086. B108's "what breaks at 1,000" list goes to M5 row 12 (`07-m4-and-on.md` §4) so it is not lost.

**Nine open founder items:** A7 (book the immigration expert; answer Fable's Q16, which P-455 (3) already answered: Sample + test data only, so only the booking is left), and F2, F8, F14, F15, F16, F17, F18, F19 (each one line in §4b). None blocks the Bake.

## Analyst's notes on the backlog itself

1. **`BACKLOG.md` has no status column.** That is why 147 of its 242 rows still read as open though they are done. *Recommend:* the Lead moves the 161 "done" rows (with their PR numbers) to `history/BACKLOG-done-2026-11-11.md` in the next records PR. Records keep their facts (AGENTS rule 8): the rows move, they are not cut. BACKLOG then holds only open work, about 150 rows.
2. **Rows marked done whose capability is still Partial:** B141 (C7.8; QA-355, retest under way), B150 and L-SA6 (C6.6, needs its re-score). Done means built, not Works. They stay visible through the capability rows.
3. **About 30 small follow-ups with no merge naming them** (B54-B57, B65, B95, B105, B113 and similar) are placed in M4/M5. A later change may have fixed them; re-test before building.
4. **Bake rows BK-9, BK-11 and BK-13 are now being shaped or built** (Lead's rulings on part 1), so BACKLOG line 235 ("shaped when the founder approves it") is out of date.
5. **"A13" names two different asks:** the audit scores in STATE's table, and the demo-PDF request in history file 1220. *Recommend:* the Lead renames the second one in the next records PR.
6. **The bugs list:** 14 open Majors, all placed (10 inside the Bake, 4 outside the caps). Of the 165 Minors, 111 are UX and go to the UX lane's plan (`design/ux-2026-11-11/`); 45 are Bug/Gap Minors for M5 triage with a re-test first; 8 Ambiguity/Conflict rows need a Lead ruling (P-294). Walk 1 (BK-6) may promote any journey Minor to BK-7.

---
## 1. BACKLOG.md (Lead branch), 242 rows

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| R2 | Fees as a dated data table | **done** | #455 (R2 fees as a dated data table); C6.12 Works 15275921 |  |
| R3 | A minor's travel answers | **done** | #521 (R3 a minor's travel answers) |  |
| R4 | An eligibility rule's own outcome | **done** | #418 commit 'R4 (P-230 (1)): a gate's own outcome when not met'; C6.9 Works 78db1504 |  |
| L-doc | Document rules fields | **duplicate of B38** | BACKLOG-requirements-qa B38 | same change: copy kind, certified translation, validity on document types |
| B124 | C6.9: say when an outcome rests on unconfirmed facts | **done** | #1197; C6.9 Works 78db1504 |  |
| B125 | Gate B's checkpoint mode runs the pack alone | **done** | #1202 |  |
| B126 | QA-295 (Major): the submission record names the real preparer | **done** | #1212 (QA-295) |  |
| B127 | QA-296 (proposed Major): the representative's names on IMM 5475 | **done** | #1224 (QA-296) |  |
| B128 | QA-153 (Major): the parents' facts on IMM 5645 | **done** | #1256 (QA-153) |  |
| B129 | The sign steps refuse a recorded filing (B3 challenge M2) | **done** | #1275 |  |
| B132 | A Paper line's print and sign-in-pen steps are recorded | **done** | #1278 |  |
| B133 | `/prepare`'s fee totals carry their `basis` | **done** | #1274 |  |
| B134 | Label guard on a schedule | **done** | #1270 |  |
| B135 | C6.13 filing changes while preparing | **done** | #1242; C6.13 Works cfaa199f |  |
| B136 | C6.14 one document for the whole application | **done** | #1392; C6.14 Works cfaa199f | fallback question F18 open with the founder |
| B137 | C6.15 document substitute sets | **done** | #1268; C6.15 Works 65fed1e7 |  |
| B138 | C6.16 adult privacy and "Send to …" | **done** | #1257; C6.16 Works 751310cdb |  |
| B139 | C6.17 multi-stage case | **done** | #1262; C6.17 Works 66e74115 |  |
| B140 | C6.18 officer entry for background answers | **done** | #1246; C6.18 Works 65fed1e7 |  |
| B141 | C7.8 add a library form to one filing | **done** | #1248 | C7.8 still Partial (8d00b2a6) because of QA-355 = Bake #12 |
| B142 | C7.9 must verify before filing | **done** | #1282; C7.9 Works 3614e35b |  |
| B143 | C7.10 readiness figure per filing | **done** | #1389; C7.10 Works 3614e35b |  |
| B144 | C8.3 representative review | **done** | #1247; C8.3 Works 2cfdad96 |  |
| B145 | C9.5 adopt a published update on an open case | **done** | #1252; C9.5 Works 65fed1e7 |  |
| B146 | L-SA6 against C6.6 | **done** | #1241 (qa walk; fails became B150) | qa row: its output is the walk |
| B147 | C7.7 the Prepare application tab, as agreed (P-122, P-272) | **M5** | no merge names it; P-408 says the agreed tab was never built | screen polish; Lead may fold into the UX lane (A19 k) or BK-3 |
| B148 | C6.9 says P-236's words | **done** | #1250; C6.9 Works 78db1504 |  |
| B149 | Two words-and-evidence drifts | **done** | #1261 |  |
| B150 | Declared answers fill at once and say so (QA-301, QA-302, QA-303 Major; qa #1241) | **done** | #1251 | C6.6 still Partial e4d63f39 (re-score owed after #1282, #1369) |
| B151 | "B5b": the unpriced fee state names the people | **done** | #1295 |  |
| B152 | A recorded group's fee lines are frozen at recording (FQ-7) | **done** | #1279 | date question F14 open with the founder |
| B153 | Words and sizes follow `PRODUCT.md` | **M5** | not built: 'Child' still in web/src/runtime/cases.tsx:45 on main fbfb263c7 | wording/sizes polish |
| B154 | Author route for a library section's `client_only` flag (P-97) | **done** | #1272 |  |
| B155 | IMM 5645 Section C: siblings as a list | **done** | #1367 |  |
| B157 | One parent subject per person and relation, enforced by the database | **done** | #1378 |  |
| B158 | Parent section titles from the boxes' own names | **M4** | no merge names it | relatives (parents) section titles: M4 Track A relatives |
| B159 | A child's parents who are on the case are not asked twice | **M4** | no merge names it | relatives: parents on the case not asked twice |
| B160 | Six suites can never fail | **done** | #1289 |  |
| B161 | A Paper line's pen steps can be recorded by screens | **done** | #1340 |  |
| B162 | Ready to file is refused while a filing has no copy for filing | **done** | #1344 |  |
| B163 | IMM 5257 SCH1's 4 mandatory background fields get asked | **Bake #10** | bake plan row 10 'QA-165 + QA-318 (B163)' | QA-165, QA-318 open |
| B131 | Gate B says NOT TESTED, never green | **done** | #1237 |  |
| B130 | Signed and the scan name the printed copy (B3 challenge m5) | **done** | #1290 |  |
| L-follow | Suggest the next application on a case | **M4** | P-391 (after M3); no merge | 'upgrade a case': next application from follow rules |
| PA | Track A, data | **done** | #502, #508, #528, #603 (R-146 maps); #510 (PQR picks, step 5 jobs); #585 (C3.4) |  |
| PB | Track B, product gaps | **done** | C3.4 Works 40aa8037, C4.7 Works ceabd1a8, C4.11 Works bf12209f, C11.8 Works 44c927ae, C11.15 Works 64b67d05; K11 #512 |  |
| PC | Launcher run record | **done** | #524 |  |
| PD | Unique data paths for unnamed XFA subforms | **done** | #576 |  |
| PE | No machine paths in run files | **M5** | no merge; .githooks/pre-push on main has no home-folder check | pipeline hygiene; AGENTS rule 5 |
| PF | C4.11 step 5 replays its draft and checker from one live run | **done** | #539 |  |
| SH3 | Resolver contract | **done** | #509, #529, #541 |  |
| SH2 | One where-used service | **done** | #504 |  |
| SH4 | Release and pin-per-filing contract | **M4** | P-412 F10: 'per-filing pins come with SH4'; no merge | 'upgrade a case' (pin per filing) |
| SH1 | Merge the condition helpers | **M5** | no merge | code tidy: one condition helper |
| K10 | C11.10 open bugs | **done** | C11.10 Works a5653602; #340 (QA-121); QA-120/121/129 no longer in qa/BUGS.md |  |
| K1 | C2.12: To review reads `?form=` | **done** | #179, #285 (To review reads ?form=); C2.12 Works 2562de17 |  |
| K3 | C3.12: a "Published" date in the Forms list | **done** | #545; C3.12 Works fbe3f01f |  |
| K4 | C4.1: section order per combination | **done** | #284 (Move up / Move down); C4.1 Works c5608bb3 |  |
| K11 | C11.15 Majors QA-101, QA-102, QA-103 | **done** | #512; C11.15 Works 64b67d05 |  |
| K2 | C3.3: a person's walk of a failed AI run that keeps its good entries | **done** | C3.3 Works 4c3b16f0 (4 Nov) | qa row |
| K12 | C11.12 follow-ups from #478/#500 | **check** | no merge names K12 | check whether M3-S1 (#1505, filingMode co_files) replaced the two 'sponsor' keys, and whether the people step's Fix opens the folded card |
| UX-A | UX trust fixes | **done** | #554, #616, #622 |  |
| UX-D | Demo walkability | **Bake #4** | BK-4 sign in by role (role remembered); BK-3 links; BK-5 start page | P-274 row; no merge names UX-D |
| UX-E | Client-facing question wording by AI | **M4** | no merge | client-facing question wording drafted by AI: set-up quality |
| UX-C | Phone width for the studio | **M5** | P-274 'after the M2 gate'; no merge | phone width for the studio |
| UX-F | Review and release grouping and library consistency | **M5** | P-274 'after the M2 gate'; no merge | review/release grouping, library consistency |
| K13 | Smart questionnaire names on screen | **done** | #557 |  |
| B51 | Schedule Background questions (from #790 review Minor 2; P-318 (2)) | **duplicate of B58** | BACKLOG B58 | same change: Schedule background questions after each schedule's own instruction is cited |
| S1 | Signature default | **done** | #456 |  |
| S2 | Trial per edition | **done** | #482 |  |
| S3 | No hidden today | **M4** | not built: engine/render.ts:83 'opts.today ?? new Date()'; filings.ts:203 'age as at today' | date rule for min age and biometrics; sits next to BK-8 (Bake #22) |
| S4 | BUILT, approved, PR pending | **done** | #562 (S4 a case opens only on a startable release) |  |
| S5 | Withdrawn items out | **duplicate of B12** | S5 is the removal itself | 90/30 lines gone (domain/MASTERS.md no longer on main); B12 drop proposed below |
| S6 | Scale numbers | **M5** | no merge | scale numbers; the 1,000-case measured run (P-460 Scalable) replaces them |
| S7 | Zod | **M5** | not built: 'any' at web/src/components/conditions.tsx:20; fail() chains in api/src/studio.ts | hardening (with B32) |
| S8 | Re-trace SA-01B | **duplicate of A19 (f)** | STATE A19 (f) traceability round, running 11 Nov | same work: trace every requirement card |
| S9 | "For post" | **done** | #458 |  |
| G1 | Release refused: no source entry | **done** | #558, #569, #587, #615; C5.4 Works aa017f3a |  |
| G3 | Demo release path and mark | **done** | #471; C5.6 Works b8496bfe |  |
| G4 | Answer-key family editor and runner | **done** | #513, #525; C5.7 Works 4c3b16f0 |  |
| G2 | Release refused: no passing signed answer-key test | **done** | #568; C5.5 Works 4c3b16f0 |  |
| G-CORE | One guarded change pipeline | **done** | #556, #602; C11.13 Works 66fc6ec4 |  |
| G5 | Release needs a form line | **done** | #868; C5.1 Works a6fe6767 |  |
| D1 | Reset to the six | **done** | #407 |  |
| D2 | Live or Saved at every AI start | **done** | #435, #470, #475 |  |
| D3 | Record and verify Visitor visa's Saved results | **done** | #429, #468, #485, #530 | QA-144 no longer in qa/BUGS.md |
| T1 | Full test run on GitHub machines | **done** | #579; nightly runs on GitHub cited in CAPABILITIES (e.g. run 42425176291, C6.6) |  |
| D4 | #357 m3 | **done** | #501 |  |
| B52 | Yes/No facts (S1, next) | **done** | #967, #1037; C4.11 Works bf12209f |  |
| B53 | QA-225 follow-ups | **team** | P-335: 'B53 ... parked until M2 = 60 and offered to the team's platform' | tenant isolation is the team's |
| B54 | Recorded UCI (M3) | **M5** | no merge | filing record keeps the recorded UCI: hardening |
| B55 | Review page banner | **M5** | not built: 'Forms AI picked' banner still at web/src/pages/review.tsx:79 | polish |
| B56 | Placement Minors | **M5** | no merge | test + words follow-up of #936 |
| B57 | Undo stamp | **M5** | no merge | hardening (Undo stamp) |
| B58 | Schedule Background questions | **M4** | no merge | cite each schedule's own instruction; IMM 5669 Sch A is Express Entry content; IMM 5257 SCH1 part is Bake #10 |
| B59 | FEE-R01 to FEE-R04 | **M4** | no merge | fee rules into the trace, with the fee content of other pathways |
| B60 | No hard-coding (P-319) | **Bake #16** | B164 (#1501) and Bake rows 17-27 | P-319 chain now P-425/P-448; fee and role library screens are M4 Track A |
| B61 | C6.1 acceptance pack | **M4** | no acceptance/C6.1.test.ts on main | proof pack on the six and the checkpoint |
| B62 | Work-permit test family | **M4** | no merge | answer keys for the LMIA maps, expert-led: fill trials on every form |
| B63 | CI (c) and (d) | **M5** | no merge (golden journey exists: #737, #794) | owners/dates for quarantined checks |
| B64 | Cloud-lane flag | **M5** | no merge | lead-watch flag: factory |
| B65 | Section keys in refusals | **M5** | no merge | refusals name sections by key |
| B66 | Ask a Yes/No field as its own question (screen) | **duplicate of B83** | BACKLOG B83 | same change: ask a Yes/No form field as its own question by screen (QA-234) |
| B67 | Green card wording | **check** | no merge names B67; the quoted string is not in p5/ on main | check p5/transforms.ts:115-121 for a Yes with no number recorded |
| B68 | Representative of record (BR-20) | **done** | #1072 (undo refuses 'Uses a representative' with a representative of record); C6.11 Works 15275921 |  |
| B69 | IMM 5707 "minor travelling alone" | **M4** | no merge | who fills IMM 5707 'minor travelling alone', from the form's words |
| B70 | C4.8 leftover boxes (P-214, in flight) | **done** | #993 (leftover form fields filled by hand through the field map's route); C4.8 Works 53515cae |  |
| B71 | C4.1 Submit on the six | **done** | #993 |  |
| B72 | C3.6 rule on the six | **done** | #998 |  |
| B73 | C4.11 G5 Ready gap | **done** | #1040 |  |
| B74 | QA-162 paid conditions run | **done** | #1037 | QA-162 retest is Bake #13 |
| B75 | Field-map decision page words | **M5** | no merge; QA-230 open (Minor) | field-map decision page words |
| B77 | Protected set on the verdict's data (P-214, now) | **done** | #991 |  |
| B76 | Scale phase additions (P-336, P-339) | **M5** | no merge | factory tooling |
| B78 | C10.1 row 7: name the unheaded sections | **done** | #1062 |  |
| B79 | C10.1 row 10: Express Entry and Family sponsorship from their forms | **done** | #1050 (B79a), #1052 (B79b); C10.1 Works fd29643a | QA-144 no longer in qa/BUGS.md |
| B80 | check_ai_launch_paths leaves no state behind | **M5** | no merge | test hygiene |
| B81 | List value not on this form | **done** | #1057 |  |
| B82 | Checklist lines' deciding facts (QA-233, Major) | **done** | #1058 |  |
| B83 | Own-question screen (QA-234, Major) | **Bake #8** | bake plan row 8 'QA-234' (B83 named as source) | #1036 merged the back end; QA-234 still open |
| B84 | Schedule copies refused (QA-235, Major, C7.7) | **done** | #1060 |  |
| B85 | Question order | **M5** | no merge | question order (follow-up of B83) |
| B86 | Accepting a condition is a dead end (QA-237, Major, C4.11) | **Bake #6** | bake plan row 6 'QA-237 + QA-239' (B86, B88) | #1053 merged; QA-237 still open |
| B87 | Checker-unresolved item never Ready (QA-238, Minor, C4.7) | **M5** | no merge; QA-238 open (Minor) |  |
| B88 | A condition holds other combinations (C4.11, M2 end to end) | **Bake #6** | bake plan row 6 (B86, B88) | QA-239 open |
| B89 | Answer values for the 23 `code` fields | **M4** | no merge | cited answer values: content |
| B90 | `married` on IMM 5645's Applicant and Spouse | **M4** | no merge | waits on the immigration expert's answer |
| B91 | The sponsor's partner is the principal | **M4** | no merge | relatives: sponsor/partner resolution |
| B92 | "The sponsor" holder on document lines | **M4** | no merge | sponsor documents: other pathways' content |
| B93 | A conditional line drops "who" and "minimum age" | **M4** | no merge | pathway generality on all four combinations |
| B94 | Two "membership" and two "military service" sections on Express Entry | **M4** | no merge | Express Entry sections: other pathways' content |
| B95 | `draftOptionMaps` keeps the lowest version of each answer list | **M5** | no merge | hardening (answer list versions) |
| B96 | Shared `Tip` closes for a keyboard user | **M5** | no merge | screen a11y polish |
| B97 | Release 2 back in `demo.ts` | **done** | #1085 |  |
| B98 | CI check: routes with no screen | **done** | #1071 (route-has-screen) |  |
| B99 | C10.1 row 12b: a real validated IMM 5257 copy read back | **done** | #1123 |  |
| B100 | QA-240: "Choose the checklist page" has no control | **M5** | no merge; QA-240 open (Minor) |  |
| B101 | QA-241: 376 decisions to set up one combination | **M4** | no merge; QA-241 open (Minor) | screens-only set-up (fewer decisions); P-460-7 |
| B102 | A calculated fact added by a screen | **done** | #1222 |  |
| B103 | Gate B reads a named step across a capability's packs | **done** | #1374 commit 'gate B — a capability with several packs holds each pack to the named steps it prints' | non-records builder commit in a merged PR |
| B104 | M3 setup of the configured Visitor visa release | **done** | #1084 |  |
| B105 | Approver written as the draft's author | **M5** | no merge | hardening (BR-14) |
| B106 | Gate-authoring screen | **done** | #1172 |  |
| B107 | Representative facts on the forms | **done** | #1231 |  |
| B108 | Scale phase: the design | **drop proposed** | P-376 (6 Nov) built the scale changes as rows B119-B123 | design document never needed |
| B109 | Choose the page: only pages that fit | **M4** | no merge | form finder for any pathway |
| B110 | Record Super visa's own page | **M4** | no merge | content: record Super visa's page |
| B111 | A busy machine reddens the prepare suite | **duplicate of QA-278** | bake plan row 33 | same cause: many cases opened at once fail (5 s transaction) |
| B112 | Hardening pass | **M5** | #1100 one part only | B112 hardening is named in M5 |
| B114 | A condition on one combination stops another releasing | **done** | #1052 (names B114); QA-262 in BUGS-CLOSED |  |
| B115 | No screen adds the sponsor | **done** | #1131; QA-271 in BUGS-CLOSED |  |
| B116 | Row 12b's missing mandatory questions | **done** | #1123 (names B116); QA-318 rest is Bake #10 |  |
| B117 | The representative route refuses the role | **done** | #1148 |  |
| B118 | Sample data by design | **M4** | no merge | sample data by design; ties to P-460-5 (expert) |
| B119 | Records never block code | **done** | #1147 |  |
| B120 | One file per feature for the hot files | **done** | #1158 |  |
| B121 | Exact affected tests and contract checks | **done** | #1149 |  |
| B122 | Automatic flaky-test handling | **done** | #1145 |  |
| B123 | GitHub App for lanes | **M5** | no merge | GitHub App; needs the founder's owner-only step |
| B113 | "0 sections" on a combination with questions | **M5** | no merge | count wording |
| BK-8 | Biometrics ages per pathway | **Bake #22** | bake plan row 22 |  |
| BK-10 | Form rules into data | **done** | #1518 | Bake #24 |
| BK-12 | Sample case as a setting | **Bake #26** | bake plan row 26 | lane running 11 Nov |
| BK-14 | AI review on any pathway's forms (lifts stand-in SI-6) | **Bake #36** | bake plan row 36 |  |
| N1 | Merge PR #112 | **done** | #112 |  |
| N2 | Merge PR #111 | **done** | #111 |  |
| N3 | Merge PR #113 | **done** | #113 |  |
| N4 | After-merge on `main` | **done** | qa/reports/2026-11-01-after-merge-*.md (qa row) | QA-112 Minor still open |
| N5 | C1 "Before forms" | **done** | #139 |  |
| N6 | P-179 follow-ups | **done** | #121, #128 |  |
| N7 | Devin findings | **done** | #116 |  |
| N8 | Devin findings | **done** | #122 |  |
| N9 | Devin finding | **done** | #117 |  |
| N10 | Paid runs waiting on N1 | **done** | R-146 runs #502, #508, #528, #603; R-145 done 30 Oct |  |
| F1 | Set up the programme structure and each combination's card | **done** | C1.1-C1.8, C11.3, C11.12, C11.16, C11.17 Works |  |
| F2 | Bring forms into the library | **done** | C3.12, C11.11, C11.15, C2.12, C2.4 Works |  |
| F3 | Map form fields and trust each AI run | **done** | C3.1, C3.2, C3.3, C3.8, C11.8 Works |  |
| F4 | AI drafts the rest of a combination's masters | **done** | C2.6, C3.4, C3.6, C11.13, C11.14, C4.11, C3.11 Works |  |
| F5 | Keep the shared library tidy | **done** | C3.13, C3.14, C3.15, C11.9 Works |  |
| F6 | Build the questionnaires | **done** | C4.1, C4.2, C4.7, C4.6, C4.8 Works | QA-82 Minor still open |
| F7 | Demo reset and sample | **done** | C10.1 Works fd29643a, C11.7 Works 9b76016c; #300 |  |
| F8 | Review and release without gaps | **done** | #174 (X1a); C5.1-C5.4 Works |  |
| R1 | Thin runtime slice, rest | **M4** | C4.4 Works 59d2da74; C7.2 Partial bc8e33d5 | the Adobe Validate half = fill trials + Validate on every form |
| Gate | M2 gate | **done** | M2 60/60 Works; qa milestone walk on main bf12209f1 (fe262e1db) |  |
| N-LIFT | Count lift-readiness violations (P-249 (4)) | **M5** | no merge | read-only count of lift-readiness; B164 guard covers part |
| B164 | No combination key in engine code (P-425) | **done** | #1501 | Bake #16 |
| B165 | Split the five busiest files into per-capability modules (P-438 (3)) | **Bake #30** | bake plan row 30 |  |
| B166 | A +1 phone the filler cannot split into the 3-3-4 boxes (P-442 follow-up) | **Bake #35** | bake plan row 35 |  |
| B167 | Cite three product rulings in their capability rows | **Bake #35** | bake plan row 35 |  |
| B168 | Run the app on any Mac (co-founder copy, A12) | **check** | PR #1526 in review (STATE A12, 11 Nov 12:4x); not on main fbfb263c7 | done when #1526 merges |
| B169 | Spousal sponsorship's IRCC account on the six and the checkpoint | **check** | lane started 11 Nov (674fc63e1); no merge | done when its PR merges; else M4 content |
| B170 | Reuse the team's XFA engine where it makes sense (no rebuild, no force fit) | **check** | lane started 11 Nov (A16/A18); report owed | done when the report lands; else M4 |
| M3-S1 | Co-filed application with its own fees (general mechanism; was P-380's S1, C6.12 -22) | **done** | #1505 | Bake #17 |
| M3-S2 | Conditional extra filing (general mechanism; was S2, C6.12 -23) | **done** | #1513 | Bake #18 |
| M3-S3 | Waivable line with a reason (general mechanism; was S3, C6.4; P-171 (6)) | **Bake #19** | bake plan row 19 | #1524 in review |
| M3-S4 | Never-waivable blocking line (general mechanism; was S4, C6.4; P-172) | **Bake #20** | bake plan row 20 |  |
| M3-S5 | Answer sheet for online-only forms (general mechanism; was S5, C11.6; P-113) | **done** | #1507 | Bake #21 |
| X1a | Bug: a combination with 0 forms and 0 documents can be submitted, signed off and approved | **done** | #174 |  |
| X9a | Sample: add one off-list file with a readable edition (IMM 5476, 2021 edition) so held-fi… | **done** | #300 |  |
| X8a | `check_cost_warning_browser.cjs` waits 30 s for "Start live AI draft" to enable on the Fo… | **done** | #177 |  |
| X9b | #113 review Minors: m6 the "who signs" rule is written in both `render.ts` and `sources.t… | **done** | #300 |  |
| X1 | C2: StepBadge and `?focus=` landing on Documents and Questionnaires; then C3 Overview str… | **done** | #206, #210, #216 |  |
| X1b | The Programs card's filing-method tag | **done** | #244 |  |
| X1c | Sample rename | **done** | #275 |  |
| X1d | `run-suites.sh` gives `check_w1_structure_browser.cjs` a fresh copy | **M5** | no merge | local test runner hygiene |
| X2 | X2b: copying a form or document line from another combination, and adding or removing one… | **done** | #167; C1.5 Works 762dbae6 |  |
| X3 | held | **done** | C5.3 Works 4c3b16f0, C11.13 Works 66fc6ec4 | QA-82 Minor open |
| X4 | Open screens bugs QA-73, QA-74, QA-80, QA-113; stand-in chips (B49, P-165, R-134) | **done** | #118, #119, #120 | QA-80 Minor still open in qa/BUGS.md |
| X5 | P-156: library first + each combination's IRCC checklist page read into document lines (C… | **done** | #138, #142, #145; C2.6 Works 53515cae |  |
| X6 | W1-07 AI run experience: steps shown live, progress bar, plain errors, Stop (R-116; cap U… | **done** | C11.8 Works 44c927ae |  |
| X7 | W1-10 AI drafts the remaining masters from the PDFs and checklists (sections, document ty… | **M4** | C3.4 Works 40aa8037 for the drafting half | W1-16 attributes left: country variant, length and continuation (with B1) |
| X8 | Open forms bugs QA-75, QA-98, QA-101–107, QA-109–111; R-126 (a hand upload the rules cann… | **duplicate of QA-104..QA-111** | qa/BUGS.md QA-104, 105, 106, 107, 109, 110, 111 (open Minors) | Majors QA-101-103 closed by K11 #512 |
| X9 | Open runtime bugs QA-76–78, QA-91, QA-108, QA-112, QA-114–117 | **duplicate of QA-76..QA-117** | qa/BUGS.md QA-76, 78, 91, 108, 112, 114-117 (open Minors) | QA-77 closed |
| X10 | W1-12: Adobe checks of the official PDFs for the 5 combinations (+1 Corporate Sample); E1… | **M4** | no merge | Adobe checks on every form: fill trials + Validate |
| X11 | M2 gate: content publisher walk on the six combinations, like a person (S8, W1-13); inten… | **done** | same as row Gate: M2 60/60 Works |  |
| X0 | Done 31 Oct: see Features above | **done** | row text: 'Done 31 Oct: see Features above' |  |
| X12 | PQR/SQR boundary page against the team's modules (R-135, P-166); rule tracing check P-153… | **drop proposed** | P-271 (PQR runtime is the team's), P-188 workflow (Devin passes gone), lead-watch skill (test databases) | each part settled or replaced |
| G1-F | G1 follow-ups (build notes 9 and 11 on #558, tech lead 2 Nov): the save check refuses tex… | **M5** | no merge | hardening of G1's save check |
| C3.6-F1 | C3.6 follow-up (#573 Q3): where-used flags a retire of a document type, with its acceptan… | **M5** | no merge | where-used on a retire |
| C3.6-F2 | C3.6 follow-up (#573 Q4): `check_screen01_release_race` approves the document type ADD fi… | **M5** | no merge | test fix |
| C11.7-F1 | former spouse or partner | **M4** | no merge | relatives and person tables for IMM 5532 |
| C11.7-F2 | demo.ts row 12 still says "IMM 5257 has no saved field-map answer", stale since QA-163 (r… | **done** | #1009 removed the stale text (git log -S) |  |
| C9.1-AI | Ready (shaped by Lead 4, 2 Nov 20:40 UTC; M2 row C9.1) | **done** | #732; C9.1 Works 8b4b1b88 |  |
| L1 | W4 M3 case view build (design r5c agreed 29 Oct; M3-0 filing modes to runtime first; prin… | **done** | M3 case capabilities Works (C6.1-C8.3), M3 29/29 (P-451) |  |
| L2 | W2 immigration expert: second-person approvals, release gate, Sample values confirmed (AS… | **M4** | C5.1, C5.5 Works for the approvals and gate | expert-confirmed Sample values wait on A7 (book the expert) |
| L3 | W3 AI wherever designed: describe what you need, facts from documents, AI review, new-edi… | **done** | C6.5 Works bdf3b59e, C7.5 Works 87212b14, C9.1 Works 8b4b1b88 |  |
| L4 | W5 client and prospect: PQR, SQR, sign (after M3, P-129) | **team** | P-271 (prospect runtime is the team's); C6.7, C6.8 'Not built — Team' | client SQR (C6.2) and signing (C8.1) already Works |
| L5 | M4 (P-245): our AI-assisted Chrome extension, rows E1 structure reader + AI match per scr… | **M6 extension** | P-245; C7.4 Not built |  |
| L6 | Requirements not yet scheduled: B1–B49 | **duplicate of B1-B50** | sections 2a and 2b below | pointer row |
| L7 | Founder: branch rule on `main` (R-100, founder switches on in GitHub) | **M5** | gh API 11 Nov: main 'protected': false | founder's GitHub setting (R-100) |
| L-SA3 | M3, runtime: ready-to-file checks per P-237. Only a barcode form failing its own Validate… | **done** | #861; C7.6 Works 0e26bfbe |  |
| L-SA4 | scope | **done** | #1054; C3.16 Works cfaa199f |  |
| L-SA5 | Sample employer combination | **M4** | row text says M4; P-239 | Sample employer combination |
| L-SA6 | M3, runtime: Declared answers fill (P-242). Done when: a client's typed answer fills its … | **done** | #1251 (B150) | C6.6 Partial pending re-score |
| L-SA7 | M3, runtime: "Confirm & use" per document (P-242, with C6.5). Done when: values read from… | **done** | #1369 (C6.5 one 'Confirm & use'); C6.5 Works bdf3b59e |  |
| L-SA8 | M3, forms: must-verify-before-filing as a library field attribute set by the expert (P-24… | **done** | #1282 (B142); C7.9 Works 3614e35b |  |
| L-SA9 | M3, runtime: identity review collapse rule and correction count (P-243, with C6.5, C6.6).… | **done** | #1374, #1375; C6.5 Works bdf3b59e |  |
| L-SA10 | M3, runtime: officer entry for background questions and a re-confirm list at signing (P-2… | **done** | #1246 (B140); C6.18 Works 65fed1e7 |  |
| L-SA11 | Held | **done** | C11.13 Works 66fc6ec4 (guarded Add, AI 'did you mean' on every library) | whole-item co-pilot drafting to confirm at M4 Track A |
| L-C1112 | M3-0, screens (session c1112): C11.12 filing modes per role in three PRs (P-233; board ag… | **done** | #500; C11.12 Works c8c65785 |  |
| L-SA12 | Held | **team** | C6.8 'Not built — Team (P-271)' |  |
| L-SA13 | design only (P-246 (2), P-251): the release pin moves from the case to the filing; concep… | **duplicate of SH4** | BACKLOG SH4 | same change: release pin per filing (P-246 (2), P-412 F10) |

## 2a. BACKLOG-requirements.md (main), B1-B37

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| B1 | Purposes and overflow for list facts | **M4** | no merge | repeating groups and continuation |
| B2 | Who fills each field | **done** | C4.9 Works ceabd1a8; C6.18 Works 65fed1e7 | P-244 lets staff record background answers |
| B3 | Document substitute sets | **done** | as B137 #1268; C6.15 Works |  |
| B4 | Document validity warnings at upload | **M4** | no merge | document validity warnings (with B38) |
| B5 | Estimated completion time per section | **M5** | no merge | polish |
| B6 | Representative approves each form | **done** | as B144 #1247; C8.3 Works |  |
| B7 | Family members on different combinations in one case | **parked** | P-316 (1): SA1B-D72/D66 'stay held until the founder rules on each' | family on different programmes |
| B8 | Adult privacy and "Send to …" | **done** | as B138 #1257; C6.16 Works |  |
| B9 | Adopt a published update on an open case | **done** | as B145 #1252; C9.5 Works |  |
| B10 | Multi-stage runtime | **done** | as B139 #1262; C6.17 Works |  |
| B11 | Government steps, deadlines and responses | **M4** | no merge | case stages and deadlines: 'upgrade a case' |
| B12 | To-do starters per programme | **drop proposed** | SA1B-D118 withdrew starter to-dos (BACKLOG row S5) | to-do engine is the team's |
| B13 | Returning client reuses verified facts | **done** | C6.19 Works 0e0ccbb6 |  |
| B14 | Country-specific requirements section | **M4** | no merge | content |
| B15 | Corporate LMIA positions linked to worker cases | **M4** | no merge | employer side out of the Bake; P-239 timing follows the team |
| B28 | Report a mapping problem | **M4** | no merge | report a mapping problem: fill-trial loop |
| B34 | Start from a starter set | **M4** | no merge | set-up from the six (starter set) |
| B35 | Reset one combination | **drop proposed** | P-447 (2): BK-5 start page gives three starting points and a reset; D1 #407 | no longer needed |
| B36 | Dead endpoints tidy | **M5** | no merge | hardening |
| B37 | Filing channel from IRCC's line read by AI, not by keywords | **M4** | no merge; C11.6, C11.18 Works by hand | AI reads the channel |
| B16 | Eligibility gates and scoring grids per programme, as data | **done (gates) + team (scoring)** | C6.9 Works for gates; scoring grids, cut-off bands and what-if advice stay with AG-03: P-164 (1), STAND-INS SI-2 | corrected 11 Nov from "M4" by the v2.1 trace (03a) |
| B17 | Reference tables: fixed types, versioned definitions with key and range rules, console an… | **M4** | no merge | reference tables: M4 Track A rule tables |
| B18 | Regulator setup: representative types, licensing body, licence format checked against sam… | **M4** | no merge | regulator content |
| B19 | Government fees per category or sub-category, with who pays | **duplicate of B40** | B40 | same change: fee table with who pays |
| B20 | Labels and translation: every pack text per language, edited side by side | **M5** | no merge | labels and translation |
| B21 | Program tree housekeeping: disable instead of delete, reorder siblings as a set | **M5** | no merge; C11.9 Works covers retire | reorder siblings |
| B22 | "Next review" column, weekly content-team email, warning at publish | **duplicate of B45** | B45 | same change: next review and source freshness |
| B23 | Firm overlay: hide standard checklist items and steps without a deadline, rename client n… | **team** | P-335 (tenant work is the team's) | firm overlay is per tenant |
| B24 | Reminder data and key dates from document validity (the reminder engine stays the team's … | **duplicate of B39** | B39 | same change: key dates from document validity |
| B25 | Lead form: lead-flagged fields within a cap, warning above the cap | **team** | P-271 (prospect runtime is the team's) |  |
| B26 | ExpatReady delivery steps with a client label per language | **M4** | no merge | delivery steps per pathway |
| B27 | Field map export and re-import, all or nothing | **M5** | no merge | export/import tool |
| B30 | Website and campaign entry links per program or combination with Source and Campaign reco… | **team** | P-271; row says 'out of prototype scope, P-77' |  |
| B29 | General country-level PQR built automatically from released combinations' PQRs, opening t… | **team** | P-271; P-246 (1): the team's one PQR per country |  |
| B31 | Mac paths out of code and tests (P-82): find `psql`, `openssl`, `pdftotext`, `pdftoppm`, … | **M5** | not done: 239 files on main still name /opt/homebrew | B168 covers start-up only |
| B32 | One plain-words map for validator (zod) refusals in the Problem Details filter, instead o… | **M5** | no merge | with S7 |
| B33 | Suite tooling (qa suggestions 24 Oct): an opt-in coverage mode that leaves the drafting s… | **M5** | no merge | suite tooling |

## 2b. BACKLOG-requirements-qa.md (main), B38-B50

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| B38 | Document type rules | **M4** | no merge | document type rules (L-doc is its duplicate) |
| B39 | Key-date types and anchors | **M4** | no merge | key-date types |
| B40 | Fee table (dated, CAD) and fee rules | **M4** | fee data table done (#455, #1505) | fee-table library screen = M4 Track A |
| B41 | Filing record and package | **done** | C8.2 Works 9fd29921, C7.7 Works 3614e35b | portal upload slots per document type not built |
| B42 | Portal screen order | **done** | #1507 (M3-S5 answer sheet in portal order); C7.3 Works 0e0ccbb6 |  |
| B43 | Reference tables and rule-driving country lists | **duplicate of B17** | B17 | same change: reference tables and country lists |
| B44 | Field privacy, significance, re-confirmation and review-each classes | **M4** | no merge | field classes |
| B45 | Source freshness | **M4** | no merge | source freshness |
| B46 | Explanation-letter lines and the request-for-documents → document type map | **M4** | no merge | content |
| B49 | Stand-in chips | **done** | #91 (Stand-in chip) |  |
| B48 | Workspace snapshots (P-160) | **M5** | no merge | snapshots = backup/restore |
| B47 | One co-pilot "Ask" panel (P-159) | **M5** | no merge | co-pilot Ask panel |
| B50 | Only the proposer corrects a field returned for changes | **done** | #116 commit 'N7 / B50 (P-193): only the proposer corrects a returned field' |  |

## 3a. Bake plan, agreed outside the caps (rows 28-36)

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| P-451 (1) (row 28) | 8 CI shards (test run split eight ways), refreshed timings, suite-selection fix (4a) | **Bake #28** | #1502 merged (8 shards) | suite-selection fix (4a) still open |
| RULES (row 29) | Tests on Playwright's own browser, not the real Chrome | **Bake #29** | no merge |  |
| B165 (row 30) | Split the five busiest files, one PR each, kept only if merge conflicts fall | **Bake #30** | no merge |  |
| QA-332 (row 31) | A shared line with no matching adult skips minors | **Bake #31** | QA-332 open |  |
| QA-201, QA-181 (row 32) | Two tooling Majors (type check accepts project errors; qa's fresh copy builds an old bran… | **Bake #32** | QA-201, QA-181 open (#727 earlier part) |  |
| QA-278 (row 33) | Many cases opened at once: about half fail with a server error | **Bake #33** | QA-278 open | B111 is its duplicate |
| QA-383 (row 34) | IMM 5710: an inside-Canada worker cannot choose 'Canada' | **Bake #34** | QA-383 open |  |
| B166, B167 (row 35) | +1 phone the filler cannot split; three rulings cited in their rows | **Bake #35** | no merge |  |
| BK-14 (row 36) | AI review on any pathway's forms (lifts stand-in SI-6; review-runs.ts:68); placement for … | **Bake #36** | no merge |  |

## 3b. Bake plan, not in the Bake by decision

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| NB-1 | Polish of single screens and wording cuts (~18-22), decided at the cap walk | **M5** | P-447 (3) | screen polish and wording cuts |
| NB-2 | The seven rule tables on library screens (M4 Track A) | **M4** | P-448, P-449 | Track A |
| NB-3 | Relatives and repeating groups (M4 Track A) | **M4** | P-448, P-449 | Track A |
| NB-4 | Screens-only set-up (M4 Track A) | **M4** | P-448, P-449 | Track A |
| NB-5 | Fill trials on every form (after-29 step 11/12; question 3; = P-460 'fill trials') | **M4** | P-450, P-460 | fill trials on every form |
| NB-6 | Production running: job queue, storage, backups (after-29 steps 11, 12; = Scalable in P-4… | **M5** | P-450, P-460 | production running |
| NB-7 | The internal workspace (after-29 step 1e) | **M5** | P-450 | internal workspace |
| NB-8 | The Chrome extension (after these milestones; = BACKLOG L5 / M4) | **M6 extension** | P-450, P-245 |  |

## 4a. STATE founder asks (table rows)

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| A1-A4, A6, A8 | (grouped; see history files 0845 and 0840) | **done** | P-447 to P-449, P-453 to P-455 |  |
| A5 | 12:4x finish M3; then detailed milestone plan with counted lists before the Chrome extens… | **open: Lead** | P-463: the M4 count comes from this master analysis |  |
| A7 | Fable's questions 16-18 (internal use on what data; employer LMIA side in?; Chrome extens… | **open: founder** | Q17, Q18 ruled in the bake plan §6 | answer Q16 (internal use on what data) and book the immigration expert |
| A9 | 08:0x (11 Nov) archive finished sessions; watch disk; 7-hour goals; go to ~97% | **done** | STATE: done |  |
| A10, A11 | parallel lanes after the switch; token audit and connectors | **done** | STATE: answered |  |
| A12 | 08:3x (11 Nov) co-founder should see the latest app, behaviour and demo data as the found… | **open: Lead** | B168 PR #1526 in review | merge #1526, then tick |
| A13 | 09:3x (11 Nov) don't forget the hand-over audit's low scores | **open: Lead** | P-460 | scores in every milestone plan |
| A18 | 12:0x (11 Nov, typed, new account) start B168; the three rows stopped at 96% from their b… | **open: Lead** | B170 report owed |  |
| A19 | 12:2x (11 Nov, spoken) (a) check every worker in claude.ai; (b) obey all decisions; (c) 7… | **open: Lead** | (a) done, (k) UX lane started 12:4x | this analysis is (e)/(f) |

## 4b. STATE 'For the founder' F-items

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| F2 | Look at C6.9's new screen (A4, #1172) with reports/best-in-class-C6.9-A4-2026-11-07.md (L… | **open: founder** | B148 #1250 changed C6.9's words since | look at C6.9's screen; Lead recommends follow-up rows |
| F8 | Look on the demo at the M3 screens merged since P-392 (B1 documents, A2/QA-293 representa… | **open: founder** | B147 not built | look at the M3 screens on the demo (best with B147) |
| F14 | FQ-7: which date a recorded group's ages count on (B152 #1279: a submission recorded late… | **open: founder** | B152 #1279 built 'the recording day' | confirm which date a recorded group's ages count on |
| F15 | CI lane's D2 deviation (#1337): a Partial row reached only through a shared file its pack… | **open: founder** | #1337 | accept the D2 deviation; allow deleting two throwaway branches |
| F16 | C7.8 (B141) F1-F3: form with no passed trial is a Blank official PDF; blank added form wi… | **open: founder** | B141 #1248 | confirm C7.8 F1-F3 as built |
| F17 | C7.10 (B143) BR-9: the figure departs from BR-30 so that 100 means Ready (documents done … | **open: founder** | B143 #1389 | confirm the C7.10 figure as built |
| F18 | C6.14 (B136) when nobody matches: filing's first applicant or principal applicant (SA-1B-… | **open: founder** | B136 #1392 | first applicant or principal when nobody matches |
| F19 | QA-369 (C6.16): may Client A take back a link the firm sent to a new address, before the … | **open: founder** | B138 #1257 | may Client A take back a link (as built, P-443) |

## 5. P-460 items, mapped

| id | title | verdict | evidence | note |
|---|---|---|---|---|
| P-460-1 | Configurable 6 -> 8 (seven rule tables live in files) | **Bake #24, #26; M4** | BK-10 done #1518; BK-12 Bake #26 | library screens for the tables = M4 Track A |
| P-460-2 | Flexible 5 -> 8 (Visitor-visa-only guards, fixed family shape) | **Bake #16-21, #23, #27** | B164 #1501, M3-S1 #1505, M3-S2 #1513, M3-S5 #1507 done; M3-S3 #19, M3-S4 #20, BK-9 #23, BK-13 #27 open |  |
| P-460-3 | Scalable 5 -> 8 (one PDF process per form, in-memory queue, local disk, no load test) | **M5; Bake #33** | no merge | measured 1,000-case run is M5's exit; QA-278 in the Bake |
| P-460-4 | Fill trials on every form (Adobe Validate on a complete app-filled form; BK-11 fill-trial… | **Bake #25; M4** | no merge | BK-11 in the Bake; every form in M4 |
| P-460-5 | Sample content (expert pack #1510 merged; booking the expert is the founder's, A7) | **M4; A7** | #1510 expert pack merged | booking the expert is the founder's (A7) |
| P-460-6 | Adobe Validate on a complete app-filled form | **Bake #25; M4** | B99 #1123 (row 12b, IMM 5257) | every form in M4 |
| P-460-7 | Co-founder's 'too many fields' | **Bake #3, #14; M4** | BK-3 PR 1 #1519 merged | B101 (fewer set-up decisions) in M4 |

Not in the STATE table but in its history (A14-A17, not counted above): A14 live demo fill + Adobe Validate, dropped by the founder 11:3x → **done (dropped by founder)**; A15 resume/status/hand-over → **done (answered in chat)**; A16 reuse the team's XFA engine = B170 → **open: Lead**; A17 remove three connectors → **done** (f855e3103, Lead branch).


## 6. `qa/BUGS.md` (main fbfb263c7), 179 open rows

Rules: each Major goes to its Bake row; an Ambiguity or Conflict row needs a Lead ruling (P-294); a UX Minor goes to the UX lane's plan (M5); a Bug or Gap Minor goes to M5 triage with a re-test first. "Journey" here is a heuristic: any capability C1-C8 or C10.2.

| id | type · severity | capabilities | summary (shortened) | verdict |
|---|---|---|---|---|
| QA-387 | UX · Minor | C6.2 | A wrong answer the client typed is kept, and the client cannot clear it. Client questionnaire, a person's Personal details: type `UCI-12` in "Unique C… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-388 | UX · Minor | C6.2 | The questionnaire's "Part n of N" total jumps while the client answers. One family case (principal, spouse, child under 5), answered part by part with | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-389 | UX · Minor | C6.2 | Answering "No" to a Yes/No that opens a list still asks for the list. Client questionnaire › Government positions: "Whether the person has ever held | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-390 | UX · Minor | C6.1,C6.2,C8.3 | Every case-area page names the browser tab "Product Studio" (or the last Studio page's "Immigration programs · Product Studio"): the case page, the re… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-386 | UX · Minor | C10.2,C8.2 | A Paper filing recorded as submitted still reads "Print and sign in pen · In progress" and "4. Mailed to IRCC: not yet … It | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-385 | UX · Minor | C7.5,C7.6 | At 400 px, toasts from the Review page cover Ready to file's Pass buttons. After a quick Acknowledge (empty reason refused, then with a reason) | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-383 | Bug · Major | C6.19,C7.1,C7.8 | An inside-Canada worker cannot give a valid "current country of residence" on IMM 5710. On a With an LMIA case (configured checkpoint), `person.curren… | **Bake #34 (outside the caps)** |
| QA-384 | Bug · Minor | C6.19 | C6.19's concept still gives a refused passport country as its example. `product/screens/C6.19/concept.md:16` says "IND is not on the work permit's lis… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-365 | UX · Minor | C7.5,C7.6 | A finding is acknowledged or dismissed with a reason that has no words. `"..."` and `"---"` are accepted (200): `contracts/findings.ts` FindingReason … | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-367 | UX · Minor | C7.5,C7.6 | Ready to file's line for an AI finding does not say what disagrees. It reads "MAJOR finding on IMM 5257: the AI review (High) flags | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-370 | UX · Minor | C6.17 | The Start next stage dialog shows a deadline it will not use. The officer types the ending stage's "Study permit valid until" (31 May 2027) | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-371 | UX · Minor | C6.17 | The current stage calls a recorded client answer "Not recorded". A case opened at the work permit with the study permit done before, UCI 12345678: | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-372 | UX · Minor | C6.17 | Start next stage promises 5 forms; the new stage lists 2. The dialog reads "5 forms: IMM 5409, IMM 5475, IMM 5476, IMM 5707, IMM | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-373 | UX · Minor | C6.17 | At 400 px the Start next stage dialog cuts off Cancel. The footer is wider than the dialog: Cancel's box starts at x = -24.9 | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-374 | Gap · Minor | C6.17 | Open a case at a later stage shows no deadline. With the study permit's "valid until" typed, Open a case › Earlier stages shows no | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-382 | UX · Minor | C6.17 | "On file from Study permit … check it" stays after the new stage has its own copy. On the work permit stage the passport line | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-289 | Bug · Minor | C6.11,C7.7 | The firm record's office phone is an object (`samples/firms.json` `office.phone: {country_code: "1", number: "4165550100"}`) that `engine/runtime/team… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-290 | Bug · Minor | C6.11,C7.7 | The Sample firm record breaks the product's own rules: (1) the representatives' e-mails end in `.example` (`representative@sample-firm.example`, `seco… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-291 | Bug · Minor | C10.1 | `web/src/runtime/forms.tsx` gives the kept-on-the-Mac pill `data-validated-elsewhere`, but `Pill` (`web/src/components/ui/controls.tsx:137`) takes onl… | **M5 triage, re-test first** |
| QA-286 | Bug · Minor | C10.1 | Acting as Case officer, Demo › Load the configured checkpoint… › Load: `POST /api/demo/load` 403 "Case officer (simulated) does not hold the author du… | **M5 triage, re-test first** |
| QA-287 | Bug · Minor | C7.1 | On each IMM 5257, "Marked mandatory on IRCC's form, still empty (2)" names Taiwan PIN and Israel Passport Indicator each as "Question 1d. Have you | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-288 | UX · Minor | C7.1,C7.2 | On the case's Prepare application, all 20 Download buttons have the accessible name "Download the copy of 6 Nov, 09:51" (or 09:52), with no form | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-284 | UX · Minor | C6.1 | Add sponsor stays offered after the one sponsor the release allows; the limit is told only after a name is typed and Add pressed ("The | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-280 | Bug · Minor | C10.1 | After one Demo › Reset demo… and Close, opening Demo › Reset demo… again in the same page shows the earlier run's result ("1234 rows | **M5 triage, re-test first** |
| QA-281 | Bug · Minor | C4.6 | A double click on "Download the checked PDF" sends two `GET /artifacts/:id/file` (both 200): two downloads. #1134's "one download per press" guard is … | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-282 | UX · Minor | C4.6 | At 1024 px each Forms and coverage line squeezes the form name into a narrow column, one word per line ("IRM / 0002 / Request | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-275 | Bug · Major | C4.6 | Two fills of one form and person in the same minute write one file, named by the minute in UTC (`IMM1295-principal-2026-11-05T2051.pdf` at 02:21 IST).… | **Bake #9** |
| QA-276 | Bug · Major | C4.11,C5.1 | Move a shared question to a section the combination did not choose, with no form or rule reading it: Approve and release answers 409 "was | **Bake #7** |
| QA-277 | Bug · Minor | C11.9,C4.5 | Two older withdraw lines put the author's typed reason in `GET /activity`, read by another firm's staff: `api/src/lifecycle.ts:543` (withdrawing a lif… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-278 | Bug · Major | C6.1 | 48 distinct case opens at once: 23 × 201, 25 × 500 "Something went wrong on the server". Refused opens leave no pin and no | **Bake #33 (outside the caps)** |
| QA-279 | UX · Minor | C4.6,C5.1,C6.1 | Four small things met on the walk. Open a case: after an empty press, "Give the case a reference…" and "Give the principal applicant a | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-272 | UX · Minor | C10.1,C6.2 | Words the walk met. Row 10 gives a hedged reason for High-wage position ("no saved answer … or none was confirmed") though the load's own | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-273 | Bug · Minor | - | A typed note on a returned library change reaches another firm's staff through `GET /activity`. Steps: a new field waiting; the Approver returns it wi… | **M5 triage, re-test first** |
| QA-274 | Ambiguity · Minor | C10.1,C11.12 | A person whose only questions all sit behind a condition reads "No questions yet", though a case could ask them once a deciding answer is | **open: Lead ruling (P-294), then M5** |
| QA-267 | Bug · Minor | C4.11 | Approving a condition commits the decision first and writes the draft after, so a release landing in between marks the change RELEASED with no conditi… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-268 | Bug · Minor | C4.11 | "Hiding a value a condition reads" tests a text match (`engine/validate.ts:185`), so a reader that merely contains the question's condition passes. A … | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-269 | Bug · Minor | C4.3 | A question whose condition makes it required: Preview says required whatever the answer (`engine/render.ts` has no REQUIRE). A case on the same releas… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-264 | Bug · Minor | C4.9 | A who-fills change approved on a waiting new field stays APPROVED when that field is withdrawn, and the next release marks it RELEASED though its | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-265 | Ambiguity · Minor | C4.11,C7.3 | A case officer's unconfirmed Yes over a client's kept name: the copy writes the name beside a blank Yes/No ("answered on screen, not confirmed"). Fili… | **open: Lead ruling (P-294), then M5** |
| QA-266 | UX · Minor | C4.11,C4.5 | Words the walk met: a returned new field's row still says "a second person approves it"; a returned Undo of an ask says "Ask it | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-257 | Gap · Minor | C4.5 | An approved new field that only a document type's supply reads stays DRAFT when the release publishes that type naming it. Re-run by qa at | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-258 | UX · Minor | C11.9 | Approving a merge that keeps a field since withdrawn answers 409 "was retired", which is false: it was withdrawn | **M5 (UX lane plan)** |
| QA-259 | UX · Minor | C11.9,C4.5 | Approving a supplies change after one of its facts was merged answers 409 naming the key (`person.main_m2`), not the field's name | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-260 | UX · Minor | C5.1 | Review and release: a form field reading a waiting field with no question gives a line whose why starts with the key (`person.main_page_key: …`) | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-253 | UX · Minor | C2.6 | On a case, the 3 questions B82 asks read as a field's meaning, not as a question: "Whether the applicant holds a valid US nonimmigrant | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-254 | UX · Minor | C2.6,C6.4 | A conditional line's reason on the case ends in two full stops: "…'if applicable' note)..". Seen again on main 7636ba859 (qa, 7 Nov, `qa/reports/2026-… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-292 | UX · Minor | C6.4 | Case page › Documents › a line › Not applicable… › Mark not applicable with an empty Reason. Expected: focus moves to the Reason field | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-294 | UX · Minor | C8.2 | Case page › Submission to IRCC, a recorded submission of two filings: the two "Correct a number…" buttons (and the UCI "Correct…"/"Add…" buttons) have… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-297 | UX · Minor | C6.11 | Case team: after a refused "Change representative" (no reason) the toast repeats its sentence twice and stays on screen after the change succeeds, bes… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-298 | UX · Minor | C6.11 | The representative's tab: "Country or territory of a contact address" says "No fixed list for this answer yet: check it before confirming the section.… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-302 | Gap · Minor | C6.3,C6.6 | Ruled 8 Nov 05:36 IST by the tech lead: Minor; C6.3 stays Works. What is left is a gap in the safety net for every | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-304 | UX · Minor | C6.9 | On the case check, a link to an answer not yet confirmed ("Open Passport number in the Agent view, where its section is confirmed") opens | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-261 | UX · Minor | C11.15 | After a find that failed, the panel reads "AI found 0 forms for this combination", as if the find had worked. The reason ("This page | **M5 (UX lane plan)** |
| QA-248 | UX · Minor | C6.11,C6.12 | Add spouse or partner and Add child ask only a name. Expected: a date of birth, or the line "biometrics waits for the date of | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-249 | UX · Minor | C6.11,C7.7 | Agent view, Section B: labels read "Regulatory body … (values: cicc, law_society, chambre_notaires_quebec)". Expected: plain words, with the choices a… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-243 | UX · Minor | C1.3 | The copied employer address reads "…Canada" in the drawer but "…canada" (lower case) in the Agent view | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-241 | UX · Minor | C11.14,C3.2 | To set up one combination, Visitor visa on the six, a person must accept 191 proposals and a second person approve 185 library items, one | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-240 | UX · Minor | C11.10 | On Reset to the six, Visitor visa's next step reads "Waiting for the immigration expert: Choose the checklist page (No page matches)". Its link only | **M5 (UX lane plan)** |
| QA-239 | Gap · Major | C4.11 | A question's condition is library-wide. Approving one on Visitor visa puts "Hiding a value a form reads" errors, which refuse release, on every other … | **Bake #6** |
| QA-238 | Bug · Minor | C4.7 | A PQR pick can be Ready, so acceptable in bulk, while a round lists the pick's own quote as unresolved: `person.violent_organization_association`, on … | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-237 | Gap · Major | C4.11 | Following the product's steps on the six, accepting a proposed condition and having a second person approve it makes the draft refuse: "Hiding a value | **Bake #6** |
| QA-236 | Bug · Minor | C3.2 | The order a person applies a combination's saved field maps in changes the shared library. On a fresh Reset to the six, IMM 5257 first | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-234 | Gap · Major | C4.11 | To review › Form fields offers no way to "ask this Yes/No form field as its own question": the route (`POST /editions/:id/form-fields/own-question`) e… | **Bake #8 (retest first: BK-1 "probably fixed")** |
| QA-232 | UX · Minor | C4.5 | Documents › Passport information page copy › Change the facts it supplies…: the official line's Source is prefilled "IMM 5484, page " with no edition | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-230 | UX · Minor | C11.14,C3.2 | To review › Proposals says why each Decide item is Low ("The two AI rounds read it differently …"), but every row's only action is | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-224 | UX · Minor | C1.6 | Visitor visa › Forms: after the author changes a line's channel, the tab's own summary line "Filing: … · 8 forms · 7 set up" | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-223 | UX · Minor | C4.11 | Visitor visa › Smart questionnaire › Draft questions and documents › Draft with Saved (US$0): when the run is done, the line "15 items for | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-222 | UX · Minor | C10.1 | Demo › Load the configured checkpoint… › "Configured checkpoint loaded", row 10: each combination's problem list is cut at a fixed length in the middl… | **M5 (UX lane plan)** |
| QA-220 | UX · Minor | C11.9,C5.3 | Shared library › Fields: after the Approver approves a new shared field on To review (library_change APPROVED, decided_by user-B, audit "Approver appr… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-217 | UX · Minor | C3.4 | To review › Proposals › IMM 5257 (09-2023): the form check "When military service is declared, dates and countries are given" is badged Ready to | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-216 | Bug · Minor | C11.7,C2.12 | Demo › Reset to the six, then each Retail combination › Forms. On 4 of 5 (Study permit › Outside Canada, With an LMIA – | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-213 | Bug · Minor | C5.5 | One Sample check switches off the answer-key gate on a source-backed combination. `engine/validate.ts:281–287` `isDemoSnapshot` is true when any check… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-211 | UX · Minor | C11.14,C3.2,C4 | On the six, all 192 near duplicates on To review are field-map items. They are accepted on their form-field page with the drafter's own reason | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-210 | Bug · Minor | C11.14,C3.2 | Applying a reviewed field map (`POST /jobs/:id/apply`, `api/src/sources.ts:877–920` `Sources.apply`) runs in one interactive transaction with Prisma's… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-205 | UX · Minor | - | One file, two edition labels. The library says "IMM 5475 (05-2021)", the label the file itself prints, while Visitor visa's form line and the official… | **M5 (UX lane plan)** |
| QA-204 | UX · Minor | C11.7 | Demo › Reset to the six says "This takes about half a minute", but on a fresh isolated copy it took 177.1 s (the done | **M5 (UX lane plan)** |
| QA-203 | UX · Minor | C9.1 | New edition review (To review › IMM 5476 new edition, Comparison tab): rows whose box has no printed caption show the raw form-field path as | **M5 (UX lane plan)** |
| QA-202 | Bug · Minor | C11.14,C3.2 | Checks that plant a Sample checker run write it into the shared `prototype/p2/runs` (`check_gcore_b5_field_map_bulk.ts:43`, also `check_forms_qa193_ba… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-201 | Bug · Major | - | `product/tools/typecheck.mjs:24-25`: when tsc exits non-zero, any output containing "error TS…" is accepted, and only `file(line,col): error TS…` line… | **Bake #32 (outside the caps)** |
| QA-181 | Bug · Major | - | In a fresh cloud clone, `lane.sh bind qa` checks out the qa lane's old branch `claude/qa-l10-e3c849` (30 Oct, history unrelated to main), `lane.sh set… | **Bake #32 (outside the caps)** |
| QA-185 | Conflict · Minor | C1.6,C4.6,C6.1 | For With an LMIA the same combination shows questions 272 (Overview, per role summed), 195 (Preview to ask), 165 (Review fields), 77 (case client view… | **open: Lead ruling (P-294), then M5** |
| QA-186 | Bug · Minor | C5 | Review and release (/release) says "177 draft changes across 2 combinations and 86 library changes": 177 = 91 + 86, so the library changes are | **M5 triage, re-test first** |
| QA-187 | UX · Minor | C11 | A missing or wrong-typed field answers 400 "Invalid input: expected string, received undefined" with no field named in `detail` (only in `errors[].fie… | **M5 (UX lane plan)** |
| QA-188 | Gap · Minor | C6 | `GET /api/releases` answers 200 to Client A, the case officer and representatives (`@CaseRead`, `api/src/main.ts:95`) with author, submitter and appro… | **M5 triage, re-test first** |
| QA-189 | Bug · Minor | C10.1 | Demo › Load the configured checkpoint: row 12 says "IMM 5257 has no saved field-map answer under today's 5-part drafting: it waits for the founder's | **M5 triage, re-test first** |
| QA-190 | UX · Minor | C11.14,C3.2 | On a form's AI field-map page (six loaded, e.g. Study permit › IMM 1294), each new-definition proposal's recommendation button reads "Create person.ap… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-179 | UX · Minor | C11.10 | Programs' "Needs you" counts combinations (5), and To review's "Needs you" counts rows (16 for the author, 17 for the approver and expert): the same | **M5 (UX lane plan)** |
| QA-177 | UX · Minor | C5.4 | The Source panel prefills the source words with the item's own quote, which for some numbers does not contain the number ("Passport issue date: before | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-178 | Bug · Minor | C11.10,C5.4 | Right after Approve and release, the combination header still read "In Release 1 · 17 draft changes" and "Forms 2 to do"; after a reload | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-175 | Bug · Minor | C11.7,C2.12 | A second Saved replay of IMM 5257 while its first draft still waits doubles its proposals on To review (84 → 168). #563's body calls | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-173 | Bug · Minor | C3.4 | `check_forms_c34_masters.ts` 28/29 on main: it takes the first answer list matching /marital/, which is now the 2-choice "Marital status history" besi… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-171 | UX · Minor | C7.3,C7.7 | The principal's IMM 5257 row shows a raw field key inside a hand-fill sentence, and the card says "1 fact to answer or confirm" beside | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-172 | UX · Minor | C11.12,C4.1 | The author's Questionnaires page shows a section titled `intended_work` (raw key) and a question labelled with its meaning text. Expected: the library… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-169 | UX · Minor | C11.13 | `POST /api/change-sets/check` R4 says "no.such is not in the shared library.": the raw key, not a name a person knows (`api/src/change-sets.ts:249`). … | **M5 (UX lane plan)** |
| QA-166 | UX · Minor | C4.4,C6 | The client is asked, for a child of 10, "Whether the person has any children…, derived from the child records held for the person": the | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-167 | UX · Minor | C6 | After confirming, Confirm section stays clickable, and a section shows "intended_work …: 0 answers confirmed" (raw key, see QA-152). Expected: Confirm… | **M5 (UX lane plan)** |
| QA-168 | Ambiguity · Minor | C6.4 | The child's "Custody documents" line applies whenever custody is sole or shared, whatever the child travels with; its cited IMM 5484 words cover minor… | **open: Lead ruling (P-294), then M5** |
| QA-165 | Gap · Major | C7.2,C7.3 | Retest on main d4897ce1b after #1370 (8 Nov 23:32–23:35 IST, qa; two fresh checkpoint copies; the project's XFA reader; `qa/reports/2026-11-08-rescore… | **Bake #10** |
| QA-162 | Gap · Major | C4.11,C4.7 | qa retest on the C4.11 stack's head 414289ef6, 5 Nov ~20:55 IST, US$0: no paid run needed; closes when the stack lands. #1037's pair (5 | **Bake #13 (retest in walk 1)** |
| QA-158 | UX · Minor | C5.6 | A case pinned to a Demo release shows its release ("With an LMIA · release 2" on New case and the case page) with no | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-160 | UX · Minor | C11.12 | With #469, every unwritten question on the author's Questions tab repeats "No question written yet (the field's name is shown)": 143 of 143 rows on | **M5 (UX lane plan)** |
| QA-155 | UX · Minor | C6.4 | A checklist line in `waiting` (e.g. the letter of authorization before "travelling alone" is answered) is listed with an id; `POST /runtime/checklist-… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-151 | UX · Minor | C11.6 | A request whose body is not valid JSON answers 400 with the JSON parser's own words, e.g. `PATCH /runtime/items/:id/channel` → "Unexpected token '"', … | **M5 (UX lane plan)** |
| QA-150 | Gap · Minor | C11.3 | Full trail still missing in two places: Shared library › Forms "Used by" names "Visitor visa · Visitors" (filter: "Visitors › Visitor visa"), and the | **M5 triage, re-test first** |
| QA-147 | UX · Minor | C1.5 | The Copy/Remove dialog reads a line's condition as "only if if using an authorized representative…": `api/src/lines-bulk.ts:107` puts "only if" before… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-142 | UX · Minor | C5.3 | To review: the row for a new document type says "Approve or return the new field". Words for a field, not a document type. … | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-141 | UX · Minor | C5.1,C5.3 | Review and release says "0 errors", then Approve is refused because a new document type is still waiting on To review. The approver learns this | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-140 | Conflict · Minor | C5.1,C6.1 | The studio says "Released as Release 2" / "In Release 2" (the workspace pack number). Open a case and the case say "release 1" (`config_release.versio… | **open: Lead ruling (P-294), then M5** |
| QA-139 | UX · Minor | C7.1 | Generate a copy of IMM 5257: the "To write by hand" list shows engine words (`step "derived:any(person.other_family_name, …)" is not in the executable… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-138 | UX · Minor | C11.8 | Forms › IMM 5257 › Draft with AI offers "Live AI call … up to US$5" as a choosable option while the tab says "AI | **M5 (UX lane plan)** |
| QA-137 | UX · Minor | C3.10 | On a 390 px phone the shared field page (/library/fields/person.uci) scrolls sideways by 5 px: the Definition box (Name field with the Rename button b… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-136 | UX · Minor | C3.2 | After Reject on To review › Proposals the notice says "Decided 1 proposal · New library items wait for a second person on To review." | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-134 | UX · Minor | C11.18 | Forms drawer › What IRCC accepts: the account hint says "Any account, or the one account this applies to (P-143)." — a decision id on | **M5 (UX lane plan)** |
| QA-132 | UX · Minor | C11.1,C4.6 | Preview shows an Online line as "Filled on the portal (Online) · IMM 5707 …" with no "later wave" note; the Forms tab and fill | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-133 | UX · Minor | C4.1,C4.8 | After a section is removed from a combination's questionnaire, Review and release lists 17 warnings "Placed in section submitted_documents, which this… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-131 | UX · Minor | C1.5 | `POST /api/lines/bulk/preview` with a body that is not JSON answers 400 "Invalid input: expected object, received undefined" (the validator's words, n… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-130 | UX · Minor | C2.12 | Guided path of IMM 5257 (Visitor visa): "Your next step: Draft with AI or add from the library" only closes the panel; focus drops to | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-123 | UX · Minor | C4.10,C4.2 | Closing a Questionnaires details drawer (Save, Escape, Cancel) drops focus to the page body … | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-124 | UX · Minor | C4.2 | Bulk toast: "Pre-qualification on on 1 question" … | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-118 | UX · Minor | C1.8 | Line drawer › Copies: typing 3 and pressing Enter does nothing; a keyboard person must Tab to Save to draft. No drawer or dialog in | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-112 | UX · Minor | C4.10 | Questionnaires drawer on a case fact the case officer enters (IRCC application file number): "No document on The case (asked once)'s checklist supplie… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-114 | UX · Minor | C4.9 | After approval, before any release, the drawer says "In the shared library: filled by the client." next to "Approved: the client fills it … from | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-115 | Ambiguity · Minor | C4.5 | With an LMIA (sample): the header says "Documents specific to an LMIA are not configured yet" while the Documents tab lists "Copy of LMIA …" | **open: Lead ruling (P-294), then M5** |
| QA-116 | Bug · Minor | C4.5 | `check_w115_slice3_browser.cjs` failed once in the full run (34/35, "Undo pass: the line is back and nothing is listed as removed — 0 Removed in this | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-117 | UX · Minor | C4.10 | Questionnaires › Spouse or partner lists "Application details · 0 questions for Spouse or partner" and "Representative and authorizations · 0 question… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-104 | Bug · Minor | C1.7 | IMM 1294 attached by the finder defaults to "PDF upload" though the library records IRCC accepts it Online only → "Blocks release … Choose a | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-105 | UX · Minor | C11.15 | The find dialog's description says "AI reads … attaches the ones both rounds agree on" in every mode, also Rules only (attaches nothing, no AI) | **M5 (UX lane plan)** |
| QA-106 | UX · Minor | C11.8 | AI work list shows a finder run's cost bare: "US$0.27 / US$5.58"; its run card and run page say "about US$0.31 · at most US$5.58 | **M5 (UX lane plan)** |
| QA-107 | UX · Minor | C11.15 | "IRCC's words" keep page link text: "Declaration (IMM 5646) (opens in a new tab) . Pages 1", "… (IMM 5409) (opens in a new tab), | **M5 (UX lane plan)** |
| QA-108 | UX · Minor | C3.10 | The Load sample summary says "164 canonical fields added, 0 canonical fields reused" and "form-native form field checks stay with the field map" … | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-109 | UX · Minor | C3.7 | Shared library › Forms: IMM 1294 (used by Study permit's draft) offers Delete greyed with "retire it instead", but its row has no Retire: a | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-110 | UX · Minor | C11.15 | Find again → plan dialog → Escape or Cancel: focus goes to the page body, not back to Find again … | **M5 (UX lane plan)** |
| QA-111 | Bug · Minor | C11.15,C11.8 | When the live find ended, the Forms tab still said "3 forms attached, 0 set up" and Next step "Add 3 forms from the library" | **M5 triage, re-test first** |
| QA-76 | UX · Minor | C7 | Retest 0dbcbd84 (#428): `check_qa76_words.ts` 10/10. The plan stage ("forms slice 2") and decision codes are gone from the case engine, the questionna… | **M5 (UX lane plan)** |
| QA-78 | UX · Minor | C11.15,C11.6 | Retest 25cefb67 (#252): the Live combination with 8 forms now says "8 forms on this combination · Added without an AI find" (fixed). Still: the | **M5 (UX lane plan)** |
| QA-80 | UX · Minor | - | Retest deda0e6b: page titles "<page> · Product Studio", one name per person, header fits at 1024, AI work page heading. Still "Product Studio" alone o… | **M5 (UX lane plan)** |
| QA-82 | UX · Minor | C11.12,C6 | The author's Questions tab part is fixed by #469 (merged; retested on main ae5a5605: `check_c41_questionnaire_roles.ts` 9/9): an unwritten question sh… | **M5 (UX lane plan)** |
| QA-91 | UX · Minor | C11.12 | Who can be › AI now runs both rounds inside one HTTP request (`people-ai.ts` propose: up to 2 rounds × 2 attempts × 300 s), | **M5 (UX lane plan)** |
| QA-310 | UX · Minor | C10.2,C6.17 | Visitor visa's second release is "Release 6" on the case header (qa's screen read, `2026-11-08-rescore-batch2/walk-case-page-c6.12-c6.11.md`: "Open · … | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-311 | Bug · Minor | C9.2 | For the same change, IMM 5710's item reason reads "… changed … on 7 Nov 2026" (qa's C9.2 probe, 8 Nov 03:32 UTC) and the | **M5 triage, re-test first** |
| QA-313 | UX · Minor | C6.13 | After "Add filing back…" the person's row reads "Own application · Not started" with no reason, although the dialog says the reason is "Kept with | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-314 | Bug · Minor | C3.4,C4.1 | `check_forms_qa206_name_browser.cjs` failed its 1st try and passed on retry: after the keyboard-only path (type a name the library already holds, Tab … | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-315 | Bug · Major | C7.2 | Narrowed 8 Nov 23:09 IST (qa, main 0b4ede86b after #1363, `qa/reports/2026-11-08-rescore5/mac-C7.2-checkpoint.txt`; C7.2 not re-scored): the two 409s … | **Bake #11** |
| QA-318 | Gap · Major | C7.2 | On a family case with every fact answered and confirmed by the pack helper, each adult's IMM 5257 SCH1 (filed as a PDF upload) reads | **Bake #10 (retest first: fix commits to 84e54dd4d on main)** |
| QA-319 | UX · Minor | C7.7 | Answering marital status "Common-Law" in the Agent view adds IMM 5409 to Prepare application for that person, but the toast says only "It fills IMM | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-320 | Bug · Minor | C7.7 | P-145 asks for one "Download PDF copy" button on an Online line. On screen the row offers "Generate a copy", then "Download": two presses, and | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-321 | Gap · Minor | C7.7 | On the checkpoint's release, IMM 5257 and IMM 5409 read "Who signs: Sample Client A · how it is signed is not set on the | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-325 | Gap · Minor | C11.6,C3.16,C6.12,C6.13,C9.2 | Five rows moved to Works without gate A's walk to the next capability's first step. Quoted from their own reports: `2026-11-08-rescore3.md` "Gate A to… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-326 | Gap · Minor | - | The set-up was recorded 44/46 in an earlier round, and the two failures were never identified, because the capture was cut. Evidence: `qa/reports/2026… | **M5 triage, re-test first** |
| QA-327 | Gap · Minor | C7.6 | qa's C7.6 probe does not show a barcode form on Paper, or that the barcode block refuses a pass, and the row's words do not | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-328 | UX · Minor | C11.6 | In "Change how IMM 5257 is filed", only the small radio takes a click. A click on the option's words ("PDF upload", on its card) | **M5 (UX lane plan)** |
| QA-330 | UX · Minor | C7.6,C9.2 | On the same out-of-date form, Ready to file says "changed on 2026-11-09 … Make a new copy", and Prepare application says "on 9 Nov 2026" | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-346 | UX · Minor | C8.3 | On Ready to file the case officer sees only "Sent back · Open the review" on the filing, not the representative's reasons. The reasons are | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-347 | UX · Minor | C8.3 | The checklist's live items can be ticked against their own live state, and each tick is recorded as the representative's word. "All required documents… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-350 | UX · Minor | C3.16 | On a field marked Household (Union start date) or Organisation (Employer Name), the field page's "Where it is asked" still reads "Repeats: For each pe… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-351 | UX · Minor | C1.3 | On a work-permit case (1) the header offers "the … forms read 2 employer facts" and the panel then copies "these 3" (the LMIA number | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-331 | UX · Minor | C6.14 | On the F18 fallback (a principal with no date of birth, a spouse of 17) the shared line says only "Provided by Sample Spouse C | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-332 | Ambiguity · Minor | C6.14 | When nobody can provide, should a 17-year-old be named? The F18 fallback names Sample Spouse C (17) as provider, while the same dialog says "Nobody | **Bake #31 (outside the caps)** |
| QA-333 | UX · Minor | C6.14,C6.4 | Two age bases on one screen: a person's header on the case Documents panel says "Age: answer 'Date the application is submitted' first." while the | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-334 | UX · Minor | C6.14 | The library drawer's "Who provides it when shared" editor: after Send with no reason the reason error shows twice (under the field and in a | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-335 | UX · Minor | C7.7 | Prepare application's "To write by hand" list repeats one question for each box of a check-box group. On a Visitor visa family case, after "Generate | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-348 | Bug · Minor | C7.3 | The answer sheet names the wrong source for a value kept from a document. On a Visitor visa family case the client typed the family | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-353 | UX · Minor | C6.5 | "Fill this from documents" tells the officer to upload a document that is already uploaded. For Client A, with a proof of financial support on | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-354 | UX · Minor | C7.8 | The add-a-form panel's coverage overstates what fills. Picking IMM 0008 on a Visitor visa case says "42 of 249 form fields fill from this case's | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-355 | Bug · Major | C7.1,C7.6,C7.8 | Adding a form that fills spoils the case's shared facts on the release's own forms. On a Visitor visa case at Ready · 100%, adding | **Bake #12 (retest first: #1450 commits on main)** |
| QA-356 | UX · Minor | C7.8 | An added form reads "The combination's default." Under "How each form is filed", IMM 0008 and IMM 0008 DEP, both added by the case officer, | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-324 | Ambiguity · Minor | C7.3,C8.2 | One filing, two names for where it goes? On the same Visitor visa filing, the Online line and the answer sheet say "the IRCC account", | **open: Lead ruling (P-294), then M5** |
| QA-357 | UX · Minor | C6.16 | Client A's progress card always says "<person> is answering on their own link", even when that is false. (1) After the officer's Keep private… on | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-358 | UX · Minor | C6.16 | The adult's own link shows staff words. On Partner's own link, Contact information (holding Client A's answer) says under the heading: "Answered by th… | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-360 | UX · Minor | C6.16 | The officer's "Own links and privacy" row speaks the adult's words and hides the address change. (1) After a take back, the officer's row for | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-362 | UX · Minor | C10.2,C7.2 | A copy's "Before filing, on the PDF" step says "The number is already written" when it is not, and does not say which number. `engine/form-steps.ts` | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-368 | UX · Minor | C6.16 | Once the adult accepts the firm's link, Client A's Resend quietly replaces it. After staff send Partner's link to a new address and Partner enters | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-369 | Gap · Minor | C6.16 | May Client A take back the link the firm sent to a new address, before the adult accepts it? `takeBack` lets the client end any | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-376 | Bug · Minor | C8.3 | A Tab onto the "Approval withdrawn" chip sometimes opens no tooltip. On the Review page, focus the withdrawn form's button and press Tab: focus lands | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-377 | UX · Minor | C8.3 | The Review page lists a fact once per form field it fills. On the principal's IMM 5257, "Facts on this form · 110 facts" shows | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-378 | UX · Minor | C8.3 | A withdrawal for a different file is worded as a fact change. After a second validated copy of the same facts is read back, the | **M5 (UX lane plan); walk 1 (BK-6) may promote it to BK-7** |
| QA-379 | Bug · Minor | C7.3 | The answer sheet names every application-level answer's source "Case officer", even one read from a document. On a Visitor visa family case (configure… | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-380 | Gap · Minor | C3.16,C6.5 | One couple's marriage certificate, read once, fills the marriage date for only one spouse. On a Visitor visa family case (configured checkpoint), the … | **M5 triage, re-test first; walk 1 may promote it to BK-7** |
| QA-381 | Conflict · Minor | C11,C6.5 | Two founder decisions disagree on who reads a birth certificate. P-133's page lists "Foreign civil records … birth, marriage and divorce certificates"… | **open: Lead ruling (P-294), then M5** |

**Bug verdict totals:** M5 (UX lane plan) 111, M5 triage (re-test first) 45, Bake 15 (the 14 Majors + QA-332), open: Lead ruling 8 (Ambiguity and Conflict rows) = **179** rows (rows read in `qa/BUGS.md` on main fbfb263c7: 179).

## Totals for the backlog lists (rows in = rows out; bugs in §6)

| source list | rows in | done | Bake | M4 | M5 | M6 extension | team | parked | duplicate of | drop proposed | check | open: founder | open: Lead | other | rows out |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1. BACKLOG.md (Lead branch) | 242 | 147 | 14 | 27 | 33 | 1 | 3 | 0 | 10 | 2 | 5 | 0 | 0 | 0 | 242 |
| 2a. BACKLOG-requirements.md (main) | 37 | 7 | 0 | 11 | 8 | 0 | 5 | 1 | 3 | 2 | 0 | 0 | 0 | 0 | 37 |
| 2b. BACKLOG-requirements-qa.md (main) | 13 | 4 | 0 | 6 | 2 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 13 |
| 3a. Bake plan | 9 | 0 | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 |
| 3b. Bake plan | 8 | 0 | 0 | 4 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 |
| 4a. STATE founder asks (table rows) | 9 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 5 | 0 | 9 |
| 4b. STATE 'For the founder' F-items | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 8 |
| 5. P-460 items | 7 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 7 |
| **all** | **333** | **161** | **28** | **48** | **46** | **2** | **8** | **1** | **14** | **4** | **5** | **9** | **5** | **2** | **333** |

'other' = P-460 rows mapped to more than one place (Bake + M4/M5), which is what the brief asks for those.
## Drops proposed to the founder

Each needs the founder's yes before the row leaves the list.

| id | list | reason | decision / evidence |
|---|---|---|---|
| B108 | BACKLOG | design document never needed | P-376 (6 Nov) built the scale changes as rows B119-B123 |
| X12 | BACKLOG | each part settled or replaced | P-271 (PQR runtime is the team's), P-188 workflow (Devin passes gone), lead-watch skill (test databases) |
| B12 | req | to-do engine is the team's | SA1B-D118 withdrew starter to-dos (BACKLOG row S5) |
| B35 | req | no longer needed | P-447 (2): BK-5 start page gives three starting points and a reset; D1 #407 |

## Duplicates

| id | list | survives as | why the same change |
|---|---|---|---|
| L-doc | BACKLOG | B38 | same change: copy kind, certified translation, validity on document types |
| B51 | BACKLOG | B58 | same change: Schedule background questions after each schedule's own instruction is cited |
| S5 | BACKLOG | B12 | 90/30 lines gone (domain/MASTERS.md no longer on main); B12 drop proposed below |
| S8 | BACKLOG | A19 (f) | same work: trace every requirement card |
| B66 | BACKLOG | B83 | same change: ask a Yes/No form field as its own question by screen (QA-234) |
| B111 | BACKLOG | QA-278 | same cause: many cases opened at once fail (5 s transaction) |
| X8 | BACKLOG | QA-104..QA-111 | Majors QA-101-103 closed by K11 #512 |
| X9 | BACKLOG | QA-76..QA-117 | QA-77 closed |
| L6 | BACKLOG | B1-B50 | pointer row |
| L-SA13 | BACKLOG | SH4 | same change: release pin per filing (P-246 (2), P-412 F10) |
| B19 | req | B40 | same change: fee table with who pays |
| B22 | req | B45 | same change: next review and source freshness |
| B24 | req | B39 | same change: key dates from document validity |
| B43 | req-qa | B17 | same change: reference tables and country lists |

Also: B111 (BACKLOG) and bake row 33 (QA-278) are one change; X11 and Gate are the same M2 walk (both done); requirement rows B3, B6, B8, B9, B10 were built as B137, B144, B138, B145, B139 and are marked done with those PRs.

## Checks left

| id | what exactly to check |
|---|---|
| K12 | check whether M3-S1 (#1505, filingMode co_files) replaced the two 'sponsor' keys, and whether the people step's Fix opens the folded card (no merge names K12) |
| B67 | check p5/transforms.ts:115-121 for a Yes with no number recorded (no merge names B67; the quoted string is not in p5/ on main) |
| B168 | done when #1526 merges (PR #1526 in review (STATE A12, 11 Nov 12:4x); not on main fbfb263c7) |
| B169 | done when its PR merges; else M4 content (lane started 11 Nov (674fc63e1); no merge) |
| B170 | done when the report lands; else M4 (lane started 11 Nov (A16/A18); report owed) |

## Notes on method and limits

* 'No merge' means no merged PR's title or builder commit names the id; for small Minor follow-ups (B54-B57, B65, B95, B105, B113 and similar) a later change may have fixed them without naming them. They are placed in M5 (or M4) so they stay on the list; the M5 planner should re-test each before building.
* Rows marked done on a merged PR whose capability still reads Partial: B141 (C7.8, held by QA-355 = Bake #12), B150 and L-SA6 (C6.6, re-score owed). The capability stays open through its own QA ids, not through these rows.
* Bake rows already merged are marked done (B164 #1501, M3-S1 #1505, M3-S2 #1513, M3-S5 #1507, BK-10 #1518) with their Bake row number in the note.
* `gh api repos/.../branches/main` returned `protected: false` on 11 Nov (row L7).
