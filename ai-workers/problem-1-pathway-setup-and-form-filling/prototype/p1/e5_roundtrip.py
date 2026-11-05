"""Experiment E5: write XFA data with pypdf on COPIES of the official forms and read it back.

For each combination-1 form edition:
  1. copy the official file into a run folder outside the backups and check its hash;
  2. build new form data: every bound entry field gets a test value (generic run), and
     IMM 5707 / IMM 1295 also get the made-up family's values (family run);
  3. write it two ways: R1 append-only update (pypdf incremental) and a full rewrite;
  4. reopen each output from disk, read every written value back and compare;
  5. check what must not change: template, other data, original bytes, and whether the
     usage-rights (UR3) and certification (DocMDP) signatures still verify over their
     signed byte ranges (OpenSSL CMS, signature integrity only, no trust chain);
  6. write the R2 fallback: an XML data file for Adobe Reader's Import Data.

What it cannot show: how Adobe Reader displays the values, whether Reader keeps the
extended features after a non-Adobe update, Validate, or the barcodes. Those need
Adobe Reader, which is not installed here. The official files are never modified.

  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/e5_roundtrip.py
"""
import copy
import datetime as dt
import hashlib
import io
import json
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pypdf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCES = ROOT / "ai-workers/problem-1-pathway-setup-and-form-filling/official-sources/ircc"
_PATHS = {i["file"]: i["path"] for i in json.loads((SOURCES / "manifest.json").read_text())["items"]}


def official(fname):
    return SOURCES / _PATHS[fname]


INV = HERE / "inventory"
RUNS = HERE / "runs"
OPENSSL = "/opt/homebrew/bin/openssl"
XDATA = "http://www.xfa.org/schema/xfa-data/1.0/"
for p, u in {"xfa": XDATA, "dd": "http://ns.adobe.com/data-description/",
             "xsi": "http://www.w3.org/2001/XMLSchema-instance"}.items():
    ET.register_namespace(p, u)

FORM_FILES = ["imm1295e", "imm5707e", "imm5409e", "imm5476e", "imm5475e", "imm5257_1e", "imm5488e"]


def sha(b):
    return hashlib.sha256(b).hexdigest()


def xfa_streams(reader):
    x = reader.trailer["/Root"]["/AcroForm"]["/XFA"]
    return {str(x[i]): x[i + 1] for i in range(0, len(x) - 1, 2)}


def open_reader(data):
    r = pypdf.PdfReader(io.BytesIO(data))
    if r.is_encrypted:
        r.decrypt("")
    return r


# ---------- data paths ----------
STEP = re.compile(r"^(.+)\[(\d+|\*)\]$")


def steps(path):
    out = []
    for s in path.split("."):
        m = STEP.match(s)
        out.append((m.group(1), m.group(2)) if m else (s, "0"))
    return out


def data_root(ds):
    d = ds.find(f"{{{XDATA}}}data")
    return d


def find_or_make(data, path, create):
    node = data
    for name, idx in steps(path):
        idx = 0 if idx == "*" else int(idx)
        kids = [c for c in node if c.tag == name]
        while len(kids) <= idx:
            if not create:
                return None
            new = ET.SubElement(node, name)
            kids.append(new)
        node = kids[idx]
    return node


def leaves(e, p=""):
    kids = list(e)
    if not kids:
        yield p, (e.text or "")
        return
    seen = {}
    for c in kids:
        i = seen.get(c.tag, 0)
        seen[c.tag] = i + 1
        yield from leaves(c, f"{p}.{c.tag}[{i}]" if p else f"{c.tag}[{i}]")


# ---------- test values ----------
def generic_values(inv):
    vals = {}
    n = 0
    for f in inv["fields"]:
        if not f["data_path"] or f["ui"] in ("button", "picture", "barcode", "signature", "defaultUi"):
            continue
        if f["presence"] == "hidden" and not f["caption"]:
            continue
        n += 1
        path = f["data_path"]
        rows = [path.replace("[*]", "[0]"), path.replace("[*]", "[1]")] if "[*]" in path else [path]
        for k, p in enumerate(rows):
            if f["ui"] == "dateTimeEdit":
                v = f"2020-01-{10 + n % 18:02d}"
            elif f["ui"] == "choiceList" and f.get("options_resolved"):
                vals_ = [o[1] for o in f["options_resolved"] if o[1]]
                v = vals_[min(k, len(vals_) - 1)] if vals_ else f"T{n}"
            elif f["ui"] in ("choiceList", "exclGroup") and f["options"] and any(f["options"]):
                opts = f["options"]
                if f["ui"] == "exclGroup":
                    v = opts[min(k, len(opts) - 1)][1]
                else:
                    save = opts[-1] if len(opts) > 1 else opts[0]
                    v = save[min(k, len(save) - 1)]
            elif f["ui"] == "checkButton":
                v = (f["options"][0][0] if f["options"] and f["options"][0] else "1")
            elif f["ui"] == "numericEdit":
                v = str(10 + n)
            else:
                v = f"T{n}R{k}"
                if f["max_chars"] and len(v) > f["max_chars"]:
                    v = v[: f["max_chars"]]
            vals[p] = v
    return vals


def family_values():
    return json.loads((HERE / "e5-family-values.json").read_text())


# ---------- writing ----------
def new_datasets(original_xml, values):
    ds = ET.fromstring(original_xml)
    data = data_root(ds)
    for path, v in values.items():
        node = find_or_make(data, path, create=True)
        for c in list(node):
            node.remove(c)  # a value replaces an empty placeholder group only
        node.text = v
    return ET.tostring(ds, encoding="utf-8")


def write(original_bytes, ds_bytes, mode):
    """mode: append-only (pypdf incremental, as shipped), full-rewrite, or
    append-only-encrypted-diagnostic (pypdf incremental plus the new stream encrypted with the
    document's own key through pypdf's private Encryption object; diagnostic only)."""
    reader = open_reader(original_bytes)
    notes = []
    if mode == "full-rewrite":
        w = pypdf.PdfWriter(clone_from=reader)
    else:
        w = pypdf.PdfWriter(reader, incremental=True)
    if reader.is_encrypted and w._encryption is None:
        notes.append("pypdf writer holds no encryption for this encrypted document")
    x = w._root_object["/AcroForm"]["/XFA"]
    ref = {str(x[i]): x[i + 1] for i in range(0, len(x) - 1, 2)}["datasets"]
    obj = ref.get_object()
    obj.set_data(ds_bytes)
    if mode == "append-only-encrypted-diagnostic":
        cf = reader._encryption._make_crypt_filter(ref.idnum, ref.generation)
        enc = pypdf.generic.StreamObject()
        enc.update({k: v for k, v in obj.items() if k != "/Length"})
        enc._data = cf.stm_crypt.encrypt(obj._data)  # obj._data is already Flate-encoded by set_data
        enc.indirect_reference = pypdf.generic.IndirectObject(ref.idnum, ref.generation, w)
        w._objects[ref.idnum - 1] = enc
        notes.append("new datasets stream encrypted with the document key (private pypdf API)")
    buf = io.BytesIO()
    w.write(buf)
    out = buf.getvalue()
    if mode == "append-only-encrypted-diagnostic":
        # pypdf's appended cross-reference stream omits /Encrypt (and /Info unless changed);
        # without /Encrypt a strict reader treats every original object as unencrypted.
        extra = b""
        for key in ("/Encrypt", "/Info"):
            v = reader.trailer.raw_get(key) if key in reader.trailer else None
            if v is not None:
                b2 = io.BytesIO()
                v.write_to_stream(b2)
                extra += key.encode() + b" " + b2.getvalue() + b"\n"
        head, tail = out[: len(original_bytes)], out[len(original_bytes):]
        marker = b"/Type /XRef\n"
        assert tail.count(marker) == 1
        out = head + tail.replace(marker, marker + extra)
        notes.append("/Encrypt and /Info copied into the appended trailer (cross-reference stream dictionary)")
    return out, notes


# ---------- signatures ----------
def signatures(pdf_bytes):
    r = open_reader(pdf_bytes)
    perms = r.trailer["/Root"].get("/Perms")
    out = {}
    if not perms:
        return out
    for k in perms:
        s = perms[k].get_object()
        br = [int(x) for x in s["/ByteRange"]]
        out[str(k)] = br
    return out


def der_length(b):
    # outer SEQUENCE: tag, then short or long-form length
    if b[1] < 0x80:
        return 2 + b[1]
    n = b[1] & 0x7F
    return 2 + n + int.from_bytes(b[2:2 + n], "big")


def verify_sig(pdf_bytes, br, tmp):
    a, b, c, d = br
    if c + d > len(pdf_bytes):
        return "byte range beyond end of file"
    signed = pdf_bytes[a:a + b] + pdf_bytes[c:c + d]
    hexs = pdf_bytes[a + b:c].strip()
    if not (hexs.startswith(b"<") and hexs.endswith(b">")):
        return "signature contents not found at byte range gap"
    raw = bytes.fromhex(re.sub(rb"\s", b"", hexs[1:-1]).decode())
    # DER (definite length) is cut to its length; BER indefinite length (30 80 ...) keeps its
    # end-of-contents octets, so the zero padding is left in place for OpenSSL to stop at.
    der = raw if raw[1] == 0x80 else raw[: der_length(raw)]
    (tmp / "sig.der").write_bytes(der)
    (tmp / "signed.bin").write_bytes(signed)
    p = subprocess.run([OPENSSL, "cms", "-verify", "-inform", "DER", "-in", str(tmp / "sig.der"),
                        "-content", str(tmp / "signed.bin"), "-binary", "-noverify", "-purpose", "any",
                        "-out", "/dev/null"], capture_output=True, text=True)
    return "verified" if p.returncode == 0 else ("failed: " + (p.stderr.strip().splitlines() or ["?"])[-1][:160])


# ---------- independent reader ----------
def poppler_check(path):
    p = subprocess.run(["pdftotext", "-l", "1", str(path), "-"], capture_output=True)
    text = " ".join(p.stdout.decode("utf-8", "replace").split())
    return {"syntax_errors": p.stderr.decode("utf-8", "replace").count("Error"),
            "page1_text_starts": text[:60]}


# ---------- read back ----------
def read_back(pdf_bytes, values, original_parts):
    r = open_reader(pdf_bytes)
    st = xfa_streams(r)
    parts = {k: v.get_object().get_data() for k, v in st.items()}
    ds = ET.fromstring(parts["datasets"])
    data = data_root(ds)
    ok, bad = 0, []
    for path, v in values.items():
        node = find_or_make(data, path, create=False)
        got = None if node is None else (node.text or "")
        if got == v:
            ok += 1
        else:
            bad.append({"path": path, "wrote": v, "read": got})
    # nothing else in the data changed
    orig = dict(leaves(data_root(ET.fromstring(original_parts["datasets"]))))
    now = dict(leaves(data)) if data is not None else {}
    written = {p.replace("[*]", "[0]") for p in values}
    # A written path's ancestors are not "other" data: an empty placeholder it fills, and the data root itself when the
    # blank form holds no data at all (IMM 0008 DEP: an empty <xfa:data/> reads as one leaf at path "", B84).
    near = lambda p: any(p == "" or p.startswith(w + ".") or w.startswith(p + ".") for w in written)
    changed_other = [p for p, v in orig.items() if p not in written and now.get(p, None) != v and not near(p)]
    # B84 review m1: a leaf the blank did not hold is other data too when it carries a value nobody wrote (writing a path
    # adds only that leaf and empty placeholders before it), so a form with an empty blank (DEP) is still checked.
    changed_other += [p for p, v in now.items() if p not in orig and p not in written and v != "" and not near(p)]
    unchanged = {k: sha(parts[k]) == sha(original_parts[k]) for k in original_parts if k != "datasets"}
    return {"written": len(values), "read_back_equal": ok, "mismatches": bad[:10],
            "other_data_leaves_changed": len(changed_other), "other_parts_unchanged": unchanged}


def main():
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run = RUNS / f"e5-{stamp}"
    (run / "tmp").mkdir(parents=True)
    fam = family_values()
    results = {"experiment": "E5", "run_utc": stamp, "run_folder": str(run.relative_to(ROOT)),
               "pypdf": pypdf.__version__, "python": sys.version.split()[0],
               "openssl": subprocess.run([OPENSSL, "version"], capture_output=True, text=True).stdout.strip(),
               "forms": []}
    for name in FORM_FILES:
        src = official(f"{name}.pdf")
        orig = src.read_bytes()
        shutil.copyfile(src, run / f"{name}.original-copy.pdf")
        assert (run / f"{name}.original-copy.pdf").read_bytes() == orig
        inv = json.loads((INV / f"{name}.inventory.json").read_text())
        r0 = open_reader(orig)
        original_parts = {k: v.get_object().get_data() for k, v in xfa_streams(r0).items()}
        sig0 = signatures(orig)
        form = {"form": name, "source_sha256": sha(orig), "bytes": len(orig),
                "poppler_original": poppler_check(run / f"{name}.original-copy.pdf"),
                "original_signatures": {k: {"byte_range": br, "covers_whole_file": br[2] + br[3] == len(orig),
                                            "verify": verify_sig(orig, br, run / "tmp")} for k, br in sig0.items()},
                "runs": []}
        sets = [("generic", generic_values(inv))]
        if name in fam["forms"]:
            sets.append(("family", fam["forms"][name]))
        for label, values in sets:
            (run / f"{name}.{label}.values.json").write_text(json.dumps(values, indent=1))
            ds_bytes = new_datasets(original_parts["datasets"], values)
            # R2 fallback: the data file Adobe Reader's Import Data takes
            root = data_root(ET.fromstring(ds_bytes))
            r2 = ET.tostring(list(root)[-1] if root is not None and len(root) else ET.Element("empty"), encoding="utf-8")
            (run / f"{name}.{label}.r2-data.xml").write_bytes(b'<?xml version="1.0" encoding="UTF-8"?>\n' + r2)
            for mode in ("append-only", "full-rewrite", "append-only-encrypted-diagnostic"):
                entry = {"values": label, "mode": mode}
                try:
                    out, entry["notes"] = write(orig, ds_bytes, mode)
                except Exception as e:  # recorded, never hidden
                    entry["error"] = f"{type(e).__name__}: {e}"[:300]
                    form["runs"].append(entry)
                    continue
                path = run / f"{name}.{label}.{mode}.pdf"
                path.write_bytes(out)
                out = path.read_bytes()
                entry["output_sha256"] = sha(out)
                entry["bytes"] = len(out)
                entry["original_bytes_are_prefix"] = out[: len(orig)] == orig
                entry["output_encrypted"] = "/Encrypt" in pypdf.PdfReader(io.BytesIO(out)).trailer
                entry["poppler"] = poppler_check(path)
                try:
                    entry["read_back"] = read_back(out, values, original_parts)
                except Exception as e:
                    entry["read_back"] = {"error": f"{type(e).__name__}: {e}"[:300]}
                sig = signatures(out)
                entry["signatures"] = {k: {"byte_range": br, "same_as_original": br == sig0.get(k),
                                           "verify": verify_sig(out, br, run / "tmp")} for k, br in sig.items()}
                entry["signatures_missing"] = sorted(set(sig0) - set(sig))
                form["runs"].append(entry)
            form.setdefault("r2_data_files", {})[label] = sha((run / f"{name}.{label}.r2-data.xml").read_bytes())
        results["forms"].append(form)
        short = [(x["values"], x["mode"], x.get("error") or
                  (x["read_back"].get("error") or f"{x['read_back']['read_back_equal']}/{x['read_back']['written']}") + f" prefix={x['original_bytes_are_prefix']} poppler_err={x['poppler']['syntax_errors']} "
                  f"sigs={[v['verify'][:8] for v in x['signatures'].values()]}") for x in form["runs"]]
        print(name, short)
    shutil.rmtree(run / "tmp")
    (HERE / "e5-results.json").write_text(json.dumps(results, indent=1))


if __name__ == "__main__":
    main()
