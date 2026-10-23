"""E5 independent read-back: decrypt the written XFA data without pypdf.

pypdf both wrote and read the E5 outputs, so a symmetric fault could hide. This check
re-derives the file key from the PDF specification (ISO 32000-1, 7.6.3.3 Algorithm 2,
standard security handler R4, empty user password), finds the newest datasets stream
through the appended cross-reference stream, decrypts it with AES-128-CBC
(`cryptography`, already present) and inflates it with zlib, then compares every
written value. Only append-only outputs are checked (full rewrites are unencrypted).

  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/e5_independent_readback.py
"""
import hashlib
import json
import re
import struct
import xml.etree.ElementTree as ET
import zlib
from pathlib import Path

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
XDATA = "{http://www.xfa.org/schema/xfa-data/1.0/}"
PAD = bytes.fromhex("28BF4E5E4E758A4164004E56FFFA01082E2E00B6D0683E802F0CA9FE6453697A")
STEP = re.compile(r"^(.+)\[(\d+|\*)\]$")


def pdf_string(b, start):
    """Read a literal or hex PDF string at b[start:]; returns bytes."""
    if b[start:start + 1] == b"<":
        end = b.index(b">", start)
        return bytes.fromhex(re.sub(rb"\s", b"", b[start + 1:end]).decode())
    out, i, depth = bytearray(), start + 1, 1
    esc = {b"n": b"\n", b"r": b"\r", b"t": b"\t", b"b": b"\b", b"f": b"\f"}
    while True:
        c = b[i:i + 1]
        if c == b"\\":
            n = b[i + 1:i + 2]
            if n in esc:
                out += esc[n]; i += 2
            elif n.isdigit():
                m = re.match(rb"[0-7]{1,3}", b[i + 1:i + 4]); out.append(int(m.group(), 8) & 0xFF); i += 1 + len(m.group())
            elif n in b"\r\n":
                i += 2
            else:
                out += n; i += 2
            continue
        if c == b"(":
            depth += 1
        elif c == b")":
            depth -= 1
            if depth == 0:
                return bytes(out)
        out += c; i += 1


def obj_body(b, num):
    """Newest definition of object `num` (last occurrence wins in an appended file)."""
    starts = [m.end() for m in re.finditer(rb"(?<![0-9])%d 0 obj" % num, b)]
    if not starts:
        raise KeyError(num)
    s = starts[-1]
    return s, b[s:b.index(b"endobj", s)]


def structure(b):
    """Structural facts only, through pypdf: the datasets object number and the original
    /O, /P, /Length, /ID. These are unchanged inputs; the bytes under test are not read here."""
    import io
    import pypdf
    r = pypdf.PdfReader(io.BytesIO(b))
    e = r.trailer["/Encrypt"].get_object()
    x = r.trailer["/Root"]["/AcroForm"]["/XFA"]
    ref = {str(x[i]): x[i + 1] for i in range(0, len(x) - 1, 2)}["datasets"]
    return {"num": ref.idnum, "O": bytes(e["/O"].original_bytes)[:32], "P": int(e["/P"]),
            "length": int(e.get("/Length", 40)) // 8, "id0": bytes(r.trailer["/ID"][0].original_bytes),
            "encrypt_metadata": bool(e.get("/EncryptMetadata", True))}


def file_key(st):
    h = hashlib.md5(PAD + st["O"] + struct.pack("<i", st["P"]) + st["id0"])
    if not st["encrypt_metadata"]:
        h.update(b"\xff\xff\xff\xff")
    key = h.digest()
    for _ in range(50):
        key = hashlib.md5(key[: st["length"]]).digest()
    return key[: st["length"]]


def stream_data(b, num, key, after):
    """Decrypt object `num` as written in the appended part of the file (offset >= after)."""
    m = list(re.finditer(rb"(?<![0-9])%d 0 obj" % num, b[after:]))
    if not m:
        raise KeyError(f"object {num} not in the appended update")
    s = after + m[-1].end()
    body = b[s:b.index(b"stream", s)]
    length = int(re.search(rb"/Length\s+(\d+)", body).group(1))
    raw_start = b.index(b"stream", s) + len(b"stream")
    raw_start += 2 if b[raw_start:raw_start + 2] == b"\r\n" else 1
    raw = b[raw_start:raw_start + length]
    ok = hashlib.md5(key + struct.pack("<I", num)[:3] + b"\x00\x00" + b"sAlT").digest()[: min(len(key) + 5, 16)]
    dec = Cipher(algorithms.AES(ok), modes.CBC(raw[:16])).decryptor()
    plain = dec.update(raw[16:]) + dec.finalize()
    plain = plain[: -plain[-1]]
    return zlib.decompress(plain)


def value_at(data, path):
    node = data
    for s in path.split("."):
        m = STEP.match(s)
        name, idx = (m.group(1), m.group(2)) if m else (s, "0")
        kids = [c for c in node if c.tag == name]
        idx = 0 if idx == "*" else int(idx)
        if len(kids) <= idx:
            return None
        node = kids[idx]
    return node.text or ""


def main():
    results = json.loads((HERE / "e5-results.json").read_text())
    run = ROOT / results["run_folder"]
    out = {"method": "own key derivation (ISO 32000-1 Algorithm 2, R4) + cryptography AES-128-CBC + zlib on the appended stream bytes; pypdf used only for object numbers and the unchanged /O /P /ID",
           "run_folder": results["run_folder"], "checks": []}
    for form in results["forms"]:
        for r in form["runs"]:
            pdf = run / f"{form['form']}.{r['values']}.{r['mode']}.pdf"
            if r["mode"] == "full-rewrite" or not pdf.exists():
                continue
            b = pdf.read_bytes()
            values = json.loads((run / f"{form['form']}.{r['values']}.values.json").read_text())
            entry = {"form": form["form"], "values": r["values"], "mode": r["mode"]}
            try:
                st = structure(b)
                key = file_key(st)
                n = st["num"]
                data = ET.fromstring(stream_data(b, n, key, form["bytes"])).find(XDATA + "data")
                ok = sum(1 for p, v in values.items() if value_at(data, p) == v)
                entry.update({"datasets_object": n, "written": len(values), "equal": ok})
            except Exception as e:  # recorded, never hidden
                entry["error"] = f"{type(e).__name__}: {e}"[:200]
            out["checks"].append(entry)
            print(entry)
    (HERE / "e5-independent-readback.json").write_text(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
