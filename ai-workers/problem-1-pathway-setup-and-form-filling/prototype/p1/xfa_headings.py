"""QA-206 (C3.4, C4.1; P-158, P-319): the printed heading each part of a form sits under, read from the official XFA form
itself (read only, no AI, US$0). Writes <form>.headings.json beside the inventory, so a proposed section is named by
the words printed on the form ("PERSONAL DETAILS" -> "Personal details"), never by the PDF's internal part name
("PageWrapper", "Five") and never by a form number in code.

A part (a page's subform) has a heading, in this order, all from the form's own text:
1. banner: the first text printed in the part that is all capital letters (4 to 60 characters, at most 8 words, a
   real word in it), a bold one first, with a trailing "(CONTINUED)" left out: "PERSONAL DETAILS", "US PR CARD". A
   notice that the space is for an office ("FOR OFFICE USE ONLY") is not a heading, nor the form's title (printed
   larger than the form's usual banner);
2. numbered: else, when the part's first printed text is bold and numbered, at most 60 characters, and no other
   numbered text is in the part ("7. Your declaration"), those words without the number: a part that holds
   questions 5 and 6 is not named after question 5;
3. carried: else, the banner of a heading-only part printed just before it on the same page (a part with a banner and
   no box a person fills, like "SectionHeader_DetailsOfVisit"), passed on through the parts that carried it; never
   the form's first banner, which is its title. A part
   after a part with boxes of its own is never given that part's heading: the form may print its own banner where
   this reader does not see it, and a wrong name is worse than none.
Anything else has no printed heading: the rules pass then says the name must be changed before Accept.

A banner is put in sentence case by the form's own spelling of each word: a word the form prints in small letters
somewhere is written so ("CARD" -> "card"); a word of one to three letters it never prints in small letters, or a
single letter, keeps its capitals ("US", "PR", "SECTION A"); a longer word it prints only with a capital after a
text's first word keeps that ("CANADA" -> "Canada"); any other word is written in small letters ("NOTICE").

Run from the project root with the prototype venv (no names: every form inventory in p1/inventory):
  .tools/solution-1-prototype/.venv/bin/python -I \
    ai-workers/problem-1-pathway-setup-and-form-filling/prototype/p1/xfa_headings.py [imm5257e.pdf ...]
"""
import collections
import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("xfa_inventory", HERE / "xfa_inventory.py")
inv = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(inv)

PARTS = ("subform", "subformSet", "area", "exclGroup")
CONTINUED = re.compile(r"\s*\(\s*continued\s*\)\s*$", re.I)
NUMBERED = re.compile(r"^\s*\d{1,2}\s*[.)]\s+(\S.*?)\s*:?\s*$")
OFFICE = re.compile(r"\buse only\b", re.I)
WORD = re.compile(r"[A-Za-zÀ-ſ]+(?:['’][A-Za-z]+)?")
DATE = re.compile(r"^(Y+|M+|D+)$", re.I)


def texts(el, ns):
    """The printed texts inside el, in document order, each with whether it is bold."""
    out = []
    for d in el.iter(ns + "draw"):
        t = inv.text_of(d.find(ns + "value"), ns)
        if t:
            f = d.find(ns + "font")
            rich = ET.tostring(d, encoding="unicode").replace(" ", "")
            size = re.match(r"[\d.]+", (f.get("size") if f is not None else None) or "")
            out.append((t, (f is not None and f.get("weight") == "bold") or "font-weight:bold" in rich, float(size.group(0)) if size else None))
    return out


def fills(part, ns):
    """Whether a part holds a box a person fills: a visible, bound field that is not a button, barcode or signature."""
    for f in part.iter(ns + "field"):
        if (f.get("presence") or "visible") != "visible":
            continue
        b = f.find(ns + "bind")
        if b is not None and b.get("match") == "none":
            continue
        ui = f.find(ns + "ui")
        kinds = {w.tag.replace(ns, "") for w in (ui if ui is not None else [])}
        if not kinds & {"button", "barcode", "signature"}:
            return True
    return False


def banner_of(t):
    t = CONTINUED.sub("", t).strip().rstrip(":-–").strip()
    letters = [c for c in t if c.isalpha()]
    if len(letters) < 4 or any(c.islower() for c in letters) or len(t) > 60 or len(t.split()) > 8 or OFFICE.search(t):
        return None
    # A date pattern ("YYYY-MM-DD") or a box's code is not a heading: some word has 3 letters, at least 2 different.
    if not any(len(w) >= 3 and len(set(w.lower())) >= 2 and not DATE.match(w) for w in WORD.findall(t)):
        return None
    return t


def spelling(tpl, ns):
    """Each word's spellings across the form's own printed text and captions, the first word of a text left out."""
    seen = collections.defaultdict(collections.Counter)
    for tag in ("draw", "caption"):
        for el in tpl.iter(ns + tag):
            for w in WORD.findall(inv.text_of(el.find(ns + "value"), ns))[1:]:
                if not w.isupper():
                    seen[w.lower()][w] += 1
    return seen


def sentence_case(banner, seen):
    first = [True]

    def one(m):
        w = m.group(0)
        forms = seen.get(w.lower(), {})
        after = banner[m.end():].lstrip()[:1]
        if len(w) == 1 and not first[0] and after in ("", ":", "-", "\u2013", ")"):
            out = w
        elif any(s == s.lower() for s in forms):
            out = w.lower()
        elif len(w) <= 3:
            out = w  # never printed in small letters: an abbreviation, kept as printed
        elif forms:
            out = forms.most_common(1)[0][0]
        else:
            out = w.lower()
        if first[0]:
            out = out[0].upper() + out[1:]
            first[0] = False
        return out

    return WORD.sub(one, banner)


def read(fname):
    parts, _ = inv.xfa_parts(inv.official(fname))
    tpl = ET.fromstring(parts["template"])
    ns = tpl.tag.split("}")[0] + "}"
    seen = spelling(tpl, ns)
    out = {}
    # The form's first banner is its title: it names the form, so it is never carried to the parts after it.
    title = None
    for page in tpl.find(ns + "subform"):
        if page.tag.replace(ns, "") not in PARTS:
            continue
        pname = page.get("name") or f"#{page.tag.replace(ns, '')}"
        carry = None  # (printed banner, part): a heading-only part's banner, for the parts printed after it
        for part in page:
            tag = part.tag.replace(ns, "")
            if tag not in PARTS:
                continue
            key = f"{pname}.{part.get('name') or '#' + tag}"
            ts = texts(part, ns)
            bs = [(banner_of(t), bold) for t, bold, _ in ts if banner_of(t)]
            b = next((x for x, bold in bs if bold), None) or next((x for x, _ in bs), None)  # a bold banner first
            # A numbered heading names one question: it names the part only when no other numbered text is in it.
            n = NUMBERED.match(ts[0][0]) if ts and ts[0][1] and len(ts[0][0]) <= 60 and sum(bool(NUMBERED.match(t)) for t, _, _ in ts) == 1 else None
            title = title or b
            if b:
                entry = {"heading": sentence_case(b, seen), "printed": b, "how": "banner"}
                carry = None if fills(part, ns) or b == title else (b, key)
            elif n:
                entry = {"heading": n.group(1)[0].upper() + n.group(1)[1:], "printed": ts[0][0], "how": "numbered"}
                carry = None
            elif carry:
                entry = {"heading": sentence_case(carry[0], seen), "printed": carry[0], "how": "carried", "from": carry[1]}
            else:
                entry = None
            if entry and key not in out:
                out[key] = entry
    full = json.loads((inv.OUT / (fname.replace(".pdf", "") + ".inventory.json")).read_text())
    return {
        "file": full["summary"]["file"], "sha256": full["summary"]["sha256"],
        "read_by": "prototype/p1/xfa_headings.py (the form's own XFA template: the text printed in each part; no AI)",
        "parts": out,
    }


def main():
    names = sys.argv[1:] or sorted(p.name.replace(".inventory.json", ".pdf") for p in inv.OUT.glob("imm*.inventory.json") if ".text." not in p.name)
    for fname in names:
        try:
            r = read(fname)
        except Exception as e:  # a form with no XFA template has no printed parts to read
            print(f"{fname}: not read ({e})")
            continue
        (inv.OUT / (fname.replace(".pdf", "") + ".headings.json")).write_text(json.dumps(r, indent=1, ensure_ascii=False) + "\n")
        hows = collections.Counter(p["how"] for p in r["parts"].values())
        print(f"{fname}: {len(r['parts'])} parts with a printed heading ({dict(hows)})")


if __name__ == "__main__":
    main()
