"""Product Studio "Read form" step (activity 2.1) for ONE official XFA form edition, through the P1 inventory code
(p1/xfa_inventory.py, unchanged). Writes the P1-format inventory to p1/inventory/<name>.inventory.json, the only
place the guarded drafting path admits inventories of official files (p2/guard.ts). An existing inventory is never
overwritten: it is re-derived and compared, so a repeated read is idempotent and a changed reader is caught.
p1/inventory/summary.json is not touched. Prints one JSON line.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_form.py <official file name>
P-80: a form a second person approved in the product is read from the copy's approved-sources folder, where the Studio
wrote its approval record and PDF at approval; its inventory is written next to them (<checksum>.inventory.json), never
into p1/inventory, and only when the record is for exactly this checksum and names a second person.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_form.py --approved <approved-sources folder> <checksum>
"""
import hashlib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
import xfa_inventory as X  # noqa: E402


def approved_source(folder, checksum):
    """The approved PDF's path, or a plain reason it is not readable as an approved form (the guard checks it again)."""
    d = Path(folder)
    var = HERE.parent / "var"
    try:
        rel = d.resolve(strict=True).relative_to(var.resolve()).as_posix()
    except (OSError, ValueError):
        return None, "the approved-sources folder is not a Studio copy's own"
    if d.is_symlink() or not re.fullmatch(r"(isolated-[a-z0-9_]+/)?workspaces/demo/approved-sources", rel):
        return None, "the approved-sources folder is not a Studio copy's own"
    if not re.fullmatch(r"[0-9a-f]{64}", checksum or ""):
        return None, "an approved form is named by its checksum"
    d = d.resolve()  # the inventory names the PDF by its path inside the solution folder (as the guard compares it)
    pdf, rec = d / f"{checksum}.pdf", d / f"{checksum}.approval.json"
    if not rec.is_file() or rec.is_symlink():
        return None, "no approval is recorded for this checksum"
    r = json.loads(rec.read_text())
    if r.get("sha256") != checksum or r.get("kind") != "form":
        return None, "the approval record is for another file"
    if r.get("contract") == "official-download/v1":  # S4 (M3): downloaded from canada.ca (the guard checks it again)
        if not all(re.fullmatch(r"https://(www|ircc)\.canada\.ca/[^\s@]*", str(r.get(k, ""))) for k in ("form_page", "source_url")):
            return None, "the official download record does not show canada.ca"
    elif not r.get("uploaded_by") or str(r.get("uploaded_by")).lower() == str(r.get("approved_by", "")).lower():
        return None, "the approval does not name a second person"
    if not pdf.is_file() or pdf.is_symlink() or hashlib.sha256(pdf.read_bytes()).hexdigest() != checksum:
        return None, "the approved PDF is missing or no longer has the approved checksum"
    return pdf, None


if sys.argv[1] == "--approved":
    pdf, why = approved_source(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "")
    if why:
        print(json.dumps({"ok": False, "error": why}))
        sys.exit(0)
    fname, out = pdf.name, pdf.parent / f"{sys.argv[3]}.inventory.json"
    X.official = lambda _name: pdf  # the reader looks a file up by its manifest name; an approved one is given by path
else:
    fname = sys.argv[1]
    if fname not in X._PATHS:
        print(json.dumps({"ok": False, "error": f"{fname} is not in the official manifest"}))
        sys.exit(0)
    out = X.OUT / (fname.replace(".pdf", "") + ".inventory.json")
try:
    summary, full = X.inventory(fname, "added through Product Studio")
except Exception as e:  # not an XFA form (a checklist or guide), or unreadable
    print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"[:300]}))
    sys.exit(0)
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
