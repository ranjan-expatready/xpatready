# B143 · C7.10 Readiness figure per filing: fresh challenge

Challenger: a fresh context that did not draft the concept (skill screen-concept, part B). Read 9 Nov 2026 on branch `claude/inspiring-gauss-sq2xjw` (HEAD 133707b8d, which already holds the builder's `engine/runtime/readiness-figure.ts` and `tests/check_c710_figure.ts`; both read as evidence of how the concept is being read, not challenged as code). Team requirement: the name-free copy `domain/requirements-2026-11-02/…/AG-07-case-core-and-delivery_v3.12_2026-10-28.md`. `ai-workers/tools/freshness.sh` fails in this cloud copy (`code/README-copies.md` missing): the team's code was not read, so any claim about the team's screen is **Unverified**. Paths below: S = `prototype/studio/`.

## Verdict
**Build after these changes.** The core holds: a pure figure computed from C7.6's own lines, beside `readiness[]`, rounded down, so 100 comes only when C7.6 says Ready. Three Majors change what the figure says in real cases: a CRITICAL finding reads Attention, a submitted filing can hold the case at Not ready with nothing anyone can do, and findings closed in Review findings drop out of the count and the "passed with a reason" number. None needs a schema change or a change to C7.6's engine.

## Objections

### Major

**M1. An open CRITICAL finding reads "Attention", not "Not ready".** *Needed for the proof.*
* What breaks: BR-1 sets the state from C7.6's line severity. C7.6 raises every finding as a plain warning (`finding` is not in `CRITICAL_CODES`), whatever the finding's own severity.
* Example: the representative adds a CRITICAL finding by hand on IMM 5257 for Sample Client A. The line reads "CRITICAL finding on IMM 5257: …", but the pill beside it reads **Attention**. BR-30 rule 1 and the glossary ("Not ready means a critical deficiency is open") say **Not ready**.
* Evidence (fact, high confidence): S/engine/runtime/readiness.ts:227 (`warn({ code: "finding" … words: \`${g.severity} finding…\` })`, severity "warning"); S/api/src/findings.ts:132-133, 167 (CRITICAL findings exist, by hand and from rules); AG-07:3358+ BR-30 rule 1; glossary :266; concept §3 BR-1; the builder's state line in S/engine/runtime/readiness-figure.ts (`r.warns.some((w) => w.severity === "critical")`).
* Fix: BR-1 reads "Not ready while a block, an open CRITICAL warning **or an open CRITICAL finding** stands". `readinessFigure` already gets C7.6's input: match the open line `finding|<id>` to `x.findings[].severity`. This cannot move C7.6's finish line, because both Not ready and Attention mean "not ready". Add one pass and one fail test, and change the property "Not ready exactly when a block or open CRITICAL" so it includes the finding.

**M2. A submitted filing keeps a figure and can hold the case at its lowest for good.** *Needed for the proof.*
* What breaks: concept §4 says "Submitted filings show their figure too", and BR-5 takes the case's lowest over every filing. After a filing is recorded as submitted, its lines are hidden and cannot be passed. Its figure can still fall when a fact changes after filing: the review is withdrawn (a CRITICAL `representative_review` line) and the form goes out of date.
* Example: Filing A (Visitor visa, Sample Client A) is recorded on 5 Nov. On 8 Nov the client corrects an address that A's form reads. A now shows Not ready · 66, under the words "Recorded as submitted: its review and warnings are closed". Filing B is Ready · 100. The case header reads "Not ready · 66% (lowest: A)" and stays that way, because nothing on A can be passed or reviewed.
* Evidence (fact): S/web/src/runtime/readiness.tsx:135, 143 (a submitted filing shows "its review and warnings are closed" and no lines); S/api/src/readiness.ts:35 (passing on a submitted filing is refused, 409); S/api/src/case-prepare.ts:505-508 (C7.6 already exempts a recorded filing from the release warning, "a recorded filing stays on its release"); S/api/src/readiness-inputs.ts:136-140 (the review counts only on today's facts). BR-30 does not say whether a submitted filing counts. AG-7-27 §1-2 describe the figure as how close a filing is to submission (judgment).
* Fix: a submitted filing shows its status ("Submitted") in place of the figure, and `case_figure` is the lowest over filings not yet submitted. If every filing is submitted, `case_figure` is null and the header shows nothing new. Tests: one test with a submitted filing that has an open line, where the case figure ignores it; a check that `figures[]` marks it `submitted`. The founder is asked under Q1 because this reads BR-30's silence one way.

**M3. Findings closed in Review findings vanish from the figure, so the "passed with a reason" count is hidden.** *Needed for the proof.*
* What breaks: BR-3 promises "the figure says N passed with a reason beside it, so passing is never hidden" (the Google Ads lesson, §4b). But readiness reads only `state: "open"` findings. A finding that is acknowledged, waived or dismissed (each with a written reason) in the Review findings panel leaves both sides of the count and never adds to "passed".
* Example: a filing has 6 items, one of them an open CRITICAL finding, so 5 of 6 are done (83). The representative waives the finding in Review findings with the reason "Name order confirmed with the client". The figure becomes 5 of 5 = 100 with "0 passed with a reason". BR-30 gives 6 of 6 = 100 with "1 passed with a reason" (rule 5: "A WAIVED item counts as satisfied, and the panel also shows N passed with a reason").
* Evidence (fact): S/api/src/readiness-inputs.ts:88 (`reviewFinding.findMany({ … state: "open" })`); S/api/src/findings.ts:23, 137 (open → acknowledged · waived · dismissed, with `stateReason`); AG-07 BR-30 rule 5 and §12 ("A WAIVED item counts as satisfied but is still listed").
* Fix, either:
  * (a) **Recommended.** `readinessOfCase` also reads the filing's acknowledged, waived and dismissed findings (one more read in the same transaction) and hands them to `readinessFigure` as items that are done and passed, with who, when and why. They are not handed to `filingReadiness`, so C7.6's input, its result and C7.6-1 stay unchanged.
  * (b) Narrow the promise: the rule words and BR-3 say "passes made on this panel". Founder Q2.

### Minor

**m1. The concept's item mapping is a list with no catch-all; the build added one.** *Needed for the proof.* BR-2 and BR-3 name the homes for today's codes. Nothing in the concept says where a future code lands, such as P-172's Express Entry block, which "joins BLOCK_CODES" (S/engine/runtime/readiness.ts:13). A line with no item would leave the score at 100 beside a refused Ready to file. The builder's `targets()` already sends any line without a home to its own check item. Fix: write that rule into BR-3 ("a line with no form, document, facts or review home is its own check item"). Also make the property generator in `tests/check_c710_figure.ts` draw lines of every code in `BLOCK_CODES` and `WARN_CODES`, so that a new code cannot pass the property by accident.

**m2. The concept and the build disagree on where an open check counts, and on a filing with no forms.** *Needed for the proof.*
* BR-2 lists "an open check" as its own filing-level check item. BR-3 also puts the open check under the facts item, so one check would count twice in two different ways.
* The build counts it under facts only when the filing has forms, and as a check item otherwise. It also drops the facts item on a filing with no forms. Under the concept text, that item would count "done" for no facts at all.
* Fix: the concept follows the build. Facts item only when the filing has a form; an open check sits under facts; with no form, it is its own check item.

**m3. Departures from BR-30 are not written down.** *Needed for the proof.* Each departure below exists so that 100 ⇔ Ready holds against C7.6, which is the right reason, but the reader is told only about Q2 (MINOR and INFO findings):
* (a) a document is done when received or being checked (`RECEIVED`, S/api/src/readiness-inputs.ts:15); BR-30 says Accepted;
* (b) a missing required document reads Attention (C7.6 makes it a plain warning); BR-19 makes "required documents not Accepted" a CRITICAL warning;
* (c) a MINOR or INFO finding reads Attention; BR-30 says Ready;
* (d) a finding fixed by the rules leaves both sides; BR-30 keeps a RESOLVED one as satisfied, so values partway through differ (2 findings, 1 fixed: 4 of 5 = 80 under BR-30, 3 of 4 = 75 here);
* (e) the form is "no open line on it", not "approved, current edition, signed".

Fix: add a "Departures" line under §3 naming (a)-(e), each with "why: C7.6 refuses or allows Ready to file on this".

**m4. The header pill names one filing in its text and hides the second in a `title`.** *Needed for the proof.* When the lowest state and the lowest figure come from different filings, the visible text "Not ready · 57% (lowest: A)" credits A with both. The `title` on `Pill` is a native attribute on a span (S/web/src/components/ui/controls.tsx:137-138), so it does not open on keyboard focus or touch, which fails BIC-14. Fix: when the two filings differ, the visible text names both ("Not ready: A · lowest figure 57%: B"). Keep the pill out of the `<h1>` at S/web/src/runtime/cases.tsx:189, so the case's heading name does not grow.

**m5. "N passed with a reason" counts lines while "4 of 7 done" counts items.** *Needed for the proof.* One pass that covers missing facts for two owners on one form gives "2 passed" against 1 item. The builder's code returns `passed: r.passed.length`. Fix: count passed items, which is BR-30's unit ("a WAIVED item"), or write "2 lines passed with a reason".

**m6. The rule words promise things the app does not hold and use a name the reader does not know.** *Not built.*
* "fee line": S/api/src/readiness-inputs.ts:4 says fees are "Not here yet", and no fee is passed to `filingReadiness`.
* "counted by the case team's system": a representative does not know what "the case team's system" is.

Fix: say "each other check, finding or notice on the filing". Drop the retainer and deficiency-library sentence from the shown words, and keep it in the concept and the code comment.

**m7. A form that "cannot start yet" counts as a form item, which another screen says it is not.** *Needed for the proof.* S/api/src/case-prepare.ts:444-447 says such a form is "never a form to fill and never counted as one". The figure lists it as "IMM xxxx for Client A" among the forms, so the form counts on the two panels disagree (BIC-19: counts say what they count). It must stay counted, or a waiting form would hide its CRITICAL line (S/api/src/readiness-inputs.ts:106-110). Fix: label the item from its own line ("Whether IMM xxxx applies: waiting for an answer"), or add one clause to the rule words: "a form waiting on an answer counts".

**m8. Red for a normal state.** *Needed for the proof.* "Not ready" is drawn in the danger tone. By P-237 (4) every filing is Not ready until the representative's review, so every case in progress shows red. BIC-19 says "red only for errors". Fix: the Not ready pill uses the warning or neutral tone, with the words carrying the state. Keep danger for the existing error notice.

### Facts noted, no objection
* P-425, named in the brief and in the builder's engine comment, is not in `product/DECISIONS.md` on this branch or on origin/main fc49dc5a4 (newest row P-411). The rule actually on record is P-319. The concept itself does not cite P-425. The engine comment should cite P-319 only, or the row should be recorded.
* The facts item counted beside the form items is sound. BR-30 also leaves both the questionnaire item and each form item unsatisfied while facts are open. Weight example: 3 forms read one unconfirmed date of birth, so 4 of 7 items are open for one fact. Confirming it moves the figure from 28 to 57 (judgment: acceptable, and the disclosure shows why).
* By P-237 (4) the representative's review is a CRITICAL line, while BR-19 asks only for one confirmation. This conflict is older than B143 and was settled by the founder. The figure follows C7.6.

## What is sound
* Beside, never inside: `figures[]` and `case_figure` sit next to `readiness[]`. C7.6-1 (`!/%/` on a readiness entry, S/acceptance/C7.6.test.ts:52) and the C7.6 property (S/tests/check_c76_readiness.ts:281) test `filingReadiness`'s output only. So C7.6's finish line does not move (P-406 (2)).
* 100 ⇔ Ready holds by construction once every open line has a home (m1). The figure is rounded down, so done < countable gives at most 99. The review item always exists, so countable ≥ 1 and there is no division by zero. "Not needed" lines are skipped by C7.6 (S/engine/runtime/readiness.ts:150) and left out of both sides. Form items always carry `item: f.id` (S/api/src/readiness-inputs.ts:110, 122), so a form's lines match by id, not by parsing a key.
* Computed when read and stored nowhere (AG-7-27 §7). It never gates anything (BR-19, BR-30 rule 9). No AI. The engine stays generic, with no combination key or form number (P-319).
* Case rule: the lowest state and the lowest figure, each naming its filing, is BR-30 rule 6 word for word. Ties go to the first filing.
* One fetch: the header reads the same `["runtime","view",caseId,"prepare"]` key that Submission to IRCC already loads on the case page (S/web/src/runtime/submission.tsx:69).
* Best-in-class choices are apt: GOV.UK's "x of y done", Secure Score's published rule, and equal weights so a person can check the figure by counting. None of them is gold-plating.

## Back-end plan
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Filing figure | none (computed); C7.6 `FilingInput` + `FilingReadiness`; plus the filing's closed findings (M3a) | `GET /runtime/cases/:id/prepare` → `figures[]` beside `readiness[]` | BR-2, BR-3 (catch-all, m1), BR-4 rounded down | `check_c710_figure` property 100 ⇔ ready over every code; C7.10-1, -2 |
| State | as above, with `x.findings[].severity` | `figures[].state` | BR-1 + an open CRITICAL finding (M1) | pass and fail for a CRITICAL finding; property state ⇔ block, CRITICAL line or CRITICAL finding |
| Passed count | C7.6 `passed[]` + closed findings | `figures[].passed` (items) | BR-3, BR-30 rule 5 (m5) | C7.10-4; waiving in Review findings raises "passed" (M3) |
| Submitted filing | `filing.status` = SUBMITTED | `figures[].submitted`, figure not shown | M2 (founder Q1) | submitted filing with an open line leaves `case_figure` unchanged |
| Case figure | `figures[]` of filings not submitted | `case_figure` or null | BR-5 lowest of each, naming its filing | C7.10-5 two filings with different lowest filings; all submitted gives null |
| Panel row + disclosure | none | reads `figures[]` | BR-7 rule words (m6) | screen walk 1440 and 1024 px; keyboard `<details>` |
| Header pill | none | reads `case_figure` | m4 visible text, outside `<h1>`, tone (m8) | walk: two filings, differing lowest; keyboard and screen-reader text |
| C7.6 unchanged | `filingReadiness` | `readiness[]` | BR-8 | C7.6, C7.6-screen packs and `check_c76_readiness` exit 0 unchanged; C7.10-6 |

## Questions for the founder
1. **Submitted filings: leave them out of the figure and the case's lowest? (Recommended: yes, show "Submitted").** Otherwise a change after filing holds the case at Not ready with nothing anyone can pass or review (M2). BR-30 does not say either way.
2. **Findings acknowledged, waived or dismissed in Review findings: count them as done and "passed with a reason"? (Recommended: yes, one more read, C7.6 unchanged).** Otherwise the figure reaches 100 with "0 passed" after a waiver, and the promise that passing is never hidden holds only for passes made on the panel (M3).

## Lead response
**Builder's answers (runtime lane, 9 Nov; for the Lead's approval, which comes before any label).** Every Major is fixed, with a failing and a passing check in `tests/check_c710_figure.ts` (34/34) and the pack's agreement check.
* **M1 fixed.** State reads the finding's own severity from C7.6's input: an open CRITICAL finding is Not ready (`engine/runtime/readiness-figure.ts`, `critFinding`); checks "BR-1 (M1) fail/pass"; the property now includes the finding. C7.6 unchanged.
* **M2 fixed, decided from the records, not asked:** BR-31 counts a case by its open filings (AG-07 :2137, "the earliest stage among its open filings"), and a submitted filing's lines can no longer be passed (`api/src/readiness.ts:35`). The prepare view marks each figure `submitted`; `lowestOf` skips submitted filings (all submitted → no case figure); the panel shows no figure on a submitted filing (its existing "Recorded as submitted" words stay). Checks "BR-5 (M2) fail/pass". Reversible; Q1 is closed with this recommendation.
* **M3 fixed with option (a), decided from BR-30 rule 5 and §12 ("A WAIVED item counts as satisfied but is still listed"):** `readinessOfCase` reads the filing's acknowledged, waived, dismissed and resolved findings and hands them to the figure only (C7.6's input and result unchanged): closed with a reason → done and passed; resolved by the rules → done. Checks "BR-3 (M3)". Q2 closed with this recommendation.
* **m1** written into BR-3 (catch-all); the engine already had it. **m2** concept follows the build (facts item only with a form; an open check under facts). **m3** departures listed in concept §3 BR-9. **m4** the header pill shows both filings in its text when they differ (no title-only text). **m5** "passed" counts items done by a pass. **m6** rule words reworded ("which this tool does not keep"); a fee line stays named because the engine supports it. **m7** a form whose use waits for an answer says so in its label. **m8** Not ready is amber (warn), Attention blue (info), Ready green.
* P-425: on the Lead's records branch (`lead/2026-11-07-lead31`), not yet on main; P-319 is the rule on main. Both say the same here: no combination key or program branch in the engine.

## Agreement

## Build discoveries
