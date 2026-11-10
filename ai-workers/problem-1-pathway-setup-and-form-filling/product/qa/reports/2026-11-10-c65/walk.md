# C6.5 gate A walk by screens (P-317, P-348 (3)), main 2cfdad961, 10 Nov 2026, 07:39–07:52 IST

**Copy and data.** qa lane, cloud copy. My own copy `qa_c65w` on :4475 (`tools/isolated.sh`, ttl 150 min), on main **2cfdad961**'s app tree. The branch head 7db6625d2 adds only this report folder. Loaded by the screens' own routes, as Demo does: Reset, then Load the configured checkpoint (`scripts/start.zsh`, 2 min).

**Setup, not under test.** Each item below is named, and none of it is C6.5:
* One Visitor visa family case, ACC-mwa20q3p-jsqu, opened by the pack's helper (`scripts/c65_case.mts`, `acceptance/lib/m3.ts` openCase): Client A, Spouse A, Child A1 (10), Child A2 (15).
* The synthetic Sample files written to disk:
  * the pack's own `fundsPdf()` and `marriagePdf()`, whose fixed bytes give their saved AI reads, replayed by checksum at US$0;
  * a Sample passport;
  * a Sample birth certificate.
* Answers typed by the officer in the Agent view "Add" dialogs (phases `married` and `minor` of `scripts/walk.mjs`), so that the marriage and birth-certificate lines appear:
  * both adults: marital status "Married";
  * the application date: 20 Nov 2026;
  * Child A1 travels with: "One parent".

**How it was walked.** Everything else is by screens in Playwright Chromium (headless; no display in a cloud copy), at 1024 px, time zone Asia/Kolkata. The person is the case officer, chosen as "Acting as" does. Every press was on the element a person sees:
* "Actions for …", then "Upload a file…" and the file chooser;
* "Fill this from documents";
* "Replay the saved read · US$0";
* "Matches the document";
* "Confirm & use";
* the answer sheet's link.

The quoted words below were read from the page. Live AI was off, and no priced button exists or was pressed (P-175). `ai_batch` held 7 rows before and after the walk: no model call.

## 1. Proof of financial support → the application's funds (QA-352's main document)
* Case page › Documents › Sample Client A › "Proof of financial support · For each applicant · Not requested" › Actions › Upload a file… › `sample-funds.pdf`. The line now reads "Received … File: sample-funds.pdf" (01).
* Agent view › the application › "Details of visit to Canada" › Fill this from documents. The drawer is "Fill from documents · The application · Details of visit to Canada". It shows a cost card: "Proof of financial support · Sample Client A: read by AI. A live read would cost about US$0.03, at most US$0.20. It is not offered here: it needs approval first." with "Replay the saved read · US$0" (02).
* After Replay:
  * The block reads "Proof of financial support · Sample Client A · sample-funds.pdf · A saved AI read, replayed: US$0 · Open the document".
  * The value reads "Funds available for the stay, in Canadian dollars (Details of visit to Canada): CAD 14,200 · page 1 · confidence 97% (Sample) · Stated as 'Funds available: CAD 14,200.00' … The reader gave "14200.00"".
  * Beside it: "Matches the document" and "Correct it".
  * Confirm & use is disabled, with "Tick or correct each value first: 1 left." (03).
  * "Not on these documents" lists the section's other eight questions, each with "Answer it".
* Ticked: Confirm & use is enabled (04). Pressed: "Funds available for the stay, in Canadian dollars: CAD 14,200 · Used · Confirmed and used by Case officer on 10 Nov, 07:43 IST." (05).
* Underneath: the application's answer is `14200 · VERIFIED · document_read · ai_vision`, with the document and the read value; `document_review.confirmed_by` is user-O.

## 2. Marriage certificate → the marriage date (QA-352's second document)
* After "Married" for both adults (06), the case page shows one "Marriage certificate copy · Once for the couple · Shared · Provided by Sample Spouse A". Upload a file… › `sample-marriage.pdf` gives "Received · Needed: the applicant is married." (07).
* Agent view › Sample Spouse A › Personal details › Fill this from documents. The cost card reads "Marriage certificate copy: read by AI … about US$0.03, at most US$0.20 … Replay the saved read · US$0" (08).
* After Replay: "Date the person married or began the common-law relationship with the current spouse or partner (Personal details): 14 Jun 2019 · page 1 · confidence 95% (Sample) · Marriage date stated as 14 June 2019 at Sample City". It shows "1 left" until ticked (09). Confirm & use: "14 Jun 2019 · Used · Confirmed and used by Case officer on 10 Nov, 07:45 IST." (10).
* Underneath: Spouse A's `relationship.union_start_date` is `"2019-06-14" · VERIFIED · document_read · ai_vision`.
* **Noted (QA-380):** Client A's own marriage-date question stays "Not answered". Client A's Personal details › Fill this from documents says "Nothing to read here. No uploaded document of Sample Client A gives a value in this section. Type the answers." (13). On this release the fact is person-scoped (CLIENT_LEVEL), and the library supply says "about: holder".

## 3. The minor's birth certificate (QA-352's third named document)
* After the application date and "One parent" for Child A1, the case page shows "Copy of the minor's birth certificate · For each applicant · Needed: a child under 18 travelling alone or with one parent." Upload a file… › `sample-birth-certificate.pdf` gives "Received" (14).
* Agent view › Sample Child A1 › Personal details › Fill this from documents: "Copy of the minor's birth certificate: read by a person. Check its values against it. · Open the document". There is no cost card and no AI read (15).
* On the release, the type is `readerKind person_only`, `identityDocument true`, `supplies_facts []` (`reader-coverage.txt`). So it gives no fact to "Fill this from documents". It is named as read by a person (P-134: AI never reads identity documents).

## 4. Gate A: the next capability's first step (C7.3, the online form's answer sheet)
* Case page › Prepare application › "Open answer sheet: IMM 5257 for Sample Client A" (11a). The sheet shows:
  * "1. Personal details": "Date the person married … · Sample Spouse A · 2019-06-14 · **Document**" (11b);
  * "5. Details of visit to Canada": "Funds available for the stay, in Canadian dollars · The application · 14200 · **Case officer**" (11c).
  * Both values read from the documents reach the next step, each with Copy.
  * **Noted (QA-379):** the funds' Source says "Case officer", although the value was read from the document.
* "Open answer sheet: IMM 5257 for Sample Spouse A" (12a, 12b): the funds 14200 are there. Client A's marriage date is under "Still to answer or confirm" (QA-380). The full text of both sheets is in `sheet-client.txt` and `sheet-spouse.txt`.

## Headless replay (read-only): `replay-headless.txt`, 18/18, exit 0
The three drawers, in their Used and read-by-a-person states, at 400, 1024 and 1440 px, twice each:
* the words were as walked;
* no sideways scroll;
* axe WCAG 2.2 AA on the drawer: 0 violations;
* each drawer opened in 166–271 ms;
* no page errors.

## Not covered
* **Not walked:**
  * The shared demo :4400 does not exist in a cloud copy.
  * A real screen reader, keyboard only, and 200% zoom (the screen pack and #1444's reviewer covered the drawer's keyboard path).
  * The client's "please check" for a document read by AI. The 9 Nov walk covered it for the passport, and the pack covers it for the funds (C6.5-23*).
  * A second applicant's statement without a saved read. The pack covers it (C6.5-23d), and the reviewer walked it.
* One pass, one case type (Visitor visa).
* The "Last change" times on checklist lines and answers follow the browser's time zone with no zone name. The drawer writes "IST". This was seen only because the first two phases ran with the container's UTC; the later ones ran with Asia/Kolkata. Not filed: it is not C6.5.
* Typing only "20" in the application date's Day box and pressing Save stored `"--20"` as a DECLARED answer, with "Enter a real date as day, month and year." under it after the save. That looks like the keep-and-flag design for problem answers. Not C6.5, not filed; a question for the Lead (report).
