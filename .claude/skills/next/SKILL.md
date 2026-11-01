---
name: next
description: The builder's command for the Pathway Configurator: /next screens, /next forms, /next runtime or /next evidence, optionally followed by a backlog row or the founder's ask. Takes one small item, builds it with tests on a branch from main, has the reviewer agent approve it, and opens a pull request that merges by itself on green checks (P-189). Redirects a wrong copy. Use when /next is typed or someone says continue, next or carry on in a builder session.
---

# /next <area> [item] — one small item, start to merged

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). The way of working: P/`WAY-OF-WORKING.md`. Work list: P/`BACKLOG.md`.

## 1. Guard
`bash P/tools/lane.sh whoami`: `lead` → "This is the tech lead's copy: type `/lead` here." Stop. `qa` → "Type `/qa <mode>` here." Stop. `unbound` → `lane.sh bind <area>`. Bound to another area → name it and stop. Then `lane.sh setup` and `git fetch origin && git merge --no-edit origin/main` (a conflict: list the files, change nothing, tell the tech lead).

## 2. Pick and size
* The item is the one named in the message, else the top open row for your area in `BACKLOG.md` (Now, then Next).
* **Under one day and one area.** Bigger: split it, build the first part, and list the rest in the PR. One founder ask about one screen = one PR touching only that screen.
* **A founder ask: check it first, in minutes.** Does it fit the decisions (`DECISIONS.md`) and the agreed board? Does it change another screen, another area's files or a later backlog row? Clean → build. A knock-on effect → one plain line to the tech lead (what else moves, and your recommendation) before building.
* A new screen with no agreed board, or a product choice nobody has made → stop and tell the tech lead (design comes first). Never build on a decision the founder has not agreed.

## 3. Build (branch `claude/<area>-<word>` from `main`)
* Screens: skill **screen-build**. Backend: the record, API, rule and contract, with a **passing and a failing test per business rule**; check labels name the capability ids they prove (`C1.6: …`); `node P/tools/graph.mjs --check` passes.
* Reuse first: the filling and barcode tools, `prototype/evidence-lane/E1`, p1–p5, `research_notes/` (never rebuild them).
* Your own files only; a change to the database schema or `contracts/` shared with another area → say so first in the PR's opening line.
* Own ports and databases (yours in `WAY-OF-WORKING.md`), never :4400; **never set `*_LIVE=approved` by hand** (only through `run-suites.sh` or a test's usage line, which pair it with the fake launcher, P-192), never click a priced button; state any AI cost before a paid run (the founder approves it).
* Immigration values from official sources (page, quote, date) or labelled Sample; no personal names.

## 4. Check, review, PR
1. Run the suites your change touches: `bash P/tools/run-suites.sh --changed origin/main..HEAD`, all green, before the label (P-217: a batch that fails on your PR costs the whole queue about 15 minutes). When it selects ALL (a shared contract), run only the suites of the files you touched, by their usage lines; the batch's four machines run the rest. Branch every item from `origin/main`; never build on an unmerged PR.
   A test you touch: any wait you rely on fails loudly when it times out (no `.catch(() => undefined)` after a wait); fix the ones you meet, nothing more.
2. Launch **screen-reviewer** on the exact commit; also **screen-breaker** for a new screen, money, permissions or a migration. Fix every Blocker and Major with a fail test; fix the Minors or list them in the PR.
3. `git push -u origin HEAD`; `gh pr create --base main` with: what and why (the backlog row or decision), the acceptance checks and their results, before and after screenshots for any visible change, one line **"On the demo:"** naming the page at :4400 and what to try (the tech lead passes it to the founder after the merge), the cost (US$0), and your context share. **The title names the capability IDs it moves** (`forms: C11.15 — …`), and the PR sets those rows in P/`qa/CAPABILITIES.md` to "Built, awaiting qa" (P-219). Pick "Not built" capabilities of your feature first; Minor bugs go in one PR per area per day ("context: N%"). **Finish the item, then hand over (P-218):** from 60% start no new item, finish the one in hand to approved and labelled, write a Handover comment and stop; hard stop at 80%.
4. **Keep going (P-202).** Once the reviewer approves and the label is on, the merge queue takes it from there: start the next item of your feature at once, on a fresh branch from `origin/main`. Never sit waiting for a merge. Questions go in the PR under "Questions"; the tech lead brings product questions to the founder and messages you the answer.
4. When the reviewer approves the code as it is now: `gh pr edit <n> --add-label "review: approved"`. The PR merges by itself on green CI and the demo updates. **Any later push needs a new review and the label again.** CI red → read the log, fix, push.

## 5. Reply
One short report when the PR is open or merged: PR link, what changed in plain words, the checks, and anything needed from the tech lead or founder. No lane file and no "Paste to Lead" block: the PR is the record. **Never wait for a human inside the session:** every question goes in the PR under "Questions", with your recommendation, and you carry on with the next item; the tech lead collects them. Disagree with evidence in the PR or in `screens/<item>/challenge.md`; never deviate silently.
