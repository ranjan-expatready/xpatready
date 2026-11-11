# QA-275 journey test (reviewer, 11 Nov 2026)

Scope: Preview's Fill PDF and download only (API/file fix, no screen change). Commit tested: a2103b51e9652de8ff085db823d0687380133c99 (branch `claude/awesome-shannon-hgkagd`, PR #1528). Isolated copy `qa275r` on :4476, headless Chrome (Playwright, `channel: chrome`); no visible browser in this cloud session.

## Journeys
1. **Main path, configuration author:** "I fill IMM 1295 for the principal twice, a few seconds apart, and keep both copies." Preview → "Every form field and a Sample filled PDF" → Forms and coverage → Fill PDF from confirmed facts → dialog → Download the checked PDF → close → Fill again → Download. Expected: two rows, two files, each download matches its own fill.
2. **Draft and release in the same minute (API):** draft, release, draft fills of IMM 1295 / principal inside one minute. Expected: three paths, each row's file hash equals its stored hash, release never served draft bytes.
3. **Simultaneous presses (break-it, API):** four fills at once (draft, release, draft, release). Expected: four paths, every download matches its row.
4. **Earlier link:** a row made before the change (minute-named file) still downloads its bytes under its own name.
5. **Wrong person:** client (`user-P`) and no person on an artifact link; unknown id. Expected: 403, 401, 404.
6. **Keyboard and 1024 px:** Enter on Fill opens the dialog with focus inside; Tab reaches Download; no sideways scroll at 1024.

## What held
- J1: dialog in ~850 ms per fill; saved as `IMM1295-principal-2026-11-11T070341-1a9e1ce2.pdf` and `…T070343-f4a108e2.pdf`; two new rows, two distinct paths, two distinct byte sets, each saved file's sha256 equals its row's; one `filled` audit line per fill (5 lines after 5 fills).
- J2: `tests/check_qa275_fill_files.ts` 9/9 on a2103b51e. The same suite on origin/main fbfb263c7: 5 failed (one shared path `IMM1295-principal-2026-11-11T0701.pdf`; draft rows stored `191c32…`, release `376d9a…`, all served `ebcb3b…`).
- J3: four simultaneous fills in 1.2 s, four `…T065943-<uuid>.pdf` paths, all MATCH.
- J4: legacy minute-named row downloads its own bytes as `…T0659.pdf` (suite check 9).
- J5: 403 / 401 / 404 (not 500 for a malformed id).
- J6: keyboard path works; axe WCAG 2.0–2.2 A/AA on the dialog: no violations; 1024 px: no sideways scroll; no page or console errors.
- Data: every report shows `/DocMDP verified, /UR3 verified`, appended objects encrypted with the document key, `intact: true`; `p5/fill.py` untouched.

## Findings (none Blocker or Major)
- Minor, outside this row's diff: at 1024 px, after three fills the stacked "IMM 1295 filled …" toasts cover the dialog's Close and Download buttons (scratchpad screenshot r3-dialog-1024.png; also visible at 1440 in the builder's `screenshots/03-after-two-fills-1440.png`). They can be closed; worth a qa row, not a fix here.
- Minor, outside this row: Fill PDF is offered only in "Every form field and a Sample filled PDF", not on the per-person Preview; my first attempt looked there (one wrong turn).

## Score (0, ½, 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | J1: two fills, two downloads, each its own bytes |
| Next step obvious | ½ | Download is the dialog's primary action; Fill sits in the full view only (one wrong turn, existing) |
| Plain words | 1 | Saved name: form, person, UTC second, 8-character id, as a case copy's; dialog words unchanged |
| Feedback and state | 1 | Busy button, toast, dialog with read-back counts and signatures |
| Correct data | 1 | Row hash = file hash = download hash for every fill (J1-J3); one audit line per fill |
| Error recovery | 1 | Double and simultaneous presses keep every copy; old links work; 401/403/404 |
| Accessibility and screen sizes | ½ | axe clean, keyboard path, no sideways scroll at 1024; toasts cover the footer after repeated fills; 200 % zoom not run |
| Speed | 1 | ~850 ms per fill to dialog; 4 parallel fills in 1.2 s |
| Visual quality | 1 | Dialog unchanged, team look (builder's 02-filled-dialog-1440.png) |
| Trust and sources | 1 | Sample and configuration hash shown; IRCC signatures verified per fill |

**Score: 9 / 10. Pass** (8 or more, no 0). To raise it: keep toasts clear of an open dialog's footer; offer Fill on the per-person Preview (both outside QA-275).

## Not tested
Visible-browser walk (headless only here), a real screen reader, 200 % zoom, opening the files in Adobe (signatures checked by the filler's own verification), an intended user's unaided walk (D17/D20 stay with the founder).
