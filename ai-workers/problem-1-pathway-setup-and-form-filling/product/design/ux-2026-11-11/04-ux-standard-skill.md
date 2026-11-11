# Two skill drafts: `ux-standard` and `ux-audit` (step 4 of A19 (k))

Drafts for the tech lead: copy each block into `.claude/skills/<name>/SKILL.md` when agreed (instruction files stay short, AGENTS rule 8). The planner does not add skills itself. Both point at the rubric and the inventory rather than repeating them, so there is one bar (`EXPERIENCE.md` + BIC) and one measure (`01-rubric.md`, `uxCheck`).

* **`ux-standard`**: what a screens builder follows and the reviewer checks on every PR that changes a screen. Each rule is testable by `uxCheck` (UX-0), by the inventory diff, or by reading one named thing.
* **`ux-audit`**: how any Lead, qa or planner repeats a scoring round the same way (the Lead's ruling, 12:5x IST).

---

## Draft 1: `.claude/skills/ux-standard/SKILL.md`

```markdown
---
name: ux-standard
description: The UX rules a Pathway Configurator screens builder follows and the reviewer checks on every PR that changes a screen - one page header, one next step, one error and help pattern, words, density, phone width, the inventory diff and the uxCheck test at 1440 and 375 px. Use at BUILD and REVIEW of any web/src change, and when asked whether a screen is "simple enough".
---

# UX standard (rules; each one is checked)

The bar is `EXPERIENCE.md` (+ BIC-01 to BIC-20); these rules make it testable. Scores and anchors: `product/design/ux-2026-11-11/01-rubric.md`. Style decided by the founder (P-473): **calm work app, plain second-person client words with "Why we ask" (IRCC's wording on staff views), calm motion without a motion library, quiet surfaces.**

**Reuse, never rebuild:** page header `PageHeader`, next step `NextStep`, errors `ErrorSummary` + field error, help `Hint` / "Why we ask" fold / `Tooltip`, fold-out `FoldOut`, tables `Table`, marks for Sample and demo. A screen that draws its own version is a Must.

**Each panel** (`uxCheck` counts these at 1440 and 375 px):
1. One heading; at most **1 filled button**, named for what it does ("Send to the client"), never "Next"/"Submit" alone.
2. At most **3 type sizes**, all from the scale; no arbitrary values (`text-[13px]`). **Quiet surfaces (P-473):** white panels on light grey, near-black text; brand blue only for the one filled button, links and focus; orange only for "needs you"; red only for errors.
3. **No raw keys, ids, hashes or file paths** on the main path (Details drawer for admins).
4. Every count says what it counts, and the **same thing shows the same number** wherever it appears.

**Each page:**
5. One `PageHeader`: title, one status, ≤ 20 words of "what this is", the `NextStep` panel. First view (1440 px) ≤ **120 words on a staff page**, ≤ **60 on a client page**.
6. **One next step** for the person looking. If it is someone else's, name them and offer the hand-off; a next-step link must land on an enabled control for that step.
7. **Calm work app (P-473):** a record opens on a home (summary, status, one next step), with at most **one row of sub-pages or tabs**; deeper levels are sections, a list or a drawer; no record is one long page (≤ 3,000 words per page). Edit in a drawer or dialog; the page keeps its scroll and filters.
8. **Client pages:** ≤ **5 answer boxes per page**; **plain words to "you" (P-473)**: each a question, ≤ 20 words, grade 6-8, with a short "Why we ask"; pick-lists for countries and lists; a fact the case knows is never asked (BIC-01). **Staff views** (Agent view, representative's review) show IRCC's exact wording beside the plain one.
9. **Errors:** a summary at the top ("There is a problem") with the field's own words as links, focus on the summary, the hint kept, the input kept; the message says what and how to fix (BIC-13).
10. **Help:** needed-to-act text is visible (hint or titled fold), never only in a tooltip; every icon-only button, status chip and unexplained number has a tooltip on hover and focus (BIC-14).
11. **States drawn:** empty (teaches the first action), loading (skeleton in the final layout), error, read-only (says why) (EXPERIENCE §4).
12. **375 px:** no sideways scroll; tables stack; targets ≥ 24 px (client: ≥ 44 px); nothing cut or covered (toasts included).
13. **Marks:** Sample and demo marks once per section, quiet style; never removed (P-240).
14. **Calm motion (P-473):** only drawers, fold-outs and toasts move, 150-200 ms, CSS transitions, off under reduced motion; **no motion library**, no celebrations; a "done" moment is words and a check mark.

**Proof in the PR (builder):** (a) the row's measure, before and after, from `npm run ux:crawl`; (b) `uxCheck` + axe at 1440 and 375 px in the PR's Playwright test; (c) the `inventory/<screen>.yaml` diff (a new field, section or filled button is a line the reviewer reads); (d) screenshots at 1440 and 375 px.

**Review (reviewer):** read the inventory diff first; then rules 1-14 on the changed screens, Met / Not met with the screenshot or count; a Not met on 1, 5, 6, 8 or 12 is a Must. Do not ask for polish beyond these rules (scope as `screen-review`).
```

---

## Draft 2: `.claude/skills/ux-audit/SKILL.md`

```markdown
---
name: ux-audit
description: Repeat a UX scoring round on the Pathway Configurator the same way every time - fresh copies, crawl every screen and state at 1440 and 375 px, diff the inventory, walk the journey and count, score each screen on the 14 dimensions against written anchors, add a dated round to the score history, and log findings. Use when the Lead, qa or a planner is asked to score the UX, re-score after a wave, or check UX drift.
---

# UX audit (one round)

Folder of the current round: `product/design/ux-<date>/` (round 1: `ux-2026-11-11/`). Read `01-rubric.md` (dimensions, anchors, weights, stop line) and the last round's `02-baseline-score.md` §2 and §8 before you start. Read-only on product code. Live AI off, US$0, never press a priced button (P-175).

1. **Copies:** `zsh studio/tools/isolated.sh <name> <port> start` ×3 on `origin/main`: empty → Load sample "six"; the finished story; the configured checkpoint (the walk). Record the commit.
2. **Crawl:** `npm run ux:crawl` (UX-0; until it lands: `design/ux-2026-11-11/tools/`). Discover routes as every person, add the states file (dialogs, errors, question pages), crawl at 1440 and 375 px. Every route found and not in `inventory/` is a new screen: add it.
3. **Diff:** compare each new `inventory/<screen>.yaml` with the last round's: list sections, fields and filled buttons added or gone. A change no PR explains is a finding.
4. **Walk:** as a new user, the journey (set-up → release → open a case → family → client answers → confirm → generate → representative's review → forms filled and downloaded). Count clicks, typed answers, screens, person changes outside a hand-off, dead ends, download-and-re-upload round trips; the client's part pages and answer boxes for the E1 family.
5. **Score** each screen 0-10 on D1-D14 from evidence only (count, screenshot, axe, step); cap a dimension at 6 where its BIC check fails (rubric §5). **Score before reading the last round's numbers**, then compare; a change of 2 or more needs a line of why.
6. **Write:** a dated round in `score-history.md` (never edit an earlier round); `02-…-score.md` for the round with the counts table, findings (UXF ids continue), and what is good; findings that are faults go to qa (only qa edits `qa/BUGS.md`, P-314). State the gap to the stop line.
7. **Hand over:** one PR, records only; push after each step (P-458). Questions to the Lead as PR comments headed "Question for the tech lead".

**Never:** score your own build; invent a number; drop a screen because it is off-journey (score it, weight 1); count a scaffolding screen (Demo inbox, loaders) in the journey.
```

---

## Why these rules and not more

* Each rule maps to a rubric anchor at 8 (`01-rubric.md` §3) and to the BIC check it serves, so a builder meeting them lands a screen at about 8, and the audit can tell if they did.
* Left out on purpose: new colours (the brand decides; P-473 fixes only where each brand colour is used), a motion library (P-473), dark-mode design, command palette, illustrations (rubric §1 "Where we deliberately do NOT follow a source").
* The numbers (120 words, 5 boxes, 3 sizes, 1 filled button) are starting values from the baseline and the sources (GOV.UK question pages, NN/g progressive disclosure, BIC-19). The Lead can tune them after round 2 with the crawl's counts, and records the change as a decision.
