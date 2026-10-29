# W1 setup checklist: one derived checklist per combination drives every card and the Overview (P-157) — concept draft v2

Stage: **Concept draft v2 (designer agent, 29 Oct)** after `challenge.md` (M1–M5 and m1–m6 taken; Lead: tab order follows P-130, documents before questions). The Lead edits and decides. Board: `design/draft-setup-checklist.html`. Markers: **[F P-xx]** = followed that decision · **[GAP]** = no decision covers it · **[CONFLICT]** = two sources disagree. Every element is tagged Capability / Scaffolding (P-33) and Needed / Not built (P-26) in §9. Counts and names are Sample.

## 1. Job and journey
The configuration author, the immigration expert and the approver each see on every card, and inside every combination, the same setup steps, which one is next and why, and reach the exact row where they must act in one click. Journey 1.1–1.4 (setup), 3.x (review and release). Capabilities: **C11.10** (Partial → Works), **C1.4** (one next step, now derived), C1.1 unchanged. Source: `W1-journey-review/review-2026-10-29.md` §1, §3, §4 #1, #2, #9.

## 2. Ten layers
Masters: none new. **Links:** the official pages of a combination (apply page, guide, checklist numbers, date checked, proposed by rules, confirmed by) are a new record from P-156 (2), owned by the forms lane (research M1). **Build precondition (M1):** the forms lane lands that record first; this slice waits for it or merges with it. **Engine:** a pure `setupChecklistOf(input)` in `engine/setup-checklist.ts` replaces `setupActionOf`, `nextActionOf`, `missingItems`, `setupProgress`, `progressFollows` (five functions that disagree today; `progressFollows` exists only to patch that). **Contract:** §7. **Screen:** card, Overview strip, focus-and-highlight on every tab. **AI assist:** no new AI. **Governance:** step 5 is the existing submit → expert signs → second person releases [F P-79, P-155]. Team code: the quiet `role="progressbar"` bar of `src/components/ui/wizard-step-card.tsx` is reused per segment; no onboarding checklist exists in the team's code.

## 3. The steps, in dependency order (nothing stored: every state is worked out from data on each read)
Recommended: **five steps** (Q1). Checked on main a19429bc: W1-15 slice 2 is merged, but Documents and Questionnaires are still two tabs; the Questionnaires tab carries "Who can be in this application" and the fact-sources strip, and `engine/sources.ts` gives each fact its source from the documents on the checklist (document › client › case officer). Documents and questions are one piece of work: one W1-15 run drafts both, and every document change moves the questions' sources. As two steps the card would show "Documents ✓, Questions ●" a minute after the run, a state that teaches nothing. If the founder picks six, step 4 splits into 4a and 4b below; nothing else changes.
| # | Step | Done when (from data) | Opens · highlights | Open items, in order (button labels) |
|---|---|---|---|---|
| 1 | **Official pages** | the combination's official-pages record has an apply page and at least one checklist, and is **confirmed** (`confirmedBy` set). Existing combinations are back-filled by rules from what is attached (finder results, manifest) as **proposed** [F P-156 (2)] | Forms · "Official pages" block | Confirm the checklist page (rules sure) · Choose the checklist page (rules unsure: one suggestion + "Choose another") |
| 2 | **Who can be in this application** | at least one applicant role (`applies`, `max > 0`), saved by a person (`participantsBy`), no people proposal waiting, and confirmed if Q3 = expert (new `participantsConfirmedBy`, runtime lane) [F P-119, P-135] | Forms · people card (Q2) | Review n people proposals · Confirm who can apply |
| 3 | **Forms** | at least one form line; no finder result waiting; every data form has a current approved library edition with its form fields mapped; no problem located on Forms; no new edition held on a form in use | Forms · first open line | Find forms · Add n forms found · Map n forms · Fix n form problems · Review new edition. *After P-156 (3)(4) land:* "Review n form picks", "Upload n forms" replace "Add n forms found" |
| 4 | **Questions and documents** (4a then 4b, P-130) | 4a: every applicant role has at least one document line, no document proposal waiting, every line's document type approved in the library; 4b: every applicant role has questions, no fact asked of nobody (the strip's gaps; each fact has exactly one source by `engine/sources.ts`, on main since a19429bc), no question proposal waiting, no problem located there (§4 table) | Documents first, then Questionnaires · first open row | Draft questions and documents · Review n document proposals · Review n question proposals · Fix n problems · n answers asked of nobody |
| 5 | **Review and release** | no draft changes since the latest release, a release exists, its checks pass | Review and release · first unsigned group | Submit for review · Review and sign · Release |
**Marks:** ✓ Done · ● Next · ○ To do · ◐ AI at work · ⧗ Waiting for someone else. Steps are judged one by one: a new edition reopens Forms while step 4 stays ✓. The bar says **"3 of 5 done · Next: Forms"**, never "Step n of 5" (a reopened step makes "Step 3" beside "4 done" a contradiction). Preview is not a step. **Precedence (m4):** the button is the first item of the first open step; ◐ marks only its own segment; "View AI progress" is the button only when the running step is the first open step; a proposal waiting on step 2 wins over a run on step 4. **Not built (M1 c):** a step 1 reopened by a later rules proposal (no index refresh produces one yet).
**Start setup (m3):** creates the combination with its place read-only [F P-125 (1)(3)], runs the rules proposal of its official pages (US$0, no AI) and lands on Forms with step 1 highlighted. No AI run starts until steps 1 and 2 are done; then "Find forms" reads the stored pages [F P-156 (2)(3); **[CONFLICT]** P-125 (3) said Start setup starts the scoped AI work; P-156 is newer and wins, the Lead records the amendment].

## 4. Who acts on each item (M2): the filled button and the server's 403 read this one table
Duties from `api/src/core.ts` ACTORS: Configuration author (author, review) · Content reviewer (review, sme = immigration expert) · Approver (review, approve). "review" alone acts on nothing here.
| Open item | Acts | Filled for | Everyone else sees (outline, Next line) |
|---|---|---|---|
| Confirm / choose the checklist page | sme (Q3; else author) | the immigration expert | "Waiting for the immigration expert to confirm the checklist page" |
| Confirm who can apply | sme (Q3; else author) | the immigration expert | "Waiting for the immigration expert to confirm who can apply" |
| Review n people / document / question proposals · Add n forms found · Map n forms · Upload n forms | author | the author | "Waiting for the configuration author: n proposals" |
| Fix n problems (draft or release) · Review new edition · Find forms · Draft questions and documents | author | the author | "Waiting for the configuration author" |
| Submit for review | author | the author | "Not submitted yet" |
| Review and sign | sme, not the submitter | the immigration expert | "Waiting for the immigration expert to sign n groups" |
| Release | approve, not an author of the changes | the approver | "Waiting for a second person to release" |
| View AI progress | nobody (anyone may open; Stop for whoever started it) | never filled | "AI at work: step n of 7" |
| Open (all done, or nothing for this viewer) | — | never filled | — |
Filled iff the viewer holds the duty and the second-person rule allows it. The server answers 403 on the same table (`engine/setup-checklist.ts` exports it; the API and the screen import it, no copy).

## 5. States (M3) and where each problem belongs (m1)
The **chip comes from the release** (as today: In setup · Not ready · Live); the **steps come from the draft**. Not started: no bar segments filled, outline **Start setup**. In setup: as §3. **Not ready** (released, its own release fails a check): the release's problems become open items on their steps, **first, before any draft item**, filled for the author, Next line "Firms cannot open cases until this is fixed". **Live:** chip "Live · Release n"; the bar shows the draft, "Changes since Release n"; all ✓ → outline **Open**. Live with proposed (back-filled) pages: step 1 is an open item, filled for the expert, the chip stays Live (as a held edition). **Retired:** no bar, no Next line, outline **Open**. **Just added:** the Not started card with the note "Just added" (P-128). Loading: skeleton bar. Error: "The setup steps could not be worked out." + Retry.
| Validator `where` (in `engine/validate.ts`) | Step | Lands on |
|---|---|---|
| Forms | 3 | Forms · the line |
| Documents | 4a | Documents · the line |
| Questions · Questionnaires · Rules · Checks · Derived fields | 4b | Questionnaires · the row |
| Library | 4b | Questionnaires row, with a link to the Shared library row where it is fixed |
| Row, or any `where` not listed | 5 | Review and release · the problem |
A test fails when a `where` in code has no row here.

## 6. The card, the Overview, the button map
**Card** [F P-115 design D, P-128]: trail, title, chip, five-segment bar (shape + text) with "n of 5 done · Next: <step>", facts line, "Next: …" line with count and why, one button bottom-left in the same place and size, filled only per §4. A click opens `/c/:id/<tab>?focus=<item>`: scrolled to centre, focus moved, outlined 2 s (still with reduced motion); never a pop-up [F P-50]; an item fixed meanwhile lands with "This was done since you opened it. Next: …". **Overview** [F P-118 Q5]: the strip replaces "Missing before firms can use it" and the header "Next step" box; each row: mark, step, one-line summary with counts, its open item as a link to the row; the counts below read `setup.counts`. **Tabs** (Lead, P-130): Overview · Forms · Documents · Questionnaires · Preview · Review and release; each tab badge = its step's open count. **Copy:** bar tooltip "Five steps, worked out from what is set up now. ✓ done · ● next · ◐ AI at work · ⧗ waiting for someone else." Step 1 tooltip "IRCC's apply page and document checklist for this combination. The forms, the people and the documents are read from them."
| Today's card button | Now |
|---|---|
| Start setup (filled on 14 cards) | Start setup, outline (nobody is waiting) |
| Find forms | Find forms (step 3), filled for the author |
| Add n forms from the library | the card no longer adds: "Add n forms found" opens Forms on the finder result; "Review n form picks" after P-156 (3) |
| Draft setup | "Map n forms" (only if an edition is unmapped) · "Draft questions and documents" (step 4) |
| View AI progress | View AI progress, outline (precedence §3) |
| Review n AI proposals | Review n people / document / question proposals, opens that tab |
| See n missing | gone: each line is an open item of its step |
| See new edition(s) | Review new edition (step 3), chip stays Live |
| Review and release | Submit for review · Review and sign · Release, by duty (§4) |
| Open (author and approver) | Open, outline |
**[GAP]** the orange "Draft · n changes" banner on Programs (review §1.5): no decision; left as is for the Lead.

## 7. Contract, counts and scale
`setupChecklistOf(input): SetupChecklist` (viewer-free) + `forViewer(checklist, actor)` (duty overlay, §4).
`SetupChecklist = { combinationId, chip: { status, release } , steps: Step[5], current, next: { item, step, href, line, acts } | null, bar: { done, of: 5, text }, counts, key }`; `Step = { key: "pages" | "people" | "forms" | "questions_documents" | "release", label, state, summary, parts?: [4a, 4b], open: { kind, count, text, focus, acts, fromRelease }[], tab }`; the overlay adds `next.needsYou` and `next.label` for the viewer.
`GET /catalogue` cards carry `setup.{chip, bar, next, steps}` (steps without `open`); `GET /combinations/:id/summary` the full `setup` (replaces `row.missing`, `row.progress`, `row.nextAction` and `rowCounts`); both take `x-actor`.
**Counts (M4), one definition each:**
| Count | Definition (one, in the engine) |
|---|---|
| forms | current draft form lines, excluding retired and superseded editions; attached source files not yet set up are a step 3 open item, never a form (today the card adds them, the cause of LMIA 6 vs 8) |
| people | roles in "Who can be in this application" with `max > 0`; applicants = those with `applies` |
| documents | draft document lines (always + only if), each line once |
| questions | facts asked of the client (Comes from = Client) for each applicant role, plus facts asked once per application, conditional ones included; facts a document supplies are not counted (P-130) |
| proposals · problems · held editions | waiting proposals by kind · problems by step (§5) · held new editions on forms in use |
Read by four surfaces, never recomputed: **the Programs card, the Overview, the tab headers (Forms, Documents, Questionnaires) and the "need you" counts** (Pathway band, Needs you filter, To review's combination row). Preview shows its own number labelled "for this sample family". "Need you" counts combinations whose button is filled for this viewer; To review counts items and says "items".
**Scale (M5):** `setupChecklistOf` results are cached per combination, keyed by draft sha256 + release id + library change counter, so one edit rebuilds one combination, not the workspace; the viewer overlay runs after the cache. New reads are batched: one `groupBy` combination × proposal kind, one `findMany` for official pages, `structureProblems` batched (no per-combination await).
**Tests (pass / fail per rule):** counts: the four surfaces equal on all six sample combinations / a second count path fails the contract test. Steps: forms attached + 3 finder results → "Add 3 forms found" / never "Find forms". Duties: 3 personas × every board state, filled exactly per §4 / the author's Confirm-pages call → 403 when Q3 = expert, the submitter's Sign → 403. States: Not ready + draft all ✓ → filled release problem first / never outline Open; Live + proposed pages → chip Live, step 1 open; Retired → no bar. Precedence: run on 4 + proposal on 2 → "Review n people proposals". Where→step: every `where` mapped / a new one fails. Focus: `?focus=` outlines the row / an unknown focus lands with no error. Scale: **150 combinations cold < 1.5 s, warm < 200 ms**; one edit rebuilds one cache entry. Keyboard: Tab to the button, Enter lands with focus on the item; axe on every state.

## 8. Followed, missing, conflicting
[F P-157] · [F P-156 (2)] step 1, back-filled as proposed · [F P-130] documents before questions, in step 4 and in the tab order (Lead) · [F P-119, P-135] people before forms · [F P-118 Q5] Overview only reports · [F P-50] no pop-up · [F P-79, P-155] second person · [F P-154] words; no decision numbers on screen. **[CONFLICT]** P-125 (3) vs P-156 on Start setup (§3; the newer wins). **[CONFLICT]** the review puts people on Overview, P-118 Q5 says Overview reports, main keeps the people card on Questionnaires → Q2. **[GAP]** who confirms immigration values in setup (AGENTS rule 4 says they come from the expert; no decision gives the expert a duty in setup) → Q3. **[GAP]** orange banner (§6).

## 9. Capability or scaffolding · needed or not built
Capability · Needed: the step engine and cache, the duty table and overlay, card bar, one button, Next line, Overview strip, tab badges, focus-and-highlight, every state in §5, one counts object. Capability · Needed, another lane: the official-pages record, its back-fill and Confirm block (forms, P-156 (2), precondition); "Review n form picks" and "Upload n forms" (forms, P-156 (3)(4)); `participantsConfirmedBy` and the people card move (runtime, if Q2 and Q3 as recommended). Scaffolding · Needed: Sample counts and names, Load sample (P-148 six), Acting as. Not built: step 1 reopened by a rules refresh, time estimates on the Next line, owners or due dates, ticking a step by hand, bulk "next step" on many cards, "No documents for this role" marking.

## 10. Questions for the founder (recommendation first)
1. **Five or six steps:** five, with Questions and documents as one step (documents first inside it) (**Recommended:** one AI run moves one step, sources depend on documents, and main still has them as two tabs that one step can open in order) · or six, Documents and Questions apart.
2. **Where steps 1 and 2 are done:** at the top of Forms, "Before forms: official pages · who can be in this application", with the people card moved from Questionnaires (**Recommended:** forms per person depend on it and Overview stays report-only) · or keep the people card on Questionnaires (step 2 then sends people past Forms) · or on Overview (amends P-118 Q5).
3. **Who confirms the official pages and who can be in the application:** the immigration expert confirms, rules and the author propose (**Recommended:** both are immigration values, AGENTS rule 4) · or the configuration author confirms alone.

## Definition of Ready
- [ ] Board agreed by the founder (click-through of `design/draft-setup-checklist.html`)
- [x] Every element labelled Needed / Not built and Capability / Scaffolding (§9, board tags)
- [ ] Data and API needs known and available (§7 known; the official-pages record is a forms-lane precondition, not built)
- [ ] Every decision it relies on agreed (Q1–Q3; the P-125 (3) amendment recorded)
- [ ] No open questions (Q1–Q3; the banner GAP for the Lead)
