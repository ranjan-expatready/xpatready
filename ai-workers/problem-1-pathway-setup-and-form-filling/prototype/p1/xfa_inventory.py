"""P1 field inventory of each official XFA form edition (read only).

Reads the template and the shipped data skeleton of each form through pypdf,
derives each field's data path by XFA normal (name) binding, checks that path
against the shipped skeleton, and records type, caption, options, required
flag, repetition and the scripts that act on it. Writes one JSON file per form
and a summary JSON. The official files are never modified.

Run from the project root with the prototype venv:
  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/xfa_inventory.py
With the argument `lists` (BK-26) it writes, beside each inventory, the lists the form's own script fills from another
box's answer (<form>.lists.json); the inventories themselves are left as they are.
"""
import collections
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pypdf

ROOT = Path(__file__).resolve().parents[4]
SOL = ROOT / "ai-workers/problem-1-pathway-setup-and-form-filling"
SOURCES = SOL / "official-sources/ircc"
_PATHS = {i["file"]: i["path"] for i in json.loads((SOURCES / "manifest.json").read_text())["items"]}


def official(fname):
    """Path of an official file in the organised library, looked up in its manifest."""
    return SOURCES / _PATHS[fname]
OUT = Path(__file__).resolve().parent / "inventory"
XDATA = "{http://www.xfa.org/schema/xfa-data/1.0/}"

# Combination 1 (work permit, outside Canada) forms, with the reason each is read.
COMBINATION_1 = [
    ("imm1295e.pdf", "each applicant"),
    ("imm5707e.pdf", "each person aged 18 or older"),
    ("imm5409e.pdf", "common-law couple"),
    ("imm5476e.pdf", "representative used"),
    ("imm5475e.pdf", "conditional; not in the base case"),
    ("imm5257_1e.pdf", "variant V3 only"),
    ("imm5488e.pdf", "document checklist"),
]

PRESENCE_RE = re.compile(r"([A-Za-z0-9_\.\[\]]+)\.presence\s*=\s*[\"'](\w+)[\"']")


def sha256(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def xfa_parts(path):
    r = pypdf.PdfReader(str(path))
    if r.is_encrypted:
        r.decrypt("")
    x = r.trailer["/Root"]["/AcroForm"]["/XFA"]
    parts = {}
    for i in range(0, len(x) - 1, 2):
        parts[str(x[i])] = x[i + 1].get_object().get_data()
    root = r.trailer["/Root"]
    meta = {
        "pages": len(r.pages),
        "needs_rendering": bool(root.get("/NeedsRendering")),
        "perms": sorted(str(k) for k in (root.get("/Perms") or {}).keys()),
        "acroform_fields": len(r.get_fields() or {}),
        "encryption": (
            {"V": int(r.trailer["/Encrypt"]["/V"]), "R": int(r.trailer["/Encrypt"]["/R"]),
             "P": int(r.trailer["/Encrypt"]["/P"])} if "/Encrypt" in r.trailer else None
        ),
    }
    return parts, meta


def text_of(el, ns):
    if el is None:
        return ""
    return " ".join("".join(el.itertext()).split())


def data_skeleton_paths(datasets_xml):
    root = ET.fromstring(datasets_xml)
    data = root.find(XDATA + "data")
    paths = set()

    def walk(e, p):
        seen = collections.Counter()
        for c in e:
            idx = seen[c.tag]
            seen[c.tag] += 1
            cp = f"{p}.{c.tag}[{idx}]"
            paths.add(cp)
            walk(c, cp)

    # Some forms ship a partial data skeleton plus an Adobe data description of the full shape.
    dd = root.find("{http://ns.adobe.com/data-description/}dataDescription")
    if dd is not None:
        for top in dd:
            paths.add(f"{top.tag}[0]")
            walk(top, f"{top.tag}[0]")
    if data is not None:
        for top in data:
            if top.tag == "LOVFile":
                continue
            paths.add(f"{top.tag}[0]")
            walk(top, f"{top.tag}[0]")
    # dd:group wrappers are description-only; repeated rows are compared on their first instance.
    return {re.sub(r"\.\{http://ns\.adobe\.com/data-description/\}group\[\d+\]", "", x) for x in paths}


def in_skeleton(path, skel):
    return path.replace("[*]", "[0]") in skel


def inventory(fname, reason):
    path = official(fname)
    parts, meta = xfa_parts(path)
    tpl = ET.fromstring(parts["template"])
    ns = tpl.tag.split("}")[0] + "}"
    skel = data_skeleton_paths(parts["datasets"]) if "datasets" in parts else set()
    lov_root = ET.fromstring(parts["datasets"]).find("LOVFile") if "datasets" in parts else None

    def lov_options(ref, label_ref, value_ref):
        # bindItems ref="xfa.datasets.LOVFile.LOV.XList.X[*]": options are LOV nodes, value from an attribute
        m = re.match(r"xfa\.datasets\.LOVFile\.(.+)\[\*\]$", ref or "")
        if lov_root is None or not m:
            return None
        node = lov_root
        names = m.group(1).split(".")
        for n in names[:-1]:
            node = node.find(n) if node is not None else None
        if node is None:
            return None
        items = list(node.iter(names[-1]))
        val = (lambda e: e.get(value_ref)) if value_ref and value_ref != "$" else (lambda e: e.text or "")
        return [[(e.text or "").strip(), val(e) or ""] for e in items]

    fields = []
    groups = []  # repeated or row-like containers
    script_total = collections.Counter()
    presence_scripts = []
    scope_seen = collections.defaultdict(collections.Counter)  # data scope path -> same-name counts (walk)
    containers = ("subform", "subformSet", "area", "exclGroup")

    def caption(el):
        cap = el.find(ns + "caption")
        t = text_of(cap.find(ns + "value"), ns) if cap is not None and cap.find(ns + "value") is not None else ""
        if not t:
            a = el.find(ns + "assist")
            if a is not None:
                t = text_of(a.find(ns + "speak"), ns) or text_of(a.find(ns + "toolTip"), ns)
        return t[:240]

    def scripts_of(el):
        acts = collections.Counter()
        targets = []
        for ev in el.findall(ns + "event"):
            for s in ev.iter(ns + "script"):
                acts[ev.get("activity") or "?"] += 1
                for m in PRESENCE_RE.finditer(s.text or ""):
                    targets.append(f"{m.group(1)}->{m.group(2)}")
        for tag in ("calculate", "validate"):
            c = el.find(ns + tag)
            if c is not None and c.find(ns + "script") is not None:
                acts[tag] += 1
        return dict(acts), sorted(set(targets))

    def resolve_ref(ref, data, root_data):
        # "$" is the current data node, "$record" the data root; unindexed steps take [0].
        steps = ref.split(".")
        if steps[0] == "$":
            base = data
        elif steps[0] == "$record":
            base = root_data
        else:
            return ref
        out = base
        for st in steps[1:]:
            out += "." + (st if "[" in st else st + "[0]")
        return out

    def heading_of(el):
        for d in el.findall(ns + "draw"):
            t = text_of(d.find(ns + "value"), ns)
            if t and len(t) >= 4 and any(ch.isalpha() for ch in t):
                return t[:120]
        return None

    def walk(el, som, data, data_ok, row_hint, heading=None):
        here = heading_of(el) or heading
        seen_som = collections.Counter()
        # Same-named siblings are counted per data scope, not per template container (row PD): an unnamed subform is
        # transparent, so its children compete with its parent's for the parent scope's indices (IMM 5532's shipped
        # data has page1.yesNo[0..20] and Table2[0..1] for boxes spread over several unnamed subforms).
        seen_data = scope_seen[data]
        for c in el:
            tag = c.tag.replace(ns, "")
            if tag in ("pageSet", "proto"):
                continue
            if tag == "variables":
                for s in c.iter(ns + "script"):
                    script_total["script-object"] += 1
                continue
            if tag not in containers + ("field",):
                continue
            name = c.get("name")
            key = name or f"#{tag}"
            i = seen_som[key]
            seen_som[key] += 1
            csom = f"{som}.{key}[{i}]"
            bind = c.find(ns + "bind")
            match = bind.get("match") if bind is not None else None
            ref = bind.get("ref") if bind is not None else None
            occur = c.find(ns + "occur")
            occ = None
            if occur is not None:
                occ = {k: occur.get(k) for k in ("min", "max", "initial") if occur.get(k) is not None}
            # Data path under XFA normal binding: named containers and fields add a level;
            # unnamed subforms are transparent; match="none" has no data.
            if match == "none":
                cdata, cok = None, False
            elif match == "dataRef" and ref:
                cdata, cok = resolve_ref(ref, data, root_data), data_ok
            elif tag == "area":
                cdata, cok = data, data_ok  # areas are layout only and open no data level
            elif name and data_ok:
                j = seen_data[name]
                seen_data[name] += 1
                cdata, cok = f"{data}.{name}[{j}]", True
            else:
                cdata, cok = data, data_ok
            acts, targets = scripts_of(c)
            script_total.update(acts)
            if targets:
                presence_scripts.append({"on": csom, "sets": targets})
            rowlike = bool(name and re.search(r"(Row|row)\d+$|\d+$", name)) and tag == "subform"
            if tag in ("subform", "subformSet", "area") and (occ and occ.get("max") not in (None, "1") or rowlike):
                groups.append({"som": csom, "data_path": cdata, "occur": occ, "fixed_row": rowlike and not (occ and occ.get("max") not in (None, "1"))})
            if tag in ("field", "exclGroup"):
                ui = c.find(ns + "ui")
                # The widget is the ui child that is not a picture clause, extras, border or margin.
                widgets = [w.tag.replace(ns, "") for w in (ui if ui is not None else []) if w.tag.replace(ns, "") not in ("picture", "extras", "border", "margin")]
                uitype = widgets[0] if widgets else ("exclGroup" if tag == "exclGroup" else "?")
                if uitype in ("button", "picture") or (uitype == "defaultUi" and not cdata):
                    pass
                opts = []
                for it in c.findall(ns + "items"):
                    opts.append([(x.text or "") for x in it])
                if tag == "exclGroup":
                    for f in c.findall(ns + "field"):
                        for it in f.findall(ns + "items"):
                            vals = [(x.text or "") for x in it]
                            if vals:
                                opts.append([caption(f) or f.get("name") or "", vals[0]])
                bi = c.find(ns + "bindItems")
                val = c.find(ns + "validate")
                textval = c.find(ns + "value")
                maxc = None
                if textval is not None:
                    tx = textval.find(ns + "text")
                    if tx is not None and tx.get("maxChars"):
                        maxc = int(tx.get("maxChars"))
                parts_som = csom.split(".")
                fields.append({
                    "som": csom,
                    "section": ".".join(p.split("[")[0] for p in parts_som[1:4]),
                    "kind": tag,
                    "ui": uitype,
                    "caption": caption(c),
                    "data_path": cdata,
                    "in_shipped_data": in_skeleton(cdata, skel) if cdata else None,
                    "options": opts or None,
                    "options_from": bi.get("ref") if bi is not None else None,
                    "options_resolved": lov_options(bi.get("ref"), bi.get("labelRef"), bi.get("valueRef")) if bi is not None else None,
                    "required": (val.get("nullTest") == "error") if val is not None and val.get("nullTest") else False,
                    "max_chars": maxc,
                    "presence": c.get("presence") or "visible",
                    "heading": here,
                    "in_row": row_hint or None,
                    "scripts": acts or None,
                })
            if tag not in ("field", "exclGroup"):
                # A container bound "none" opens no data scope: its children bind in the parent's.
                ctx, ctx_ok = (data, data_ok) if match == "none" else (cdata, cok)
                walk(c, csom, ctx, ctx_ok, csom if (tag == "subform" and (rowlike or (occ and occ.get("max") not in (None, "1")))) else row_hint, here)

    top = tpl.find(ns + "subform")
    tname = top.get("name")
    root_data = f"{tname}[0]"
    walk(top, f"{tname}[0]", root_data, True, None)

    entry = [f for f in fields if f["ui"] not in ("button", "picture", "barcode", "signature") and f["data_path"]]
    summary = {
        "file": str(path.relative_to(SOL)),
        "sha256": sha256(path),
        "reason_read": reason,
        "pdf": meta,
        "template_ns": ns.strip("{}"),
        "fields_total": len(fields),
        "entry_fields_bound": len(entry),
        "entry_fields_in_shipped_data": sum(1 for f in entry if f["in_shipped_data"]),
        "ui_counts": dict(collections.Counter(f["ui"] for f in fields)),
        "required_fields": sum(1 for f in fields if f["required"]),
        "choice_fields_with_options": sum(1 for f in fields if f["options"] or f["options_from"]),
        "repeat_groups_dynamic": sum(1 for g in groups if not g["fixed_row"]),
        "row_groups_fixed": sum(1 for g in groups if g["fixed_row"]),
        "barcode_fields": [f["som"] for f in fields if f["ui"] == "barcode"],
        "buttons": [{"som": f["som"], "caption": f["caption"][:60], "scripts": f["scripts"]} for f in fields if f["ui"] == "button"],
        "scripts_by_activity": dict(script_total),
        "presence_changing_scripts": len(presence_scripts),
        "sections": dict(collections.Counter(f["section"] for f in entry)),
    }
    return summary, {"summary": summary, "groups": groups, "presence_scripts": presence_scripts, "fields": fields}


# BK-26: a list the form's own script fills from another box's answer, e.g. IMM 1294's
#   LOVUtils.setDDLFromLOV(CityTown.CityTown, "CityList." + this.formattedValue+".City[*]")
# on the province box: the target box, the datasets path before and after the other box's answer, and which of its
# values the script reads (formattedValue: the label it shows; rawValue: its code).
DDL_RE = re.compile(r'setDDLFromLOV\(\s*([A-Za-z_][\w.\[\]]*)\s*,\s*"([\w.]+?)\."\s*\+\s*this\.(formattedValue|rawValue)\s*\+\s*"\.([\w.]+)\[\*\]"\s*\)')
# The form's own LOVUtils.setDDLFromLOV adds each item as (its text, its <attribute>): `oListItem.lic.value`.
ITEM_VALUE_RE = re.compile(r"oListItem\.(\w+)\.value")


def dependent_lists(fname):
    """BK-26: each dependent list of a form, read from the official file itself (its template's scripts and its own
    datasets; no AI, US$0). Keyed by the target box's data path (the inventory's own, matched by SOM path); each entry
    names the box it depends on and holds every list the form can load into it, by that box's answer, as
    [label, code] pairs in the form's order. Returns None when the form fills no list from another box."""
    path = official(fname)
    parts, _ = xfa_parts(path)
    if "template" not in parts or "datasets" not in parts:
        return None
    tpl = ET.fromstring(parts["template"])
    ns = tpl.tag.split("}")[0] + "}"
    lov = ET.fromstring(parts["datasets"]).find("LOVFile")
    lov = lov.find("LOV") if lov is not None else None
    objects = "\n".join(s.text or "" for v in tpl.iter(ns + "variables") for s in v.findall(ns + "script"))
    attr = ITEM_VALUE_RE.search(objects[objects.find("function setDDLFromLOV"):] if "function setDDLFromLOV" in objects else "")
    if lov is None or attr is None:
        return None
    _, full = inventory(fname, "dependent lists")
    by_som = {f["som"]: f for f in full["fields"] if f.get("data_path")}
    # The inventory's SOM paths with unnamed subforms dropped: XFA resolves a name through them (they are transparent).
    norm = lambda s: re.sub(r"\.#(?:subform|area|subformSet)\[\d+\]", "", s)
    by_name = {norm(s): f for s, f in by_som.items()}
    containers = ("subform", "subformSet", "area", "exclGroup")
    calls = []  # (source som, target expression, prefix, which value, item, the script's own words)

    def walk(el, som):
        seen = collections.Counter()
        for c in el:
            tag = c.tag.replace(ns, "")
            if tag in ("pageSet", "proto", "variables") or tag not in containers + ("field",):
                continue
            key = c.get("name") or f"#{tag}"
            i = seen[key]
            seen[key] += 1
            csom = f"{som}.{key}[{i}]"
            if tag in ("field", "exclGroup"):
                for ev in c.findall(ns + "event"):
                    for s in ev.iter(ns + "script"):
                        for m in DDL_RE.finditer(s.text or ""):
                            calls.append((csom, m.group(1), m.group(2), m.group(3), m.group(4), " ".join(m.group(0).split())))
            else:
                walk(c, csom)

    top = tpl.find(ns + "subform")
    walk(top, f"{top.get('name')}[0]")

    def resolve(source_som, expr):
        # XFA's scope rule: the name is looked for from the source box's container, then each container above it.
        steps = [s if "[" in s else f"{s}[0]" for s in expr.split(".")]
        scope = norm(source_som).split(".")[:-1]
        while scope:
            hit = by_name.get(".".join(scope + steps))
            if hit:
                return hit
            scope.pop()
        return None

    def items(node_path):
        node = lov
        for n in node_path.split("."):
            node = node.find(n) if node is not None else None
        return node

    boxes = {}
    for source_som, expr, prefix, which, item, quote in calls:
        src, dst = by_som.get(source_som), resolve(source_som, expr)
        if not src or not dst:
            continue
        lists = {}
        parent = items(prefix)
        for group in (list(parent) if parent is not None else []):
            pairs = [[(e.text or "").strip(), e.get(attr.group(1)) or ""] for e in group.findall(item)]
            lists[group.tag] = [p for p in pairs if p[0] or p[1]]
        if not lists:
            continue
        boxes.setdefault(dst["data_path"], {
            "caption": dst.get("caption"),
            "depends_on": src["data_path"],
            "depends_on_caption": src.get("caption"),
            "key": "label" if which == "formattedValue" else "code",
            "list": f"{prefix}.{{}}.{item}",
            "value_attribute": attr.group(1),
            "quote": quote,
            "lists": lists,
        })
    if not boxes:
        return None
    return {
        "file": fname, "sha256": full["summary"]["sha256"],
        "read_by": "prototype/p1/xfa_inventory.py dependent_lists (the form's own template scripts and datasets; no AI)",
        "boxes": boxes,
    }


def lists_json(r):
    """The lists file's text: one line per list (a province's 972 cities on one line), so a change reads as one line."""
    one = lambda v: json.dumps(v, ensure_ascii=False)
    boxes = []
    for path, b in r["boxes"].items():
        head = [f'   {one(k)}: {one(v)}' for k, v in b.items() if k != "lists"]
        lists = ",\n".join(f'    {one(k)}: {one(v)}' for k, v in b["lists"].items())
        boxes.append(f'  {one(path)}: {{\n' + ",\n".join(head) + ',\n   "lists": {\n' + lists + "\n   }\n  }")
    top = [f' {one(k)}: {one(v)}' for k, v in r.items() if k != "boxes"]
    return "{\n" + ",\n".join(top) + ',\n "boxes": {\n' + ",\n".join(boxes) + "\n }\n}\n"


def main_lists():
    """BK-26: writes <form>.lists.json beside each form's inventory that has a dependent list."""
    for p in sorted(OUT.glob("imm*.inventory.json")):
        if ".text." in p.name:
            continue
        fname = p.name.replace(".inventory.json", ".pdf")
        try:
            r = dependent_lists(fname)
        except Exception as e:  # a form with no XFA template has no lists to read
            print(f"{fname}: not read ({e})")
            continue
        if r:
            (OUT / (fname.replace(".pdf", "") + ".lists.json")).write_text(lists_json(r))
            print(f"{fname}: {len(r['boxes'])} dependent lists: " + "; ".join(f"{b['caption']} by {b['depends_on_caption']} ({sum(len(v) for v in b['lists'].values())} entries)" for b in r["boxes"].values()))


def main():
    OUT.mkdir(exist_ok=True)
    allsum = []
    for fname, reason in COMBINATION_1:
        s, full = inventory(fname, reason)
        (OUT / (fname.replace(".pdf", "") + ".inventory.json")).write_text(json.dumps(full, indent=1, ensure_ascii=False))
        allsum.append(s)
        print(f"{fname}: fields {s['fields_total']}, entry bound {s['entry_fields_bound']}, "
              f"in shipped data {s['entry_fields_in_shipped_data']}, dynamic repeats {s['repeat_groups_dynamic']}, "
              f"fixed rows {s['row_groups_fixed']}, barcodes {len(s['barcode_fields'])}, "
              f"presence scripts {s['presence_changing_scripts']}")
    (OUT / "summary.json").write_text(json.dumps({"pypdf": pypdf.__version__, "python": sys.version.split()[0], "forms": allsum}, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main_lists() if sys.argv[1:] == ["lists"] else main()
