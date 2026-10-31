"""W1-10 slice 1 C-9 (P-144, P-171 (1)): read a validated copy back into the case. The person filled the copy the
product made, clicked Validate in Adobe and saved it; this reads the saved file with the proven E5 reader
(p1/e5_roundtrip.py read_back, unchanged) and compares every value the product wrote (the copy's .request.json) with
what the saved file holds. Validate adds the barcode and may set computed fields, so other data is reported, never
refused here. The barcode itself is decoded and compared by the M3 tool (evidence-lane/E1/tools/barcode_compare.py),
which needs the decoded barcodes; this slice records that it was not run. Prints one JSON line.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_validated.py <validated.pdf> <copy.pdf> <copy.request.json>
"""
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
import e5_roundtrip as E  # noqa: E402


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
    print(json.dumps({**out, "ok": ok, "written": rb["written"], "read_back_equal": rb["read_back_equal"], "mismatches": rb["mismatches"],
                      "other_data_leaves_changed": rb["other_data_leaves_changed"], "barcode_checked": False,
                      "why": None if ok else f"{rb['written'] - rb['read_back_equal']} of the {rb['written']} values the product wrote differ in this file."}))


main()
