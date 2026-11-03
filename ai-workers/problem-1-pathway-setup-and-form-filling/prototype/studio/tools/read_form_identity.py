"""Reads what an uploaded government file is, from the file itself (P-25, P-51: no AI, no file-name guessing), for the
one form intake. A PDF's code comes from the document title ("IMM 1295 E: Application for work permit…"), else from the
most frequent form code in its own text; the edition is the most frequent "(MM-YYYY)" printed next to that code in the
XFA template or the first page ("IMM 1295 (09-2023) E"); the published date is the date the file says it was last
saved (its ModDate, else CreationDate). Kind: "checklist" when its title or first page says document checklist,
"guide" when they say guide or instructions, otherwise "form". An HTML page (a saved canada.ca page) is a guide: its
title, a form code in that title and its "date modified"; a page with two or more question inputs is a saved portal
screen ("portal_screen", F1), which belongs in a portal capture, not on a combination's sources. Prints one JSON line: {ok, kind, code, edition, edition_label,
title, published, language} or {ok: false, error, ...}. The file is opened as data only; nothing in it is executed.
Language (PDF hardening, 26 Oct): IRCC prints the language after the edition ("IMM 5257 (09-2023) E", French "… F") and in
the title ("IMM 5257 F : Demande …"); a French version has the same code and edition as the English one, so it is reported
as "fr" for the intake to hold rather than taken for the English edition. A password-protected file is said to be one.
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_form_identity.py <file>
C11.7 (P-297 (2)): a form code may end in DEP ("IMM 0008DEP (10-2024) E" is IMM 0008 DEP, never IMM 0008). When no edition
is printed next to the code, the edition IRCC's form template keeps in its own "Version" variable is read instead (XFA
<variables><text name="Version">05-2021</text>; IMM 5669 prints none). "edition_from" says which: "printed" or
"form_template". On 3 Nov the two agreed on every one of the 15 official files that carry both; the printed one wins.
C3.12 (FormEdition.published): "--dates <file> ..." reads only the published date of each file (no text extraction) and
prints one JSON object {path: "YYYY-MM-DD" | null | "?"}: null when the PDF names no date (a saved web page is not a
PDF, so it has none here), "?" when the file could not be read (break M2/m2: never taken for "no date").
  .tools/solution-1-prototype/.venv/bin/python -I studio/tools/read_form_identity.py --dates <file> [<file> ...]
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
# C11.7: the same, with the DEP suffix some IRCC forms carry ("IMM 0008DEP-E", "IMM 0008 DEP"); three groups.
CODE_DEP = CODE + r"(?:\s?(DEP)(?![A-Za-z]))?"
# C11.7: the edition IRCC's form template keeps in its own variables (Designer forms): <text name="Version">05-2021</text>.
TEMPLATE_VERSION = r"<text\s+name=\"Version\"\s*>\s*(\d{2}-\d{4})\s*</text"


def code_of(groups):
    """("IMM", "0008", "DEP") -> "IMM 0008 DEP"; ("IMM", "5669", "") -> "IMM 5669"."""
    return " ".join(g for g in groups if g)


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
    if "checklist" in head or "liste de contrôle" in head or "liste de controle" in head:
        return "checklist"
    if re.search(r"\bguide\b|\binstructions?\b|\bdirectives\b", title.lower()):
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
    found = Counter(code_of(g) for g in re.findall(CODE_DEP, title))  # a page names many forms: only its title says which it is
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
    if reader.is_encrypted:  # IRCC's own files open with the empty password; one that needs a password cannot be read
        try:
            opened = reader.decrypt("")
        except Exception:
            opened = 0
        if not opened:
            return {"ok": False, "error": "the file is password-protected, so nothing in it can be read; upload the unprotected PDF from IRCC", "kind": "unknown"}
    title = str((reader.metadata or {}).get("/Title") or "").strip()
    body, first = texts(reader)
    published = pdf_date(reader.metadata)
    kind = kind_of(title, first)
    m = re.match(CODE_DEP, title)
    if m:
        code = code_of(m.groups())
    else:
        found = Counter(code_of(g) for g in re.findall(CODE_DEP, body))
        if not found:
            return {"ok": False, "error": "no form code (for example IMM 1295) found in the file", "title": title, "kind": kind, "published": published}
        code = found.most_common(1)[0][0]
    if re.search(r"schedule\s*1\b", title, re.I):
        code += " SCH1"
    prefix, digits = code.split()[0], code.split()[1]
    # C11.7: "IMM 0008 DEP" is printed "IMM 0008DEP". Plain "IMM 0008" cannot take a DEP edition: after its digits only a
    # space, a hyphen and E or F may come before the "(", never "DEP".
    dep = r"\s?DEP" if code.endswith(" DEP") else ""
    editions = Counter(re.findall(rf"{prefix}\s?{digits}{dep}\s?-?[EF]?\s*\((\d{{2}}-\d{{4}})\)", body))
    clean = re.sub(r"^" + CODE_DEP + r"\s*(?:-\s*)?[EF]?(?:\s+GENERIC)?\s*:?\s*", "", title).strip() or code
    marks = Counter(re.findall(rf"{prefix}\s?{digits}{dep}\s?(?:\(\d{{2}}-\d{{4}}\))?\s?-?([EF])\b", f"{title}\n{body}"))
    language = "fr" if re.match(CODE_DEP + r"\s?-?F\b", title) or marks["F"] > marks["E"] else "en"
    edition_from = "printed"
    if not editions:
        # C11.7: nothing printed next to the code; the form template's own Version variable, when it has exactly one.
        versions = set(re.findall(TEMPLATE_VERSION, body))
        if len(versions) == 1:
            editions, edition_from = Counter(versions), "form_template"
    if not editions:
        return {"ok": False, "error": f"found {code} but no edition date such as (09-2023) printed next to it", "code": code, "title": clean, "kind": kind, "published": published}
    edition = editions.most_common(1)[0][0]
    return {"ok": True, "kind": kind, "code": code, "edition": edition, "edition_label": f"{code} ({edition})", "edition_from": edition_from, "title": clean, "published": published, "language": language}


def published_only(path):
    """C3.12: the published date alone, as main() reads it (the PDF's ModDate, else CreationDate)."""
    try:
        with open(path, "rb") as f:
            head = f.read(5)
        if head != b"%PDF-":
            return None  # break m5: a saved web page's "date modified" is not a published date of a file
        reader = PdfReader(path)
        if reader.is_encrypted:
            reader.decrypt("")
        return pdf_date(reader.metadata)
    except Exception:  # unreadable or damaged: said as such, never a crash and never "no date"
        return "?"


if __name__ == "__main__" and sys.argv[1:2] == ["--dates"]:
    print(json.dumps({p: published_only(p) for p in sys.argv[2:]}))
elif __name__ == "__main__":
    try:
        print(json.dumps(main(sys.argv[1])))
    except Exception as e:  # unreadable or damaged file: say so, never crash the upload
        print(json.dumps({"ok": False, "error": f"the file could not be read ({type(e).__name__})"}))
