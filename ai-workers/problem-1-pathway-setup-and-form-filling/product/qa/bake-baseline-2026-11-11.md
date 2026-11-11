# Bake baseline: the journey sorted and counted (BK-1)

**Row:** BK-1 "Sort the journey" (Bake plan `design/bake-plan-2026-11-10.md` §2 row 1, on the Lead's branch `lead/2026-11-10-records-lead9` f540cce9e; P-447 (1), (2)). **Mode:** `/qa explore bake-journey`, qa lane (cloud).
**Tested on:** `origin/main` **8fc65d0b9cfb8f0ccb2eb9a6d2149c324a2df46f** (#1499), 10 Nov 2026, 22:50-23:55 IST. Read-only on the product: no app code, test or tool changed.
**How:** Chromium shown on a virtual display (Xvfb, a visible browser on a cloud machine), 1440 × 1000, driven step by step through the screens only (no API shortcut on the walked steps). Two isolated copies, fresh databases: `qa_bake` :4470 (Load sample, "the six") and `qa_bake2` :4471 (the configured checkpoint, loaded by its route because it is scaffolding for the case half, P-33). **Live AI off** (`STUDIO_AI_LIVE` unset), **US$0**, no priced button pressed (P-175). Evidence: `qa/reports/2026-11-11-bake-baseline/` (`walk/` 30 screenshots, `scripts/` the driver and the questionnaire filler, `walk-b-checkpoint-load.json`).

## 1. Open Majors, Criticals and Blockers in `qa/BUGS.md` (main 8fc65d0b9)

**Count: 0 Blocker · 0 Critical · 14 Major.** The plan's 14 is right; its 10 on the journey (rows 6-13) is right as a set, with the notes in the last column. "Journey" = P-447 (1): set up and release a pathway, open the family case, Client A answers, the representative reviews, forms filled.

| Row | On the journey? | One-line reason | What tonight's walk adds |
|---|---|---|---|
| QA-237 | **On** (set-up) | Accepting a proposed show-if condition (C4.11 step 5) makes the draft refuse; a publisher setting up meets it | Not reached: the walk did not accept conditions (set-up from the six was not walkable end to end, §2.5) |
| QA-239 | **On** (release) | An approved condition on one pathway blocks the release of every pathway whose form reads the question | Not reached; bites once two pathways carry conditions, and E4 (Study permit) certainly meets it |
| QA-276 | **On** (release), conditional | "Approve and release" 409s after a question is moved to an unchosen section | Release by screens went through tonight (§2.4) without that move; the row itself says Minor if no screen can make the move |
| QA-234 | **On** (set-up), **probably already fixed** | Its text: no screen offers "ask this Yes/No form field as its own question" | The AI field-map page offers **"Ask as its own question"** on main (`web/src/components/own-questions.tsx`, used by `pages/job.tsx`; screenshot `walk/09`). Retest before row 8 takes a screens session |
| QA-275 | **On** (forms filled) | Two fills of one form in the same minute share one file | Not hit: 9 copies of 9 different forms. "Generate a new copy" twice within a minute on one form would hit it |
| QA-165 | **On** (forms filled), **seen live** | IMM 5257 leaves IRCC-mandatory boxes empty | Each of the 3 people's IMM 5257 copy reads "**8 mandatory form fields left empty**" after every answer was given and confirmed (`walk/49`) |
| QA-318 | **On** (forms filled), retest | IMM 5257 SCH1 leaves 5 mandatory boxes empty | **Not seen tonight:** both adults' SCH1 copies read "Facts confirmed" with no mandatory-empty line (release 3 of Visitor visa, SCH1 as PDF upload). Retest on its own steps before row 10 counts it |
| QA-315 | **On**, at the journey's edge | The IMM 5257 filing check does not run to the end | "Forms filled" was reached without it; it bites only if "forms filled" includes the validated copy uploaded back. Plan keeps it on; agreed |
| QA-355 | **On**, conditional | Adding a form to a case turns correct answers on the other forms into "to fix" | Not reached: the walk added no form; every filing on the case page offers "Add a form to …'s filing", so a walker can meet it |
| QA-162 | **On** (set-up), retest only | C4.11 readings left out; "closes when the stack lands" | Not re-walked (needs Draft questions and documents on a fresh set-up) |
| QA-383 | **Off** | IMM 5710, inside-Canada worker (With an LMIA): neither the Visitor visa journey nor E4's Study permit | none |
| QA-278 | **Off** | 48 case opens at once: load, not a person's walk | none |
| QA-201 | **Off** | CI type-check tooling | none |
| QA-181 | **Off** (qa tooling), **seen again tonight** | qa's fresh clone builds from a stale lane branch | `lane.sh bind qa` checked out the unmerged `claude/qa-2026-11-09-c75`, `lane.sh setup` built `web/dist` from it, and `git merge origin/main` stopped ("stash failed"). `isolated.sh`'s web-fresh guard rebuilt before serving, so the walk ran on main's screens. Row updated |

**Correction to the plan:** none in the set. In weight, 1 of the 10 is seen live (QA-165), 1 is probably closed already (QA-234), 1 was not reproduced (QA-318), and 4 bite only when the walker takes a specific action (QA-237/239 conditions, QA-276 section move, QA-355 add a form).

## 2. Baseline counts (the walk, 1440 px)

### 2.1 Logins typed after the first: **0**, because the product has no sign-in
There is no typed login anywhere: people are picked from "Acting as" (Studio header: 3 people; case-area header: 6). I read the plan's "login" as **a change of person**. The journey needs **5 person changes after the first** (Configuration author): 3 by the header select, 2 by in-page links.

| # | Hand-off | How the walker got there | Hand-off button? |
|---|---|---|---|
| 1 | Author **submits** → Content reviewer signs | Header select (the page names the step "The immigration expert signs the content", a name not in the people list) | No |
| 2 | Content reviewer **signs** → Approver releases | Header select (the pathway's Review and release names "Approver" in step 3; the shared Release page says "Switch to the Approver (simulated)") | No |
| 3 | Released pathway → firm opens a case | **Demo menu › Open the case area** (sets the Case officer) | No (Demo menu only, see 2.2) |
| 4 | Case → Client A answers | Link "Open it as Client A (simulated)" on the case page | **Yes** |
| 5 | Client done → Representative reviews | Case-area header select; then the notice's link "the case page"; then "Open the review" | No |

Walk A (set-up from the six) needed the same three Studio people: author, then Content reviewer ("Choose the checklist page" is theirs), then Approver (each new shared field).

### 2.2 Dead ends (a screen with no way back, or no way to the next step for anyone): **2 at 1440 px, 3 at 400 px**
1. **Combination › "Next step · Choose the checklist page"**: the button only highlights a read-only line on Forms; nobody can choose a page (`web/src/components/before-forms.tsx:2`, "read only until … F2"). It is the pathway's one next step, on the six and after release. Already **QA-240** (Minor; it does not block release). `walk/10`, `walk/14`.
2. **Released pathway → open a case**: nothing in the Studio leads to the case area except the Demo menu (`web/src/App.tsx:231`). The released pathway's page and the Release page have no "open a case on this release".
3. *(400 px only)* Case area → Studio: the "Product Studio" link is `hidden md:inline` (`web/src/runtime/cases.tsx:73`), so below 768 px there is no way back to the Studio.

Not dead ends: every Studio screen keeps the menu and breadcrumbs; the case page keeps "Cases ›"; the representative's review has "Back to the case"; a staff person landing on the client questionnaire gets a notice with a link to the case page (`walk/42`); the client's "Every part is answered" is a true end for the client. Sideways scroll: **0** on the case page, the representative's review, the client questionnaire, a pathway's Review and release, and Programs, at 400, 1024 and 1440 px.

### 2.3 Fold-out sections with no visible arrow: **9 in 6 files** (code), **10 places on the journey's screens** (screen)
* **Code search** (`<details>`/`<summary>` in `web/src`): **32 `<details>` in 22 files; 31 `<summary>`** (one `<details>` takes its summary through `components/details.tsx`). That is P-447's "31 expanders in 22 files", confirmed. But **22 of the 31 keep the browser's ▸ arrow** (the summary stays `display: list-item`). **9 lose it** (their class makes the summary `flex` or `inline`, with no icon): `runtime/forms.tsx:200, 207, 228`, `runtime/readiness-figure.tsx:36`, `runtime/readiness.tsx:184`, `runtime/representative-review.tsx:196`, `runtime/review.tsx:184, 186`, `runtime/sign-steps.tsx:202`. All 9 are in the case area.
* **By screen** (computed style in the running app, `scripts/foldall.js`): Studio journey screens (Programs, a pathway's Forms, Smart questionnaire, Preview, Tests, Review and release; To review; the shared Release page): **0 without an arrow** (5 summaries, each with ▸). Case page: **9 of 22 without**: "Marked mandatory on IRCC's form, still empty (8)" ×3, "and 1 more" ×3, "How this is worked out" ×3. Representative's review: "Details" ×1. `walk/49`, `walk/52`.
* Custom toggles (`aria-expanded`, 20 in 12 files): most carry a chevron or are actions or comboboxes; 2 fold-outs show words with no arrow (`components/answer-keys.tsx:61` "Lines", `pages/configuration.tsx:173`).
* **So:** the plan's "31 fold-outs without an arrow" counts every expander. BK-2's size depends on the bar: "a visible arrow" means **11 places in 8 files**; "one consistent chevron everywhere" means **31 + 2**. Question 2 below.

### 2.4 Each journey screen (screenshots in `qa/reports/2026-11-11-bake-baseline/walk/`)
Set-up from the six (Walk A, :4470): `03` Load sample done (25 s; 6 pathways, 44 files, 670 AI proposals) · `04` Programs · `05` Visitor visa, Forms tab · `06` IMM 5257's AI field map (84 new definitions) · `09` applied, with 14 undecided form fields and "Ask as its own question" · `10` the pathway after one form (Forms 115 to do, Smart questionnaire 231 to do, Review and release 239 to fix) · `11`/`14` the next step as the Content reviewer · `15` To review as the Approver (103 waiting) · `16` one new shared field to approve.
Release (Walk B, :4471, configured checkpoint, 114 s): `23` shared Release page, its button disabled for the author with the reason · `26` the pathway's Review and release (3 steps named) · `27` submitted · `28` signed by the Content reviewer · `29` approved and released (Release 7).
Case: `30` Cases · `31` Open a case · `33` BAKE-FAM-1 opened · `35` spouse and child added (413 questions) · `36`/`37` Client A, part 1 of 59 · `41` 65 of 65 parts done · `42` the Representative lands on the questionnaire · `46` 0 to confirm · `49` 9 copies generated · `50` Send 3 filings for review · `52` the representative's review · `54` all 3 filings approved · `55` back on the case, Ready to file still "Not ready" (past the journey's end).
Timings seen: most steps 1-4 s in the visible browser (including a 0.6 s settle); Generate a copy ~2.3 s each; Save and continue on a long part up to ~4 s.

### 2.5 What a person meets setting a pathway up from the six (Walk A)
Visitor visa after Load sample: 7 forms, 184 AI field proposals to decide one by one (IMM 5257 alone: **84 "Create … as a new definition" clicks**, no bulk action for new definitions; only exact reuse has "Accept High exact reuse"), then 14 form fields to decide per form, 6 "conditions in words only" to turn into rules, Smart questionnaire **231 to do**, Review and release **239 to fix**, and the Approver opens **each new shared field on its own page** (Approve returns to the list each time; 103 items waiting after one form). The walk did IMM 5257's 84 decisions and Apply, then one second-person approval, and stopped there. **A person cannot do this inside a walk**, so E1's "set up and release a pathway" needs a stated starting point (Question 1). The release half was walked instead from the configured checkpoint, with one real change (a section moved), through submit, sign and release.

## 3. What the Bake plan's Track 1 rows miss (suggested rows; no new Majors)
1. **E1's starting point** *(Needed for the proof · Scaffolding)*: write in E1 where "set up" starts. The plan's own start-page door "Six pathways set up" does not let one person set up and release in a walk (§2.5). Proposal: E1 starts from the checkpoint with one pathway left unreleased, or with a named small change (as tonight). Founder's call via the Lead.
2. **BK-4 hand-offs: add two** *(Needed for the proof · Capability, within BK-4)*: the walk has 4 places where work changes hands without a button. BK-4 names "send for approval", "send to the client" and "send for representative review". It misses **Content reviewer signs → Approver** (release is two people after the author, not one) and **client done → back to the firm** (#5 in §2.1).
3. **BK-3 frame: add "open a case on this release"** *(Needed for the proof · Capability, within BK-3)*: dead end 2. Today the only path from a released pathway to its cases is the Demo menu. Also keep the case area's way back to the Studio at 400 px (dead end 3).
4. **BK-2 scope** *(Needed · Capability)*: 11 places in 8 files if the bar is "a visible arrow"; 33 if it is one consistent chevron (§2.3).
5. **Retest QA-234 and QA-318 before rows 8 and 10 start** *(Needed · qa, 0 builder sessions)*: QA-234 looks fixed on main (own-question action on the field-map page); QA-318 did not reproduce on tonight's case. Either could free a builder session.
6. **One name for the expert** *(Later · wording, fits BK-4's role picker)*: screens say "the immigration expert" (next step, release steps) where the people list says "Content reviewer". A fresh reader needs help to know they are the same person.
7. **Observations, not logged (thin evidence):** the pathway's own Approve and release left the 72 approved library changes in the draft (the shared Release page still offered "Release 72 library changes as Release 7"); the Smart questionnaire tab read "1 to do" while its "Needs you" filter read 0; the representative landing on the questionnaire is told "As the case officer, …". Worth a look in BK-6's walk.

**New Minor rows logged in `qa/BUGS.md`** (all on the client-answers step, all UX · Minor): **QA-387** a wrong UCI is kept and cannot be cleared by the client · **QA-388** the questionnaire's "Part n of N" total jumps (59, 58, 66, 72, 65) while answering · **QA-389** "No" to a Yes/No that opens a list still asks to "add them, or say none apply" · **QA-390** every case-area page, the client's included, names the browser tab "Product Studio".

## 4. Not done, and why
* The headless replay at 400/1024 px, twice, and axe: not run for this baseline row. Only the sideways-scroll and way-back checks above ran at 3 widths.
* Set-up and release of a pathway from the six by one person: not completed (§2.5); release was walked from the checkpoint.
* The read-only walk on the shared demo (:4400): it was not running in this cloud copy.
* Replayable checks in `prototype/studio/tests/qa/` for QA-387 to QA-390: not added, to keep this PR records-only as the row asks; the walk's own scripts are in the evidence folder. The owning lane or the next qa round adds them.
* Simulated people only; the co-founder's cold walk (E2) and D17/D20 stay with the founder.

## 5. Questions for the tech lead
1. **E1's starting point:** from the checkpoint with one pathway unreleased, or a named change on a released one? From the six, it cannot be walked (§2.5). *Recommend the first: it exercises set-up screens as well as release.*
2. **BK-2's bar:** does the browser's own ▸ count as "a visible arrow"? *Recommend yes, and fix the 11 places (one session or less), unless the founder wants one chevron style everywhere.*
3. **"Login" = a change of person:** I counted 5 (§2.1). Is that the measure E1 will use?
