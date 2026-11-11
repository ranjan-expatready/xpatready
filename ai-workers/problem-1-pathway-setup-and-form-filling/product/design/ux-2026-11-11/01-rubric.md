# UX rubric for the Pathway Configurator (step 1 of A19 (k))

**Who wrote it:** the UX planner, read-only on product code (P-455 (5)), 11 Nov 2026. **For:** the tech lead, every screens builder, the reviewer and qa, and every later scoring round (`02-baseline-score.md`, the inventory files, the score history).
**Founder's ask, spoken ~12:4x IST:** "best in class UX UI ... simplicity, perfection, scalability, stability, reliability, longevity, ease of use ... any unknown person should know what to do ... we should not overdo it ... keep simple, keep balance ... learning from the proven methods ... First score it, and then plan to improve the score". Earlier: "not very cognitive, really heavy on people's brain", "easy to use, fun to use". Branding (colours, fonts) stays.

**This rubric scores; it does not replace a rule.** `EXPERIENCE.md` stays the bar ([M]/[S] lines and the 20 BIC checks, P-407). A BIC check is pass or fail on one screen; this rubric turns the same ground into 14 scores from 0 to 10, so a round can say "Errors and recovery went from 4 to 8" and a plan can aim at a number. §5 maps each dimension to the EXPERIENCE lines and BIC checks it scores, so there is one bar, not two.

---

## 1. The sources, and which one wins for this product

| Source | What it is good at | Strength of evidence | How it is used here |
|---|---|---|---|
| **GOV.UK Design System and Service Manual** (patterns "Question pages", "Check answers", "Error summary", "Task list", "Confirmation pages"; "Start using GOV.UK" one thing per page) | Long, legal, government forms filled by people who have never seen them; plain words; recovery | Strongest of the set for our core job: patterns researched with large, mixed and low-confidence user groups, including visa and immigration services, and published with the research behind them | **Wins for every page where a person answers, checks or sends** (client questionnaire, Agent view, check before sending, error messages, task lists) |
| **Canada.ca Design System** (Canada.ca content style guide, "Basic page", "Error messages", "Checklist") | The same jobs, in Canada's own words; the words IRCC's own forms and pages use | Strong; based on GOV.UK patterns and tested on Canadian users | Words and form behaviour that should feel like Canada.ca to an applicant (date formats, "Not applicable", "Unique client identifier (UCI)") |
| **Apple Human Interface Guidelines** (clarity, deference, depth; hierarchy, harmony, consistency in the 2025 revision) | Calm, high polish; content first; the "it just works" feel the founder asked for | Principles from long practice, not trials; strong on look and feel, weak on dense data entry | **Wins on look and feel:** what is shown first, white space, one focus per view, motion that explains, never decorates |
| **Nielsen Norman Group's 10 usability heuristics** | A shared vocabulary for faults | Strong; widely replicated in expert reviews | The checking vocabulary for findings (each finding names its heuristic) |
| **Laws of UX** (Hick, Fitts, Miller, Jakob, Tesler, Doherty) | Numbers a builder can test | Mixed: Hick, Fitts and Doherty are measured laws; Miller's 7±2 is about memory, not menus, so it is used only as "chunk long lists" | Measures inside dimensions 2, 3 and 12 (choices per decision, target size, response under 400 ms) |
| **Progressive disclosure** (NN/g) | Experts and newcomers on one screen | Strong | The default for every staff screen: the next step and its facts first, "Details" for the rest |
| **Best-in-class work apps** (Linear, Stripe Dashboard, Notion) | Dense staff work that still feels calm: keyboard, inline edit, side panels, honest empty states, fast | Industry practice, not trials; widely copied for a reason | **Wins for staff work surfaces** (Programs, a pathway's tabs, To review, the case page): density, side panel, list plus detail, one next step |
| **Immigration case tools** (practice-management tools used by Canadian licensed representatives; IRCC's own portal) | What a representative already expects: case list, client portal link, a checklist per person, forms with a status | Practice; the users' Jakob's law ("people spend most of their time on other sites") | Structure only: case › people › applications › forms; never their look |
| **WCAG 2.2 AA** | Accessibility | A legal standard | A floor in dimension 10, tested with axe and by keyboard |
| **Microsoft HAX guidelines** (already in EXPERIENCE) | AI proposals people can trust | Strong; tested guidelines | Dimension 14 (trust) for AI proposals |

**Ruling: one product, two front doors.**
1. **GOV.UK wins for answering, checking and sending.** It is the only source here built and tested on exactly our hardest job (a stranger completing a government immigration form without help), and the founder's test is "any unknown person should know what to do". So the client questionnaire and every "check before it leaves" page follow its question page, check answers, error summary and task list patterns, in Canada's words.
2. **The Linear and Stripe way wins for staff work surfaces**, under Apple's clarity and deference. A case officer opens forty cases a week. They want density, a side panel, and one obvious next step, not one question per page. Apple decides the look: one focus per view, quiet chrome, white space doing the grouping, motion only to explain where something went.
3. **Nielsen is the checker's language**, Laws of UX the checker's numbers, and WCAG 2.2 AA the floor.

### Where we deliberately do NOT follow a source (no over-design)
* **Not one thing per page for staff.** GOV.UK's "one question per page" slows an expert who repeats the task daily. Staff pages group by person in sections (EXPERIENCE BIC-19). Client pages keep at most five inputs per page (BIC-19), not one.
* **Not Apple's showpieces.** No translucency, parallax, large hero type, custom illustration, or motion longer than 200 ms. The brand's colours and fonts stay (founder); its tokens are the only values.
* **No dark mode or theming work** in this round. The team's tokens carry a dark sheet. We keep it working and do not design for it.
* **No command palette (⌘K) as a must.** It is a should for staff once the frame lands. Search on the list pages covers it.
* **"Fun" means calm and rewarding, not playful.** Progress that moves, a clear "done" moment, an empty state that teaches. No confetti, badges, mascots or gamified streaks: this is legal work.
* **No new technology for looks** (STANDARDS §1). The current kit (Tailwind on the team's tokens, `components/ui`, Radix-style primitives) is enough. A motion library, an icon set swap or a component framework needs the technology gate.
* **The in-browser PDF viewer is a candidate, not assumed.** B170's analysis (PR #1527) found the team's engine reads 2 of 21 IRCC forms and has no viewer screens. Dimension 4 scores "download and re-upload round trips" as a measure, so any route that removes them scores, viewer or not.

---

## 2. How a screen is scored

* **Unit:** one screen in one state (normal, empty, error, read-only, long content), at **1440 px** and **375 px** (and 1024 px where EXPERIENCE asks for it), by role. A screen's score per dimension is the lower of its two widths, unless the dimension says otherwise (11 scores the narrow width; client pages count 375 px double).
* **Evidence first:** every score cites a screenshot, a count, an axe result, or a step. No score without evidence. A score of 8 or more needs a measure, not an impression.
* **Anchors:** each dimension has written anchors for 5, 8 and 10. Scores between anchors are judgement, with the reason in one line. 0 to 2 = absent or harmful; 3 to 4 = present but failing often.
* **Journey score:** the weighted mean of the screens on the walk (§4), each screen weighted by how often the persona meets it (journey screens weight 3, side screens 1).
* **Who scores:** the planner or qa's fresh reader. A builder never scores their own screen (P-303). Each round writes a dated column in `score-history.md`.
* **Measures** are counted by the crawl (`inventory/*.yaml`) where a machine can count, and by hand otherwise. Each counted measure names its method so the next round counts the same way.

---

## 3. The 14 dimensions

Each has: what it means here, how it is measured, and anchors for 5, 8 and 10.

### D1. First impression and visual polish
*Does it look like top-notch people made it, in the first five seconds?* (Apple: clarity, harmony; aesthetic-usability effect)
**Measure:** type sizes per panel (team scale, at most 3); one-off values (colours, spacing, radius not from tokens); alignment faults on a 4/8 px grid; visual weight of chrome vs content; screenshots side by side.
* **5:** Tidy and on-brand, but busy: many borders, badges and grey boxes compete; 4+ type sizes in a panel; some cramped or misaligned spots; reads as a capable prototype.
* **8:** Calm and confident: one clear focal point per view; white space groups content; 3 type sizes per panel; no one-off values; status chips quiet; a stranger says "this looks professional".
* **10:** Every screen in a side-by-side line-up looks like one hand made it; nothing to remove; the hierarchy reads at a squint; comparable to Stripe Dashboard or Linear on the same kind of screen.

### D2. Clarity of the next step
*Does every person, on every screen, know what to do next without help?* (Nielsen 1, 6; EXPERIENCE §2.5; BIC-11)
**Measure:** filled (primary) buttons per panel (≤ 1); next-step panel present with a verb-led label; seconds to find the next action in a cold five-second test; dead ends (screens with no way onward or back).
* **5:** The next step exists but competes with 3+ equal buttons, or hides in a tab; labels like "Next", "Submit"; one or more dead ends on the journey.
* **8:** One primary button per panel, named for what it does ("Send to the client"); a next-step line on every status page; 0 dead ends; a cold reader finds it in under 5 s.
* **10:** The page is built around the next step; finishing it carries the person to the following one (hand-off), including across roles; nothing to read first.

### D3. Cognitive load
*How much must a person hold in their head?* (Hick, Miller as chunking, Tesler; "not very cognitive, really heavy on people's brain")
**Measure:** words in the first viewport; distinct choices visible at once; counts and numbers shown without a label; internal ids or keys on the main path (0 allowed); nested tabs (0 allowed); sections expanded by default.
* **5:** Long screens with many numbers and badges at once ("115 to do · 231 to do · 239 to fix"); jargon or keys appear; a person must remember facts from another screen.
* **8:** The first viewport holds the job, the status and the next step in under ~120 words; every count says what it counts; details folded; no keys; nothing to remember between screens.
* **10:** Each screen asks one question of its persona ("what needs me?") and answers it at a glance; the system carries the complexity (Tesler) so the person never does.

### D4. Forms and data entry
*Is giving information quick, forgiving and asked once?* (GOV.UK question pages; BIC-01, 02, 04; founder's XFA example)
**Measure:** inputs per page (client ≤ 5); labels in words, "(optional)" marked; right input type (date, pick-list, yes/no); questions asked again elsewhere (0); **download-then-re-upload round trips per filing**; typing where a pick-list exists; fields per task.
* **5:** Works, but long pages; some free text where a list exists; a fact asked twice; a filing needs the PDF downloaded, opened elsewhere and uploaded back.
* **8:** Client pages ≤ 5 inputs with clear labels and hints; every fact asked once and shown pre-filled with its source; pick-lists and date inputs; round trips only where IRCC itself requires one, each explained.
* **10:** The form feels like a conversation: questions appear only when needed, with a reason; the person never leaves the app to finish a form; a review page shows everything before it leaves.

### D5. Errors and recovery
*Are mistakes prevented, explained in place, and undoable?* (Nielsen 5, 9, 3; GOV.UK error summary; BIC-13; EXPERIENCE §2.8)
**Measure:** error messages that say what and how (all); error summary at top with links (on any page with 2+ inputs); typed value kept; focus moved to the first error; destructive actions with in-page confirm or undo; raw server words shown to a person (0).
* **5:** Errors show, but some in a toast only, some say "Invalid input", some lose what was typed; a few actions cannot be undone.
* **8:** Every error on its field and in a top summary with the same words, with the fix; input kept; focus moves; every destructive action has a confirm naming what goes, or undo.
* **10:** Most errors cannot happen (pick-lists, live checks, disabled-with-reason); the rest recover in one step; nothing is ever lost.

### D6. Feedback and system status
*Does the system always say what it is doing and what just happened?* (Nielsen 1; Doherty; BIC-18)
**Measure:** saved, saving and failed-to-save visible; long jobs with real progress; toasts that state the result in words; a status that matches the data (no stale counts, e.g. QA-224, QA-388).
* **5:** Feedback exists but is sometimes stale (counts until reload), duplicated, or in toasts that cover controls.
* **8:** Every action answers within 400 ms (Doherty) or shows progress; statuses are calculated and current; toasts never cover the next action.
* **10:** The interface always tells the truth about the present; progress is honest; a person never wonders "did that work?".

### D7. Help and tooltips
*Is help where it is needed, and only there?* (Nielsen 10; EXPERIENCE §2.10; BIC-14)
**Measure:** status chips, icon-only buttons and numbers with a tooltip (all); tooltips reachable by keyboard; task-critical text hidden in a tooltip (0); "Why we ask" or "How it works" on each complex control; help text count per screen (too many is noise).
* **5:** Some tooltips; complex controls without an explanation; some needed text only on hover.
* **8:** One help pattern everywhere (hint under a label, a titled "Why we ask" fold, a tooltip for icons and chips); everything needed to act is visible.
* **10:** A stranger finishes the task without opening help; when they open it, it answers exactly their question in one sentence.

### D8. Consistency
*Same thing, same look, same word, same place?* (Nielsen 4; Jakob; EXPERIENCE §1; PRODUCT §4 words)
**Measure:** distinct visual variants per component kind (buttons, chips, panels, fold-outs, dialogs, empty states, tables); one word per meaning (PRODUCT §4); same action in the same place across screens; set-up and case areas sharing one frame.
* **5:** Two frames (Studio and case area) with different headers; several chip, panel and fold-out styles; one role named two ways ("immigration expert" / "Content reviewer").
* **8:** One frame, one component set, one word per meaning; at most one variant per component kind with a written reason for each exception.
* **10:** A person who learned one screen can use any other without thinking; a reviewer finds no variant without a token or a reason.

### D9. Navigation and orientation
*Do people know where they are, where they can go, and how to get back?* (EXPERIENCE §2.1, §2.2; BIC-08)
**Measure:** "where am I" line on every page; way back from every page; tab rows (≤ 1); links between related records both ways (pathway ↔ its cases; case ↔ client page); browser tab title names the page; changes of person not through a hand-off or the frame's role picker (P-456 (3), pass 0).
* **5:** Breadcrumbs on most pages; some places only reachable from a Demo menu; switching person by a header select mid-journey.
* **8:** One frame with a trail and a way back everywhere; related records linked both ways; tab titles name the page; 0 unguided changes of person.
* **10:** People move through the whole journey as through one place; they never use the browser's back button to recover.

### D10. Accessibility (WCAG 2.2 AA)
**Measure:** axe violations (serious and critical = 0); keyboard-only walk complete with visible focus; 4.5:1 contrast; target size 24×24 px (2.5.8); 200 % zoom and 320 px reflow without sideways scroll (1.4.10); headings in order; accessible names unique (QA-288, QA-294).
* **5:** axe passes on most states; some duplicate accessible names; some focus loss after actions; a few reflow faults at narrow widths.
* **8:** 0 serious or critical axe violations on every state crawled; keyboard walk complete; focus managed after every dialog and save; reflow clean at 320 px.
* **10:** Also tested with a screen reader on the journey; every live update announced; nothing a sighted mouse user gets that others do not.

### D11. Responsiveness
*Does it work at 375 px for the client, and reflow for staff?* (WCAG 1.4.10; QA-373, QA-385)
**Scoring width:** 375 px. Client pages weigh double. Staff pages need to work at 375 px (reflow, no loss) but are designed for 1024 px and up.
**Measure:** sideways scroll (0); controls cut off or covered (0); tap targets ≥ 44 px on client pages; tables that become cards or scroll inside their own box; the way back present at 375 px (today `hidden md:inline`).
* **5:** Client pages usable at 375 px with rough spots; staff pages scroll sideways or hide controls.
* **8:** Client pages feel made for a phone; staff pages reflow without loss of function; no covered or cut-off controls.
* **10:** A client can finish their whole part on a phone faster than on a laptop.

### D12. Speed as felt
*Does it feel instant?* (Doherty threshold 400 ms; STANDARDS §9)
**Measure:** time to first meaningful view per screen; interaction response (filter, expand, save) in ms; skeletons instead of blank or "No records" during loading; long jobs in the background with a way to carry on.
* **5:** Most actions 1 to 4 s with a spinner; some long saves block the page.
* **8:** Views under 1 s, interactions under 400 ms or optimistic; skeletons everywhere; long jobs in the background.
* **10:** It feels faster than the work it replaces; nothing ever blocks.

### D13. Empty and loading states
*Does the screen teach when there is nothing yet, and stay calm while it loads?* (EXPERIENCE §4; BIC-18)
**Measure:** each screen's empty state says what will appear and offers the first action; loading uses skeletons in the final layout (no jump); read-only says why.
* **5:** Empty states say "No items"; some loading flashes or jumps.
* **8:** Every empty state teaches its first action; skeletons match the layout; read-only and no-permission say why.
* **10:** A new user starting from empty is led to a working first result by the empty states alone.

### D14. Trust
*Would a licensed representative put their name to what this produces?* (HAX; BIC-05, 06, 07, 16; P-170)
**Measure:** AI values marked with their source and confidence; Sample content labelled; every figure and form with its source and date; nothing filed or changed without a person; true words (no "validated" unless Adobe's Validate passed); a record of who did what.
* **5:** Sources and AI marks present but inconsistent; some screens say things that are not true at that moment (QA-386, QA-371).
* **8:** Every value shows where it came from; AI and Sample always marked; every state claim is true; every send and sign recorded with who and when.
* **10:** A representative can defend every line in front of IRCC from the screen alone.

---

## 4. Weights and the stop line

The founder's order is "simplicity, perfection, scalability, stability, reliability, longevity, ease of use", and "any unknown person should know what to do". So the weights favour the next step, the brain's load and forms. The Lead may change a weight; a change is a new column in the score history, never a silent edit.

| Dimension | Weight | Why |
|---|---|---|
| D2 Clarity of next step | 3 | "Any unknown person should know what to do" |
| D3 Cognitive load | 3 | "Not very cognitive, really heavy on people's brain" |
| D4 Forms and data entry | 3 | The product's core job; the founder's XFA example |
| D1 First impression and polish | 2 | "The entire product's first impression is UX UI" |
| D5 Errors and recovery | 2 | Legal forms: a mistake costs a refusal |
| D9 Navigation and orientation | 2 | The Bake's own exit (no dead end, no new login) |
| D14 Trust | 2 | A representative signs what we produce |
| D6 Feedback, D7 Help, D8 Consistency, D10 Accessibility | 1.5 each | Necessary everywhere; most are cheap once shared |
| D11 Responsiveness, D12 Speed, D13 Empty and loading | 1 each | Client pages raise D11 by counting 375 px double |

**Weighted score** = Σ (score × weight) ÷ Σ weights (sum of weights = 26; a dimension scored n/a on a screen drops out of both sums).

**"Best for our purpose", the stop line.** We stop improving when, on the journey's screens at both widths:
1. the weighted journey score is **≥ 8.5**;
2. **no dimension is below 8** on any journey screen (D2, D3, D4, D5 and D9 at **9 or more**);
3. the Bake walks (E1 qa's fresh reader, E2 the co-founder cold) pass with 0 help asked; and
4. each further point would need a new capability or new technology, which goes to the founder as a cost, not as polish.
We do **not** chase 10 everywhere: a 10 on D11 for staff screens or D12 for an AI job is not worth what it costs here.

---

## 5. One bar: map to EXPERIENCE.md and the BIC checks

| Dimension | EXPERIENCE lines it scores | BIC checks it scores |
|---|---|---|
| D1 Polish | §0 "modern by default", §1 Look | BIC-19 (type sizes, reds) |
| D2 Next step | §2.5 one next action | BIC-10, BIC-11 |
| D3 Cognitive load | §0, §1 "dense-but-readable", §5 no ids | BIC-02, BIC-19 |
| D4 Forms | §2.8 pick from lists | BIC-01, BIC-02, BIC-03, BIC-04, BIC-12, BIC-15 |
| D5 Errors | §2.8, §2.9, §4 error | BIC-13, BIC-09 |
| D6 Feedback | §2.11 freshness, §4 running | BIC-18 (saved/saving) |
| D7 Help | §0 "helpful explanation", §2.10 | BIC-14 |
| D8 Consistency | §1 visual system, §3 patterns | BIC-11 |
| D9 Navigation | §2.1, §2.2, §2.3 | BIC-08 |
| D10 Accessibility | §2.12 | BIC-20 |
| D11 Responsiveness | §2.12 (1024 px, 200 %) | BIC-20 |
| D12 Speed | STANDARDS §9 | — |
| D13 Empty and loading | §4 | BIC-18 |
| D14 Trust | §2.6 AI, §2.7 reasons, §2.11 | BIC-05, BIC-06, BIC-07, BIC-16, BIC-17 |

A BIC check failed on a screen caps the matching dimension at 6 on that screen, so a scored 8 can never hide a failed check.

---

## 6. What this rubric asks of the next steps
* **Step 2** scores every crawled screen on D1 to D14 from evidence, and writes the counts in each `inventory/<screen>.yaml` so the next round re-counts the same things (the Lead's ruling of 12:5x IST).
* **Step 3** names, per row, the dimensions and screens it moves and the score expected after it.
* **Step 4** turns the anchors at 8 into rules a builder follows and a reviewer checks (`ux-standard`), and the round itself into a repeatable `ux-audit`.

Sources named above are public design guidance (GOV.UK Design System and Service Manual; Canada.ca Design System and Content Style Guide; Apple Human Interface Guidelines; Nielsen Norman Group's heuristics and progressive disclosure; lawsofux.com; WCAG 2.2; Microsoft HAX). Practice from Linear, Stripe and Notion is cited as industry practice, not as tested evidence.
