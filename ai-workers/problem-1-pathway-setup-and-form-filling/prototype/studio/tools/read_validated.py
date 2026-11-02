"""W1-10 slice 1 C-9 (P-144, P-171 (1)): read a validated copy back into the case. The person filled the copy the
product made, clicked Validate in Adobe and saved it; this reads the saved file with the proven E5 reader
(p1/e5_roundtrip.py read_back, unchanged) and compares every value the product wrote (the copy's .request.json) with
what the saved file holds. Validate adds the barcode and may set computed fields, so other data is reported, never
refused here. QA-165: it also reports the form's own Validate result kept in the file (form_validation); the server
records the copy as validated only when that result passed. The barcode itself is decoded and compared by the M3 tool (evidence-lane/E1/tools/barcode_compare.py),
which needs the decoded barcodes; this slice records that it was not run. Prints one JSON line.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_validated.py <validated.pdf> <copy.pdf> <copy.request.json>
"""
import hashlib
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
import e5_roundtrip as E  # noqa: E402

PASSED = {"Yes", "Oui"}  # the form's own words for its flag after a Validate that passed (its message table, Yes_ENU / Yes_FRA)


def form_validation(pdf_bytes):
    """QA-165 (P-144, P-237): the form's own Validate result as the saved file keeps it. IRCC's IMM 5257, IMM 5257
    Schedule 1 and IMM 1295 set ApplicationValidatedFlag to Yes/Oui and fill DateLastValidated (Year, Month, Day)
    only when Validate finds the form complete, and set No and clear the date otherwise (their validateForm and
    setDateLastValidated scripts, prototype/expected/source-text/*.xfa-template.txt, read 2 Nov 2026). A form that
    keeps no such flag cannot show that Validate passed, so it never counts as validated from the file alone."""
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(pdf_bytes)).items()}
    data = E.data_root(ET.fromstring(parts["datasets"]))
    leaves = dict(E.leaves(data)) if data is not None else {}
    flag = next((v for p, v in leaves.items() if p.split(".")[-1].startswith("ApplicationValidatedFlag[")), None)
    kept = flag is not None or b"ApplicationValidatedFlag" in parts.get("template", b"")
    date = {k: next((v for p, v in leaves.items() if ".DateLastValidated[" in p and p.split(".")[-1].startswith(k + "[")), "") for k in ("Year", "Month", "Day")}
    on = f"{date['Year']}-{date['Month']}-{date['Day']}" if all(date.values()) else None
    return {"kept_by_form": kept, "flag": flag or None, "date_last_validated": on, "passed": kept and (flag or "") in PASSED and on is not None}


def main():
    validated, copy, request = (Path(p) for p in sys.argv[1:4])
    data = validated.read_bytes()
    out = {"sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
    if not data.startswith(b"%PDF"):
        print(json.dumps({**out, "ok": False, "why": "The file is not a PDF."}))
        return
    values = json.loads(request.read_text())["values"]
    try:
        original_parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(copy.read_bytes())).items()}
        rb = E.read_back(data, values, original_parts)
    except Exception as e:  # a file of another form, or one Adobe did not save as an XFA form
        print(json.dumps({**out, "ok": False, "why": f"The file could not be read as this form ({type(e).__name__})."}))
        return
    ok = rb["read_back_equal"] == rb["written"]
    try:
        validation = form_validation(data)
    except Exception as e:  # noqa: BLE001 (read above as this form; a failure here is reported, never taken as passed)
        validation = {"kept_by_form": False, "flag": None, "date_last_validated": None, "passed": False, "error": type(e).__name__}
    print(json.dumps({**out, "ok": ok, "validation": validation, "written": rb["written"], "read_back_equal": rb["read_back_equal"], "mismatches": rb["mismatches"],
                      "other_data_leaves_changed": rb["other_data_leaves_changed"], "barcode_checked": False,
                      "why": None if ok else f"{rb['written'] - rb['read_back_equal']} of the {rb['written']} values the product wrote differ in this file."}))


main()
