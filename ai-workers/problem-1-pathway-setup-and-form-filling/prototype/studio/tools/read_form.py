"""Product Studio "Read form" step (activity 2.1) for ONE official XFA form edition, through the P1 inventory code
(p1/xfa_inventory.py, unchanged). Writes the P1-format inventory to p1/inventory/<name>.inventory.json, the only
place the guarded drafting path admits inventories (p2/guard.ts). An existing inventory is never overwritten: it is
re-derived and compared, so a repeated read is idempotent and a changed reader is caught. p1/inventory/summary.json
is not touched. Prints one JSON line.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_form.py <official file name>
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
import xfa_inventory as X  # noqa: E402

fname = sys.argv[1]
if fname not in X._PATHS:
    print(json.dumps({"ok": False, "error": f"{fname} is not in the official manifest"}))
    sys.exit(0)
try:
    summary, full = X.inventory(fname, "added through Product Studio")
except Exception as e:  # not an XFA form (a checklist or guide), or unreadable
    print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"[:300]}))
    sys.exit(0)
out = X.OUT / (fname.replace(".pdf", "") + ".inventory.json")
text = json.dumps(full, indent=1, ensure_ascii=False)
if out.exists():
    old = json.loads(out.read_text())
    same = old.get("fields") == full["fields"] and old.get("groups") == full["groups"]
    status = "existing inventory confirmed identical" if same else "existing inventory DIFFERS (not overwritten)"
else:
    out.write_text(text)
    same, status = True, "inventory written"
print(json.dumps({"ok": same, "status": status, "inventory_file": str(out.relative_to(X.SOL)), "summary": {
    k: summary.get(k) for k in ("file", "sha256", "fields_total", "entry_fields_bound", "entry_fields_in_shipped_data", "required_fields",
                                "choice_fields_with_options", "repeat_groups_dynamic", "row_groups_fixed", "presence_changing_scripts", "template_ns")
} | {"pages": summary["pdf"]["pages"], "barcodes": len(summary["barcode_fields"])}}))
