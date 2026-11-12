# Evidence: C6.12 and C4.11 re-score, and the QA-402 retest (qa lane, 12 Nov 2026)

Facts only; the verdict is a fresh reader's (P-303, P-432). Main head tested: **348fa8b11** (#1602, BK-9, merged). Live AI off, US$0, no priced button pressed. Every copy was isolated (:4471 to :4474) and stopped; :4400 was not touched.

## 1. GitHub's runners on main's head (P-339)
Scheduled **nightly 43137902326** on 348fa8b11 (12 Nov 01:56 UTC). The run's overall conclusion reads *cancelled*: suites shards 3, 5 and 6 hit their time limit. Its five **works** jobs (every Works row's pack, each on its scoring data) all ended *success*:
* Job **130918148168**: "C6.12-breadth.test.ts on the checkpoint: exit 0, 5/5 passed" · "C6.12.test.ts on the checkpoint: exit 0, 24/24 passed" · "C6.12 (checkpoint): green".
* Job **130918148113**: "C4.11-spread.test.ts on the six: exit 0, 8/8 passed" · "C4.11.test.ts on the six: exit 0, 30/30 passed" · "C4.11 (six): green".
* Before: scheduled nightly 42933561867 (11 Nov, main 3a9b91743), job 130238525811: "C6.12-breadth.test.ts on the checkpoint: exit 0, 3/3 passed" (then -22 and -23 printed HELD).
* No GitHub run exists of C4.11's packs **on the configured checkpoint**: a cloud lane cannot dispatch `nightly.yml` (403, P-439).

## 2. Independent re-run here (fresh copy per pack, data loaded by Demo › Reset to the six or Demo › Load the configured checkpoint)
The pack lines are quoted in §6. In summary:
| Pack | Data | Result |
|---|---|---|
| C6.12-breadth | checkpoint | exit 0, 5/5: -22 PASS (`released: 1`, fee lines spouse_sponsorship, pr_rprf, modes co_files), -23 PASS ×2, -24 PASS, -25 PASS |
| C6.12 | checkpoint | exit 0, 24/24 |
| C6.12-breadth | six (pack alone, its two setups not run) | exit 1, 1/3: **-22 FAIL `released: 0`** (Spouse or common-law partner is not released on the six); -23 HELD ×2; -25 crashed waiting for "Sample Client A" (the pack's setups were not run, so no Visitor visa family case) |
| C4.11 | six | exit 0, 30/30 |
| C4.11-spread | six | exit 0, 8/8 |
| C4.11 | checkpoint | exit 1: FAIL -17, -18, -G5 (`ready 0`), -24, -25, then a psql error on `form_instance … 'undefined'` |
| C4.11-spread | checkpoint | exit 1, 6/8: FAIL -27 ×2 (`held 0` on all four other combinations) |
| `tests/check_qa402_case_condition.ts` | checkpoint | exit 0, 12/12 |

The C4.11 checkpoint failures are the same set #1587's builder reported on main 68a7b59d1 and on its branch (#1587, "Questions for the tech lead" 1). P-487 (2) made them their own row; C4.11 is scored on the six (P-322).

**Why -22 "fails on main" (#1602's builder, P-487 (7)).** The breadth pack holds -22 only while `samples/fee-table.json` has no `fs.spouse` entry (`held(…, !fsTable, …)`). M3-S1 added that entry, so on data where Spouse or common-law partner is not released (the six, and the pack's own documented run: setup_visitor_visa then setup_vv_m3 on a fresh copy), -22 is now an ordinary FAIL. On the configured checkpoint, C6.12's scoring data (its row's evidence; the nightly picks the checkpoint "its evidence"), -22 passes. #1602's builder reported "2/3 on the branch and on main's code", the documented run's count (-22 FAIL, -23 HELD ×2, -24 and -25 PASS).

## 3. Gate A, C6.12 sponsorship, by screens (fresh copy :4473, configured checkpoint, case officer `user-O`, 1440 px)
1. Cases › Open a case: the dialog lists "Spouse or common-law partner · release 1". Reference QA-C612-SP1, principal "Sample Principal S", Open case. Shot `c612-sp-open-dialog-1440.png`.
2. The case page: "People and filings 1 filing", buttons "Add sponsor" and "Add child".
3. Add sponsor › Name "Sample Sponsor S" › Add (the dialog asks only a name, as QA-248 already records). After a reload: **"People and filings 2 filings"**. Rows: "Sample Principal S · Principal applicant · Own application · Not started"; "Sample Sponsor S · Sponsor · Sent with the principal's application". Shot `c612-sp-case-after-sponsor-1440.png`.
4. Fees, on the page: "Fees for One submission: Spouse or common-law partner sponsorship: Sample Principal S, Spouse or common-law partner sponsorship: sponsorship (Sample Sponsor S)". Lines "Right of permanent residence fee CAD 600 … for Sample Principal S" and "Sponsorship and processing fee (spouse or partner) CAD 660 … Sample Sponsor S's co-filed application (sent with the principal's), paid on it", each with its basis. **"Total for this submission: CAD 1260"**, "Sources: IRCC fee list (read 2026-11-10) … Sample until the immigration expert confirms (P-171)". Biometrics are left out of the total, stated in words.
5. Underneath, `GET /api/runtime/cases/<id>/filings` (case officer): **two filings**, `files_own` for the principal and `co_filed` for the sponsor. Each has its own `number: null` (its own application number), both in **one group** `kind: family`, "One submission", `splittable: false`, "why": "The sponsorship and the principal's application are sent together and cannot be split (IRCC: …)". The group's totals are CAD 660 and CAD 600.
6. **Next capability's first step (C7.7, Prepare application):** the section lists IMM 0008, IMM 5406, IMM 5476 and IMM 5669 for Sample Principal S, and **IMM 1344 for Sample Sponsor S** ("Checked copy, not for filing … Generate a copy") and **IMM 5532 for Sample Sponsor S**, each with "Generate a copy" and its facts to answer. Ready to file lists "Spouse or common-law partner sponsorship: sponsorship (Sample Sponsor S) Not started" with its own blocks. Record the submission: "One submission · Record the submission… Opens once every filing is Ready to file: Sample Principal S (Not started), **A person (Not started)**".
7. The same page headless at 400, 1024 and 1440 px, twice (6 loads): every load shows "2 filings", "Total for this submission: CAD 1260" and "IMM 1344 for Sample Sponsor S", with no page error. **At 400 px the page scrolls sideways by 88 px**, both times; 0 at 1024 and 1440. The widest element is People and filings' table (523 px, inside a `div.overflow-x-auto`). A Visitor visa case on the same copy at 400 px: 0 px. Shots `c612-sp-case-400.png`, `c612-sp-case-1024.png`.
8. Words seen: "A person (Not started)" (above), and **"Add a form to this's filing"** beside "Add a form to Sample Principal S's filing" under Prepare application. Cause in code: the co-filed sponsorship has `applicants: []`, so `web/src/runtime/submission.tsx:30` (`whoOf`, …`?? "A person"`) and `web/src/runtime/forms.tsx:66` (…`?? "this"`) fall back. `whoOf` also writes the legend of each filing's fieldset in the Record dialog (line 239, "<who>'s filing", where its application number is typed) and the fee-receipt upload's label (line 186). That dialog opens only when every filing is Ready to file; it was not reached by screens here.
9. Not walked: the Record dialog with two application numbers (C8.2's own step; it needs both filings Ready to file).

## 4. QA-402 retest, by screens (same copy, configured checkpoint, 1440 px)
1. As Configuration author: Fields › "Visit purpose other" (its page lists IMM 5257 (09-2023) "b) Other" as a reader). Condition on the question: "Show only when…", for each applicant, Field "Visit purpose", "is", Value "Other", in plain words "the purpose of the visit is Other". Save placement as draft. Shot `qa402-condition-set-1440.png`.
2. Underneath, the draft (`GET /combinations/<vv>/config?mode=draft`): the placement carries `condition: {field: case.visit_purpose, op: eq, value: Other}`, `condition_effect: SHOW`, and `held_conditions` is `[]`. The combination's problems list has nothing for `case.visit_purpose_other` (35 problems, none about it).
3. Review and release (`/release`) and Visitor visa's own Review and release tab: none of "Visit purpose other", "Condition not used", "No form reads", "held". Shot `qa402-release-1440.png`.
4. Released by three people's screens: author "Submit for review"; content reviewer "Select all I can sign" › "Sign"; approver "Approve and release". Result: "v3 Demo release · Release 7 current", "Configuration author / Configuration author / Approver". Shot `qa402-vv-released-1440.png`.
5. **Next step:** the case officer opens a case on "Visitor visa · release 3" (header "Open Release 7"). As Client A, Client questionnaire › Details of visit to Canada:
   * purpose **Business**, saved: no question "Description of the visit purpose when it is 'other'";
   * purpose **Other**, saved: the question is asked. Shots `qa402-client-business-1440.png`, `qa402-client-other-1440.png`.
   * The follow-up does not appear the moment Other is picked; it appears after a save. With "Save and continue" the page stays on the section, under "Check these answers", listing "Description of the visit purpose when it is 'other': Answer this question, or leave it for now" (`qa402-client-other-save-continue-1440.png`). After a save the follow-up is listed above "Purpose of the visit to Canada" (its placement order).
6. QA-402's own check: `tests/check_qa402_case_condition.ts` 12/12 on a fresh checkpoint copy (§2).

## 5. New check (fails today)
`prototype/studio/tests/qa/check_qa412_cofiled_sponsor_name.cjs` on a fresh checkpoint copy, by screens: setup 2/2 PASS; **FAIL QA-412a** ("…Sample Principal S (Not started), A person (Not started)."); **FAIL QA-412b** (["Add a form to Sample Principal S's filing","Add a form to this's filing"]); **FAIL QA-413** (`overflowPx: 88` at 400 px); no page error. Exit 1, 3 failed.

## 6. Pack lines (verbatim, cut at 260 characters)
### qa_c411c
```
== qa_c411c checkpoint acceptance/C4.11.test.ts on 348fa8b11 2026-11-12T03:15:27Z
PASS  C4.11-1 pass: the plan lists the 7 steps in order — ["facts","documents","document_facts","comes_from","conditions","pqr_picks","checker"]
PASS  C4.11-2 pass: each step says its mode and its cost (usual and worst); Saved and Rules cost US$0
PASS  C4.11-3 pass: a Saved step names its saved result (date, edition, US$0, current)
PASS  C4.11-4 pass: the plan carries its fingerprint (plan_sha256)
PASS  C4.11-5 fail: a plan with Live steps on a copy without the founder's Go says so and cannot run (live.approved false, in words) — "Live is not open yet: each paid run is approved first, with its cost stated. Also, facts, document_facts, comes_from are w
PASS  C4.11-6 fail: steps out of order, or a step whose inputs are not planned, are refused (400, in words) — "Plan the steps in their order, each once: facts, documents, document_facts, comes_from, conditions, pqr_picks, checker."
PASS  C4.11-7 fail: a run of a plan that is not the one shown is refused (409: plan changed) — "This is not a plan shown for this combination in the last hour (or the forms, people or steps changed): plan again before it runs."
PASS  C4.11-8 pass: the run starts (202 or 201) with a run id — {"runId":"9dddd3dd-e64a-4b92-aba8-9a6cf5b52209","status":"running"}
PASS  C4.11-9 pass: the same click twice is one run (idempotency key)
PASS  C4.11-10 pass: the run finishes, each of the 7 steps with its outcome — ["facts:done","documents:done","document_facts:done","comes_from:done","conditions:done","pqr_picks:done","checker:done"]
PASS  C4.11-11 pass: the queue gets documents per person, conditions and PQR picks — ["document_type","field","requirement_line","condition","pqr_pick"]
PASS  C4.11-12 pass: step 4 gives every fact a form needs its source (document, client or case officer), changeable on the Questions tab — {"facts":413,"step4":"413 answers: Document 1 · Client 390 · Case officer 22. The rules' choice applies until a perso
PASS  C4.11-13 pass: every item names a step of this run (acceptance rate per step, P-130 §6.3) — ["checklist_draft","qd_conditions","pqr_picks"]
PASS  C4.11-14 pass: every AI item has both readings (draft and the independent checker) or is marked One reading only
PASS  C4.11-15 pass: every requirement line and condition rests on an official file with its quote found
PASS  C4.11-16 pass (checker): every PQR pick is a fact a client or document question asks (PQR ⊂ SQR) — ["case|case.funds_available_cad","child|relationship.accompanies_subject_to_canada","spouse_or_partner|relationship.accompanies_subject_to_canada","pri
FAIL  C4.11-17 pass (checker): every fact from a document names a document on the checklist — {"from_documents":1,"missing":["spouse_or_partner|relationship.union_start_date|[object Object]"]}
FAIL  C4.11-18 data: every item is Sample; nothing is in the combination's draft until accepted
PASS  C4.11-19 pass (BR-7): no item names a person role that Who can be does not list — ["principal","child","spouse_or_partner"]
FAIL  C4.11-G5 pass (G5): with the run's Ready items accepted, no fact a form needs is asked of nobody (any role) — {"ready":0,"nobody":0}
PASS  C4.11-20 fail (BR-12): a live run whose worst case is over the spend limit is refused before any call (409, 'use saved results or rules only') — "This plan has Live steps: Live is not open yet: each paid run is approved first, with its cost stated. Not
PASS  C4.11-21 fail (BR-10): a checklist text no saved reading has read is not offered as Saved (Out of date or none, with the reason), never replayed silently — {"usd":0,"state":"none","date":null,"edition":null,"why":"No saved AI reading of this combinatio
PASS  C4.11-22 pass: Stop stops a run (its state says stopped or finished, in words) — {"stop":201,"status":"stopping"}
PASS  C4.11-23 pass: the whole run spent US$0 (Replay and Rules only) — {"spent":0,"worst":0,"usual":null,"about":null}
FAIL  C4.11-24 pass (QA-237): a condition accepted and approved, its form field not confirmed: the draft is not refused for it; the condition is held (the question asked every time, nothing a form reads hidden) and a warning says why and how to use it — {"re
FAIL  C4.11-25 pass (QA-237): the author confirms the form field through the new route, showing its own words, a second person approves: that question is no longer held and the condition is in force in the draft — {"confirmed":0,"left":[],"nowPlaced":[true],
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":9,"numbers":17,"held_back":0}
FAIL  unexpected Error: Command failed: /opt/homebrew/opt/postgresql@18/bin/psql postgresql://xr_studio@127.0.0.1:54329/xr_studio_qa_c411c -Atc select s.facts_json::text from form_instance f join answer_snapshot s on s.id = f.snapshot_id where f.id = 'undefine
== EXIT 1
```
### qa_c411s6
```
== qa_c411s6 six acceptance/C4.11.test.ts on 348fa8b11 2026-11-12T03:19:51Z
PASS  C4.11-1 pass: the plan lists the 7 steps in order — ["facts","documents","document_facts","comes_from","conditions","pqr_picks","checker"]
PASS  C4.11-2 pass: each step says its mode and its cost (usual and worst); Saved and Rules cost US$0
PASS  C4.11-3 pass: a Saved step names its saved result (date, edition, US$0, current)
PASS  C4.11-4 pass: the plan carries its fingerprint (plan_sha256)
PASS  C4.11-5 fail: a plan with Live steps on a copy without the founder's Go says so and cannot run (live.approved false, in words) — "Live is not open yet: each paid run is approved first, with its cost stated. Also, facts, document_facts, comes_from are w
PASS  C4.11-6 fail: steps out of order, or a step whose inputs are not planned, are refused (400, in words) — "Plan the steps in their order, each once: facts, documents, document_facts, comes_from, conditions, pqr_picks, checker."
PASS  C4.11-7 fail: a run of a plan that is not the one shown is refused (409: plan changed) — "This is not a plan shown for this combination in the last hour (or the forms, people or steps changed): plan again before it runs."
PASS  C4.11-8 pass: the run starts (202 or 201) with a run id — {"runId":"36f15b03-ce16-45be-bd4b-6adc740fce02","status":"running"}
PASS  C4.11-9 pass: the same click twice is one run (idempotency key)
PASS  C4.11-10 pass: the run finishes, each of the 7 steps with its outcome — ["facts:done","documents:done","document_facts:done","comes_from:done","conditions:done","pqr_picks:done","checker:done"]
PASS  C4.11-11 pass: the queue gets documents per person, conditions and PQR picks — ["pqr_pick","document_type","field","requirement_line","condition"]
PASS  C4.11-12 pass: step 4 gives every fact a form needs its source (document, client or case officer), changeable on the Questions tab — {"facts":397,"step4":"397 answers: Document 0 · Client 373 · Case officer 24. The rules' choice applies until a perso
PASS  C4.11-13 pass: every item names a step of this run (acceptance rate per step, P-130 §6.3) — ["pqr_picks","checklist_draft","qd_conditions"]
PASS  C4.11-14 pass: every AI item has both readings (draft and the independent checker) or is marked One reading only
PASS  C4.11-15 pass: every requirement line and condition rests on an official file with its quote found
PASS  C4.11-16 pass (checker): every PQR pick is a fact a client or document question asks (PQR ⊂ SQR) — ["principal|person.criminal_history","principal|person.violent_organization_association","case|case.visit_purpose","case|case.intended_stay_to","princi
PASS  C4.11-17 pass (checker): every fact from a document names a document on the checklist — {"from_documents":0,"missing":[]}
PASS  C4.11-18 data: every item is Sample; nothing is in the combination's draft until accepted
PASS  C4.11-19 pass (BR-7): no item names a person role that Who can be does not list — ["principal","spouse_or_partner"]
PASS  C4.11-G5 pass (G5): with the run's Ready items accepted, no fact a form needs is asked of nobody (any role) — {"ready":6,"nobody":0}
PASS  C4.11-20 fail (BR-12): a live run whose worst case is over the spend limit is refused before any call (409, 'use saved results or rules only') — "This plan has Live steps: Live is not open yet: each paid run is approved first, with its cost stated. Not
PASS  C4.11-21 fail (BR-10): a checklist text no saved reading has read is not offered as Saved (Out of date or none, with the reason), never replayed silently — {"usd":0,"state":"none","date":null,"edition":null,"why":"No saved AI reading of this combinatio
PASS  C4.11-22 pass: Stop stops a run (its state says stopped or finished, in words) — {"stop":201,"status":"stopping"}
PASS  C4.11-23 pass: the whole run spent US$0 (Replay and Rules only) — {"spent":0,"worst":0,"usual":null,"about":null}
PASS  C4.11-24 pass (QA-237): a condition accepted and approved, its form field not confirmed: the draft is not refused for it; the condition is held (the question asked every time, nothing a form reads hidden) and a warning says why and how to use it — {"re
PASS  C4.11-25 pass (QA-237): the author confirms the form field through the new route, showing its own words, a second person approves: that question is no longer held and the condition is in force in the draft — {"confirmed":1,"left":[],"nowPlaced":[true],
PASS  C4.11 fail (P-279): Submit is refused while 3 numbers have no source entry, in words — "Fix the problems before submitting: 3 numbers have no source entry. Each is listed on Review and release. First: Form IMM 5257 SCH1: From age: 18 has no source "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":3,"numbers":11,"held_back":0}
PASS  C4.11-26 pass (the fill, BR-5): with the deciding answer No, that form field is not written, whatever is stored: Yes, a typed name, then No leaves no name for the form, and the form's Yes/No is written from the No — {"release":201,"refusedBy":[],"answe
PASS  C4.11-26 control: with the answer Yes again the same form field is written with the name, so the step above can fail — {"copy":"GENERATED","yes":{"name":"Sample Old Name","gate":true,"box":{"box":"form1[0].Page1[0].PersonalDetails[0].AliasName[0].Alias
30/30 passed
== EXIT 0
```
### qa_c411sc
```
== qa_c411sc checkpoint acceptance/C4.11-spread.test.ts on 348fa8b11 2026-11-12T03:19:27Z
PASS  C4.11-27 setup: Visitor visa's saved run proposes conditions, accepted there and approved by a second person; all in force — {"questions":["person.other_family_name","person.other_given_names","person.national_id_number","person.us_green_card_number"],
FAIL  C4.11-27 pass (QA-239): each of the four other combinations, set up by the people's steps, holds Visitor visa's conditions (the question asked every time, a warning) and is refused for none of them (no Hiding error) — {"held":{"Spouse":0,"Express Entry
PASS  C4.11-27: no Unreachable question on the four — {"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}
FAIL  C4.11-27 fail: with every plain form field confirmed, each combination with a worked-out Yes/No still holds the condition until that Yes/No is asked, so B88's door is what clears it — {"worked_out":0,"combinations_still_held":0}
PASS  C4.11-27 pass (QA-239): through B86's and B88's doors only, each with a second person, no condition is held on Spouse, Express Entry, Study permit and With an LMIA — {"after":{"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0},"refused":[]
PASS  C4.11-27 pass: the conditions are still in force (none was removed to get there) — {"in_force":4,"of":4}
PASS  C4.11-27: still no Unreachable question on the four — {"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}
PASS  C4.11-27: US$0 (Replay and Rules only; the ledger unchanged) — {"before":0,"after":0}
6/8 passed
== EXIT 1
```
### qa_c411ss6
```
== qa_c411ss6 six acceptance/C4.11-spread.test.ts on 348fa8b11 2026-11-12T03:20:47Z
PASS  C4.11-27 setup: Visitor visa's saved run proposes conditions, accepted there and approved by a second person; all in force — {"questions":["person.other_family_name","person.other_given_names","person.us_green_card_expiry_date","person.criminal_history
PASS  C4.11-27 pass (QA-239): each of the four other combinations, set up by the people's steps, holds Visitor visa's conditions (the question asked every time, a warning) and is refused for none of them (no Hiding error) — {"held":{"Spouse":4,"Express Entry
PASS  C4.11-27: no Unreachable question on the four — {"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}
PASS  C4.11-27 fail: with every plain form field confirmed, each combination with a worked-out Yes/No still holds the condition until that Yes/No is asked, so B88's door is what clears it — {"worked_out":9,"combinations_still_held":4}
PASS  C4.11-27 pass (QA-239): through B86's and B88's doors only, each with a second person, no condition is held on Spouse, Express Entry, Study permit and With an LMIA — {"after":{"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0},"refused":[]
PASS  C4.11-27 pass: the conditions are still in force (none was removed to get there) — {"in_force":7,"of":7}
PASS  C4.11-27: still no Unreachable question on the four — {"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}
PASS  C4.11-27: US$0 (Replay and Rules only; the ledger unchanged) — {"before":0,"after":0}
8/8 passed
== EXIT 0
```
### qa_c612
```
== qa_c612 checkpoint acceptance/C6.12.test.ts on 348fa8b11 2026-11-12T03:17:55Z
PASS  C6.12-1 pass: GET /runtime/cases/:id/prepare answers 200 for the case officer — 200
PASS  C6.12-2 fail: a client cannot read the prepare view (403)
PASS  C6.12-3 pass: four people who each file their own application give four filings, one applicant each, mode files_own (VV-R03) — [[{"subject":"fde474bd-75bd-4723-800f-ecb66fafff88","label":"Sample Client A","role":"principal","mode":"applying"}],[{"subje
PASS  C6.12-3a pass (qa-2 #296): the filings follow the RELEASED filing mode, not a rule in code: the case's pinned release lists files_own for every role
PASS  C6.12-4 pass: the four filings form one family submission group, which can be split — [{"id":"78eed858-b384-4600-83de-17e5a66ae3ef","kind":"family","label":"One submission for 4 people applying","filings":["7c0beffd-2aa2-4536-adc8-5c287d2ff0f5","c7d52f
PASS  C6.12-5 pass (data): filing, filing_applicant and submission_group rows match the view
PASS  C6.12-6 fail: the officer never creates a filing by hand (POST …/filings is not a route: 404 or 405)
PASS  C6.12-7 pass: visitor visa fee CAD 100 per person, CAD 400 for four (under 5, no family maximum; VV-R13) — [{"filing":"7c0beffd-2aa2-4536-adc8-5c287d2ff0f5","subject":"fde474bd-75bd-4723-800f-ecb66fafff88","payer":"fde474bd-75bd-4723-800f-ecb66fafff88"
PASS  C6.12-8 pass: biometrics CAD 170 for the family (three people 14–79; maximum for 2 or more; VV-R14); the child of 10 has no biometrics line, with the reason "under 14" (VV-R15) — [{"filing":"7c0beffd-2aa2-4536-adc8-5c287d2ff0f5","subject":"fde474bd-7
PASS  C6.12-9 pass: the visitor visa and biometrics fee lines cite the IRCC fee list (VV-R13, VV-R14); any other line says Sample — ["https://ircc.canada.ca/english/information/fees/fees.asp","https://ircc.canada.ca/english/information/fees/fees.asp","https:
PASS  C6.12-9a pass (G13): the case names its release in the studio's words (same label and number) — {"studio":"Release 6","case":"Release 6"}
PASS  C6.12-10 pass: six people in one group pay the CAD 500 family maximum, once, on the principal's filing; the others are fee-exempt with the reason — [{"filing":"79777ccc-2a65-41c4-b39d-7126b21cc71c","subject":"cee23903-38c3-48dd-b2f9-66f39e5ccb64","paye
PASS  C6.12-11 fail: a seventh person is refused (a child is at most 4 in this combination's "Who can be in this application")
PASS  C6.12-12 fail: splitting without a reason is refused on the field and says the family maximum would be lost (400) — {"type":"https://expatready.local/problems/validation","title":"Some details need fixing","status":400,"detail":"Give a reason to split 
PASS  C6.12-13 pass: after the split there are two groups; visa fees CAD 500 (five) + CAD 100 (one); biometrics CAD 170 + CAD 85 — {"groups":[{"id":"ec5f07ee-d3d3-4fff-93d5-a066aa9a969e","kind":"family","label":"One submission for 5 people applying","filings
PASS  C6.12-13a pass (qa-2 #296): a split keeps every filing's identity (same filing id for each person) — {"before":{"Sample Client A":"79777ccc-2a65-41c4-b39d-7126b21cc71c","Sample Spouse A":"cda793c6-3293-45a5-8da4-7409f97e696b","Sample Child A1":"78ffd23
PASS  C6.12-14 fail: splitting a filing that is no longer in the group is refused (409 or 422) — 409
PASS  C6.12-15 pass: just past the 14th birthday, and aged 79, a person pays visa CAD 100 and biometrics CAD 85; two days before turning 14, no biometrics
PASS  C6.12-16 pass: a person just past 80 has no biometrics line ("over 79")
PASS  C6.12-17 pass: correcting the child's date of birth to 16 adds a biometrics line for them; the family total stays at the CAD 170 maximum
PASS  C6.12-18 pass: a child who is not travelling has no filing and no fee, and the view says why — 3
PASS  C6.12-19 pass: marking the child as travelling adds their filing and fees; everyone else keeps the same filing id — {"before":{"Sample Client A":"8e776c00-96fc-4575-8049-9614792599b1","Sample Spouse A":"1e3f822b-c70c-4866-9087-f9508521c54e","Sample Chi
PASS  C6.12-20 fail (qa-2 #296): taking the child of 10 off the trip never moves another person's filing to them (ids are not positions)
PASS  C6.12-21 pass (G15): a child with no date of birth has a biometrics line that waits for the date of birth, not counted in the total and not exempt — {"filing":"3ee82e94-57c7-4018-af4d-11b87cb8acdb","subject":"3dc6ab86-941d-4541-89c6-4b6c30b48034","paye
24/24 passed
== EXIT 0
```
### qa_c612b
```
== qa_c612b checkpoint acceptance/C6.12-breadth.test.ts on 348fa8b11 2026-11-12T03:15:27Z
PASS  C6.12-22 pass (Partial: sponsorship): spouse or partner sponsorship is two filings, the sponsorship and the PR application, in one submission group — Spouse or common-law partner is released and its fee lines are set per filing — {"released":1,"feeTa
PASS  C6.12-23 pass (Partial: child study question): a release of a student or worker combination asks the case officer "will this child study 6 months or more?" (yes adds a study permit filing) — {"releasesWithTheQuestion":1}
PASS  C6.12-23 pass (case): the case officer's Yes adds the person's own "Study permit" filing; a No keeps the other on the principal's application (GET …/filings and …/prepare agree) — {"before":["Outside Canada: Sample Applicant M"],"after":["Outside C
PASS  C6.12-24 pass (Partial: other combinations): the fee table prices study permits, work permits and extensions, none with a family maximum — {"lines":["visitor_visa","biometrics","spouse_sponsorship","spouse_dependent_child","pr_adult","pr_dependent_chil
PASS  C6.12-25 pass (Partial: the screen): the case page shows the case's filings and fees (visitor visa CAD 100 each, biometrics CAD 170 for the family) — " \"Date the application is submitted\" first. 0 of 3 received Fee payment receipt For each applicant 
5/5 passed
== EXIT 0
```
### qa_c612b6
```
== qa_c612b6 six acceptance/C6.12-breadth.test.ts on 348fa8b11 2026-11-12T03:20:07Z
FAIL  C6.12-22 pass (Partial: sponsorship): spouse or partner sponsorship is two filings, the sponsorship and the PR application, in one submission group — Spouse or common-law partner is released and its fee lines are set per filing — {"released":0,"feeTa
HELD  C6.12-23 pass (Partial: child study question): a release of a student or worker combination asks the case officer "will this child study 6 months or more?" (yes adds a study permit filing) — held: outside the Visitor visa journey under the founder's an
HELD  C6.12-23 pass (case): the case officer's Yes adds the person's own "added" filing; a No keeps the other on the principal's application (GET …/filings and …/prepare agree) — held: outside the Visitor visa journey under the founder's answer to Q1 (6 
PASS  C6.12-24 pass (Partial: other combinations): the fee table prices study permits, work permits and extensions, none with a family maximum — {"lines":["visitor_visa","biometrics","spouse_sponsorship","spouse_dependent_child","pr_adult","pr_dependent_chil
FAIL  C6.12 breadth: the test ran to its end (crashed: locator.waitFor: Timeout 30000ms exceeded.
1/3 passed
== EXIT 1
```
### qa_q402
```
== qa_q402 checkpoint tests/check_qa402_case_condition.ts on 348fa8b11 2026-11-12T03:21:41Z
PASS  setup: IMM 5257's form field for this answer holds the form's own gate, written only when the purpose is Other (B107) — "{\"op\": \"eq\", \"field\": \"case.visit_purpose\", \"value\": \"Other\"}"
PASS  setup: the author saves a condition other than the form's own (Business)
PASS  QA-402 fail: a condition other than the form's own is held (the question asked every time), never a refusal — [{"level":"warning","where":"Questions","item":"case.visit_purpose_other","message":"Condition not used on this combination: the question \"De
PASS  QA-402 pass: it says the form's own condition in words, and does not send the author to "Form fields that read this answer" — "Condition not used on this combination: the question \"Description of the visit purpose when it is 'other'\" is asked every t
PASS  setup: the author saves the condition "show only when Visit purpose is Other" by hand
PASS  QA-402 pass: Review and release neither holds nor refuses it: the condition is in force on Visitor visa — []
PASS  QA-402 pass: the draft pathway carries the condition on the question, not among the held ones — {"placement":{"lineage":"case.visit_purpose_other","fact":"case.visit_purpose_other","section_id":"details_of_visit_to_canada","order":7,"question_text":nul
PASS  QA-402 pass: the release goes through by the three people's steps (author, content reviewer, approver) — {"status":201,"why":"","items":["Question placement|case.visit_purpose_other"]}
PASS  QA-402 pass: the released pathway holds the condition on the question — {"fact":"case.visit_purpose_other","tier":"case","order":7,"status":"DRAFT","lineage":"case.visit_purpose_other","repeats":"once_per_case","condition":{"op":"eq","field":"case.visi
PASS  QA-402 fail: with the purpose not answered yet, neither the client nor the officer is asked "Visit purpose other" — {"officer":false,"client":false}
PASS  QA-402 fail: with a purpose other than Other, neither the client nor the officer is asked "Visit purpose other" — {"status":200,"words":"Saved. It fills IMM 5257 for Sample Client Q402 (1 form field).","officer":false,"client":false}
PASS  QA-402 pass: with Other, the client and the officer are asked "Visit purpose other" — {"status":200,"words":"Saved. It fills IMM 5257 for Sample Client Q402 (1 form field).","officer":true,"client":true}
12/12 passed
== EXIT 0
```

## 7. Open rows in qa/BUGS.md (main 348fa8b11) that name C4.11 or C6.12 in their capability column
*  QA-402 · Bug · Major · **journey** (qa walk 0; main 68a7b59d1, 11 Nov ~21:15 IST) ·  C4.11 (held conditions, #1534) · EXPERIENCE (a refusal says what to do) 
*  QA-404 · UX · Minor (qa walk 0; main 68a7b59d1) ·  C4.11 (step 5) 
*  QA-391 · UX · Major (Lead 16 on #1529, 11 Nov: an instruction the person cannot follow on the filing screen is a dead end, so it counts for the Bake's exit check E3; was Minor; seen by the Lead on the demo 11 Nov; r
*  QA-267 · Bug · Minor (independent reader; run and rated by qa on main, 5 Nov ~21:00 IST) ·  C4.11 · P-322 
*  QA-268 · Bug · Minor (independent reader; run and rated by qa on main, 5 Nov ~20:57 IST) ·  C4.11 · SA-1B-9 
*  QA-265 · Ambiguity · Minor (breaker's x3 on #1053; walked by qa, 5 Nov ~20:01 IST) ·  C4.11, C7.3 · BR-5, Sample, Unconfirmed: expert 
*  QA-266 · UX · Minor (qa lane, gate A on #1068, 5 Nov) ·  C4.11, C4.5 · EXPERIENCE (plain words; no key in words) 
*  QA-248 · UX · Minor (cloud qa's M3 re-score, #1069, 5 Nov; copied by the qa lane ~12:11 IST) ·  C6.12, C6.11 · J7 2.1 
*  QA-223 · UX · Minor (qa tester 3, C4.11 verdict, #919) ·  C4.11 · PRODUCT §4 
*  QA-325 · Gap · Minor (qa lane, Opus re-read of earlier Sonnet verdicts, 9 Nov; **Minor ruled by the tech lead, Lead 40, 9 Nov**: an evidence gap with no product fault, it must not refuse product PRs through gate B) 
* QA-391 (UX · Major) names C9.2 and C10.2 ("also C6.12-style conditional forms on any case"), not C6.12.
* Open PR #1569 (qa records, not merged) sets C4.11 Partial, held by QA-402 (P-488 (2)); main's row still reads Works (bf12209f, 6 Nov).

## 8. Gate A, C4.11, on the six (fresh copy :4471, Demo › Reset to the six; added after the reader's first answer)
Set-up by route, as C4.11's pack and the 11 Nov walk do: `tests/b83_six_steps.ts … apply` (forms' field maps accepted and applied; it resets to the six first), then `… finish` (sections drafted, 154 questions placed, 33 approved). Then, **by screens** at 1440 px:
1. Author › Visitor visa › Smart questionnaire › **Draft questions and documents**: the plan lists the 7 steps (Saved or rules), "Cost: US$0 (no AI call)". **Draft with Saved (US$0)** → "Done · 1 s · US$0 · Saved, no new call"; step 5: "8 conditions for To review (Ready 0 · Check 2 · Decide 6); 10 left out with the reason"; step 6: "9 picks proposed". (A first run before `finish` gave 0 conditions, "22 left out".) Shots `c411-six-plan-1440.png`, `c411-six-run-done-1440.png`.
2. To review › Proposals › Visitor visa (40 proposals) › the condition "Given name(s) the person has otherwise used (nickname, alias)" is asked only when "Whether the person has ever used any other name … (IMM 5257 p. 1, Question 2 A)" is yes. Opened: both readings agree, IRCC's words quoted and "found in the file", Rules "Failed form still reads", and "Form fields that read this answer: IMM 5257 · Given name(s) … Not confirmed · Says the same as this condition". Shot `c411-six-condition-open-1440.png`.
3. **Says the same as this condition** → that form field reads "Waiting for a second person". **Accept** → "Decided 1 proposal. Any new library item waits for a second person on To review." Shot `c411-six-condition-accepted-1440.png`.
4. As Approver, To review lists both library changes with "Approve or return"; each opened and **Approved** (items shown 23 → 21 → 20). Shot `c411-six-approved-1-1440.png`.
5. Underneath, Visitor visa's draft: placement `person.other_given_names` with `condition {field: person.has_used_other_name, op: eq, value: true}`, `SHOW`; `held_conditions: []`.
6. Visitor visa's draft then had 6 release errors unrelated to conditions ("Filing not set" ×2, "No document line yet", "From age: 18 has no source entry" ×3). Cleared by route with the pack's own helpers (`T.people`, `T.documentsBySteps`, `T.sourceGate`, as `C4.11.test.ts` lines 165-167): 0 errors.
7. Review and release **by screens**: author Submit for review; content reviewer Show all 370 changes › Select all I can sign › **Sign 370** → "184 of 184 rule, document, check or AI-proposed changes signed"; approver **Approve and release** → "v1 Demo release · Release 1 current … Released version 1". (A first try signed nothing because qa's own script looked for a button named "Sign" while the button reads "Sign 370", so it was never pressed; the approver's release was then refused "184 changes need the content reviewer's SME sign-off", in words, which is right. Not a product defect.) Shots `c411-six-vv-signed-1440.png`, `c411-six-vv-released-1440.png`.
8. **Next step:** the case officer opens a case on "Visitor visa · release 1" by screens. As Client A, Client questionnaire › Personal details: before an answer, no alias question; "ever used any other name" **No**, saved: not asked; **Yes**, saved: "Given name(s) the person has otherwise used" **asked**. No page error. Shots `c411-six-client-no-1440.png`, `c411-six-client-yes-1440.png`.
