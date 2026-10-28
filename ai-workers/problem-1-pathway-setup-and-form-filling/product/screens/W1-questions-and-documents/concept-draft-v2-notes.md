# Questions and documents, board v2: notes for the Lead (draft, 29 Oct)

Status: **draft for the Lead.** It does not change the agreed concept (`concept-draft.md`, P-130–P-132) or its build order (§10). Board: `design/draft-questions-and-documents-v2.html` (8 frames; "Show or hide labels" at the top). Design only, US$0.
Basis: the concept and board v1; P-97, P-116 (amended 28 Oct), P-119–P-121, P-130–P-135, P-138, P-142; the report "Document first intake and OCR choice"; the runtime lane's slice 1 challenge with the Lead's answers (overrides and ticks only; PQR ⊂ SQR ∪ checklist documents; clientOnly sections locked; supplies-facts with a subject); EXPERIENCE, STANDARDS; the built S5 tabs on :4400.
Every program, document, condition, count, cost and IRCC quote on the board is **Sample** until the immigration expert confirms.

## 1. How v2 answers the founder's asks (29 Oct)
* **Never overloaded.** Each row shows 5 things:
  * Questionnaires: Question · Comes from · Pre-qualification · Only if · Status.
  * Documents: Document · Who · When · Supplies · Status.
  * Everything else is in four places: a side drawer (480 px, collapsible sections, the first two open), the row's ⋯ menu, tooltips, and the "Used by" counts.
* **Filters:** person chips (as built); source chips (Document · Client · Agent); "Needs you · n" (to check, to decide, release checks).
* **The bulk bar appears only when rows are selected.**
* **Three screens:** Questionnaires (frames 1–2); Documents (frame 3); Preview in three sets, PQR · SQR · Agent view (frame 4): side by side when wide, a segmented switch when narrow.
* **Full parameters list (frame 6):** for each parameter, where it shows (row, drawer, tooltip, ⋯ menu), where it is changed (this combination, or the library with a second person) and who proposes it.
* **Actions matrix (frame 7).** Four kinds of item × six states (draft, released, retired, AI proposal, from library, combination override). It covers edit, delete with Undo, retire and restore, add, reorder, and this combination versus the library. Each refusal is written in the exact words the screen shows. It also lists the locks: clientOnly, pre-qualification, Document not on the checklist, and someone else saved.
* **"Fill this from my documents"** per section in Preview › SQR (P-134 D4). Frame 4 shows the upload, the proposals checked one by one (P-142 D5), "please check" on a mismatch (D6), the fallback when a document cannot be read, and the agent's "Checked against the page" (D3).

## 2. Decisions followed (marked green on the board)
* **P-130:** the strip; document › client › agent.
* **Challenge M1, M2:** the drawer shows the rules' default plus an override "for Visitor visa only, reviewed in this combination's release"; the fallback question shows as "reachable".
* **M3:** "Spouse or partner: date of birth comes from no document on their checklist" is a release check.
* **M4:** no pre-qualification tick on an Agent fact. A tick on a Document fact is allowed when a client question exists.
* **m2 and P-97:** the "Background and declarations" section shows 🔒 "Always the client"; Document and Agent are greyed with the reason.
* **Lead M6 addition:** "Facts it supplies" has an "About whom" column.
* **P-116 amended:** "Remove from checklist", not Delete, for a line; the author deletes their own never-approved draft at once with Undo; a released item is retired, never deleted; the four standard messages, word for word.
* **P-120:** the one Add dialog (frame 5): exact duplicate refused, a near duplicate needs a reason, the system name is read-only, "about whom" sets the subject.
* **P-121:** bulk Accept for High only; a Decide item is chosen singly, side by side; its checkbox is disabled with "Open it to choose".
* **P-138:** the AI button runs only on a click; a saved draft replays at US$0.
* **P-119, P-135:** the "Who can be in this application" summary uses the filing-mode words.

## 3. Points the Lead can settle (not founder questions)
* **Question order lives in the library section.** Lifecycle edit rule 1 classes order as a wording edit: direct, versioned. So the ⋯ menu greys "Move up or down" on a combination with "Change it there". Checklist order per person is changed on the combination, at once, with a History line.
* **Section order per combination** has no decision. The board keeps the library order. Recommend Not built (P-26).
* **"Who can be in this application"** is folded to one line by default; the built card shows the full table. Recommend folding it: it is the first thing on the tab and changes rarely.
* **Two documents supply one fact** (challenge m1): the drawer shows "Also supplied by" as information only.

## 4. Ready check (Definition of Ready, short)
- [x] Every element labelled Capability or Scaffolding, and Needed or Not built
- [x] Every state drawn: empty (as :4400 today), loading, long content, needs work, running, error, read-only, conflict
- [x] Words from PRODUCT §4; no codes on the main path (the system name only in the Add dialog's "will be created as")
- [x] The look matches the built tabs (tabs, chips, section folds, "Remove from questionnaire", empty text)
- [ ] The founder answers §5 Q1–Q3
- [ ] The Lead adds the Copies, Translation and Validity window values to the immigration expert's list (report D9)

## 5. Questions for the founder (one at a time, recommendation first)
1. **Row actions in a ⋯ menu.** Put each row's actions in a ⋯ menu and the drawer footer, with every greyed action's reason written underneath it in the menu? *Recommend yes.* The row stays at 5 things, and the reason is still visible text, not a tooltip only. This amends P-116's "one written row action from the state" for these two tabs. The other option is a sixth column holding the one written action.
2. **Bulk actions besides Accept.** On selected rows offer: Accept (High only), Set where it comes from (locks respected, each row re-checked), Pre-qualification on or off, and Reject. No bulk Remove, Delete or Retire. *Recommend yes.* P-121 already allows bulk Accept. The lifecycle pattern leaves bulk delete and bulk retire Not built (P-26). Each bulk change has one Undo.
3. **Copies, translation and validity window.** Show them in the document drawer, read from IRCC's line as Sample, but not as editable settings in the reference build (Not built, P-26)? *Recommend yes.* No case rule in the proof reads them, and their values need the immigration expert (report D9). Who, When, Alternatives and "Facts it supplies, about whom" are built.

## 6. Capability or Scaffolding (P-33)
* **Capability:**
  * C4.10: the strip, Comes from, the drawer, the locks, the release checks;
  * C4.2 and C4.7: the pre-qualification tick, with its reason;
  * C4.5 and C6.5: the checklist, "supplies n facts about whom", "Fill this from my documents";
  * C4.3: Preview in three sets;
  * C4.9, reworded: the clientOnly lock;
  * C4.11: the AI button and the Needs you, Check and Decide review;
  * C4.1: the person chips;
  * the lifecycle actions; the one Add dialog (reused from S6).
* **Capability, Not built here:** Agent view confirmation (M3, P-129, P-141); Copies, Translation and Validity window as settings (Q3); bulk Remove and bulk Retire; section order per combination.
* **Scaffolding:** "Acting as", the Prototype badge and the Sample family picker in Preview. These are never ported.

## 7. What changed from v1
* **v1 frame 1 (the idea)** moves into the strip and its tooltips. The concept already holds the idea.
* **Rows:** v1 had 6 columns with IRCC quotes in the row; v2 has 5 plus checkboxes, a ⋯ menu and a status pill; Used by, Proposed by and the quotes move to the drawer.
* **New:** source chips and "Needs you"; the bulk bar; the side drawer with every parameter; the Decide item side by side; the clientOnly lock; release checks in words; the Undo toast.
* **Documents:** per-person chips; the built "Add a document requirement" becomes "+ Add a document" (the one Add dialog); the drawer with alternatives, "Facts it supplies" with About whom, copies, translation, validity window; the ⋯ menu.
* **Preview:** v1 was three columns of plain lines; v2's SQR shows "Fill this from my documents", the proposals, "please check" and the unreadable fallback; the Agent view shows "Checked against the page" and Confirm section waiting with its reason.
* **Added frames:** the one Add dialog (5), the parameters list (6), the actions matrix (7), the eight states (8).
* **v1 frame 5** (the AI run and who does what) is left out: it is unchanged in the concept §4–§6. Its running state is in frame 8.
