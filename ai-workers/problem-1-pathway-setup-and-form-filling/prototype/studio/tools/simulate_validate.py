"""TEST ONLY (QA-165): what Adobe's Validate leaves in a saved IRCC form, without Acrobat. Writes the form's own result
into a copy's XFA data (its validated flag and date last validated, in the form's own shape: read_validated.py
validation_leaves) and saves it as an incremental update, so the copy's written values are unchanged. It never
generates the barcode: a file made here is SYNTHETIC and stands only for "the form's own Validate passed" (or not) in
checks. Prints the output path.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/simulate_validate.py <copy.pdf> <out.pdf> [Yes|Oui|No|none] [nodate]
"""
import sys
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
sys.path.insert(0, str(HERE))
import e5_roundtrip as E  # noqa: E402
from read_validated import validation_leaves  # noqa: E402


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    flag = sys.argv[3] if len(sys.argv) > 3 else "Yes"
    with_date = not (len(sys.argv) > 4 and sys.argv[4] == "nodate")
    b = src.read_bytes()
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}
    leaves = [p for p, _ in E.leaves(E.data_root(ET.fromstring(parts["datasets"])))]
    flags, date_parts, single = validation_leaves(leaves)
    values = {p: flag for p in flags} if flag != "none" else {}
    if with_date and flag in ("Yes", "Oui"):
        today = date.today()
        ymd = {"Year": f"{today.year:04d}", "Month": f"{today.month:02d}", "Day": f"{today.day:02d}"}
        values.update({p: ymd[k] for k, ps in date_parts.items() for p in ps})
        if not any(date_parts.values()):
            values.update({p: today.isoformat() for p in single})
    ds = E.new_datasets(parts["datasets"], values) if values else parts["datasets"]
    data, _ = E.write(b, ds, "append-only-encrypted-diagnostic" if E.open_reader(b).is_encrypted else "append-only")
    # Any change still differs from the copy's bytes (an unchanged copy is refused before this is ever read).
    out.write_bytes(data if data != b else data + b"\n% SYNTHETIC: no Validate result written\n")
    print(out)


main()
