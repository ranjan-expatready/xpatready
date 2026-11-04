# qa after-merge — 5 Nov 2026 (qa lane; times IST)

## Batch 14 — #948 (QA-225, the cross-firm feed) · main 1c71c9894 · ~00:20–00:45 IST
| Row | Verdict | Evidence |
|---|---|---|
| C6.1 (thin slice) | **Works** (was Partial, held by QA-225) | `check_case_feed.ts` 0 · 25/25 on main's head; `check_c81_signing_api.ts` 0 · 13/13 on a fresh copy (another firm's staff read no sign or scan line); no acceptance pack (gate B run 41891019149 runs none); runtime suites green on #948's tree (run 41880848275) |

**Closed:** QA-225 (#948). **Method:** one Mac copy (qa_c61, port 4494) for the route check, then stopped. Live AI off, US$0.

## Batch 14b — #881 (C11.7 part B) · main 9b76016c4 · ~00:35–00:50 IST
| Row | Verdict | Evidence |
|---|---|---|
| C11.7 (M2) | **Works** (was Partial, 18/21) | `C11.7.test.ts` on the six 0 · 22/22 (run 41893519083), on the checkpoint 0 · 22/22 (run 41893542963) |

**M2: 52/60 confirmed** (51 after #974; +C11.7). **Thin slice 7/8.** M3 1/17.

## Batch 15 — #982 (QA-208, QA-209), with #883 (QA-206) and #929 (QA-218) · main 40aa80377 · ~01:05–01:30 IST
| Row | Verdict | Evidence |
|---|---|---|
| C3.4 (M2) | **Works** (was Partial) | `C3.4.test.ts` on the six 0 · 20/20 (run 41899424319); the four Majors' checks on fresh copies, all exit 0 (`c34-fix-checks-40aa80377.txt`) |
| C4.1 (M2) | Partial (unchanged) | QA-206 closed, but QA-221 (Major) still holds it |

**Closed:** QA-206, QA-218, QA-208, QA-209. **Method:** six fresh Mac copies one after another (port 4496, each stopped). **M2: 53/60 confirmed** (with #996's C11.7).

## Batch 16 — #993 (B71/B70), #998 (B72) · main e810a9b12 · ~02:20–03:10 IST
| Row | Verdict | Evidence |
|---|---|---|
| C3.6 (M2) | **Works** (was Partial) | `C3.6.test.ts` on the six 0 · 18/18 on main's head (run 41917984027); gate A on #998 (walk 1440 px) |
| C4.8 (M2) | Works (unchanged) | checkpoint 0 · 11/11 (run 41909411749); six now 0 · 12/12 (run 41909389534) |
| C4.1 (M2) | Partial (unchanged), 16/18 | G4's words vs IMM 5257's printed headings (qa rewords); the passport step waits for #1005; QA-221 |

**M2: 54/60 confirmed** (was 53; +C3.6). Thin slice 7/8. M3 1/17.

## Batch 17 — #978 (QA-231, C9.1) · main 8b4b1b881 · ~03:10–03:40 IST
| Row | Verdict | Evidence |
|---|---|---|
| C9.1 (M2) | **Works** (was Partial, 14/17) | `C9.1.test.ts` on the checkpoint 0 · 17/17 on main's head (run 41919519444); gate A on #978; added to `REGRESSION-DATA.md` (checkpoint) |

**Closed:** QA-231. **New:** QA-232 (UX · Minor, #1005's supplies panel, from qa's gate A). **M2: 55/60 confirmed** (+C3.6 in batch 16, +C9.1).

## Batch 18 — #868 (G5, C5.1), #1005 (C4.5) · main 8fcfc7888 · ~04:15–04:35 IST
| Row | Verdict | Evidence |
|---|---|---|
| C5.1 (M2) | **Works** (was Partial) | `C5.1.test.ts` six 0 · 49/49 (run 41928294080), checkpoint 0 · 49/49 (run 41928312919); gate A on #868 |
| C4.5 (M2) | **Works** (was Partial) | `C4.5.test.ts` six 0 · 26/26 (run 41928954066); gate A on #1005 |

**M2: 57/60 confirmed** (55 after #1016; +C5.1, +C4.5). Thin slice 7/8. M3 1/17.

## Records ~04:45 IST: QA-233 (Gap · Major, no capability)
The checklist reading lands Visitor visa lines whose conditions read three facts not in the library; Submit rightly refuses them. No acceptance step breaks today, so it holds no row (detail in `bugs-open-detail.md`). Not fixed by #967 (by code). C4.1's pack (#1022) runs the passport step after Submit, the order a person meets it.
