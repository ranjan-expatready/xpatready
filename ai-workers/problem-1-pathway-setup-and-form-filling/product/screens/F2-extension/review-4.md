# F2 — Browser extension and forms ingestion: review-4, Pass A + Pass B after the FIX (independent reviewer, 26 Oct; app code 69fb92d, head 0d9e4d9)

**Verdict: Ship after fixes. Journey score 8.5/10: a pass (8 or more, no criterion at 0). 0 Must · 2 Major · 6 Minor.**
* **Review-3's two Majors are gone.** Approving a copy of a held edition no longer loops. Pairing now has a rate limit kept in the database.
* **The breaker's Majors are gone.** Remove now takes the capture's revision. Every unknown-markup page is "Not read".
* **Two new Majors, each a one-line fix:**
  * The new server-wide pairing limit can be set off from one address.
  * The demo story's row 1 now attaches a sponsorship form (IMM 1344) to the Visitor visa.
* Nothing ever sent a typed value.

Method: skills `screen-review` and `journey-test` (reviewer role). Isolated copies on 4420–4428, with the Sample APR server on 4429 over https under `apr-portal.sample.test`. Headless Chromium, so the founder's screen was not disturbed. Stub and replay only: every ledger line settled at US$0. My script, log and shots are in my scratchpad (`rv4/j.mts`, `notes.txt`, `shots/`). The lane copy was left as I found it: tracked ledger files restored, my tickets, jobs, databases and `var` folders removed, `git status` clean. The caller asked for this file only, so the journey report is in this file.

## Suites re-run on 69fb92d (exact results)
* `f2b` 50/50 · `f2c` 38/38 · `check_forms_demo` 21/21 · `p80_guard` 41/41 · `pdf_hardening` 49/49 · `f2a_api` 34/34 · `apr` 46/46 · `f2d` 37/37 · `f2a` 60/60 · `f2c_fill` 17/17. Total 393, 0 failed.
* `apr` and `f2d` hardcode portal ports 4453 and 4459. I ran copies in `studio/var` (gitignored, since deleted) with only the portal port changed (4429, 4428).
* `graph.mjs --check`: G1 0 · G2 0 · G3 2 · G4 0 · G5 1 · G6 0, exit 0. The F2 one is G3 `GET /capture-template.csv`, a false positive: `channels.tsx:200` links to it with a plain `href`.

## Verified (what I saw)
* **Review-3 Major 1 (loop): gone.** I uploaded a copy of IMM 5257 SCH1 while the library held that edition.
  * The upload said at once that "The library already holds IMM 5257 SCH1 (09-2023) from the official file, so this copy is not needed".
  * The reviewer's Approve gives 409 and leaves the item HELD, with a toast telling them to reject it. Reject → DONE, 0 items held.
  * A copy of a new edition (IMM 1344) was approved by the second person (the uploader sees no Approve). It was read in 827 ms. The draft dialog opens on the stub pass with Live disabled and a reason. Stub draft: COMPLETED in 3.2 s.
* **Review-3 Major 2 (rate limit): fixed.** 70 wrong codes from one address: 59 × 401, then 429. An `X-Forwarded-For` header does not get round it. `f2b` shows a restart keeps the count. The right code works a minute later. But see Major 1 below.
* **Breaker: remove by position, and reader gaps — both gone.**
  * Remove from a stale list: 409, nothing removed. Remove with no revision: 400.
  * After removing screen 2 and capturing it again, the order is still Application > Personal > Marital > Languages > Passport.
  * In the panel, every live page with unknown markup says "Not read … Nothing was sent": closed shadow, nested shadow, open shadow, frame, foreign frame, object, combobox, and unlabelled (`mat-input-0`).
  * `live-ok-label-is-id` still opens the check list.
* **Pass A:**
  * `wrong_tries` rises in the database (1 after one wrong code).
  * Picker: no approval-code column; a line saying every file is on the approved list; Kind filter (37 → 14 forms); search ("5707" → 2, "zzz" → "No official file matches"); Attach works by keyboard.
  * A returned capture resumes after a panel reload, with the reviewer's note and why Finish waits.
  * Moving the tab clears the check: "The portal moved to another screen: nothing was sent".
  * Ids that look like client details are dropped: `f2c` 38/38.
  * P-80: the approved file is drafted, and the held file has no attachment (0). `p80_guard` 41/41 covers the refusal.
* **Pass B:**
  * The portal default is `apr_portal`, and APR Portal is listed first.
  * Dev build:
    * The APR host builds in 824 ms.
    * Refused, each with a plain reason: a wildcard, `http://` to a real host, and a Studio address that is not local.
  * Production build:
    * Refused when given a host, either as an argument or as the out folder. Refused through the API too.
    * Built with no host: it runs on `*.sample.invalid` only.
    * No stray folders are left.
  * Seed on a fresh copy, 719 ms:
    * Rows 1, 2, 7 and 13 are logged. Nothing is left in To review.
    * The second run gets 409 and the officer gets 403.
    * The Sample APR capture's spouse branch was not seen, so 77 PDF questions are on no captured screen.
  * PDF hardening 49/49.
* **Officer fill:** "Filled 6 of 9 · 3 need you", in 100 ms, with the UCI left empty. The reworded APR screen fills nothing: only hidden page inputs held values. One "Re-capture needed" task, counted twice (2|OPEN).
* **Values:** the family name and UCI I typed (`RVFOUR-TYPED`, `55667788`) are absent from the check list and from the stored record.
* **axe (WCAG 2.2 A/AA): clean on 12 states.**
  * Panel: connect, capture start, check before sending, not read, returned, filled, looks different.
  * Studio: picker, held copy (reviewer), draft dialog.
* **Sizes and speed:**
  * The panel at 360 px and the picker page at 512 px (1024 px at 200 %) have no sideways scroll.
  * Keyboard works for start, remove and attach.
  * Sending a screen takes 52–152 ms.

## Major
1. **One address can set off the server-wide pairing limit, which blocks every colleague** (`api/src/extension.ts:78-83`).
   * Each try is inserted before both checks, and `count(*) as all` counts tries that the per-address limit already refused.
   * So one client sending about 10 requests a second (601 a minute) stops every extension in the firm from connecting for as long as it keeps sending.
   * Measured: with 600 recent tries recorded from one other address, a colleague's right code got 429. A minute later it got 201.
   * This is the same denial-of-service class review-3 rated Major, and cheaper than the old sweep. `f2b:188` only tests "many addresses".
   * Fix: count toward the server total only tries that passed the per-address limit (or do not record a try from an address already over its limit). Add the one-address fail test.
2. **The demo's row 1 now shows a sponsorship form under the Visitor visa** (`api/src/forms-demo.ts:30,64`).
   * `COPY_CANDIDATES` falls through to IMM 1344 because `imm5645e.pdf` is not in the manifest. IMM 1344 is the sponsorship agreement and undertaking.
   * On a fresh copy: `Visitor visa | imm1344e-from-email.pdf | RECOGNISED`, shown "Approved in the product by Content reviewer".
   * The build notes say "the first visitor-relevant form". IMM 1344, 5532 and 5710 are not visitor forms (rule 4; DEMO row 1).
   * Fix: use a visitor form the setup does not attach, for example `imm5409e.pdf`, and assert in `check_forms_demo` that the copy's code is one of the visitor visa's forms.

## Minor
1. **Two removals lose portal order, and the message is wrong.** `record.gap` remembers only the last removal (`forms.ts` `removeScreen`/`addExtensionScreen`).
   * Removing B then D from A–E and capturing them again gives A C B E D, with the message "Screen 3 captured again, in its place".
   * A screen never captured before, taken after a removal, is also put into the gap.
   * Fix: keep a list of gaps keyed by the removed screen's identity, or say "added at the end".
2. **The held-copy page offers "Approve as an official source" as its primary action** for a copy the library already holds. The reviewer learns only after clicking (409 toast, screenshot `j4a-02`). Fix: show the "already holds" line on the held page and make Reject the action.
3. **The capture review still says an extension capture came "from saved blank pages"** (`review-items.tsx:123`; review-3 m5, handed to the screens lane). The founder's real APR capture will carry the wrong origin.
4. **Migration `20261026090000_forms_pairing_wrong_tries` was edited after its first commit** (55c0cba → 674f898). Any database that applied the first version (lane copies) fails Prisma's checksum. Harmless before merge; do not edit it after.
5. **`extension/build.ts` `outFolder` accepts any folder under `studio/var`, even one that holds files, and empties it.** For example `extension:dev … var/workspaces` would delete the demo's P-80 approval records. Fix: under `var` too, accept only an empty folder or an earlier build.
6. **The officer still has no visible way to the Browser extension page** (review-3 m7; not new, handed to the runtime lane).

## Journey score (QUALITY.md; the one score for this check)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | All five journeys finished: G3 capture, return and resume, officer fill, picker, held copy (reject or approve then draft), seed |
| Next step obvious | ½ | Finish now explains itself; but the held copy invites Approve, then refuses it (Minor 2); the officer has no link (Minor 6) |
| Plain words | 1 | Not-read reasons, the "already holds" message, the build refusals and the throttle message are plain |
| Feedback and state | 1 | Moved tab, stale remove, returned, held, looks different, "in its place" all visible |
| Correct data | ½ | No value sent; single re-capture keeps order; but double removal loses it (Minor 1) and a sponsorship form is seeded under the Visitor visa (Major 2) |
| Error recovery | 1 | Loop gone; reload resumes; stale 409; a throttle clears in a minute; Reject closes a copy |
| Accessibility and screen sizes | 1 | axe clean on 12 states; keyboard start, remove and attach; 360 px; 512 px |
| Speed | 1 | Send ≤152 ms, fill 100 ms, read 827 ms, stub draft 3.2 s, seed 719 ms |
| Visual quality | 1 | Team look; the returned panel tidy at 360 px (`j1-06`) |
| Trust and sources | ½ | Stub labelled, Live disabled with a reason, fill sources shown; "from saved blank pages" wrong (Minor 3); IMM 1344 shown approved for a visitor visa |

**8.5/10, a pass, no 0.** To raise it: Major 2 and Minor 1 (correct data, trust), then Minors 2 and 6 (next step), then Minor 3.

## D1–D20 (1–5; D17 and D20 simulated only)
D1 4 every Pass A/B item and every review-3 and breaker Major present · D2 4 race-safe tries, revision check · D3 4 online twin reuses the PDF map · D4 4 branches listed as not seen · D5 4 loop gone · D6 4 audit lines on void, return, approve · D7 4 stub labelled, Live closed with a reason · D8 4 path on every screen · D9 3 Minors 2, 6 · D10 4 wording fixed · D11 4 states visible · D12 4 team look · D13 5 axe, keyboard, sizes · D14 4 team tokens · D15 5 speed · D16 4 393 checks green, each rule has a fail test; one-address throttle case untested · D17 simulated only · D18 3 Minor 3, Major 2 · D19 4 two one-line Majors open · D20 simulated only.

**[M] lines.** Met: rate limits (Major 1 caveat); expand-only migration with recorded rollback; server authorisation (officer seed 403, uploader cannot approve); zod contracts; Problem Details in words (409/400/429); axe on every state; no per-row requests seen; a rule's test fails without the rule (spot-read: throttle, loop, revision, build folder). Not met: none.

## Could not check
A real screen reader and Chrome's real side panel (panel tested as a tab); the real APR markup (G3 is the founder's); the team code; D17 and D20 need an intended user's unaided walk.
