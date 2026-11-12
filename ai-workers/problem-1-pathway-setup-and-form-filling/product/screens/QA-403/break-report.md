# QA-403 break report (PR #1588)

**Breaker:** qa, on an isolated copy (`tools/isolated.sh brk_qa403 4447`). US$0, live AI off, no priced button pressed.
**Heads tested:**
- Round 1 on **4c6cf8e9b**, the head named in the brief. The server loads `p5/transforms.ts` and `engine/form-values.ts` once at start, so every copy in round 1 ran 4c6cf8e9b.
- While round 1 ran, the branch moved to **59a5564b3** (0bc29cb34, "review M1"). Round 2 started a fresh copy on 59a5564b3, loaded it again and repeated the form attacks.

**How:**
- Reset, then `demo/load {"sample":"configured"}`, then case SAMPLE-VV-FAMILY-1.
- Answers were set as user-O with `PUT …/answers/<case subject>/<fact>`.
- Each time, IMM 5476 and IMM 5475 (release 1) and IMM 5645 (after moving the case to release 2) were generated for Client A.
- The files were read back with `python3 -I` and pypdf: AcroForm `/V` for IMM 5476 and IMM 5645; the XFA `datasets` stream (`<AppDetails>`) for IMM 5475.

## Findings

### F1 Major (round 1, 4c6cf8e9b). Fixed on 59a5564b3: a wrong word left IMM 5476 with neither box ticked and nothing flagged
- **Steps:** officer answers `case.representative_form_action` = "withdraw", "appointment" or "annuler". The form's own label lists "withdraw" as a value. Then generate IMM 5476.
- **Expected:** both boxes go by hand with a reason.
- **Actual:** `appoint[0]=/Off`, `cancel[0]=/Off`, counts `by_hand 0, written 21`. After Confirm section, readiness drops the fact and the draft shows `to_fix 0`. Copies 806823b7, d424ded5, 95aea3e0.
- **Cause:** `p5/transforms.ts` (4c6cf8e9b) lines ~174-176 write the "else" code for any word that is not the one being tested.
- **Round 2:** "withdraw" and "apoint" now give `by_hand 2` with both boxes Off. "appoint" and "cancel" still tick the right box (copies 16d4ae06, 82055bb9, bb7eb490, 8fd36e73). **Fixed.**

### F2 Major (round 1). Fixed on 59a5564b3: IMM 5645 ticked "Other" for any unknown word
- **Steps:** move the case to release 2 (`POST …/release-update`). Officer answers `case.application_type` = "visit", "tourist", "Visitors", "study" or "work-permit". Generate IMM 5645.
- **Actual:** `Other[0]=/1` and the other three boxes Off, counts `by_hand 0`. Copies c9e66ad9, 27af876f, 72ded2ba, 79df1726, ad1f9ffc.
- **Cause:** the `_not_visitor_worker_or_student` step at transforms.ts ~177-181 (4c6cf8e9b).
- **Round 2:** "visit" and "tourist" give `by_hand 4` with all four boxes Off (copies 153cc527, 07f73f2d). "visitor" ticks Visitor and "student" ticks Student. **Fixed.**

### F3 Minor (59a5564b3): the question offers "other", but on IMM 5645 "other" always goes by hand
- **Steps:** officer answers `case.application_type` = "other". The question says "visitor, worker, student or other?".
- **Actual:** IMM 5645 `by_hand 4` and all boxes Off (copy e96a778a). No step names the word "other", so `wordsInSteps` never lists it (transforms.ts `tickByName` and `notAWord`). The PR's test asserts this on purpose (`check_qa403_who_fills.ts:65`).
- **Effect:** nothing is wrong on the form, but a word the question offers creates 4 by-hand lines and the Other box can never be filled. Either word the question so it matches what the form fills, or tick Other for "other".

### F4 Minor: an application type that contradicts the pathway is written without any warning
- **Steps:** on the **Visitor visa** case, officer answers "student".
- **Actual:**
  - IMM 5476 `application[0]="student"`.
  - IMM 5475 `<TextField2>student</TextField2>`.
  - IMM 5645 ticks Student (copies f26052a4, cec4388e, d34f0886).
  - No problem shows on the answer. The view says "No fixed list for this answer yet".
- **Expected:** the help text says the type "follows from the case's pathway", yet nothing checks it against the case's combination. "visitor visa", "OTHER" and accented French text are also written as typed (written to the form exactly as entered, which is the intended behaviour).

### F5 Minor: the office instruction in the help text never reaches the case officer
- **Steps:** look at the agent view as user-O, `GET …/questionnaire?mode=agent`, and the case page in the web app.
- **Actual:** `help_text` is stored on `section_question` and released. But neither the runtime view nor the case page shows any "Why we ask" text: 0 matches in the API and in the page at 1024 and 640 px.
- **Effect:** the officer never sees the instruction "on Ready to file, pass this line with the reason 'new application'" (`samples/who-fills.json:22`). They see only "Which IRCC office has the application, if it was already submitted?". This sits on IMM 5475 and IMM 5476 readiness as "not answered".
- **Note:** runtime has never shown help text. This PR is the first to rely on it.

### F6 Minor: doubled punctuation in "Facts changed since this copy was made"
- **Steps:** change either answer, then look at an out-of-date IMM 5476 or IMM 5475 copy on the case page (1024 px).
- **Actual:** "…student or other?." and "…Write appoint or cancel..".
- **Cause:** the new question words end in "?" or "." and the copy notice adds "." (who-fills.json:7 and :14). The other questions in the library have no ending punctuation.

### F7 Minor (round 1 only, reworded on 59a5564b3): "temporary residence" asked on permanent-residence combinations
- **Round 1:** in the released snapshots of **Express Entry** (IMM 5476) and **Spouse or common-law partner** (IMM 5476 and IMM 5475), `case.application_type` was asked as "Which kind of temporary residence application is this case…".
- **Round 2:** the words are now "Which kind of application is this case: visitor, worker, student or other?". The four offered values still do not fit a permanent-residence filing. This overlaps with F3 and F4.

## What held
- **The client cannot answer any of the three facts:**
  - Client questionnaire, sqr and pqr views: 0 occurrences.
  - `?mode=agent` as user-P returns 403.
  - `PUT` on the case subject or on the principal returns 403 "The officer enters this fact from a document or record.".
  - A relative path (`<principal>/parent_1`) or an encoded `../` returns 404.
  - Client re-confirm of the officer's answer id returns 409 "Nothing to re-confirm".
  - `sections/:s/confirm` and `earlier-facts` are officer-only.
  - The officer's answer still stands after these attempts. Re-checked on 59a5564b3.
- **The change went through the library route:** `library_change` placement_fills rows read RELEASED, proposed by user-A, decided by user-C, for all three facts. All five released combinations carry the three facts as `staff_working_view`.
- **The author cannot approve their own change:** user-A proposing and then approving gets 403 "A different person decides". Client A gets 403 (no review duty).
- **BR-14:** every release has approver user-B, and user-B is never an author. Visitor visa release 1 has authors `user-A,user-C`. Checkpoint rows 1, 3–12 and 17 are done (row 2 is parked, as before) on both heads.
- **Values the filler cannot use are not written, and each is flagged:**
  - A number, a list or a record: not written, with the problem "Choose an answer.".
  - 480 characters: not written, with the problem "Keep the answer to 120 characters." (`to_fix 1`).
  - An empty string: 400 "Give a value".
  - Full-width "ａｐｐｏｉｎｔ": by hand (2).
  - "Appoint", " cancel " and "APPOINT" are matched without case or spaces and tick correctly.
  - "cancel and replace" and "update contact details": by hand (2).
- **Running the checkpoint step again:** a second `demo/load` on a loaded copy is refused with 409 "Reset the demo first", so the step never runs twice on the same data.
- **Layout:** the officer's case page at 1024 px and at 640 px (200 %) has scrollWidth equal to the viewport, so no horizontal scroll.

## Not tested
- Keyboard-only use.
- Cases on the Study permit, LMIA, Express Entry and spouse combinations: the load opens none, so only their release snapshots were checked.
- The PR's own `tests/check_qa403_who_fills.ts`: its `psql` path is the Mac Homebrew one.
