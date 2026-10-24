"""E1 IMM 5409 (01-2023): build values.complete.json for the statutory declaration of common-law union of Client A
and EXAMPLEP PARTNER (combination 1, as on IMM 1295 and IMM 5707 in P1: common-law since 2015-06-01, New Delhi).
Every field and every code is checked against P1's inventory of this edition. The signatures and the part completed
by the person who administers the declaration (place, title, date, signature) are left empty: they are done on paper
at the oath.
  python3 -I …/E1/imm5409/make_values.py
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
INV = HERE.parents[2] / "p1" / "inventory" / "imm5409e.inventory.json"
A, PTN, BOTH = "client-a", "partner", "client-a+partner"
I, S = "Page1.Info", "Page1"

ROWS = [
    (f"{I}.Jurisdiction.Country", "India", "declaration.made_in_country", BOTH),
    (f"{I}.Jurisdiction.Province", "Delhi", "declaration.made_in_province_state", BOTH),
    (f"{I}.FirstName", "CLIENTA EXAMPLE", "declarant.full_name (passport order: given, family)", A),
    (f"{I}.SecondName", "PARTNER EXAMPLEP", "partner.full_name", PTN),
    (f"{I}.City", "NEW DELHI", "couple.city", BOTH),
    (f"{I}.Province", "DELHI", "couple.province_state", BOTH),
    (f"{I}.Country", "INDIA", "couple.country", BOTH),
    (f"{I}.YearsTogether", "11", "relationship.continuous_years (2015-06-01 to 2026-10-24)", BOTH),
    (f"{I}.startDate", "2015-06-01", "relationship.common_law_since (IMM 1295 in P1)", BOTH),
    (f"{I}.endDate", "2026-10-24", "relationship.to_date (date of the declaration)", BOTH),
    (f"{S}.Section1.Options.Sec.yesno", "1", "evidence.joint_lease_or_mortgage (Yes)", BOTH),
    (f"{S}.Section1.Options.Sec[1].yesno", "2", "evidence.joint_other_property (No)", BOTH),
    (f"{S}.Section1.Options.Sec[2].yesno", "1", "evidence.joint_bank_or_credit_accounts (Yes)", BOTH),
    (f"{S}.Section1.Options.Sec[3].yesno", "2", "evidence.declared_union_under_canadian_income_tax (No)", BOTH),
    (f"{S}.Section2.yesno", "2", "evidence.my_life_insurance_names_partner (No)", A),
    (f"{S}.Section3.yesno", "2", "evidence.partner_life_insurance_names_me (No)", PTN),
    (f"{S}.Section5.NameDecl", "CLIENTA EXAMPLE", "declarant.full_name", A),
    (f"{S}.Section5.NamePartner", "PARTNER EXAMPLEP", "partner.full_name", PTN),
]


def som(short):
    return "IMM_5409[0]." + ".".join(p if p.endswith("]") else p + "[0]" for p in short.split("."))


inv = json.loads(INV.read_text())
by_som = {f["som"]: f for f in inv["fields"]}
values, facts = {}, {}
for short, value, fact, person in ROWS:
    f = by_som[som(short)]  # KeyError = not a field of this edition
    assert f.get("data_path"), short
    opts = f.get("options_resolved") or f.get("options")
    if opts and f["ui"] != "textEdit" and any(opts):
        codes = {o[1] for o in opts if len(o) == 2}
        assert value in codes, f"{short}: {value} not in the form's list"
    if f.get("max_chars"):
        assert len(value) <= f["max_chars"], short
    values[f["data_path"]] = value
    facts[f["data_path"]] = {"fact": fact, "person": person}

out = {
    "label": "Sample: made-up facts for testing the IMM 5409 (01-2023) form only; never submit. Immigration values are Sample (immigration expert to confirm). Legal: Unconfirmed: no counsel.",
    "form": "IMM 5409 (01-2023)", "form_file": "imm5409e.pdf", "set": "complete",
    "household": "combination 1 (P1): Client A and common-law partner EXAMPLEP PARTNER, living together in New Delhi since 2015-06-01 (IMM 1295 and IMM 5707 Sample values)",
    "not_written": "both declarants' signatures and everything completed by the person who administers the declaration (place declared, title, date, their name and signature) are done on paper at the oath; section 4 (other documents) is empty because sections 1 to 3 apply",
    "values": values, "facts": facts,
}
(HERE / "values.complete.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(f"{len(values)} values written")
