# B150 walk by screens, configured checkpoint, branch code, 07 Nov 16:52 IST

```
PASS  setup: a Visitor visa case with Sample Walk A and an adult spouse (opened by the officer, dates of birth by the officer) — 201
PASS  1. client, the spouse's part after saving says "Answered by the principal for Sample Walk Spouse: declared, it fills Sample Walk Spouse's forms now"
PASS  3. Agent view: the client's own family name reads "WALKFAM · Declared · questionnaire · Client A", never "Counts as confirmed" — "Family name as shown on passport or travel document · WALKFAM · Declared ·  · questionnaire · Client A · 7 Nov, 11:21 · fills IMM 5257 for 2 people, IMM 5257 SCH1 for Sample Walk A, IMM 5475 for Sample Walk A, IMM 5476 for Sample Walk A ·  · Edit"
PASS  3b. Agent view: the spouse's family name reads "Answered by the principal for Sample Walk Spouse" — "Family name as shown on passport or travel document · WALKSPOUSE · Answered by the principal for Sample Walk Spouse ·  · questionnaire · Client A · 7 Nov, 11:21 · fills IMM 5257 for 2 people, IMM 5257 SCH1 for Sample Walk Spouse, IMM 5475 for Sample Walk Spouse, IMM 5476 for Sample Walk Spouse ·  ·
PASS  4. Prepare application: "The forms to file, filled from declared and confirmed answers." and Schedule 1 "Declared or confirmed answers for N of M form fields" — "Declared or confirmed answers for 5 of 40 form fields. A copy also lists the form fields to write by hand."
PASS  5. Generate a copy of IMM 5257 SCH1: generated, written count as the card said — {"card":5,"counts":{"blank":0,"by_hand":0,"written":5,"by_a_person":0,"not_on_form":0,"not_written":35}}
PASS  8a. the edit dialog shows "Now: WALKFAM (Declared: the client's own answer; it fills the forms now)" — "Now: WALKFAM (Declared: the client's own answer; it fills the forms now)."
PASS  8b. the corrected row reads "OFFICERFAM · Entered by staff · to confirm · Agent view · Case officer" — "Family name as shown on passport or travel document · OFFICERFAM · Entered by staff · to confirm ·  · Agent view · Case officer · 7 Nov, 11:22 · fills IMM 5257 for 2 people, IMM 5257 SCH1 for Sample Walk A, IMM 5475 for Sample Walk A, IMM 5476 for Sample Walk A ·  · Edit"
PASS  9a. Schedule 1 still says the same number of declared or confirmed answers (the correction never empties the box) — {"before":5,"after":5}
PASS  9b. the earlier copy reads Out of date
PASS  9c. the new copy writes as many form fields as the first (the family name is written, now OFFICERFAM) — {"first":{"blank":0,"by_hand":0,"written":5,"by_a_person":0,"not_on_form":0,"not_written":35},"second":{"blank":0,"by_hand":0,"written":5,"by_a_person":0,"not_on_form":0,"not_written":35}}
PASS  1024 px: the spouse's rows read "Answered by the principal for Sample Walk Spouse"; the card reads "filled from declared and confirmed answers"; no sideways scroll
case d40a08cc-8b9e-4b1b-ac91-510d2b97a391
```
