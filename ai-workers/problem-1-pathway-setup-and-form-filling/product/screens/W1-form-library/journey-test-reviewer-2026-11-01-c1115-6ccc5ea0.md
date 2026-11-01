# Journey test (reviewer): C11.15 #261 m1–m3, commit 6ccc5ea0, 1 Nov 2026

Scope: a backend-only change to which link a finder "Not found" row carries. Copy `rv_c1115` on :4471 with fixtures `canada-c1115`. US$0.

## Journeys
The persona in every journey is the content publisher (the author), on the loaded demo's Visitor visa, Forms tab, using Find again.

1. **Main.** canada.ca serves IMM 5645's page and PDF. The form downloads and attaches, with no link. **Held** (step 3).
2. **Error: the PDF is missing.** Not found, linking the PDF. **Held.**
3. **Error: the page cannot be read.** Not found, linking the page. **Held.**
4. **Error: the file reads as another form** (IMM 5257 bytes). Not found, "reads as IMM 5257", the link is the form page and not the refused file, and nothing is stored. **Held** (m2).
5. **Error: the page names no PDF.** Not found, "has no PDF to download", linking the page. **Held.**
6. **Error: the file is unreadable** (damaged PDF). Not found, "could not be read", linking the PDF, and nothing is stored. **Held.**
7. **Error: the reader crashes** (by mutation). Same as 6. **Held.** Before this commit the reason showed a server path and had no link.
8. **Recovery.** Restore the files, then Find again. Downloaded and attached, and the link is gone. **Held.**
9. **Wrong role.** The link, Upload PDF and Find again are author-only. Unchanged since #261, where it was verified.
10. **French file.** Not tested: none of the recorded copies is a French PDF.

## Automated replay
* `check_forms_c1115_download_link.cjs` passed 16/16. It covers the API and the page, axe on the row, keyboard focus on the link, and no page errors.
* The mutation runs are listed in `review-c1115.md`.
* Widths of 400, 1024 and 200 %, and the visual check, were verified on #261. This diff has no UI change.

## Data
* After each refusal, `form_edition` has 0 rows for IMM 5645.
* After recovery there is one edition and one line, as the check asserts.

## Break-it
* Mutations A to D (see the review).
* A reader crash, before and after the fix.
* An index left stale. Without the reload, all four probes fail, so the probes are real.

## Score
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Each failure leads to a link and to Upload PDF or Find again, and recovery attaches the form |
| Next step obvious | 1 | The link points to where the right file is: the page when the file was wrong, the PDF otherwise |
| Plain words | ½ | The server path is gone, but the French reason still gives no next step (earlier work) |
| Feedback and state | 1 | Not found with a reason in every case |
| Correct data | 1 | Nothing stored on refusal; one edition after recovery |
| Error recovery | 1 | A reader crash is now handled (mutation B) |
| Accessibility and screen sizes | 1 | axe 0 issues and keyboard focus in the check; no UI change |
| Speed | 1 | One stat per fixture read |
| Visual quality | 1 | Unchanged, as on #261 |
| Trust and sources | ½ | Every link is canada.ca through `officialUrl`; the m3 catch and the French case have no test |

**9/10, no criterion at 0: pass.**

To raise the score: add a test seam for the reader crash, and a French probe once one is recorded.

## Not tested
* A real screen reader.
* A real 60 s timeout.
* An intended user's unaided walk (D17, D20 stay with the founder).
