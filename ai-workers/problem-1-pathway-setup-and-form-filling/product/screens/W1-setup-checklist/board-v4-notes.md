# Board v4 notes: the simple Programs card (R-144), for the Lead to fold into the concept

Screens lane, 30 Oct. Board: `design/draft-board-v4.html`. `concept-draft.md` belongs to the designer agent, so this file proposes the replacement text instead of editing it. Nothing else in concept v3 changes: the five steps (§4), duty and tier (§5), where each problem and proposal belongs (the §6 tables), the Overview, tabs and landings (§7 after "Card"), the contract and cache (§8), and slices A, B and C. Slice A needs no change for this board.

## Proposed text for §6, first paragraph (states)
The **card shows the draft's steps and nothing from the release except "Live"** [F R-144]. Not started: "0 of 5 steps", empty edge bar, **Start setup**. In progress (1–4 steps done, or all five done but not released): "n of 5 steps", n parts of the edge bar, **Resume setup**, which lands on the first open item. **Not ready** (its own release fails a check): the release's problems become open items on their steps, **first, before any draft item**; step 5 reopens, so the card reads "n of 5 steps", **Needs you** for the author ("Firms cannot open cases until n problems are fixed"), **Resume setup**. **Live**, with or without unreleased changes: "✓ Live", full green edge bar, **Open**; the release number and "Changes since Release n" show in the combination page's header. Live with back-filled pages: still "Live"; step 1's item shows on the page, and Needs you appears for whoever confirms it (§5 tier). **Retired:** "Retired at Release n", no bar, **Open**. **Just added:** the Not started card, scrolled into view and outlined for 2 s, with no extra text. Loading: a skeleton card. Error: "Setup steps could not be worked out." with Retry; Open still works.

## Proposed text for §7, the "Card" sentence and the button map
**Card** [F R-144, P-115, P-128]: five things only: (1) the combination's name as the heading; (2) the full trail, one small grey line that ends in "…" when long, with the full trail on hover and for screen readers; (3) one progress line, "n of 5 steps" or "✓ Live", with a 2 px five-part edge bar along the bottom that only repeats it (aria-hidden, never the only signal); (4) **Needs you**, a small mark top right, only when an item on the viewer's duty and tier waits (§5), and its hover says what and how many; (5) one button, the same place and size on every card, in the one primary colour: **Start setup** · **Resume setup** · **Open**. For a person without the author duty the button is **Open** in every state (Q1). The rest of the card also opens the combination. Gone from the card: chip, "n of 5 done · Next: …", facts line, "Next: …" line, release numbers, AI problems and progress, rule codes, system phrases. They live on the combination's Overview.

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

## Page around the cards
* Filter bar stays (P-128): Find · status chips **All · Not started · In progress · Live** (· Retired while any) · **Needs you** toggle · Cards / List (P-115). "Needs work" and "Not ready" fold into In progress and Needs you (Q2).
* Sections: Pathway, then Program, each header with one quiet count "n of m live", folding open or closed, with the fold state remembered per person. A filter or search opens every section holding a match and hides the rest.
* List: one line per combination: name, trail, five-part mini bar with "n of 5" or "Live", Needs you, the button. With Needs you on, each Pathway line says how many need you.
* Columns: 4 at 1440 px, 3 at 1024 px, 2 at 800 px, 1 on a phone.
* Speed: the 150-combination timing test stays (§8).

## One button colour (R-144 point 6)
One token, `--color-primary`, for every primary button. Contrast was worked out (WCAG formula) on white and #f7f7f7:
| Option | Text on fill | Fill against white | Note |
|---|---|---|---|
| **A · brand blue #0862C5 (recommended)** | white 5.89:1 (hover #054E9C 8.15:1) | 5.89:1 | the team's token today (tokens.css primary-600); nothing new; green stays "Live / done" |
| B · green #15803D | white 5.02:1 | 5.02:1 | passes, but reads as a status beside ✓ Live; a new token outside the brand kit |
| C · light green #DCFCE7 | #0F5C2E 7.38:1 | 1.10:1, needs the #16A34A border (3.30:1) | the weakest call to action; the same meaning clash |
The founder suggested light green; A is recommended for the reasons above, and B and C are shown on the board so the founder can choose.

## Questions for the founder (recommendation first; on the board, §7)
1. **Q1** The button for people who do not set up: **Open** on every card, with Needs you telling them when they must act (otherwise "Resume setup" offers an act the server refuses).
2. **Q2** Status chips: **All · Not started · In progress · Live**, plus Needs you (otherwise keep Not ready as a fifth chip).
3. **Q3** Button colour: **A, brand blue** (otherwise C, light green with a border).

## For slice B (not built now)
Tests: the card shows exactly the five things (no chip, Next line or rule code: a text scan fails on "P-\d+", "Release \d" or "Next:"); the button word per state and per duty; Needs you only when the viewer's item waits; one primary colour (every `.primary` button computes the same background); fold state remembered; List row content; 1440, 1024, 800 and 375 px; 150 combinations within the concept's timing budget.
