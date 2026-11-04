# qa after-merge — 5 Nov 2026 (qa lane; times IST)

## Batch 14 — #948 (QA-225, the cross-firm feed) · main 1c71c9894 · ~00:20–00:45 IST
| Row | Verdict | Evidence |
|---|---|---|
| C6.1 (thin slice) | **Works** (was Partial, held by QA-225) | `check_case_feed.ts` 0 · 25/25 on main's head; `check_c81_signing_api.ts` 0 · 13/13 on a fresh copy (another firm's staff read no sign or scan line); no acceptance pack (gate B run 41891019149 runs none); runtime suites green on #948's tree (run 41880848275) |

**Closed:** QA-225 (#948). **Method:** one Mac copy (qa_c61, port 4494) for the route check, then stopped. Live AI off, US$0.

**M2: 49/60 on main** (51 once #974 merges). **Thin slice 7/8.** M3 1/17.
