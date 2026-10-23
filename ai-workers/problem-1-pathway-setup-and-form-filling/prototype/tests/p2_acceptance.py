"""P2 acceptance examples: exact working-specification rules, observable examples and where the agreed
answer comes from, one per measure the scorer computes (tests/score_p2.ts).

  python3 -I .../prototype/tests/p2_acceptance.py          writes tests/p2-acceptance.json
  python3 -I .../prototype/tests/p2_acceptance.py --check  re-reads every quoted W1 text; exit 1 on drift

Rule ids: <activity>.r<n> is the nth rule, <activity>.a<n> the nth acceptance example and <activity>.ready
the ready criterion of that activity in the working edition W1 (tools/s3-working/s3_data.py). Other ids
name the answer key's own rule (slice-1.rules.*, combination-1.*) or a decision (AIW-D264).
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
AW = HERE.parents[2]
sys.path.insert(0, str(AW / "tools" / "s3-working"))
import s3_data as D  # noqa: E402

OUT = HERE / "p2-acceptance.json"
K = "prototype/expected/slice-1-field-map.json"
C = "prototype/expected/combination-1.json"


def w1(ref):
    aid, part = ref.rsplit(".", 1)
    a = D.ACT[aid]
    t = a["ready"] if part == "ready" else (a["accept"] if part[0] == "a" else a["rules"])[int(part[1:]) - 1]
    return {"id": ref, "text": t.split("|", 1)[1] if t[:2] in ("F|", "R|", "G|") else t}


def other(rid, text):
    return {"id": rid, "text": text}


D264 = "Drafted rules and checks use the team's closed 11-operator condition language in the team's structured predicate format, validated against a portable copy of that contract, each with a separate plain-language explanation."
AC = [
    ("P2-FM-01", "field_maps", ["3.2.ready", "3.1.ready"], "Every data-bound box of each combination-1 form has exactly one entry: mapped, unresolved, never filled or not a fact.", "entries equal data-bound boxes per form; no 'has no map entry' or 'not in the form's inventory' item", "P1 inventories", "fm_coverage"),
    ("P2-FM-02", "field_maps", ["3.2.r3", "3.1.a1"], "On Client A's IMM 5707 the spouse block takes the partner's facts and the applicant block Client A's; on the partner's own IMM 5707 the same map takes the opposite people.", "zero wrong-person entries over the 84 IMM 5707 key entries (two perspectives) and the 6 IMM 1295 entries", K, "fm_wrong_person"),
    ("P2-FM-03", "field_maps", ["3.1.r1", "3.2.r3"], "One 'date of birth' meaning serves the applicant, spouse, parents and child; their values never merge.", "the key's date of birth aligns to one canonical field used with five persons; no two key facts share one draft fact", K, "fm_one_meaning"),
    ("P2-FM-04", "field_maps", [other("slice-1.rules.parent_blocks", "Parent1 and Parent2 each hold exactly one parent of the form's subject; every field in one block belongs to the same parent; the two blocks hold different parents.")], "Each IMM 5707 parent block holds one parent, either order.", "every box of Parent1 carries one parent role and every box of Parent2 the other", K, "fm_parent_blocks"),
    ("P2-FM-05", "field_maps", [other("slice-1.rules.unresolved", "A field whose fact the case cannot supply (e.g. name in native language) must be returned as unresolved with a reason, not filled with a guess.")], "'Name in native language' comes back unresolved with a reason on every block that has it.", "zero invented values: every key entry expected unresolved is unresolved", K, "fm_invented"),
    ("P2-FM-06", "field_maps", [other("slice-1.rules.children_rows", "One Child row per child of the form's subject; the shipped data holds no Child rows; the filler creates them.")], "The child's facts map to row 0 of the repeating child group.", "child entries have row 0", K, "fm_rows"),
    ("P2-FM-07", "field_maps", [other("slice-1.rules.codes_differ_by_form", "The same fact uses different codes per form: common-law is 1 on IMM 5707 but 03 on IMM 1295 (LOV MaritalStatusList).")], "Marital status maps through each form's own code list.", "the marital-status transforms name a code list and include the form's own common-law code (1 on IMM 5707, 03 on IMM 1295)", K, "fm_codes"),
    ("P2-FM-08", "field_maps", [other("comparison-plan S1", "Entry accuracy against the key: person, fact, row and transform each right; Parent 1/2 either order, block-consistent")], "Overall entry accuracy on the 90-entry slice (first measurement; no fixed bar).", "per instance: outcome, person, fact, row, transform-class and all-correct counts", K, "fm_accuracy"),
    ("P2-FM-09", "field_maps", ["3.1.r4"], "Every mapped entry cites the caption or heading it rests on, found in the form's own text.", "no 'evidence quote not found' item in the assembled draft", "P1 inventories", "fm_quotes"),
    ("P2-RQ-01", "requirements", ["3.5.r2", other("AIW-D264", D264)], "Every drafted condition is a valid tree in the 11-operator vocabulary and reads only canonical or declared derived fields.", "zero 'condition:' or 'condition reads' items in the assembled draft", "contracts/predicate.v0.schema.json", "rq_conditions_valid"),
    ("P2-RQ-02", "requirements", [other("combination-1.expected_forms", "IMM 1295 each applicant; IMM 5707 each person aged 18 or older; IMM 5409 if common-law; IMM 5476 if a representative is used; IMM 5475 if applicable; IMM 5257 Schedule 1 after a background 'yes'.")], "The draft lists the six forms of the key with the right always/conditional status and who completes them.", "each expected form present; status and 'who' in the pre-registered acceptable set", C, "rq_forms"),
    ("P2-RQ-03", "requirements", [other("AIW-D264", "Derive age deterministically from date of birth using the rule's explicit reference date; test the relevant boundary dates and missing inputs.")], "The drafted IMM 5707 condition, run on the made-up family at 20 Oct 2026: Client A and the partner yes, the 9-year-old no; no date of birth: cannot tell.", "evaluate the drafted condition (field ids translated through the field-map alignment) for the three people and for a missing date of birth", C, "rq_age_rule"),
    ("P2-RQ-04", "requirements", ["3.3.ready", "3.3.r2"], "Passport page (each applicant, base), marriage certificate (conditional: married), children's birth certificates (conditional: accompanying child), proof of payment (base).", "each expected document matched by its pre-registered keywords, with base or conditional as the key", C, "rq_documents"),
    ("P2-RQ-05", "requirements", ["3.5.r4", "3.5.a2"], "A passage that depends on an officer's judgement becomes a task, never a rule.", "every drafted item whose quote says the officer may request, or that more documents may be required, is a task", "official text inventories", "rq_officer_tasks"),
    ("P2-RQ-06", "requirements", ["3.3.r3", "3.3.a1"], "Every 'if applicable' line is conditional, names whose it is, and keeps its source.", "items quoting 'if applicable' are conditional with a condition", "official text inventories", "rq_if_applicable"),
    ("P2-SC-01", "sections", ["3.4.ready"], "Every fact a form map uses is placed in a section with a 'collected from' setting.", "zero 'has no placement' items", "assembly", "sc_all_placed"),
    ("P2-SC-02", "sections", ["3.7.r3", "3.7.a2"], "The representative's membership (licence) number is never asked of the client.", "facts mapped from the IMM 5476 membership ID boxes are placed as staff working view or profile record", "P1 inventory of IMM 5476", "sc_rep_licence"),
    ("P2-SC-03", "sections", ["3.4.r6"], "Tier, collected-from and visibility are separate settings on one stored value.", "every placement carries all three settings; no fact is placed twice", "assembly", "sc_settings"),
    ("P2-CK-01", "checks", ["3.8.r2", "3.8.a1"], "Client A's partner's passport, expiring in 70 days, gives an amber warning and never blocks.", "at least one document-expiry check; every expiry check is warn or advise", "W1 3.8", "ck_expiry_warns"),
    ("P2-CK-02", "checks", ["3.8.r3", "3.8.a2"], "A gap in the past 10 years of employment history gives a warning, never a stop.", "an employment-history gap check exists and is warn", C, "ck_history_gap"),
    ("P2-CK-03", "checks", ["3.8.r6", "3.8.r5"], "An immigration value the sources do not state is left to the SME; a check the language cannot express is a named gap.", "inexpressible checks carry expressible=false and a reason; the count of sme_pending checks is reported for review", "W1 3.8", "ck_no_invented_values"),
    ("P2-CK-04", "checks", ["3.2.r4", "3.2.r5"], "An answer-list miss is refused; overflow is flagged, never truncated (rule-made form-native checks).", "each choice box has a block option check; each limited box a warn length check", "P1 inventories", "ck_form_native"),
]


def build():
    return {
        "schema": "p2-acceptance/v1",
        "prepared": "2026-10-20, Claude Code (the Lead), before any live drafting run",
        "spec": "working edition W1 with the AIW-D264 correction (tools/s3-working/s3_data.py)",
        "examples": [{"id": i, "slice": s, "requirements": [w1(r) if isinstance(r, str) else r for r in reqs], "example": e,
                      "observable": o, "agreed_answer_from": k, "measure": m} for i, s, reqs, e, o, k, m in AC],
    }


# ---- v2 (20 Oct 2026, after the P2 live runs; P2-M1, D11, D19, D20). Evaluation corrections, listed per
# example with the reason; v1 above is unchanged and still scores the original results.
OUT2 = HERE / "p2-acceptance.v2.json"
K2 = "prototype/expected/slice-1-field-map.v2.json"
C2 = "prototype/expected/combination-1.v2.json"
A2 = "prototype/expected/fact-aliases-c1.json"
V2 = {
    "P2-FM-02": dict(observable="zero wrong-person entries over the 84 IMM 5707 key entries (two perspectives) and the IMM 1295 entries; a relationship-owned fact (D11) is a named dependency, not a person",
                     agreed_answer_from=K2, why="D11: the IMM 1295 date is one relationship fact of the couple; the mapping contract has no relationship scope"),
    "P2-FM-03": dict(observable="the key's date of birth aligns, through the reviewed meaning-based alias table, to one canonical field used with five persons; no draft field is drafted for two key facts",
                     agreed_answer_from=f"{K2}; {A2}", why="P2-M1: alignment no longer learned from the scored boxes"),
    "P2-FM-07": dict(observable="the marital-status transforms carry each form's own codes exactly (IMM 5707 Common-law=1 and the rest of its list; IMM 1295 Common-Law=03, Married=01)",
                     agreed_answer_from=K2, why="P2-M1: exact codes, not only 'names a code list'"),
    "P2-FM-08": dict(example="Every entry of the 91-entry slice right: outcome, person, fact by meaning, row and the exact transformation the key states.",
                     observable="PASS only when no entry has a wrong outcome, person, fact (meaning-based alias), row or transform (exact format, codes, inversion); named dependencies are listed, not counted as correct",
                     agreed_answer_from=f"{K2}; {A2}", why="P2-M1: v1 always passed and compared transform classes only; a global name swap and a day-month swap left it at 42/42"),
    "P2-RQ-02": dict(requirements_extra=[other("combination-1.v2 D20", "IMM 1295 is completed by each person applying for a work permit from outside Canada; the scenario names who applies (Client A and the partner).")],
                     observable="each expected form present with status and 'who' in the acceptable set; IMM 1295's 'who' covers every scenario application that uses it (Client A and the partner), so principal-only fails",
                     agreed_answer_from=C2, why="P2-M3 / D20"),
    "P2-RQ-03": dict(requirements_extra=[other("combination-1.v2 D19", "IMM 5707: aged 18 or older, or a minor travelling alone to Canada.")],
                     example="The drafted IMM 5707 condition at 20 Oct 2026: adults yes; 18 on the day yes; one day short no; a minor travelling alone yes; the accompanied 9-year-old no; a minor with no travel answer, or no date of birth: cannot tell; an adult with no travel answer yes.",
                     observable="evaluate the drafted condition (fields translated through the alias table) for the eight D19 cases of combination-1.v2",
                     agreed_answer_from=f"{C2}; {A2}", why="D19"),
}


def build_v2():
    v1 = build()
    ex = []
    for e in v1["examples"]:
        e = json.loads(json.dumps(e))
        ch = V2.get(e["id"])
        if ch:
            e["requirements"] += ch.get("requirements_extra", [])
            for f in ("example", "observable", "agreed_answer_from"):
                if f in ch:
                    e[f] = ch[f]
            e["changed_from_v1"] = ch["why"]
        elif e["agreed_answer_from"] in (K, C):
            e["agreed_answer_from"] = K2 if e["agreed_answer_from"] == K else C2
        ex.append(e)
    return {"schema": "p2-acceptance/v2", "supersedes": "tests/p2-acceptance.json (kept; scores the original results)",
            "prepared": "2026-10-20, Claude Code (the Lead), after the P2 live runs: evaluation corrections accepted by the independent reviewer (Codex 08:23:05Z), each with its reason",
            "spec": v1["spec"], "examples": ex}


if __name__ == "__main__":
    data, data2 = build(), build_v2()
    if "--check" in sys.argv:
        saved = json.loads(OUT.read_text())
        ok = saved == data and OUT2.exists() and json.loads(OUT2.read_text()) == data2
        print(("PASS" if ok else "FAIL") + f"  {len(data['examples'])} acceptance examples (v1 and v2); every quoted W1 text matches the working edition")
        sys.exit(0 if ok else 1)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    OUT2.write_text(json.dumps(data2, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {OUT.name} and {OUT2.name}: {len(data['examples'])} examples")
