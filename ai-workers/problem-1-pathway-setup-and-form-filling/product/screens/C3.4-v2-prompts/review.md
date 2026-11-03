# Review: C3.4 v2 prompts, 16,000 form output limit, new job files (forms lane), commit 0df15a0f1

Reviewer: fresh agent, did not build it. Diff `origin/main..0df15a0f1` (P-296 (3)). US$0: no model call, live switch never set by hand; copies :4454 (xr_studio_forms_c34ai) and :4452 (xr_studio_forms_c34live, live switch paired with the fake launcher). No screen in this row (an API and AI step), so the screen-review checks that apply are AI rules, money, contract, decisions and tests. #669's four run files read from `origin/claude/paid-runner-pr1-c34` (git show, scratch copy only). Git tree left as found.

## What held (evidence)
- Suites (mine): check_forms_c34_ai 58/58 twice; check_forms_c34_ai_live 8/8; `graph.mjs --check` exit 0 (G1 0, G2 0); `tsc --noEmit` shows no error in the touched files.
- Wiring: `form-masters.ts:95,108` uses the four v2 prompts; form limit 16,000, guide 6,000; no `replays`, so a v1 run is never replayed. The v1 hashes the S check writes (`b0ded038…`, `bd2ac18f…`) are exactly the `template_sha256` of #669's run files, and `isSameSavedRun` (`engine/rounds.ts:38-40`) refuses on that field: the test is real and fails if v1 were made replayable. #669's files sit in a subfolder `replayPattern` never lists.
- Job files: byte-equal to what the app writes (test J). Worst = runner reservation (`p2/runner.ts` 2 attempts, request bytes + 2,000 as tokens): form draft US$2.53, checker 2.50, guide 0.75 and 0.72; each round under the US$5 run cap; four rounds US$6.49 (PR says 6.55). App plan for the form: US$7.27, above the runner's 5.03 (live test). Inside P-295's US$50 (13.52 at 08:40 plus C11.8's worst 3.36 plus 6.49 = 23.37).
- Usual: form input rate 0.4446 token per byte equals #669 (102,460/230,830 and 101,800/228,674); the ledger's rates I solved from #669's two form rounds (US$4 / US$20 per million) reproduce the US$0.66 draft usual.
- Contract: every v2 node shape matches `contracts/predicate.v0.schema.json` (eq/neq value string, number or boolean; in list; ordered string or number; and/or `args` min 1; not `arg`; subjectKind added by `treeOf`). Output schemas unchanged.
- Screening: `screenMakerText` over the four v2 templates against the 49 box paths and 29 family values: all pass (my run; the suite's stub passes agree).
- Leak through the rules: a round that copies the form's worked entry verbatim is dropped twice ("not a visible box", my pure run of `formMastersFromRounds` on IMM 5257's inventory); the guide entry's quote is a placeholder, dropped by M1.
- P checks can fail: the synthetic broken prompt is caught twice, and the three v1 prompts show 0 worked trees.
- 16,000 is enough on the evidence: #669's draft stopped at 8,000 tokens (adaptive thinking counts, `runner.ts:143-144`) after 15 checks at question 4b of page 3, with 14,723 characters written; what was left (4b to 6, the document types, unresolved) is about 1,500 to 3,000 tokens: full answer about 9,500 to 11,500, under 16,000 with room. A cut answer is `invalid_output`, never retried (correct), loss about US$0.73.

## Blockers
None.

## Major (2)

**M1. The choice-value rule names a key the yes/no boxes do not have, and the worked example breaks the rule.** `masters-form.v2.md:34`, `masters-form-check.v2.md:14`: "the first text of its pair in `options_resolved` … for `[["* Yes","Y"],…]` write `"* Yes"`". In IMM 5257 all 21 Yes/No boxes (`exclGroup`) have `options_resolved: null`, so `compactInventory` drops it (`p2/prompt.ts:21`); their pairs sit under `options` (the built request shows `"options":[["No","N"],["Yes","Y"]]` on `VisaChoice2`, no `options_resolved`). Ten of them print `* Yes` or `*Yes`, eleven `Yes`. Then both prompts' worked tree writes `"value": "Yes"` (`masters-form.v2.md:45,48-50`, `masters-form-check.v2.md:16`) right after saying `"* Yes"`. #669's draft wrote `"* Yes"` (PCRIndicator) and `"Yes"` (BackgroundInfo); its checker wrote `"Y"`, the divergence P-296 (3) names. My run of the rules on PCRIndicator: both rounds `"* Yes"` gives ready/agreed; `"* Yes"` with `"Yes"` (following the example) or `"Y"` gives check/differ. If the paid rerun reads these prompts, every later fix means v3 prompts and another paid run. Fix (US$0): say "in `options_resolved`, or in `options` when the box has no `options_resolved`", and make the worked tree and its examples use one value the rule gives, e.g. `"* Yes"` with a shown choice pair `[["* No","N"],["* Yes","Y"]]`, or a box shown with plain `"Yes"`.

**M2. The guide's "made-up" worked entry is a real check of the one guide it runs on, and the prompt says it is not.** `masters-guide.v2.md:43` "made up to show the shape, not a check of this guide"; `:45-56` is "purpose of visit is Other → details" over `purpose_of_visit` and `purpose_details`, and `:58-61` "married or common-law → spouse family name and date of marriage". Guide 5256 states the first ("Note: If you selected "other" in question 1a), provide details in 1b)"): both #669 rounds proposed it with these field names; #669's draft also proposed the marital one. The checker prompt has the same entry inline (`masters-guide-check.v2.md:14`). M4 calls an item Ready only when two blind readings agree (`masters-ai.ts:117-128`); here both readings are given the answer, so their agreement is not evidence of an independent reading, and a person sees "Ready" for it. The form prompt's entry ("refused visa → details", marital status) follows the same pattern for IMM 5257, but with made-up paths that the rules drop, so less harm. Fix (US$0): an example whose meaning is not in guide 5256 or the Visitor visa forms, with made-up fields (the shape is what teaches), and no claim the builder cannot check; or keep it, remove the false sentence and say in the PR that this item's agreement is primed.

## Minor
1. `masters-guide.v2.md:13,15` give "a passport valid for the stay" and `cross_record` "answers checked against each other (the same name everywhere)" as checks to produce; `:39,62` send each comparison of two answers to `unresolved`. #669's rounds wrote exactly those comparisons as `cross_record` (expiry after issue, name matches passport). Say in `:15` that a cross-record check here is one that reads two or more answers without comparing them, and drop the passport example at `:13`.
2. Usual is low for the checker: `track-a-jobs.ts:92-93` gives the form checker half the limit (8,000) while v2 asks it for the same full set as the draft (12,000); #669's 2,721 came from a broken answer. Usual for C3.4 is about US$1.57, not 1.49. P-295's record still says C3.4 worst US$5.78; the runner worst is now US$6.49 (the app's plan shows 7.27 for the form alone): the paid runner restates it before the run (P-295).
3. P-153 (code is the guard): no rule checks that a tree's choice value is one of the box's own choices (`masters-ai.ts:161-169`), so a `"Y"` or `"Yes"` on a `"* Yes"` box is Ready if both rounds agree. Answers elsewhere are list keys or booleans (`qd-conditions.ts:36-42` maps the AI's word to the stored key; the filler writes the PDF code), and `"* Yes"` is neither. No user can reach it today (form and cross checks have no lander), but the lander row must normalise, or this rule must refuse.
4. Shared `p2/` (open since the first C3.4 review, Minor 6): during my live run another session's suite rewrote the four C3.4 stub-pass files and `canary-digest.json`; they were restored within 30 s. My results were not affected. The committed C3.4 stub passes do not match the v2 path code (30 of the 31 committed stub passes do not match theirs either); the launcher refuses Live until `--stub` runs, at US$0. Safe.

## Decisions check
P-296 (3): v2 prompts with a worked tree, 16,000 limit, new job files, US$0: yes, with M1 and M2 in the prompt text. P-295: worst stated per round, each under the cap, inside US$50: yes (Minor 2 for the record). P-175 live off: yes (L, V checks). P-227 Live or Saved, v1 never replayed: yes. P-153: Minor 3. P-134 and M1 quote rules unchanged.

## D1–D20 (0–5; API and AI step, no screen)
D1 4 matches P-296 (3), less M1 · D2 4 replay pairs by template hash · D3 n/a · D4 4 trees validated by `treeOf` · D5 5 v1 refused, cost kept on failure (live M1 checks) · D6 4 Sample, job hashes · D7 3 origin and both readings shown; agreement primed (M2) · D8–D14 n/a (no screen) · D15 5 suite 40 s, plan at once · D16 4 P, S, W, J fail when the rule is removed; nothing tests the choice rule · D17, D20 simulated only · D18 4 quote found in source, file and SHA · D19 3 needs the paid rerun, then the lander row.

## Not checked
No model call, so how a real model reads v2 is inferred from #669 and the rules, not seen. The Mac ledger (Wave 1 US$60 since 26 Oct, experiment US$120) is not on this copy: the launcher checks it at start. `check_forms_pa_track_a_jobs` I did not run (its copy :4453 was in use by another session); job equality is proven by test J. Journey: `journey-test-reviewer-2026-11-03.md`, **7.5 / 10**.

**Verdict: Block** (commit 0df15a0f1). To fix, US$0, before the paid rerun: M1 (name `options` too; worked value matches the rule), M2 (a guide example not drawn from guide 5256, or the false claim removed and said). Minors 1 and 2 belong in the same pass.

---

## Round 2 (P-293): diff-only, `0df15a0f1..db3d89833`

Same reviewer. Copies :4454 and :4452 (fake launcher), US$0, no model call. My runs: check_forms_c34_ai 70/70, check_forms_c34_ai_live 8/8. I also ran the new guard (`printedChoices`, `choiceOf`, `withPrintedChoices`) myself on boxes from every committed form inventory. Tree left as found.

| Finding | Status | Evidence |
|---|---|---|
| M1 choice rule names `options_resolved` only; the example breaks it | Fixed in the prompts | `masters-form.v2.md:34`, `masters-form-check.v2.md:14` name `options` as well and show both spellings; the worked value is `"* Yes"` over a stated listing; a P check holds the value to the listing |
| M2 guide example is a real check of guide 5256 | Fixed | The vehicle and firearms examples are not in guide 5256, IMM 5257, IMM 5645 or IMM 5707 (grep: 0 hits). The false claim is gone with the old example |
| m1 guide contradiction on comparisons | Mostly fixed | `:14` and the checker's `:8` now say a cross-record tree compares no two values. `:13` still gives "a passport valid for the stay" as an official rule (residual Minor) |
| m2 checker's usual | Fixed | `track-a-jobs.ts:92` prices both form rounds at 12,000; W check bounds each at US$0.55–0.80 |
| Breaker M1, guard in code (P-153) | Holds for pair-shaped choices; see R2-M1 | On IMM 5257's Yes/No boxes: `"* Yes"`, `"*Yes"`, `"yes"`, `"Y"` all give `"* Yes"`; `"N"` and `"No"` give `"* No"`; `"Maybe"` and `true` are dropped with the reason; the agreement key is computed after the mapping, so the draft's words and the checker's code agree (test E). Loose match: across every inventory's pair-shaped choices, no two choices of one box are equal once "*", spacing and case are ignored (one `"---------------"` separator row repeats on IMM 0008), and no box's code equals another choice's words, so the loose step and the code step cannot merge two choices there |

### R2-M1 (Major, new in this diff): `printedChoices` reads two other `options` shapes as pairs, so the guard maps a value to the wrong choice
`form-masters.ts:60-68` takes each row of `options` as `[words, code]`. The committed inventories have two other shapes when `options_resolved` is empty:
- **Columns** `[[words…], [codes…]]` on `choiceList` boxes (32 across the committed inventories, e.g. IMM 5645 marital status, IMM 5707 marital status and relationship, IMM 5562 purpose of travel). IMM 5645's `Mother[0].ChildMStatus[0]` becomes `[["Annulled marriage","Common-law"],["1","2"]]`. My run of `choiceOf`: `"Common-law"` (its real printed word) gives `"Annulled marriage"`, and `"Married"` gives null, so the legitimate check is dropped.
- **Check boxes** `[["1","0","2"]]` (on, off, neutral; 104 boxes, 6 of them visible on IMM 5257: the phone type boxes `CanadaUS`, `Other`). They become `[["1","0"]]`, so `"0"` (not ticked) gives `"1"` (ticked): `withPrintedChoices({op:"neq", value:"0"})` returns `value:"1"`.

The examples' facts are mapped by the same `choiceOf` (`masters-ai.ts:199`), so an inverted or merged tree still has its examples hold, and it comes out Ready with the wrong meaning. Two rounds that both wrote `"0"` agree on the inverted tree. The prompts' rule ("first text of its pair in … `options`") leads a reader the same way on a check box. This can happen in the paid IMM 5257 rerun (its six check boxes) and on any other edition the step drafts. That is the wrong-merge the guard was meant to rule out.

Fix (US$0): read `options` as pairs only when every row is exactly two strings. Zip a two-row equal-length column shape into pairs. Give a check box its own states (`[["1","0","2"]]` → ticked `"1"`, not ticked `"0"`, both kept as is) or leave check boxes unguarded. Add E checks on IMM 5645 `ChildMStatus` (`"Common-law"` stays `"Common-law"`, `"Married"` kept) and on an IMM 5257 check box (`"0"` never becomes `"1"`).

### Not changed, noted
Breaker M3/m4 (Saved pairs a draft and a checker by file-time order) and m5 (P-295's record still says US$5.78) were there before this PR; the PR names them for the tech lead and the runbook says draft before checker. Not a finding against this diff. Minor 4 of round 1 (shared `p2/`) stays open.

**Verdict, Round 2: Block** (commit db3d89833) on R2-M1. M1, M2, m2 and breaker M2 are fixed. m1 has the one residual line `masters-guide.v2.md:13`, which is not blocking.
