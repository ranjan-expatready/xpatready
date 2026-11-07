# QA-296 review — IMM 5475's designated individual is never the representative of record (B127)

* **Commit reviewed:** `cb03014201720d0467af165e6696cfafd5d771a3` on `claude/stoic-archimedes-44w8sl` (PR #1224), base `origin/main` `ecbd68301`. Diff only (`git diff origin/main...cb0301420`): `engine/runtime/team.ts` (+20), `forms.ts` (+3/−1), `case.ts` (+4/−1), new `tests/runtime/check_qa296_imm5475.ts`, two screenshots.
* **Reviewer:** independent reviewer agent (Opus, P-303). I did not build this fix. Runtime engine fix, not a new screen: no concept; judged against QA-296 (`qa/BUGS.md:43`), walk step 10 (`qa/reports/2026-11-07-c611/walk.md:40`), the ruling on #1072 and P-319.
* **How I checked:** read the diff and every caller of `knownOf`, `render`, `formCoverage` and the firm record; ran checks and probes against the isolated copy on :4431 (`xr_studio_rt127`, configured checkpoint, the fix's code); read the release snapshots' field maps in that database; a browser walk (journey report beside this file). Never :4400. Live AI off, US$0.

## Results I reproduced

| Check | Result |
|---|---|
| `check_qa296_imm5475.ts 4431 xr_studio_rt127` | **13/13** (filled IMM 5475 read back with the E5 reader: no "Representative"/"Sample"; IMM 5476 holds both names and R000000) |
| `check_c611_checkpoint.ts 4431 xr_studio_rt127` | **14/14** (`case.uses_representative` still the firm record's Yes; IMM 5476 item still tagged; IMM 5475 item not) |
| `product/tools/typecheck.mjs` | PASS: no new type errors (api 15 known, web 0) |
| Fail on main | By reading, not run: on main `namesRepresentative` is absent (3 pure lines fail), the PDF and box lines fail (names written from the firm record) and the tab line fails (fills listed IMM 5475): 7/13, as the builder says. |
| Probe, fresh Visitor visa case with user-R | Representative's Family/Given name: `fills` = IMM 5476 only; `person.address_*`/`phone_*`/`email` about the representative still list IMM 5475 and IMM 5476 (unchanged). IMM 5475 copy: `Five[0].AppFamily/AppGiven` "not written". IMM 5475 `fields_open`: none for those boxes. |
| Field maps (both releases on the copy) | Only IMM 5476 maps `representative.*` about `representative` (licensing_body, membership_id, organization_name, …); IMM 5475 maps only `person.*` and `organisation.name` about `representative`. So the set is {IMM 5476}. |
| Pre-fix IMM 5475 copies with the names written | 0 in `xr_studio_demo` and `xr_studio_rt127`. |

## Judgement on the four questions

**(1) Correctness, every consumer.** All PDF, hash and sheet paths go through `formCoverage` (`engine/runtime/forms.ts:24-29`), which now drops firm-record facts about `representative` for a form that does not name the representative: `fill-case.ts:163,227,309,330,376,447` (copies, drafts, fill trials' inputs, validate read-back), `case-prepare.ts:209,233,374,396,553` (validated current, `nowFacts`, out-of-date hash, Online answer sheet via `sheetOf`), `sign-steps.ts:113`, `submission.ts:108`, `answer-keys.ts:322`. The tab's `fills` and form readiness (`forms.ts:160-183`, which reads `fills`) go through `caseView` (`case.ts:279-281`). The remaining direct `render` callers do not write boxes: `case-prepare.ts:96-97` (which forms apply; no condition reads a representative fact on the checkpoint), `preview.ts`, `questionnaires.ts:65` and `studio.ts:514` (author views, no firm record), `assessments.ts`, `case-checklist.ts`. Nothing that should keep the firm record loses it: IMM 5476 keeps every key (it is in the set); `case.uses_representative` is keyed `case|…` or by the case subject, never `representative|`, so `firmRecordFact` (`team.ts:127`) leaves it alone (C6.11 14/14 confirms). The applicant's own names are keyed by their subject id and untouched.

**(2) P-319.** Met. `namesRepresentative` (`team.ts:117-119`) reads map entries (`outcome === "mapped"`, `person === "representative"`, fact `representative.*`); `formsNamingRepresentative` derives the set from `s.field_maps`. No form number appears in the rule; IMM numbers appear only in comments and in the test's assertions.

**(3) The tab's words and readiness.** Truthful: the screen now says "fills IMM 5476 for Client A" for the names (screenshot in the journey report), which matches the PDF. IMM 5475 readiness no longer counts the names (they fill nothing there); it stays not ready on the 9 address/phone/e-mail lines about the representative that only the firm record could fill and that it never fills (the ruling on #1072), so the change cannot make IMM 5475 falsely Ready. See m1.

**(4) The test.** Meaningful. It reads the real filled PDF's XFA data (not only the stored box list), guards against an empty read (`check_qa296_imm5475.ts:54`), and each rule has both cases: the pure rule (`:39-41`), the copy rule (IMM 5475 fail `:56-57` / IMM 5476 pass `:62-63`) and the tab rule (`:69-70`), plus the #1072 ruling unchanged (`:73`). Removing the `forms.ts` filter fails `:56-57`; removing the `case.ts` filter fails `:70`. See m3.

## Findings

### Blocker
None.

### Major
None.

### Minor
* **m1. IMM 5475 Section 5's names are now silently blank: nothing asks for them and readiness does not list them** (`case.ts:281` removes them from `fills`, so `forms.ts:161` never reads them). That is the right direction (blank beats a wrong person, P-71) and IMM 5475 stays blocked by the address lines anyway, but the reason is visible nowhere. It is the same gap the ruling on #1072 left open for the address: the real fix is the reviewed map change that gives IMM 5475's designated individual its own person. Fix: note it in the PR body / QA-296 row as the residual of that ruling (no code in this row).
* **m2. The API `why` of the representative's name questions still says "read by IMM 5475, IMM 5476 (2 form fields)"** while `fills` says IMM 5476 only (probe; built at `engine/render.ts:257` from the unfiltered render in `case.ts:276`). No screen shows a question's `why` today (`web/src/runtime/questionnaire.tsx` shows only the answer's `why`), so the words a person reads are true. Fix (optional): build `why` from the same filtered `fills`, or leave a comment.
* **m3. Test gaps (small).** (a) No line shows the applicant's own confirmed names still reach IMM 5475's `AppDetails` boxes while `Five` stays empty, the over-filter direction; the key prefix makes it safe today, but a test would hold it. (b) The pure rule's "not mapped" case uses `unresolved`; the other non-mapped outcomes in the snapshots are `by_hand`, `never_filled`, `not_a_fact` (same branch, fine).
* **m4. Out-of-date words for a copy made before the fix.** A signed IMM 5475 copy printed with the representative's names would now be Out of date (correct) with the reason "the representative of record changed on …" (`case-prepare.ts:280-289`, any change `about === representative`), which would not be true. I found no such copy in the demo or the copy's database, so this is words only, for data that does not exist; mention it if a pre-fix copy ever turns up.

### Nit
* `team.ts:116` says the rule is "the same test as the Prepare item's tag (api/src/case-prepare.ts, break M3)". The tag (`case-prepare.ts:321`) reads the form's confirmed facts, this rule the form's map; they agree on the checkpoint but are not the same test. Say "the same idea" or make the tag call `formsNamingRepresentative`.
* `formsNamingRepresentative` is recomputed per `formCoverage` call; cheap next to `knownOf` + `render`, no action.

## What I could not check
A real screen reader; an intended user's unaided walk (D17, D20 stay with the founder); main's code running (fail-on-main by reading only); a pre-fix signed IMM 5475 copy (none exists).

## D1–D20 (engine fix; screen dimensions read on the tab it changes)
D1 1: fault fixed as QA-296 states · D2 1: no wrong person's data reaches IMM 5475 (PDF read back) · D3 1: one rule in `team.ts`, used by both paths · D4 ½: m1 · D5 1: pure read-path change, no state · D6 n/a · D7 n/a · D8 1 · D9 ½: m1 · D10 1 · D11 1 · D12 1 · D13 1: axe clean, no sideways scroll at 1024/400 · D14 1 · D15 1: tab 240 ms · D16 1: pass and fail per rule, rerun by me · D17 simulated only · D18 1: "From the firm record … fills IMM 5476" now true · D19 ½: IMM 5475 Section 5 still unfillable (#1072 residual) · D20 simulated only.

Journey score (reviewer): **8.5/10, pass** (`journey-test-reviewer-2026-11-07.md`).

Verdict: Approve cb03014201720d0467af165e6696cfafd5d771a3
