# QA-417 — challenge before building (screens lane, 12 Nov)

For the tech lead (Lead 23). Row: QA-417 (qa rehearsal of walk 1, `qa/reports/2026-11-12-walk-1-rehearsal.md` §2 step 11, §3 step 3). Ruling given: "one count, from one source, so the household line equals the sum of its sections and a section with Declared answers shows them as to confirm".

## 1. What the code does (main e5bcc40d3)
* One source already. The household line (`web/src/runtime/cases.tsx:306`) and every section pill (`web/src/runtime/questionnaire.tsx:930`) read the same response (`useCaseView(id, "agent")`, `GET /runtime/cases/:id/questionnaire?mode=agent`). The engine builds `summary.answered` and `summary.confirmed` as the sums of the sections' own counts (`engine/runtime/case.ts:481`, `:513`).
* Reproduced on an isolated copy (`isolated.sh screens_q417 4457`): configured checkpoint, the family case SAMPLE-VV-FAMILY-1, Client A answers every question it is shown (118 answers). Officer's agent view: **household 78 to confirm = sum of sections 78.** Answers by kind:

| status / mark / counts as confirmed / channel | answers |
|---|---|
| VERIFIED / confirmed / yes / confirm_section | 187 |
| VERIFIED / confirmed / yes / firm_record | 16 |
| DECLARED / declared / **yes** / questionnaire (Client A's own, client fields) | 36 |
| DECLARED / by_principal / no / questionnaire (for the parents and the child 18 or over) | 78 |

* The 78 sit only in **other people's tabs**: Client A's first and second parent, the Child 18 or over and that child's parents. Client A's own tab shows "Declared ✓" answers in sections that read "0 to confirm", because a client's own answer on a client field counts as confirmed (`case.ts:94`).
* So the two counts never disagree. The walker read Client A's tab, and the household line counts tabs the walker did not open. The rehearsal's 91/92 and its "139 Declared" fit this.

## 2. The conflict
The ruling's second half ("a section with Declared answers shows them as to confirm") reverses founder decisions:
* **P-72:** "a client's own typed answers count as confirmed for the client's fields".
* **P-78:** "Confirmed (DECLARED, P-72): a person's own answers, and the principal's answers for a minor child".
* P-242 and P-411 amend only what fills a form, not what is on the officer's Confirm list.

Counting own Declared answers as "to confirm" puts 36 more answers on the officer's list. It also changes every "to confirm" check and Confirm section's own rule. AGENTS rule 2: a conflict with the founder's decisions goes to the founder.

## 3. Recommendation (within P-72/P-78; no rule change; web only)
The cold reader's real problem is "which sections to confirm" (rehearsal §5). Show where the household's count lives:
1. Each person's tab in the agent view carries "N to confirm" beside its "N missing" (`questionnaire.tsx:840`), so the 78 point at the parents' and the adult child's tabs.
2. The household line names them: "78 to confirm, in: Client A's first parent (8), …", each a link to that tab.
3. "Declared ✓" keeps its tooltip, which says the client's own answer needs no Confirm (P-72).
4. Confirm section on a section with nothing to confirm (rehearsal §4, QA-417's last clause) says so instead of doing nothing silently.

**Pack check:** on the Visitor visa and Study permit family cases, before and after Confirm section:
* the household count = the sum of the tab counts = the sum of the section pills;
* every non-zero section is reachable from the household line.

**Alternative, if the founder now wants it:** P-72/P-78 amended so that the officer confirms own Declared answers too. That is an engine change (`case.ts:88`, `:94`, `:101`) plus Confirm section's rules, and it touches every runtime suite that counts "to confirm".

**Question:** take the recommendation (web only, P-72/P-78 kept), or put the amendment to the founder?
