# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-05 11:08 IST by **Lead 11 · 5 Nov 09:01 IST (ended)** at about 425k tokens; **Lead 12 takes over** · milestone: **M2 — Super Admin configuration, with M3 alongside (P-344)** · rules: **`RULES.md`** (as of P-348) · hand-over note: `history/lead11-handover-2026-11-05.md` · earlier STATE: git history

## Where we are
* **M2: 58/60 on main (qa); of those, some reach a dead end until qa's walk lists them (P-348 (2)).** Left: **C4.11** (B83, B82, B86, B88; QA-239 keeps it Partial) and **C10.1** (B78, B81, B79a, B79b, B97, row 12b = B99, 21/24 on main). **M3: 1/17** on a stale table; cloud qa re-scoring once. C11.6 PR #1056 merged, no Works claimed.
* **The founder asked for M2 in 2 hours (~10:50 IST); told plainly it cannot be done:** C10.1 about 15:30 IST except row 12b, C4.11 about 17:00 IST, both estimates. Row 12b can hold M2 at 59.
* **Weekly plan 76% at 11:03 IST;** used to its limit, then he switches account (P-344; `RESUME-ON-NEW-ACCOUNT.md`, untested). Paid AI US$0.56 of US$30. Disk 15 GB; Mac load 23, swap near full; the 12 GB `vm_bundles` folder not looked at.

## In flight (11:08 IST), critical path first
| Row | Session | Where | Next |
|---|---|---|---|
| qa walk + gate A | `local_7bb326e9` | Mac | stop list = M2's finish line; gate A on #1058, #1036 |
| B82 C2.6, C4.8 | `local_b132d166` | Mac, #1058 | Opus verdict, gate A |
| B83 C4.11 | `local_6c0fdf86` | Mac, #1036 | breaker, Opus, walks, gate A |
| B86 C4.11 | `local_a4308bc5` | Mac, #1053 | ready; CI, reviewer, breaker; label after B83, B82; migration read |
| B88 C4.11 | cloud, #1068 | | stacks on B86; QA-239 |
| B78 C10.1 | `local_c2bbbd2c` | Mac, #1062 | labels itself after Approve; no Works claimed |
| B81 C10.1 | `local_d798901d` | Mac, #1057 | re-review, label; then B97 |
| B79a, B79b C10.1 | cloud, #1050, #1052 | | stacked on B78, B81 (P-348 (8)) |
| C1.3 + C11.5 M3 | cloud, #1051 | | fourth round, gate A, label |
| C3.16 M3 | cloud, #1054 | | label after B86; later migration stamp |
| B84 C7.7 M3 | cloud, #1060 | | also the restart rehearsal |
| C6.11, C6.4, C6.12, C7.3 M3 | cloud | | started ~11:00 IST; running once they push |
| qa M3 re-score | cloud | | verdict files in a draft PR |
| B98 no-screen check | cloud, #1071 | | P-214 may merge it ahead |

## Leads, in order (highest = current)
**Lead 12** `local_9ab43f49-877d-45e4-aa0d-a0abc561c2de` (current from this hand-over) · standby: Lead 13 `local_99b1e15e-dd07-49cf-ad04-8d2411789d9d`; top up at the founder's next typed turn · Lead 11 `local_55e21a98-68ad-4429-a441-0462a75e910b` ended · Lead 10 `local_e336999f-beb6-41ae-a978-a5bdc886991c` ended, still parent of Mac lanes · Leads 1, 2 ended · Leads 3–9 archived. Hand over at about 400k tokens (P-314). The 30-minute check runs at minutes 13 and 43 (skill lead-watch, app view every check).

## Next (in order)
1. Critical path above; qa's stop list resets the C4.11 time.
2. Row 12b: one recommendation to the founder (hand-over note).
3. M3 rows by journey (RULES), adjusted by qa's re-score; new rows as cloud sessions in his typed turns.
4. Records once a day plus each hand-over.

## Waiting for the founder
1. Row 12b: the recommendation, when ready.
2. `vm_bundles`, 12 GB: delete only on his yes, once we say what it is.
3. What "it is only 4" meant (old, may be dropped).

## Founder asks of 5 Nov
**A132** (~07:35 IST) status ✓ · **A133** (~07:55) start four builders ✓ · **A134** (~08:05) full update; what went well or badly; dependency on him; ETAs; M3 and cleanup: answered, retrospective to be finished by Lead 11 · **A135** (~08:10) leads and sessions under them; cleanup ✓ · **A136** (~08:30) lessons and workflow changes, budget, account switch, standbys: answered in brief; Lead 11 finishes · **A137** (~08:32) two capabilities in 2 hours: not realistic, said why; factory pipeline; M3 order: answered; board to do · **A138** (~08:45) start in cloud ✓ · **A139** (~08:55) Lead 11 now; standbys; Fable or not; method changes; 30-minute updates: reported ✓ (P-347) · **A140** (~10:10) resume messages, B84 to the cloud, label #1055 ✓ · **A141** (~10:50) M2 in 2 hours, M3 start, clean the Mac, plan, aggressive: cloud lanes started, cleanup done, honest times given (P-348) ✓ · **A142** (~10:53) record and adopt what Fable and the Lead decided: P-348, RULES, skills, memory ✓.

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
