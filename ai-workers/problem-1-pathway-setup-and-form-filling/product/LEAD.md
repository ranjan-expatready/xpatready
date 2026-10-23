# Lead journal — what the Lead holds between chats

The Lead is Claude Code in the main copy, started with `/lead` (skill `lead`). It runs every lane session, checks, merges and records. Chats end; this file does not: every Lead chat reads it first and updates it before its last reply. Status is not kept here (lane files, `lane.sh table`); this file holds what only the Lead tracks.

## Standing context
* Founder = product owner and, for now, the RCIC reviewer (P-17); talks only to the Lead; decisions one at a time with a recommendation (skill grilling).
* Visual pages: "Programme map" https://claude.ai/artifact/8UHw3EhbcHTUXWoqABdLdG (source `design/programme-map.html`; data block at the bottom; republish the same file after changes), "Pathway Configurator Screens" (Screen 1 boards), "Pathway Configurator Status Report" (R-73).
* Standing merge OK after the Lead check (23 Oct). Restart :4400 only with the founder's OK. Never push.

## Open items the Lead is holding
| Item | Waiting on | Next step |
|---|---|---|
| Screen 01 walkthrough (author and reviewer) | Founder | Walk :4400 with the Lead; then FIX pass (QA-1 release bypass, QA-3 restart script, default channel on "+ Add line") |
| Demo data on :4400 | Founder's OK to change :4400 | Only 1 of 22 Individual and 0 of 8 Corporate combinations are Live; demo combinations 1–6 are not configured; stray test row "Sanjay › Sanjay". Configure through the product as Screens 02–03 land; never reset without OK |
| Forms F1 slice 1 | Forms lane CHECK (reviewer + breaker) | Then Lead reruns suites on the exact commit, merges, `prisma generate` + `migrate deploy` on main, `/qa after-merge`; runtime BUILD may start |
| Requirements trace (SA-01B high-level and slice, one-pager) | Agent run, then Lead | Save the trace, add missing items to a backlog by milestone; our decisions win where they settle a point |
| Team conflicts 1–8 (audit §2) | Founder, one at a time | Validate placement now has evidence (IMM 1344: Adobe pass after the person ticks the phone box and types signatures); ask after IMM 0008 |
| Spend: up to US$12 for AI drafts of IMM 0008/5669/5406 | Founder | Ask when forms slice 2 (A4 backend) is ready, so the runs are cheaper |
| Expert questions | Founder to relay | (1) Schedule A for paper spousal sponsorship: IMM 5669 or eIMM 5669; (2) one structure-only portal capture by a licensed representative (P-66); (3) form channels per demo combination (P-61); (4) may a tool pre-validate before the person types the signature, and must they re-validate after (E1b F2) |
| GitHub private repository + pull requests | Founder | Recommend: private repo excluding `sources/`, `code/`, official PDFs; CI runs suites, check-docs and the any-count on every pull request; pushes and PR creation opened in settings, merge/delete/secrets stay denied; one bot identity |
| Screen 02 concept | Lead (screen-designer agent may draft) | P-61–P-63, A4 progress screen, new-edition impact; after Screen 01 DONE |
| Intended user for D17/D20 | Founder | Name a real content publisher or RCIC for unaided walkthroughs before the M2 gate |
| Static analysis gaps (R-70), shared-library audit | Screen 02–04 concepts | `history/SHARED-LIBRARY-AUDIT-2026-10-23.md` unreviewed |
| Capability page (P-29) | End of prototype | Lead writes it from the code |

## Watch list (check at every Lead check)
* P-26 scope test on every finding; P-33 capability or scaffolding on every element; P-60 no control cut.
* Rerun suites on the exact commit before any merge; maker counts are claims, not evidence.
* Lanes must not build on decisions the founder has not agreed (Definition of Ready).
* D17/D20 need an intended user; never self-award. State AI cost before a live run.

## Session log (newest first; last 10 lines)
- 2026-10-23 17:45 · Founder: Lead did no manual walk before asking for one (fair); Lead walked Screen 01 itself, found QA-13. Founder go for parallel plan; dated PLAN.md; P-70–P-74 (SA-01B scope, ready-to-file, confirmed facts, wrong mapping, decisions reach screens); PQR open (R-84, research saved). Merged QA-0, forms slice 1, IMM 0008. Five lanes running; four design drafts running. Restart :4400 needs founder OK (forms migration + new code).
- 2026-10-23 · New Lead chat (R-81): independent audit (`history/AUDIT-2026-10-23.md`); founder agreed P-65, Computer use for evidence, runtime lane P-67, qa lane P-68 (R-82), c8 coverage P-69 (installed). Workflow fixed (backend path, generated status, Lead-only rules hook, designer agent, stage names). Merged forms naming fix, evidence E1b (IMM 1344 Adobe pass after two person steps; 149/149 slots, Lead reproduced). Forms slice 1 → CHECK. :4400 shows 1 Live of 30: demo combinations not configured.
- 2026-10-23 · Fresh-chat pickup and context warning added to the lead skill. Founder moving to a new Lead chat with an independent audit prompt. Open: Screen 01 walkthrough; P-65 agreement; US$12 for IMM 0008/5669/5406 drafts; evidence needs Computer use; expert questions (Schedule A, portal capture, channels); GitHub repo; Screen 02 concept (Lead).
- 2026-10-23 · Merged forms wording change ("Report to Lead" once per stage; founder asked the lane directly) and evidence E1a (35 saved runs rescored at US$0; self-check byte-identical). Scoring insight: repeated AI drafts agree on person ~93–99% but on the same field name only ~56% (IMM 1344): stable names must come from library matching and aliases, not AI naming. Evidence → E1b by computer use.
- 2026-10-23 · Standing merge OK from the founder. Hooks fixed to read the session folder (lane sessions were checking main). Merged forms challenge (b0e96158); Lead response: all five objections accepted (online version = edition with channel Online + fingerprint; answer lists; portal on combination; validator channel rule; P-57 amendment). Founder decided P-66: one extension for capture (structure only, by a licensed representative, guided, portal twin) and fill; form health. Forms lane → BUILD slice 1.
- 2026-10-23 · Independent review (ChatGPT proposal) tested: all six sources verified; adopted aliases + reviewed merges, blank-page capture with values stripped, stale-never-overwrite for signed/submitted (corrects P-45), fill-trial gate, signed-PDF states, APR "case ID" = our filing reference; rejected narrowing to one combination. P-65 pending founder. Evidence E1 plan agreed, E1a started. Operating model: founder uses /lead only; Lead runs lane sessions.
- 2026-10-23 · Lead recheck of the AI repair: A1–A3, A6 confirmed; :4400 was on the old build (started 10:48), restarted 13:40, now offers the saved answer by default; founder's two live runs passed (US$2.94). Findings: restart script kills all app copies (Major), drafting suite assumes four runs (Minor). A4 accepted. Screens lane → DEMO.
- 2026-10-23 · P-64 lanes set up: local git (baseline a49b861, workflow commits on main), LANES.md, lane.sh, lane-aware hooks (git-based stop check), next/lead skills with guards, journey-test skill, lane files; guards tested on a throwaway lane copy. Forms and evidence lane sessions started. Neutral ChatGPT prompt given to the founder for an independent review of P-61/P-62.
- 2026-10-23 · Founder aligned the forms concept: P-62 setup model (after spousal walkthrough), P-63 plain words (form field, shared field, field map; "box" retired). Confirmed from IRCC files: a date is three form fields mapped to one shared field. Online forms read from saved web pages or extension capture; extension fills in the representative's browser. Next: workflow package (R-75), then Lead recheck of the AI repair.
- 2026-10-23 · Founder agreed P-61 (one form, two channels). Lead wrote P-62 end-to-end setup model (facts are the root; drafting reads PDF twin first; questionnaires from facts; masters and creators; AI required/optional/never; deterministic + advisory duplicate checks + system validator; Prepare application view per channel). Awaiting founder agreement; then workflow package (R-75).
- 2026-10-23 · Founder: local git now, GitHub later; 4 lanes; clear unique commands with state checks; human-like E2E testing skill scored /10 (min 8) (R-75, package pending). Online forms researched on IRCC pages; P-61 "one form, two channels" proposed in decisions/ (R-76), awaiting founder. Builder finished AI repair (browser 101/101 on a quiet machine); Lead recheck of it still to do.
