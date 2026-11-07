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

## Score (Met · Partly · Not met · N/A), revised after the challenge
The study's applicability table lists BIC-02, 04, 08, 10 and 12 for C6.9, plus the six that apply to every screen.

| Id | Score | Evidence |
|---|---|---|
| BIC-01 Ask once | N/A | The page asks nothing; it reads facts on file |
| BIC-02 Asked for a reason | **Partly** | Each rule shows the facts it read and their values (shot 1). A missing fact on a rule links to the top of the Agent view (`eligibility.tsx:223`), while the "rests on" line links to the exact question (`:202`) |
| BIC-03 No stale answers | Met | "Out of date: X changed from A to B … Run again" (`:191`); the pack's out-of-date lines pass |
| BIC-04 Incomplete is normal | Met | A fact not answered never gives Not eligible on its own (P-229 (3)); the pack passes |
| BIC-05 Source on every value | N/A | Not in the applicability table for C6.9. BIC-05's bar is a document's name and page with Accept / Edit / Reject, which belong to the Agent view and C6.4; values here link to the Agent view, where each fact's source and status show (`PRODUCT.md` §4). The first draft scored it and proposed a source label; the challenge showed the label would read the wrong field (`case.ts:240` keeps the latest row's channel, `confirm_section`). Dropped |
| BIC-06, 07, 09 | N/A | No AI, no fact writing, no role change on this page |
| BIC-08 Case structure at a glance | **Partly** | The people list shows name and outcome but no role ("Partner (Sample)" never says Spouse or partner) |
| BIC-10 How the outcome is reached | **Partly** | The outcome lines say "needs N facts", "fails …; also needs …", "the representative reviews this". No line says how the rules combine into one outcome (C6.9 study, improvement 4) |
| BIC-11 One primary action, named | Met | One primary per area: "Run eligibility check" / "Run again"; the rest are secondary (shot 1) |
| BIC-12 Check before it leaves | N/A | **Departs from the applicability table:** this page has no signing or filing step, so there is nothing to check before it leaves |
| BIC-13 Errors | **Partly** | The drawers show field errors ("Give a reason for running again …") but no summary at the top. Each drawer has one field, so the inline error is the only one. No change proposed; listed as a Should |
| BIC-14 Help in place | **Not met** | Help that keyboard and touch users never reach: the `title` on the Score `<span>` (`:197`), on the "Officer's judgement" `<h3>` (`:231`) and on the disabled "Mark reviewed" (`:239`). The outcome pills have no help at all. Breaks `EXPERIENCE.md` §2.10 and §2.12 [M]: a **Must** |
| BIC-15, 16 | N/A | Not filing screens |
| BIC-17 Review | N/A | Not in the applicability table. "Mark reviewed" works: once per check, with a stamp |
| BIC-18 States | **Partly** | Empty state (shot 3), "No eligibility rules yet" and out of date are built. The read-only state after filing (concept §5) is not: `review.md` says "not built yet". It waits on C8.2's filing record, which now exists: a follow-up row, not this revision |
| BIC-19 Low cognitive load by layout | **Partly** | One heading and one primary per panel; red only for Not met. Values show ISO dates ("2029-05-09") on a page that otherwise says "7 Nov 2026". "Score: none (…)" is always shown beside the outcome |
| BIC-20 Accessible | **Partly** | The keyboard path, focus ring, listbox (↑ ↓) and 1024 px all work (probe). BIC-14's unreachable help is the gap; 200 % zoom was not tested |

**Totals:** Met 3 · Partly 7 · Not met 1 · N/A 9. The one Not met (BIC-14) is a Must. The Partly scores are Shoulds: they are fixed below, or listed (BIC-13, BIC-18).

## Concept revision (what changes; nothing else does)
All changes are in `web/src/runtime/eligibility.tsx`. No schema, API shape, money or permission change, so no breaker. No rule changes; all 20 pack lines keep their meaning. All new outcome words go through the existing `outcomeWords`, so the held P-236 rename ("Qualifies · Can't tell yet · Does not qualify", held for the product owner, P-251) stays a single edit.

1. **How this result is worked out (BIC-10, BIC-19).** A Details under the outcome, titled "How this result is worked out". The Score line moves into it, so the score keeps its place (P-164 (1), BR-11) without being always on. It contains:
   * "Every rule must be met. When a rule is not met, the result is Not eligible, even if facts are still missing."
   * "A fact not answered gives Possibly eligible. A rule the representative reviews never gives Not eligible."
   * "When the result rests on answers not yet confirmed, it says so" (P-393).
   * "The lines under Officer's judgement never change the result." The judgement lines themselves still come from the release (BR-1); nothing about a program is written into the page.
   * The score, or "No points score on this application".
2. **Help that a keyboard reaches (BIC-14, Must).**
   * The result's outcome pill and the case card's pills use the existing focusable `Tip` (`components/status.tsx:15`, as `StandIn` does). The text is built from the same parts as `outcomeWords`, so a Possibly that comes from a review rule says so.
   * In the people list, each option's meaning is carried in its accessible name (`aria-describedby`), so the list keeps one tab stop and its ↑ ↓ pattern.
   * The judgement help becomes one visible line under its heading.
   * The disabled "Mark reviewed" shows "Already marked reviewed" as visible text.
   * The Stand-in tooltip is left as it is: it is demo chrome, and the same pattern is used on every screen.
3. **Roles in the people list (BIC-08).** Each name shows the case page's own role words, from `cases.tsx` `roleOf`: "Principal applicant", "Spouse or partner", "Child". The live `role_label` ("Spouse or partner (travelling)") is not used. **Question 1** covers the conflict between `PRODUCT.md` §4 "Dependent child" and the case page's "Child".
4. **A missing fact links to its question (BIC-02).** The link uses the same `lineId` anchor as the "rests on" line, and falls back to `#agent-view` when the line is not found.
5. **Dates (BIC-19).** Date values show as "9 May 2029", both in the rules and in the out-of-date band.

**Tests added, one pass and one fail each, labelled C6.9 (in `tests/check_c69_page_browser.cjs` and the pack):**
* The Details holds the combining rule and the score place, and there is no always-on Score line.
* The result pill's help opens on keyboard focus.
* The people list keeps one tab stop.
* A role shows under each name.
* The missing-fact link carries the person's line anchor.
* No value or band shows an ISO date.

The 20 existing lines must still pass, exit 0, on the configured checkpoint.

**Not changed:**
* the layout, the drawers, the outcomes and their words, the rules, the API, and who may see what;
* the Stand-in chip;
* the shared Pill's 11 px and the 13 px runtime trails (`cases.tsx:182` too). These are cross-screen: **Question 2**.

**Listed, not in this revision:**
* BIC-13: an error summary in one-field drawers.
* BIC-18: the read-only state after filing. This is a follow-up row now that C8.2 exists.
* BIC-20: a 200 % zoom check, at the build's review.

## Questions for the tech lead (recommendation first)
1. **"Child" or "Dependent child".** The case page says "Child", and `PRODUCT.md` §4 says "Dependent child". **Recommended:** use the case page's words here, so the two pages agree, and ask the founder on his list which word stays.
2. **Cross-screen type sizes.** The shared Pill uses 11 px, and the runtime trails use 13 px (in 13 files). **Recommended:** one screens row that moves both onto the team scale.

## Challenge
A fresh Opus challenge returned "Build after these changes", with 5 Majors and 9 Minors. Its findings and the answers are in `challenge-ux-2026-11-07.md`. The build starts only after the tech lead's approval comment.
