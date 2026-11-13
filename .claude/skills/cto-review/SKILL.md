---
name: cto-review
description: The tech lead's CTO review across both teams (ours and a partner team whose product we build into) - three lights on the partner team's flow, DORA four keys for each side against the DORA bands, capability flow, what goes well and badly, our struggles, the next actions and neutral items to raise - read-only, teams never people, a private one-pager plus a neutral share version. Use weekly (Monday IST), at each integration-proof milestone, at a gate, or when the founder asks "how are both teams doing?".
---

# CTO review: how both teams deliver, on evidence (P-515)

The Lead runs it; no lane does. **Generic file:** no team, repository or person names here. The partner team's repositories, the promised-items list and the proof's timing log live only in the private notes folder named in STATE (P-504); read their paths from there.

## Why these measures (P-515, framework compared before chosen)
DORA four keys as the base (objective, straight from GitHub for both sides, no surveys); the Flow Framework's items finished per week and time per item, counted in capabilities. SPACE and DX Core 4 were declined (survey-heavy for small teams); Apache DevLake declined for now (a new running system holding the partner's private data; re-assess only if more teams or repositories join, through STANDARDS §1).

## Hard rules
* **Read-only on both sides.** GitHub API reads with the founder's owner access; never a write, comment, label, issue or rule change in the partner's repositories.
* **Teams, never people.** No individual names, counts or rankings anywhere.
* **Never ranked side by side** (DORA's own guidance: its keys are not targets and not for comparing teams). Each side is shown against the DORA bands on its own.
* **The three lights are agreed with the partner's lead before any is reported** outside the founder's private page.
* **Proxies are labelled.** "First commit to main line" stands in for lead time and "reverted or main line red" for change failure (their deploy trigger and incidents are not visible to us): write "(proxy)" next to each.
* **Evidence for every claim** (a query, a count, a link); a number with too small a sample says so ("n=3, too few to judge").
* DORA bands come from the newest DORA report, cited with page and date (P-170); if not checked this run, write "band not checked", never a remembered number.
* Report style: the founder's (visual, bullets, plain words, times in IST from `TZ=Asia/Kolkata date`, codes with their purpose).
* Tokens: filter every API answer to the fields needed (P-440); Sonnet or Haiku sub-agents for the counting (P-436 (6)).

## Reads
1. **Ours:** merges, pull requests, check runs on `main`, qa verdicts (`qa/CAPABILITIES.md`), `tools/flow-measure.py` and `tools/factory-board.sh`.
2. **Partner's** (paths in the private folder): commits to the main line, pull requests (opened, first review, merged), check runs on the main line; the last 4 weeks for averages.
3. **The integration proof's timing log** and **the promised-items list** (item, date they gave, date it landed).

## Report (private one-pager in the notes folder, `cto-review-<YYYY-MM-DD>.md`)
1. **Three lights** (P-515 step 8), each green / amber / red with one line of evidence:
   * Promised items on time: green on or before their date; red more than 5 working days late, or no date after 2 weeks.
   * Review wait on our pull requests in their repository: green median under 1 working day; red over 2 working days two weeks running. **Not started until our pull requests exist there** (write "not started").
   * Their steady flow: green steady or rising and main line green; red when flow halves against their own 4-week average or the main line is red more than 2 days.
   * Two reds in a row on the same light → recommend one conversation between the founder and their lead, with the evidence and one offer of help; no blame, no public scoreboard.
2. **DORA four, each side on its own against the bands:** changes reaching the main line per week; first commit to main line (proxy); share reverted or turning the main line red (proxy); time from red to green.
3. **Capability flow:** our capabilities live in their product (switched on per firm), finished per week, time per capability; their release cards moving to Built.
4. **Each side:** what goes well and what to improve, each with its evidence.
5. **Our struggles** and the next three actions (owner = a role, a date in IST).
6. **Items to raise with the partner team:** neutral wording, the evidence, one offer of help each.

The founder's own module is reported apart: he ships it his way in his folder; code that lands on their main line still passes their gates.

## Share version (only when the founder asks)
Sections 1 (only lights already agreed with their lead), 2 and 6, neutral words, no internal struggles or plans; the founder reads it before it goes anywhere. Sending it is his act, never the Lead's.

## After the run
One line per light and the top action in the next report to the founder; a red that needs his decision goes in the end-of-turn box (P-512). Record a new rule only through DECISIONS.
