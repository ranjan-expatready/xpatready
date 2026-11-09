# Gate A walk of C7.9, C7.10 and C7.7, main 3614e35b2, 9 Nov 2026, 13:22–13:27 IST

Browser pane, 1024 px, one pass. Fresh checkpoint copy qa_walk93 on :4472. Setup, not under test, is in `scripts/`: `walk_c79.mts` (the release that carries the flag, and two cases) and `walk_ready.mts` (the same steps as C7.10-screen's own, leaving one warning). The quoted words were read from the page. Two presses were made by script, not by mouse: the last "Pass" on the single-person case, and opening "Record the submission…".

## C7.9 Must verify before filing
* Configuration author, field page Passport number: "Must verify before filing", "Not marked". "Propose: must verify before filing…", reason typed, "Send to the immigration expert". The section then reads: "A change to mark it by Configuration author waits for the immigration expert on To review."
* Immigration expert, To review: under Shared library, "Passport Number · must verify before filing, for every combination". The page shows Now "Not marked", Proposed "Must verify before filing", what it does, and the reason. Approve.
* Field page afterwards: pill "Must verify before filing"; "is approved and goes out with the next release".
* Released by the script. On a one-person case the client typed the number. Officer, Ready to file: "CRITICAL: IMM 5257 for Sample Client A: "Number of the passport or travel document" not verified: the client gave it and no one on staff has checked it. Check against the document and confirm, or pass with a reason."
* "Pass with a reason…" with an empty box: "Say why this warning is passed (at least 5 characters, with words)." With a reason it is recorded: "“Checked against the passport scan by phone (Sample, qa walk).” — passed by Case officer (Sample), Nov 9, 2026, 01:24 p.m." Open warnings went from 21 to 20.

## C7.10 Readiness figure
* Case header: "Readiness: Not ready · 0% (lowest: Visitor visa: Sample Client A)". The filing: "Not ready", "0%", "0 of 12 done", "How this is worked out". That panel lists each counted item Done or Not done, then the rule in words.
* Four-person case, every fact answered: "Not ready · 22%", "2 of 9 done". "Record the submission…" is off, and says: "Opens once every filing is Ready to file: Sample Client A (Not started), …".
* One-person case with one warning left: "Not ready · 88%", "8 of 9 done · 5 passed with a reason". After that warning is passed: header "Ready · 100%", filing "Ready", "100%", "9 of 9 done · 6 passed with a reason", "Nothing stands before Ready to file."
* Pressed "Ready to file": the filing reads Ready to file, and "Ready to file. Record the submission below once IRCC acknowledges it."
* **Next capability's first step (C8.2):** "Record the submission…" is on and opens its form: "One record for the whole submission, as IRCC acknowledged it through APR Portal. It cannot be undone…". Nothing was recorded.

## C7.7 Online line (QA-317 retest)
* The Online line now reads "…from its answer sheet; a PDF copy, not for filing, is listed with the forms above." (it said "below" before, under the forms), with one link per person: "Open answer sheet: IMM 5257 for Sample Client A", and so on.
* **Next capability's first step (C7.3):** the link opens "IMM 5257 answer sheet · Sample Client A": "Type these answers into the IRCC account, section by section." "To do", "Every answer is ready to enter in the portal; 9 of 9 sections still to tick "Entered in the portal"…", "0 of 9 sections complete", then 9 numbered sections with Question, Person, Answer, Source and Copy.
* **Noted:** the page says to tick "Entered in the portal", and each section reads "Not entered", but the page has no tick control. C7.3's tick screen (B4) is known not built (`qa/CAPABILITIES.md`, C7.3; #1393's review lists B4).

## Not covered
1024 px and one pass only. No keyboard-only, 400 px, 1440 px or axe pass by qa. The walk copy refused its stop from a later call (port still listening); it stops itself at its 70-minute limit, about 14:30 IST.
