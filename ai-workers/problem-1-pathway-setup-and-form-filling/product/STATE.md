# State — one page (rewritten by the tech lead, P-188; the history is git)

current_lead: Lead 22 · 6 Nov (session local_b795aa55-be67-4f08-8bf1-616fb8cb7aaa; took over from Lead 21 after M2 = 60, founder's choice "Finish M2, then hand over", P-314)

updated: 2026-11-06 12:20 IST by **Lead 21** (hand-over to Lead 22) · milestone: **M2 60/60 (qa, 12:20 IST: C10.1 Works on main fd29643aa); now the P-376 scale changes, then the M3 48-hour clock** · rules: **`RULES.md`** + DECISIONS P-354 to P-376 (+ the 6 Nov rows still to write, below) · earlier page: `history/STATE-2026-11-06-1220-lead21.md`

## Start here (Lead 22)
**Branch** `lead/2026-11-05-lead14b` (239+ commits behind main: merge `origin/main` before the records write), records PR **#1128**. GitHub: curl + `gh auth token` with `allowed_domains` (P-363); gh's TLS is broken on the Mac, and so is Node's inside the sandbox (live AI runs only from a Terminal tab, founder-approved). Times only from `TZ=Asia/Kolkata date`. Lead 21's working notes, every id and ruling: the file lead21-pending in Lead 19's side-session notes folder; the CURRENT-LEAD file there names the current Lead (stop-gap until #1136).
**Your to-do, in order:**
1. Create the 30-minute check (CronCreate) and a Monitor (Lead 21's script: scratchpad `prwatch.sh <pr>...`; it reads only the latest check runs, the Mergify queue branches and the nightly runs).
2. **P-376 merges, one at a time, each on green + approve:** **#1139** flow fix (head 021b7d90b, green; Opus approved 50c335534 in round 2; Lead 21 read the diff since then: removals and a rename only, no third review needed), then **#1136** guardrails (c0f639d66, green; check STATE ≤ 12 KB and the current_lead rule against this page first), then **#1147 B119** (needs merge of main after #1139 + diff-only re-review: start `/next evidence B119` on its branch), **#1145 B122**, **B120** (still building), **#1149 B121**. **#1148 B117** (approved 7a6db03c9, C7.7 33/33) alongside. qa's **#1157** records: label first (records).
3. **CI hole (P-214 fix, first after #1139):** in `ci.yml` the `a && b && c` lines (check-docs, decision-impact, graph, select-suites, merge-guard) hide a red that is not last (B119's find). Split them into one command per line.
4. Hardening queue (P-358): the three B116 questions on the six with a better-checked paid run + rework B114/B88 (US$0.56 run c4005b30 was not used); QA-283 = B117; QA-289 (firm phone "[object Object]", Major), QA-290; QA-286/287/288 minors; five tests/runtime suites never run by run-suites.sh (tools row); packs run locally the gate-B way (tsx CLI, no --tsconfig) in the builder pre-flight (lesson from #1156).
5. B104 #1084 (M3) after the P-376 changes; then the M3 48-hour clock (P-376 amends P-359).
6. **Records write (P-336), with the founder's name for #1128:** the rows listed under "To record" below.
7. Disk: about 8 GB free; remove merged worktrees (fix-1052-queue, b82-checklist-facts) from a Terminal tab with the founder's OK; keep demo-main.

## Where we are (12:20 IST)
* **M2 60/60 (qa, 12:20 IST: C10.1 Works on main fd29643aa).** Merged today: #1131 (B115 sponsor, C6.1; C11.12 held from gate B), #1123 (C10.1 row 12b + B116 option (a)), #1156 (QA-285: validated files from the Mac's folder, through the upload door), qa records #1144, #1151, #1154. GitHub C10.1 pack 27/27 (run 42161637249) and qa's walk by screens (four validated copies download 200 with the saved sha256; run 42175798473 28/28 with R12c held): **C10.1 Works, QA-285 closed** (records #1161).
* Spend today **US$0.56** (one paid re-run, answers not used); ledger also holds a US$2.04 worst-case reserve from a sandboxed attempt that billed US$0. Weekly plan 18% (11:24 IST).

## In flight
| Lane | Where | Row |
|---|---|---|
| B99 `local_632e0756-…` | Mac | done (#1123, #1156); warm, idle |
| fix-1052 `local_b81d9314-…` | Mac | done (#1131); warm, idle |
| qa-m2-walk `local_42b61af6-…` | Mac | C10.1 walk; #1157 records |
| flow-fix, guardrails, B117, B119, B120, B121, B122, b104-m3 | cloud | P-376 rows held to after 60 (read their PRs; they cannot message) |
| Lead 23 | — | top up two standbys at the founder's next typed turn (P-286) |

## To record (DECISIONS, next records write)
P-373's stop-gap (CURRENT-LEAD.md); B123 parked; the fast-loop rule; Lead 20's four lessons; B117 started (founder "Yes, start B117"); B119 ruling (one route, Mergify records queue by #1139's label); #1139 answers (no nightly issue, same-base memory); #1123 option (c) then (a) with costs and the B114/B88 finding; Lead runs paid AI from a Terminal tab (sandbox TLS); QA-285 "Files stay on the Mac" + qa's five conditions; P-314 exception "Finish M2, then hand over"; the founder's standing OK for CI re-runs ("you can initiate from on my behalf").

## Leads, in order (highest = current)
**Lead 22** `local_b795aa55-…` (from 12:20 IST) · **Lead 21** `local_85990855-…` ended (05:57-12:20 IST) · Lead 20, Lead 19 ended · Lead 18 (Ollama) · Leads 1-17 earlier.

## Lessons (6 Nov, Lead 21)
* A monitor must read only the latest check runs (`filter=latest`): a re-run looked stuck for 13 minutes.
* Mergify's queue runs are `pull_request` events on `mergify/merge-queue/*` branches, not `merge_group`.
* Live AI from a sandboxed process fails with "Connection error" (Node cannot load system certificates); run paid jobs from a Terminal tab.
* A pack must not import modules with Nest parameter decorators; run packs locally the way gate B does.
* A fix that moves shared data turns older tests red elsewhere (four rounds on #1123): grep pinned values first (Lead 20's lesson (c)), and run every suite that names the moved file.
