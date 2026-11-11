# M3-S3: where the row departs from its "Done when" (P-188: never deviate silently)

Row M3-S3 says "Done when: pass and fail test on a non-Visitor line; the 'not derived yet' guard in `engine/runtime/case-checklist.ts` narrows".

## The guard: left as the fee table's data mark, not narrowed by the waiver (review M1, break M1)

**What step 1 built (aeeb7ac55):** a release with any line marked waivable had its checklist worked out on any combination.

**Why it was taken out:**
* Ticking Waivable on one line switched on the whole checklist of a combination whose lines nobody had checked. The breaker did this on Family sponsorship (`fs.spouse`): it made only the fee receipt waivable, and Ready to file gained 3 "not received" warnings.
* Unticking it switched the checklist off again. A case moved to that release lost its list: its Waived line could not be reached (Request again gave 409), and Prepare showed no documents.
* Nothing backs "a release with a waiver was checked line by line". The reviewer and the breaker each rated this a Major on their own.

**What the guard is now:** unchanged from main. It is the fee table's `checklist` mark (`samples/fee-table.json`, P-230 (7)), which is data, not engine code. It has already narrowed since P-425 (9 Nov): C6.17 (8b2f0ee1d, 10 Nov) marked the Study permit outside Canada (`sp.outside`) and the work permit (`wp.lmia_inside`) once their lines were cited. Today only `fs.spouse` and unknown combinations answer "not derived yet".

**The waiver mechanism is general:** it works on every combination whose checklist is worked out. It has a pass test and a fail test on a non-Visitor line:
* engine: the fee table's first marked non-Visitor combination, read from the data;
* API: the Study permit's passport line, on a fresh copy.

`check_m3s3_waivable` now fails if the waiver-coupled guard is put back.

**Question for the tech lead:** I recommend that "the guard narrows" counts as met by the data narrowing above, with M3-S4 removing the guard as planned (P-425). The alternative is a released setting of its own, separate from the waiver: for example, "this combination's document lines are checked" on the combination, signed at release. That would be a new configuration item with a schema change, a screen and review words, so it would be its own row.

## Not applicable on a line not marked waivable (the builder's Question 2)
This is unchanged from C6.4: an officer can still mark any line Not applicable with a reason, and who and why are kept. The reviewer finds this acceptable for this row. Recommendation for M3-S4's acceptance: "Not applicable is refused, or still blocks Ready to file, on a never-waivable line".

## Minors left as they are, with reasons
* **Prepare shows a document item as "Not requested yet" whatever its state** (`api/src/case-prepare.ts`). This was already true for Not applicable; Ready to file reads the true state.
* **Received, then Waive, then Request again leaves the line Requested with a file on it.** This was already true for Not applicable; it follows the C6.4 state rules.
* **The SQL reason check accepts tabs, newlines and zero-width characters.** The API contract (`Waive`, `NotApplicable`) strips invisible characters and trims before saving, and only case staff reach it.
* **`waive()` works out the checklist twice.** This is the same path as Not applicable: one read in the check and one for the answer.
* **A client sending an empty body gets 400 before 403.** The body is parsed before the person's reach is checked, as on every checklist route.
* **A line merged from two requirements is waivable only when both are, even if one of them does not apply to the person** (review m3). This errs on the safe side.
* **"All required documents verified" in a review round counts only Approved lines** (review m2). This was already true for Not applicable; it is a separate rule of the review-round checklist.
