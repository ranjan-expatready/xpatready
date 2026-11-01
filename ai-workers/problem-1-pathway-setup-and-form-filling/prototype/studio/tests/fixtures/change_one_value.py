"""QA-127 check fixture: a copy the product made with ONE written value changed afterwards (as a person might do in
Adobe after Validate), saved as an incremental update with the proven E5 writer (p1/e5_roundtrip.py, unchanged; the
encrypted-stream mode, as p1/adobe_complete_1295.py uses, since IRCC's forms are encrypted).
Prints one JSON line: the field path changed, the value the product wrote and the new value. No model call (US$0).
  .tools/solution-1-prototype/.venv/bin/python -I studio/tests/fixtures/change_one_value.py <copy.pdf> <copy.request.json> <out.pdf>
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent.parent / "p1"))
import e5_roundtrip as E  # noqa: E402


def main():
    copy, request, out = (Path(p) for p in sys.argv[1:4])
    data = copy.read_bytes()
    values = json.loads(request.read_text())["values"]
    # The first written text value that is not a code (a name, a number), so the change is plainly a different value.
    path, wrote = next((p, v) for p, v in values.items() if isinstance(v, str) and len(v) > 2)
    changed = "CHANGED" if wrote != "CHANGED" else "OTHER"
    original = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(data)).items()}
    ds = E.new_datasets(original["datasets"], {path: changed})
    new, _ = E.write(data, ds, "append-only-encrypted-diagnostic")
    out.write_bytes(new)
    print(json.dumps({"path": path, "wrote": wrote, "now": changed}))


main()
