# qa findings closed on 4 Nov 2026 (moved word for word from `qa/BUGS.md` and `qa/reports/bugs-open-detail.md`, AGENTS.md rule 8)

## QA-184 — closed 4 Nov 2026 (after-merge batch 3)

Closed by the qa lane on main **a56536026** (fixed by #793; C11.10, C5.4). On Demo › Reset to the six › Start With an LMIA at 1440 px (copy qa_walk3, main eb834a660): the Programs card says "✓ Live · Next release: 3 of 5 steps to do" (the same words in its screen-reader name), the Overview strip says "Live · Release 1 · Next release: 3 of 5 steps to do", and `/api/catalogue` gives progress out of 5, at step 1, with the same label. The Review and release tab says "0 draft changes; 0 problems to fix", which matches its Overview row "Released as Release 1"; its 17 numbers without a source say they block the next submission once the draft changes. `check_qa184_live_state_browser.cjs` 16/16 in CI on main's tree (run 41764923600); `acceptance/C11.10.test.ts` 0 · 15/15 twice; `acceptance/C5.4.test.ts` 0 · 22/22. Screenshots `qa/reports/2026-11-04-after-merge/c1110-lmia-overview-1440.png`, `c1110-programs-live-card-1440.png`.

From `qa/BUGS.md`:

| QA-184 | UX · Major | C11.10, C5.4 (Demo path) · EXPERIENCE (one clear state), P-273 | 762dbae6 (explore; V3 M4 on 877acf66) | A Live combination reads as unfinished everywhere. After Demo › Start With an LMIA: header "Live · In Release 1 · 38 draft changes", but Overview "setup steps for the next release: 0 of 5 done", next step "Official pages", tabs "Forms 97 to do · Documents 3 to do · Review and release 31 to fix" while its own row says "Fix 14 problems"; Programs card "Needs you · 0 of 5 steps · Resume setup"; `GET /catalogue` progress "Step 2 of 4: Draft" (4 steps) beside Overview's 5. Evidence `qa/reports/2026-11-03-explore/x-live-overview-0-of-5.png`, `x-live-needs-you-0-of-5.png`. Expected: Live first, then what the next release needs in one count and one step list | screens | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-184 | UX · Major | C11.10, C5.4 (Demo path) · EXPERIENCE (one clear state), P-273 | 762dbae6 (explore; V3 M4 on 877acf66) | A Live combination reads as unfinished everywhere. After Demo › Start With an LMIA: header "Live · In Release 1 · 38 draft changes", but Overview "setup steps for the next release: 0 of 5 done", next step "Official pages", tabs "Forms 97 to do · Documents 3 to do · Review and release 31 to fix" while its own row says "Fix 14 problems"; Programs card "Needs you · 0 of 5 steps · Resume setup"; `GET /catalogue` progress "Step 2 of 4: Draft" (4 steps) beside Overview's 5. Evidence `qa/reports/2026-11-03-explore/x-live-overview-0-of-5.png`, `x-live-needs-you-0-of-5.png`. Expected: Live first, then what the next release needs in one count and one step list | Steps, expected and actual: this row and `qa/reports/2026-11-03-after-merge-explore.md`. Pack output is quoted there; the run logs are not committed (AGENTS.md rule 1) | screens | Open |

## QA-199 — closed 4 Nov 2026 (after-merge batch 3)

Closed by the qa lane on main **a56536026** (fixed by #790; C3.8). Fresh isolated copies, each twice, US$0: `check_c38_background_forms_api.ts` 0 · 36/36 (Q4, Q5 and Q6 of IMM 1295, IMM 5257 and IMM 1294 refused as "not a fact" with the question's own words, blocking release until decided, and fail-closed when the reading is missing) · `acceptance/C3.8.test.ts` 0 · 12/12 (1 NOTE: per-channel maps not testable on this sample) · `check_c38_completeness.ts` 0 · 22/22 · `check_c38_completeness_api.ts` 0 · 9/9; all four also green in CI on main's tree (run 41764923600). Not covered, by the tech lead's ruling on #790: the Background questions of IMM 5257 Schedule 1 (5) and IMM 5669 Schedule A (11), a separate backlog row citing each schedule's own instruction.

From `qa/BUGS.md`:

| QA-199 | Gap · Critical | C3.8 · IRCC-F08 (IMM 5257 and Guide 5256: "All questions in this section must be answered or the application will be considered incomplete and will be returned") | #691 head 5f2e5b51ee (Opus re-review) | #691's guard catches only Background boxes whose path has a `BackgroundInfo…` part (`engine/form-completeness.ts:17`; the validator `api/src/studio.ts:223` and the refusal `api/src/screen02.ts:54` share the test). IMM 5257, 1295 and 1294 put Q4 military, Q5 political party and Q6 ill-treatment at `…Military[0].Choice[0]`, `…Occupation[0].Choice[0]` and `…GovPosition[0].Choice[0]`, and IMM 5710's are `qANY`, `qBNY`, `qGovtNY` and `qWitnessNY`: all of these can still be "Not a fact" (200, no Review error), so every case leaves them blank. The pack picks its question with the same pattern (`acceptance/C3.8.test.ts:89`). Expected: every Background question of each form, by the form's own list, refused as "not a fact" | screens (C3.8) | Open |

## QA-129 — closed 4 Nov 2026 (after-merge batch 3)

Closed by the qa lane on main **a56536026** with QA-184 (#793), on the tech lead's ruling on #793 (Lead 2, ~02:25 IST): the "for the next release" framing answers it. A Live combination now says Live first and then one count, "Next release: n of 5 steps to do", on the card, the Overview strip, the List and `/api/catalogue`; its open steps are labelled "Next step for the next release". Seen on With an LMIA after Reset to the six › Start With an LMIA (1440 px). If the founder wants open steps hidden on Live, that is a new row.

From `qa/BUGS.md`:

| QA-129 | Ambiguity · Minor | C11.10 · P-157, P-161 | 63168762 (after-merge #210) | With an LMIA is Live (Release 1) but its Overview strip marks Official pages "● Next: Confirm the checklist page" and People open, and Forms shows a badge 2, while the header says "Nothing to do: firms can open cases on it". With #216 the header will say "Confirm the checklist page" instead. Should a Live combination show steps 1 and 2 as open work? | screens (or forms F2) | Open (retest 25cefb67: with #216 the Live header now says "Next step · Official pages · Confirm the checklist page", agreeing with the strip; the question stands) |

From `qa/reports/bugs-open-detail.md`:

| QA-129 | Ambiguity · Minor | C11.10 · P-157, P-161 | **63168762** (after-merge #210) | Steps: Load sample; open With an LMIA (Live, Release 1) › Overview. Seen: strip "Setup steps · 3 of 5 done · Live" with Official pages "● Next: Confirm the checklist page" and People "Confirm who can apply"; tab Forms carries badge 2; header "Next step: Nothing to do: firms can open cases on it" (`row.nextAction` null, status READY). Summary: `setup.current` = pages, `setup.next` = confirm_pages. Question: on a Live combination, are unconfirmed steps 1 and 2 open work (then the header should say so, as #216 makes it), or should they read done or "not confirmed" without a Next mark? | `reports/2026-11-01-after-merge-4/03-live-lmia-strip-next-1440.png`; `tests/qa/check_qa_am_1101c_walk.cjs` (QA-119 line lists it) | screens | Open |

## QA-192 — closed 4 Nov 2026 (qa tester 2's C11.13 verdict, #822)

Closed on main **66fc6ec48** (fixed by #726): its fail case (accepting a near duplicate with no person's reason → 400 naming the close field) and its pass case (the decider's line is kept and shown to the second person at release) each pass twice on fresh copies (`acceptance/C11.13.test.ts` 16/16, `check_c1113_near_release_browser.cjs` 19/19). Field-map near duplicates are left to their form-field page (question to the tech lead in the C11.13 row).

From `qa/BUGS.md`:

| QA-192 | Gap · Major | C11.13 · P-120 (a near duplicate needs a one-line reason), P-149 (2) | 762dbae6 (Opus re-review of #640) | A near duplicate is accepted and approved with no person's reason. `decide()` (`api/src/proposals.ts:515-581`) never asks for one; `withNearReason` (`:280`) only appends the rule's own words. #640's test asserts it (`tests/check_c1113_near_release.ts:43-48`: "Surname given at birth", near an existing field with no reason, is accepted). The page only warns "ask before approving". Expected: accepting a near item needs a one-line reason, refused (400) without one, and shown at release | forms (C11.13) | Open |


## QA-180 — closed 4 Nov 2026 (after-merge batch 4)

Closed by the qa lane on main **eb834a660** (fixed by #794; C6.1, C5.1). One rule, `formsWithoutFieldMap` on `pdfMapInUse` (engine/programs.ts), is read by release (`validate.ts`), Open a case (`missingItems`) and the setup count. `check_qa180_one_rule.ts` 0 · 26/26 twice; `tests/qa/check_qa180_two_gates.ts` 0 · 8/8 twice; in CI on main's tree (run 41771465056): `check_b1_release_unmapped` 14/14, `check_s4_startable` 10/10, `check_runtime_r1a` 99/99, `check_runtime_r1c` 132/132, `check_runtime_r1d` 96/96. Demo data at 1440 px (Reset to the six › Start With an LMIA, copy qa_walk4): the officer's Open a case offers only "With an LMIA – inside Canada · release 1", a short reference is refused on its field, and the case opens on release 1 at the first try (`qa/reports/2026-11-04-after-merge/c61-lmia-case-1440.png`).

From `qa/BUGS.md`:

| QA-180 | Bug · **Critical** (confirmed by the tech lead on #720) | C6.1, C5.1 (release gate) · BR-8, P-297 (3) (V3 B1) | 762dbae6 (after-merge 3 Nov; V3 on 877acf66) | The two gates disagree on a form with no field map: Review and release only **warns** "No field map yet: the form cannot be filled" (`engine/validate.ts:67`, level warning) and releases, while Open a case **blocks** on the same form (`form_without_edition`, `engine/programs.ts:66`): a released combination no firm can open (V3 step 4, 409). Second hole: a field map with 0 entries passes release with no word and still blocks the case. Third: the case check ignores a map whose channel is ONLINE (`programs.ts:66`), release accepts any map (`validate.ts:67`), so a form with only an online map releases and then blocks the case. `tests/qa/check_qa180_two_gates.ts` 5/8 (fails today on all three holes). Expected: one rule in both places (P-297 (3): release refuses and names the forms) | forms (F2) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-180 | Bug · **Critical** (confirmed by the tech lead on #720) | C6.1, C5.1 (release gate) · BR-8, P-297 (3) (V3 B1) | 762dbae6 (after-merge 3 Nov; V3 on 877acf66) | The two gates disagree on a form with no field map: Review and release only **warns** "No field map yet: the form cannot be filled" (`engine/validate.ts:67`, level warning) and releases, while Open a case **blocks** on the same form (`form_without_edition`, `engine/programs.ts:66`): a released combination no firm can open (V3 step 4, 409). Second hole: a field map with 0 entries passes release with no word and still blocks the case. Third: the case check ignores a map whose channel is ONLINE (`programs.ts:66`), release accepts any map (`validate.ts:67`), so a form with only an online map releases and then blocks the case. `tests/qa/check_qa180_two_gates.ts` 5/8 (fails today on all three holes). Expected: one rule in both places (P-297 (3): release refuses and names the forms) | `tests/qa/check_qa180_two_gates.ts` (5/8 today); V3 `reports/verify-2026-11-03/V3-one-system.md` step 4, `V3/04-open-case-refused.jpg` | forms (F2) | Open |


## QA-200 — closed 4 Nov 2026 (after-merge batch 4)

Closed by the qa lane on main **eb834a660**, fixed on main by 9afca2282 (3 Nov, "a case fills the edition in use … never the oldest"), never re-tested until now. All five paths QA-200 names read `pdfMapInUse` (the newest mapped PDF edition): `api/src/fill.ts:44` writeForm, `api/src/fill-case.ts:96` and `:111` (copies and trials), `engine/render.ts:119` (coverage) and `api/src/workspace.ts:72` (the Forms tab). `tests/check_edition_in_use.ts` 0 · 20/20 twice: it runs the real filler on IRCC's IMM 5476 11-2025 and 11-2021 files, with a pass and a fail case for each rule.

From `qa/BUGS.md`:

| QA-200 | Bug · Critical | C7.2, C6.1 (case fill; re-tagged from C2.4 by the tech lead on #801, 4 Nov 09:00 IST: C2.4's own behaviour is met) · P-32 (the newest printed edition is the one in use) | main 4d1973b8 (Opus re-review of #698; not caused by #698) | After a newer edition of a form is released next to its older map, a case fills the OLDEST edition. `engine/snapshot.ts:157` puts every mapped PDF edition into the snapshot, oldest first; `api/src/fill.ts:42` `writeForm` takes the first match, and `fill-case.ts:95`, `:110` and `engine/render.ts:108` read it the same way. The combination's Forms tab (`api/src/workspace.ts:71`) and the library show the newest. Scenario: IMM 5476 11-2025 accepted through impact review (its map copied as a draft, the 11-2021 map stays published) → release (`studio.ts:1149` retires no older map) → Forms tab says 11-2025, the case's PDF is 11-2021. Unconfirmed: whether a release gate refuses two mapped editions. Expected: fill, render and the Forms tab pick the same, newest edition, or the release retires the older map | runtime / forms | Open |


## QA-182 — closed 4 Nov 2026 (after-merge, #829)

Closed by the qa lane on main **9caa043be** (fixed by #829). `acceptance/C3.10.test.ts` exit 0, 8/8 on the six on GitHub (run 41787750850), and a 1440 px walk of 15 pages on the six finds no "box" or "boxes".

From `qa/BUGS.md`:

| QA-182 | Gap · Minor | C3.10 · P-63 (never "box") | 762dbae6 (after-merge) | `acceptance/C3.10.test.ts` 7/8 twice: 18 messages the API, engine or web can show still say box/boxes, e.g. "X is not a form with boxes" (`api/src/field-drafts-routes.ts:31`), "a person maps the boxes" (`api/src/field-drafts.ts:36–39`), "write it by hand… this box" (`api/src/fill-case.ts:70`), "Re-read with AI (fields and boxes)" (`web/src/pages/library-forms.tsx:339`). The 28-page walk of 1 Nov never reached these states. Expected: form field(s) everywhere | forms / screens | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-182 | Gap · Minor | C3.10 · P-63 (never "box") | 762dbae6 (after-merge) | `acceptance/C3.10.test.ts` 7/8 twice: 18 messages the API, engine or web can show still say box/boxes, e.g. "X is not a form with boxes" (`api/src/field-drafts-routes.ts:31`), "a person maps the boxes" (`api/src/field-drafts.ts:36–39`), "write it by hand… this box" (`api/src/fill-case.ts:70`), "Re-read with AI (fields and boxes)" (`web/src/pages/library-forms.tsx:339`). The 28-page walk of 1 Nov never reached these states. Expected: form field(s) everywhere | Steps, expected and actual: this row and `qa/reports/2026-11-03-after-merge-explore.md`. Pack output is quoted there; the run logs are not committed (AGENTS.md rule 1) | forms / screens | Open |


## QA-196 — closed 4 Nov 2026 (after-merge, #802 with #771)

Closed by the qa lane on main **4c3b16f0e** (fixed by #802; #771's saved runs on main). `acceptance/C3.4.test.ts` on the six on GitHub (run 41791603864): exit 0, 20/20, accepting IMM 5257's form check and a guide 5256 check through the one door. Walk on the six at 1440 px: the Saved C3.4 draft of IMM 5257 (US$0, ledger unchanged) puts 47 proposals on To review, 17 of them form checks. Accept on a form check whose form fields are not mapped yet answers, as the tech lead ruled (P-149 (1)): "This check reads 2 form fields of IMM 5257 (09-2023) that are not mapped to a shared field yet (…). Map them on the form's field page first, then accept it again; or reject it." Its "Ready to accept" badge at that point is QA-217 (Minor).

From `qa/BUGS.md`:

| QA-196 | Gap · Major | C3.4 · P-120 (AI drafts a form's checks as proposals), P-149 (1) (one door) | 762dbae6 (Opus re-review of #585) | AI form checks and guide checks from the C3.4 masters step reach To review at Ready, but Accept answers 409, "A form check proposal is accepted with its own step, not yet on this queue" (`api/src/proposals.ts:576-577`; `LANDERS` at `:367` has no `form_check` or `cross_check`). C3.4's acceptance accepts only a section. Noted before only as review Minor 3 in `screens/C3.4-ai-step/review.md`. Expected: a lander for both kinds, or the items held off the queue with a reason | forms (C3.4) | Open |


## QA-149 — closed 4 Nov 2026 (independent cloud qa for M3, round 0, PR #864)

Retested on main **9caa043be** on the suites' fixture: `tests/qa/check_qa_vv_1102_decider.ts` 0 · 6/6. The answered "Is this person travelling to Canada alone?" stays in the officer's case view and the client's questionnaire, and can be changed to "both parents". C6.4 stays Partial (fixture only; on the checkpoint it waits for QA-144).

From `qa/BUGS.md`:

| QA-149 | Bug · Major | C6.4 (also C4.4 renderer) · VV-R08, P-62 | 59d2da74 (after-merge 2 Nov) | A question asked only because it decides a document line drops out of the case once answered: the child's "Is this person travelling to Canada alone?" answered yes adds the letter of authorization line, then vanishes from the officer's case view and the client's questionnaire, so nobody can correct it to no; a PUT with the officer view's (missing) answer id is refused 409 "Changed by someone else" and the line stays … | runtime | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-149 | Bug · Major | C6.4 | **59d2da74** | Steps: an isolated copy; `tests/runtime/setup_visitor_visa.ts`, `acceptance/lib/setup_vv_m3.ts`; open the family case (4 people); as the client answer the child A1's `person.travelling_alone_to_canada` = yes → the checklist gets "Letter of authorization for a minor" (right). Then read `GET /runtime/cases/:id/questionnaire?mode=agent` (officer) and `?mode=client`. Expected: the question is still asked (it decides a line, P-62), so it can be changed to no and the line goes (pack C6.4-9). Actual: after yes the question is gone from both views (`engine/runtime/case.ts` caseView keeps a question only when it fills a box or `q.decides` is non-empty, and once answered it decides nothing open); a change to no sent with the view's answer id (none) is refused 409 "Someone changed this answer after you opened it", and the line stays. Sent with the real id it saves, so the API can still change it, but no screen can. | `tests/qa/check_qa_am_1102_c64_answer_no.ts` (1/4 today; passes when fixed) · acceptance C6.4-9 | runtime | Open |


## QA-212 — closed 4 Nov 2026 (after-merge, #837)

Closed by the qa lane on main **aa017f3a1** (fixed by #837). Demo › Start With an LMIA from its reviewed release now loads a Sample **draft**: on a copy of the six at 1440 px the dialog says "Load as a draft … answer its sources to release it", the control writes no release and no pack version (0 and 0 in the database), and Review and release shows "Numbers without a source (17)" with Submit disabled. Release 1 comes only through Add source, submit, the immigration expert's sign-off and a second person's approval: `acceptance/C5.4.test.ts` 27/27 on the configured checkpoint and on the six on GitHub (runs 41805556293, 41805568135). (`qa/reports/2026-11-04-after-merge/qa212-lmia-draft-1440.png`)

From `qa/BUGS.md`:

| QA-212 | Gap · Major (tech lead's ruling, 4 Nov ~12:30 IST, P-294 under P-322) | C6.1, C5.4 · P-322 (after setup, Works counts only on a checkpoint built by the product's own steps), BR-7 (a different person releases) | main 10868af42 (qa's P-322 check, `qa/verdicts/2026-11-04-checkpoint-built-by-product-steps.md`) | Demo › "Start With an LMIA from its reviewed release" (`api/src/demo.ts` ~127–170, `releaseWithSources` → `fromReviewedRelease`) imports the reviewed work-permit release with `importConfiguration`, then writes Release 1 straight into the database: `packVersion.create`, `configRelease.create`, `sourceAttachment.update` to IN_LIBRARY. No submit, sign-off by the immigration expert or approval by a second person runs. Expected: it releases through `studio.submit`, `studio.signoff` and `studio.approve` as the people who hold each duty, as `loadConfigured` does, so a release on the demo is always one the product's own rules made | builder (the tech lead assigns) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-212 | Gap · Major (tech lead's ruling, 4 Nov ~12:30 IST, P-294 under P-322) | C6.1, C5.4 · P-322 (after setup, Works counts only on a checkpoint built by the product's own steps), BR-7 (a different person releases) | main 10868af42 (qa's P-322 check, `qa/verdicts/2026-11-04-checkpoint-built-by-product-steps.md`) | Demo › "Start With an LMIA from its reviewed release" (`api/src/demo.ts` ~127–170, `releaseWithSources` → `fromReviewedRelease`) imports the reviewed work-permit release with `importConfiguration`, then writes Release 1 straight into the database: `packVersion.create`, `configRelease.create`, `sourceAttachment.update` to IN_LIBRARY. No submit, sign-off by the immigration expert or approval by a second person runs. Expected: it releases through `studio.submit`, `studio.signoff` and `studio.approve` as the people who hold each duty, as `loadConfigured` does, so a release on the demo is always one the product's own rules made | builder (the tech lead assigns) | Open |


## QA-214 — closed 4 Nov 2026 (after-merge, #837)

Closed by the qa lane on main **aa017f3a1** (fixed by #837, the tech lead's option (b), P-294): the inside-Canada load of the outside-Canada c1-v3 stays, but the combination is Sample (`source_basis` ILLUSTRATIVE) with the basis note "Sample: from the outside-Canada release c1-v3 …", and the dialog says "It stays Sample: this is not the inside-Canada combination's own source-backed setup". Never labelled source-backed.

From `qa/BUGS.md`:

| QA-214 | Bug · Major (breaker on #837; checked by qa on main 3b2f3139f) | C11.7, C6.1 (the demo's With an LMIA) · P-322, AGENTS rule 4 (values from official sources) | main 3b2f3139f | Demo › "Start With an LMIA from its reviewed release" loads c1-v3 into the inside-Canada combination `wp.lmia_inside` (`demo.ts:41` SIX_LMIA; its page is `…/work-canada/permit-inside/forms-documents.html`) and marks it SOURCE_BACKED. But c1-v3's `configuration.json` says "1: work permit applied from outside Canada", and its forms are IMM 1295 "Application for Work Permit made Outside of Canada", IMM 5488 and IMM 5905 (a New Delhi visa office checklist). On the configured checkpoint, the draft then files both IMM 5710 (the inside-Canada form the six's finder chose) and IMM 1295. Expected: the reviewed outside-Canada release goes onto an outside-Canada combination, or the LMIA start is labelled Sample; a source-backed label never sits on the wrong forms. Evidence: Lead's notes `pr837-QA-212/break-report.md` B3 | forms or runtime (demo) | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-214 | Bug · Major (breaker on #837; checked by qa on main 3b2f3139f) | C11.7, C6.1 (the demo's With an LMIA) · P-322, AGENTS rule 4 (values from official sources) | main 3b2f3139f | Demo › "Start With an LMIA from its reviewed release" loads c1-v3 into the inside-Canada combination `wp.lmia_inside` (`demo.ts:41` SIX_LMIA; its page is `…/work-canada/permit-inside/forms-documents.html`) and marks it SOURCE_BACKED. But c1-v3's `configuration.json` says "1: work permit applied from outside Canada", and its forms are IMM 1295 "Application for Work Permit made Outside of Canada", IMM 5488 and IMM 5905 (a New Delhi visa office checklist). On the configured checkpoint, the draft then files both IMM 5710 (the inside-Canada form the six's finder chose) and IMM 1295. Expected: the reviewed outside-Canada release goes onto an outside-Canada combination, or the LMIA start is labelled Sample; a source-backed label never sits on the wrong forms. Evidence: Lead's notes `pr837-QA-212/break-report.md` B3 | forms or runtime (demo) | Open |


## QA-195 — closed 4 Nov 2026 (after-merge, #882)

Closed by the qa lane on main **4807cac9a** (fixed by #882; the name list `engine/identity-documents.ts` decides, never only a flag or a category). `tests/check_forms_c34_ai.ts` 0 · 87/87 twice on fresh copies at load 1.6, all 14 QA-195 cases pass: "Passport" in category travel with an AI reader becomes an identity document for a person's reading; other identity documents by name and categories naming identity in other words are never AI-read; an edit, an accept, a bulk accept, a payload without its kind and a reuse of an AI-read library Passport are each refused (409) in plain words; the coded-lines versions are accepted. `acceptance/C3.4.test.ts` on the six on GitHub (run 41810052972): exit 0, 20/20. US$0; ledger unchanged.

From `qa/BUGS.md`:

| QA-195 | Gap · Major | C3.4 · P-134 (AI never reads identity documents), P-153 (code is the guard) | 762dbae6 (Opus re-review of #585, probe on main's code) | In the masters step a document type is treated as an identity document only when a reading flags it or its category contains "identity" (`engine/masters-ai.ts:197`); the name is never checked. If both rounds return "Passport" with category "travel", reader "letter_or_record" and identity_document false, the result is a Ready, agreed document type with an AI reader. The rule `identity_not_read_by_ai` passes, so it can be bulk accepted. C2.6 decides by the name (`api/src/checklist.ts:138-139`, passport or travel document). Expected: the same name rule in the masters guard | forms (C3.4) | Open |


## QA-183 — closed 4 Nov 2026 (after-merge, #867)

Closed by the qa lane on main **03ea24052** (fixed by #867). `acceptance/C11.17.test.ts` on the six on GitHub: exit 0, 24/24 on the PR head (run 41818523697) and on main (run 41825099237). Walk at 1440 px on the six: in Program structure › Add, a 130-character Category is `aria-invalid` with "Keep the name under 120 characters." under its own field.

From `qa/BUGS.md`:

| QA-183 | UX · Minor | C11.17 · P-128, skill qa §2 (message on its field) | 762dbae6 (after-merge) | Program structure › Add: a category name over 120 characters is refused (400, nothing saved), but "Keep the name under 120 characters" shows only in the dialog's general alert; the Category field shows no message (`acceptance/C11.17.test.ts` 23/24 twice; `web/src/components/add-to-structure.tsx` unchanged since 2 Nov). Expected: the words under the Category field | screens | Open |

From `qa/reports/bugs-open-detail.md`:

| QA-183 | UX · Minor | C11.17 · P-128, skill qa §2 (message on its field) | 762dbae6 (after-merge) | Program structure › Add: a category name over 120 characters is refused (400, nothing saved), but "Keep the name under 120 characters" shows only in the dialog's general alert; the Category field shows no message (`acceptance/C11.17.test.ts` 23/24 twice; `web/src/components/add-to-structure.tsx` unchanged since 2 Nov). Expected: the words under the Category field | Steps, expected and actual: this row and `qa/reports/2026-11-03-after-merge-explore.md`. Pack output is quoted there; the run logs are not committed (AGENTS.md rule 1) | screens | Open |

