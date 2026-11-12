# Portal screen fixtures (Sample · Scaffolding, P-33)

Written by the forms lane for F1 slice 1. They look like blank screens of an online visitor visa application saved with
"Save page as", but **they are not real IRCC screens**: no blank screen from a real representative account exists yet
(founder question 3 of the F1 challenge). Labels follow IRCC's public descriptions of IMM 5257, with deliberate
differences from the PDF so that twin reuse is tested, not assumed: reworded labels ("City or town" vs "City/Town"), a
date in three form fields, option codes that differ from the PDF's, one question the PDF does not have and several PDF
questions the screens do not show. The demo claims no reuse rate from them.

| File | Tests |
|---|---|
| `imm5257-online-s1-personal.html`, `-s2-marital`, `-s3-language` | reader, twin reuse, three-part date, option codes |
| `imm5257-online-s1-personal-resaved.html` | same screen saved again (new session token, script and time): same fingerprint |
| `imm5257-online-s1-personal-reworded.html` | "Surname" instead of "Family name", one added option: new fingerprint, held with its difference |
| `imm5257-online-s1-personal-with-answers.html` | a typed name and a chosen option: refused, nothing kept |
| `template-with-answers.csv` | a template with an answer column: refused |
| `imm5257-online-s4-spouse.html` | a spouse screen reusing the applicant's element ids: ids qualified by the screen; never the applicant's form fields (CHECK fixes) |
| `hostile-*.html` | answers outside value attributes (an editable area, a ticked custom control, a label, an option label, the title) and an unreadable custom control: refused or not read (CHECK fixes) |
| `blank-placeholder-selected.html` | a selected "Please select…" placeholder and a form named "research-programme": a blank screen, read in full |
| `intake-one-question-answered.html` | a saved portal screen with one answered question: refused by the intake |
