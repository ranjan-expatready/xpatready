# How to run an epic review with the product owner (22 Oct 2026)

The method used for the AG-04 review. Read this before starting any epic review.

## Before asking
- Check what is already decided (decision log `FINAL-SuperAdmin-FR/TEMPLATE-MAP-working_2026-10-10.md`, product rules in Agent `00-Overview` → "Product rules every epic follows") and what is already built (code, cite `path:line`).
- If it is already decided, don't ask: say it is decided and apply it.
- Check every recommendation against other decisions and other epics first.
- Say upfront how many questions there are.

## Confidence standard (the product owner, 23 Oct — applies to every session)
- Research deeply before recommending (decision log, epics, code `path:line`, web research through agents) so the recommendation reaches **90–95% confidence**. This is the product moat.
- No needless assumptions, hypotheses or far-fetched edge cases; cover the realistic day-to-day cases and stop.
- When in doubt, ask the product owner rather than deciding by assumption.

## Real value, not nudging (the product owner, 26 Oct — applies to every decision and every feature; SA1B-D117)
- "Unnecessary reminding and overdoing is not a feature; firms will consider it spam … intuitive but not poking."
- A reminder, notification or automatic to-do exists only when it protects something a person would otherwise miss **and** that has a real cost: a government deadline, a document or status expiry, money owed, or a legal step.
- Everything else is **shown where the person already looks, never pushed**. No feature adds nudges to look busy. Test every recommendation against this before asking the product owner (strengthens AG16-42 "quiet by default").

## Every question must have all of these (no exceptions; one question per message)
1. Title: "Question n of N: <plain question>"
2. Today: what the documents and the code say now, with `file:line`.
3. Example: a real situation with names (Client B the client, Client C and Client F the staff).
4. Options, each with its pros and cons; the recommended option first; 2 options, 3 at most.
5. Now vs recommended: one line on what changes compared with today.
6. Recommendation: "I recommend a because ..." naming the principle.
7. Confidence: a % plus what would make b the better choice.
8. Effort: clicks added or removed for staff, and what the person still decides.
9. Ends with: "Reply a or b."

Also:
- Put several small confirmations in ONE question with "a) accept all".
- Never ask below 90% confidence without saying why.
- Plain short English, no jargon. Long outputs overwhelm the product owner.

## What the product owner prefers
- Keep it simple. Use what exists. No new settings, no extra flexibility.
- Built stays: the spec follows the code unless the product owner has ruled it out.
- Each person controls their own work (e.g. their own calendar, any hours).
- Never move a day-to-day feature to Release 2.
- If he asks "are you sure?", re-check for real. If something was wrong, say so plainly.

## After he answers
- Record each decision in the decision log right away: ID (e.g. `AG05-D1`), his exact words, Home, Epics affected.
- When all questions are done:
  - Back up the files.
  - Apply every decision to the epic AND every affected epic in the same pass. Each file gets a change-log row and a row in "Decisions that change this epic".
  - Same-day changes go in place.
- Use parallel writers for big edits; check their reports and fix leftovers.
- Verify before saying done:
  - Every decision appears in every affected file.
  - Each folder has only one current version of each document.
- Update the hand-over notes and `DEV-TASKS` (code changes, with `path:line`).
- Final report:
  - Keep it short.
  - List every file touched, anything not backed up and anything still open.
  - Never say "done" before it is checked.
  - Local files only, no artifacts.
