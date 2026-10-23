#!/usr/bin/env python3
"""Check every live test against the QA-usable standard (AIW-D159; scrum 5).

Read-only. The five parts are stated in requirements/tests/run-next.md
("The test standard"); fixtures are defined once in requirements/tests/fixtures.csv.
This is a pattern check, not a proof: the checker also samples rewritten tests by eye.

Usage (from the repository root):
  python3 ai-workers/tools/check_tests.py [--root ai-workers] [--json FILE] [--list PART]
Exit code 0 always (it reports; it does not block).
"""
import argparse, collections, csv, json, os, re

PARTS = ["preconditions", "fixtures", "steps", "one result", "requirement"]

# Names that look like a fixture: these must be catalogued or introduced with "New:".
FIXTURE_NAME = re.compile(r"\b(?:Firm [A-Z]\b|Client [A-Z]\b|[Cc]ase C-\d+\b|[Ll]ead L-\d+\b|Ticket T-\d+\b|draft D-\d+\b|Form [A-Z]\b|Officer [A-Z]\b|user U-\d+\b)")
FIXTURE_ID = re.compile(r"\bFX-[A-Z0-9]+(?:-[A-Z0-9]+)*\b")
# A step after step 1 that makes an AI step produce something the tester cannot control: it needs the scripted model.
# 1) a verb that sets or triggers AI work; 2) the AI step named doing the thing that is being scripted.
AI_SETS = re.compile(r"\b(?:Let|Make|Force|Configure|Have)\b[^|]*?\b(?:Reader|Sorter|Writer|Checker|assistant|provider|model)\b|\bAsk the (?:Reader|Sorter|Writer|Checker)\b", re.I)
AI_DOES = re.compile(r"\b(?:Reader|Sorter|Writer|Checker|assistant|model)\s+(?:classif|propos|draft|return|rais|reads?\b|writ|attempt|follow|time|fail)", re.I)
RULES_ONLY = re.compile(r"in-session (?:filling )?component|filling component", re.I)
CHAINED = re.compile(r"^\s*(?:Continue|Repeat)\b", re.I)
# A first step that is an act, not a state, states no precondition.
ACT_FIRST = re.compile(r"^\s*(?:Sign in|Open|Propose|Let|Send|Click|Approve|Reject|Upload|Ask|Run|Try|Call|Submit|Publish|Press|Type|Change|Set|Switch|Turn|Give|Make|Create|Add|Remove|Delete|Edit|Start|Stop|Wait|Move|Enter|Select|Choose|Import|Export|Trigger|Deliver|Drop|Withdraw|Recall|Revoke|Deactivate)\b", re.I)


def split_steps(s):
    return [p.strip() for p in re.split(r"\s*\|\s*(?=\d+\.\s)", s.strip()) if p.strip()]


def sentences(s):
    s = re.sub(r"\b(e\.g|i\.e|etc|vs|no)\.", r"\1", s.strip())
    return [x for x in re.split(r"(?<=[.;!?])\s+(?=[A-Z(])", s) if x.strip()]


def check(root):
    tests = list(csv.DictReader(open(os.path.join(root, "requirements/tests/AW-test-cases.csv"), encoding="utf-8")))
    fx = list(csv.DictReader(open(os.path.join(root, "requirements/tests/fixtures.csv"), encoding="utf-8")))
    fx_ids = {r["Fixture ID"] for r in fx}
    # Every "Name in tests" phrase maps to its fixture ID ("the Owner (of Firm F)" -> "the owner").
    # A name of "—" means the fixture is cited by ID only (too generic to match in prose).
    fx_phrase = {}
    for r in fx:
        for n in r["Name in tests"].split(";"):
            n = re.sub(r"\s*\(.*?\)", "", n).strip().lower()
            if n and n != "—":
                fx_phrase[n] = r["Fixture ID"]
    fx_names = set(fx_phrase)
    phrase_re = re.compile(r"(?<![\w-])(" + "|".join(re.escape(n) for n in sorted(fx_phrase, key=len, reverse=True)) + r")(?![\w-])", re.I)
    reqs = set()
    for name in ("AW-01-firm-ai-assistants_v0.1.md", "AW-02-platform-ai-assistants_v0.1.md"):
        for line in open(os.path.join(root, "requirements", name), encoding="utf-8"):
            m = re.match(r"^- \*\*(AW-[12]-\d+)\b", line)
            if m and not re.search(r"\*\*(?:Withdrawn|Superseded by)\b", line):
                reqs.add(m.group(1))

    live = [t for t in tests if t["Status"].strip() != "Withdrawn"]
    out, fails, unknown_fx, uncatalogued = [], collections.Counter(), collections.Counter(), collections.Counter()
    scripted_missing = 0
    for t in live:
        steps = split_steps(t["Steps"])
        first = re.sub(r"^\d+\.\s*", "", steps[0]) if steps else ""
        body = " ".join([t["Scenario"], t["Steps"], t["Expected Result"]])
        bad = []
        # 1. Preconditions: step 1 states a state, never chains to another test.
        if not first or CHAINED.match(first) or ACT_FIRST.match(first):
            bad.append("preconditions")
        # 2. Fixtures: cited IDs exist; named fixtures are catalogued by ID or introduced with "New:".
        cited = set(FIXTURE_ID.findall(body))
        missing = sorted(cited - fx_ids)
        for m in missing:
            unknown_fx[m] += 1
        new_part = first.lower() if "New:" in first else ""
        first_ids = set(FIXTURE_ID.findall(first))
        # Every catalogued name the test uses needs that fixture's ID in step 1 (or a "New:" definition there).
        used = {m.group(1).lower() for m in phrase_re.finditer(body)}
        named_uncited = sorted(n for n in used if fx_phrase[n] not in first_ids and n not in new_part)
        # A lettered name that is not catalogued must be defined in step 1 with "New:".
        for n in {x.lower() for x in FIXTURE_NAME.findall(body)} - fx_names:
            if n not in new_part:
                uncatalogued[n] += 1
                named_uncited.append(n)
        # Part 1 of the standard: step 1 itself cites a fixture ID or introduces a one-off with "New:".
        if missing or named_uncited or not (first_ids or new_part):
            bad.append("fixtures")
        # Part 1 (scripted model): a test that depends on AI output cites FX-MODEL and states that output in step 1.
        # A rules-only fill by the in-session filling component is not AI output (AW-1-147 (a) to (e); checker 16:19:15Z).
        ai_steps = [x for x in steps[1:] if not RULES_ONLY.search(x) and (AI_SETS.search(re.sub(r"^\d+\.\s*", "", x)) or AI_DOES.search(x))]
        has_model = "FX-MODEL" in first_ids and "scripted model" in first.lower()
        if (ai_steps and not has_model) or ("FX-MODEL" in first_ids and "scripted model" not in first.lower()):
            scripted_missing += 1
            if "preconditions" not in bad:
                bad.append("preconditions")
        # 3. Steps: at least two numbered steps.
        if len(steps) < 2 or not re.match(r"^\d+\.", t["Steps"].strip()):
            bad.append("steps")
        # 4. One observable result, at most two sentences.
        n = len(sentences(t["Expected Result"]))
        if n == 0 or n > 2:
            bad.append("one result")
        # 5. Its requirement: cites a live AW requirement that exists.
        if not (set(re.findall(r"AW-[12]-\d+", t["Comments"] + " " + t["Scenario"])) & reqs):
            bad.append("requirement")
        for b in bad:
            fails[b] += 1
        out.append({"id": t["Test Case ID"], "module": t["Module"], "feature": t["Feature"], "fails": bad, "unknownFixtures": missing, "namedNotCited": named_uncited})
    passing = sum(1 for o in out if not o["fails"])
    return {
        "live": len(live), "passing": passing, "needScriptedModel": scripted_missing, "failing": len(live) - passing,
        "failsByPart": {p: fails.get(p, 0) for p in PARTS},
        "fixturesDefined": len(fx_ids), "unknownFixtureIds": dict(unknown_fx),
        "uncataloguedNames": dict(uncatalogued.most_common()),
        "byModule": {m: {"live": sum(1 for o in out if o["module"] == m),
                         "passing": sum(1 for o in out if o["module"] == m and not o["fails"])}
                     for m in sorted({o["module"] for o in out})},
        "tests": out,
    }


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="ai-workers")
    ap.add_argument("--json")
    ap.add_argument("--list", choices=PARTS)
    a = ap.parse_args()
    r = check(os.path.abspath(a.root))
    summary = {k: v for k, v in r.items() if k != "tests"}
    print(json.dumps(summary, indent=1))
    if a.list:
        print("\n".join(o["id"] for o in r["tests"] if a.list in o["fails"]))
    if a.json:
        json.dump(r, open(a.json, "w", encoding="utf-8"), indent=1)
