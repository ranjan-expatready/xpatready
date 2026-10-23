#!/usr/bin/env python3
"""Fetch every official source still marked pending (or missing) in official-sources/*/manifest.json.
Keeps a file only when its SHA-256 equals the manifest value the Lead read from the official page (P-31).
Usage: python3 fetch_official_sources.py [--check]   (--check lists what is pending, downloads nothing)."""
import json, hashlib, os, subprocess, sys, datetime, glob
root = os.path.dirname(os.path.abspath(__file__))
check = "--check" in sys.argv
# Files the founder downloaded by hand (browser): matched by checksum in ~/Downloads, any file name.
dl_dir = os.path.expanduser("~/Downloads")
dl = {}
if os.path.isdir(dl_dir):
    for f in glob.glob(os.path.join(dl_dir, "*.pdf")):
        try: dl[hashlib.sha256(open(f, "rb").read()).hexdigest()] = f
        except OSError: pass
ok = bad = pending = 0
for mf in sorted(glob.glob(os.path.join(root, "*", "manifest.json"))):
    base = os.path.dirname(mf); m = json.load(open(mf)); changed = False
    for it in m["items"]:
        path = os.path.join(base, it["path"])
        present = os.path.exists(path) and hashlib.sha256(open(path, "rb").read()).hexdigest() == it["sha256"]
        if present and str(it.get("status", "")).startswith("ok"): continue
        if present:
            it["status"] = "ok"; changed = True; ok += 1; print("OK   ", it["edition"], "(already present)"); continue
        pending += 1
        if check: print("PENDING", it["edition"], "->", it["path"]); continue
        os.makedirs(os.path.dirname(path), exist_ok=True); part = path + ".part"
        if it["sha256"] in dl:
            import shutil; shutil.copyfile(dl[it["sha256"]], path); it["status"] = "ok"
            it["downloaded_utc"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") + " (by hand, from Downloads)"
            changed = True; ok += 1; print("OK   ", it["edition"], "(found in Downloads)"); continue
        r = subprocess.run(["curl", "-sSfL", "--max-time", "120", "-o", part, it["url"]])
        got = hashlib.sha256(open(part, "rb").read()).hexdigest() if r.returncode == 0 and os.path.exists(part) else None
        if got == it["sha256"]:
            os.replace(part, path); it["status"] = "ok"
            it["downloaded_utc"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            changed = True; ok += 1; print("OK   ", it["edition"])
        else:
            if os.path.exists(part): os.remove(part)
            bad += 1; print("FAIL ", it["edition"], "(download failed: the site did not answer; tried again at the next /next)" if got is None else "(checksum differs: possible new edition; ask the Lead)")
    if changed: json.dump(m, open(mf, "w"), indent=1)
if check: print(f"Official sources: {pending} pending.")
else: print(f"Official sources: {ok} fetched and verified, {bad} failed, {'nothing pending' if not (ok or bad) else 'see above'}.")
sys.exit(1 if bad else 0)
