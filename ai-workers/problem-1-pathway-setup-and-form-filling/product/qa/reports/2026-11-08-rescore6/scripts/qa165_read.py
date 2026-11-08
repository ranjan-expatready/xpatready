# qa lane, QA-165 re-test: read the generated IMM 5257 copy's XFA data and list the form's own mandatory boxes (inventory
# "required", 46) that are empty, the same reading as check_qa_golden_2.cjs step 6. Args: <p1 dir> <inventory> <out json> <root>
import json, sys, os
from pathlib import Path
p1, inv_path, out_path, root = sys.argv[1:5]
sys.path.insert(0, p1)
import e5_roundtrip as E
import xml.etree.ElementTree as ET
o = json.load(open(out_path)); inv = json.load(open(inv_path))
pdf = Path(o["path"]) if os.path.isabs(o["path"]) else Path(root) / o["path"]
r = E.open_reader(pdf.read_bytes()); st = E.xfa_streams(r)
parts = {k: v.get_object().get_data() for k, v in st.items()}
data = E.data_root(ET.fromstring(parts["datasets"]))
def leaf(p):
    n = E.find_or_make(data, p, create=False)
    return None if n is None else (n.text or "")
req = [f for f in inv["fields"] if f.get("required") and f.get("data_path")]
empty = [f for f in req if not (leaf(f["data_path"]) or "").strip()]
rep = o.get("result") or {}
boxes = {b.get("box"): b for b in (rep.get("boxes") or [])}
print(json.dumps({"pdf_bytes": pdf.stat().st_size, "required_total": len(req), "required_empty": len(empty), "filler_counts": rep.get("counts")}))
for f in empty:
    b = boxes.get(f["data_path"]) or {}
    print("EMPTY  " + json.dumps({"caption": f["caption"], "box": f["data_path"].split(".")[-2:], "ui": f.get("ui"), "filler": {k: b.get(k) for k in ("result", "fact", "why", "reason") if b.get(k) is not None}})[:600])
