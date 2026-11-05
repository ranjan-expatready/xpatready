# C4.5 · Facts this document supplies — fresh challenge (skill screen-concept §B)

Challenger: an independent agent that did not draft the concept, 5 Nov 2026. Read: `concept.md`, `qa/CAPABILITIES.md` C4.5, the branch diff (`git diff origin/main...HEAD`, 11 files), `engine/sources.ts`, `engine/runtime/case.ts`, `engine/runtime/preview.ts`, `engine/snapshot.ts`, `engine/validate.ts`, `api/src/studio.ts` (submit, release, publishRow, draftAuthors), `library-changes.ts`, `screen02.ts`, `who-fills.ts`, the web pages named in the brief, STANDARDS, EXPERIENCE, QUALITY, RULES ("Added 4 Nov"), P-130/P-149/P-170/P-319, and the official text (`expected/source-text/imm5484e…`, `imm5257e…`, plus `pdftotext` of `official-sources/ircc/checklists/imm5484e.pdf` for page numbers). `ai-workers/tools/freshness.sh` fails in this copy (`code/README-copies.md` missing); the concept cites no SA-01B section, so this changes nothing here.

## Verdict
**Build after these changes.** No Blocker. The governance path is sound and reuses the one door. The changes are: dated cites, the missing tests, honest words for the Preview stand-in, and a panel that fits and needs less typing.

## Objections

### Major
**M1 · A cite has no date read (AGENTS rule 4, P-170: page, quote and date).** *Needed for the proof.*
What breaks: `SupplyCite` is `{fact, label, about, source, quote}` (`contracts/document-supplies.ts`). The date only appears once at file level in `samples/document-supplies.json` (`read_on`) and is never stored on the change, so To review and History cannot show when the words were read. Example: a reviewer in 2027 sees "IMM 5484 (05-2026), page 1" with no date and cannot tell whether a newer edition was checked. Fix: add `read_on` (YYYY-MM-DD, today or earlier; reuse the date messages in `contracts/source-register.ts`) to each cite, or to each official line (see M4). Show it on the change page.

**M2 · BR-4, BR-5 and BR-6 lack pass and fail tests (STANDARDS §2.10, QUALITY D1/D16).** *Needed for the proof.*
The concept says the pack covers "pass and fail per BR-1…BR-7". `acceptance/C4.5.test.ts` does not test:
* BR-4: "Listed twice", merged field, retired field, "Nothing changes", or a fact about the holder's spouse.
* BR-5: the "Changed since" 409 at approval (`applySupplies`); only the "already waits" half is tested.
* BR-6: no release at all, so nothing checks that the change becomes RELEASED, the type PUBLISHED, and the release diff carries the Document type line with the SME duty.
* Withdraw: not tested.

Fix: add steps for each. For BR-5, drive the change through a product route if one exists (a field merge moves supplies, `forms.ts:390`), else as a unit test of `applySupplies`. For BR-6, release Visitor visa of the six through the screens' routes, as the other pack-2 rows do.

**M3 · The Preview try-out is a stand-in, and the screen does not say so (P-33).** *Needed for the proof.*
Fact: a case's client questionnaire never skips document facts in M2. `api/src/runtime.ts:267,276` call `caseView` without `skipDocumentFacts`, and `case.ts:263` says "Preview only for now … the case default with M3's documents-first intake". That is right, because with no reader (C6.5, M3) a skipped fact would be filled by nobody. But the existing Documents tab says "Missing or unreadable at the case, the questionnaire asks them" (`documents.tsx:139`), which suggests a case behaviour that M2 does not have. Concept §6b names the stand-in; the copy does not.
Fix:
* Under the "Try it missing or unreadable" toggle and in that Documents tab sentence: "Tried in Preview. In a case the client is still asked these until documents are read (M3)."
* qa scores C4.5 on the Smart questionnaire tab plus Preview (see Q1).
* Tighten C4.5-16: today it accepts `back.length > 0`. It should require every supplied fact to come back, and nothing else to change.

**M4 · The panel does not fit its pattern and makes the RCIC type the same words again.** *Needed for the proof.*
* Fit: EXPERIENCE §3 sets a side panel at 480–560 px. The concept puts a five-column table (Fact · About whom · Official words textarea · Source · Remove) inside it, which cannot fit at 1024 px.
* Typing: the sample has 9 facts and only 4 distinct quotes (6 cites in all). "Your photo, name, date and place of birth." is repeated 3 times and "The issuance and expiry dates;" twice, so the RCIC fills in 18 quote and source fields where 6 cites would do.

Fix (UI only; the API keeps one cite per fact):
* Show one card per official line (source, page, date, quote), with the facts it names as chips below it. Each chip has an "about whom" choice, default the holder.
* "Add official words" adds a card.
* Prefill the first card from the checklist line's own quote and file. The passport line already holds IMM 5484's words.
* In the fact picker, list first the questions that combinations using the type ask, with search over all shared fields.

**M5 · The editor sends the RCIC away from where they notice the gap.** *Needed for the proof.*
The concept says it mirrors "Change who fills". In fact, who-fills is edited inline in the combination's Sources drawer (`sources.tsx:270–300`), not on the library page. The RCIC sees "none · filed as is" on the combination's Documents tab (`documents.tsx:205`), and the concept turns that sentence into a link to Library. That loses the combination's context (which questions it asks, who holds the document).
Fix: open the same panel in place from the Documents drawer, headed "For every combination · used by N". Keep the Library row action as the second entry point. This adds no new scope, because both entry points are already in the concept.

### Minor
* **m1 · Some quotes need checking (all verbatim on IMM 5484 (05-2026) page 1, file hashes match).** *Needed for the proof.*
  * Passport number, issue date, expiry date, date of birth: the quotes support them.
  * Family and given names: supported by IMM 5257 "(as shown on your passport or travel document)".
  * Citizenship: the words do say the passport lists the country of citizenship. But they come from a different item ("Photocopy of your current immigration status: If your country of residence differs from the country of citizenship listed on your passport…"), and the source line does not say so. Fix: the source line names the item.
  * Birth city and birth country: both rest on one item, "place of birth". IMM 5257 Q5 asks City/Town and Country separately. The sample left out the country of issue under the rule "a fact no official words tie to the document is left out", so this needs the same care. Judgment, medium confidence (see Q2).
* **m2 · The release diff shows field keys.** `engine/validate.ts:269` labels a Document type change "supplies person.passport_number, …", which the immigration expert signs (EXPERIENCE §5: no IDs). C4.5 is the first writer, so this now shows. Fix: name facts with `factWords`. *Needed for the proof.*
* **m3 · Gap between approval and apply.** `screen02.ts:133–136` sets APPROVED before `applySupplies` runs, outside one transaction. A release in that gap runs `releaseSupplies`, finds no DRAFT, and marks the change RELEASED with nothing applied. The same gap exists for who-fills. Fix: mark it released only when the newest PUBLISHED type's facts equal `after`. *Not built.*
* **m4 · A type whose ADD is not approved.** `typeOf` accepts a version 1 DRAFT whose ADD still waits. If that ADD is later withdrawn, the draft goes, and `releaseSupplies` later reports the change released. Medium confidence. Fix: refuse with "Approve the new document type first." *Not built.*
* **m5 · Panel states.** The concept draws only Waiting. The API also has:
  * Returned: not sent again; the author withdraws, then proposes again (`library-changes.ts` resubmit).
  * Approved, not yet released: blocks any new proposal, because OPEN includes APPROVED.

  Fix: draw all three, as `sources.tsx` does for who-fills. *Needed for the proof.*
* **m6 · A fact with no question placed** is accepted, so "asked when missing" has nothing to ask. Fix: warn on that fact and on To review, reusing `library.tsx:160`'s words; do not refuse. *Needed for the proof.*
* **m7 · The change's timing is misstated.** To review says "goes out with the next release", but at approval every combination's draft, Smart questionnaire tab and Preview change at once. A combination already submitted is then refused at release ("changed since") until it is submitted again. Fix: say both on the change page. *Needed for the proof.*
* **m8 · Library copy contradicts the model.** The Library subtitle (`library.tsx:381`) says supplies "are a proposal until reading that document proves them on a case", which is not the approved-by-a-second-person model. Fix the copy. *Needed for the proof.*

## What is sound
* **One door:** it reuses `library_change` → `decideChange` → `afterApprove` → `publishLibraryChanges`, like C4.9 and C4.11.
* **Permissions:** only an author proposes (403 for the approver and the reviewer, tested). The proposer cannot approve (403, tested). `appliedBy` is null, so there is no self-approval by applying. The approver who releases still needs the SME sign-off on the Document type line (`validate.ts:266–270`, `needs_sme: true`).
* **Concurrency of propose:** an advisory lock plus a check for an open change, inside one transaction. Decide and withdraw are guarded with `updateMany`. Approval checks "Changed since". Nothing changes before approval.
* **No leak:** released cases read their frozen `configRelease.snapshot` (`runtime.ts:88,160`). Another combination's released behaviour changes only at its own next release, and that release names the change for the expert.
* **No new data or cost:** no migration, US$0, no form number in code (P-319). The sample is read only by the packs. The person-only step follows Lead 9's option 1 (not re-argued here).

## Back-end plan (element → record → API → rule → test)
| Element | Record | API | Rule | Test |
|---|---|---|---|---|
| Panel: official-line cards, fact chips | `library_change.matches.cites` (+`read_on`, M1) | `POST /library/document-types/:key/supplies` | BR-1, BR-3, BR-4 | C4.5-2…6, +BR-4 fails (M2) |
| Waiting / Returned / Approved states | `library_change.status` | `GET` change; withdraw route | BR-5, m5 | +withdraw step (M2) |
| To review change page | `changeView.supplies` | `/review-queue`, `/library/changes/:id/approve` | BR-2, BR-5 | C4.5-9, -10, +Changed since (M2) |
| Draft type at approval | `document_type` DRAFT (`revise`) | afterApprove | BR-6 | C4.5-11 |
| Release line for the expert | release diff "Document type" | combination release | BR-6, m2 | +release step (M2) |
| SQR tab, Documents drawer | engine `documentFacts`, `checklist` | `/fact-sources`, `/checklist` | BR-7 | C4.5-12…14 |
| Preview toggle (stand-in, M3) | `missing:` tweak key | `/workspace?tab=preview` | BR-7 | C4.5-15…17 (tightened) |

## Questions for the founder
1. **How does C4.5 count in M2?** Recommended: on the configuration (the Smart questionnaire tab plus the Preview try-out). The case skips document facts with the document reader, C6.5, in M3. Why: skipping them in a case now, with no reader, leaves the passport number filled by nobody. Alternative: skip them in cases now and accept that risk.
2. **Does a passport's "place of birth" supply both the city and the country?** Recommended: keep both as Sample, with the cite naming "place of birth", and ask the immigration expert. The fallback question stays placed either way.

## Lead response

## Agreement

## Build discoveries
