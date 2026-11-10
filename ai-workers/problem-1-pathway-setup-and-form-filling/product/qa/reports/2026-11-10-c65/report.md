# qa capability C6.5 after #1444 (QA-352), main 2cfdad961, 10 Nov 2026, 07:10–07:55 IST

qa lane, cloud copy, `/qa capability C6.5`. Records PR #1475, branch `claude/qa-2026-11-10-c65` from main 2cfdad961. Live AI off; US$0; no priced button pressed (P-175). Scope ruling: **P-437** (Lead 1, series 2, 9 Nov ~18:50 IST, on #1439). It is in `DECISIONS.md` on the Lead's branch `lead/2026-11-07-lead31`, not yet on main. Its words:

> (1) Language-test and ECA report reading (AG-9-52) is outside C6.5's M3 part … (2) Textract is the production reader (P-133, P-134), not needed for the prototype's Works; the row's "one reader per document kind" still holds: every Visitor visa checklist document that offers "Fill this from documents" must be read by some reader (MRZ rules, AI vision on Sample files). If the walk shows none unread, C6.5 is Works on nightly 42619403776 with no re-run; otherwise it stays Partial on that one named gap.

The M3 plan (`design/m3-sprint-plan-2026-11-06.md`, "Settled in a row's Done when") leaves AG-9-52 to C6.5's Done when, and P-437 (1) settles it: out of M3. Backlog B167 asks the row to name P-437; this round's row does.

**Verdict:** by the fresh reader on Opus that ran nothing (P-303), in `reader-verdict.md`, word for word. Summary at the end.

## What changed since the last round (9 Nov, main d8fddc328, Partial on QA-352 alone)
#1444 (merged 10 Nov 02:27 IST, `runtime: C6.5 — every Visitor visa checklist document that offers reading is read (QA-352)`) changed:
* `api/src/case-documents.ts` (+209/−60) and `document-review-counts.ts`;
* `acceptance/C6.5.test.ts` (+87: C6.5-21 to -25);
* `samples/document-supplies-read.json`, the library data: proof of funds → `case.funds_available_cad`; marriage certificate → `relationship.union_start_date`;
* the configured checkpoint's combination step 335;
* two saved AI reads (the Lead's paid run, US$0.026).

Its reviewer approved four rounds (`screens/C6.5-documents-drawer/qa352-review.md`; journey 10/10).

**P-339: nightly 42619403776 no longer counts.** It ran on d8fddc328, before #1444 changed C6.5's own code and pack. So P-437's "no re-run" no longer holds as written: a green run on main's head is needed. Asked of the tech lead on #1475 ("Question for the tech lead", capabilities=C6.5, data=checkpoint). The cloud lane's dispatch gives 403. Run 42738773981 on 2cfdad961 (07:22 IST) ran C8.3 only.

## Packs on the configured checkpoint (P-322), qa's own copies: all green
`tools/gate-b.mjs --title C6.5` with `GATE_B_DATA=checkpoint`. Each pack ran on its own fresh copy (Load the configured checkpoint, ~132 s), on main 2cfdad961's app tree. Output: `packs-checkpoint.txt`.

| Pack | Exit | Steps |
|---|---|---|
| `C6.5.test.ts` | 0 | 57/57 |
| `C6.5-screen.test.ts` | 0 | 33/33 |
| `C6.5-counts.test.ts` | 0 | 13/13 |

Gate B passed; gate-b.mjs exit 0. That is 57/57, against 36/36 on 9 Nov: the +21 are QA-352's steps, including -21e, which fails the checkpoint when either type loses its reader. On GitHub's runners: **pending** (above).

## Gate A by screens (P-317, P-348 (3)): see `walk.md`; screenshots 01–15
On my own checkpoint copy, at 1024 px, as the case officer:
* **Proof of financial support** on Client A's line → the application's "Details of visit to Canada" → cost card → "Replay the saved read · US$0" → "CAD 14,200", "1 left" until ticked → Confirm & use → Used. Underneath: VERIFIED, `document_read`, `ai_vision`.
* **Marriage certificate** (shared, provided by Spouse A) → Spouse A's Personal details → Replay → "14 Jun 2019" → Confirm & use → Used.
* **Minor's birth certificate** on Child A1's line → Child A1's Personal details: "read by a person. Check its values against it."
* **Next capability's first step (C7.3):** Client A's IMM 5257 answer sheet carries both values, 2019-06-14 under Personal details and 14200 under Details of visit to Canada, each with Copy. Spouse A's sheet carries the funds.

No model call: `ai_batch` held 7 rows before and after.

Headless replay of the three drawers: 400/1024/1440 px, twice, axe 0, no sideways scroll, 166–271 ms (`replay-headless.txt`, 18/18).

## Reader coverage on the checkpoint's Visitor visa release (P-437's test): `reader-coverage.txt`
Release v2's nine checklist types, each with `supplies_facts` and `reader_profile.readerKind`:

| Document type | Supplies facts | Reader | Offers "Fill this from documents"? |
|---|---|---|---|
| passport information page copy | MRZ facts | coded lines (rules) | yes, read |
| proof of financial support | funds | AI vision (saved read) | **yes, read (walked)** |
| marriage certificate copy | union start date | AI vision (saved read) | **yes, read (walked)** |
| fee payment receipt | none | letter or record | no: supplies nothing |
| minor's birth certificate | none | person only, identity document | no: named "read by a person" (walked) |
| absent parent's passport or ID | none | person only, identity document | no |
| adoption or guardianship papers | none | person only | no |
| custody documents | none | person only | no |
| letter of authorization for a minor | none | person only | no |

The letter of invitation is a case-level kind read by AI vision: the pack's C6.5-19b and -20 are green.

**On P-437's wording, no document that offers "Fill this from documents" is left unread.** The birth certificate was QA-352's third named document. It is an identity document on the code list (`engine/identity-documents.ts`; P-134, founder: "AI never reads identity documents"), so a person reads it. The Lead records the same in ASSUMPTIONS C11 (Lead's branch): "A minor's birth certificate stays read by a person (P-134 identity list)". P-133 says "foreign civil records by AI vision". Against that, P-134, a founder decision, is the stricter rule and is what is built. The child's date of birth comes from the child's passport by rules. See Question 2.

## Bugs
* **QA-352 (Gap · Major): proposed closed.** Proof of funds and the marriage certificate are read and walked by screens. The birth certificate is read by a person, per P-134 and C11. The reader decides.
* **New QA-379** (Bug · Minor, C7.3, forms): the answer sheet's Source for every application-level answer is "Case officer". The funds read from the document show "Case officer" (11c). The cause is read in the code (`case-prepare.ts` ~875, the subject "case" against the case subject's id).
* **New QA-380** (Gap · Minor, C6.5, runtime): the couple's marriage certificate, read once, gives the marriage date for Spouse A only. Client A's question stays unanswered, Spouse A's IMM 5257 still asks it, and Client A's drawer says "Nothing to read here" (10, 12b, 13). On this release the fact is person-scoped.
* **QA-353 (UX · Minor): seen again, unchanged** (API, Client A's subject on the application's section).
* **QA-348 (C7.3):** not retested; it is the same column as QA-379.

That makes **0 Blocker · 0 Critical · 0 Major · 2 Minor new**.

## Coverage
Not run this round: no c8 or graph. A records round on one capability; the suites ran on GitHub for #1444's merge.

## What I could not test
* GitHub's run on main's head: pending the tech lead.
* The shared demo :4400 (none in a cloud copy).
* A headed browser (no display); headless at 1024 px, with screenshots.
* A real screen reader.
* A live read: not allowed, and none was needed.

## Questions for the Lead
1. **Nightly:** please dispatch `nightly.yml` on main with capabilities=C6.5 and data=checkpoint (asked on #1475). The row moves to Works only with that run id in it (P-339).
2. **P-437 against P-134 (the birth certificate):** P-437 lists "MRZ rules, AI vision" as readers. P-134 forbids AI on identity documents, and the code and ASSUMPTIONS C11 say a person reads the minor's birth certificate. qa reads P-437 as met: the certificate supplies no fact, so it offers no "Fill". Please confirm in DECISIONS or C11 on main. P-133's "foreign civil records by AI vision" against P-134's identity list is a founder pair (AGENTS rule 2).
3. **QA-380:** should one couple's certificate fill both spouses' marriage date (the supply "about: couple"), or should the configured checkpoint mark the date Household (C3.16)? qa does not hold C6.5 on it.
4. Seen, not filed: typing only the Day of a date and saving stores `"--20"` as a DECLARED answer, flagged on screen. Is keeping a malformed date as an answer intended?

## Suggestions
* *Later · Capability:* a release check that every shared ("once for the couple") document's supplied facts reach both members (QA-380).
* *Later · Scaffolding:* gate-b.mjs could save each pack's step lines next to its summary, so a qa record can quote steps without a second run.

## Verdict (from `reader-verdict.md`)
See that file.
