"""E1 IMM 0008 (05-2026): build values.complete.json for Client A, the principal applicant of the spousal sponsorship
whose IMM 1344 is in ../imm1344 (same Sample household). Every code is taken from the form's own lists (inventory
or the form's LOV data, named below); every field is checked against the inventory before writing. Values are
written in the form's own stored formats (finding F3).
  .tools/solution-1-prototype/.venv/bin/python -I …/E1/imm0008/make_values.py
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[2] / "p1"))
import e5_roundtrip as E  # noqa: E402
P = "form1[0].Page1[0]."
CLIENT_A, CASE = "client-a", "case"

# short SOM (below form1.Page1, [0] omitted) -> (value, fact, person). Codes: inventory options unless stated.
ROWS = [
    ("genDetails.q1.Program", "01", "case.program (Family)", CASE),
    ("genDetails.q1.Category", "01", "case.category (Spouse; LOV ApplyingCategoryList.Family)", CASE),
    ("genDetails.q3.NumberOfApps", "1", "case.family_members_applying (Client A only)", CASE),
    ("genDetails.q5.CorrespondenceLang", "01", "case.correspondence_language (English)", CLIENT_A),
    ("genDetails.q5.InterviewLang", "001", "case.interview_language (English)", CLIENT_A),
    ("genDetails.q5.InterpreterRequested", "N", "case.interpreter_requested", CLIENT_A),
    ("genDetails.q6.Prov", "06", "case.intended_province (ON)", CLIENT_A),
    ("genDetails.q6.CityTown", "3812", "case.intended_city (Toronto; LOV CityList.ON)", CLIENT_A),
    ("PersonalDetails.q1.FamilyName", "EXAMPLE", "person.family_name", CLIENT_A),
    ("PersonalDetails.q1.GivenName", "CLIENTA", "person.given_names", CLIENT_A),
    ("PersonalDetails.q2.AliasName.AliasNameIndicator.AliasNameIndicator", "N", "person.used_other_names", CLIENT_A),
    ("PersonalDetails.q3-4-5-6.Sex.Sex", "Male", "person.sex", CLIENT_A),
    ("PersonalDetails.q3-4-5-6.heightCM", "175", "person.height_cm", CLIENT_A),
    ("PersonalDetails.q3-4-5-6.eyeColor.eyeColor", "03", "person.eye_colour (Brown)", CLIENT_A),
    ("PersonalDetails.q7-8.DOB.DOBYYYY", "1990", "person.date_of_birth (year)", CLIENT_A),
    ("PersonalDetails.q7-8.DOB.DOBMM", "04", "person.date_of_birth (month)", CLIENT_A),
    ("PersonalDetails.q7-8.DOB.DOBDD", "12", "person.date_of_birth (day)", CLIENT_A),
    ("PersonalDetails.q7-8.PlaceBirthCity", "NEW DELHI", "person.place_of_birth_city", CLIENT_A),
    ("PersonalDetails.q7-8.PlaceBirthCountry", "205", "person.place_of_birth_country (India)", CLIENT_A),
    ("PersonalDetails.q9.Citizenship1", "205", "person.citizenship (India)", CLIENT_A),
    ("PersonalDetails.q10.CurrentCOR.Row2.Country", "205", "person.country_of_residence (India)", CLIENT_A),
    ("PersonalDetails.q10.CurrentCOR.Row2.Status", "01", "person.residence_status (Citizen)", CLIENT_A),
    ("PersonalDetails.q13.PCRIndicator", "N", "person.lived_elsewhere_last_5_years", CLIENT_A),
    ("PersonalDetails.q14.MaritalStatus.MaritalStatus", "01", "person.marital_status (Married)", CLIENT_A),
    ("PersonalDetails.q14.MaritalStatus.DateOfMarriage", "2019-03-15", "relationship.date_of_marriage", "sponsor+client-a"),
    ("PersonalDetails.q14.MaritalStatus.FamilyName", "EXAMPLE", "spouse.family_name", "sponsor"),
    ("PersonalDetails.q14.MaritalStatus.GivenName", "SPONSOR", "spouse.given_names", "sponsor"),
    ("PersonalDetails.q15.PrevMarriedIndicator", "N", "person.previously_married", CLIENT_A),
    ("contactInformation.q1.AddressRow1.StreetNum.StreetNum", "12", "address.mailing.street_number", CLIENT_A),
    ("contactInformation.q1.AddressRow1.Streetname.Streetname", "EXAMPLE ROAD", "address.mailing.street_name", CLIENT_A),
    ("contactInformation.q1.AddressRow2.CityTown.CityTown", "NEW DELHI", "address.mailing.city", CLIENT_A),
    ("contactInformation.q1.AddressRow2.Country.Country", "205", "address.mailing.country (India)", CLIENT_A),
    ("contactInformation.q1.AddressRow2.PostalCode.PostalCode", "110001", "address.mailing.postal_code", CLIENT_A),
    ("contactInformation.q2.SameAsMailingIndicator", "Y", "address.residential_same_as_mailing", CLIENT_A),
    ("contactInformation.q3-4.Phone.Type", "02", "phone.type (Cellular)", CLIENT_A),
    ("contactInformation.q3-4.Phone.Other", "1", "phone.format (Other: the international box, shown by default)", CLIENT_A),
    ("contactInformation.q3-4.Phone.NumberCountry", "91", "phone.country_code (India)", CLIENT_A),
    ("contactInformation.q3-4.Phone.IntlNumber.IntlNumber", "9800000000", "phone.number", CLIENT_A),
    ("contactInformation.q5-6.Email", "client.a@example.com", "person.email", CLIENT_A),
    ("passport.Passport.passportValidInd", "Y", "passport.has_valid", CLIENT_A),
    ("passport.Passport.PassportNum.PassportNum", "Z1234567", "passport.number", CLIENT_A),
    ("passport.Passport.CountryofIssue.CountryofIssue", "205", "passport.country_of_issue (IND)", CLIENT_A),
    ("passport.Passport.IssueDate.IssueDate", "2020-01-15", "passport.issue_date", CLIENT_A),
    ("passport.Passport.ExpiryDate", "2030-01-14", "passport.expiry_date", CLIENT_A),
    ("passport.Passport.TaiwanPIN", "N", "passport.taiwan_with_personal_id", CLIENT_A),
    ("passport.Passport.IsraelPassportIndicator", "N", "passport.israeli_national_passport", CLIENT_A),
    ("natID.q1.natIDIndicator", "N", "national_id.has", CLIENT_A),
    ("uslpr.q1.uslprIndicator", "N", "us_permanent_resident", CLIENT_A),
    ("educationOccupation.EduOccupation.Education.levelEdu.levelEdu", "05", "education.highest_level (Bachelor's)", CLIENT_A),
    ("educationOccupation.EduOccupation.yearsOfEdu", "16", "education.years_total", CLIENT_A),
    ("educationOccupation.EduOccupation.currentOccupation", "SOFTWARE DEVELOPER", "occupation.current", CLIENT_A),
    ("educationOccupation.EduOccupation.intendedOccupation", "SOFTWARE DEVELOPER", "occupation.intended", CLIENT_A),
    ("languageDetails.Languages.languages.nativeLang.nativeLang", "321", "language.native (Hindi)", CLIENT_A),
    ("languageDetails.Languages.languages.communicateLang.communicateLang", "English", "language.can_communicate_in", CLIENT_A),
    ("languageDetails.Languages.langTest.LangTestIndicator", "N", "language.test_taken", CLIENT_A),
]


# lists a script fills from the form's own LOV data (Program -> Category, Province -> City): checked there instead
LOV = {"genDetails.q1.Category": "ApplyingCategoryList/Family/ApplyingCategory",
       "genDetails.q6.CityTown": "CityList/ON/City"}


def lov_codes(path):
    ds = E.xfa_streams(E.open_reader(E.official("imm0008e.pdf").read_bytes()))["datasets"].get_object().get_data()
    root = ET.fromstring(ds)
    lov = next(e for e in root.iter() if e.tag.split("}")[-1] == "LOV")
    return {e.get("lic"): e.text for e in lov.findall(path)}


def som(short):
    return P + ".".join(part + "[0]" for part in short.split("."))


inv = json.loads((HERE / "imm0008e.inventory.json").read_text())
by_som = {f["som"]: f for f in inv["fields"]}
values, facts = {}, {}
for short, value, fact, person in ROWS:
    f = by_som[som(short)]  # KeyError = not a field of this edition
    assert f.get("data_path"), short
    opts = f.get("options_resolved") or f.get("options")
    if short in LOV:
        codes = lov_codes(LOV[short])
        assert value in codes, f"{short}: {value} not in the form's {LOV[short]}"
        fact = f"{fact} = {codes[value]}"
    elif opts and f["ui"] != "textEdit" and any(opts):
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
    "label": "Sample: made-up facts for testing the IMM 0008 (05-2026) form only; never submit. Immigration values are Sample (immigration expert to confirm). Legal: Unconfirmed: no counsel.",
    "form": "IMM 0008 (05-2026)", "form_file": "imm0008e.pdf", "set": "complete",
    "household": "Client A (citizen of India, living in New Delhi), principal applicant, sponsored by the Sponsor (spouse, Canadian citizen, Toronto ON; IMM 1344 in ../imm1344); married 15 Mar 2019; intends to live in Toronto ON; no dependants",
    "not_written": "the sponsor is not a dependant of the principal applicant, so the spouse block (depPrime) and the dependant rows are left empty (Sample: immigration expert to confirm); form-calculated fields (checksum, validated flags, date last validated, full phone number, barcodes) and the consent and typed signature are left to the form and the signer",
    "values": values, "facts": facts,
}
(HERE / "values.complete.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"{len(values)} values written; {sum(1 for f in inv['fields'] if f['required'] and f.get('data_path') in values)} of {sum(1 for f in inv['fields'] if f['required'])} mandatory fields")
