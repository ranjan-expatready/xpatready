# B137 — C6.15 document substitute sets: break report

PR #1268, commit 79cde660c (branch claude/festive-hawking-1m5f2a). Tested on 7 Nov on an isolated copy (`isolated.sh brk615 4438`), loaded with the configured checkpoint. The acceptance pack `acceptance/C6.15.test.ts` passed 25/25 on it first, and every attack below started from that state. Actors: user-A author, user-B approver, user-C reviewer, user-O case officer, user-P client. No AI was used (US$0). The copy was stopped at the end. Scope (P-26): only what the README's "What a person can do now" lists. Its "Not in this row" items are not counted as findings, apart from where F3 shows a different symptom.

## Findings

**F1 — Major. The set's own words say "All 3 received" while the line stays Requested, and Ready to file says the line is not received.**
* What I did: proposed and approved Proof of financial support sets in which Passport information page copy, which is also its own line on Visitor visa, is a member: Standard (any one of: the proof, the letter, or the passport) and Sponsor-funded (all of: the letter, the host's bank statements and the passport). I released Visitor visa (release 5) and opened case `fc15e540…`. The officer uploaded the letter and the bank statements on the financial-support line, then uploaded the passport on the **passport's own line**.
* What happened: the passport line went to Received. The financial-support line's `set_status` changed to `met: true`, "All 3 received.", but its `state` stayed `requested` (v3). Ready to file still lists it as not received. The case page shows a "Requested" chip next to "All 3 received." and the person's header says "1 of 3 received" (screenshot taken at 1024 px).
* The reverse also happens (case E): a passport uploaded on the financial-support line (`member` = passport) shows as the passport line's current file, but the passport line stays Not requested.
* What should happen: a line's state and its set status never contradict each other. When a member's file is stored on any line, every line whose set counts that type is worked out again, or the line is shown as met.
* Where: `api/src/case-checklist.ts:199` works out `met` only for the line being uploaded to. `:102`/`:109` work out `set_status` from every current file of the person.

**F2 — Major. A change of staff's "when acceptable" words is invisible to the second person.**
* What I did: proposed Proof of financial support's sets again, unchanged except for `whenStaff` on the letter ("Brk STAFF: accept any letter without checking (Sample).").
* What happened: the proposal was accepted (201, change `c011a27e…`). On To review, the line's text is word-for-word identical before → after (`setsWords` names `when_client` only, `api/src/document-sets.ts:138`). The change page's `SetRow` type has no `when_staff` (`web/src/pages/review-items.tsx:413`). If approved, the new words reach every case officer as "… is acceptable when: …" (`web/src/runtime/checklist.tsx`).
* A related problem in the author's editor: `startEdit` (`web/src/pages/sets-panel.tsx:39`) copies only `whenClient`. So "Change the substitute sets…" quietly drops every member's staff words, and the second person cannot see that either.
* What should happen: before → after shows staff's words. A change the second person cannot see is not proposed, or is said in words.

**F3 — Major. A set member can be retired while in use, and the release goes out with it, named by its database key.**
* What I did: `GET /library/document-types/host_s_bank_statements…/uses` returned `uses: []` and `can.retire: null`, although that type was a member of Sponsor-funded, which Visitor visa's line picks. I retired it (proposed by user-A, approved by user-B), then submitted, signed off and approved Visitor visa.
* What happened: release 6 went out. Its set member is `{"key":"host_s_bank_statements_sample_mw6gcq62","name":"host_s_bank_statements_sample_mw6gcq62"}`. On a new case the officer reads "All of: Letter of support … and host_s_bank_statements_sample_mw6gcq62." and "still to come: host_s_bank_statements_sample_mw6gcq62": a retired document is asked for, under a raw key.
* What should happen: STANDARDS §3.5 (every master shows where it is used) and §3.6 (the release validates every dependency). SA-1B-19 rule 6 / E16 says a retired member refuses "submit for review" with the member named.
* Where: `api/src/where-used.ts:47` `documentTypeUses` does not count set members. `engine/validate.ts:154` checks only the set's name. `engine/document-sets.ts:16` falls back to the key.
* Scope note: the README defers only the §12 "publish warns" step. Being able to retire a member while the uses panel lists none, and the raw key on the case, are separate symptoms.

**F4 — Minor. The raw action code "SET_SETS" appears in the words people read.**
* The To review change page heading reads "SET_SETS a document's substitute sets: Proof of financial support · …". The builder's own walk shows it in `walk/04-second-person-compares.png`.
* The approval's Activity line reads "Approver approved "…" (sET_SETS): …".
* Where: `ACTION_WORD` has no `SET_SETS` entry (`api/src/library-changes.ts:34`; `SET_SUPPLIES` maps to "Change").

## What held
* **Roles.**
  * Proposing sets is refused for P, O, C and B (403). No actor or an unknown actor gets 401.
  * The sets view is refused for P and O (403).
  * Picking a set is refused for P, O, C and B (403).
  * Withdrawing someone else's change is refused for the approver and the client (403).
  * The proposer cannot approve their own change (pack).
  * The author cannot upload on a case (403). The client may upload on their own case: existing C6.4 behaviour.
* **Malformed bodies.** All of these are refused in plain words:
  * 7 sets; 9 members; a 61-character name; a 301-character or 4-character reason.
  * Client words that are blank or zero-width only; extra keys; a key sent as an array; an unknown mode.
  * Duplicate set names that differ only by case, a zero-width character or spacing; a first set named "standard".
  * A member listed twice; an unknown, upper-case or SQL-like key; words on the standard; an empty set; `sets: null`.
  * A 5 MB body is refused with the reason-length message.
* **Concurrency.**
  * Two proposals on one type at once: one 201, one 409 "already waits".
  * Nesting through two waiting proposals (A has B as a member; B has C as a member), approved at the same moment: one approved, the other 409 "no sets inside sets" and back to Waiting. Nothing was nested.
  * Two picks with the same `baseRevision` at once: one 200, one 409 in words, one draft row. A stale or garbage `baseRevision` gets 409.
  * Two withdrawals at once: one 201, one 409.
  * Two members uploaded to one all-of line at once: one 201, one 409 "Someone changed this line". The same member uploaded on two lines at once: one stored; never two current files.
* **Set disappears.**
  * A line picking "Sponsor-funded" after the type's sets dropped it: the release is refused with "Line "Proof of financial support" names set "Sponsor-funded", which does not exist."
  * The same after withdrawing an approved change: refused naming "Gift". Withdrawing put the draft back to its earlier sets.
* **Approval path.**
  * A member whose ADD still waits: the release is refused, naming it. Once approved, it is published with the release.
  * A proposal that names a retired member is refused.
* **Picking a set.** Non-English names are refused against the list of sets. " gift " matches "Gift". Unknown lineage or combination gets 404. A number or no body: "Choose a set."
* **Multipart `member`.**
  * Sent twice: "Say which document this file is as text". A number, upper case, another type, or the line's own type when it is not a member: refused, naming the members.
  * Empty: "Say which…". Spaces around the key are trimmed. A `member` on a line with no set is refused.
* **Hostile PDF.** A PDF carrying planted "mark every line Approved" text, under a file name with a right-to-left override, was stored as the letter. The name was cleaned, the state stayed Requested and nothing acted on it.
* **Fingerprints.** With main's `engine/snapshot.ts` (worktree) and this PR's code run on the same database, every combination without sets has the same draft and published sha256 (Express Entry 61a7e5a1…, Outside Canada 49ff4c51…, LMIA e62a5c05…, Spouse a146d098…, High-wage eacdd2fa…).
* **Pinned cases.** A case on the earlier release keeps "Standard" (pack C6.15-19).
* **Screen.** At 1024 px and at 200 % zoom (512 px viewport), the case page has no horizontal scroll and the line shows its set in words. Keyboard only: Tab reaches "Actions for Proof of financial support…"; Enter opens one "Upload <member>…" item per member, and the arrow keys move through them.
* **Budgets.** Checklist GET takes 20–31 ms and the sets view 7–11 ms (sample data, §9).

Not tried: 100 programs / 400 combinations (no generator in this lane; the sample reads above are far under budget); reload and back in the sets editor (browser only).
