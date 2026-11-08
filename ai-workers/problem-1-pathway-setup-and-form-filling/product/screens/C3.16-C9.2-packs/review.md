# Review: C3.16's case part on the six (B82) and C9.2's BR-3 breadth step (QA-306), PR #1327

Independent Opus reviewer (P-303), 8 Nov 2026. Commit **bd0a97d7a31efb6f621eed3242866c7cbc1961f4** on `claude/hopeful-knuth-gq0p04`, base `origin/main` a228f5e25. I did not build it. The only files changed are `prototype/studio/acceptance/C3.16.test.ts` (+55/−30) and `C9.2.test.ts` (+49/−1). There is no screen, route or schema change. I checked it against: the founder-approved ask (8 Nov ~09:10 IST: B82 for C3.16, QA-306/P-417 for C9.2); concept `screens/C3.16-field-scope/concept.md:89-96`; P-322, P-33, P-319/row C4, P-339; qa's probe `scripts/c92_employer.mts` and its run (`mac-C9.2-breadth-probe-152759210.txt`) on `origin/claude/qa-2026-11-08-c92-breadth`; and AGENTS rules 4 and 5. Pattern: `C4-packs-on-checkpoint/review-C9.2.md`.

**Outcome: Rework (Block).** One Blocker (B1): the PR's own gate B will refuse C9.2. One Minor and two Nits.

## What I ran myself (own copies on :4437 and :4438, each stopped afterwards; live AI off; US$0)
* **C3.16 on the six** (`rv_c316` :4437, the pack alone, as gate B runs it): **59/59, exit 0.** Both parts ran in one run. The case part reset to the six itself, then released Visitor visa: submit 201, approve 201, `user-A user-B`, no refused document step. The P-279 refusal named 3 numbers, then `held_back 0`. Main's six run was 37/37, six part only (qa job 128610514689).
* **C9.2 on the checkpoint** (`rv_c92` :4438; Demo › Reset 201, Load configured 201): **19/19, exit 0.** Steps -1 to -11 are as on #1283: both NOTE lines 200, and -9 names IMM 5645. For the breadth, the link was 201, copying `organisation.employer_name`. The only reader was IMM 5710, and `others` were IMM 5476 and IMM 5707, both `to_do` before and after. The checksum before and after was `0e424d24c11a`. Undo was 200, and the value came back as "Sample Employer Ltd (Sample)" with the state `to_do`.
* **C9.2 on its fixture** (`rv_c92fx` :4437, exactly gate B's plan: `setup_visitor_visa.ts`, then `lib/setup_vv_m3.ts`, then the pack):
  * `setup_visitor_visa.ts`: 15/15, **exit 0**;
  * `setup_vv_m3.ts`: 44/46, **exit 1**. Only S2w and S7a are red, as recorded before;
  * the pack: **11/12, exit 1**, `FAIL C9.2-12 setup: With an LMIA – inside Canada is released (the configured checkpoint) — ""`. Main's fixture run was 11/11, exit 0 (review-C9.2 round 2).
* **Gate B plan** (`gate-b.mjs --plan` with this PR's title): "C3.16.test.ts on the six". "C9.2.test.ts fixture only … [setup_visitor_visa.ts, setup_vv_m3.ts, C9.2.test.ts]". `change-kind.sh origin/main..bd0a97d7a` prints **code**, so CI's gate B step (`ci.yml:253-259`) runs both packs on this PR.

## Against the rules: C3.16 (B82)
* **No SQL write in the pack:** both `update` statements are gone. Every `sql()` left in `C3.16.test.ts` is a select. `lib/pack2.ts` and `lib/m3.ts` (unchanged) hold no insert, update or delete. The two things the old SQL forced are now asserted as found on the six, after the people's steps (lines 180-183):
  * the placement `per_person/client_questionnaire`;
  * the field still DRAFT, with no release yet.
* **Scope by the author's own route on a draft:** `PUT /library/fields/:key/scope` as `user-A` (line 188). The check needs 200, `household`, and HOUSEHOLD stored (line 189). The 409 on a published field is still proven in the six part (lines 155-162).
* **Release through people's steps, as C4.11 does (C4.11.test.ts:162-171):** the checklist (`documentsBySteps`, nothing refused), the source gate with its P-279 refusal step, submit by the author, the SME's sign-off by `user-C`, approve by `user-B`. Line 207 asserts the new version and `submitter_id approver_id = user-A user-B`. The sign-off's response is not read, but approve refuses while any SME change is unsigned (`api/src/studio.ts:94-95`), so the release proves it (n2).
* **On the six:** Demo › Reset to the six (line 171), and both parts run in one run (lines 257-260). The header's second run line is gone, so gate B reads one run, on the six. This meets concept lines 95-96: "-3, -4, -6 run on the six once Visitor visa releases there."
* **No step dropped:** the `ok(` labels on main and on the branch differ in three places only:
  * C3.16-4's wording;
  * the scaffolding release line, replaced by the stricter people's-steps line;
  * four new setup lines. `sourceGate` also adds "C3.16 fail (P-279)".
* **C3.16-4 is not weakened (lines 238-243).** Main checked `personQ.length === 3` over every `person.date_of_birth` question.
  * On the six, IMM 5707 also asks an adult's parents' dates of birth on their own records. My run lists `…/parent_1` and `…/parent_2` for one adult, so a total of 3 cannot hold on the six for a reason that is not the rule.
  * The new check needs exactly one question on each of the three people's records (three distinct records) and none on the case's record. That is stricter than main in one way: a split of 2+1+0 passed main and fails now. A household or filing leak onto the case record fails it.
* **C3.16-6 is not weakened (line 248).** The group and field are renamed to the six's own (`employment`, `person.occupation_employer`). The check is unchanged: a row id, both saves 200, and `ids === "1/2"`. On a field not asked per row, the row key is null, giving "0/2", so it cannot pass by accident. My run: add 201, 200, 200, "1/2".

## Against the rules: C9.2 (QA-306, P-417)
* **Header (lines 6-8):** the founder's BR-3 sentence, word for word, with #1051 and QA-306 cited.
* **The asked step, element by element:** each part of the ask has a check that is at least as strict as qa's probe:
  * -13: IMM 5710 validated and read back;
  * -14: out of date. Stricter than the probe: it also needs the old value and a date in the words;
  * -15: the checksum unchanged and one append-only row. Stricter than the probe on the row count;
  * -16: a CRITICAL `out_of_date` naming the form, `ready === false`;
  * -17: the forms that do not print the name are untouched;
  * -18: Undo restores the value, and the item is no longer out of date.
* **Row C4 / P-319:**
  * The reading form comes from the questionnaire's own `fills` for the fact; the others come from the case's items.
  * No check, label literal or predicate after line 94 holds a form number or channel (grep). The written keys are a fact (`organisation.employer_name`) and a combination (`wp.lmia_inside`), not forms.
* **Narrower than the probe, but not asked:**
  * -17 compares forms only; the probe compared every item.
  * The probe's last line ("employer case unchanged") is not carried. It was also vacuous, because it defaulted to the expected string.
  * Neither is in the founder's list, so neither is a finding.

## Vacuity
* **C3.16:** every new setup line is a conjunction on measured values, and the case part `return`s on a failed release (line 209), so later steps cannot run on a stale copy.
* **C9.2:** with `EF = ""`, three checks can evaluate over the wrong thing (m1):
  * -14 reads the worker's first item;
  * -16's `words.includes("")` is true for any out-of-date warning;
  * -18 can pass with `undefined === undefined` and a 200 Undo.

  A 19/19 green still cannot be reached that way, because -12 needs `!!EF` and -13 needs a copy.

## Issues
1. **B1, Blocker (Must): C9.2 turns red on its fixture, which is the run gate B makes on this PR.**
   * **Where:** `C9.2.test.ts:102-104`. On the fixture, nothing releases With an LMIA (neither `setup_visitor_visa.ts` nor `setup_vv_m3.ts` mentions it). So -12 FAILs, and the pack exits 1 (11/12, measured).
   * **Why it blocks:** gate B passes a pack with no named steps only on exit 0 (`gate-b.mjs` `packVerdict`). The PR is KIND code, and CI's default data is the six, where C9.2 runs "fixture only". So the PR cannot merge on green CI, and every later PR naming C9.2 would hit the same refusal.
   * **Fix, without lowering the checkpoint step:**
     * make -12 to -18 tell "this copy is not the configured checkpoint" apart from "With an LMIA is not released". For example: a NOTE, never PASS, and skip where the copy holds no `wp.lmia_inside` combination at all; a FAIL, as now, where it exists without a release. Gate B already prints "NOT TESTED … fixture only" for C9.2, and qa counts the checkpoint run (P-339);
     * or another arrangement the tech lead rules on.
   * **Then show both runs in the PR:** checkpoint 19/19, and the fixture exit 0 with the NOTE line.
2. **m1, Minor (Should): the per-step form guards are missing (lines 128, 133, 139),** the same gap as m1 on #1283. **Fix:**
   * add `!!EF &&` to -14, -16 and -18;
   * at -18, also require `copied !== undefined`.

   Neither data set changes meaning.
3. **n1, Nit:** two checks carry the id "C9.2-12 setup" (lines 103, 118). Named steps (`stepsVerdict`) cannot tell them apart. Line 15's title still says "(Visitor visa)" only.
4. **n2, Nit:** at line 202 the sign-off's status is not read, though line 207 says "signed by the SME". The product's gate makes it true, and main did the same. Optionally assert `signoff.status < 300`.

## D1-D20 (a pack-only change)
* D1 Requirement fit 6: both asks are met on the six and the checkpoint, but C9.2 breaks its gated fixture run (B1).
* D2 Data integrity 9: product routes only; no SQL write.
* D4 Rule integrity 9: C3.16-4 and -6 hold or tighten.
* D16 Testability 7: m1, and the fixture.
* D18 Provenance 9: Sample values, decisions cited.
* D19 Closure 5: the PR cannot pass its own gate.
* D3, D5-D15: not applicable. D17 and D20: simulated only.

## Journey test
Not scored, on purpose. No screen, route, words or data shape changed, and both packs drive the API. The journeys are exactly the pack steps I ran and list above. The C3.16 concept's 1440 px walk (line 122) belongs to that row's screen work, not to moving a pack. #1283's pack score (8.5) is unaffected.

## Not checked
* C3.16 on the checkpoint (main: 14/37 in job 128610501460, because the six part finds the fields published). This PR does not touch the six part.
* The graph (P-86): `qa/GRAPH.md` is not mine to rewrite.
* That the fixture copy holds no `wp.lmia_inside` combination at all. I only saw that none is released.
* CI on this head: every check skipped while the PR is a draft.

**Verdict: Block** (bd0a97d7a31efb6f621eed3242866c7cbc1961f4). Fix before Approve: **B1**. Should: m1. Nits: n1, n2.
