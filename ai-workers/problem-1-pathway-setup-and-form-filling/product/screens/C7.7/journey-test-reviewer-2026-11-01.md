# Journey test (reviewer): C7.7 part 1, last two fixes (commit 26964195)

Scope: the commit only. It covers IMM 5476's representative block from the firm record, `person.has_children` worked out from the case, and `derive_inverse` in the filler. The copy is my own isolated copy on :4438 (`xr_studio_review_c77`, runtime lane range), made with `check_vv_prepare_api.ts`. The builder's :4440 copy was reset while I was reading it, so I left it alone. :4400 was not touched. Live AI stayed off, so the cost was US$0. Browser: Playwright headless chromium, plus axe.

## Journeys (case officer of the Sample firm, Visitor visa family case: principal, spouse, children 10 and 15)
1. **Main.** Open the case, check that IMM 5476 is ready with no representative question to answer, generate the principal's IMM 5476 copy, and lock it as filed.
2. **Alternate.** Change the representative of record (user-R to user-T). Expected: the IMM 5476 copy goes out of date, naming the representative's details.
3. **Stage boundary.** IMM 5707 for the principal. "Has any children" is written from the children on the case, never by hand (acceptance C7.7-16).
4. **Error / wrong turn.** On the "representative" tab, press Edit on the e-mail, and press Confirm section.
5. **Client.** The client's questionnaire (SQR mode) on the same case.
6. **Empty.** No child on the case. "Has any children" stays a question, and the client's No stands (unit test only).

## What held
* The values are right. The stored facts of the copy have about=`representative` and hold the firm-record values: Representative / Sample / representative@sample-firm.example / 200 / 100 / Example Street / Toronto / ON / M5V 1A1. When the representative changes, the copy names "E-mail address" and "Given name(s)" as changed, and the view shows user-T's values.
* Nothing is stored. The answers are built in `state()`. The answer and confirm routes refuse the "representative" subject, so the server writes nothing.
* "Has any children": no question is asked for the principal or spouse when the case holds a child (agent and SQR views, 0 questions). C7.7-16 passes.
* Suites on my copy: `check_vv_prepare_api.ts` 26/26 (C7.7 18/18, C6.12 24/24, C11.6 14/14). `check_case_engine.ts` 57/57. `check_p5_engine.ts` 31/31.
* Speed: the agent view API takes 68–80 ms and the case page opens in about 1.0 s.
* Layout: axe found 0 violations on the representative tab at 1024 px. There is no sideways scroll at 1024 or 400 px.

## Findings
* **Blocker (journey 1).** A fresh IMM 5476 copy is born "out of date" (changed: "Person's telephone number including country code"). Lock as filed gives 409: "This copy is out of date (1 change since it was made); generate a new copy and lock that one." Generating again gives the same result, so this loops. The cause: the snapshot's jsonb stores the phone as `{"number": …, "country_code": …}`, while the firm record gives `{country_code, number}`. `changedFacts` (`engine/runtime/forms.ts:60–66`) compares `JSON.stringify`, which depends on key order. Control: IMM 5257 on the same case is not out of date.
* **Major (journey 4).** The firm-record answers look like ordinary answers:
  * The pill says "Confirmed" with the tooltip "Confirmed by the officer". The line reads "answered · Representative · 1 Nov, 19:44".
  * Edit → Save gives 400: "Send the id of the answer you saw, or null when there was none."
  * Confirm section is enabled, and pressing it gives the toast "Choose whose section to confirm." (screenshot `rep-confirm-1024.png`). The ids `firm_record:user-R:…` are not answer ids, so the zod uuid checks refuse them.
* **Major (journey 1).** The copy still lists the representative's phone (2 boxes) and country as "To write by hand" (`phone:country_code_digits`, `phone:area_code_and_number`, `country_name_text` are not executable). The commit and `qa/built/C7.7.md` say the phone is filled.
* **Minor (journey 5).** The client sees the representative's parts ("Contact details", "Representative and authorizations") prefilled and "Confirmed", and any change to them fails. The tab itself was already there before this commit, so it is not new; what is new is that it now looks answered by the officer.
* **Minor.** The officer's tab is labelled "representative" in lower case and opens first. Its questions read "Family name (surname) as shown on passport or travel document" for the representative. Both were already there.

## Score (each 0, ½ or 1)
| Criterion | Score | Evidence |
|---|---|---|
| Task completed | ½ | The block is filled, but the IMM 5476 copy cannot be locked (409 loop). |
| Next step obvious | ½ | The representative tab opens first, with Edit and Confirm controls that cannot work. |
| Plain words | ½ | "Choose whose section to confirm.", the lower-case "representative", and passport wording for the representative. |
| Feedback and state | 0 | A fresh copy says "out of date". Firm-record values say "Confirmed by the officer". |
| Correct data | ½ | The values are right. The phone and country are still by hand. The change list is wrong on the phone. |
| Error recovery | 0 | Generating a new copy repeats the out-of-date state. Edit's 400 gives no way forward. |
| Accessibility and screen sizes | 1 | axe 0 at 1024. No sideways scroll at 400 or 1024. Keyboard-only and 200 % zoom were not walked (no new controls). |
| Speed | 1 | 68–80 ms API, about 1 s page. |
| Visual quality | 1 | Team look is unchanged (`rep-tab-1024.png`). |
| Trust and sources | 0 | The firm record is shown as an officer's confirmation, and its channel is shown as "answered". |

**Score 5/10. Fail** (below 8, with three criteria at 0).

Fixes, most valuable first:
1. Compare and hash facts with a key-order-free stringify, and add a test that generates IMM 5476 and locks it.
2. Make firm-record answers read-only in the views, with their own words ("From the firm record"). Hide Edit and Confirm for them, keep them out of `seen`, and keep them out of SQR.
3. Make the phone and country transforms executable, or correct the record.

## Not tested
* A real screen reader.
* An intended user's unaided walk (D17 and D20 stay with the founder).
* A keyboard-only walk and 200 % zoom on the representative tab.
* The SQR part in the browser (checked through the API only).
* Screenshots are under `/tmp/claude-0/-home-user-xpatready/996db592-b798-557c-8d10-93d97a7e840a/scratchpad/` (`rep-tab-1024.png`, `rep-tab-400.png`, `rep-confirm-1024.png`, `rep-edit-1024.png`). They are not committed.

## Round 2 (commit 7a07e52b, own fresh copy on :4438, now stopped)
I re-walked journeys 1, 4 and 5 in the browser (headless chromium) and checked the data in the API, the database and the PDF read back.

* **Journey 1.** A new IMM 5476 copy on a fully confirmed case is `out_of_date: false, changed: []`. The PDF holds the representative's name, e-mail, address and phone from the firm record. Lock as filed is refused only by the "filling is not proven yet" gate, which existed before; there is no "out of date" loop. The country is written as `canada` (Minor n1).
* **Journey 4.** Lines read "From the firm record", with "Change it in the firm record" and no Edit. The Confirm section buttons are disabled. The empty fax still offers Add, and Save fails with "That person is not on this case." (Minor n2).
* **Journey 5.** The client's questionnaire has no representative block (`r2-client-1024.png`).
* Suites: `check_vv_prepare_api` 30/30, `check_case_engine` 57/57, `check_p5_engine` 33/33.
* axe 0 at 1024. No sideways scroll at 400 or 1024. Keyboard Tab reaches the representative tab and its parts.

| Criterion | Score | Evidence |
|---|---|---|
| Task completed | 1 | The block is filled and the copy is current. |
| Next step obvious | ½ | Fax Add leads nowhere. The intro says "Click Edit". |
| Plain words | ½ | The lower-case "representative" tab, and `canada`. |
| Feedback and state | 1 | Copy state is right. Source words are right. |
| Correct data | ½ | `canada` in lower case on IRCC's form. |
| Error recovery | ½ | Fax Add gives 404 words. |
| Accessibility and screen sizes | 1 | axe 0, both widths fine. |
| Speed | 1 | About 1 s page, 70–80 ms API. |
| Visual quality | 1 | `r2-rep-tab-1024.png` |
| Trust and sources | 1 | "From the firm record" with its tooltip. |

**Round 2 score: 8/10, Pass** (no criterion at 0).

Screenshots (not committed) are under `/tmp/claude-0/-home-user-xpatready/996db592-b798-557c-8d10-93d97a7e840a/scratchpad/`: `r2-rep-tab-1024.png`, `r2-rep-tab-400.png`, `r2-fax-add-1024.png`, `r2-client-1024.png`.
