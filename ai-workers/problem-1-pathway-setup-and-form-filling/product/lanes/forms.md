# Lane: forms — PDF and online forms (P-61–P-63)

## From the Lead

2026-10-28 (Lead, Mac, sixth chat, Claude Code): PR #70 (records) merged; the run-suites per-copy prefix (5c2c4e82) is on main through the Lead PR, so do not carry it on this branch. Stage FIX, owner Builder: sync main; then R69-1 (a RETURNED form change keeps Withdraw/its state: `form-library.ts` lifecyclePending reads WAITING and APPROVED only), R69-2 (actor in the Forms list query key), R69-3 (prove Retire greys when both delete and retire are refused), takesEffect only for RETIRE/RESTORE (`library-forms.tsx`); a pass and a fail test each. They do not block anything but go with QA-61..64 (fa653bec, not on main yet) in one Lead PR. Also note for S5: runtime will read the edition's acceptedChannels on the Forms tab (lead-check L4); keep that field's meaning stable. Local run-suites on the exact commit, `tools/graph.mjs`, hand back. US$0.

Command: `/next forms` in this lane's own copy (`LANES.md`). This lane writes this file; the Lead adds hand-back lines on `main`.

current_item: W1-10 AI drafting (with W1-15's seven AI steps, B37, P-133/P-134), design only
stage: DESIGN
owner: Lead
next_action: Lead answers Q-L1..L3 and takes founder Q1 (experiment cap) and Q2 (filing channel) to an early look and grilling; no code before that
blocked_by: none
updated: 2026-10-29

## Handover (29 Oct; resume from this section alone)
* **Where it stands:** stage DESIGN, owner Lead. Branch `claude/forms-r69-fix-4af07a`, synced with main `32961d69` (PR #73 merged as 56f04113). W1-10 is design only: no app code until the founder's early look and grilling (design before build).
  * `screens/W1-ai-drafting/challenge.md`: fresh re-check (R-109) and challenge. Redesign the run, then build in slices; 0 Blocker, 7 Major (A1 one step list; A2 four AI producers with four copies of the rounds; A3 no queue item contract or shared conditions yet; A4 filing channel inside the finder's rounds; A5 reader kind per document type; A6 the US$100 experiment cap leaves about US$5.8 after the US$50 plan; A7 steps that need unbuilt records), 6 Minor.
  * `screens/W1-ai-drafting/plan.md`: one run of 9 steps (4 rules, 5 AI, each AI step with its own checker), 11 rules with pass and fail tests, 7 slices (0 step runner, 1 filing channel, 2 documents and supplies-facts, 3 who and when, 4 comes-from and PQR, 5 checks, 6 the live trial), Capability or Scaffolding labels.
  * Founder questions: Q1 experiment cap (recommend US$120, each new AI step live once first); Q2 filing channel (recommend inside the finder's two rounds, as the existing "What IRCC accepts" change). Lead: Q-L1 runner by forms first, Q-L2 queue contract before slice 2, Q-L3 order.
* **Next:** the Lead's answers; then the founder's early look; then BUILD from slice 0.
* **Open for the Lead or founder:** whether guides must also be attached to their combinations; 5 of 7 sample forms are "Not set yet" until a person sets them (C11.18); the shared Button's primary hover contrast (4.4 at 12 px).
* **How to run the checks (Mac, this copy):**
  * S4 checks: `forms_s4`, `forms_s4r`, `forms_s4b`, `forms_s4l` on ports 4455–4458; QA-53: `forms_qa53` on 4459.
  * Other suites alone under `fx_*` names on 4471–4480 (pass the database name too: some suites read it from their 2nd argument). `run-suites.sh` uses names other lanes share: check `ps` for another run first.
  * Rebuild `web/dist` (`vite build web`) before the browser checks.
  * After any run, put back only the by-products (other screens' screenshots, `evidence/*.json`, `p2/ledger`, `used-launch-tickets`, `p2/runs/stub-pass`, the canary digest, S4's 390 px shots). Drop this copy's `var/isolated-*` and their databases when nothing is connected.
  * Stop any run if free space falls below 3 GB (34 GB free after the 28 Oct late run).
  * The Bash hook misfires on some compound commands: put them in a scratchpad script. No paid AI (US$0). Lane pushes run no CI (P-85).

## Log (last 10 lines)
- 2026-10-29 · W1-10 · DESIGN (owner Lead) · applied Lead message (PR #73 merged; next W1-10, design only): synced main 32961d69; challenge.md (fresh re-check + challenge: 7 Major, 6 Minor, 2 founder and 3 Lead questions) and plan.md (one 9-step run, 11 rules, 7 slices). No code. US$0.
- 2026-10-29 · #73 review 🔴 · FIX → CHECK (owner Lead) · channelsFrom by rule: conditions never count ("even if" included), negated clauses say nothing, PDF needs an affirmative upload clause, Online an affirmative file-online instruction; fail tests: the even-if sentence → nothing, "Do not upload …; if you apply online, fill it in the portal" → Online only. canada 71, finder 138, qa filing 9/9. US$0.
- 2026-10-28 · #73 review · FIX → CHECK (owner Lead) · channelsFrom (QA-61): a negated sentence is read clause by clause (";", ",", " but ", " instead"); a negated clause or a bare condition says nothing, an affirmative clause counts ("Do not mail this form, upload it …" is PDF). Pass and fail tests: canada 68, finder 138, qa filing 9/9. US$0.
- 2026-10-28 · R69 + QA-65..68 · FIX → CHECK (owner Lead) · applied Lead message (take QA-65..68): QA-65 case reads need a known person, POST configuration reads guarded (ConfigRead); QA-66/67 = R69-1/2 proved; QA-68 send again with what changed only (API 400 on a name or meaning). qa53 20, finder 138, library browser 65; full run-suites on 5600ac06 47/47. US$0.
- 2026-10-28 · R69 · FIX · applied Lead note 28 Oct (sixth chat): synced main 38722933; R69-1 returned form change keeps its state and Withdraw, R69-2 person in the list key, R69-3 both-refused greyed (proved), takesEffect for Retire/Restore only; pass and fail tests: finder 137, library browser 61. Full run-suites stopped at 2.1 GB free (rule: 3 GB); old forms test databases dropped. US$0.
- 2026-10-28 · safe stop · BUILD → CHECK (owner Lead) · QA-61..64 (cbfdab22) wait for the Lead check; the run-suites prefix (5c2c4e82) goes to a Lead PR; everything pushed, Handover current. US$0.
- 2026-10-28 · QA-61..64 · BUILD · touched suites alone on fx copies, all pass on cbfdab22: structure 83, structure r3 41, screen02 fix 61, screen02 slice2 56, w1 s1s2 fix 30, structure browser 135, qa53 13; S4: finder 129, runs 90, library browser 58, run browser 22, canada 66. Handed back by message. Next: run-suites per-copy prefix. US$0.
- 2026-10-28 · QA-61..64 · BUILD · QA-61 the filing rule reads each sentence (canada 66, qa's filing check 9/9); QA-62 AI work names a finder run by its place in plain words; QA-63 a waiting finder card leads to the Sources page; QA-64 a library form's retire or restore takes effect at approval (one applyFormLifecycle for approval and an older approved change at release; the approval re-checks; the confirm says When it is approved). finder 129, runs 90, library browser 58, run browser 22. US$0.
- 2026-10-28 · PR #67 review · BUILD → CHECK (owner Lead) · resend fix pushed (8939a822); touched suites alone on fx copies: finder 124, runs 88, structure r3 41, structure 83, screen02 fix 61 (its QA-53 officer step is in 1a975003: the edit was not in f56442a2 as reported). US$0.
- 2026-10-28 · PR #67 review · BUILD · synced main 3858216e; a returned library form change (delete, retire, restore) is sent again by the form's own rule: Lifecycle.resubmit has a library_form branch that reads formUses leaving the change itself out of the open-change check, checks the action again and marks it WAITING (before: the form number was read as a combination id, 409). Pass and fail tests in the finder check, incl. a returned retire sent again after its last use was removed: finder 124/124. US$0.
