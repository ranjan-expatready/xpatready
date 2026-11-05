# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-05 08:53 IST by **Lead 10 · 5 Nov 02:31 IST (ended)** at about 425k tokens; **Lead 11 takes over** · milestone: **M2 — Super Admin configuration, with M3 alongside (P-344)** · rules: **`RULES.md`** (as of P-341; DECISIONS P-342 to P-345 are newer and win) · hand-over note: lead10-handover-2026-11-05.md in the side-session notes folder lead10-saved-2026-11-05 · earlier STATE: git history

## Where we are
* **M2: 58/60 on main (qa).** Confirmed since 02:31 IST: C3.4, C3.6, C9.1, C5.1, C4.5, C4.1. Left: **C4.11** (pack 24/24, held by B83 and B86) and **C10.1** (#1009, B81, B78, B79a, B79b). **M3: 1/17** on the table, qa re-scoring once (P-344 (2)).
* **M2 is not end to end until B82 and B86 land:** QA-233 and QA-237 are dead ends a person can reach while the packs are green.
* **Weekly plan 67% at 08:51 IST;** the plan is used to its limit, then the founder switches account (P-344). Paid AI today US$0.56 of US$30. Disk 14 GB; swap 7.6 of 8.2 GB, load 25: **the Mac is full, new builders go to the cloud or standbys.**

## In flight (08:55 IST)
| Row | Session | Where | Next |
|---|---|---|---|
| B83 C4.11 | `local_6c0fdf86` | Mac, draft #1036 | Blocker + 9 Majors, breaker re-check, list id ae2133 twice, label |
| B86 C4.11 | `local_a4308bc5` | Mac | concept + challenge; tech lead approves; migration, breaker |
| B82 QA-233 | `local_b132d166` | Mac | local suites, PR, review |
| #1009 C10.1 | `local_b4bc646d` | Mac | CI at ab16c2cea; "ready" then the tech lead labels |
| B81 C10.1 | standby A `local_d798901d` | Mac, `claude/forms-b81-not-on-form` | building |
| B78 C10.1 | standby B `local_c2bbbd2c` | Mac, `claude/screens-b78-section-names` | merges main after #1009 |
| B79a Express Entry | cloud, #1050 | | after #1009 and B78 on demo.ts |
| B79b Family sponsorship | cloud, #1052 | | after B79a on demo.ts |
| C3.16 M3 | cloud | no PR seen yet | concept; tech lead approves on its PR |
| C1.3 + C11.5 M3 | cloud, #1051 | | concept; tech lead approves on its PR |
| C11.6 M3 | cloud | no PR seen yet | build what is red |
| qa lane | `local_7bb326e9` | Mac | gate A, re-scores, M3 re-score once; sole writer of CAPABILITIES and BUGS |
**demo.ts order:** #1009 → B78 → B79a → B79b. Ends after its PR merges: paid runner `local_0c6484d1` and Lead 1 can be archived now #1040 has merged.

## Leads, in order (highest = current)
**Lead 11** `local_55e21a98-68ad-4429-a441-0462a75e910b` (current from this hand-over) · standby: see the hand-over note · Lead 10 `local_e336999f-beb6-41ae-a978-a5bdc886991c` ended · Leads 1, 2 open (ended) · Leads 3–9 archived. Hand over at about 400k tokens (P-314). The 30-minute check runs at minutes 13 and 43 (skill lead-watch, app view every check).

## Next (in order)
1. Retrospective and M3 plan to the founder, very brief (founder's asks below); write "Resume on the new account"; build the factory board from `lead-watch.sh`.
2. Critical path above; next free standby takes B84, then B87; M3 order after qa's re-score: foundations (C3.16, C11.5, C1.3, C11.6, C6.11) → case journey (C6.4, C6.12, C6.5, C7.7, C7.6, C7.3) → after filling (C7.5, C8.1, C8.2, C9.2) → C10.2 last. From row titles only; verify against code.
3. Records once a day plus each hand-over (P-336).

## Waiting for the founder
1. Label this records PR (auto mode refuses a Lead's own unless he names it).
2. Fable report when he has run the prompt (P-344 (6)).
3. What "it is only 4" meant; until then M3's target is 24 working hours, about 3 working days.

## Founder asks of 5 Nov
**A132** (~07:35 IST) status ✓ · **A133** (~07:55) start four builders ✓ · **A134** (~08:05) full update; what went well or badly; dependency on him; ETAs; M3 and cleanup: answered, retrospective to be finished by Lead 11 · **A135** (~08:10) leads and sessions under them; cleanup ✓ · **A136** (~08:30) lessons and workflow changes, budget, account switch, standbys: answered in brief; Lead 11 finishes · **A137** (~08:32) two capabilities in 2 hours: not realistic, said why; factory pipeline; M3 order: answered; board to do · **A138** (~08:45) start in cloud ✓ · **A139** (~08:55) Lead 11 now; standbys; Fable or not; method changes; 30-minute updates: Lead 11 reports.

## Lessons of 5 Nov
* Green packs hid dead ends (QA-233, QA-237): a row needs one walk of a person's full journey before it counts. Proposed; not yet a rule.
* A row waited 3 h 20 min for a typed turn when typing into claude.ai/code or a standby would have done (P-344 (3)).
* Auto-archive closed working lanes and standby Leads; now off. `ListAgents` does not show an unarchived session until it runs: message it by its id.
* Check Mac memory and disk before starting local sessions: four new copies took disk to 3.3 GB.
* A cleanup must tell the lanes first: removing qa's scratch `wtrec13` led to a local commit in qa's main copy (undone, never pushed).
* Two rows that fail the same way across runs can be a tied sort: list ids flipped 3 in 7 on `started_at` (QA-236). Same tie at `demo.ts:595`.
* Archiving Lead 5 removed its side-session notes folder (a copy was made first): keep hand-overs in the side-session notes folder lead10-saved-2026-11-05.
* Long lanes burn the most: S2 reached 960k tokens. A context figure must be measured with `get_usage`; "90%" repeated for hours was 65%.
* Write what happened after it happens: two "card proposed" lines and a guessed "06:45" were wrong.
