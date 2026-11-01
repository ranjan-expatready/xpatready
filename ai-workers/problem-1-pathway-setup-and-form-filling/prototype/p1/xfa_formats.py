"""P-162 (C3.1): each form field's format, read from the official XFA form itself (read only, no AI, US$0).

For every field of a form this reads what the PDF box itself enforces: its maximum length, its picture clause, and
the validation function its own script calls (val.validateUCI, val.validatePassportNum, ...), with the form's own
error message for that function as the quote (tableMessages "..._ENU"). Fields are matched to the P1 inventory by
their SOM path, so each entry carries the inventory's data path. Writes <form>.formats.json beside the inventory.

Run from the project root with the prototype venv:
  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/xfa_formats.py
"""
import importlib.util
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("xfa_inventory", HERE / "xfa_inventory.py")
inv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(inv)

CONTAINERS = ("subform", "subformSet", "area", "exclGroup", "field")
CALL_RE = re.compile(r"\b(?:val|validateForm)\.(validate\w+)\s*\(([^)]*)\)")
MSG_RE = re.compile(r'tableMessages\["([^"]+)_ENU"\]\s*=\s*"((?:[^"\\]|\\.)*)"')
GETMSG_RE = re.compile(r'getMessage\("([^"]+)"\)')


def clean(s):
    return re.sub(r"\s+", " ", s.replace("\\n", " ").replace("\\/", "/").replace("\\*", "*")).strip()


def script_objects(tpl, ns):
    """The form's named script objects (val, util, messages ...) as one text per name."""
    out = {}
    for v in tpl.iter(ns + "variables"):
        for s in v.findall(ns + "script"):
            if s.get("name"):
                out[s.get("name")] = (out.get(s.get("name"), "") + "\n" + (s.text or ""))
    return out


def function_body(src, name):
    """The text of `function name(...) { ... }` in a script object (braces counted)."""
    m = re.search(r"function\s+%s\s*\(" % re.escape(name), src)
    if not m:
        return None
    i = src.find("{", m.end())
    depth = 0
    for j in range(i, len(src)):
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                return src[m.start():j + 1]
    return src[m.start():]


def read(fname):
    path = inv.official(fname)
    parts, _ = inv.xfa_parts(path)
    tpl = ET.fromstring(parts["template"])
    ns = tpl.tag.split("}")[0] + "}"
    objects = script_objects(tpl, ns)
    messages = {k: clean(v) for k, v in MSG_RE.findall(objects.get("messages", "") + "\n".join(objects.values()))}
    val_src = objects.get("val", "")

    def quote_of(fn):
        body = function_body(val_src, fn) or function_body("\n".join(objects.values()), fn) or ""
        keys = [k for k in GETMSG_RE.findall(body) if k in messages and k not in ("Format_Entered", "Required", "Selected_Invalid")]
        return [{"key": k, "text": messages[k]} for k in dict.fromkeys(keys)]

    boxes = {}

    def walk(el, som):
        seen = {}
        for c in el:
            tag = c.tag.replace(ns, "")
            if tag in ("pageSet", "proto", "variables") or tag not in CONTAINERS:
                continue
            name = c.get("name")
            here = som
            if name:
                idx = seen.get(name, 0)
                seen[name] = idx + 1
                here = f"{som}.{name}[{idx}]" if som else f"{name}[{idx}]"
            if tag == "field":
                entry = {}
                v = c.find(ns + "validate")
                if v is not None:
                    s = v.find(ns + "script")
                    calls = CALL_RE.findall((s.text or "") if s is not None else "")
                    if calls:
                        entry["checks"] = [{"function": f, "args": [a.strip().strip('"\'') for a in args.split(",")][1:], "quote": quote_of(f)} for f, args in dict.fromkeys(calls)]
                    p = v.find(ns + "picture")
                    if p is not None and (p.text or "").strip():
                        entry["validate_picture"] = p.text.strip()
                for where in ("ui", "format"):
                    w = c.find(ns + where)
                    p = w.find(ns + "picture") if w is not None else None
                    if p is not None and (p.text or "").strip():
                        entry[f"{where}_picture"] = p.text.strip()
                val = c.find(ns + "value")
                t = val.find(ns + "text") if val is not None else None
                if t is not None and t.get("maxChars"):
                    entry["max_chars"] = int(t.get("maxChars"))
                if entry:
                    boxes[here] = entry
            else:
                walk(c, here)

    walk(tpl, "")
    full = json.loads((inv.OUT / (fname.replace(".pdf", "") + ".inventory.json")).read_text())
    by_som = {f["som"]: f for f in full["fields"] if f.get("data_path")}
    out = {}
    for som, e in boxes.items():
        f = by_som.get(som)
        if f:
            out[f["data_path"]] = {"caption": f.get("caption"), **e}
    return {
        "file": fname, "sha256": full["summary"]["sha256"],
        "read_by": "prototype/p1/xfa_formats.py (the form's own XFA template: maxChars, picture clauses, validate scripts; no AI)",
        "boxes_with_format": len(out), "boxes_unmatched": len(boxes) - len(out), "boxes": out,
    }


def main():
    names = sorted(p.name.replace(".inventory.json", ".pdf") for p in inv.OUT.glob("imm*.inventory.json") if ".text." not in p.name)
    for fname in names:
        try:
            r = read(fname)
        except Exception as e:  # a form with no XFA template has no box formats to read
            print(f"{fname}: not read ({e})")
            continue
        (inv.OUT / (fname.replace(".pdf", "") + ".formats.json")).write_text(json.dumps(r, indent=1, ensure_ascii=False) + "\n")
        checks = sum(len(b.get("checks", [])) for b in r["boxes"].values())
        print(f"{fname}: {r['boxes_with_format']} boxes with a format, {checks} validation checks, {r['boxes_unmatched']} unmatched")


if __name__ == "__main__":
    main()
