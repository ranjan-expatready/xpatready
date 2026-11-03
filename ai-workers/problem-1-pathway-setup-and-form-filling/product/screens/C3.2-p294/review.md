# Review: C3.2 / P-294 on a8478e74a (reviewer, not committed)
Verdict: Approve.
1. work.outcome is the right signal: reviewRow (proposals.ts:232) and acceptClean (sources.ts:804) both use work.outcome, defaulting to NEW; reuse.match is "reuse" for AMBIGUOUS too (sources.ts:641), so it would be wrong. Absent work falls to NEW_FIELD_ALONE, which is safe.
2. No path bulk-accepts a new field. accept-clean pre-filters REUSE and 409s non-REUSE (sources.ts:800,804-805); decide() runs bulkWhy on every item when rows>1 (proposals.ts:543); web proposals page ticks only !bulk_why (proposals.tsx:44,118) and the server is the backstop. The new check runs after the not-Ready checks, so those messages are unchanged.
3. Single accept of a NEW field-map item still works (rows.length==1 skips the bulk rule); s6_p149 accepts fm2 alone (201, accepted, nothing in library before apply).
4. Tests: B5 has pass (reuse ticked, batch of 2 accepted), fail (bulk_why, 409 with both left waiting, pure NEW and AMBIGUOUS). Removing the rule makes bulk_why null and these fail. s6_p149 change flips the bulk assertion to the P-294 fail and the single-accept pass is kept below it: honest. C11.14 AT-4 updated in the same PR, covers both sides.
Re-ran B5: 22 PASS 0 FAIL (isolated rv5, port 4457, US$0).
Blockers: none. Majors: none.
Minors: (a) the 409 text for a Ready NEW item starts "Only Ready items are accepted together" (proposals.ts:545) though it is Ready; the reason in brackets is right. (b) AT-4 pass half (tickable>0) is data-dependent and C11.14 AT-2-4 still wait on paid rounds (unchanged). (c) Journey score 8/10 (code and API walk only; no browser pass).
