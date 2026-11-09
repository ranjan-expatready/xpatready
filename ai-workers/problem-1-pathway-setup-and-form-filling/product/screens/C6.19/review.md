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

## Round 2 (diff-only, dcfe4188e)

Same independent reviewer, 9 Nov 2026. Scope: `git diff 2f20d282b dcfe4188e` only. Between those commits, the records-only commits are: the qa/built line, the ASSUMPTIONS row moved to `assumption-proposed.md` (ASSUMPTIONS.md is back to main), and the Lead's approval in challenge.md. I ran my copy on :4435 only (`isolated.sh rev2_c619`, from the tree at dcfe4188e). It was stopped and dropped afterwards. All values are Sample. US$0. Unconfirmed: no counsel.

Verdict: Approve dcfe4188e21dff27a5978889bf95fffda74c8cd1

0 Blockers and 0 Majors are open. All four round-1 Majors are fixed, and each has a fail test that would fail on 2f20d282b. The fixes add no Blocker or Major. Journey score: the round-1 **8/10** (`journey-test-reviewer-2026-11-09.md`) stands. Its two journey-visible defects (the giver, and the cited date) are now fixed in the walk's shots 04 and 07. This round re-walked the scripted path only, not a new unaided journey.

### What I ran
* **Pack** `acceptance/C6.19.test.ts 4435 xr_studio_rev2_c619`: **68/68, exit 0**.
* **Walk** `check_c619_earlier_facts_browser.cjs 4435 <scratchpad>`, with the browser context in America/Toronto: **16/16, exit 0**. axe found 0 violations in both card states. No sideways scroll at 1024 or 390 px. No page errors.
* **My own probes:**
  * **Answer-sheet probe.** I opened a new Visitor visa case for the pack's client and copied the client's own date of birth from pack case A. `GET /runtime/items/<IMM 5257>/answer-sheet` reads `"value":"1985-03-14","source":"Client"`, the same as on A. In round 1 it read "Case officer".
  * **Timing.** The offer GET read 19 earlier same-client cases in 130-230 ms.
  * **Client login is fixed.** `clientActorId` is non-null and written only at `case.create` (`runtime.ts:188`). A case's client login never changes, so the new login filter cannot be bypassed.

### The four Majors
| Major | Fixed? | How | Fail test |
|---|---|---|---|
| Review M1: a copy loses its giver | **Fixed** | `earlier-facts.ts:147` now copies the earlier answer's own `from`, so `state()` (`runtime.ts:361-365`) rebuilds `origin` as the first giver. Where the copy came from moves to a separate, additive `copiedFrom` / `copied_from` (`engine/runtime/case.ts:31`, `:397`; `contracts/runtime.ts:132`). `case-prepare.ts:763` (`origin?.channel ?? channel`) therefore reads the same source on A and B. The Agent view adds "· copied from <ref>, re-confirmed by <role> <when>" (`questionnaire.tsx:841`). | Pack "BR-4 (review M1)": the giver on B equals the giver on A for every tick, and `copied_from` names A and the representative. Pack "BR-4 fail (review M1)": the client's own copy reads `questionnaire\|user-P`. Walk: the Agent view line keeps "Agent view · Case officer" and adds "copied from …". My answer-sheet probe: "Client". |
| Review M2: the canada.ca recorded date shows a day early | **Fixed** | `earlier-facts.tsx:31` formats `${recorded}T12:00:00Z`, and noon UTC is the same calendar day in Toronto. Both rule sources hold a date-only `recorded` ("2026-10-27"). | Walk "BR-6 (review M2)": on a Visitor visa case with the browser zone set to America/Toronto, the row reads "recorded 27 Oct 2026" (shot 07). |
| Breaker M1: empty, newer same-name cases crowd out the real earlier case; 500-row scan | **Fixed** | `candidates()` (`earlier-facts.ts:48-54`) keeps only cases opened before this one (`createdAt lt`) for the same firm and client login. `list()` reads the newest 20 and puts the cases that offer facts first, then caps the list at 5. POST looks up the named case directly (`only`), with no cap, so a case that passes the filter is never 404. The query is bounded by the client login, and at most 1000 rows are read before the name filter. | Pack "BR-1 (breaker M1)": six empty cases are opened after A; case E still lists A, and the first listed case has facts. Pack "BR-1 fail (breaker m3)": A is not offered B. |
| Breaker M2: matching ignores the client login | **Fixed** | `candidates()` filters on `clientActorId: c.clientActorId`. A client answer on an earlier case can therefore only be this case's own client's. | Pack "BR-1 fail (breaker M2)": the same name under client login user-Q is offered nothing. |

### Other changes checked (no new Blocker or Major)
* **`firmToday()`** returns the America/Toronto calendar day as UTC midnight. `expiryFlags` compares UTC day numbers (`engine/runtime/earlier-facts.ts:48`), so the two agree. This closes breaker m8's fail-open window for the Sample firms.
* **zod duplicate refine:** `take:[x,x]` returns 400 and nothing is written (pack "breaker m1").
* **Pre-transaction offer check:**
  * A take whose subject or fact is not offered is refused with 409 "Not offered" before any `FOR UPDATE` or `FOR SHARE`. This closes breaker m2's oracle and its foreign-row locks.
  * Concurrent duplicates still meet the lock and the `seen` check inside the transaction. A second press after a successful copy now gets "Not offered … Reload" instead of "Changed since you looked". It is still a 409, still offers Reload in the card, and still writes nothing.
* **`recorded` on the GET** (review m5): the card disables the ticks, hides the button and shows a "Read-only" notice. The POST still refuses inside the transaction.
* **NFC name normalisation** (breaker m7) and **the rule's source in the refusal** (review m4) are both covered in the pack.

### New Minors (Should, follow-ups; none block)
* **n1.** The refusal text prints the cited date as ISO: "(canada.ca, …, recorded 2026-10-27)" (`earlier-facts.ts:125`). The card shows "27 Oct 2026". This belongs with the open review m2 (dates in words).
* **n2.** On a recorded case the disabled ticks carry no `aria-describedby` pointing to the "Read-only" notice, and the notice sits below the table. A screen-reader user meets disabled boxes before the reason.
* **n3.** The firm's "today" is fixed to America/Toronto for every firm (`FIRM_ZONE`). It is right for the Sample firms, but it is not recorded as a Sample assumption. Add it to `assumption-proposed.md`, or give it a firm setting later.
* **n4.** The records are stale against the fix. `qa/built/C6.19.md` still says the Agent view shows "earlier case, re-confirmed" and gives the pack as 61/61. The pack is now 68/68, and the line reads "copied from <ref>, re-confirmed by …".
* **n5 (nit).** The `earlier_case` entry in `CHANNEL` (`questionnaire.tsx:734`) and the export `EARLIER_CASE` (`engine/runtime/earlier-facts.ts:14`) are no longer used.

### Follow-ups still open from round 1 and the break (as the builder listed them)
* Review m1 / break m4: who confirmed the fact on the earlier case is not shown.
* Review m2: dates disagree across the page, ISO dates in the card, and the ISO Sample text.
* Review m3 / break m6: the Status column is cramped at 200 % zoom.
* Break m5: focus falls to `<body>` after a refused press.
* Review m7: the graph does not see the routes' tests.

## Round 3 (merge of main, diff-only, e117d76a3)

Same independent reviewer, 9 Nov 2026. Scope is the merge only (P-318 (1)): `git show e117d76a3 --cc` and `git diff 0f271240f e117d76a3`. Main is 967388518 and the merge base is fc49dc5a4. I ran my copy on :4435 only (`isolated.sh rev3_c619`). It was started and stopped in one command, and dropped afterwards. All values are Sample. US$0. Unconfirmed: no counsel.

Verdict: Approve e117d76a38fe55349f733fb47a8d341f30a5ea9c

0 Blockers and 0 Majors. The merge changes no C6.19 file. The one conflict is resolved correctly. Nothing that main brought changes what C6.19 offers or copies, or who the giver is. Journey score: the round-1 **8/10** (`journey-test-reviewer-2026-11-09.md`) stands. No C6.19 file changed, so this round re-ran the scripted walk only, not a new unaided journey.

### 1. Conflict resolution (`questionnaire.tsx` CHANNEL)
* The merged map is the union of both sides. Main added `document_read: "read from a document"` and `checked_against_document: "checked against a document"`, and the branch's `earlier_case: "earlier case, re-confirmed"` is kept. Nothing was dropped or renamed.
* The other `questionnaire.tsx` hunks are main's alone, and none of them conflicted:
  * `WHO`, `toValue`, `toDraft`, `putAnswer` and `refusal` are now exported.
  * `DocumentsButton` is imported and placed in the `AgentSection` header.
  * The C6.19 line at `:844` ("· copied from <ref>, re-confirmed by …") is unchanged.
* `earlier_case` is still an unused key, as round 2 n5 noted, because a copy keeps its original channel. Keeping it in the resolution is harmless.

### 2. What main brought, against C6.19's code
* **The C6.19 files are untouched.** `git diff 0f271240f e117d76a3 --stat` shows no change to any of these:
  * `api/src/earlier-facts.ts`
  * `engine/runtime/earlier-facts.ts`
  * `api/src/runtime.ts` (`state()` / `copiedFrom`)
  * `engine/runtime/case.ts`
  * `contracts/runtime.ts`
  * `web/src/runtime/earlier-facts.tsx`
  
  In product code, main changed only `api/src/case-documents.ts` (+37/-6), the new `web/src/runtime/documents-drawer.tsx`, and `questionnaire.tsx`. The rest of main's change is tests and tools (`acceptance/C6.5*.test.ts`, `tests/check_c65_documents_api.ts`, `tools/gate-b.mjs`, `tools/check-gate-b.mjs`), which C6.19 neither imports nor runs.
* **The document channels are not new to this branch.** `document_read` and `checked_against_document` were already written by `case-documents.ts` at the approved head 0f271240f (lines 403, 475 and 503 there). The merge adds three things to Confirm & use:
  * the L-SA9 tick gate (`ConfirmBody.checked`, `needsLook`, 422 `not_checked` / `not_this_document`);
  * `needs_look`, `check_digits` and `evidence` on the GET;
  * a narrower `differs` for values left for a person.
  
  None of these touches how answers are read by `state()` or by `offerFrom`.
* **The offer.** `offerOf` filters earlier answers only on `rowKey`, UUID and `channel !== FIRM_RECORD` (`earlier-facts.ts:68`). An answer written by C6.5 is therefore offered like any other current single answer, both before and after the merge.
* **The copy.** The copy keeps `channel`, `actor`, `at` and `from`, plus the `earlier_*` / `reconfirmed_*` markers (`:147`). It also keeps `status`, `verifiedBy` and `verifiedAt`. The giver of a document-read answer is still the officer who confirmed the document, and `copied_from` is still said apart. The only visible change is that such a copy's Agent view line now reads "read from a document · …" through main's new label, where before it fell back to "answered · …". The copy drops `document`, `page` and `reader` from the source. The merge does not change that, and no code at e117d76a3 reads them back from a current answer: the drawer and `case-documents.ts` only write them.
* **The other direction (a C6.19 copy is the current answer when a document is read).** `needsLook` and `differs` compare values only, so a copy is treated like any current answer. If the copy agrees with the document, Confirm & use writes a VERIFIED version with `from: <copy id>`. `state()` then shows the copy's kept channel and giver as `answered`, so the first giver stays visible. This path existed before the merge, at 0f271240f line 403.

### 3. P-425
* The merge diff touches nothing under `engine/`.
* Its added lines in `api/`, `web/`, `contracts/` and `tools/` contain no combination key, no `combinationKey` and no program name or branch. I grepped them for combination, express, cec, fsw, pnp, visitor, work_permit, study and program, and found no hits.

### What I ran (merged head, my own copy)
* **Pack** `acceptance/C6.19.test.ts 4435 xr_studio_rev3_c619`: **68/68, exit 0**.
* **Walk** `check_c619_earlier_facts_browser.cjs 4435 <scratchpad>`: **16/16, exit 0**, with no page errors. The shots went to my scratchpad, not to the screens folder.
* **Type-check:**
  * `web` `tsc --noEmit`: exit 0.
  * `api` `tsc --noEmit`: exit 2. All 15 errors are in old test files that neither the merge nor C6.19 touch (`tests/check_c18_age_case.ts`, `check_c69_runs.ts`, `check_cost_check.ts`, `check_vv_checklist.ts`, `check_x2b_bulk_apply.ts`). `api/src` and the C6.5 / C6.19 tests are clean.
* The copy was stopped, and its database and files were dropped.

### Minor (Should, follow-up for the C6.5 drawer's owner; not this PR's to fix)
* **d1.** `documents-drawer.tsx:264` (`answerBy`) describes a current answer only by its channel and giver: "Client A typed it", "you entered it". For a C6.19 copy, that is the giver on the earlier case, which is true, but the drawer does not say that the value was copied from <ref>. The Agent view line does say so. Showing `copied_from` there too would keep the two in line.

### Note
* The working tree holds uncommitted changes to `screens/C6.19/screenshots/01…07` (the builder's re-walk). They are not part of e117d76a3, and I did not touch them.
