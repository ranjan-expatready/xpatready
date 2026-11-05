"""QA-206 (C3.4, C4.1; P-158, P-319): the printed heading each part of a form sits under, read from the official XFA form
itself (read only, no AI, US$0). Writes <form>.headings.json beside the inventory, so a proposed section is named by
the words printed on the form ("PERSONAL DETAILS" -> "Personal details"), never by the PDF's internal part name
("PageWrapper", "Five") and never by a form number in code.

A part (a page's subform) has a heading, in this order, all from the form's own text, read in reading order (a part laid
out by position top to bottom, a flowing part in its own order):
1. banner: the part's first text with words in it (an office notice and a box's small label, not bold and 4 words or
   fewer, left out), when it is all capital letters (4 to 60 characters, at most 8
   words), a trailing "(CONTINUED)" and a note in brackets ("(Include ALL sons and daughters ...)") left out:
   "PERSONAL DETAILS", "US PR CARD", "SECTION B - CHILDREN". A notice that the space is for an office ("FOR OFFICE
   USE ONLY") is not a heading, and a banner printed further down the part is not the heading of its boxes;
2. numbered: else, when that first text is bold and numbered, at most 60 characters, and no other numbered text is
   in the part ("7. Your declaration"), those words without the number: a part that holds questions 5 and 6 is not
   named after question 5;
3. titled: else, when that first text is bold rich text whose first paragraph is a short phrase (at most 60
   characters, 8 words) and whose later paragraphs are the normal-weight question it heads, that phrase: IMM 5257
   SCH1's "Military Service", "Government Positions", "Previous Travel" (tech lead on #883, option C);
5. form title: when no part of the form has any heading above, every part that holds fields takes the form's own
   printed title (its largest bold all-capital text, 10 pt or more, not a note in brackets), as one section: IRM
   0002's "REQUEST FOR A CHANGE OF SEX OR GENDER IDENTIFIER". A part under an office notice never takes it;
4. carried: else, the banner of a heading-only part printed just before it on the same page (a part with a banner and
   no box a person fills, like "SectionHeader_DetailsOfVisit"), passed on while the parts after it go on printing
   questions (a question number, or a lettered item "a) ..."). A part with no question of its own (a consent, a
   declaration, a signature) is not given it, and ends the carry. Never across a page; never the form's first banner,
   which is its title.
6. titled before (B79b): on a page where none of the rules above names any part, each part, and each box straight on the
   page, takes the numbered title printed just before it on that page ("7. Education", then IMM 5669's education boxes
   and table), or its own numbered caption ("3. Date of birth"), those words without the number: the boxes after one
   title are one section ("from": that title's text). A page that gives one name to two parts is not read this way.
   A numbered text too long to be a title (a question) ends it, so the boxes after it have no heading. A part's own
   first text is left alone: only the page's own texts between its parts are read. An office part never takes it.
A form whose pages sit inside one unnamed wrapper (IMM 5669's "#subform") is read from those pages, as the inventory's
parts are read (api/src/form-masters.ts WRAPPER).
A banner printed "(CONTINUED)" is marked "continues": its boxes are one section with the part of that heading before it.
A child part whose first text is its own bold banner is listed under "sub" with that heading: its boxes are a section
of their own (IMM 1295 prints "EMPLOYMENT" inside the wrapper that starts with "EDUCATION"), unless it splits into
two or more parts that each print their own banner (rows of people: the first row's label does not name the others).
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


UNIT = {"mm": 72 / 25.4, "in": 72.0, "pt": 1.0, "cm": 72 / 2.54}


def y_of(el):
    m = re.match(r"\s*(-?[\d.]+)\s*(mm|in|pt|cm)?", el.get("y") or "0")
    return float(m.group(1)) * UNIT[m.group(2) or "in"] if m else 0.0


# A text's printed title (QA-206, tech lead on #883, option C): a rich text whose first paragraph is a bold short phrase
# and whose later paragraphs are the normal-weight question it heads (IMM 5257 SCH1: "Military Service", then "Did you
# serve …"). Filled by texts(), keyed by the whole text.
TITLES = {}
XHTML = "{http://www.w3.org/1999/xhtml}"


def title_of(v):
    """The bold first paragraph of a rich-text value, when the paragraphs after it are of normal weight; else None."""
    body = next((b for b in v.iter() if b.tag == XHTML + "body"), None)
    paras = [p for p in (body if body is not None else []) if p.tag == XHTML + "p"]
    words = lambda p: " ".join("".join(p.itertext()).split())
    filled = [p for p in paras if words(p)]
    if len(filled) < 2 or "font-weight:normal" in (filled[0].get("style") or "").replace(" ", ""):
        return None
    if not all("font-weight:normal" in (p.get("style") or "").replace(" ", "") for p in filled[1:]):
        return None
    t = words(filled[0]).rstrip(":").strip()
    return t if 4 <= len(t) <= 60 and len(t.split()) <= 8 and sum(c.isalpha() for c in t) >= 4 else None


def texts(el, ns):
    """The printed texts inside el in reading order, each with whether it is bold and its size. A part laid out by
    position (no flowing layout) is read top to bottom by each child's y; a flowing part in its own order. A picture
    (an image value) is not text."""
    out = []
    kids = [c for c in el if c.tag.replace(ns, "") in ("draw",) + PARTS]
    if (el.get("layout") or "position") == "position":
        kids = sorted(kids, key=y_of)  # stable: same y keeps the form's order
    for d in kids:
        if d.tag.replace(ns, "") != "draw":
            out.extend(texts(d, ns))
            continue
        v = d.find(ns + "value")
        if v is None or v.find(ns + "image") is not None:
            continue
        t = inv.text_of(v, ns)
        if t:
            f = d.find(ns + "font")
            rich = ET.tostring(d, encoding="unicode").replace(" ", "")
            size = re.match(r"[\d.]+", (f.get("size") if f is not None else None) or "")
            bold = (f is not None and f.get("weight") == "bold") or "font-weight:bold" in rich
            out.append((t, bold, float(size.group(0)) if size else None))
            tt = title_of(v) if bold else None
            if tt:
                TITLES[t] = tt
    return out


def texts_all(tpl, ns):
    """Every printed text of the form, wherever it is (master pages too), with whether it is bold and its size."""
    out = []
    for d in tpl.iter(ns + "draw"):
        v = d.find(ns + "value")
        if v is None or v.find(ns + "image") is not None:
            continue
        t = inv.text_of(v, ns)
        if t:
            f = d.find(ns + "font")
            size = re.match(r"[\d.]+", (f.get("size") if f is not None else None) or "")
            out.append((t, f is not None and f.get("weight") == "bold", float(size.group(0)) if size else None))
    return out


def lettered(t):
    """A text with words in it (4 letters or more), not a number, a box's letter or a date pattern."""
    return sum(c.isalpha() for c in t) >= 4 and any(len(w) >= 3 and not DATE.match(w) for w in WORD.findall(t))


# A question printed in a part: a bare question number ("2") or a lettered item ("a) Have you ...").
QUESTION = re.compile(r"^\s*(\d{1,2}|[a-z]\))(\s|$)")


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
    t = CONTINUED.sub("", t).strip()
    # A note in brackets after the heading ("SECTION B - CHILDREN (Include ALL sons and daughters ...)") is not part of it.
    t = re.sub(r"\s*\([^)]*[a-z][^)]*(\)|$).*$", "", t).strip().rstrip(":-–").strip()
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
        before = banner[:m.start()][-1:]
        if len(w) == 1 and before == "(" and after == ")":
            out = w.lower()  # "DEPENDANT(S)" -> "Dependant(s)"
        elif len(w) == 1 and not first[0] and after in ("", ":", "-", "\u2013", ")"):
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


def pages_of(root, ns):
    """The form's pages: the root's parts, except that an unnamed part holding named pages ("#subform" over page1,
    page2, …: IMM 5669) is not a page itself, its pages are (B79b)."""
    for page in root:
        if page.tag.replace(ns, "") in PARTS and not page.get("name") and any(
                c.tag.replace(ns, "") in PARTS and re.match(r"(?i)^page\d*$", c.get("name") or "") for c in page):
            yield from page
        else:
            yield page


def numbered_title(d, ns):
    """A draw's numbered title ("7. Education" -> "Education"), "" for a numbered text too long to be one (a question,
    which ends the title before it), or None for any other draw (B79b, rule 6)."""
    v = d.find(ns + "value")
    if v is None or v.find(ns + "image") is not None:
        return None
    t = " ".join((inv.text_of(v, ns) or "").split())
    if not re.match(r"^\d{1,2}\s*[.)]\s", t):
        return None
    f = d.find(ns + "font")
    bold = f is not None and f.get("weight") == "bold"
    # Rich text: the title is its first filled paragraph, printed bold (its own style, or the draw's bold font not undone
    # there): IMM 5669's "7. Education" over the normal-weight question. Plain text: the whole text, bold.
    body = next((b for b in v.iter() if b.tag == XHTML + "body"), None)
    paras = [(" ".join("".join(q.itertext()).split()), (q.get("style") or "").replace(" ", "")) for q in (body if body is not None else []) if q.tag == XHTML + "p"]
    paras = [x for x in paras if x[0]]
    first, style = paras[0] if paras else (t, "")
    m = NUMBERED.match(first) if len(first) <= 60 and ("font-weight:bold" in style or (bold and "font-weight:normal" not in style)) else None
    return m.group(1) if m and lettered(m.group(1)) else ""


def titled_before(page, pname, ns, seen):
    """Rule 6 (B79b): each part and each box straight on the page under the numbered title printed just before it."""
    kids = [c for c in page if c.tag.replace(ns, "") in ("draw", "field") + PARTS]
    if (page.get("layout") or "position") == "position":
        kids = sorted(kids, key=y_of)
    # A page that gives one name to two boxes or parts (IMM 5532's four "Table1" tables) is not read: the inventory cannot
    # tell them apart, and a few named parts would draw the page's other boxes into them (the placement step's
    # nearest-box rule, api/src/form-part-placements.ts). Its parts stay held for a person to name.
    if any(k > 1 for k in collections.Counter(c.get("name") for c in kids if c.tag.replace(ns, "") != "draw").values()):
        return {}
    out, at = {}, None
    for c in kids:
        tag = c.tag.replace(ns, "")
        if tag == "draw":
            n = numbered_title(c, ns)
            if n is not None:
                at = (n, " ".join(inv.text_of(c.find(ns + "value"), ns).split())[:300], f"{pname}.{c.get('name') or '#draw'}") if n else None
            continue
        # A box that prints its own numbered caption ("3. Date of birth") starts its own title, from its own words.
        cap = c.find(ns + "caption") if tag == "field" else None
        cv = cap.find(ns + "value") if cap is not None else None
        ct = " ".join((inv.text_of(cv, ns) or "").split()) if cv is not None else ""
        cm = NUMBERED.match(ct) if len(ct) <= 60 else None
        if cm and lettered(cm.group(1)):
            at = (cm.group(1), ct, f"{pname}.{c.get('name')}")
        if not at or not c.get("name"):
            continue
        if tag in PARTS and (not fills(c, ns) or OFFICE.search(next((t for t, _, _ in texts(c, ns) if lettered(t)), ""))):
            continue
        out.setdefault(f"{pname}.{c.get('name')}", {"heading": sentence_case(at[0], seen), "printed": at[1], "how": "titled_before", "from": at[2]})
    return out


def read(fname):
    parts, _ = inv.xfa_parts(inv.official(fname))
    tpl = ET.fromstring(parts["template"])
    ns = tpl.tag.split("}")[0] + "}"
    seen = spelling(tpl, ns)
    out = {}
    # The form's first banner is its title: it names the form, so it is never carried to the parts after it.
    title = None
    for page in pages_of(tpl.find(ns + "subform"), ns):
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
            # Skipped: an office notice ("OFFICE USE ONLY") and a box's small label (not bold, 4 words or fewer).
            words = [x for x in ts if lettered(x[0]) and not OFFICE.search(x[0]) and (x[1] or len(x[0].split()) > 4)]
            # The heading the boxes sit under is the part's first text with words in it, in reading order: a banner
            # printed further down (IMM 5645's "SECTION D - CERTIFICATION" at the foot of Section C) is not it.
            b = banner_of(words[0][0]) if words else None
            # A numbered heading names one question: it names the part only when no other numbered text is in it.
            n = NUMBERED.match(words[0][0]) if words and words[0][1] and len(words[0][0]) <= 60 and sum(bool(NUMBERED.match(t)) for t, _, _ in ts) == 1 else None
            asks = any(QUESTION.match(t) for t, _, _ in ts)
            title = title or b
            if b:
                entry = {"heading": sentence_case(b, seen), "printed": b, "how": "banner", **({"continues": True} if CONTINUED.search(words[0][0]) else {})}
                carry = None if fills(part, ns) or b == title else (b, key)
            elif n:
                entry = {"heading": n.group(1)[0].upper() + n.group(1)[1:], "printed": words[0][0], "how": "numbered"}
                carry = None
            elif words and words[0][1] and TITLES.get(words[0][0]):
                # titled (option C): the part's first text is a question under its own bold printed title.
                tt = TITLES[words[0][0]]
                entry = {"heading": sentence_case(tt, seen), "printed": tt, "how": "titled"}
                carry = None
            elif carry and asks:
                # The questions printed under a heading-only part's banner go on in the parts after it; a part with no
                # question of its own (a consent, a declaration, a signature) is not given it, and ends the carry.
                entry = {"heading": sentence_case(carry[0], seen), "printed": carry[0], "how": "carried", "from": carry[1]}
            else:
                entry, carry = None, None
            # A child part that prints its own bold banner first (IMM 1295's "EMPLOYMENT" inside the wrapper that starts
            # with "EDUCATION"; IMM 5257's "PASSPORT" inside page 2's personal details) is a section of its own: its
            # boxes sit under that banner, not under the part's first one.
            def first_banner(el):
                w = [x for x in texts(el, ns) if lettered(x[0]) and not OFFICE.search(x[0]) and (x[1] or len(x[0].split()) > 4)]
                return banner_of(w[0][0]) if w and w[0][1] else None

            sub = {}
            for c in part:
                if c.tag.replace(ns, "") not in PARTS:
                    continue
                cb = first_banner(c)
                # A child that itself splits into parts each printing their own banner (IMM 5406's SectionAinfo: one row
                # each for the applicant, spouse and parents) is not named by its first row's label (review r3 M5).
                rows = sum(1 for g in c if g.tag.replace(ns, "") in PARTS and first_banner(g))
                if cb and cb != b and rows < 2 and (c.get("name") or "") and c.get("name") not in sub:
                    sub[c.get("name")] = {"heading": sentence_case(cb, seen), "printed": cb}
            if sub:
                entry = {**(entry or {"heading": None, "how": "none"}), "sub": sub}
            if entry and key not in out:
                out[key] = entry
        # Rule 6 (B79b): a page none of the rules above named a part of reads the numbered titles between its parts.
        if not any(k.startswith(f"{pname}.") for k in out):
            out.update(titled_before(page, pname, ns, seen))
    # A form that prints no heading over any of its parts (IRM 0002, a one-page statement): every field sits under the
    # form's own printed title, its largest bold all-capital text (tech lead on #883: names only from print). The parts
    # are one section under it. Never when any part has a heading of its own.
    if not out:
        # The title: bold, all capitals, at most 12 words, printed at 10 pt or more, not a note in brackets
        # ("(DISPONIBLE EN FRANÇAIS - IRM 0002 F)"); the largest such text.
        def as_title(t):
            t = " ".join(t.split()).rstrip(":").strip()
            letters = [c for c in t if c.isalpha()]
            return t if not t.startswith("(") and len(letters) >= 4 and not any(c.islower() for c in letters) and len(t) <= 90 and len(t.split()) <= 12 else None
        tops = [(z, as_title(t)) for t, bold, z in texts_all(tpl, ns) if bold and z and z >= 10 and as_title(t)]
        if tops:
            ft = max(tops, key=lambda x: x[0])[1]
            for page in pages_of(tpl.find(ns + "subform"), ns):
                if page.tag.replace(ns, "") not in PARTS:
                    continue
                pname = page.get("name") or f"#{page.tag.replace(ns, '')}"
                for part in page:
                    # A part under an office notice ("FOR OFFICE USE ONLY") holds the office's fields, not the
                    # client's: it never takes the form's title, and stays held (review r10 M9: IMM 5604's file no.).
                    first = next((t for t, _, _ in texts(part, ns) if lettered(t)), "")
                    if part.tag.replace(ns, "") in PARTS and fills(part, ns) and not OFFICE.search(first):
                        out.setdefault(f"{pname}.{part.get('name') or '#' + part.tag.replace(ns, '')}", {"heading": sentence_case(ft, seen), "printed": ft, "how": "form_title", "from": "#form.title"})
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
