# C3.12 K3: which date is "Published" (QA-148), recorded for the tech lead

**What qa asked (QA-148, Conflict).** On main, the Forms list's "Published" date was the PDF file's own save date: its ModDate, else its CreationDate (#313). For example, IMM 1295 (09-2023) showed "Published 2026-06-04". The C3.12 acceptance pack's AT-3 wants IRCC's date: canada.ca's "Last updated" month, else the edition date printed on the form, never the file's own date.

**What this row does.** "Published" is now IRCC's month for the edition (AGENTS rule 4: an immigration value comes from an official source). The PDF's own date is kept and shown apart in the drawer: "File saved …: the PDF's own date, not when IRCC published it". Nothing from #313 is deleted. The column `form_edition.published` still holds the file's date, so the change can be reversed.

**One difference from the pack's wording: the printed month comes first, and canada.ca's month is used only when the label prints none.**
* **Why:** it is the library's existing rule (`engine/library-index.ts` `fileMonth`, review 6bc5eb72 M): "a page edit must never make an old file read as new". A canada.ca page is edited for many reasons, and the month printed on the form belongs to the file itself.
* **Evidence (reviewer, 2 Nov):** on all 24 of the 30 recorded IRCC PDFs that have both a printed month and a canada.ca "Last updated" month, the two months are the same. So the order changes no result on today's official copies, and AT-3 passes 17/17.
* **Edge cases:**
  * A label whose printed date is not a real month (for example 13-2024) says "Its printed edition date is not a real month". It never borrows the page's month, which may belong to another file (break m3).
  * A guide never claims an IRCC published month (break M1).

**Recommendation:** keep the printed month first, as the one rule. The tech lead then aligns the pack's comment (`acceptance/C3.12.test.ts` lines 5–7 and 75) and closes QA-148. If the tech lead wants the page's month first instead, it is a one-line change in `engine/published-date.ts` `ircPublished`.
