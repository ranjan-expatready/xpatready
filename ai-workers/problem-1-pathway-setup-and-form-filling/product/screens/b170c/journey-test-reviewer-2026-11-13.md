# B170c journey test: reviewer, 2026-11-13

Commit 5f9b8a03fb85d657229820ba4557e258e17be1af. This row has no screen. The adapter's user is the code of a later row (B170d, e, f),
acting for a case officer who will see its answer as one line. So the journeys go through `askXfaEngine` on the committed IRCC blanks
and the engine's made-up form. "App unchanged" was checked on isolated copy `b170c_rev` on :4452 (forms ports; never :4400). Node 24.21.0,
live AI off, US$0. Probe scripts were kept in the reviewer's scratchpad and not committed. This is the one journey score for this check.

## Journeys
1. **Main (case officer, through B170f):** "Does the form's own check pass on this IMM 5257?" On the blank, the expected answer is
   "not complete" with the form's box and message. **Held:** `stops_at` `…PersonalDetails[0].ServiceIn[0].ServiceIn[0]`, "The following
   field must contain a value: … I want service in", 5 pages, 2.5 s.
2. **Alternate (the engine's made-up form):** **Held:** `stops_at` `…Details[0].Name[0]`, "Name is required".
3. **Refused form (IMM 1294, Paper on sp.outside):** "not available" with the reason, never a blank. **Held:** `not_available`
   `UNSUPPORTED_FEATURE` "the engine cannot read this form yet: … picture category "zero" …"; the child exits 0.
4. **Read, but no descriptor (IMM 5645):** **Held:** `reads`, 5 pages, with why, and never a pass.
5. **A written copy of IMM 5257** (the blank with one byte appended, standing in for a filled copy): expected the edition's check.
   **Got** `reads` "no descriptor … recorded for this edition", which is untrue. It fails closed, but the reason is wrong (review Minor 1).
6. **Time limit (400 ms):** **Held:** `TIME_LIMIT` "took longer than 0.4 s … and was stopped"; `pgrep` shows no `run-engine.mjs`
   left at once or 3 s later.
7. **Engine not built / file missing / records unreadable / wrong descriptor:** each **held** as `not_available` with a reason, and
   the build step is named for an unbuilt engine (suite checks).
8. **Every switch off, the app as today:** no app file in the PR diff; the isolated copy's health check is 200 at sha 5f9…; the type check
   shows no new errors; no app file imports `engine/xfa/`. **Held.**
9. **Two tabs, double click (4 calls at once):** **held**. Each got its own correct answer (two IMM 5257, one IMM 1295, one IMM 1294),
   4.9 s in total.

## Break it
- **The guard, with 9 probe strings in engine source.** Caught: a form file name. Not caught:
  - a sub-path of a recorded box (the guard's comment says it catches these)
  - `"ButtonsHeader.ValidateButton[0]"`
  - a real IMM 5257 box that is not in a descriptor
  - a one-word recorded box inside a SOM path
  - a bare `"5257"`
  - concatenation
  - an identifier
  - a template

  The first four make up review Major 2. The other four are accepted limits of B164's whole-string rule (Minor at most).
- **Non-strict engine:** the engine's own tests run the real forms with `strict: true` and expect no unsupported members after
  Validate. The adapter runs non-strict and drops `runtime.unsupported`, so an answer can rest on skipped script (review Major 1).
  `strict: true` gives the same answers on all three Done-when forms.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journeys 1–3: every Done-when case holds, both suites exit 0 (31/0, 59/0) |
| Next step obvious | ½ | The typed answer tells the caller what to do, but `reads` on a written copy points the wrong way (journey 5) |
| Plain words | ½ | Reasons are plain, but a bad descriptor of ours also reads "the engine cannot read this form yet" (Minor 3) |
| Feedback and state | 1 | Every failure has a code and a reason; the time limit says so; never throws |
| Correct data | ½ | The box and message are the form's own, but non-strict runs can answer after skipping script (Major 1) |
| Error recovery | 1 | The child is killed at the limit; an unbuilt engine names its build step; concurrent calls are independent |
| Accessibility and screen sizes | 1 | Nothing visible changes (no app file in the diff); isolated copy healthy |
| Speed | 1 | 2.5 s per call against a 20 s limit; 4 at once in 4.9 s |
| Visual quality | 1 | Unchanged app (no screen in this row) |
| Trust and sources | ½ | Descriptors cite the engine's own files and the SHA-256; an answer does not say the engine skipped script (Major 1) |
| **Total** | **8 / 10** | **Pass** (8 or more, no 0), with two open Majors in the review |

To raise it:
1. Run the engine strict (Major 1).
2. Look up descriptors by edition, so a written copy gets its check (Minor 1).
3. Name a bad record as ours (Minor 3).

**Not tested:** a real screen reader and an intended user's unaided walk (D17 and D20 stay with the founder; there is no screen);
the full PR check on GitHub's runners (the PR is a draft; I ran on Linux with the same Node); a real form that hits an unsupported member.
