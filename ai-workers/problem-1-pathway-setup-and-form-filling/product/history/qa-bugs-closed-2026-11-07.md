# qa findings closed on 7 Nov 2026 (moved word for word from `qa/BUGS.md`, AGENTS.md rule 8)

## QA-244 — closed 7 Nov 2026 (qa gate A after A4 #1172 and A1 #1084)

Closed by the qa lane on main **73ae633f2** (verdict by a fresh reader, P-360 (3)). The configured checkpoint now carries the Visitor visa's eligibility gates and judgement lines (A1, `features/checkpoint/105-stage-one.ts`), and an author saves gates by screen on the combination's SQR tab (A4). `acceptance/C6.9.test.ts` on a fresh checkpoint alone: exit 0, 15/15 (was 2/15). By screens: a new gate saved, submitted, signed by the content reviewer, released by the approver, then listed on a new case's Eligibility check. Evidence `qa/reports/2026-11-07-c69-c82.md` and `2026-11-07-c69-c82/walk.md` steps 3–6. C6.9 stays Partial until its pack runs green on GitHub on main's tree (P-339).

| QA-244 | Gap · Major (cloud qa's M3 re-score, #1069, 5 Nov; copied by the qa lane ~12:11 IST) | C6.9 · J7 1.8, P-236 | main ffcfb45c8, 344e08699 (cloud) | The configured Visitor visa release has no eligibility gates, so every case check is refused 409: "This application's release has no eligibility rules yet…". Expected: its travel-document and convictions gates and the four officer's-judgement lines, set through the screens | checkpoint loader (C10.1) | Open |

## QA-247 — closed 7 Nov 2026 (qa gate A after A1 #1084)

Closed by the qa lane on main **73ae633f2** (verdict by a fresh reader). `acceptance/C8.2.test.ts` on a fresh checkpoint alone: exit 0, 12/12 (C8.2-7 now green). By screens: the case reads "Filed through APR Portal: set by the combination, not on the case", and Record the submission names APR Portal. Evidence `qa/reports/2026-11-07-c69-c82/walk.md` steps 6, 10. C8.2 stays Partial until its pack runs green on GitHub on main's tree (P-339).

| QA-247 | Gap · Major (cloud qa's M3 re-score, #1069, 5 Nov; copied by the qa lane ~12:11 IST) | C8.2, C11.6 · J7 1.5, P-137 | main ffcfb45c8, 344e08699 (cloud) | On the checkpoint, `/prepare` has `portal: null` and no "Filed through APR Portal" on the case. Expected: the combination's IRCC account set through the screens, shown read-only on every case. C8.2-7 is C8.2's only red step | checkpoint loader | Open |
