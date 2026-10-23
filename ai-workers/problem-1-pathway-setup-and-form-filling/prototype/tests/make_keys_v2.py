"""Builds the corrected answer keys (v2) from the original keys (v1), which are never edited.

    .tools/solution-1-prototype/.venv/bin/python -I tests/make_keys_v2.py          write expected/*.v2.json
    .tools/solution-1-prototype/.venv/bin/python -I tests/make_keys_v2.py --check  rebuild in memory, compare, verify quotes

Every change is listed in the file's `changes` with its reason, the reviewer's acceptance and an official
citation; each quoted passage is checked against the hash-verified official file (a PDF's raw XFA template,
scripts kept, or a web page's visible text) before anything is written. Prepared after the P2 live runs, so
these corrections are evaluation corrections, recorded separately from model output and repairs (P2-M1).
Label: Lead-verified from official sources (prototype only); not specialist-confirmed. Legal: Unconfirmed: no
counsel (AIW-D94). Changes need the independent reviewer's check (expected/README.md rule 3).
"""
import copy
import hashlib
import html
import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

P = Path(__file__).resolve().parent.parent
OFFICIAL = P.parent / "official-sources" / "ircc"
LABEL = "Lead-verified from official sources (prototype only); not specialist-confirmed"
MANIFEST = {i["path"]: i["sha256"] for i in json.loads((OFFICIAL / "manifest.json").read_text())["items"]}


def official_text(path: str) -> str:
    f = OFFICIAL / path
    b = f.read_bytes()
    if hashlib.sha256(b).hexdigest() != MANIFEST[path]:
        raise SystemExit(f"{path}: hash differs from the official manifest")
    if path.endswith(".pdf"):
        r = PdfReader(str(f))
        if r.is_encrypted:
            r.decrypt("")
        x = r.trailer["/Root"]["/AcroForm"]["/XFA"]
        parts = {str(x[i]): x[i + 1].get_object().get_data() for i in range(0, len(x), 2)}
        return html.unescape(parts["template"].decode("utf8", "replace"))
    t = b.decode("utf8")
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t)))


def cite(path: str, where: str, *passages: str) -> dict:
    text = re.sub(r"\s+", " ", official_text(path))
    for p in passages:
        if re.sub(r"\s+", " ", p) not in text:
            raise SystemExit(f"quote not found in {path}: {p!r}")
    return {"file": f"official-sources/ircc/{path}", "sha256": MANIFEST[path], "where": where, "passages": list(passages)}


def expect_for(rule: str) -> dict:
    """The exact transformation each v1 rule states, as a structured expectation (P2-M1)."""
    pairs = lambda s: {a.strip().lower(): b.strip() for a, b in re.findall(r"([A-Za-z][A-Za-z -]*?)=([0-9]+)", s)}
    if re.search(r"no code list|free text", rule, re.I):
        return {"kind": "country_name_text"}
    if rule.startswith("IMM 5707 code list") or rule.startswith("IMM 5707 child code list") or rule.startswith("IMM 1295 LOV code"):
        return {"kind": "code_list", "codes": pairs(rule.split("(see")[0].split("(Conjugal")[0])}
    if rule.startswith("yes_no_code"):
        return {"kind": "yes_no_code", "codes": {"yes": "1", "no": "2"}}
    if rule == "YYYY-MM-DD":
        return {"kind": "date", "format": "YYYY-MM-DD"}
    if rule == "single text line":
        return {"kind": "address_single_line"}
    if rule.startswith('"I do not have any children"'):
        return {"kind": "derived_no_children", "on": "1"}
    if rule in ("as on passport", "text") or rule.startswith("the current partner's name"):
        return {"kind": "text_as_is"}
    if re.match(r"(year|month|day) part", rule):
        return {"kind": "date_part", "part": rule.split(" ")[0]}
    if "unresolved" in rule:
        return {"kind": "none"}
    raise SystemExit(f"no exact expectation for rule {rule!r}")


def build():
    v1 = json.loads((P / "expected" / "slice-1-field-map.json").read_text())
    c1 = json.loads((P / "expected" / "combination-1.json").read_text())
    v1_sha = hashlib.sha256((P / "expected" / "slice-1-field-map.json").read_bytes()).hexdigest()
    c1_sha = hashlib.sha256((P / "expected" / "combination-1.json").read_bytes()).hexdigest()

    # ---- Field-map key v2
    k = copy.deepcopy(v1)
    k["schema"] = "expected-field-map/v2"
    k["label"] = LABEL
    k["supersedes"] = {"file": "prototype/expected/slice-1-field-map.json", "sha256": v1_sha, "kept": "unchanged; original results are scored against it"}
    k["prepared"] = "2026-10-20, Claude Code (the Lead), after the P2 live runs: evaluation corrections accepted by the reviewer (Codex 08:23:05Z), never derived from model output"
    for inst in k["instances"]:
        for e in inst["entries"]:
            e["expect"] = expect_for(e["rule"])
    d11 = cite("forms/imm1295e.pdf", "IMM 1295 (09-2023) raw XFA template: field DateOfMarriage (picture, exit script) and the MarriageDate subform",
               'name="DateOfMarriage"', "<picture >date{YYYY-MM-DD}</picture >",
               "val.validateDateWithHiddenFields(this, \"<=\", utilDates.getToday(), MarriageDate.FromYr, MarriageDate.FromMM, MarriageDate.FromDD);",
               '<field presence="invisible" h="3.49mm" name="FromYr"')
    imm1295 = next(i for i in k["instances"] if i["form"] == "IMM 1295")
    before = copy.deepcopy(imm1295["entries"])
    hidden = [e for e in imm1295["entries"] if ".MarriageDate[0].From" in e["data_path"]]
    for e in hidden:
        e.update({"expected_outcome": "not_a_fact", "form_calculated": True, "expect": {"kind": "form_calculated"},
                  "rule": f"form-calculated: the form's exit script on DateOfMarriage splits the visible date into this invisible helper ({e['rule']}); never written by the filler"})
    visible = {"data_path": "form1[0].Page1[0].MaritalStatus[0].SectionA[0].DateOfMarriage[0]", "person": "relationship:client-a+partner",
               "fact": "relationship.start_date", "rule": "YYYY-MM-DD (the visible date input; one shared relationship fact)",
               "expect": {"kind": "date", "format": "YYYY-MM-DD"}, "owner": "relationship",
               "ownership": "One relationship fact of the couple, the same from either form subject; not a personal value of Client A or the partner"}
    imm1295["entries"].insert(next(n for n, e in enumerate(imm1295["entries"]) if e in hidden), visible)
    changes = [{"id": "D11", "accepted_by": "independent reviewer, Codex 08:23:05Z (D11 Accept, relationship ownership explicit)",
                "reason": "The visible input is DateOfMarriage (a YYYY-MM-DD date field); its exit script fills the three invisible MarriageDate helper boxes. v1 keyed the helpers as the written boxes.",
                "before": before, "after": copy.deepcopy(imm1295["entries"]), "citation": d11}]
    k["changes"] = changes
    k["slice"] = v1["slice"] + " (v2: the IMM 1295 marital block keys the visible date input; the three helpers are form-calculated, kept for coverage)"

    # ---- Combination-1 key v2
    c = copy.deepcopy(c1)
    c["schema"] = c1.get("schema", "") + " (v2)"
    c["label"] = LABEL
    c["supersedes"] = {"file": "prototype/expected/combination-1.json", "sha256": c1_sha, "kept": "unchanged"}
    d20 = cite("web-pages/page-imm1295.html", "canada.ca IMM 1295 form page, 'Who must fill out this application form?'",
               "Each person who needs a work permit must fill out this form.")
    d20b = cite("instructions/guide-5487.html", "Guide 5487, 'Do I have to apply separately for my family members?'",
                "Family members must complete their own application forms.")
    c["scenario"]["applications"] = [
        {"person": "client-a", "application": "work permit, outside Canada", "uses_form": "IMM 1295"},
        {"person": "partner", "application": "work permit, outside Canada", "uses_form": "IMM 1295"},
        {"person": "child", "application": "Not in this demonstration (scenario setting unchanged)", "uses_form": None},
    ]
    d19 = cite("checklists/imm5488e.pdf", "IMM 5488 (10-2024) XFA template, forms list",
               "Must be completed by those aged 18 years or older or a minor travelling alone to Canada.")
    c["scenario"]["travel"] = {"client-a": {"travelling_alone_to_canada": False}, "partner": {"travelling_alone_to_canada": False},
                               "child": {"travelling_alone_to_canada": False, "note": "accompanied by both parents (synthetic scenario setting)"}}
    f5707 = next(f for f in c["expected_forms"] if f["form"] == "IMM 5707")
    f5707_before = copy.deepcopy(f5707)
    f5707["per"] = "each person aged 18 or older, or a minor travelling alone to Canada"
    f5707["condition"] = "age 18 or older OR (under 18 AND travelling alone to Canada)"
    f5707["cases"] = [
        {"case": "adult (36)", "age_on_reference": 36, "travelling_alone": False, "expected": True},
        {"case": "18 exactly on the reference date", "date_of_birth": "2008-10-20", "travelling_alone": False, "expected": True},
        {"case": "one day short of 18, accompanied", "date_of_birth": "2008-10-21", "travelling_alone": False, "expected": False},
        {"case": "minor (9) travelling alone", "date_of_birth": "2017-01-20", "travelling_alone": True, "expected": True},
        {"case": "minor (9) not travelling alone (the scenario's child)", "date_of_birth": "2017-01-20", "travelling_alone": False, "expected": False},
        {"case": "minor (9), travel answer missing", "date_of_birth": "2017-01-20", "travelling_alone": None, "expected": "cannot_tell"},
        {"case": "adult (36), travel answer missing", "date_of_birth": "1990-04-12", "travelling_alone": None, "expected": True},
        {"case": "date of birth missing", "date_of_birth": None, "travelling_alone": False, "expected": "cannot_tell"},
    ]
    f1295 = next(f for f in c["expected_forms"] if f["form"] == "IMM 1295")
    f1295_before = copy.deepcopy(f1295)
    f1295["per"] = "each person applying for a work permit from outside Canada"
    f1295["applies_to_from"] = "scenario.applications (the case names who applies for which application type)"
    c["changes"] = [
        {"id": "D19", "accepted_by": "independent reviewer, Codex 08:23:05Z (D19 Accept)",
         "reason": "IMM 5707 also applies to a minor travelling alone; v1 keyed the age rule only. Adds an explicit accompanied/not-alone setting and the minor-alone, minor-not-alone, missing-answer and 18th-birthday cases.",
         "before": f5707_before, "after": copy.deepcopy(f5707), "citation": d19},
        {"id": "D20", "accepted_by": "independent reviewer, Codex 08:23:05Z (P2-M3 Material)",
         "reason": "IMM 1295 is completed by each person applying for the work permit from outside Canada; the scenario now names who applies for which application type (Client A and the partner). Not 'principal only', and not every relative regardless of application type.",
         "before": f1295_before, "after": copy.deepcopy(f1295), "citation": [d20, d20b]},
    ]
    return k, c


def dump(o) -> str:
    return json.dumps(o, indent=1, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    k, c = build()
    outs = {P / "expected" / "slice-1-field-map.v2.json": dump(k), P / "expected" / "combination-1.v2.json": dump(c)}
    if "--check" in sys.argv:
        bad = [str(f.name) for f, s in outs.items() if not f.exists() or f.read_text() != s]
        print("PASS  v2 keys rebuild identically; every quoted passage found in its hash-verified official file" if not bad else f"FAIL  differs: {bad}")
        sys.exit(1 if bad else 0)
    for f, s in outs.items():
        f.write_text(s)
        print(f"wrote {f.relative_to(P)}  sha256 {hashlib.sha256(s.encode()).hexdigest()}")
