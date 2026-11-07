# Experience standards — the bar for UX and UI

[M] must, [S] should. References are the bar: Nielsen's 10 usability heuristics, WCAG 2.2 AA, Microsoft's Human–AI interaction (HAX) guidelines, Carbon and PatternFly data/tree-table guidance, plain-language content design. The team's style guide (`code/ERv2-frontend@<newest>/docs/style-guide/`) wins on look.

## 0. Principle (founder, 21 Oct, P-37)
* [M] **Persona first, proven patterns, nothing extra.** For each persona (content publisher, approver, case officer, client) use the best proven pattern from leading products (list + detail panel, task-first "Needs you" views, bulk accept with side-by-side review, ⌘K search, progressive disclosure); simple and effective; no novelty for its own sake and no over-engineering. Every screen is seen and agreed in the clickable journey before it is built (P-36).
* [M] **Modern by default, information first (founder, 27 Oct).** Wherever a screen is built, choose the modern, sleek element over the plain one (cards, inline status, side panels, clear empty states, calm motion), but put scalability, ease of use and the quality and ease of information gathering first, with the look alongside, never instead. Anything complex gets a helpful explanation where it is used (a rich tooltip, an inline hint or a short "how it works" panel) so anyone can use it unaided. Neither over-engineered nor under-engineered: the right amount for the persona and the task.

## 1. Look
* [M] **Coherent look, free layouts** (`design/TEAM-PATTERNS.md`, P-48): ExpatReady brand kit, tokens, type scale and the team's components keep one look; each screen's layout and flow follow its capability; the team's style guide is a reference, not a template.
* [M] **Visual system (founder, 27 Oct, R-125; `screens/W1-visual-system/`):** one calm colour per level (Pathway slate, Program teal, Category navy bold, Sub-category navy) used alike in trees, trails, cards and lists (P-128: in the Program structure Tree, names stay in text colour and the level colour marks only the dot and number), never a status colour; a thin accent stripe per Pathway; shared Trail, LevelMark, StatusChip, SetupBar, NextStep and Pathway band; the trail keeps Category › Sub-category together and may wrap to a second line (amends "one line" below for trails). Every screen from S3 on uses it.
* [M] Team tokens only (colour, type, spacing, radius); Inter for UI text, Proxima Nova headings; 14 px UI text, 12/16/18/24 steps; no one-off values.
* [M] The current Studio shell: logo, "Product Studio · Pathway Configurator", scoped left menu (`PRODUCT.md` §3), page title + one-line description, white tables on light grey.
* [M] Status by shape and text, never colour alone; one primary action per area; modern, quiet, dense-but-readable (36–44 px rows; long text one line with full text on hover).
* [M] Demo chrome visually separate and listed as not for porting.

## 2. Behaviour
1. [M] **Know where you are:** path on every page below the catalogue.
2. [M] **One row of tabs at most;** deeper structure uses sections, a lines list, a tree, or a drawer.
3. [M] **Edit in a drawer or dialog;** the page keeps its scroll, filters, selection and expansion.
4. [M] **Preview beside the editor** wherever configuration changes what a person sees.
5. [M] **One next action per status;** statuses are calculated.
6. [M] **AI in one place per record,** labelled by its next step; AI items marked, with evidence; Accept / Edit / Reject singly and in bulk (HAX: show what AI did and why; support correction).
7. [M] **Reasons everywhere** ("Asked because Marital status is Married"); counts say what they count.
8. [M] **Prevent errors** before messaging them: pick from lists, duplicate check before save, in-page confirmation for destructive actions, undo where possible.
9. [M] **Warn, don't block,** except release checks and the form's own Validate; at filing, also an Express Entry filing without its police certificates or medical exam (P-172, P-315 (2)).
10. [M] **Tooltips** on every status, icon-only button and number that needs context; errors say what happened and how to fix it, on the field.
11. [M] **Freshness visible:** when sources were last checked; overdue in orange.
12. [M] **Accessible:** real buttons/links/labels, visible focus, keyboard path for every task, 4.5:1 contrast, 1024 px and 200 % zoom work.

## 3. Screen patterns (choose one; do not invent)
| Pattern | Use for | Shape |
|---|---|---|
| Catalogue | many records (Programs) | workspace switch, filter chips, tree table with indentation, one program open by default, side panel on select |
| Workspace | one record in depth (a combination) | header with path + status + next action; lines on the left, live preview on the right |
| Library list | masters | search + facets + table with "used in" and origin; drawer: Definition · Rules/Checks · Where used · History |
| Side panel | summary + quick actions | 480–560 px drawer, sections not tabs, link to the full workspace |
| Dialog / wizard | creating something that must be right first time | ≤3 steps, master pickers, duplicate catch, "will be created as" |
| Source + proposals | reviewing AI work | source page left, proposals right, selection highlighted in both |
| Change set | review and release | every change grouped, before/after, AI or person, impact, expert confirmations; approver ≠ author |

## 4. States every screen draws [M]
Empty (teaches the first action) · loading (skeletons) · normal · long content (long names) · needs work (exactly what is missing, linked) · running (real progress, no invented percentages) · error (on the field, with the fix) · read-only (released or no permission) · conflict (someone else saved: reload or merge). Reduced motion respected.

## 5. Copy
[M] Plain words from `PRODUCT.md` §4; front-load labels; no hashes, IDs, decision numbers, model names or file paths on the main path ("Details" drawer for admins); empty states and tooltips written in the concept.

## 6. Best-in-class scorecard for case screens (founder, 7 Nov, P-407)
The founder asked for case screens that are "Best in class aesthetic, best in class capabilities, organization of the capabilities, intuitive, user friendly, tool tips, completeness, non-ambiguity, efficiency", checked "repeatedly". The study behind these checks, with every source and its strength, is `design/best-in-class-m3-case-screens-2026-11-07.md`.

**How it is used**
* **Scope:** every case-side screen (M3 on), and any configuration screen whose concept chooses to use it.
* **Concept:** each concept answers every check with how the screen meets it, or "N/A" and why (skill screen-concept, step 4c).
* **Review:** each review scores every check as Met, Partly, Not met or N/A, with evidence: a screenshot at 1440 and 1024 px, or a step (skill screen-review).
* **Severity:** a Not met is a Must when it also breaks an [M] line in §1 to §5, and a Should otherwise. A Should is fixed, or listed with a follow-up row.

The study's "applies when" column says when a check is N/A. Each check names the founder's words it serves.

| Id | Check | Serves |
|---|---|---|
| BIC-01 | **Ask once, within the fact's scope.** A fact already known in its scope is never asked again on another screen, form or application that shares that scope. A person fact is known for this person; a filing, household or organisation fact is known for its owner (P-316 (2)). It shows pre-filled, with its source. From the PQR only personal details carry, marked "please confirm"; everything else is asked fresh (P-235) | efficiency, completeness |
| BIC-02 | **Asked for a reason.** Every question asked is needed by a selected form or rule for this person, and can say why ("Asked because …"). A question whose condition is false is absent, not disabled | non-ambiguity, low load |
| BIC-03 | **No stale answers.** When an answer that other answers depend on changes, those other answers are flagged ("Check again" or "No longer needed"). No check, signature or filing uses a flagged answer until a person settles it | completeness, non-ambiguity |
| BIC-04 | **Incomplete is normal, invalid is refused.** "Not answered yet" is a visible state, not an error. Inputs are marked in words, never by an asterisk alone: client pages say "required" and "(optional)", staff pages say "(optional)". "Not known" is offered where it is valid. A malformed value is refused at the field, with how to fix it | user friendly |
| BIC-05 | **Source and confirm on every document value.** The screen shows the document, the page (and the region where available), and Accept / Edit / Reject. Nothing becomes a fact until it is accepted | capabilities, non-ambiguity |
| BIC-06 | **Honest confidence.** Low-confidence values and values "not found on the document" are shown first, in words. Bulk Accept skips them, and never accepts name, date of birth or passport number | efficiency, non-ambiguity |
| BIC-07 | **Conflicts shown, never overwritten.** When a document value differs from a confirmed fact, the screen shows both values and both sources. A person picks one, and history records the choice | non-ambiguity |
| BIC-08 | **Case structure at a glance.** Each application is a card showing its people by name and role, its status and its next step. Each person shows the applications they are in | organization, intuitive |
| BIC-09 | **Safe principal change and Remove from the case.** This is one named action. A preview shows what moves (roles, forms, documents) and what stays (facts, each in its scope). The confirmation names the people and does not default to Yes. A history entry is written, and there is a way back | completeness |
| BIC-10 | **Task list, not stepper.** Work is a list of tasks named with verbs and statuses that are calculated. "Cannot start yet" gives its reason and is not a link. Tasks can be done in any order where the rules allow. There is no numbered step indicator on nonlinear work | organization, intuitive |
| BIC-11 | **One primary action per panel, named for what it does.** No "Next" or "Submit" alone. The primary action is the next step the status calls for | intuitive, aesthetic |
| BIC-12 | **Check before it leaves.** Before signing or filing, each application has a check view grouped by person. Skipped optional answers show "Not provided". Each Change opens the edit in a drawer or dialog (§2.3) and returns to the check. Errors are kept apart from warnings, and each links to its field. Only a barcode form's own Validate blocks, plus, on an Express Entry filing, a missing police certificate or medical exam (P-172, P-315 (2)); every other filing check is a CRITICAL warning passed with who, when and a reason (§2.9; P-237, P-238) | completeness |
| BIC-13 | **Errors say what and how to fix, where it happened.** The error shows on the field and in a summary at the top, in the same words. It gives one reason and one or two fixes. What the person typed is kept. Format errors appear only after a value is typed | non-ambiguity |
| BIC-14 | **Help in place.** Every status, icon-only button and number that needs context has a tooltip that opens on hover and on keyboard focus. The tooltip holds nothing a person needs in order to act. Help needed to act is a visible hint, or a Details with a specific title ("Why we ask", "How do I know") | tool tips |
| BIC-15 | **Filing channel per form** (IRCC rules are Unconfirmed: no counsel until read on canada.ca). Each form shows its channel (online portal, PDF upload, paper) and what that channel needs (kind of signature, file limits from a cited source or marked Sample). It also shows that channel's next step | completeness |
| BIC-16 | **Signing and submission are recorded events** (IRCC chain Unconfirmed: no counsel). These four events are kept separate: Signed by representative, Signed by client, Submitted, Acknowledgement received. Each one records who, when, the channel, and a saved copy of exactly what was sent. After Submitted the application is read-only, with a way to record a correction | completeness, capabilities |
| BIC-17 | **Review returns only what needs work.** The reviewer either approves, or returns the work with a comment on each item. Only the flagged items go back. A configuration change set is never approved by its author. A filing is reviewed by the representative before it is recorded; when the representative prepared it themself, the logged "I prepared and reviewed this filing myself" step shows "Self-reviewed" (P-155 (1)). A missing review is a CRITICAL warning that firm staff may pass with a recorded reason, which the Reviewed by line shows as `Not reviewed: warning passed by <role>, <when>` with the reason, never "Self-reviewed" (P-237 (4), P-342; Unconfirmed: no counsel). The next reviewer sees what changed since their last look | efficiency |
| BIC-18 | **States drawn and teaching** (§4). An empty state says what will appear and offers the first action. A screen never shows "No records" before the data has loaded. Saved, saving and failed-to-save are all visible. A read-only screen says why | user friendly |
| BIC-19 | **Low cognitive load by layout.** At 1440 and 1024 px each panel has one heading and at most one primary button. Type uses the team scale, at most three sizes per panel. Red is used only for errors. Client pages hold at most five inputs per page. Staff pages group by person, with sections rather than tabs inside tabs. Counts say what they count, and there are no internal ids on the main path | aesthetic, low load |
| BIC-20 | **Accessible and keyboard-complete** (§2.12). Every task can be done by keyboard. Headings are in order. Client copy is in plain words, at about grade 6 to 8 | user friendly |
