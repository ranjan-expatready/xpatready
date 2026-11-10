# After the 29: a challenged plan for the milestone before M4

Written 10 Nov 2026, about 12:15 IST, by the hand-over analyst session, at the tech lead's request for the founder. It is advice, not a decision. The tech lead reads it, agrees or disagrees, and takes the open points to the founder one at a time.

* **Evidence baseline:** `main` at `66e74115e` (10 Nov 2026, 10:06 IST) for every count from the code, tests and records. The founder's words are as the tech lead recorded them in `STATE.md` at 11:4x and 11:5x IST.
* **Estimates are mine**, in builder-sessions. One builder-session here means one builder taking one small item to a merged change, with its review. They are sizes, not dates.
* All immigration content is **Sample**. Legal points are "Unconfirmed: no counsel".
* No app code was changed for this note.

## 1. The one recommendation

**Define "baked" as a test a person can pass, not as a list of screens to tidy; then fix the three shared parts first (one frame around every screen, one person picker, one expander), and only then touch single screens.**

The test: one person opens the demo once, walks the whole journey (set up a pathway, release it, run a family case, client answers, representative reviews, forms filled and checked) without typing a new login, without a dead end and without help. The co-founder walks it a second time, cold. Everything in this plan is ordered by what that walk needs.

Why this and not "polish every screen": the founder's complaints are true, and I checked each in the code (section 2). But most of them come from three shared parts, not from forty separate screens. Three small structural fixes remove more of the pain than forty screen-by-screen changes, break fewer tests, and cost a fraction of the tokens.

## 2. What the founder said, and what the code says

| The founder's words | True? | Evidence | What actually fixes it |
|---|---|---|---|
| "If I go to the case run view area, I can't come back to the client" | **Yes** | The app is two separate frames. `web/src/App.tsx` sends `/cases/*` to one frame (`RuntimeApp`) and everything else to another (`Shell`). The only way back from a case is a "Product Studio" link in the case header that is hidden on narrower windows (`hidden … md:inline`, `runtime/cases.tsx`) and silently changes who you are acting as. From the Studio, the case area is reachable only through the Demo menu ("Open the case area (runtime preview)", `App.tsx:231`). There is **no client page at all**: the routes are case list, case, questions, eligibility, review, representative review, sheet. A client exists only inside a case. | One frame for both areas, with a visible path line (where am I, one click back), and a link both ways between a case and its client. |
| "I have to change the logins above" | **Yes** | Two different switchers: "Acting as" in the Studio (`App.tsx:167`) and a second "Acting as (simulated)" in the case area. Entering the case area changes you to the Case officer without asking (`cases.tsx:55`). A case person who opens a Studio page gets a stop notice, "This page is for the configuration people" (`App.tsx:107`). By my count the full journey needs **five manual switches across six people**. | One picker, the same everywhere, plus a hand-off button at each point where the job changes ("Continue as Approver"). |
| "Have we created too many roles?" | **No, but it looks that way** | There are 9 simulated people (`api/src/core.ts:40-54`) and about 4 real jobs: content publisher, case officer, representative, client. The other five exist to prove safety rules: a second person must approve, two representatives must not see each other's work, a solo firm works, Client A cannot see Client B. | Show 4 jobs. Keep the 9 people underneath. See section 3, position 1c. |
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

### Position 4. "Productise" lightly: **keep, but the founder's answer at 11:5x is three different things; only one is light**

1. **One sign-in, pick a job: keep.** A simulated start, not real sign-in (real users are the team's, P-357, P-335). It is the picker of 1c.
2. **A guided path: keep, and do not build a second one.** "The finished story" (C10.2) is already one of the 29. After it lands, add a start page with three doors (Set up a pathway, Run a case, See the finished story) and cut the Demo menu from 7 items to those and a reset. This answers the founder's "maybe fix today's demo navigation instead": yes, and it is the cheapest high-value item in this plan.
3. **"Every form and capability working, production- and compliance-grade": this is not light and it is not a bake.** It is three separate jobs:
   * **Every form.** One pathway (Visitor visa, 7 forms) runs a full case. Four more are configured, but fees, checklists and linked applications on them still need code (hand-over page, "Not yet proven"). Making every pathway run is what the hand-over called M4 Track A, estimated there at 10 to 20 working days. So "bake M1 to M3 before M4" and "every form working" pull in opposite directions. The founder must choose (section 7, question 1).
   * **Production-grade.** The hardening pass (B112) is in this plan. The scale items (the hand-over scored Scalable 5 of 10) are M4 or the team's.
   * **Compliance-grade.** No builder can deliver this. All content is Sample, no answer key is signed, and the hand-over page records that Adobe's own check has not passed on a complete form filled by the app (C7.2). It needs the immigration expert (the hand-over estimated 3 to 5 expert days for the Visitor visa) and counsel. It costs no tokens. If it is not booked, the words "compliance-grade" cannot be used honestly at the end of the bake.

## 4. The milestone as I would run it

**Name:** Bake (M3.5). **Rule:** no new capabilities. **Exit:** the walk in section 1 passes twice (qa's fresh reader, then the co-founder), with no open Major finding on the journey.

**Measures at the exit** (each counted by a script or a person watching, not self-reported):

| Measure | Today | Target |
|---|---|---|
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
| | **Full bake, total** | **42 to 57** | |

**My recommendation on size: run the lean bake, then let the second walk decide.** If the co-founder gets through and the remaining complaint is "still wordy", steps 5 and 6 are worth their 18 to 22 sessions. If the complaint is still "too many fields", no amount of polish helps and the money belongs in reading documents and carrying answers. Committing to the full bake today means spending about 40 sessions on a guess about what one person meant.

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

## 6. Where I disagree with the founder

1. **"Fewer roles."** No. Fewer on screen, the same underneath. Removing them removes the evidence that the product is safe.
2. **"A skill that tidies all these screens one by one."** Not all, and not first. Three shared parts first; then 14 to 16 screens; the rulebook already exists and needs counting, not rewriting.
3. **"A graph so screen changes merge without the backend tests."** The graph exists. The wording on the screens is tied to the tests on purpose. The honest saving is a narrower run for style-only changes and a cheaper review, and it should be measured before it is built.
4. **"Production- and compliance-grade" with "I don't want to put too much effort".** These cannot both hold. Internal use on the Visitor visa is within reach. Compliance-grade is the expert's and counsel's time, not builders'.
5. **"No M4 until M1 to M3 are completely baked."** Right for the Chrome extension. But if "every form" means every pathway, that work is M4 Track A by another name, and it has to come before the claim, not after.
6. **"Wow factor."** The wow here is not animation. It is the product showing its own proof at the moment it happens. Two true lines on two screens will do more than any amount of decoration.
7. **One sentence from the co-founder is being turned into a milestone.** "Too many fields" could mean the client's questions or the publisher's set-up. Thirty minutes of watching them use it is the cheapest research available and should come before any builder starts.

## 7. Questions the founder should be asking

Each with why it matters and, where the evidence gives one, my answer.

1. **Does "every form" mean the Visitor visa's 7 forms, or all five pathways?** It decides whether the bake is about 20 sessions or whether M4 Track A moves in front of it. *My answer: the Visitor visa for the bake; Track A next; the extension last.*
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
14. **What is the cap on the bake, in sessions or in days, and what happens when it is reached?** *My answer: cap the lean bake at 24 sessions; at the cap, walk it and decide.*
15. **After the bake, who keeps it baked?** *The counted limits, run on every screen change by the existing review.*

## 8. What I did not check

* I did not run the app for this note; the findings are from the code and records at the baseline above, plus the screens I walked for the hand-over page earlier today.
* The count of five manual switches and the count of journey screens are my reading of the code, not a recorded walk.
* I read the titles of the open Major findings, not each one in full. Step 0 does that.
* I did not measure how long screen changes wait in the queue. The factory board has it.
* Whether the proof numbers in step 7 are already available to the screens is not checked.
* Session estimates are mine and have not been tested against the factory's recent rate.
