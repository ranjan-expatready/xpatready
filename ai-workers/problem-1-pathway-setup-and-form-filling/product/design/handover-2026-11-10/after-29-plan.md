# After the 29: a challenged plan for the milestone before M4

Written 10 Nov 2026 by the hand-over analyst session, at the tech lead's request for the founder (first version committed 11:57 IST, commit `aad12a486` on this branch). It is advice, not a decision. The tech lead reads it, agrees or disagrees, and takes the open points to the founder one at a time.

**Revised 10 Nov 2026, about 12:15 IST, after the founder's clarification of 11:5x IST**, as the tech lead passed it on: one sign-in where the user picks a role, yes; "one form", no ("I want full form, full capability working which can be used internally", "it should not be just that one form, one combination is working"); production- and compliance-grade, "best in class"; no real sign-up ("I'm not going to plan to sell this"), but it should "feel like a product"; maybe fix today's demo navigation ("load 6, 7", "a lot of roles").

What changed in this revision: section 1 (the recommendation), section 3 position 4, section 4 (name, exit, size, order), section 5 (three risks added), section 6 (points 4 and 5 rewritten, 8 and 9 added), section 7 (questions 1 and 14 rewritten, 16 to 18 added), section 8 (more not checked). **Sections 9, 10 and 11 are new:** the sign-in and role model, what replaces the Demo menu's load and reset buttons, and the gap list from the 29 to "every rule and form working, production grade". My first version answered "the Visitor visa only" for the bake. The founder has ruled that out, so that answer is withdrawn and the plan is re-sized honestly instead.

* **Evidence baseline:** `main` at `66e74115e` (10 Nov 2026, 10:06 IST) for every count from the code, tests and records in sections 1 to 8. Sections 9 to 11 and the capability counts were read on `main` at `b0b23a807` (10 Nov 2026, 12:02 IST), where **25 of the 29 are Works**. The team's requirements are the name-free copy of the 2 Nov snapshot (`domain/requirements-2026-11-02/`). The founder's words are as the tech lead recorded them in `STATE.md` at 11:4x and 11:5x IST.
* **Estimates are mine**, in builder-sessions. One builder-session here means one builder taking one small item to a merged change, with its review. They are sizes, not dates.
* All immigration content is **Sample**. Legal points are "Unconfirmed: no counsel".
* No app code was changed for this note.

## 1. The one recommendation

**"Every form and rule working, production- and compliance-grade" is not a bake. It is three jobs with three different owners: make it one product (builders, small), make every pathway run by set-up alone (builders, large), and make the content true (the immigration expert, no tokens). Start all three now and book the expert first, because by the founder's own rule (P-240) nothing Sample can be released outside the demo workspace, so "usable internally" waits on the expert, not on builders.**

Define "baked" as two tests a person can pass, not as a list of screens to tidy:

1. **The walk.** One person opens the product once, signs in by picking a role, and walks the whole journey (set up a pathway, release it, run a family case, client answers, representative reviews, forms filled and checked) without a dead end and without help, changing role only through a hand-off button. The co-founder walks it a second time, cold.
2. **The zero-code test.** A content publisher sets up a pathway the builders have not run, through the screens only, and a case on it reaches filled, checked forms with no engineer touching the repository. Today the same thing needs 5 to 8 repository edits (hand-over page, the Study permit acid test). This is the only honest meaning of "not just one combination working": the sixth pathway must cost a publisher's afternoon, not a builder's week.

Inside the first job, my earlier advice stands: **fix the three shared parts first (one frame around every screen, one person picker, one expander), and only then touch single screens.** Everything in this plan is ordered by what the two tests need.

Why this and not "polish every screen": the founder's complaints are true, and I checked each in the code (section 2). But most of them come from three shared parts, not from forty separate screens. Three small structural fixes remove more of the pain than forty screen-by-screen changes, break fewer tests, and cost a fraction of the tokens.

## 2. What the founder said, and what the code says

| The founder's words | True? | Evidence | What actually fixes it |
|---|---|---|---|
| "If I go to the case run view area, I can't come back to the client" | **Yes** | The app is two separate frames. `web/src/App.tsx` sends `/cases/*` to one frame (`RuntimeApp`) and everything else to another (`Shell`). The only way back from a case is a "Product Studio" link in the case header that is hidden on narrower windows (`hidden … md:inline`, `runtime/cases.tsx`) and silently changes who you are acting as. From the Studio, the case area is reachable only through the Demo menu ("Open the case area (runtime preview)", `App.tsx:231`). There is **no client page at all**: the routes are case list, case, questions, eligibility, review, representative review, sheet. A client exists only inside a case. | One frame for both areas, with a visible path line (where am I, one click back), and a link both ways between a case and its client. |
| "I have to change the logins above" | **Yes** | Two different switchers: "Acting as" in the Studio (`App.tsx:167`) and a second "Acting as (simulated)" in the case area. Entering the case area changes you to the Case officer without asking (`cases.tsx:55`). A case person who opens a Studio page gets a stop notice, "This page is for the configuration people" (`App.tsx:107`). By my count the full journey needs **five manual switches across six people**. | One picker, the same everywhere, plus a hand-off button at each point where the job changes ("Continue as Approver"). |
| "Have we created too many roles?" | **No, but it looks that way** | There are 9 simulated people (`api/src/core.ts:40-54`) and about 4 real jobs: content publisher, case officer, representative, client. The other five exist to prove safety rules: a second person must approve, two representatives must not see each other's work, a solo firm works, Client A cannot see Client B. | Show 4 jobs. Keep the 9 people underneath. See section 3, position 1c, and the full role model in section 9. |
| "A lot of text on screen" | **Yes** | In 118 screen source files: 271 notices, 508 hover tips, 220 status pills, 70 dialogs. One page ("To review") holds 20 notices. Even the dialog that loads the sample carries four bullet points and a paragraph. | A shared pattern that keeps one line and folds the rest; a counted limit per screen; a rule that stops it growing back. Section 3, position 2. |
| "Expand button doesn't show the expand icons" | **Yes, everywhere** | 31 expanders in 22 files. **None** has an arrow icon. Seven of them also switch off the browser's own small triangle, so nothing at all shows that they open. There is no shared expander part; each screen wrote its own. | One shared expander with a visible arrow, used by all 31. One or two changes. |
| "This product is not usable, there's too many fields" (the co-founder) | **Unclear which screen; the volume is real** | The Visitor visa release has 394 questions; the sample household shows 504; a family of four gives 292 answers. But the client screen already shows one part at a time with a progress bar and "Save and continue" (`runtime/questionnaire.tsx`), and the reviews score "low load" as Met on it. So the layout is not the cause. The number of questions is. | Not polish. Fewer questions to type: answers read from documents (C6.5, still Partial in the 29) and answers carried between family members. First, find out which screen the co-founder meant (section 6, point 7). |
| "A lot of over-engineered stuff" | **Partly** | On screen: a Demo menu of 7 items with long conditional labels, admin "Details" drawers, the simulated people. But much of what looks heavy is the safety the founder also asks for: second-person approval, a source for every number, a reason for every result. | Fold it, do not remove it. Cut the Demo menu to three doors and a reset. |
| Layouts and panes do not show "how strong this product is" | **Yes** | The strongest facts (one fact fills 43 boxes on 15 forms; 292 answers fill 562 boxes on 24 forms; 562 of 562 read back equal) appear nowhere in the app. They are only on the hand-over page. | Show the proof where it happens: one line on the case's forms pane and one on a library fact. That is the "wow", and it is true. |

## 3. The tech lead's four positions

### Position 1. A "Bake" milestone between M3 and M4: **keep, but change what it is**

**Agree:** a milestone with no new capabilities, before M4.

**Change 1: exit by the walk in section 1, not by a list.** A list of screens to polish never ends. A walk passes or fails.

**Change 2: Major findings before Minor polish.** The open list in `qa/BUGS.md` has 162 findings: **8 Bug Major and 7 Gap Major**, and 98 UX Minor. The tech lead's list names the UX Minors and not the Majors. At least ten of the fifteen Majors name a capability on the journey (for example QA-234, QA-237, QA-239 on step 5 of set-up; QA-318 and QA-361 on form filling; QA-275, QA-276, QA-278, already tagged for the hardening pass). A product with fifteen open Majors is not "completely baked", whatever the screens look like.

**Change 3: do not fix "the open UX Minors". Sort them.** 98 is too many to fix and most are off the journey. One read-only pass sorts each into: on the journey (fix inside that screen's change), duplicate (close), off the journey (park with a reason).

**1a. Navigation and flows: keep. This is the most valuable part.** One frame, a path line, back paths, case to client and client to case. A client page does not exist today, so "back to the client" needs a small new page: the client's name, their cases, their people. That is a screen, not a capability.

**1b. Screen-polish pass: change.** See position 2.

**1c. "Fewer roles": knock down. Fewer choices on screen, the same people underneath.** Deleting people would delete the proof of second-person approval and of privacy between clients and between representatives. It is also unnecessary: only **1** test file uses the on-screen switcher, while **345** set the person behind the scenes. So the picker can be redesigned freely with almost no test risk, and the people can stay. The picker shows four jobs; "more people" (the second approver, the second representative, the solo firm, Client B) sits one click down for the checks that need them.

**1d. The open UX Minors: change**, as above.

**Add: the rest of the hardening pass (B112, P-358).** It was promised for after M3. "Baked" without it is a claim I would not sign.

### Position 2. A `screen-polish` skill: **change. Do not write a second rulebook; run it third, not first**

The rulebook already exists. `EXPERIENCE.md` section 6 has a twenty-point best-in-class scorecard (BIC-01 to BIC-20, P-407, 7 Nov), and the `screen-review` skill scores it. It is used: 33 screen items carry scores, 124 Met, 76 Partly, 8 Not met, 73 not applicable.

So why is the founder still unhappy? Three reasons, and a new skill fixes none of them by itself:

1. **The scorecard covers case screens only.** The Studio screens of M1 and M2 were built before 7 Nov and have never been scored.
2. **It scores one change at a time, by the same factory that built it.** The client question screen scores "low load: Met" and the co-founder calls the product unusable. Both are honest. The score looks at one screen; the co-founder met the whole journey.
3. **Nothing is counted.** "Nothing extra" is a principle in the rulebook, but no check counts words or notices, so every finding gets closed by adding a sentence. That is how 271 notices arrived. Unless that is stopped, the text grows back after the bake.

What to do instead:

* **First, shared parts** (section 4, step 1). They fix all 31 expanders, both switchers and the frame in a handful of changes.
* **Then a short skill, `screen-polish`, that points at `EXPERIENCE.md` section 6 instead of restating it**, and adds only what is missing:
  * **Counted limits per screen, measured by a script on the running demo, not judged by a reviewer:** words visible before anything is opened; notices visible before anything is opened (suggest at most 1); primary buttons per panel (1); inputs per client page (5, already BIC-19); expanders without an arrow (0).
  * **A fixed order of work on a screen:** layout and folding first, wording last.
  * **Hard rules:** one screen per change; screen files only; a label that a test looks for is not changed in a polish change (see position 3); before and after pictures at 1440, 1024 and 390 wide; the score before and after.
* **Scope: the journey's screens only**, about 14 to 16 by my count of the routes (the tech lead should fix the list). Not every screen. "All screens one by one" is the over-engineering the founder is complaining about, applied to polish.
* **The skill file itself is the tech lead's to add** (this session cannot write skills, and was told to change no code).

### Position 3. A UI-only fast lane: **change. The graph already exists; the saving is smaller than hoped and sits elsewhere**

* **The graph is built.** `product/tools/select-suites.mjs` (B121, P-376) already follows imports from each changed file to the tests that cover it. Checks on a proposed change already use it.
* **The real cost is one rule:** in that tool's own words, "the queue still runs every suite". A screen change is selected narrowly, then waits behind a full run. Changing that rule is the saving. It is also the safety net for the 29, so it is not free (see risks).
* **The most valuable bake changes will not qualify.** Any file the frame uses selects every browser test (175 suites). The frame, the picker and the shared expander are exactly those files.
* **"CSS and copy" is not one safe kind. Wording is wired into the tests:** 1,974 places in the tests find things by their visible text and 1,926 by role and name. Change a button's label and tests fail, correctly. Folding a line behind an expander can fail a test that looks for that line. So the safe kind is **style only** (spacing, colour, size, icons). Anything that changes what is visible before a click is ordinary code.
* **There is no picture comparison today** (0 uses). Playwright, already in the stack, has one built in, so no new tool is needed (STANDARDS section 1 gate not triggered). But the reference pictures must be made on the CI machine, kept current by someone, and start small: the journey screens at two widths, about 30 pictures.
* **CI minutes are not tokens.** The token cost of forty small screen changes is the review and break agents on each one (the cause found on 2 Nov). The token saving is: a style-only change gets one reviewer on a cheap model with the before and after pictures, and no breaker.
* **It is a workflow change inside the process freeze** (RULES, P-312: no change until 10 Nov 22:30 IST except on a measured number and the founder's word). So measure first: from the factory board, how long did the last 20 screen-only changes wait, and on what? If the wait is the queue's full run, change that rule for style-only changes. If the wait is review, a CI lane changes nothing.

### Position 4. "Productise" lightly: **keep, but the founder's answer at 11:5x is three different things; only one is light** (revised after the clarification)

1. **One sign-in, pick a role: keep; the founder agrees.** A simulated sign-in page, not real sign-in (real users are the team's, P-357, P-335). The role model, with the evidence from the team's requirements and from the app, is section 9.
2. **A guided path: keep, and do not build a second one.** "The finished story" (C10.2) is already one of the 29. After it lands, add a start page and retire the Demo menu. This answers the founder's "maybe fix today's demo navigation instead": yes, and it is the cheapest high-value item in this plan. What replaces each of the seven menu items, in the demo and for internal use, is section 10.
3. **"Every form and capability working, production- and compliance-grade": the founder has now said this is the goal, not "one form". It is not light and it is not a bake.** It is three separate jobs (the full gap list is section 11):
   * **Every form.** One pathway (Visitor visa, 7 forms) runs a full case. The others are configured, but fees, checklists and linked applications on them still need code (hand-over page, "Not yet proven"). Making every pathway run is what the hand-over called M4 Track A, estimated there at 10 to 20 working days. In my first version I said "bake M1 to M3 before M4" and "every form working" pull in opposite directions and asked the founder to choose. He has chosen: every form. So that work moves inside this milestone, and M4 is left with the Chrome extension only.
   * **Production-grade.** The hardening pass (B112) is in this plan. The scale items (the hand-over scored Scalable 5 of 10) were M4's; with "production grade" as the stated goal they move in too, except real sign-in, tenants and hosting, which stay the team's (P-357).
   * **Compliance-grade.** No builder can deliver this. All content is Sample, no answer key is signed, and the hand-over page records that Adobe's own check has not passed on a complete form filled by the app (C7.2). It needs the immigration expert (the hand-over estimated 3 to 5 expert days for the Visitor visa) and counsel. It costs no tokens. If it is not booked, the words "compliance-grade" cannot be used honestly at the end of the milestone, and the internal workspace will have nothing it is allowed to release (section 10).

## 4. The milestone as I would run it

**Name:** Bake (M3.5). **Rule:** no new kinds of capability; what exists is made general, true and usable (revised: the first version said "no new capabilities", which "every form" cannot honour, because the general mechanisms are new code). **Exit:** both tests in section 1. The walk passes twice (qa's fresh reader, then the co-founder) with no open Major finding; the zero-code test passes on a pathway the builders have not run.

**Measures at the exit** (each counted by a script or a person watching, not self-reported):

| Measure | Today | Target |
|---|---|---|
| Pathways that run a full case, of the six agreed sample combinations (`samples/wave1.json`) | 1 (Visitor visa) | 6, or the number the founder sets (section 7, question 1) |
| Repository edits by an engineer to run a case on a new pathway | 5 to 8 (hand-over page) | 0 |
| Mapped forms with a fill trial recorded on the app's own field map | 0 of 19 (six forms have a trial, all on earlier values, section 11) | all that a released pathway uses |
| Pathways with an answer key signed by the immigration expert | 0 | every pathway released in the internal workspace |
| Open Major findings, all | 15 | 0 |
| Logins typed or switched by hand on the journey | 5 (my count) | 0 (hand-off buttons only) |
| Dead ends (a screen with no way back or onward) | at least 2 (case area on a narrow window; a case person on a Studio page) | 0 |
| Expanders with a visible arrow | 0 of 31 | 31 of 31 |
| Open Major findings on the journey | about 10 of 15 (to confirm in step 0) | 0 |
| Notices visible before anything is opened, per journey screen | not measured | at most 1 |
| The co-founder finishes the journey without help | not tried | yes |

**The order, and the effort (builder-sessions, my estimates):**

| Step | What | Sessions | Risk to the 29 |
|---|---|---|---|
| 0 | **Measure and sort, while the last of the 29 land.** The founder watches the co-founder use the demo for 30 minutes and notes where they stop (no builder). One read-only pass sorts the 15 Majors and 98 UX Minors against the journey. One script run records the counts above and a picture of each journey screen. Book the immigration expert. | 2 (read-only, cheap model) | None |
| 1a | One shared expander with an arrow, swapped into all 31 places. | 1 | Low: the text stays, only the marker changes |
| 1b | One frame for Studio and case area: path line, back paths, a small client page, links both ways between case and client. | 3 to 4 | **Highest in the plan:** frame files select every browser test. One change at a time, full run on each |
| 1c | One person picker (4 jobs, the rest one click down) and hand-off buttons where the job changes. | 2 to 3 | Low: 345 test files set the person behind the scenes; 1 uses the on-screen switcher |
| 1d | Start page with three doors; Demo menu cut to those and a reset. | 1 to 2 | Low to medium: tests that open the Demo menu by its labels |
| 2 | The Major findings on the journey. | 6 to 10 (firm after step 0) | Medium: these are engine and rule fixes with their own tests |
| 3 | **Walk it again.** qa's fresh reader, then the co-founder. | 1 to 2 | None |
| | **Lean bake, total** | **16 to 24** | |
| 4 | The rest of the hardening pass (B112): dependency warnings, a linter and formatter in CI, the largest files split. | 4 to 6 | Medium: wide, mechanical changes |
| 5 | `screen-polish` on the journey's 14 to 16 screens, layout and folding only, one screen per change, with each screen's on-journey UX Minors folded in. | 14 to 16 | Medium: folding can hide text a test looks for |
| 6 | Wording cuts, last, each with its test changes. | 4 to 6 | **High per change:** about 2,000 text look-ups in the tests |
| 7 | Proof on screen: "292 answers filled 562 boxes on 24 forms, 562 of 562 read back equal" on the case; "fills 43 boxes on 15 forms" on a fact. Only if the numbers are already available to the screen. | 2 | Low |
| 8 | Style-only fast lane and reference pictures, only if step 0's measurement shows the queue is the wait. | 2 to 3 | **High if done carelessly:** it narrows the safety net |
| | **Full bake, total (first version)** | **42 to 57** | |

**What the clarification adds to this table** (the rows above stay; these are extra, sizes mine and loosely held until each has a design):

| Step | What | Sessions | Risk to the 29 |
|---|---|---|---|
| 1c+ | The sign-in page and a home for each role (section 9), on top of the picker in 1c. | +1 | Low |
| 1d+ | The start page's three starting points and the small "Sample data" page (section 10), on top of 1d. | +1 | Low to medium |
| 1e | The internal workspace made walkable: its name on the sign-in page and header, no demo controls shown, "copy the client's link" where email is not built, a walk of it by qa (section 10). | 2 | Low: the demo workspace is untouched |
| 2+ | The Major findings that are off the journey (all 15 closed, not about 10). | +3 to 5 | Medium |
| 9 | **Every pathway by set-up alone:** the five general mechanisms, the seven rule tables moved from files into library screens and the release, the Visitor-visa-only guards deleted, the family shape and the representative form made configuration (hand-over page, "The lift plan": two Large, three Medium, one Small). | 22 to 37 | **High:** this is engine work under every capability that works today |
| 10 | Each further pathway taken to a full case with filled forms, through the screens. If a pathway needs code, stop and fix the mechanism, never the pathway. | 3 to 5 each; 15 to 25 for five | Medium |
| 11 | Fill trials on the app's own field maps for every form a released pathway uses, with Adobe's own check by a person (C7.2, P-65). | 6 to 10, plus a person's 15 to 30 minutes a form | Low |
| 12 | Production running: a durable job queue and proper storage for filled PDFs, the release snapshot cache and missing indexes, a measured run at 1,000 cases and 5,000 boxes, backup and restore of the internal workspace. | 8 to 14 | Medium |
| 13 | The zero-code test, taken by a content publisher on a pathway the builders have not run. | 1 | None |
| | **Added by "every form, production grade"** | **59 to 96** | |
| | **Whole milestone without the optional polish (steps 0 to 4 and 9 to 13, with the additions)** | **79 to 126, say 80 to 125** | |
| | **Whole milestone with the polish (steps 5 to 8 too)** | **101 to 153, say 100 to 150** | |

Not in any builder total: the immigration expert's days and counsel (section 11, group D), and the optional "bring the shared library in as drafts" for the internal workspace (section 10, 3 to 5 sessions).

**My recommendation on size and order (revised).** The founder's goal is three to five times the lean bake. That is not a reason to refuse it; it is a reason to run it in three stages, each ending in a test a person takes, so that money stops when a test says stop:

1. **Stage 1, one product (steps 0 to 3 with 1c+, 1d+, 1e): about 20 to 28 sessions.** Ends with the walk. This is the old lean bake plus the sign-in and the internal workspace. It is the same work whatever comes after, and it makes everything after it visible.
2. **Stage 2, the second and third pathway by set-up alone (step 9, then two of step 10, then step 13): about 29 to 48 sessions.** Second: the work permit with an LMIA, because it is the cheapest (it already has a reviewed release, `p3/releases/c1-v3`, and fee rows in the fee table). Third: spouse sponsorship, because it is the hardest shape (a sponsor and an applicant, not a principal and family) and so proves the fixed family shape is gone. Ends with the zero-code test on a fourth. All pathway content stays Sample until the expert confirms it.
3. **Stage 3, the rest (the three remaining pathways, the off-journey Majors, trials, hardening, production running; steps 2+, 4, 10, 11, 12): about 30 to 50 sessions.** Only after stage 2's test passes; if it fails, more pathways would be hand-built, which is "one combination working" five times over.

**Running through all three: the immigration expert, from today.** Polish (steps 5 to 8) is still decided by the second walk, as before: if the co-founder gets through and the remaining complaint is "still wordy", steps 5 and 6 are worth their 18 to 22 sessions. If the complaint is still "too many fields", no amount of polish helps and the money belongs in reading documents and carrying answers.

## 5. Risks, stated plainly

| Risk | Why it is real | Guard |
|---|---|---|
| **Breaking the 29** | The frame touches every browser test. Wording is matched in about 2,000 places. Folding hides text. | Structure before wording. One screen per change. Full test run stays for frame, wording and anything visible before a click. Nightly full run on `main` stays; a red night stops the bake until fixed. |
| **Rework** | M4 Track A moves seven rule tables onto library screens, so some Studio screens will change again. The team may rebuild screens in its own components. | Polish only the journey's screens. Put the effort into shared parts and rules, which survive either way. Ask the team which screens they will keep (section 7, question 8). |
| **A bake with no end** | "Tidy" has no finish line. | The walk is the exit. A cap on sessions, set by the founder. |
| **The scorecard marking its own work** | Scores of "Met" sit beside a co-founder who could not use it. | Counted limits from a script. The cold walk by a person outside the factory. |
| **Token burn on many small changes** | A reviewer and a breaker on every small change was one of the causes of the 2 Nov burn (26% of the week in five hours; `design/token-efficiency-2026-11-02.md`). Forty screen changes would repeat it. | Style-only changes: one cheap reviewer with pictures, no breaker. Shared parts first, so there are fewer changes. |
| **The text grows back** | Every finding is closed by adding a sentence. | The counted limit becomes part of every screen review after the bake. |
| **Calling it compliance-grade** | It is Sample until the immigration expert and counsel say otherwise. | Book the expert in step 0. Keep the Sample labels until then. |
| **Hand-built pathways** (added) | The quickest way to show six pathways is six sets of special cases, as the Visitor visa has today (`engine/filing-modes.ts`, the fee table, the form set-up table). | The zero-code test. A rule for builders: if a pathway needs code, the change goes into the mechanism and is proved on two pathways. |
| **The expert is the critical path and is not booked** (added) | P-240: a Sample value never publishes outside the demo workspace. So the internal workspace can release nothing until sources are entered and answer keys are signed. Builders cannot shorten this. | Book the expert in step 0, pathway by pathway in the stage order. Until then the internal workspace is for trying the flow, and the demo workspace carries the content. |
| **Real personal data on a simulated sign-in** (added) | No password, no backup, no access record, one machine. | Sample and the team's own test cases only (section 6, point 8), said in words on the sign-in page. |

## 6. Where I disagree with the founder

1. **"Fewer roles."** No. Fewer on screen, the same underneath. Removing them removes the evidence that the product is safe.
2. **"A skill that tidies all these screens one by one."** Not all, and not first. Three shared parts first; then 14 to 16 screens; the rulebook already exists and needs counting, not rewriting.
3. **"A graph so screen changes merge without the backend tests."** The graph exists. The wording on the screens is tied to the tests on purpose. The honest saving is a narrower run for style-only changes and a cheaper review, and it should be measured before it is built.
4. **"Production- and compliance-grade" with "I don't want to put too much effort".** These cannot both hold. The clarification settles which one gives way: the effort. By my sizing the goal is about 80 to 125 builder-sessions, not 16 to 24, plus the expert's and counsel's time, which no builder can replace. I would rather the founder hear that number now than discover it at session 40.
5. **"No M4 until M1 to M3 are completely baked."** Right for the Chrome extension. But "every form" is what the hand-over called M4 Track A, so most of M4 has just moved in front of the line. That is a sound order (general before wide), as long as nobody still calls it a short bake.
6. **"Wow factor."** The wow here is not animation. It is the product showing its own proof at the moment it happens. Two true lines on two screens will do more than any amount of decoration.
7. **One sentence from the co-founder is being turned into a milestone.** "Too many fields" could mean the client's questions or the publisher's set-up. Thirty minutes of watching them use it is the cheapest research available and should come before any builder starts.
8. **"Used internally" on a sign-in with no password (added).** Fine for the team's own sample and test cases. Not fine for a real client's passport, family and history: this build has no password, no backup, no record of who opened which client's file, and it runs on one Mac (hand-over page: "Not in this build: uptime checks, alerts, backups, access logs"). So "feel like a product" must not slide into "use it as one" with real personal data before the team's platform carries it. Unconfirmed: no counsel.
9. **"Every form working" can be reached the wrong way (added).** The fast way is to hand-build each remaining pathway with its own guard and its own table, as the Visitor visa was. That would pass a demo and fail the founder's actual sentence, "it should not be just that … one combination is working", five more times. The slow way, general mechanisms first and the zero-code test as the judge, is the only one worth paying for.

## 7. Questions the founder should be asking

Each with why it matters and, where the evidence gives one, my answer.

1. **Does "every form" mean the Visitor visa's 7 forms, or every pathway?** *Answered by the founder at 11:5x IST: every pathway ("not just that one form, one combination"). My first answer, the Visitor visa only, is withdrawn.* What is still open: **which pathways, in what order, and how many before the milestone may be called done?** *My answer: all six agreed combinations is the goal; the work permit with an LMIA second, spouse sponsorship third, then a zero-code test on the fourth; the milestone is done when that test passes and every released pathway has its trials, not when a count is reached.*
2. **What is the test that says "baked", and who takes it?** Without it the milestone has no end. *My answer: the walk in section 1, taken by the co-founder.*
3. **Which screen did the co-founder mean, and where exactly did they stop?** Polish and fewer questions are different jobs with different costs.
4. **How many of the 15 open Major findings are on the journey, and why would we polish before they are closed?** *About ten, by my reading; step 0 confirms.*
5. **When does the immigration expert confirm the Visitor visa content, and who signs the answer keys?** Nothing is compliance-grade before that, and it needs no tokens.
6. **Has a complete form filled by the app passed Adobe's own check?** The hand-over page says not yet (C7.2). A filled form the government's reader rejects is not a product.
7. **How long does a client take to finish the family case, and how many of the 292 answers could come from a document or from an earlier answer?** Time has never been measured. This is the real "too many fields" number.
8. **Which of these screens will the team keep, and which will they rebuild in their own components?** Polish on a screen the team rebuilds is wasted. Shared rules and the journey are not.
9. **What does one screen change cost today, in minutes and in tokens, from push to demo, and which part is the wait?** Measure before building a lane.
10. **Why did every screen grow so much text, and what stops it growing back?** *Because findings are closed by adding sentences and nothing counts them. A counted limit stops it.*
11. **Who is the first real user, and which three screens do they live on?** Bake those to a higher bar than the rest.
12. **What is the three-minute demo that makes a buyer or an investor say yes?** The start page's third door should be exactly that.
13. **Do IRCC's terms allow a portal extension?** "Unconfirmed: no counsel". Ask before M4 Track B spends anything.
14. **What is the cap on the bake, in sessions or in days, and what happens when it is reached?** *My answer (revised): cap stage 1 at 28 sessions; at the cap, walk it and decide. Set the cap for stage 2 only after that walk, and for stage 3 only after the zero-code test. (First version: cap the lean bake at 24.)*
15. **After the bake, who keeps it baked?** *The counted limits, run on every screen change by the existing review.*
16. **"Used internally" by whom, on what data?** (added) The team's own sample and test cases, or real clients? It decides whether backups, a real sign-in and an access record are needed before first use. *My answer: sample and test cases only until the team's platform carries real data. Unconfirmed: no counsel.*
17. **Is the employer's side of the LMIA pathway inside "every form"?** (added) Today a Sample employer case per firm stands in for it (stand-in SI-10, `samples/employer-cases.json`), and corporate cases are the team's AG-17. *My answer: keep the stand-in; the worker's side is in, the employer's application is the team's.*
18. **Is the Chrome extension (C7.4) inside "full capability"?** (added) Without it, forms are filled as PDFs and anything IRCC takes only online is still typed by hand. *My answer: no; it stays M4, after the zero-code test, and after counsel has answered question 13.*

## 8. What I did not check

* I did not run the app for this note; the findings are from the code and records at the baseline above, plus the screens I walked for the hand-over page earlier today.
* **Added with the revision:** nobody in this session has started the app with the internal workspace setting and walked it; section 10 is from the code's refusals, not from a walk. Step 0 should do it.
* The team's roles in section 9 are from the summary tables in the requirements (the overview, Doc 1 section 4.4, Doc 3 section 3.3), not from the 235-permission catalogue.
* The counts of role checks in section 9 are a pattern search of the API and engine source, without the tests; treat them as rough.
* The sizes for steps 9 to 13 turn the hand-over page's Large, Medium and Small into sessions by my rule of thumb (Small 1 to 2, Medium 3 to 5, Large 6 to 10). No design exists for any of them yet.
* Which forms each of the other five combinations needs, and whether all 19 mapped forms cover them, is not re-counted here.
* The count of five manual switches and the count of journey screens are my reading of the code, not a recorded walk.
* I read the titles of the open Major findings, not each one in full. Step 0 does that.
* I did not measure how long screen changes wait in the queue. The factory board has it.
* Whether the proof numbers in step 7 are already available to the screens is not checked.
* Session estimates are mine and have not been tested against the factory's recent rate.

## 9. The sign-in and role model (added 10 Nov, after the clarification)

**Short answer: the app does not have too many roles. It has too many people on screen.** Measured against the team's requirements it has fewer roles than the finished product will need, and that is right for this build. The fix is one sign-in page with four roles, the nine people kept underneath, and nothing deleted.

### What the team's requirements define

From the name-free copy of the 2 Nov snapshot. About fifteen named roles in three families:

| Family | Roles | Where it is written |
|---|---|---|
| Platform staff | Six fixed roles: Platform Owner, Admin, Support, Billing, Content publisher, Auditor. "A person can hold several." Older names were retired before 12 Oct 2026, among them "Content author" and "Content approver". | `02-functional-requirements/shared/00-Overview_v3.13_2026-10-25.md` (SA-7) |
| Firm | Six starter roles: Owner, Admin, Case Manager, Case Officer, Billing / Finance, Read-only. Firms can build their own from a catalogue of 235 permissions. Two specialisations are named: RCIC / Regulated Consultant (the licensed consultant) and Sales / Intake Rep. | The same overview (SA-6); `01-techno-functional/05-Doc-3-Agent-Console.md` section 3.3 |
| Client portal | About three: Primary Applicant, Corporate Sponsor / Seat Admin, Dependent / Viewer. | `01-techno-functional/03-Doc-1-Platform-Foundation.md` section 4.4 |

Three things in those pages decide the model:

1. **Author and approver are one role held by two people, not two roles.** The Content publisher "Writes the country pack for assigned countries and is the second person for production packs (SA1-D6): the approver approves exactly what was submitted, never edits, and never approves their own draft." The team retired the separate author and approver names itself.
2. **The licensed consultant is a separate job from the case officer.** Doc 3: the RCIC / Regulated Consultant does "Eligibility (Qualifier), consults, retainers, case sign-off; typically the designated person; no user/RBAC admin". The Case Officer does "Post-conversion delivery (documents, forms, workflow), client comms".
3. **Firms have no two-person approval.** SA-6 says so for firm actions, and AG-07 v2.10 withdrew the four-eyes rule on government forms (AG-7-65). So the second representative in the app is there for privacy between representatives, not for approval.

### What the app has

Nine simulated people (`api/src/core.ts`), each with duties, in three areas:

| Person in the app | Area | What the person is for |
|---|---|---|
| Configuration author (labelled "Super Admin · content publisher"; duties: author, review) | Studio | Sets up pathways |
| Content reviewer (duties: review, subject-matter check) | Studio | A reviewer who is not the author. By decision D254 the subject-matter check is a duty, not a role |
| Approver (duties: review, approve) | Studio | The second person on a release |
| Case officer (duty: case) | Cases | Prepares the case |
| Representative (duties: case, represent, firm admin) | Cases | Reviews and signs |
| Second representative | Cases | Proves two representatives do not see each other's work |
| Solo representative (duties: case, represent, firm admin) | Cases | Proves a one-person firm works |
| Client A (duty: answer) | Client | Answers the questions |
| Client B | Client | Proves one client cannot see another |

How much of the code leans on each duty (a pattern count in the API and engine source, tests left out; rough): author about 120 places, review 10, case 7, approve 3, represent 3, and one each for the subject-matter check, firm admin and answer. Two readings follow. The role model in the code is thin, so changing what the screen shows is cheap. And the Content reviewer guards a single check, so it does not earn a place on a sign-in page.

Also in the app, and outside the role model on purpose: the roles a person plays **on a case** (principal, spouse or partner, child, sponsor, representative, parent; `samples/person-roles.json`), and the personal link by which an adult family member answers their own part with no sign-in (C6.16, `api/src/person-link.ts`).

### The model I recommend: four roles on the sign-in page

| Role on the sign-in page | The team's name for it | People merged into it | Where the others go |
|---|---|---|---|
| **Content publisher** | Content publisher (platform staff) | Configuration author, Approver, Content reviewer | The second person appears through a hand-off button at the moment it is needed ("Continue as the second content publisher"). The Content reviewer sits under "More people". The label "Super Admin · content publisher" goes: in the team's words the Super Admin "is not a single person". |
| **Case officer** | Case Officer (firm starter role) | Case officer | Unchanged. |
| **Representative** | RCIC / Regulated Consultant (Doc 3) | Representative, Second representative, Solo representative | Second and Solo sit under "More people". Firm admin stays a duty of the representative, not a role. |
| **Client** | Primary Applicant (portal) | Client A, Client B | Client B sits under "More people". Adult family members keep the personal link and never see the sign-in page. |

**Not added, each for a reason:**

* Platform Owner, Admin, Support, Billing, Auditor: firms, plans, billing and support tools are the team's modules. Nothing in this build has a screen for them to use.
* Firm Owner, Firm Admin, Case Manager, Billing / Finance, Read-only, Sales / Intake Rep: firm set-up and users are the team's (AG-01; the two Sample firms are a stand-in, SI-9), and prospects are the team's (P-271).
* Corporate Sponsor / Seat Admin: the employer's side is a stand-in (SI-10) and corporate cases are the team's AG-17 (section 7, question 17).
* Dependent / Viewer: the personal link already does this job.

**Could it be three, with case officer and representative merged?** No. Preparing a case and signing it are different acts, the team's own table keeps them apart, and a solo firm already shows one person doing both. Unconfirmed: no counsel.

**Nothing is deleted from the code.** 345 test files set the person behind the scenes and they are the proof of second-person approval and of privacy. The change is what the first screen shows.

### What the sign-in page is

* The product name, one line on what it is, and the workspace name (section 10).
* Four cards, one per role, each with one line: what this person does here.
* A small link, "More people (for checks)", which opens the other five.
* An honest label: "Simulated sign-in: no password. For sample and test cases only."
* Picking a role lands on that role's home: the publisher on the pathways, the case officer and the representative on their case lists, the client on their own case.
* The header shows the role and "Switch role" on every screen. Where the job changes hands (send for approval, send to the client, send for representative review) there is a hand-off button, so nobody goes back to the sign-in page in the middle of the journey.

**Size:** 3 to 4 sessions (step 1c with 1c+). **What I would not do:** real passwords, sign-up, invitations or forgotten-password flows. The founder has said this is not for sale, and real users are the team's (P-357).

## 10. What replaces the Demo menu's load and reset buttons (added 10 Nov)

### Today

The Demo menu (`web/src/App.tsx`, `DemoControls`) has seven items. The header carries a pill, "Prototype · demo workspace".

| Item today | What it does | What replaces it |
|---|---|---|
| Load sample… | Loads the sample configuration | The start page's starting point "Six pathways set up" |
| Reset demo… | Empties the configuration | The start page's starting point "Empty" |
| Reset to the six… | "Empties all configuration, then loads the six agreed combinations with their structure and official PDFs. US$0" | The same "Six pathways set up": three buttons that differ by a nuance become one |
| Load the finished story… | Loads the full journey already walked (C10.2) | The start page's starting point "The finished story" |
| Load the configured checkpoint… | qa's step-by-step state (B120) | A small "Sample data" page for qa, reached from the footer, not from the start page |
| Start With an LMIA from its reviewed release… | Imports the reviewed work-permit release (`p3/releases/c1-v3`) | The same "Sample data" page, until that pathway is one of the six that load set up |
| Open the case area (runtime preview) | The only door from set-up to cases | Disappears: the one frame of step 1b has both areas in its navigation |

### The idea: two workspaces, told apart in words

The code already has this. A setting decides which workspace a running copy is (`STUDIO_WORKSPACE_KEY`; "demo" unless set), and every loader refuses outside the demo workspace (`api/src/demo.ts`, five places, and `forms-demo.ts`). Decision P-240 is the reason: Sample is demo only.

**The demo workspace keeps loading, as a start page, not a menu.** After sign-in a publisher sees "Choose a starting point": Empty, Six pathways set up, The finished story. The page says what is loaded now (the status route already returns it). Choosing again replaces what is there, behind one plain confirmation. That is the whole of "load 6, 7".

**The internal workspace has no load and no reset, ever.** In it:

* **Configuration arrives one way: a release that passes both gates.** A source for every value, and an answer key signed by the immigration expert. Until then the pathway sits as a draft that says what is missing. That is P-240 working as designed, and it is why the expert is on the critical path.
* **Do not copy Sample releases across to make it look full.** That would break P-240 on day one. What can be offered honestly is "bring the shared library in as drafts": the structure and the forms come across, every value arrives unconfirmed, and nothing is released until someone confirms it. The import half exists (`engine/import.ts`). 3 to 5 sessions, in stage 3, not in the totals; without it a publisher re-enters each pathway by hand, which is also the zero-code test's job on one pathway.
* **Cases start with "Open a case"**, which exists and works (C6.1).
* **Mistakes are corrected, not reset:** a new version of a release, a closed case. A reset in a workspace people rely on is a loaded gun.
* **Backups.** A workspace with no reset needs a backup and a tested restore. Not in this build (step 12).
* **Sending a client their link.** Outside the demo the app says "Sending email is not built in this workspace … Nothing was sent." (`api/src/person-link.ts`; email is the team's, AG-10, stand-in SI-20). For internal use add "Copy the link" so a person can send it themselves. 1 session, no new technology, inside step 1e.
* **The header pill names the workspace** ("Demo workspace: sample data" or "Internal workspace"), so nobody mistakes one for the other.
* **Switching is two addresses, not a picker.** The workspace is fixed when a copy starts, so two workspaces are two running copies. An on-screen switch between them is real work for no gain; do not build it.

**What I have not seen:** the internal workspace walked in a browser, and whether a second copy keeps its own database apart from the demo's. Step 0 starts one and writes down everything that refuses.

**Size:** steps 1d, 1d+ and 1e, about 4 to 5 sessions.

## 11. The gap list: from today's 29 to "every rule and form working, production grade" (added 10 Nov)

**Where today stands** (`product/qa/CAPABILITIES.md` on `main` at `b0b23a807`, 112 rows): M2 60 of 60 Works; M3 25 Works and 4 Partial; M4 1 Not built; parked 10 (5 Not built, 2 Partial, 3 Works); technical rows 8 (6 Works, 2 Partial); the team's rows 4 Not built.

The gap is in five groups. Sizes are builder-sessions, mine, and loosely held.

### A. Finish and fix what is there

| Gap | Evidence | Owner | Size |
|---|---|---|---|
| The last four of the 29 are Partial: AI reads documents (C6.5), the independent AI review of a filled form (C7.5), the officer adds a library form to a filing (C7.8), the finished story (C10.2). | CAPABILITIES; C7.8 was in the merge queue at 11:53 IST | Builders, in flight with the tech lead | Already planned |
| Declared against confirmed answers (C6.6) is Partial. | CAPABILITIES, technical rows | Builders | In step 2 |
| **A complete form filled by the app has not passed Adobe's own check** (C7.2, Partial since 8 Nov; the nightly run reports failure). | CAPABILITIES; hand-over page | Builders, then a person with Adobe | Step 11 |
| **No fill trial has run on the app's own field maps.** Six forms have a recorded trial (IMM 0008, 1295, 1344, 5257, 5409, 5707) and every one says it ran on the earlier trial values, not on a map version from the app. 19 forms are mapped, so 13 have no trial at all. | `samples/fill-trials.json` (`map_version` empty on all six) | Builders, plus 15 to 30 minutes of a person per form | Step 11: 6 to 10 |
| 15 open Major findings (8 Bug, 7 Gap). | `qa/BUGS.md` | Builders | Steps 2 and 2+: 9 to 15 |
| The rest of the hardening pass (B112). | P-358 | Builders | Step 4: 4 to 6 |

### B. Every pathway by set-up alone (the largest gap)

**One of the six agreed combinations runs a full case.** The others stop on things that live in files and code, not in screens:

| What is special-cased today | Evidence | What "by set-up alone" needs |
|---|---|---|
| Fees | `samples/fee-table.json` has rows for three combinations (`vv.single`, `sp.outside`, `wp.lmia_inside`); status "Researched (source, date): may change", as of 21 Sep 2026 | Fees entered on a library screen, with source and date, carried in the release |
| Which forms a filing needs, and per person | `FORM_SETUP` in code and `samples/form-setup.json` cover two combinations (`pnp.express_entry`, `fs.spouse`) | A form set-up screen; the table in the release |
| Who files what (each person their own, or one for the family) | `engine/filing-modes.ts` knows one combination, the visitor visa | A pathway setting |
| Checklists and linked applications | Visitor-visa-only guards in `engine/runtime/filings.ts` and `engine/runtime/case-checklist.ts` | Five general mechanisms; the guards deleted |
| Rules about boxes and people | Seven rule tables in files: fees, form field gates, script requirements, form roles, own yes/no, fact expiry, fill trials | The seven tables moved into library screens and the release |
| The family shape | Fixed: a principal with spouse and children | Configurable relatives and repeating groups (spouse sponsorship needs a sponsor and an applicant) |
| The representative form (IMM 5476) | Built-in logic | A flag on the library form |
| The employer's side of the LMIA pathway | A Sample employer case per firm stands in (SI-10) | A scope decision (section 7, question 17) |

Size: step 9, 22 to 37 sessions; then step 10, 3 to 5 for each further pathway, 15 to 25 for five; then the zero-code test. **Together about 38 to 63 sessions: half of the whole milestone.** The hand-over page called this M4 Track A and put it at 10 to 20 working days.

### C. Production-grade running

| Gap | Evidence | Size |
|---|---|---|
| Filling runs one process per form with a 180-second limit, an in-memory queue and local disk. A restart loses the queue. | `api/src/fill.ts` | 3 to 5 (durable queue, proper storage) |
| No cache for a release snapshot; missing indexes. | `engine/snapshot.ts`; hand-over appendix | 1 to 2 |
| Never measured under load; the database sits inside the engine. | Hand-over appendix (Scalable 5 of 10) | 3 to 5 (a run at 1,000 cases and 5,000 boxes, and the fixes it forces) |
| No backup or restore. | Hand-over page: "Not in this build: uptime checks, alerts, backups, access logs" | 1 to 2 |

Size: step 12, 8 to 14 sessions. Any new piece of technology here goes through the gate in `STANDARDS.md` section 1 first.

### D. Compliance-grade (not builders' work; no tokens)

| Gap | Who | Size |
|---|---|---|
| **All content is Sample.** Every value needs its official source entered, with page, quote and date (P-170). | The tech lead researches and cites; the immigration expert confirms | Per pathway |
| **No answer key is signed.** P-240's second gate needs the immigration expert's signature per form map and rule set. | The immigration expert | The hand-over estimated 3 to 5 expert days for the visitor visa. By simple proportion, 15 to 25 days for six pathways. This is a weak estimate: forms shared between pathways should make it less. |
| The fee table is dated 21 Sep 2026 and says "may change". | The tech lead, against the official fee list, with the date | Small, and repeated whenever fees change |
| **Who watches for a new edition of a form, and how soon is the map re-proved?** No owner today. A production-grade form filler with an out-of-date form is worse than none. | The founder names an owner | A standing duty, not a project |
| Legal points: stored signatures, withdrawal, the representative's declaration, the portal's terms. | Counsel | "Unconfirmed: no counsel" |

### E. Outside the goal, by decisions already made (said so nobody counts them as gaps later)

* Real sign-in, tenants, hosting, monitoring and access logs: the team's (P-357, P-335).
* The Chrome extension (C7.4) and the parked portal rows (C2.8, C2.9, C2.11, C9.3, C9.4; P-102): M4, after the zero-code test.
* The team's rows: prospects (C6.7, C6.8; P-271), withdrawal and stored signature (C8.4, C8.5; P-406, "Unconfirmed: no counsel").
* Firm set-up, billing, plans, email sending: the team's modules; this build keeps its stand-ins.

### The gap in one line each

* **To feel like one product:** about 20 to 28 sessions (stage 1).
* **To be a product for every pathway, not one:** about 38 to 63 sessions, and the zero-code test decides whether it is true.
* **To be production-grade in running:** about 18 to 30 sessions (trials, hardening, running), plus 3 to 5 for the Major findings off the journey.
* **To be compliance-grade:** the immigration expert and counsel. No number of builder sessions buys it.
