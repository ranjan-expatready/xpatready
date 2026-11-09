"""C10.2 check fixture (Adobe Validate on the finished story's Paper IMM 5257, 9 Nov): what a filled copy holds, read from
the copy itself with the project's XFA reader (p1/xfa_inventory.py and p1/e5_roundtrip.py, unchanged). For every
choice-list field the copy holds a value in: the value, and whether it is one of the field's export (saved) values and
one of its display values, the lists read from this copy's own template and list of values (its <items>, or the
<bindItems> list the form fills the drop-down from). Also every non-empty value by data path, so a check can read the
form's own rules on them. Prints one JSON line per copy.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tests/fixtures/read_choice_values.py <copy.pdf> [<copy.pdf> ...]
TEST ONLY, to make a fail case: writes the given values into a copy as an incremental update (the E5 writer, as
tools/simulate_validate.py does) and prints the output path.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tests/fixtures/read_choice_values.py --set <copy.pdf> <out.pdf> <data path>=<value> ...
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent.parent / "p1"))
import e5_roundtrip as E  # noqa: E402
import xfa_inventory as X  # noqa: E402


def parts_of(b):
    return {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}


def choice_fields(pdf):
    """The copy's choice-list fields, by data path: (display values, export values), read by xfa_inventory's own walk.
    The walk looks a file up by its library name; here it reads this copy, so its lookup is pointed at the copy."""
    X.official = lambda _name: pdf
    X.SOL = Path(pdf.anchor)  # the summary names the file relative to this; any absolute path is under its root
    _, inv = X.inventory(str(pdf), "C10.2 check: the copy's own choice lists")
    out = {}
    for f in inv["fields"]:
        if f["ui"] != "choiceList" or not f["data_path"]:
            continue
        if f["options_resolved"]:  # <bindItems>: [label, saved value] per item of the form's list of values
            disp, exp = [o[0] for o in f["options_resolved"]], [o[1] for o in f["options_resolved"]]
        elif f["options"]:  # <items>: one list is both; with two, the second is the saved one (IRCC's <items save="1">)
            disp, exp = f["options"][0], f["options"][-1]
        else:
            disp, exp = [], []
        out[f["data_path"]] = (disp, exp, f["caption"][:80])
    return out


def read(pdf):
    b = pdf.read_bytes()
    values = {p: v for p, v in E.leaves(E.data_root(ET.fromstring(parts_of(b)["datasets"]))) if v not in (None, "")}
    choices = []
    for path, (disp, exp, caption) in choice_fields(pdf).items():
        if path in values:
            choices.append({"path": path, "caption": caption, "wrote": values[path], "is_export": values[path] in exp,
                            "is_display": values[path] in disp, "exports": len(exp)})
    return {"file": pdf.name, "choices": choices, "values": values}


def set_values(src, out, pairs):
    b = src.read_bytes()
    values = dict(p.split("=", 1) for p in pairs)
    data, _ = E.write(b, E.new_datasets(parts_of(b)["datasets"], values), "append-only-encrypted-diagnostic" if E.open_reader(b).is_encrypted else "append-only")
    out.write_bytes(data)
    print(out)


if __name__ == "__main__":
    if sys.argv[1] == "--set":
        set_values(Path(sys.argv[2]), Path(sys.argv[3]), sys.argv[4:])
    else:
        for a in sys.argv[1:]:
            print(json.dumps(read(Path(a).resolve())))
