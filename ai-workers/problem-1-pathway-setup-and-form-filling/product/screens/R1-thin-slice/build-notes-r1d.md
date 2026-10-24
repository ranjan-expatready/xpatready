# R1d — Fill and never overwrite · build notes (runtime lane, 24 Oct)

Plan §9 row R1d and §8 RT-13…RT-17: IMM 5257 (and the case's other PDF forms) filled from the case's confirmed facts only; a new copy only when the officer asks; out of date and stale after a fact changes; a locked copy never changes. No paid AI (US$0).

## What was built
| Element | Where | Rule |
|---|---|---|
| Shared fill step | `api/src/fill.ts` `writeForm` (S-11): the preview fill's own steps moved into one function, behaviour unchanged; the preview and the case both call it | values in each form field's format or code, signatures and the oath never written, append-only writer (`p5/fill.py`), read back, signatures checked |
| Records | `FormInstance`, `AnswerSnapshot` (team names); migration `20261024230000_runtime_r1d_forms` (expand only, rollback in its header); CHECKs on status and lock; triggers: a copy only moves forward, a generated copy is never rewritten and is locked at most once, a locked or failed copy never changes, a snapshot never changes | P-65 d, RT-16 |
| Engine | `engine/runtime/forms.ts`: `formCoverage` (the shared renderer's coverage on the case's known facts), `factsOf` (confirmed only), `inputHash`, `changedFacts`, `readiness` | P-72, RT-14, RT-15 |
| API | `api/src/fill-case.ts`, registered in `main.ts` (S-12): `GET cases/:id/forms`, `POST cases/:id/forms/:form/:subject/generate` (202, idempotent), `GET form-copies/:id`, `POST form-copies/:id/lock`, `GET form-copies/:id/file`; officer only; malformed ids 404 | RT-12, RT-13, RT-16, RT-17 |
| Job | in-process queue, one copy at a time, status persisted (QUEUED → RUNNING → GENERATED / FAILED); restart: queued copies resume, a running one fails "interrupted"; a copy writes the facts frozen when it was asked for; a file that fails its checks is never handed over | STANDARDS §3 background work (adapter: the team's Redis worker) |
| UI | `web/src/runtime/forms.tsx` on the case page: per form and person the draft ("a copy made now writes N of M form fields"), readiness (P-71), the latest copy and the latest locked copy always in view (Generated, Out of date with the changed questions, Locked, Stale · Filed), Download, Lock with an in-page confirmation, earlier copies | P-45, P-65 |

## Decisions (small, technical; disagree in the check)
1. **Ready to file (P-71)** = every required, not hidden question that fills this form for this person has a confirmed answer; the form's own Validate is Adobe's (its steps for a person are shown on the copy). Conflicting facts are not a concept yet (one current answer per fact).
2. **Out of date** compares the confirmed facts a copy read (frozen) with today's, form field by form field; a fact edited and not yet re-confirmed counts as changed (it would no longer be written).
3. **Lock kinds** "Validated copy uploaded back" and "Filed"; only an up-to-date generated copy can be locked; signed-PDF states stay M3 (plan §3, M5).
4. Copies are written under the workspace's working files (`var/workspaces/demo/cases/<case>/`), so the demo reset removes them with their cases.

## Shared files changed (for the Lead's check)
| # | File | Change |
|---|---|---|
| S-11 | `api/src/fill.ts` (forms lane) | the fill steps moved into exported `writeForm(snapshot, coverage, form, dir, base)`; `Fill.fill` calls it; no behaviour change (forms suites and the studio browser fill green) |
| S-12 | `api/src/main.ts` | register `CaseFormsController` and `CaseForms` (2 lines) |
| — | `api/src/runtime.ts` | `reach`, `snapshotOf`, `peopleOf`, `state` no longer private (used by `fill-case.ts`) |

## Checks run
* `tests/runtime/check_runtime_r1d.ts` (new): **25/25**: roles (client, other client, configuration person, malformed ids), generate as a job (202), intact copy, exactly the confirmed facts written, the spouse's principal-answered fact not written (P-72/P-78), file hash and download (officer only), idempotency (same key, other person 409, simultaneous presses), unknown form 404, not ready to file with the missing facts, lock (client 403, unknown kind 400, pass, twice 409), database refuses changing a locked or generated copy or a snapshot, stale after a change with the fact named and the file unchanged, nothing regenerated on its own, an unchanged copy not out of date, a new copy up to date, an out-of-date copy cannot be locked, audit present and without values or names.
* Engine `check_case_engine.ts` **36/36** (RT-13 confirmed only, RT-14 ready and not ready, RT-15 two properties: hash independent of order and sensitive to any value; changed facts exact).
* Journey `check_runtime_r1c.cjs` **93/93** with the forms steps (generate, download, lock with confirmation, stale after a change, new copy), axe 0 on the three new states, no sideways scroll at 1440 and 1024.
* Mutation checks: removing the out-of-date lock refusal fails "RT-16 fail: an out-of-date copy cannot be locked"; a blind `changedFacts` fails three RT-15/16 checks.
* Order on one copy: setup 13/13 → journey 93/93 → R1d 25/25 → R1a 97/97 (R1a `--reset` clears the workspace, so R1d runs before it). `run-suites.sh --demo` 20/20 green; explicit any 437 (baseline).

## qa items on R1c done first in this pass (Lead, 24 Oct; qa after-merge 3)
| qa | Fix | Test (each fails when its fix is removed) |
|---|---|---|
| QA-35 Major: the Demo menu's "Open the case area" gave the author a blank page | the case area re-renders itself after switching to the case officer (the person hook subscribed too late to hear the switch) | journey "QA-35 fail-guard": the author enters from the studio's Demo menu, as a person does |
| QA-36 Minor: Back stored "2027-02-31" and said "✓ Saved" | one way to leave a part for Back and Save and continue (Lead decision, P-47): the answer is saved and flagged, the part stays with the summary, the status says "Saved: N answers need a fix", and the summary offers "leave them for now and go back / continue" | journey "QA-36 fail-guard" and three "QA-36 pass" lines |
| QA-37 Minor: "(3 boxes)" | "form fields" in the edit dialog and the save message (P-63) | journey "QA-37"; API "QA-37 pass" |
| QA-26 rest: "applies" as text | plain words: "Say whether the person is travelling (true or false)." | API "QA-26 fail: applies" |
Journey 99/99, R1d 25/25, R1a 99/99, engine 36/36; `run-suites.sh --demo` 20/20.

## Known gaps
1. Restart recovery of the queue is written, not tested by a suite (a restart mid-generation).
2. "By hand" counts a confirmed value whose form field has no code for it (option map); the copy lists them, the officer writes them in Adobe.
3. The forms list repeats IMM 5707 per person where the release places it per person; whether IMM 5707 is one per applicant is the immigration expert's question (plan §11).
4. No portal sheet for Online forms (M3).
Screenshots: `screenshots/r1c/*forms-*` (generated, lock confirmation, stale). AI cost: US$0.
