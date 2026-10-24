"""P5 PDF filling (9.1, 9.2): writes confirmed form values into a COPY of the official form with the E5 append-only
writer (original bytes kept, the new data stream encrypted with the document key; Adobe accepted this route in
E10-E11), then checks the file it is about to hand over: every written value reads back equal, nothing else in the
form data changed, the template and other parts are byte-identical, both IRCC signatures still verify over their
signed ranges, poppler opens it without errors, and the output starts with the original file byte for byte.
On a static form (IMM 5409, IMM 5476) the same update also sets the page fields of the boxes written, with their
appearances, so the file shows its values outside Adobe (evidence lane F5, F1 slice 2b; p5/page_fields.py); each is
read back by a fresh reader. A dynamic form has no page fields for its boxes: none are set ("dynamic").
The E5 writer uses pypdf private internals: demonstration-only (implementation design §8).
  .tools/solution-1-prototype/.venv/bin/python -I p5/fill.py <request.json>   (prints one JSON line)
request: {"form_file": "imm1295e.pdf", "values": {"<data path>": "<value>"}, "page_fields": {"<page field name (SOM)>": "<value>"},
          "out": "<absolute output path>"}
"""
import hashlib
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "p1"))
sys.path.insert(0, str(HERE))  # page_fields.py beside this file (-I leaves the script folder off the path)
import e5_roundtrip as E  # noqa: E402
import page_fields as PF  # noqa: E402

req = json.loads(Path(sys.argv[1]).read_text())
src = E.official(req["form_file"])
orig = src.read_bytes()
r0 = E.open_reader(orig)
parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(r0).items()}
values = {k: str(v) for k, v in req["values"].items()}
page_values = {k: str(v) for k, v in (req.get("page_fields") or {}).items()}
# Static or dynamic from the file itself (break m2): a dynamic form gets no page field set, whatever the request names.
static = PF.is_static(r0)
out, pages, notes = PF.write_filled(orig, E.new_datasets(parts["datasets"], values), page_values if static else {})
dest = Path(req["out"])
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_bytes(out)
again = dest.read_bytes()
rb = E.read_back(again, values, parts)
with tempfile.TemporaryDirectory() as t:
    sigs = {k: E.verify_sig(again, br, Path(t)) for k, br in E.signatures(again).items()}
pop = E.poppler_check(dest)
seen = PF.read_page_fields(again, list(pages["set"]))
page_bad = [{"name": k, "wrote": v, "read": seen.get(k)} for k, v in pages["set"].items() if seen.get(k) != v]
kind = ("static" if static else "dynamic") if page_values else "none"
page_report = {"form_kind": kind, "requested": len(page_values), "written": len(pages["set"]), "read_back_equal": len(pages["set"]) - len(page_bad),
               "mismatches": page_bad[:10], "not_set": pages["not_set"], "without_page_field": len(pages["unmatched"]) if kind == "static" else 0,
               # Shown outside Adobe: every box written on a static form has its page field set with an appearance.
               "shown_outside_adobe": kind == "static" and not page_bad and not pages["not_set"] and not pages["unmatched"]}
report = {
    "form_file": req["form_file"], "source_sha256": hashlib.sha256(orig).hexdigest(), "output": str(dest), "output_sha256": hashlib.sha256(again).hexdigest(),
    "bytes": len(again), "original_bytes_kept": again[: len(orig)] == orig, "written": rb["written"], "read_back_equal": rb["read_back_equal"],
    "mismatches": rb["mismatches"], "other_data_leaves_changed": rb["other_data_leaves_changed"], "other_parts_unchanged": all(rb["other_parts_unchanged"].values()),
    "signatures": sigs, "poppler_syntax_errors": pop["syntax_errors"], "page_fields": page_report, "writer_notes": notes,
}
report["intact"] = bool(report["original_bytes_kept"] and report["read_back_equal"] == report["written"] and not report["other_data_leaves_changed"]
                        and report["other_parts_unchanged"] and not page_bad and sigs and all(v == "verified" for v in sigs.values()) and pop["syntax_errors"] == 0)
print(json.dumps(report))
