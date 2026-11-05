# Lead 11 → Lead 12 hand-over (5 Nov, written 11:08 IST, at about 425k tokens)

Read word for word: `RULES.md` (as of P-348), `STATE.md`, DECISIONS P-342 to P-348 (on main once #1063 and #1070 merge; until then on branch `lead/2026-11-05-lead11c`, which also holds this note and is yours to continue). Times only from `TZ=Asia/Kolkata date`.

## The founder's last words (~10:50–11:05 IST)
"Let's finish M2 completely … In 2 hours". "you have to start the M3 also. So you decide". "Be aggressive". "take the browser and cloud, cloud and browser, app, compute". "keep reporting very monitorily". He approved everything the Fable review and Lead 11 settled (P-348). He was told plainly that 2 hours is not achievable, with the steps and times. Do not soften that and do not promise less than the measured steps allow. Reports every 30 minutes, very brief.

## Critical path now
**C4.11 (about 17:00 IST, my estimate; unproven):** #1058 B82 (`local_b132d166`, CI, Opus verdict pending, then qa's gate A) · #1036 B83 (`local_6c0fdf86`, breaker, Opus, walks, gate A) · #1053 B86 (`local_a4308bc5`, marked ready 11:06 IST on the founder's word; CI, reviewer, breaker; label only after B83 and B82 are on main; you read the migration) · #1068 B88 (cloud, stacked on B86; QA-239 Done when says Hiding, Unreachable only if shown by route).
**C10.1 (about 15:30 IST except row 12b):** #1062 B78 (`local_c2bbbd2c`, claims no Works, labels itself after Approve) · #1057 B81 (`local_d798901d`, re-review, then B97 as a warm lane) · #1050 B79a → #1052 B79b, cloud, stacked (P-348 (8)): they merge #1062 and #1057 once those are labelled, so the stack lands in one batch. **Row 12b (B99) can hold M2 at 59:** a real validated IMM 5257 copy; P-343 (10) refuses a simulated Validate; Adobe Acrobat DC is on the Mac, so computer use can click Validate; how the copy survives Reset is open. Bring the founder one recommendation. My lean: a real Acrobat-validated file of the fixed Sample family, loaded with its source and date stated, never a simulated one.
**qa (`local_7bb326e9`):** the Visitor visa walk by screens, Reset to release, is running; **its stop list is M2's finish line (P-348 (2));** then gate A on #1058 and #1036. Sole writer of `qa/CAPABILITIES.md` and `qa/BUGS.md`.

## M3 (all cloud)
C1.3 + C11.5 #1051 (CI on d2e569597; fix to `carriedFacts` in; fourth diff-only round approved; gate A next) · C3.16 #1054 (label only after B86 merges; later migration stamp, both used `20261105090000_`; diff-only Opus check; M3 guard; whichever of #1051 and #1054 lands second carries the Organisation-copy test) · B84 C7.7 #1060 (the restart-from-a-PR rehearsal: read its comment on what it could not find; that settles Fable's "Next:" line) · new lanes C6.11, C6.4, C6.12, C7.3 · qa cloud M3 re-score (draft PR of verdict files; it may reorder the rows) · B98 #1071 the no-screen CI check (P-214 may merge it ahead).

## Mac
Load 23, swap near full, disk 15 GB. Limit: qa + two builders, one test copy each at load 16 or under (P-348 (5)); the watch script still says cap 3. On 5 Nov 11:03 IST B82 held 4 copies and B86 2; both were told; check the ports each time: the two Postgres crashes (about 09:00 and 10:05 IST) came at load 26–35.
`~/Library/Application Support/Claude/vm_bundles` is 12 GB, not looked inside. Tell the founder what it is; delete only on his yes. Do not archive Lead 10 or Lead 2 while their nested lanes work.

## Traps found today
* `gh pr ready` and a Lead's records label need the founder's own words in your chat. Typing a brief into claude.ai in a cron turn was refused; `start_session` cloud in his typed turn works.
* The app caps a Lead at 10 messages since his last typed turn: put rulings on PRs first.
* zsh: `origin/$B:path` expands `:a`; use `${B}`. `=====` in echo also breaks. Long `gh api` plus label chains can be refused whole: send small calls.
* Lanes report a claim before the command returns (#1053 "ready"). Check the state.

## Standbys
Lead 13 `local_99b1e15e-dd07-49cf-ad04-8d2411789d9d` is next. Top up to two standby Leads at the founder's next typed turn. No standby builders on the Mac (P-348 (5)).

## Numbers at 11:06 IST
M2 58/60 (C4.11, C10.1 Partial), M3 1/17 (table stale), weekly 76%, about 3% an hour before the new lanes, 5-hour 18%. Paid US$0.56 at 08:51 IST. Open for later: #945, #858 paused; #417, #669, #671 old PRs for the founder; stray branch `claude/runtime-employer-link`.
