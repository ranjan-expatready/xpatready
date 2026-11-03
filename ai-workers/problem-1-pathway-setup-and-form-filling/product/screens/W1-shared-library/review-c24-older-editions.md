# Review: C2.4 older editions (commit aa2a35571)

Reviewer: independent, code read only (`git show aa2a35571:<path>`). Nothing run: HEAD was in use by the suite run. Scaled to a 5-file change.

## Verdict: Approve (no Blocker, no Major)

## Journey score (reviewer role): 8/10, code-read only
The AT-9 path (accept 11-2025 through impact review, send the 11-2021 file again, on a combination or from Upload PDF) now ends in "Older edition: not used", names the edition in use and attaches nothing. Not walked in a browser, so the card text and the chip were not seen on screen. That is why it is 8 and not higher.

## Your four points

1. **New outcome vs `older_edition_held`: the new outcome is right.** `older_edition_held` is recorded HELD and listed on To review with a link (intake.ts:352-360). This file is already in the library, so nothing is waiting for a person. Recording it HELD would add a To review item on every re-upload, which contradicts C2.4 BR-2. Recording it DONE (intake.ts:274-277) keeps the history. The chip text equals the held-older chip (forms.tsx:19), so the person sees one wording. `held` in the summary is unchanged, and `older_in_library` is counted separately (intake.ts:70).
2. **"In use" = newest non-ONLINE by `newestEdition`: sound.** Findings:
   - It is the same rule as `newestEdition(pdfEditions)` in the other-file branch (intake.ts:351-353) and as form-library.ts:85, finder.ts:540 and workspace.ts:69. Both the new check and the existing held-edition check call `editionMonth` and `newestEdition`, so they cannot disagree.
   - A newer edition held for impact review is not in form_edition, so the library correctly "uses" the old one. The old file then still reports "Already in the library". That is correct.
   - A retired form (`retiredAt` is on the GovFormDef, not the edition) keeps its editions. The message is still true, and the retired state is not mentioned, as before.
   - Minor (Should): form-library.ts:85 limits "current" to editions with an approved sha. intake.ts:272 does not. They differ only if a newest edition is unapproved, which the gate in `one()` prevents. No action.
   - Minor: programs.ts:558 uses "newest with a field map" for the add-from-library path. That is a different question, not this change.
3. **Other surfaces: no real finding.** The library list (form-library.ts:109), combination config (workspace.ts:69) and the finder (finder.ts:540, 630, 711) all use `newestEdition`, so none shows an older edition as current. I did not open Sources UI files beyond the grep.
4. **S5 "Not found" row through `forForm`: acceptable.** Only `added` and `in_library` get attached. The older file comes back unattached with a message saying so, and the row gets a clear, true answer instead of a wrong "Already in the library". The row stays unfulfilled, which is correct: the library's own edition can be added with "Add from library".
   - Should (not blocking): check by hand that the row's next-step button still offers the in-use edition. The test covers the combination path and Upload PDF, not a row.

## Code and tests
- Race and duplicates: no new write other than one DONE intake item. The `P2002` path is unchanged.
- Order of checks: the new branch sits after the approved-source gate (intake.ts:261-268), so an unapproved checksum is still HELD. Good.
- Tests: Part 3 resets, builds the real flow (impact review accept) and covers fail case, pass case (11-2025 still "Already in the library") and the card text. Removing the branch makes check 1 fail (outcome becomes `in_library`), so the rule is tested.
- Words match the concept: "Older edition: not used", no jargon. The run status is COMPLETED (upload-run.ts:169), which is right because nothing needs a person.

## Could not check
No browser or keyboard/zoom pass. The suite was not rerun. The 22/22 pack result is the builder's claim.
