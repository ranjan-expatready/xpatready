# V3 — does it work as one system? Golden journey on `origin/main` 877acf66 (3 Nov 2026, ~07:00–08:30 UTC)

Independent read-only tester (P-290, P-291 (1)); I did not build or score any of this. Method: skill `journey-test`. Fresh clone of `origin/main` 877acf66, `cloud-setup.sh`, then an isolated copy `xr_studio_v3` on **:4474** (the start script's own path for a non-demo port, `tools/isolated.sh`; never :4400). Live AI off, no `STUDIO_*_LIVE`, no priced button pressed: `drafting_job` with mode LIVE = **0**, cost **US$0**. Every step was walked **on screen** in a real (headless) Chromium as the person named, at 1440 px (the client at 400 px); the API and database were read only to check what the screens did.

**Result: 7 of 8 steps pass · first failing step: 4 (a released Visitor visa that no case can open) · journey score 5.5 / 10 (fail: below 8 and "next step obvious" at 0).** The automated replay (`V3/v3_golden_replay.cjs`, fresh copies on :4475 and :4476, run twice) gives the same 7 of 8 and the same break both times.

**This is the first run that configures Visitor visa entirely through the screens.** Golden runs 1–3 built steps 3–8 on `setup_visitor_visa.ts` + `setup_vv_m3.ts`, which seed sections by SQL and link answer lists through the API: the screen gaps below were never on their path.

## The eight steps

| # | Step | Result | Evidence (screenshot in `V3/`, API) | What a person stumbles on |
|---|---|---|---|---|
| 1 | Demo › Reset to the six | **Pass** | `01-reset-done.jpg`; 6 combinations, 41 files, 560 proposals waiting, 25 s (replay 27–32 s) | the orange "Not found · Upload PDF: 4" box still sits under the green "done" (run 2–3 note, unchanged) |
| 2 | Configure Visitor visa (Saved only) | **Pass** | IMM 5257 › Review AI proposals › Accept 84 › Apply: `POST /jobs/…/apply` 201, 242 boxes, 84 new fields (`02-imm5257-applied.jpg`) — **QA-163 is fixed on screen**. 14 undecided boxes decided "filled by hand" (`02-decided.jpg`). Six "condition in words" errors: IMM 5409 rule built (marital status is `common_law`), IMM 5475 / IRM 0002 / IMM 5645 removed, IMM 5707 from age 18 (source cited: IMM 5484 checklist, "Family Information form. Must be completed by those aged 18 years or older."), IMM 5476 filled by the representative. C4.11 "Draft with Saved (US$0)": `POST /draft-qd` 201 (was 409 in run 3) but drafts **0 questions** ("231 problems for a person to fix", `02-c411-done.jpg`). Sections: library empty (`02-sections-library.jpg`); the only door is Shared library › Forms › IMM 5257 › ⋯ › "Re-read with AI" › "Draft sections and lists · US$0" (`02-reread-dialog.jpg`) → 13 sections + 13 answer lists, accepted one by one. Content reviewer approves **110 library items one at a time** (no bulk; 4 min 27 s scripted). Author places **84 facts one at a time** on each field's library page (`02-field-in-library.jpg`; 2 min 36 s scripted), adds 9 sections. Review and release: **0 errors, 5 warnings** (`02-review-1-to-fix.jpg`) | the sections door is hidden and its own dialog says "Questions, sections and rules are not AI-drafted here … people author them" one line above the button that drafts them; "Add section" is disabled with no reason; section names "Nat id", "Us card", "Background info2", "Consent1", "Page wrapper"; the Overview's next step stays "Waiting for the immigration expert: Choose the checklist page" from start to after release |
| 3 | Release | **Pass** | author Submit 201 · content reviewer signs 87 of 87 (`03-reviewer-view.jpg`) · approver `POST /approve` 201 "Released version 1": 84 fields, 84 placements, 9 sections, 4 forms, 242 boxes, **lists 0** | the sign checkboxes are read out as raw keys ("Select person.criminal_history") |
| 4 | Officer opens a family case | **Fail (B1, Critical)** | Open a case offers "Visitor visa · release 1"; Open case → **409** "is not ready for new cases: 1 item to fix in Immigration programs" (`04-open-case-refused.jpg`); `missing: [{code: form_without_edition, text: "No form fields mapped yet for IMM 5409, IMM 5476, IMM 5707. Next step: Draft setup"}]`. Recovered by the author removing the three forms and releasing version 2 (`04-release-v2.jpg`); then the case opened in 0.18 s, spouse and child added on screen (`04-case-page.jpg`) | the dialog offers a release that cannot open; the officer's message does not say what is missing (by design: it is the authors' fix) |
| 5 | The client answers | **Pass** | all **25 parts typed on screen at 400 px** (run 3: 3 parts on screen, 41 by API); 0 failed saves; plain inline errors kept the other answers (UCI "digits only", phone "country code of 1 to 3 digits"); officer: 50 "Confirm section" clicks, 50 accepted, 0 refused; "231 questions · 181 answered · 181 confirmed · 0 required not answered" (`05-officer-confirmed.jpg`) | "Immigration status…" offers one choice, **"01..09"** (`05-client-status-01-09.jpg`); every country question is free text; questions read as field meanings ("Description of the visit purpose when it is 'other'", asked always); the child of 10 is asked marital status, national ID, US card, occupation and military service (my placement choice, but nothing warns) |
| 6 | IMM 5257 for each applicant | **Pass** | 3 copies (1.7 s each): 80 / 80 / 77 written, 14 by hand each (`06-copies-generated.jpg`). XFA read back: **237 of 237 equal** to what was sent; against the confirmed facts 151 match, **0 real mismatches** (the 2 flagged are the current-spouse name box, which correctly holds the other person's name), 84 not comparable (composite address/phone, derived Yes/No). 18 of 46 mandatory boxes empty per copy | the hand-fill list: "Country of citizenship ("SAMPLE" is not in the box's option list)", "Immigration status … ("01..09" is not in the box's option list)" |
| 7 | Checks (Validate, ready to file) | **Pass, accept path untested** | the unchanged copy sent back → 422 "This is the copy the product made, unchanged: it was not validated…"; an edited copy → 422 "Adobe's Validate has not passed on this file…"; a non-PDF → 422 "could not be read as this form"; "Filed" disabled (`07-readback-unvalidated.jpg`). A real Validate needs Adobe (not here) | "Filed" is disabled with no reason on it; the API says `readiness.ready: true` while the page says "Not validated yet" (two meanings of ready) |
| 8 | Staff see what was configured | **Pass** | release 2: 1 form (IMM 5257 each applicant), 9 sections, 84 placements, edition IMM 5257 (09-2023), 242 boxes, 161 mapped · case: 3 × IMM 5257, 9 section titles, 231 questions = 84 + 74 + 73 = Studio Preview (`08-studio-preview.jpg`), "of 161 form fields" on each row, ages 40 / 38 / 10 in `/prepare` = the dates typed | the case page never names the edition; the checklist is empty with an honest note ("The case's release has no document lines yet…") |

## Breaks and cross-module mismatches (most serious first)
* **B1 (Critical) — two gates disagree.** Review and release lists "IMM 5409/5476/5707: No field map yet: the form cannot be filled" as a **warning** and releases; opening a case runs `startableMissing` (`api/src/programs.ts:303`) where the same thing (`form_without_edition`) **blocks**. A released combination can be one no firm can use; the author learns it only after release ("Not ready … firms cannot open cases until it is fixed", `04-author-after-release.jpg`). Fix: one rule in both places — block at release, or leave unmapped forms out of the startable check with a line on the case.
* **B2 (Major) — answer lists never reach the questions.** 13 lists were drafted from the form, accepted and approved; release 1 publishes `lists: 0`; no screen calls `POST /library/fields/:key/answer-list` (`api/src/forms.ts:418`, no caller in `web/src`). Result in the stored data: `person.citizenship = "SAMPLE"` and `person.current_residence_status = "01..09"` for all 3 people (6 rows each), then hand-fill lines on every copy. Fix: link a list from the field's library page and at placement; never offer a form's raw code range as a choice.
* **B3 (Major) — the way to sections is hidden.** Sections come only from library › Forms › ⋯ › "Re-read with AI"; the combination's SQR tab, its Overview ("Map 3 forms" only opens the Forms tab) and the empty Sections library ("add a form first", after the form is added) never offer it. A person without the code would stop here.
* **B4 (Major) — rule values are free text.** IMM 5409's condition accepted `common_law` with "Condition is valid"; the questionnaire's values for this field are the form's own ("Common-Law", "Married", …), so the rule can never be true. Fix: offer the field's values; refuse others.
* **B5 (Major) — volume by hand.** 110 approvals one at a time and 84 placements one field page at a time for a single form. Fix: approve a form's batch with per-item reading; place facts from the SQR tab.
* **B6 (Major, judgement) — release with no documents.** Release 1 and 2 publish 0 document requirements while 18 proposals wait on Documents; no warning at release.
* **M1 (Minor) — library says the opposite of the combination:** Shared library › Forms › IMM 5257: "No saved AI draft of this form edition yet: Draft fields with AI … about US$5.48" (`02-library-imm5257.jpg`) right after its Saved draft was applied (job `field_map` REPLAY APPLIED).
* **M2 (Minor)** SQR shows "✓ Every fact has one source" beside "84 asked of nobody: release waits for them" (`02-sqr-tab` state).
* **M3 (Minor)** mandatory empty boxes: the page says 18, the form's own required flags give 19 of 46 by XFA read (one box decided "by hand" counted differently).
* **M4 (Minor)** a Live combination shows "Setup steps 0 of 5 done", "Forms 93 to do" and the Official pages step as next.
* **Checked and consistent:** the case page's 181 answered = 171 facts + 10 "none apply" groups (API `summary.answered` 181); 171 current answers in the database = 171 in the Agent view, one current row per fact, history kept (client DECLARED → officer VERIFIED); edition IMM 5257 (09-2023) and 242 boxes the same in library, release and filler; unconfirmed answers stay out of every copy, including the other person's copy (spouse name box).

## Break-it (15 min, on :4474)
Held: a double click on Generate sends one request; a non-PDF sent as the validated copy → 422 in plain words; the client opening the staff case URL sees "This page is for the case officer"; server refuses the client (403) on `/prepare` and the Agent view, the author (403) and an unknown person (404) on the case. Soft: a 308-character Cyrillic/Chinese given name is saved without a word (DECLARED); the copy then refuses it ("Keep it to 100 characters (it is 308)") and readiness flips to "needs a fix" — caught late, not lost. Opening `/cases/:id` as the author silently switches the simulated person to the case officer. Not tested: two tabs saving one answer at once.

## Automated replay (`V3/v3_golden_replay.cjs`, run twice, fresh copies)
| | run 1 (:4475) | run 2 (:4476) |
|---|---|---|
| steps | 7 of 8, first fail 4 | 7 of 8, first fail 4 |
| release 1 fingerprint | `54a2e968…` | `54a2e968…` |
| axe WCAG 2.2 A/AA, 11 states | 1: `color-contrast(1)` on the Reset dialog | 0 |
| sideways scroll 400 / 1024 / 1440 | 0 on all 11 states | 0 |
| page errors | 1: "Cannot read properties of undefined (reading 'filter')" | 0 |
| reset · approvals · placements · slowest part save | 32 s · 267 s · 156 s · 5.4 s | 32 s · 266 s · 158 s · 5.4 s |

Both runs in parallel on one machine; single-run saves were 0.5–3.2 s. Keyboard-only walk not run.

## Journey score (QUALITY.md, each 0 / ½ / 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | all 8 done, but only after a second release (B1) and with free-text countries (B2) |
| Next step obvious | **0** | B3; Overview next step stuck on Official pages; "Add section" disabled without reason; release page calls B1 a warning |
| Plain words | ½ | case side and errors plain; section names from form parts, questions as field meanings, "01..09", raw keys in aria-labels |
| Feedback and state | ½ | clear toasts and counts; M1, M2, M4 contradict |
| Correct data | ½ | 237 of 237 read back, 0 mismatches, counts agree everywhere; but "SAMPLE"/"01..09" stored as answers (B2), rule that cannot match (B4) |
| Error recovery | ½ | inline fixes keep answers, refusals name the next step; B1 needs a new release to undo |
| Accessibility and sizes | ½ | axe clean on 11 states in run 2, no sideways scroll at 3 widths; one contrast hit in run 1, raw-key labels, keyboard not tested |
| Speed | ½ | case open 0.18 s, copies 1.7 s; saves up to 3.2 s; ~2.4 s per approval × 110 |
| Visual quality | 1 | consistent layout at 400 / 1024 / 1440, no overflow in any shot |
| Trust and sources | 1 | "Picked by AI · Sample", Saved US$0 stated on every AI step, a number cannot be submitted without its source, each answer shows who and when |
| **Total** | **5.5 / 10** | fail (below 8, one 0) |

Fixes that raise it most: B1 (task completed, recovery) → B3 + B5 (next step) → B2 + B4 (correct data, plain words) → M1/M2/M4 (feedback).

## Compared with the last run (golden 3, main 88ed986a, 2 Nov: 5 / 8)
| | golden 3 | V3 |
|---|---|---|
| Configure on screen with Saved | fail: QA-163, Use Saved 400, C4.11 409 | **pass**: Saved draft applies; C4.11 runs (drafts no questions) |
| How steps 3–8 ran | on a script-built copy (setup scripts) | on the screen-built configuration |
| Open a family case | pass (on the scripted copy) | **fail B1** on the screen-built release 1; pass after release 2 |
| Client typing on screen | 3 parts, 41 by API | **25 of 25** parts |
| Officer confirms | 96 of 96 | 50 of 50 |
| Fill IMM 5257 | principal only, 84 written, 0 mismatches | **3 applicants**, 237 written, 0 mismatches |
| Validated copy | edited copy refused 422 | same, plus unchanged copy and non-PDF refused |
| Journey score | 6.5 (run 2) | 5.5 |

The step lists differ (V3 splits configure and release, and checks staff-vs-config instead of the barcode, which stays out by design, P-144). The lower score is not a regression of the case side: it is the first time the configuration side was walked on screen end to end.

## Not tested
A real Adobe Validate (the accept path and the barcode); keyboard-only and a screen reader; two tabs saving one answer; IMM 5409/5476/5707 fills (removed in the recovery); a paid run (none needed). An intended user's unaided walk stays with the founder (D17/D20).

## Delta: re-run on main 8eead4d3 (3 Nov, ~10:00–10:40 UTC; after C3.2, C4.6, C4.2, C1.5, C5.4, C7.7 part 1 and #673)
Tech lead's ruling on this PR: B1 is fixed by option (a), release refuses. The fix (F2) is **not on main yet**. The replay now maps **IMM 5707 with its Saved draft** instead of removing it. Method as above: one walk by hand on :4474 for the changed screens, then `V3/v3_golden_replay.cjs` (updated) twice on fresh copies, :4475 and :4476. US$0, `drafting_job` LIVE 0. Run 1's step 8 failed only on my script's fixed count of 231. The script now compares with the Studio Preview, and run 2 passes it: 241 = 241.

**Result: 7 of 8 steps pass, first failing step 4: unchanged.** Journey score **5.5 / 10: unchanged.** Feedback and state keeps ½ (one gain, one new contradiction, N1). No criterion moved.

| # | Step | Before (877acf66) | Now (8eead4d3) |
|---|---|---|---|
| 1 | Reset to the six | pass, 25 s | pass, 25–27 s |
| 2 | Configure | pass; "Accept clean new definitions (84)" in one click | pass; **C3.2 removed the shortcut for one-round items**: "Accept High exact reuse (0)", so 84 "Create … as a new definition" clicks (30 s scripted, `n2-imm5257-proposals.jpg`). **IMM 5707 mapped** with its Saved draft: 50 boxes, 4 new fields, 5 reused (`n2-imm5707-compared.jpg`). Placements 88. 6 warnings, 0 errors |
| 3 | Release | pass | pass; release 1 has 88 fields, 88 placements, 2 field maps |
| 4 | Open a family case | **fail B1** (5409, 5476, 5707 unmapped) | **fail B1**: 409, `form_without_edition` "No form fields mapped yet for IMM 5409, IMM 5476". Recovered by removing those two and releasing again |
| 5 | Client answers | pass, 231 questions | pass, 241 questions, 187 answered = 187 confirmed, 50 of 50 confirms |
| 6 | Fill | pass, 3 × IMM 5257 | pass, 3 × IMM 5257 (80 / 80 / 77 written, 14 by hand each) **and 2 × IMM 5707** (adults only; the child of 10 has no IMM 5707 row, so the age-18 condition works through C7.7). IMM 5707: 19 written, 1 by hand, 1.6 s |
| 7 | Checks | pass | pass: 422 / 422, Filed disabled |
| 8 | Staff see the configuration | pass | pass: 241 questions = Preview 87 + 77 + 77; 5 forms; 9 sections; ages 40 / 38 / 10 |

**Changed since the first run**
* **Better:** IMM 5707 now maps from its Saved draft. "Compare again (no AI call)" turns its 9 "new" items into 4 reuse, 4 new and 1 near match ("Use the existing person.birth_country"). The resolver (C7.7) gives IMM 5707 to the two adults only.
* **N1 (Major, new, cross-module): IMM 5707 says "Ready to file" with both parents' details empty** (`n8-case-page.jpg`).
  * Its field map reads 16 boxes for "the subject's first parent" and "second parent", plus "accompanies the subject" for the spouse and the child.
  * Visitor visa has no parent role. So 19 boxes are `not written`, and the reason given is only a section name ("Personal details", "Contact information", "Marital status").
  * The row still reads "Ready to file". Neither the release check nor readiness says the form asks about people the combination cannot hold.
  * Fix: name the missing people at release (or add a parent role), and count those boxes in readiness with a plain reason.
* **N2 (Minor, new):** after IMM 5257 is applied, IMM 5707's proposals still say "No library definition with this meaning" for `person.date_of_birth`, `family_name`, `given_names` and `marital_status` (0 reuse, 9 new). The page does not prompt "Compare again" when the library has changed. A person who decides first would create 4 duplicate definitions, or meet the stale refusal at Apply.
* **N3 (Minor):** IMM 5707's undecided boxes are named by their raw data path (`IMM_5707[0].page1[0].SectionA[0]…MarriageInPerson…yesno[0]`).
* **C3.2's one-by-one decisions** are correct under P-121: no item is High without a checker round. They become bulk-acceptable again once #671's saved checker rounds merge. On #671's head, 129 of 560 items are Ready (see the Saved check comment on #671).
* **Unchanged:** B1 (F2 not merged), B2 (still no screen calls `POST /library/fields/:key/answer-list`; hand-fill lines "SAMPLE" and "01..09" on every IMM 5257), B3 (sections still only through library › Forms › ⋯ › Re-read with AI), B4 (`common_law` still "Condition is valid"), B5 (114 approvals one at a time, 4 min 31 s scripted; 88 placements one at a time, 2 min 34 s), B6 (0 document requirements, no warning).
* **New on the Demo menu (C5.4):** "Start With an LMIA from its reviewed release…". It is the natural start for the second-combination run (P-291 (2)).

| Replay on 8eead4d3 | run 1 (:4475) | run 2 (:4476) |
|---|---|---|
| steps | 6 of 8 (step 8: my fixed 231) | **7 of 8**, first fail 4 |
| axe, 11 states | `color-contrast(1)` on the Reset dialog | same |
| sideways scroll 400 / 1024 / 1440 | 0 | 0 |
| reset · approvals · placements · slowest save | 25 s · 274 s · 161 s · 5.4 s | 27 s · 271 s · 154 s · 5.4 s |

The contrast hit on the Reset to the six dialog now appears in both runs (it was 1 of 2 before). It is a real Minor, not flake.

## Delta 2: main 4d1973b8 (3 Nov, ~11:00–12:00 UTC), with every form mapped from its Saved draft
Tech lead (Lead 3): the replay crashed at step 2 on main, because main's copy still waited for "Accept clean new definitions", which #661 (C3.2) removed. Step 2 now follows the new flow (P-296 (1), P-299). It maps **IMM 5707 (P-297 (3)), IMM 5409 and IMM 5476** from their Saved drafts. Each comes after "Compare again (no AI call)" and takes, in order: "Use the existing …", "Reuse …", "Use person.mailing_address (city part)" and the other address parts, "Create … as a new definition", and "Create …, unless it means the same as …". F2 (B1's release gate) and #714 (C6.1, the Open a case dialog) are **not on main yet**. The step-4 handling in the script is word for word #714's, so whichever merges second has the smallest conflict. Two runs on fresh copies (:4475, :4476), US$0, `drafting_job` LIVE 0.

**Result: 7 of 8 steps pass in both runs; step 4 now passes; first failing step 8 (new, N4).**

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | Reset to the six | pass | 26–27 s, 560 proposals |
| 2 | Configure | pass | IMM 5257: 84 decided one at a time (31 s scripted). IMM 5707: 4 reuse, 4 new, 1 near match, 0 left. IMM 5409: 0 reuse, 8 new, 3 ambiguous, 10 new fields. IMM 5476: 5 reuse, 10 new, 9 ambiguous (7 are parts of `person.mailing_address`), 10 new fields. **134 library approvals one at a time (5 min 27 s), 108 placements one at a time (3 min 18 s).** 0 errors, 6 warnings |
| 3 | Release | pass | release 1: 108 fields, 108 placements, 9 sections, 4 forms |
| 4 | Open a family case | **pass** | 201 "Case opened" on release 1: no unmapped form left, so no B1 and no recovery release |
| 5 | Client answers | pass | 25 of 25 parts at 400 px, 0 failed saves; 241 questions, 187 answered = 187 confirmed; 50 of 50 confirms |
| 6 | Fill | pass | IMM 5257 × 3 (80 / 80 / 77 written, 14 by hand), IMM 5707 × 2 (19 written, 1 by hand; adults only). IMM 5409 and IMM 5476 are on no one: correct for this family under the rules as configured, see N4 |
| 7 | Checks | pass | 422 / 422, Filed disabled |
| 8 | Staff see the configuration | **fail (N4)** | Studio Preview "Couple, one child" against the case built on the same release (`m8-preview.jpg`): see N4 |

* **N4 (Major, new, cross-module): the author's Preview promises 8 forms and 274 questions for a couple with one child; the officer's case on the same release gets 5 forms and 241 questions.**

  | Person | Preview | Case |
  |---|---|---|
  | Principal | 100 questions, 3 forms | 87 questions (10 for the application + 77) |
  | Spouse | 87 questions, 3 forms | 77 questions |
  | Child 1 | 87 questions, 2 forms | 77 questions |
  | Representative | 15 questions, 1 form (IMM 5476) | not a person on the case |

  * **IMM 5409** (condition: marital status is `common_law`) is counted in the Preview for every person, the child of 10 included. In the case it applies to no one: the stored values are the form's own ("Common-Law", "Married", …), so the rule can never be true (B4).
  * **IMM 5476**'s application-level questions ("IRCC application file number of the case", "What this use-of-representative filing does …") sit in the principal's Details of visit in the Preview. The case asks none of them (`summary.not_asked` 57), because the case has no representative person.
  * An author who trusts the Preview believes IMM 5409 is collected for the family. It is not, and nothing says so.
  * Fix: the Preview evaluates each form's condition the way the case does, and says "only if …" for a form it cannot decide. Together with B4's fix (offer the field's values).
* Still true: N1 (IMM 5707 "Ready to file" with the parents' boxes empty), N2 ("Compare again" not prompted), B2, B3, B4, B5 (now 134 approvals and 108 placements for four forms), B6. The Reset dialog's contrast hit is in both runs again.
* Journey score: **6 / 10** (was 5.5). "Task completed" goes to 1: the journey runs end to end on screen with no recovery release. Every other criterion holds; "next step obvious" stays 0 (B3, N2), so it is still a fail.

## Delta 3: main 56943efc (3 Nov, ~12:50–13:40 UTC), after F2's B1 release gate (#733) and C5.5 (#730)
Asked by the tech lead (Lead 3): re-run on the new main, step 2 in C3.2's flow, IMM 5707 from its Saved draft. #714 (C6.1, the Open a case dialog) is **not** merged yet; the replay copes with either dialog. Three fresh copies at once: two full runs (:4475, :4476) and one **B1 probe** (:4477, `QA_LEAVE_UNMAPPED="IMM 5409"`). US$0, `drafting_job` LIVE 0; judged in this session (P-303).

**Result: 7 of 8 steps pass in both full runs, first failing step 8 (N4, unchanged). B1 is fixed: the probe's release is refused and names the form.** Score **6 / 10**, unchanged.

| # | Step | Run 1 | Run 2 |
|---|---|---|---|
| 1 | Reset to the six | pass, 75 s | pass, 55 s |
| 2 | Configure | pass: 4 forms mapped from Saved, 0 errors, 6 warnings | pass, the same |
| 3 | Release | pass | pass |
| 4 | Open a family case | pass, 201 on release 1 | pass |
| 5 | Client answers | pass: 25 of 25 parts; 241 questions, 187 answered = 187 confirmed; 49 of 49 confirms | pass, the same |
| 6 | Fill | pass: IMM 5257 × 3 (80 / 80 / 77 written), IMM 5707 × 2 (19 written, 1 by hand) | pass, the same |
| 7 | Checks | pass: 422 / 422, Filed disabled | pass |
| 8 | Staff see the configuration | **fail N4**: Preview 274 questions, 8 forms; case 241, 5 | **fail N4**, the same |

* **B1: closed by #733 (verified).** The probe maps IMM 5257, 5707 and 5476 but leaves IMM 5409 unmapped. Review and release then shows **1 blocking error**: "Forms · IMM 5409: No form fields mapped yet: a case could not fill this form, so firms could not open cases on a release with it. Map its form fields (Draft setup), or remove the form." Submit for review is disabled ("Fix the problems first"), and `config_release` stays at 0. This is P-297 (3)'s option (a), with the form named and the next step stated.
* **N4 is unchanged.** The same release gives Preview 100 / 87 / 87 questions and 3 / 3 / 2 forms (plus a representative), against the case's 87 / 77 / 77 and 2 / 2 / 1. IMM 5409 (common-law condition, B4) and IMM 5476 (representative) are counted in the Preview only.
* **Unchanged by these merges:** N2, B2, B3, B4, B5 (134 approvals in 5 min 36 s and 108 placements in 3 min 45 s, scripted, under three-way load), B6. The IMM 5707 copy counts are identical (19 written, 1 by hand), so N1 is very likely unchanged, but I did not re-inspect the parents' boxes this time.
* **Timings** are slower because three copies ran at once: Reset 55–81 s, slowest part save 6.2–6.7 s. Compare the single-run figures above (25 s, 3.2 s).
* **Accessibility:** the Reset dialog's colour-contrast hit shows in run 1 and not in run 2. Across today's 6 full runs it showed in 4, so it is intermittent (likely caught mid-animation), not every time. 0 sideways scroll at 400 / 1024 / 1440 on all states.

## Next (P-291)
(1) When #714 merges, one confirming run of step 4 through the new dialog. (2) The same journey on a second combination of the six (the LMIA one, from its reviewed release).
