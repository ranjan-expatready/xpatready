"""TEST ONLY (QA-165): what Adobe's Validate leaves in a saved IRCC form, without Acrobat. Writes the form's own result
into a copy's XFA data (its validated flag and date last validated, in the form's own shape: read_validated.py
validation_leaves) and saves it as an incremental update, so the copy's written values are unchanged. By default it
writes no barcode: a file made here is SYNTHETIC and stands only for "the form's own Validate passed" (or not) in
checks, and the barcode check (barcode_check.py, BK-19) finds 0 barcodes in it.
BK-19: `barcodes` also writes each barcode's text where a saved form keeps it (its form packet; barcode_check.py's note),
made as the form's own encodeAll() makes it: its label, then each manifest box's saved value (a num{99} box without its
leading zero), each followed by the delimiter. `barcodes-stale` does the same and then changes one position, as a file
whose form was edited after Validate. Still SYNTHETIC: it stands for Adobe's barcodes, never proves them (BK-20 does).
Prints the output path.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/simulate_validate.py <copy.pdf> <out.pdf> [Yes|Oui|No|none] [nodate] [barcodes|barcodes-stale]
"""
import io
import sys
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "p1"))
sys.path.insert(0, str(HERE))
import e5_roundtrip as E  # noqa: E402
from read_validated import validation_leaves  # noqa: E402
import barcode_check as BC  # noqa: E402
import pypdf  # noqa: E402


def with_barcodes(form_xml, ds_xml, copy_pdf, stale):
    """The form packet with each barcode field's text, made from the saved data as the form's own script makes it."""
    data = E.data_root(ET.fromstring(ds_xml))
    saved = lambda p: (lambda n: "" if n is None else (n.text or ""))(E.find_or_make(data, p, create=False) if p else None)  # noqa: E731
    root = ET.fromstring(form_xml)
    ns = root.tag.split("}")[0] + "}" if root.tag.startswith("{") else ""
    for i, b in enumerate(BC.spec(copy_pdf)):
        vals = [(saved(p).lstrip("0") or "0") if num and saved(p).isdigit() else saved(p) for _, p, num in b["slots"]]
        if stale and i == 0 and vals:
            vals[0] = (vals[0] or "") + "CHANGED"
        node = root
        for step in BC.named(b["som"]).split("."):
            tag, name = ("field" if step == BC.named(b["som"]).split(".")[-1] else "subform"), step.split("[")[0]
            nxt = next((c for c in node if BC.local(c.tag) == tag and c.get("name") == name), None)
            node = nxt if nxt is not None else ET.SubElement(node, ns + tag, {"name": name})
        for c in list(node):
            if BC.local(c.tag) == "value":
                node.remove(c)
        ET.SubElement(ET.SubElement(node, ns + "value"), ns + "text").text = "|".join([b["label"], *vals, ""])
    return ET.tostring(root, encoding="utf-8")


def set_packet(pdf_bytes, packet, xml):
    """One more incremental update replacing one XFA packet (as e5_roundtrip.write does for datasets, encrypted the same way)."""
    reader = E.open_reader(pdf_bytes)
    w = pypdf.PdfWriter(reader, incremental=True)
    x = w._root_object["/AcroForm"]["/XFA"]
    ref = {str(x[i]): x[i + 1] for i in range(0, len(x) - 1, 2)}[packet]
    obj = ref.get_object()
    obj.set_data(xml)
    if reader.is_encrypted:
        cf = reader._encryption._make_crypt_filter(ref.idnum, ref.generation)
        enc = pypdf.generic.StreamObject()
        enc.update({k: v for k, v in obj.items() if k != "/Length"})
        enc._data = cf.stm_crypt.encrypt(obj._data)
        enc.indirect_reference = pypdf.generic.IndirectObject(ref.idnum, ref.generation, w)
        w._objects[ref.idnum - 1] = enc
    buf = io.BytesIO()
    w.write(buf)
    out = buf.getvalue()
    if reader.is_encrypted:
        extra = b""
        for key in ("/Encrypt", "/Info"):
            v = reader.trailer.raw_get(key) if key in reader.trailer else None
            if v is not None:
                b2 = io.BytesIO()
                v.write_to_stream(b2)
                extra += key.encode() + b" " + b2.getvalue() + b"\n"
        head, tail = out[: len(pdf_bytes)], out[len(pdf_bytes):]
        out = head + tail.replace(b"/Type /XRef\n", b"/Type /XRef\n" + extra, 1)
    return out


def main():
    src, out = Path(sys.argv[1]), Path(sys.argv[2])
    flag = sys.argv[3] if len(sys.argv) > 3 else "Yes"
    with_date = "nodate" not in sys.argv[4:]
    barcodes = next((a for a in sys.argv[4:] if a.startswith("barcodes")), None)
    b = src.read_bytes()
    parts = {k: v.get_object().get_data() for k, v in E.xfa_streams(E.open_reader(b)).items()}
    leaves = [p for p, _ in E.leaves(E.data_root(ET.fromstring(parts["datasets"])))]
    flags, date_parts, single = validation_leaves(leaves)
    values = {p: flag for p in flags} if flag != "none" else {}
    if with_date and flag in ("Yes", "Oui"):
        today = date.today()
        ymd = {"Year": f"{today.year:04d}", "Month": f"{today.month:02d}", "Day": f"{today.day:02d}"}
        values.update({p: ymd[k] for k, ps in date_parts.items() for p in ps})
        if not any(date_parts.values()):
            values.update({p: today.isoformat() for p in single})
    ds = E.new_datasets(parts["datasets"], values) if values else parts["datasets"]
    data, _ = E.write(b, ds, "append-only-encrypted-diagnostic" if E.open_reader(b).is_encrypted else "append-only")
    if barcodes:
        data = set_packet(data, "form", with_barcodes(parts["form"], ds, src, barcodes == "barcodes-stale"))
    # Any change still differs from the copy's bytes (an unchanged copy is refused before this is ever read).
    out.write_bytes(data if data != b else data + b"\n% SYNTHETIC: no Validate result written\n")
    print(out)


main()
