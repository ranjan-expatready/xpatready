"""E1: positional barcode check for any IRCC barcode form (generalises p1/barcode_positions.py, which is hard-wired
to the IMM 1295 v6 files). Same method, unchanged: the form's own barcode manifests give the exact fields each
barcode encodes, in order; the inventory binds each to its data path (an unknown binding fails); slot k of each
decoded barcode is compared with the value Adobe saved in that field; every value we wrote is accounted for as
encoded at its own slot, feeding a derived slot by a named form rule, cleared by a named form rule, or a named
non-encoded field. Anything else fails (exit 1). Form-specific rules live in E1/<form>/barcode-rules.json and each
names its evidence in the template.

  .tools/solution-1-prototype/.venv/bin/python -I …/E1/tools/barcode_compare.py <rules.json> <adobe-saved.pdf> \
      <as-written.pdf> <decoded.jsonl> <values.json> <out.json>
  .tools/solution-1-prototype/.venv/bin/python -I …/E1/tools/barcode_compare.py --selftest
      reruns P1's IMM 1295 v6 evidence through this tool and requires P1 revision 3's counts exactly.
"""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROTO = HERE.parents[2]
sys.path.insert(0, str(PROTO / "p1"))
import barcode_positions as B  # noqa: E402  (helpers only: data_values, same, split_payload, local)
import e5_roundtrip as E  # noqa: E402

KINDS = {  # how a derived rule turns the written source values into the derived slots
    "date_split": lambda d: d.split("-"),
    "phone_join": lambda cc, n: ["+" + cc + n],
    "concat": lambda *xs: ["".join(xs)],
}


def sha_file(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def manifests(template_xml, names):
    root = ET.fromstring(template_xml)
    out = {}
    for m in root.iter():
        if B.local(m.tag) == "manifest" and m.get("name") in names:
            refs = [(r.text or "").strip() for r in m if B.local(r.tag) == "ref"]
            out[m.get("name")] = [re.sub(r"\.dataNode$", "", re.sub(r"^xfa\[0\]\.form\[0\]\.", "", r)) for r in refs]
    return out


def run(rules, saved_pdf, written_pdf, decoded, values_file):
    names = rules["manifests"]  # in barcode order 1..n, as the form's encodeAll() pairs them
    official = E.official(rules["form_file"])
    tpl = E.xfa_streams(E.open_reader(official.read_bytes()))["template"].get_object().get_data()
    inv_path = PROTO / rules["inventory"]
    inv = json.loads(inv_path.read_text())
    som_to_data = {f["som"]: f["data_path"] for f in inv["fields"] if f.get("som")}
    man = manifests(tpl, names)
    caps = B.captions(tpl)  # keyed barcode1..barcode5 from PaperFormsBarcodeN
    labels = {n: caps.get(f"barcode{i + 1}", "") for i, n in enumerate(names)}
    unknown = [s for n in names for s in man.get(n, [None]) if s is None or not som_to_data.get(s)]
    slots = {n: [(s, som_to_data.get(s) or "") for s in man.get(n, [])] for n in names}
    payloads = {}
    for line in Path(decoded).read_text().splitlines():
        rec = json.loads(line)
        m = re.search(r"-barcode-([1-9])\.[a-z]+$", rec["image"])
        if m and rec["results"]:
            payloads[names[int(m.group(1)) - 1]] = rec["results"][0]["text"]
    missing = [n for n in names if n not in payloads]
    saved = B.data_values(Path(saved_pdf))
    B.BARCODES = [n for n in names if n in payloads]  # B.compare iterates this list
    rows, slot_problems = B.compare(slots, payloads, labels, saved)
    slot_problems += [{"barcode": n, "problem": "not decoded"} for n in missing]

    written = json.loads(Path(values_file).read_text())["values"]
    data_to_som = {f["data_path"]: f["som"] for f in inv["fields"] if f.get("data_path")}
    w_som = {data_to_som.get(k, k): v for k, v in written.items()}
    saved_som = lambda som: saved(som_to_data.get(som, som))  # noqa: E731
    B.DERIVED = [{**d, "make": KINDS[d["kind"]]} for d in rules.get("derived", [])]
    B.CLEARED = rules.get("cleared", {})
    B.NOT_ENCODED = {k: tuple(v) for k, v in rules.get("not_encoded", {}).items()}
    acct, acct_problems = B.account(w_som, rows, saved_som)
    count = lambda xs: {k: xs.count(k) for k in sorted(set(xs))}  # noqa: E731
    before = B.data_values(Path(written_pdf))
    report = {
        "method": "positional (as p1/barcode_positions.py): the form's own barcode manifests, inventory field->data bindings, slot k compared with the Adobe-saved data",
        "official_form": {"file": f"official-sources/ircc/forms/{rules['form_file']}", "sha256": sha_file(official)},
        "inputs_sha256": {Path(p).name: sha_file(p) for p in [saved_pdf, written_pdf, decoded, values_file, inv_path]},
        "slots_per_barcode": {n: len(slots[n]) for n in names}, "slots_total": sum(len(slots[n]) for n in names),
        "unknown_bindings": unknown, "slot_matches": count([r["match"] or "differs" for r in rows]),
        "slot_problems": slot_problems, "month_normalisations": [r for r in rows if r["match"] == "month_leading_zero"],
        "written_values": len(written),
        "written_values_in_data": {"before_adobe_save": sum(before(k) == v for k, v in written.items()), "after_adobe_save": sum(saved(k) == v for k, v in written.items())},
        "written_accounting": count([a["category"] for a in acct]),
        "entered_encoded_matches": count([a["match"] for a in acct if a["category"] == "entered_encoded"]),
        "accounting_problems": acct_problems, "accounting": acct, "slots": rows,
    }
    return report, bool(unknown or slot_problems or acct_problems)


def selftest():
    """P1's IMM 1295 v6 evidence through this tool; P1 revision 3's counts must come back exactly."""
    a = PROTO / "p1" / "adobe-test"
    rules = json.loads((HERE / "selftest-imm1295-rules.json").read_text())
    rep, bad = run(rules, a / "imm1295e.complete-v6.append-only-encrypted-diagnostic.pdf", a / "imm1295e.complete-v6.as-written-before-adobe-save.pdf",
                   a / "evidence" / "imm1295e-v6-barcodes-decoded.jsonl", PROTO / "p1" / "adobe-complete-1295-values.json")
    p1 = json.loads((a / "evidence" / "imm1295e-v6-barcode-positions.json").read_text())
    keys = ["slots_total", "slot_matches", "written_values", "written_values_in_data", "written_accounting", "entered_encoded_matches"]
    diff = {k: {"p1": p1[k], "here": rep[k]} for k in keys if p1[k] != rep[k]}
    diff.update({"slots": "rows differ"} if [(r["position"], r["box"], r["match"]) for r in p1["slots"]] != [(r["position"], r["box"], r["match"]) for r in rep["slots"]] else {})
    print(json.dumps({"selftest": "PASS" if not diff and not bad else "FAIL", "compared": keys + ["slots"], "differences": diff}))
    return 1 if diff or bad else 0


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        sys.exit(selftest())
    rules_f, saved_f, written_f, decoded_f, values_f, out_f = sys.argv[1:7]
    report, bad = run(json.loads(Path(rules_f).read_text()), saved_f, written_f, decoded_f, values_f)
    Path(out_f).write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n")
    print(json.dumps({k: report[k] for k in ["slots_per_barcode", "slots_total", "unknown_bindings", "slot_matches", "written_values", "written_values_in_data", "written_accounting", "entered_encoded_matches"]}))
    print(json.dumps({"slot_problems": len(report["slot_problems"]), "accounting_problems": len(report["accounting_problems"])}))
    sys.exit(1 if bad else 0)
