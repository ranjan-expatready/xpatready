"""F1 slice 2b, evidence lane F5: a static form (IMM 5409, IMM 5476) shows its page fields, not its XFA data, in any
viewer that does not run XFA (Preview, browsers, possibly an upload checker). Writing only the form data left those
page fields empty until the file was opened and saved in Adobe. This module sets the page fields of the boxes written,
with their appearances, in the same append-only update as the form data, so the as-written file shows its values
everywhere. A dynamic form has no page fields for its boxes: nothing is set and the report says so.
  * text fields: the value with an appearance drawn in the field's own font and size (pypdf's text appearance), only
    when the page can draw it as it is: every letter in the font's encoding (WinAnsi: no Polish Ł, no Devanagari), one
    line, within the field's width and its maximum length. Otherwise the page field is left empty and the reason
    reported (the value stays in the form data, which Adobe shows): a "?" or a cut-off name is never drawn (break M1, M2);
  * radio groups and check boxes: the widget whose own option is the value is turned on, the others off; a value with
    no such widget is left unset and reported (never guessed);
  * every new or changed object is encrypted with the document's own key, as the form data stream is (E5 route), and
    the AcroForm dictionary itself is never changed (no NeedAppearances flag: the appearances are real);
  * the read-back reads what each appearance draws (the string in its text operator, decoded), not only the stored value.
Static or dynamic is read from the file: a static form has text or choice page fields, a dynamic one has none.
Uses pypdf private internals like the E5 writer: demonstration-only (implementation design §8)."""
import io
import re

import pypdf
from pypdf.generic import NameObject, TextStringObject


def _root(doc):
    return doc._root_object if isinstance(doc, pypdf.PdfWriter) else doc.trailer["/Root"]


def terminal_fields(doc):
    """Full field name -> field dictionary (reader or writer), for fields that hold a value."""
    out = {}

    def walk(ref, prefix):
        f = ref.get_object()
        name = f"{prefix}.{f['/T']}" if prefix and "/T" in f else (str(f["/T"]) if "/T" in f else prefix)
        kids = [k for k in f.get("/Kids", []) if "/T" in k.get_object()]
        if kids:
            for k in kids:
                walk(k, name)
        elif "/FT" in f or "/Parent" in f:
            out[name] = f
    for ref in _root(doc).get("/AcroForm", {}).get("/Fields", []):
        walk(ref, "")
    return out


def _ft(f):
    while f is not None:
        if "/FT" in f:
            return f["/FT"]
        f = f.get("/Parent").get_object() if "/Parent" in f else None
    return None


def is_static(doc):
    """A static form keeps text or choice page fields; a dynamic form draws everything from XFA and has none."""
    return any(_ft(f) in ("/Tx", "/Ch") for f in terminal_fields(doc).values())


def _inherited(f, key):
    while f is not None:
        if key in f:
            return f[key]
        f = f.get("/Parent").get_object() if "/Parent" in f else None
    return None


def _font(doc, f):
    """(font dictionary, size) from the field's default appearance (/DA), looked up in its or the form's resources."""
    da = str(_inherited(f, "/DA") or _root(doc)["/AcroForm"].get("/DA") or "")
    m = re.search(r"/([^\s/]+)\s+([\d.]+)\s+Tf", da)
    if not m:
        return None, 0.0
    dr = _inherited(f, "/DR") or _root(doc)["/AcroForm"].get("/DR") or {}
    font = dr.get_object().get("/Font", {}).get(f"/{m.group(1)}") if dr else None
    return (font.get_object() if font is not None else None), float(m.group(2))


def drawable(doc, f, value):
    """None when the page field can draw the value exactly; otherwise the reason it cannot (then it is not set)."""
    if re.search(r"[\r\n\t]", value):
        return "several lines: the page field draws one line (the value is in the form data, which Adobe shows)"
    maxlen = _inherited(f, "/MaxLen")
    if maxlen is not None and len(value) > int(maxlen):
        return f"longer than the page field's {int(maxlen)} characters"
    font, size = _font(doc, f)
    enc = str(font.get("/Encoding")) if font is not None else ""
    try:
        data = value.encode("cp1252") if enc == "/WinAnsiEncoding" else value.encode("ascii")
    except UnicodeEncodeError:
        return "letters the page font cannot draw (it would print ?); the value is in the form data, which Adobe shows"
    if size and font is not None:
        first, widths = int(font.get("/FirstChar", 0)), [float(w) for w in font.get("/Widths", [])]
        # Standard 14 fonts carry no widths here: 0.6 em a letter (Courier exactly, Helvetica wider than most letters).
        width = sum((widths[b - first] if 0 <= b - first < len(widths) else 600.0) if widths else 600.0 for b in data) * size / 1000
        rect = [float(x) for x in _widgets(f)[0]["/Rect"]]
        if width > abs(rect[2] - rect[0]) - 4:
            return "too long for the page field's width (it would be cut off); the value is in the form data, which Adobe shows"
    return None


def _widgets(f):
    kids = [k.get_object() for k in f.get("/Kids", [])]
    return kids or [f]


def _on_state(w):
    return next((k for k in w.get("/AP", {}).get("/N", {}) if k != "/Off"), None)


def set_page_fields(w, page_values):
    """Sets the page fields named in page_values (field name -> value) on writer w. Returns
    {"set": {name: value}, "unmatched": [names with no page field], "not_set": [{name, value, why}]}."""
    fields = terminal_fields(w)
    done, unmatched, not_set, text = {}, [], [], {}
    for name, value in page_values.items():
        f = fields.get(name)
        if f is None:
            unmatched.append(name)
            continue
        ft = _ft(f)
        if ft == "/Tx":
            why = drawable(w, f, value)
            if why:
                not_set.append({"name": name, "value": value, "why": why})
            else:
                text[name] = value
        elif ft == "/Btn":
            opts = [str(o) for o in f.get("/Opt", [])]
            kids = _widgets(f)
            # The widget whose own option is the value: by /Opt (radio groups, as the form exports it), else by its
            # on-state name (a check box whose on-state is the value).
            # (A field with /Opt is matched by /Opt only: "0" is not the widget whose on-state happens to be named /0, m1.)
            if opts:
                pick = kids[opts.index(value)] if value in opts and opts.index(value) < len(kids) else None
            else:
                pick = next((k for k in kids if _on_state(k) == f"/{value}"), None)
            if pick is None or _on_state(pick) is None:
                not_set.append({"name": name, "value": value, "why": "no page widget has this value as its own option"})
                continue
            on = _on_state(pick)
            for k in kids:
                k[NameObject("/AS")] = on if k is pick else NameObject("/Off")
            f[NameObject("/V")] = on
            done[name] = value
        else:
            not_set.append({"name": name, "value": value, "why": f"page field type {ft} is not written"})
    if text:
        # auto_regenerate=None: the AcroForm dictionary (NeedAppearances) is left as it is.
        w.update_page_form_field_values(None, text, auto_regenerate=None)
        done.update(text)
    return {"set": done, "unmatched": unmatched, "not_set": not_set}


def encrypt_changes(w, reader):
    """Encrypts every object the incremental writer will append (new, or changed since it was read) with the document
    key, as pypdf does not (its incremental encryption is switched off). Call last, just before w.write()."""
    if not reader.is_encrypted:
        return 0
    n = 0
    for i, obj in enumerate(w._objects):
        if obj is None or (i < len(w._original_hash) and obj.hash_bin() == w._original_hash[i]):
            continue
        ref = getattr(obj, "indirect_reference", None)
        enc = reader._encryption.encrypt_object(obj, i + 1, ref.generation if ref else 0)
        enc.indirect_reference = pypdf.generic.IndirectObject(i + 1, ref.generation if ref else 0, w)
        w._objects[i] = enc
        n += 1
    return n


def read_page_fields(pdf_bytes, names):
    """Each named page field's value as a fresh reader sees it (text: /V; buttons: the option whose widget is on)."""
    r = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    if r.is_encrypted:
        r.decrypt("")
    fields = terminal_fields(r)
    out = {}
    for name in names:
        f = fields.get(name)
        if f is None:
            out[name] = None
            continue
        if _ft(f) == "/Btn":
            kids = _widgets(f)
            opts = [str(o) for o in f.get("/Opt", [])]
            on = [i for i, k in enumerate(kids) if k.get("/AS") not in (None, "/Off")]
            out[name] = (opts[on[0]] if opts and on[0] < len(opts) else str(kids[on[0]]["/AS"])[1:]) if on else ""
            # A button shows its state only through an appearance it really has.
            if on and kids[on[0]]["/AS"] not in kids[on[0]].get("/AP", {}).get("/N", {}):
                out[name] = None
        else:
            # What each widget's appearance draws (the strings of its text operators), which must equal the stored value.
            v = f.get("/V")
            drawn = [_drawn(k) for k in _widgets(f)]
            stored = str(v) if isinstance(v, (TextStringObject, str)) else None
            out[name] = stored if stored is not None and all(d == stored for d in drawn) else (drawn[0] if drawn and drawn[0] is not None else None)
    return out


_ESC = {"n": "\n", "r": "\r", "t": "\t", "b": "\b", "f": "\f", "(": "(", ")": ")", "\\": "\\"}


def _drawn(widget):
    """The text a widget's normal appearance draws: its literal strings shown with Tj, decoded (WinAnsi)."""
    ap = widget.get("/AP", {}).get("/N")
    if ap is None:
        return None
    data = ap.get_object().get_data()
    out = []
    for m in re.finditer(rb"\(((?:\\.|[^\\)])*)\)\s*Tj", data, re.S):
        raw, buf, i = m.group(1), bytearray(), 0
        while i < len(raw):
            c = raw[i:i + 1]
            if c == b"\\" and i + 1 < len(raw):
                n = raw[i + 1:i + 2].decode("latin-1")
                buf += _ESC.get(n, n).encode("latin-1")
                i += 2
            else:
                buf += c
                i += 1
        out.append(bytes(buf).decode("cp1252", "replace"))
    return "".join(out)


def write_filled(original_bytes, ds_bytes, page_values):
    """The E5 append-only route (form data stream replaced, original bytes kept) plus the page fields, every appended
    object encrypted with the document key, /Encrypt and /Info carried into the appended trailer. Returns
    (bytes, page report, notes)."""
    reader = pypdf.PdfReader(io.BytesIO(original_bytes))
    if reader.is_encrypted:
        reader.decrypt("")
    w = pypdf.PdfWriter(reader, incremental=True)
    x = w._root_object["/AcroForm"]["/XFA"]
    ref = {str(x[i]): x[i + 1] for i in range(0, len(x) - 1, 2)}["datasets"]
    ref.get_object().set_data(ds_bytes)
    pages = set_page_fields(w, page_values) if page_values else {"set": {}, "unmatched": [], "not_set": []}
    n = encrypt_changes(w, reader)
    notes = [f"{n} appended objects encrypted with the document key (private pypdf API)"] if reader.is_encrypted else []
    buf = io.BytesIO()
    w.write(buf)
    out = buf.getvalue()
    if reader.is_encrypted:
        # pypdf's appended cross-reference stream omits /Encrypt (and /Info unless changed); without /Encrypt a strict
        # reader treats every original object as unencrypted (E5).
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
    return out, pages, notes
