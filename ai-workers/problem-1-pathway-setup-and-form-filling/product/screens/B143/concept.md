# B143 · C7.10 Readiness figure per filing: concept

Status: **DESIGN, revised after the fresh challenge** (`challenge.md`: Build after these changes, 0 Blockers, 3 Majors, all fixed; screen-concept; P-223 (4): the tech lead approves after a fresh challenge). Runtime lane, branch `claude/inspiring-gauss-sq2xjw` from `origin/main` fc49dc5a4, 9 Nov 2026. No board: a figure added to two places that already exist (the Ready to file panel, C7.6; the case header). Not a new screen, no schema, no money, no permission: no breaker (P-278).

Row (BACKLOG B143, P-406 (2), founder 7 Nov: "Ours, on Ready to file"): each filing shows its figure from blocks, warnings and confirmed facts with the rule in words; the case shows the lowest; the same figure on the API for the team's header. Team requirement: AG-07 v3.12 **AG-7-27** and **BR-30** (`domain/requirements-2026-11-02/02-functional-requirements/agent/AG-07-case-core-and-delivery_v3.12_2026-10-28.md:3358-3405`), glossary "Readiness" (`:266`), AG-7-1 case header "readiness score" (`:1511`).

## 1. Job and journey
*"How close is each filing to going in, and which one holds the case back?"* The case officer or representative opens a case and sees, per filing, a state (Not ready · Attention · Ready) and a whole-number figure, with what was counted; the case header shows the lowest state and the lowest figure, naming the filing. Who: case staff (C7.6's readers). When: while preparing, J-B2. Ends where C7.6 starts: the lines below the figure.

## 2. Ten layers
| Layer | In the app (main fc49dc5a4) | New here |
|---|---|---|
| Data | none stored; C7.6 computes `FilingReadiness` when read (`engine/runtime/readiness.ts`) | none (AG-7-27 §7: "computed when read and stored in no column") |
| Rules | `filingReadiness()` → blocks, open warnings, passed, `ready` | `engine/runtime/readiness-figure.ts` (pure): `readinessFigure(input, readiness)` and `lowestOf(figures)` |
| API | `GET /runtime/cases/:id/prepare` → `readiness[]` (C7.6) | the same view gains `figures[]` and `case_figure` **beside** `readiness[]` (never inside: C7.6-1 asserts no "%" in a readiness entry, so C7.6's finish line does not move) |
| UI | Ready to file panel per filing (`web/src/runtime/readiness.tsx`); case header (`web/src/runtime/cases.tsx:189`) | a figure row at the top of each filing's block, with "How this is worked out"; a header pill reading the same `/prepare` query (one fetch) |
| AI | none | none: rules only, identical with AI off |

## 3. Business rules
* **BR-1 State** (BR-30 rule 1, mapped to C7.6's lines): **Not ready** while a block, an open CRITICAL warning or an open CRITICAL review finding stands (challenge M1: C7.6 lists every finding as a plain warning, so the finding's own severity is read); **Attention** while only other warnings are open; **Ready** when nothing is open (= C7.6 `ready`). A passed line is not open (BR-30: WAIVED counts as satisfied).
* **BR-2 Countable items** (BR-30's list, mapped to what the reference app holds): each form item on the filing (a "Not needed" line is left out, as BR-30 leaves a Not needed item out of both sides); each required document (a not-applicable line is not required); **the facts** (BR-30's questionnaire: the answers the forms read, answered and confirmed; only when the filing has a form); **the representative's review**; and each other filing-level line standing or passed (a review finding, a release notice, a fee line; an open check counts under the facts, or on its own when the filing has no form). A finding closed in Review findings stays counted (challenge M3). The retainer (AG-05) and the team's deficiency library are the team's and not in the reference app: named in the rule words as not counted here.
* **BR-3 Done** (any line with no form, document, facts or review home is its own item, challenge m1) for each item: a form is done when no open block or warning names it; a document when received; the facts when no open missing-facts, fact-with-a-problem or open-check line stands; the review when its line is not open; a filing-level check when passed; a finding closed in Review findings is done (passed when acknowledged, waived or dismissed with a reason; done when resolved by the rules). A line passed with a reason counts as done (BR-30 rule 5) and the figure says "N passed with a reason" (items done by a pass, challenge m5) beside it, so passing is never hidden (Google Ads lesson, §4b).
* **BR-4 Figure** = done ÷ countable × 100, **rounded down** to a whole number (BR-30 rule 2). So it is 100 only when every item is done, which is exactly when C7.6 says Ready: the figure and the Ready to file button never disagree (BIC numbers agree across screens).
* **BR-5 Case** (BR-30 rule 6, AG07-D22 Q59, Q77): the case shows the lowest state (Not ready < Attention < Ready) and the lowest figure, each naming its filing (ties: the first filing in the view's order), over the filings **not yet recorded as submitted** (challenge M2; BR-31 counts a case by its open filings; a submitted filing's lines can no longer be passed). One filing → its own; all submitted → none.
* **BR-6 Never gates** (BR-19, BR-30 rule 9): no button reads the figure; Ready to file still asks C7.6.
* **BR-7 Rule shown**: the API carries the rule in words and the item list (label, kind, done, passed); the panel shows them under "How this is worked out". Engine words carry no immigration value.
* **BR-9 Departures from BR-30, each so that 100 ⇔ Ready holds against C7.6** (challenge m3): a document is done when received (the app has no Accepted state yet), and a missing one reads Attention (C7.6 makes it a plain warning); MINOR and INFO findings count and read Attention (C7.6 makes every finding stand before Ready to file); an acknowledged finding is done (C7.6 no longer lists it); a form is done when no line stands on it (the app has no form approval); the retainer and the deficiency library are not here.
* **BR-8 Unchanged C7.6**: `filingReadiness` and the `readiness[]` entries are not changed; the C7.6 and C7.6-screen packs and `tests/check_c76_readiness.ts` pass unchanged.

## 4. Layout
Each filing's block in Ready to file (above the count line): `[Not ready]  57  · 4 of 7 done · 1 passed with a reason   ▸ How this is worked out`. The state is a Pill (warn · info · ok tones: Not ready is the normal state of a case in progress, never error red, challenge m8), the figure large-ish tabular text "57%" with `aria-label="Readiness 57 per cent"`. The disclosure lists each item with a tick or "Not done", then the rule in one paragraph. Case header: a pill `Readiness: Not ready · 57% (lowest: Sample Client A — Visitor visa)`, when the lowest state and lowest figure come from different filings the text names both: `Readiness: Not ready (A) · 66% (B)` (challenge m4). A submitted filing shows no figure (its "Recorded as submitted" words stay) and never holds the case (BR-5). States: loading (the header pill hidden while `/prepare` loads; the panel keeps its skeleton), not derived (no figure, the panel's existing words), error (the panel's existing notice; the header pill hidden).

## 4b. Best in class
* **GOV.UK task list** (design-system.service.gov.uk/components/task-list, /patterns/complete-multiple-tasks; read 9 Nov): a count above the list, "You have completed 3 of 8 sections", statuses per task. *Copy:* "4 of 7 done" beside the figure, a tick per item.
* **Microsoft Secure Score** (learn.microsoft.com/defender-xdr/microsoft-secure-score; read 9 Nov): one number, each action's points listed and "how it is calculated" published; "not an absolute measurement". *Copy:* the item list and rule in words under the figure. *Beat:* equal weights (BR-30 rule 4), so a person can check it by counting.
* **Google Ads optimization score** (support.google.com/google-ads/answer/9061546; read 9 Nov): dismissing a recommendation raises the score, criticised as gameable. *Beat:* a pass counts as done (BR-30) but "N passed with a reason" sits beside the figure and each pass keeps its who, when and why (C7.6).
* **IRCC portal** (study [38], `design/best-in-class-m3-case-screens-2026-11-07.md:110`): submit turns blue only when complete. *Copy:* 100 exactly when Ready to file is allowed, never earlier.

## 4c. Scorecard (EXPERIENCE §6)
BIC-11 no new action · BIC-13 no input · BIC-14 the state pill and figure have titles; "How this is worked out" is the help · BIC-18 loading, not derived, error as above · BIC-19 one line per filing, detail folded · BIC-20 keyboard disclosure (`<details>`), figure has words for screen readers, 1024 px wraps · BIC-12 the lines below stay the check · others N/A (no facts, documents, signing or channel set here).

## 5. Copy
Rule words (API, shown): `FIGURE_RULE` in `engine/runtime/readiness-figure.ts` (what is counted, each the same, passes and closed findings count as done, rounded down, the three states, and "Not counted here: the retainer and the firm's own deficiency library, which this tool does not keep (AG-7-27, BR-30)").

## 6. Contract and tests
`figures[]: { filing, state: "not_ready"|"attention"|"ready", score: 0-100, done, countable, passed, items: { kind: "form"|"document"|"facts"|"review"|"check", key, label, done, passed }[], rule }`; `case_figure: { state, state_filing, score, score_filing } | null`. Engine checks `tests/check_c710_figure.ts` (pass + fail per BR, a property: score 100 ⇔ ready; never 100 with a line open; Not ready ⇔ a block or open CRITICAL). Pack `acceptance/C7.10.test.ts` on the demo data (Visitor visa): -1 figure per filing beside readiness, -2 fresh case Not ready under 100, -3 rule and items shown, -4 a passed warning counts done and "passed" rises, -5 lowest across two filings, -6 C7.6's readiness entries still carry no "%", -7 the case reaches 100 and Ready exactly when Ready to file is allowed. A screen walk at 1440 px.

## 6b. Capability or scaffolding
All capability, Needed for the proof. Not built: the retainer and deficiency library (team's, AG-05/AG-7-30), the work-queue column (team's lists).

## 7. Questions (decided from the records; none blocks; the challenge's Q1 and Q2 are answered in `challenge.md` "Lead response")
1. *Lowest state and lowest figure from different filings:* show both, each naming its filing (BR-30 says "the lowest readiness and the lowest score"). Recommended and built.
2. *Count MINOR/INFO findings?* BR-30 counts only CRITICAL/MAJOR library checks; C7.6 (P-237) makes every finding stand before Ready to file, so every finding counts here, or 100 would sit beside a refused Ready to file. Recommended and built.

Definition of ready: acceptance `acceptance/C7.10.test.ts` (this PR), row text as above, P-406 (2) answered.
