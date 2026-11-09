# B140 — C6.18 officer entry for background answers: review

PR 1246, commit `69c33c235ea653f65111f10d64a8d6724c7fc4d9` (branch `claude/youthful-planck-mf99ql`), diff `origin/main...69c33c235`. Row L-SA10, P-244 (amends P-97, C4.9). Reviewer: a fresh session that did not build it. Concept: `README.md` (UX note, decisions 1–8). There is no `concept.md` or `build-notes.md`. Board `M3-agent-view/design/draft-agent-view.html` (intent).
Isolated copy `rev140` on :4439. It was reset, then Demo › Load the configured checkpoint (97 s, US$0), and stopped at the end. The server started at 10:48, before another session's uncommitted edits to `runtime.ts`, `contracts/runtime.ts` and `readiness.ts` in this same checkout (10:56). It does not watch files, so everything below ran the commit's code. I did not review those edits.
Journey test: `journey-test-reviewer-2026-11-07.md`. **Score 8/10.**

**Verdict: Ship after fixes.** Two Majors are open (M1, M2).

## What held (evidence on the checkpoint copy)
* **Derivation (P-319).** The background facts come from data: the release's field maps, laid over IMM 5257's own reading from the "BACKGROUND INFORMATION" heading to Consent/Signature, plus library `client_only` placements, minus declarations. No form number or fact key is in code. On Visitor visa release 2 it marks exactly the 12 facts of the "Background information" section (4 people × 12). The same heading rule as C3.8 (`form-completeness.ts:22`).
* **No officer bypass.** Every reader of answers (fill-case, sign-steps, case-prepare, submission, assessments, checklist, findings) goes through `Runtime.state()`, which sets `awaitsClient`. `confirmation()` checks it first (`case.ts:65`), so neither a VERIFIED version nor a confirm from before P-244 counts. Confirm section skips these answers (`runtime.ts:546`) and reports `awaiting_client`. Undo restores the earlier version's channel: officer → waits again, client re-confirmation → stays the client's (checked).
* **Re-confirm route.** Staff get 403 (user-O, and user-R as a same-firm representative). A configuration author gets 403. Another client gets 404, and so does a bad or unknown id. A non-background answer gets 409 ("Nothing to re-confirm"). A superseded version gets 409 naming the newer one. Three parallel posts give one 201 and two 409s, and one version is stored. A double click stores one version. Who recorded it and when survives re-confirmation and confirmation (`sourceJson.recorded`).
* **No regression found.** Other confirmations are unchanged: the gate `CLIENT_RECONFIRM` sits beside `questionnaire`, and the adult→principal rule is kept (pack 19–20). The Sample case's 4 IMM 5257 copies still fill: the checkpoint rows 11 and 12 are done. I did not re-run the caller's suites; I trust their evidence.
* **UI.** The note, hint, pills and toasts match decisions 2–7. axe found 0 violations in 4 states. No sideways scroll at 400, 720 (200 %) and 1024 px. There is a keyboard path to "This is right". No radio is preselected, and a blank or whitespace save in the dialog is refused on the field.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 3 | All 4 done-when parts are built. M1 and M2 break "the client re-confirms every officer-recorded background answer" |
| D2 Data integrity | 3 | Supersede guard and race hold (1×201 / 2×409). M1 stores a value the client's screen contradicts. m1: whitespace is stored via the API |
| D3 Reuse | 4 | Reuses the C3.8 reading and CONFIRM_WORDS. `backgroundBlock` copies `backgroundQuestions`' loop (m6) |
| D4 Rule integrity | 4 | A waiting answer never fills. An optional background fact is not counted in readiness (m7) |
| D5 Stability, recovery | 4 | Reload keeps state. A stale click is refused and the list refreshes with the newer value. A double click stores one version |
| D6 Governance | 4 | Who and when are kept through re-confirm and confirm, with audit lines. The audit names the officer by id "user-O" (m5) |
| D7 AI trust | n/a | No AI, US$0 |
| D8 Orientation | 4 | The list comes first on the client overview, and the line sits above the question in the part |
| D9 Flow | 3 | Confirm section stays the primary button when only answers waiting for the client remain (m2). M1: two actions on one answer |
| D10 Language | 4 | Plain, short words. The client sees the third-person field meanings (existing, not this PR) |
| D11 Feedback, state | 2 | M1: "Re-confirmed: it is your own answer now" while the radio still shows another value |
| D12 Visual quality | 4 | Team pills, Notice and Button. At 400 px the row label column is narrow |
| D13 Accessibility | 4 | axe 0, keyboard path, 400/720/1024 px. Tooltips are the native `title` (known limit) |
| D14 Team look | 4 | Existing case-screen components only |
| D15 Speed | 4 | Client view 0.62 s, re-confirm 0.41 s, officer save 0.97 s; the whole case page 1.1 s (networkidle) |
| D16 Testability | 4 | Pack 20/20 + suite 23/23 (caller). Removing a rule fails a test (C6.18-4, -5, -11, -13, R2c). No test for M1 or for parallel re-confirms |
| D17 | sim. | Simulated only |
| D18 Provenance | 4 | The Officer pill shows who and when. The Sample loader re-confirms in Client A's name without saying so (m4) |
| D19 E2E closure | 3 | Officer → client → forms works for IMM 5257, but not for Schedule 1's matching questions (M2) |
| D20 | sim. | Simulated only |

## Issues (Must = Major, Should = Minor)
**M1 (Must): "This is right" re-confirms the stored officer value even after the client picked another value under it.** Repro at 1440 px: the officer records "refused a visa" = No. As the client: Change → the part → tick Yes → "This is right" (not Save). Result: the server stores No as `client_reconfirm`, confirmed, so it fills IMM 5257. The toast says "Re-confirmed: it is your own answer now". The radio still shows Yes. The Agent view then shows "No · Counts as confirmed · confirmed by Client A". This answer goes on an IRCC form against what the client chose. Cause: `ReconfirmLine` posts only the answer id (`questionnaire.tsx:588–595`) next to a live draft field (`:507–512`); `reconfirm` takes no value (`runtime.ts:401`). Fix: send the value the client has on screen and refuse it (409, in words) when it differs from the stored one, or disable "This is right" while the draft differs. Add a pack line for it. (The breaker found this independently; its report is in this folder.)

**M2 (Must): on the checkpoint, Schedule 1 asks the same background questions, and they are not protected.** Visitor visa release 2 maps IMM 5257 SCH1 (`imm5257_1e.inventory.json`). It asks `person.has_military_or_security_service` ("served in any military, militia, civil defence unit, security organization or police force…", the same subject as the protected `person.military_service`) and `person.has_held_government_position`, plus the military, government and organisation groups. Its reading has no "BACKGROUND INFORMATION" heading (`background.ts:27`), so an officer's entry there is confirmable by Confirm section and is written without the client. The same gap will hit IMM 5669 ("Schedule A Background / Declaration", reading heading `SCHEDULE ABACKGROUND / DECLARATION`). Fix, either one:
* (a) cover these through data. The derivation already honours a library `client_only` placement, and a reading rule could take a form whose own title names Background.
* (b) a tech-lead or immigration-expert ruling that Schedule 1 is not "background" (SA-01B §open: "which background questions are client-only: Counsel or the expert"), recorded in the README's known limits with the checkpoint facts named.

Not new scope: this is the row's "every … background answer" on the checkpoint itself.

**m1 (Should):** `reconfirm` vouches for an answer with problems, and staff can store a whitespace or `[]` value through the API. The client then sees an empty value with "This is right" (seen: `"   "` on a yes/no, stored with the problem "Answer yes or no."). It is never written on a form ("needs a fix"). Fix: refuse to re-confirm while `checkValue` has problems, and show the problem in the list.
**m2 (Should):** `open` (`questionnaire.tsx:775`) counts answers waiting for the client, so Confirm section stays primary after it has done all it can. A second press confirms 0 answers. Exclude `awaits_client`.
**m3 (Should):** Decision 8's words on Ready to file ("recorded by staff, the client re-confirms it") sit inside "and N more" (`readiness.ts:102`, 3 labels shown). On a fresh case they were never visible. List the waiting ones first, or give them their own line.
**m4 (Should):** the Sample loader re-confirms every background answer as Client A (`sample-case.ts:137–145`). `out.reconfirmed` is never reported, and the checkpoint rows do not say that the loader did it (AGENTS rule 4: label it Sample).
**m5 (Should):** the audit text says "the case officer user-O recorded" (`runtime.ts:420`). Use the role or name, as the other lines do.
**m6 (Should):** `missingLabel` was inserted between `passProblem`'s doc comment and its function (`readiness.ts:188–191`). `backgroundBlock` copies `backgroundQuestions`' walk; share one.
**m7 (Note):** an optional background fact waiting for the client is not in readiness (`forms.ts:165`). It would be left off the form, not re-confirmed before signing. No checkpoint fact is optional (all 12 are required).

## Notes
* **B150 (#1251, P-411: every declared answer fills forms at once).** This PR keeps an officer-recorded background answer off the forms until the client re-confirms it. Whichever merges second must keep `awaitsClient` ahead of any fill rule. This is a question for the tech lead and does not block.
* **Graph:** G1 0 · G2 0 · G3 12 · G4 0 · G5 0 · G6 6, none for this PR. The reconfirm route is named by the suite, and the suite is filed under C4.9. `qa/CAPABILITIES.md` has no C6.18 row.
* **Not checked:**
  * a real screen reader;
  * CI on the PR (`gh` gave no answer here);
  * an intended user's unaided walk (D17, D20);
  * the PDF bytes after M1 (inferred from `confirmed: true` and P-72);
  * a re-run of gate B and the suites (the caller's evidence).

  No retrofit mapping is recorded (no `build-notes.md`).

**Verdict: Block** (fix list for `69c33c235`):
1. M1: "This is right" must not store the officer's value when the client's screen shows another. Refuse it or disable it, and add a test.
2. M2: Schedule 1's matching background questions on the checkpoint. Cover them from data, or get a recorded tech-lead or expert ruling and add them to the known limits.
3. Minors m1–m6 when convenient; m7 is a note.
