# Review round 2: G2 answer-key release gate (C5.5), PR #568, diff `260e9660..dbbb8d7a`

Reviewer: fresh context, did not build it. Scope (P-277): only the diff since the approved commit 260e9660. Read: the diff (engine, api, web, tests, build-notes 8–13), my round-1 `review.md`, `break-report.md`.
Ran: isolated copies :4442 (demo workspace), :4443 (`STUDIO_WORKSPACE_KEY=firm`, later fresh copies for the G4 and regression suites), own DBs `xr_studio_rev2_*`. Never :4400, :4440, :4446, :4449. Vite build done first.

**How I ran it.** The shared checkout changed under me again (as in round 1): `git status` showed uncommitted edits to `api/src/answer-keys.ts` (a new `listFor`, "3rd pass") and `api/src/programs.ts` (the `blocking` field of the row removed). So I did not run the working tree. I exported `git archive dbbb8d7a` to the scratch folder and ran every suite on that copy; the verdict is on dbbb8d7a only. The uncommitted `programs.ts` edit would drop the breaker-M1 `errors[]` if pushed as it is: that push needs its own diff review.

## Verdict: Approve on dbbb8d7a. No Blocker, no Major. Five Minors.

Suites on dbbb8d7a (my ports, fresh copies): `check_g2_answer_key_gate.ts` **69/69** (was 59), `_firm.ts` 13/13, `_browser.cjs` 15/15, `check_g4_answer_keys.ts` 93/93, `check_g4_tests_tab_browser.ts` 54/54 (G4 lane: no regression), `check_setup_checklist.ts` 63/63, `check_c48_sqr_release.ts` 25/25, `check_screen01_api.ts` 135/135, `check_w115_slice1.ts` 47/47.

## Each fix: correct? pass and fail test?
| Fix | Correct | Pass + fail test |
|---|---|---|
| Edition is the item (Devin 1): `pdfMap`, `itemFingerprint`, `fingerprintOf`, `runFieldMap`, `fieldListOf`, `keyBoxes`, `checkExpected`, boxes `?edition=`, editor | Yes. Run fingerprint (`runFieldMap`, edition of the map run) equals the gate's (`itemFp` with the key's edition) when the edition exists; the gate filters keys by edition (`engine/answer-key-gate.ts:54`). Boxes endpoint: 200 for the right edition, 404 in words for `01-2099` (run by hand). | Engine only: two editions, new one is its own item and old stays unchanged; old edition's signed key does not pass the new one (E7); `keyBoxes` per edition and none for a missing one; `checkExpected` keeps the 2027 edition (fails if the edition is ignored: it would move to the first map). **Not tested through the API**: `statesOf`, `runKeys`, `fieldListOf(…, edition)`, the boxes route and the editor have no two-edition test (see m3). |
| `keysUnchanged` compares the complete set (Devin 2) | Yes. `now.length === judged.length` plus every judged id, version and state present. `Gate.keys` is every key judged. A draft identical to its release cannot reach it (Submit refuses "Nothing has changed"). `FOR SHARE` does not stop a later insert; the comment says so and it is acceptable. | Yes: pass, one short (key added), another version, another state (all in-transaction). |
| m1 baseline = last real release (`realBaseline`) | Yes, both `gateOf` and the catalogue rows use it. | Pass and fail (Demo-only history gives no baseline); API line updated (Visitor visa: new to a real release, warnings on a Demo release). |
| m2 keys after the cheap refusals | Yes in `approve` and `releaseRows`. I ran Approve with a stale submission: 409, runs 2 to 2. | No test (m3). |
| m3 held reason by label | Yes: `firstError` uses `label` for Tests. | Weak: the test regex `/IMM 5257/` passes with the old text too; the rule-set case I reported has no test (m3). |
| m4 "(G2)" removed | Yes (`answer-keys.tsx`). | No test (m3). |
| Breaker M1 `errors[]` on "Every change is held back" | Yes: every blocking item of every held row with its combination; a row held only by review or by who releases is listed once; `blocking` does not leak to the catalogue (0 hits). | Yes: pass in the suite (names the Visitor visa's failing value); the fail side (held for review only) is not tested. |
| Wrapping of refusal lines | `[overflow-wrap:anywhere]` on the Review list: correct. | No test with a long unbroken value (m3). |
| Key that tests no value fails in words | Yes. | Yes, pass and fail (no "0 of 0"). |

## Issues (ranked)
**Blocker / Major: none.**

**m1, Minor: a key written for another edition is invisible to the gate, and the message does not say why.** `engine/answer-key-gate.ts:54` (`mine` filters on `k.edition === it.edition`), `web/src/components/answer-keys.tsx:97` (with one edition the tab shows every key). Repro (:4442): set the Visitor visa's IMM 5257 key to `IMM 5257 (01-2020)` in SQL, `GET /combinations/:id`: the gate says "IMM 5257 field map: no answer-key test. Write a test family's expected values…" while the Tests tab lists a key under that item; writing a new key in the same family is then refused ("already has a key here: change that one"). Before this diff the key counted and failed with "This key is for edition X; the map is edition Y". On a Demo release this is only a warning. Fix: when the item has no key for its edition but a key for another edition of the form exists, say so ("its test is for edition X; change it on Tests to move it, or write a test for this edition"). Not a hole: a real release is still refused.

**m2, Minor: a form with two mapped editions reads ambiguously, and the page breaks its own ids.** `answer-keys.tsx:73,100` (`testAnchor` has no edition: two sections get the same `id` and the same `aria-label`; Fix on Tests focuses the first), `answer-key-gate.tsx:36` (React key `field_map|IMM 5257|none` twice for two untested editions), engine label `"IMM 5257 field map"` for both (refusal lines and Fix links do not name the edition; only the block's first column does). Fix: put the edition in the anchor, the section label and the problem label when a form has more than one. Related, for the tech lead (already build-notes 8): G4's unique key (family, combination, item) means a second edition needs a second family.

**m3, Minor: tests that do not fail when the fix is removed.** (a) m2 (keys after cheap refusals): nothing asserts a refused-for-cheap-reason Approve or release writes no run; add one `runs()` check on an unsubmitted draft. (b) m3: use a rule-set held reason, or match "IMM 5257 field map:" exactly. (c) m4: no check of the Tests tab sentence. (d) wrap: the browser widths step uses no long unbroken value, so removing `[overflow-wrap:anywhere]` fails nothing. (e) per edition through the API (`statesOf`, `runKeys`, boxes `?edition=`, `fieldListOf(…, edition)`): engine tests only; one two-edition combination in `_api` would cover it. (f) breaker M1 fail side: a row held for review only appears once in `errors[]`.

**m4, Minor: Approve still runs the keys before the self-approval check.** `api/src/studio.ts:~936` (the `canRelease` loop is after `runKeys`). It only matters for a person who holds both the author and the approve duty (user-A has no approve duty: 403 first). Fix: move `runKeys` after that loop, as in round 1.

**m5, Note for the tech lead: breaker M2 left unchanged.** A check with no quote makes a real combination's draft a Demo release (G3, P-240). I agree with build-notes 12: it is G3's rule from the snapshot, only in the demo workspace, the release is marked and never counted real, and a failing key still refuses it. Not a G2 finding.

## What I could not check
A two-edition combination end to end (no API path creates a second mapped edition; engine tests and the boxes endpoint were run). A real two-tab race on `FOR SHARE`. Screen readers, 200 % zoom, and the scale (nothing in this diff changes it: one more `findMany` of releases per gate, one `rows()` call after a refusal). The uncommitted third-pass edits in the shared checkout.

**Verdict: Approve** (dbbb8d7a; no open Blocker or Major).
