# Walk 1 rehearsal (uncounted) on the open Bake work combined

**Mode:** `/qa explore` as an uncounted rehearsal of walk 1 (BK-6), like walk 0. Asked by the session that started this one, reporting to the current tech lead (Lead 22). **Never claims Works:** walk 1 counts only on `main` once every Bake row has merged, from a fresh demo database (P-447 (1), P-449).
**Tested on:** a local integration branch, never pushed: `origin/main` **24b0b92a6** (#1609) plus, merged in this order:

| PR | Head | Merged? |
|---|---|---|
| #1580 BK-4a sign in by role, one picker | 3b847fabb | yes |
| #1583 QA-401 a change of person re-reads the review | fb90686cc | yes |
| #1589 BK-4c case hand-offs | a5fdd32f7 | **skipped: conflicts with `main` itself** (`web/src/runtime/cases.tsx`; its "dequeued" label) |
| #1588 QA-403 the firm's facts are the case officer's | 7e7405d45 | yes |
| #1566 QA-395 IMM 5257 Q8 A | 2f1379ee1 | **skipped: conflicts with #1588** (`p5/transforms.ts`, `engine/form-values.ts`) |
| #1591 BK-15 fees per family member | 7fa784394 | yes |

No other open Bake PR was approved at the time (#1612 is a draft). **Live AI off** (the isolated copy never set `STUDIO_AI_LIVE`), **US$0**, no priced button pressed (P-175). 12 Nov 2026, ~08:55-09:40 IST.
**How:** one fresh isolated copy (`qa_r1`, :4471, fresh database, stopped at the end); Chromium on a virtual display at 1440 × 1000, driven step by step through the screens as a fresh reader (walk 0's driver, `2026-11-12-walk-1-rehearsal/scripts/`). Set-up data: Demo › Load the configured checkpoint… by screens (97 s; scaffolding, P-33), as walk 0. Client answers by the screen filler (`answer2.js`). Evidence: `2026-11-12-walk-1-rehearsal/` (28 screenshots, the client's prompts as shown, the spouse's IMM 5476 values read back).

## 1. Verdict
The journey **completes** on the integration: sign-in by role → start page → a named change on Visitor visa released as **Release 7** (N+1) → family case → Client A → officer → representative's review (3 filings approved) → filled, read-back copies; and the Study permit family case → Client A → officer → copies → per-member fees. **Rehearsal findings: 1 Critical, 3 Major (all on the journey), 7 Minor (one list).** Walk 1 would not pass E3 today on these alone; E1's person changes would also count 3 picker changes on the case half while #1589 is out.

## 2. The walk (Visitor visa: set-up → release N+1 → case → forms)
| # | Step | Person, and how it changed | What happened |
|---|---|---|---|
| 1 | `/sign-in` → "Sign in as Configuration author" | author (sign-in card; the only typed choice) | Four cards and "More people (5)"; lands on Immigration programs. `/` alone also lands as the author (P-484 (3)) |
| 2 | Demo › Load the configured checkpoint… | author | 97 s; Visitor visa live in Release 6 |
| 3 | Visitor visa › Documents › Add a document: Marriage certificate copy, Spouse or partner, Base | author | "1 draft change". Save with nothing chosen does nothing and says nothing (M1) |
| 4 | Review and release › Submit for review → **"Hand to the Content reviewer →"** | content reviewer, **hand-off button** | 0 errors, 35 warnings |
| 5 | Select all I can sign → Sign 1 → **"Hand to the Approver →"** | approver, **hand-off button** | |
| 6 | Approve and release | approver | **"In Release 7"**; "Open a case on Release 7 (as Case officer) →" |
| 7 | That button → Open a case (W1R-FAM-1, Client A); Add spouse, Add child | case officer, **named button** | Picker lists "Visitor visa · release 3" for Release 7 (QA-408). **The named change reaches the case:** the spouse owes "Marriage certificate copy" |
| 8 | "Open it as Client A (simulated)" | Client A, **hand-off button** | 62 parts; totals jump 56 → 55 → 63 → 69 → 62 (QA-388); a second pass finished the 5 skipped; "Every part is answered" |
| 9 | Back to the firm | case officer, **picker** (no button: #1589 out) | "As the case officer, review and change answers on the case page" (right for this person) |
| 10 | Agent view: the 3 firm facts #1588 moved to the officer | case officer | Asked in plain words, free text: "appoint" fills; "Visitor visa" for the kind goes by hand (QA-415 b) |
| 11 | Confirm section, every person | case officer | Counts disagree (QA-417) |
| 12 | Generate a copy (9 forms) | case officer | All "read back and checked"; spouse's SCH1 now "No", "worked out for each person from their role; never asked": **QA-400 holds fixed** |
| 13 | Send for review › Send 3 filings → Open the review | case officer | Read-only for the officer (right) |
| 14 | Picker → Representative | representative, **picker** | **Approve and Send back appear at once, no reload; back to officer they go, back to representative they return: QA-401 fixed by #1583** |
| 15 | Approve × 3 | representative | All 3 approved |
| 16 | Back on the case | representative | Readiness 20%; Ready to file: signatures, documents, IRCC office line, 4 by-hand boxes per adult (QA-415 b), a passport-expiry finding: past the journey's end |

## 3. The Study permit family case
| # | Step | Person | What happened |
|---|---|---|---|
| 1 | Cases › Open a case: "Outside Canada · release 1" → case headed "Release 2" (QA-408); Add spouse, Add child (accompanying) | case officer (picker, from step 16) | A brand-new case shows "Answers to fix: Area code and telephone number" (M3). Fees: "Waits for Sample Child B's answer …" |
| 2 | Open it as Client A; answer | Client A, hand-off button | Cost boxes refuse "Sample" with "Enter a number of 0 or more, digits only" (good). 46 of 46 parts, "Every part is answered" |
| 3 | Back to the firm; Confirm every section | case officer, **picker** | 92 to confirm on the household line, 139 Declared answers, all in sections reading "0 to confirm" (QA-417) |
| 4 | Generate copies (IMM 1294, 5476, 5707 per adult; 1294, 5476 for the child) | case officer | All read back; Fees still wait on the child (QA-418) |
| 5 | Agent view › Sample Child B "1 missing": "Will this person study in Canada for 6 months or more?" Yes | case officer | Fees appear: CAD 725 (student 150 + 85, spouse **work permit** 155 + 100 + 85, child 150 + biometrics 0 under 14, biometrics family maximum 170). **BK-15 works as data** |
| 6 | Kind of application "student" → regenerate | case officer | The spouse's IMM 5476 reads `application = student` while the spouse's filing is a work permit (QA-415 a); the spouse's filing holds IMM 1294 (QA-416) |
The representative's review of the Study permit case was not walked (the Visitor visa case covered C8.3).

## 4. Findings (all tagged "rehearsal, integration of main 24b0b92a6 + #1580 3b847fabb + #1583 fb90686cc + #1588 7e7405d45 + #1591 7fa784394")
**Critical and Major (in `qa/BUGS.md`, each PR commented "Rehearsal finding for the tech lead"):**
* **QA-415 · Critical · #1588.** "Which kind of application is this case: visitor, worker or student?" is one free-text answer for the whole application, written on every member's IMM 5476 and IMM 5645: the Study permit spouse (billed a work permit) gets `application = student`; on Visitor visa the natural "Visitor visa" leaves IMM 5645's four boxes by hand for each adult, the same line listed 4 times. Expected: worked out per person from their filing.
* **QA-416 · Major (Conflict) · #1591 and release data.** The Study permit spouse is billed "Work permit" (+ open work permit holder fee) but files IMM 1294, the study-permit form, filled with the study details. The expert decides which; fee and forms must agree.
* **QA-417 · Major · main** (walk 0 saw it, no row). Household "91/92 to confirm" vs every section "0 to confirm" with "Declared ✓" answers; Confirm section on such a section changes them; on an empty section it does nothing, silently.
* **QA-418 · Major · #1591.** Fees "wait for Sample Child B's answer" to an officer-only question the client never sees; no link.

**Minors (one row, QA-419):**
* **M1** (main; C4.9) Visitor visa › Documents › Add a document: Save to draft with no document type and no new name does nothing, no message (shot 12).
* **M2** (main; C6.2, C7.1) Country questions are free text with "No fixed list": a date was accepted as "Country or territory of birth" and confirmed; at fill, "Republic of India" goes by hand, "india" fills (shots 47, 49). The filler's wrong values are the filler's; the missing list is the finding.
* **M3** (main; C6.2) Study permit client part "Section B: appointment of representative" asks the client's own telephone; a new case opens with "Answers to fix: Area code and telephone number" before anyone answered; Ready to file later says the spouse's IMM 5476 "Area code and telephone number has a problem".
* **M4** (main; C6.2) A client prompt shows a file name: "Quebec Acceptance Certificate (CAQ) number (as asked on imm1294e.pdf)".
* **M5** (#1588 remainder; C6.2) The Visitor visa client is still asked "Kind of temporary resident visa requested (visitor or transit)" and "Whether the applicant uses the services of a representative, or is appointing, updating or cancelling a representative's appointment (IMM 5484 p. 1; IMM 5476)" (part 4, `client-parts-visitor-visa.txt`).
* **M6** (main or #1583; C8.3) The review's "Facts on this form" for the spouse's SCH1 lists "Date of birth · Sample Spouse A" three times (shot 55).
* **M7** (QA-407 again) The review reads "Sent … Nov 11, 2026, 10:52 p.m." for copies made "12 Nov, 03:47": not just two zones but two dates.

**Seen again, rows already open:** QA-388 (part totals jump, 5 parts skipped), QA-405 (part titles: "Statutory declaration of common-law union" under a parent, "Section B - children"), QA-406 ("will accompany" for travelling members), QA-408 (release numbers), QA-402 (the visit-purpose-other question is asked before the purpose and always). **Retests on the integration (not counted):** QA-400 fixed (main), QA-401 fixed (#1583), QA-403 the three facts now the officer's (#1588), with QA-415 as its new defect.

## 5. Person changes and walk 1's counts (P-456)
Set-up half: 0 picker changes (2 hand-off buttons, 1 named button). Case half, Visitor visa: 1 hand-off button (officer → Client A), **2 picker changes** (Client A → officer; officer → representative) plus 2 more only to retest QA-401. Study permit: 1 hand-off button, **1 picker change** (Client A → officer). Typed logins after the first: **0**. Dead ends: **0**. Places a cold reader needs help: **2** (QA-417 which sections to confirm; QA-418 where the fee question is). The 3 picker changes become buttons only with #1589, which conflicts with `main`.

## 6. Not done, and why
* Headless replay at 400/1024 px, axe, coverage and suites: not run (rehearsal; BK-6 does it on `main`).
* #1589 and #1566 not in the walk (conflicts, above); a second integration with #1589 rebased would show BK-4c's hand-offs.
* The shared demo (:4400) was not used. No replayable checks added for QA-415 to QA-419 (rehearsal; the owning lanes or BK-6 add them; QA-415's evidence is the read-back value file).
* My own slips, kept honest: I typed "student" into the appoint line once and "appoint" into the IRCC office line (both corrected or left visible in shot 77; the office line is free text and took it: part of M2's pattern). The filler typed the same family name for both adults.
* D17, D20: simulated people only.

## 7. Questions for the tech lead
1. **QA-415's fix:** work the kind out per person from the filing (recommended: the case knows each filing), or a per-person choice list asked of the officer? *Recommend worked out: no question, as QA-400's fix did.*
2. **QA-416:** which side is right for a Study permit spouse, the fee (work permit) or the forms (IMM 1294)? *The immigration expert's call; until then I recommend the fee follows the filing's forms, Sample.*
3. **QA-417's severity:** Major, as the cold reader cannot tell what is left; Minor if "Declared ✓" is meant as needing nothing. *Recommend Major.*
