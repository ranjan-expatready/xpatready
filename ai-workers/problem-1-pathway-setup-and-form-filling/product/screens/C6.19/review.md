# Review: C6.19 Facts from an earlier case, commit 2f20d282b (`git diff origin/main...2f20d282b`)

Independent reviewer (did not build it), 9 Nov 2026. Judged against concept r2, challenge.md (with the builder's answers), the brief's Done-when, P-425, P-170, STANDARDS, EXPERIENCE §3 and §6, and QUALITY. My copy ran on :4435 only (`isolated.sh rev_c619`). It was stopped and dropped afterwards. All values are Sample. US$0. Unconfirmed: no counsel.

**Verdict: Block** (commit 2f20d282b). 0 Blockers, 2 Majors, 7 Minors. Fix M1 and M2, each with its fail test. The rest of the capability holds well. Journey score **8/10** (pass): `journey-test-reviewer-2026-11-09.md`.

Note on the tree: the builder shares this clone, and HEAD moved to b988cc493 (records commits) while I was running. Since 2f20d282b the only changed non-record line is the police rule's Sample `why` string in `samples/fact-expiry-rules.json`. No finding below depends on it.

## What I ran
* **Pack** `acceptance/C6.19.test.ts 4435 xr_studio_rev_c619`: **61/61, exit 0** (105 s). This matches the builder's result.
* **Walk** `check_c619_earlier_facts_browser.cjs`: **15/15, exit 0**. The builder had 16/16. The difference is one line: the "load checkpoint" setup is skipped when the pack has already loaded it. axe found 0 violations in both states. No sideways scroll at 1024 or 390 px. No page errors.
* **My own probes** (scratchpad scripts):
  * A Visitor visa to Visitor visa case pair with a Unicode name in other letter case ("Zoë Ünal" against "ZOË ÜNAL"): matched.
  * A double POST of the same tick: 201 then 409 "Changed since you looked", and one row written.
  * Answer sheets compared on A and B.
  * Keyboard tab order and tooltips on hover and on focus.
  * 1024 px, 512 px (1024 at 200 %) and 400 px.
* **Graph** `graph.mjs`: G1 0, G2 0, G4 0, G5 0.

## Done-when, rule by rule
* **Offers a second case's confirmed facts: met.** BR-1 and BR-2 have pass and fail tests. Another firm's case gets 404. Unconfirmed, application and background facts are not offered. `checkValue` refuses IND on the work permit (M4).
* **Nothing used until re-confirmed: met.** Reading the offer writes nothing. Only ticked facts are written. Stale ids on this case and on the earlier case are refused under `FOR UPDATE` / `FOR SHARE`. A concurrent duplicate is caught by P2002, then 409.
* **Expired fact flagged with its cited rule: met, but with M2.** The quotes are word for word against `official-sources/.../visit-canada-apply-visitor-visa.html` l.407-411. `applies_to` is held as data. There is no combination key in engine or API code (grep `vv.|lmia|combinationKey ===`: none). The work permit shows "Sample on this combination". The check fails closed when today is missing.
* **A copy never changes the earlier case: met.** BR-3 has pass and fail tests, and A is unchanged after an edit on B. The audit text names fact keys and the earlier reference, never a value.
* **Status kept (challenge B1): met in the database** (VERIFIED with A's verifier; Declared stays Declared). **The giver is not kept on screen:** see M1.

## Majors
**M1. A copy loses who gave it: a client's answer reads "Case officer" on the form sheet of case B** (D2/D18, concept BR-4 "keeps the status, giver and verifier", challenge B1 fix).
* Evidence: in my probe the client typed date of birth 1985-03-14 on A, and it was confirmed and then copied. GET `/runtime/items/:id/answer-sheet`, IMM 5257:
  * On A, the box reads `"source":"Client"`.
  * On B, the same value reads `"source":"Case officer"`.
* Cause:
  * `api/src/runtime.ts` (`state()`, the new `origin` line) sets `origin.channel = "earlier_case"` with `actor = reconfirmed_by`.
  * The copy drops the earlier answer's own `from` / origin (`api/src/earlier-facts.ts:135`).
  * `case-prepare.ts:763` takes `origin?.channel ?? channel`, and `answer-sheet.ts:61` maps anything that is not `questionnaire` to "Case officer".
  * The Agent view on B reads "earlier case, re-confirmed · <officer>" and no longer shows the client as the giver. A Declared questionnaire copy is hit the same way, because its origin also becomes `earlier_case`.
* Fix: keep the earlier answer's giver as the copy's origin. Copy A's `from`, or store A's origin, in `source_json`. Record the earlier case and the re-confirmation beside it, not in place of it. Show "Earlier case <ref>, re-confirmed <date> by <officer>" as an extra line.
* Fail test: client answers on A → section confirmed → copied to B. B's answer-sheet box has the same `source` as A's ("Client"), and the Agent view `answered.by` on B is the client. A second case: a Declared questionnaire copy also reads "Client".

**M2. The canada.ca citation shows the wrong recorded date: "recorded 26 Oct 2026" for a page recorded 27 Oct 2026** (P-170, AGENTS rule 4, D18, Done-when "flagged with its cited rule").
* Evidence: on a Visitor visa case B with A's passport expired (`r1-vv-expired-1440.png` in my scratchpad), the row reads "Apply for a visitor visa (canada.ca), Gather your required documents, recorded 26 Oct 2026". The data says `"recorded": "2026-10-27"`.
* Cause: `web/src/runtime/earlier-facts.tsx:30` calls `dateWords(s.recorded)`. `dateWords` (`employer.tsx:22`) parses the date-only string as UTC midnight and prints it in America/Toronto, which is the day before. Neither the pack nor the walk covers the cited (non-Sample) line in the browser.
* Fix: format a date-only value without a time-zone shift (timeZone UTC, or print the parts).
* Fail test: in the walk, a Visitor visa case with an expired earlier passport has row text containing "recorded 27 Oct 2026". Run it with the browser's time zone set to America/Toronto.

## Minors (Should)
* **m1. "Confirmed there" shows the date only, not who** (concept §4 "(date, by)"; §4c claims BIC-05 "who"). `earlier-facts.tsx:84`; the field `confirmed_by` is sent but not shown. Test: the cell names the role ("Case officer").
* **m2. Dates on one page disagree, and some are not in words.**
  * The card prints "opened / confirmed 8 Nov 2026" (Toronto time), while the Agent view prints "9 Nov, 04:25" for the same moment (walk shot 01 against 04).
  * An earlier date value shows as ISO ("2025-01-15", `r-1024.png`), while the Agent view shows "9 May 2031".
  * The Sample text shows "recorded 2026-10-27" (`engine/runtime/earlier-facts.ts:40`).
  * Test: the card's dates equal the Agent view's for the same answer.
* **m3. The reason a fact cannot be used sits in a narrow Status column.** At 1024 px and 200 % zoom (512 css px) the table scrolls inside its box. The Status column is about 96 px wide and off screen, so each row is about 400 px tall (`r-512.png`). Concept §4 asks for "a Details line" under the row. There is no page-level sideways scroll (1.4.10 is met).
* **m4. The refusal message leaves out the rule's source.** Concept §5 asks for "(<rule source>)". `api/src/earlier-facts.ts:113` sends the words only.
* **m5. A case recorded as submitted still shows an enabled "Re-confirm and use"; the refusal comes only after the press** (BR-7; §4c claims BIC-18 "read-only says why"). Test: a GET on a recorded case returns `read_only` with the reason, and the card shows it with no button.
* **m6. The origin line on B does not name the earlier case's reference.** It reads "earlier case, re-confirmed", while challenge B1's fix asks for "Earlier case: VV-0001, re-confirmed 9 Nov". This can be fixed together with M1.
* **m7. The graph lists both routes as untested and GET as "no page uses it".** The graph does not read `acceptance/*.test.ts` or `useApi` template URLs. The routes are tested by the pack and the walk. `qa/CAPABILITIES.md` still says C6.19 is "Not built". This is a records and tooling note, not a code fix.

## D1-D20 (1-5)
| D | Score | Evidence |
|---|---|---|
| D1 | 4 | All BRs built and tested. Deviations are recorded (Q2 people only, Q3 amendment, m2/m3 follow-ups) |
| D2 | 3 | Locks, stale ids and P2002 hold; the double POST gave 201/409. Giver provenance is lost on copies (M1) |
| D3 | 5 | Reuses `checkValue`, `factState`, `confirmation()` and the C1.3 pattern; no migration |
| D4 | 4 | Expiry rules held as data, failing closed; covered facts are flagged together; "unknown" when no date |
| D5 | 4 | Reload after a 409; a double click is refused; nothing is written on refusal |
| D6 | 3 | Each rule has a recorded date, but it shows a day early (M2) |
| D7 | N/A | No AI |
| D8 | 4 | The card names the earlier case, its combination and when it was opened |
| D9 | 4 | Tick, then one button, then the Agent view; walk shots 01-04 |
| D10 | 3 | Plain words, but ISO dates and dates that disagree (m2) |
| D11 | 4 | Toast, "Nothing to offer", a 409 notice with Reload, a skeleton |
| D12 | 4 | Team look (shots 01 and 05); the reason column is cramped at 200 % (m3) |
| D13 | 4 | axe 0; keyboard reaches each tick, chip and link; tooltips open on focus; no page scroll at 400, 512 or 1024 px |
| D14 | 4 | The same card pattern as C1.3 |
| D15 | 4 | Card visible about 1.0 s after navigation; up to 5 earlier cases read per request |
| D16 | 4 | One pass and one fail per BR; nothing covers the giver or the cited date in the browser (M1, M2) |
| D17 | simulated only | |
| D18 | 3 | Origin and verifier are shown, but the giver is lost (M1) and the citation date is wrong (M2) |
| D19 | 4 | Open a case → offer → copy → Agent view and Confirm (C6.3); demo row 18 is partly met, as recorded (Q2) |
| D20 | simulated only | |

## BIC scorecard (§6)
01 Met (shot 03 "Nothing to offer" after the copy) · 02 N/A · 03 Met (an expired value cannot be ticked; shot 05) · 04 N/A · 05 Partly (case and date shown, "by" missing, m1) · 06 N/A · 07 Met (Different shows both; pack BR-5) · 08 Partly (as the concept claims) · 09 N/A · 10 N/A · 11 Met (one primary) · 12 N/A · 13 Met (stale, expired and refused messages in words) · 14 Met (chip tooltips on hover and focus, probe) · 15-17 N/A · 18 Partly (no card when empty; a recorded case does not say read-only up front, m5) · 19 Met (grouped by person) · 20 Met (native controls, axe 0, 200 % with no page scroll; m3 cramped).

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* canada.ca live (quotes were checked against the committed page only).
* Concurrency between two browsers in the UI (checked by API only).
