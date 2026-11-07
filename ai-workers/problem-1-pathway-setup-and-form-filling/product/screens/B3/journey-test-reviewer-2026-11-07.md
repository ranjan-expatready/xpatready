# B3 — Sign and scan by screens (C8.1): journey test, reviewer (7 Nov 2026, ~14:40 IST)

Commit `d7837f605`. Isolated copy `rev_b3` on :4444, configured checkpoint. Headless Chromium on Linux; screenshots in the reviewer's scratchpad, plus the builder's `screens/C8.1/screenshots/B3-*`. Sample data only. US$0: no priced button pressed.

## Journeys (from concept §1, §3; J-B3; J7 5.7–5.8)
1. **Main:** a case officer gets IMM 5476 signed by hand and scanned. Open the case, see who signs, generate a copy, record Printed, then Signed by hand, upload the signed scan, take the filing to Ready to file on B2's panel, then Uploaded to IRCC. Expected: Done, and "Record the submission" enabled.
2. **Out of order:** before Printed, the officer looks for "Signed by hand". Expected: no button; "Cannot start yet" with the server's words.
3. **Empty:** no copy yet. Expected: Printed says to generate a copy first; no button.
4. **Error:** the officer uploads a text file named `.pdf`, then a file over 20 MB. Expected: refused on the field, nothing stored, focus back on the upload.
5. **Re-sign:** a fact on the printed copy changes. Expected: Signed by hand not offered; print the new copy; the earlier steps superseded.
6. **Recovery:** a stale second tab; a double click; a reload. Expected: one row per step; the 409 in words.
7. **Wrong role:** the client opens the case or calls the routes by URL; an officer of another firm does the same. Expected: no block; 403 / 404.
8. **Boundary:** after Done, C8.2's "Record the submission". Then the block is read-only.
9. **Family:** Child A1's form says "a parent"; each adult's IMM 5476 has its own block.

## What held (walked, then replayed by `tests/check_c81_sign_browser.ts` three times)
* J1 completes by screens. Printed names "the copy of 7 Nov, 08:55". Toasts name the form. The item goes To do → Ready → Done.
* J2: "Cannot start yet: Signed by hand comes after "Printed": print IMM 5476 first." This is the 409 `detail`, word for word.
* J3: "Generate a copy of IMM 5476 above first: the copy printed is named here."
* J4: "Send the signed scan as a PDF, JPEG or PNG (judged by the file itself, not its name). Nothing was stored." shows on the field. The 20 MB check runs in the browser. The scan count stays 0.
* J5: the warning box offers "Printed: the new copy of …". The server supersedes the old steps.
* J6: a double click on Printed and on Signed by hand stores one row each (database: print 1, signed 1, scan_received 1) and shows no error. The stale tab gets "Not recorded: Signed by hand is already done for IMM 5476." A reload keeps print, signed and scan done.
* J7: the client gets 403 on GET and POST and sees no block and no "Who signs" line. The other firm gets 404 "No such case.". A bad id gets 404.
* J8: read-only line shown and no buttons (screenshot `B3-09`).
* J9: "a parent, for Sample Child A1 (under 18)"; two blocks; Printed on one leaves the other alone.
* Data: an audit line for each step and the scan, with who. A 190-character Cyrillic/Japanese/Latin file name is stored and shown exactly, and wraps. The checksum matches.
* Screen sizes: 1440, 1024, 720 (200 % of 1440) and 400 px have no sideways scroll. axe WCAG 2.2 A/AA is clean on 9 states.
* Speed: Printed 0.35 s; upload 0.8 s; Generate to the Print button 1.3 s; navigation to the block's steps 2.2 s (the whole case page).

## Findings
* **Major:** the replay is not repeatable. Runs: 53/55, 55/55, 53/55. Two causes:
  * The test asserts before the block's item read has loaded (`check_c81_sign_browser.ts:66,70,124,217`; the skeleton is `animate-pulse`, which `settle` does not wait for).
  * After the server refuses a scan, focus goes to a button that is still disabled (`sign-steps.tsx:112` runs before `finally` clears `busy`, `:114`), so keyboard focus is sometimes lost.
* **Minor:**
  * The re-sign box says "The signed IMM 5476 … The earlier scan is kept." when nothing is signed and there is no scan (`sign-steps.tsx:193`).
  * The Download hint shows when there is no copy (`:146`).
  * One GET per hand-signed row (`:80`; STANDARDS §5).
  * The client check waits a fixed 1.5 s (`check:239`).
  * The fill-trial warning is not asserted.
  * The raw-id fallback in `nameOf` (`:84`).
  * At 400 px the label column takes about half the width.

## Score (QUALITY "Journey score")
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1 by screens, to Done and "Record the submission" enabled |
| Next step obvious | 1 | One button; every other step says why (B3-01, B3-02) |
| Plain words | ½ | Server words throughout; the re-sign box's words are untrue before any signature (B3-03); the Download hint with no copy |
| Feedback and state | 1 | Toasts, done lines with who and when, state pill, busy buttons |
| Correct data | 1 | One row per step under a double click; copy id stored; audit lines; UTF-8 name exact |
| Error recovery | 1 | Refusals in words on the field, nothing stored; stale tab 409; reload keeps the state |
| Accessibility and screen sizes | ½ | axe clean, keyboard path, 1024 / 200 % pass; focus lost after a refused scan (intermittent) |
| Speed | 1 | Each step under 1 s; Generate 1.3 s |
| Visual quality | 1 | Team components; consistent with the copy block |
| Trust and sources | 1 | Copy named, signers named, recorded by whom, checksum behind a disclosure, Sample labels |

**9/10, pass** (8 or more and no 0). To raise it: fix the focus race; make the re-sign and Download words true to the state.

## Could not test
A real screen reader; real browser zoom (I used a viewport); Mac Chrome; an intended user's unaided walk (D17, D20 stay with the founder).
