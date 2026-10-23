"""AIW-D273 ledger correction for a P2 drafting run (the same rule as p5/reader/correct_unbilled.py): an attempt the
provider refused with HTTP 400 "usage limits" before any processing is unbilled, but the ledger's conservative rule
counted it at its worst case. Appends one settle line with actual 0, the provider request id and the reason for each
such attempt. Append-only and idempotent; nothing else in the ledger is touched.
  python3 -I studio/tools/correct_unbilled_p2.py p2/runs/<run>.json      (prints one JSON line)
"""
import datetime
import json
import sys
from pathlib import Path

LEDGER = Path(__file__).resolve().parents[2] / "p2" / "ledger" / "spend.jsonl"
rec = json.loads(Path(sys.argv[1]).read_text())
run = rec["drafting_run"]["run_id"]
es = [json.loads(l) for l in LEDGER.read_text().splitlines() if l.strip()]
reserves = [e for e in es if e["type"] == "reserve" and e.get("run_id") == run]
done = {e["id"] for e in es if e["type"] == "settle" and str(e.get("outcome", "")).startswith("corrected_unbilled")}
refused = [a for a in rec["drafting_run"]["attempts"] if a.get("outcome") == "error"]
now = datetime.datetime.now(datetime.UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
n = 0
with LEDGER.open("a") as f:
    for res, a in zip(reserves, refused):
        err = a.get("error", "")
        if res["id"] in done or "usage limits" not in err or not err.startswith("400"):
            continue
        rid = err.split('"request_id":"')[1].split('"')[0]
        f.write(json.dumps({"type": "settle", "id": res["id"], "actual_usd": 0, "at": now,
                            "outcome": f"corrected_unbilled: HTTP 400 invalid_request_error 'You have reached your specified API usage limits' before processing ({rid}); no usage returned (AIW-D273)"}) + "\n")
        n += 1
print(json.dumps({"run": run, "corrected": n}))
