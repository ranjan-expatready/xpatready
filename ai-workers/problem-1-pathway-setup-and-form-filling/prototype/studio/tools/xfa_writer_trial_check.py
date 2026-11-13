"""B170i (P-469): one neutral check of two filled copies of the same blank form, one written by our writer (p5/fill.py)
and one by the team's engine. Read-only on both; writes nothing. Uses our own readers (p1/e5_roundtrip.py,
p5/page_fields.py) so both copies are judged by the same code; the trial tool (xfa-writer-trial.ts) also reads both
with the engine. Prints one JSON line:
  {"<label>": {sha256, bytes, added_bytes, original_bytes_kept, signatures, poppler_syntax_errors, other_parts_unchanged,
               read_back_equal, written, mismatches, other_data_leaves_changed, leaves, page_fields}}
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/xfa_writer_trial_check.py <request.json>
  ... xfa_writer_trial_check.py --generic <field list.json>   (prints the E1 trial values for a form)
request: {"form_file": "imm5257e.pdf", "values": {...}, "page_fields": {...}, "copies": {"ours": "<abs>", "theirs": "<abs>"}}
"""
import hashlib
import json
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1] / "p1"))
sys.path.insert(0, str(HERE.parents[1] / "p5"))
import e5_roundtrip as E  # noqa: E402
import page_fields as PF  # noqa: E402

if sys.argv[1] == "--generic":
    # The E1 fill trials' inputs (p1/e5_roundtrip.py generic_values): a made-up value in every box of the form's field
    # list, two rows of each repeating box. Printed as {"<data path>": "<value>"}.
    print(json.dumps(E.generic_values(json.loads(Path(sys.argv[2]).read_text()))))
    sys.exit(0)
req = json.loads(Path(sys.argv[1]).read_text())
orig = E.official(req["form_file"]).read_bytes()
r0 = E.open_reader(orig)
parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(r0).items()}
values = {k: str(v) for k, v in req["values"].items()}
names = list((req.get("page_fields") or {}).keys())
static = PF.is_static(r0)
out = {"form_kind": "static" if static else "dynamic"}
for label, path in req["copies"].items():
    b = Path(path).read_bytes()
    rb = E.read_back(b, values, parts)
    with tempfile.TemporaryDirectory() as t:
        sigs = {k: E.verify_sig(b, br, Path(t)) for k, br in E.signatures(b).items()}
    data = E.data_root(ET.fromstring(E.xfa_streams(E.open_reader(b))["datasets"].get_object().get_data()))
    out[label] = {
        "sha256": hashlib.sha256(b).hexdigest(), "bytes": len(b), "added_bytes": len(b) - len(orig),
        "original_bytes_kept": b[: len(orig)] == orig, "signatures": sigs, "poppler_syntax_errors": E.poppler_check(Path(path))["syntax_errors"],
        "other_parts_unchanged": all(rb["other_parts_unchanged"].values()), "written": rb["written"], "read_back_equal": rb["read_back_equal"],
        "mismatches": rb["mismatches"], "other_data_leaves_changed": rb["other_data_leaves_changed"],
        # Every data leaf, by path, as our reader sees it: the two copies are compared leaf by leaf.
        "leaves": dict(E.leaves(data)) if data is not None else {},
        # The page fields the request names (static forms: what a reader outside Adobe shows).
        "page_fields": PF.read_page_fields(b, names) if names else {},
    }
print(json.dumps(out))
