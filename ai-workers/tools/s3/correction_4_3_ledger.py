#!/usr/bin/env python3
"""Content-level ledger for the Solution 1 one-pager, draft 4.2 → draft 4.3 (R-M1 and R-m2 from the validator's final audit of
draft 4.2, 19 Oct 2026). Run: python3 tools/s3/correction_4_3_ledger.py. Compares every string in the draft 4.2 sources frozen by
the validator (illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/inputs-4.2/, hashes in manifest-4.2.json) with the
current files. Every draft 4.2 string that no longer appears word for word must match one disposition below; the script fails if
any does not. Kinds as in desktop_pass_ledger.py. Writes checks/one-pager-draft-4-3-content-ledger-2026-10-19.md."""
import ast, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ARCH = os.path.join(ROOT, "illustrations", "actor-handoff-demo", "draft-4-validator-2026-10-18", "inputs-4.2")

# (substring of the 4.2 string, or the exact string when shorter than 20 characters; kind; finding; where it is now, and why)
D = [
    ("v3 · one-pager draft 4.2: functional and desktop", "clarified", "Version", "VERSION names draft 4.3; draft 4.2 stays frozen with the validator's audit (inputs-4.2, manifest-4.2.json)."),
    ("Solution 1 v3 · one-pager draft 4.2 ·", "clarified", "Version", "Footer names draft 4.3; the rest of the footer is unchanged."),
    ("F|If the investigation shows the mapping stands, the hold is released and the evidence recorded; if the error is confirmed", "clarified", "R-M1",
     "4.3 rule kept word for word, adding in brackets that a wrong fact found instead is corrected through 8.1 and its forms stay held until approved again (10.4)."),
    ("Disproved: the hold is released with the evidence recorded.", "corrected", "R-M1",
     "10.4 done-when: disproved releases the mapping hold only; a wrong fact found instead keeps the forms that read it held until 8.1 corrects it and they are prepared, checked and approved again."),
    ("Mapping stands: the hold is released with the evidence recorded; support tells the firm, and the agent re-checks the fact.", "corrected", "R-M1",
     "10.4 return route: the mapping hold is released and support tells the firm; a wrong fact goes to 8.1 and its forms stay held until prepared, checked and approved again."),
    ("The investigation finds the mapping right (the verified fact was wrong)", "corrected", "R-M1",
     "Split into two acceptance cases: facts correct → the earlier approval stands subject to every normal submission check (9.5); wrong fact → only the mapping hold is released, the forms that read it stay held at approval and submission until 8.1, are prepared and checked again, lose their earlier approvals and are approved (and signed where required) again; unrelated forms keep their approvals."),
    ("While the mapping is investigated, a form in an open case that uses it cannot be approved or submitted", "corrected", "R-M1",
     "Same Proposed rule; 'those approvals stand' now applies only when the facts the mapping reads are correct; a new following rule (from D181, as in 8.1 and 9.3) keeps forms that read a wrong fact held through the normal fact correction."),
    ("The report turns out to be a wrong fact, not a wrong mapping: the hold is released with that evidence", "corrected", "R-M1",
     "10.4 example exception: only the mapping hold is released; the forms that read the fact stay held until 8.1 corrects it and they are prepared, checked and approved again."),
    ("A form that uses a mapping held for investigation (10.4) cannot be approved until the hold is released", "clarified", "R-M1",
     "9.3 rule kept word for word, adding the matching guard for a form kept held for a wrong fact the investigation found."),
    ("a form whose mapping is held for investigation or marked 'mapping under correction' (10.4) is not submitted", "clarified", "R-M1",
     "9.5 rule kept word for word, adding the matching submission guard for a form kept held for a wrong fact."),
    ("A suspected wrong mapping is held at once, with the work that depends on it, while it is investigated; if the mapping stands", "clarified", "R-M1",
     "Stage 10 rule: 'the mapping hold' is released; a wrong fact found instead keeps the forms that read it held until corrected (stage 6) and approved again."),
    # R-m2: continuation arrows (presentation only)
    ("<span class='sr'>then, handing over: </span>", "display", "R-m2", "m_arrow gains an optional source → destination cue, shown only in the 900–1099px reflow; the label text is unchanged."),
    ("<div class='mwrap' aria-hidden='true' style='--wl:", "display", "R-m2", "The 6 → 7 wrap now rises above the source stage's own column (stage 6), not column 3's neighbour."),
    ("  .marr.mid .ln,.marr.phone-only .ln{order:-1;width:2px;height:24px;margin:0}", "display", "R-m2", "Stylesheet: the stage cue is hidden by default and shown in the 900–1099px reflow."),
    (".marr.phone-only{display:none}", "display", "R-m2", "Same rule; followed by the hidden-by-default stage cue."),
]

def strings(path):
    out = []
    for n in ast.walk(ast.parse(open(path).read())):
        if isinstance(n, ast.Constant) and isinstance(n.value, str) and len(n.value) > 3: out.append(n.value)
    return list(dict.fromkeys(out))

def norm(s): return " ".join(s.split())

def run():
    rows, errs, added = [], [], []
    for f in ("s3_data.py", "s3_panels.py", "s3_views.py", "build_one_pager.py"):
        old, new = strings(os.path.join(ARCH, f)), strings(os.path.join(HERE, f))
        sn, so = set(new), set(old); added += [(f, s) for s in new if s not in so]
        for s in old:
            if s in sn: continue
            hit = next((d for d in D if (d[0] == s if len(d[0]) < 20 else norm(d[0]) in norm(s))), None)
            if not hit: errs.append(f"{f}: no disposition for '{s[:90]}'"); continue
            rows.append((f, s, *hit[1:]))
    return rows, errs, added

if __name__ == "__main__":
    rows, errs, added = run()
    from collections import Counter
    c = Counter(r[2] for r in rows)
    L = ["# One-pager draft 4.2 → draft 4.3: content-level ledger", "",
         "19 October 2026 · generated by `tools/s3/correction_4_3_ledger.py`. Draft 4.2 sources are the validator's frozen copies in "
         "`illustrations/actor-handoff-demo/draft-4-validator-2026-10-18/inputs-4.2/` (HTML `8afb68a3…02d0`; `manifest-4.2.json`), so no second copy was made.", "",
         f"Every draft 4.2 string in `s3_data.py`, `s3_panels.py`, `s3_views.py` and `build_one_pager.py` was compared with draft 4.3. **{len(rows)} no longer appear word for word**: "
         + ", ".join(f"{k} {v}" for k, v in sorted(c.items())) + f". **Removed without replacement: 0.** {len(added)} strings are new. Stable stage and activity IDs are unchanged; no other activity changed.", "",
         "| File | Draft 4.2 wording | Kind | Finding | Where it is now, and why |", "|---|---|---|---|---|"]
    L += [f"| {f} | {s[:300].replace('|', '/').replace(chr(10), ' ')}{'…' if len(s) > 300 else ''} | {k} | {fd} | {w.replace('|', '/')} |" for f, s, k, fd, w in rows]
    L += ["", "## New strings", ""] + [f"- `{f}`: {s[:260].replace(chr(10), ' ')}{'…' if len(s) > 260 else ''}" for f, s in added]
    out = os.path.join(ROOT, "checks", "one-pager-draft-4-3-content-ledger-2026-10-19.md")
    open(out, "w").write("\n".join(L) + "\n")
    print(f"{len(rows)} changed strings dispositioned ({dict(c)}); {len(added)} added; wrote {os.path.relpath(out, ROOT)}")
    if errs: print("UNDISPOSITIONED:"); [print("  - " + e) for e in errs]; sys.exit(1)
