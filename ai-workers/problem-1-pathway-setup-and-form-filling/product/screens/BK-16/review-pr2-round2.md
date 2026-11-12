# BK-16 PR 2 (#1632): round 2 review (Opus reviewer, 12 Nov 2026)

Reviewed: only `git diff 452c5e8a0..d8e1f45a15c5804d9f164849ff3cfc089bac79ce` (P-277), against my round-1 findings (`review-pr2.md`) and the tech lead's rulings on #1632:
- P-496 (1), option (A), with the REQUIRED byte check;
- M2, B1, m3, m4 and m5 to be fixed as listed;
- m1 moved to B185;
- P-497 (2): no `case-prepare.ts` change.

How I checked: fresh isolated copies on :4456 and :4457 only (two other copies held :4460 and :4462), live AI off, US$0, no priced button pressed. I captured main myself:
- checked out `3ea36a0d3` on a clean tree;
- loaded the configured checkpoint on a fresh copy and dumped every combination's newest `config_release.snapshot` (the whole snapshot, not the test's projection);
- checked the branch back out. The tree is clean on the head; I wrote only this file.

## Round-1 findings
| Finding | State | Evidence |
|---|---|---|
| B1: four suites red | **Fixed** | `check_bk10_form_rules_data` 20/20, `check_qa144_sp_release` 27/27, `check_c10_1_configured` 48/48 and `check_qa144_vv_release` 36/36, all exit 0 on the head. Each changed line says why (BK-16 PR 2, P-490/P-496, review M2). None is weaker than the ruled behaviour: sp_release now pins ANSWER_CONDITIONAL, DEPENDENT, `studies_six_months_or_more = true` and `who = principal_and_children_when`; vv_release still requires row 7 done, and adds a check on the renamed headed part. |
| M1: other combinations' releases changed | **Fixed for the questions; not byte-identical** | See M-R2-1. Every placement, section, field, form line, field map, rule, check, source and document item is identical to main in every field except `status`. The renames, the moved city of birth, the "change of sex or gender identifier" part and the dropped SQR section are all gone. |
| M2: row 7 partial | **Fixed** | Six `section-names.json` entries. vv_release: row 7 done, nothing held, 64 unheaded sections named (6 in a person's wording). `check_b78_section_names` 11/11 checks the "printed" names against `imm1295e.texts.json`. |
| m1: optional IMM 1295 questions asked as required | Moved, as ruled | Listed under Follow-ups in the PR body (B185). |
| m2: overstated claim in the body | **Fixed** | The body now says the CRITICAL line can be passed with a reason and names the firm. The follow-up line for P-497 (2) is there. |
| m3: a load dirties the tree | **Fixed** | The job file is committed at v2. After six configured loads on the head, `git status` is clean. |
| m4: `about` says "one student and a representative" | **Fixed** | `samples/form-setup.json:63`. |
| m5: no screenshot of the total | **Fixed** | `screenshots/bk16-pr2-03-case-fees-1440.png` shows "Total for this submission: CAD 825", each fee line and the Sample note. |

## Things checked hard
1. **The loader.**
   - **Generic.** No form, combination or program is named in code; the only names are in comments and in `LATER_STEPS`, which lists step-file prefixes. `check_b164_no_engine_keys` 52/52.
   - **Sources.** The held set comes from `wave1.json` `later`, and only a file the same setup lists in its `sources` counts (tested in `check_checkpoint_review_order` 11/11). `heldForms` maps it to a form key through the edition's `officialFile`.
   - **The screen's own call is unchanged.** `form-part-placements.ts:69` (`POST /api/combinations/:id/place-from-form-parts`) passes no `leaveOut`. The default is an empty set, so `leaveOut.size` is 0 and `snapshot` is the built one, as before. `130-release-two.ts:59` is also unchanged.
   - **No double placement.** Pass `10-form-boxes` places only `gaps` (facts not yet placed), so the later pass adds only IMM 1295's new facts. Its `placed(cc)` is keyed by a new context object, so 220 reads the later pass's own result.
   - **Two passes.** 100 skips the held form's rule in the own pass and sets it in the later one. 150 approves whatever is waiting.
   - See m-R2-1 for step 400.
2. **`060-sections-from-forms.ts`, entries now naming headed sections.** On the head's configured load, exactly one edited section proposal is outside the unheaded group and not named from its printed heading: IMM 1295's headed work part. The unheaded edited sections are IMM 1294 5, IMM 1295 5, IMM 5257 1, IMM 5257 SCH1 5, IMM 5409 2, IMM 5475 2, IMM 5476 2, IMM 5532 15, IMM 5604 15, IMM 5646 2 and IMM 5710 10. No earlier entry changes behaviour. The one section still waiting is IMM 5645's, which is drafted at release 2 as before.
3. **The byte check and its fixture.**
   - **The fixture really is main's.** The test's projection, computed from my own capture of main `3ea36a0d3`, equals `tests/fixtures/bk16/other-combinations-main.json` for all four combinations. main has moved on to `56b630913`, but nothing since `de7f14bc6` touches the checkpoint, samples or placements; it only touches `engine/runtime/forms.ts` and recorded counts.
   - **The projection is not strong enough.** It keeps `section_id`, `fact`, `collected_from`, `repeats`, `question_text` and `rule_only`. It drops `status`, `order`, `tier`, `condition*`, `help_text`, `client_visible`, `lineage` and `item_version`. The full comparison finds a real difference that it hides: M-R2-1.
4. **The test updates.** See B1 above. Also:
   - `check_b78` 59 → 65 entries, with the reason;
   - `check_c10_1` 19 → 20 replays, with the reason;
   - `check_bk10` lists the three family rules, with the reason;
   - `check_checkpoint_review_order` adds pass and fail cases for `later` and the showcase.
5. **The m5 screenshot and the PR body.** Both are as summarised.
   - The body states the checks, m2's correction and both follow-up lines (P-497 (2) Ready to file; B185).
   - Its line "identical to main 3ea36a0d3 … `diff` exit 0" is true only of the projection (M-R2-1).

## Major
- **M-R2-1: the other combinations' releases are not byte-identical to main, and the required check is built so it cannot see it.**
  - Where: `tests/check_bk16_family_forms_api.ts:43-54` (`released()` projection), and the claim in the PR body and test names.
  - **What differs.** Compared on whole snapshot objects (head `d8e1f45a1` against main `3ea36a0d3`, configured load on each), `vv.single` is raw-identical. Three others differ only in `status`, DRAFT on main and PUBLISHED on the head:
    - `wp.lmia_inside`: 14 placements, 14 canonical fields and the section `details_of_intended_work_in_canada`. The placements are case.intended_employment_start/end_date, lmia_or_offer_number, work_location_address, intended_job_duties, intended_job_title, work_permit_type, person.education_field_and_level and employment_employer/start_date/end_date/city/country, among others.
    - `pnp.express_entry`: 3 placements (person.residence_country, education_start_date, education_end_date).
    - `fs.spouse`: 1 placement (relationship.relationship_start_date).
    - `row_versions` differs in the same way.
  - **Why.** IMM 1295 shares these library items. The Study permit is released second (Release 2, after the Visitor visa), so it now publishes them first.
  - **What it changes.** The status is hashed into each release (`engine/snapshot.ts:93` excludes only `row_versions`, `mode` and `held_conditions`). Each release's record of what it published also changes:
    - With an LMIA "Release 3; 21 fields, 21 placements, 1 sections" against main's 35/35/2;
    - Express Entry 92 against 95;
    - Family sponsorship 42 against 43.
  - **What does not change.** The questions asked: same section, fact, wording, order, condition, help and visibility. I checked every field except `status`.
  - **Why it is a Major.** P-496 (1) makes "byte-identical to main" a required check, and the PR says it holds. It does not, and the check's projection drops exactly the field that differs. That settles a conflict with a ruling silently (WAY-OF-WORKING: never deviate silently).
  - **Failing scenario.** Load the configured checkpoint on main and on the head. Read `config_release.snapshot->'placements'` for `wp.lmia_inside`. `case.lmia_or_offer_number` has `"status": "DRAFT"` on main and `"status": "PUBLISHED"` on the head. The family suite still prints "byte-identical to main's (136 placements)".
  - **Fix (small, no new scope):**
    1. Compare whole released objects in the byte check: placements, sections, canonical fields, forms and field maps, with every field. Re-capture the fixture from main the same way.
    2. Then either make the releases truly identical, or put the status-only difference (which release first publishes a shared item) to the tech lead in the PR as a challenge with this evidence.
    3. If it is ruled acceptable, have the test assert identity on every field but `status`, and list the expected status flips by name, so any other difference still fails.
    4. Reword the test names and the body to match.

## Minors
- **m-R2-1: step 400 runs on the held form in its own pass too.** `combination/400-edition-form-fields.ts:18` filters editions only when `pass === "later"`. In the own pass IMM 1295's unresolved form fields are therefore marked by hand before its placements, against the comment "the others were done in the own pass". No effect observed: the other releases match apart from M-R2-1, and the Study permit suites are green. Exclude the held forms in the own pass, or fix the comment.
- **m-R2-2: the Sample section name reads as a disambiguation, not a heading** (D10). The spouse sees "Intended work in Canada (work permit applied for from outside Canada)" (`samples/section-names.json`, three entries). It is labelled Sample, Unconfirmed: expert, and the name is a person's to give; a plainer wording such as "Your intended work in Canada" would still not join With an LMIA's section.

## Journey (reviewer, the one score for this check)
`web/` and the runtime are untouched by this diff. I re-ran the API family walk on the head (`check_bk16_family_forms_api` 25/25), and the m5 screenshot shows the walk's CAD 825 total on the case page. Round 1's walk (`journey-test-reviewer-2026-11-12-pr2.md`) docked the score for M1 (city of birth asked twice on Express Entry). That is now gone: Express Entry's placements are identical in every field but `status`. **Journey score: 9 / 10, pass.**

## What I ran (exit codes)
| What | Copy | Result |
|---|---|---|
| main `3ea36a0d3`: configured load and full snapshot dump | :4456 `rvmain` | 201 |
| head: configured load and full snapshot dump | :4456 `rvhead` | 201 |
| `check_bk16_family_forms_api.ts` | :4457 `rvfam` | 25/25, exit 0 (4 byte checks pass) |
| `check_qa144_vv_release.ts` | :4456 `rvvv` | 36/36, exit 0 |
| `check_c10_1_configured.ts` | :4457 `rvc10` | 48/48, exit 0 |
| `check_qa144_sp_release.ts` | :4456 `rvsp` | 27/27, exit 0 |
| `check_bk15_study_family_api.ts` | :4457 `rvbk15` | 15/15, exit 0 |
| `check_bk10_form_rules_data.ts` | pure | 20/20, exit 0 |
| `check_b78_section_names.ts` | pure | 11/11, exit 0 |
| `check_b164_no_engine_keys.ts` | pure | 52/52, exit 0 |
| `check_checkpoint_review_order.ts` (`--tsconfig api/tsconfig.json`) | pure | 11/11, exit 0 |
| whole-snapshot comparison, main against head (scratch script) | | M-R2-1 |

Every copy was stopped. Not re-run (the builder's runs): Gate B C4.1, C6.12, C11.12, C11.12-runtime and C10.1; C6.12-breadth; `check_features_registry`; `graph.mjs`.

**Verdict: Block** at `d8e1f45a15c5804d9f164849ff3cfc089bac79ce`. To fix: M-R2-1 (byte check over whole objects, and the status-only difference either removed or ruled on by the tech lead). m-R2-1 and m-R2-2 can follow.

Verdict: Block (d8e1f45a15c5804d9f164849ff3cfc089bac79ce)
