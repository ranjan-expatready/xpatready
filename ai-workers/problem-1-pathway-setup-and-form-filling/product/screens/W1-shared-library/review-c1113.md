# Review: forms C11.13 (one door: drafted once, reused; where used; near is Check) at 10af4182

Reviewer (did not build). Isolated copy `rv1113` on :4454 (six loaded), US$0. Code: `git diff origin/main..10af4182 -- prototype/studio` (proposals.ts +42, proposals.tsx 1 line, new suite).

**Verdict: Block** (3 Major). Journey score **6.5/10** (below 8).

## What holds
* `check_forms_c1113_acceptance.ts` 16/16 on my copy (18 s). Six loaded: 19 field drafts across editions stored as reuse of the first edition's item, 0 twins left "new".
* Race: two editions inserted at the same moment (two transactions) give one "new" and one "reuse". The lock costs little: 60 items take 189 ms, and the lock is held only for delete plus insert. Production callers are inside transactions (sources.ts:609, pqr-drafts.ts:146). Lock order: pqr takes the combination lock, then the workspace lock. No cycle with decideNew's `new-field` lock.
* An exact duplicate is refused with its key and where it is used. A near item is never Ready. The near reason reaches the second person's batch and the Release page.
* **Test adaptation is right:** the Release page lists APPROVED library changes only (programs.ts:361). The suite reads the batch (what the second person sees) *before* approving it, so P-120's "shown to the second person at release" is still proven.
* Queue at 1024 px: no sideways scroll. AI pill shown. Group loads in 0.9 s. No console errors.

## Major (must fix before Approve)
1. **The queue tells people something false on the only product path.** Every real twin (all 19) is a `field_map` item, and field_map items are decided on the form-field page through `recordChoice`. The new decide-time tie (proposals.ts:329-333) never runs for them. Evidence: I accepted the IMM 5257 Schedule 1 twin `person.family_name` on its form-field page (`POST /jobs/d5065687…/items/7c40d460…` ACCEPTED, 201) while the IMM 5707 E item it "reuses" was still waiting. The queue row says "Reuses the item drafted for another form (accept that one first)" and its reason says "this reuses that item once it is accepted". It then links to a page that shows the item as plain NEW, with no mention of the other form (screenshot /tmp/rv1113/group-5257s1-1440.png, walk output). The library still ends with one field, through the field-map apply's existing same-key skip, so only the words are wrong. **Fix:** for ON_ITS_PAGE steps, say what is true, e.g. "Same shared field as drafted for IMM 5707 E: decided once". Drop "accept that one first" there, or carry the tie onto the form-field page. Keep the decide-time tie for queue-decided steps.
2. **If the first item is rejected, its twin is stuck.** Queue path, test-reproduced: reject the first, then accept the twin gives 409, and **edit** the twin also gives 409. Both say "accept that one first, or reject this one" about an item that is already rejected. The resolution block runs for edit too (proposals.ts:329-331). The only way out is to reject the twin and draft again. **Fix:** when `relatesTo` is rejected, undone or missing, let accept or edit land it as new (the `sameInLibrary` check still applies). Or at least allow edit and say "That one was rejected: edit this one to add it as a new item".
3. **Undoing the first item leaves its accepted twin pointing at nothing.** Test-reproduced: accept the first (lands `person.zz_undo_label_…`), accept the twin (`landedAs` the same key), then Undo the first's batch (201). The twin stays `accepted`, `decidedKey` names that key, and the field no longer exists. Undo (proposals.ts:394) removes the landed rows without checking reuses that resolved through `relatesTo`. The design makes this the natural order (first, then twin, inside the 10 s window). **Fix:** Undo refuses while an accepted item resolved its key from this batch ("… reuses it: undo that first"), or it puts those twins back to waiting.

## Minor
* proposals.ts:89 `new LibrarySources(db as unknown as Db, undefined as never, undefined as never)` passes a Tx as Db with no audit or services. It works only because `usedIn` reads the db alone. Move `usedIn` to a free function that takes a client.
* proposals.ts:121 user words carry an internal ID, "(one item per meaning, P-120)". The edition is cut at 60 characters mid-phrase: "Drafted for IMM 5707 E (edition date not given in the inventory; source  too: …". Use the form code plus the edition, and no decision ID.
* After acceptance the twin row keeps `reuse.existingKey: null`, because the resolved key is set on a local variable only (proposals.ts:332). Write the resolved key back so the record says what it reused.
* proposals.ts:125 near forcing replaces the producer's reason rather than adding to it.
* The new per-item `findFirst` (an N+1 query) runs inside the workspace lock. Cheap today (189 ms per 60). One query for all identities would do.
* The lock does nothing when `db` is not a transaction (tests/seed_proposals.ts). The comment says "inside a transaction"; make that a stated requirement.
* Test check_forms_c1113_acceptance.ts:53 passes on "used in no combination yet" because the regex `/combination/` matches it. It never proves a real where-used list. No test covers twin accept or reject or undo on the queue path. Removing proposals.ts:329-333 fails no suite I could find.
* An edit of a twin after the first is accepted goes through the lander and adds a second field with a suffixed key, because `sameInLibrary` runs only for match "new". This existed before for any reuse edit, but this change makes it easier to reach.
* 400 px: the queue group scrolls 46 px sideways (not traced to this diff).

## D-scores (short; this is a door change, not a screen)
D1 concept fit 6 (stored reuse/new right; queue words wrong on field_map) · D2 correctness 5 (M2, M3) · D3 concurrency 9 (race verified) · D4 words 6 · D5 performance 9 · D6 accessibility 7 (axe not run, 400 px overflow) · D7 tests 6 (gaps above) · D17/D20 simulated only.

## Journey test (reviewer; report `journey-test-reviewer-2026-11-01-c1113.md`)
Task completed ½ · next step obvious ½ · plain words ½ · feedback and state ½ · correct data ½ (M3) · error recovery ½ (M2) · accessibility and sizes ½ · speed 1 · visual 1 · trust and sources 1 → **6.5/10, fail**. Fixing M1 raises next step and words. Fixing M2 and M3 raise recovery and data.

## Could not check
axe (the `@axe-core/playwright` import failed in my ad-hoc script). A real screen reader. Visible headed walk (headless only). D17/D20 stay with the founder.
