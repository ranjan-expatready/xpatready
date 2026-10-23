"""Derives contracts/released-configuration.v0.schema.json from contracts/combination-config.v0 (the draft
contract) and contracts/field-map-entry.v0, adding only the release bookkeeping: status 'released', a version
on every item (5.3 r3), the review decision on each field-map entry, and the review summary. Mechanical, so
the two contracts cannot drift apart silently; tests/check_p4_views.ts re-derives and compares.
  python3 -I .../prototype/p4/make_release_contract.py [--check]
"""
import copy, json, sys
from pathlib import Path
C = Path(__file__).resolve().parents[1] / "contracts"
OUT = C / "released-configuration.v0.schema.json"

def build():
    cfg = json.loads((C / "combination-config.v0.schema.json").read_text())
    ent = json.loads((C / "field-map-entry.v0.schema.json").read_text())
    r = copy.deepcopy(cfg)
    r["$id"] = "https://expatready.local/contracts/released-configuration.v0.json"
    r["title"] = "A released combination configuration: the reviewed draft with each item's version and decision (derived from combination-config.v0 by p4/make_release_contract.py)"
    r["properties"]["status"] = {"const": "released"}
    r["properties"]["review"] = {"type": "object", "required": ["decisions"], "properties": {"decisions": {"type": "integer", "minimum": 0}}}
    r["required"] = r["required"] + ["review"]
    e = copy.deepcopy(ent)
    e["$id"] = "https://expatready.local/contracts/released-field-map-entry.v0.json"
    e["properties"]["item_version"] = {"type": "integer", "minimum": 1}
    e["properties"]["decision"] = {"enum": ["accepted", "corrected", "left_unresolved"]}
    e["required"] = e["required"] + ["item_version", "decision"]
    r["definitions"]["released_entry"] = {k: v for k, v in e.items() if k not in ("$schema", "$id")}
    r["properties"]["field_maps"]["items"]["properties"]["entries"]["items"] = {"$ref": "#/definitions/released_entry"}
    for k in ["forms", "document_requirements", "rules", "sections", "placements", "checks", "canonical_fields", "derived_fields"]:
        items = r["properties"][k]["items"]
        req = {"type": "object", "required": ["item_version"], "properties": {"item_version": {"type": "integer", "minimum": 1}}}
        r["properties"][k]["items"] = {"allOf": [items, req]} if "allOf" not in items else {"allOf": items["allOf"] + [req]}
    return r

if __name__ == "__main__":
    s = json.dumps(build(), indent=1) + "\n"
    if "--check" in sys.argv:
        ok = OUT.read_text() == s
        print(("PASS" if ok else "FAIL") + "  released-configuration contract equals its derivation from the draft contracts"); sys.exit(0 if ok else 1)
    OUT.write_text(s); print(f"wrote {OUT.name}")
