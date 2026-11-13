"""BK-19 (P-46, QA-315): the barcode check of a validated copy, from the saved file alone, for any IRCC barcode form.

P-46: the validated copy is read back and its barcodes compared with the facts by position. The method is the evidence
lane's (evidence-lane/E1/tools/barcode_compare.py, from P1 revision 3): each barcode field is paired with the form's own
manifest by the form's own encodeAll() script (BC.genValue(<field>, …, <manifest>, '<delimiter>')); slot k of the barcode
is compared with the value saved in the k-th manifest box. The read-back (read_validated.py) already compares every value
the product wrote with the saved data, so barcodes that agree with the saved data agree with the facts written.

Where the barcodes are read: Adobe's Validate sets each barcode field's value by script (the fields are bound to no data,
bind match="none"), and a saved XFA form keeps the values of such fields in its form packet: the official forms' own form
packets keep their script-set page counters the same way (CurrentPage, PageCount; read 13 Nov 2026 from imm5257e.pdf,
imm1295e.pdf, imm0008e.pdf, imm1344e.pdf). The evidence lane decoded the drawn barcodes from Adobe page captures
instead; that a file saved by Adobe keeps them in its form packet is UNPROVEN on a real Adobe file until BK-20's Mac run
(the six evidence lines of C7.2). A barcode not found there counts as not read, never as matching.

Form-agnostic (P-319): every rule here is read from the form's own template; no form number.
"""
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROTO = HERE.parent.parent
for p in (PROTO / "p1", PROTO / "evidence-lane" / "E1" / "tools"):
    sys.path.insert(0, str(p))
import e5_roundtrip as E  # noqa: E402
import xfa_inventory as X  # noqa: E402
from barcode_compare import bind_repeats, manifests  # noqa: E402  (the evidence lane's binding and manifest readers)
from barcode_positions import split_payload  # noqa: E402  (P1's label, count and trailing-delimiter check)

CONTAINERS = ("subform", "subformSet", "area", "exclGroup", "field")
# encodeAll(): BC.genValue(Barcodes.PaperFormsBarcode1, false, true, "Label", false, barcode1, '|') — field, viewer flag,
# include the label, label id, (unused), manifest, delimiter. `this` (a field's own commented-out calculate) is skipped.
GEN = re.compile(r"genValue\(\s*([A-Za-z_][\w.\[\]]*)\s*,\s*\w+\s*,\s*(true|false)\s*,\s*\"[^\"]*\"\s*,\s*\w+\s*,\s*(\w+)\s*,\s*'([^']*)'\s*\)")


def local(tag):
    return tag.split("}")[-1]


def som_index(top):
    """SOM path (as the P1 inventory spells it: name or #tag, counted per key among siblings) -> element."""
    out = {}

    def walk(el, som):
        seen = Counter()
        for c in el:
            tag = local(c.tag)
            if tag not in CONTAINERS:
                continue
            key = c.get("name") or f"#{tag}"
            i = seen[key]
            seen[key] += 1
            p = f"{som}.{key}[{i}]"
            out[p] = c
            if tag not in ("field", "exclGroup"):
                walk(c, p)
    root = f"{top.get('name')}[0]"
    out[root] = top
    walk(top, root)
    return out


def named(som):
    """A path without its unnamed containers (#subform[0]), which the form packet may lay out differently."""
    return ".".join(s for s in som.split(".") if not s.startswith("#"))


def ui_of(el):
    ui = next((c for c in el if local(c.tag) == "ui"), None)
    return [c for c in ui] if ui is not None else []


def number_picture(el):
    """A box whose own picture is a fixed-width number (num{99}): its barcode slot is the number without leading zeros
    (P1 revision 3 and E1 IMM 5257: months and days, the same picture)."""
    return el is not None and any(local(c.tag) == "picture" and re.fullmatch(r"num\{9+\}", (c.text or "").strip()) for c in ui_of(el))


def spec(copy_pdf):
    """What the form's own template says about its barcodes: [(field som, label, include label, manifest refs as
    data paths, delimiter, number boxes)], from the copy as the product made it (the official bytes it was written on)."""
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(Path(copy_pdf).read_bytes())).items()}
    tpl_xml = parts["template"]
    tpl = ET.fromstring(tpl_xml)
    top = next(c for c in tpl if local(c.tag) == "subform")
    idx = som_index(top)
    fields = {som: el for som, el in idx.items() if local(el.tag) == "field" and any(local(w.tag) == "barcode" for w in ui_of(el))}
    pair = {}
    for m in GEN.finditer(tpl_xml.decode("utf-8", "replace")):
        field = re.sub(r"\[\d+\]", "", m.group(1)).split(".")[-1]
        if field != "this":
            pair[field] = (m.group(2) == "true", m.group(3), m.group(4))
    copy = Path(copy_pdf).resolve()
    X.official = lambda _name: copy  # the P1 reader looks a file up by name; the copy is given by path
    X.SOL = Path(copy.anchor)  # it names the file relative to this folder in its summary only, which is not used here
    _, inv = X.inventory(Path(copy_pdf).name, "barcode check (BK-19)")
    bind = bind_repeats({f["som"]: f["data_path"] for f in inv["fields"] if f.get("som")}, inv)
    man = manifests(tpl_xml, {p[1] for p in pair.values()})
    out = []
    for som, el in fields.items():
        name = som.split(".")[-1].split("[")[0]
        cap = next((c for c in el if local(c.tag) == "caption"), None)
        label = "".join(t.text or "" for t in cap.iter() if local(t.tag) == "text").strip() if cap is not None else ""
        inc, mname, delim = pair.get(name, (None, None, None))
        refs = man.get(mname, []) if mname else []
        slots = [(r, bind(r), number_picture(idx.get(r if r.endswith("]") else r + "[0]"))) for r in refs]
        out.append({"som": som, "label": label, "include_label": inc, "manifest": mname, "delimiter": delim, "slots": slots})
    return out


def form_values(pdf_bytes):
    """The values a saved file's form packet keeps for fields, by named path (see the module note)."""
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(pdf_bytes)).items()}
    if "form" not in parts:
        return {}
    root = ET.fromstring(parts["form"])
    top = next((c for c in root if local(c.tag) == "subform"), None)
    if top is None:
        return {}
    out = {}
    for som, el in som_index(top).items():
        if local(el.tag) != "field":
            continue
        val = next((c for c in el if local(c.tag) == "value"), None)
        text = "".join(t.text or "" for t in val.iter() if t is not val) if val is not None else ""
        if text:
            out.setdefault(named(som), text)
    return out


def same(barcode, saved, number_box):
    if barcode == saved:
        return True
    # The number without its leading zeros ("07" -> "7", "00" -> "0"): the box's own num{99} picture, read from the
    # template for every form alike (P-319), the rule the evidence shows on months and days (P1 rev. 3, E1 IMM 5257).
    return number_box and re.fullmatch(r"0+\d", saved or "") is not None and barcode == (saved.lstrip("0") or "0")


def check(saved_bytes, copy_pdf):
    """The barcode check for the upload's answer: checked, expected, decoded (read from the file), matched, words."""
    try:
        bcs = spec(copy_pdf)
    except Exception as e:  # noqa: BLE001 (reported; never taken as matching)
        return {"checked": False, "expected": None, "decoded": 0, "matched": False, "error": type(e).__name__,
                "words": "The product could not read this form's barcode rules, so its barcodes are not checked: this copy does not count as validated."}
    if not bcs:
        return {"checked": False, "expected": 0, "decoded": 0, "matched": None, "words": "This form has no barcode."}
    expected = len(bcs)
    try:
        kept = form_values(saved_bytes)
        data = E.data_root(ET.fromstring(E.xfa_streams(E.open_reader(saved_bytes))["datasets"].get_object().get_data()))
    except Exception as e:  # noqa: BLE001
        return {"checked": True, "expected": expected, "decoded": 0, "matched": False, "error": type(e).__name__,
                "words": f"0 of the {expected} barcodes could be read from this file. In Adobe Reader, press Validate, save the file and send the saved file."}

    def saved(path):
        node = E.find_or_make(data, path, create=False) if path and data is not None else None
        return "" if node is None else (node.text or "")
    decoded, slots, agree, problems = 0, 0, 0, []
    for b in bcs:
        text = kept.get(named(b["som"]))
        if not text:
            problems.append({"barcode": b["label"] or b["som"], "problem": "not in the file"})
            continue
        decoded += 1
        if not b["manifest"] or b["delimiter"] != "|" or b["include_label"] is not True:
            problems.append({"barcode": b["label"], "problem": "the form's script pairs no manifest with this barcode the product can read"})
            continue
        values, err = split_payload(text, b["label"], len(b["slots"]))
        if err:
            problems.append({"barcode": b["label"], "problem": err})
            continue
        for k, ((ref, path, num), v) in enumerate(zip(b["slots"], values), start=1):
            slots += 1
            s = saved(path)
            if path and same(v, s, num):
                agree += 1
            else:
                problems.append({"barcode": b["label"], "position": k, "box": ref, "barcode_value": v[:60], "saved_value": s[:60], "problem": "position differs" if path else "box bound to no data"})
    matched = decoded == expected and not problems
    if decoded < expected:
        words = (f"{decoded} of the {expected} barcodes are in this file: Adobe Reader adds them only when the form's own Validate passes. "
                 "Open this copy in Adobe Reader, press Validate, save it and send the saved file.")
    elif not matched:
        n = sum(1 for p in problems if "position" in p) or len(problems)
        words = (f"The barcodes in this file do not agree with the form's answers ({n} position{'' if n == 1 else 's'}): the form was changed after Validate. "
                 "In Adobe Reader, press Validate again, save it and send that file.")
    else:
        words = f"All {expected} barcodes read; each of their {slots} positions agrees with the form's answers."
    return {"checked": True, "expected": expected, "decoded": decoded, "matched": matched, "slots": slots, "agree": agree,
            "problems": problems[:10], "problems_total": len(problems), "words": words}
