# C11.6 — How each form is filed, on the case page (forms lane, M3-B)

**What was red on main (5 Nov, 86b721eac):** the API side of C11.6 was green (`acceptance/C11.6.test.ts` 14/14 on a fresh
copy), but a person could not do any of it: the case page showed no IRCC account, no channel per form and no way to change
one (qa's Visitor visa round 1, `qa/reports/2026-11-02-vv-m3.md`: "no channel per form … the officer would have to know the
API"; J7 steps 2.3 and 5.2). This PR builds only that screen part, on the existing route `PATCH /runtime/items/:id/channel`.

**Built:** `web/src/runtime/item-channels.tsx` (new, M3-only file) and one line in `web/src/runtime/cases.tsx` that places it
above "Prepare application". After the review (M2): `api/src/fill-case.ts` and `api/src/fill.ts` (runtime lane's files) now
follow each person's item channel, and `web/src/runtime/forms.tsx` says when a copy is stamped. No schema, contract, engine
or `api/src/demo.ts` change.
* The IRCC account once, read-only, in the server's words ("Filed through APR Portal: set by the combination, not on the case");
  no control beside it (C11.6-1/2).
* Per person, each form item: its channel, signature, what IRCC accepts on that account, and either "The combination's
  default" or "Changed from <default> by <who>, <when>: “<reason>”" (C11.6-3/4/5/9). A channel IRCC no longer accepts reads
  red with "choose a way it accepts". A submitted filing's items cannot be changed (C8.2-9), said in words.
* Change channel: the four ways to file; the ones IRCC does not accept are greyed with the Form library's record of why
  (IRCC's line for IMM 5476, the Sample record for IMM 5257) (C11.6-6/8a). Paper through an IRCC account asks "Why on paper";
  the server's refusal shows on that field with focus on it (C11.6-8b, FQ-3). A change from an older read shows "Changed since
  you read it" with Reload (C11.6-11). Focus returns to the row's button.
* Every form number, channel and quote comes from the case's data (P-319); the channel words and meanings come from
  `contracts/forms.ts`.

**After review and break (round 1 on ef188a489, `review.md` Block, `break-report.md`):**
* Review M1, break m3: back on the combination's channel the row reads "The combination's default." (no "Changed from"); the
  date has no double full stop.
* Review M2: the forms below (`/forms`), generate, lock and Validate follow the item's channel, as `/prepare` does. A copy
  records whether it was stamped "Copy, not for filing" (`result_json.not_for_filing`; older copies: their release line), so a
  copy made while the form was Online is refused at lock after a change ("Generate a new copy"), and the forms panel says so.
  `tests/check_c116_item_channel_forms.ts` 12/12 (pass and fail of each).
* Break M1: the reason is sent only with Paper. Break M2, review m6: the dialog always reads its item from the latest
  read (opening it refetches; after Reload it compares with what the case holds now). Break M3: rows and notes wrap
  (`overflow-wrap:anywhere`), checked with a 400-character reason at 1440 and 1024 px. Break m1: an item already on Paper
  shows its saved reason. Break m2: a "nothing changed" answer says so. Break m4: the reason is one line (Enter saves).
  Break m5: a recorded filing shows "Submitted to IRCC" and no Reload; focus goes to the heading if the row's button is
  disabled. Break m6: the option's note is its description only; channel and signature have screen-reader labels.
  Review m2: "Not accepted here" per option and the Form library's record said once; Not needed has its own words.
  Review m5: the red "IRCC does not accept" state is in the walk (step 8).
* Left as Minors: review m1 (the Sample record for IMM 5257 is quoted as the Form library holds it, with its FQ ids; the
  server's own 422 calls it "IRCC's line" too: a data and wording change for the library's record, not this screen);
  review m4 (placement: a section of its own above Prepare application instead of the case header and ⋯ on each item row of
  the r5c board, because that rows view is C7.7's, not on main; it moves there with C7.7); review m7 (no retrofit map).

**Check:** `tests/check_c116_channels_browser.ts` 51/51 (keyboard only, 1440 and 1024 px, axe WCAG 2.2 AA on six states, no
sideways scroll, data underneath: item row, audit line, combination line unchanged). Screenshots in `screenshots/`.

**Sources:** no new immigration value. The accepted channels come from the Form library's records set up by the pack
(`acceptance/lib/setup_vv_m3.ts` S4a; IMM 5476 quotes canada.ca, compliance-trace VV-R10; IMM 5257's record is Sample,
FQ-2/FQ-3, Unconfirmed: expert). The APR Portal for visitor visas is VV-R12 (FQ-1 open).

**Not in this PR (the rest of C11.6's row):** the "PDF copy, not for filing" second deliverable is C7.7; the portal-only answer
sheets of the permanent-residence combinations are C7.3's breadth.
