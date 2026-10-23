"""Positional check of the IMM 1295 barcodes (P1 revision 3; replaces the value-membership count).

The official template lists, for each of its five barcodes, the exact boxes it encodes, in order
(<manifest name="barcode1"> ... "barcode5", used by the form's own encodeAll()/genValue() scripts: the
barcode text is the caption label, then each listed box's value, each followed by "|"). This script:
  1. reads those five manifests from the official form (hash-checked by the official manifest);
  2. maps each listed box to its data path through the P1 inventory (no guessing; an unknown box fails);
  3. splits each decoded barcode by position and compares slot k with the value Adobe saved in that box;
  4. accounts for every value we wrote: encoded at its own slot, feeding a derived slot by a named form
     rule, cleared by a named form rule, or a deliberately non-encoded control. Anything else fails.
A swapped, missing or shifted position fails even when the same value occurs elsewhere in a barcode.

  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/barcode_positions.py
Writes adobe-test/evidence/imm1295e-v6-barcode-positions.json; exit code 1 on any unexplained item.
"""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import e5_roundtrip as E  # noqa: E402

HERE = Path(__file__).resolve().parent
ADOBE = HERE / "adobe-test"
EVIDENCE = ADOBE / "evidence"
SAVED_PDF = ADOBE / "imm1295e.complete-v6.append-only-encrypted-diagnostic.pdf"  # after Adobe's own save
WRITTEN_PDF = ADOBE / "imm1295e.complete-v6.as-written-before-adobe-save.pdf"
DECODED = EVIDENCE / "imm1295e-v6-barcodes-decoded.jsonl"
VALUES = HERE / "adobe-complete-1295-values.json"
INVENTORY = HERE / "inventory" / "imm1295e.inventory.json"
OUT = EVIDENCE / "imm1295e-v6-barcode-positions.json"
BARCODES = ["barcode1", "barcode2", "barcode3", "barcode4", "barcode5"]

# Form rules that turn written values into other boxes, by form box (SOM). Each is checked, not assumed.
P2 = "form1[0].Page2[0]"
PASSPORT = f"{P2}.MaritalStatus[0].SectionA[0].Passport[0]"
PHONE = f"{P2}.ContactInformation[0].contact[0].PhoneNumbers[0].Phone[0]"
MARRIAGE = "form1[0].Page1[0].MaritalStatus[0].SectionA[0]"
DERIVED = [
    {"rule": "date split into hidden year/month/day boxes (template: validateDateWithHiddenFields on the visible date)",
     "from": [f"{MARRIAGE}.DateOfMarriage[0]"],
     "to": [f"{MARRIAGE}.MarriageDate[0].FromYr[0]", f"{MARRIAGE}.MarriageDate[0].FromMM[0]", f"{MARRIAGE}.MarriageDate[0].FromDD[0]"],
     "make": lambda d: d.split("-")},
    {"rule": "date split into hidden year/month/day boxes (template: IssueDate validate calls validateDateWithHiddenFields(..., IssueYYYY, IssueMM, IssueDD))",
     "from": [f"{PASSPORT}.IssueDate[0].IssueDate[0]"],
     "to": [f"{PASSPORT}.IssueYYYY[0]", f"{PASSPORT}.IssueMM[0]", f"{PASSPORT}.IssueDD[0]"],
     "make": lambda d: d.split("-")},
    {"rule": "date split into hidden year/month/day boxes (template: ExpiryDate validate, hidden expiryYYYY/MM/DD)",
     "from": [f"{PASSPORT}.ExpiryDate[0]"],
     "to": [f"{PASSPORT}.expiryYYYY[0]", f"{PASSPORT}.expiryMM[0]", f"{PASSPORT}.expiryDD[0]"],
     "make": lambda d: d.split("-")},
    {"rule": "full telephone number calculated into the hidden, read-only ActualNumber box (template: phone script on Phone)",
     "from": [f"{PHONE}.NumberCountry[0]", f"{PHONE}.IntlNumber[0].IntlNumber[0]"],
     "to": [f"{PHONE}.ActualNumber[0]"],
     "make": lambda cc, n: ["+" + cc + n]},
]
CLEARED = {
    f"{P2}.MaritalStatus[0].SectionA[0].Languages[0].languages[0].lov[0]":
        "'language most at ease' applies only when ableToCommunicate is 'Both'; otherwise the form's script sets lov.rawValue = null",
}
NOT_ENCODED = {  # box -> (category, reason); each must keep its written value in the saved data
    f"{PHONE}.CanadaUS[0]": ("control_not_encoded", "telephone format switch (Canada/US number boxes): chooses which boxes apply; the number itself is encoded through ActualNumber"),
    f"{PHONE}.Other[0]": ("control_not_encoded", "telephone format switch (other-country number boxes): chooses which boxes apply; the number itself is encoded through ActualNumber"),
    "form1[0].Page1[0].PersonalDetails[0].AliasName[0].AliasNameIndicator[0].AliasNameIndicator[0]":
        ("answer_not_in_manifest", "Question 2 A (other names used?): the form's barcode1-5 manifests list the alias name boxes but not this yes/no answer"),
    "form1[0].Page4[0].Consent0[0].Choice[0]":
        ("answer_not_in_manifest", "Question 6 (ill treatment of prisoners or civilians, looting or desecration): not listed in any of the form's barcode1-5 manifests; the answer stays in the saved form data only"),
}


def local(tag):
    return tag.rsplit("}", 1)[-1]


def sha_file(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def manifests(template_xml):
    """Ordered box lists of barcode1-5 from the template's <manifest> elements."""
    root = ET.fromstring(template_xml)
    out = {}
    for m in root.iter():
        if local(m.tag) == "manifest" and m.get("name") in BARCODES:
            refs = [(r.text or "").strip() for r in m if local(r.tag) == "ref"]
            out[m.get("name")] = [re.sub(r"\.dataNode$", "", re.sub(r"^xfa\[0\]\.form\[0\]\.", "", r)) for r in refs]
    return out


def captions(template_xml):
    root = ET.fromstring(template_xml)
    out = {}
    for f in root.iter():
        if local(f.tag) == "field" and re.fullmatch(r"PaperFormsBarcode[1-5]", f.get("name", "")):
            txt = [t.text for t in f.iter() if local(t.tag) == "text" and t.text]
            out["barcode" + f.get("name")[-1]] = txt[-1] if txt else ""
    return out


def data_values(pdf_path):
    r = E.open_reader(pdf_path.read_bytes())
    ds = ET.fromstring(E.xfa_streams(r)["datasets"].get_object().get_data())
    data = E.data_root(ds)

    def get(path):
        node = E.find_or_make(data, path, create=False)
        return "" if node is None else (node.text or "")
    return get


# Field-specific normalisation, limited to what the Adobe evidence demonstrates (P1 revision 4, answers
# R3-m1): for these month boxes the saved data holds a two-digit month ("04") and the barcode the month
# without its leading zero ("4"). Every other box, identifiers and codes included, is compared literally;
# a new rule needs its own source before it is added here.
MONTH_BOXES = ("DOBMonth[0]", "FromMonth[0]", "ToMonth[0]")
MONTH_RULE = "month box: barcode drops the leading zero of a two-digit month (demonstrated on the Adobe-saved IMM 1295)"


def same(barcode, value, box=""):
    if barcode == value:
        return "exact"
    if (box.endswith(MONTH_BOXES) and re.fullmatch(r"[1-9]", barcode or "") and value == "0" + barcode):
        return "month_leading_zero"
    return None


def split_payload(text, label, n_slots):
    """Barcode text -> list of slot values; refuses a wrong label, count or missing trailing delimiter."""
    parts = text.split("|")
    if parts[0] != label:
        return None, f"label {parts[0]!r} is not {label!r}"
    if parts[-1] != "":
        return None, "no trailing delimiter"
    values = parts[1:-1]
    if len(values) != n_slots:
        return None, f"{len(values)} values for {n_slots} manifest slots"
    return values, None


def compare(slots, payloads, labels, saved):
    """Slot-by-slot comparison. slots: {barcode: [(som, data_path)]}; payloads: {barcode: text}."""
    rows, problems = [], []
    for bc in BARCODES:
        values, err = split_payload(payloads[bc], labels[bc], len(slots[bc]))
        if err:
            problems.append({"barcode": bc, "problem": err})
            continue
        for k, ((som, dp), v) in enumerate(zip(slots[bc], values), start=1):
            s = saved(dp)
            how = same(v, s, som)
            rows.append({"barcode": bc, "position": k, "box": som, "data_path": dp, "barcode_value": v, "saved_value": s, "match": how})
            if how is None:
                problems.append({"barcode": bc, "position": k, "box": som, "barcode_value": v, "saved_value": s, "problem": "position differs"})
    return rows, problems


def account(written, rows, saved):
    """Explains every written value through its own slot, a named derivation, a named clearing rule or a
    named non-encoded control. Uses positions only, never value membership."""
    by_box = {}
    for r in rows:
        by_box.setdefault(r["box"], []).append(r)
    derived_from = {src: d for d in DERIVED for src in d["from"]}
    out, problems = [], []
    for box, v in written.items():
        item = {"box": box, "written": v, "saved": saved(box)}
        if box in CLEARED:
            r = (by_box.get(box) or [{}])[0]
            item.update(category="cleared_by_form_rule", rule=CLEARED[box],
                        at=f"{r.get('barcode')} position {r.get('position')}" if r else "no slot", barcode_value=r.get("barcode_value"))
            if saved(box) != "" or (r and r.get("barcode_value") != ""):
                problems.append({**item, "problem": "declared cleared but a value was saved or encoded"})
        elif box in by_box:
            r = by_box[box][0]
            how = same(r["barcode_value"], v, box)
            item.update(category="entered_encoded", at=f"{r['barcode']} position {r['position']}", barcode_value=r["barcode_value"], match=how)
            if how is None:
                problems.append({**item, "problem": "own slot differs from the written value"})
        elif box in derived_from:
            d = derived_from[box]
            expect = d["make"](*[written.get(s, "") for s in d["from"]])
            got = [(by_box.get(t) or [{}])[0] for t in d["to"]]
            checks = [same(g.get("barcode_value"), e, t) for g, e, t in zip(got, expect, d["to"])]
            item.update(category="entered_derived", rule=d["rule"],
                        into=[f"{g.get('barcode')} position {g.get('position')}: {g.get('barcode_value')}" for g in got], match=checks)
            if None in checks or len(got) != len(expect):
                problems.append({**item, "problem": "derived slot does not equal the rule applied to the written value"})
        elif box in NOT_ENCODED:
            cat, why = NOT_ENCODED[box]
            item.update(category=cat, reason=why)
            if saved(box) != v:
                problems.append({**item, "problem": "non-encoded value not kept in the saved data"})
        else:
            item.update(category="unexplained")
            problems.append({**item, "problem": "written value not in any barcode slot and no rule explains it"})
        out.append(item)
    return out, problems


def load_inputs():
    official = E.official("imm1295e.pdf")
    tpl = E.xfa_streams(E.open_reader(official.read_bytes()))["template"].get_object().get_data()
    inv = json.loads(INVENTORY.read_text())
    som_to_data = {f["som"]: f["data_path"] for f in inv["fields"] if f.get("som")}
    man = manifests(tpl)
    unknown = [s for bc in BARCODES for s in man[bc] if s not in som_to_data or not som_to_data[s]]
    slots = {bc: [(s, som_to_data.get(s) or "") for s in man[bc]] for bc in BARCODES}
    payloads = {}
    for line in DECODED.read_text().splitlines():
        rec = json.loads(line)
        m = re.match(r"imm1295e-v6-barcode-([1-5])\.jpg$", rec["image"])
        if m and rec["results"]:
            payloads["barcode" + m.group(1)] = rec["results"][0]["text"]
    written = json.loads(VALUES.read_text())["values"]
    return official, tpl, slots, unknown, payloads, captions(tpl), written


def main():
    official, tpl, slots, unknown, payloads, labels, written = load_inputs()
    saved = data_values(SAVED_PDF)
    rows, slot_problems = compare(slots, payloads, labels, saved)
    # Box paths in the values file are data paths; the inventory maps SOM->data path one to one here.
    data_to_som = {dp: som for bc in BARCODES for som, dp in slots[bc]}
    inv = json.loads(INVENTORY.read_text())
    data_to_som.update({f["data_path"]: f["som"] for f in inv["fields"] if f.get("data_path")})
    written_by_som = {data_to_som.get(k, k): v for k, v in written.items()}
    saved_by_som = lambda som: saved(next((dp for dp, s in data_to_som.items() if s == som), som))  # noqa: E731
    acct, acct_problems = account(written_by_som, rows, saved_by_som)
    cats = {}
    for a in acct:
        cats[a["category"]] = cats.get(a["category"], 0) + 1
    matches = {}
    for r in rows:
        matches[r["match"] or "differs"] = matches.get(r["match"] or "differs", 0) + 1
    before = data_values(WRITTEN_PDF)
    kept = {"before_adobe_save": sum(before(k) == v for k, v in written.items()), "after_adobe_save": sum(saved(k) == v for k, v in written.items())}
    enc = {}
    for x in acct:
        if x["category"] == "entered_encoded":
            enc[x["match"]] = enc.get(x["match"], 0) + 1
    report = {
        "method": "positional: official barcode1-5 manifests, inventory SOM->data bindings, slot k compared with Adobe-saved data; no value-membership counting",
        "official_form": {"file": "official-sources/ircc/forms/imm1295e.pdf", "sha256": sha_file(official)},
        "inputs_sha256": {p.name: sha_file(p) for p in [SAVED_PDF, WRITTEN_PDF, DECODED, VALUES, INVENTORY]},
        "slots_per_barcode": {bc: len(slots[bc]) for bc in BARCODES},
        "slots_total": sum(len(slots[bc]) for bc in BARCODES),
        "unknown_bindings": unknown,
        "slot_matches": matches,
        "slot_problems": slot_problems,
        "normalisation_rules": {"month_leading_zero": MONTH_RULE, "boxes": list(MONTH_BOXES), "all_other_boxes": "literal comparison"},
        "month_normalisations": [r for r in rows if r["match"] == "month_leading_zero"],
        "written_values": len(written),
        "written_values_in_data": kept,
        "written_accounting": cats,
        "entered_encoded_matches": enc,
        "accounting_problems": acct_problems,
        "accounting": acct,
        "slots": rows,
        "limits": "One Mac, Adobe Acrobat 26.002.22031 free mode, one IMM 1295 data set; barcodes decoded from Adobe page captures. Corroborates the file and barcode mechanism, not IRCC intake.",
    }
    OUT.write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps({k: report[k] for k in ["slots_per_barcode", "slots_total", "unknown_bindings", "slot_matches", "written_values", "written_values_in_data", "written_accounting", "entered_encoded_matches"]}))
    print(json.dumps({"slot_problems": len(slot_problems), "accounting_problems": len(acct_problems)}))
    return 1 if (unknown or slot_problems or acct_problems) else 0


if __name__ == "__main__":
    sys.exit(main())
