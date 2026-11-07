# C6.9 case check (staff eligibility page): UX score and concept revision, 7 Nov 2026

**What this is.** This is step 3, screen 1 of P-407. It is scored against the best-in-class scorecard BIC-01 to BIC-20 in `design/best-in-class-m3-case-screens-2026-11-07.md`. The scorecard joins `EXPERIENCE.md` §6 with step 2 of P-407.

**This is design only.** Building waits for the tech lead's approval comment on the PR (P-316 (3)). Live AI is off and the cost is US$0.

**How it was scored:**
* A fresh isolated copy `ux69` on :4441, at main 766a1131, with Demo › Load the configured checkpoint (100 s).
* The C6.9 pack on that copy: **20/20 passed, exit 0**. This is the baseline every revision must keep.
* The checkpoint's family case SAMPLE-VV-FAMILY-1 (four people). The check was run once per person through the product's own API, as the case officer.
* Screenshots in `ux-2026-11-07/`, taken at 1440 and 1024 px (device scale 2):
  * 1: the result at 1440;
  * 2: the result at 1024;
  * 3: the empty state at 1440;
  * 4: the case page card at 1440.
* A keyboard and DOM probe at 1024 px. Tab reaches the trail, Run again, the people list, Override, Mark reviewed and History. Focus is a visible 3 px ring. ↑ and ↓ move the people list (listbox, `aria-selected`). The page is 1024 px wide, with no sideways scroll.

**The board is intent, not pixels (P-44).** C6.9 has no board. Its concept (`concept.md` §4, P-223 (4)) is the intent kept here: Workspace pattern, people on the left, the result on the right, drawers, never modals.

## Score (Met · Partly · Not met · N/A)
| Id | Score | Evidence |
|---|---|---|
| BIC-01 Ask once | N/A | The page asks nothing; it reads facts on file |
| BIC-02 Asked for a reason | **Partly** | Each rule shows the facts it read and their values (shot 1). A missing fact on a rule links to the top of the Agent view (`eligibility.tsx:223`), while the "rests on" line links to the exact question (`:202`). The person must find the question themselves |
| BIC-03 No stale answers | Met | "Out of date: X changed from A to B … Run again" (`:191`); pack C6.9 out-of-date lines pass |
| BIC-04 Incomplete is normal | Met | Not answered gives "Possibly eligible — needs N facts", never Not eligible (P-229 (3)); pack passes |
| BIC-05 Source and confirm on every value | **Partly** | Values show "(not confirmed yet)" when unconfirmed (`:221`). They never show where the value came from (Document, Client, Case officer), although the engine already keeps it (`engine/runtime/case.ts:240`, `source`) |
| BIC-06 Honest confidence | N/A | No AI on this page (C6.9-14) |
| BIC-07 Conflicts | N/A | The page writes no facts |
| BIC-08 Case structure at a glance | **Partly** | The people list shows each name and outcome, but not the role: "Partner (Sample)" never says "Spouse or partner", although the case carries `role_label` |
| BIC-09 Principal change | N/A | Not on this page |
| BIC-10 How the outcome is reached | **Not met** | Nothing on the page says how the rules combine into one outcome. The C6.9 study (`reports/best-in-class-C6.9-A4-2026-11-07.md`, improvement 4) and DMN's visible hit policy both call for it |
| BIC-11 One primary action, named | Met | One primary per area: "Run eligibility check" / "Run again" in the header; Override, Mark reviewed and History are secondary (shot 1) |
| BIC-12 Check before it leaves | N/A | No signing or filing here |
| BIC-13 Errors | Met | Drawer errors on the field ("Give a reason for running again …"); "Nothing was run" with the cause (`:162`) |
| BIC-14 Help in place | **Not met** | Three help texts are `title` attributes on elements that cannot take focus: the Score line `<span>` (`:197`), the "Officer's judgement" `<h3>` (`:231`) and the case-card "Out of date" pill (`:90`). Keyboard and touch users never reach them (USWDS tooltip [27]). The outcome pills ("Likely", "Possibly", "Not eligible") have no help at all. The Stand-in tooltip names internal terms ("AG-03 Qualifier"; `EXPERIENCE.md` §5) |
| BIC-15 / BIC-16 | N/A | Not filing screens |
| BIC-17 Review | Met | "Mark reviewed" once per check, with a stamp naming duty and licence; the History drawer lists each run |
| BIC-18 States | Met | Empty state teaches the first action (shot 3); "No eligibility rules yet"; out of date; read-only after filing (concept §5) |
| BIC-19 Low cognitive load by layout | **Partly** | One heading and one primary per panel; red only for Not met. Three faults: (1) "Score: none (this application has no points score)" is a line about something that does not exist, always shown beside the outcome; (2) dates in values are ISO ("2029-05-09") on a page that otherwise says "7 Nov 2026"; (3) the trail and the card link use 13 px, off the team scale (`:84`, `:134`; `EXPERIENCE.md` §1 [M] 12/14/16/18/24) |
| BIC-20 Accessible | Met, except BIC-14 | Keyboard path, focus ring, listbox and 1024 px all work (probe); headings h1 › h2 › h3 in order |

**Totals:** Met 8; Partly 4; Not met 2; N/A 6. The two Not met are BIC-10 and BIC-14. BIC-14 is a Must, because it also breaks `EXPERIENCE.md` §2.10 [M] (tooltips on every status) and §2.12 [M] (keyboard path for every task). The others are Shoulds.

## Concept revision (what changes; nothing else does)
All changes are in `web/src/runtime/eligibility.tsx`, plus a source label read from data the API already returns or can add read-only.

The revision changes no schema, money or permissions, so no breaker is needed. No rule changes, and every C6.9 pack line keeps its meaning.

1. **How this result is worked out (BIC-10, BIC-19).**
   * **What:** replace the always-on Score line with a Details under the outcome, titled "How this result is worked out". It says: "Every rule must be met. A rule not met gives Not eligible. A fact not answered gives Possibly eligible, never Not eligible. A rule the representative reviews never gives Not eligible. Money, health, ties and leaving are the officer's judgement and never change the result." Then, only when the program has a points score: "Score: …".
   * **Why:** the user sees the combining rule where they read the result, and the line about a score that does not exist goes away.
2. **Outcome help that a keyboard reaches (BIC-14, Must).**
   * **What:**
     * Each outcome pill (list and result) gets a tooltip on a focusable trigger, giving the outcome's meaning in one line. Example for Possibly eligible: "Possibly eligible: no rule failed, but N facts are not answered yet."
     * The "Out of date" pill gets the same treatment.
     * The judgement help moves from the `<h3>` `title` into one visible line under the heading: "IRCC's officer decides these; they never change the result."
     * The Stand-in tooltip says "Later, the team's eligibility engine fills this page and adds scores, cut-offs and advice." It no longer says "AG-03 Qualifier".
   * **Why:** `EXPERIENCE.md` §2.10 and §2.12; USWDS: use tooltips "only on elements that appear interactive" [27]; the help needed to act is shown on the page.
3. **Each person's role in the people list (BIC-08).** The role goes under the name: "Principal applicant", "Spouse or partner", "Dependent child". It uses the case's own `role_label`.
4. **Where each value came from (BIC-05).**
   * **What:** each value read reads, for example, "Passport number: Z7000001 · from Document · confirmed", or "… · from Client · not confirmed yet".
   * **How:** the source words come from the engine's `source` channel, mapped to the three words in `PRODUCT.md` §4 (Document, Client, Case officer). The run already freezes each input's value. The builder adds the source to the frozen input on new runs only, so older runs show the value without a source.
   * **Open question:** if adding the source would change the stored result shape, that is a shared-contract change: Question 1.
5. **A missing fact links to its question (BIC-02).** "Passport number → Answer in the Agent view" opens that person's exact question, using the same anchor as the "rests on" line (`:202`), not the top of the Agent view.
6. **Dates and sizes on the team scale (BIC-19).**
   * Date values show as "9 May 2029", in the same form as the rest of the page.
   * The 13 px trail and card link move to 12 px.
   * The shared Pill's 11 px is not this screen's to change. It is listed for the tech lead, not changed here.

**Tests added (one pass and one fail each, labelled C6.9):**
* the Details holds the combining rule, and no Score line shows for Visitor visa;
* each pill's help opens on keyboard focus;
* a role shows under each name;
* a value shows its source word, and an older run shows none;
* the missing-fact link carries the person's question anchor;
* a date value never shows in ISO form.

The 20 existing lines must still pass, with exit 0, on the configured checkpoint.

**Not changed:** the layout, the drawers, the outcomes, the rules, the API routes, who may see what, and the client view (none).

## Questions for the tech lead (recommendation first)
1. **Source on frozen inputs (revision 4).** Adding `source` to each input frozen in a new run's `result_json` is additive. It makes no schema migration, because `result_json` is already JSON. **Recommended:** allow it as an additive field, named in the PR's first line as a changed shared shape. The alternative is to show the source from today's facts, which can disagree with a frozen run.
2. **The shared Pill's 11 px.** **Recommended:** a separate screens row, because it touches every screen.

## Challenge
A fresh Opus agent challenged this concept, and its verdict and answers are on the PR. The build starts only after the tech lead's approval comment.
