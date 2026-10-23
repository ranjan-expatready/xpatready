# Independent checker: Solution 1 one-pager, draft 4 (cohesion and correction pass)

18 October 2026 · Separate checker, Workstream 2 · Exact revision `solution-1-one-pager.html` SHA-256 `0758048127c34deace6ab78e7c729e8d3ffabf719d0da43bd091b48597a4f9ef`. This matches the Lead's "Ready for the checker" line in PROGRESS.md (21:14:05Z), and the hash was unchanged after every run below. This verdict covers that revision only. It is not founder acceptance.

## Verdict: PASS WITH FIXES

Draft 4 closes the integrated audit's six material findings, apart from two residuals (below). It fixes both earlier visual defects (the crushed phone records table and the label collisions) and keeps the agreed approach and content. Three material findings remain. Each is a local correction of a few strings or one diagram attribute: no redesign, no new component and no founder question is needed. After those three, a targeted recheck is enough for founder acceptance of high/medium solution alignment. The minor items can go in the same pass and need no checker round.

## What was done

- **Inputs read:** AGENTS.md; README §0–2; NEXT.md; the latest PROGRESS lines; decisions D215, D229, D233, D235, D236, D244 and D245; the integrated audit (report, intent and source coverage, panel review); the maker response; the content ledger (header and sample; generated, "0 removed" is Lead-reported); the seven-lens framework; AG-07 v2.9 (BR-10, BR-20, BR-31, AG-7-34, AG-7-45, AG-7-49, AG17-D63, AG17-D65, AG7-D12) and SA-01B v1.4 (SA-1B-64 to SA-1B-69) in `sources/drive-snapshot-2026-10-13-1535/`.
- **Suites, re-run here:** `check_one_pager.cjs` **150/150**, `check_panels.cjs` **35/35**, `check_cohesion.cjs` **41/41**, `check_diagram_geometry.cjs` **0 collisions**. Their outputs were rewritten in `checks/` by these runs, on the same revision.
- **Panels:** I read the corrected panels in full (7.2, 7.3, 8.1, 8.2, 8.5, 9.3, 9.4, 9.5, 9.6, 10.3, 10.4, stages 6, 7, 8 and 9, plus the 4.3/5.3/stage 3 historical-comparison rules) and the data and views behind them. A separate read-only agent read all 57 panels (`all-panels.md`, extracted from this build) against lens 7. I checked every item it raised by grep against the text and set the severities myself; three of its "Material" items are downgraded or refuted below.
- **Visual:** 186 screenshots, 1440 / 1280 / 768 / 375 px × light / dark: intro, the map bands and rails, Who is who, the stage panel, all seven views and the BPMN overview at natural size, Records, Controls, Case types, Evidence. Plus tooltip probes. Inspected by eye: every view and the overview at 1440 light; the map at 1440 and 768; Records at 375 in light and dark; Evidence at 375; the panel in dark. Screenshots are in the checker's scratchpad and are not committed to the project, per the prompt's "write nothing else".
- **Not done:** live AI, PDF filling, Validate, portal, a screen reader, real devices, a new-reader trial, the hosted copy, and a Drive freshness recheck.

## 1. The audit's material findings and S4/S5 on draft 4

| ID | Result | Evidence and challenge |
|---|---|---|
| **M1** decision ≠ closure; route levels | **Closed** (minor residuals m5, m6) | 9.6 (`s3_data.py:1290–1336`), stage 9 (`:1621–1635`), view 6 X15 → "After decision (case workflow)" / "Next filing (view 4)". It matches BR-20, BR-31, AG-7-49 and SA-1B-67/68, and the acceptance checks cover both audit tests. **Challenge to the maker:** "which pack version the next filing uses is not stated in the team's design" is too strong. AG17-D65 pins rules **per case** ("cases in progress keep theirs; adopting a newer version is one click"), and AG-7-45 opens the next filing **on the same case**. So the team's design already implies the case's pinned version, with adoption by AG-7-56. |
| **M2** staff-only gaps; per-form readiness | **Panels closed; diagram open → C-M2** | 8.1 rules (`:1023–1024`) and the acceptance checks are correct: a blank staff fact is entered by the agent and never sent to the SQR; only the forms that read a missing fact wait. But view 4 contradicts this in notation (C-M2). |
| **M3** past cases (D215 → D245) | **Mostly closed → C-M1** | Migration (7.3 `:987`), comparison before release where it exists, "Historical comparison unavailable" (4.3 `:701–702`, 5.3 `:812`, stage 3 `:1558`), and difference classification are all present. One founder safeguard is weakened (C-M1). |
| **M4** phone Shared records | **Closed** | At 375 px, light and dark, each record stacks as a card (name, plain words, description, rules, Read by / Changed by). No overlap; the cohesion suite checks it. |
| **M5** label collisions | **Closed** (minor residual m9) | 0 rendered collisions in the geometry suite. By eye, views 3–7 and the overview read cleanly; question labels are clear of connectors, and the per-filing boundary no longer cuts through text. |
| **M6** proof scope | **Closed** | The build gap (`:175`), stage 1 (`:1528`) and the new "What each kind of proof establishes" table (`:1461–1470`) separate inventory and matching (what the real read covers) from writing, Validate, read-back, portal and provider runs (the team's). |
| **S4** held mapping on other cases | **Closed** (minor residual m3) | 10.4 Done when, rule, example and acceptance check: forms marked 'mapping under correction', approval withdrawn, no submission until adoption or hand completion. |
| **S5** adoption recomputes readiness | **Closed** (minor residual m4) | 10.3 rule, Done when, example and acceptance check: a new checklist item opens and holds the filing at 9.5; a requirement that no longer applies is withdrawn. |
| Earlier C-M1 (unmatched signed file) | **Stays closed** | 9.3, 9.4, stage 8 (now two decisions) and view 6 (T6b "Back to approval (9.3)") agree. |
| I2–I6 | **Closed**, apart from the minor polish below | 3.7 is in the Platform lane; 5.1 uses Approve / Correct / Return; "Checks and what each establishes"; 8.4 states in words; tooltips close on any scroll (probed: shown on hover, gone after a wheel scroll); the narrow-table cue is shown; dark actor tints work. |

**Challenges to the audit:** its §5 "Keep the six lenses" is superseded by D244, so seven lenses are scored here. Its M2 smallest fix ("route outstanding items to their actual owner") was applied, but nothing in the audit warned that an inclusive gateway's *default* flow defeats per-form readiness. That is the regression in C-M2.

## 2. Material findings (three)

**C-M1 · A founder safeguard is weakened (D245 point 5).** D245: "A suspected material mapping error **holds** the affected mapping and dependent work **pending investigation** through the existing hold process." The page, tagged *Founder decision*, says in 4.3 `s3_data.py:703` (panel 4.3, "When suitable past cases become available…"): "a suspected material mapping error is triaged as a wrong-mapping ticket (10.4): **once confirmed**, the mapping and its dependent work are held". 10.4 (`:1407`, trigger "…raises a suspected mapping error from a historical comparison") holds only after triage classifies it as wrong. Between suspicion and confirmation, forms using the suspect mapping can still be approved and submitted, which the founder ruled out. *Smallest fix:* in 4.3 and 10.4, "a suspected material mapping error holds the mapping and its dependent work while 10.4 investigates; if the mapping stands, the hold is lifted and the cases are told". *Acceptance:* a suspected error found by comparison → the forms using that mapping cannot be submitted before triage ends.

**C-M2 · View 4's gateway notation contradicts per-form readiness (M2 regression).** `s3_views.py:170`: `("X9", "L4b", "seq", "Facts ready for forms", {"default": True})` on the inclusive gateway "What is still open?". The page renders it as an inclusive gateway with a default flow (the slash is visible in the 1440 view 4 screenshot). In BPMN 2.0 an inclusive gateway's default flow is taken **only when no other outgoing condition is true**. So whenever "Client answer or document missing" is true, *no* form goes on to view 6. That is the case-wide barrier M2 removed, and it is what a BPMN-literate developer would build. *Smallest fix:* make "Facts ready for forms" a conditional flow (remove `default`), labelled "Forms whose facts are ready", and keep the 8.1 note. *Acceptance:* the diagram shows both branches able to fire together.

**C-M3 · Three places disagree on where a form with open facts stops (lens 7).**
- **8.2 Starts when** (`s3_data.py:1038`): "when the facts it reads are **ready for preparation** (a missing **or held** fact stops it at review, 8.4)". **View 6 starts** (`s3_views.py:241`): "a missing or held fact stops only the forms that read it".
- **8.4 purpose** (`s3_panels.py:39`): "a **Held** field **goes on to filling** but holds approval until 8.1 resolves it".
- **8.1 Done when:** forms with missing or conflicting facts "can be rendered, but stop at 8.4"; 'needs review' and 'still true?' forms are "prepared but held at approval and submission". **Stage 6** says the same.

So a Held ('needs review' / 'still true?') form either stops at review or is filled, depending on where you read. "Ready for preparation" is undefined and contradicts 8.2's own example, which renders a field marked "needs a fact". A developer and a QA reader would build different flows. *Smallest fix:* one sentence, used in all three places: "rendering never waits for facts; a missing or conflicting fact stops the form at 8.4; a Held fact lets it be filled but stops approval and submission". In view 6, say "missing or conflicting".

## 3. Minor findings

| # | Where | Finding | Smallest fix |
|---|---|---|---|
| m1 | Footer, `s3_data.py:1472` | Says "one-pager draft 3" on draft 4 (the ledger updated VERSION only) | "draft 4" |
| m2 | 9.3 How it works, `:1208` | "acknowledges every **amber**, flagged and important item". Its own rule says Advisory is "listed only", and in 8.4 a Held (amber) item "cannot be acknowledged away" | "every Warning (Critical), flagged and important item" |
| m3 | 9.5 rules | The pre-submission checks do not name 'mapping under correction' or "every form still approved at its current version". 10.4 withdraws approval after signing, but 9.5's trigger is "All signatures are in" | Add one pre-submission line |
| m4 | 10.3 Next, stage 12 hand-over | Hand over to form preparation only, but adoption can also open questions and checklist items. 10.3 "If not" covers the question; stage 12 does not | Add "and stage 6 for new questions or documents" |
| m5 | 9.6 and stage 9 | "Which pack version the next filing uses … open question for the team" (see the M1 challenge) | State the team's rule (the case's pinned version; adopt via AG-7-56) and keep a confirm-with-team note |
| m6 | 9.6 rule, stage 9 rules | Tagged *Team requirement* but containing the page's own open question. Two certainty levels in one sentence | Split the open question into its own untagged sentence |
| m7 | 8.5 vs 9.2 `:1185`, 1.2, 9.1 | 8.5 says the hand route for Reader/edition failures and portal screens needs the founder's confirmation; 9.2 "If not" states it as settled | Mark the 9.2 / 1.2 / 9.1 mentions "(proposed; founder to confirm)" |
| m8 | 4.3 historical comparison | "each difference is classified…" has no actor; 4.3's lane is Platform, which "cannot vouch for meaning" | "the platform lists differences; the content publisher classifies each" |
| m9 | View 7, view 5 | The 10.2 call-activity "+" sits on "publish change". The 8.3 "AI checker unavailable" note is in the Lead representative lane | Lift the mark below the text; move the note into the AI lane |
| m10 | Technical overview | Two "Diagram symbols" controls (a disclosure and a button), one above the other | Keep one |
| m11 | Rendered text | Leftover terms: "approved **release** criteria" / "Approved release criterion" (Evidence), "Same engine and **package** shape" (Case types), "(**messages**)" (matrix), "**messages** to the case" (view 5), "The **master** library" (Records). The D245 text uses "release" / "release record" where the page elsewhere says publish / published pack version, and "release" is never defined | Run the term normaliser over builder strings; use "publication record" or define "release = second-person approval and publishing" once |
| m12 | 3.8 vs 8.4 | 3.8's check group is called "Advisory readiness", yet expiry in it has severity *warn* (a Critical warning). Controls (`:150`) does map block / warn / advise to the team's words, so the panel reader's claim "never mapped" is **refuted**, but the group name invites the confusion | Rename the group "Readiness warnings" |
| m13 | 7.2 Done when | "every required fact is answered or will come from an upload" cannot hold where staff or profile facts exist | "every fact asked of that adult" |
| m14 | 'fact changed' (7.1, stage 5) | A form state used only there, not in the 8.2 / 8.4 state lists | Map it to the 8.4 words (prepared again; approval withdrawn) or drop the label |
| m15 | Lens 7 leftovers (panel reader) | 5.1's example uses "Merge" beside Approve / Correct / Return; stage 3 says "no re-draft" while a 5.1 Correct re-drafts (the 'decide' route only); "carrying the verified answers forward" (9.6) reads as copying, against stage 5's one-fact-at-a-time reuse; "Held" and "Reader" each mean two things; the partner's 4 Sep 1991 example value drifts between panels; some 7.1 / stage 5 table text is repeated word for word | Wording pass only |

**Refuted or downgraded from the panel reader:** "case closure contradiction" is downgraded. The page states the closure rule and an explicit open question; that is a certainty issue (m6), not a contradiction, and AG-7-34 lets record-decision holders close with a reason. "Severity scales never mapped" is refuted (Controls `:150`), leaving m12. "Adoption hand-over" (m4) and "mapping under correction missing from the gates" (m3) are downgraded: the governing rules exist in 10.3 / 10.4, and only the routing or gate lines are missing.

## 4. Visual review

Draft 4 is a real visual improvement. The map cards use compact decision summaries, the setup row is shorter, and single actors are no longer numbered. Phone Records are readable in both themes. The BPMN labels are clear of connectors at natural size. Tooltips work on the eye, bracket, lane tag, gateway, rule tag and activity link, and close on scroll. The narrow-table cue appears at 375 px. Dark mode keeps the diagram panels light and shows actor colours as tints. At 768 px the map stacks cleanly. The remaining visual issues are minor (m9, m10).

## 5. Seven-lens scores (expert judgements, not measurements; no average)

| Lens | Maker | **Checker** | Evidence | Gap → smallest next action |
|---|---:|---:|---|---|
| 1 Solution quality | 8.5 | **8** | Closure and route continuation reuse the case workflow; owner-specific gaps; deterministic 3.7; S4 / S5 holds; D245 comparison | C-M1 weakens a founder safeguard → fix 4.3 / 10.4. AI benefit unmeasured → the bounded real read and the comparison |
| 2 Completeness and precision | 8 | **7.5** | M1–M6, S4, S5 covered with acceptance checks; 41 targeted checks | C-M2, C-M3 and m3 / m4 / m7 / m8 → one local pass |
| 3 Readability | 8 | **8** | Compact map; clean diagrams; one review vocabulary; proof-scope table | m11 term leftovers; no reader trial → a short founder walkthrough |
| 4 Usability | 8.5 | **8.5** | 150 / 35 / 41 / 0 reproduced; phone records fixed; tooltips dismiss; table cue; 4 widths × 2 themes inspected | Screen reader, real device, hosted copy untested |
| 5 Honesty and transparency | 9 | **8.5** | Proof scope; "Historical comparison unavailable"; open questions stated; build gaps | A *Founder decision* tag on a rule weaker than the decision (C-M1); *Team requirement* tags on sentences carrying the page's own open questions (m6); a "not stated by the team" claim the team's AG17-D65 answers (m5) |
| 6 Implementation feasibility | 7.5 | **7** | Gaps and proofs per capability, owners named | XFA writing / Validate, family filler binding, final-file read-back, portal and AI benefit all unproven; draft 4 adds no new evidence |
| 7 Functional language and consistency | 8.5 | **7** | Most panels precise; one term per thing largely held | C-M3 readiness-stop contradiction; m2 / m7 / m11–m15. Two reasonable readers would still build different flows at 8.2 / 8.4 |

**Headline assessments:** solution **8**, communication **8**, high/medium requirements **7.5**. After C-M1 to C-M3 and m1–m8, I expect high/medium requirements at about 8 and lens 7 at about 8. Nine needs a reader walkthrough and the real-read evidence, not more wording.

## 6. Next

The Lead fixes C-M1 to C-M3 (and the minor items as time allows) and re-runs the four suites. The checker then rechecks only C-M1 to C-M3 on the new hash. After that, the founder decides acceptance for high/medium solution alignment. The pending founder question on 8.5's scope and the two team questions are unchanged by this verdict.

## Update, 2026-10-18T07:21:13Z: minor fixes applied (founder's instruction)

At the founder's request the checker applied m1–m15 itself, so draft 4.1 has no independent check of these edits. The page is now **v3 draft 4.1**, HTML `bee3a7a31635663926ce914aca7561a1bdbeebe772564af06fa34c84ee8d01b4`; draft 4 is archived whole in `archive/ai-workers/solution-1-v3-draft4-before-minor-fixes-2026-10-18/` (with `manifest.sha256`). Every changed draft 3 string carries a C4-m disposition in the content ledger (172 dispositioned, 0 removed). Four test assertions were updated to the corrected wording, each marked "checker minor fix". Suites: 150/150, 35/35, 41/41, 0 collisions. Visually checked: view 5 note (now in the AI lane), view 7's 10.2 mark, the technical overview (one symbols control), Evidence and stage 9. Leftover-term scan of the rendered text is clean (only code paths, an official quote and BPMN "message" remain).

Not touched: material findings C-M1 to C-M3 (the Lead's), the hosted copy, NEXT and delivery control. m5 changes a Lead-recorded team question: the next filing's pack version is now stated from AG17-D65 (pinned per case); staff closure stays an open team question.
