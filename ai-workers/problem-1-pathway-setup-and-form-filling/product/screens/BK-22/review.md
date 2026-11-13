# BK-22 review: PR #1698, commit b15be9f1f (base origin/main d77b06220)

Reviewer, fresh context, 13 Nov 2026. Commits reviewed: 1eec48196, 3670b24a4 and b15be9f1f. The isolated copies ran on :4468, never :4400. Live AI was off; cost US$0.

**Verdict: Block (changes requested).** The code is careful. A value is never rounded or truncated, a part step is never half-run, and C1b is fixed and proven by the PDF read-back. The open items are the row's Done-when (M1, which needs the tech lead's ruling) and one inferred Yes/No (M2, a small fix).

## What I ran
- `tests/check_bk22_filler_steps.ts`: **38/38**. Six mutations of `p5/transforms.ts` each turn at least one check red: a half-run part step, no `then` split, rounding cents, an empty `stepsNotRun`, Israel always Y, and "A equals B" always on the box value. The pass and fail tests are real.
- BK-13's replay (`check_bk13_zero_code_run.ts` from #1695 head 4ac54e63e, unchanged), on a fresh copy of this commit with #1695 merged in: **40/45, 3 GAP (BK-23), 2 FAIL.**
  - IMM 1294: 0 by hand (70 written).
  - IMM 5707 ×2, IMM 5257 and IMM 5476 ×3: 0 by hand.
  - **IMM 1295 for the spouse: 1 by hand** ("person.current_residence_country is not confirmed, so it cannot be compared").
  - The PDF read-back (`read_choice_values.py`) finds no list value outside its export values on any copy, so C1b is closed.
- Suites on the exact commit, all green:
  - pure: `check_b107_form_field_gates`, `check_bk17_keep_recorded`, `check_forms_b99_same_as` 9/9, `check_forms_b88_fill` 34/34, `check_forms_b81_not_on_form` 41, `check_forms_b86_fill` 35/35, `check_qa392_nothing_recorded_sheet` 17/17, `check_qa395_counted` 22/22, `check_qa415_application_kind` 33/33, `check_qa182_no_box_words` 8/8, `check_b164_no_engine_keys` 52, `check_c76_readiness` 91/91, `check_p121_rating`, `check_s2_fill_trials` 14, `check_bk11_release_fill_trials`, `check_irm_editions` 13/13;
  - on copies: `check_g4_answer_keys` 93/93, `check_gcore_b4_field_map_check`, `check_c72_imm5257_fill` 57/57, `check_qa403_who_fills` 37/37, `check_qa318_sch1` 19/19, `check_c102_copy_values` 19, `check_forms_c36_answer_values` 50, `check_bk12_sample_case` 34/34.
- Old and new filler compared on all 4,717 drafted entries in the repository and on every mapped entry of the six releases (`releases.json` taken from the copy). On the releases, behaviour changes only on:
  - sp.outside: IMM 1294, IMM 1295 and IMM 5707;
  - fs.spouse IMM 1344: country and province are now **codes** (before, "India" and "ON" went into list boxes, the same C1b bug), and "same as mailing" is now worked out;
  - IMM 5707 relationship on vv.single and wp.lmia_inside: now written.
  Every change is a fix, or a step that now runs. **No release entry went from a correct value to a different value.** Outside the releases, a few drafts that wrote a right value through a loosely matched step now go by hand (m3). That is the safe direction.

## Blockers
None.

## Majors
**M1. Done-when not met: BK-13's replay reports 1 by-hand line on IMM 1295 (spouse).**
- The step `derive:case.applying_from_country equals current residence country` now runs correctly. The spouse is never asked `person.current_residence_country`, because IMM 1295 reads residence only through `select:current_residence_period`, which the filler does not run.
- By hand is the honest outcome; it is not a wrong value. But the row says "0 by-hand lines on every Study permit form". Option B on #1698 (running the `select:*_residence_period` steps) is inside this row's file.
- Fix: one of these.
  - The tech lead rules on the builder's question on #1698. Option A or C, with the Done-when amended or the line counted as waiting on a named row, written on the PR.
  - Or option B, with a pass test and a fail test.
- No other code change is asked for M1.

**M2. IMM 1294's "National Israeli passport" Yes/No is inferred from the country of issue** (`p5/transforms.ts:111` canonicalSteps, `:222` runner).
- Y is written for every ISR passport and N for every other.
- The same question on IMM 5257 is the person's own question, asked only when the passport is from ISR. For any other passport nothing is written there (Lead 35's ruling on #1363, `samples/own-yes-no.json` QA-165).
- An Israeli-issued travel document that is not a national passport would get a silent **Y** on a filed form. AGENTS rule 4: never guessed. Unconfirmed: immigration expert.
- Fix: keep the N branch. Send the ISR branch by hand with its reason ("the person answers this: will they use a National Israeli passport"). Add a fail test (ISR goes by hand).
- Or get the tech lead's written ruling that the map's derivation stands. The ruling on #1695 listed the step without settling this conflict, so it goes to the lead and is not settled silently.
- The Sample family has Indian passports, so this does not move M1's count.

## Minors (fix, or list on the PR)
- **m1. `stepsNotRun` misses steps that fail only for some values** (`transforms.ts:347`).
  - It probes each step with "x". `phone_part:nanp_area_code|exchange|subscriber` (IMM 1294 and IMM 1295, all three phones) takes the blank branch for "x".
  - For a Canada/US number, those steps go by hand ("…are not in the executable set yet", `:316`, which the `/is not in the executable set/` test does not match).
  - So Field map review never flags them. Probe with a +1 phone too, or match that reason.
- **m2. The rule's words overstate** (`engine/field-map-rounds.ts:27`): "left to write by hand on every case".
  - When the fact is unanswered the box is blank, as on BK-13's run for the IMM 1294 and IMM 1295 indicators.
  - Suggest "…by hand whenever it has a value".
- **m3. `then` only splits before a step with a colon** (`transforms.ts:84`, `\s+then\s+(?=[a-z_]+:)`).
  - "address_part:country then country_name_text (max 255 chars)" (`p2/config/c1-draft-1-live-fieldmaps.json`) wrote "India" before. It now goes by hand, and so does "phone_part:country_code (digits only)" / "(digits, max 4)".
  - These are safe, and flagged at review. Name them on the PR, or split before the known no-colon step words.
- **m4. More unrunnable steps remain on the Study permit's released maps than #1695 listed.**
  - IMM 1294: 2 (the previous-residence and post-secondary prose Yes/Nos).
  - IMM 1295: about 25 (`select:status_in_applying_from_country`, `select:*_residence_period`, `select:prospective_employer`, `contains:*`, prose Yes/Nos).
  - IMM 5646: `date_digit:*`, `address_single_text`, the name concatenation.
  - BK-13 shows 0 for these only because the Sample family's facts leave those boxes blank. A family with education or past residences would get by-hand lines.
  - Record this in the PR text and BK-13's run record, so the replay's 0 is read as a property of the Sample data. This is not new scope for this row.
- **m5. No test covers the card's path.** Removing `stepsNotRun` from `reviewRow` (`api/src/proposals.ts:254`) or the card line (`web/src/pages/job.tsx:171`) turns no check red. Add one assertion (API row or browser).

## Review flag: is it enough for "flags … before the map can be approved"?
Yes, for "flags".
- The draft round's rule fails, so P-121 rates the item Check, never High, and it cannot be bulk-accepted (tested).
- The card shows the words (walked at 1440, 1024 and 400 px). The review queue lists the rule as Failed (`proposals.tsx:257`).
- The checker round is not judged, which is correct: only the draft's steps are applied.
- The words are capped at 300 characters by `RULE_WHY_MAX`, which matches `contracts/proposal-item.ts:64` `RuleResult.why.max(300)`. A cut ends in "…" at exactly 300 characters, and the longest live text is 254 characters. P-121's reason is cut at 500, which is within `reason.max(500)`.
- Whether Accept should also require a reason is the builder's second question for the tech lead, not a finding. Note that the configured checkpoint's loader accepts all 140 flagged items silently.

## D1–D20 (this row's scope)
- D1 4: every listed step runs, with a pass and a fail test; the Done-when is short by 1 line (M1).
- D2 4: no truncation or rounding; C1b fixed; M2's inference.
- D3 n/a.
- D4 4: unrunnable steps are flagged before approval; m1 gap.
- D5 5: pure functions; no state.
- D6 n/a.
- D7 4: the flag explains which AI-drafted step fails.
- D8–D9 4: the flag sits on the item card.
- D10 3: the words quote raw step syntax; m2.
- D11 4: Check rating and Failed rule.
- D12 4: same warning style.
- D13 5: axe 0 violations, no sideways scroll.
- D14 4: team components.
- D15 5: under 0.5 s.
- D16 4: real tests; m5.
- D17 and D20: simulated only.
- D18 4: by-hand reasons on each copy.
- D19 4: BK-13's run nearly closes.

BIC-01–20: N/A. This is a forms engine and a Field map review card, not a case-side screen.

**Journey score: 8/10, pass** (`journey-test-reviewer-2026-11-13.md`).

## Could not check
- A real screen reader, or an intended user's walk.
- Accepting a *waiting* flagged item on a fresh draft (the checkpoint has none, and making one needs a new saved run).
- The full 476-suite set: I ran the 32 that import the changed engine code directly; CI runs the rest when the PR is marked ready.
- `graph.mjs` (run in a scratch copy) lists no gap for the job page or its route.

**Verdict: Block.** To clear it:
1. M1: the tech lead's ruling on the 1 IMM 1295 line, or option B.
2. M2: the ISR branch goes by hand with a fail test, or the tech lead's written ruling.
3. m1–m5: fixed, or listed on the PR.
