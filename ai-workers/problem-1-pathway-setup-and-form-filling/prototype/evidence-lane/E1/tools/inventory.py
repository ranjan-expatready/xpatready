"""E1: inventory one official form edition with P1's xfa_inventory.inventory() (unchanged), written into the lane folder
(P1's script writes only to p1/inventory/, which this lane does not touch).
  .tools/solution-1-prototype/.venv/bin/python -I …/E1/tools/inventory.py <form file, e.g. imm0008e.pdf> <out.json>
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "p1"))
import xfa_inventory as X  # noqa: E402

fname, out = sys.argv[1:3]
summary, full = X.inventory(fname, "E1 evidence lane: Adobe acceptance of a filled copy")
Path(out).write_text(json.dumps(full, indent=1, ensure_ascii=False))
print(json.dumps({k: v for k, v in summary.items() if k not in ("buttons", "barcode_fields")}, ensure_ascii=False))
