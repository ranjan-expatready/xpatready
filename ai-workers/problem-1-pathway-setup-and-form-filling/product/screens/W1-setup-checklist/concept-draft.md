# W1 setup checklist: one derived checklist per combination drives every card and the Overview (P-157, P-161, P-176) — concept draft v4 (card per board v4, R-144, P-180)

Stage: **Concept draft v3 (designer agent, 30 Oct)** after the fresh challenge F1–F5 (`challenge.md`, branch `claude/screens-checklist`) and the Lead's response: F1 → P-176, F2 and F4 accepted, F3 decided by the Lead, F5 accepted (the Lead edits the capability rows). v2's Q1–Q3 are answered by P-161 (1)(2) and P-176. Board: `design/draft-setup-checklist.html` (v3). Slices: `plan.md`. Markers: **[F P-xx]** = followed that decision · **[GAP]** = no decision covers it · **[CONFLICT]** = two sources disagree. Every element is tagged Capability / Scaffolding (P-33) and Needed / Not built (P-26) in §10. Names, counts, roles and editions are **Sample**.

## 1. Job and journey
The configuration author, the immigration expert and the approver each see on every card, and inside every combination, the same five setup steps, which one is next and why, and reach the exact row where they must act in one click; an item the rules or both AI rounds are sure of is confirmed by the author, anything else waits for the expert. Journey 1.1–1.4 (setup), 3.x (review and release). Capabilities: **C11.10** (the P-157/P-161 checklist: Not built → Works), **C11.16** (Start setup without AI, P-156), **C1.4** (one next step, now derived), C1.1 unchanged. Source: `W1-journey-review/review-2026-10-29.md` §1, §3, §4 #1, #2, #9.

## 2. Ten layers
Masters: none new. **Links:** the official-pages record of a combination (apply page, checklist, date checked, proposed by rules, `confirmedBy`, `confirmedAs: author | expert`) from P-156 (2), built by the forms lane in its queue item 2, before the AI pick of P-156 (3) [F P-156 (2), P-176]. People: `combination.participants` + `participantsBy` exist; the tier is stored beside them as `participantsConfirmedAs` (new field; no `participantsConfirmedBy`, F1). **Engine:** a pure `setupChecklistOf(input)` in `engine/setup-checklist.ts` replaces `setupActionOf`, `nextActionOf`, `missingItems`, `setupProgress`, `progressFollows` (five functions that disagree today). **Contract:** §8, plus `ProposalItem.agreement` / `confidence` from `contracts/proposal-item.ts` v2.1 (read, unchanged). **Screen:** card, Overview strip, focus-and-highlight. **AI assist:** none new; every live AI path is off unless the server starts with the live switch [F P-175]. **Governance:** step 5 is the existing submit → expert signs → second person releases; the expert still signs every release whoever confirmed steps 1–2 [F P-79, P-155, P-161 (3)]. Team code: the quiet `role="progressbar"` bar of `src/components/ui/wizard-step-card.tsx` is reused per segment; no onboarding checklist exists in the team's code.

## 3. Delivery: slices and owners (F2, F3; detail in `plan.md`)
| Slice | What | Owner | Waits for |
|---|---|---|---|
| **A** Engine and contract | `engine/setup-checklist.ts` (steps, marks, precedence, the two tables of §6, one `counts`, `forViewer`), `contracts/setup-checklist.ts` (zod), `rows()` and `summary()` return `setup`, cache; step 1 read through one reader `officialPagesOf(ids)` that answers "no record yet" until the forms lane fills it; the old five functions re-expressed on top, parity-tested, then deleted | screens | the Lead's OK on v3; no visible change |
| **B** Card and Overview | Programs card, Overview strip, "need you" counts, the review queue's two new filters (`c`, `step`), the shared pieces `useFocusItem(focus)` (scroll, focus, 2 s outline, "done since you opened it") and `StepBadge` | screens | slice A; the forms lane's official-pages record on main (forms queue item 2) |
| **C** Tabs | "Before forms" block at the top of Forms (hosts the forms lane's pages block and the people card); the people card **removed from Questionnaires and Overview**; tab badges from `setup`; `?focus=` landing on Forms, Documents, Questionnaires, using `useFocusItem` and `StepBadge` | runtime, its own slice | slice B; runtime PR #94 (Documents tab) |
Written in both lane files before slice B (Lead). `workspace/overview.tsx` is edited by B (strip) then C (people card out): B merges first.

## 4. The steps, in dependency order (nothing stored: every state is worked out from data on each read) [F P-161 (1)]
| # | Step | Done when (from data) | Opens · highlights | Open items, in order (button labels) |
|---|---|---|---|---|
| 1 | **Official pages** | the record has an apply page and at least one checklist, and is confirmed at the tier §5 requires. Existing combinations are back-filled by rules from what is attached as **proposed** [F P-156 (2)] | Forms · Before forms · "Official pages" | Confirm the checklist page (rules found exactly one match) · Choose the checklist page (several or none: one suggestion + "Choose another") |
| 2 | **Who can be in this application** | at least one applicant role (`applies`, `max > 0`) saved (`participantsBy`), no `person_role` proposal waiting, confirmed at the tier §5 requires [F P-119, P-135, P-176] | Forms · Before forms · people card [F P-161 (2)] | Review n people proposals · Confirm who can apply |
| 3 | **Forms** | at least one form line; no finder result waiting; every data form has a current approved library edition with its fields mapped; no waiting proposal of the step 3 kinds; no problem located on Forms; no new edition held on a form in use | Forms · first open line | Find forms · Add n forms found · Map n forms · Review n proposals · Fix n form problems · Review new edition. *After P-156 (3)(4):* "Review n form picks", "Upload n forms" replace "Add n forms found" |
| 4 | **Questions and documents**, 4a then 4b [F P-130] | **4a:** every applicant role has at least one document line, no waiting proposal of the 4a kinds, every line's document type approved in the library. **4b (F4, P-174):** no fact a form or rule reads is asked of nobody (`engine/sources.ts` gaps), no waiting proposal of the 4b kinds, no problem located there (§6) | Documents first, then Questionnaires · first open row | Draft questions and documents · Review n proposals · Fix n problems · n answers asked of nobody |
| 5 | **Review and release** | no draft changes since the latest release, a release exists, its checks pass | Review and release · first unsigned group | Submit for review · Review and sign · Release |
"Has questions" is not a condition: a question exists once a form or rule reads it (P-174). **"Review n proposals"** opens the one review queue filtered to this combination and step, `/review?c=<id>&step=<n>`, never a tab [F P-149; queue gains `c` and `step` in slice B]. **Marks:** ✓ Done · ● Next · ○ To do · ◐ AI at work · ⧗ Waiting for someone else. Steps are judged one by one (a new edition reopens Forms while step 4 stays ✓); the bar says **"3 of 5 done · Next: Forms"**, never "Step n of 5"; Preview is not a step. **Precedence:** the button is the first item of the first open step; ◐ marks only its own segment; "View AI progress" is the button only when the running step is the first open one; a proposal waiting on step 2 wins over a run on step 4. **Start setup:** creates the combination, place read-only [F P-125 (1)(3)], runs the rules proposal of its pages (US$0, no AI) and lands on Forms with step 1 highlighted; no AI run before steps 1–2 are done [F P-156; **[CONFLICT]** P-125 (3) said Start setup starts AI work; P-156 is newer, the Lead records the amendment]. AI buttons on a copy without the live switch land on their tab, where the run is refused in plain words at US$0 [F P-175].

## 5. Who acts on each item: the filled button and the server's 403 read this one table [F P-176]
Duties from `api/src/core.ts` ACTORS: Configuration author (author, review) · Content reviewer (review, sme = immigration expert) · Approver (review, approve).
**Sure** (author confirms): pages: `agreement = rules_only` with exactly one canada.ca match; people: every `person_role` item behind the saved list has `agreement = agreed` and `confidence = ready`, with no rules flag. **Not sure** (expert confirms): `differ`, `one_round`, Check or Decide; several or no page matches; an AI page suggestion taken; a rules flag **unusual** (a role or count outside the cases of `domain/TAXONOMY.md` §4; the reason is shown). The tier is computed per item by the engine and stored with the confirmation (`confirmedAs`).
| Open item | Acts | Filled for | Everyone else sees (outline, Next line) |
|---|---|---|---|
| Confirm the checklist page · Confirm who can apply, **sure** | author or sme | the author | "Ready for the configuration author to confirm" |
| Confirm / Choose the checklist page · Confirm who can apply, **not sure** | sme | the immigration expert | "Waiting for the immigration expert: 3 pages match" · "… a role outside the usual cases" |
| Review n proposals (any step) · Add n forms found · Map n forms · Upload n forms | author | the author | "Waiting for the configuration author: n proposals" |
| Fix n problems (draft or release) · Review new edition · Find forms · Draft questions and documents | author | the author | "Waiting for the configuration author" |
| Submit for review | author | the author | "Not submitted yet" |
| Review and sign | sme, not the submitter | the immigration expert | "Waiting for the immigration expert to sign n groups" |
| Release | approve, not an author of the changes | the approver | "Waiting for a second person to release" |
| View AI progress | nobody (anyone opens; Stop for whoever started it) | never filled | "AI at work: step n of 7" |
| Open (all done, or nothing for this viewer) | — | never filled | — |
Filled iff the viewer holds the duty and the second-person rule allows it. The server answers 403 on the same table (exported by `engine/setup-checklist.ts`, imported by the API, the forms lane's confirm endpoint and the screen; no copy). Within a review queue item the existing per-item duties apply. **[GAP]** a people list with nothing sure behind it (typed or changed by hand, or saved before this rule) → Q1. **[GAP]** "the cases of TAXONOMY §4" are 20 case descriptions, not a list of roles and counts the rules can read → Q2.

## 6. States, and where each problem and proposal belongs
The **card shows the draft's steps and nothing from the release except "Live"** [F R-144, P-180]. Not started: "0 of 5 steps", empty edge bar, **Start setup**. In progress (1–4 steps done, or all five done but not released): "n of 5 steps", n parts of the edge bar, **Resume setup**, which lands on the first open item. **Not ready** (its own release fails a check): the release's problems become open items on their steps, **first, before any draft item**; step 5 reopens, so the card reads "n of 5 steps", **Needs you** for the author ("Firms cannot open cases until n problems are fixed"), **Resume setup**. **Live**, with or without unreleased changes: "✓ Live", full green edge bar, **Open**; the release number and "Changes since Release n" show in the combination page's header. Live with back-filled pages: still "Live"; step 1's item shows on the page, and Needs you appears for whoever confirms it (§5 tier). **Retired:** "Retired at Release n", no bar, **Open**. **Just added:** the Not started card, scrolled into view and outlined for 2 s, with no extra text. Loading: a skeleton card. Error: "Setup steps could not be worked out." with Retry; Open still works.
| Validator `where` (the eight values in `engine/`) | Step | Lands on |
|---|---|---|
| Forms | 3 | Forms · the line |
| Documents | 4a | Documents · the line |
| Questions · Questionnaires · Rules · Checks · Derived fields | 4b | Questionnaires · the row |
| Library | 4b | Questionnaires row, with a link to the Shared library row where it is fixed |
| any other value (fallback) | 5 | Review and release · the problem |

| Proposal kind (`PROPOSAL_KINDS`, 11) | Step | Counted for this combination when |
|---|---|---|
| person_role | 2 | it is about this combination's people |
| form_check · field · answer_list | 3 | its form edition is on this combination's form lines (library kinds: `scope.formEdition`) **[CONFLICT] → Q3** |
| document_type · requirement_line | 4a | its edition is on the lines, or `scope.combinationId` is this one |
| section · condition · comes_from · cross_check · pqr_pick | 4b | as 4a |
Tests: every `where` literal in `engine/` (the eight) and every kind (the eleven) has a row; a new value without a row fails.

## 7. The card, the Overview, the button map
**Card** [F R-144, P-180, P-115, P-128]: five things only: (1) the combination's name as the heading; (2) the full trail, one small grey line that ends in "…" when long, with the full trail on hover and for screen readers; (3) one progress line, "n of 5 steps" or "✓ Live", with a 2 px five-part edge bar along the bottom that only repeats it (aria-hidden, never the only signal); (4) **Needs you**, a small mark top right, only when an item on the viewer's duty and tier waits (§5), and its hover says what and how many; (5) one button, the same place and size on every card, in the one primary colour: **Start setup** · **Resume setup** · **Open**. For a person without the author duty the button is **Open** in every state (Q1). The rest of the card also opens the combination. Gone from the card: chip, "n of 5 done · Next: …", facts line, "Next: …" line, release numbers, AI problems and progress, rule codes, system phrases. They live on the combination's Overview. **Overview** [F P-118 Q5, P-161 (2)]: reports only; the strip replaces "Missing before firms can use it" and the header "Next step" box; each row: mark, step, one-line summary with counts and who confirmed on which tier ("confirmed by the configuration author · sure"), its open item as a link; no people card. **Tabs** [F P-130]: Overview · Forms · Documents · Questionnaires · Preview · Review and release; each badge = its step's open count. **Copy:** bar tooltip "Five steps, worked out from what is set up now. ✓ done · ● next · ◐ AI at work · ⧗ waiting for someone else." Step 1 tooltip "IRCC's apply page and document checklist for this combination. The forms, the people and the documents are read from them." Sure/not-sure tooltip "The configuration author confirms what the rules or both AI readings agree on; anything else waits for the immigration expert."
| Today's card button | Now (on the card) | Where the act lives |
|---|---|---|
| Start setup | Start setup | Overview, step 1 |
| Find forms · Add n forms from the library · Draft setup · Map n forms | Resume setup | step 3's item on Forms (`?focus=`) |
| View AI progress | Resume setup | the step's ◐ row on the Overview |
| Review n AI proposals | Resume setup (author) · Needs you on the card | the queue filtered to this combination and step |
| See n missing | Resume setup | the open item of its step |
| See new edition(s) | Open (Live) · Needs you | step 3, Review new edition |
| Review and release · Submit · Sign · Release | Resume setup (author) · Open with Needs you (expert, approver) | step 5, by duty (§5) |
| Open | Open | Overview |

**Page around the cards** [F R-144, P-180, P-128, P-115]:
* Filter bar stays (P-128): Find · status chips **All · Not started · In progress · Live** (· Retired while any) · **Needs you** toggle · Cards / List (P-115). "Needs work" and "Not ready" fold into In progress and Needs you (Q2).
* Sections: Pathway, then Program, each header with one quiet count "n of m live", folding open or closed, with the fold state remembered per person. A filter or search opens every section holding a match and hides the rest.
* List: one line per combination: name, trail, five-part mini bar with "n of 5" or "Live", Needs you, the button. With Needs you on, each Pathway line says how many need you.
* Columns: 4 at 1440 px, 3 at 1024 px, 2 at 800 px, 1 on a phone.
* Speed: the 150-combination timing test stays (§8).

**One button colour** [F P-180 Q3]: `--color-primary` (#0862C5, white text 5.89:1; hover #054E9C 8.15:1) for every primary button; green keeps meaning Live and done. Options weighed (board v4 §5):
| Option | Text on fill | Fill against white | Note |
|---|---|---|---|
| **A · brand blue #0862C5 (recommended)** | white 5.89:1 (hover #054E9C 8.15:1) | 5.89:1 | the team's token today (tokens.css primary-600); nothing new; green stays "Live / done" |
| B · green #15803D | white 5.02:1 | 5.02:1 | passes, but reads as a status beside ✓ Live; a new token outside the brand kit |
| C · light green #DCFCE7 | #0F5C2E 7.38:1 | 1.10:1, needs the #16A34A border (3.30:1) | the weakest call to action; the same meaning clash |

**Slice B tests (card):** the card shows exactly the five things (no chip, Next line or rule code: a text scan fails on "P-\d+", "Release \d" or "Next:"); the button word per state and per duty; Needs you only when the viewer's item waits; one primary colour (every `.primary` button computes the same background); fold state remembered; List row content; 1440, 1024, 800 and 375 px; 150 combinations within the concept's timing budget.
**[GAP]** the orange "Draft · n changes" banner on Programs (review §1.5): no decision; left as is for the Lead.

## 8. Contract, counts and scale
`setupChecklistOf(input): SetupChecklist` (viewer-free) + `forViewer(checklist, actor)` (duty overlay, §5).
`SetupChecklist = { combinationId, chip: { status, release }, steps: Step[5], current, next: { item, step, href, line, acts, tier } | null, bar: { done, of: 5, text }, counts, key }`; `Step = { key: "pages" | "people" | "forms" | "questions_documents" | "release", label, state, summary, confirmed?: { by, as: "author" | "expert" }, parts?: [4a, 4b], open: { kind, count, text, focus, acts, tier?: "author" | "expert", reason?, fromRelease }[], tab }`; the overlay adds `next.needsYou` and `next.label`. `GET /catalogue` cards carry `setup.{chip, bar, next, steps}` (steps without `open`); `GET /combinations/:id/summary` the full `setup` (replaces `row.missing`, `row.progress`, `row.nextAction`, `rowCounts`); both take `x-actor`. `GET /review-queue` gains `c` and `step`.
| Count | Definition (one, in the engine) |
|---|---|
| forms | current draft form lines, excluding retired and superseded editions; attached source files not yet set up are a step 3 open item, never a form (cause of LMIA 6 vs 8) |
| people | roles with `max > 0`; applicants = those with `applies` |
| documents | draft document lines (always + only if), each line once |
| questions | facts asked of the client (Comes from = Client) per applicant role, plus once per application, conditional ones included; document-supplied facts not counted (P-130, P-174) |
| proposals · problems · held editions | waiting proposals by step (§6 kind table) · problems by step (§6 `where` table) · held new editions on forms in use |
Read by four surfaces, never recomputed: **the Programs card, the Overview, the tab headers and the "need you" counts** (Pathway band, Needs you filter, To review's combination row). Preview shows its own number "for this sample family". "Need you" counts combinations whose button is filled for this viewer; To review counts items.
**Scale:** results cached per combination; the key is built from what `rows()` already reads for it (latest audit event, job, proposal and intake change), its draft sha256, its release id and its official-pages record version (no "library change counter" exists, F5). A library approval reaches the key through the audit event it writes on each affected combination; slice A checks this, and if none is written the key adds the latest library event (a library change then rebuilds all). The viewer overlay runs after the cache. Reads are batched: one `groupBy` combination × kind, one `findMany` for pages, `structureProblems` batched.
**Tests (pass / fail):** counts: four surfaces equal on all six sample combinations / a second count path fails. Steps: 3 finder results → "Add 3 forms found" / never "Find forms". 4b: a fact a form reads and nobody is asked → 4b open / ✓ only with no gap. **Tier (P-176):** pages with one match → author filled, author's confirm stores `confirmedAs = author`; three matches → expert filled, the author's confirm → 403; `person_role` agreed + ready → author; `differ` or an unusual flag → expert, the author's confirm → 403. Duties: 3 personas × every board state, filled exactly per §5; the submitter's Sign → 403. States: Not ready + draft ✓ → filled release problem first / never outline Open; Live + proposed pages → chip Live, step 1 open; Retired → no bar. Precedence: run on 4 + proposal on 2 → "Review 1 proposal" for step 2. Tables: §6. Queue: "Review n proposals" lands on `/review?c&step` showing exactly n / an item of another step is not shown. Focus: `?focus=` outlines the row / an unknown focus lands with no error. Scale: **150 combinations cold < 1.5 s, warm < 200 ms**; one edit rebuilds one entry. Keyboard: Tab to the button, Enter lands with focus on the item; axe on every state. Checks named by capability (P-86).

## 9. Followed, missing, conflicting
[F P-157] · [F P-161 (1)] five steps · [F P-161 (2)] Before forms on Forms, Overview report-only · [F P-176] tier per item, stored · [F P-156 (2)] step 1, back-filled as proposed · [F P-174] no "has questions" · [F P-130] documents first · [F P-119, P-135] people before forms · [F P-118 Q5] · [F P-50] · [F P-79, P-155] · [F P-175] AI off by default · [F P-154] words. **[CONFLICT]** P-125 (3) vs P-156 (§4). **[CONFLICT]** step 3 kinds: the Lead's "queue filtered to combination and step" vs F4's "decided on the forms' page (1b rule)"; library kinds are drafted per form edition and decided once for every combination → Q3. **[GAP]** hand-made people list → Q1. **[GAP]** "unusual" has no readable list → Q2. **[GAP]** orange banner (§7). F5 (C11.10 split, C11.16 reworded when slice B lands): the Lead's rows.

## 10. Capability or scaffolding · needed or not built
Capability · Needed: the step engine and cache, the two tables, the duty and tier table and overlay, card bar, one button, Next line, Overview strip, the queue's `c`/`step` filters, `useFocusItem`, `StepBadge`, every state in §6, one counts object. Capability · Needed, another lane: the official-pages record with back-fill, Confirm/Choose block and confirm endpoint storing `confirmedBy`/`confirmedAs` (forms, item 2); "Review n form picks", "Upload n forms" (forms, P-156 (3)(4)); Before forms block, people card moved, tab badges, `?focus=` landing (runtime, slice C). Scaffolding · Needed: Sample counts, names and roles, Load sample (P-148 six), Acting as. Not built: step 1 reopened by a rules refresh, time estimates, owners or due dates, ticking a step by hand, bulk "next step", "No documents for this role" marking.

## 11. Questions for the founder (recommendation first)
1. **A people list with nothing sure behind it** (typed or changed by hand, or saved before this rule): the immigration expert confirms it (**Recommended:** P-176's "everything else", and a hand change is exactly what no reading checked) · or the author confirms a list saved before 30 Oct as it stands, the expert only new hand changes.
2. **What counts as "unusual" for people:** a short Sample list of documented roles and counts, drawn from TAXONOMY §4 by the Lead and confirmed by the expert; until it is confirmed every people list goes to the expert (**Recommended:** safe default, the rule needs a list it can read) · or until then nothing is flagged.
3. **Step 3 proposals (form checks, fields, answer lists):** "Review n proposals" on step 3 opens the form's own fields page when one form has them, else the queue filtered to the step (**Recommended:** they are decided per form edition for every combination, F4's 1b rule) · or always the filtered queue (the Lead's response).

## Definition of Ready
- [ ] Board agreed by the founder (click-through of `design/draft-setup-checklist.html` v3)
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§10, board tags)
- [ ] Data and API needs known and available (§8 known; the official-pages record is the forms lane's item 2, not built; the queue filters and `participantsConfirmedAs` are new)
- [ ] Every decision it relies on agreed (P-161, P-176 agreed; Q1–Q3; the P-125 (3) amendment recorded)
- [ ] No open questions (Q1–Q3; the banner GAP and the lane-file notes of §3 for the Lead)

## Board v4 (30 Oct, P-180)
The founder gave the Go on board v4 (`design/draft-board-v4.html`) with the recommendations: Q1 people without the author duty see **Open**, with Needs you when they must act; Q2 status chips **All · Not started · In progress · Live** plus the Needs you toggle; Q3 **brand blue** `--color-primary` for every primary button. §6 first paragraph and the §7 card, button map, page and colour text above come from `board-v4-notes.md`. Board v3 (`design/draft-setup-checklist.html`) stays the reference for the steps, duties, Overview and tables.
