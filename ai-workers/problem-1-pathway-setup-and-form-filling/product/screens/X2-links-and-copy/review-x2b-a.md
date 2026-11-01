# Review: X2b slice (a), `POST /api/lines/bulk/preview` (C1.5), commit 8bcd59d5

Reviewer (fresh context, did not build it), 1 Nov 2026. Branch `claude/screens-x2b-preview`. Isolated copy :4444, db `xr_studio_screens_x2b`.
Judged as **the preview only**, against concept v3 (BR-C1, BR-C2's channel fit, BR-C3's retired combinations). Apply and Undo (b), the menu and dialog (c), and copying from another combination (d) are out of scope. This slice has no screen, so the journey test is API-only and goes in this file (§4).

**Verdict: Block.** There are two Major findings: one outcome refuses a valid copy, and the document matching reads a stale version. Details below.

## 1. Findings (ranked)
**M1 Major: "Cannot: a fact that combination does not ask" refuses copies the engine accepts.**
* The rule is in `api/src/lines-bulk.ts:95-100`. It treats a fact as asked only if the target's *current* draft snapshot already places a question for it. But `engine/snapshot.ts` (assemble, the `used` / `placements` lines) adds every field any condition reads to `used`, and then places **every library question whose fact is in `used`**. So the copied line's condition brings its own question into the target.
* Failing input:
  1. Preview `{line:{combinationId:<With an LMIA>, kind:"form", key:"IMM 5707"}, op:"add", combinationIds:[<Visitor visa>]}`.
  2. The result is `CANNOT_FACT`: "Its 'only if' reads 'Whether a minor is travelling to Canada alone', which this combination does not ask. Add that question to it first."
  3. Do the same change by hand: `POST /combinations/<VV>/forms {"formKey":"IMM 5707"}`, then give it the source's condition.
  4. Visitor visa's draft snapshot now places `person.travelling_alone_to_canada`, and its draft has **0 errors**. The only note is a warning: "Placed in section family_members, which this combination's questionnaire does not use".
* Effect: the preview refuses a valid copy, and tells the publisher to do a step they do not need.
* Answer to the question you asked: no, the current snapshot's placements are the wrong reading.
* The right reading follows the engine's reachability rule (`engine/validate.ts` reachability: "no question, supported document or derived definition supplies"). After the copy, a fact is asked if any of these is true:
  * it has an effective (draft) question in the library;
  * a document type on the target supplies it (`supplies_facts`);
  * it is a derived field (`derived_fields`), whose inputs are pulled in the same way.
* "Cannot" should fire only when none of these holds.
* Optionally, the reason can pass on the warning that the question's section is not used on the target.
* With this reading the preview no longer needs `buildSnapshots`, which also fixes m4.
* If the stricter reading was meant on purpose, that is a concept question for the founder. It is not something the code should settle silently (AGENTS rule 2).

**M2 Major: document lines are matched on a version that is no longer the newest.**
* `api/src/lines-bulk.ts:58` filters `documentRequirement` on `documentTypeKey` **and** `appliesToRoles` *before* `newestBy` picks the newest version (`:74`).
* But `saveRequirement` (`api/src/studio.ts`, the `revise(..., data)` call) can change a line's `appliesToRoles`, and even its `documentTypeKey`, in a new draft version that keeps the same lineage.
* So when the draft has changed whose document it is, the filter drops the newest version, and the old PUBLISHED one is read as if it were current.
* Failing input:
  1. Study permit has passport page v1 PUBLISHED, `each_applicant`.
  2. Its draft v2 (supersedes v1) changes this to `principal_applicant`. The draft snapshot confirms it: `[('passport…', 'principal_applicant')]`.
  3. Preview add of `passport_or_travel_document_information_page_photocopy:each_applicant` from With an LMIA returns `ALREADY_HAS`. It should be `WILL_ADD`.
  4. Preview remove of the same line returns `WILL_REMOVE`. It should be `DOES_NOT_HAVE`. Slice (b) would then remove the principal-applicant line.
* Fix:
  1. Read all of the target's rows for the document type (or all its document rows).
  2. Take the newest version per lineage.
  3. Then match on type and whose.
  4. Do the same for the superseded-row lookup.

**m1 Minor: "Will be added" hides a restore.**
* When the target's draft removes its own released line, `kept` is undefined, so the preview says `WILL_ADD` (`:75`, `:101`).
* But `addFormLine` (`api/src/form-lines.ts`) handles that case by restoring the **target's own released line**, with its own who and "only if". It does not copy the source's line.
* Failing input:
  1. Remove IMM 1295 from With an LMIA in its draft (its released line is "always").
  2. Copy IMM 1295 from a combination whose line has an "only if".
  3. The preview says "Will be added", but the source's condition would never arrive.
* Fix: either the preview says "its draft removal is taken back; its own line returns", or (b) writes the source's content. Decide this before (b).

**m2 Minor: the remove preview does not say when the target's line differs.**
* The board's remove state reads "Will be removed (its 'only if' differs: always)".
* `WILL_REMOVE` always has `reason: null` (`:82`).
* Failing input: remove IMM 1295, sourced from a line with a condition, from a target whose line is "always". The preview gives no note.

**m3 Minor: some words and fallbacks.**
* `WHO_WORDS.couple_once` gives "The line is for once per couple" and "· for once per couple ·". Better: "for the couple, once", as the board says.
* `ROLE_WORDS` (`:24`) is a role list kept in code. `engine/people.ts` (line 2) says role labels come from the library.
* `meanings.get(f) ?? f` (`:99`) falls back to the system name, against QA-94. Neither reachable in the sample.

**m4 Minor: speed with many targets.**
* There is one `buildSnapshots` call, as intended. But it builds a full snapshot (field maps included) for every live target, even the ones answered earlier as already-has, cannot or retired.
* Timings on 155 targets: an "always" line takes 0.04-0.06 s. IMM 5707 (with a condition) takes **1.25-1.46 s** (3 runs).
* That is over the 1 s first-view budget (STANDARDS §9, QUALITY D15) for the 150-combination check that concept §6 asks for.
* M1's fix removes the snapshot build. The 150-target check is not in the test yet.

**m5 Minor: rules whose test would not fail if the rule were removed** (STANDARDS [M] "a rule's test fails when the rule is removed"; found by reading the test).
* Documents: no test of will-be-removed, removed-in-draft, a different "only if", a fact, or retirement open (`kind:"document_type"`). M2 got through because of this.
* Removed-in-draft: the `=== "PUBLISHED"` check is untested. A draft-only line that was removed would read the same either way.
* Channel: only the paper-filing path is tested. There is no test of an account record (`notAcceptedWords`) or of Not needed.

## 2. What holds
* **Every BR-C1 outcome exists**, for add and remove, with forms and documents sharing one path:
  * adding: will be added, already has, other "only if", cannot channel, cannot person, cannot fact, cannot retired or retirement open, waits;
  * removing: will be removed, does not have, removed in draft, waits;
  * plus retired combination and source.
* Reasons are in plain words, with no system names in the cases tested (QA-94 regex check).
* Only "will be added", "will be removed" and "waits" can be ticked (`TICKABLE`).
* **Reuse:**
  * the channel check is `allowedChannels`, `notAcceptedWords` and `notNeededWords`, with the same branches as `forms.ts` channelOf and `channelProblems`;
  * the retirement-open check is `closingChange`;
  * the retired-form check and its words are the same as `attachNow` and `addFormLine`.
  * The channel is copied as it is, so whether the signature fits (it depends only on the channel) carries over.
  * Caveats:
    * the library checks are written out again rather than called (the attach functions throw), so (b) must call `addFormLine` itself to keep the two in step;
    * `attachNow`'s "no file yet" and "waiting for a person" checks are not in the preview. A form on the source has passed them, but (b) must check again.
* **Nothing is written:**
  * the test's line, Undo-step and audit counts stay the same;
  * the code only reads and opens no transaction.
* **Roles:**
  * author 200;
  * approver, content reviewer, case officer and Client A get 403 in words;
  * an unknown or missing actor gets 401.
* **Removed-in-draft:** detected by a RETIRED newest version whose superseded row is PUBLISHED. This agrees with release, which supersedes it (`studio.ts`, the retired rows with supersedes), so after release it correctly reads "does not have it".
* **Waits:** reads the latest submission with status SUBMITTED, as `review-queue.ts` and `studio.ts` do.
* **Contract:** zod in `contracts/lines-bulk.ts`.
  * Problem Details with field errors: bad uuid 400; 501 ids "At most 500"; empty list; unknown line 404; unknown combination 404.
  * Ids are de-duplicated, and the query is scoped to the source's workspace.
* **Queries:**
  * no request per row: the program tree is read once;
  * lines, requirements and submissions are each read once with `in`, then matched in memory.
* `tsc` shows no errors in the new files. The only error is in an unrelated test (`check_c18_age_case.ts`).
* Graph: G1/G2 0. The route has a test, and C1.5 lists `check_x2b_bulk_preview.ts`.
* Builder's test: **47/47, run twice** (stable).

## 3. Standards and dimensions (API-only slice)
* [M] met:
  * zod contract;
  * RFC 9457 field errors;
  * server authorisation, deny by default;
  * no N+1;
  * strict TS in the new code.
* [M] partly met:
  * "a rule's test fails when removed" (m5);
  * §9 budget at 150 targets (m4).
* No migration (nothing written). Concurrency and races do not apply to a read; they are (b)'s.
* D1 ½ (M1, M2) · D2 ½ (M2 would feed wrong targets to (b)) · D4 ½ (M1 misreads reachability) · D10 1 (plain reasons; m3) · D15 ½ (m4) · D16 ½ (m5) · D18 1 (full trail per row, line in words).
* D8, D9, D11–D14 have no screen until (c). D17 and D20 are the founder's to judge (simulated only). D19 is reached only after (b) and (c).

## 4. Journey test (reviewer role, API-only; one score for this check)
Persona: the content publisher (`user-A`). Walked as API calls (there is no screen yet), with the data read underneath through psql.

| # | Journey | Result |
|---|---|---|
| 1 | Main: copy IMM 1295 to every combination; see who gets it | Holds: 5 "will be added", the source shown, full trails |
| 2 | Alternate: copy a document (passport page) | Holds on clean data; **fails with a draft that changed whose it is** (M2) |
| 3 | Copy a conditional form (IMM 5707) to Visitor visa | **Wrong "cannot"** (M1) |
| 4 | Remove a line from many, one already removed in its draft | Holds (removed already in its draft); m2 note missing |
| 5 | Wrong role (approver, client, case officer, nobody) | Holds (403 / 401, in words) |
| 6 | Bad input: bad id, 501 ids, unknown line, long non-English key | Holds (400 / 404 in words; key not echoed) |
| 7 | Recovery: preview twice, then reset and run again | Holds: same answer, nothing written (counts the same) |
| 8 | Scale: 155 targets | 0.05 s "always"; 1.25-1.46 s with a condition (m4) |
| 9 | Across the boundary to (b) | Not testable yet; m1 and M2 would carry into apply |

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Journeys 1, 4–7 hold; 2 and 3 give wrong outcomes |
| Next step obvious | ½ | Reasons say what to do; M1 says to do a step that is not needed |
| Plain words | ½ | No system names; "for once per couple" (m3) |
| Feedback and state | 1 | Every target gets an outcome, a reason and counts |
| Correct data | ½ | M2 reads a stale version; nothing is written (checked) |
| Error recovery | 1 | 400 / 404 / 403 / 401 in words, "Reload the page" |
| Accessibility and screen sizes | ½ | Not testable: no screen in (a) |
| Speed | ½ | 1.25-1.46 s for 155 conditional targets (m4) |
| Visual quality | ½ | Not testable: no screen in (a) |
| Trust and sources | 1 | Nothing AI; the source combination is named with its trail |
| **Total** | **6.5 / 10** | Below 8. Fix M1, M2, then m4 and m5, most valuable first. The two screen criteria are scored again at (c). |

## 5. Not checked
* Keyboard, axe, 1024 px and 200 % zoom (no screen).
* A real screen reader, and an intended user's own walk (D17/D20, the founder's).
* The team's code (`code/` is not in this copy).
* The load data used for m4 was added to the isolated database, then removed, and the database was reset by my second run of the test.

Approve on 8bcd59d5: **no.** **Block**: fix M1 and M2 (and, if possible, m5's document tests) before slice (a) merges.
