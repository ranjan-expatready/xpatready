# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-05 19:30 IST by **Lead 14 · 5 Nov 19:14 IST**, after the account switch · milestone: **M2; M3 holds until M2 lands (P-356)** · rules: **`RULES.md`** + DECISIONS P-354, P-355, P-356 · hand-over note: `history/lead12-handover-2026-11-05.md` · earlier STATE: git history

## Where we are
* **M2: 57/60 (qa, #1105).** Left: C4.5 (QA-255, at the C4.11 stack's gate A), C4.11 (B83, B86, B88), C10.1 (B78, B79a, B79b, B97, row 12b = B99). Of the 57, qa has shown none to reach a dead end now that C2.6 is out; that is a floor. Walk list: QA-233, QA-234, QA-237, QA-239.
* **M3: 0/17 on the checkpoint (qa, from cloud's #1069).** 10 of 14 packs first red at J7 Stage 1: row B104.
* **The founder's own test failed ~13:05 IST, now fixed (#1091, QA-252 closed, C11.15 Works):** page address on "Choose the page and find again". The cloud fix lane reads that every offered page fails, not only the long one: even the shortest, 103 characters, builds a key of about 150 against the limit of 120. Fix running, no PR yet at 13:15 IST; qa logging.
* **New account: weekly plan 87% on arrival (19:15 IST), resets 8 Nov 22:30 IST; about 13% left, 3-6 h at 2-5%/h; extra usage off. So M3 holds (P-356).** Paid AI US$0.56 of US$30 at 08:51 IST, not re-read since. Disk 15 GB, load 15 at 19:22 IST.

## In flight (19:30 IST; read from the PRs and the board; full rulings are PR comments, read them all)
**C4.11 stack, top #1068 at `414289ef6`, one gate A (P-355):** #1036 `fc0c39996`, #1053 `09a19e631`, #1068 `414289ef6`: Lead 14 measured ancestry exit 0, #1068 CI green (run 42032524480), mergeable clean. No builder running: none is needed unless gate A fails. **qa asked for gate A at 19:20 IST** with P-355's four conditions; PASS holds for that exact head. Then the three labels together in order. Keep the removal of line 9 of `route-has-screen-allow.txt`: a stop hook flags it, ruled on #1036. Security thread on `case-feed.ts:27`: ruled on #1068, keep for C4.11 unless qa's run shows a leak; reasons shown only to configuration people is a row after M2. Option B on F1 is ruled; qa tests QA-255's hold and a case on a release already out; C4.5 returns with it. B105 (#1053's approver-as-author) stays a warm row after #1053's label.
**C10.1 stack, top #1052:** #1062 `5fd461ac9` and #1085 `bb0c092f3` approved, no push. #1050 `5ee192c6b` (code `7a68a0bcc`, CI green, m19 checked 26/26, `applicants` needs no fix). **#1052 B79b: fresh cloud session requested 19:21 IST;** merges #1050's head, adds the 30 names, re-measures its cause 2; option C refused. Counts as running only after its first push (P-326 (3)). Row 12b after C4.11 lands: real Validate, ask for Acrobat access again, app name "Acrobat" (P-349); nobody owns it yet.
**qa:** `local_4f43c3a4-cb9a-445d-8195-961adf26a7eb` (new, Mac), sole writer of CAPABILITIES and BUGS; asked per stack.
**Watcher (P-354 trial, until about 19:30 IST on 6 Nov):** `local_cd535067-7d6f-449a-aadf-f1b141ae4fd4`, Sonnet; digest watcher-digest (.md) in the notes folder.
**M3, holding (P-356):** #1072 and #1073 approved, then `demo.ts` after M2's stacks. #1084 B104: gate A with cloud qa. #1086 B108 design ready, two questions for the founder. B109, B110 not started (brief on #1091). Paused: #1075, #1054, #1074.
**Copies saved at the switch, on their own branches, no PR:** `claude/saved-b78-review-round6-2026-11-05` (Opus round 6 text; #1062's head stays the approved commit), `claude/saved-qa-c1112-pack-2026-11-05` (a C11.12 pack line; qa decides). Canary branch `claude/canary-switch-2026-11-05` holds one empty commit.
**Board at 19:22 IST:**
```
#1086  -   Building            356m  B108 — scale phase, how the factory reaches   no push 356m
#1075  M3  Building            443m  C7.3 — portal sheet passes its pack on the c  no push 443m
#1054  M3  Building            523m  C3.16 — shared field scope (person · filing   no push 523m
#1084  M3  CI red              315m  C8.2, C6.9 — B104 J7 Stage 1 on the configur red checks: 2 no push 315m
#1072  M3  CI red              372m  C6.11 — IMM 5476 follows the representative  red checks: 2 no push 372m
#1074  M3  CI red              457m  C6.12 — spouse sponsorship priced from the f red checks: 2 no push 457m
#1050  M2  CI running           28m  C10.1 (steps E10, E10b) — QA-144 slice 4 (B7
#1052  M2  Question to Lead     89m  C10.1 — Family sponsorship set up from its f
#1068  M2  Ready for label      47m  C4.11 — B88: one combination's approved cond
#1053  M2  Ready for label      80m  C4.11 — a form field can hold a question's c
#1036  M2  Ready for label      84m  C4.11 — ask a form's Yes/No form field as it
#1085  M2  Ready for label      95m  C10.1 — B97: release 2 through B81's choices  no push 95m
#1062  M2  Ready for label     134m  C10.1 — row 7: a person's names for the 29 s  no push 134m
#1073  M3  Ready for label     326m  C6.4 — Documents panel on the case page; che  no push 326m
```
(Older rows, not moving: #945, #417, #671, #669.)

## Leads, in order (highest = current)
**Lead 14** `local_a924b889-5436-4e23-af0b-97c8813c2f08` (new account) · standby: Lead 15 `local_6e4fb2cc-8a4f-4931-b7c9-def6444d7d9b`, Lead 16 `local_3444648a-6db3-406f-b931-300c571feb91` · Leads 1-13 and every earlier session are on the old account and do not appear here. Hand over at about 400k (P-314). Check at minutes 13 and 43.

## Next (in order)
0. **qa's gate A on `414289ef6`;** on PASS, the labels of #1036, #1053, #1068 together, in order (P-355). On FAIL, a fix lane on the PR that owns it; any push voids the PASS.
1. **C10.1:** B79b's head, then qa's gate A on #1052's top, then its four labels. The stack landing second merges main and re-runs its pack first (P-355).
2. Row 12b after C4.11 lands (P-349): ask for Acrobat access, app name "Acrobat".
3. M2 = 60: the defects qa confirms from B112, then the 48-hour sprint clock starts (P-359): B104 first, then rows by journey, forecast at 12 hours, plan capacity from the founder. The rest of B112 after the sprint. QA-162 (Major, C4.11) is outside the stack's list: qa rules at gate A; it can hold C4.11.

## Waiting for the founder
1. claude.ai in the built-in browser: reads as signed out at 19:26 IST after the sign-in; the app view stays closed until it reads as text.
2. Name this records PR for its label, if the label is refused.

## Founder asks of 5 Nov
**A132** (~07:35 IST) status ✓ · **A133** (~07:55) start four builders ✓ · **A134** (~08:05) full update; what went well or badly; dependency on him; ETAs; M3 and cleanup: answered, retrospective to be finished by Lead 11 · **A135** (~08:10) leads and sessions under them; cleanup ✓ · **A136** (~08:30) lessons and workflow changes, budget, account switch, standbys: answered in brief; Lead 11 finishes · **A137** (~08:32) two capabilities in 2 hours: not realistic, said why; factory pipeline; M3 order: answered; board to do · **A138** (~08:45) start in cloud ✓ · **A139** (~08:55) Lead 11 now; standbys; Fable or not; method changes; 30-minute updates: reported ✓ (P-347) · **A140** (~10:10) resume messages, B84 to the cloud, label #1055 ✓ · **A141** (~10:50) M2 in 2 hours, M3 start, clean the Mac, plan, aggressive: cloud lanes started, cleanup done, honest times given (P-348) ✓ · **A142** (~10:53) record and adopt what Fable and the Lead decided: P-348, RULES, skills, memory ✓. · **A143** (~11:47) status, clean up from the browser, check result, rating: answered; 10 sessions archived ✓ · **A144** (~11:53) M2 only? P-350, then P-351 ✓ · **A145** (~11:58) questions apart from text; B88 now; Acrobat; M3 plan; what waits: rule saved, done ✓ · **A146** (~12:00) engineering research report: answered in brief, gap told ✓ · **A147** (~12:25) merge queue and factory view: answered, rule saved ✓ · **A148** (~12:55) why two capabilities take so long: answered, P-352 ✓ · **A149** (~12:58) fit at 100+? No; P-353 ✓ · **A150** (~13:00) watch cloud lanes in the browser: rule saved ✓ · **A151** (~13:05) his test failed, fix and why, how to be sure: fix started; answer given; qa's result: no walk found that ever chose another offered page; told him. · **A152** (~13:10) "you have all my approval related to adobe acrobat": access to Acrobat granted to Lead 13's session at 13:12 IST for row 12b; used only after C4.11 lands (P-349). · **A153** (~13:30) Devin instead of Claude lanes, whether to wait, monitoring that cleans up by itself, saving context with a dedicated agent: answered; P-354. · **A154** (~14:20) why M2 is not done: answered. · **A155** (~14:27) why stuck, M2 in 2 hours, what is wrong: answered; P-355; the times told him then are overtaken: see the report of 17:10 IST. · **A156** (~17:13) why so slow, what it means for M3: answered; changes for M3 to bring to him as one decision once M2 lands (shared causes first, stacks from day one, time each row, records once a day, the watcher). · **A157** (~17:08) how to switch accounts: answered; switch at 98-99% on the Lead's card. · **A158** (~19:14) account switched; follow the resume page word for word, canary first; C4.11 and C10.1 stacks; qa from its note; watcher; Acrobat before 12b; report in one line: restarted qa, B79b, watcher, standbys, check ✓; M3 held on the founder's choice (P-356). · **A159** (~19:40) M2 done? No, 57/60 at 19:48 IST; told. · **A160** (~19:50) when is 60 almost sure: best about 01:00, almost sure about noon on 6 Nov, estimates. · **A161** (~19:53) why so slow, is waiting legitimate, M3 fears, honest rating against FAANG-style, grill: answered; first rating scored the team's items. · **A162** (~20:00) don't judge those, revalidate: P-357; re-rated about 6/10 with an independent code read; QA-162 and four defects sent to qa. · **A163** (~20:15) hardening timing: P-358. · **A164** (~20:20) M3 in 48 hours at most: under 10% said; 48-hour sprint then a forecast chosen: P-359.

## Lessons of 5 Nov
* The new account was at 87%, not empty, and the plan did not say to look first: `get_usage` now comes first on the resume page. Lead 13's last STATE commit was not on `main` either.
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

