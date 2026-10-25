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

## After the early look (Lead, 24 Oct: Go with changes)
| Change | Where | Test (fails when the change is removed) |
|---|---|---|
| (1) P-71: a copy is locked (Filed / Validated copy uploaded back) only when its form is ready to file; generating stays allowed | API `lock` refuses with 409 and the reason; the buttons are disabled with "Not yet: N facts to confirm before filing: confirm them, then generate a new copy." (one wording, `notReady` in the contract) | API "P-71 fail" (mutation caught) and "P-71 pass" (every required fact confirmed → ready, a new copy locks); journey "P-71 fail-guard" and "P-71 pass" |
| (2) P-63: "(1 box)" in the save toast | the save message says "form fields" | journey "agent pass: an edit saves …" and API "QA-37 pass" |
| (3) the "fills …" list grows with the household | `fillsText` (contract): one line per form, "IMM 5257 for 6 people", each person on hover; the save message too | journey "readability (Lead, R1d)" |
| (4) IMM 5707 per person | stays as the release places it (expert question on the Lead's list) | |
Also: the journey's states wait until no button is busy before the screenshot and axe (a contrast flag was caught mid-transition). Journey 102/102 twice on fresh copies, R1d 27/27, R1a 99/99, engine 36/36; `run-suites.sh --demo` 20/20.

## Fixes (CHECK → FIX): review-r1d.md (7/10, Ship after fixes) and break-report-r1d.md (0 Blocker, 7 Major, 6 Minor)
| Finding | Fix | Test (each fails when its fix is removed) |
|---|---|---|
| review M1: a form whose fill trial has not passed could be Ready and Filed (P-65 a) | `trialPassed(form)` reads the evidence lane's own record (`evidence-lane/E1/<form>/STATUS.md`, its "## Verdict": "Passes …" or "The product's part passes …", never "… does not pass …"); the forms list carries `trial_passed`; the row shows "Checked copy, not for filing" and the lock buttons are disabled with the reason; the API refuses the lock (409). Today IMM 0008, 1295, 5257, 5409 and 5707 pass; IMM 1344 ("passes in Adobe … does not pass from the product's file alone") does not; a form with no record does not | R1d "review M1" (mutation: dropping "does not pass" makes IMM 1344 fileable); journey "review M1 fail-guard" |
| review M2: no test for "an unconfirmed fact blocks ready" | engine RT-14 cases: every required fact answered, one not confirmed → not ready, reason "not confirmed" | engine "RT-14 fail (review M2)" (it passed with the rule removed before; now caught) |
| review M3 / break m3: the blocking facts only in a tooltip; by-hand form fields unnamed | "What blocks filing (N)" opens a list on the row: question, whose, why (not answered, not confirmed, needs a fix); a copy lists "To write by hand in Adobe: question (reason)"; long lists show 5 and "and N more" | journey "review M3 pass" |
| review M4: the draft count did not match the copy | worded as what it counts: "Confirmed answers for N of M form fields; K answered but not confirmed stay blank. A copy also lists the form fields to write by hand." | journey "forms: … says" |
| review M5 / break m2: focus lost when locking | the confirmation takes the focus; Cancel gives it back to the button pressed (found again by its kind, since the buttons are drawn again); after locking, the form's heading takes it | journey "review M5 pass" ×2 and "break m2 pass" (it failed first: the stored element was gone) |
| break M1: download read the file twice (hash checked on one read, other bytes sent) | one `readFileSync`; those bytes are hashed and sent | code reading (a swap race is not reproducible by a suite) |
| break M2: a flagged answer ("1991-02-31") counted as ready | readiness: a confirmed answer with a problem is "needs a fix" and blocks | engine "RT-14 fail (break M2)" (mutation caught) |
| break M3: required groups with no rows never block | **not blocking** (same rule as the questionnaire, `case.ts`): the row says "No entries yet in: …. Add them if they apply before filing." Whether IMM 5257 needs at least one employment or contact row is the immigration expert's question. **Lead decision** if it should block | |
| break M4: a person marked not travelling hid their filed copy | a form that stops applying stays in view while it has copies (`applies: false`, "no longer applies …; its copies are kept"); Generate disabled, API 422 | R1d "break M4 pass" |
| break M5 / m5: DELETE of a copy or its snapshot; INSERT of a fabricated generated copy; workspace change; backdated lock | migration `20261024233000_runtime_r1d_guard`: no DELETE while the case exists (the demo reset still deletes cases); a new copy must be QUEUED and empty; `workspace_id` immutable; a lock stamped within 300 s of now | R1d "break M5" ×2 and "break m5 (database)" (mutation: dropping the delete trigger fails them) |
| break M6: two children with the same name shared readiness | readiness matched by the person's id (`fills[].subject`), not the label | engine "RT-14 pass (break M6)" (mutation caught) |
| break M7: a job error could crash the queue | `drain()` catches per job; `run()` marks the copy FAILED only while RUNNING (`updateMany`), so a deleted case cannot throw | code reading; restart recovery stays known gap 1 |
| break m1: a missing file gave 500 | 404 "missing from the working files"; the copy shows "File missing" with no Download (`file_ok`) | R1d "break m1 fail" and "pass" (mutation caught) |
| break m4: body validated before the role | `copyFor` (who) before `parse(LockCopy)` (what) | R1d "break m4 fail" |
| break m5: a path leading outside the working files | the real path must lie under the working files (`VAR_ROOT`), else 409 | R1d "break m5 fail" (a symbolic link with the same bytes) |
| break m6: no cap per case; malformed form names echoed | at most 5 copies of one case queued or running (429 in plain words); a form name must look like "IMM 5257", else 404 "No such form." | R1d "break m6" ×2 (mutation: cap 99 fails it) |
| review minors 1–2 | "Added or changed:"; "stays"/"stay"; "to answer or confirm" | journey and R1d wording checks |
Not fixed, recorded: review minor 5 (lock race: readiness checked before the `updateMany`, whose WHERE does not cover the facts: a fact saved in the same instant can make a just-locked copy stale at once, which the stale rule then shows); review minor 6 (no retry, backoff or cancel for the job; known gap 1); non-Latin names written into IMM 5257 (expert question).
Environment note (cloud): the database role is a superuser here, so the triggers are the guard; they hold for superusers too (only `session_replication_role = replica` skips them).
Fresh copy, suite order: setup 13/13 → journey 107/107 → R1d 38/38 → R1a 99/99; engine 39/39; `run-suites.sh --demo` 21/21 green; explicit any 437 (baseline); AI cost US$0.

## Lead answers after the FIX (24 Oct)
1. Break M3 (P-71): an empty required repeating group that applies **blocks** ready to file. The person may record "none apply" for the group: a fact like any other, confirmed per P-72, which clears the block. Built next, after the Lead PR merges.
2. The evidence lane's `STATUS.md` verdict is the fill-trial record for now (IMM 1344 not passed, IMM 5707 passed, as read). A machine-readable trial record comes later.

## PR #12 review (Lead, 25 Oct): three defects in `api/src/fill-case.ts`
| Finding | Fix | Test (each fails when its fix is removed; mutation run 38/43) |
|---|---|---|
| 1 Major: forms chosen by `field_maps[].channel` only, so a form the release files Online was offered and every copy FAILED | `pdfForms(snapshot)` (engine): a PDF form only when its filing line (`forms[].channel`) is not Online and it has an official file and map; used by the list and by generate; generate answers 422 "IMM 5257 is filed Online in this case's release: its answers go on the portal sheet, not in a PDF." | R1d "PR #12 review 1 fail" and "pass-guard" (fixture: a copy of the release with IMM 5257 Online, pinned by a new case, then moved to version -1 so later suites keep the real release) |
| 2 Major: lock did not check the file, so a missing or changed file could be Filed and never corrected | lock runs the download's file check (`checkedFile`: present, inside the working files, same sha256) before locking: 409 in plain words | R1d "PR #12 review 2" ×3 (missing, changed bytes, then the same copy locks with its file back) |
| 3 Minor: the five-active cap was counted outside the insert transaction | inside the transaction: `SELECT … FOR UPDATE` on the case row, then count, then insert | R1d "PR #12 review 3": six simultaneous distinct-key presses → at most 5 accepted, the rest 429, rows = accepted |
R1d 43/43 on a fresh copy.

## "None apply" for required repeating groups (BUILD, 25 Oct; Lead answer to break M3, P-71/P-72)
* **Record:** new table `client_group_answer` (migration `20261025010000_runtime_r1d_none_apply`, expand only): one current answer per person and group (partial unique index), `none_apply` true ("none apply") or false ("entries apply", the change back), DECLARED or VERIFIED, append-only by the same trigger as answers and rows. Not a `client_canonical_answer`: that table needs a canonical field, and a group is a section, not a field. **Plan discovery:** the team's model has no such record; whether it should be a canonical field per group is for the Lead (plan).
* **API:** `PUT /api/runtime/cases/:id/groups/:subject/:group/none-apply {noneApply, expectedId}`: same role rules as adding an entry (the client only on a group holding a client field; a group of the application only for the application); checked against the version seen (409); the same answer again saves nothing; refused while the group has entries (409 "remove them first"); adding an entry is refused while none apply stands (409 "change it to entries apply first"); Confirm section confirms it with the section's answers and refuses (409, `group:<section>` named) when it was not seen. Audit without values.
* **Engine:** `caseView(…, groupAnswers)` gives each group section `group: {required, client, rows, none_apply}`; its confirmation is the answer rule (P-72, P-78: the principal's own counts; the officer's waits for Confirm section). `readiness`: a required group a form reads with no entries blocks as `group:<section>`, "<title>: add the entries, or say none apply", until none apply is confirmed ("not answered" / "not confirmed"). `empty_groups` is gone (it now blocks).
* **UI:** both views: an empty group offers "Add an entry" or "None apply" ("The forms need one or the other before filing" when required); "None apply" shows its confirmation and "Entries apply after all". The agent view's Confirm section includes it.
* **Tests:** engine 44/44 (+6: not answered, the officer's waits, entries apply without entries, confirmed → ready, the principal's own counts, the view shape); R1d 57/57 (+14: blocking named, client's own, same again, stale 409, no entry beside it, unblocks, change back and entries, refused beside entries, history, officer's waits, Confirm unseen 409, seen confirms, refusals 400/404/404/422, database append-only, audit); journey 116/116 (+5: client offer, client pass and change back, blocking list names it, officer's waits, Confirm section); R1a 99/99. Mutations: readiness rule off → engine 41/44; group confirmation always true → 43/44; the three server rules off → R1d 44/57.
* Note: "Your visit" (the visit contact) is a group asked once for the application, so its "none apply" is the application's.

### Fixes (CHECK → FIX): review-r1d-none-apply.md (8/10, Ship after fixes) and break-report-r1d-none-apply.md (0 Blocker, 1 Major, 6 Minor)
| Finding | Fix | Test (each fails when its fix is removed) |
|---|---|---|
| break M1: a filed copy never went stale when its "none apply" was withdrawn (a group answer fills no form field) | a copy keeps the groups it read (`groupFacts`: none apply confirmed, entries) beside its facts; `changedGroups` adds 'Entries in "<title>"' to out of date / stale and to the lock refusal; copies made before have no record and compare nothing | engine "break M1" ×2; R1d "break M1 fail/pass" (mutation caught) |
| review M1: an empty required group showed "Done" / "Optional" and Save and continue let it through | the part lists the group as missing until none apply is said ('Entries in "<title>": add them, or say none apply'); none apply counts as an answer of the part; the client's summary names it, linked to "None apply" | engine "review M1" ×2 (mutation caught); journey "review M1 fail-guard" and "pass" |
| review M2 / break m3: focus dropped to the page after None apply / Entries apply after all | the control that replaces the pressed button takes the focus ("Entries apply after all", or "Add an entry") | journey "review M2 pass" ×2 |
| review m3: same button names in every group | "None apply: <group> for <person>", "Entries apply after all: …", "Add an entry: …" (agent view) | journey (role names) |
| review m4: no who/when for none apply in the agent view | the same who/when line as an answer | |
| review m5: section pill "0 answered" after none apply | none apply counts in answered / confirmed | engine "review M1 pass" |
| review m6: a hidden "entries apply" (with entries) was sent as seen and confirmed | with entries, the agent view sends nothing for it and the server neither requires nor confirms it; an id sent anyway is not "changed" | R1d "review m6 pass" (mutation caught: it found a real 409) |
| review m7: no test for the principal's none apply for the adult spouse | test added (P-78: answered by the principal, not confirmed) | R1d "review m7 pass" |
| review m8: "Entries apply after all" looked like text, small at 390 px | a secondary button, 44 px high in the client view | |
| review m9 / break m6: wording | 'Entries in "<title>": add them, or say none apply' (the entries, not the whole part) | engine, journey wording |
| break m1: "entries apply" said first recorded an empty answer | nothing is saved (200, saved false) | R1d "break m1/m5/m4" (mutation caught) |
| break m2: Confirm section's `changed` could name a group wrongly | the group is named only for its own changed answer | R1d "break m2" |
| break m4: rule refusals titled "Changed by someone else" | "Not possible now" (type not-possible) for the two rule refusals | R1d "break m1/m5/m4" |
| break m5: the same answer from an older tab got 409 | the same answer saves nothing, whatever the view (200) | R1d "break m1/m5/m4" (mutation caught) |
Fresh copy, suite order: journey 120/120, R1d 62/62, R1a 99/99, engine 48/48; `run-suites.sh --demo` 21/21; explicit any 437; AI cost US$0.
Not fixed: the review's surviving engine mutation (confirmation read on the group's first fact instead of its client fact) needs a fixture group whose first fact is the officer's; none of the release's groups has one today (recorded). Questions for the Lead (from the review): a group counts as required when any per-entry question is required, so in the visitor visa every group is (Education history too): everyone answers "none apply" somewhere; the principal's IMM 5707 is blocked by the spouse's Employment history (from the field map): the immigration expert's question.

## Known gaps
1. Restart recovery of the queue is written, not tested by a suite (a restart mid-generation).
2. "By hand" counts a confirmed value whose form field has no code for it (option map); the copy lists them, the officer writes them in Adobe.
3. The forms list repeats IMM 5707 per person where the release places it per person; whether IMM 5707 is one per applicant is the immigration expert's question (plan §11).
4. No portal sheet for Online forms (M3).
Screenshots: `screenshots/r1c/*forms-*` (generated, lock confirmation, stale). AI cost: US$0.
