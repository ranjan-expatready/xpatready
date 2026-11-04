# C4.5 · Facts this document supplies — independent review (PR #1005 at ec43f2a89)

Reviewer agent, Opus, did not build it; 5 Nov 2026 (IST). Scope is the tech lead's ruling: the API person's step, the Preview `missing:` key, the release line by name, the read-only block on the change page, two copy fixes, the sample, the pack and helpers, the release check and the walk. The editable panel (concept §4) waits for approval and is **not** scored as missing.
**How it was run:** this worktree had another session's uncommitted edits (`supplies-panel.tsx`, `preview.tsx`, `documents.tsx`, `library.tsx`, `document-supplies.ts`) while the check ran, so everything ran on a clean `git archive` of **ec43f2a89** (and of merge base ee65f3cf4 for regressions) in the reviewer's scratch folder, port 4453 only, a fresh database each run, live AI off, US$0.

## Verdict: Ship after fixes (Rework not needed): two Majors, both small
Journey score **8/10** (pass), report: `journey-test-reviewer-2026-11-05.md`.

## Builder's results, re-run
| Claim | Re-run on ec43f2a89 |
|---|---|
| Pack C4.5 26/26, exit 0 | 26/26, exit 0, **twice** on fresh copies (30 s) |
| Release check 7/7 | 7/7, exit 0 |
| Walk 10/10 | 10/10, exit 0, **twice** |
| C4.x / C10.1 fail the same on main and branch | Branch and merge base give identical results: C4.1 14/3 fail (exit 1) · C4.2 10/0 · C4.4 17/0 (exit 2, a WAIT) · C4.6 17/0 · C4.7 17/0 · C4.8 6/5 fail · C4.11 0/1 (QA-144). **C10.1 is not confirmed**: on the base it stopped twice with a client "socket hang up" at the checkpoint load (1 pass, exit 2); the branch ran 18/6 fail (part B rows 9, 11, 12: release 2, family case, IMM 5257). These are not files this PR touches, apart from the release line |
| Rule tests fail when the rule is removed | Mutations in the scratch copy: removing the Preview `missing` filter fails C4.5-16; removing "Nothing changes" fails C4.5-23 (24/26, exit 1) |
| Types | `tsc --noEmit` web clean; api errors only in older `tests/` files, none in this PR's files |

**Official words (AGENTS rule 4, P-170):** all 6 distinct quotes appear word for word in `expected/source-text/imm5484e.xfa-template.txt` (5) and `imm5257e.xfa-template.txt` (names). Edition marks "05-2026" and "IMM 5257 (09-2023)" are in the text. `pdftotext` page 1 of `imm5484e.pdf` holds the passport and legal-status lines. The SHA-256 of both PDFs matches the sample's `about`. Each fact has a date read; Sample, Unconfirmed: expert. Citizenship's source names the legal-status line (challenge m1). Place of birth → city and country stays an expert question (concept Q3).

## D1–D20 (1–5)
| # | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | BR-1…BR-8 behave as written at the API, Preview and release; the returned change page does not (M1) |
| D2 Data integrity | 5 | 3 concurrent proposals → one WAITING row; double Approve → one 201 and one 409; Changed since 409; merged, twice, unknown and future-date refused |
| D3 Reuse | 5 | the one `library_change` door, shared fields only, the document type master; no copies |
| D4 Rule integrity | 4 | the fallback question stays placed (C4.5-14); the `warnings` path is never exercised (m2) |
| D5 Stability, recovery | 3 | reload is fine and the server stays safe on races, but a returned change is a dead end in the UI (M1) |
| D6 Governance | 5 | dated cites; author ≠ approver on the server; audit "proposed" and "approved" lines; release only when published with the facts |
| D7 AI trust | n/a | no AI in this row (US$0) |
| D8 Orientation | 4 | trail "To review › …" on the change page |
| D9 Flow | 3 | approver: one next action; author after a return: "Correct or withdraw" leads to a form that cannot be sent (M1) |
| D10 Language | 3 | otherwise plain, by name; but "Withdraw the new field", "undefined form fields" and a pointer to a missing control (M1, M2) |
| D11 Feedback | 4 | chips and toasts; the "undefined" toast (M1) |
| D12 Visual | 4 | the existing change-page look; shots `03-change-page`, reviewer `j1-change-1440` |
| D13 Accessibility | 4 | axe WCAG 2.2 AA 0 on To review and the change page; keyboard-only path with a visible focus ring; no sideways scroll at 400, 720 (200 %) and 1024 px; no screen reader used |
| D14 Team look | 4 | team components, nothing new |
| D15 Speed | 4 | To review first view 930 ms; change page 113 ms; one request per view |
| D16 Testability | 4 | the packs re-run and the mutations are caught; gaps m1–m4 |
| D17 First use | simulated only | |
| D18 Provenance | 5 | every fact shows form, edition, page, date read, quote and Sample; quotes checked against the committed text |
| D19 End to end | 3 | released on the fixture only (the six cannot release yet, B70); the six end at the draft and Preview |
| D20 Pain, wow | simulated only | |

## Issues
**Major (must fix before Approve)**
* **M1 · The returned change of a document's facts dead-ends on the change page.**
  * The author follows To review's "Correct or withdraw" to the new-field form "Correct it and send it again", with **Name** and **Meaning** fields.
  * Its **Send again** is always refused with 409 "…is not sent again…", the refusal this PR adds at `api/src/library-changes.ts` (resubmitChange).
  * The button reads **"Withdraw the new field"**, and the toast reads **"Withdrawn: undefined form fields back to "no decision""**.
  * Cause: `web/src/pages/review-items.tsx:116` routes every returned kind that is neither a rename nor a lifecycle kind to `<Correct>`. Line 207 reads `form_fields_reopened`, which the withdraw answer for this kind (the renaming branch) does not return.
  * Fix: for `document_supplies`, show a returned view like the RENAME branch: the Notice "Propose it again: withdraw it, then propose the facts again on its document type" plus a withdraw control worded "Withdraw it". Make the toast skip the field count when it is absent. Add one browser or pack step for the returned path. Shots: reviewer `j2-returned-author-1440`, `j2-send-again-1440`.
* **M2 · The Documents tab names a control that does not exist at this commit.** `web/src/pages/workspace/documents.tsx:139` says ""Try it missing" there shows them asked instead", but Preview has no such control at ec43f2a89. The try-out works only by editing the URL, and the walk does just that. Fix: drop the clause until the toggle ships (keep "Preview shows it … until then a case asks them"), or change the sentence in the PR that adds the toggle.

**Minor (should)**
* m1 · Graph (P-86): G3 lists `POST /library/document-types/:key/supplies` as "no test reaches", because the pack and the check call it through a variable. Write the literal path in one call.
* m2 · The API `warnings` (challenge m6, marked done) has no test. On the six every supplied fact is placed, so it never fires. Add a step with an unplaced fact.
* m3 · Nothing fails if `releaseSupplies`' "only when the published type carries the facts" guard (challenge m3, m4) is removed: the release check passes either way (reasoned, not mutated). Also, propose accepts a type whose ADD still waits (m4 was "refuse"). If that ADD is withdrawn, the APPROVED facts change stays open and blocks new proposals for the key. Medium confidence.
* m4 · BR-4 "not retired" (a retired shared field) is not tested in this row's pack.
* m5 · The same facts have two names: Library › Document types (`library.tsx` `fieldName`: "Passport number", "Birth city") and To review ("Number of the passport or travel document", "City or town of birth").
* m6 · Details on the change page says "Key: … (generated from the group and the name)", which is wrong for this kind (`review-items.tsx:114`). It shows only in the admin Details.
* m7 · `engine/validate.ts` `factName` adds `as any` (STANDARDS §7), in that file's existing style.
* m8 · No retrofit mapping (to the team's code or SA-01B) is recorded in the concept or build notes (skill check 6). The challenge also found no SA-01B cite.
* Not this PR: a double press of Approve shows an error toast beside the success toast (the shared Decide button); the server is right.

## [M] lines (STANDARDS, EXPERIENCE), only those this row touches
Met:
* Content is data: no form number in code; samples are read only by packs (BR-8, P-319).
* Pick, don't type: shared fields only, enforced at the API.
* Links checked: the server re-checks at approval.
* Released means frozen.
* Author ≠ approver on the server, deny by default (401 with no actor).
* Problem Details with field errors.
* zod contract shared with the web.
* No N+1.
* axe on each state; 1024 px and 200 % zoom; keyboard path.
* Plain words on the main path, with the exceptions in M1 and M2.

Not met:
* "Errors say what happened and how to fix it": M1 offers the refused action.
* "Every business rule has a passing and a failing test": m2–m4.
* "A rule's test fails when the rule is removed": met for the two mutated rules; not for m3.

## Concept consistency (approval pending; no defect for the missing panel)
What is built matches the concept's API, Preview key, change-page block and copy rows.
* §6 says 20 pack steps; 26 are built.
* §8 marks m3/m4 "Done", but m4 is only partly met (see m3 above).
* The waiting-state Withdraw and the "Try it missing" toggle belong to the unbuilt panel and Preview UI. M2 is about the sentence that already points to the toggle.

## Could not check
* A real screen reader.
* An intended user's unaided walk (D17, D20).
* The author's UI step (the panel is not in this PR).
* A release on the six (B70).
* GitHub CI on this commit (local runs only).

**Verdict: Block**: fix M1 and M2 (minors at the builder's judgment), then a diff-only re-review.

## Round 2 (462fda78e, diff-only)
Reviewer agent, Opus, did not build it; 5 Nov 2026, 02:25 IST. Scope: `git diff ec43f2a89..462fda78e` only: the panel (concept §4, now approved), the GET view, Preview's toggle, the round-1 fixes and the breaker's M1–M3 and minors. One isolated copy on port 4453 (fresh each run), live AI off, US$0. Stopped at the end. My round-1 copy, still running on 4453, was stopped first. The browser check writes into the committed `screenshots/`; I restored them both times.

### Re-run on 462fda78e
| What | Result |
|---|---|
| `acceptance/C4.5.test.ts` | 26/26, exit 0 (fresh copy) |
| `tests/check_c45_supplies_release.ts` | 9/9, exit 0 (fresh copy) |
| `tests/check_c45_supplies_browser.cjs` after `setup_c45_walk.ts` | 27/27, exit 0, **twice** (fresh copies, 34 s) |
| Mutations (scratch `git archive` copy) | Removing `refuseUnusable` from propose fails "BR-4 fail (break M1)" (201 instead of 409). Removing `m.names` from `suppliesView` fails "break M3". 7/9, exit 1 |
| Types, graph | `tsc --noEmit` web exit 0; no api error in this diff's files. `graph.mjs --check` exit 0; no C4.5 gap (m1 closed) |
| Runbook note | Running `setup_c45_walk.ts` straight after `isolated.sh … start` failed twice with "socket hang up". Waiting until `/api/session` answers fixed it. This is not a product finding |

### Round-1 and breaker findings: verified
* **M1 (returned path), closed.** Returned change page: "Propose it again" plus "Withdraw it" (`review-items.tsx:116`), no Send again. The toast reads "Withdrawn: nothing in the library changed". Browser step and my walk. The panel's Returned state shows the second person's note plus Withdraw (`j2-panel-returned-1440`, axe 0).
* **M2 (pointer to a missing control), closed.** The Documents sentence names "Try it missing", and Preview now has it: 120 → 129 asked, and back again.
* **m1, m2, m6, m7: closed.** The literal route is at `C4.5.test.ts:36`. The warnings step passes. The key note shows for fields only. `factName` is typed. Round-1 m3, m4, m5 and m8 stay open, as the PR says (Minor).
* **Breaker M1, closed at proposal.** A field merged through the real merge route is refused (409, and the mutation is caught). The approval re-check (`applySupplies` → `refuseUnusable`) is in the code but no test reaches it (m-f).
* **Breaker M2, closed at the API.**
  * Pack step 26 passes, and the approver's withdraw is refused (403).
  * In the panel (my walk): the change is WITHDRAWN, the draft goes back to 0 facts, and GET says 0.
  * The panel itself then shows the wrong facts: see R2-M1 below.
* **Breaker M3, closed.** `before` and `removed` are named (release check; the mutation is caught).
* **Breaker minors, closed.**
  * 2026-02-30, 0001-01-01, zero-width-only words and an RLO-only source are each refused (pack step 22).
  * A quote with a 340-character unbroken run wraps: the change page measures 1024/1024 px, and the panel 511/511 px at 1440, 1024 and 720 px (200 %).

### Own walk (1440, 1024, 720 px; keyboard; author, approver, reviewer)
* **Held:**
  * Keyboard: the panel opens from the drawer by Enter.
  * Every control is reachable by Tab, with a visible 2 px ring on buttons, the chip's whom-select and Remove.
  * axe finds 0 violations: filled, error, returned.
* **Refused in words, nothing sent:** an empty or 3-letter reason ("Write at least 5 letters or digits…", with `aria-invalid`), and a future date.
* **Two tabs:** the second Send gets "…already waits on To review…", and there is exactly 1 WAITING row.
* **Roles:** no actor gets 401 (GET too). The reviewer and the approver get 403 on POST, and the approver has no "Change the facts" button.
* **Speed:** the GET answers in 7–23 ms, one request.
* **Data:** the stored cite equals what was typed (source, date read, quote length 386).

### Issues
**Major (must fix before Approve)**
* **R2-M1 · After the author withdraws an approved change in the panel, the panel shows the withdrawn facts as what the document supplies.**
  * Steps: the passport has 9 facts, approved and not released. Open the panel, fill "Why withdraw it", press Withdraw. The answer is 201; the database and GET hold 0 facts.
  * Result: under the title "Facts Passport information page copy supplies", the panel shows 6 official lines and 9 chips, with **Send for approval** enabled. Close then asks "Discard the facts and words you changed?", though the author changed nothing. This was still true 3 s later; reopening shows 0. Scratch shot: `r2walk/shots/j3-after-withdraw-approved-1440.png`.
  * Cause (`web/src/pages/supplies-panel.tsx:41`, `:57–60`): `withdraw()` calls `setCards(null)` and a refetch it does not await. The effect then rebuilds the cards from the stale `v.data`. With waiting and returned changes the stale and fresh facts are the same, so only this new path (breaker M2) shows it, and no browser step covers it.
  * Fix: rebuild the cards from the refetched data (await the refetch, or key the effect on fresh data), and say what happened ("Withdrawn: the facts are back to …"). Add a browser step: approved → Withdraw in the panel → 0 chips, the prefilled first line, Close does not ask.

**Minor (should)**
* **m-a** · **Cancel** with edits closes the panel without asking and drops them (`supplies-panel.tsx:70` calls `onClose` directly), while Escape and × ask first. Route Cancel through `confirmClose`.
* **m-b** · Picking a field or removing a chip unmounts the focused button, so keyboard focus falls back to the dialog. The next Tab starts again at Close (`:118`, `:124`). Put focus back on the card's search box.
* **m-c** · "Suggested first" does not follow concept §4. The concept says: facts this combination's forms ask that no document supplies yet, whose form caption names the document. The build suggests any field whose meaning holds a 5-letter-or-longer word of the type's name (`api/src/document-supplies.ts:106–109`). It works for the passport. For "Proof of legal status in country of residence" it suggests "Alternate telephone number including country code" and other "country" fields. Follow the concept's rule, or record the change in the concept or build note.
* **m-d** · The prefilled source "IMM 5484, page " has no edition and no page number (`document-supplies.ts:111–115`). The server accepts it as is (POST → 201), against BR-3 "form, edition, page". Prefill the edition where it is known, and refuse a source with no page number.
* **m-e** · Untested: the approval-time merged re-check, and `withdrawApprovedSupplies`' "Changed since" and same-moment guards.
* **m-f** · The Returned note doubles the full stop ("…IMM 5484.. Withdraw it", `:77`).

### Scores that change (others as in round 1)
| # | R1 → R2 | Evidence |
|---|---|---|
| D1 | 4 → 4 | Panel per §4, all states built; R2-M1, m-c |
| D5 | 3 → 3 | Returned path fixed; the approved withdraw leaves a stale editor (R2-M1) |
| D9 | 3 → 4 | Every state names its next action |
| D10 | 3 → 4 | "Withdraw the new field" and "undefined" gone; m-f |
| D11 | 4 → 3 | R2-M1; Cancel drops edits silently (m-a) |
| D13 | 4 → 4 | axe 0 on 12 states; no sideways scroll at 1440, 1024 and 720 px; focus loss (m-b) |
| D16 | 4 → 4 | Mutations caught; the panel's approved-withdraw path untested (R2-M1, m-e) |
| D19 | 3 → 4 | The six end to end through the product's own panel, to the SQR tab and Preview; release on the fixture only (B70) |

**Journey score (reviewer, round 2): 8.5/10, pass, no 0.**
* 1 each: task completed, next step obvious, plain words, correct data, speed, visual, trust and sources.
* ½ each: feedback and state (R2-M1), error recovery (R2-M1, m-a), accessibility (m-b).
* Fixing R2-M1 and m-a raises it most.
* Not tested: a real screen reader; an intended user's unaided walk (D17 and D20 simulated only); GitHub CI on this commit.

**Verdict: Block**: fix R2-M1, then a diff-only re-check of that fix and its browser step. The minors are at the builder's judgment.

## Round 3 (ff34719e3, diff-only, fresh reviewer)
Reviewer agent, Opus. I did not build this and did not review rounds 1 or 2. 5 Nov 2026, 02:40 IST. Scope (tech lead, P-293 (3)): `git diff 462fda78e..ff34719e3` only, meaning the fixes for reviewer R2-M1, breaker R2-M1 to M3 and the round-2 minors. Setup: one isolated copy `c45r3` on port 4453, started fresh before each run. Live AI off, US$0. Screenshots restored with `git checkout`, copy stopped, tree clean.

### Builder's results, re-run
| What | Result |
|---|---|
| `setup_c45_walk.ts` + `check_c45_supplies_browser.cjs` | 29/29, exit 0 (27 s), including "withdrawn after approval … no fact, nothing to send" and "SQR tab reads 0 again" |
| `acceptance/C4.5.test.ts` | 26/26, exit 0 (fresh copy) |
| `tests/check_c45_supplies_release.ts` | 10/10, exit 0 (fresh copy), including the real merge followed by a withdraw |
| Types, graph | web `tsc --noEmit` exit 0; no api error in this diff's files; `graph.mjs --check` exit 0 |

### Each fix
* **(a) Reading facts through merges: right for withdraw.**
  * Probe on the release-check copy: an approved change, then `passport_country_of_issue` merged into `citizenship`, then two withdraws at once. Result: one 201 and one 409. The draft went back to `before` read through the merge (sex restored, the merged key gone), with one audit line per withdraw.
  * Would the test fail without the fix? Yes. The test's `after` holds the merged key and the draft does not, so the old comparison gives 409 and the step fails.
  * Release side: the code is right (published facts compared with `after` read through merges). I could not release in my probe, because the fixture's submit then needs an IMM 1295 answer-key test. No test covers this path (r3-m1).
* **(b) History line and the approver's decision: right.** One `withdrawn` audit event names the change and gives the reason. `decided_by` stays the approver. The note reads "Approved: Checked against IMM 5484 page 1. Withdrawn by Configuration author: …". The release check asserts both. The advisory lock with a re-read status gives the race's loser "already withdrawn", not "changed since".
* **(c) Panel rebuilt from the reload: right.**
  * My walk at 1024 px, keyboard Enter on Withdraw: within 30 ms the panel shows 0 chips, the prefilled first line and a disabled Send. Close asks nothing. axe 0. Shot (scratch, not committed): `/private/tmp/claude-501/-Users-ranjansingh-Desktop-Xpatready--claude-worktrees-qa2-2026-11-04-e3ae2d/6271d9b3-d4c0-46cf-9d0f-38427010f3e6/scratchpad/r3/after-withdraw-1024.png`.
  * Would the browser step fail without the fix? Yes, by reasoning. Round 2 saw 9 stale chips stay for 3 s, and the step counts chips as soon as line 1 appears.
* **(d) Minors.**
  * Cancel with edits asks first: dismissing keeps the edits, accepting closes, and Cancel with no edits closes without asking.
  * A line with words but no fact gets "An official line has words but no fact…" and no POST is sent.
  * A source with no page is refused by the server, and the panel shows the reason in words.
  * Official words are kept as typed (NFC): "ﬁrst", "m²" and a combining "é" are stored as typed, U+3164 is stripped, and the stored quote equals its NFC form.
  * The GET view no longer offers merged fields (162 fields offered; both merged keys absent).
  * The returned note no longer doubles the full stop.
  * The withdraw wording in `library-changes.ts` is right for a released or withdrawn change.
  * Pack step 22 fails on the old code: under NFKC, U+3164 becomes U+1160, which counts as a letter, and a source with no page was accepted.
* **Nothing that worked before is broken.**
  * Withdraw now compares facts only, not whom each fact is about, even when nothing merged. That is safe: only one change can be open at a time, so nothing else writes `suppliesAbout` between approval and withdraw.
  * Waiting and returned withdraws, the BR-5 "Changed since" check and the release race all still pass.

### Minor (should, at the builder's judgment)
* **r3-m1** · Nothing fails if `releaseSupplies` stops reading through merges (`api/src/document-supplies.ts:193–195`). Fix: one release-check step that releases after a merge.
* **r3-m2** · `throughMerges` follows one merge only (`:185–189`). If A is merged into B and then B into C, both before release, the change is stuck again. Fix: follow the merge chain to its end.
* **r3-m3** · After a withdraw, the panel turns back into the editor without saying what happened. Focus lands on the dialog (same cause as open m-b).
* **r3-m4** · The page rule `/\b(page|p\.)\s*\d/i` (`contracts/document-supplies.ts:139`) refuses "pages 2–3" and "pp. 2".
* **r3-m5** · The change's note is cut at 300 characters (`:178`). A long approver note plus a long reason cuts the withdraw reason on the change. History keeps 600 characters.
* **Outside this diff, for the tech lead:** a merge rewrites `suppliesFacts` but not `suppliesAbout` (`api/src/forms.ts:391`, unchanged here). A spouse's merged fact becomes the holder's. The breaker raised this in R2-M1; this diff only stops it from leaving changes stuck.

### Scores that change (others as in round 2)
| # | R2 → R3 | Evidence |
|---|---|---|
| D5 | 3 → 4 | A withdraw after a merge works, and the panel reloads correctly |
| D6 | 5 → 5 | Withdraw is in History; the approver's decision is kept |
| D11 | 3 → 4 | No stale editor; Cancel asks; r3-m3 |
| D16 | 4 → 4 | New steps fail on the old code; r3-m1 |
| D18 | 5 → 5 | Official words kept as written (NFC); a page is required |

**Journey score (reviewer, round 3): 9/10, pass, no 0.**
* 1 each: task completed, next step obvious, plain words, correct data, error recovery, speed, visual, trust and sources.
* ½ each: feedback and state (r3-m3), accessibility (focus, m-b).
* Not tested: a real screen reader, an intended user's unaided walk (D17 and D20 simulated only), a release after a merge (fixture), GitHub CI on this commit.
* The tech lead asked for this section only, so there is no separate journey-test report this round.

**Verdict: Approve.** No open Blocker or Major in this diff. The Minors r3-m1 to r3-m5 are at the builder's judgment.
