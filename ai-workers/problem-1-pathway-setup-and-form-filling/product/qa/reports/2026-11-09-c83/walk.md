# C8.3 gate A walk by screens, main cfaa199f4, 9 Nov 2026, 18:02–18:12 IST

Isolated copy qa_c83 on :4473 (`--ttl 60`). Configured checkpoint loaded **by screen**: Demo › Load the configured checkpoint… › Load (`scripts/load_checkpoint.cjs`; "Configured checkpoint loaded in 115.0 s"; shots 00a, 00b). Headless Playwright at 1024 px, deviceScaleFactor 2, one pass. Every press was on a control a person sees (role and name). Page words are in `walk-log.txt`. Live AI off, US$0.

**Setup, not under test:**
* `scripts/setup_c83_case.mts`: a represented Visitor visa family case (principal and spouse), every fact answered and confirmed, each IMM 5257 validated copy read back. This is the C8.3 pack's own first part. **Nothing is sent for review.**
* `scripts/setup_c83_files.mts`, after the review: the Adobe read-back of the IMM 5257s and the hand-signed IMM 5476 scans. These are the pack helper's simulations; there is no screen for the Adobe step. It does **not** use `readyToFile`'s C7.6 review route, and it passes no warning.

## The walk
| # | Who | Step, by screen | Seen (words from the page) | Shot |
|---|---|---|---|---|
| 1 | Case officer | Case › Ready to file › **Send for review** | Dialog: "Send for review: the representative of record checks each form and approves it or sends it back." Both filings were ticked by default ("20 open warnings" each, no block). "Send 2 filings for review". | 01–04 |
| 2 | Case officer | Ready to file after sending | Each filing reads "Sent for review · Open the review". | 04 |
| 3 | Representative | Case › **Open the review** | "Representative's review · Round 1". Each form reads "To check". Checklist: "Values confirmed: 69 facts, by Case officer (Sample)", "All required documents verified (when sent: 0 of 3)", "No open critical warnings (live: 7)", 3 program items marked "· Sample". Facts table with who typed and who confirmed. | 05, 05b |
| 4 | Representative | Spouse's filing: ticks the 6 items, **Approve**, Approve | The dialog says "Each form is stamped with its file and the facts it read…" and "7 open critical warnings · They stay on Ready to file". Afterwards the filing reads "Approved", each form "Approved, still current", and each tick shows "Ticked by Representative (Sample), <time>". | 06–09 |
| 5 | Representative | Principal's filing: **Send back…** with no reason, then with a reason | With no reason: "Say what should change, and on which form (at least 5 characters, with words)." With "IMM 5257: the city of birth does not match the passport…": the filing and its forms read "Sent back", with the reason quoted. | 10–12 |
| 6 | Case officer | Ready to file | The principal's filing reads "Sent back · Open the review". **The reason is not on the case page**; it is one click away, on the review page (read-only: "Only the representative of record approves or sends back. You can read this review.", no Approve or Send back buttons). | 13, 16 |
| 7 | Case officer | Sample Client A tab › City or town of birth › **Edit** › SAMPLEVILLE › Save › **Confirm section** | "Entered by staff · to confirm", then "Confirmed". | 17–19 |
| 8 | Case officer | **Send for review** again | "Visitor visa: Sample Client A · Blocked: 1 block · 21 open warnings" was not ticked by default (BR-1): the IMM 5257 copy must be read back again. The spouse's line: "Approved: sending it again withdraws the approval". The principal was ticked by hand, then "Send 1 filing for review". | 20–23 |
| 9 | Representative | Open the review → **Round 2** | Only IMM 5257 reads "Changed since review": "City or town of birth · Sample Client A · SAMPLE → SAMPLEVILLE · Case officer (Sample), Nov 9". "Only changed facts" is on. Footer: "6 checklist items not ticked · 1 form changed since review · 8 open critical warnings". | 24, 24b |
| 10 | Representative | **Approve** with nothing ticked | "Approve with 6 items not ticked? … Approve anyway? This is recorded." Then "Approved"; "Rounds of this filing: 1 sent back · 2 approved". | 25, 26 |
| 11 | Case officer | Spouse tab › City or town of birth → SAMPLETOWN › Save › Confirm section | The edit dialog names its reach: "fills IMM 5257 for Sample Spouse A (1 form field)". Ready to file, spouse: "**Approval withdrawn** · Open the review". | 27 |
| 12 | Representative | Open the review | Only the spouse's IMM 5257 reads "Approval withdrawn: City or town of birth changed by Case officer (Sample), 9 Nov 2026." (SAMPLE → SAMPLETOWN). The other 3 forms stay "Approved". Button: "**Re-approve 1 changed form**". | 28, 28b |
| 13 | Representative | **Re-approve 1 changed form** | "Round 3 · Re-approved after a change"; the filing reads "Approved". | 30 |
| 14 | (setup part 2) | The Adobe read-back of both IMM 5257s; IMM 5476 signed and scanned | Ready to file still reads "Approved" for both filings; no review line is open. | 31 |
| 15 | Case officer | **Pass with a reason…** on each of the 40 remaining warnings (no copy, mandatory boxes, handwriting, missing signature, missing documents), then **Ready to file** on each filing | Both filings read "Ready to file · Approved". "Record the submission…" is enabled. | 32 |
| 16 | **Next capability, C8.2** | Case officer (stage 6) › **Record the submission…** | The dialog opens: "One record for the whole submission, as IRCC acknowledged it through APR Portal…". | 33 |
| 17 | C8.2 | Representative of record (stage 7), the dialog again: application numbers W123456789 and W123456790, today › **Record the submission** | "Recorded · read-only"; each filing reads "Submitted" and "**Prepared by · Reviewed by: Case officer · Representative**". | 34, 35 |

## Data underneath (psql on the copy)
* `review_round`:
  * 1 `send`: principal `sent_back`; spouse `approved` / `reviewed`.
  * 2 `send`: principal `approved` / `reviewed`.
  * 3 `reapprove`: spouse `approved` / `reviewed`.
* `filing_review`: 3 rows by user-R, `reviewed`, licence R000000. They were written at 07:34, 07:36 and 07:37 (Toronto), one per approval.
* `review_round_form`:
  * Round 1: the spouse's IMM 5257 was stamped `validated_copy` with sha f59a30c4…, and its other forms `none`. The principal's forms were frozen and never stamped (sent back).
  * Rounds 2 and 3: **every form is stamped with `stamp_file_kind = none`**, including both IMM 5257s, the barcode forms that were then filed. Each stamp's `stamp_hash` equals its frozen `facts_hash`.
* **Observation:** both approvals stayed "Approved, still current" after the new validated copies and signed scans were uploaded (step 14). The filed IMM 5257 copy is therefore under an approval that holds no file fingerprint.
  * This follows concept BR-7: a stamp counts while the facts hash and the representative are unchanged.
  * The row's words are "each approved form is stamped with its file fingerprint and answer snapshot".
  * The approve dialog says "Each form is stamped with its file and the facts it read".

## Replay
On the same copy, the builder's `tests/check_c83_review_browser.cjs` ran **23/23** at 1440 px. It covers:
* axe, WCAG 2.2 AA (3 views);
* keyboard ticks and Approve;
* the stale-hash 409 "Changed while you were reading: reload. Nothing was stamped.";
* the solo self-review re-approve;
* the empty and loading states.

## Not covered
* One pass, 1024 px only; 400 and 1440 px were covered only by the builder's walk at 1440.
* No headed browser in this cloud copy.
* One case type (Visitor visa family).
* The client's view.
* Two tabs, and a reload mid-decision (the builder's walk covers the conflict path).
* In stage 2's first try, a checkbox click "did not change its state" while the page re-rendered. The retry, with waits, ticked all 6. It was not reproduced.
* A fact label shows twice in IMM 5476's facts table ("What this use-of-representative filing does…", value SAMPLE from the setup filler). The cause was not traced, so it is not logged.
