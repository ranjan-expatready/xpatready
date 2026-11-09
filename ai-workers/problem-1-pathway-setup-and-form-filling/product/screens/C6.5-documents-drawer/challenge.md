# Fresh challenge: the "Fill this from documents" drawer (C6.5 part 2b)

Fresh challenger (did not draft, will not build), 8 Nov, on `claude/affectionate-darwin-hhhzii` (head ab717fdbd, PR #1369 in review). Read: `concept-draft.md`, `design/draft-documents-drawer.html`, `api/src/case-documents.ts`, `api/src/runtime.ts` (Confirm section), `engine/runtime/mrz.ts`, `p2/ledger.ts`, `acceptance/C6.5.test.ts`, `M3-CONTRACT.md` row C6.5, `web/src/runtime/questionnaire.tsx`, `checklist.tsx`, `findings.tsx`, `contracts/runtime.ts`, `acceptance/lib/setup_vv_m3.ts`. Also DECISIONS P-110, P-133, P-134, P-142, P-175, P-242, P-243, P-256, P-294, P-295, P-316, P-390, P-411; BACKLOG L-SA7, L-SA9; `../M3-design-2026-11-04/rows.md` C6.5; `../M3-design-2026-11-04/documents/` (concept and challenge); `../M3-agent-view/` BR-4 to BR-7 and its challenge; PRODUCT, STANDARDS, EXPERIENCE (§3, §6), QUALITY, TEAM-PATTERNS, `domain/TAXONOMY.md` §4. `ai-workers/tools/freshness.sh` stops at once (`code/README-copies.md` is not in this cloud copy), so the team ids the concept quotes (SA-1B-260…264, AG11-D4, AG-8-23, AG-8-41) are **Unverified**. All values are Sample. Unconfirmed: no counsel.

## Verdict
**Build after these changes.** There are no Blockers and 5 Majors. The core of the drawer can be built on #1369 as it stands: one block and one Confirm & use per document, the cost card first, resolving a check in place, and corrections through the Agent view's own save. Four things are missing:
* the officer cannot see the passport, so the name ticks are blind (M1);
* the ticks are asked on values that will never be written (M2);
* `not_read` gives a false reason, and on a child's line it invites a wrong entry (M3);
* "Answer it" sends the officer out of the drawer for every value the passport cannot give (M4).

P-243's "no one-click confirm" also holds only in the browser (M5). Of the four server additions the draft asks for, two are needed (`left_why`, the file route) and one is worth its few lines (`differs`). Two are not needed: `current`, because the Agent view already has the current answer, and `reads`, whose entry point is extra scope.

## Objections

### Blocker
None.

### Major
**M1. The ticks on names are blind: the officer cannot open the passport.** *Needed for the proof.* Fact (high), and judgment (high) on the effect.
* **What breaks:** BR-5 asks the officer to tick "Matches the document" against the printed name. Both the reader's note and P-134 D2 ("a person always checks names", DECISIONS:282) say this. But BR-13 ships "Open the passport" disabled until a file route exists (`concept-draft.md:33`). No route serves a stored file (`case-documents.ts:259` `bytesOf` is private).
* **Example:** the coded line reads given names "CLIENT A" (`NAME_FULL`, `mrz.ts:159`). The officer can only tick it or retype it from memory, so the tick is a ritual, not a review.
* **Evidence:**
  * documents challenge M7 (`../M3-design-2026-11-04/documents/challenge.md:59-61`);
  * rows.md already lists the route as C6.5's file to build (`rows.md:189`);
  * the checklist already tells the officer "Opening a file comes with Fill from documents" (`checklist.tsx:170`).
* **Fix:** add the staff-only `GET /runtime/documents/:id/file` to the small runtime PR before the drawer. It goes through `bytesOf`, serves the file inline with `Content-Security-Policy: sandbox` and `nosniff` (STANDARDS §8), and writes one audit line. Delete the disabled-link fallback. Q2's "or Not built" for the file is answered no.

**M2. Ticks are asked on values that Confirm & use will never write, and the reasons for them are lost on reopen.** *Needed for the proof.* Fact (high).
* **What breaks:** BR-5 disables Confirm & use until every expanded value is ticked or corrected. Without `left_why`, the fallback (BR-8, "after the click from `left[]`") puts every left value among the values to tick.
* **Example:** the pack's Sample passport has 5 expanded values: family name, given names, sex "X", citizenship "IND" and country of issue (`mrz.ts:32`, `:173`). A country given only as a code is never written (`notWritable`, `case-documents.ts:141-146`), and neither is a sex the question refuses. So 2 or 3 of the 5 ticks are wasted (BIC side 9). After the click those values keep `state: "proposed"`, because `case-documents.ts:337` updates nothing. Their reason exists only in the one POST response (`:361`), so BR-9's claim that "reopening shows the same" is false for "Left for you".
* **Fix, in the same small runtime PR:**
  * `shown()` adds `left_why` per proposal. It is one call to the existing `notWritable(s, fact, value)`, before and after the click.
  * `shown()` adds `differs` per proposal. It is the existing `sameValue` against the person's current answer, one query per call. The browser never compares (STANDARDS §7).
  * Drop `current`: the drawer already holds it from the Agent view (`ViewAnswer` has value, channel, by and at, `contracts/runtime.ts:130`).
  * Ticks then apply only to expanded values that are writable and do not differ. On the Sample passport that is the two names (plus sex when the release has its word).
  * A value that differs needs no tick: its check is the field-by-field act.

**M3. `not_read` lists every unread document as "an identity document", and on a child's line it invites a wrong entry.** *Needed for the proof.* Fact (high).
* **What breaks:**
  * `scope()` puts **every** current document with no reader into `not_read`, each with "Read by a person: an identity document is never sent to AI…" (`case-documents.ts:201`). BR-14 and frame 11 repeat that framing and add "Type its values. Answer them."
  * On the demo path, Client A's "Proof of financial support" (`setup_vv_m3.ts:86`) appears in the Personal details drawer as an identity document to type from.
  * TAXONOMY §4 case 1 (a family visiting, a child with one parent) is worse. "Copy of the absent parent's signed passport" sits on the **child's** line (`setup_vv_m3.ts:90`), and `readerOf` rightly refuses to read it as the child's (`ABOUT_ANOTHER`, `:62`, `:70`, R11). The drawer would still say "Type its values" with a link to the child's answers. That invites the parent's passport details into the child's forms.
* **Fix:**
  * The server lists in `not_read` only identity documents about the holder (`isIdentityName` and not `ABOUT_ANOTHER`), which is one condition at `:201`.
  * The drawer's words become "{Document}: read by a person. Check its values against it." There is no "type its values" for a document about someone else.

**M4. "Answer it" sends the officer out of the drawer for every value the passport cannot give.** *Needed for the proof.* Judgment (medium-high), on facts.
* **What breaks:** "Correct it" is an input in place (BR-11). "Answer it" for left values and place of birth is a link to `#a-<person>-<fact>` on the page behind a focus-trapped panel (BR-8, frame 2, BIC-20).
* **Example:** on every Sample passport, citizenship, country of issue, place of birth and (for "X") sex each cost a full trip: close the drawer, find the line, open Edit, save, reopen the drawer. That is about 16 extra actions per passport for the values the drawer exists to finish (job: "types only what the document cannot give"; BIC side 9, EXPERIENCE §2.3).
* **Fix:** "Answer it" opens the same in-place input as "Correct it": the exported `QuestionField` (`questionnaire.tsx:139`) with that question's kind (a country picker for citizenship), saved through the Agent view's own `PUT …/answers/:subject/:fact` with `expectedId` (`:327-330`, to be exported). There is no new route. A left value answered this way opens no check, because left values are skipped before the comparison (`case-documents.ts:337`).

**M5. P-243's "no one-click confirm" for expanded fields is held only in the browser.** *Needed for the proof.* Fact (high), and judgment (medium) on timing.
* **What breaks:**
  * L-SA9 is a **runtime** row whose "Done when" includes "no one-click confirm for them" (`BACKLOG.md:301`). STANDARDS §3.4 says "the UI is only a convenience".
  * `confirm-and-use` takes `{subjectId}` only and writes every expanded value in one call (`case-documents.ts:311-358`).
  * The draft still scores BIC-06 Met and lists P-243 as done for 2b.
* **Fix (recommended):** in the same small runtime PR, `confirm-and-use` takes `checked: [read_value ids]`. It answers 422, naming each value, when a value that is expanded, writable and not differing is missing. The drawer sends its ticks, and there is one pass test and one fail test. *Alternative:* keep the draft's Q3 deferral to 2c, but then the 2b PR does not claim L-SA9 and the scorecard says "Partly".

### Minor
* **m1. BR-1 (b), "Fill answers from this file…" with `reads` on a checklist line, is extra scope.** P-134 D4 and P-256 place the button per section, and rows.md's "Done when" (`rows.md:168-176`) and the 4 Nov concept have no line entry. Fix: cut it, *Not built*, and drop `reads` from Q2.
* **m2. BR-14 names the wrong server strings** (fact, high).
  * `not_read[].why` (`:201`), `live_why` (`:218`) and `basis` (`ledger.ts:46`) carry no decision numbers or paths. `basis` is plain words and may be shown.
  * The string that does carry a decision number is the 409 `already_confirmed` detail: "(P-242)" plus an ISO time (`:322`, `:330`). Build frame 7 from its `confirmed {by, at}`.
  * Frame 5's note is also wrong: the Confirm & use `message` uses labels, not fact keys (`:362`).
  * Fix: correct BR-14 and the notes on frames 5, 7 and 8.
* **m3. "Read from the passport" cannot come from a channel.** `CHANNEL` is keyed by channel, and `ViewAnswer` carries no document name (`questionnaire.tsx:718`; `contracts/runtime.ts:130`). A replayed letter would read "from the passport". Fix: "read from a document" and "checked against a document" (PRODUCT §4: answer source "Document").
* **m4. "Nothing is written until Confirm & use" is false once "Correct it" saves.** The correction is the officer's answer at once (BR-11, P-411 (2)). This is the frame 2 footer, and the BIC-05 line repeats it. Fix the copy: "The document's values are used only on Confirm & use. A correction you save is your answer at once."
* **m5. The check copy names the client when the officer typed.** This happens after "Correct it", and on releases where the officer enters the name (pack 9b, `C6.5.test.ts:82-84`). Fix: name who gave the current answer from the Agent view's `channel` and `by` ("You entered…", "Client A typed…"). Frame 3 already does this; BR-10 and frame 6 should too.
* **m6. "Mark checked against the passport" on a used or agreed value adds a redundant VERIFIED version.** Fix: offer it only where it adds evidence. That is a left value once answered, place of birth once typed, or a typed answer kept by a resolved check.
* **m7. The tests lack a pass and a fail for BR-6, BR-8 and BR-12** (STANDARDS §3.10), and for the file route once added. Fix: add them:
  * `differs` shown before the click / an agreeing name not marked;
  * "UTO" left with its reason, no tick, and the reason still there on reopen;
  * mark checked → `checked_against` / refused 409 `open_checks`;
  * file: staff 200 / client 403.
* **m8. The empty state is wrong on a section no reader covers.** "Upload it on Client A's passport line" appears on, for example, a travel section the passport never fills. Fix the copy: "No uploaded document of Client A gives a value in this section. Type the answers."
* **m9. "Confidence in words" needs thresholds nobody has set.** The MRZ figures are Sample 0.98 and 0.9 (`mrz.ts:37`). Fix: for rules values, show "check digit passed" or "no check digit of its own" (from `checked`, as frames 3 and 4 already do). For AI values, show the Sample figure, or name the thresholds as Sample in the concept.
* **m10. Reopen with `POST …/fill-from-documents`, not `GET …/proposals`** (frames 1 and 7). The fill call is idempotent: it returns the stored read, scoped to the section, with `not_read` (`:224-225`). The GET is person-wide and has no `not_read`.
* **m11. Wrong letter figures, and the reason form points at the wrong component.**
  * Frames 8 and 9 draw US$0.02 / US$0.31, but the ledger card is about US$0.03 usual and US$0.20 worst (commit ab717fdbd). Draw the server's numbers.
  * The board's "Reason form: `findings.tsx` MoveDialog" is a centred `Dialog` that posts to findings (`findings.tsx:105-118`). Reuse its `Field` and `Textarea` in place, not the component.
* **m12. The scorecard overstates two checks.**
  * BIC-05 is "Partly": there is no per-value Reject (the API cannot exclude a value), and a correction is written before Confirm & use.
  * BIC-06's own test says bulk never accepts date of birth or passport number, which P-243, a specific founder decision, collapses on passed digits. Score it "Met as amended by P-243" and say so, not silently.
* **m13. The definition of ready should say 2b does not claim C6.5 Works.** The counts (C6.5-21 to -23), L-SA9's count (and its server check, if M5 is deferred) and letters (part 3) remain. Fix: add this, with no "Claims Works: C6.5" line on the 2b PR.

## What is sound
* One block and one primary Confirm & use per document, with none across documents. P-242 holds and SA1B-D77 stays held.
* Confirm & use is never disabled by a difference (documents challenge B1). The partial write and the one check per fact match #1369 (`:340-347`) and pack C6.5-10 and -12.
* BR-11, corrections through the Agent view's own save, is buildable on #1369 as it is and decides nothing in passing:
  * P-411 (2) gives such an answer its status (fills at once, "entered by staff", on the Confirm list);
  * SA1B-D107 stays held;
  * the reason asked at the check follows P-142 D6.
* Ticks on names are what P-243 and P-134 D2 require: a per-field act, with no blanket confirm. A tick is the cheapest such act, once M1 and M2 trim it to the values it is meant for. Ticks on replayed AI letter values are also defensible (P-133: "Every value is a proposal a person confirms").
* Cost first, replay only and no live read follow P-110, P-175 and P-295, and match `plan` (`:206-220`). No read button without a saved read is right.
* The resolve form in place, with no stacked overlay (TEAM-PATTERNS), sends `answerId` for the 409, keeps two choices as the API takes them, and marks `keep: other` *Not built*.
* The drawer follows the API as built: no `read`/`edits`, and `keep` is `answer|document`. The CHANNEL gap it found is real (`questionnaire.tsx:718`). The C4.4 renderer change stays one hook: a header component whose checks query shares one react-query key, plus two map entries.
* Every state is drawn, including failed digit, two passports, no text layer, 409s and no access. Letters are split off as part 3.

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test (pass / fail) |
|---|---|---|---|---|
| Section button, "n to resolve" | `answer_check` (built) | `GET …/checks?state=open` (built), one per case view | BR-1 (a), C6.5-8 | staff sees it / client has no button and 403 |
| Reading, reopen | `document_review`, `read_value` (built) | `POST …/plan`, `POST …/fill-from-documents` (built; also on reopen, m10) | BR-2; P-110, P-175 | passport read, no `ai_batch` row / letter: cost card before any read; no saved read, no button |
| Value rows | `read_value` plus current `client_canonical_answer` | **small runtime PR:** `shown()` adds `differs` (`sameValue`) and `left_why` (`notWritable`) | BR-6, BR-8 (M2) | typed SAMPLEDE gives `differs` / agreeing name does not; "UTO" has `left_why` before and after the click / valid value null |
| Read by a person | `case_document` | **small runtime PR:** `scope()` lists only identity documents about the holder | M3 | national ID listed / proof of funds and the absent parent's passport not listed for typing |
| Open the passport | `case_document` (path, sha256) | **new** staff `GET /runtime/documents/:id/file` (`bytesOf`, inline, CSP sandbox, nosniff, audit line) | M1; STANDARDS §8 | staff 200, same bytes / client 403; other case 404; changed file 409 |
| Ticks, Confirm & use | `document_review.confirmed_*`, `read_value.state` | `POST …/confirm-and-use {subjectId, checked}` (**small runtime PR**, M5) | BR-5, L-SA9; P-242, P-243 | all ticked: 200, who and when / one name unticked: 422 naming it; second call 409 `already_confirmed` |
| Correct it, Answer it in place | `client_canonical_answer` (staff) | `PUT …/answers/:subject/:fact {value, expectedId}` (built) | BR-11, M4; P-411 (2) | correction fills at once, then Confirm & use opens a check / left value answered: no check; stale `expectedId` 409 |
| Resolve | `answer_check` | `POST /runtime/checks/:id/resolve {keep, reason, answerId}` (built) | BR-10; P-142 D6 | reason given: closed, Confirm section allowed / no reason: 400 on the field; stale `answerId` 409 |
| Mark checked | answer `source_json.checked_against` | `POST …/checked-against-document` (built) | BR-12, m6; P-142 D3 | place of birth typed then marked, VERIFIED with evidence / open check 409 |
| Source words | answer `source_json.channel` | `GET …/questionnaire?mode=agent` (built) | m3 | used value reads "read from a document" / no "answered" fallback for `document_read` |
| Correction counts (2c) | `answer_check`, answer sources | `GET …/document-reviews/counts` | P-243, L-SA9 | C6.5-21 to -23, in part 2c |

Order: #1369 merges → the small runtime PR (`differs`, `left_why`, the `not_read` filter, the file route, and `checked` if M5 is taken now) → the drawer PR. The runtime PR changes only `case-documents.ts` and its pack.

## Questions for the founder
None. The drafter's three are the tech lead's, and decisions answer them:
* **Q1:** P-411 (2) answers the first half of rows.md Q2 (`rows.md:908-910`), the status of a corrected value, because BR-11 makes the correction the officer's own answer. The second half, "one value that differs opens a check and the rest still fill", is in no decision. It follows P-242 and is built and tested (C6.5-10, -12). It is reversible, so the tech lead records both halves as one ruling under P-294 (1), and P-390 lets the Lead proceed. SA1B-D107 stays held. The founder sees it in the morning review (P-316 (3)).
* **Q2:** answered above (M1, M2, m1).
* **Q3:** answered by L-SA9's own "Done when" and P-134 D2 (M5).

## Lead response

## Agreement

## Build discoveries
