# Review: QA-195 (identity documents by name), commit 369e4cf06

Reviewer: a fresh agent that did not build it. Diff `git diff origin/main...369e4cf06` (4 files, +36/-4). Isolated copy on :4441 (`xr_studio_rv_qa195`, since stopped and dropped). US$0: no `*_LIVE` variable, no priced route, no model call. Every run below was on the committed code (the worktree was clean when each ran; uncommitted builder edits appeared later, at 17:58 IST, and are **not** reviewed here).
This is an engine guard, not a screen. Screen-review checks (2)–(4) apply only to the To review rows the guard changes; journey report: `journey-test-reviewer-2026-11-03.md` (score **7.5/10**).

## What held (evidence)
- **The row's case is fixed.** `engine/masters-ai.ts:199` ORs `isIdentityName(name)`. "Passport", category "travel", flag false, reader `letter_or_record`, both rounds: now `person_only`, identity true, **Check**, rule `identity_not_read_by_ai` failed. On screen it sits under Check with "An identity document is never read by AI (P-134)…" and has no bulk checkbox. Accepted through the drawer, the library row is `{"readerKind":"person_only","identityDocument":true}` DRAFT.
- **The test fails when the rule is removed.** A mutant without the `isIdentityName` clause (scratch copy, not in the repo) gives "Passport" and "National identity card" back as `letter_or_record`, Ready. So the new QA-195 checks at `tests/check_forms_c34_ai.ts:82-88` would fail.
- **C2.6 is unchanged.** `CODED_IDENTITY` is byte-identical to the old `IDENTITY` (`/\bpassport\b|\btravel document\b/i`, same flags, no `g`). `check_forms_c26_checklist.ts` 39/0, `acceptance/C2.6.test.ts` 32/32.
- **Suites.** `check_forms_c34_ai.ts` 54/54 (run with `--tsconfig api/tsconfig.json`; without it, tsx fails on decorators). `tsc -p api/tsconfig.json`: no error in the touched files. Graph `--check` exit 0.
- **The regexes keep no state.** `IDENTITY_NAME` and `CODED_IDENTITY` have no `g`. `PHOTO_ONLY` has `g` but is used only in `replace`. Three calls in a row give the same answer.
- `acceptance/C3.4.test.ts` is 7/16. This was already red: the replay is refused until the founder-approved saved run is committed, as its header says. It is not a regression.

## Blockers
None.

## Major (2)

**M1. The new list misses IRCC's own identity wording, so these come out Ready and can be bulk accepted with an AI reader.** `engine/identity-documents.ts:10`. Probed on the commit:
- Missed: "Proof of identity" (guide 5289 heading), "Photo identification" (the IMM 5257 consent note), "Photo ID", "Government-issued photo ID", "Identification document", "Certificate of identity" (an IRCC-recognised travel document), "Certificate of citizenship", "Certificate of birth", "Driving licence", "Driver’s licence" (curly apostrophe), "PRTD".
- Shown end to end: seeded through the product's own `formMastersFromRounds` and `insertProposals`, "Proof of identity" (category "civil") appeared under **Ready to accept**. "Accept 2 items" landed it as `{"readerKind":"letter_or_record","identityDocument":false}` DRAFT.
- This is the same leak QA-195 was raised for, and the row's "Done when" says "similar names".
- *Fix:* also treat any name containing the word identity (`\bidentit(y|ies)\b`), `\bidentification\b`, `\bphoto id\b`, `\bcertificate of (identity|citizenship|birth)\b` and `\bdriv(er'?s?|ing) (licen[cs]e|permit)s?\b` as identity documents. Fold `’` to `'` before matching. These false positives are safe: a person reads the document.
- *Fail test:* add the missed names above to the `named` array at `check_forms_c34_ai.ts:84`. Each must come out `identityDocument === true` and `readerKind === "person_only"`.

**M2. The one door does not hold the rule, so the fixed case lands in the library with an AI reader after an edit.** `api/src/proposals.ts:421-426` (lander) and `:554-558` (`decide` edit checks the contract only).
- Probe on the commit: the guarded item "Refugee travel document" (`person_only`, identity true) was sent as `POST /api/review/proposals/decide {action:"edit", payload:{…readerKind:"letter_or_record", identityDocument:false}}` by user-A. The answer was 201, and the library row is `letter_or_record`, identity false.
- The screen offers only "Accept the checker's reading" (`web/src/pages/proposals.tsx:169`), which carries the guarded payload, so this is an API path. P-153 (1) still says code enforces identity rules "on every proposal, whoever made it (AI, rules or a person)", and QA-195 cites P-153 as its rule. A guard only where the AI's output is turned into proposals is not the server guard P-153 asks for.
- **In scope or follow-up?** In scope. It is the same list at the door that writes the result: one call, `isIdentityName(d.name) || d.identityDocument`, then refuse an AI reader or set `person_only`, and store `identityDocument` from the same test. The breaker found it independently (`break-report-qa195.md` B1).
- If the tech lead rules it out of scope, a new QA row (Major, P-153) must be filed before merge.
- *Fail test:* edit a waiting identity `document_type` to `letter_or_record` via `decide`. Expect 409 (or a landed `person_only`) and `identityDocument:true`. Also cover a person-named "Passport" (`studio.ts:816` sends `identityDocument:false`).

## Minor (3)
1. **C2.6 still uses the narrow list.** `docTypeOf` uses `CODED_IDENTITY` (`api/src/checklist.ts:140,145`). Checklist lines such as `birth_certificate` or `national_identity_card` are proposed as `letter_or_record`, identity false, while C3.4 treats the same names as identity documents.
   - This is not a regression: it is the brief's "C2.6 unchanged". But the new header claims "One list for every step" (`engine/identity-documents.ts:2-3`), which is untrue.
   - **Coupling:** once M2 refuses AI readers at the door, accepting such a C2.6 line would 409. So C2.6 must classify identity with `isIdentityName` too (keeping `coded_lines` only where `CODED_IDENTITY` matches, `person_only` otherwise). Otherwise this becomes Major.
2. **`passport_photos` disagrees between the two steps (already on main).** `CODED_IDENTITY` matches it, so C2.6 gives a photo a `coded_lines` reader. `isIdentityName` correctly excludes it. The new pass check only asserts `!CODED_IDENTITY.test("visa application photos")`.
3. **Other languages are not covered** ("Passeport", "Carte d'identité", "Acte de naissance"). IRCC publishes French editions (IMM 5257 F). Record this as a known limit in the module comment, or add the French forms of the listed names.

## D1–D20 (this change only)
D1 ½ the row's case is met; similar names (M1) and the door (M2) are not · D2 ½ identity data can still be wrong in the library (M1, M2) · D3 1 one shared module, C2.6 copy removed · D4 1 n/a, no rules changed · D5 1 the guard is pure and keeps no state · D6 1 audit unchanged · D7 1 the Check reason and failed rule are visible · D8 1 To review › edition group · D9 1 Check row, one Accept · D10 ½ the failed-rule text says "The AI named a reader…" when the name decided · D11 1 Check badge, failed rule · D12 1 team components, no new UI · D13 ½ no sideways scroll at 400/1024/1440, drawer opened by keyboard; axe not run (not installed) · D14 1 · D15 1 page 0.6–0.8 s, accept 0.5 s · D16 ½ the tests fail when the rule is removed, but miss the M1 names and the M2 door · D17 simulated only · D18 1 IRCC's words with file and edition · D19 ½ library result wrong for M1 and M2 · D20 simulated only.

## Retrofit / graph
No new page or route. `engine/identity-documents.ts` is reached by `masters-ai.ts`, `checklist.ts` and the test. Graph check is clean.

## Could not check
- axe WCAG scan: `@axe-core/playwright` is not installed in `studio/node_modules`. Install proposal for the founder: `@axe-core/playwright` latest 4.x from npm, as a studio devDependency, for the axe step of journey-test.
- A real screen reader. An intended user's unaided walk (D17, D20).
- A Live run (not allowed). The Saved replay with this case: there is no recorded run, so the item was seeded through product code.

**Verdict: Block.** Fix M1 and M2, each with its fail test. Fix Minor 1 together with M2.

---

# Round 2: diff `369e4cf06..9c79ef5e7` only

Same isolated copy on :4441 (fresh database per suite, since dropped). HEAD 9c79ef5e7, clean worktree. US$0.

## Suites (all re-run by me)
| Suite | Result |
|---|---|
| `check_forms_c34_ai.ts` | 56/56 |
| `check_forms_c26_checklist.ts` | 41/0 |
| `check_forms_c26_queue_breaks.ts` | 20/0 |
| `check_s6_p149.ts` | 78/0 |
| `check_forms_c36_requirement_type.ts` | 34/0 |
| `check_forms_c36_acceptance.ts wp.family` | 17/17 |
| `check_forms_proposal_contract.ts` | 22/0 |
| `acceptance/C2.6.test.ts` | 32/32 |

- `acceptance/C3.6.test.ts` stops at its own setup ("Visitor visa needs C4.11 first"); that pack also waits on other work, so this is not a regression.
- **Correction to round 1:** `@axe-core/playwright` 4.4.1 *is* installed. I misread a directory listing, so withdraw that install proposal. Axe run now: To review, IMM 5257 group, WCAG 2.0–2.2 A/AA, **0 violations**.

## Round-1 findings
- **M1, closed.** Every name I listed is now caught, as are "Identity and civil status documents", "Pièce d'identité", "Pasaporte", "Reisepass", "Military ID", "State ID", "COPR" and "Naturalisation certificate". Of the 32 identity names I probed, only "Laissez-passer" and "Seaman's book" are missed (see Minor A).
  - Of the 42 non-identity names I probed, none is flagged except "Identity-theft police report", "Student ID card" and "Tax ID letter". These are false positives in the safe direction: a person reads them.
  - Passport photos still come out as photos: "Passport-size photo" and "passport photos" are photos, not identity documents; "Passport photo page" is identity.
  - The fail test is `named` at `check_forms_c34_ai.ts:85-88`.
- **M2, closed.** The lander refuses with 409 (`proposals.ts:426`) and records `identityOf` (`:427,431`).
  - Test `check_forms_c34_ai.ts:190-199`: an edit to `letter_or_record` gives 409 and nothing lands; `coded_lines` gives 201 and lands as identity true. Removing the guard would let the 409 case land, so the check fails then.
  - The author's own add records `isIdentityName` (`studio.ts:817`).
- **Minor 1, closed.** `docTypeOf` reads the shared list (`checklist.ts:147-151`): only a passport or travel document gets coded lines, any other identity document gets `person_only`. Tests at `check_forms_c26_checklist.ts:57-62`.
- **Minor 2, closed.** A passport-size photo is no longer read by coded lines. That changes C2.6 as intended, and the C2.6 pack stays 32/32.
- **Minor 3, closed.** The listed French names are covered; the limit is stated in the module comment.

## New in round 2 (Minor, none blocking)
- **A.** "Laissez-passer" and "Seaman's book" are missed (rare travel or identity papers). Add them if the list is touched again.
- **B. A waiting item made before this change, with an identity name and an AI reader, is now a dead end on screen.** I seeded "Birth certificate" with `letter_or_record`, Ready, through `insertProposals`, then:
  - "Accept 2 items" with "Bank statement": 409 toast "…Choose its coded lines, its printed layout or a person's reading." Both stay waiting: the batch is all or nothing, which is correct.
  - The same 409 when accepting the item alone.
  - But the screen offers no reader choice, so only Reject works. The toast also does not say that nothing in the batch was accepted.
  - New drafts cannot reach this state (the masters guard, C2.6 and the author's add all give non-AI readers), so only queues from before this change are hit. The refusal is P-153-correct.
  - *Fix (Should):* word the toast for the screen, e.g. "Reject it and draft again; nothing in this batch was accepted". Or have the masters/C2.6 replay re-guard waiting items.
  - *Fail test:* seed such a waiting item and assert that the 409 text names a step the screen offers.
- **C.** B6 (two items when the rounds disagree on a name) and B8 (names in non-Latin scripts dropped) are unchanged, as stated. Both fail safe.

## D1–D20 changes from round 1
D1 1 · D2 1 · D10 ½ (the toast in B names an action the screen does not offer; "P-134" shown to users) · D13 1 (axe 0 violations, keyboard, three widths) · D16 1 (the door, the names and C2.6 each have fail tests that fail without the rule) · D19 1. All others as in round 1. Journey score round 2: **9/10, pass** (`journey-test-reviewer-2026-11-03.md`).

**Verdict: Approve** for 9c79ef5e7. There is no open Blocker or Major. Minors A and B are for the builder's judgement or a follow-up row.
