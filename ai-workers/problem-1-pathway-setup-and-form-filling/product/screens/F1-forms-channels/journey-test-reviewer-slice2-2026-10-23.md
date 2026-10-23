# F1 slice 2 · journey test (reviewer role) · 23 Oct

Reviewer agent, CHECK of the backend path (P-68). There is no page in this slice, so the journeys were walked through the API, as a person would drive them, on the isolated copy :4452 (`xr_studio_forms_review`, fresh start, demo loaded). AI spend US$0: STUB only. Probe scripts are in the session scratchpad, not in the repo. Review: `review-slice2.md`.

## Journeys (persona · goal · steps · expected → what happened)
1. **Main path. Author drafts a large form in parts.** "Draft IMM 5257 without one huge call."
   * Steps: plan (STUB) → draft → read progress.
   * Expected: parts by section group, each passing the guarded path, progress per part.
   * Result: **held.** Five parts (60/49/56/54/23), "The guarded stub pass in 5 parts (242 of 242 form fields)", every part `done`, admitted as `inventory_part` with its parent named.
   * One wording slip: the end message contains "…for each part. a stub has no AI content".
2. **Alternate. Author drafts a form an earlier edition already maps.**
   * Expected: reuse first, AI only for the rest; nothing to pay when everything is reused.
   * Result: **held, with a data concern.** Plan: 228 reused, 14 to AI, US$0.57 worst. With everything reused: "no AI call, US$0", and apply gives `CODE_MATCH` rows with "as mapped in IMM 5257 (01-2020)".
   * The source rows were unreleased `AI_PROPOSAL` drafts; the label hides that (review item 4).
3. **Main path, online. Author sends the open inputs of an approved online version to the AI; a reviewer accepts.**
   * Steps: capture (4 screens) → finish ("Held for a second person") → second person approves → code-drafted map → accept → AI job (STUB) → accept.
   * Result: **held.**
     * Starting before the code map is accepted gives 409 "Accept the screen map first (no AI); the AI drafts only what is left open."
     * The stub run admits 7 open inputs, and accepting a stub gives 409 "This draft has no proposals to accept".
     * The builder's suite covers accepting a hand-written answer and the refusal of a second accept.
4. **Error. Bad input and unconfirmed spend.**
   * A bad body gives 400 with field messages: "Name the combination this is drafted for. Choose STUB or LIVE."
   * LIVE with the wrong confirmation gives 409 "A live screen-map draft costs at most US$0.33 (7 inputs, up to 2 attempts): send that amount as confirmWorstUsd to go ahead."
   * A bad job id on accept gives "Invalid UUID" (not plain).
5. **Wrong role.** The reviewer and the approver each start a screen_map job: **403** both times. Held.
6. **Empty.** An unknown online version gives 404 "Not found (it may have been removed by a reset)". "Nothing is left open" is guarded in code; I did not reach it.
7. **Recovery. Double click.** Two STUB starts at the same moment:
   * **both 201, 2 jobs** (expected 1 job and a 409);
   * one ends FAILED: "Stub pass failed: launch ticket already used; the screening digest is no longer current";
   * both launches had the same run id. **Fails** (review item 2).
8. **Boundary to case and runtime. Fill IMM 1295 with a Canadian address and phone.**
   * Expected: postal code in the form's format, a Canada/US person step, signatures never written.
   * Result: **held** (suite): "M5V 0A1", step `tick_canada_us`, no signature box written.
   * The step names the phone as "No." (unclear), and says "Tick" a switch the filler already wrote ticked (review items 9 and 10).
9. **Break: hostile part file.**
   * Probe: parts against the real IMM 1344 inventory with a planted `inputs` key, a planted `record` key, and a planted section text, each carrying a Sample family value.
   * Result: all three admitted; the value is in the request and **not found by the request screen**. **Blocker-class** (review Must 1).
10. **Error: a failed AI part.** Not walkable at US$0. The code shows the whole step fails and a retry pays for every part again (review item 5).

## Data underneath (checked by SQL and files)
* **Jobs.** One `drafting_job` per start in normal use. The double start left 2 rows (journey 7).
* **Audit.** "started the stub (US$0) screen-map draft of 7 open inputs" is recorded per start.
* **Screen inventory and part files.** Hold structure only. The screen inventory names its capturer and approver, and those names are not sent to the AI.
* **Ledger.** Stub reserves settle at US$0. No paid line was added.
* **Roles.** Enforced on the server (403).
* **Reused rows.** Origin `CODE_MATCH`, evidence "as mapped in …", and the run named. Their source rows were `DRAFT`, never released.

## Break-it pass (findings)
* **Blocker:**
  * a part smuggles text past the guard and the screen (journey 9).
* **Major:**
  * duplicate jobs and a shared run id (journey 7);
  * the merge keeps another part's answer and drops a missing field silently (probe on `mergeParts`);
  * reuse of unreleased rows, blind to the form field's choices;
  * a failed part throws away paid parts;
  * the paid path is never exercised.
* **Minor:** words ("No.", lower case, "Invalid UUID", ticket jargon), a worst-case confirmation that can go stale, merged runs filed under the demo workspace.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1–3, 5 and 8 complete through the API; the paid merge, apply and screen_map path has never completed, even by replay (6, 10) |
| Next step obvious | 1 | Refusals name the next action ("Accept the screen map first", "send that amount as confirmWorstUsd", "a person reviews the result") |
| Plain words | ½ | Mostly plain; "launch ticket already used; the screening digest…", "Invalid UUID", "for No.:", lower-case sentence |
| Feedback and state | ½ | Per-part status, sections, fields and cost are clear; a collided run reads as FAILED with jargon; needs-person count is 0 on merged runs |
| Correct data | ½ | Split covers every field exactly once (233 and 242 checked); duplicate jobs, merge override and loss, reused rows relabelled |
| Error recovery | ½ | Wrong role, a second accept and an unconfirmed LIVE are all refused well; a double click makes two jobs; a failed part forces a full paid re-run |
| Accessibility and screen sizes | n/a | No page in this slice |
| Speed | 1 | Plan 0.1 s; API calls 20–140 ms; five stub parts plus reuse plus screen_map in a 66 s suite under heavy load |
| Visual quality | n/a | No page |
| Trust and sources | ½ | Accepted AI rows say `AI_PROPOSAL` with the run and the acceptor; US$0 stated; but text bypasses the screen and AI drafts become `CODE_MATCH` |

**5 of 8 applicable criteria = 6/10. Fail (pass is 8 or more).**

## Fixes that raise the score most (in order)
1. Allowlist the keys of parts and screen inventories, and exempt only the parent's text from the screen (trust, correct data).
2. Claim screen_map jobs atomically, and make run ids unique (recovery, plain words).
3. Merge only each part's own fields; list unanswered fields for a person (correct data).
4. Reuse released rows only, compare choices, and keep the AI origin visible (trust, correct data).
5. Reuse saved part answers on retry; run merge, ingest and apply through a US$0 replay in the suite (task completed, recovery).

Not tested: a real screen reader or a page (none exists); an intended user's unaided walk (D17 and D20 stay with the founder); live AI; Adobe.
