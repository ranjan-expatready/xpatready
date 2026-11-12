# The team's skills and style guide, in perspective (Fable planner, 12 Nov 2026)

**Asked by the founder (12 Nov, spoken, during A24):** look at the design skills, and any backend skills, in the team's product repositories; say whether they are good or bad; adopt nothing blindly; only what we are sure adds value. Planner work: read-only, US$0. No skill was changed (skills are edited by the Lead, and this session cannot write them).

**What was read.** The read-only copies `code/ERv2-frontend@24cae6b-2026-10-28/` and `code/ERv2-sanitized@2bcde9c-2026-10-28/`, checked against the team's live `dev` branches through the GitHub API (read only) on 12 Nov. Frontend `dev` is 138 commits ahead of our copy. Its only design-related differences are one new skill (`extract-ui-needs`) and three small style-guide edits (the client portal is no longer called an installable app). The backend skills are byte-identical to our copy. Ours: `.claude/skills/*`, `product/EXPERIENCE.md`, `STANDARDS.md`, `design/TEAM-PATTERNS.md`, `design/best-in-class-m3-case-screens-2026-11-07.md`, `design/ux-2026-11-11/`.

## Bottom line

1. **The best thing the team has is its style guide** (`docs/style-guide/`: foundations, layouts, patterns, states, components; `forms.md` and `tables.md` binding, lint-enforced). It is specific, consistent and good. **Our rules already defer to it on look** (EXPERIENCE.md, TEAM-PATTERNS.md), but the pointer is stale (read 21 Oct from a copy no longer on disk), and two of our design skills never cite it. That is the one gap worth closing now.
2. **Their skills are mostly build and process mechanics, not design.** The backend ones are strong engineering hygiene, with some generic or thin ones mixed in. None should replace ours.
3. **Ours are better at what the product needs most:** a fresh challenger per concept, the best-in-class scorecard (BIC-01..20), the journey score out of 10 with a break-it pass, D1-D20 review, and evidence over self-report. Theirs are better at **look consistency** (lint) and **spec-to-code coverage audits**.
4. **Recommendation: do not create a new design skill.** Make two small updates to existing ones (below, about 1.5 hours, Lead's call). Keep the bigger look clean-up for M4, on new screens first, never as a Bake-time sweep.

## Frontend: style guide and skills

| Item | What it is | Good or bad | For us |
|---|---|---|---|
| `docs/style-guide/` | Tokens only, no raw hex; type 12-24 with no arbitrary sizes; named spacing scale, gap on the parent; tables never inside a card, 44 px rows, caption and column headers, four states, sort and filter in the URL; field panes slide in from the right, never a centred modal; refusal (403) vs failure (Retry); sentence case, verb + object buttons; "more than one record → a table, not a stack of cards" (`components/data-display.md:29`) | **Good**, specific, enforced by lint | **Already our look authority**; re-point and cite it (U1) |
| `build-from-spec` skill | Plan with numbered decisions and a stop for answers; a scripted browser check (sample-data note shown, no raw keys, no table in a card, status as word + icon, console clean); a QA sheet ticked only for what was verified live; a ranked review prompt | **Good** mechanics | The browser-check list adds a few look checks to our screen review (U2); the rest we already do, better (challenger, journey score) |
| `port-screens` | Port a screen from a reference app: read the source first, diff primitives before restyling | Good for their flow | **Not ours** (we design, not port) |
| `extract-ui-needs` (new on `dev`) | Turns a folder of spec files into a screen checklist with parallel small agents | Useful idea; has a personal local path hard-coded | **Not now.** Maybe for M4 planning from the AG specs, rewritten for our folders |
| `contracts-integration`, `deploy-staging`, `reset-local-tarball` | Their API wiring and deployment | Fine for them | Not applicable |

**Where we differ from their guide today** (measured in our app by the comparison, spot-checked): 184 uses of `text-[13px]` and 448 of `space-y-*` (both banned by their lint), 23 raw hex values, a centred dialog that collects fields in about 10 screens, `window.confirm` for unsaved changes, no 403 "no access" state, no rows-per-page or sort in the URL on tables, and tokens that drifted from theirs. Some divergences are deliberate and recorded (TEAM-PATTERNS.md: the flat list, "Needs you", Undo on toasts, the AI line, a task list instead of a stepper). **None of this blocks walk 1**: it is look consistency, not correctness. Sweeping it during the Bake would put risk on working screens for little value.

## Backend skills (`ERv2-sanitized/.claude/skills/`, unchanged since 28 Oct)

| Skill | What it does | Good or bad | For us |
|---|---|---|---|
| `akplans` | Spec → requirements R1..Rn → a dependency graph of tasks with disjoint file ownership, frozen contracts and named baseline failures; a checker script with its own tests | **Strong** | We cover it with backlog rows, BR ids and baton files (P-438). Adopt nothing now. Its "every claim cites `path:line` or is marked UNVERIFIED" matches our rule |
| `review-independent-full-module` (harness) | One-hour spec-to-build audit of a whole module. A requirement counts **DONE only with `file:line` and a test the reviewer opened, quoting the assertion line that would fail without it** | **Strong**; the best idea in their repo | **Adopt that one evidence rule** into our review and qa (U2): it makes "evidence, not self-report" concrete |
| `task-readiness`, `tpcheck`, `wave-gate`, `codex-review` | Brief before code, fresh reviewer after, gates closed on evidence; Codex as the iterative reviewer | Good discipline; depends on Codex and long loops | We already have a reviewer and a breaker per PR. Not adopting |
| `health-audit` | Two-model whole-repo audit, ~20 min; its own notes record workflow bugs it works around | Mixed: heavy, fragile | No |
| `tp` | 23 lines, instructions in Hinglish: "implement with full standard, DRY, YAGNI" | **Thin**; the value is in tpcheck, not here | No |
| `save-session`, `resume-session`, `context-budget` | Generic session notes in the home folder; context audits | Generic community templates; they keep state outside the repository | No. Our STATE.md and records on GitHub are better (P-82) |
| `sync-rebuild`, `section-close` | Their database and documentation chores | Fine for them | Not applicable |
| `archify` (external, `skills-lock.json`) | Architecture diagrams from a third-party repository | Unknown quality; a supply-chain risk | No |

**Overall on the team's skills:** competent and evidence-minded on the backend, with a few thin or generic ones. Their weak spots: reliance on a second vendor's model for reviews, long runtimes, instructions in mixed languages, and personal paths in shared files. Nothing in them is harmful to copy *as ideas*; nothing should be imported wholesale.

## Proposed updates (for the Lead to decide; none made here)

| Id | Update | Value | Cost | When |
|---|---|---|---|---|
| U1 | `design/TEAM-PATTERNS.md`: re-read from the newest copy (`@24cae6b`) and record it; `screen-concept` and `screen-review` add one line, "the team's `docs/style-guide/` wins on look; cite the page you follow" | Stops new screens drifting from the core product | ~0.5 h | Now (records only) |
| U2 | `screen-review` (and `qa` capability mode): (a) a 6-line look check for **new or changed screens only**: tokens, no arbitrary sizes or hex, a table never inside a card, more than one record is a table, field panes from the right, refusal vs failure; (b) the evidence rule: a requirement passes only with `file:line` and a test whose assertion would fail without it | Catches drift at review time; makes evidence concrete | ~1 h | Now |
| U3 | A look clean-up of existing screens (spacing scale, sizes, hex, dialogs to side panels), one area per PR, with a lint rule once clean | Consistency with the core product | 10-15 h | M4, after UX-13 PR 1, never in the Bake |
| U4 | Settle the open differences in the draft `ux-standard` skill (`design/ux-2026-11-11/04-ux-standard-skill.md`) with the team guide: breadcrumb in the app header; field errors with a short alert and focus on the first field, rather than an error summary at the top | One standard, not two | ~1 h | Before that draft becomes a skill |

**Not proposed:** a new design skill (U1 + U2 cover the gap; a fourth design skill would duplicate screen-concept, screen-review and the ux-standard draft); any backend skill import.

**Question for the founder (only if he wants to overrule the default):** *Apply U1 and U2 now (about 1.5 h, records and skills only, no app change) and leave the look clean-up of existing screens to M4?* Recommendation: **yes**.

## Sources

Team, read-only: `code/ERv2-frontend@24cae6b-2026-10-28/docs/style-guide/` (README, foundations, layouts, patterns, states, components), `.claude/skills/{build-from-spec,port-screens,contracts-integration,deploy-staging,reset-local-tarball}/`, `src/*/CLAUDE.md`; `extract-ui-needs` and the three changed style pages read from `dev` on 12 Nov through the GitHub API (not copied into the repository); `code/ERv2-sanitized@2bcde9c-2026-10-28/.claude/skills/*`, `Docs/harness/skills/review-independent-full-module/SKILL.md`, `skills-lock.json`. Ours: as listed at the top. Counts in our app: grep on this branch (`web/src`), 12 Nov.
