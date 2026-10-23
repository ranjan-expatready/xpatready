"""AIW-D273 ledger correction: an attempt refused by the provider with HTTP 400 "usage limits" before any processing
is unbilled, but the ledger's conservative rule counts it at its worst case. For each such attempt in a reader run
record, append one settle line with actual 0, the provider request id and the reason. Append-only; idempotent.
  python3 p5/reader/correct_unbilled.py p5/reader/runs/<run>.json
"""
import datetime
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LEDGER = HERE.parents[1] / "p2" / "ledger" / "spend.jsonl"
rec = json.loads(Path(sys.argv[1]).read_text())
run = f"reader-{rec['run_id']}"
es = [json.loads(l) for l in LEDGER.read_text().splitlines() if l.strip()]
reserves = [e for e in es if e["type"] == "reserve" and e["run_id"] == run]
done = {e["id"] for e in es if e["type"] == "settle" and str(e.get("outcome", "")).startswith("corrected_unbilled")}
refused = [a for r in rec["results"] for a in r["attempts"] if a["outcome"] == "error"]
now = datetime.datetime.now(datetime.UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
n = 0
with LEDGER.open("a") as f:
    for res, a in zip(reserves, refused):
        if res["id"] in done or "usage limits" not in a.get("error", "") or not a["error"].startswith("400"):
            continue
        rid = a["error"].split('"request_id":"')[1].split('"')[0]
        f.write(json.dumps({"type": "settle", "id": res["id"], "actual_usd": 0, "at": now,
                            "outcome": f"corrected_unbilled: HTTP 400 invalid_request_error 'You have reached your specified API usage limits' before processing ({rid}); no usage returned (AIW-D273)"}) + "\n")
        n += 1
print(json.dumps({"run": run, "corrected": n}))
