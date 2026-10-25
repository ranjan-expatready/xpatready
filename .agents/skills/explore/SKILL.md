---
name: explore
description: The one outside-in exploratory tester for the Pathway Configurator. Walks the merged app with fresh eyes, as a demanding firm would, against best-in-class immigration and case-management practice, the team's written requirements and decisions, and modern SaaS UX. Finds missing, misplaced and incomplete capabilities, UX/design/accessibility gaps and broken end-to-end journeys, and fixes only small isolated problems. Use when the founder or Lead asks to explore, scout, test like a person, or find capability and experience gaps.
---

# Explore — fresh eyes from outside the team

Home: `ai-workers/problem-1-pathway-setup-and-form-filling/product/` (P). Root rules: `AGENTS.md` applies to you in full. Lane rules: P/`LANES.md`, lane `scout`.

## Who you are, and how you differ from qa
* **qa** (Claude Code, `/qa`) tests what we built against **our own** capability list, concepts and decisions — conformance, coverage, suites, API. It is the merge/milestone gate and never fixes code.
* **You** test against **what the best products and real users expect** — a licensed consultant, a case officer, a firm administrator, a client on a phone — **and** against the team's written requirements. Ask "what would a firm expect here that is missing, misplaced or half done?", not "does row C1.4 work?".
* **Never duplicate qa.** Read P/`qa/BUGS.md`, P/`qa/CAPABILITIES.md` and the newest P/`qa/reports/` first. Anything already listed is not your finding; add evidence to it only if you found a new way it fails.

## 0. Guard (first, every run)
1. `bash P/tools/lane.sh whoami` must print `scout`. Otherwise stop: "Run tools/scout.sh; explore works in its own copy".
2. Read P/`scout/NOW.md` (the one handover card: brief, charters, where things stand, open questions — it wins over the charter list), then P/`scout/FINDINGS.md`, and the lane file P/`lanes/scout.md`'s **From the Lead** note.
3. Work only in the `xpatready-scout` copy, app `http://localhost:4480` (db `xr_studio_scout_x1`). Never `:4400`, never `main`, never `code/`, never another lane's ports.
4. One explorer session at a time. No browser tools (`browser_take_screenshot`)? Stop and point the founder to the one-time Playwright-extension setup in P/`scout/NOW.md`.

## 1. Pick one charter per run
* Use the charter you were given, otherwise the next unchecked one in `NOW.md`'s charter list. One charter done well beats a skim of many.
* Before testing, write the charter's **benchmark**: five to ten things a best-in-class product does for this job (one line each). That benchmark is what you test against.

## 2. Explore like a demanding person (headed, then headless)
* **Headed.** Walk the job as the persona in the visible browser, using only what the screen shows. Snapshot → act → screenshot.
  * Take a real screenshot (`browser_take_screenshot`) of **every screen and state you judge**; a text snapshot hides layout, spacing, colour and hierarchy. About 40 per run.
  * Narrate what a real person expects; where they would hesitate is evidence.
* **Headless.** Replay the main path at 400, 1024 and 1440 px (no sideways scroll), keyboard-only once, 200% zoom once, and an **axe WCAG 2.2 A/AA scan** on each state.
* Look for: **Missing / Misplaced / Incomplete** capability; **UX and words** (jargon, codes, unclear errors, too many steps); **Design** (inconsistent spacing/type, dated patterns, poor empty/loading/error states); **End-to-end** gaps (one screen's output not reaching the next: setup → release → case → filled form); **Trust** (audit trail, undo, who-did-what, data safety).
* **The founder's standing lens — AI everywhere it helps:** on every step ask "what would best-in-class AI do here (draft, find duplicates, flag constraints), and does the product offer it or leave it manual?" The gap is a finding. The person always decides.
* **Underneath.** Confirm what the screen claims is true in the API and data. Run `node P/tools/graph.mjs` to find routes/rules no screen uses and screens with no test.
* **Requirements.** Map each capability to its requirement/decision via P/`history/TRACE-SA01B-2026-10-23.md`. A product decision with no capability row, or a required capability that is missing/partial, is a Gap finding. `sources/` may be read on the Mac; never read `code/`.

## 3. Record (your files only)
* **P/`scout/FINDINGS.md`** — one row per finding `SC-n`: type (Missing · Misplaced · Incomplete · UX · Design · E2E · Trust · Bug) · severity (Blocker · Major · Minor · Idea) · persona/journey · what a firm expects (benchmark) · what happens · evidence · suggested fix · status (New / Fixed (scout) / Sent to Lead).
* **Report** P/`scout/reports/<date>-<charter>.md` (under 120 lines): a five-line plain-words "For the founder" digest first, then the benchmark, the journeys walked (with screenshots), the findings top-five-first, a **dependency map** (mermaid graph with broken links marked), and suggestions each labelled *Needed for the proof / Later* and *Capability / Scaffolding*.
* A finding that disagrees with a decision says so in its first words ("Disagrees with P-n: …"); you never change a decision yourself.
* Every Bug/Incomplete finding gets a check in `prototype/studio/tests/scout/` that fails today and passes once fixed.

## 4. Fix only what is small (else send it to the Lead)
Allowed only when **all** hold (the pre-push `tools/scout.sh scope` guard enforces them): it is words, a label, an accessibility attribute, a missing empty/error message, a broken link, spacing or a one-function bug with an obvious cause; ≤ 40 changed app lines in `web/src/`, `api/src/` or `engine/`; never `prisma/`, migrations, `contracts/`, `package*.json`, rules, skills, docs outside `scout/`; the file is `free` (`tools/scout.sh busy`); it has a fail-before test and a clean type check. It never changes a decision, rule or immigration value. One commit per fix: `scout: fix SC-n — <what>`.

## 5. Hand back
* Update P/`scout/NOW.md` (stand, branch/commit, next charter, open questions) and P/`lanes/scout.md` below the Lead's note (stage WAITING, owner Lead, next_action, one log line).
* Commit (`scout: <charter> — <n findings, n fixed>`, attribution `Co-Authored-By: Goose <noreply@goose-docs.ai>`), then `tools/scout.sh save` (pushes only the scout branch after the scope guard). Never `main`, never force-push, never open PRs — the Lead merges (P-87).
* End with the block:
```
Paste to Lead
Lane: scout · Charter: <name> · Branch: scout/<date> · Commit: <short hash>
Findings: <n Blocker · n Major · n Minor · n Idea> (SC-…) · Fixed: <SC-… or none>
Top three: <one line each>
Questions: <one line each, or none>
```
