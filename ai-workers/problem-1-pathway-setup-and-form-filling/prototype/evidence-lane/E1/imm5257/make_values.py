"""E1 IMM 5257 (09-2023): build values.complete.json for Client A's mother, visiting family in Canada (combination 2,
`expected/combination-2.json`: applies from India, pays her own trip, no background question answered "yes").
Same Sample family as ../imm1344 and ../imm0008 and P1's IMM 5707 (Client A's parents EXAMPLE MOTHER and EXAMPLE
FATHER, married, retired, New Delhi). Every code is from the form's own lists (inventory); every field is checked
against the inventory before writing; values are written in the form's own stored formats (F3).
  .tools/solution-1-prototype/.venv/bin/python -I …/E1/imm5257/make_values.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
MOTHER, CASE = "mother", "case"
PD, MS, CI, DV = ("Page1.PersonalDetails", "Page1.MaritalStatus.SectionA", "Page2.ContactInformation.contact",
                  "Page3.DetailsOfVisit.PurposeRow1")
P2 = "Page2.MaritalStatus.SectionA"

# short SOM (below form1, [0] added to parts without an index) -> (value, fact, person). Codes: inventory options.
ROWS = [
    (f"{PD}.ServiceIn.ServiceIn", "01", "case.service_language (English)", MOTHER),
    (f"{PD}.VisaType.VisaType", "VisitorVisa", "case.visa_requested (Visitor Visa)", CASE),
    (f"{PD}.Name.FamilyName", "EXAMPLE", "person.family_name", MOTHER),
    (f"{PD}.Name.GivenName", "MOTHER", "person.given_names", MOTHER),
    (f"{PD}.AliasName.AliasNameIndicator.AliasNameIndicator", "N", "person.used_other_names", MOTHER),
    (f"{PD}.Sex.Sex", "Female", "person.sex", MOTHER),
    (f"{PD}.DOBYear", "1962", "person.date_of_birth (year; combination-2.json 1962-07-08)", MOTHER),
    (f"{PD}.DOBMonth", "07", "person.date_of_birth (month)", MOTHER),
    (f"{PD}.DOBDay", "08", "person.date_of_birth (day)", MOTHER),
    (f"{PD}.PlaceBirthCity", "NEW DELHI", "person.place_of_birth_city", MOTHER),
    (f"{PD}.PlaceBirthCountry", "205", "person.place_of_birth_country (India)", MOTHER),
    (f"{PD}.Citizenship.Citizenship", "205", "person.citizenship (India)", MOTHER),
    (f"{PD}.CurrentCOR.Row2.Country", "205", "person.country_of_residence (India)", MOTHER),
    (f"{PD}.CurrentCOR.Row2.Status", "01", "person.residence_status (Citizen)", MOTHER),
    (f"{PD}.PCRIndicator", "N", "person.lived_elsewhere_last_5_years", MOTHER),
    (f"{PD}.SameAsCORIndicator", "Y", "case.applying_from_country_of_residence", MOTHER),
    (f"{MS}.MaritalStatus", "01", "person.marital_status (Married; IMM 5707 code 5)", MOTHER),
    (f"{MS}.DateOfMarriage", "1985-11-20", "relationship.date_of_marriage", "mother+father"),
    (f"{MS}.FamilyName", "EXAMPLE", "spouse.family_name", "father"),
    (f"{MS}.GivenName", "FATHER", "spouse.given_names", "father"),
    (f"{P2}.PrevMarriedIndicator", "N", "person.previously_married", MOTHER),
    (f"{P2}.Passport.PassportNum.PassportNum", "Z7654321", "passport.number", MOTHER),
    (f"{P2}.Passport.CountryofIssue.CountryofIssue", "205", "passport.country_of_issue (IND)", MOTHER),
    (f"{P2}.Passport.IssueDate.IssueDate", "2019-05-10", "passport.issue_date", MOTHER),
    (f"{P2}.Passport.ExpiryDate", "2029-05-09", "passport.expiry_date", MOTHER),
    (f"{P2}.Passport.TaiwanPIN", "N", "passport.taiwan_with_personal_id", MOTHER),
    (f"{P2}.Passport.IsraelPassportIndicator", "N", "passport.israeli_national_passport", MOTHER),
    (f"{P2}.Languages.languages.nativeLang.nativeLang", "321", "language.native (Hindi)", MOTHER),
    (f"{P2}.Languages.languages.ableToCommunicate.ableToCommunicate", "English", "language.can_communicate_in", MOTHER),
    (f"{P2}.Languages.LanguageTest", "N", "language.test_taken", MOTHER),
    ("Page2.natID.q1.natIDIndicator", "N", "national_id.has", MOTHER),
    ("Page2.USCard.q1.usCardIndicator", "N", "us_permanent_resident", MOTHER),
    (f"{CI}.AddressRow1.StreetNum.StreetNum", "12", "address.mailing.street_number", MOTHER),
    (f"{CI}.AddressRow1.Streetname.Streetname", "EXAMPLE ROAD", "address.mailing.street_name", MOTHER),
    (f"{CI}.AddressRow2.CityTow.CityTown", "NEW DELHI", "address.mailing.city", MOTHER),
    (f"{CI}.AddressRow2.Country.Country", "205", "address.mailing.country (India)", MOTHER),
    (f"{CI}.AddressRow2.PostalCode.PostalCode", "110001", "address.mailing.postal_code", MOTHER),
    (f"{CI}.SameAsMailingIndicator", "Y", "address.residential_same_as_mailing", MOTHER),
    (f"{CI}.PhoneNumbers.Phone.Type", "02", "phone.type (Cellular)", MOTHER),
    (f"{CI}.PhoneNumbers.Phone.Other", "1", "phone.format (Other: the international box, shown by default)", MOTHER),
    (f"{CI}.PhoneNumbers.Phone.NumberCountry", "91", "phone.country_code (India)", MOTHER),
    (f"{CI}.PhoneNumbers.Phone.IntlNumber.IntlNumber", "9800000001", "phone.number", MOTHER),
    (f"{CI}.FaxEmail.Email", "mother@example.com", "person.email", MOTHER),
    (f"{DV}.PurposeOfVisit.PurposeOfVisit", "08", "visit.purpose (Family Visit)", MOTHER),
    (f"{DV}.HowLongStay.FromDate", "2027-06-01", "visit.from_date", MOTHER),
    (f"{DV}.HowLongStay.ToDate", "2027-08-31", "visit.to_date", MOTHER),
    (f"{DV}.Funds.Funds", "5000", "visit.funds_cad (pays her own trip)", MOTHER),
    ("Page3.DetailsOfVisit.Contacts_Row1.Name.Name", "CLIENTA EXAMPLE", "visit.contact_name (Client A)", "client-a"),
    ("Page3.DetailsOfVisit.Contacts_Row1.RelationshipToMe.RelationshipToMe", "SON", "visit.contact_relationship", MOTHER),
    ("Page3.DetailsOfVisit.Contacts_Row1.AddressInCanada.AddressInCanada", "100 SAMPLE STREET, TORONTO ON M5V 0A1",
     "visit.contact_address (the Sponsor's address on IMM 1344)", "client-a"),
    ("Page3.Education.EducationIndicator", "N", "education.post_secondary", MOTHER),
    ("Page3.Occupation.OccupationRow1.FromYear", "2022", "occupation.current.from_year", MOTHER),
    ("Page3.Occupation.OccupationRow1.FromMonth", "07", "occupation.current.from_month", MOTHER),
    ("Page3.Occupation.OccupationRow1.Occupation.Occupation", "RETIRED", "occupation.current (IMM 5707: Retired)", MOTHER),
    ("Page3.Occupation.OccupationRow1.Employer", "NOT APPLICABLE", "occupation.current.employer", MOTHER),
    ("Page3.Occupation.OccupationRow1.CityTown.CityTown", "NEW DELHI", "occupation.current.city", MOTHER),
    ("Page3.Occupation.OccupationRow1.Country.Country", "205", "occupation.current.country (India)", MOTHER),
    ("Page3.BackgroundInfo.Choice", "N", "background.tb_contact_or_medical_exam", MOTHER),
    ("Page3.BackgroundInfo.Choice[1]", "N", "background.physical_or_mental_disorder", MOTHER),
    ("Page3.BackgroundInfo2.VisaChoice1", "N", "background.overstayed_or_worked_without_permit", MOTHER),
    ("Page3.BackgroundInfo2.VisaChoice2", "N", "background.refused_visa_or_entry", MOTHER),
    ("Page3.BackgroundInfo2.Details.VisaChoice3", "N", "background.previously_applied_to_canada", MOTHER),
    ("Page3.PageWrapper.BackgroundInfo3.Choice", "N", "background.criminal_offence", MOTHER),
    ("Page3.PageWrapper.Military.Choice", "N", "background.military_service", MOTHER),
    ("Page3.PageWrapper.Occupation.Choice", "N", "background.member_of_violent_organisation", MOTHER),
    ("Page3.PageWrapper.GovPosition.Choice", "N", "background.witnessed_ill_treatment", MOTHER),
    ("Page3.Consent1.Signature.Consent0.Choice", "N", "consent.future_research_contact (the person's answer)", MOTHER),
]


def som(short):
    return "form1[0]." + ".".join(p if p.endswith("]") else p + "[0]" for p in short.split("."))


inv = json.loads((HERE / "imm5257e.inventory.json").read_text())
by_som = {f["som"]: f for f in inv["fields"]}
values, facts = {}, {}
for short, value, fact, person in ROWS:
    f = by_som[som(short)]  # KeyError = not a field of this edition
    assert f.get("data_path"), short
    opts = f.get("options_resolved") or f.get("options")
    if opts and f["ui"] != "textEdit" and any(opts):
        # check-box states (one list), [labels row, values row] (two parallel item lists), or [label, value] pairs
        if len(opts) == 1:
            codes = set(opts[0])
        elif len(opts) == 2 and len(opts[0]) > 2:
            codes = set(opts[1])
        else:
            codes = {o[1] for o in opts if len(o) == 2}
        assert value in codes, f"{short}: {value} not in the form's list"
    if f.get("max_chars"):
        assert len(value) <= f["max_chars"], short
    values[f["data_path"]] = value
    facts[f["data_path"]] = {"fact": fact, "person": person}

out = {
    "label": "Sample: made-up facts for testing the IMM 5257 (09-2023) form only; never submit. Immigration values are Sample (immigration expert to confirm). Legal: Unconfirmed: no counsel.",
    "form": "IMM 5257 (09-2023)", "form_file": "imm5257e.pdf", "set": "complete",
    "household": "Client A's mother (EXAMPLE MOTHER, born 1962-07-08 per combination-2.json; citizen of India, New Delhi; married to EXAMPLE FATHER; retired) visits her son Client A in Toronto ON for a family visit, 1 Jun to 31 Aug 2027, paying her own way; no background question answered yes",
    "not_written": "form-calculated fields (checksum, validated flag, date last validated, hidden date parts, full phone number, barcodes) and the typed signature and its date are left to the form and the signer",
    "values": values, "facts": facts,
}
(HERE / "values.complete.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"{len(values)} values written; {sum(1 for f in inv['fields'] if f['required'] and f.get('data_path') in values)} of {sum(1 for f in inv['fields'] if f['required'])} mandatory fields")
