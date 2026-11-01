# Journey test, reviewer: C7.6 part 1 "Ready to file" rules (engine only), 1 Nov 2026

Commit a8e44952 on `m3a3-c76-readiness` (one commit on origin/main).

Setup:
* No browser and no server. This change is a pure engine with no route, table or page, so I walked the journeys as engine inputs a person's actions would produce.
* Scratch, not committed: `/tmp/c76probe/probe.ts`, run with the studio's tsx. Builder's check: `tests/check_c76_readiness.ts`, 34/34, run twice, the same both times.
* No port was used (none was needed; :4400 untouched). US$0, no model calls.

## Journeys (from concept r5c BR-9, BR-21, "One left list"; P-71, P-136, P-144, P-151, P-155, P-168; pack 4 C7.6)
1. **Main.** A case officer prepares Client A's Visitor visa: IMM 5257 on PDF upload, IMM 5476 signed by hand and scanned, reviewed. Expected: ready, nothing open. **Held.**
2. **Main, blocks.** Facts unanswered, no validated copy, no scan, no review. Expected: four kinds of block, grouped You → Representative → Client, each naming the form and person. **Held.**
3. **Alternate, warnings.** The passport is not received and there is a CRITICAL AI finding. Expected: both only warn; once each is passed with a reason, the filing is ready. **Partly held.** The missing document passes. The finding can only be passed by a code-wide pass, because finding lines carry no `item` (`readiness.ts:109`). A pass naming finding g1 covers nothing (probe 4b).
4. **Edition currency.** IMM 5707's older edition is accepted until a date. Expected: before and on the date it warns "Adopt update"; after it, it blocks. **Held** for YYYY-MM-DD dates. **Failed open** for a timestamp (`2026-10-01T00:00:00.000Z`): no block (probe 1).
5. **Fee currency (P-151 (1)).** The fee table is replaced and the old fee is accepted until 1 Dec. Expected: warning "Adopt update". **Failed:** nothing (probe 5). After the date, a fee given as a timestamp is ignored too (probe 1b).
6. **Not needed and Online lines.** Expected: Not needed blocks nothing. Online has no barcode block, but a stale PDF copy and an entered section out of date warn. **Held.**
7. **Signatures.** A typed name waits for nothing; hand-scanned and pen without a signature block. **Held** with the engine's own `"TYPED"`. The stored and contract value `"TYPED_NAME"` (`contracts/forms.ts:19`, schema `SignatureKind`) gives a false block, "must be signed in pen" (probe 3).
8. **Wrong role and passing a block.** `cannotPass("representative_review")` refuses. Passing every warning keeps the review block. **Held** (the roles themselves come in part 2).
9. **Recovery: a pass recorded, then a second document goes missing.** Expected: the new warning is open. **Failed:** the earlier code-wide pass silently covers the new document too (probe 8).
10. **Across the boundary (C6.12 /prepare, pack 4).** Codes match the `M3-CONTRACT.md` C7.6 row. Output fits `Prepare.readiness` in `acceptance/lib/m3.ts:148`. Pack 4 C7.6-20a sets only an accepted-until date, so /prepare must also set `superseded`, or no warning appears (probe 6).

## Data underneath
There is no store yet (part 2 adds `readiness_pass`). The output is deterministic, has no percentage anywhere, and the per-owner counts add up (the builder's property tests, 400 runs each).

## Break it
* ISO `today` on the accepted-until day blocks a day early (probe 2): Major, the same root cause as journey 4.
* A whitespace-only reason is refused. 499 characters plus trailing spaces is refused as "over 500", because the length is checked before trimming (`readiness.ts:124`): Minor.
* A group fact (`group:travel`) owed by the client reads fine (probe 9).

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | Every BR-9 block is present. The P-151 fee warning is missing (journey 5). |
| Next step obvious | 1 | Each line says the fix: "Validate it in Adobe…", "Make a new copy", "Adopt update". |
| Plain words | ½ | The lines name the form and person, with no %. `cannotPass` shows internal keys (`"representative_review"`). The lines do not say what they unblock (BR-9). |
| Feedback and state | 1 | The `passed` list keeps who, when and why. Passed warnings are not counted. |
| Correct data | ½ | Timestamp dates fail open (journey 4). `TYPED_NAME` gives a false block (journey 7). |
| Error recovery | ½ | A finding cannot be passed alone. A code-wide pass covers later warnings (journeys 3, 9). |
| Accessibility and screen sizes | ½ | Not applicable (no UI), held at ½. |
| Speed | 1 | Pure function, well under 1 ms per filing. No queries. |
| Visual quality | ½ | Not applicable (no UI), held at ½. |
| Trust and sources | 1 | AI or rules findings only warn, keeping their severity. Passes are recorded. The Unconfirmed legal line is kept. |
| **Total** | **7 / 10** | **Fail** (below 8, no criterion at 0). |

Fixes that would raise it, most valuable first:
1. Normalise or refuse dates.
2. Use the contract's `Signature`.
3. Add `item: g.id` to finding lines, and scope code-wide passes.
4. Add the fee warning before its date.
5. Use plain words in `cannotPass`.

Could not test: any UI, keyboard, axe or widths (there are none). A real screen reader. An intended user's unaided walk (D17 and D20 stay with the founder).

---

## Round 2: commit 8cd983a6 (engine only, same setup; probes `/tmp/c76probe2/probe.ts`)

Journeys 3, 4, 5, 7 and 9 now hold:
* 3: one finding is passed alone and the CRITICAL one stays open.
* 4: timestamps are read as their day, and a value that is not a date is refused, naming the field.
* 5: a superseded fee warns "Adopt update" before its date.
* 7: `TYPED_NAME` waits for nothing.
* 9: a document missing later stays open.

Two places are still loose:
* A document without an item collides on its key.
* A pass for one entered section also covers later sections of the same form (review round 2, new Minors 1–2).

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Every BR-9 block and warning is present, including the fee warning (M4). |
| Next step obvious | 1 | Each line says the fix and what it `unblocks`. |
| Plain words | 1 | `CODE_WORDS`. No internal code is shown in `cannotPass`. Form and person are named. No %. |
| Feedback and state | 1 | `passed` keeps who, when and why. Keys are stored at pass time. |
| Correct data | 1 | Dates are read as their day or refused. The contract's `Signature` is used. |
| Error recovery | ½ | Item-less document keys and entered-section keys still let a pass cover a later line. |
| Accessibility and screen sizes | ½ | Not applicable (no UI), held at ½. |
| Speed | 1 | Pure function, no queries. |
| Visual quality | ½ | Not applicable (no UI), held at ½. |
| Trust and sources | 1 | Findings only warn and keep their severity. Passes are recorded. The Unconfirmed legal line is kept. |
| **Total** | **8.5 / 10** | **Pass** (8 or more, no criterion at 0). |
