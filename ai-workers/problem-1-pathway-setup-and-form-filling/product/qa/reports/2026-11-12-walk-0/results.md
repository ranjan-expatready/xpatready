# Retest and check results (walk 0, main 68a7b59d1, fresh isolated copies, live AI off, US$0)

Each block: the script's own PASS, FAIL and summary lines, as printed. Files named <copy>-r<round>; r1 of qa_rt162 never started (the runner left out the API's tsconfig).

## qa_400-r2
```
PASS  QA-400 setup: IMM 5257 SCH1's "Indicate whether you are" form field is mapped — [["case.subject_is_principal_applicant","form_subject","CASE_LEVEL"]]
FAIL  QA-400 (C6.2, C7.1): SCH1's principal-applicant box reads a value of the form's own person, not one answer for the whole application (case.subject_is_principal_applicant) — {"key":"case.subject_is_principal_applicant","person":"form_subject","scope":"CASE_LEVEL"}
INFO  per-person form fields reading a once-per-application field: 51
      IMM 0008 (05-2026) · case.csq_application_date
      IMM 0008 (05-2026) · case.csq_number
      IMM 0008 (05-2026) · case.csq_received
      IMM 0008 (05-2026) · case.intended_province
      IMM 0008 (05-2026) · case.number_of_family_members
      IMM 0008 DEP (10-2024) · case.accompanies_principal_applicant
      IMM 0008 DEP (10-2024) · case.consent_release_to_province
      IMM 1294 (06-2026) · case.caq_number
      IMM 1294 (06-2026) · case.dli_number
      IMM 1294 (06-2026) · case.expenses_paid_by
      IMM 1294 (06-2026) · case.expenses_paid_by_other
      IMM 1294 (06-2026) · case.funds_available_cad
      IMM 1294 (06-2026) · case.other_study_cost
      IMM 1294 (06-2026) · case.pal_expiry_date
      IMM 1294 (06-2026) · case.pal_number
      IMM 1294 (06-2026) · case.room_board_cost
      IMM 1294 (06-2026) · case.school_address
      IMM 1294 (06-2026) · case.school_name
      IMM 1294 (06-2026) · case.service_language
      IMM 1294 (06-2026) · case.student_id_number
      IMM 1294 (06-2026) · case.study_end_date
      IMM 1294 (06-2026) · case.study_field
      IMM 1294 (06-2026) · case.study_level
      IMM 1294 (06-2026) · case.study_start_date
      IMM 1294 (06-2026) · case.tuition_cost
      IMM 5257 SCH1 (09-2023) · case.subject_is_principal_applicant
      IMM 5475 (05-2021) · case.application_type
      IMM 5475 (05-2021) · case.release_authorization_action
      IMM 5475 (05-2021) · case.submission_office_name
      IMM 5476 (11-2021) · case.application_type
1 passed, 1 failed
EXIT 1
```

## qa_rt162-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:10:39Z
Error: Transform failed with 15 errors:
EXIT 1
```

## qa_rt162-r2
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:11:13Z
PASS  setup: Visitor visa asks its questions (placed facts) — 240
PASS  QA-162 pass: the saved PQR picks land well above the 2 of 23 before (at least 10 picks) — {"before":2,"now":10}
PASS  C4.7 fail (QA-194): "Purpose of visit" fits the purpose and its 'other' details, so it is left out naming both, never guessed — {"role":"principal","asks":"Purpose of visit","why":"\"Purpose of visit\" could be 2 questions of this person (\"Purpose of the visit to Canada\", \"Description of the visit purpose when it is 'other'\"), so it is not guessed: pick it by hand (first reading)."}
PASS  QA-162 pass: "Funds available for stay" lands on the funds question
PASS  C4.7 fail (QA-194): "Criminal record" fits criminal history and its details, so it is left out naming both; the details are never taken — {"role":"principal","asks":"Criminal record","why":"\"Criminal record\" could be 2 questions of this person (\"Whether the person ever committed, was arrested for, charged with or convicted of a criminal offence\", \"Details of criminal history\"), so it
PASS  QA-162 pass: "Accompanying spouse or partner" and "Accompanying children" land on each person's own question
PASS  QA-162 fail: "Planned dates of stay" names two questions (first and last day), so it is left out naming both, never guessed — {"role":"principal","asks":"Planned dates of stay","why":"\"Planned dates of stay\" could be 2 questions of this person (\"Planned first day of the stay in Canada\", \"Planned last day of the stay in Canada\"), so it is not guessed: pick it by hand (first reading)."
PASS  QA-162 fail: a fact no question asks ("Ever held Canadian PR", "Ties to home country") is left out with its reason
PASS  QA-162 pass: every pick left out has its reason in words, and every pick is either landed or left out
PASS  QA-162 pass (review m3): every landed pick is a reading of an item on To review (none vanishes between landed and proposed) — {"readings":10,"landed":10}
PASS  QA-162 fail (review m3): the same question picked twice in one reading is listed as left out, with the reason, never dropped silently
PASS  QA-162 pass: a pick named in other words than the question's own is never Ready, and says what the AI wrote
C4.11 step 5 saved conditions (#531): 22 conditions in two rounds → before 0 named both questions; now 9 landed (6 items: 0 Ready, 3 Check, 3 Decide), 13 left out
PASS  C4.11 pass (QA-162 after QA-194): "Other purpose details" lands, decided by the purpose of the visit being 'other' (the only question that can take that answer) — {"kind":"condition","target":{"kind":"question","key":"case.visit_purpose_other"},"roles":["case"],"condition":{"sentence":"\"Description of the visit purpose when it is 'other'\" is asked only when \"Purpose of the visit to Cana
PASS  QA-162 pass: "Military service dates and countries" when the person served lands on military service details, decided by military service
PASS  QA-162 pass: "Ever used other name" decides both other-name questions through IMM 5257's own Yes/No question (yes), never through a name question — [[{"subjectKind":"PERSON","op":"eq","field":"person.used_other_name","value":true}],[{"subjectKind":"PERSON","op":"eq","field":"person.used_other_name","value":true}]]
PASS  QA-162 pass: the national ID number and the green card number are decided by their own Yes/No questions — [[{"subjectKind":"PERSON","op":"eq","field":"person.has_national_id","value":true}],[{"subjectKind":"PERSON","op":"eq","field":"person.us_lawful_permanent_resident","value":true}]]
PASS  C4.11 fail (QA-162): a deciding answer the form works out itself ("Lived elsewhere past five years", "Residence same as mailing", "Applying from residence country") leaves its condition out, naming IMM 5257's form field and what to do — ["IMM 5257 asks \"Applying from residence country\" (\"Is the country from where you are applying the same as your current country of residence?\") but wor
PASS  C4.11 pass (QA-162): the explanation names the one form field meant: "Residence same as mailing" is the same-as-mailing question, "Lived elsewhere past five years" the past-5-years one — [{"form":"IMM 5257","caption":"Is your residential address the same as your mailing address?","from":"Current residential (home) address"},{"form":"IMM 5257","caption":"During the past 5 years have you liv
PASS  C4.11 fail (QA-162): words no worked-out form field holds name none (never the nearest one)
PASS  QA-162 pass: at least 9 of the 22 saved conditions land (was 8 before the guide's sentence could break a tie) — {"now":9}
PASS  C4.11 pass (QA-162): the guide's sentence breaks a tie of words: "Other names used" lands on the other family name only, both readings agree, for a person to check (never Ready) — {"agreement":"agreed","confidence":"check","named":"The AI wrote \"Other family names used\"; taken as \"Family name of any other name ever used (nickname, maiden name, alias)\": every word of it is there and no 
PASS  C4.11 fail (QA-162): a tie the sentence does not break ("Other country of residence details") is left out naming both, with what to do, never guessed
PASS  C4.11 fail (QA-162): a sentence that names both tied questions, or neither, breaks no tie — ["person.other_family_name","person.other_given_names"]
PASS  C4.11 fail (QA-162): "Common-law union declaration" is a form, not a question: left out naming IMM 5409, in the forms library but not one of Visitor visa's forms — "\"Common-law union declaration\" names a form, not a question: IMM 5409 (STATUTORY DECLARATION OF COMMON-LAW UNION) is in the forms library but not one of this combination's forms. Whether this combination needs it, and when (h
PASS  C4.11 pass (QA-162): every condition left out says what a person can do (draft again with Saved, set it by hand, or the Forms tab), never only that it is not guessed — []
PASS  C4.11 fail (review M1): "Other immigration status description" names no single question: the 'other' status descriptions it asks are named, set it by hand; never "no question asks it" — "\"Other immigration status description\" names no single question of this person, so it is not guessed; the nearest it asks are \"Description of the status in the applying-from country when it is 'other'\"
PASS  C4.11 fail (review M1): "Highest post-secondary education details" names the education questions it asks and IMM 5257's worked-out Yes/No, with set it by hand (both readings) — "\"Highest post-secondary education details\" names no single question of this person, so it is not guessed; the nearest it asks are \"Field of study of a post-secondary education period\", \"Start date of a period 
PASS  C4.11 pass (review M1): with no asked question near the words ("Previous spouse or partner details"), the reason still says to map and place IMM 5257's boxes
PASS  C4.11 pass (review m1): a form field's question starts at its first word and is cut only between words — ["Have you had any post secondary education including university, college or apprenticeship training?","During the past 5 years have you lived in any country other than your country of citizenship or your current country of residence for more…"]
PASS  C4.11 pass (review m8): a reason about a question named in the AI's own words says what the AI wrote
PASS  C4.11 fail (review m7): the sentence names a question that is not placed yet: the reason says it is not asked yet (placement), never a tie — "\"Family name of any other name ever used (nickname, maiden name, alias)\" (the guide's sentence names it among the 2 questions \"Other names used\" fits) is not asked by a question of this combination yet, so it is not guessed. Once it is placed for
PASS  C4.11 pass (QA-162): the run card's list holds every condition left out and every passage the AI could not turn into one condition, each with its reason — {"lines":19,"dropped":13,"unresolved":6}
PASS  QA-162 pass: more saved conditions land than the 0 of 22 before — {"before":0,"now":9}
PASS  QA-162 pass: every condition left out has its reason, and every condition is landed or left out
PASS  QA-162 pass (review m3): every landed condition is a reading of an item on To review — {"cReadings":9,"landed":9}
PASS  QA-162 pass: a condition named in other words is never Ready
PASS  QA-162 pass: Visitor visa's question list (for future Live rounds) is admitted by the launcher's guard and lists each question as role | key | label — "<input file=\"prototype/p2/question-lists/vv.single-a4e1504e5594.questions.json\" sha256=\"a4e1504e5594df13a0f17674b2e3731e030afe95e9b5b4a2a9413af7c677af87\" kind=\"question_list\" trust=\"the combination's "
PASS  QA-162 pass: it never lists the representative's (the firm's) questions
PASS  QA-162 fail (break M1): a question's label changed after the plan gives another question list and another plan checksum — {"a":"prototype/p2/question-lists/vv.single-a4e1504e5594.questions.json","b":"prototype/p2/question-lists/vv.single-8ab8cb53c94c.questions.json"}
QA-162 counts — C4.7 picks: before 2/23, now 10/23 · C4.11 step 5 conditions: before 0/22, now 9/22 (port 4473)
39/39 passed
EXIT 0
```

## qa_rt162-r3
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:16:40Z
PASS  setup: Visitor visa asks its questions (placed facts) — 240
PASS  QA-162 pass: the saved PQR picks land well above the 2 of 23 before (at least 10 picks) — {"before":2,"now":10}
PASS  C4.7 fail (QA-194): "Purpose of visit" fits the purpose and its 'other' details, so it is left out naming both, never guessed — {"role":"principal","asks":"Purpose of visit","why":"\"Purpose of visit\" could be 2 questions of this person (\"Purpose of the visit to Canada\", \"Description of the visit purpose when it is 'other'\"), so it is not guessed: pick it by hand (first reading)."}
PASS  QA-162 pass: "Funds available for stay" lands on the funds question
PASS  C4.7 fail (QA-194): "Criminal record" fits criminal history and its details, so it is left out naming both; the details are never taken — {"role":"principal","asks":"Criminal record","why":"\"Criminal record\" could be 2 questions of this person (\"Whether the person ever committed, was arrested for, charged with or convicted of a criminal offence\", \"Details of criminal history\"), so it
PASS  QA-162 pass: "Accompanying spouse or partner" and "Accompanying children" land on each person's own question
PASS  QA-162 fail: "Planned dates of stay" names two questions (first and last day), so it is left out naming both, never guessed — {"role":"principal","asks":"Planned dates of stay","why":"\"Planned dates of stay\" could be 2 questions of this person (\"Planned first day of the stay in Canada\", \"Planned last day of the stay in Canada\"), so it is not guessed: pick it by hand (first reading)."
PASS  QA-162 fail: a fact no question asks ("Ever held Canadian PR", "Ties to home country") is left out with its reason
PASS  QA-162 pass: every pick left out has its reason in words, and every pick is either landed or left out
PASS  QA-162 pass (review m3): every landed pick is a reading of an item on To review (none vanishes between landed and proposed) — {"readings":10,"landed":10}
PASS  QA-162 fail (review m3): the same question picked twice in one reading is listed as left out, with the reason, never dropped silently
PASS  QA-162 pass: a pick named in other words than the question's own is never Ready, and says what the AI wrote
C4.11 step 5 saved conditions (#531): 22 conditions in two rounds → before 0 named both questions; now 9 landed (6 items: 0 Ready, 3 Check, 3 Decide), 13 left out
PASS  C4.11 pass (QA-162 after QA-194): "Other purpose details" lands, decided by the purpose of the visit being 'other' (the only question that can take that answer) — {"kind":"condition","target":{"kind":"question","key":"case.visit_purpose_other"},"roles":["case"],"condition":{"sentence":"\"Description of the visit purpose when it is 'other'\" is asked only when \"Purpose of the visit to Cana
PASS  QA-162 pass: "Military service dates and countries" when the person served lands on military service details, decided by military service
PASS  QA-162 pass: "Ever used other name" decides both other-name questions through IMM 5257's own Yes/No question (yes), never through a name question — [[{"subjectKind":"PERSON","op":"eq","field":"person.used_other_name","value":true}],[{"subjectKind":"PERSON","op":"eq","field":"person.used_other_name","value":true}]]
PASS  QA-162 pass: the national ID number and the green card number are decided by their own Yes/No questions — [[{"subjectKind":"PERSON","op":"eq","field":"person.has_national_id","value":true}],[{"subjectKind":"PERSON","op":"eq","field":"person.us_lawful_permanent_resident","value":true}]]
PASS  C4.11 fail (QA-162): a deciding answer the form works out itself ("Lived elsewhere past five years", "Residence same as mailing", "Applying from residence country") leaves its condition out, naming IMM 5257's form field and what to do — ["IMM 5257 asks \"Applying from residence country\" (\"Is the country from where you are applying the same as your current country of residence?\") but wor
PASS  C4.11 pass (QA-162): the explanation names the one form field meant: "Residence same as mailing" is the same-as-mailing question, "Lived elsewhere past five years" the past-5-years one — [{"form":"IMM 5257","caption":"Is your residential address the same as your mailing address?","from":"Current residential (home) address"},{"form":"IMM 5257","caption":"During the past 5 years have you liv
PASS  C4.11 fail (QA-162): words no worked-out form field holds name none (never the nearest one)
PASS  QA-162 pass: at least 9 of the 22 saved conditions land (was 8 before the guide's sentence could break a tie) — {"now":9}
PASS  C4.11 pass (QA-162): the guide's sentence breaks a tie of words: "Other names used" lands on the other family name only, both readings agree, for a person to check (never Ready) — {"agreement":"agreed","confidence":"check","named":"The AI wrote \"Other family names used\"; taken as \"Family name of any other name ever used (nickname, maiden name, alias)\": every word of it is there and no 
PASS  C4.11 fail (QA-162): a tie the sentence does not break ("Other country of residence details") is left out naming both, with what to do, never guessed
PASS  C4.11 fail (QA-162): a sentence that names both tied questions, or neither, breaks no tie — ["person.other_family_name","person.other_given_names"]
PASS  C4.11 fail (QA-162): "Common-law union declaration" is a form, not a question: left out naming IMM 5409, in the forms library but not one of Visitor visa's forms — "\"Common-law union declaration\" names a form, not a question: IMM 5409 (STATUTORY DECLARATION OF COMMON-LAW UNION) is in the forms library but not one of this combination's forms. Whether this combination needs it, and when (h
PASS  C4.11 pass (QA-162): every condition left out says what a person can do (draft again with Saved, set it by hand, or the Forms tab), never only that it is not guessed — []
PASS  C4.11 fail (review M1): "Other immigration status description" names no single question: the 'other' status descriptions it asks are named, set it by hand; never "no question asks it" — "\"Other immigration status description\" names no single question of this person, so it is not guessed; the nearest it asks are \"Description of the status in the applying-from country when it is 'other'\"
PASS  C4.11 fail (review M1): "Highest post-secondary education details" names the education questions it asks and IMM 5257's worked-out Yes/No, with set it by hand (both readings) — "\"Highest post-secondary education details\" names no single question of this person, so it is not guessed; the nearest it asks are \"Field of study of a post-secondary education period\", \"Start date of a period 
PASS  C4.11 pass (review M1): with no asked question near the words ("Previous spouse or partner details"), the reason still says to map and place IMM 5257's boxes
PASS  C4.11 pass (review m1): a form field's question starts at its first word and is cut only between words — ["Have you had any post secondary education including university, college or apprenticeship training?","During the past 5 years have you lived in any country other than your country of citizenship or your current country of residence for more…"]
PASS  C4.11 pass (review m8): a reason about a question named in the AI's own words says what the AI wrote
PASS  C4.11 fail (review m7): the sentence names a question that is not placed yet: the reason says it is not asked yet (placement), never a tie — "\"Family name of any other name ever used (nickname, maiden name, alias)\" (the guide's sentence names it among the 2 questions \"Other names used\" fits) is not asked by a question of this combination yet, so it is not guessed. Once it is placed for
PASS  C4.11 pass (QA-162): the run card's list holds every condition left out and every passage the AI could not turn into one condition, each with its reason — {"lines":19,"dropped":13,"unresolved":6}
PASS  QA-162 pass: more saved conditions land than the 0 of 22 before — {"before":0,"now":9}
PASS  QA-162 pass: every condition left out has its reason, and every condition is landed or left out
PASS  QA-162 pass (review m3): every landed condition is a reading of an item on To review — {"cReadings":9,"landed":9}
PASS  QA-162 pass: a condition named in other words is never Ready
PASS  QA-162 pass: Visitor visa's question list (for future Live rounds) is admitted by the launcher's guard and lists each question as role | key | label — "<input file=\"prototype/p2/question-lists/vv.single-a4e1504e5594.questions.json\" sha256=\"a4e1504e5594df13a0f17674b2e3731e030afe95e9b5b4a2a9413af7c677af87\" kind=\"question_list\" trust=\"the combination's "
PASS  QA-162 pass: it never lists the representative's (the firm's) questions
PASS  QA-162 fail (break M1): a question's label changed after the plan gives another question list and another plan checksum — {"a":"prototype/p2/question-lists/vv.single-a4e1504e5594.questions.json","b":"prototype/p2/question-lists/vv.single-8ab8cb53c94c.questions.json"}
QA-162 counts — C4.7 picks: before 2/23, now 10/23 · C4.11 step 5 conditions: before 0/22, now 9/22 (port 4470)
39/39 passed
EXIT 0
```

## qa_rt237-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:10:39Z
PASS  setup: Reset to the six
PASS  C4.11 pass: Visitor visa's question list is still vv.single-ae2133b8a398, so the saved run replays — "prototype/p2/question-lists/vv.single-ae2133b8a398.questions.json"
PASS  setup: one document line on Study permit — ""
PASS  setup: every fact Study permit's forms need is asked
PASS  QA237 fail (P-279): Submit is refused while 1 number has no source entry, in words — "Fix the problems before submitting: 1 number has no source entry. Each is listed on Review and release. First: Form IMM 5707: From age: 18 has no source entry. "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":1,"numbers":1,"held_back":0}
PASS  setup: before any condition, Study permit holds none and has no Hiding error
PASS  setup: Visitor visa's saved run proposes conditions on 7 questions; all accepted there and approved by a second person — {"facts":["person.other_given_names","person.other_family_name","person.us_green_card_expiry_date","person.us_green_card_number","person.national_id_number","person.military_service_details","person.criminal_history_details"],"approved":7}
PASS  C4.11: the whole run spent US$0 (Saved and Rules only) — 0
PASS  C4.11 pass (QA-237): accepting and approving the proposed conditions leaves Visitor visa's draft with no "Hiding a value a form reads" error — []
PASS  C4.11 pass (QA-237): Submit refuses nothing for those conditions (the draft stays saveable) — {"status":400,"refusedFor":[]}
PASS  C4.11 pass (QA-237): instead, each condition Visitor visa's forms read outside it is a warning saying why and how to use it, in words, no field code — ["Condition not used on this combination: the question \"Free-text details of criminal history\" is asked every time here, because IMM 5257 reads its answer whenever the form applies. To use the condition here, make the form or its form fiel
PASS  C4.11 pass (QA-237, the guard rail): a held question carries no condition, so nothing a form reads is hidden; the library's condition is kept beside it — ["person.criminal_history_details","person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_number","person.us_green_card_expiry_date"]
PASS  C4.11 pass (QA-237): the panel still reads the library's condition for a held question and offers the confirmation — {"target":"person.criminal_history_details","rows":["not_confirmed"]}
PASS  C4.11 pass (QA-237): once its form field holds the same condition, the question is no longer held and carries the condition again — {"target":"person.criminal_history_details","held":["person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_number","person.us_green_card_expiry_date"]}
PASS  C4.11 fail (control): every other held question is still held, so the step above can fail — 6
PASS  C4.11 setup (QA-239): Study permit reads at least one of the questions Visitor visa conditioned (the bug can show) — ["person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_expiry_date"]
PASS  C4.11 pass (QA-239): the conditions approved on Visitor visa put no Hiding or Unreachable error on Study permit, whose author did nothing — []
PASS  C4.11 pass (QA-239): Study permit's draft fingerprint is unchanged by another combination's condition — {"before":"951c8e7bc1f53042a00769dadd2548cebb093408a08cb61f744199f3049b57fa","now":"951c8e7bc1f53042a00769dadd2548cebb093408a08cb61f744199f3049b57fa"}
PASS  C4.11 pass (QA-239): Study permit releases after the condition is approved on Visitor visa, 201 — {"status":201,"why":""}
PASS  C4.11 pass (QA-239): in Study permit's release those questions are asked every time (no condition), so its forms always have the answer — ["person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_expiry_date"]
PASS  C4.11: the run still spent US$0 — 0
22/22 passed
EXIT 0
```

## qa_rt237-r2
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:15:44Z
PASS  setup: Reset to the six
PASS  C4.11 pass: Visitor visa's question list is still vv.single-ae2133b8a398, so the saved run replays — "prototype/p2/question-lists/vv.single-ae2133b8a398.questions.json"
PASS  setup: one document line on Study permit — ""
PASS  setup: every fact Study permit's forms need is asked
PASS  QA237 fail (P-279): Submit is refused while 1 number has no source entry, in words — "Fix the problems before submitting: 1 number has no source entry. Each is listed on Review and release. First: Form IMM 5707: From age: 18 has no source entry. "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":1,"numbers":1,"held_back":0}
PASS  setup: before any condition, Study permit holds none and has no Hiding error
PASS  setup: Visitor visa's saved run proposes conditions on 7 questions; all accepted there and approved by a second person — {"facts":["person.other_family_name","person.other_given_names","person.us_green_card_expiry_date","person.military_service_details","person.criminal_history_details","person.national_id_number","person.us_green_card_number"],"approved":7}
PASS  C4.11: the whole run spent US$0 (Saved and Rules only) — 0
PASS  C4.11 pass (QA-237): accepting and approving the proposed conditions leaves Visitor visa's draft with no "Hiding a value a form reads" error — []
PASS  C4.11 pass (QA-237): Submit refuses nothing for those conditions (the draft stays saveable) — {"status":400,"refusedFor":[]}
PASS  C4.11 pass (QA-237): instead, each condition Visitor visa's forms read outside it is a warning saying why and how to use it, in words, no field code — ["Condition not used on this combination: the question \"Free-text details of criminal history\" is asked every time here, because IMM 5257 reads its answer whenever the form applies. To use the condition here, make the form or its form fiel
PASS  C4.11 pass (QA-237, the guard rail): a held question carries no condition, so nothing a form reads is hidden; the library's condition is kept beside it — ["person.criminal_history_details","person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_number","person.us_green_card_expiry_date"]
PASS  C4.11 pass (QA-237): the panel still reads the library's condition for a held question and offers the confirmation — {"target":"person.criminal_history_details","rows":["not_confirmed"]}
PASS  C4.11 pass (QA-237): once its form field holds the same condition, the question is no longer held and carries the condition again — {"target":"person.criminal_history_details","held":["person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_number","person.us_green_card_expiry_date"]}
PASS  C4.11 fail (control): every other held question is still held, so the step above can fail — 6
PASS  C4.11 setup (QA-239): Study permit reads at least one of the questions Visitor visa conditioned (the bug can show) — ["person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_expiry_date"]
PASS  C4.11 pass (QA-239): the conditions approved on Visitor visa put no Hiding or Unreachable error on Study permit, whose author did nothing — []
PASS  C4.11 pass (QA-239): Study permit's draft fingerprint is unchanged by another combination's condition — {"before":"fac1b7b66bdf3b08b7b8c23e182c5bc26d6f7ec36d563c8f85ac8237090c9a3e","now":"fac1b7b66bdf3b08b7b8c23e182c5bc26d6f7ec36d563c8f85ac8237090c9a3e"}
PASS  C4.11 pass (QA-239): Study permit releases after the condition is approved on Visitor visa, 201 — {"status":201,"why":""}
PASS  C4.11 pass (QA-239): in Study permit's release those questions are asked every time (no condition), so its forms always have the answer — ["person.military_service_details","person.national_id_number","person.other_family_name","person.other_given_names","person.us_green_card_expiry_date"]
PASS  C4.11: the run still spent US$0 — 0
22/22 passed
EXIT 0
```

## qa_rt275-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:10:39Z
PASS  QA-275 setup (C4.6): the first Preview fill completes — 201
PASS  QA-275 setup: the first artifact initially serves its own bytes — {"stored":"08932913216be8d3b875b7e680927361eb835d3e2920afb3dd8acdfbbbe769db","served":"08932913216be8d3b875b7e680927361eb835d3e2920afb3dd8acdfbbbe769db"}
PASS  QA-270 fail (C4.6, the file route): an artifact download with no person is refused (401), not served to anyone holding its link — 401
PASS  QA-275 setup: one Sample family-name fact changes between fills — "1\nUPDATE 1"
PASS  QA-275 setup: a second fill of the same form and person completes in the same minute — 201
PASS  QA-275 setup: the second PDF really receives the changed Sample value — {"first":"08932913216be8d3b875b7e680927361eb835d3e2920afb3dd8acdfbbbe769db","second":"279143bee958eba5445f353dc7ee337808b82f2fe0e909ad3fe3e5b7ca5910f1"}
PASS  QA-275 fail (C4.6): each fill gets its own file name, never a minute-sized name shared by both — {"first":"ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/var/isolated-qa_rt275/workspaces/demo/outputs/IMM1295-principal-2026-11-11T151107-55c11bfc-2e9f-45a1-a2b5-41bf7cdd58eb.pdf","second":"ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/var/isolated-
PASS  QA-275 fail (C4.6): the earlier artifact still serves its own original bytes after the later fill — {"expected":"08932913216be8d3b875b7e680927361eb835d3e2920afb3dd8acdfbbbe769db","actual":"08932913216be8d3b875b7e680927361eb835d3e2920afb3dd8acdfbbbe769db","second":"279143bee958eba5445f353dc7ee337808b82f2fe0e909ad3fe3e5b7ca5910f1"}
8 passed, 0 failed
EXIT 0
```

## qa_rt275-r2
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:15:44Z
PASS  QA-275 setup (C4.6): the first Preview fill completes — 201
PASS  QA-275 setup: the first artifact initially serves its own bytes — {"stored":"9c2ff29405dfadba77279f29bc737fc1baee2cd38e438beeb340e2e520860511","served":"9c2ff29405dfadba77279f29bc737fc1baee2cd38e438beeb340e2e520860511"}
PASS  QA-270 fail (C4.6, the file route): an artifact download with no person is refused (401), not served to anyone holding its link — 401
PASS  QA-275 setup: one Sample family-name fact changes between fills — "1\nUPDATE 1"
PASS  QA-275 setup: a second fill of the same form and person completes in the same minute — 201
PASS  QA-275 setup: the second PDF really receives the changed Sample value — {"first":"9c2ff29405dfadba77279f29bc737fc1baee2cd38e438beeb340e2e520860511","second":"a49ffaa55e70d6157832a2c9efa6be823107f17d3ca2e46c1e1d73e0d455ba5f"}
PASS  QA-275 fail (C4.6): each fill gets its own file name, never a minute-sized name shared by both — {"first":"ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/var/isolated-qa_rt275/workspaces/demo/outputs/IMM1295-principal-2026-11-11T151608-74e89e9d-46e3-4847-8792-1b7dff6e9b69.pdf","second":"ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/var/isolated-
PASS  QA-275 fail (C4.6): the earlier artifact still serves its own original bytes after the later fill — {"expected":"9c2ff29405dfadba77279f29bc737fc1baee2cd38e438beeb340e2e520860511","actual":"9c2ff29405dfadba77279f29bc737fc1baee2cd38e438beeb340e2e520860511","second":"a49ffaa55e70d6157832a2c9efa6be823107f17d3ca2e46c1e1d73e0d455ba5f"}
8 passed, 0 failed
EXIT 0
```

## qa_rt275b-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:12:00Z
PASS  QA-275 (setup): three fills of IMM 1295 for the principal (draft, release, draft) each made a filled PDF, inside one minute
PASS  QA-275 fail (C4.6): three fills in the same minute are three artifact rows with three different files
PASS  QA-275 pass: each file is named by its own artifact row's id
PASS  QA-275 fail (STANDARDS: a record matches its file): every row's file on disk still has the hash the row recorded
PASS  QA-275 pass: the name a person saves is the file's name with the row's id cut to its first 8 characters, as a case copy's
PASS  QA-275 fail (C4.6): each download is the bytes of its own fill (its recorded sha256), the release row is never served the draft's file
PASS  QA-275 pass: the draft fill and the release fill really differ (so the check above can tell them apart)
PASS  QA-275 pass: each fill's report file is its own (detail.report_file named like its PDF)
PASS  QA-275 pass: an earlier fill's link (a minute-named file, as made before) still downloads its own bytes, under its own name
9 passed, 0 failed
EXIT 0
```

## qa_rt276-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:10:39Z
PASS  QA-276 setup: Reset to the six
PASS  QA-276 setup: one Sample document line — ""
PASS  QA-276 setup: every fact the forms need is asked
PASS  QA276 fail (P-279): Submit is refused while 1 number has no source entry, in words — "Fix the problems before submitting: 1 number has no source entry. Each is listed on Review and release. First: Form IMM 5707: From age: 18 has no source entry. "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":1,"numbers":1,"held_back":0}
PASS  QA-276 setup: a Sample question no form or rule on this combination reads — {"fact":"qa276.movable_question","selected":"details_of_intended_study_in_canada","other":"applicant"}
PASS  QA-276 setup: the question is placed in a section Study permit chose — ""
PASS  QA-276 setup: the initial configuration releases — {"status":201,"why":""}
PASS  QA-276 setup: the shared question moves to a section Study permit did not choose — ""
PASS  QA-276 fail (C5.1): Approve and release succeeds after the deliberate section move — {"status":201,"why":""}
PASS  QA-276 fail: a refusal names the moved question and section, never a fictitious concurrent editor — {"status":201,"why":""}
PASS  QA-276 setup: moving the question back is accepted — ""
PASS  QA-276 recovery: moving the question back releases, or restores the existing release exactly so nothing new needs releasing — {"recovered":{"status":201,"why":""},"draft":"e6a4523a68a5bed94fb271625649e29e5d805e6c1fc7d73ba935dead6d6a9237","published":"e6a4523a68a5bed94fb271625649e29e5d805e6c1fc7d73ba935dead6d6a9237"}
13/13 passed
EXIT 0
```

## qa_rt276-r2
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:15:44Z
PASS  QA-276 setup: Reset to the six
PASS  QA-276 setup: one Sample document line — ""
PASS  QA-276 setup: every fact the forms need is asked
PASS  QA276 fail (P-279): Submit is refused while 1 number has no source entry, in words — "Fix the problems before submitting: 1 number has no source entry. Each is listed on Review and release. First: Form IMM 5707: From age: 18 has no source entry. "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":1,"numbers":1,"held_back":0}
PASS  QA-276 setup: a Sample question no form or rule on this combination reads — {"fact":"qa276.movable_question","selected":"details_of_intended_study_in_canada","other":"applicant"}
PASS  QA-276 setup: the question is placed in a section Study permit chose — ""
PASS  QA-276 setup: the initial configuration releases — {"status":201,"why":""}
PASS  QA-276 setup: the shared question moves to a section Study permit did not choose — ""
PASS  QA-276 fail (C5.1): Approve and release succeeds after the deliberate section move — {"status":201,"why":""}
PASS  QA-276 fail: a refusal names the moved question and section, never a fictitious concurrent editor — {"status":201,"why":""}
PASS  QA-276 setup: moving the question back is accepted — ""
PASS  QA-276 recovery: moving the question back releases, or restores the existing release exactly so nothing new needs releasing — {"recovered":{"status":201,"why":""},"draft":"4bfc2d14b5a8d42cb12996e91fb8da6b6b8bba45c42d9a19b14dfd275dc4253d","published":"4bfc2d14b5a8d42cb12996e91fb8da6b6b8bba45c42d9a19b14dfd275dc4253d"}
13/13 passed
EXIT 0
```

## qa_rt276b-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:12:00Z
PASS  setup: Reset to the six
PASS  setup: one Sample document line — ""
PASS  setup: every fact the forms need is asked
PASS  QA276 fail (P-279): Submit is refused while 1 number has no source entry, in words — "Fix the problems before submitting: 1 number has no source entry. Each is listed on Review and release. First: Form IMM 5707: From age: 18 has no source entry. "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":1,"numbers":1,"held_back":0}
PASS  setup: a section Study permit chose and one it did not — {"selected":"details_of_intended_study_in_canada","other":"applicant"}
PASS  setup: the question is placed in a section Study permit chose — ""
PASS  setup: the first configuration releases, 201 — {"status":201,"why":""}
PASS  setup: the question moves to a section Study permit did not choose — ""
PASS  C5.1 fail (QA-276): Approve and release goes through after the section move, 201 — {"status":201,"why":""}
PASS  C5.1 fail (QA-276): no refusal names a concurrent edit nobody made — {"status":201,"why":""}
PASS  C5.1 fail (QA-276): the released copy no longer asks the moved question — 140
PASS  C5.1 fail (QA-276): the draft equals the release, so nothing is left to release — {"draft":"fb7eeacab67623413d53d8fa7ddc20e54b03a8bdfce2862bb02c5edff4d91b53","release":"fb7eeacab67623413d53d8fa7ddc20e54b03a8bdfce2862bb02c5edff4d91b53"}
PASS  C5.1 fail (QA-276, BR-14): the person who made the move is an author of the release
PASS  C5.1 fail (QA-276): the move is published, the old placement superseded
PASS  setup: the question moves back — ""
PASS  C5.1 fail (break M1): an edit made during the release is still refused, 409, in the same words — {"status":409,"why":"Release refused: \"Outside Canada\" was changed while it was being released, so nothing was released. Review the change, submit it again, then release."}
PASS  C5.1 fail (break M1): nothing was released: the refusal rolled the release back
PASS  C5.1 fail (break M1): the move back was not published by the refused release
PASS  C5.1 pass (QA-276 recovery): moving it back releases, 201 — {"status":201,"why":""}
PASS  C5.1 pass: the released copy asks the question again, and equals the draft — {"draft":"658d8f64655ffc2f768cc4ee56f06ce9eebe6ab5f4f9c3b50a8333d7fb3cd73e","release":"658d8f64655ffc2f768cc4ee56f06ce9eebe6ab5f4f9c3b50a8333d7fb3cd73e"}
PASS  setup (Major 1): a rule on Study permit reads a question in a section it did not choose — ""
PASS  setup (Major 1): released, 201 — {"status":201,"why":""}
PASS  setup (Major 1): its words edited and the rule retired, so the draft no longer asks it — ""
PASS  C5.1 pass (Major 1): the release goes through, 201 — {"status":201,"why":""}
PASS  C5.1 fail (Major 1): the unrelated edit to a question dropped by a rule is not published by this release
PASS  C5.1 pass (Major 1): the draft equals the release — {"draft":"658d8f64655ffc2f768cc4ee56f06ce9eebe6ab5f4f9c3b50a8333d7fb3cd73e","release":"658d8f64655ffc2f768cc4ee56f06ce9eebe6ab5f4f9c3b50a8333d7fb3cd73e"}
27/27 passed
EXIT 0
```

## qa_rtc411-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:12:00Z
PASS  C4.11-1 pass: the plan lists the 7 steps in order — ["facts","documents","document_facts","comes_from","conditions","pqr_picks","checker"]
PASS  C4.11-2 pass: each step says its mode and its cost (usual and worst); Saved and Rules cost US$0
PASS  C4.11-3 pass: a Saved step names its saved result (date, edition, US$0, current)
PASS  C4.11-4 pass: the plan carries its fingerprint (plan_sha256)
PASS  C4.11-5 fail: a plan with Live steps on a copy without the founder's Go says so and cannot run (live.approved false, in words) — "Live is not open yet: each paid run is approved first, with its cost stated. Also, facts, document_facts, comes_from are worked out by the rules (no AI): plan them as rules."
PASS  C4.11-6 fail: steps out of order, or a step whose inputs are not planned, are refused (400, in words) — "Plan the steps in their order, each once: facts, documents, document_facts, comes_from, conditions, pqr_picks, checker."
PASS  C4.11-7 fail: a run of a plan that is not the one shown is refused (409: plan changed) — "This is not a plan shown for this combination in the last hour (or the forms, people or steps changed): plan again before it runs."
PASS  C4.11-8 pass: the run starts (202 or 201) with a run id — {"runId":"158cd3a8-3292-4afd-bb62-f5c7198aa3ff","status":"running"}
PASS  C4.11-9 pass: the same click twice is one run (idempotency key)
PASS  C4.11-10 pass: the run finishes, each of the 7 steps with its outcome — ["facts:done","documents:done","document_facts:done","comes_from:done","conditions:done","pqr_picks:done","checker:done"]
PASS  C4.11-11 pass: the queue gets documents per person, conditions and PQR picks — ["pqr_pick","document_type","field","requirement_line","condition"]
PASS  C4.11-12 pass: step 4 gives every fact a form needs its source (document, client or case officer), changeable on the Questions tab — {"facts":397,"step4":"397 answers: Document 0 · Client 373 · Case officer 24. The rules' choice applies until a person changes it on the Questions tab."}
PASS  C4.11-13 pass: every item names a step of this run (acceptance rate per step, P-130 §6.3) — ["pqr_picks","checklist_draft","qd_conditions"]
PASS  C4.11-14 pass: every AI item has both readings (draft and the independent checker) or is marked One reading only
PASS  C4.11-15 pass: every requirement line and condition rests on an official file with its quote found
PASS  C4.11-16 pass (checker): every PQR pick is a fact a client or document question asks (PQR ⊂ SQR) — ["case|case.funds_available_cad","principal|person.criminal_history","principal|person.violent_organization_association","principal|person.health_condition_requiring_services","case|case.intended_stay_to","case|case.visit_purpose","principal|person.overstayed_
PASS  C4.11-17 pass (checker): every fact from a document names a document on the checklist — {"from_documents":0,"missing":[]}
PASS  C4.11-18 data: every item is Sample; nothing is in the combination's draft until accepted
PASS  C4.11-19 pass (BR-7): no item names a person role that Who can be does not list — ["principal","spouse_or_partner"]
PASS  C4.11-G5 pass (G5): with the run's Ready items accepted, no fact a form needs is asked of nobody (any role) — {"ready":6,"nobody":0}
PASS  C4.11-20 fail (BR-12): a live run whose worst case is over the spend limit is refused before any call (409, 'use saved results or rules only') — "This plan has Live steps: Live is not open yet: each paid run is approved first, with its cost stated. Nothing was called; use saved results or rules only."
PASS  C4.11-21 fail (BR-10): a checklist text no saved reading has read is not offered as Saved (Out of date or none, with the reason), never replayed silently — {"usd":0,"state":"none","date":null,"edition":null,"why":"No saved AI reading of this combination's checklist yet: it is recorded in an approved Live run of the checklist, on its page."}
PASS  C4.11-22 pass: Stop stops a run (its state says stopped or finished, in words) — {"stop":201,"status":"stopping"}
PASS  C4.11-23 pass: the whole run spent US$0 (Replay and Rules only) — {"spent":0,"worst":0,"usual":null,"about":null}
PASS  C4.11-24 pass (QA-237): a condition accepted and approved, its form field not confirmed: the draft is not refused for it; the condition is held (the question asked every time, nothing a form reads hidden) and a warning says why and how to use it — {"refused":[],"warned":["Condition not used on this combination: the question \"Family name the person has otherwise used (nickname, maiden name
PASS  C4.11-25 pass (QA-237): the author confirms the form field through the new route, showing its own words, a second person approves: that question is no longer held and the condition is in force in the draft — {"confirmed":1,"left":[],"nowPlaced":[true],"rows":["confirmed"]}
PASS  C4.11 fail (P-279): Submit is refused while 3 numbers have no source entry, in words — "Fix the problems before submitting: 3 numbers have no source entry. Each is listed on Review and release. First: Form IMM 5257 SCH1: From age: 18 has no source "
PASS  setup (P-279): every number the draft publishes has a source answer before Submit — {"written":3,"numbers":11,"held_back":0}
PASS  C4.11-26 pass (the fill, BR-5): with the deciding answer No, that form field is not written, whatever is stored: Yes, a typed name, then No leaves no name for the form, and the form's Yes/No is written from the No — {"release":201,"refusedBy":[],"answers":[200,200,200],"copy":"GENERATED","no":{"gate":false,"box":{"box":"form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasFamilyName[0]",
PASS  C4.11-26 control: with the answer Yes again the same form field is written with the name, so the step above can fail — {"copy":"GENERATED","yes":{"name":"Sample Old Name","gate":true,"box":{"box":"form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasFamilyName[0]","why":null,"fact":"person.other_family_name","result":"written"},"yesNo":{"box":"form1[0].Page1[0].PersonalDetai
30/30 passed
EXIT 0
```

## qa_rtspr-r1
```
main 68a7b59d19c4b28ec17ceb50ff65290471fd809a 2026-11-11T15:12:00Z
PASS  C4.11-27 setup: Visitor visa's saved run proposes conditions, accepted there and approved by a second person; all in force — {"questions":["person.other_given_names","person.other_family_name","person.criminal_history_details","person.military_service_details","person.national_id_number","person.us_green_card_number","person.us_green_card_expiry_date"],"in_force":7}
PASS  C4.11-27 pass (QA-239): each of the four other combinations, set up by the people's steps, holds Visitor visa's conditions (the question asked every time, a warning) and is refused for none of them (no Hiding error) — {"held":{"Spouse":4,"Express Entry":4,"Study permit":5,"With an LMIA":7},"refused0":{"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}}
PASS  C4.11-27: no Unreachable question on the four — {"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}
PASS  C4.11-27 fail: with every plain form field confirmed, each combination with a worked-out Yes/No still holds the condition until that Yes/No is asked, so B88's door is what clears it — {"worked_out":9,"combinations_still_held":4}
PASS  C4.11-27 pass (QA-239): through B86's and B88's doors only, each with a second person, no condition is held on Spouse, Express Entry, Study permit and With an LMIA — {"after":{"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0},"refused":[]}
PASS  C4.11-27 pass: the conditions are still in force (none was removed to get there) — {"in_force":7,"of":7}
PASS  C4.11-27: still no Unreachable question on the four — {"Spouse":0,"Express Entry":0,"Study permit":0,"With an LMIA":0}
PASS  C4.11-27: US$0 (Replay and Rules only; the ledger unchanged) — {"before":0,"after":0}
8/8 passed
EXIT 0
```
