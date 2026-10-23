# Workflow — three roles, one loop, nobody marks their own homework

## Roles
| Role | Where | Does | Never |
|---|---|---|---|
| **Founder** (product owner; RCIC reviewer for now, P-17) | Lead chat + lane sessions | Decides product choices (≤3 per screen), agrees concepts, types `/lead` and `/next <lane>`, pastes blocks, OKs merges, walks built screens as an RCIC | Relays work between agents beyond pasting the block |
| **Lead** (Claude chat in the "AI-Pathway way" Project, Xpatready folder connected) | Starts with `/lead` | Designs screens (`screen-concept`), answers challenges, checks builds against concept and standards, keeps decisions, requests and `LEAD.md` | Edits app code |
| **Builder** (Claude Code in a lane copy, `LANES.md`) | Driven by `/next <lane>` | Challenges concepts, builds, self-checks (skill `journey-test`), runs reviewer and breaker agents, fixes, commits each stage on its lane branch | Builds before agreement; changes rules files; pushes; works in another lane's files |
| **Reviewer / Breaker** (fresh agents launched by the builder) | `.claude/agents/` | Score and attack the built screen | Fix anything; ask for new features |

## The loop the founder runs
Parallel lanes, guards, file ownership and merging: `LANES.md` (P-64). Per lane: `/next <lane>` does exactly one stage, commits, and ends with one **Paste to Lead** block naming the lane (once per stage, not every reply); `/lead` acts on it and names the next command for every lane. State lives in files (`STATE.md` overview, `lanes/<lane>.md` per lane), never in chat.

## How we work: see it, agree it, build it, show it early (P-36, P-42)
Dual track: the Lead designs screen N+1 while the builder builds screen N. Nothing is coded that the founder has not clicked through.
* **Design first.** Every screen is a high-fidelity, clickable board in the journey canvas (team look, real sample data; `product/design/journey-v2.dc.html` is the source) plus a one-page `concept.md` (rules, data, states). The builder adds a short feasibility challenge (top 5 points, scope-labelled) before the founder agrees.
* **Definition of Ready** (all true before any code): board agreed by the founder · every element labelled needed-for-proof / not built and capability / scaffolding · data and API needs known · no open questions.
* **The board is intent, not pixels (P-44).** It fixes flow, structure, words and behaviours. The builder improves details where the team's real components do it better (sheets, dialogs, data tables, toasts, skeletons, focus and keyboard), lists every deviation with its reason in the EARLY-LOOK note, and before coding writes its top 5 production improvements over the board. Changes to flow, scope or wording are proposed to the Lead, not applied. Lead and builder align at EARLY-LOOK; the founder sees the result, not the debate.
* **Show early.** The builder's first slice is the screen on real data, main path only, no polish: screenshots and a 5-line note at EARLY-LOOK. Founder or Lead says Go, or the board changes first. Tests, states and polish come after.
* **Change control.** A change after READY goes to the board first (Lead edits, founder OKs, cost stated: small = this screen, large = next screen); code follows the board.
* **Stop the line.** Anyone who sees it going wrong says so at once; the builder pauses at the next safe point and the board is fixed before more code.
* **Demo and retro.** Each screen ends with the founder's walkthrough (DEMO) and a 5-line retro in `RETRO.md`: what worked, what did not, one change to this workflow at most.

## Stages per screen (`STATE.md` holds the current one)
| Stage | Owner | Output | Exit when |
|---|---|---|---|
| DESIGN | Lead (+ builder feasibility) | board in the journey canvas, `concept.md`, `challenge.md` (short) | Founder clicks through and agrees → READY |
| READY | Lead | Definition of Ready checked in `concept.md` | All true → BUILD |
| BUILD | Builder | first slice: screen on real data, main path, screenshots | → EARLY-LOOK |
| EARLY-LOOK | Founder + Lead | Go, or board changes | Go → FINISH; changes → board, then BUILD |
| FINISH | Builder | all states, tests per rule, axe, build-notes | Its checklist is true → CHECK |
| CHECK | Reviewer + Breaker agents, then Lead | `review.md`, `break-report.md`, Lead check | Clean → DEMO, else FIX |
| FIX | Builder | fixes + a test per break | → CHECK (Lead only) |
| DEMO | Founder (with Lead) | walkthrough outcome in `review.md`; retro line in `RETRO.md` | Accept → DONE; next screen → DESIGN |

## Milestone gate — no scope cuts, no blind progression
Milestones are logical slices of the full journey in `PRODUCT.md`; they sequence work, not reduce the committed scope (P-54). A screen passing does not by itself complete its milestone. Before starting the next milestone, the current one must pass all of these:
1. Each in-scope capability works end to end for its promised user outcome; no placeholder or scaffolding is presented as product capability.
2. Scripted functional checks and a browser/manual walkthrough cover main, alternate, empty, error, permission and recovery states; accessibility/responsive checks cover the screens affected.
3. A fresh adversarial reviewer and breaker have no open critical/high issues; fixes are rechecked. Evidence is independent of the maker's own report.
4. Score all applicable `QUALITY.md` dimensions. No averaging away a weak dimension; D17 (first-use intuitiveness) and D20 (user pain solved / meaningful wow) each score at least 4/5, supported by intended-user walkthrough evidence. Other required dimensions must be at least 4/5; unbuilt future scope is marked Not yet evidenced.
5. Founder walks the milestone and accepts it. Record checks, scores, findings, walkthrough outcome and explicit next milestone in `STATE.md`/Lead handoff. Only then start the next milestone.

For M2, perform and record separate manual browser walkthroughs for both the Super Admin author and the reviewer/RCIC release role. Test the two-role submission/review/release boundary as well as the individual screens. These role simulations prove functionality; D17/D20 still require unaided intended-user evidence and cannot be self-awarded by the builder or Lead.

For `/next`, perform the current stage and stop at its exit. At a milestone boundary, report the gate evidence and open decisions; never silently start the next milestone. “Production-quality” describes the completeness and quality of the included component slice, not production certification of the whole prototype.

## Rules that keep the three in sync
* **One home per fact.** Each rule lives in one file (`PRODUCT.md` §6); other files point to it, never restate it.
* **Never follow blindly, never deviate silently.** Disagreement is written with evidence (concept → challenge → build discoveries) and settled before the affected part is built. Product choices go to the founder as selectable questions with a recommendation.
* **Every founder request** goes into `REQUESTS.md` the same day; every product decision into `DECISIONS.md`.
* **Status is in files:** `STATE.md` (now), `SCREENS.md` (all screens), `LEAD.md` (Lead's open items). Logs keep the last 10 lines; older lines move to `history/`.
* **Small and current:** every rules file under 100 lines; the builder's stop check enforces it. Prune before adding.

## Checks — layered, independent
1. Concept: fresh challenger agent (Lead side), then the builder's challenge.
2. Build: the builder's own tests and scenario walk; then a fresh reviewer (16 dimensions) and a fresh breaker (tries to break it), neither of which built it.
3. Lead check against concept, `STANDARDS.md`, `EXPERIENCE.md`.
4. Founder's RCIC walkthrough by hand — not optional: the AI checkers share some blind spots.
Checkers flag correctness gaps, standard violations and concept mismatches only; they do not add scope (over-engineering is a defect too).
**Scope test (P-26), for every objection, finding and feature:** label it *Needed for the proof* or *Not built (team has it or will harden it)*. Only the first kind is built within the current slice; all agreed full-journey scope remains scheduled in its logical milestone. “The team's screen has it” is a reason to leave it out of this prototype, not to add it.

## Capability or scaffolding (P-33) — label everything
Every element in a concept, challenge, build note and review is one of two kinds:
* **Capability** — what the product does in production for its users (an admin uploads, edits or replaces a form; AI proposes; a person accepts; a check runs). This is what we prove and what the team builds.
* **Scaffolding** — one-time setup, demo seeding, sample data, test inputs, dev tools, or work done to save the founder time (downloading official files, Load sample inputs, Reset, replayed AI answers).
Scaffolding stays minimal, is never shown or described as a capability, is never ported, and never replaces the capability's own path in the demo (forms may be downloaded for convenience, but the demo uploads them through the product). Test for every item: **"In production, who does this, and on which screen?"** If the answer is "nobody, it is setup", it is scaffolding.

## Speed rules
* No revision manifests, hash handoffs or decision numbers for routine work. The snapshot hook keeps a copy of every edited file.
* New asks during a build are logged and scheduled for the next screen, not squeezed into the current one.
* AI runs state their cost first and stay inside the caps (`PRODUCT.md` §5).
* At challenge time the builder checks the team's sources are current (`ai-workers/tools/freshness.sh`); stale sources are marked Unverified.
