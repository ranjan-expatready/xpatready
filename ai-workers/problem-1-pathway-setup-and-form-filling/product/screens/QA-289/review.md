# QA-289 (M3 row A7): independent review

* **Reviewed:** commit `8c43e177` on `claude/festive-ptolemy-svx0h4`, the diff `git diff a698a26d 8c43e177` (3 files: `engine/runtime/team.ts`, `api/src/runtime.ts`, `tests/runtime/check_qa289_rep_phone.ts`).
* **Reviewer:** independent code reviewer (a fresh context that did not build the row), 6 Nov 2026. US$0: no model call and no server. The shared working copy was on another branch during the review, so both commits were read from `git archive` copies. The line numbers below are those of `8c43e177`.
* Paths are under `ai-workers/problem-1-pathway-setup-and-form-filling/prototype/` unless they start with `studio/`, which is short for `prototype/studio/`.

## Verdict

**Request changes.** The change keys the phone's shape on `shapeOf(...).phone`, which only matches `/phone_part/`. The library's own IMM 5476 map reads the representative's telephone with `phone:country_code_digits` and `phone:area_code_and_number`, which this rule does not see. On a release where IMM 5476 is the only form that reads `person.telephone_number`, the office phone now goes on as text. The filler cannot split text, so both IMM 5476 phone boxes go from written to blank. This is the release type the row's "Done when" is about.

## What was run

| Check | Result |
|---|---|
| `node product/tools/typecheck.mjs` at 8c43e177 | `PASS no new type errors (15 known, 0 fixed)`. api 15 errors (the known ones), web 0. Same at a698a26d. |
| `tsx tests/runtime/check_qa289_rep_phone.ts` at 8c43e177 | **13/13**, exit 0 |
| The same test file copied onto a698a26d | **6/13**, exit 1 (7 FAIL) |
| `check_vv_prepare_api.ts` 40/40, `check_c611_team.ts` 70/70 (builder's claim) | **Not re-run.** Both need an isolated server on 4431/4432, which is in the range this review may not use. The engine-level reason they stay green is confirmed below (IMM 5257's `phone_part` maps on the Visitor visa). |
| Engine probe on the reviewed work-permit release (`studio/tests/fixtures/screen01-work-permit-release.json`, the snapshot of `p3/releases/c1-v3`, which Demo loads as Release 1, `studio/api/src/demo.ts:68`, `:192`) | `shapeOf(snap,"person.telephone_number").phone` = **false**; `writesParts` on its maps = **true**. The case gets `"+1 4165550100"`. Fill `phone:country_code_digits` gives **blank "no country calling code"** and `phone:area_code_and_number` gives **blank "no number"**. With the parts (a698a26d) the same boxes are written `"1"` and `"4165550100"`. |

## Findings

### Blocker

**B1. On a release where only IMM 5476 reads the representative's telephone, IMM 5476's phone boxes are now blank (regression, and "Done when" is not met).**
* `studio/api/src/runtime.ts:280` takes `phoneParts` from `shapeOf(...).phone`. In `studio/engine/runtime/case.ts:83` that flag is `ts.some((t) => /phone_part/.test(t))`.
* The library's IMM 5476 map (`p3/releases/c1-v3/configuration.json:7045`, `:7062`; the same entries in `studio/tests/fixtures/screen01-work-permit-release.json`) reads `person.telephone_number` with `phone:country_code_digits` and `phone:area_code_and_number`. No other map in that release reads that fact. So `phoneParts = false` and `team.ts:101` hands on `phoneText(o.phone)`, a string.
* The fill path is `studio/api/src/fill-case.ts:149` / `:222` (`runtime.state(c)`), then `studio/engine/form-values.ts:51`, then `p5/transforms.ts:155`. That step reads `p?.country_code` and `p?.number` from the value. On a string both are undefined, so the step returns `blank`. The probe above shows the result: written before, blank after.
* The engine already has the right rule. `studio/engine/field-format.ts:166` `writesParts = /^(?:address_part|phone_part|phone):/` (after any `select …;`) is what the family editor uses (`studio/api/src/answer-keys.ts:157-160`, "the forms that read it part by part say so in their transform ("phone:…", "phone_part:…")"). `shapeOf` does not use it.
* **Fix options, for the tech lead to choose (stream A, `engine/runtime/case.ts`):**
  * **Preferred.** Make `shapeOf(...).phone` one rule with the filler's: true when any map for the fact `writesParts` with a phone transform (`phone_part:` or `phone:`, after the `select …;` choice). Then on this release the questionnaire shows the representative's phone as kind `phone` (`studio/web/src/runtime/questionnaire.tsx:50`, `:94`), which prints "+1 4165550100". The firm record's parts go on unchanged and both IMM 5476 boxes fill. That fixes the "[object Object]" on the case page without changing `questionnaire.tsx`.
  * Keep `phoneText` for a release whose maps all read the phone whole (`as_is`).
  * If this goes beyond "one file of stream A", say so on the PR or in `challenge.md`.
  * A fix that only changes `runtime.ts:280` to `writesParts` would keep the fill right. It would also bring back "[object Object]" on the case page for this release, because the questionnaire would still show the question as text.
* Add a fail-then-pass check on this release's real IMM 5476 transforms (see m3).

### Major

**M1. The text and part shapes are decided per fact for the whole release, so one map's shape is forced on every other map (part of question 1).**
* `shapeOf` (`case.ts:72`) collects transforms from every map for the fact, with no regard to form, person, or channel. The `snapshotFieldFormat` it calls drops `ONLINE` maps (`field-format.ts:263`); `shapeOf`'s own `phone` test does not.
* **A part-writing map next to a whole-reading text box** (for example IMM 5257 `phone_part:*` and an IMM 5476 edition mapped `as_is`, as the 11-2025 check run `p2/runs/studio-fieldmap-check-imm-5476-11-2025-…-387aa7.json` maps `person.telephone_number | as_is`): `phone` is true and the parts object goes on. `p5/transforms.ts:127-128` `as_is` does `String(v)`. Probe: `runTransform("as_is", {country_code:"1",number:"4165550100"})` gives `{ok:true, value:"[object Object]"}`, so the PDF text box is written "[object Object]". This is not new: client-typed phones hit it too. Still, the row's "never [object Object]" on IMM 5476's block depends on it. Either:
  * teach `as_is` on a phone object to write `phoneText` (in the filler), or
  * record it as a known gap with its own row.
* **The reverse** (only `as_is` maps, so text): `phone_part`/`phone:` boxes do not exist, so nothing is lost. The text "+1 4165550100" goes whole into the box. This is correct.

### Minor

**m1. The `phoneParts = true` default keeps every unchanged caller on parts, which is safe today but can let the bug come back without notice (question 3).**
* Callers of `representativeContact` / `representativeAnswers`: only `studio/api/src/runtime.ts:281`, plus the tests `tests/runtime/check_c611_team.ts:57`, `:68` and the new test.
* `studio/api/src/team.ts:55` calls `representativeFacts`, which has no phone. `studio/api/src/sample-case.ts` does not call these functions; it reaches the phone through `runtime.state`.
* So every product path now passes the shape. A new caller that forgets it gets the object again, the original bug.
* Better: make the parameter required, or pass the snapshot and let `team.ts` decide.

**m2. A copy frozen before this change may show as "changed" afterwards.** On a release where the phone is now text, an IMM 5476 copy made before the merge holds the parts object. `state()` now gives a string, so the out-of-date comparison (the review B1 rule that `inStoredOrder` exists for, `team.ts:137-145`) will list the representative's telephone as changed. B1 fixes this case anyway, because that release keeps parts. Note it if the text path stays for other releases.

**m3. The test does not exercise the real transform that breaks (question 4).**
* `check_qa289_rep_phone.ts:51-53` builds a snapshot by hand with `transform: "phone_part:national_number"`, `null` and `"max 20 characters"`. It never uses `phone:area_code_and_number` / `phone:country_code_digits`, the transforms IMM 5476 actually has. So it passes while B1 is there.
* The hand-made map has `form`/`channel` but no `form_edition`/`inventory_file`. So `snapshotFieldFormat` runs but reads no box limits. The `shapeOf` path is covered, but only trivially for limits.
* Wanted: one check that loads `studio/tests/fixtures/screen01-work-permit-release.json` and asserts:
  * the shape (parts),
  * that `runTransform` on each of its two IMM 5476 `person.telephone_number` entries writes digits, never blank.
* That check is pure and needs no server. It would fail on this commit and pass on a fix. For "Done when" ("on a release that asks the representative's telephone … IMM 5476's block show[s] a number a person can read"), this builder-side fixture check is needed. The checkpoint has no such release to walk, and qa's route check would come only after merge. A route-level check on a fixture release is still qa's, as the plan says.

**m4. The builder's note is inaccurate.** It says IMM 5476's map on the Visitor visa writes the phone part by part. In fact IMM 5476 (from the library, c1-v3) writes it with `phone:`. What keeps the parts on that release is **IMM 5257's** `phone_part:*` maps on `person.telephone_number` (`p2/runs/studio-fieldmap-imm5257e-live-20261021t060247723z.json`). The outcome on the Visitor visa is the same. Correct the PR text, because the true reason is the cause of B1.

### Nit

**n1. `phoneText` (`team.ts:81-88`) on the parts the `Phone` contract allows (`contracts/runtime.ts:99`: `type`, `country_code`, `number`, `extension`) (question 2).** Probe results:
* `{country_code:"+1", number:"416-555-0100"}` gives `"+1 416-555-0100"`.
* `" 416 555 0100 "` gives `"+1 416 555 0100"`.
* No country code gives `"4165550100"`.
* An extension that is only blanks is dropped.
* No number gives `null`, which `representativeContact` then filters out, so the question stays asked.
* `null` and an array also give `null`.

Spaces and dashes are kept as the person typed them, which reads well. `type` is ignored, which is fine. An array (several phones with roles) gives `null`, so the question is left asked rather than one phone being picked. That is acceptable, but no firm record has an array today. `inStoredOrder("+1 4165550100")` returns the string unchanged (`team.ts:141`), so a string is safe there.

**n2.** The type `Office.phone` (`team.ts:10`) has no `extension`, but `phoneText` reads one. Add `extension?: string` so the type says what the code handles.

**n3.** The test fails for the right reason only in part. Of the 7 FAIL lines on a698a26d, 4 are "(no phoneText)": the helper is missing. Only 3 (`asText` ×2 and `ans(false)`) show the bug itself. This is acceptable, but the bug lines are the ones that prove the row.

## Answers to the questions

1. **Same rule as the questionnaire?** Yes for the view.
   * `kindOf` gives `"phone"` iff `q.shape.phone` (`studio/web/src/runtime/questionnaire.tsx:50`).
   * `q.shape = shapeOf(s, q.fact)` (`case.ts:315`) on the same `snapshotOf(c)` that `state()` uses (`runtime.ts:72`, `:280`, `:290`).
   * `checkValue`'s phone branch uses the same flag (`case.ts:203`).

   It is **not** the filler's rule (`field-format.ts:166` `writesParts`, `p5/transforms.ts:147-156`), and that is B1. On mixed maps, see M1: a whole-reading `as_is` box gets "[object Object]" when the parts go on. When text goes on, a `phone_part:` or `phone:` box is left blank.
2. **`phoneText`:** right for the contract's parts, including spaces and dashes (n1). It is safe through `inStoredOrder`.
3. **Other callers:** none left with the object on a product path. The default `true` is safe for today's callers but fragile (m1).
4. **The test:** names and assertions match. It reaches `shapeOf` but not the real IMM 5476 transforms, so it misses B1. It fails on the old code (6/13), partly only because the helper is missing (n3). A builder-side fixture check on the work-permit release is needed (m3).
5. **Runs:** typecheck `PASS no new type errors (15 known, 0 fixed)`; `check_qa289_rep_phone.ts` 13/13 on the branch and 6/13 on a698a26d.

**Verdict: Request changes.**

## Round 2

* **Reviewed:** `git diff 8c43e177 32a685f8` (commit `32a685f8` on `claude/festive-ptolemy-svx0h4`): `engine/runtime/case.ts`, `engine/runtime/team.ts`, `tests/runtime/check_c611_team.ts`, `tests/runtime/check_qa289_rep_phone.ts`. Line numbers are those of `32a685f8`, read from a `git archive` copy. Same reviewer, US$0, no server.

### Verdict

**Approve.** B1 is fixed at its root: the questionnaire's phone kind, `checkValue` and the PDF fill now use one rule. On the work-permit release, the representative's phone shows as a phone, is read-only from the firm record, and fills both IMM 5476 boxes. No other fact in any release or fixture the suites load changes kind. M1 is carried as its own row (see below), not fixed here.

### What was run

| Check | Result |
|---|---|
| `node product/tools/typecheck.mjs` at 32a685f8 | `PASS no new type errors (15 known, 0 fixed)`: api 15 known errors, web 0 |
| `tsx tests/runtime/check_qa289_rep_phone.ts` at 32a685f8 | **16/16**, exit 0 |
| The same test file at 8c43e177 | **14/16**. The 2 FAIL lines are the B1 checks: shape `false`; boxes `["no country calling code","no number"]` |
| The same test file at a698a26d | **8/16**: the 7 round-1 failures plus the B1 shape check |
| Engine probe on `tests/fixtures/screen01-work-permit-release.json` | See the results below the table |
| Scan of every JSON with `fact` + `transform` under `prototype/` (314 files: `p1`–`p5`, `p2/runs`, `p2/config`, `p3/releases/c1-v1..v3`, `studio/samples`, `studio/tests/fixtures`), comparing the old flag (`/phone_part/`) with the new one (`writesParts && /\bphone(?:_part)?:/`) per fact per file | See the results below the table |
| `check_c611_team.ts`, `check_vv_prepare_api.ts`, C6.11 25/25 | **Not re-run.** They need a server on 4431/4432 (out of bounds for this review). The changed call sites in `check_c611_team.ts:57`, `:60`, `:68`, `:70`, `:76` pass `true`, the old default, so their pure part behaves as before. |

Engine probe results on the work-permit release fixture:
* `shapeOf(...).phone` is `true` for `person.telephone_number`, `person.fax_number` and `person.phone_number`.
* The firm-record value is `{"number":"4165550100","country_code":"1"}`. `checkValue` on it gives `[]`. With an extension it also gives `[]`. A text answer gives `"Enter the country code and the number."`

Scan results:
* No fact goes from phone to not-phone.
* Only `person.telephone_number` (c1-v1..v3, the fixture, `p2/config` drafts, `c1-fieldmap-imm5476-live-…052508977z.json`) and `person.fax_number` (one single-form IMM 5476 run file only) go from not-phone to phone.
* `phone:` transforms exist only on those two facts, in IMM 5476 maps.

### Round-1 findings

| Round 1 | Status | Evidence |
|---|---|---|
| **B1** | **Fixed** | `case.ts:85` `phone: ts.some((t) => writesParts(t) && /\bphone(?:_part)?:/.test(t))` is the filler's rule (`field-format.ts:166`, `p5/transforms.ts:147-156`). For an `address_part` step after `select primary phone;`, `writesParts` is true but the raw text has `phone;`, not `phone:`, so the regex does not match. That is correct. Test `check_qa289_rep_phone.ts:57-65` runs `runTransform` on the fixture's real IMM 5476 boxes and gets `["1","4165550100"]`. |
| **M1** (mixed maps; ONLINE not ignored) | **Agree: not in this row**, with a follow-up row | Probe: a fixture plus an `as_is` box on the same fact gives `phone=true`, and `as_is` writes `"[object Object]"` (`p5/transforms.ts:127-128`). The only `as_is` map of `person.telephone_number` found is `p2/runs/studio-fieldmap-check-imm-5476-11-2025-…-387aa7.json`, the held 11-2025 edition's check run. It is in no release or fixture the suites load. The fault is in the filler (`p5`), not stream A's one file, and client-typed phones hit it the same way. ONLINE maps in `shapeOf` (`case.ts:72`) do not change the phone flag in any loaded release. **Ask:** the tech lead logs a row for "`as_is` on a phone object writes `phoneText`" before the IMM 5476 11-2025 edition is released on a combination that also writes the phone in parts. |
| **m1** | **Fixed** | `team.ts:93` and `team.ts:150`: `phoneParts: boolean` is required. All callers pass it: `runtime.ts:281`, `check_c611_team.ts:57-76`, `check_qa289_rep_phone.ts:39-62`. The typecheck enforces it. |
| **m2** | **Gone** | On every loaded release the telephone is now parts, as at a698a26d. So a copy frozen before the change compares equal. Only a release whose maps all read the phone whole would get text, and none exists. |
| **m3** | **Fixed** | `check_qa289_rep_phone.ts:57-65`: the setup line asserts the two real `phone:` boxes. The pass line writes digits. The fail line shows text writes nothing. It fails on 8c43e177 for the B1 reason itself. |
| **m4** | **Accepted.** The commit message and the new comment (`case.ts:83-84`, `check_qa289_rep_phone.ts:55-56`) now give the real reason. | — |
| **n2** | **Fixed** | `team.ts:10`: `extension?: string` |
| **n3** | Accepted as is | — |

### The builder's scope claim

**Confirmed, with one addition.**
* `person.telephone_number` is read only by IMM 5476's two `phone:` boxes in c1-v1..v3 and the fixture.
* The fixture places it only in the `representative` section ("Read only for the representative on IMM 5476."), so no client question changes kind.
* `person.phone_number` already used `phone_part` and is unchanged.
* **Addition:** `person.fax_number` also has IMM 5476 `phone:` boxes. In every release it is already a phone through IMM 1295 (c1-v3) or IMM 5257 (the Visitor visa's `studio-fieldmap-imm5257e-live-20261021t060247723z.json`, `phone_part:*`), so its kind does not change. Only a release with IMM 5476 and no other fax map would turn it into a phone, which is the right shape for that fill.
* There is no `api/src/features/checkpoint/` folder at 32a685f8. The configured checkpoint is built from the same sources by the demo loader (`api/src/demo.ts:68`, `:192` c1-v3; the setup scripts replaying `p2/runs`), and the scan covered all of them.

### The view after the change

* **Kind and value:**
  * `questionnaire.tsx:50`: the question is now kind `phone`.
  * `:94`: `shown` prints `"+1 4165550100"`.
  * `case.ts:205-212` (`checkValue`): the firm record's parts pass (`[]`), so the officer's line shows no problem. Before, with kind text and the object, the default branch gave "Enter text.".
* **Read-only:** this follows the channel, not the kind.
  * `questionnaire.tsx:623`: the "From the firm record" pill.
  * `:723`: "Change it in the firm record" in place of the Edit button.
  * `:686`: firm-record answers are left out of "Confirm section".
  * So a phone-kind firm-record answer stays read-only.
* **Data entry:** a client or officer typing that fact on such a release now gets the phone's two boxes, the same as every other phone.

### Nits (round 2, not blocking)

* **r2-n1.** `questionnaire.tsx:94` shows the phone as country code and number only, without the extension. The Sample firm has none, so this does not arise today. It is outside the row's file.
* **r2-n2.** `phoneText` (`team.ts:81-88`) is now reached only on a release whose maps all read the phone whole, and no loaded release does that. It is kept as the safe fallback, which is fine. The pure tests cover it (`check_qa289_rep_phone.ts:32-50`).

**Verdict (round 2): Approve.**
