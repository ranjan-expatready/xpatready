# Review: C6.11 Firm, users and case team (M3-11, BR-20, SI-9 / SI-15)

Reviewer: fresh agent, did not build it · 1 Nov 2026 · branch `claude/loving-cannon-husr9q` at **a9b54597** (`git diff origin/main...a9b54597`, 17 files) · isolated copy `rev_c611` on :4435 (Visitor visa released with `setup_visitor_visa.ts`, 13/13), stopped after the review · US$0, no AI calls.
Bar: `screens/M3-agent-view/concept-draft.md` §11 BR-20, §6 tests, §8 M3-11 row; board `design/draft-agent-view.html` frames 1 and 2; `STANDARDS.md`, `EXPERIENCE.md`, `QUALITY.md`, `STAND-INS.md` SI-9.
Journey test (the one score for this check): `journey-test-reviewer-2026-11-01.md`, **7.5 / 10** (below the 8 pass mark).

## Verdict: Block (changes needed): two Majors, listed under "To fix before Approve"

## What holds (evidence)
* `check_c611_team.ts` 47/47 on my copy: pure rules plus API and database, each rule with a pass and a fail check.
* The database keeps its rules even when the service is bypassed: there is one current representative of record (partial unique index), the same person cannot hold a role twice at once, and an ended row needs who ended it and why.
* Two "Assign" presses at once give 201 and 409, so no duplicate row. A representative change locks the case row (`FOR UPDATE`).
* Server authorisation:
  * user-O (case officer) and user-T (representative without firm admin) are refused with 403 when they assign or take someone off.
  * Staff of another firm get 404 on the case, its forms and copies (everything goes through `Runtime.reach`) and in the case list.
  * A client reading the case gets no team.
* Migration: one column added with a default, one table added, rollback recorded, nothing rewritten. A case opened before the migration shows "No representative of record yet". On my copy the firm admin assigned one (PUT gave 200) and history started from there.
* Browser:
  * "Open a case" fills the case team from the firm. The solo firm shows the same person in both fields, with the board's note.
  * The header chip changes after a change and after a reload.
  * The "A new IMM 5476 is needed" notice appears; the history keeps the reason. The officer sees the dialog read-only.
  * axe found 0 WCAG 2.2 A/AA violations in 6 states. No sideways scroll at 400, 1024 or 512 px (1024 at 200 %).
* The graph (`graph.mjs`): every new route is reached by a test. The one G3 finding (`/attachments/:id/file`) has nothing to do with this PR.

## Issues, ranked
**Major 1 (Must): firm isolation leaks through `GET /api/activity`.** `api/src/studio.ts:839` returns every audit line in the workspace to anyone with the case duty. Acting as user-S (solo firm), I read 3 lines about the Sample firm's case: its id, "opened case … representative of record user-R", officer assigned and taken off. This PR writes those lines (`api/src/team.ts:89,101,112`; `runtime.ts:110`), and the History page shows them (`web/src/pages/history.tsx:30`). The brief's rule is that staff of one firm reach none of another firm's cases. **Fix:** for firm staff, keep only case lines whose case is in the actor's firm (join `runtime_case.firm_key`, or store the firm on the audit line). Add a fail check: user-S's `/api/activity` holds no line for a Sample firm case.

**Major 2 (Must): the new screen states have no automated browser journey or axe check.** The team dialog (change, the IMM 5476 notice, take off, read-only for the officer) and the header chip are exercised only through the API. `STANDARDS.md` §7 requires "axe-core on every screen state" and "a few Playwright journeys per screen" (both [M]). Concept §6 requires "Keyboard path, axe on every state, 1440 and 1024 px". r1c's "Open a case" shots cover frame 1 only. **Fix:** a short Playwright journey for these states, with axe at 1024 and 1440 px. My script `/tmp/rev_c611/walk.cjs` can be a starting point.

**Minor 3 (Should): audit summaries show raw ids on screen.** For example "Representative assigned user-O as case officer", "made user-T …" (`team.ts:89,101,112`, `runtime.ts:110`). They show on the History page against QA-74 and EXPERIENCE "no IDs on the main path". Names from the seeded file are not typed values. Write the names, as `peopleNames` does.

**Minor 4 (Should): a case reference reveals other firms' cases.** It is unique per workspace, not per firm. When user-S opens a case with a reference the Sample firm already uses, the reply is 409 "A case with this reference already exists". **Fix:** make it unique per (workspace, firm), or use a neutral message.

**Minor 5 (Should): focus is not returned to "Case team" after Escape or Close.** It lands on `<body>` (WCAG 2.4.3). The existing "Open a case" dialog does the same, so the cause is the shared conditionally mounted `Dialog`. **Fix:** return focus to the trigger (`onCloseAutoFocus`, or keep the dialog mounted).

**Minor 6 (Should): taking off the last case officer is allowed silently.** Opening a case requires at least one officer (`contracts/runtime.ts` `.min(1)`), but `endOfficer` allows none, and the chip then says "no case officer". I accept allowing it (EXPERIENCE §9 "warn, don't block"). Missing: an in-page warning before the last one goes, and a record of the decision in the PR or `challenge.md`.

**Minor 7 (Should): user-T, a third Sample user, differs from the written bar.** The concept §11, the §8 row and `STAND-INS.md` SI-9 all say "a representative and a case officer". Judgement: justified. Concept §6's own BR-20 test ("changing the representative of record → new IMM 5476") cannot run in a firm with one licensed person. Today it is recorded only in `samples/firms.json` `_note`. It needs a line in `challenge.md` or the PR and the SI-9 row updated by the Lead, so it is not a silent deviation.

**Minor 8 (Should): a rule's check is missing for one route.** Removing `cannotAssign` from `endOfficer` (`team.ts:107`) would fail no test: only add and change are checked with a non-admin. user-T (holds represent, not firm admin) is never tried.

**Minor 9 (Should): copy and consistency.**
* The notice reads "changed on Nov 1, 2026, 01:05 p.m.." (double full stop, `web/src/runtime/team.tsx:96`).
* Field errors come back as 400 on open (`runtime.ts` `fieldError`) but 422 on team changes (`team.ts:18`).
* The Stand-in words are written in both `api/src/firms.ts` and `team.tsx` (TODAY and LATER), and the web ignores `stand_in` from the API.
* The staff lists `PEOPLE`, `STAFF` and `WHO` are hard-coded in the web, a second copy of `RUNTIME_ACTORS`.
* `teamLine` re-reads `firmKey` that `reach` already has (an extra query, not one per row).

**Minor 10 (note): parts of the bar not built, and not findings.**
* The IMM 5476 PDF is not filled because IMM 5476 is not in the Visitor visa release. The facts and the change flag are built, and `new_needed` never clears, which is honest until IMM 5476 copies exist.
* `qa/CAPABILITIES.md` C6.11 still says "Not built" (qa's update).
* The solo chip repeats the name ("Solo representative (Sample) · CICC R000001 · Solo representative (Sample)"). The board shows the same pattern, so this is not a finding.
* The board puts "Change the case team" under ⋯. The build uses a visible "Case team" button: this does not break the bar.

## Judgement on the builder's deliberate choices
* **Third user user-T:** accepted; it needs recording (Minor 7).
* **IMM 5476 filling not wired, only facts and flag:** accepted; it is in scope as far as the release allows.
* **Removing the last officer allowed:** accepted with a warning (Minor 6).
* **No team in client reads:** accepted; it matches P-129, and the test checks it.

## D1–D20 (1–5)
| D | Score | Evidence |
|---|---|---|
| D1 Requirement fit | 4 | Every BR-20 element is built, including §6's two tests. One known gap: IMM 5476 filling waits on the release. Isolation is incomplete (Major 1). |
| D2 Data integrity | 4 | Partial unique indexes, check constraints, row lock, and a race that ends 201/409. The case reference reveals other firms (Minor 4). |
| D3 Reuse | 4 | Firms come from one seeded file, and the IMM 5476 keys are the library's. The actor lists are duplicated in the web (Minor 9). |
| D4 Rule integrity | 4 | `openingTeam` defaults are consistent between web and server; the solo default is right. |
| D5 Stability and recovery | 4 | Reload keeps the team, a double click is safe, and a legacy case recovers through assignment. |
| D6 Governance | 4 | History keeps who, when and why; audit lines exist for each action. They carry raw ids (Minor 3). |
| D7 AI trust | n/a | No AI. |
| D8 Orientation | 4 | Breadcrumb, then the chip directly under the case title. |
| D9 Flow | 4 | One "Case team" action; choices are prefilled. Removing the last officer has no warning (Minor 6). |
| D10 Language | 4 | Words follow PRODUCT.md §4 ("representative of record", "case officer"). Raw ids show in History, plus the double full stop. |
| D11 Feedback and state | 4 | Toasts, the IMM 5476 notice and field errors for a short reason. |
| D12 Visual quality | 4 | Team components and tokens; the chip matches frame 2. |
| D13 Accessibility | 3 | axe clean, keyboard path works, 1024 px and 200 % zoom fine. Focus is not returned after closing (Minor 5). |
| D14 Team look | 4 | Same Dialog, Field, Pill and Stand-in components as the rest. |
| D15 Speed | 5 | Opening a case took 249 ms; one team read per dialog. |
| D16 Testability | 3 | 47 checks, each with a pass and a fail. No browser or axe journey for the new states (Major 2), and `endOfficer` authorisation is untested (Minor 8). |
| D17 First use | – | Simulated only. |
| D18 Provenance | 4 | Stand-in chip SI-9 everywhere, Sample licence values marked. |
| D19 Closure | 3 | Open a case, header, change, then a new IMM 5476 asked for. The IMM 5476 copy itself is not yet produced. |
| D20 Pain solved | – | Simulated only. |

## Could not check
A real screen reader. An unaided walk by an intended user (D17 and D20 stay with the founder). CI on this commit (I ran the suite locally only). The full shard run (`run-suites.sh` grouping looked right by reading: C6.11 runs after R1d and before R1a's reset).

## To fix before Approve
1. Major 1: filter `/api/activity` by firm for case staff, with a fail check.
2. Major 2: a Playwright journey with axe for the team dialog states and the header chip, at 1024 and 1440 px.
Minors 3–9 are recommended in the same PR (3, 4 and 8 are small).
