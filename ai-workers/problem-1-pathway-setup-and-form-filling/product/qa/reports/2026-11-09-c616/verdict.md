# C6.16 verdict: gate A PASS (with limits) · status Partial (not Works: no GitHub run id, P-339; one new Major)

Reader: a fresh Opus subagent that ran nothing (P-303). Read only: the evidence in this folder, screenshots 04, 09, 11, 14, 16, 18, 19, 20, 24, 25, 26, 27, the three walk logs, the pack and its output, `web/src/runtime/privacy.tsx`, and B138's concept, challenge, build notes, review and break report. Main 1d07807c8, 9 Nov 2026.

## Gate A: PASS, with limits
The screenshots and logs back the walk's main claims:
* **Send (Client A, 390 px):** an empty address and "not an address" are refused on the field (log A3). After the send, the line reads "Sent to p•••@example.com … Resend · Send to another address… · Take back" (04).
* **Partner's link:** the page shows `/link` with no token and says opening it sent nothing (log B1). A wrong code shows the tries left (log B2). Before the right code, Client A still reads the answer (`[under]` true). Consent is marked "Unconfirmed: no counsel" (09). Contact information shows "Answered by Client A … Confirm" (11), and Confirm saves it as Partner's `own_link` answer (pack C6.16-6).
* **Progress only:** after acceptance Client A sees "0 of 26 parts done", Resend and Take back, and neither value is in the page or the API (14, logs C1 and C2, probe).
* **Staff:** the panel says what the code proves and who gave the address (16). Take back needs a reason, then reads "Taken back 9 Nov · still private from Client A" (17, 18). The dead link names no one (20). Staff send to a new address (21, 24). The staff tick on Child 19 needs a reason, then reads "Case officer: <reason>" (23, 24). After the tick Client A sees progress only (25).
* **Next capability's first step (C7.1):** Partner's IMM 5257 gives "Generated · 4 form fields written · read back and checked" (26, 27). The XFA data carries `Email`, the answer Partner confirmed on their own link. The output is usable, so gate A reaches C7.1.

Limits of the walk:
* **No Resend was pressed by anyone, by screens.** No one opened a resent or re-addressed link. So "take back and resend" is shown only up to "a link message is in the new address's inbox" (log D5). Partner never comes back in.
* Not walked: Client A's own Take back; Client A's Resend after staff sent to a new address (see the new Major); the 5-wrong-codes lock; expiry.
* The setup is a script (case, people, dates of birth). There was one headless pass. The private value that reached C7.1 is a confirmed copy of Client A's answer, not an answer Partner typed: Partner's own typed address was incomplete, so it stayed blank.
* There is no 1024 px viewport anywhere. The builder's check runs 390, 1440, 320, 720 and 512 px (512 px = 200 % of 1024 px).

## F12 (P-412)
* **(a) Met.** Privacy is off before the right code (log B2 `[under]` true; pack C6.16-3 data). It is on at the first right code: the row says "Switched on when the person first entered the right code" (16), and Client A sees progress only (14). The staff tick also turns it on (24, 25; C6.16-9). It stays on after take back: "still private" (18), Client A sees progress only and has only Resend (19), and a PUT is 403 (C6.16-7). There is no untick: the database refuses one (C6.16-9 data), and the dialog says "It stays on (no untick yet)" (log F1).
* **(b) Met as worded.** After acceptance Client A has no "Send to another address" (14, 19; `privacy.tsx:118`). Client A sending to a new address gets 403 in words (C6.16-8 B1). Staff can send to a new address (21, 24).
  * One reading is still open (new Major below): after staff re-address, Client A's Resend goes back to the **old** address and voids the staff's link.
* **Record gap:** P-412 is not in DECISIONS.md, and STATE.md row F12 still reads "open … PR unlabelled until he answers". The ruling is only in #1257's body.

## Status: Partial (not Works)
There is no GitHub run of the C6.16 pack. The local `gate-b.mjs` run (68/68 on the checkpoint, exit 0, this container) is evidence, but it is not that run (P-339, SKILL §4). The new Major also stands.

Suggested row: "Partial | 1d07807c8 9 Nov | qa (fresh reader): Send, code, consent, own answers, progress only, staff take back, staff new address and staff tick work by screens; Partner's confirmed answer fills Partner's IMM 5257 copy (C7.1). F12 (a), (b) met as worded. Open: after staff send to a new address, Client A's Resend returns the link to the old address (QA-<new>, Major, founder); QA-357, QA-358 Minor. Pack 68/68 locally on the checkpoint (gate-b.mjs); no GitHub run (dispatch 403), so not Works (P-339). `qa/reports/2026-11-09-c616/`".

What moves it to Works:
* (a) The founder rules on what "kept address" means after a staff re-address. Then either a fix with a pack step, or the finding closes as intended.
* (b) P-412 F12 is recorded in DECISIONS.md and STATE F12 is closed.
* (c) A screens walk on the checkpoint covers: Resend → the adult opens the new link → code → back in their own parts, still private; and Client A's own Take back.
* (d) A green `nightly.yml` run (capabilities=C6.16, data=checkpoint) on main's head, dispatched by someone with Actions write, with its run id in the row.

## Findings
* **QA-357: agree, UX · Minor, and widen it.** The card's sentence is fixed for every private state (`privacy.tsx:42`).
  * It is false after a staff tick with no link sent (25).
  * It is also false after a take back: 19 shows "Sample Partner is answering on their own link" right above "The link was taken back on 9 Nov".
  * Add the take-back state to the check. It is Minor, not Major: Client A has no action either way, and the other lines on the card are true. This matches QA-354 and QA-356.
* **QA-358: agree, UX · Minor, but it is not new.** The reviewer already recorded "the 'Declared…' line under a part heading" as known and took off ½ point for it (B138 review.md:134, 136). Cite that.
* **New: Conflict · Major, C6.16 (privacy; for the founder):** after staff send to a new address, Client A's one-press Resend goes to the old accepted address and voids the staff's link.
  * Evidence: pack C6.16-8 "(break m3)" asserts this (`C6.16.test.ts:183-184`: the open link's address is `pA`).
  * Why it matters: staff re-address exactly when the old mailbox is not the adult's alone. Client A can undo that in one click and receive the code, which reopens challenge B1 and defeats Q2's stated purpose ("otherwise the principal could read the private answers").
  * Recommend: after a staff re-address, "kept" means the staff's address.
  * Owner: screens, after the ruling. It was not walked by screens.
* **New: UX · Minor:** after a take back, the officer's row shows the adult's dead-link words "Ask whoever sent it for a new one." (18). Staff are often the sender. Review m2 fixed this for the principal only.
* **New: UX · Minor:** old and new addresses mask the same, `p•••@example.com` (21, 24), so a staff re-address cannot be checked on the page.
* **New: UX · Minor, to confirm at full size:** 04 seems to keep the "Enter an email address like name@example.com." toast next to the success toast after the send.
* **New: UX · Minor:** "Sample Child 19 answers their own questions" (the ⓘ label, `privacy.tsx:139`) shows while Client A is still answering for that child (04, 14, 19).
* **New: Gap · Minor (records, Lead):**
  * P-412 is missing from DECISIONS.md (above).
  * SI-20 and SI-21 are in no STAND-INS.md row.
  * The stand-in residual has no recorded decision (break report round 2: with no persona, the demo inbox plus Client A's Resend still opens Partner's answers).
* **Carried, unverified:** the review notes that C7.9's must-verify line says "the client gave it" for an `own_link` answer (review.md:182-186). It goes to C7.9.
* **Open Major or worse naming C6.16 or B138 in BUGS.md:** none (QA-355 is the last C7.8 row). Once the new Major is logged, gate B fails product PRs naming C6.16 except its fix.

## Wrong or unsupported claims in qa's notes
* **Step 12** ("part 43 was Partner's before; Partner's parts cannot be reached", 15): there is no before log or shot, and only one URL was tried. The proof of no access is the probe and the pack, not this screen.
* **"[E2 [under] Partner IMM 5257 copy]"** (walk-log-part2.txt:15) prints **Client A's** IMM 5257 (subject 38cd…, `written_now 3`). Partner's figures exist only in `api-partner-imm5257-copy.json`, which is qa's own summary ("by qa's reading"), not a raw response.
* **Shot 22** is named in walk-log.txt:59 but is not in `walk/`. The first C7.1 attempt (log E1) was redone in part 2, and the notes do not say so.
* **"The builder's check covers 1024 px … 50/50, exit 0":** there is no 1024 px viewport (see above), and the output file prints "50/50 passed" with no exit line.
* **The probe's header** says it also calls "with no persona", but the code calls only `user-P` and `user-O`. The notes say the probe looked for the officer-given address, but the output cannot show that: the address is not an answer, so even the officer's read never carries it.
