# B5 Fees on the case page (C6.12 step -25): fresh challenge (independent challenger, 7 Nov; skill screen-concept B, P-223 (4))

The challenger did not draft the concept. **Read:** `concept.md` (B5, on main 9dc77d1ac + a3332847b). Also read r2 `screens/C6.12-breadth/concept-draft.md` and its `challenge.md` (branch `claude/fervent-ptolemy-w5c6vr`), sprint plan "Row C5" and R11, and DECISIONS P-171, P-247, P-251, P-284, P-319, P-330. Standards: `STANDARDS.md` §6, §7; `EXPERIENCE.md` §2, §4, §5; `QUALITY.md`.
**Code read:** `S/api/src/case-prepare.ts` (build, 150-200 and 380-400), `S/engine/runtime/filings.ts`, `S/engine/filing-modes.ts`, `S/samples/fee-table.json`, `S/web/src/runtime/{submission,questionnaire,cases}.tsx`, the packs `C6.12.test.ts` and `C6.12-breadth.test.ts`, `S/acceptance/C11.3.test.ts` (its HELD helper), `S/acceptance/lib/m3.ts`, `S/acceptance/README.md`, `S/tools/gate-b.mjs`, `.github/workflows/ci.yml`, `P/BACKLOG.md` (B103) and `P/tools/m2-hot-files.txt`.
**Live, read only:** `GET /api/runtime/cases` and `GET …/prepare` as `user-O` on :4441 for SAMPLE-VV-FAMILY-1 and the acceptance family case. No write, no paid AI.
**The builder's draft:** the working tree holds an uncommitted draft (`S/web/src/runtime/fees.tsx`, `S/tests/check_c612_fees_browser.ts`, and a 4-line change to `submission.tsx`). It is quoted below only where it shows a concept point in code. This challenge is on the concept.
**Not run:** `ai-workers/tools/freshness.sh` (no `code/` capture in this cloud copy), so the team sources are Unverified. No objection rests on them.
**Paths:** `S/` = `prototype/studio/`, `P/` = `product/`. Unconfirmed: no counsel.

## Verdict
**Build after these changes.** The block is the right small step. It is read only, needs no server change and adds no new price. On the live checkpoint the amounts add up: CAD 400 + CAD 170 = CAD 570, the exempt child quotes IRCC's page, and the covered lines name the payer.

Three things are wrong in the concept as written:
* **The basis label misleads.** The new per-row basis puts "Family maximum" on all 8 Visitor visa rows of the checkpoint case, although the visitor visa maximum does not apply there (4 people, not 5). On the exempt child's row the label points at the maximum when the real reason is the child's age.
* **A total is shown as final while a fee waits.** A total that leaves out a waiting line reads as the final amount, but it can still rise once the date of birth is answered.
* **The PR cannot merge as planned.** The concept's fallback, "gate B is red on -22 and -23 only", is a PR that never merges. Q3 has to be ruled before the build, not during it.

## Objections

### Blockers
None.

### Majors

**M1. "Family maximum" on every row reads as "the maximum applied".** *Needed for the proof* (BR-2 is new in B5; this is about money). Confidence: high (live API and code).
* **Fact: the field.** `family_max_cents` is the line's cap whether or not the cap applied (`S/engine/runtime/filings.ts:107`, `:158`).
* **Fact: the checkpoint.** On SAMPLE-VV-FAMILY-1 the live totals read `visitor_visa family_max_cents 50000, cap_applied false` ("4 × CAD 100 = CAD 400; the family maximum CAD 500 starts at 5 …") and `biometrics 17000, cap_applied true`.
* **Fact: what the rule draws.** BR-2's rule (`family_max_cents > 0` → "Family maximum") labels all 8 rows "Family maximum", and the concept's own §4 sketch draws exactly that:
  * "Visitor visa fee · Family maximum CAD 100 — CAD 100 for Sample Client A";
  * "Biometrics fee · Family maximum CAD 0 — Under 14: no biometrics". This row is CAD 0 because of an age exemption, not because of a maximum.
  * The draft does the same (`fees.tsx:29`, `:78`).
* **Judgment: how an officer reads it.**
  * An officer reads "Family maximum" next to CAD 100 as "this person is on the family rate". Next to the exempt child it reads as "CAD 0 because of the family maximum". Both are wrong.
  * The label also repeats the same two words on every row. That is noise against EXPERIENCE §0's "nothing extra" and §2.7, "reasons everywhere" (the reason is already in the Why column).
  * P-247's "every fee line carries a basis" is about the fee table's line (visitor visa, biometrics), and `totals[]` already has exactly one entry per such line per submission.
* **Fix:**
  * **Where the basis goes.** Name it once per fee, on its totals line, which already says whether the cap applied. For example: "Visitor visa fee · per person, with a family maximum: CAD 400 · 4 × CAD 100 = CAD 400; the family maximum CAD 500 starts at 5 people applying together".
  * **Wording.** Use IRCC's split ("per person" / "per family") and P-247's terms: "per person, with a family maximum", "per person by role", "per application".
  * **Rows.** Person rows carry no basis label.
  * **Tests.** BR-2 passes when each totals line names the fee table's `basis` for that line. It fails when a row whose line has `cap_applied: false` shows "Family maximum" as its own label, and when the exempt child's row does.

**M2. A total shown as final while a fee waits for a date of birth.** *Needed for the proof* (BR-3, BR-5). Confidence: high.
* **Fact: what a waiting line does to the total.** A waiting line is left out of the payers (`filings.ts:229`, `:237`), so the total counts only the people already known to pay.
* **Fact: an example.** Take C6.12-21's case, a principal and a child with no date of birth (`S/acceptance/C6.12.test.ts:90-94`).
  * Today: visitor visa CAD 200 plus biometrics 1 × CAD 85, which is CAD 285.
  * Once the child's date of birth says 15: biometrics becomes 2 × CAD 85 = CAD 170, and the total becomes CAD 355.
* **Fact: what the concept shows.** BR-3 and BR-5 print "Total for this submission: CAD 285" with no word that it is incomplete. The concept's own 4b row (CMA, "no hidden or drip charges") says this must not happen.
* **Judgment:** an officer who quotes the client CAD 285 is short by CAD 70.
* **Fix (from the API's `waiting` field; no server change):**
  * When any line of a submission waits, the total reads "Total so far: CAD 285 · 1 fee not counted yet (waits for a date of birth)".
  * The case total does the same ("so far") when any submission's total is "so far".
  * **Test, pass:** on the C6.12-21 shape, "so far" and the count are shown.
  * **Test, fail:** no total reads as final while a row shows "Not counted yet".

**M3. Gate B: the plan cannot merge until Q3 is ruled, and the HELD it recommends needs a guard.** *Needed for the proof* (R11, P-330 (7)). Confidence: high on the gate's code, medium on CI's data choice.
* **Fact: one step list for both packs.** `claims()` gives each capability one step list (`S/tools/gate-b.mjs:84-127`), and each of the capability's packs is run with it (`:423`).
  * `stepsVerdict` wants a PASS line for every named step in each pack's own output (`:219-224`).
  * So "C6.12 (steps …, 25)" fails both packs: neither prints the other's steps. This is B103, which has no owner (`P/BACKLOG.md:168`).
  * Named whole, the breadth pack exits 1 on -22 and -23.
* **Fact: a red gate does not merge.** A PR merges only on green CI. "Until then … gate B is red on -22 and -23 only" (concept Q3) is therefore a PR that waits for good, not a PR that ships.
* **Fact: where the gate runs.** CI's gate B sets no `GATE_B_DATA`, so it runs on the six (`.github/workflows/ci.yml:269`, `gate-b.mjs:255-259`). A C6.12 pack's run line has setup steps, so it runs "fixture only" (`gate-b.mjs:275-276`), not "on the checkpoint" as §6 and the definition of ready say. On that fixture -22 is red for a second reason: `released: 0`, because only Visitor visa is set up there.
* **Fact: HELD needs a guard.** C11.3's held step prints HELD only while the held part is still absent (`S/acceptance/C11.3.test.ts:29`, `held(name, why, still, c)`). A HELD with no such guard would print HELD over a broken -22 once someone builds it.
* **Fact: -24 comes along.** Running the breadth pack whole also runs -24. It passes on today's table (study, work and extension lines, none with a family maximum), but R11 names only -25.
* **Fix:**
  * The tech lead rules Q3 before the build starts. It is a pack change (`S/acceptance/README.md:13`, the tech lead's) and is outside the builder's files.
  * **Recommend HELD,** as the concept says, with these four points:
    * (a) -22 prints HELD only while `samples/fee-table.json` has no `fs.spouse` entry, and -23 only while no release asks the question. Otherwise each prints PASS or FAIL as today.
    * (b) The reason line reads "outside the Visitor visa journey: founder's answer to Q1, 6 Nov; rows S1, S2".
    * (c) The PR body says the breadth pack runs whole, so -24 is checked too.
    * (d) The concept says where gate B actually runs (fixture only in CI) and that the checkpoint PASS is qa's gate A.
  * The other route is B103, a tooling change that needs an owner first.

### Minors

**m1. The basis words drop P-247's "by role", and they depend on the engine's sentence.** *Needed for the proof.* Confidence: high.
* **Fact: the regex.** `/\(per person;/` also catches `per_person_by_role` lines (`filings.ts:152`), and those are charged to some roles only (for example `pr_adult`: principal and spouse). "Per person" hides that.
* **Fact: duplicated logic.** Reading the engine's English is the duplicated logic STANDARDS §7 forbids. The concept's test, built from `familyFee`, does catch a wording change, so this is acceptable as a stopgap.
* **Fix:**
  * Use "per person by role" (M1's words).
  * Keep Q2's `basis` field as the real fix, in the runtime row after #1223 and #1225.

**m2. Sources: a page date printed as a read date (r2 m3 again).** *Needed for the proof.* Confidence: high.
* **Fact:** the exemption source's `read` is "2026-03-30 (page date)" (live; `S/samples/fee-table.json:44`).
* **Fact:** the concept's §4 prints "When to give biometrics (read 2026-03-30 (page date))", and so does the draft (`fees.tsx:103`).
* **Fix:** write "read" only before a bare date, and print any other value as given: "When to give biometrics (2026-03-30, page date)". Test, fail case: no "read … (page date)".

**m3. Decision codes on the main path.** *Not built* (they are the engine's words). Confidence: high.
* **Fact:** the live `basis` sentence reads "… Sample until the immigration expert confirms (P-171). Biometrics: none under 14 or over 79, age as at today (FQ-7). …".
* **Fact:** EXPERIENCE §5 and D10 say there are no decision numbers on the main path.
* **Judgment:** the page must not rewrite the API's words.
* **Fix:** add "no codes in the fee words" to Q2's runtime row (`filings.ts:263`). B5 shows the sentence as it is.

**m4. "Fees not worked out" is probably reachable on the checkpoint, and it would be said twice.** *Needed for the proof.* Confidence: medium (not opened live: no writes allowed here).
* **Fact: reachable.** The sprint plan's Row C5 says `fs.spouse` is released on the checkpoint (`released: 1`), and the fee table has no `fs.spouse` entry. A released combination with filing modes but no fee rule is derived with `fees_worked_out: false` and `fees_why` (`filings.ts:185-186`, `:262`). That is the sponsorship state too: a co-filed filing with no fee line.
* **Fact: said twice.** The concept's BR-4 does not say where `fees_why` shows. The draft prints it under every submission (`fees.tsx:44-48`). When fees are not worked out, the `basis` sentence repeats the same words (`notWorkedOut(label)`, `filings.ts:262-264`).
* **Fix:**
  * Test BR-4 on a real `fs.spouse` case on the checkpoint when one opens. Use a stub only if it is refused.
  * Show `fees_why` once per case.
  * Correct §6's "cannot be reached".

**m5. Nobody applying: people would vanish against BR-6.** *Needed for the proof.* Confidence: high.
* **Fact: the state.** The runtime lets the principal be marked not travelling (`S/engine/filing-modes.ts:88-89`). With everyone off the trip there are no filings and no groups, so BR-6's "under the first submission" has no submission to sit under.
* **Fact: no reason is sent.** The API drops the engine's top-level `why` ("Nobody on this case is applying …"): `case-prepare.ts:397-400` returns no `why` when `derived` is true.
* **Fact: what the officer sees.** The panel shows nothing.
* **Fix:**
  * With no groups, list `not_filing[]` at the panel's foot, each with its `why`.
  * Tests: one pass and one fail (the C6.12-18 shape with every person `applies: false`).

**m6. Stubbed views: the engine's field names are not the API's.** *Needed for the proof.* Confidence: high.
* **Fact:** the API renames the engine's fields (`case-prepare.ts:186`):
  * engine `line` (the key, "visitor_visa") → API `key`;
  * engine `label` → API `line`;
  * engine `why` → API `reason`;
  * the API adds `amount_words`.
* **Risk:** a stub made from `deriveFilings` output, as §6 says, would show "visitor_visa" as the fee's name and still pass a weak check.
* **Fix:**
  * Every stub starts from a real `/prepare` body read in the same run, and only `fees[]` and `totals[]` are replaced, through the API's mapping. The draft test's header already says "served … from the real view": make §6 say the same.
  * Assert that each stub has the real body's keys.

**m7. Money format.** *Needed for the proof (low).* Confidence: high.
* **Fact: two formats.** The page's copy of `cad()` writes "CAD 1110". The questionnaire on the same app writes money "CAD 1,260" (`S/web/src/runtime/questionnaire.tsx:97`, `toLocaleString("en-CA")`), and canada.ca writes "$1,260.00".
* **Fact: reachable.** A case total of CAD 1,000 or more can be reached on Visitor visa: 6 people aged 14 to 79, all split apart, is 6 × CAD 185 = CAD 1110.
* **Fact: duplicated logic.** The formatter is copied in the web, against STANDARDS §7.
* **Fix:** keep the engine's rule now, so the page matches `amount_words` and the check stays exact. Put "one formatter with thousands separators, in the engine, sent as words" into Q2's row.

**m8. The 4b claims say more than B5 does.** *Not built.* Confidence: high.
* **(a) IRCC's wording.** "IRCC's wording of the maximum … on every line": the biometrics quote is `quote_kind: "summary of the Lead-checked record"`, not IRCC's words (live; `fee-table.json:52`). And BR-7 shows each source once, not on every line.
* **(b) The split.** "A split shows the lost maximum at once": the case page has no split action (`/split` appears nowhere in `S/web/src`). A split is reached only through the API today. The case total is still right to show (P-247), but it is not part of an officer's click path.
* **(c) Linking the question.** Direct File links a result to the question that decides it. B5's waiting row names the date of birth but does not link to that question.
* **Fix:** correct the 4b rows, and record (c) as Not built. Do not add it here.

**m9. The walk ends at a button that cannot be pressed.** *Needed for the proof.* Confidence: high.
* **Fact:** "Record the submission" opens only once every filing is Ready to file (`S/web/src/runtime/submission.tsx:83-85`). On SAMPLE-VV-FAMILY-1 all four filings are NOT_STARTED (live).
* **Fix:** the walk checks the disabled button and its "Opens once every filing is Ready to file: …" line. Or it first makes the filings Ready to file through the product's own path. Say which.

**m10. Where an officer still checks more than needed.** *Not built* (judgment). Confidence: medium.
* To know what is paid on the principal's application, the officer adds CAD 100 and CAD 170 in their head.
* The one number they quote sits below 8 rows and 2 totals lines.
* **Recommendation:** add no per-filing sum now (it would be more page arithmetic, and new scope). If the reviewer agrees, put the bold total directly under the "Fees" heading and the rows below it, CMA's "total up front". That costs no new data.

## What is sound
* **Scope and files.** Read only, no button, US$0, no AI, no server change, no file on `P/tools/m2-hot-files.txt`, types kept in `fees.tsx`. One query key is shared with the panel (`submission.tsx:51`), so no third read is made.
* **The money adds up live.**
  * The rows sum to the group total: 4 × CAD 100 + CAD 170 + 3 × CAD 0 = CAD 570, which is `total_cents: 57000`.
  * Exempt and covered lines show CAD 0 with a reason that names the payer and filing, or IRCC's under-14 quote.
  * A waiting line shows no CAD: its `amount_words` would say "CAD 85", and BR-5 hides it.
* **Joining a row to its basis is sound.** A row is joined to its totals line by `fees[].key` = `totals[].line` within the row's own group (`case-prepare.ts:186`, `filings.ts:158`). Every fee line is pushed after its totals line (`filings.ts:231-243`), so the join always finds one. `family_max_cents > 0` exactly when the basis is `family_maximum` (`filings.ts:107`; `soundLine` refuses a zero cap). The fault in M1 is the label, not the reading.
* **Split groups and the case total.** The case total is the sum of `total_cents` per submission. With any line not worked out, every total is `null` (`filings.ts:257`), so the sum never mixes known and unknown totals. Showing it only with two or more submissions is right (P-247).
* **No price in the page.** No fee amount, form number or age is written in the page (P-319). Sample and source come from the API's `basis` and `source_detail`.
* **The r2 points stay taken in:** M1 (no second list of filings), M2 ("Not counted yet"), M3 (`not_filing[]` and declared only), m4 (the caption and the `fees-{group}` ids), m5 (three columns).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Fee row | none; computed per read from `fee-table.json` | `fees[]` (`key`, `line`, `amount_words`, `exempt`, `waiting`, `reason`, `source_detail`) | BR-1, BR-5 | browser: rows equal `/prepare`; a waiting row has no CAD |
| Basis | `fee-table.json` `lines[].basis` | `totals[].family_max_cents`, `why` (Q2: a `basis` field later) | BR-2 as M1 | browser: each totals line names the table's basis; no "Family maximum" label on a row whose line did not cap (fail) |
| Submission total | computed | `groups[].total_cents`, plus `waiting` on rows | BR-3 plus M2's "so far" | browser on C6.12-21's shape (pass and fail) |
| Case total | computed on the page (a sum of the API's totals) | `groups[].total_cents` | P-247 | browser after a split made through the API (C6.12-13's shape) |
| Not worked out | none | `fees_worked_out`, `fees_why` | BR-4 (once per case, m4) | real `fs.spouse` case if it opens, else a stub built from the real view (m6) |
| No filing | `not_filing[]` | as is | BR-6 plus m5 | every person off the trip (pass and fail) |
| Gate B | the breadth pack | none | R11, P-284's HELD with a guard (M3) | gate B prints HELD for -22 and -23 only while absent |

## Questions for the founder
None: every open point is the tech lead's. **For the tech lead (recommendation first):**
1. **Q3, before the build:** HELD for -22 and -23 in `C6.12-breadth.test.ts`, guarded as M3 says, as the tech lead's commit. The alternative is B103 once it has an owner. *Recommend HELD.*
2. **M1:** the basis named once per fee on its totals line, in P-247's words, rather than on every row. *Recommend yes.*

## Lead response

## Agreement

## Build discoveries
