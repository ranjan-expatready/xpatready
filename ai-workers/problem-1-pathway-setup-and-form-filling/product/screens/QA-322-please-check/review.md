# QA-322 review: the client's "please check" (P-142 D6), PR #1404 at a5eb5a9da, 9 Nov 2026

**Reviewer:** an independent agent in a fresh context; it did not build this. **Verdict:** Ship. There is no Blocker and no Major. Six Minors are listed below: fix them or list them in the PR.
**Evidence:** an isolated copy `rv_q322` on :4438 with the configured checkpoint, US$0, live AI off, never :4400. The checks were:
* the C6.5 pack;
* the builder's walk and my own walk (`scratchpad/rv-q322-walk.mts`), as the client at 1440, 1024 and 390 px, plus a keyboard pass and 200 % zoom;
* axe-core (WCAG 2.2 A/AA) on the overview, the part and the summary;
* a mutation run, with `api/src/runtime.ts` put back to 60235a001.

Screenshots are in the scratchpad (`rv-shots/`), not in the repo. The journey report is `journey-test-client-2026-11-09.md`.

## What was judged
* **D6 is met for the client.** The client typed SAMPLEDE and the passport reads SAMPLED. The note shows under Client A's family name, with a warn border and icon, and the input's `aria-describedby` points at it. The part reads "Check answers" on the overview, and Save and continue lists the note in "Check these answers". The same holds for the spouse's note on the spouse's part (part 44). The pill and note show at 390 px too, with 0 px sideways scroll. After the officer resolved Client A's check, Client A's note was gone and the spouse's note stayed.
* **The officer's half and the Agent view are unchanged.** The diff only adds to `view()` when `mode !== "agent"` (runtime.ts:390). The Agent view carries 0 `document_check.*` entries. C6.5-13 to -17 stay green: Confirm section is refused with 409, resolving without a reason gets 400, a client marking a value checked gets 403 (P-142 D3), and staff marking it checked works. `resolve`, the drawer and `checkedAgainst` are not touched.
* **Hiding the document's value is right.** P-142 D3 says the client's confirmation is their own declaration. Showing the passport's reading would invite the client to copy a machine read; coded-line names drop accents and transliterate. The note names the document to look at, which is enough to act on. In the client payload, `checks` carries neither the typed nor the read value.
* **No leaks were found:**
  * Another client (`user-Q`) gets 404, the solo firm's officer (`user-S`) gets 404, and no actor gets 401.
  * The query is scoped to `caseId` of the reached case.
  * A check shows only when its person and fact match a section the client's view already holds, on a question that is neither hidden nor in a repeating group (runtime.ts:403).
  * A check never sits on a relative or on a per-row fact: documents belong to participants only (case-documents.ts:389), and per-row facts are not used.
  * A case-level letter check shows only where the client is asked that case fact.
  * A spouse check shows to the principal, who already answers for the spouse ("You answer for everyone travelling").
* **PQR is consistent.** `pqr()` (runtime.ts:416) leaves document checks out. That is right, because PQR's checks feed its eligibility line ("Needs a closer look: …"), and a spelling check is not an eligibility signal. The client's PQR on this release has 0 questions.
* **Performance:**
  * The change adds one indexed query (`answer_check @@index([caseId, subjectId])`) per view. A second query (case documents) runs only when a check is open. There is no query per row.
  * The client's view averaged 52 ms over 10 calls with 2 checks open.
  * Opening a part makes no request.
  * The overview settled in 0.8 s.
* **The flow does not trap the client.** "leave them for now and continue" moved the client to part 19 at both widths. The other parts stay reachable from the overview. For the cost of this, see m1 and m5.
* **Accessibility:**
  * axe found no violations in all three states.
  * The keyboard path reaches the family name in 4 Tabs.
  * Enter saves, and focus moves to the summary (`role=alert`).
  * At 200 % zoom (512 px) there is no sideways scroll.
  * There were no browser errors.
* **The pack steps are sound:**
  * C6.5 is 33/35, with only 19b and 20 red (FQ-10), re-run after I restored the file.
  * With runtime.ts at 60235a001 the pack is 32/35, with **C6.5-12b red**.
  * 12c fails if the `mode !== "agent"` guard goes, and 15b fails if the `state: "open"` filter goes. Each rule's test fails when its rule is removed.

## Findings
**Block:** none. **Major:** none.

**Minor (Should)**
* **m1. The note does not change once the client has changed the answer** (runtime.ts:406). Scenario: the client changes SAMPLEDE to SAMPLED and presses Save and continue. The answer is stored as `DECLARED|SAMPLED`, and the check stays open, as designed. But the part stops the client again with "Check these answers" and the same words: "…If your answer is wrong, change it here…". The client has already done that and gets no acknowledgement (`rv-shots/1440-03-after-change-summary.png`, `390-03-…`). The words stay literally true ("did not match … when your case officer read it"), but they give stale advice. Fix: when the current answer is not the check's `answerId`, say "You changed this answer. Your case officer will check it against your {document}." No new scope is needed: the data is already loaded.
* **m2. The first sentence is 21 words** (runtime.ts:406). BIC-20 asks for client sentences under 20 words, and "the passport information page copy on file" is heavy. A suggestion: "Please check this answer. It did not match your passport information page copy when your case officer read it."
* **m3. `.toLowerCase()` runs on the whole document type name** (runtime.ts:401). "Letter of invitation (Sample)" becomes "letter of invitation (sample)", and "… national ID" becomes "national id". Lower only the first letter, or keep the name as the release gives it.
* **m4. The check is added after the per-section `problems` were built** (runtime.ts:390 against engine/runtime/case.ts:465-470). In the client view, the document check is in `checks` but not in `sections[].problems`, unlike every other check there. No client screen reads `problems` today (questionnaire.tsx:468 reads `view.checks`), so nothing visible breaks. The contract is inconsistent for the next consumer: add the check to `problems` too, or note the exception.
* **m5. While a check is open, the part can never be Done** (questionnaire.tsx:383; the code is unchanged, but this change is what reaches it). "N of 87 parts done" cannot reach 87, and "Every part is answered" never shows. "Continue where you left off" lands on this part whenever it is the first part not done, and only the officer can clear it. This is acceptable because the note says the officer settles it. It is listed so the m1 wording also covers the case "nothing more for you to do here".
* **m6. The builder's record walks 1440 px only.** I walked 390 px and it is fine (`rv-shots/390-01…05`). Add one 390 px line to walk.md.

## Scores (D1–D20; simulated only for D17 and D20)
| D | Score | Evidence |
|---|---|---|
| D1 | 5 | P-142 D6 met on the client side; D3 and the officer's half unchanged (C6.5-12b, -13 to -17) |
| D2 | 5 | Read-only addition; the stored answer stays the client's (`DECLARED\|SAMPLED`), and the check stays open |
| D3 | 5 | Uses the existing warn-check shape and client UI; nothing duplicated |
| D4 | 5 | Hidden and group questions are excluded (runtime.ts:403) |
| D5 | 4 | A reload and leaving the part are fine; the summary repeats after a change (m1) |
| D6 | n/a | No content governance touched |
| D7 | n/a | No AI; the passport is read by coded-line rules |
| D8 | 5 | The overview pill points to the part; the summary links to the field |
| D9 | 4 | One action: change it or leave it; Continue pins to this part (m5) |
| D10 | 4 | Plain and not blaming; 21 words; lower-cased names (m2, m3) |
| D11 | 3 | No acknowledgement after the client changes the answer (m1) |
| D12 | 5 | Same look as every other client check (warn border and icon) |
| D13 | 5 | axe none; `aria-describedby`; keyboard; 390 px and 200 % zoom with no sideways scroll |
| D14 | 5 | Team tokens and components only |
| D15 | 5 | 52 ms per view; one indexed query; none per row |
| D16 | 4 | 12b fails without the fix; the fixture variant was the builder's run, not mine |
| D17 | 4 (simulated only) | Agent walk |
| D18 | 5 | Names the document and who settles it; withholds the read value |
| D19 | 4 | Client → officer resolve → note gone, end to end |
| D20 | simulated only | No intended user walked it |

## BIC (P-407; client case screen, this change only)
* **Met:**
  * BIC-04: the note is a warning; the answer is saved.
  * BIC-07: not overwritten; the officer picks with a reason.
  * BIC-11: one primary button.
  * BIC-13: the field and the summary use the same words and are linked.
  * BIC-18: "Saved" is shown.
  * BIC-19: no new reds; no ids.
* **Partly:** BIC-20 (m2: 21 words).
* **N/A:** BIC-01 to -03, -05, -06, -08 to -10, -12, -14 to -17. This change adds no question, document view, roles, tasks, filing, tooltip or review step.
* **Screens:** 1440 and 390 px, plus a keyboard pass at 1024 px. There is no 1024 px screenshot.

## Not checked
* A real screen reader.
* The fixture run (C6.5-12b's "not asked" branch); I relied on the builder's 33/35.
* An intended client's unaided walk (D17 and D20 stay with the founder).

Verdict: Approve a5eb5a9da

## Re-review of 673f0794d (diff only, P-318 (1); same reviewer, 9 Nov 2026)
**Scope:** `git diff a5eb5a9da 673f0794d`. The code is in `api/src/runtime.ts` (`pleaseCheckWords`, a second query, the changed-since test) and `tests/check_c65_document_rules.ts`. The rest is records: walk.md, shots 02-06, and this review and the journey file, committed as written.

**Run:** the same isolated copy `rv_q322` on :4438, started fresh with the configured checkpoint, at US$0. It is now stopped, and no tracked file was rewritten. My scenario script is `scratchpad/rv-q322-rr.mts`.

**Results:**
* `check_c65_document_rules.ts`: 21/21.
* C6.5 pack: 33/35, with only 19b and 20 red (FQ-10); 12b passes.

**What held:**
* m3 is fixed: only the first letter is lower-cased.
* The fresh-check words are right: "it did not match the passport information page copy on file." It is 3 sentences of 15, 7 and 8 words.
* The extra query is limited to the subjects and facts of the case's own open checks: those checks are filtered by `caseId`, the rows by `rowKey: null` and the current version. It runs only when a check is open, once per view, never per row.
* Nothing else moved: the only code files changed are runtime.ts and the test. The officer's half and the Agent view are untouched.
* Confirm section with the same value cannot reach this case: it is still refused with 409 `open_checks` while the check is open (scenario 6).

**Scenarios: the words each case gets**
Each case is a client view of one open check. "Changed" means the words "you changed it after it was compared…".

| # | Case | Stored answer | Words shown | Right? |
|---|---|---|---|---|
| 0 | Fresh check | client, SAMPLEDE | "did not match" | yes |
| 1 | The client re-saves the same value (API only; the client page saves only values that differ, questionnaire.tsx:341) | client, SAMPLEDE, new row | "changed" | **no**: nothing changed |
| 2 | The client changes it to the document's spelling | client, SAMPLED | "changed" | yes |
| 3 | The client changes it, then changes it back | client, SAMPLEDE, the value compared | "changed" | **no**: it still differs from the document, and the client is no longer asked to check it |
| 5 | The officer changes the spouse's answer in the Agent view | `agent_view`, SPOUSED | "**you** changed it" | **no**: the client did not change it |
| 6 | Confirm section | n/a | refused with 409 | n/a |

**Findings**
* **M1 (Major, runtime.ts:415).** `changed(k)` compares row ids, `now.id !== k.answerId`, so any new version counts as "you changed it".
  * In case 5, an officer's correction made in the Agent view is credited to the client in client-facing copy. The statement is false.
  * In case 3, a value that still differs from the document loses D6's "it did not match … If it is wrong, change it here". That is the very prompt this row adds, so the fix regresses D6 in a case reachable from the client's own screen, through two saves. The a5eb5a9da words were true in every one of these cases.
  * The same id test also fires when another document agrees with the typed answer. Confirm & use then writes a VERIFIED copy with a new id and the same value (case-documents.ts:445). I could not reach that here: the checkpoint has one passport line per person. So it is shown from the code only.
  * **Fix:** decide by value and by who.
    * Read `valueJson` and `sourceJson` in the query at runtime.ts:414, and `typedValueJson` on the check.
    * "Changed" applies only when the current value is not `sameValue(fact, current, typed)`.
    * When the current version's channel is not the client's own (`questionnaire` or `client_reconfirm`), use neutral words without "you". For example: "This answer changed after it was compared with the {document} on file. Your case officer checks it again and settles any difference with you."
    * Add a fail test for cases 3 and 5: a C6.5 pack step, or a unit check over the decision moved into a pure function.
* **m7 (Minor, runtime.ts:74).** The under-20-words test (`tests/check_c65_document_rules.ts`) uses only "Letter of invitation (Sample)" for the changed words, which gives 19 words. The release also holds "Passport or travel document information page photocopy", which the coded-line reader reads. With that name the changed first sentence is 22 words (BIC-20). Shorten it, e.g. "you changed it after the {document} was compared", or test the longest readable name.

m4 to m6 are left with the tech lead, as walk.md says. That is fine for this re-review.

**To fix before Approve:** M1, with a test that fails on cases 3 and 5; m7, or list it in the PR.

Verdict: Block 673f0794d

## Re-review of 01d12b6b7 (diff only; same reviewer, 9 Nov 2026)
**Scope:** `git diff 673f0794d 01d12b6b7`.
* **Code:** `api/src/runtime.ts` (`documentCheckNote`, new words, the query now reads `valueJson` and `typedValueJson`) and `tests/check_c65_document_rules.ts`.
* **Records:** walk.md, shots 02-06 redone, and my earlier re-review committed as written.

**Run:** the same isolated copy `rv_q322` on :4438, started fresh with the configured checkpoint, at US$0. It is now stopped, and no tracked file was rewritten.

**Results:**
* `check_c65_document_rules.ts`: 25/25.
* C6.5 pack: 33/35, with only 19b and 20 red (FQ-10).

**M1 is fixed.** I re-ran my scenario script (`scratchpad/rv-q322-rr.mts`) for the words each case now gets:

| Case | Words shown | Right? |
|---|---|---|
| Fresh check | "It did not match" | yes |
| Same value saved again | "did not match" | yes |
| Client changes to the document's spelling | "It has changed since it was compared" | yes |
| Changed back | "did not match" | yes |
| Officer edits in the Agent view | "has changed" | yes: neutral, no "you" |
| Confirm section while open | 409 `open_checks` | unchanged |

**Other points:**
* "Changed" now uses `sameValue` from document-values.ts, the same comparison Confirm & use uses to open a check (case-documents.ts:41-42 re-exports it). A same-value copy written by an agreeing document therefore no longer reads as changed.
* **m7 is fixed.** The longest readable name, "Passport or travel document information page photocopy", is tested, and every sentence is under 20 words.
* **Do the tests fail on the old rule?** Mutation A drops the value comparison, so any current answer counts as changed: 23/25, with two M1 checks red. The rule's test fails when the rule is removed.
* **The query** is still limited to the subjects and facts of this case's open checks, current version, no row key. It now selects values instead of ids and still runs once per view.
* **Nothing else moved.** The only code files changed are runtime.ts and the test, and runtime.ts changes only inside `pleaseCheckWords`, `documentCheckNote` and `documentChecks`. The officer's half (drawer, resolve, Confirm section, `checkedAgainst`) and the Agent view are untouched.

**Minor (Should; fix or list in the PR)**
* **m8. The wiring of the value rule has no test** (runtime.ts:429). Mutation B makes the call skip `documentCheckNote` (`pleaseCheckWords(name, now(k) !== undefined)`), and everything stays green: the unit test is 25/25, and C6.5-12b checks only the "Please check this answer" prefix. My scenario run is the only evidence for the wiring. Add one pack step after C6.5-12b: the client saves a new value, then the old one, and the note reads "did not match" again.
* **m9. A stale doc comment** (runtime.ts:71-74). The old `pleaseCheckWords` comment now sits above `documentCheckNote`, as a second doc block, and still says "once the client changed the answer". Move it to `pleaseCheckWords` and drop "the client".

There is no Blocker and no Major. m4 to m6 stay with the tech lead.

Verdict: Approve 01d12b6b7
