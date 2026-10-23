"""Reads what an uploaded government file is, from the file itself (P-25, P-51: no AI, no file-name guessing), for the
one form intake. A PDF's code comes from the document title ("IMM 1295 E: Application for work permit…"), else from the
most frequent form code in its own text; the edition is the most frequent "(MM-YYYY)" printed next to that code in the
XFA template or the first page ("IMM 1295 (09-2023) E"); the published date is the date the file says it was last
saved (its ModDate, else CreationDate). Kind: "checklist" when its title or first page says document checklist,
"guide" when they say guide or instructions, otherwise "form". An HTML page (a saved canada.ca page) is a guide: its
title, a form code in that title and its "date modified"; a page with two or more question inputs is a saved portal
screen ("portal_screen", F1), which belongs in a portal capture, not on a combination's sources. Prints one JSON line: {ok, kind, code, edition, edition_label,
title, published} or {ok: false, error, ...}. The file is opened as data only; nothing in it is executed.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_form_identity.py <file>
"""
import html
import json
import logging
import re
import sys
from collections import Counter

logging.disable(logging.CRITICAL)
from pypdf import PdfReader  # noqa: E402

CODE = r"(IMM|CIT|EMP|PRC|IRM)\s?(\d{4})"


def texts(reader):
    out = []
    try:
        form = reader.trailer["/Root"].get("/AcroForm")
        xfa = form.get_object().get("/XFA") if form else None
        if xfa is not None:
            xfa = xfa.get_object()
            parts = [xfa[i + 1].get_object().get_data() for i in range(0, len(xfa), 2)] if isinstance(xfa, list) else [xfa.get_data()]
            out.extend(p.decode("utf8", "replace") for p in parts)
    except Exception:  # an unusual XFA layout: fall back to the page text
        pass
    first = ""
    try:
        first = reader.pages[0].extract_text() or ""
    except Exception:
        pass
    out.append(first)
    return "\n".join(out), first


def kind_of(title, first):
    head = f"{title}\n{first[:600]}".lower()
    if "checklist" in head:
        return "checklist"
    if re.search(r"\bguide\b|\binstructions?\b", title.lower()):
        return "guide"
    return "form"


def pdf_date(meta):
    for k in ("/ModDate", "/CreationDate"):
        m = re.match(r"D:(\d{4})(\d{2})(\d{2})", str((meta or {}).get(k) or ""))
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    return None


def read_html(raw):
    text = raw.decode("utf8", "replace")
    m = re.search(r"<title[^>]*>(.*?)</title>", text, re.S | re.I)
    title = html.unescape(re.sub(r"\s+", " ", m.group(1))).strip() if m else ""
    title = re.sub(r"\s*-\s*Canada\.ca\s*$", "", title)
    d = re.search(r"(?:dateModified|dcterms\.modified|Date modified:)[^0-9]{0,40}(\d{4}-\d{2}-\d{2})", text, re.I)
    found = Counter(f"{a} {b}" for a, b in re.findall(CODE, title))  # a page names many forms: only its title says which it is
    kind = "checklist" if "checklist" in title.lower() else "guide"
    # F1: two or more question inputs (outside scripts and search forms) make it a saved portal screen, not a guide;
    # none of IRCC's public pages in the official library has one (23 Oct).
    body = re.sub(r"(?is)<(script|style|template|noscript)\b.*?</\1>", "", text)
    body = re.sub(r"(?is)<form[^>]*(?:role=[\"']?search|search)[^>]*>.*?</form>", "", body)
    inputs = [a for a in re.findall(r"(?is)<(?:input|select|textarea)\b([^>]*)>", body) if not re.search(r"type\s*=\s*[\"']?(hidden|submit|button|reset|image|search)", a, re.I)]
    # One question holding an answer (a typed value, a tick, a chosen option, text in a text area) is a saved portal
    # screen too: a page with a client's answer is never kept as a guide (CHECK fix, 23 Oct).
    answered = any(re.search(r"\b(checked|selected)\b", a, re.I) or re.search(r"\bvalue\s*=\s*[\"']?[^\"'\s>]", a, re.I) and not re.search(r"type\s*=\s*[\"']?(radio|checkbox|file)", a, re.I) for a in inputs)
    answered = answered or bool(re.search(r"(?is)<textarea\b[^>]*>\s*\S", body)) or bool(re.search(r"(?is)<option\b[^>]*\bselected\b", body))
    if len(inputs) >= 2 or answered:
        kind = "portal_screen"
    return {"ok": True, "kind": kind, "code": found.most_common(1)[0][0] if found else None, "edition": None, "edition_label": None,
            "title": title or "Untitled page", "published": d.group(1) if d else None}


def main(path):
    with open(path, "rb") as f:
        raw = f.read()
    if raw[:5] != b"%PDF-":
        if re.match(rb"\s*(<!doctype html|<html)", raw[:512], re.I):
            return read_html(raw)
        return {"ok": False, "error": "not a PDF or a saved web page"}
    reader = PdfReader(path)
    title = str((reader.metadata or {}).get("/Title") or "").strip()
    body, first = texts(reader)
    published = pdf_date(reader.metadata)
    kind = kind_of(title, first)
    m = re.match(CODE, title)
    if m:
        code = f"{m.group(1)} {m.group(2)}"
    else:
        found = Counter(f"{a} {b}" for a, b in re.findall(CODE, body))
        if not found:
            return {"ok": False, "error": "no form code (for example IMM 1295) found in the file", "title": title, "kind": kind, "published": published}
        code = found.most_common(1)[0][0]
    if re.search(r"schedule\s*1\b", title, re.I):
        code += " SCH1"
    digits = code.split()[1]
    editions = Counter(re.findall(rf"{code.split()[0]}\s?{digits}\s?E?\s*\((\d{{2}}-\d{{4}})\)", body))
    clean = re.sub(r"^" + CODE + r"\s*E?\s*:?\s*", "", title).strip() or code
    if not editions:
        return {"ok": False, "error": f"found {code} but no edition date such as (09-2023) printed next to it", "code": code, "title": clean, "kind": kind, "published": published}
    edition = editions.most_common(1)[0][0]
    return {"ok": True, "kind": kind, "code": code, "edition": edition, "edition_label": f"{code} ({edition})", "title": clean, "published": published}


if __name__ == "__main__":
    try:
        print(json.dumps(main(sys.argv[1])))
    except Exception as e:  # unreadable or damaged file: say so, never crash the upload
        print(json.dumps({"ok": False, "error": f"the file could not be read ({type(e).__name__})"}))
