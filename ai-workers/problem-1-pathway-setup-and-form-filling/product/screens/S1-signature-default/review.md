# S1 — signature default (SA-1B-102 rule 3): review

Reviewed commit `e06643c8` on `s1-local` (diff `origin/main...e06643c8`: `engine/runtime/readiness.ts` +19/-2, `tests/check_c76_readiness.ts` +24/-2). Runtime lane, no screen. Reviewer did not build it. 2 Nov.

**Verdict: Approve** (no open Blocker or Major). Minors below; m1 and m2 must be written into the PR body (or a forms-lane backlog row) before merge, so the deviation is not silent.

## Evidence
- `npx tsx tests/check_c76_readiness.ts` (studio folder, no server, US$0): **63/63 passed**.
- Mutation runs on a scratch copy of the commit (repo untouched):
  - old rule restored (`signature !== NONE && !== TYPED_NAME`): 3 S1 checks fail (PDF upload, Paper, S1 property);
  - `signedBy !== "none"` dropped: "S1 pass: No signature" fails;
  - `signedBy: null` treated as none: the S1 property fails;
  - Online waited for: the "S1 pass: Online" check fails.
  Each rule part has a test that fails when it is removed.

## (1) Rule and done-when
SA-1B-102 rule 3 (SA-01B v2.1, line ~2370): "`signedBy`… `signatureMethod`… Both optional. Empty `signedBy` means a signature is needed. Empty `signatureMethod` adds no rule." §10: "an empty rule defaults to 'signature needed'". §11: "given a line with no `signedBy`, then the form needs a signature."
- Local mapping: `signedBy` (`String?`, schema.prisma:536, SIGNED_BY with `none`) is the team's `signedBy`. `signature` NONE is the empty `signatureMethod`. `signatureNeeded` (readiness.ts:179-183) then needs a signature on PDF upload and Paper unless `signedBy === "none"`. That matches rule 3 and the §11 failure test.
- New lines: the schema default is NONE (schema.prisma:532), and `SIGNATURE_FITS.PDF_UPLOAD[0]` is NONE (contracts/forms.ts:26). So a new PDF upload line now needs a signature. **Done-when met at rule level.**
- **No migration and no new enum value are needed.** `signedBy` null already means "not set" (the Forms tab shows "Not set": web/src/pages/workspace/forms.tsx:145, contracts/workspace.ts:87). A `NOT_SET` signature value would duplicate it, and it would need a change to the DB check `combination_form_signature_check` (migration 20261030140000). Existing PDF upload lines with NONE move from "no signature" to "waited for". That is the safe direction (duplicate beats a miss), and it changes no data.
- Caveat: nothing in production calls `filingReadiness` yet. `api/src/case-prepare.ts:179-180` still stubs readiness as "not built yet". So "never filed unsigned" is proven for the rule, not end to end. The C7.6 part 2 wiring must pass `signed_by` (already in the prepare items, case-prepare.ts:166/170) into `FormItem.signedBy`.

## (2) Online with NONE not waited for
Accepted. On Online, the person signs in the IRCC portal at submission. The product records no signature there (contracts/forms.ts:22-24: "the portal's own declaration is the portal's, not ours to record"). "Ready to file" comes before submission, so waiting would leave the line blocked with nothing that can clear it. Rule 3's "needs a signature" is still met: the person signs, in the portal. NOT_NEEDED has nothing to sign. This is a local reading of a channel-blind rule, so record it (m2).

## (3) Regressions and other readers of NONE
- `engine/runtime/preview.ts:160` `outputOf`: NONE gives "No signature", `toSign: false`. **m1.**
- `contracts/forms.ts:21` `SIGNATURE_WORDS.NONE = "No signature"`, offered first in the Signature select (web forms.tsx:353, api/src/workspace.ts:77). **m1.**
- `engine/channels.ts:26,127` `signatureFits` / release check: unchanged and still correct. NONE fits PDF upload, and Paper allows only PEN (so the Paper branch at readiness.ts:182 cannot be reached with valid data; it is harmless defence).
- `engine/render.ts:86` `formSigners`: null means "person", and "none" means nobody. Consistent with S1. It is only used for HAND_SCANNED lines (`engine/sources.ts:242`), so a NONE PDF line puts no signed scan on the Documents tab (see m3).
- `engine/snapshot.ts:186` and `api/src/form-uses.ts:106` leave NONE out (absent = NONE). Consistent: absent now reads as "not set".
- `api/src/forms.ts:101` channel change defaults to `SIGNATURE_FITS[c][0]`. A switch to PDF upload lands on NONE, which is now waited for. Safe.
- `engine/runtime/prepare.ts:54` `channelOf`: a case-level switch from Online to PDF upload keeps NONE, which is now waited for. Safe.
- Not touched, and left to the forms lane on purpose: the "No signature" wording of the method, Preview's `toSign`, and the Documents tab.

## (4) Test quality
- Good: deterministic pass and fail cases for PDF upload, Paper, `signedBy` "none", signed, Online, and HAND/PEN with "none". Words checked ("not set", the form name). The S1 property covers every SIGNED_BY value plus null and undefined. The C7.6 independent statement (`needsWork`) was updated, not weakened.
- m4 below.

## Findings
**Blocker:** none. **Major:** none.

**m1 (Minor): the words still say "No signature" for a method the engine now reads as "not set".** contracts/forms.ts:21; preview.ts:160; forms.tsx:353.
Failure scenario: a publisher picks Signature "No signature" on a PDF upload line and leaves Signed by "Not set". Preview says "No signature". Once C7.6 is wired, the case's readiness says "must be signed (how it is signed is not set…)". The publisher's explicit choice is overridden, and two screens contradict each other.
This also reinterprets P-143's value "none" without recording it. Fix (forms lane, not this PR): on PDF upload, word NONE as "Not set", or point "No signature" to Signed by. Record it in the PR body now.

**m2 (Minor): the channel exceptions are a local reading of rule 3 and are not recorded.** readiness.ts:179-183.
Rule 3 is channel-blind. The code skips Online (and TYPED_NAME on any channel), and records this only in a code comment.
Failure scenario: a later reader applies §11 ("no `signedBy` → needs a signature") to an Online line and calls it a bug.
Fix: one line in the PR body. TYPED_NAME is not waited for (existing BR-9 1 behaviour, check_c76_readiness.ts:40). Whether that fits SA-1B-30 rule 3 ("SIGNATURE boxes are never filled by ExpatReady") is for the forms lane to confirm; it is not S1 scope.

**m3 (Minor): the block for an unset method is owed by the client** (readiness.ts:121-123, `signerOwes ?? "client"`).
Failure scenario: the left list puts "IMM 5707 must be signed (how it is signed is not set on the form line yet…)" under Client. The client cannot set the line's method, and no screen asks them for a signed scan (sources.ts:242 lists only HAND_SCANNED lines). Fix when C7.6 is wired: when `signature` is NONE, owe it to staff, or split it into "set the method" (staff) and "sign" (client).

**m4 (Minor): the C7.6 independent property catches the old rule only some of the time.**
In 8 runs with the old rule restored, "ready exactly when…" failed 2 times. The generator (check_c76_readiness.ts:174) never sets `signedBy`, and the case where only a NONE line on PDF upload is unsigned is rare.
Failure scenario: none today, because the deterministic S1 checks fail every time. Optional: add `signedBy` to the generator and to `needsWork`.

## Context, not findings
- P-237 / row L-SA3 (2 Nov) will make a missing signature a CRITICAL warning, not a block. S1 keeps `missing_signature` as a block, the same as the current C7.6; L-SA3 reworks it.
- The library-form case (rule 5) and AG-07's `signatureNeededOverride` are outside S1.

## Journey score
**Not scored (not applicable).** No screen, page or route changed, and no product path calls `filingReadiness` yet (case-prepare.ts:180 stub). A person has nothing to walk. Rule behaviour was checked by the test run and the mutations above. The journey belongs with C7.6 part 2, when readiness reaches the prepare view.

## Could not check
End-to-end behaviour (readiness is not wired). Real IRCC portal signing (Sample; Unconfirmed: no counsel).
