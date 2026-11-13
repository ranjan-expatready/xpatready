"""W1-10 slice 1 C-9 (P-144, P-171 (1)): read a validated copy back into the case. The person filled the copy the
product made, clicked Validate in Adobe and saved it; this reads the saved file with the proven E5 reader
(p1/e5_roundtrip.py read_back; B84 counts an empty data root as no data and a new valued leaf as other data) and compares every value the product wrote (the copy's .request.json) with
what the saved file holds. Validate adds the barcode and may set computed fields, so other data is reported, never
refused here. QA-165: it also reports the form's own Validate result kept in the file (form_validation); the server
records the copy as validated only when that result passed. BK-19 (P-46): it also reports the barcode check
(barcode_check.py: the barcodes the saved file keeps, compared by position with its saved data through the form's own
manifests, the evidence lane's method); the server counts the copy as validated only when they match. Prints one JSON line.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_validated.py <validated.pdf> <copy.pdf> <copy.request.json>
"""
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
sys.path.insert(0, str(HERE))
import e5_roundtrip as E  # noqa: E402
import barcode_check  # noqa: E402

PASSED = {"Yes", "Oui"}  # the form's own words for its flag after a Validate that passed (its message table, Yes_ENU / Yes_FRA)


FLAG_LEAVES = ("ApplicationValidatedFlag[", "ApplicationValidatedFlagMirror[")
DATE_PARTS = ("Year", "Month", "Day")
# The one-field date as each form's own validateForm writes it (utilDates.getToday(): YYYY-MM-DD; break m-7 on #592: a value
# with no year in it is not a date) (review m-3 on #572: IMM 1344 also has
# Barcodes.DateLastValidated, which no script sets, so only these paths count).
SINGLE_DATE_PATHS = ("Page1[0].BC1[0].DateLastValidated[0]",                # IMM 0008: Page1.BC1.DateLastValidated
                     "Part1[0].Header[0].titleSF[0].DateLastValidated[0]")  # IMM 1344: Part1.Header.titleSF.DateLastValidated


def validation_leaves(paths):
    """Where a form keeps its own Validate result, in its data paths. Two shapes, both IRCC's (templates read 2 Nov 2026),
    covering the four barcode forms that need a validated copy (contracts/forms.ts BARCODE_FORMS): IMM 5257 and IMM 1295
    keep ApplicationValidatedFlag and a DateLastValidated with Year, Month and Day; IMM 0008 and IMM 1344 set
    ApplicationValidatedFlagMirror (ApplicationValidatedFlag copies it by a calculate script) and keep DateLastValidated as
    one field at SINGLE_DATE_PATHS (validateForm: DateLastValidated.rawValue = utilDates.getToday()). IMM 5257 Schedule 1
    is neither (review m-1 on #572: it keeps FormValidated and ApplicationValidationDate); it is not a barcode form and
    never needs a validated copy, so a file of it reads as "no Validate result" here."""
    last = lambda p: p.split(".")[-1]
    flags = [p for p in paths if last(p).startswith(FLAG_LEAVES)]
    parts = {k: [p for p in paths if ".DateLastValidated[" in p and last(p).startswith(k + "[")] for k in DATE_PARTS}
    single = [p for p in paths if p.endswith(SINGLE_DATE_PATHS)]
    return flags, parts, single


def form_validation(pdf_bytes):
    """QA-165 (P-144, P-237): the form's own Validate result as the saved file keeps it. The form sets its flag to
    Yes/Oui and fills its date last validated only when Validate finds the form complete, and sets No and clears the
    date otherwise (validateForm and setDateLastValidated in each form's XFA template; see validation_leaves). Passed =
    every flag that holds a value says the same Yes/Oui (break m3 on #572: never Yes and Oui mixed), at least one does,
    and the date is filled. A form that keeps no such
    flag cannot show that Validate passed, so it never counts as validated from the file alone."""
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(pdf_bytes)).items()}
    data = E.data_root(ET.fromstring(parts["datasets"]))
    leaves = dict(E.leaves(data)) if data is not None else {}
    flags, date_parts, single = validation_leaves(list(leaves))
    said = [leaves[p] for p in flags if leaves[p]]
    flag = said[0] if said and all(v == said[0] for v in said) else (" / ".join(said) or None)
    kept = bool(flags) or b"ApplicationValidatedFlag" in parts.get("template", b"")
    ymd = {k: next((leaves[p] for p in ps if leaves[p]), "") for k, ps in date_parts.items()}
    on = "-".join(ymd[k] for k in DATE_PARTS) if all(ymd.values()) else next((leaves[p] for p in single if re.search(r"\b\d{4}\b", leaves[p] or "")), None)
    return {"kept_by_form": kept, "flag": flag, "date_last_validated": on,
            "passed": kept and bool(said) and len(set(said)) == 1 and said[0] in PASSED and on is not None}


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
    barcodes = barcode_check.check(data, copy)
    print(json.dumps({**out, "ok": ok, "validation": validation, "written": rb["written"], "read_back_equal": rb["read_back_equal"], "mismatches": rb["mismatches"],
                      "other_data_leaves_changed": rb["other_data_leaves_changed"], "barcode_checked": barcodes["checked"], "barcodes": barcodes,
                      "why": None if ok else f"{rb['written'] - rb['read_back_equal']} of the {rb['written']} values the product wrote differ in this file."}))


if __name__ == "__main__":
    main()
