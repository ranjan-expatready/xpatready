# Preservation ledger: draft 1 → draft 2 of the Solution 1 one-pager.
# Every draft 1 rule, principle, case-type row and measure gets a disposition (keep, correct, move, remove), a reason and
# its new location. Rules kept word for word are found automatically; every other one must be listed below or run() fails.
# Actions, screens, outputs and alternates are dispositioned per activity (ACTIVITY_MAP). Writes the ledger to checks/.
import os, runpy, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OLD = os.path.abspath(os.path.join(ROOT, "..", "archive", "ai-workers", "s3_data-v3-draft1-2026-10-17.py"))
OUT = os.path.join(ROOT, "checks", "one-pager-draft-2-preservation-2026-10-17.md")
sys.path.insert(0, HERE)
import s3_data as D

# old activity id → new home (activity id, or the record that replaced it)
ACTIVITY_MAP = {
    "0.1": ("record: Configuration library", "move", "A library is a data store, not a task; its rules now sit on the record."),
    "1.1": ("1.1", "correct", "Portal capture moved to its own optional step 1.2; trigger now includes the 'not yet supported' alert."),
    "1.2": ("1.3", "move", "Renumbered: the run comes after the optional portal capture."),
    "2.1": ("2.1", "correct", "Field count check replaced by a page-by-page widget check; multi-instance per new edition."),
    "2.2": ("2.2", "correct", "An unreadable source is held, not the whole run."),
    "2.3": ("1.2", "move", "Portal capture is an optional step before the run, not a parallel branch the run waits for."),
    "3.1": ("3.1", "correct", "Form limits move to the mapping; every new match reviewed."),
    "3.2": ("3.2", "correct", "'Box address' becomes the form field mapping with person, relationship, purpose and row."),
    "3.3": ("3.3", "correct", "Shared upload needs an identity and applicability check."),
    "3.4": ("3.4", "correct", "Section reuse by meaning; no 'union'; adds 'collected from'."),
    "3.5": ("3.5", "correct", "Passage completeness is checked independently (4.3)."),
    "3.6": ("3.6", "keep", "Content kept; example added."),
    "3.7": ("3.7", "correct", "Staff-only tier replaced by 'collected from'."),
    "4.1": ("4.1", "correct", "Renamed 'Check structure and references'; a blocking finding holds affected items."),
    "4.2": ("4.3", "correct", "Renumbered; bars replaced by independent expected answers and three separate columns."),
    "5.1": ("5.1", "correct", "Every new or changed item reviewed during initial validation."),
    "5.2": ("5.2", "keep", "Content kept; reuse of confirmed unchanged rules added."),
    "5.3": ("5.3", "keep", "Content kept; 'mapping released' message added."),
    "6.1": ("6.1", "keep", "Content kept."),
    "6.2": ("6.2 and 6.3", "correct", "Output is candidate matches; the staff decision is its own step 6.3."),
    "7.1": ("7.1", "keep", "Content kept; per-person row rule added."),
    "7.2": ("7.2", "keep", "Content kept; uploads named in the title."),
    "7.3": ("7.3", "correct", "Multi-instance per upload; past cases test mappings against independent answers."),
    "8.1": ("8.1", "correct", "'Only place a fact is typed' becomes 'only staff editing surface'."),
    "8.2": ("8.2", "correct", "Moves to the form-copy pool; 'not yet supported' status added; its alternate moves to 10.3."),
    "9.1": ("9.1", "correct", "Read-back of every written value added; meaning checked separately in 8.3."),
    "9.2": ("9.2 and 8.4", "correct", "Typing refused fields added; 'check every copy' moves to the agent's review 8.4."),
    "9.3": ("9.3, 9.4 and 9.5", "correct", "Approval, signing and submission are separate people and steps."),
    "9.4": ("9.6 and the Government pool", "move", "Government is a black-box pool; the firm records each message in 9.6."),
    "10.1": ("10.1", "correct", "Dependency impact and 'not verified' added."),
    "10.2": ("10.2", "correct", "Drawn as a call of views 2 and 3 on changed items."),
    "10.3": ("10.3", "keep", "Content kept; 'what changes for this file' moved in from 8.2."),
}

RULES = {
    ("0.1", 0): ("correct", "record: Configuration library", "Tier is lead, prospect or case only; 'collected from' is a separate setting; immigration-significant flag added."),
    ("0.1", 1): ("correct", "record: Configuration library; 3.4", "A field group may sit in different sections on different rows; sections reused by meaning."),
    ("0.1", 2): ("correct", "record: Configuration library; 2.1", "No per-form section layout map; the form's headings stay as read-only data on the inventory."),
    ("2.1", 2): ("correct", "2.1", "A fillable PDF publishes no independent count; completeness is checked page by page."),
    ("3.1", 2): ("correct", "3.1; 3.2", "The canonical meaning stays separate from one form's limits; limits live on the mapping."),
    ("3.1", 3): ("correct", "3.1", "Every new match is reviewed whatever its confidence; low confidence marks it for closer review."),
    ("3.2", 0): ("correct", "3.2", "Review every new or changed entry during initial validation; approved unchanged entries reused."),
    ("3.2", 3): ("remove", "2.1 (headings kept as inventory data)", "No section-to-section display layer is needed for filling; mappings reference fields and purposes."),
    ("3.3", 3): ("correct", "3.3", "Adds an identity and applicability check before one upload serves several people."),
    ("3.4", 1): ("correct", "3.4", "Same section for the same meaning; a group may sit in different sections on different rows."),
    ("3.4", 2): ("remove", "3.4", "'The union' contradicts reusable sections; replaced by the placement limits from the team's design."),
    ("3.7", 1): ("correct", "3.7", "'Staff-only facts' becomes 'facts collected from the staff working view or a profile record'."),
    ("3.7", 2): ("correct", "3.7; 7.2", "No staff-only tier; not every application number is staff-collected."),
    ("4.1", 0): ("correct", "4.1; 4.4", "A blocking finding holds the affected item and its dependents; release waits."),
    ("4.2", 0): ("remove", "4.4 (hold rule)", "Replaced: a failed check holds only the affected item and its dependents; a step is switched off only for a stated reason."),
    ("4.2", 1): ("remove", "4.3", "Replaced: acceptance criteria come from business consequences, not from the first measured run."),
    ("5.1", 0): ("correct", "5.1", "Rule matches on a new edition are new mappings and are reviewed, in a grouped list with evidence."),
    ("7.3", 1): ("correct", "7.3; Controls › AI processing", "Aligned to the founder's terms: written no-training and zero-data-retention, with client notice; stated once for every AI step."),
    ("7.3", 3): ("correct", "7.3", "Past cases test mappings against an independently checked expected answer."),
    ("8.1", 1): ("correct", "8.1", "'Boxes' renamed 'fields'."),
    ("8.1", 2): ("correct", "8.1", "The only staff editing surface; clients answer in the portal."),
    ("8.2", 1): ("correct", "8.2", "Adds the 'not yet supported' status."),
    ("8.2", 2): ("correct", "8.2; 8.4", "'Box' renamed 'field'; 'map flag' renamed 'mapping flag'."),
    ("9.1", 2): ("correct", "9.1", "'Map version' renamed 'mapping version'."),
    ("9.1", 3): ("correct", "9.1; 9.2", "'Boxes' renamed 'fields'; the list is typed in 9.2."),
    ("9.2", 1): ("correct", "9.2", "'Box' renamed 'field'."),
    ("10.1", 0): ("correct", "10.1", "Reuse only after a dependency check; 'boxes' renamed 'fields'."),
    ("10.2", 1): ("correct", "10.2", "'Box' renamed 'field'."),
}

PRINCIPLES = {
    "Code reads, AI judges, people decide": ("correct", "Principles strip: 'Repeatable code, with named limits'", "Read-back added; the code's named limits are listed under build gaps."),
    "Reuse first": ("keep", "Principles strip", "Word for word."),
    "Every item cites its source": ("correct", "Principles strip", "Adds version and location."),
    "Scored before trusted": ("correct", "Principles strip: 'Tested before trusted'", "No bars that switch a step off; criteria from business consequences."),
    "Versioned, pinned, reproducible": ("correct", "Principles strip", "Byte-identical only where proven (standard fillable PDFs)."),
    "No AI at fill time": ("correct", "Principles strip", "'Maps' renamed 'mappings'; the principle itself is kept."),
    "Expat Ready runs the engine": ("keep", "Principles strip", "Word for word."),
}

CASE_ROWS = {
    "Configure and build": ("correct", "'Boxes about others' renamed 'fields about others'; 'child 2' example is 'child 1'."),
    "Rules": ("keep", "Word for word."),
    "Questionnaires": ("keep", "Word for word."),
    "Documents": ("keep", "Word for word."),
    "Forms and maps": ("correct", "Renamed 'Forms and mappings'; 'box address' replaced by the mapping's person and relationship."),
    "Case": ("keep", "Word for word."),
}

MEASURES = {
    "Boxes read per form edition": ("correct", "Fields read per form edition", "The form publishes no own count; target is page-by-page completeness."),
    "Boxes matched by rule, by AI, proposed new": ("correct", "Fields matched by rule, by AI, proposed new", "'Boxes' renamed 'fields'."),
    "Items a person reviews per combination": ("correct", "Items a person reviews per combination", "Scope is every new or changed item."),
    "Precision and recall per AI step": ("correct", "Correctness per AI step", "Includes wrong-person cases; target, measured and criterion kept apart."),
    "Boxes typed by hand per family file": ("correct", "Fields typed by hand per family file", "Target split from the measured value; the type-by-hand list counted as known exceptions."),
    "Hours to configure one combination": ("keep", "Hours to configure one combination", "Baseline still not measured."),
}

def run(write=True):
    old = runpy.run_path(OLD)
    errs, rows = [], []
    def strip(r): return r[2:] if r[1:2] == "|" else r
    where = {}
    for a in D.ACTS:
        for r in a["rules"]: where.setdefault(strip(r), []).append(a["id"])
    for k, n, h, rules in D.RECORDS:
        for r in rules: where.setdefault(strip(r), []).append("record: " + n)
    count = 0
    for st in old["STEPS"]:
        for i, r in enumerate(st["rules"]):
            count += 1
            if r in where:
                rows.append((f"{st['id']} rule {i + 1}", r, "keep", ", ".join(where[r]), "Word for word."))
            elif (st["id"], i) in RULES:
                d, loc, why = RULES[(st["id"], i)]
                rows.append((f"{st['id']} rule {i + 1}", r, d, loc, why))
            else:
                errs.append(f"ledger: draft 1 rule {st['id']}#{i} has no disposition")
    newp = {t: s for t, s in D.PRINCIPLES}
    prow = []
    for t, s in old["PRINCIPLES"]:
        if t not in PRINCIPLES: errs.append(f"ledger: principle '{t}' has no disposition"); continue
        d, loc, why = PRINCIPLES[t]
        if d == "keep" and newp.get(t) != s: errs.append(f"ledger: principle '{t}' marked keep but changed")
        prow.append((t, d, loc, why))
    crow = []
    newc = {r[0]: r for r in D.CASE_TYPES}
    for r in old["CASE_TYPES"]:
        if r[0] not in CASE_ROWS: errs.append(f"ledger: case row '{r[0]}' has no disposition"); continue
        d, why = CASE_ROWS[r[0]]
        if d == "keep" and tuple(newc.get(r[0], ())) != tuple(r): errs.append(f"ledger: case row '{r[0]}' marked keep but changed")
        crow.append((r[0], d, why))
    mrow = []
    newm = {m[0] for m in D.MEASURES}
    for m in old["MEASURES"]:
        if m[0] not in MEASURES: errs.append(f"ledger: measure '{m[0]}' has no disposition"); continue
        d, loc, why = MEASURES[m[0]]
        if loc not in newm: errs.append(f"ledger: measure '{m[0]}' points at missing '{loc}'")
        mrow.append((m[0], d, loc, why))
    arow = []
    for st in old["STEPS"]:
        if st["id"] not in ACTIVITY_MAP: errs.append(f"ledger: activity {st['id']} has no disposition"); continue
        loc, d, why = ACTIVITY_MAP[st["id"]]
        arow.append((st["id"], st["title"], d, loc, why, len(st["actions"])))
    if count != 110: errs.append(f"ledger: expected 110 draft 1 rules, found {count}")
    if write:
        from collections import Counter
        c = Counter(r[2] for r in rows)
        L = ["# One-pager draft 2: preservation ledger", "",
             "17 October 2026 · generated by `tools/s3/s3_ledger.py` at every build · draft 1 archived whole as `archive/ai-workers/solution-1-one-pager-v3-draft1-2026-10-17.html` with its builder and data.", "",
             f"**Rules:** {count} draft 1 rules · keep {c['keep']} · correct {c['correct']} · move {c['move']} · remove {c['remove']}. "
             f"**Principles:** {len(prow)} · **case-type rows:** {len(crow)} (one row added: signing) · **measures:** {len(mrow)} (two added: runtime challenger, AI checker value). "
             f"**Activities:** 32 draft 1 records → {len(D.ACTS)} activities plus the configuration library record (3.8 and 10.4 added after the independent audit).", "",
             "A removed rule names what replaced it. Nothing was removed without a replacement or a stated reason.", "",
             "## Activities (actions, screens, outputs and alternates)", "", "| Draft 1 | Title | Disposition | Draft 2 location | Reason |", "|---|---|---|---|---|"]
        L += [f"| {a} | {t} | {d} | {loc} | {why} |" for a, t, d, loc, why, n in arow]
        L += ["", "## Rules", "", "| Draft 1 | Rule | Disposition | Draft 2 location | Reason |", "|---|---|---|---|---|"]
        L += [f"| {a} | {r.replace('|', '/')} | {d} | {loc} | {why} |" for a, r, d, loc, why in rows]
        L += ["", "## Principles", "", "| Draft 1 | Disposition | Location | Reason |", "|---|---|---|---|"] + [f"| {a} | {b} | {c_} | {d} |" for a, b, c_, d in prow]
        L += ["", "## Case-type rows", "", "| Row | Disposition | Reason |", "|---|---|---|"] + [f"| {a} | {b} | {c_} |" for a, b, c_ in crow]
        L += ["", "## Measures", "", "| Draft 1 | Disposition | Draft 2 | Reason |", "|---|---|---|---|"] + [f"| {a} | {b} | {c_} | {d} |" for a, b, c_, d in mrow]
        import html as _h, re as _re
        page = open(os.path.join(ROOT, "problem-1-pathway-setup-and-form-filling", "solution-1-one-pager.html")).read()
        page = _re.sub(r"<script(?! type='application/json').*?</script>", " ", page, flags=_re.S)
        plain = _re.sub(r"\s+", " ", _h.unescape(_re.sub(r"<[^>]+>", " ", page)))
        L += ["", "## Actions, screens, outputs and alternates", "",
              "Checked against the built page. Items not found word for word were reworded under their activity's disposition above (mostly 'box' → 'field', 'map' → 'mapping', 'staff-only' → 'collected from staff').", ""]
        for kind, label in (("actions", "Actions"), ("screen", "Screens"), ("output", "Outputs"), ("alt", "Alternates")):
            items = [(st["id"], x) for st in old["STEPS"] for x in (st[kind] if isinstance(st[kind], list) else [st[kind]])]
            missing = [(i, x) for i, x in items if x not in plain]
            L.append(f"- **{label}:** {len(items) - len(missing)} of {len(items)} word for word; reworded: " + ("; ".join(f"{i} '{x}' → {ACTIVITY_MAP[i][0]}" for i, x in missing) or "none"))
        L += ["", "## Moved off the page", "", "- The artefact list in draft 1's footer moved to the folder README.",
              "- Decision history, the disposition ledger and change notes stay off the page (this file, `decisions.md`, `PROGRESS.md`).", ""]
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        with open(OUT, "w") as f: f.write("\n".join(L))
    return errs

if __name__ == "__main__":
    e = run()
    print("\n".join(e) if e else f"ledger written: {os.path.relpath(OUT, ROOT)}")
