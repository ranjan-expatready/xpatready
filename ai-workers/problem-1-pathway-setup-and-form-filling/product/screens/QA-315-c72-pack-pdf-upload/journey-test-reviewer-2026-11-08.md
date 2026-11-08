# Journey test, reviewer: QA-315 (C7.2 pack, IMM 5257 filed as a PDF upload)

8 Nov 2026, independent Opus reviewer, commit bb1ec40c0601543148cb80df77d02598c458eb2a. I used the builder's isolated copies: 4452 (the configured checkpoint) and 4453 (the fixture). Live AI was off, the cost was US$0, and port 4400 was not used.

## Journeys
1. **Main path.** The case officer, on the checkpoint where release 2 files IMM 5257 Online, files the principal's IMM 5257 as a PDF upload. The officer then makes the copy, uploads the validated copy, and changes a fact afterwards.
   * Expected: the channel changes with a reason, the copy is one to validate, the upload is kept, and the copy goes out of date.
2. **Alternate.** The same steps on the fixture, where the release already files the form as a PDF upload.
   * Expected: no change is needed, and the rest of the result is the same.
3. **Wrong role.** The client tries to change the channel.
   * Expected: 403.
4. **Recovery.** The officer changes the channel from an old read of the page.
   * Expected: 409, Reload.
5. **Bad input.** The officer asks for "Not needed", which this form does not accept.
   * Expected: 422 with words.

## Walk
I walked the journeys through the API: the acceptance pack plus direct calls. The visible-browser walk was not possible because no Playwright browsers are installed on this machine.

## What held
* **Journey 1.** The channel change returned 200, and the item reads `PDF_UPLOAD` over line `ONLINE`. `channel_changed` records the officer, the time and the reason "(C7.2's pack, Sample)". The copy was generated (202) and the upload returned 201 with an id. After the fact changed (PUT 200), the copy reads `out_of_date: true` and `validated.current: false`.
* **Journey 2.** No change was made (`change: null`), and the result was otherwise identical: 3/11 on both data sets.
* **Journey 3.** 403: "Only the case officer can do this."
* **Journey 4.** 409: "Changed since you read it … Reload, then make your change".
* **Journey 5.** 422: "IMM 5257 is marked Not needed, but no record says the APR Portal asks it itself …"
* **Data underneath.** After journeys 3–5 the prepare version was unchanged (`72caa119148e5c0c`), so nothing was written.

## Findings
* **Minor (rule 4).** `accepts` has no IRCC record on either data set (`accepts_quote: null`, Sample fallback), yet the pack's comment at `C7.2.test.ts:36` states it as IRCC's rule. See `review.md`, Minor 1.
* **Out of scope.** The upload response has no barcode report (P-46), as qa's C7.2 record already says.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Journey 1: the 409 is gone, the upload is 201 and kept, and the copy goes out of date |
| Next step obvious | ½ | The "Change channel" control exists (`item-channels.tsx:83`) but was not walked on screen |
| Plain words | 1 | The 403, 409 and 422 words say what happened and what to do |
| Feedback and state | 1 | `channel_changed` (who, when, why) and `line_channel` are both shown in the view |
| Correct data | 1 | One change, the reason kept, and nothing written on refusals |
| Error recovery | 1 | A stale version gets 409 with Reload |
| Accessibility and screen sizes | ½ | The accessible name names the form and person; axe and 400/1024/1440 px not run (no browser) |
| Speed | 1 | The whole pack ran in a few seconds per copy |
| Visual quality | ½ | Not seen (no browser) |
| Trust and sources | ½ | The reason is labelled Sample, but there is no IRCC accepts record for PDF upload (quote null) |

**8/10. Pass (8 or more, no 0).** These would raise the low scores, most valuable first:
1. Cite IRCC's accepted channels for IMM 5257, or keep them labelled Sample everywhere, including the pack's comment.
2. Walk the "Change channel" dialog in a browser at 1024 and 1440 px, with axe.

## Could not test
* A visible-browser walk, axe and screen widths: no browser is installed here.
* A real screen reader.
* The six data set: the builder's copies were not reset.
* An intended user's unaided walk (D17/D20): this stays with the founder.
