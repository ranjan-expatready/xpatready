#!/usr/bin/env python3
"""Make the copy of the one-pager that is published as the shared link (a private claude.ai page).
The host adds its own <html>, <head> and <body>, so this copy drops them and keeps the title, style and content.
Run after build_one_pager.py: python3 tools/s3/make_publish_copy.py. Output: tools/s3/publish/solution-1-one-pager.html"""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "problem-1-pathway-setup-and-form-filling", "solution-1-one-pager.html")
OUT = os.path.join(HERE, "publish", "solution-1-one-pager.html")
s = open(SRC).read()
s = re.sub(r"^<!doctype html><html[^>]*><head><meta charset='utf-8'><meta name='viewport'[^>]*>", "", s, count=1)
s = s.replace("</head><body>", "", 1)
s = re.sub(r"</body></html>\s*$", "", s)
assert s.startswith("<title>") and "<body" not in s and "</html>" not in s, "unexpected page wrapper"
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, "w").write(s)
print(f"wrote {os.path.relpath(OUT, os.path.join(HERE, '..', '..'))} ({len(s)//1024} KB)")
