# C6.1 Open a case: break report (commit dfd22a166, own copy on :4439, now stopped)

Scope: concept "What gets built" = `GET /api/runtime/openable` and the Open a case dialog (offer only startable, list the rest, disable Open case when none is ready). Live AI off, US$0.

Verdict: no Blocker, no Major. The new route and the dialog agree with the 409 rule in every state I could set up. Three Minor findings and one unexplained observation.

## Findings

### Minor 1: the list stays stale after a 409, so the dialog keeps offering the release it just refused
- Steps: open the dialog as the case officer (two ready releases). Pick Visitor visa. In the database retire `case.funds_available_cad` and add the audit row, as check_s4 does. Fill reference and name. Click Open case.
- Expected: the refusal appears and the offer refreshes, so Visitor visa moves to "Released, not ready".
- Actual: POST /runtime/cases returns 409. The toast shows the officer sentence and the dialog stays open. The select still offers "Visitor visa · release 2" and no not-ready notice appears. Every retry is refused again until the dialog is closed and reopened. The 409 does not invalidate `["runtime","openable"]`, and the query has no refetch on focus (`web/src/lib/api.ts:29`). The same staleness applies to any change made while the dialog is open.
- Evidence: shots/stale2.png in the scratchpad (toast over a dialog still offering the release); `web/src/runtime/cases.tsx:108-122`. The server refusal itself is correct.

### Minor 2: a malformed 200 from /runtime/openable blanks the whole app
- Steps: intercept `/api/runtime/openable` and answer 200 with `text/html` (a proxy or login page would do this). Open the cases page, then click Open a case.
- Expected: the "Could not load" notice, as for a 500.
- Actual: white page, 400 px. A non-array body such as `{}` would do the same, because `.filter` runs on `releases.data ?? []` (`cases.tsx:111-112`) with no `Array.isArray` guard. A `null` body was handled (shows "Nothing is released yet"). Hostile or odd networks only, so Minor.
- Evidence: shots/html200.png.

### Minor 3: an unbroken long combination name overflows the not-ready notice at 400 px
- Steps: stub the response with a name of 80 "A"s after the CJK text, not ready, release 3. Open at 400 px.
- Expected: the text wraps inside the notice.
- Actual: the long run is cut off at the right edge of the notice (`<li>` has no `break-words`). CJK and accented text wrap and render fine. Real labels are short, so this is cosmetic.
- Evidence: shots/longname.png; `cases.tsx:134`.

### Observation (not reproduced, treat as unconfirmed): a case row was written 0.23 s after a retire
- During my first scripted run (select not scoped to the dialog, so the picker was probably not the combination select) case `BRK-UI-1` was created at 05:21:24.53. The retire audit row is at 05:21:24.30.
- Four later attempts all returned 409 and wrote no case: the same UI flow with the correct select (shots/stale2.png), curl immediately after the retire (twice), and the two-release combination.
- `startableMissing` (`api/src/programs.ts:303`) reads the library on every call with no cache, so I cannot explain it from code. Most likely my script selected a different state than I assumed. Worth one re-run by someone with the check_s4 harness. I did not count it as a defect.

### Nit
- `newestReleases` (`contracts/runtime.ts:208`) is now unused by the web or API code. Dead export; tests may still use it.

## What held
- Roles on `GET /runtime/openable`: officer user-O and representative user-R get 200. Client user-P, author user-A and approver user-B get 403 "does not hold the case duty". An unknown actor and no header both get 401. No leak of combination names to non-staff.
- Retired field behind the release: the list shows `Visitor visa · startable false · items 1`, sorted after the ready ones. POST /runtime/cases returns 409 with the identical sentence (shared `notReadyForCases`). Restoring the field makes the list and POST return to startable and 201.
- Retired combination: omitted from the list. POST returns 409 "was retired by a release". Restoring it brings it back.
- Two releases of one combination: I copied v1 to v2. The list shows only v2 and the dialog says "release 2". POST opens on the newest, so the list and the server agree. I could not make a newest-not-startable, older-startable pair without building a real second release. By code both sides take the highest version, so no mismatch is expected.
- UI states checked at 400 px and 1024 px, with no horizontal scroll: a 500 gives "Could not load the released combinations" with Open case disabled. An empty list gives "Nothing is released yet", disabled. A slow response (6 s) shows a skeleton with Open case disabled, and Enter does nothing. A null body is handled.
- Enter in the reference field with nothing offered: the form's submit is guarded (`if (combos.length)`). The dialog stayed open, no POST was sent and no case was written.
- With one ready and one not ready: the ready one is selectable, the not-ready one is named with the reason and not offered. With none ready: the warn notice shows, the button is disabled, and its title explains why.
- The server 409 stays the authority: the UI never replaces it, and a stale offer is refused cleanly with the officer sentence in a toast and no case written.
- Long mixed-script text (CJK, accents) wraps. No endpoint error leaked field keys or author steps to the officer.

## Not tried
- Keyboard-only Tab order beyond Enter, and 200 % zoom (1024 px layout looked intact in the screenshots).
- Concurrent saves and uploads: out of scope for this item.
