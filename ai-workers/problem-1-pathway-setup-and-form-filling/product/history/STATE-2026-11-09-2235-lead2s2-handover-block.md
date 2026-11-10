## Hand-over: Lead 2 (series 2) → Lead 3 (series 2), 22:35 IST — read this first
**Founder's goal (P-434, P-439):** 26 of 29 Works first, then all 29, as fast as the gates allow; hourly report in IST (Works, merged, blocked, next three); stop clean at 95% weekly. Standing approvals (P-434): requeue, retarget, draft/ready, re-run failed CI parts, label on Approve + green; paid runs to US$50 today, ledger first (spent ~US$2: C6.5 reads US$0.026 + a US$0.196 unbilled reservation, C7.5 checkpoint US$0.89). **New today: P-440 token hard rules** (RULES.md "Tokens"; hand over at ~250k; refresh RULES at each hand-over).
**Works on main 20.** Last founder message ~22:30 IST. Lead 2's full page: `history/STATE-2026-11-09-2235-lead2s2-final.md`.
| Row | Where it stands (22:35 IST) | Next step | ETA IST |
|---|---|---|---|
| C6.16 | #1257 merged | cloud qa-c616 round; Lead dispatches its nightly when asked | ~23:45 |
| C6.17 | #1262 labelled, in queue | qa-c617 waits for the merge, then its round | ~00:30 |
| C8.3 | #1440 labelled (migration read: guard function only) | qa-c83b after merge (QA-345) | ~01:00 |
| C6.19 | #1441 labelled | qa-c619 after merge (QA-338) | ~01:00 |
| C7.3 | #1430 labelled | qa-c73-c102 after merge; **Lead's Adobe Validate (Acrobat granted to Lead 2 only: re-ask `request_access` "Acrobat" in a founder-typed turn)** | ~02:00 |
| C10.2 | #1435 labelled | same lane; Lead's Adobe Validate of the Paper IMM 5257 | ~02:30 |
| C7.5 | #1396: checkpoint run committed b0727d19b (run 242bb5a6) | qa-c75 labels #1396 on green (P-275), then its round | ~01:30 |
| C6.5 | #1444 54/56: "14200.00" is text; ruling on #1444 | cloud fix-c65-number, then diff-only Opus, then qa labels | ~02:30 |
| C7.8 | QA-355 (qa #1446, labelled) | cloud fix-qa355 (#1450 draft); then qa gate A + nightly | ~03:00 |
**Also:** #1446 qa records labelled (records queue). The Lead's records PR from `lead/2026-11-07-lead31` (P-440 RULES, check-docs guard, skills) opens when the queue is empty (P-436 (3)). C7.5 run kit: `side-session-notes/local_f135f805-…/c75-checkpoint-run.sh`, scratch `$TMPDIR/c75` (`.tools` linked). Sandbox lessons: the drafting child gets no proxy (live launcher runs from a Terminal tab); simple reads go by curl with `allowed_domains`; `pg_ctl status` cannot see Postgres from the sandbox (it runs).
**Sessions (series 2):** Lead 4 standby `local_48335a53-…`; one more standby at the founder's next typed turn (asked at 22:35). Cloud lanes (count after a push): fix-c65-number, fix-qa355, qa-c616, qa-c617, qa-c75, qa-c83b, qa-c619, qa-c73-c102.
