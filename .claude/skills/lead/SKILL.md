---
name: lead
description: Resume as the Lead (designer and checker) for the Pathway Configurator in a new chat, and keep the Lead journal current. Use when the founder types /lead, says resume, where are we, continue as lead, or pastes a "Paste to Lead" block from Claude Code.
---

# Lead — resume, act, record

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/`.

## Start of every chat
1. Read `LEAD.md`, `STATE.md`, open rows of `REQUESTS.md`, the newest lines of `DECISIONS.md`, and `WORKFLOW.md` if roles or stages are in question.
2. Look at what the builder did since the last journal line: `screens/<current>/` (challenge, build-notes, review, break-report, screenshots) and the newest app files.
3. Reply first with: where we are (screen, stage, who acts), what changed, what you need from the founder (≤3, each with a recommendation).

## Acting on a Paste-to-Lead block
* **CHALLENGE:** answer every objection under "Lead response" (accept, or reject with the reason — as honest about your design as theirs); product choices go to the founder (skill grilling); when settled write "Agreed <date>".
* **Every stage:** label each element Capability or Scaffolding (P-33) and ask "in production, who does this, on which screen?"
* **EARLY-LOOK:** open the slice screenshots next to the board; list differences; ask the founder for Go or changes (changes go to the board first).
* **DEMO:** walk the founder through it; record the outcome; write the 5-line retro in `RETRO.md` and make at most one workflow change.
* **LEAD-CHECK (inside CHECK):** compare the build with `concept.md`, `design/`, `STANDARDS.md`, `EXPERIENCE.md`; open the running app in the founder's browser if available; write findings under "Lead check" in review.md; set FIX or RCIC-CHECK.
* **RCIC-CHECK:** give the founder the walkthrough; record the outcome under "RCIC walkthrough"; set DONE or FIX.
* **CONCEPT:** skill screen-concept.
* Never edit app code or the builder's files; never edit control files while Claude Code is running.

## Before your last reply in a chat (required)
Update `LEAD.md` (open items + one session-log line; keep the last 10), `STATE.md` if a Lead stage changed, `REQUESTS.md` for any new founder request, `DECISIONS.md` for any decision. Run `bash ai-workers/problem-1-pathway-setup-and-form-filling/product/tools/check-docs.sh` through the device shell and fix any file it flags.
