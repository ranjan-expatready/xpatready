# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-05 17:52 IST by **Lead 13 · 5 Nov 13:07 IST**, current from Lead 12's hand-over · milestone: **M2, with M3 alongside on its shared cause (P-351)** · rules: **`RULES.md`** + DECISIONS P-354, P-355 · hand-over note: `history/lead12-handover-2026-11-05.md` · earlier STATE: git history

## Where we are
* **M2: 57/60 (qa, #1095).** Left: C11.15 (QA-252; #1091 gate A PASS 8/10, in the queue; qa re-scores), C4.11 (B83, B82, B86, B88), C10.1 (B78, B79a, B79b, B97, row 12b = B99). Of the 57, qa has shown none to reach a dead end now that C2.6 is out; that is a floor. Walk list: QA-233, QA-234, QA-237, QA-239.
* **M3: 0/17 on the checkpoint (qa, from cloud's #1069).** 10 of 14 packs first red at J7 Stage 1: row B104.
* **The founder's own test failed ~13:05 IST:** page address on "Choose the page and find again". The cloud fix lane reads that every offered page fails, not only the long one: even the shortest, 103 characters, builds a key of about 150 against the limit of 120. Fix running, no PR yet at 13:15 IST; qa logging.
* **Weekly plan 88%, about 6.5%/h, limit near 15:00 IST;** then he switches account (P-344). Paid AI US$0.56 of US$30 at 08:51 IST. Disk 17 GB.

## In flight (17:52 IST, weekly plan 98%, new account next; full rulings are PR comments, read them all)
**C4.11 stack, top #1068, one gate A (P-355):** #1036 was at dd7ede212, red. B83 `local_6c0fdf86` was asked for three small fixes on one head, then a diff-only Opus read: shard 4 `check_forms_b81_browser.cjs` (two "Show all" buttons); `check_case_feed.ts`, `library-changes.ts:329 "shared field" is on neither list`; Devin's `onlyThisAsk` must compare `condition` and `conditionRule`. Then #1053 B86 `local_a4308bc5` merges it, then #1068 B88 (cloud). Then qa on #1068's head, then the three labels together in order. qa's four conditions are in P-355. Keep the removal of line 9 of `route-has-screen-allow.txt`: a stop hook flags it, ruled on #1036. Option B on F1 is ruled; qa tests QA-255's hold and a case on a release already out at gate A; C4.5 returns with it. #1100 merged, QA-256 closed.
**C10.1 stack, top #1052:** #1062 approved at 5fd461ac9, no push. #1085 B81 `local_d798901d` holds it at bb0c092f3; Opus has not seen that fix and CI was running. #1050 B79a (cloud) merges next and checks m19 (`applicants` ignores `filingMode`: an `on_principal` role must not read "No questions yet"). #1052 B79b (cloud) re-measures its cause 2 on #1062's rule before any choice; option C refused. Row 12b after C4.11 lands: real Validate, Acrobat access per session, app name "Acrobat" (P-349).
**qa:** `local_a492c6e1-4f3a-4b38-ba82-3b87be05e71e`, sole writer of CAPABILITIES and BUGS; asked per stack.
**M3 (cloud):** #1072 and #1073 approved, holding for `demo.ts` after M2's stacks. #1084 B104: gate A with cloud qa; shard 1 clears on its next push (#1097 merged). #1086 B108 design ready, two questions for the founder. B109, B110 not started (brief on #1091). Paused: #1075, #1054, #1074.
**Board at the switch:**
```
#1086  -   Building            266m  B108 — scale phase, how the factory reaches   no push 266m
#1075  M3  Building            353m  C7.3 — portal sheet passes its pack on the c  no push 353m
#1054  M3  Building            434m  C3.16 — shared field scope (person · filing   no push 434m
#1068  M2  CI red               29m  C4.11 — B88: one combination's approved cond red checks: 2
#1053  M2  CI red               45m  C4.11 — a form field can hold a question's c red checks: 2
#1036  M2  CI red               46m  C4.11 — ask a form's Yes/No form field as it red checks: 2
#1084  M3  CI red              226m  C8.2, C6.9 — B104 J7 Stage 1 on the configur red checks: 2 no push 226m
#1072  M3  CI red              283m  C6.11 — IMM 5476 follows the representative  red checks: 2 no push 283m
#1074  M3  CI red              367m  C6.12 — spouse sponsorship priced from the f red checks: 2 no push 367m
#1085  M2  CI running            6m  C10.1 — B97: release 2 through B81's choices 
#1052  M2  Question to Lead    178m  C10.1 — Family sponsorship set up from its f  no push 178m
#1050  M2  Ready for label       7m  C10.1 (steps E10, E10b) — QA-144 slice 4 (B7 
#1062  M2  Ready for label      45m  C10.1 — row 7: a person's names for the 29 s 
#1073  M3  Ready for label     236m  C6.4 — Documents panel on the case page; che  no push 236m
```

## Leads, in order (highest = current)
**Lead 13** `local_99b1e15e-dd07-49cf-ad04-8d2411789d9d` (from this hand-over) · standby: Lead 14 `local_95c57cad-96cf-4352-8f00-f19b1f0657c3`, Lead 15 `local_853bfb4d-8ea3-451a-84b2-034cf61212f5` · Lead 12 `local_9ab43f49-877d-45e4-aa0d-a0abc561c2de` ended · Lead 11 `local_55e21a98-…` ended · Lead 10 `local_e336999f-…` ended, parent of Mac lanes · Leads 1, 2 ended · Leads 3-9 archived. Hand over at about 400k (P-314). Check at minutes 13 and 43.

## Next (in order)
0. **P-355 stacks:** C4.11 #1036 → #1053 → #1068; C10.1 #1062 → #1085 → #1050 → #1052; one gate A on each top, labels together. Fresh sessions for B109, B110 at the next typed turn or after the switch (brief on #1091).
1. qa's gate A on #1058; then #1036, #1053, #1068.
2. #1062, then the C10.1 stack; B97.
3. The founder's bug: fix, gate A; answer him on how to be sure.
4. Row 12b after C4.11. Scale design (B108) to him when ready; build after M2 (P-353).

## Waiting for the founder
1. New account kept ready; switch only at the limit, about 16:00 IST (P-355); the tech lead warns at 97%.
2. Name this records PR for its label.

## Founder asks of 5 Nov
**A132** (~07:35 IST) status ✓ · **A133** (~07:55) start four builders ✓ · **A134** (~08:05) full update; what went well or badly; dependency on him; ETAs; M3 and cleanup: answered, retrospective to be finished by Lead 11 · **A135** (~08:10) leads and sessions under them; cleanup ✓ · **A136** (~08:30) lessons and workflow changes, budget, account switch, standbys: answered in brief; Lead 11 finishes · **A137** (~08:32) two capabilities in 2 hours: not realistic, said why; factory pipeline; M3 order: answered; board to do · **A138** (~08:45) start in cloud ✓ · **A139** (~08:55) Lead 11 now; standbys; Fable or not; method changes; 30-minute updates: reported ✓ (P-347) · **A140** (~10:10) resume messages, B84 to the cloud, label #1055 ✓ · **A141** (~10:50) M2 in 2 hours, M3 start, clean the Mac, plan, aggressive: cloud lanes started, cleanup done, honest times given (P-348) ✓ · **A142** (~10:53) record and adopt what Fable and the Lead decided: P-348, RULES, skills, memory ✓. · **A143** (~11:47) status, clean up from the browser, check result, rating: answered; 10 sessions archived ✓ · **A144** (~11:53) M2 only? P-350, then P-351 ✓ · **A145** (~11:58) questions apart from text; B88 now; Acrobat; M3 plan; what waits: rule saved, done ✓ · **A146** (~12:00) engineering research report: answered in brief, gap told ✓ · **A147** (~12:25) merge queue and factory view: answered, rule saved ✓ · **A148** (~12:55) why two capabilities take so long: answered, P-352 ✓ · **A149** (~12:58) fit at 100+? No; P-353 ✓ · **A150** (~13:00) watch cloud lanes in the browser: rule saved ✓ · **A151** (~13:05) his test failed, fix and why, how to be sure: fix started; answer given; qa's result: no walk found that ever chose another offered page; told him. · **A152** (~13:10) "you have all my approval related to adobe acrobat": access to Acrobat granted to Lead 13's session at 13:12 IST for row 12b; used only after C4.11 lands (P-349). · **A153** (~13:30) Devin instead of Claude lanes, whether to wait, monitoring that cleans up by itself, saving context with a dedicated agent: answered; P-354. · **A154** (~14:20) why M2 is not done: answered. · **A155** (~14:27) why stuck, M2 in 2 hours, what is wrong: answered; P-355; the times told him then are overtaken: see the report of 17:10 IST. · **A156** (~17:13) why so slow, what it means for M3: answered; changes for M3 to bring to him as one decision once M2 lands (shared causes first, stacks from day one, time each row, records once a day, the watcher). · **A157** (~17:08) how to switch accounts: answered; switch at 98-99% on the Lead's card.

## Lessons of 5 Nov
* The 10-message cap held C4.11 from 14:47 to 17:05 IST, 2 h 18 min, while lanes sat ready. Asked in text and in the box, he did not see it; AskUserQuestion reached him at once. Ask for "go" by AskUserQuestion and end the turn straight after; spend Mac messages only on what moves the critical path, and let lanes hand each other heads directly.
* A founder's word typed while the Lead is mid-turn does not reset the app's 10-message cap, nor does an AskUserQuestion answer: end the turn and ask for a typed turn.
* A standby can be archived without anyone saying so: check before telling a lane it is being replaced (qa standby, found 13:24 IST; restored, take-over message sent).
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

