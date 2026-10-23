"""Writes expected/fact-aliases-c1.json: which draft canonical-field definitions mean each answer-key fact
(P2-M1). Decided from each definition's own words (its meaning text and value type), never from the boxes
it is mapped to, so a draft that swaps two facts across boxes cannot align itself. Covers every definition
in the stored combination-1 drafts whose words could carry a key fact (keyword sweep over meanings, not
boxes); a definition not listed is unreviewed and never counts as correct. Prototype only:
Lead-verified from official sources (prototype only); not specialist-confirmed. Prepared by the maker; the formal
checker's verdict is recorded separately (PROGRESS.md 2026-10-20T15:36:18Z, PASS WITH FIXES). Label corrected 20 Oct (P2-R2-m1).
    python3 -I tests/make_fact_aliases.py [--check]
"""
import glob, json, re, sys
from pathlib import Path
P = Path(__file__).resolve().parent.parent
norm = lambda m: re.sub(r"\s+", " ", m).strip().rstrip(".").lower()

# (key fact, draft id, test on the normalised meaning, decision, reason). First matching rule wins.
RULES = [
    ("person.family_name", "person.family_name", r"family name \(surname\)", "same", "family name (surname); passport/identity-document/English/Latin wording all name the same fact"),
    ("person.given_names", "person.given_names", r"given name", "same", "given name(s)"),
    ("person.date_of_birth", "person.date_of_birth", r"(date of birth|was born)", "same", "date of birth"),
    ("person.country_of_birth", "person.country_of_birth", r"country or territory (where|in which) the person was born", "same", "country of birth"),
    ("person.country_of_birth", "person.place_of_birth_country", r"country or territory (of birth|where the person was born)", "same", "country of birth; a second id for the same meaning (P2-M2 merge)"),
    ("person.marital_status", "person.marital_status", r"current marital", "same", "current marital (or relationship/partnership) status"),
    ("person.occupation", "person.occupation", r"present occupation", "same", "present occupation"),
    ("person.occupation", "person.present_occupation", r"current occupation", "same", "present occupation"),
    ("person.occupation", "person.occupation", r"during a period", "different", "a period-bound history activity, not the present occupation the key's IMM 5707 boxes hold"),
    ("person.occupation", "person.activity_occupation", r"", "different", "history activity record"),
    ("person.occupation", "person.employment_activity", r"", "different", "history activity record"),
    ("case.accompanies_principal", "relationship.accompanies_subject_to_canada", r"accompany", "same", "whether this family member accompanies the subject to Canada; who the subject is comes from the person check"),
    ("case.accompanies_principal", "relationship.accompanying_to_canada", r"accompany", "same", "as above"),
    ("person.residential_address", "person.residential_address", r"residential|physically lives", "same", "current home address"),
    ("person.residential_address", "person.present_address", r"currently lives|current residential", "same", "current home address (P2-M2 merge)"),
    ("person.residential_address", "person.current_address", r"presently lives", "same", "current home address"),
    ("person.residential_address", "person.mailing_address", r"", "different", "mailing address, a different address"),
    ("relationship.start_date", "relationship.start_date", r"marriage|common-law relationship began", "same", "date the marriage took place or the common-law relationship began"),
    ("relationship.start_date", "relationship.union_start_date", r"married|marriage", "same", "as above"),
    ("relationship.start_date", "relationship.cohabitation_start_date", r"", "uncertain", "living together in a conjugal relationship: equals the start of a common-law relationship but not of a marriage; a person decides (not counted correct)"),
    ("relationship.to_form_subject", "relationship.child_relationship_type", r"child", "same", "how a child is related to the subject"),
    ("relationship.to_form_subject", "relationship.child_relationship_to_subject", r"child", "same", "as above"),
    ("relationship.to_form_subject", "relationship.relationship_to_subject", r"family relationship", "same", "the kind of family relationship to the subject (covers the child codes)"),
    ("derived: subject has no children", "person.has_children", r"any children", "same_inverse", "whether the person has children; the box is its inverse (the transform must invert)"),
    ("derived: subject has no children", "relationship.has_children", r"any children", "same_inverse", "as above"),
    ("person.name_native_language", "person.native_language", r"", "different", "a language, not a name written in it"),
    ("person.travelling_alone_to_canada", "person.travelling_alone_to_canada", r"travelling to canada alone", "same", "D19 condition input"),
]

def build():
    # The model's own definitions only: the original configurations and the run records. Configurations made by the
    # v2 assembler (labels ending -r2 or -r2-detect) carry the same definitions under reviewed ids and are left out,
    # so adding them never changes this table.
    files = sorted(f for f in glob.glob(str(P / "p2" / "config" / "c1-draft-1-*.json")) if "-r2" not in f)
    seen = {}
    for f in files:
        c = json.loads(Path(f).read_text())
        for x in c["canonical_fields"]:
            seen.setdefault((x["id"], norm(x["meaning"])), x["value_type"])
    # Run-local definitions too (the scorer can read a map's own run's definition).
    for f in sorted(glob.glob(str(P / "p2" / "runs" / "c1-*-live-*.json"))):
        if f.endswith(".reconverted.json"): continue
        e = json.loads(Path(f).read_text())
        try: o = json.loads(e.get("raw_output") or "{}")
        except Exception: continue
        for x in o.get("canonical_fields", []) + o.get("proposed_fields", []):
            seen.setdefault((x["id"], norm(x["meaning"])), x["value_type"])
    entries = []
    for (i, m), t in sorted(seen.items()):
        for kf, did, rx, dec, why in RULES:
            if did == i and re.search(rx, m):
                entries.append({"key_fact": kf, "draft_id": i, "meaning": m, "value_type": t, "decision": dec, "reason": why}); break
    return {"schema": "fact-aliases/v1", "label": "Lead-verified from official sources (prototype only); not specialist-confirmed",
            "method": __doc__.strip().splitlines()[0] + " " + " ".join(__doc__.strip().splitlines()[1:4]),
            "decisions": {"same": "counts as the key fact", "same_inverse": "counts when the transform inverts it", "different": "never the key fact", "uncertain": "a person decides; not counted correct"},
            "entries": entries}

if __name__ == "__main__":
    out = json.dumps(build(), indent=1, ensure_ascii=False) + "\n"
    f = P / "expected" / "fact-aliases-c1.json"
    if "--check" in sys.argv:
        ok = f.exists() and f.read_text() == out; print("PASS  alias table rebuilds identically" if ok else "FAIL  alias table differs"); sys.exit(0 if ok else 1)
    f.write_text(out); d = json.loads(out); print(f"wrote {f.name}: {len(d['entries'])} entries", {k: sum(1 for e in d['entries'] if e['decision'] == k) for k in d['decisions']})
