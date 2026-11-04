# State — one page (rewritten by the tech lead, P-188; the history is git)

updated: 2026-11-04 20:20 IST by **Lead 7 · 4 Nov 17:29 IST (ended)** at 39% of its context; **Lead 8 takes over** (P-286, P-314) · milestone: **M2 — Super Admin configuration** · rules: **`RULES.md`** (as of P-337) · earlier STATE: `history/STATE-2026-11-04-0925.md` (Lead 2), `history/STATE-2026-11-04-0058.md` · Lead hand-over notes of 4 Nov: side-session notes folder of Lead 1 (lead3-, lead4-, lead5-handover-2026-11-04.md, lead4-learnings-cloud-blindness-2026-11-04.md)

## Where we are
* **M2: 45/60 confirmed by qa** (19:12 IST, qa batch 11, notes PR #956): Works added C11.17, C1.6, C11.8, C4.8, C3.5; C6.1 Partial (QA-225 Major, thin slice); C4.2 Partial (added to QA-144's list). Thin slice 6/8. **M3: 2/17.** The checkpoint releases the Visitor visa and With an LMIA (#891); C10.1 16/23 there; C9.1 8/17 (QA-207 partly fixed until #886's 2021 map). Only qa's verdicts count (P-290).
* **Merged since 13:21 IST:** about 40 PRs, among them #798 #878 (QA-144 slices 1–2), #891 (QA-144 part 2, IRM 0002), #840 #837 #875 #882 #866 (C4.2) #867 (C11.17) #870 (C1.6) #872 (C11.8) #861 (C7.6, M3) #935 (C3.5, QA-219) #937 (QA-207 US$0 fix) #933 (QA-215) #857 (protected regression set: first two batches green, 21 of 22 rows in about 2 min).
* **Paid AI today:** about US$0.24 of the US$30 day cap. Next paid run: IMM 5476 2021 map (#886, worst US$5.60, approved under P-330 (1)) now that #937 is on main.
* **Weekly plan: 43% at ~19:00 IST**, about 4.3% an hour → 85% near 04:45 and 90% near 06:00 IST 5 Nov at that rate. **P-331: no extra usage; lean now; 85% no new rows; 90% clean stop and "Resume on the new account".**
* **Disk 9 GB free.** 20 idle test databases hold only 0.4 GB (not dropped). Old copies need the founder's yes.

## Founder direction since 17:29 IST
P-331 (no extra usage, 90% hand-over), P-332 (no new M3 work; #924 and #926 finish), P-333 (one read-only Fable consultation; the founder runs it with the prompt fable-consult-prompt-2026-11-04.md in Lead 5's side-session notes folder; the Lead reviews the report, never follows it blindly).

## In flight (~19:10 IST), critical path first
| PR / session | What | Next |
|---|---|---|
| #936 S1 `local_ff7b5436…` | QA-144 part 1, placement step on the six (C4.7; frees C4.1 C4.8 C3.6 C4.9 C4.5 C4.3 C4.2) | dequeued (conflict) → S1 merges main, Lead re-labels; then S1's Yes/No facts row (frees C4.11 #865) |
| #939 qa lane `local_7bb326e9…` | batch 10 records + C11.14 AT-4 and C11.7 case-2 pack fixes | queued → then #785 (C11.14) and #881 (C11.7 B) merge main once |
| #885 Builder 8 `local_bf2f3e98…` | QA-207 DEMO.md row 17 (makes C9.1 reachable) | merge main after #891, Lead labels |
| #868 cloud G5 | C5.1, P-248 both halves; checkpoint LMIA document lines from c1-v3 (P-334 (2)) | diff-only Opus, CI, qa gate A |
| #883 cloud QA-206 | C3.4 section names from print | GitHub re-test 41836499596 → label |
| #879 cloud slice 3 | Study permit from its forms | conflict → merge main, re-label (typed into its session) |
| #948 Builder 1 `local_8b65d77f…` | QA-225 cross-firm leak fix | one diff-only Opus, breaker done → Lead reads diff, labels |
| #945 Builder 1 | no-hard-coding guard (P-319) | one diff-only Opus → Lead commits its ci.yml lines, labels |
| #951 Builder 1 | gate B prints a stopped pack's last lines (P-214) | review |
| #929 cloud QA-218 | C3.4 saved masters run offered | draft |
| #865 cloud C4.11 | held for #936 + the Yes/No facts row | hold |
| #926 / #924 cloud (M3) | C9.2 labelled; C8.2 merging main | finish, then the sessions end (P-332) |
| qa-2 `local_e4f5a5d5…` | C11.14 after #785 | waits |
| S2 `local_c58834aa…` | #935 merged | standby; removes scratchpad wt-qa219 |
| paid runner `local_0c6484d1…` | #785, then #886 (IMM 5476 2021) | after #939 / under P-330 (1) |
Ports: B1 4430–4434, S1 4440–4444, S2 4445–4449, B8 4470–4479, qa-2 4480–4484, qa 4490–4499; demo 4400.

## Leads, in order (highest = current)
**Lead 8** `local_96177831-842a-4d2c-9c07-eafb51e452fe` (current from 20:2x IST; hand-over note lead7-handover-2026-11-04.md in Lead 5's side-session notes folder) · standby: **Lead 9** `local_fa5c998c-d3e5-464b-8aa6-951d79ea78c0` (was "Lead 6 · standby", skipped by mistake, renamed) · Lead 7 ended 20:2x IST · Leads 1–5 ended (Lead 4 archived). At the founder's next typed turn start one more standby (Lead 10). Hand over at about 400k tokens (P-314). The 30-minute check runs at minutes 13 and 43 (skill lead-watch, with cloud eyes, P-326).

## Since 19:10 IST
P-335 (no multi-tenant work), P-336 (finish M2 to 60 then scale; trip-wire 6 Nov 23:00 IST), P-337 (Works frozen; lean crew; owners: QA-221 S2, C4.8 hand-fill Builder 8, QA-208/209 Builder 1, C4.11 paid quote after QA-144). New builder for B52 + QA-227: `local_3b435f0f-8eab-40da-8f3c-3cadc692d858` (waits for #936). #886 IMM 5476 2021 map done (US$0.52; today US$0.76). Weekly 47% at 20:14 IST; burn down to about 2%/h. M2 45/60 (qa), M3 1/17.

## Next (in order)
1. Re-label #936 after S1's merge; #939 → #785, #881 → qa re-scores (C11.14, C11.7, C3.5, C4.7, C11.8).
2. #885, #868 gate A, #883, #879; #948 (Major leak) and #945.
3. S1's Yes/No facts row → #865 (C4.11).
4. Paid: #886 IMM 5476 2021 map on the paid runner's copy, worst US$5.60.
5. Review the Fable report when the founder sends it; bring him a plan (P-333).
6. Forecast (only proven numbers count): about 43–44 at 20:00 IST, 45–47 by ~23:00, 48–52 by 08:00 IST 5 Nov if #936 lands; the last 8–10 rows likely on the new account (P-331).

## Waiting for the founder
1. The Fable report (P-333).
2. qa-3 is archived: unarchive it, or carry on with the qa lane and qa-2 (recommended: carry on, P-331 lean).
3. 23 tracked r1c screenshots rewritten in the qa lane's copy (never committed); auto mode refused qa's restore: the founder restores them (one `git restore` in that copy).
4. #861 representative-review preference (P-330 (3); recommendation: keep as built).
5. Old copies to remove for disk, on his yes.

## Founder asks of 4 Nov after 17:29 IST (P-228 (9)); earlier asks: hand-over notes and `history/STATE-2026-11-04-0925.md`
**A115** (~17:40 IST) Lead 6 standby forgotten?, which Lead is current, target time: answered ✓ (kept, renamed Lead 9; Lead 7 is current; forecast given) · **A116** (~18:55 IST) monitor and verify everything, 52 by 8 o'clock, unblock the most, Fable consultation, Opus medium or high: answered ✓ (52 not by 20:00; unblock order; Fable once; Opus high for leads, reviewers, qa and builders, medium only for mechanical sub-work) · **A117** (~19:00 IST) write the Fable prompt and grill, budget at 45%?, finish M2 in budget, 90% hand-over, stop M3, Fable effort: answered ✓ (43% measured; P-331, P-332, P-333; prompt written; Fable 5.1 high).

## Lessons of 4 Nov (afternoon and evening)
* Never rule "drop the capability id to get past gate B": name gate B's steps, or hold (Lead 5).
* A Lead turn that never ends (messages arriving back to back) blocks the cron: the 14:13–16:13 checks were lost (Lead 5).
* Typing into the claude.ai/code root starts a new cloud session: click by reference and confirm the session's URL first (Lead 5, 16:44 IST).
* "Auto-archive on PR close" archives Mac standby builders whose PR merged: unarchive before messaging (Lead 5).
* A slow laptop was memory (swap 6.8 of 8 GB) from about 20 open sessions and their helpers, not test copies (Lead 5).
* The app pauses a Lead's messages to other sessions after 10 since the founder's last typed turn: put rulings on PRs; a cloud lane reads its PR (Lead 7).
* A merge of one PR can dequeue the next PR on the same file (demo.ts): #891, #879, #936 all conflicted within an hour; check "dequeued" at every check (Lead 7).
* Times written as "~18:5x" without the clock ran up to 20 minutes fast: take every time from `TZ=Asia/Kolkata date` (Lead 7).
* Cloud lanes did read PR comments and act on them when busy; type into a session only when it is idle with work left (Lead 7).
