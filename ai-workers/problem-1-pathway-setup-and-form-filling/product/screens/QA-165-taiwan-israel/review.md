# Review: QA-165's last two (IMM 5257 Taiwan PIN and National Israeli passport), local commit 07efe1897

**Who and when.** The independent Opus reviewer (P-303), 8 Nov 2026. This is a forms-lane item: it has no concept, and it was checked against the tech lead's ask on #1363, AGENTS rule 4 / P-170, `STANDARDS.md` and `EXPERIENCE.md`.

**What I ran.** All on :4452 (`xr_studio_tw`) at this commit, with live AI off (US$0):
- `check_qa165_taiwan_israel_api` 9/9
- `check_qa165_gate_follow_ups` 36/36
- `check_forms_b116_own_unmapped` 18/18
- `check_qa165_readiness_paths_api` 8/8

**Journey score: 8/10.** Report: `journey-test-reviewer-2026-11-08.md`.

## Checks asked
1. **AGENTS rule 4 / P-170: met.** Every value is the form's own:
   - The two questions are verbatim from `expected/source-text/imm5257e.xfa-template.txt` (page 2, Passport Q5 and Q6).
   - The 203/206 branches are the CountryofIssue script marked "CR 330212".
   - "TWN (Taiwan)" = 203 and "ISR (Israel)" = 206 come from the inventory's `options_resolved` and the form's LOV (`lic="203"`, `lic="206"`).
   - The basis line and the data are labelled Sample, Unconfirmed: expert.
2. **OwnQuestions writing `condition`: honest.**
   - The words are produced from the script rule and the form's country list, never typed.
   - The B86 door still needs a proposal and a second person's approval. It also checks that the words name the deciding field: `plainWords` maps `CountryofIssue[0]` to `person.passport_country_of_issue`, otherwise it raises the "names another question" warning.
   - Undo's restore is right, both ways. It restores the earlier `condition` (the T4 draft goes back to `unresolved` with no words), and `"condition" in before` keeps older history entries working.
   - Undo leaves the approved B86 `condition_rule` on the now-unmapped row (Minor 2).
3. **Hidden questions: right for a code typed in capitals.**
   - After TWN then ISR, the Taiwan answer is kept: the API still has `value: true` (confirmed) with `hidden: true`.
   - It is not written, and readiness does not wait on it.
   - But see Major 1: a country typed in lower case breaks this.
4. **The six and other combinations.**
   - `pack2.ts:125` skips `checkpointOnly`, so the six's question list does not move.
   - The IMM 0008, 1294 and 5710 rows are unchanged on :4452: by hand, or IMM 1294's existing AI map.
   - But `askedFacts` is not scoped to the edition. IMM 1294 and 1295 share the exact form-field paths, so IMM 1294's Israel field (mapped to `person.passport_country_of_issue`) adds that fact to `confirmReaders`. It has no effect today because that fact has no SHOW condition (Minor 1).
5. **Test honesty: good.**
   - Each rule has a pass and a fail.
   - On a scratch copy, removing each of the fact check, the label check and the rule lookup in `askedWhenGround`, and nulling `scriptWords`, each turned R7 red.
   - The B116 test's move to SCH1 Q5 keeps every assertion: the refusals, the M1 later-change refusal, and the double undo.
   - The R4/R5 rewrite is a true change of behaviour, not a weakening.
   - One gap: T3's name says the hidden answer "is kept", but nothing asserts it (Minor 3).
6. **Words a person reads.** No "box" on any screen, and the refusal lines are acceptable (demo chrome). `conditionPlain` fails (Major 2).

## Issues, ranked
**Major 1 (Must): a lower-case country code gives a false Ready over a field the form's own script requires.**
- **Evidence.** The client's country question is a free-text box (`web/src/runtime/questionnaire.tsx:66`), and the server accepts any text up to 120 characters (`engine/runtime/case.ts:191-195`). For "isr" on :4452:
  - the map's `code_list` step (`p5/transforms.ts:174`, case-insensitive) writes `CountryofIssue = 206`
  - the question condition `eq "ISR"` (`own-yes-no.ts:91` `equalsGate`) is false, so the Israel question is hidden
  - the generated copy has no `IsraelPassportIndicator`
  - `GET …/forms` says IMM 5257 `ready: true` with nothing open, because `engine/runtime/mandatory.ts:63` (B86 "not needed") skips the field the script rule at line 61 has just required
- **Before this commit,** the same answer listed the Israel field as left empty. This undoes QA-165's own bar: no "Ready" over an empty mandatory field.
- **Fix.** Make the question condition and the written code agree. Either:
  - store or compare the country as the canonical upper-case code before the condition is evaluated, or
  - let the script rule win over "not needed" in `mandatoryOpen` when the written code matches.

  Add a T-case with "isr" or "twn" that fails today.

**Major 2 (Must): `conditionPlain` puts an internal form path and a fact key on the author's main path.**
- **Evidence.** Visitor visa › Smart questionnaire (SQR) › "Only if" reads: "Asked only when the passport's country or territory of issue is Israel (IMM 5257's own script: its own script requires it only when form1[0].Page2[0].MaritalStatus[0].SectionA[0].Passport[0].CountryofIssue[0].CountryofIssue[0] holds 206, the form's choice "ISR (Israel)", which the map fills from person.passport_country_of_issue)".
- This breaks `EXPERIENCE.md` line 46 [M] (no IDs or paths on the main path), and "own script: its own script" is doubled. Source: `230-own-yes-no-follow-ups.ts:112`, which builds it from `askedWhenGround`'s machine sentence.
- **Fix.** Use plain words, e.g. "Asked only when the passport was issued by Israel (IMM 5257's own script requires this question only then)". Keep the detailed ground in the reason or history. The QA-165 follow-ups already do this ("Asked only when "…" is Yes").

**Minor 1 (Should): scope `askedFacts`** (`230-own-yes-no-follow-ups.ts:39`) to the application's own PDF edition. Today it reads every edition with the same path (IMM 1294 and 1295).

**Minor 2 (Should): Undo leaves the B86 `condition_rule` on an unmapped row.** The T4 draft is `unresolved||{"op":"eq",…"TWN"}`. It has no effect while the row is unmapped, but if the row is mapped again it starts as "confirmed" with no words. Either say so in the Undo result, or document that a person undoes the B86 rule on To review › Form fields.

**Minor 3 (Should): T3 should assert the kept answer** (`check_qa165_taiwan_israel_api.ts:83`): `tw.answer.value === true` while hidden.

## Not a finding
- The client reads the field's meaning, not the printed question. This is the same as the earlier B116 questions.
- The author's "National israeli passport" casing is the screen's existing display. The stored label is "National Israeli passport".

## Could not check
- The graph run (P-86): it rewrites `qa/GRAPH.md`, which is outside the two files I may write.
- axe and a keyboard-only walk; a real screen reader.
- An intended user's walk (D17 and D20 stay with the founder).
- The BIC scorecard and D1–D20: this is a forms-lane data and engine item, with no new screen.

**Verdict: Block**

To fix:
1. Major 1
2. Major 2

## Round 2: 044683757 (diff from 07efe1897 only), 8 Nov 2026
**Runs.** All on :4452 at 044683757, live AI off, US$0:
- reset, then `check_qa165_taiwan_israel_api` 11/11, including T5's fail and pass
- `check_qa165_gate_follow_ups` 38/38, on a scratch copy of this code

**Major 1: fixed.** `engine/runtime/mandatory.ts:66` now skips a "not needed" field only when no script rule applies. Line 61 has already dropped the rule when the written code does not match, so the new line fires only when the question's condition and the written code disagree.
- On :4452, "isr" leaves IMM 5257 not ready and names the Israel form field ("…check that answer"). Back on "TWN", the kept Yes shows and the form is ready.
- **Mutations** on a scratch copy:
  - Removing `&& !when` turns R7's "review M1" fail red (37/38).
  - Ignoring the code check at line 61 turns R4 and both new R7 lines red (33/38).

**Major 2: fixed.** The stored text now reads "Asked only when the passport's country or territory of issue is Israel, as IMM 5257 asks it only then" (the Taiwan text matches). There is no path or fact key. The ground stays in `askedWhenGround` and its test.

**Minors.**
- m1: fixed. `askedFacts` is limited to the application's own editions.
- m3: fixed. T5 asserts the kept Taiwan answer.
- m2: accepted as reasoned. Undo does not roll back another person's B86 decision (B116 review M1).
- New, Minor (Should, not blocking): the officer's line says "its code 206". Naming the form's choice ("ISR (Israel)") would read better.

**Verdict: Approve.** No open Blocker or Major.
