# C6.5 walk by screens, QA-322 retest and gate A, main d8fddc328, 9 Nov 2026, 18:22–18:36 IST

Mac qa lane. Own copy `qa_c65` on :4475 (`tools/isolated-sb.sh`), Reset, then Load the configured checkpoint. Setup, not under test (`scripts/c65_case.mts`, as the pack's C6.5-1): one Visitor visa family case (ACC-mw99gez5-cweq) and a synthetic passport (Sample; coded lines read SAMPLED, CLIENT A, SAMPLEP12) uploaded by the officer to Client A's passport line. Everything below is by screens in the built-in browser pane at 1024 px, one pass, switching the "Acting as (simulated)" box between Client A and the case officer. Every press was on the element. Quoted words were read from the page. Live AI off, US$0, no model call (the passport is read by rules).

## 1. The client types a name that differs from the passport
* As Client A, Client questionnaire › About Sample Client A › Personal details (part 18). Family name typed "SAMPLEDE", "Save and come back later". Underneath: `DECLARED|SAMPLEDE|questionnaire` (no screenshot of this step).

## 2. The officer reads the passport and uses it (C6.5's own steps)
* Case officer › Agent view › Sample Client A › Personal details › "Fill this from documents". The drawer: "Passport information page copy · sample-passport.pdf · Read from its coded lines: rules, no AI, US$0 · Check digits: passed". On the family name, before any click: "Differs from the current answer, SAMPLEDE (Client A typed it). Confirm & use opens a check for it and keeps the current answer until you choose." Country of citizenship and issuing country: "The coded line gives only the country code "IND": choose the country by hand." (01)
* Given names and sex marker need a look ("Matches the document" ticks); "3 values checked by the passport's check digits: The person's date of birth, Number of the passport or travel document, Passport expiry date" collapsed. Both ticked (02).
* "Confirm & use": "Family name … SAMPLED · Check opened", given names, sex, number, expiry "Used", date of birth "Agreed with the answer", "Confirmed and used by Case officer on 9 Nov, 18:26 IST." Toast: "Confirmed and used: 5 values now fill the forms. 1 differs from a typed answer: resolve that check (the typed answer is kept until then). 2 values are left for you to answer by hand (Citizenship, Passport country of issue)." (03)

## 3. QA-322: the client's "please check" (P-142 D6)
* As Client A, the overview: About Sample Client A › "Personal details · Check answers" (04).
* The part: the family name box still "SAMPLEDE", with an orange border and, under it: "Please check this answer. It did not match the passport information page copy on file. If it is wrong, change it here. Your case officer settles any difference with you." The input's `aria-describedby` points at that note. The document's value (SAMPLED) is not shown anywhere on the page (05).
* As the officer: "Confirm section" on that section is refused: ""family name" in this section differs from a document (an open check): resolve it first, with a reason. Nothing was confirmed." (06)
* The drawer, now "1 to resolve": "the answer is SAMPLEDE (Client A typed it); the document reads SAMPLED. Which is right?" Keep the document's value / Keep the current answer, "Reason (required)" (07). Save with no reason: "Give a reason for keeping this value." on the box (08). Reason "Client confirmed a typing slip; the passport spelling is right (Sample, qa walk)", Save: toast "Family name … resolved, keeping the document's value."; the row reads "SAMPLED · Used" (09).
* As Client A again: the note is gone, the box reads "SAMPLED" (10).
* Underneath: the answer history is `DECLARED SAMPLEDE (questionnaire, user-P)` then `VERIFIED SAMPLED (document_read, reader mrz, page 1, the document, the check, actor user-O)`; the check reads `resolved | document | <the reason> | user-O`.

## 4. Gate A: the next capability's first step
* Case page › Prepare application › "Open answer sheet: IMM 5257 for Sample Client A" (the online form's sheet, C7.3 / C7.7). "1. Personal details": family name "SAMPLED", given names "CLIENT A", sex "Unspecified", expiry "2035-06-30", number "SAMPLEP12", each with Copy. The typed "SAMPLEDE" is nowhere on the sheet (11).
* **Noted:** the sheet's "Source" column reads "Client" for the family name SAMPLED, a value the officer kept from the passport over the client's answer (the database records `document_read`); the other read values say "Document". See QA-348.

## Not covered
One pass, 1024 px, one case type (Visitor visa), passport only. The letter of invitation (AI vision, replayed) is the pack's (C6.5-19b, -20, green on GitHub); not walked. Upload was by script (the pane cannot pick a file). The client keeping their own spelling (the other branch of the resolve) was not walked; the pack covers it (C6.5-15). Observed, not proven: the browser's accessibility tree names each "Fill this from documents" button by its tooltip ("Reads this person's uploaded documents and proposes values…") and not by its words or its "1 to resolve" badge; axe was not run. The copy stops itself at its 75-minute limit (~19:37 IST).
