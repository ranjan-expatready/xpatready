# Devin D5 — independent bug and gap hunt (3–4 h explorer)

Devin (outside checker, report only — P-146) ran the D5 prompt from `inbox/DEVIN-PROMPTS.md` on `main` `de82e7fd` (PR #141 merged). App walked on an isolated copy (`tools/isolated.sh explorer 4410`, fresh `xr_studio_explorer`, the demo at :4400 untouched); every check US$0 — no `STUDIO_*_LIVE` variable and no AI key set anywhere; the browser used the saved answers. `qa/BUGS.md` was read first: findings already listed there carry the QA id and new evidence only. Findings newest first, grouped by Part; each has steps, expected, actual, evidence and a suggested owner. Verify each before acting.

## Part 1 · Walking the product like its users

**E-1 · Bug · Minor · lane: tech lead (tooling)**
Set-up step fails on the Mac itself. Steps: on macOS run `bash product/tools/cloud-setup.sh`. Expected: idempotent setup completes. Actual: exits 1 after `== zsh and locale` — the script greps `locale -a` for `^en_US.utf8$`, but macOS spells it `en_US.UTF-8`, so it falls into `apt locales` which cannot run off Linux (`apt()` returns 1, `set -e` aborts). Everything after (venv check, PostgreSQL, databases, migrate, web build, official-PDF checksums, hooksPath) never runs. Evidence: `product/tools/cloud-setup.sh:39`; run output: `== node 24.21.0 … == zsh and locale` then `Exit code: 1`; `locale -a | grep en_US` shows `en_US.UTF-8`. Impact here: low (the Mac was already set up; I ran the rest by hand), but any fresh Mac copy or a Mac CI step dies at the same line. Suggested: accept both spellings (`grep -qiE '^en_US\.utf-?8$'`).

_(Part 1 continues — pushed as I go.)_

## Part 2 · Checking the claims in `qa/CAPABILITIES.md`

_(pending)_

## Part 3 · Looking for surprises before they happen

_(pending)_

## Part 4 · Reviewing how we work

_(pending)_

## Top 10 for the tech lead

_(pending)_
