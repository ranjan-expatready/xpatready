# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-05 13:20 IST by **Lead 13 · 5 Nov 13:07 IST**, current from Lead 12's hand-over · milestone: **M2, with M3 alongside on its shared cause (P-351)** · rules: **`RULES.md`** + DECISIONS P-349 to P-353 · hand-over note: `history/lead12-handover-2026-11-05.md` · earlier STATE: git history

## Where we are
* **M2: 57/60 (qa, #1078).** Left: C2.6 (QA-233; B82), C4.11 (B83, B82, B86, B88), C10.1 (B78, B79a, B79b, B97, row 12b = B99). Of the 57, qa has shown none to reach a dead end now that C2.6 is out; that is a floor. Walk list: QA-233, QA-234, QA-237, QA-239.
* **M3: 0/17 on the checkpoint (qa, from cloud's #1069).** 10 of 14 packs first red at J7 Stage 1: row B104.
* **The founder's own test failed ~13:05 IST:** page address on "Choose the page and find again". The cloud fix lane reads that every offered page fails, not only the long one: even the shortest, 103 characters, builds a key of about 150 against the limit of 120. Fix running, no PR yet at 13:20 IST; qa logging.
* **Weekly plan 88%, about 6.5%/h, limit near 15:00 IST;** then he switches account (P-344). Paid AI US$0.56 of US$30 at 08:51 IST. Disk 17 GB.

## In flight
See the hand-over note, critical path first. Bottleneck: rework at review on dependent PRs (#1058, #1051 five rounds, #1057 four). Queue: no batch failed.

## Leads, in order (highest = current)
**Lead 13** `local_99b1e15e-dd07-49cf-ad04-8d2411789d9d` (from this hand-over) · standby: Lead 14 `local_95c57cad-96cf-4352-8f00-f19b1f0657c3`; top up at his next typed turn · Lead 12 `local_9ab43f49-877d-45e4-aa0d-a0abc561c2de` ended · Lead 11 `local_55e21a98-…` ended · Lead 10 `local_e336999f-…` ended, parent of Mac lanes · Leads 1, 2 ended · Leads 3-9 archived. Hand over at about 400k (P-314). Check at minutes 13 and 43.

## Next (in order)
1. qa's gate A on #1058; then #1036, #1053, #1068.
2. #1062, then the C10.1 stack; B97.
3. The founder's bug: fix, gate A; answer him on how to be sure.
4. Row 12b after C4.11. Scale design (B108) to him when ready; build after M2 (P-353).

## Waiting for the founder
1. New account ready by about 14:30 IST.
2. Name the records PR for its label.

## Founder asks of 5 Nov
**A132** (~07:35 IST) status ✓ · **A133** (~07:55) start four builders ✓ · **A134** (~08:05) full update; what went well or badly; dependency on him; ETAs; M3 and cleanup: answered, retrospective to be finished by Lead 11 · **A135** (~08:10) leads and sessions under them; cleanup ✓ · **A136** (~08:30) lessons and workflow changes, budget, account switch, standbys: answered in brief; Lead 11 finishes · **A137** (~08:32) two capabilities in 2 hours: not realistic, said why; factory pipeline; M3 order: answered; board to do · **A138** (~08:45) start in cloud ✓ · **A139** (~08:55) Lead 11 now; standbys; Fable or not; method changes; 30-minute updates: reported ✓ (P-347) · **A140** (~10:10) resume messages, B84 to the cloud, label #1055 ✓ · **A141** (~10:50) M2 in 2 hours, M3 start, clean the Mac, plan, aggressive: cloud lanes started, cleanup done, honest times given (P-348) ✓ · **A142** (~10:53) record and adopt what Fable and the Lead decided: P-348, RULES, skills, memory ✓. · **A143** (~11:47) status, clean up from the browser, check result, rating: answered; 10 sessions archived ✓ · **A144** (~11:53) M2 only? P-350, then P-351 ✓ · **A145** (~11:58) questions apart from text; B88 now; Acrobat; M3 plan; what waits: rule saved, done ✓ · **A146** (~12:00) engineering research report: answered in brief, gap told ✓ · **A147** (~12:25) merge queue and factory view: answered, rule saved ✓ · **A148** (~12:55) why two capabilities take so long: answered, P-352 ✓ · **A149** (~12:58) fit at 100+? No; P-353 ✓ · **A150** (~13:00) watch cloud lanes in the browser: rule saved ✓ · **A151** (~13:05) his test failed, fix and why, how to be sure: fix started; answer given; qa's result due. · **A152** (~13:10) "you have all my approval related to adobe acrobat": access to Acrobat granted to Lead 13's session at about 13:16 IST for row 12b; used only after C4.11 lands (P-349).

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
* The founder's first test of a dialog failed where every pack passed: nothing tried the other options or a long address. Walks need every offered option, not only the path a pack uses.
* A check that reads a PR's latest question misses earlier ones (#1074, over an hour). The app view showed it.
* Grants and permissions are per session: Acrobat access does not pass to the next Lead; Lead 14 must ask again. The app's name for it is "Acrobat", not "Adobe Acrobat".

