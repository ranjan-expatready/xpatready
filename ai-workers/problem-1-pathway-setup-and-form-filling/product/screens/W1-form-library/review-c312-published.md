# F2 C3.12 "Published date in the Forms list": independent CHECK, 1 Nov 2026

Reviewer: I did not build this. Commit **456fb7d0** (`git diff origin/main..456fb7d0`, branch claude/gifted-bardeen-e0tgby). Spec: the Handover comment on PR #285, plan steps 1–5. Bar: P-123, P-32, PRODUCT §3–§4, STANDARDS, EXPERIENCE, QUALITY D1–D20.

**Verdict: Approve** (Ship). No open Blocker or Major. Three Minors, recommended, not required.

## How I tested
* **Copies.** `rev_c312p` on :4471 and `rev_s4lp` on :4476. Each had a fresh database. US$0, with no `*_LIVE`. Both are stopped now, their databases dropped and their var folders removed. The web bundle rebuilt from this commit gives the same hash as `web/dist`.
* **Port clash (for the record).** I first used :4472. Another copy, `brk_c312` (not mine), then took that port. My first browser run hit that server: it called `/demo/load` and the rules-only finder there. It failed 3 steps, all because its library was not empty. I moved to :4476 and the rerun was clean. The owner of `brk_c312` should know its data was touched.
* **Suites.**
  * `check_forms_c312_field_map.ts`: 38/0, twice, each time on a fresh copy.
  * `check_forms_s4_library_browser.cjs`: 109/0. I ran a copy whose screenshot folder points to `/tmp`, so the committed screenshots are unchanged.
* **My walk** (Playwright, keyboard only for the drawer).
  * At 1440, 1024, and 720 px at 2× (200 % zoom of 1440), I focused "IMM 5257" and pressed Enter.
  * axe found 0 issues in the drawer at all three sizes. No sideways scroll, no page errors.
  * A reader without the author duty (user-C) sees the same dates.
* **Data underneath.**
  * I set all 18 `published` values back to NULL. The first list then took 485 ms (it reads 17 files in one reader call). The next two lists took 194 and 151 ms. Afterwards every file on disk had its date again, matching what pypdf reads from the PDF.
  * Example: IMM 1295 has ModDate `D:20260604160549-04'00'` and shows 2026-06-04. IMM 0008 Sch 4 has 2022-12-06, as the spec says.
* **Graph.** G1–G6 show nothing new from this diff. The only G3 item, `GET /attachments/:id/file`, came before it.

## Spec fit (PR #285 plan)
1. **Migration.** Done, expand-only: one nullable column, the rollback is written down, existing data is kept.
2. **Set at creation.** Done in `intake.ts:355`, `finder.ts:678` and `impact.ts:74`. The last takes `IntakeItem.published`, which already existed.
3. **Fill the rest once.** Done when the list is read. Each workspace needs one reader call. A file already read is never read again, and the rows-still-null guard makes two lists at the same moment harmless.
4. **Show it.** Done:
   * The API returns it on each row and on each `older_editions` entry.
   * At xl it sits under the edition, which the spec allows ("own column at 1440 if it fits").
   * Below xl it is in the short line.
   * The drawer says "Published YYYY-MM-DD (the date in the file)". An earlier edition shows "published …".
   * There is no list-row schema in `contracts/form-library.ts` to extend: the row type lives in the page, as before. This is not a finding.
5. **Tests.** Done. Each rule has a pass and a fail: upload, no date, older edition, not a date, missing file, plus no sideways scroll at 400/1024/1440 and axe.
   * **Rule removal (by reading, not run).** Dropping `published` from the intake create fails "the moment it is added" (no list runs in between). Dropping the `fillPublished` call fails "read once and kept". Dropping the date check in `publishedOf` fails "never shown as a date".

## Issues (all Minor, Should)
* **m1. At 1024 px the date breaks mid-date.**
  * Where: `web/src/pages/library-forms.tsx:155`. My screenshot `list-1024x1.png` shows "Published 2026-" on one line and "06-04" on the next, for IMM 1295, 5257, SCH1 and 5409.
  * Fix: `whitespace-nowrap` on the `data-published-short` span (and the same on the xl line).
* **m2. "Date not in the file" is also shown for a file that was never read.**
  * Why: `publishedOf` (`api/src/edition-published.ts:26`) folds NULL (file not on disk, or the reader is backing off) and "" (read, no date) into one null.
  * Two related cases:
    * The test row `IMM 5257 (01-2017)` stays NULL, yet the page would say the file has no date.
    * `published_only` also returns null for a damaged file, so that is kept as "" ("no date") rather than "could not be read".
  * Both cases are rare and the wording is calm, so this is Minor.
  * Fix: return a separate state (for example `published_unread: true`) and say "Date not read yet". Or document that this case is accepted.
* **m3. The committed evidence shot does not show the feature.**
  * `screenshots/slice3/c312-published-1440.png` shows the two upload run cards; the list is below the fold. My `/tmp` rerun gives the same frame.
  * Fix: scroll to the IMM 1295 row, or take a full-page shot, before the screenshot (`check_forms_s4_library_browser.cjs:142`).

**Observations, not findings:**
* `failedAt` is set once for the whole module, not per workspace. The 10-minute back-off is shared, and that is harmless with one workspace.
* The fill writes during a GET, with no audit line. That is fine for a value derived from the file.
* "canada.ca last updated 2023-09 · Published 2026-06-04" can read as odd, but it is IRCC's own PDF metadata. The wording "Published" is the spec's.

## D1–D20 (changed only)
| Dimension | Score | Evidence |
|---|---|---|
| D2 Concept fit | 5 | Plan steps 1–5 all present |
| D4 Rule integrity | 5 | Kept once; never shows the printed edition or a non-date; guard on null-only writes |
| D7 Data safety / migrations | 5 | Expand-only nullable column, rollback written, nothing rewritten |
| D10 Language | 4 | Plain words; m2 says "not in the file" for an unread file |
| D13 Accessibility and responsive | 4 | axe 0, no sideways scroll at 400/1024/1440/200 %; m1 date wraps |
| D14 Performance | 5 | One reader call on the first list (485 ms cold), then 150–200 ms; no per-row requests |
| D16 Testability | 4 | Pass + fail per rule; m3 evidence shot misses the feature |
* Unchanged otherwise. D17 and D20: simulated only.
* **Retrofit:** a `published` field on the existing list row and on `older_editions`; one column on `form_edition`.

## Journey score: **9/10, no criterion at 0 (pass)**
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The publisher reads each edition's file date in the list and the drawer, current and earlier |
| Next step obvious | 1 | Read-only information; nothing to act on |
| Plain words | ½ | "(the date in the file)" is clear; m2 wording for unread files |
| Feedback and state | 1 | Date, or an explicit "Date not in the file"; never blank |
| Correct data | 1 | Matches the PDF ModDate/CreationDate for all 17 files; current and older kept apart |
| Error recovery | 1 | Reset to NULL → re-read once on next list; missing file retried later |
| Accessibility and screen sizes | ½ | axe 0, keyboard drawer, no sideways scroll; m1 mid-date wrap at 1024 |
| Speed | 1 | 485 ms cold fill, 150–200 ms warm |
| Visual quality | 1 | Muted xs line under the edition, team look |
| Trust and sources | 1 | Says it is the file's own date, not the printed edition |

The fixes that would raise the score are m1 first, then m2.

**Could not check:** a real screen reader; an unaided walk by an intended user (D17 and D20 stay with the founder); a library of about 220 editions on a cold first fill (I measured only 18); mutation runs (I reasoned about them only, because the working tree is shared with other copies).

---

## Delta review on d373fa43

Reviewer, 1 Nov 2026. Scope: commit dd58528f "break fixes" (`git diff 10440a56 d373fa43 -- prototype/studio ':!*.png'`). The merge of origin/main brought only acceptance packs and docs, and none of them touch C3.12. US$0, no live AI.

**How I checked.**
* I read the diff of `api/src/edition-published.ts`, `engine/published-date.ts` (new), `api/src/form-library.ts`, `api/src/intake.ts`, `tools/read_form_identity.py`, `web/src/pages/library-forms.tsx` and both tests.
* I ran `tests/check_forms_c312_field_map.ts` on my own isolated copy (`rev2_c312`, :4481, fresh database): **48 passed, 0 failed**.
* I added one probe of my own on that copy, to see how the fix holds against a regular file that hangs the reader (details under M1).
* I did not run the browser suite (it runs elsewhere, 112/0). I read its new steps, and I viewed the committed evidence shot.
* Afterwards I stopped the copy, dropped its database, and deleted its var folder and the probe file.

### Findings, one by one
| Finding | Fixed? | Fail test | Evidence |
|---|---|---|---|
| Break **M1**: one blocking file stalls the list for 60 s, readers stack up, and the batch starves | **Fixed for the list; partly fixed for the batch** (see new m-a below) | Yes, for a FIFO: "does not stall … (under 4 s)" and "the pipe is left unread and the edition beside it is still read" | The `regular()` stat check skips pipes and folders. The `running` map gives one fill per workspace. The list waits at most `WAIT_MS` = 3 s. |
| Break **M2**: unread or unreadable files shown as "Date not in the file" | **Fixed** | Yes: the pure rule (null gives `unread`, "?" gives `unreadable`, "" gives `none`), the API test (row with "?"), and the browser step ("Date could not be read from the file") | `publishedOf` returns `published_state`. The web says "Date not read yet", "Date could not be read from the file" or "Date not in the file", and the drawer and older editions use the same words. The reader returns "?" when it throws, which also closes break m2. |
| Break **m1**: impossible dates | **Fixed** | Yes: the rule test covers 2023-02-30, 0000-00-00, 2099-12-31 and 9999-13-99, and the API test covers 9999-13-99 in the column | `realDate` accepts only a real calendar date from 1990 to next year. The value is still stored as read and only hidden when shown, which is acceptable. |
| Break **m3** / my m3 (manifest read per row) | **Fixed** | Not testable as behaviour, so I checked it by reading the code | `manifest()` is read once per fill, after `if (!unread.length) return 0`. |
| Break **m5**: an HTML page date taken as "Published" | **Fixed** | No dedicated test (code reading only, as in the break) | `published_only` returns null for anything that is not `%PDF-`. Intake stores "" for a non-PDF upload. |
| My **m1**: the date breaks mid-date at 1024 px | **Fixed** | Yes: browser step "at ${w} px the date never breaks in the middle (one line box)" | `PublishedLine` wraps the date in a `whitespace-nowrap` span. |
| My **m2** (= break M2) | **Fixed** | as M2 | as M2 |
| My **m3**: the evidence shot misses the feature | **Fixed** | n/a | `c312-published-1440.png` now shows the list rows: IMM 1295 "Published 2026-06-04", IMM 5409 "Date could not be read from the file". |

### Probe: a regular file that hangs the reader
I made a sparse 3 GB file with a `%PDF-1.7` header. pypdf runs for more than 70 s on it. I inserted an edition whose `stored_path` points at that file, and set IMM 1295 and IMM 5257 (06-2018) to NULL.

What held:
* **Five parallel lists each took 3.8–4.1 s, not 60 s.**
* Only **one** reader process was running, so the in-flight guard works.
* While the fill ran, IMM 1295 said `unread` ("Date not read yet"), which is honest.
* After the 60 s timeout, lists took 0.19–0.21 s (the back-off).

What did not hold:
* **All three rows stayed NULL.** The healthy files are still never written while one hanging regular file is in the batch.
* Every ten minutes this repeats: about 60 s in which each list takes about 3 s.

### New / residual findings
* **m-a (Minor, Should): a hanging regular file still starves the batch and slows the list to about 3 s once every 10 min.**
  * Where: `edition-published.ts` `fill`. It is still one reader call for the whole batch with a 60 s timeout, and on failure nothing is written.
  * Why Minor:
    * The list no longer hangs. 3 s is over the 1 s budget, but only inside the window.
    * The page says "Date not read yet", which is true, so nothing false is shown.
    * Reach is low: the same file would hang the identity read at intake, so it is unlikely to become an edition.
  * Fix: write what the reader has finished. For example, the reader prints one line per file and the API keeps the lines it got before the timeout. Or read in small chunks, or with a per-file timeout. Then mark the file that timed out "?".
* **m-b (Minor, Should): the 3 s wait cap and the in-flight guard have no fail test.**
  * The FIFO is filtered by `statSync` before the reader is ever called. So deleting the `Promise.race` cap, or the `running` map, still passes "under 4 s".
  * A test that needs a reader to hang must use a file that hangs pypdf. For example, a sparse multi-GB file with a `%PDF-` header: my probe took over 70 s on one.
* **Observation:** a file that is missing from disk now says "Date not read yet" indefinitely. That is true, but "File not found" would say more; the breaker suggested it. This is not a finding.
* **Observation:** impact review (`impact.ts:74`) copies `h.published` from the intake item. For a held HTML item this could carry a page date. Held items come from PDF downloads in practice, so I did not raise it.

No regression found. The earlier C3.12 rules all pass again in the 48/0 run: date shown, never the edition, read once and kept, older edition apart, missing file stays NULL, upload keeps its date.

### D1–D20 (changed only)
| Dimension | Before | Now | Evidence |
|---|---|---|---|
| D10 Language | 4 | 5 | Four honest states, never "not in the file" for a file that was not read |
| D13 Accessibility and responsive | 4 | 5 | The date never breaks; one-line-box step at 1024 and 400 |
| D14 Performance | 5 | 4 | The list is capped at about 3 s while a fill runs; a hanging file still starves the batch (m-a) |
| D16 Testability | 4 | 4 | A fail test for each break finding; the wait cap and in-flight guard are untested (m-b) |

### Journey score: **9/10, no criterion at 0 (pass)**
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | Dates are shown in the list and the drawer, current and earlier |
| Next step obvious | 1 | Read-only |
| Plain words | 1 | "Date not read yet", "Date could not be read from the file" and "Date not in the file" each say what is true |
| Feedback and state | 1 | Never blank, never false |
| Correct data | 1 | Matches pypdf ModDate; impossible dates are hidden |
| Error recovery | 1 | An unread row is retried; an unreadable one is said as such |
| Accessibility and screen sizes | 1 | The date never breaks; earlier axe and sideways-scroll checks unchanged |
| Speed | ½ | 0.2 s normally, but about 3 s per list during a fill that hangs (m-a) |
| Visual quality | 1 | Evidence shot shows the dates in the row |
| Trust and sources | ½ | Honest, but healthy files stay "not read yet" while one bad file is in the batch (m-a) |

**Could not check:** the browser suite myself (it runs elsewhere, 112/0); a real screen reader; an unaided walk by an intended user (D17 and D20 stay with the founder).

**Verdict: Approve** (no open Blocker or Major). Both break Majors are fixed with fail tests. m-a and m-b are Minor and can go in a follow-up: chunk or stream the reader so a file that hangs does not starve the rest, and add a fail test for the wait cap.
