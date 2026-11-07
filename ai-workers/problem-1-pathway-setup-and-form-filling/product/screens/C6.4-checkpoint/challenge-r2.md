# Second challenge: the C6.4 (a) Documents panel, on the configured checkpoint

Independent challenger (did not draft it, did not write `challenge.md`), 5 Nov, branch `claude/festive-hypatia-f3vcuy` at 374de8f03. Scope: only the **Documents panel** in `../M3-design-2026-11-04/documents/concept-draft.md` (with BR-1 to BR-3, §4 "Documents panel", the C6.4-screen tests, the DoR and Q3) and board frame 1. The drawer (C6.5 2b) is left out.

**How it was checked:**
* An isolated copy `chal64` on :4471: Demo › Reset, then Load the configured checkpoint as the author (72 s, `cost_usd` 0, Visitor visa released).
* A FAMILY case was opened on it with `acceptance/lib/m3.ts` (no fixture setup), and `GET /runtime/cases/:id/checklist` plus the line routes were run as the officer and as Client A.
* Live AI off, US$0. The copy was stopped and dropped.

All values are Sample. Unconfirmed: no counsel.

## Verdict
**Build after these changes.** 1 Blocker, 4 Majors, 6 Minors.

What holds up: the panel needs no API route, no hot file and nothing from `demo.ts`. The staff-only rule, the 404 on a waiting line, the 409 on a stale version and the 400 on an empty reason all behave as the concept says on the checkpoint. What fails: the concept, its board and its tests are drawn from the fixture, which does not count (P-322). The words the panel would show for each line are not ready for the screen.

## What the checkpoint really carries (the case as opened, 4 people)
* **Every person, children included:** Fee payment receipt, Passport information page copy, Proof of financial support. All three are "Always needed for this application.", version 1, Not requested.
* **The spouse only:** Marriage certificate copy (`couple_once`), in `waiting`: "May be needed (The applicant is married.): answer "Current marital status" first."
  * It is decided by the **spouse's own** marital status: setting the principal's to Married changed nothing.
  * Spouse Married → Needed: "Needed: The applicant is married.." (two full stops).
  * Requested, then Common-Law → kept: "Not needed: the answers show it is not the case that The applicant is married.. Kept on the list: it is Requested, so it is not dropped when the answers change."
* **No minor line, and nothing "on the principal only".**
* **Routes:**
  * client read 403;
  * client Request 403 "Only the case officer can do this.";
  * waiting-line Request 404 "No such checklist line.";
  * stale version 409 "Fee payment receipt for Sample Client A changed after you opened it (it is Requested now): read the checklist again …";
  * empty reason 400 on field `reason`, "Give a reason why this document is not applicable.";
  * client upload 201 Received;
  * upload on a Not applicable line 409 "… is Not applicable: request it again before uploading."
* **Counts:** after one line was marked Not applicable and the marriage line was kept, `people[].needed` still said 3. The lines with `required: true` were 2.

## Objections

### Blocker
**B1. The panel is designed and proved on the fixture's lines, which P-322 does not count.** *Needed for the proof.* Fact (high):
* §4 says "Lines are drawn from the Visitor visa release (`acceptance/lib/setup_vv_m3.ts`)…" (`concept-draft.md:67`).
* Board frame 1 shows the fixture's lines (`design/draft-documents.html:27-31`):
  * "Proof of funds · The principal applicant": on the checkpoint, every person has it;
  * the child's "Letter of authorization": no checkpoint person has it;
  * "1 of 2 received": a checkpoint person has 3 needed lines.
* Test pair 1, "lines per person / an adult without the minor's lines" (`concept-draft.md:112`), passes **vacuously** on the checkpoint, where nobody has a minor line.
* **A second trap: CI runs the new pack on the fixture.** `tools/gate-b.mjs:206-209` puts `setup_visitor_visa` and `setup_vv_m3` in front of any pack that imports `./lib/m3.ts` and has a one-line run. "A pack with setup steps stays on its own fixture either way" (`:32`). So `C6.4-screen.test.ts` will run on the fixture in gate B and on the checkpoint in qa's re-run (`C6.4-checkpoint/notes.md:6`). Data-specific assertions are red on one of the two.
* **The lines are also changing now.** A lane is adding the minor lines to the checkpoint through `demo.ts` and a new `samples/conditional-documents.json` ("tech lead on #1073, Q1 option 1"; uncommitted in this working copy).
* **Fix:**
  * Redraw frame 1 from the checkpoint lines above: the principal with fee, passport and financial support; the spouse with the marriage certificate waiting, then needed, then kept; a child with the same three.
  * Delete the `setup_vv_m3` sentence from §4.
  * Write every screen assertion **against the API's own answer, read in the same test**: each group, label, state word and count on the screen equals what `GET …/checklist` returned. This makes the pack pass on the fixture, on today's checkpoint and on the checkpoint after the minor lines land.
  * For "appears and goes", take the first `waiting` line, answer its `missing[0].key` in the Agent view, and assert the line moves the way the API moves it. Do not name a document.

### Major
**M1. "Why it is here" cannot be drawn as boarded, and the API's words are not fit for the screen.** *Needed for the proof.* Fact (high):
* The board's "Why" column shows who the line is for ("Every applicant", "The principal applicant"; `draft-documents.html:27-28`). The line carries no `who` (`api/src/case-checklist.ts:29-30`, `engine/runtime/case-checklist.ts:47-49`). 12 of the 13 lines on the checkpoint read "Always needed for this application.".
* The marriage certificate sits under the spouse with "The applicant is married.", and nothing says it is once for the couple.
* The engine glues `condition_plain` into a sentence (`engine/runtime/case-checklist.ts:154`, `:167`, `:171`), which gives "married.." and "not the case that The applicant…". The kept text is added on top (`api/src/case-checklist.ts:90`).
* The concept also marks kept lines "Kept on the list" (`concept-draft.md:29`, board `:31`), so the words would show twice.
* This goes against EXPERIENCE §2.7 ("Reasons everywhere", "Asked because Marital status is Married") and §5 (plain words).
* **Fix (additive, M3-only files, not hot):**
  * In `engine/runtime/case-checklist.ts`, add `who` and `who_words` to the line (the words already exist: `contracts/lines-bulk.ts:33` WHO_WORDS, "the couple (once)"). Remove the trailing full stop and lower-case `condition_plain` when it sits inside a sentence.
  * The panel shows `who_words` as a short note ("For each applicant", "Once for the couple"). It shows `reason` once, with no second "Kept" label: one small "Kept" pill only.
  * Name the change on the PR's first line ("API words changed"). C6.4-8, -8a and -8h match words inside `condition_plain`, so they stay green. Run the pack.

**M2. The proposed C6.4-31+ tests do not test the screen.** *Needed for the proof.* Fact (high):
* The four pairs (`concept-draft.md:111-115`) are API calls that the pack already makes: C6.4-2 (client read), -12 (Request), -13 (client Request 403), -14 (Received), -16 (empty reason 400), -17 (Not applicable).
* Nothing checks what the officer sees: groups, pills, count, which ⋯ items show per state, the 409 shown and the list reloaded, the field error, keyboard, axe.
* `acceptance/lib/browser.ts` (`walker`, `settle`) is already used by C3.10, C11.1 and C5.1.
* **Fix.** C6.4-31 onward, each with a pass and a fail, built on `walker` at 1440 px, all data-independent (B1):
  * (31) the groups and lines equal the API's / a person not travelling (C6.12 `applies:false`, which works on the checkpoint) shows "Not travelling with this application: nothing is asked of them", with no lines;
  * (32) a waiting line shows "May be needed: answer … first" with a link to that question / it has no ⋯ button (and the API answers 404);
  * (33) Request from ⋯ turns the pill to "Requested", and Request is then gone from the menu / on a Not applicable line, Upload is hidden and Request is offered;
  * (34) uploading a PDF through the file input gives "Received", and "n of m received" goes up by 1 / a text file named `.pdf` shows the API's 415 words on that line, with the state unchanged;
  * (35) Not applicable with a reason / with an empty reason, the error shows under the field and nothing changes;
  * (36) the line is changed through the API after the panel loaded: the click shows the API's 409 detail and the list reloads / with no change in between, there is no 409;
  * (37) answering the waiting line's question in the Agent view moves it without a page reload / answering it the other way leaves it out or not needed (or kept, if acted on);
  * (38) keyboard only, and axe clean at 1440, 1024 and 400 px.
* Give the pack its own header run line. Without one, gate B refuses it: "no run line in its header" (`gate-b.mjs:182`).

**M3. The C6.4 (a) PR cannot make C6.4 Works, and the DoR names the wrong bug.** *Needed for the proof.* Fact (high):
* The pack is 18/30 on the checkpoint. Groups A to C need `demo.ts` or a ruling (`C6.4-checkpoint/notes.md:9-15`, `:22-25`). The panel changes none of that.
* The DoR gates the Works claim on QA-149 (`concept-draft.md:140`; `rows.md:858`). QA-149 is closed (CAPABILITIES row C6.4). The open Major on C6.4 is **QA-226** (`qa/BUGS.md:18`, "Open"), although #868 gave the release its lines.
* **Fix:**
  * The panel PR is a slice: "Capabilities: C6.4 (steps 31-38)", with no "Claims Works" line.
  * The DoR says: C6.4 Works needs the pack green on the checkpoint (groups A to C), qa closing QA-226 (or a `Fixes: QA-226` line), and (b) named as breadth.
  * Replace QA-149 with QA-226 in `rows.md:858`.

**M4. Actions and counts follow the concept's own rules, not the built ones.** *Needed for the proof.* Fact (high):
* §4 offers "Request" on every line (`concept-draft.md:65`). The API allows it only from Not requested, Rejected and Not applicable (`contracts/documents.ts:13`). On a Received line it answers 409.
* BR-2 says Being checked, Approved and Rejected are "shown with no action" (`concept-draft.md:26`). The API allows Upload and Not applicable on all three, and Request on Rejected (`contracts/documents.ts:13-15`). "Rejected, ask again" is the officer's normal next step.
* "n of m received" (`concept-draft.md:32`) does not say which field it counts. `people[].needed` stays 3 after Not applicable and after a kept line. `required` gives the right m (`api/src/case-checklist.ts:91`).
* **Fix:**
  * The ⋯ items come from `REQUEST_FROM`, `UPLOAD_FROM` and `NOT_APPLICABLE_FROM`, imported from `contracts/documents.ts` (an import only: `studio/contracts/` is hot to edit, not to read). No rule lives in the panel.
  * m = the lines with `required: true`; n = those of them that are Received, Being checked or Approved.
  * State in BR-2 that Being checked, Approved and Rejected cannot be reached on screen today (no route sets them; AG-09). They are drawn, and tested by a state set in SQL in the test only.

### Minor
* **m1. 409 and error words** (`concept-draft.md:34`, `:96`; board `:33`): "Someone else changed this. Reload." throws away the API's better detail, which names the document, the person and the state now. "Say why this document is not needed." is a second wording of the API's field error. *Fix:* show the API's `detail` (or `errors[field]`) and reload the list on every 409. This also covers the 409 "not on … list now" (`api/src/case-checklist.ts:121`). One wording only.
* **m2. "Needs work … linked"** (EXPERIENCE §4): a waiting line must link to its question. *Fix:* the link goes to the Agent view's anchor for that person and fact. `lineId` in `web/src/runtime/questionnaire.tsx:670` would need `export`: a one-word change, named in the PR.
* **m3. Where it sits** (`concept-draft.md:61`, Q3 `:134`): there is no "card 1 Get the information". "Above Agent view" puts Documents after Prepare application, Findings and Submission (`web/src/runtime/cases.tsx:198-203`), which is the reverse of J7. *Fix:* mount it after "People on this case" and before the Eligibility card. It stays a one-line mount, so C7.7 can move it later.
* **m4. Reuse, not new chrome:**
  * the stand-in chip is `components/stand-in.tsx` `StandIn id="SI-14"` (SI-14 is in `STAND-INS.md:24`). The board's text chip "SI-14 · …" puts an ID on the main path (EXPERIENCE §5);
  * the ⋯ menu is the Radix pattern in `web/src/pages/workspace/forms.tsx:243` (`MoreHorizontal`, labelled "Actions for …"). There is no menu in `components/ui/controls.tsx`, which gives `Table`, `Pill`, `Notice`, `Dialog` (the reason), `Field` and `Button busy`.
* **m5. People and files on the main path:**
  * `state_by` and `uploaded_by` are actor ids ("user-O"). Show the name from the firm list (`useFirm`, `team.tsx`), never the id;
  * History lists files with no way to open them until C6.5's file route (BR-9). Say "Opening a file comes with Fill from documents";
  * show the line's `quote` (IRCC's words, P-170) behind a "Source" disclosure. The pack asserts it exists (C6.4-9b), and it is what the officer needs to judge the fee line (Question 2).
* **m6. The response type:** `StoredLine` lives in `api/src/case-checklist.ts:29`, and the web imports nothing from `api/src`. *Fix:* type the panel from `engine/runtime/case-checklist.ts` (`CaseChecklist`, `PersonLine`), as `runtime/forms.tsx` does with the engine, plus `LineState` and `StoredDocument` from `contracts/documents.ts`. No new contract file.

## Hot files and demo.ts
* The panel needs `web/src/runtime/checklist.tsx` (new), a one-line mount in `cases.tsx` and the new pack.
* M1 adds `engine/runtime/case-checklist.ts`; m2 adds `questionnaire.tsx`. Neither is on `tools/m2-hot-files.txt`.
* It only imports from `studio/contracts/documents.ts` and never edits it. It does not need `api/src/demo.ts`.
* **Only C6.4 Works needs `demo.ts`** (M3).

## Questions for the tech lead
1. **Who is the source of the per-line words:** the engine with `who_words` and trimmed text (M1), or the panel composing its own? *Recommend:* the engine. It is one place, Preview and the Documents tab already use the same holder rule (`engine/resolver.ts:49`), and the client screens after M3 get the same words.
2. **Fee payment receipt on every applicant, children included.** IMM 5484's saved reading says each applicant. A family usually pays in one payment, so the officer would mark three lines Not applicable on every family case. *Recommend:* send it to the immigration expert as a config question (not this PR). Until then, the officer marks the extra lines Not applicable with a reason, and the panel shows the line's source quote (m5).
3. **C6.4-4 (financial support on the principal only)** is Sample in the fixture, and contradicts IRCC's words on the checkpoint ("… yourself and any family members accompanying you"). *Recommend:* the founder rules, with the immigration expert. Until then the pack step is named in the PR as red on the checkpoint by design, not "fixed" by changing the test.

## Lead response

## Agreement
