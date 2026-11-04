# C7.6 before merge: an independent read of #861 at bb6d192 (4 Nov 2026, ~14:10 IST)

This is **not the verdict.** The C7.6 verdict comes on `main` after #861 merges. This read gives the tech lead and the builder an independent result early, and the re-score after the merge can then focus on the differences.

* **Tester:** the independent cloud qa for M3 (Opus). It built none of this.
* **How:** fresh isolated copies of `bb6d192`, built with `prisma generate` and the new migration. Live AI was off; cost US$0. Each copy's database was dropped after its run.
* **Counting (P-322):** fixture only. On the checkpoint, every pack waits for QA-144.

## Packs: gate B, run twice, the same result both times
| Pack | Exit · passed |
|---|---|
| C7.6 | **0 · 25/25** (was 1 · 4/23 on main) |
| C8.1 | 0 · 14/14 |
| C7.7 | 0 · 26/26 |
| C7.3 | 0 · 13/13 |
| C6.12 | 0 · 24/24 |
| C6.12-breadth | 1 · 1/4 (the same three unbuilt steps as on main) |

Setup: `setup_vv_m3` 44/46, as on main.

## qa probes: `probe-c76.mts`, run twice, 16/16 both times
1. A blank case: missing facts is a CRITICAL warning, and the only block is IMM 5257's Validate.
2. No percentage.
3. A reason of spaces only: 400, in words.
4. A 20,000-character reason: no 500.
5. A representative of another firm: 403/404.
6. The client: 403.
7. An unknown filing: 404, in words.
8. An unknown warning code: refused, no 500.
9. The barcode block passed with a reason: 409.
10. Two passes of one warning at once: one 200 and one 409, with **one** stored pass (the database's `readiness_pass` has one row). Readiness lists each line it covers, all with the same who, when and reason.
11. The representative's review with a French and Japanese note: stored exactly as typed.
12. Ready to file clicked twice at once: no 500, and the filing reads `ready_to_file`.
13. A fact changed after Ready to file: the filing goes back, and the review no longer counts.

## The person walk at 1440 px (`screenshots/4-pr861-prepare-pills-1440.png`)
#861 changes no web code, and it says the screen is its own row.

On a filled solo case, the API's readiness for the filing is "not ready":
* one block: IMM 5257 needs its validated copy;
* CRITICAL warnings: representative review, missing signature on IMM 5476, and others.

The Prepare application panel still shows **"Ready to file" on IMM 5476 and IMM 5707**, the per-form pills from before L-SA3. The server and the screen now disagree in words a person reads: IMM 5476 shows "Ready to file" while the API holds a CRITICAL "missing signature" on it. This sharpens this morning's Minor (C7.6 verdict, round 0). It is not a defect of #861's own scope (API only). **Suggestion (Needed for the proof, Capability):** the readiness screen row replaces these pills with the filing's readiness. Until then, the pill should not read "Ready to file".

No new bug in #861's own scope.
