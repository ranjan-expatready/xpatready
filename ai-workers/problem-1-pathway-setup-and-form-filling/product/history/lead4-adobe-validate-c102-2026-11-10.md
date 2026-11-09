# Adobe Validate, C10.2 / C7.3 — Lead 4 (series 2), 10 Nov 00:06 IST

File: /tmp/claude-501/validate/imm5257-paper-c102-fresh.pdf (fresh story on an isolated copy of main 7e32ee210, "Child 18 or over (Sample)"; Q7 Other/From/To now empty, so #1435's fix holds).

Result: **Validate FAILS** in Acrobat (form's own Validate button):
1. "You entered information that is not required, please review"
2. "-Contact Information- The following field must contain a value: 4. Alternate Telephone no. (Canada/US or Other)"

Cause (from the decoded XFA datasets):
- fresh copy: AltPhone Type=01, CanadaUS=1, Other=0, NumberCountry=1, no number (NANumber and IntlNumber empty)
- blank official imm5257e.pdf and imm5257_1e.pdf: AltPhone Type empty, CanadaUS 0, Other 0, NumberCountry empty
- last copy that passed Validate (~/Downloads/IMM5257-validated-9a836fe2.pdf): AltPhone empty as blank
- the pre-#1435 copy (imm5257-paper-c102.pdf) had the same AltPhone values, so this is not new from #1435
- demo story sets no alternate phone (no alternate_telephone/alt_phone in api/ or samples/)
So the generator writes the alternate phone's type, Canada/US and country code with no number. Fix: write none of AltPhone's boxes unless an alternate number is recorded (the same for any phone block with no number). Owner: forms (C7.2 filler); needs a qa bug row (Major: blocks Adobe Validate for C10.2/C7.3).

Decoder: /tmp/claude-501/validate/work/dec2.py <pdf> <out.pkl>; datasets in fresh-ds.xml.
Nothing saved in Acrobat (Validate failed).
