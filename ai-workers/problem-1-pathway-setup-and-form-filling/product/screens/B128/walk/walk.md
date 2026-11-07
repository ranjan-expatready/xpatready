# B128 walk (QA-153): the parents on IMM 5645, by screens, 7 Nov 2026

**Commit:** branch `claude/serene-euler-8fnhka` (PR #1256); redone at `aae646f` after review round 1. **Copy:** an isolated copy on its own port, Demo › Reset then Demo › Load the configured checkpoint as the author (release 2 of the Visitor visa). **Money:** live AI off, US$0. **People:** Sample only. Set-up by the API (the pack's helpers): one adult principal "Sample Client W", 40, and `fillEverything` (answers and confirms everything with Sample values, parents included). Then by screens at 1440 px as the case officer, and at 1440 and 390 px as the client.

## The officer (1440 px)
1. The case page's Agent view has a tab for each parent right after the person, named as IMM 5645's boxes name them (review Major 1, round 2): "The representative", "The application", "Sample Client W", "Sample Client W's mother", "Sample Client W's father" (`1-officer-mother-tab-1440.jpg`). Each parent question says it "fills IMM 5645 for Sample Client W".
2. Edit the mother's full name to "Sample Mother W", Save; change each parent's date of birth in the drawer (day, month, year), Save (`2-mother-date-of-birth-saved-1440.jpg`).
3. Before Confirm section, Prepare application says "IMM 5645 for Sample Client W · Checked copy, not for filing · 3 facts to answer or confirm before filing", and Ready to file names them: "3 facts missing or not confirmed (The person's full name, Date of birth, Date of birth)".
4. Confirm section on each parent's sections: IMM 5645 reads "Facts confirmed", "Confirmed answers for 25 of 119 form fields" (qa saw 9 of 119 on main). A parent's answer waiting for it says "Waits for the officer's "Confirm section" (a parent has no link of their own)".
5. Generate a copy: "21 form fields written, 4 by hand · read back and checked", "Not yet: … no fill trial is recorded for edition IMM 5645 (01-2021), so this copy is for checking only, not for filing." The by-hand list names only the application-type tick boxes (visitor, worker, student, other): no parent and no address any more (`3-imm5645-facts-confirmed-copy-1440.jpg`). The copy's own PDF values are read by `tests/runtime/check_b128_parents.ts` (B128-12 to -14): MotherName, MotherDOB, FatherName, FatherDOB as answered, all 16 parent boxes written, the address in one line, "not accompanying" ticked No.
6. Next capability's first step (sign and file, C8.1): the same card lists "Before filing, on the PDF: Sign …" and Validated and Filed stay greyed: unchanged by this row.

## The client (1440 and 390 px)
7. The questionnaire's overview has "About Sample Client W's mother" and "About Sample Client W's father" after the principal, and its first line says "You answer for everyone travelling on this application, and for the parents its forms ask about." (`4-client-overview-parents-1440.jpg`).
8. A parent's part says "Answering for Sample Client W's mother (a parent, not on this application)." (never "(you)"; `5-client-parent-part-390.jpg`). No sideways scroll at 390 or 1440 px. No page errors.

## Seen, not changed here
* Release 2's sections put a parent's questions under the titles the release gives the facts: "Personal details", "Applicant" (occupation), "Statutory declaration of common-law union" (full name), and "Your parent 1 (mother or father)" (address and accompanying), also on the second parent's tab. Those titles are configuration (the checkpoint's sections-from-forms step); the PR asks the tech lead.
* The question words are the library's meanings ("The person's current occupation."): release 2 has no question text for these facts.
