# qa: dump every filled leaf of a generated IMM 5476 copy's XFA data (SectionA/B/C), for QA-296/299/300 by the printed copy.
# Args: <p1 dir> <pdf path>
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import e5_roundtrip as E
import xml.etree.ElementTree as ET
r = E.open_reader(Path(sys.argv[2]).read_bytes()); st = E.xfa_streams(r)
data = E.data_root(ET.fromstring(st["datasets"].get_object().get_data()))
def walk(n, path):
    kids = list(n)
    if not kids:
        v = (n.text or "").strip()
        print(("SET   " if v else "blank ") + "/".join(path) + (" = " + v[:80] if v else ""))
    for k in kids:
        walk(k, path + [k.tag.split("}")[-1]])
walk(data, [data.tag.split("}")[-1]])
