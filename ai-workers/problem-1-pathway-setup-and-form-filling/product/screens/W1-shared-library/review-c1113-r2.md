# Review round 2: forms C11.13 (one door: drafted once, reused; where used; near is Check) at c49426ce

Reviewer (did not build). Isolated copy `rv1113` on :4454 (fresh, six loaded), US$0. Code: `git diff 10af4182..c49426ce` (proposals.ts, proposals.tsx 1 line, suite +6 checks). Round 1: `review-c1113.md` (Block, 6.5).

**Verdict: Approve** (no open Blocker or Major). Journey score **8.5/10** (pass; report `journey-test-reviewer-2026-11-01-c1113-r2.md`).

## Round-1 Majors
1. **M1 (false queue words on field_map twins): closed.** The queue cell now says "Same item as drafted for another form (the first accepted adds it)". The reason now says "The same item is drafted for … Whichever is accepted first adds it to the library; this one then reuses it." Both match what the form-field path does: the first applied adds the field, and the other skips it by key. There is no "accept that one first" left, and no P-number in what users read. Browser walk at 1440 px: 3 twin rows in the IMM 5257 Schedule 1 group carry the new words. The form-field page still does not mention the other form. That is acceptable now because nothing promises it (Minor 5).
2. **M2 (twin stuck after its first is rejected): closed.** Suite check, plus probe P3 below: when the first is rejected, accept lands the twin as new, and `reuse.match` is written back as `new`.
3. **M3 (Undo leaves the twin dangling): closed.** Undo of the first is refused (409, plain words) while an accepted reuse outside the batch holds the key. After the twin's decision is undone, the first can be undone, and the twin's reuse goes back to `{reuse, null}`. The guard is general: it matches on `decidedKey`, so it also covers a reuse resolved through `sameInLibrary`.

## Round-1 Minors
* Resolved key written back: done (`reuse.existingKey` = first's key, as the suite proves). Near reason added, not replaced: done. "P-120" removed from user text: done.
* Still open: the edition is cut mid-phrase. The stored `form_edition` is already cut at 60 characters by the producer, and the reason repeats it: "drafted for IMM 5707 E (edition date not given in the inventory; source." (probe P4, real Demo-load twin). Use the form code, plus the edition date when it is known.
* Carried by choice, as listed in the PR: LibrarySources built with missing deps (proposals.ts:89); the lock does nothing outside a transaction; N+1 `findFirst` under the lock. I agree they can follow.

## Day-0 test acceptance/C11.13.test.ts (14/15 on a fresh copy, verified)
**I agree the test is wrong.** Its last check reads `GET /draft` before any second person approves. `/draft` lists `libraryChange` with `status: "APPROVED"` only (programs.ts:361). A release carries approved library changes only, so a waiting ADD is correctly absent. The suite copy reads the second person's batch (P-120 "shown to the second person") before approval, then reads the Release page after approval. That proves both halves of P-120. Do not change programs.ts to make the Day-0 test pass.

## Probes (my script, /tmp/rv1113r2/probe.ts; not committed)
* P1, reverse order: accept the twin first (it lands `person.probe_hue` as new), then accept the first. Result: **409** "…already in the library as person.probe_hue (added since it was proposed): reject this one, or reuse that item." Edit gets the same 409. The library stays right (one field), and reject is a working way out. But the twin's reason ("whichever is accepted first adds it; this one then reuses it") suggests the other one would then reuse, and the first does not. "Reuse that item" also has no button on the queue. Today no real twin is decided on the queue: all Demo-load twins are `field_map`, so this is **Minor 1**. Suggested fix: in decide, when a `new` item is caught by `sameInLibrary` and an accepted item with `work.twinOf = r.id` holds that key, resolve it as reuse of that key instead of 409.
* P2, edit a twin after its first is accepted: **409 "Already in progress or already exists: the database refused a duplicate. Refresh to see the current state."** The edit goes to the lander, and `canonical_field_name_unique` refuses the name. Nothing is written (still one field), so the carried "edit makes a second field" no longer happens. What the person sees instead is a generic database message. This was the same at 10af4182. **Minor 2:** catch it with words ("…is already in the library as X: accept to reuse it, or change the name to make a new item").
* P3: reject the first, accept the twin, then Undo the reject. The first waits again as `new`, and accepting it gives the same 409 as P1. Undo of the twin then works and resets its reuse. Held, apart from Minor 1.

## Regression
`check_forms_c1113_acceptance.ts` 21/21 (17 s). `check_s6_p149.ts` 73/0. `check_forms_c47_pqr_picks.ts` 46/46 (both exercise Undo). axe WCAG 2.2 A/AA on the queue group: 0 violations. Console: no errors. Queue loads in 0.9 s.

## Minor (fix when convenient; none block)
1. P1: if the twin is accepted first, the first item can only be rejected.
2. P2: twin edit after accept shows the generic database 409.
3. The edition is cut mid-phrase in the twin reason (open since round 1).
4. 400 px: the queue group scrolls 46 px sideways (round 1, not this diff).
5. The form-field page shows a twin as plain NEW, with no line about the other form.
6. Carried: the LibrarySources deps, the lock outside a transaction, the N+1 query.

## D-scores (door change)
D1 concept fit 8 · D2 correctness 8 (Minors 1-2) · D3 concurrency 9 · D4 words 7 (Minors 2-3) · D5 performance 9 · D6 accessibility 8 (axe clean; 400 px) · D7 tests 8 (M2/M3 covered; reverse order not covered). D17/D20 stay with the founder.

## Could not check
A real screen reader, a headed walk, and an intended user's unaided walk.
